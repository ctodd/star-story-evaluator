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
        
        // Parse the response and create HTML structure
        const evaluationHtml = createEvaluationHtml(data.response);
        responseDiv.innerHTML = evaluationHtml;
    } catch (error) {
        console.error('Error:', error);
        responseDiv.innerHTML = `An error occurred: ${error.message}. Please try again.`;
    }
});

function createEvaluationHtml(response) {
    // This function should parse the response and create the HTML structure
    // For simplicity, I'll provide a basic implementation. You may need to adjust this
    // based on the exact structure of your Claude response.

    const parsedResponse = parseClaudeResponse(response);

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
    // This function should parse the text response from Claude into a structured object
    // You'll need to implement this based on the exact format of Claude's response
    // For now, I'll return a mock object
    return {
        totalScore: 21,
        overallEvaluation: "Excellent response",
        categories: [
            { name: "Structure", score: 3, description: "The response follows a clear STAR structure, allocating appropriate time to each element." },
            // Add other categories here
        ],
        leadershipPrinciples: [
            { name: "Customer Obsession", level: "High", description: "Focused on delivering the client's vision and addressing their concerns." },
            // Add other principles here
        ],
        improvementSuggestions: [
            "Consider highlighting any additional Amazon Leadership Principles demonstrated, such as \"Hire and Develop the Best\" (if the team's capabilities were enhanced) or \"Earn Trust\" (if efforts were made to rebuild trust with the client after the initial termination).",
            // Add other suggestions here
        ],
        talkingPoints: {
            Situation: [
                "Product manager for aerospace company website",
                "Hired by PR/marketing agency as intermediary",
                "Responsible for building customized website on CMS"
            ],
            // Add Task, Actions, Results here
        }
    };
}