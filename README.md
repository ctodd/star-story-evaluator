# STAR Stories Evaluator

A web application that helps users improve their STAR (Situation, Task, Action, Result) responses for behavioral interviews, with a specific focus on Amazon's Leadership Principles.

## Overview

The STAR Stories Evaluator is designed to help job candidates prepare for behavioral interviews by providing automated feedback on their STAR format responses. The application analyzes user-submitted stories, evaluates them against a comprehensive rubric, and provides detailed feedback including:

- Scores across multiple evaluation criteria
- Identification of demonstrated Amazon Leadership Principles
- Specific improvement suggestions
- Structured talking points for interview preparation

## Features

- Web-based interface for submitting STAR stories
- AI-powered evaluation using Claude AI (Anthropic's Claude-3-Sonnet model)
- Comprehensive scoring based on a 7-category rubric
- Detailed feedback aligned with Amazon's Leadership Principles
- Talking points generation for interview preparation

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js with Express
- **AI Integration**: Anthropic's Claude API
- **Dependencies**: 
  - express
  - dotenv
  - node-fetch

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

3. Create a `.env` file in the root directory with your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   PORT=3000
   # Optional: Specify a custom Claude model
   # ANTHROPIC_MODEL=claude-3-opus-20240229
   ```

4. Start the server:
   ```
   node server.mjs
   ```
   
   Alternatively, use the provided script:
   ```
   ./run.sh
   ```

5. Access the application at `http://localhost:3000`

## Usage

1. Enter your STAR story in the text area on the homepage
2. Click "Submit" to send your story for evaluation
3. Review the detailed feedback, including:
   - Total score and overall evaluation
   - Scores for each evaluation category
   - Identified Amazon Leadership Principles
   - Improvement suggestions
   - Structured talking points

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
