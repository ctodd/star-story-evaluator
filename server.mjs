import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { customPrompt } from './customPrompt.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-3-sonnet-20240229';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

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
                    { role: "user", content: fullPrompt }
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
        console.log('Anthropic API response data:', JSON.stringify(data, null, 2));

        if (data.content && data.content[0] && data.content[0].text) {
            res.json({ response: data.content[0].text });
        } else {
            throw new Error('Unexpected response structure from Anthropic API');
        }
    } catch (error) {
        console.error('Error details:', error);
        res.status(500).json({ error: error.message || 'An error occurred while processing your request.' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});