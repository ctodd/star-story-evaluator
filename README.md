# STAR Stories Evaluator

A web application that helps users improve their STAR (Situation, Task, Action, Result) responses for behavioral interviews, with a specific focus on Amazon's Leadership Principles.

## NOT FOR PRODUCTION USE!

This project is a proof of concept created with AI generated code. While some reasonable security best practices have been implemented, no authentication or other necessary protections have been built-in. The code is meant to be run locally only. See: Security Considerations below.

## Overview

The STAR Stories Evaluator is designed to help job candidates prepare for behavioral interviews by providing automated feedback on their STAR format responses. The application analyzes user-submitted stories, evaluates them against a comprehensive rubric, and provides detailed feedback including:

- Scores across multiple evaluation criteria
- Identification of demonstrated Amazon Leadership Principles
- Specific improvement suggestions
- Structured talking points for interview preparation
- Implied behavioral question analysis

## Features

- Web-based interface for submitting STAR stories
- Optional behavioral question input
- AI-powered evaluation using Claude AI models
- Support for both AWS Bedrock and Anthropic direct API
- Comprehensive scoring based on a 7-category rubric
- Detailed feedback aligned with Amazon's Leadership Principles
- Talking points generation for interview preparation

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js with Express
- **AI Integration**: 
  - AWS Bedrock (default)
  - Anthropic Claude API (optional)
- **Dependencies**: 
  - express
  - dotenv
  - node-fetch
  - @aws-sdk/client-bedrock-runtime

## Installation

### Option 1: Local Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd STAR_Stories
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory (or copy from .env.example):
   ```
   # API Provider: BEDROCK or ANTHROPIC (defaults to BEDROCK)
   API_PROVIDER=BEDROCK
   
   # AWS Bedrock Configuration
   AWS_REGION=us-east-1
   # Available Claude 3.x models on Bedrock:
   # For Claude 3.0 models, use the model ID directly:
   # BEDROCK_MODEL=anthropic.claude-3-sonnet-20240229-v1:0
   # BEDROCK_MODEL=anthropic.claude-3-haiku-20240307-v1:0
   # BEDROCK_MODEL=anthropic.claude-3-opus-20240229-v1:0
   #
   # For Claude 3.5/3.7 models, the system will automatically use the correct inference profile ID
   # BEDROCK_MODEL=us.anthropic.claude-3-5-sonnet-20240620-v1:0
   # BEDROCK_MODEL=us.anthropic.claude-3-5-sonnet-20241022-v2:0
   # BEDROCK_MODEL=us.anthropic.claude-3-5-haiku-20241022-v1:0
   # BEDROCK_MODEL=us.anthropic.claude-3-7-sonnet-20250219-v1:0
   
   # Debug mode (true/false)
   DEBUG=false
   
   # Anthropic Direct API Configuration (only needed if API_PROVIDER=ANTHROPIC)
   # ANTHROPIC_API_KEY=your_api_key_here
   # Available Claude 3.x models via direct API:
   # ANTHROPIC_MODEL=claude-3-opus-20240229
   # ANTHROPIC_MODEL=claude-3-sonnet-20240229
   # ANTHROPIC_MODEL=claude-3-haiku-20240307
   # ANTHROPIC_MODEL=claude-3-5-sonnet-20240620
   # ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
   # ANTHROPIC_MODEL=claude-3-5-haiku-20241022
   # ANTHROPIC_MODEL=claude-3-7-sonnet-20250219
   
   PORT=3000
   ```

4. Configure AWS credentials:
   - If using AWS Bedrock (default), ensure your AWS credentials are properly configured in `~/.aws/credentials` or via environment variables.

5. Start the server:
   ```
   npm start
   ```

### Option 2: Docker Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd STAR_Stories
   ```

2. **Set up credentials using Docker secrets**:

   a. Create the secrets directory:
   ```
   mkdir -p ./secrets
   ```

   b. Generate AWS credentials (choose one method):
   
   * Using the provided utility:
     ```
     npm run generate:aws
     ```
   
   * Manually with AWS CLI:
     ```
     # Generate temporary session token
     aws sts get-session-token --duration-seconds 3600
     
     # Save credentials to files
     echo "YOUR_ACCESS_KEY_ID" > ./secrets/aws_access_key_id.txt
     echo "YOUR_SECRET_ACCESS_KEY" > ./secrets/aws_secret_access_key.txt
     echo "YOUR_SESSION_TOKEN" > ./secrets/aws_session_token.txt
     ```

   c. Set up Anthropic API key (if using Anthropic directly):
   
   * Using the provided utility:
     ```
     npm run generate:anthropic
     ```
   
   * Manually:
     ```
     echo "YOUR_ANTHROPIC_API_KEY" > ./secrets/anthropic_api_key.txt
     ```

3. Build and run using Docker Compose:
   ```bash
   # For AWS Bedrock (default)
   npm run docker:bedrock
   
   # For Anthropic API (requires setting up Anthropic API key)
   npm run generate:anthropic  # Create the Anthropic API key file
   npm run docker:anthropic    # Start Docker with Anthropic configuration
   ```
   
   This will:
   - Build the Docker image
   - Set up the necessary credential files
   - Start the container on port 3000

4. Access the application at `http://localhost:3000`

## Usage

1. Enter your STAR story in the text area on the homepage
   - Make sure to label each section with **Situation:**, **Task:**, **Action:**, and **Result:** for best results
2. Optionally enter the behavioral question you're answering
3. Click "Submit for Evaluation" to send your story for evaluation
4. Review the detailed feedback, including:
   - Total score and overall evaluation
   - Scores for each evaluation category
   - Identified Amazon Leadership Principles
   - Improvement suggestions
   - Structured talking points
   - Implied behavioral question (if no question was provided)

## Evaluation Criteria

The application evaluates STAR stories based on seven criteria:

1. **Structure** - Organization and completeness of the STAR format
2. **Relevance to Question** - How well the response addresses the implied question
3. **Specificity** - Level of detail and concrete examples
4. **Action Focus** - Clarity and detail of actions taken
5. **Results/Impact** - Clarity and quantification of outcomes
6. **Alignment with Amazon Leadership Principles** - Demonstration of Amazon's values
7. **Communication** - Clarity, organization, and conciseness

## Amazon Leadership Principles

The application specifically evaluates responses against 14 of Amazon's 16 Leadership Principles:

- Customer Obsession
- Ownership
- Invent and Simplify
- Are Right, A Lot
- Learn and Be Curious
- Hire and Develop the Best
- Insist on the Highest Standards
- Think Big
- Bias for Action
- Frugality
- Earn Trust
- Dive Deep
- Have Backbone; Disagree and Commit
- Deliver Results

## Docker Configuration

The application includes Docker support for easy deployment:

- **Dockerfile**: Defines the container image based on Node.js
- **docker-compose.yml**: Provides a complete setup with Docker secrets
- **.dockerignore**: Excludes unnecessary files from the Docker image

### Docker Profiles

The Docker Compose configuration uses profiles to manage different service configurations:

- **default**: Uses AWS Bedrock for AI processing
- **anthropic**: Uses Anthropic API directly for AI processing

### Environment Variables

When running with Docker, you can configure the application using environment variables in the docker-compose.yml file:

```yaml
environment:
  - PORT=3000
  - DEBUG=false
  - API_PROVIDER=BEDROCK
  - BEDROCK_MODEL=us.anthropic.claude-3-7-sonnet-20250219-v1:0
  - AWS_REGION=us-west-2
```

### Docker Secrets

The application uses Docker secrets to securely manage credentials:

```yaml
secrets:
  - anthropic_api_key
  - aws_access_key_id
  - aws_secret_access_key
  - aws_session_token
```

This approach is more secure than environment variables or mounting the entire ~/.aws directory, as it:

1. Isolates only the specific credentials needed
2. Prevents credentials from appearing in environment variables
3. Allows for fine-grained access control
4. Supports temporary credentials with defined lifetimes

## Security Considerations

This application is designed as a proof of concept and includes some basic security measures, but is **NOT** intended for production use. The following security considerations have been implemented:

1. **Input Validation** - Basic validation of user inputs to prevent malformed requests
2. **Secure Debug Logging** - Sensitive data is redacted in debug logs
3. **Request Size Limits** - Limits on the size of story and question inputs
4. **Security Headers** - Basic security headers to help prevent common web vulnerabilities
5. **Sanitized Error Messages** - Error messages are sanitized before being sent to clients
6. **Asynchronous File Operations** - Secure file operations with proper error handling
7. **Content Security Policy** - CSP headers to help prevent XSS attacks

For production deployment, additional security measures would be necessary:

1. **Authentication** - Implement user authentication and authorization
2. **Rate Limiting** - Add rate limiting to prevent abuse
3. **HTTPS Enforcement** - Require HTTPS for all connections
4. **CSRF Protection** - Implement CSRF tokens for form submissions
5. **Secure Credential Management** - Use AWS IAM roles or secrets management
6. **Input Sanitization** - More thorough sanitization of user inputs
7. **Logging and Monitoring** - Implement comprehensive logging and monitoring
8. **Regular Security Updates** - Keep dependencies updated with security patches
9. **Penetration Testing** - Regular security testing
10. **Data Encryption** - Encrypt sensitive data at rest and in transit

## Secure Credential Management

The application supports multiple methods for securely managing credentials:

### Option 1: Environment Variables

You can provide credentials via environment variables:

```
# AWS credentials
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_SESSION_TOKEN=your_session_token

# Anthropic API key
ANTHROPIC_API_KEY=your_api_key
```

### Option 2: Docker Secrets (Recommended)

Docker secrets provide a secure way to manage sensitive information. The application is configured to read credentials from Docker secrets.

1. **Generate AWS Credentials**:
   ```
   npm run generate:aws
   ```
   This utility provides three options:
   - Use existing AWS profile credentials
   - Generate temporary session token (recommended)
   - Assume an IAM role with limited permissions (most secure)

2. **Generate Anthropic API Key**:
   ```
   npm run generate:anthropic
   ```

The credentials are stored in the `./secrets` directory and mounted as Docker secrets. They are never exposed in environment variables or logs.

### Manual Credential Management

If you prefer not to use the provided utilities, you can manually create and manage the credential files:

#### Manual AWS Credential Generation

1. **Create the secrets directory**:
   ```
   mkdir -p ./secrets
   ```

2. **Generate temporary AWS credentials** using the AWS CLI:
   ```
   aws sts get-session-token --duration-seconds 3600
   ```
   
   Or to assume a role with limited permissions:
   ```
   aws sts assume-role --role-arn arn:aws:iam::123456789012:role/BedockInvokeRole --role-session-name STARStoriesSession --duration-seconds 3600
   ```

3. **Create individual credential files** in the `./secrets` directory:
   ```
   echo "YOUR_ACCESS_KEY_ID" > ./secrets/aws_access_key_id.txt
   echo "YOUR_SECRET_ACCESS_KEY" > ./secrets/aws_secret_access_key.txt
   echo "YOUR_SESSION_TOKEN" > ./secrets/aws_session_token.txt
   ```

#### Manual Anthropic API Key Setup

1. **Create the Anthropic API key file**:
   ```
   echo "YOUR_ANTHROPIC_API_KEY" > ./secrets/anthropic_api_key.txt
   ```

This manual approach gives you full control over the credential files and allows you to inspect exactly what is being stored before running the application.

### Security Best Practices

1. **Use Temporary Credentials**: Generate short-lived AWS credentials using the provided utility
2. **Least Privilege**: Create an IAM role with permissions limited to Bedrock model invocation
3. **Credential Isolation**: The Docker setup ensures credentials are isolated to the container
4. **Secret Rotation**: Regularly rotate credentials, especially for production use

### AWS IAM Policy Example

Create an IAM policy with minimal permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:Converse"
      ],
      "Resource": [
        "arn:aws:bedrock:*:*:foundation-model/anthropic.claude-*"
      ]
    }
  ]
}
```

1. **Create the Anthropic API key file**:
   ```
   echo "YOUR_ANTHROPIC_API_KEY" > ./secrets/anthropic_api_key.txt
   ```

This manual approach gives you full control over the credential files and allows you to inspect exactly what is being stored before running the application.

## Project Structure

- `server.mjs` - Express server and API endpoint
- `customPrompt.mjs` - AI prompt template for Claude
- `public/` - Frontend files
  - `index.html` - Main application page
  - `styles.css` - Application styling
  - `script.js` - Frontend JavaScript for handling user interactions
- `Dockerfile` - Container definition for Docker deployment
- `docker-compose.yml` - Docker Compose configuration

## License

AGPL V3
See; License.md

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
