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
        return JSON.parse(response);
    } catch (error) {
        console.error('Error parsing Claude response:', error);
        return null;
    }
}