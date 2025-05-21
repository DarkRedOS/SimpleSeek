// Constants and Configuration
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
let API_KEY = localStorage.getItem("openrouter_api_key");
let currentModel =
  localStorage.getItem("selected_model") || "deepseek/deepseek-r1:free";
let conversations = JSON.parse(localStorage.getItem("conversations")) || [];
let currentConversationId = localStorage.getItem("current_conversation_id");
let chatHistory = [];
let settings = JSON.parse(localStorage.getItem("app_settings")) || {
  temperature: 0.7,
  max_tokens: 1000,
  top_p: 0.9,
  theme: "dark",
};

// DOM Elements
const apiContainer = document.getElementById("apiContainer");
const chatContainer = document.getElementById("chatContainer");
const messagesDiv = document.getElementById("messages");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");
const modelSelect = document.getElementById("modelSelect");
const conversationList = document.getElementById("conversationList");
const apiKeyInput = document.getElementById("apiKey");
const saveApiKeyBtn = document.getElementById("saveApiKeyBtn");
const showApiKeyBtn = document.getElementById("showApiKeyBtn");
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const temperatureSlider = document.getElementById("temperatureSlider");
const temperatureValue = document.getElementById("temperatureValue");
const maxTokensInput = document.getElementById("maxTokensInput");
const topPSlider = document.getElementById("topPSlider");
const topPValue = document.getElementById("topPValue");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
const sidebar = document.getElementById("sidebar");
const newChatBtn = document.getElementById("newChatBtn");
const exportChatBtn = document.getElementById("exportChatBtn");
const clearChatBtn = document.getElementById("clearChatBtn");
const currentChatTitle = document.getElementById("currentChatTitle");
const settingsApiKey = document.getElementById("settingsApiKey");
const showSettingsApiKeyBtn = document.getElementById("showSettingsApiKeyBtn");
const updateApiKeyBtn = document.getElementById("updateApiKeyBtn");
const themeButtons = document.querySelectorAll(".theme-btn");

// Initialize app
function initializeApp() {
  // Check if API key exists
  if (API_KEY) {
    apiContainer.style.display = "none";
    chatContainer.style.display = "flex";

    // Load current conversation or create new one
    if (
      currentConversationId &&
      conversations.find((c) => c.id === currentConversationId)
    ) {
      loadConversation(currentConversationId);
    } else {
      createNewConversation();
    }
  } else {
    apiContainer.style.display = "flex";
    chatContainer.style.display = "none";
  }

  // Initialize UI elements
  populateConversationList();
  modelSelect.value = currentModel;
  initializeSettings();
  applyTheme(settings.theme);

  // Auto-resize textarea
  userInput.addEventListener("input", autoResizeTextarea);
}

// API Key Management
async function saveApiKey() {
  const key = apiKeyInput.value.trim();

  if (key) {
    const testResult = await validateApiKey(key);
    if (testResult.valid) {
      API_KEY = key;
      localStorage.setItem("openrouter_api_key", API_KEY);
      apiContainer.style.display = "none";
      chatContainer.style.display = "flex";
      createNewConversation();
    } else {
      showError(`Invalid API key: ${testResult.error}`);
    }
  }
}

async function validateApiKey(key) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: currentModel,
        messages: [{ role: "user", content: "test" }],
        temperature: 0.7,
        max_tokens: 1,
      }),
    });

    if (response.status === 401)
      return { valid: false, error: "Unauthorized - Invalid API key" };
    if (!response.ok)
      return {
        valid: false,
        error: `HTTP error ${response.status}: ${response.statusText}`,
      };

    await response.json();
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

function toggleApiKeyVisibility(inputElement, buttonElement) {
  if (inputElement.type === "password") {
    inputElement.type = "text";
    buttonElement.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else {
    inputElement.type = "password";
    buttonElement.innerHTML = '<i class="fas fa-eye"></i>';
  }
}

// Conversation Management
function createNewConversation() {
  const timestamp = new Date();
  const newConversation = {
    id: generateId(),
    title: "New Conversation",
    created: timestamp,
    messages: [],
    model: currentModel,
  };

  conversations.unshift(newConversation);
  currentConversationId = newConversation.id;
  chatHistory = [];

  localStorage.setItem("conversations", JSON.stringify(conversations));
  localStorage.setItem("current_conversation_id", currentConversationId);

  populateConversationList();
  currentChatTitle.textContent = newConversation.title;
  messagesDiv.innerHTML = "";

  // Add welcome message
  const welcomeMessage =
    "Hi there! I'm an AI assistant powered by DeepSeek. How can I help you today?";
  addMessage(welcomeMessage, false);

  // Save the welcome message
  saveMessageToConversation("assistant", welcomeMessage);
}

function loadConversation(conversationId) {
  const conversation = conversations.find((c) => c.id === conversationId);

  if (conversation) {
    currentConversationId = conversationId;
    currentChatTitle.textContent = conversation.title;
    chatHistory = [];

    // Update model if it's different
    if (conversation.model !== currentModel) {
      currentModel = conversation.model;
      modelSelect.value = currentModel;
    }

    // Clear and repopulate messages
    messagesDiv.innerHTML = "";

    // Add all messages from the conversation
    conversation.messages.forEach((msg) => {
      addMessage(msg.content, msg.role === "user");
      chatHistory.push({ role: msg.role, content: msg.content });
    });

    localStorage.setItem("current_conversation_id", currentConversationId);
  }
}

function saveMessageToConversation(role, content) {
  const conversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  if (conversation) {
    conversation.messages.push({
      role,
      content,
      timestamp: new Date(),
    });

    // Update conversation title if it's the default and this is the first user message
    if (conversation.title === "New Conversation" && role === "user") {
      conversation.title =
        content.length > 30 ? content.substring(0, 30) + "..." : content;
      currentChatTitle.textContent = conversation.title;
    }

    localStorage.setItem("conversations", JSON.stringify(conversations));
    populateConversationList();
  }
}

function populateConversationList() {
  conversationList.innerHTML = "";

  conversations.forEach((conv) => {
    const convItem = document.createElement("div");
    convItem.className = `conversation-item ${
      conv.id === currentConversationId ? "active" : ""
    }`;
    convItem.dataset.id = conv.id;

    convItem.innerHTML = `
            <div class="conversation-title">${conv.title}</div>
            <div class="conversation-actions">
                <button class="delete-conversation" title="Delete conversation">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

    convItem.addEventListener("click", (e) => {
      if (!e.target.closest(".delete-conversation")) {
        loadConversation(conv.id);
        highlightActiveConversation(conv.id);
      }
    });

    convItem
      .querySelector(".delete-conversation")
      .addEventListener("click", (e) => {
        e.stopPropagation();
        deleteConversation(conv.id);
      });

    conversationList.appendChild(convItem);
  });
}

function highlightActiveConversation(id) {
  document.querySelectorAll(".conversation-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.id === id);
  });
}

function deleteConversation(id) {
  const isCurrentConv = id === currentConversationId;

  conversations = conversations.filter((conv) => conv.id !== id);
  localStorage.setItem("conversations", JSON.stringify(conversations));

  if (isCurrentConv) {
    if (conversations.length > 0) {
      loadConversation(conversations[0].id);
    } else {
      createNewConversation();
    }
  }

  populateConversationList();
}

function clearCurrentChat() {
  const conversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  if (conversation) {
    // Keep just the welcome message
    const welcomeMessage =
      conversation.messages.length > 0 &&
      conversation.messages[0].role === "assistant"
        ? conversation.messages[0]
        : {
            role: "assistant",
            content:
              "Hi there! I'm an AI assistant powered by DeepSeek. How can I help you today?",
            timestamp: new Date(),
          };

    conversation.messages = [welcomeMessage];
    conversation.title = "New Conversation";
    currentChatTitle.textContent = conversation.title;

    localStorage.setItem("conversations", JSON.stringify(conversations));
    populateConversationList();

    // Clear and reset chat
    messagesDiv.innerHTML = "";
    addMessage(welcomeMessage.content, false);
    chatHistory = [
      { role: welcomeMessage.role, content: welcomeMessage.content },
    ];
  }
}

function exportCurrentChat() {
  const conversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  if (conversation) {
    // Format conversation as markdown
    let markdown = `# ${conversation.title}\n`;
    markdown += `*Generated on ${new Date().toLocaleString()}*\n\n`;
    markdown += `*Model: ${conversation.model}*\n\n`;

    conversation.messages.forEach((msg) => {
      const role = msg.role === "user" ? "You" : "AI";
      markdown += `## ${role}\n${msg.content}\n\n`;
    });

    // Create and trigger download
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${conversation.title
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}_chat_export.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Message Handling
function addMessage(content, isUser = false) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isUser ? "user-message" : "bot-message"}`;

  if (isUser) {
    messageDiv.textContent = content;
  } else {
    // Process markdown for bot messages
    messageDiv.innerHTML = marked.parse(content);

    // Apply syntax highlighting to code blocks
    messageDiv.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block);
    });
  }

  // Add timestamp
  const timestamp = document.createElement("div");
  timestamp.className = "message-timestamp";
  timestamp.textContent = new Date().toLocaleTimeString();
  messageDiv.appendChild(timestamp);

  messagesDiv.appendChild(messageDiv);
  scrollToBottom();
}

function showLoading() {
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "loading";
  loadingDiv.innerHTML = `
        Thinking
        <div class="dot-typing"></div>
        <div class="dot-typing"></div>
        <div class="dot-typing"></div>
    `;
  messagesDiv.appendChild(loadingDiv);
  scrollToBottom();
}

function hideLoading() {
  const loadingEl = document.querySelector(".loading");
  if (loadingEl) loadingEl.remove();
}

function showError(error) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error";
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> Error: ${error}`;
  messagesDiv.appendChild(errorDiv);
  scrollToBottom();
}

function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendMessage() {
  const message = userInput.value.trim();

  if (!message) return;

  // Add user message
  addMessage(message, true);
  saveMessageToConversation("user", message);
  userInput.value = "";
  autoResizeTextarea();
  showLoading();

  // Get current model from dropdown
  currentModel = modelSelect.value;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: currentModel,
        messages: [
          {
            role: "system",
            content: "You are a helpful and knowledgeable AI assistant.",
          },
          ...chatHistory,
          { role: "user", content: message },
        ],
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
        top_p: settings.top_p,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();

    if (responseData.choices && responseData.choices.length > 0) {
      const botMessage = responseData.choices[0].message.content;

      // Add to UI
      hideLoading();
      addMessage(botMessage, false);

      // Update history and save
      chatHistory.push({ role: "user", content: message });
      chatHistory.push({ role: "assistant", content: botMessage });
      saveMessageToConversation("assistant", botMessage);
    } else {
      throw new Error("Invalid response structure");
    }
  } catch (error) {
    hideLoading();
    showError(error.message);
  }
}

// Settings Management
function initializeSettings() {
  temperatureSlider.value = settings.temperature;
  temperatureValue.textContent = settings.temperature;

  maxTokensInput.value = settings.max_tokens;

  topPSlider.value = settings.top_p;
  topPValue.textContent = settings.top_p;

  // Set active theme button
  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === settings.theme);
  });

  if (API_KEY) {
    settingsApiKey.value = API_KEY;
  }
}

function saveSettings() {
  settings = {
    temperature: parseFloat(temperatureSlider.value),
    max_tokens: parseInt(maxTokensInput.value),
    top_p: parseFloat(topPSlider.value),
    theme: settings.theme,
  };

  localStorage.setItem("app_settings", JSON.stringify(settings));
  settingsModal.style.display = "none";
}

function updateApiKey() {
  const newKey = settingsApiKey.value.trim();

  if (newKey && newKey !== API_KEY) {
    validateApiKey(newKey).then((result) => {
      if (result.valid) {
        API_KEY = newKey;
        localStorage.setItem("openrouter_api_key", API_KEY);
        alert("API key updated successfully!");
      } else {
        alert(`Invalid API key: ${result.error}`);
      }
    });
  }
}

function applyTheme(themeName) {
  if (themeName === "light") {
    document.body.classList.add("light-theme");
  } else if (themeName === "dark") {
    document.body.classList.remove("light-theme");
  } else if (themeName === "system") {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    document.body.classList.toggle("light-theme", !prefersDark);
  }

  settings.theme = themeName;
  localStorage.setItem("app_settings", JSON.stringify(settings));

  // Update active button
  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === themeName);
  });
}

// Helper Functions
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function autoResizeTextarea() {
  userInput.style.height = "auto";
  userInput.style.height = userInput.scrollHeight + "px";

  // Cap the height
  if (userInput.scrollHeight > 200) {
    userInput.style.height = "200px";
  }
}

function toggleSidebar() {
  sidebar.classList.toggle("open");
}

// Event Listeners
function setupEventListeners() {
  // API key form
  saveApiKeyBtn.addEventListener("click", saveApiKey);
  showApiKeyBtn.addEventListener("click", () =>
    toggleApiKeyVisibility(apiKeyInput, showApiKeyBtn)
  );
  apiKeyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveApiKey();
  });

  // Chat input
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  sendButton.addEventListener("click", sendMessage);

  // Model selection
  modelSelect.addEventListener("change", () => {
    currentModel = modelSelect.value;
    localStorage.setItem("selected_model", currentModel);

    // Update current conversation model
    const conversation = conversations.find(
      (c) => c.id === currentConversationId
    );
    if (conversation) {
      conversation.model = currentModel;
      localStorage.setItem("conversations", JSON.stringify(conversations));
    }
  });

  // Settings
  settingsBtn.addEventListener("click", () => {
    settingsModal.style.display = "block";
  });

  closeSettingsBtn.addEventListener("click", () => {
    settingsModal.style.display = "none";
  });

  saveSettingsBtn.addEventListener("click", saveSettings);

  temperatureSlider.addEventListener("input", () => {
    temperatureValue.textContent = temperatureSlider.value;
  });

  topPSlider.addEventListener("input", () => {
    topPValue.textContent = topPSlider.value;
  });

  showSettingsApiKeyBtn.addEventListener("click", () =>
    toggleApiKeyVisibility(settingsApiKey, showSettingsApiKeyBtn)
  );
  updateApiKeyBtn.addEventListener("click", updateApiKey);

  // Theme selection
  themeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      applyTheme(btn.dataset.theme);
    });
  });

  // Sidebar toggle
  toggleSidebarBtn.addEventListener("click", toggleSidebar);

  // Conversation actions
  newChatBtn.addEventListener("click", createNewConversation);
  exportChatBtn.addEventListener("click", exportCurrentChat);
  clearChatBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear the current chat?")) {
      clearCurrentChat();
    }
  });

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      settingsModal.style.display = "none";
    }
  });

  // NEW FEATURE: Close sidebar when clicking outside
  window.addEventListener("click", (e) => {
    // Check if the sidebar is open and the click is outside the sidebar AND not on the toggle button
    if (
      sidebar.classList.contains("open") &&
      !sidebar.contains(e.target) &&
      !toggleSidebarBtn.contains(e.target)
    ) {
      toggleSidebar(); // Close the sidebar
    }
  });
}

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  initializeApp();
});
