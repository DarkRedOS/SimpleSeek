const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
let chatHistory = [];
let API_KEY = localStorage.getItem('openrouter_api_key');

// Check if API key exists in localStorage
if (API_KEY) {
    document.getElementById('apiContainer').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'block';
} else {
    document.getElementById('apiContainer').style.display = 'block';
    document.getElementById('chatContainer').style.display = 'none';
}

async function saveApiKey() {
    const keyInput = document.getElementById('apiKey');
    API_KEY = keyInput.value.trim();
    
    if (API_KEY) {
        const testResult = await validateApiKey(API_KEY);
        if (testResult.valid) {
            localStorage.setItem('openrouter_api_key', API_KEY);
            document.getElementById('apiContainer').style.display = 'none';
            document.getElementById('chatContainer').style.display = 'block';
        } else {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'api-error';
            errorDiv.textContent = `Invalid key: ${testResult.error}`;
            document.getElementById('apiContainer').appendChild(errorDiv);
        }
    }
}

async function validateApiKey(key) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: "deepseek/deepseek-r1:free",
                messages: [{ role: "user", content: "test" }],
                temperature: 0.7,
                max_tokens: 1
            })
        });

        if (response.status === 401) return { valid: false, error: "Unauthorized" };
        if (!response.ok) return { valid: false, error: `HTTP error ${response.status}` };
        
        await response.json();
        return { valid: true };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

function addMessage(content, isUser = false) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    if (isUser) {
        messageDiv.textContent = content;
    } else {
        messageDiv.innerHTML = marked.parse(content);
    }
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
                    ...chatHistory,
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

// Initialize chat if API key exists
if (API_KEY) {
    addMessage("Welcome back! How can I help you today?", false);
}

// Event listeners
document.getElementById('userInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Initial message
addMessage("Welcome! How can I help you today?", false);
