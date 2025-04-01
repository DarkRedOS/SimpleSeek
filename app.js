const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = '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'; // Your API key

let chatHistory = [];

function addMessage(content, isUser = false) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    messageDiv.textContent = content;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = 'Thinking...';
    document.getElementById('messages').appendChild(loadingDiv);
}

function hideLoading() {
    document.querySelector('.loading')?.remove();
}

function showError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = `Error: ${error}`;
    document.getElementById('messages').appendChild(errorDiv);
}

async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    
    if (!message) return;

    // Add user message
    addMessage(message, true);
    userInput.value = '';
    showLoading();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: "deepseek/deepseek-r1:free",
                messages: [
                    { role: "system", content: "You are an AI assistant that helps people find information." },
                    { role: "user", content: message }
                ],
                temperature: 0.7,
                max_tokens: 1000,
                top_p: 0.9
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const responseData = await response.json();
        if (responseData.choices && responseData.choices.length > 0) {
            const botMessage = responseData.choices[0].message.content;
            addMessage(botMessage, false);
            chatHistory.push({ role: "user", content: message });
            chatHistory.push({ role: "assistant", content: botMessage });
        } else {
            throw new Error('Invalid response structure');
        }
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Event listeners
document.getElementById('userInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Initial message
addMessage("Welcome! How can I help you today?", false);
