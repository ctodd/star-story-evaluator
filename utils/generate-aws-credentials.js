#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { STSClient, AssumeRoleCommand, GetSessionTokenCommand } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-providers';
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

// Function to write credentials to secret files
async function writeCredentialsToFiles(credentials, secretsDir) {
  try {
    await fs.writeFile(path.join(secretsDir, 'aws_access_key_id.txt'), credentials.accessKeyId);
    await fs.writeFile(path.join(secretsDir, 'aws_secret_access_key.txt'), credentials.secretAccessKey);
    
    if (credentials.sessionToken) {
      await fs.writeFile(path.join(secretsDir, 'aws_session_token.txt'), credentials.sessionToken);
    } else {
      // Create an empty file if no session token
      await fs.writeFile(path.join(secretsDir, 'aws_session_token.txt'), '');
    }
    
    console.log(`Credentials written to ${secretsDir}`);
    console.log(`Expiration: ${credentials.expiration || 'N/A'}`);
  } catch (error) {
    console.error('Error writing credential files:', error);
    throw error;
  }
}

// Function to get temporary credentials using STS AssumeRole
async function getTemporaryCredentialsWithRole(profile, roleArn, region, durationSeconds) {
  try {
    // Load credentials from the specified profile
    const baseCredentials = fromIni({ profile });
    
    // Create STS client with the profile credentials
    const stsClient = new STSClient({ 
      region,
      credentials: baseCredentials
    });
    
    const params = {
      RoleArn: roleArn,
      RoleSessionName: 'STARStoriesSession',
      DurationSeconds: durationSeconds
    };
    
    const command = new AssumeRoleCommand(params);
    const response = await stsClient.send(command);
    
    return {
      accessKeyId: response.Credentials.AccessKeyId,
      secretAccessKey: response.Credentials.SecretAccessKey,
      sessionToken: response.Credentials.SessionToken,
      expiration: response.Credentials.Expiration
    };
  } catch (error) {
    console.error('Error assuming role:', error);
    throw error;
  }
}

// Function to get temporary session token
async function getSessionToken(profile, region, durationSeconds) {
  try {
    // Load credentials from the specified profile
    const baseCredentials = fromIni({ profile });
    
    // Create STS client with the profile credentials
    const stsClient = new STSClient({ 
      region,
      credentials: baseCredentials
    });
    
    const params = {
      DurationSeconds: durationSeconds
    };
    
    const command = new GetSessionTokenCommand(params);
    const response = await stsClient.send(command);
    
    return {
      accessKeyId: response.Credentials.AccessKeyId,
      secretAccessKey: response.Credentials.SecretAccessKey,
      sessionToken: response.Credentials.SessionToken,
      expiration: response.Credentials.Expiration
    };
  } catch (error) {
    console.error('Error getting session token:', error);
    throw error;
  }
}

// Function to use existing credentials from a profile
async function useExistingCredentials(profile) {
  try {
    // Load credentials from the specified profile
    const credentials = fromIni({ profile });
    
    // Get the actual credentials
    const resolvedCredentials = await credentials();
    
    return {
      accessKeyId: resolvedCredentials.accessKeyId,
      secretAccessKey: resolvedCredentials.secretAccessKey,
      sessionToken: resolvedCredentials.sessionToken,
      expiration: null // No expiration for static credentials
    };
  } catch (error) {
    console.error('Error loading credentials from profile:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log('AWS Credential Generator for STAR Stories Docker Secrets');
    console.log('-----------------------------------------------------');
    
    const credentialType = await prompt(
      'Select credential type:\n' +
      '1. Use existing AWS profile\n' +
      '2. Generate temporary session token\n' +
      '3. Assume IAM role\n' +
      'Enter choice (1-3): '
    );
    
    const profile = await prompt('Enter AWS profile name [default]: ') || 'default';
    const region = await prompt('Enter AWS region [us-west-2]: ') || 'us-west-2';
    
    let credentials;
    
    switch (credentialType) {
      case '1':
        console.log(`Using existing credentials from profile: ${profile}`);
        credentials = await useExistingCredentials(profile);
        break;
        
      case '2':
        const sessionDuration = parseInt(await prompt('Enter session duration in seconds [3600]: ') || '3600');
        console.log(`Generating temporary session token using profile: ${profile}`);
        credentials = await getSessionToken(profile, region, sessionDuration);
        break;
        
      case '3':
        const roleArn = await prompt('Enter role ARN to assume: ');
        const roleDuration = parseInt(await prompt('Enter role session duration in seconds [3600]: ') || '3600');
        console.log(`Assuming role: ${roleArn} using profile: ${profile}`);
        credentials = await getTemporaryCredentialsWithRole(profile, roleArn, region, roleDuration);
        break;
        
      default:
        throw new Error('Invalid selection');
    }
    
    // Ensure secrets directory exists
    const secretsDir = await ensureSecretsDir();
    
    // Write credentials to files
    await writeCredentialsToFiles(credentials, secretsDir);
    
    console.log('Credentials generated successfully!');
    console.log('You can now run the application with Docker Compose.');
    
  } catch (error) {
    console.error('Error generating credentials:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the main function
main();
