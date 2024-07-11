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
        responseDiv.innerHTML = data.response.replace(/\n/g, '<br>');
    } catch (error) {
        console.error('Error:', error);
        responseDiv.innerHTML = `An error occurred: ${error.message}. Please try again.`;
    }
});