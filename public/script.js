document.getElementById('submitBtn').addEventListener('click', async () => {
    const storyInput = document.getElementById('storyInput').value;
    const responseDiv = document.getElementById('response');

    responseDiv.innerHTML = 'Processing...';

    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ story: storyInput }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received data:', data);
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        const evaluationHtml = createEvaluationHtml(data.response);
        responseDiv.innerHTML = evaluationHtml;
    } catch (error) {
        console.error('Error:', error);
        responseDiv.innerHTML = `An error occurred: ${error.message}. Please try again.`;
    }
});

function createEvaluationHtml(response) {
    const parsedResponse = parseClaudeResponse(response);
    
    if (!parsedResponse) {
        return '<p>Error parsing the evaluation. Please try again.</p>';
    }

    return `
    <div class="star-evaluation">
        <h2>STAR Response Evaluation</h2>
        
        <div class="score-summary">
            <h3>Total Score: <span class="highlight">${parsedResponse.totalScore}/21</span> - ${parsedResponse.overallEvaluation}</h3>
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

function parseClaudeResponse(response) {
    try {
        // First attempt to parse as JSON
        return JSON.parse(response);
    } catch (error) {
        console.error('Error parsing Claude response as JSON:', error);
        
        // If JSON parsing fails, try to extract scores from text format
        try {
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
            if (result.totalScore === 0 && result.categories.length > 0) {
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
        } catch (textParseError) {
            console.error('Error parsing Claude response as text:', textParseError);
            return null;
        }
    }
}