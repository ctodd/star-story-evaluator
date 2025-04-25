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
function debug(...args) {
    if (DEBUG) {
        console.log('[DEBUG]', ...args);
    }
}

app.use(express.json());
app.use(express.static('public'));

// Response time tracking
const RESPONSE_TIMES_FILE = path.join(__dirname, 'response_times.json');
const MAX_HISTORY_ENTRIES = 10;
const DEFAULT_RESPONSE_TIME = 30000; // 30 seconds default

// API Provider Configuration
const API_PROVIDER = process.env.API_PROVIDER || 'BEDROCK'; // Default to AWS Bedrock

// Anthropic Claude Direct API Configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_DEFAULT_MODEL = 'claude-3-sonnet-20240229';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || ANTHROPIC_DEFAULT_MODEL;

// AWS Bedrock Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const BEDROCK_DEFAULT_MODEL = 'anthropic.claude-3-sonnet-20240229-v1:0';
const BEDROCK_MODEL = process.env.BEDROCK_MODEL || BEDROCK_DEFAULT_MODEL;
const BEDROCK_INFERENCE_PROFILE = process.env.BEDROCK_INFERENCE_PROFILE || '';

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
    'anthropic.claude-3-opus-20240229-v1:0',
    'anthropic.claude-3-sonnet-20240229-v1:0',
    'anthropic.claude-3-haiku-20240307-v1:0',
    'anthropic.claude-3-5-sonnet-20240620-v1:0',
    'anthropic.claude-3-5-sonnet-20241022-v2:0',
    'anthropic.claude-3-5-haiku-20241022-v1:0',
    'anthropic.claude-3-7-sonnet-20250219-v1:0'
];

// System-defined inference profiles for newer Claude models
const INFERENCE_PROFILES = {
    'anthropic.claude-3-haiku-20240307-v1:0': 'us.anthropic.claude-3-haiku-20240307-v1:0',
    'anthropic.claude-3-opus-20240229-v1:0': 'us.anthropic.claude-3-opus-20240229-v1:0',
    'anthropic.claude-3-sonnet-20240229-v1:0': 'us.anthropic.claude-3-sonnet-20240229-v1:0',
    'anthropic.claude-3-5-haiku-20241022-v1:0': 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    'anthropic.claude-3-5-sonnet-20240620-v1:0': 'us.anthropic.claude-3-5-sonnet-20240620-v1:0',
    'anthropic.claude-3-5-sonnet-20241022-v2:0': 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
    'anthropic.claude-3-7-sonnet-20250219-v1:0': 'us.anthropic.claude-3-7-sonnet-20250219-v1:0'
};

// Flag to determine if we should use InvokeModel or Converse API
const USE_CONVERSE_API = process.env.USE_CONVERSE_API === 'true' || false;

// Configure AWS SDK v3
const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });

app.post('/generate', async (req, res) => {
    debug('Received request:', req.body);
    const userStory = req.body.story;
    debug('User story:', userStory);
    
    if (typeof customPrompt !== 'string') {
        console.error('Custom prompt is not a string:', customPrompt);
        return res.status(500).json({ error: 'Internal server error: Invalid custom prompt' });
    }
    
    const fullPrompt = customPrompt.replace('[USER_STORY]', userStory);
    debug('Full prompt:', fullPrompt);

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
        addResponseTime(responseTime);
        
        res.json({ 
            response: responseText,
            responseTime: responseTime,
            averageResponseTime: getAverageResponseTime()
        });
    } catch (error) {
        console.error('Error details:', error);
        res.status(500).json({ error: error.message || 'An error occurred while processing your request.' });
    }
});

// Add endpoint to get average response time
app.get('/api/average-response-time', (req, res) => {
    res.json({ averageResponseTime: getAverageResponseTime() });
});

async function callAnthropicAPI(prompt) {
    if (!ANTHROPIC_API_KEY) {
        throw new Error('Anthropic API key is not configured. Please set ANTHROPIC_API_KEY in your .env file.');
    }
    
    // Validate model
    if (!VALID_ANTHROPIC_MODELS.includes(ANTHROPIC_MODEL)) {
        throw new Error(`Invalid Anthropic model: ${ANTHROPIC_MODEL}. Please use a Claude 3.x model.`);
    }
    
    debug('Sending request to Anthropic API using model:', ANTHROPIC_MODEL);
    const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
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

    debug('Anthropic API response status:', response.status);
    
    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Anthropic API error response:', errorBody);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }

    const data = await response.json();
    debug('Anthropic API response received');

    if (data.content && data.content[0] && data.content[0].text) {
        const responseText = data.content[0].text;
        
        // Print the model response to console only in debug mode
        if (DEBUG) {
            console.log('=== MODEL RESPONSE START ===');
            console.log(responseText);
            console.log('=== MODEL RESPONSE END ===');
        }
        
        return responseText;
    } else {
        throw new Error('Unexpected response structure from Anthropic API');
    }
}

async function callBedrockAPI(prompt) {
    debug('Sending request to AWS Bedrock using model:', BEDROCK_MODEL);
    
    // Validate model
    if (!VALID_BEDROCK_MODELS.includes(BEDROCK_MODEL)) {
        throw new Error(`Invalid Bedrock model: ${BEDROCK_MODEL}. Please use a Claude 3.x model.`);
    }
    
    try {
        let response;
        let responseText;
        
        // Determine if this model requires an inference profile
        const isNewerClaudeModel = BEDROCK_MODEL.includes('claude-3-5') || BEDROCK_MODEL.includes('claude-3-7');
        
        // For models that require inference profiles (like Claude 3.7), use the inference profile ID directly
        let effectiveModelId = BEDROCK_MODEL;
        if (isNewerClaudeModel && INFERENCE_PROFILES[BEDROCK_MODEL]) {
            effectiveModelId = INFERENCE_PROFILES[BEDROCK_MODEL];
            debug('Using inference profile ID as model ID:', effectiveModelId);
        }
        
        // Check if we should use the Converse API or fall back to InvokeModel
        if (USE_CONVERSE_API) {
            debug('Using Converse API');
            
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
            
            // DEBUG: Log the exact request parameters
            debug('DETAILED REQUEST PARAMS:', JSON.stringify(converseParams, null, 2));
            
            // Create and send the Converse command
            const command = new ConverseCommand(converseParams);
            response = await bedrockClient.send(command);
            
            debug('Bedrock Converse API response received');
            
            // Extract the response text from the message
            if (response.output && 
                response.output.message && 
                response.output.message.content && 
                response.output.message.content.length > 0 && 
                response.output.message.content[0].text) {
                
                responseText = response.output.message.content[0].text;
            } else {
                throw new Error('Unexpected response structure from Bedrock Converse API');
            }
        } else {
            debug('Using InvokeModel API');
            
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
            
            // DEBUG: Log the exact request parameters
            debug('DETAILED REQUEST PARAMS:', JSON.stringify(params, null, 2));
            
            // Create and send the InvokeModel command
            const command = new InvokeModelCommand(params);
            response = await bedrockClient.send(command);
            
            // Convert the response body from Uint8Array to string and parse as JSON
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            debug('Bedrock API response received');
            
            if (responseBody.content && responseBody.content[0] && responseBody.content[0].text) {
                responseText = responseBody.content[0].text;
            } else {
                throw new Error('Unexpected response structure from Bedrock API');
            }
        }
        
        // Print the model response to console only in debug mode
        if (DEBUG) {
            console.log('=== MODEL RESPONSE START ===');
            console.log(responseText);
            console.log('=== MODEL RESPONSE END ===');
        }
        
        return responseText;
    } catch (error) {
        console.error('Bedrock API error:', error);
        
        // DEBUG: Add more detailed error information
        if (error.name === 'ValidationException') {
            debug('VALIDATION ERROR DETAILS:', error);
            debug('ERROR MESSAGE:', error.message);
            if (error.$metadata) {
                debug('ERROR METADATA:', error.$metadata);
            }
        }
        
        throw new Error(`AWS Bedrock error: ${error.message}`);
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Using API provider: ${API_PROVIDER}`);
    
    if (API_PROVIDER === 'ANTHROPIC') {
        console.log(`Anthropic model: ${ANTHROPIC_MODEL}`);
        if (!VALID_ANTHROPIC_MODELS.includes(ANTHROPIC_MODEL)) {
            console.warn(`Warning: Using unsupported model ${ANTHROPIC_MODEL}. Supported models are: ${VALID_ANTHROPIC_MODELS.join(', ')}`);
        }
    } else {
        console.log(`AWS Bedrock model: ${BEDROCK_MODEL}`);
        console.log(`Using ${USE_CONVERSE_API ? 'Converse' : 'InvokeModel'} API`);
        
        // Determine if this model requires an inference profile
        const isNewerClaudeModel = BEDROCK_MODEL.includes('claude-3-5') || BEDROCK_MODEL.includes('claude-3-7');
        if (isNewerClaudeModel && INFERENCE_PROFILES[BEDROCK_MODEL]) {
            console.log(`Using inference profile ID as model ID: ${INFERENCE_PROFILES[BEDROCK_MODEL]}`);
        }
        
        if (!VALID_BEDROCK_MODELS.includes(BEDROCK_MODEL)) {
            console.warn(`Warning: Using unsupported model ${BEDROCK_MODEL}. Supported models are: ${VALID_BEDROCK_MODELS.join(', ')}`);
        }
    }
    
    console.log(`Average response time: ${getAverageResponseTime()}ms`);
    console.log(`Debug mode: ${DEBUG ? 'enabled' : 'disabled'}`);
});

// Response time tracking functions
function loadResponseTimes() {
    try {
        if (fs.existsSync(RESPONSE_TIMES_FILE)) {
            const data = fs.readFileSync(RESPONSE_TIMES_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading response times:', error);
    }
    return [];
}

function saveResponseTimes(times) {
    try {
        fs.writeFileSync(RESPONSE_TIMES_FILE, JSON.stringify(times), 'utf8');
    } catch (error) {
        console.error('Error saving response times:', error);
    }
}

function addResponseTime(responseTime) {
    // Validate input
    if (typeof responseTime !== 'number' || responseTime <= 0) {
        console.error('Invalid response time:', responseTime);
        return;
    }
    
    // Load existing times
    const times = loadResponseTimes();
    
    // Add new time
    times.push(responseTime);
    
    // Keep only the most recent entries
    const recentTimes = times.slice(-MAX_HISTORY_ENTRIES);
    
    // Save updated times
    saveResponseTimes(recentTimes);
    
    debug(`Added response time: ${responseTime}ms, Average: ${getAverageResponseTime()}ms`);
}

function getAverageResponseTime() {
    const times = loadResponseTimes();
    
    if (times.length === 0) {
        return DEFAULT_RESPONSE_TIME;
    }
    
    const sum = times.reduce((total, time) => total + time, 0);
    return Math.round(sum / times.length);
}
