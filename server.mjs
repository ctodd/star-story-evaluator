import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { customPrompt } from './customPrompt.mjs';
import { BedrockRuntimeClient, InvokeModelCommand, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Debug mode - set to true to enable detailed logging
const DEBUG = process.env.DEBUG === 'true' || false;

// Debug logger function
function debug(type, ...args) {
    if (DEBUG) {
        if (type === 'sensitive') {
            console.log('[DEBUG] [SENSITIVE DATA REDACTED]');
        } else {
            console.log('[DEBUG]', ...args);
        }
    }
}

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.static('public'));

// Add security headers
app.use((req, res, next) => {
    // Content Security Policy
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'");
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});

// Response time tracking
const RESPONSE_TIMES_FILE = path.join(__dirname, 'response_times.json');
const MAX_HISTORY_ENTRIES = 10;
const DEFAULT_RESPONSE_TIME = 30000; // 30 seconds default

// API Provider Configuration
const API_PROVIDER = process.env.API_PROVIDER || 'BEDROCK'; // Default to AWS Bedrock

// Anthropic Claude Direct API Configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_DEFAULT_MODEL = 'claude-3-7-sonnet-20250219';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || ANTHROPIC_DEFAULT_MODEL;

// AWS Bedrock Configuration
const AWS_REGION = process.env.AWS_REGION || undefined; // Use undefined to let SDK use default credential chain
const BEDROCK_DEFAULT_MODEL = 'us.anthropic.claude-3-7-sonnet-20250219-v1:0';
const BEDROCK_MODEL = process.env.BEDROCK_MODEL || BEDROCK_DEFAULT_MODEL;

// Validate model selection
const VALID_ANTHROPIC_MODELS = [
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
    'claude-3-5-sonnet-20240620',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-7-sonnet-20250219'
];

const VALID_BEDROCK_MODELS = [
    // Claude 3.0 models (standard model IDs)
    'anthropic.claude-3-opus-20240229-v1:0',
    'anthropic.claude-3-sonnet-20240229-v1:0',
    'anthropic.claude-3-haiku-20240307-v1:0',
    
    // Claude 3.5/3.7 models (require inference profiles)
    'anthropic.claude-3-5-sonnet-20240620-v1:0',
    'anthropic.claude-3-5-sonnet-20241022-v2:0',
    'anthropic.claude-3-5-haiku-20241022-v1:0',
    'anthropic.claude-3-7-sonnet-20250219-v1:0',
    
    // Inference profile IDs (for direct use with Claude 3.5/3.7)
    'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    'us.anthropic.claude-3-5-sonnet-20240620-v1:0',
    'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
    'us.anthropic.claude-3-7-sonnet-20250219-v1:0'
];

// System-defined inference profiles for newer Claude models
const INFERENCE_PROFILES = {
    'anthropic.claude-3-haiku-20240307-v1:0': 'anthropic.claude-3-haiku-20240307-v1:0',
    'anthropic.claude-3-opus-20240229-v1:0': 'anthropic.claude-3-opus-20240229-v1:0',
    'anthropic.claude-3-sonnet-20240229-v1:0': 'anthropic.claude-3-sonnet-20240229-v1:0',
    'anthropic.claude-3-5-haiku-20241022-v1:0': 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    'anthropic.claude-3-5-sonnet-20240620-v1:0': 'us.anthropic.claude-3-5-sonnet-20240620-v1:0',
    'anthropic.claude-3-5-sonnet-20241022-v2:0': 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
    'anthropic.claude-3-7-sonnet-20250219-v1:0': 'us.anthropic.claude-3-7-sonnet-20250219-v1:0'
};

// Flag to determine if we should use InvokeModel or Converse API
const USE_CONVERSE_API = process.env.USE_CONVERSE_API === 'true' || false;

// Configure AWS SDK v3 - only if using Bedrock
let bedrockClient = null;
if (API_PROVIDER === 'BEDROCK') {
    bedrockClient = new BedrockRuntimeClient({ 
        region: AWS_REGION || 'us-west-2' // Provide a default region
    });
}

// Get the actual region being used
let actualAwsRegion = API_PROVIDER === 'BEDROCK' ? (AWS_REGION || 'us-west-2') : 'N/A';

// Function to refresh AWS credentials and get the actual region
async function refreshAwsCredentials() {
    // Skip if we're using Anthropic API
    if (API_PROVIDER === 'ANTHROPIC') {
        debug('request', 'Using Anthropic API, skipping AWS credential refresh');
        return null;
    }
    
    debug('request', 'Refreshing AWS credentials');
    
    // Check if we have credentials in Docker secrets
    const accessKeyId = await readSecretFromFile('AWS_ACCESS_KEY_ID');
    const secretAccessKey = await readSecretFromFile('AWS_SECRET_ACCESS_KEY');
    const sessionToken = await readSecretFromFile('AWS_SESSION_TOKEN');
    
    // If we have credentials from Docker secrets, use them
    if (accessKeyId && secretAccessKey) {
        debug('request', 'Using AWS credentials from Docker secrets');
        const credentials = {
            accessKeyId,
            secretAccessKey
        };
        
        if (sessionToken && sessionToken.length > 0) {
            credentials.sessionToken = sessionToken;
        }
        
        bedrockClient = new BedrockRuntimeClient({ 
            region: AWS_REGION || 'us-west-2', // Provide a default region if not specified
            credentials
        });
    } else {
        // Otherwise use default credential chain
        bedrockClient = new BedrockRuntimeClient({ 
            region: AWS_REGION || 'us-west-2', // Provide a default region if not specified
            credentials: undefined // Force credential refresh
        });
    }
    
    // Get the actual region from the client config
    try {
        // For SDK v3, we need to handle the case where region might be a function
        if (typeof bedrockClient.config.region === 'function') {
            actualAwsRegion = await bedrockClient.config.region();
        } else {
            actualAwsRegion = bedrockClient.config.region || 'us-west-2';
        }
        debug('request', `Using AWS region: ${actualAwsRegion}`);
    } catch (error) {
        console.error('Error getting region:', error);
        actualAwsRegion = AWS_REGION || 'us-west-2'; // Use the configured region as fallback
    }
    
    return bedrockClient;
}

app.post('/generate', async (req, res) => {
    debug('request', 'Received request body structure:', Object.keys(req.body));
    
    // Input validation
    const userStory = req.body.story;
    const userQuestion = req.body.question || '';
    
    // Validate inputs
    if (!userStory || typeof userStory !== 'string' || userStory.length > 10000) {
        return res.status(400).json({ error: 'Invalid story input' });
    }
    
    if (userQuestion && (typeof userQuestion !== 'string' || userQuestion.length > 500)) {
        return res.status(400).json({ error: 'Invalid question input' });
    }
    
    debug('request', 'User story length:', userStory.length);
    debug('request', 'User question length:', userQuestion.length);
    
    // Reload environment variables to pick up any changes
    dotenv.config();
    
    // Update API configuration from environment variables
    const API_PROVIDER_UPDATED = process.env.API_PROVIDER || 'BEDROCK';
    if (API_PROVIDER_UPDATED !== API_PROVIDER) {
        console.log(`API provider changed from ${API_PROVIDER} to ${API_PROVIDER_UPDATED}`);
    }
    
    if (typeof customPrompt !== 'string') {
        console.error('Custom prompt is not a string:', customPrompt);
        return res.status(500).json({ error: 'Internal server error' });
    }
    
    let fullPrompt = customPrompt.replace('[USER_STORY]', userStory);
    
    // Add the question to the prompt if provided
    if (userQuestion) {
        fullPrompt = fullPrompt.replace('[USER_QUESTION]', userQuestion);
    } else {
        fullPrompt = fullPrompt.replace('[USER_QUESTION]', 'No specific question provided');
    }
    
    debug('sensitive', fullPrompt);

    try {
        let responseText;
        const startTime = Date.now();
        
        if (API_PROVIDER === 'ANTHROPIC') {
            responseText = await callAnthropicAPI(fullPrompt);
        } else {
            // Default to AWS Bedrock
            responseText = await callBedrockAPI(fullPrompt);
        }
        
        // Calculate and track response time
        const responseTime = Date.now() - startTime;
        console.log(`Response received in ${responseTime}ms`);
        
        // Add to response time history
        await addResponseTime(responseTime);
        
        res.json({ 
            response: responseText,
            responseTime: responseTime,
            averageResponseTime: await getAverageResponseTime()
        });
    } catch (error) {
        console.error('Error details:', error);
        
        // Check for authentication errors
        if (error.message.includes('authentication error') || 
            error.message.includes('credentials')) {
            return res.status(401).json({ 
                error: error.message || 'Authentication error. Please check your API credentials.'
            });
        }
        
        // Sanitize error message for client
        res.status(500).json({ 
            error: 'An error occurred while processing your request.' 
        });
    }
});

// Add endpoint to get average response time
app.get('/api/average-response-time', async (req, res) => {
    res.json({ 
        averageResponseTime: await getAverageResponseTime(),
        region: actualAwsRegion
    });
});

async function callAnthropicAPI(prompt) {
    // Get API key from environment variable or Docker secret
    const apiKey = await readSecretFromFile('ANTHROPIC_API_KEY');
    
    if (!apiKey) {
        throw new Error('Anthropic API key is not configured');
    }
    
    // Validate model
    if (!VALID_ANTHROPIC_MODELS.includes(ANTHROPIC_MODEL)) {
        throw new Error(`Invalid Anthropic model`);
    }
    
    debug('request', 'Sending request to Anthropic API using model:', ANTHROPIC_MODEL);
    try {
        const response = await fetch(ANTHROPIC_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: ANTHROPIC_MODEL,
                max_tokens: 4096,
                messages: [
                    { role: "user", content: prompt }
                ]
            }),
        });

        debug('response', 'Anthropic API response status:', response.status);
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Anthropic API error response:', errorBody);
            
            if (response.status === 401 || response.status === 403) {
                throw new Error('Anthropic authentication error - please check your API key');
            }
            
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        debug('response', 'Anthropic API response received');

        if (data.content && data.content[0] && data.content[0].text) {
            const responseText = data.content[0].text;
            
            // Print the model response to console only in debug mode
            debug('sensitive', responseText);
            
            return responseText;
        } else {
            throw new Error('Unexpected response structure');
        }
    } catch (error) {
        if (error.message.includes('authentication error')) {
            throw error; // Pass through authentication errors with clear message
        }
        console.error('Anthropic API error:', error);
        throw new Error('Anthropic API error');
    }
}

async function callBedrockAPI(prompt) {
    debug('request', 'Sending request to AWS Bedrock using model:', BEDROCK_MODEL);
    
    // Validate model
    if (!VALID_BEDROCK_MODELS.includes(BEDROCK_MODEL)) {
        throw new Error(`Invalid Bedrock model`);
    }
    
    try {
        // Refresh AWS credentials before making the API call
        await refreshAwsCredentials();
        
        let response;
        let responseText;
        
        // Determine if this model requires an inference profile
        const isNewerClaudeModel = BEDROCK_MODEL.includes('claude-3-5') || BEDROCK_MODEL.includes('claude-3-7') || BEDROCK_MODEL.startsWith('us.anthropic');
        
        // For models that require inference profiles (like Claude 3.7), use the inference profile ID directly
        let effectiveModelId = BEDROCK_MODEL;
        if (isNewerClaudeModel && !BEDROCK_MODEL.startsWith('us.anthropic') && INFERENCE_PROFILES[BEDROCK_MODEL]) {
            effectiveModelId = INFERENCE_PROFILES[BEDROCK_MODEL];
            debug('request', 'Using inference profile ID as model ID:', effectiveModelId);
        }
        
        // Check if we should use the Converse API or fall back to InvokeModel
        if (USE_CONVERSE_API) {
            debug('request', 'Using Converse API');
            
            // Prepare the request payload for the Converse API
            const converseParams = {
                modelId: effectiveModelId,
                messages: [
                    { role: "user", content: [{ text: prompt }] }
                ],
                inferenceConfig: {
                    maxTokens: 4096,
                    temperature: 0,
                    topP: 0.9
                }
            };
            
            // Create and send the Converse command
            const command = new ConverseCommand(converseParams);
            response = await bedrockClient.send(command);
            
            debug('response', 'Bedrock Converse API response received');
            
            // Extract the response text from the message
            if (response.output && 
                response.output.message && 
                response.output.message.content && 
                response.output.message.content.length > 0 && 
                response.output.message.content[0].text) {
                
                responseText = response.output.message.content[0].text;
            } else {
                throw new Error('Unexpected response structure');
            }
        } else {
            debug('request', 'Using InvokeModel API');
            
            // Prepare the request payload for InvokeModel
            let payload = {
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 4096,
                messages: [
                    { role: "user", content: prompt }
                ]
            };
            
            const params = {
                modelId: effectiveModelId,
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify(payload)
            };
            
            // Create and send the InvokeModel command
            const command = new InvokeModelCommand(params);
            response = await bedrockClient.send(command);
            
            // Convert the response body from Uint8Array to string and parse as JSON
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            debug('response', 'Bedrock API response received');
            
            if (responseBody.content && responseBody.content[0] && responseBody.content[0].text) {
                responseText = responseBody.content[0].text;
            } else {
                throw new Error('Unexpected response structure');
            }
        }
        
        // Print the model response to console only in debug mode
        debug('sensitive', responseText);
        
        return responseText;
    } catch (error) {
        console.error('Bedrock API error:', error);
        
        // Add more detailed error information for debugging but not for client
        if (error.name === 'ValidationException') {
            debug('error', 'VALIDATION ERROR DETAILS:', error);
            if (error.$metadata) {
                debug('error', 'ERROR METADATA:', error.$metadata);
            }
        } else if (error.name === 'AccessDeniedException' || error.name === 'UnrecognizedClientException') {
            console.error('AWS credentials error:', error.name);
            throw new Error('AWS authentication error - please check your credentials');
        }
        
        throw new Error(`AWS Bedrock error`);
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, async () => {
    // Initialize the AWS client to get the actual region (only if using Bedrock)
    if (API_PROVIDER === 'BEDROCK') {
        await refreshAwsCredentials();
    } else {
        actualAwsRegion = AWS_REGION || 'N/A'; // Set a default value for Anthropic
    }
    
    console.log(`Server is running on port ${port}`);
    console.log(`Using API provider: ${API_PROVIDER}`);
    
    if (API_PROVIDER === 'ANTHROPIC') {
        console.log(`Anthropic model: ${ANTHROPIC_MODEL}`);
        if (!VALID_ANTHROPIC_MODELS.includes(ANTHROPIC_MODEL)) {
            console.warn(`Warning: Using unsupported model ${ANTHROPIC_MODEL}`);
        }
    } else {
        console.log(`AWS Bedrock model: ${BEDROCK_MODEL}`);
        console.log(`AWS region: ${actualAwsRegion} ${AWS_REGION ? '(from .env)' : '(from AWS config)'}`);
        console.log(`Using ${USE_CONVERSE_API ? 'Converse' : 'InvokeModel'} API`);
        
        // Determine if this model requires an inference profile
        const isNewerClaudeModel = BEDROCK_MODEL.includes('claude-3-5') || BEDROCK_MODEL.includes('claude-3-7') || BEDROCK_MODEL.startsWith('us.anthropic');
        if (isNewerClaudeModel) {
            if (BEDROCK_MODEL.startsWith('us.anthropic')) {
                console.log(`Using inference profile ID directly: ${BEDROCK_MODEL}`);
            } else if (INFERENCE_PROFILES[BEDROCK_MODEL]) {
                console.log(`Using inference profile ID as model ID: ${INFERENCE_PROFILES[BEDROCK_MODEL]}`);
            }
        }
        
        if (!VALID_BEDROCK_MODELS.includes(BEDROCK_MODEL)) {
            console.warn(`Warning: Using unsupported model ${BEDROCK_MODEL}`);
        }
        
        // Check if the model is available in the current region
        console.log(`Note: Make sure the model is enabled in the ${actualAwsRegion} region in your AWS Bedrock console`);
    }
    
    console.log(`Average response time: ${await getAverageResponseTime()}ms`);
    console.log(`Debug mode: ${DEBUG ? 'enabled' : 'disabled'}`);
});

// Response time tracking functions
async function loadResponseTimes() {
    try {
        if (fs.existsSync(RESPONSE_TIMES_FILE)) {
            const data = await fs.promises.readFile(RESPONSE_TIMES_FILE, 'utf8');
            try {
                return JSON.parse(data);
            } catch (parseError) {
                console.error('Error parsing response times file:', parseError);
                return [];
            }
        }
    } catch (error) {
        console.error('Error loading response times:', error);
    }
    return [];
}

async function saveResponseTimes(times) {
    try {
        await fs.promises.writeFile(RESPONSE_TIMES_FILE, JSON.stringify(times), 'utf8');
    } catch (error) {
        console.error('Error saving response times:', error);
    }
}

async function addResponseTime(responseTime) {
    // Validate input
    if (typeof responseTime !== 'number' || responseTime <= 0) {
        console.error('Invalid response time:', responseTime);
        return;
    }
    
    // Load existing times
    const times = await loadResponseTimes();
    
    // Add new time
    times.push(responseTime);
    
    // Keep only the most recent entries
    const recentTimes = times.slice(-MAX_HISTORY_ENTRIES);
    
    // Save updated times
    await saveResponseTimes(recentTimes);
    
    debug('response', `Added response time: ${responseTime}ms, Average: ${await getAverageResponseTime()}ms`);
}

async function getAverageResponseTime() {
    const times = await loadResponseTimes();
    
    if (times.length === 0) {
        return DEFAULT_RESPONSE_TIME;
    }
    
    const sum = times.reduce((total, time) => total + time, 0);
    return Math.round(sum / times.length);
}
// Add a utility function to get the AWS region from the SDK
async function getAwsRegion() {
    try {
        const client = new BedrockRuntimeClient({});
        if (typeof client.config.region === 'function') {
            return await client.config.region();
        }
        return client.config.region || 'unknown';
    } catch (error) {
        console.error('Error getting AWS region:', error);
        return 'unknown';
    }
}
// Function to read a secret from a file if environment variable with _FILE suffix exists
async function readSecretFromFile(envVar) {
    const fileEnvVar = `${envVar}_FILE`;
    if (process.env[fileEnvVar]) {
        try {
            const secretValue = await fs.promises.readFile(process.env[fileEnvVar], 'utf8');
            return secretValue.trim();
        } catch (error) {
            console.error(`Error reading secret from ${process.env[fileEnvVar]}:`, error);
            return null;
        }
    }
    return process.env[envVar];
}
