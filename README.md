# STAR Stories Evaluator

A web application that helps users improve their STAR (Situation, Task, Action, Result) responses for behavioral interviews, with a specific focus on Amazon's Leadership Principles.

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

1. Clone the repository:
   ```
   git clone <repository-url>
   cd STAR_Stories
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory:
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
   # BEDROCK_MODEL=anthropic.claude-3-5-sonnet-20240620-v1:0
   # BEDROCK_MODEL=anthropic.claude-3-5-sonnet-20241022-v2:0
   # BEDROCK_MODEL=anthropic.claude-3-5-haiku-20241022-v1:0
   # BEDROCK_MODEL=anthropic.claude-3-7-sonnet-20250219-v1:0
   
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
   
   Alternatively, use the provided script:
   ```
   ./run.sh
   ```

6. Access the application at `http://localhost:3000`

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

The application specifically evaluates responses against Amazon's 14 Leadership Principles:

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

## Project Structure

- `server.mjs` - Express server and API endpoint
- `customPrompt.mjs` - AI prompt template for Claude
- `public/` - Frontend files
  - `index.html` - Main application page
  - `styles.css` - Application styling
  - `script.js` - Frontend JavaScript for handling user interactions

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
