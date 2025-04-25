import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { customPrompt } from './customPrompt.mjs';
import AWS from 'aws-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

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

// Configure AWS SDK
AWS.config.update({ region: AWS_REGION });
const bedrockRuntime = new AWS.BedrockRuntime();

app.post('/generate', async (req, res) => {
    console.log('Received request:', req.body);
    const userStory = req.body.story;
    console.log('User story:', userStory);
    
    if (typeof customPrompt !== 'string') {
        console.error('Custom prompt is not a string:', customPrompt);
        return res.status(500).json({ error: 'Internal server error: Invalid custom prompt' });
    }
    
    const fullPrompt = customPrompt.replace('[USER_STORY]', userStory);
    console.log('Full prompt:', fullPrompt);

    try {
        let responseText;
        
        if (API_PROVIDER === 'ANTHROPIC') {
            responseText = await callAnthropicAPI(fullPrompt);
        } else {
            // Default to AWS Bedrock
            responseText = await callBedrockAPI(fullPrompt);
        }
        
        res.json({ response: responseText });
    } catch (error) {
        console.error('Error details:', error);
        res.status(500).json({ error: error.message || 'An error occurred while processing your request.' });
    }
});

async function callAnthropicAPI(prompt) {
    if (!ANTHROPIC_API_KEY) {
        throw new Error('Anthropic API key is not configured. Please set ANTHROPIC_API_KEY in your .env file.');
    }
    
    // Validate model
    if (!VALID_ANTHROPIC_MODELS.includes(ANTHROPIC_MODEL)) {
        throw new Error(`Invalid Anthropic model: ${ANTHROPIC_MODEL}. Please use a Claude 3.x model.`);
    }
    
    console.log('Sending request to Anthropic API using model:', ANTHROPIC_MODEL);
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

    console.log('Anthropic API response status:', response.status);
    
    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Anthropic API error response:', errorBody);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }

    const data = await response.json();
    console.log('Anthropic API response received');

    if (data.content && data.content[0] && data.content[0].text) {
        return data.content[0].text;
    } else {
        throw new Error('Unexpected response structure from Anthropic API');
    }
}

async function callBedrockAPI(prompt) {
    console.log('Sending request to AWS Bedrock using model:', BEDROCK_MODEL);
    
    // Validate model
    if (!VALID_BEDROCK_MODELS.includes(BEDROCK_MODEL)) {
        throw new Error(`Invalid Bedrock model: ${BEDROCK_MODEL}. Please use a Claude 3.x model.`);
    }
    
    // Prepare the request payload based on the model
    let payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4096,
        messages: [
            { role: "user", content: prompt }
        ]
    };
    
    const params = {
        modelId: BEDROCK_MODEL,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload)
    };
    
    try {
        const response = await bedrockRuntime.invokeModel(params).promise();
        const responseBody = JSON.parse(Buffer.from(response.body).toString());
        console.log('Bedrock API response received');
        
        if (responseBody.content && responseBody.content[0] && responseBody.content[0].text) {
            return responseBody.content[0].text;
        }
        
        throw new Error('Unexpected response structure from Bedrock API');
    } catch (error) {
        console.error('Bedrock API error:', error);
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
        if (!VALID_BEDROCK_MODELS.includes(BEDROCK_MODEL)) {
            console.warn(`Warning: Using unsupported model ${BEDROCK_MODEL}. Supported models are: ${VALID_BEDROCK_MODELS.join(', ')}`);
        }
    }
});
