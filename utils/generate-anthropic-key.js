#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt user for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Function to ensure the secrets directory exists
async function ensureSecretsDir() {
  const secretsDir = path.join(__dirname, '..', 'secrets');
  try {
    await fs.mkdir(secretsDir, { recursive: true });
    return secretsDir;
  } catch (error) {
    console.error('Error creating secrets directory:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log('Anthropic API Key Generator for STAR Stories Docker Secrets');
    console.log('-----------------------------------------------------');
    
    const apiKey = await prompt('Enter your Anthropic API key: ');
    
    if (!apiKey) {
      throw new Error('API key cannot be empty');
    }
    
    // Ensure secrets directory exists
    const secretsDir = await ensureSecretsDir();
    
    // Write API key to file
    const apiKeyPath = path.join(secretsDir, 'anthropic_api_key.txt');
    await fs.writeFile(apiKeyPath, apiKey);
    
    console.log(`Anthropic API key written to ${apiKeyPath}`);
    console.log('You can now run the application with Docker Compose using Anthropic API.');
    
  } catch (error) {
    console.error('Error saving Anthropic API key:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the main function
main();
