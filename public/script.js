// Store the start time when processing begins
window.processingStartTime = 0;
let averageResponseTime = 30000; // Default to 30 seconds
const DEBUG = false; // Set to true to enable debug logging

// Get AWS region from server config
let AWS_REGION = 'us-east-1'; // Default region

// Debug logger function
function debug(...args) {
    if (DEBUG) {
        console.log('[DEBUG]', ...args);
    }
}

// Fetch the average response time when the page loads
fetch('/api/average-response-time')
    .then(response => response.json())
    .then(data => {
        averageResponseTime = data.averageResponseTime;
        if (data.region) {
            AWS_REGION = data.region;
        }
        debug(`Using average response time: ${averageResponseTime}ms`);
        debug(`AWS Region: ${AWS_REGION}`);
    })
    .catch(error => {
        console.error('Error fetching average response time:', error);
    });

document.getElementById('submitBtn').addEventListener('click', async () => {
    const storyInput = document.getElementById('storyInput').value;
    const questionInput = document.getElementById('questionInput').value;
    const jobTitleInput = document.getElementById('jobTitleInput') ? document.getElementById('jobTitleInput').value : '';
    const includeBarRaiser = document.getElementById('barRaiserCheckbox').checked;
    const responseDiv = document.getElementById('response');

    // Input validation
    if (!storyInput.trim()) {
        alert('Please enter your STAR story before submitting.');
        return;
    }

    // Validate input size
    if (storyInput.length > 10000) {
        alert('Your story is too long. Please limit it to 10,000 characters.');
        return;
    }

    if (questionInput.length > 500) {
        alert('Your question is too long. Please limit it to 500 characters.');
        return;
    }
    
    if (jobTitleInput && jobTitleInput.length > 200) {
        alert('Your job title is too long. Please limit it to 200 characters.');
        return;
    }

    // Record the start time
    window.processingStartTime = Date.now();

    // Create and display the status indicator
    const statusIndicator = createStatusIndicator(includeBarRaiser);
    responseDiv.innerHTML = '';
    responseDiv.appendChild(statusIndicator);

    // Define the steps the model will "take"
    const steps = [
        { id: 'parsing', text: 'Parsing STAR story structure...' },
        { id: 'analyzing', text: 'Analyzing content against Amazon Leadership Principles...' },
        { id: 'scoring', text: 'Calculating scores for each evaluation category...' },
        { id: 'identifying', text: 'Identifying demonstrated leadership principles...' },
        { id: 'suggestions', text: 'Generating improvement suggestions...' },
        { id: 'talking-points', text: 'Creating structured talking points...' },
        { id: 'reviewing', text: 'Reviewing evaluation for accuracy...' },
        { id: 'finalizing', text: 'Finalizing evaluation report...' }
    ];
    
    // Add Bar Raiser steps if needed
    if (includeBarRaiser) {
        steps.push(
            { id: 'bar-raiser-analyzing', text: 'Bar Raiser: Conducting deep dive analysis...' },
            { id: 'bar-raiser-assessment', text: 'Bar Raiser: Determining hiring recommendation...' },
            { id: 'bar-raiser-questions', text: 'Bar Raiser: Preparing follow-up questions...' }
        );
    }

    // Add steps to the status indicator
    const stepsContainer = statusIndicator.querySelector('.status-steps');
    const progressBar = statusIndicator.querySelector('.status-progress-bar');
    
    steps.forEach((step, index) => {
        const stepElement = document.createElement('div');
        stepElement.className = 'status-step';
        stepElement.id = `step-${step.id}`;
        stepElement.innerHTML = `
            <div class="status-icon">${index + 1}</div>
            <div class="status-text">${step.text}</div>
        `;
        stepsContainer.appendChild(stepElement);
    });

    try {
        // Start the "fake" processing animation
        simulateProcessing(steps, progressBar);
        
        // Make the actual API request
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                story: storyInput,
                question: questionInput,
                jobTitle: jobTitleInput,
                includeBarRaiser: includeBarRaiser
            }),
        });

        if (!response.ok) {
            if (response.status === 500) {
                throw new Error('Server error. Please check that your AWS credentials or API keys are properly configured.');
            } else if (response.status === 401 || response.status === 403) {
                throw new Error('Authentication error. Please check your AWS credentials or API keys.');
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        }

        const data = await response.json();
        debug('Received data:', data);
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Update the average response time if provided
        if (data.averageResponseTime) {
            averageResponseTime = data.averageResponseTime;
            debug(`Updated average response time: ${averageResponseTime}ms`);
        }
        
        // Ensure the animation completes before showing results
        await ensureMinimumProcessingTime();
        
        // Replace the status indicator with the evaluation results
        if (includeBarRaiser && data.barRaiserResponse) {
            const evaluationHtml = createTabEvaluationHtml(data.response, data.barRaiserResponse);
            responseDiv.innerHTML = evaluationHtml;
            
            // Set up tab functionality
            setupTabs();
        } else {
            const evaluationHtml = createEvaluationHtml(data.response);
            responseDiv.innerHTML = evaluationHtml;
        }
    } catch (error) {
        console.error('Error:', error);
        // Ensure the animation stops
        clearTimeout(window.processingTimeout);
        
        // Create a more user-friendly error message
        let errorMessage = error.message;
        
        // Add helpful hints for common errors
        if (error.message.includes('credentials') || 
            error.message.includes('authentication') || 
            error.message.includes('API key')) {
            errorMessage = `${error.message}<br><br>
                <div class="error-hint">
                    <strong>Hint:</strong> Make sure your AWS credentials or API keys are properly configured:
                    <ul>
                        <li>Check that your AWS credentials are set up in ~/.aws/credentials</li>
                        <li>Verify that your IAM user has permission to access Bedrock</li>
                        <li>If using Anthropic directly, check that your API key is correct in .env</li>
                    </ul>
                </div>`;
        } else if (error.message.includes('Server error')) {
            errorMessage = `${error.message}<br><br>
                <div class="error-hint">
                    <strong>Hint:</strong> This could be due to:
                    <ul>
                        <li>Missing or incorrect AWS credentials</li>
                        <li>Insufficient permissions to access the selected model</li>
                        <li>The selected model may not be enabled in your AWS account</li>
                        <li>The model may not be available in the configured AWS region (${AWS_REGION})</li>
                        <li>Ensure you've enabled the model in the AWS Bedrock console for your region</li>
                    </ul>
                </div>`;
        }
        
        responseDiv.innerHTML = `<div class="error-message">${errorMessage}</div>`;
    }
});
function createStatusIndicator(includeBarRaiser = false) {
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'status-indicator';
    statusIndicator.innerHTML = `
        <h3>Evaluating Your STAR Story${includeBarRaiser ? ' with Bar Raiser Analysis' : ''}</h3>
        <div class="status-steps"></div>
        <div class="status-progress">
            <div class="status-progress-bar"></div>
        </div>
    `;
    return statusIndicator;
}

function simulateProcessing(steps, progressBar) {
    const totalSteps = steps.length;
    // Use the average response time to calculate step duration
    const totalDuration = averageResponseTime * 0.9; // Use 90% of average time to leave buffer
    const stepDuration = totalDuration / totalSteps;
    
    debug(`Simulating processing with ${totalSteps} steps over ${totalDuration}ms (${stepDuration}ms per step)`);
    
    // Start time to track overall progress
    const startTime = Date.now();
    
    // Function to update progress
    function updateProgress() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / totalDuration * 100, 99); // Cap at 99% until complete
        progressBar.style.width = `${progress}%`;
        
        // Calculate which step should be active
        const currentStepIndex = Math.min(Math.floor(elapsed / stepDuration), totalSteps - 1);
        
        // Update step states
        steps.forEach((step, index) => {
            const stepElement = document.getElementById(`step-${step.id}`);
            if (index < currentStepIndex) {
                stepElement.className = 'status-step completed';
            } else if (index === currentStepIndex) {
                stepElement.className = 'status-step active';
            } else {
                stepElement.className = 'status-step';
            }
        });
        
        // Continue updating if not complete
        if (elapsed < totalDuration) {
            window.processingTimeout = setTimeout(updateProgress, 50);
        }
    }
    
    // Start the progress updates
    updateProgress();
}

function ensureMinimumProcessingTime() {
    // Use a minimum processing time based on the average response time
    // but allow for early completion if the response is already received
    const minProcessingTime = Math.min(averageResponseTime, 35000); // Cap at 35 seconds max
    
    return new Promise(resolve => {
        const elapsed = Date.now() - window.processingStartTime;
        const remainingTime = minProcessingTime - elapsed;
        
        if (remainingTime > 0) {
            debug(`Waiting additional ${remainingTime}ms to complete animation`);
            setTimeout(() => {
                // Complete the progress bar
                const progressBar = document.querySelector('.status-progress-bar');
                if (progressBar) progressBar.style.width = '100%';
                
                // Mark all steps as completed
                document.querySelectorAll('.status-step').forEach(step => {
                    step.className = 'status-step completed';
                });
                
                setTimeout(resolve, 1000); // Longer delay to show completion
            }, remainingTime);
        } else {
            debug('Response received quickly, completing animation immediately');
            // Complete the progress bar
            const progressBar = document.querySelector('.status-progress-bar');
            if (progressBar) progressBar.style.width = '100%';
            
            // Mark all steps as completed
            document.querySelectorAll('.status-step').forEach(step => {
                step.className = 'status-step completed';
            });
            
            setTimeout(resolve, 1000); // Show completion state even if minimum time is already passed
        }
    });
}
function createEvaluationHtml(response) {
    const parsedResponse = parseClaudeResponse(response);
    
    if (!parsedResponse) {
        return '<p>Error parsing the evaluation. Please try again.</p>';
    }
    
    // Always calculate the total score from categories instead of using the model's totalScore
    const calculatedTotalScore = parsedResponse.categories.reduce((sum, category) => sum + category.score, 0);

    return `
    <div class="star-evaluation">
        <h2>STAR Response Evaluation</h2>
        
        ${parsedResponse.impliedQuestion ? `
        <div class="implied-question">
            <h3>Implied Question</h3>
            <p>${parsedResponse.impliedQuestion}</p>
        </div>
        ` : ''}
        
        <div class="score-summary">
            <h3>Total Score: <span class="highlight">${calculatedTotalScore}/21</span> - ${parsedResponse.overallEvaluation}</h3>
        </div>

        <div class="evaluation-categories">
            ${parsedResponse.categories.map(category => `
                <div class="category">
                    <h4>${category.name}</h4>
                    <p>Score: <span class="score">${category.score}</span>/3</p>
                    <p>${category.description}</p>
                </div>
            `).join('')}
        </div>

        <div class="leadership-principles">
            <h3>Alignment with Amazon Leadership Principles</h3>
            <ul>
                ${parsedResponse.leadershipPrinciples.map(principle => `
                    <li><strong>${principle.name} (${principle.level})</strong>: ${principle.description}</li>
                `).join('')}
            </ul>
        </div>

        <div class="improvement-suggestions">
            <h3>Improvement Suggestions</h3>
            <ul>
                ${parsedResponse.improvementSuggestions.map(suggestion => `
                    <li>${suggestion}</li>
                `).join('')}
            </ul>
        </div>

        <div class="talking-points">
            <h3>Talking Points</h3>
            ${Object.entries(parsedResponse.talkingPoints).map(([key, points]) => `
                <h4>${key}:</h4>
                <ul>
                    ${points.map(point => `<li>${point}</li>`).join('')}
                </ul>
            `).join('')}
        </div>
    </div>
    `;
}
function createTabEvaluationHtml(response, barRaiserResponse) {
    const parsedResponse = parseClaudeResponse(response);
    const parsedBarRaiserResponse = parseBarRaiserResponse(barRaiserResponse);
    
    if (!parsedResponse) {
        return '<p>Error parsing the evaluation. Please try again.</p>';
    }
    
    // Always calculate the total score from categories instead of using the model's totalScore
    const calculatedTotalScore = parsedResponse.categories.reduce((sum, category) => sum + category.score, 0);
    
    // Determine the assessment class based on the Bar Raiser assessment
    const assessmentClass = getAssessmentClass(parsedBarRaiserResponse.assessment);

    return `
    <div class="evaluation-tabs">
        <div class="tab active" data-tab="standard-evaluation">Standard Evaluation</div>
        <div class="tab" data-tab="bar-raiser-evaluation">Bar Raiser Evaluation</div>
    </div>
    
    <div id="standard-evaluation" class="tab-content active">
        <div class="star-evaluation">
            <h2>STAR Response Evaluation</h2>
            
            ${parsedResponse.impliedQuestion ? `
            <div class="implied-question">
                <h3>Implied Question</h3>
                <p>${parsedResponse.impliedQuestion}</p>
            </div>
            ` : ''}
            
            <div class="score-summary">
                <h3>Total Score: <span class="highlight">${calculatedTotalScore}/21</span> - ${parsedResponse.overallEvaluation}</h3>
            </div>

            <div class="evaluation-categories">
                ${parsedResponse.categories.map(category => `
                    <div class="category">
                        <h4>${category.name}</h4>
                        <p>Score: <span class="score">${category.score}</span>/3</p>
                        <p>${category.description}</p>
                    </div>
                `).join('')}
            </div>

            <div class="leadership-principles">
                <h3>Alignment with Amazon Leadership Principles</h3>
                <ul>
                    ${parsedResponse.leadershipPrinciples.map(principle => `
                        <li><strong>${principle.name} (${principle.level})</strong>: ${principle.description}</li>
                    `).join('')}
                </ul>
            </div>

            <div class="improvement-suggestions">
                <h3>Improvement Suggestions</h3>
                <ul>
                    ${parsedResponse.improvementSuggestions.map(suggestion => `
                        <li>${suggestion}</li>
                    `).join('')}
                </ul>
            </div>

            <div class="talking-points">
                <h3>Talking Points</h3>
                ${Object.entries(parsedResponse.talkingPoints).map(([key, points]) => `
                    <h4>${key}:</h4>
                    <ul>
                        ${points.map(point => `<li>${point}</li>`).join('')}
                    </ul>
                `).join('')}
            </div>
        </div>
    </div>
    
    <div id="bar-raiser-evaluation" class="tab-content">
        <div class="bar-raiser-evaluation ${assessmentClass}">
            <h2>Bar Raiser Evaluation</h2>
            
            <div class="bar-raiser-assessment ${assessmentClass}">
                <h3>Overall Assessment: ${formatBarRaiserAssessment(parsedBarRaiserResponse.assessment)}</h3>
            </div>
            
            <div class="bar-raiser-section">
                <h3>Leadership Principles Deep Dive</h3>
                <ul>
                    ${parsedBarRaiserResponse.leadershipPrinciples.map(principle => `
                        <li><strong>${principle.name}</strong>: ${principle.analysis}</li>
                    `).join('')}
                </ul>
            </div>
            
            <div class="bar-raiser-section">
                <h3>Scope and Impact Analysis</h3>
                <p>${parsedBarRaiserResponse.scopeAnalysis}</p>
            </div>
            
            <div class="bar-raiser-section">
                <h3>Decision Quality</h3>
                <p>${parsedBarRaiserResponse.decisionQuality}</p>
            </div>
            
            <div class="bar-raiser-section">
                <h3>Red Flags and Concerns</h3>
                <ul>
                    ${parsedBarRaiserResponse.redFlags.map(flag => `<li>${flag}</li>`).join('')}
                </ul>
            </div>
            
            <div class="bar-raiser-section">
                <h3>Cross-Level Assessment</h3>
                <p>${parsedBarRaiserResponse.crossLevelAssessment}</p>
            </div>
            
            <div class="bar-raiser-section">
                <h3>Bar Raiser Follow-up Questions</h3>
                <ol>
                    ${parsedBarRaiserResponse.followUpQuestions.map(question => `<li>${question}</li>`).join('')}
                </ol>
            </div>
            
            <div class="bar-raiser-section">
                <h3>Comparison to Bar</h3>
                <p>${parsedBarRaiserResponse.comparisonToBar}</p>
            </div>
        </div>
    </div>
    `;
}

// Helper function to format Bar Raiser assessment with line break after the recommendation
function formatBarRaiserAssessment(assessment) {
    // Look for common hiring recommendation patterns
    const recommendationPattern = /(Strong Hire|Inclined|Not Inclined|Strong No Hire)(\s*[-:]\s*|\s+)/i;
    const match = assessment.match(recommendationPattern);
    
    if (match) {
        // Replace the matched pattern with the recommendation followed by a line break
        return assessment.replace(recommendationPattern, `<strong>${match[1]}</strong><br><br>`);
    }
    
    return assessment;
}

// Helper function to determine the CSS class based on the assessment
function getAssessmentClass(assessment) {
    const lowerAssessment = assessment.toLowerCase();
    
    if (lowerAssessment.includes('strong hire')) {
        return 'assessment-strong-hire';
    } else if (lowerAssessment.includes('inclined') && !lowerAssessment.includes('not inclined')) {
        return 'assessment-inclined';
    } else if (lowerAssessment.includes('not inclined')) {
        return 'assessment-not-inclined';
    } else if (lowerAssessment.includes('strong no hire')) {
        return 'assessment-strong-no-hire';
    } else {
        return 'assessment-neutral';
    }
}
function parseClaudeResponse(response) {
    try {
        // First, check if the response contains a JSON object within markdown code blocks
        const jsonBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonBlockMatch) {
            debug('Found JSON in code block');
            const parsedData = JSON.parse(jsonBlockMatch[1]);
            // Always recalculate the total score from categories
            if (parsedData.categories && parsedData.categories.length > 0) {
                parsedData.totalScore = parsedData.categories.reduce((sum, category) => sum + category.score, 0);
            }
            return parsedData;
        }
        
        // Next, try to parse the entire response as JSON
        try {
            debug('Attempting to parse entire response as JSON');
            const parsedData = JSON.parse(response);
            // Always recalculate the total score from categories
            if (parsedData.categories && parsedData.categories.length > 0) {
                parsedData.totalScore = parsedData.categories.reduce((sum, category) => sum + category.score, 0);
            }
            return parsedData;
        } catch (jsonError) {
            debug('Not a direct JSON response, trying to extract JSON...');
        }
        
        // Look for JSON-like structure without code blocks
        const jsonMatch = response.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
            try {
                debug('Found JSON-like structure, attempting to parse');
                const parsedData = JSON.parse(jsonMatch[1]);
                // Always recalculate the total score from categories
                if (parsedData.categories && parsedData.categories.length > 0) {
                    parsedData.totalScore = parsedData.categories.reduce((sum, category) => sum + category.score, 0);
                }
                return parsedData;
            } catch (extractError) {
                debug('Failed to extract JSON from response');
            }
        }
        
        // If JSON parsing fails, try to extract scores from text format
        debug('Falling back to text parsing');
        
        // Create a structured object from the text response
        const result = {
            totalScore: 0,
            overallEvaluation: "",
            categories: [],
            leadershipPrinciples: [],
            improvementSuggestions: [],
            talkingPoints: {
                Situation: [],
                Task: [],
                Action: [],
                Result: []
            }
        };
        
        // Extract total score
        const totalScoreMatch = response.match(/Total Score:\s*(\d+)\/21\s*\(([^)]+)\)/i);
        if (totalScoreMatch) {
            result.totalScore = parseInt(totalScoreMatch[1], 10);
            result.overallEvaluation = totalScoreMatch[2].trim();
        }
        
        // Extract categories
        const categoryRegex = /(Structure|Relevance to Question|Specificity|Action Focus|Results\/Impact|Alignment with Amazon Leadership Principles|Communication)\s*\((\d+)\/3\):\s*([^\\n]+)/g;
        let match;
        while ((match = categoryRegex.exec(response)) !== null) {
            result.categories.push({
                name: match[1],
                score: parseInt(match[2], 10),
                description: match[3].trim()
            });
        }
        
        // Calculate total score from categories if not found directly
        if (result.categories.length > 0) {
            result.totalScore = result.categories.reduce((sum, category) => sum + category.score, 0);
            
            // Set overall evaluation based on total score
            if (result.totalScore >= 18) result.overallEvaluation = "Excellent response";
            else if (result.totalScore >= 14) result.overallEvaluation = "Good response";
            else if (result.totalScore >= 10) result.overallEvaluation = "Satisfactory response";
            else if (result.totalScore >= 6) result.overallEvaluation = "Needs improvement";
            else result.overallEvaluation = "Poor response";
        }
        
        // Extract leadership principles
        const principleRegex = /(\d+)\.\s*([^(]+)\s*\(([^)]+)\):\s*([^\\n]+)/g;
        while ((match = principleRegex.exec(response)) !== null) {
            result.leadershipPrinciples.push({
                name: match[2].trim(),
                level: match[3].trim(),
                description: match[4].trim()
            });
        }
        
        // Extract improvement suggestions
        const suggestionsSection = response.match(/Suggestions for Improvement:([\s\S]*?)(?=Bullet-Point|$)/i);
        if (suggestionsSection) {
            const suggestionRegex = /\d+\.\s*([^\\n]+)/g;
            while ((match = suggestionRegex.exec(suggestionsSection[1])) !== null) {
                result.improvementSuggestions.push(match[1].trim());
            }
        }
        
        // Extract talking points
        const talkingPointsSection = response.match(/Bullet-Point Talking Points[\s\S]*?Situation:([\s\S]*?)Task:([\s\S]*?)Action:([\s\S]*?)Result:([\s\S]*?)(?=$)/i);
        if (talkingPointsSection) {
            // Process each STAR section
            ['Situation', 'Task', 'Action', 'Result'].forEach((section, index) => {
                const sectionText = talkingPointsSection[index + 1];
                const pointRegex = /-\s*([^\\n]+)/g;
                while ((match = pointRegex.exec(sectionText)) !== null) {
                    result.talkingPoints[section].push(match[1].trim());
                }
            });
        }
        
        return result;
    } catch (error) {
        console.error('Error parsing Claude response:', error);
        if (DEBUG) {
            console.log('Raw response:', response);
        }
        return null;
    }
}

function parseBarRaiserResponse(response) {
    try {
        // Create a default structure for the Bar Raiser response
        const result = {
            assessment: "Not provided",
            leadershipPrinciples: [],
            scopeAnalysis: "Not provided",
            decisionQuality: "Not provided",
            redFlags: [],
            crossLevelAssessment: "Not provided",
            followUpQuestions: [],
            comparisonToBar: "Not provided"
        };
        
        if (!response) {
            return result;
        }
        
        // Extract overall assessment
        const assessmentMatch = response.match(/Bar Raiser Overall Assessment[:\s]*([^\.]+)/i) || 
                               response.match(/Overall Assessment[:\s]*([^\.]+)/i);
        if (assessmentMatch) {
            result.assessment = assessmentMatch[1].trim();
        }
        
        // Extract leadership principles
        const principlesSection = response.match(/Leadership Principles Deep Dive[:\s]*([\s\S]*?)(?=Scope and Impact|Red Flags|Decision|#)/i);
        if (principlesSection) {
            const principleRegex = /([A-Za-z, ]+)(?:\(Strong\)|\(Demonstrated\))?[:\s]*([\s\S]*?)(?=\n\n|\n[A-Za-z]|$)/g;
            let match;
            while ((match = principleRegex.exec(principlesSection[1])) !== null) {
                result.leadershipPrinciples.push({
                    name: match[1].trim(),
                    analysis: match[2].trim()
                });
            }
        }
        
        // Extract scope and impact analysis
        const scopeMatch = response.match(/Scope and Impact Analysis[:\s]*([\s\S]*?)(?=Decision Quality|Red Flags|#)/i);
        if (scopeMatch) {
            result.scopeAnalysis = scopeMatch[1].trim();
        }
        
        // Extract decision quality
        const decisionMatch = response.match(/Decision Quality[:\s]*([\s\S]*?)(?=Red Flags|Cross-Level|#)/i);
        if (decisionMatch) {
            result.decisionQuality = decisionMatch[1].trim();
        }
        
        // Extract red flags
        const redFlagsSection = response.match(/Red Flags and Concerns[:\s]*([\s\S]*?)(?=Cross-Level|Bar Raiser Questions|#)/i);
        if (redFlagsSection) {
            const flagsText = redFlagsSection[1];
            const flagRegex = /[-*•]\s*([^\.]+\.)/g;
            let match;
            while ((match = flagRegex.exec(flagsText)) !== null) {
                result.redFlags.push(match[1].trim());
            }
            
            // If no bullet points found, use the whole section
            if (result.redFlags.length === 0) {
                result.redFlags.push(flagsText.trim());
            }
        }
        
        // Extract cross-level assessment
        const crossLevelMatch = response.match(/Cross-Level Assessment[:\s]*([\s\S]*?)(?=Bar Raiser Questions|Comparison|#)/i);
        if (crossLevelMatch) {
            result.crossLevelAssessment = crossLevelMatch[1].trim();
        }
        
        // Extract follow-up questions
        const questionsSection = response.match(/Bar Raiser Questions[:\s]*([\s\S]*?)(?=Comparison to Bar|#)/i);
        if (questionsSection) {
            const questionRegex = /[-*•\d\.]\s*([^\.]+\?)/g;
            let match;
            while ((match = questionRegex.exec(questionsSection[1])) !== null) {
                result.followUpQuestions.push(match[1].trim());
            }
        }
        
        // Extract comparison to bar
        const comparisonMatch = response.match(/Comparison to Bar[:\s]*([\s\S]*?)(?=#|$)/i);
        if (comparisonMatch) {
            result.comparisonToBar = comparisonMatch[1].trim();
        }
        
        return result;
    } catch (error) {
        console.error('Error parsing Bar Raiser response:', error);
        if (DEBUG) {
            console.log('Raw Bar Raiser response:', response);
        }
        return {
            assessment: "Error parsing response",
            leadershipPrinciples: [],
            scopeAnalysis: "Not available",
            decisionQuality: "Not available",
            redFlags: ["Error parsing response"],
            crossLevelAssessment: "Not available",
            followUpQuestions: [],
            comparisonToBar: "Not available"
        };
    }
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}
