const resetButton = document.getElementById('resetChat');

// Reset chat when button is clicked
resetButton.addEventListener('click', () => {
    localStorage.removeItem('conversationHistory'); // Clear local storage
    conversationHistory = []; // Reset chat history array
    chatBox.innerHTML = ""; // Clear UI chat messages
    displayWelcomeMessageIfNeeded(); // Show welcome message again

    // Abort the ongoing fetch request if any
    if (abortController) {
        abortController.abort();
    }
});

const chatBox = document.getElementById('chatBox'),
  userInput = document.getElementById('userInput'),
  sendButton = document.getElementById('sendButton');
const apiUrl = "https://server-groq-api.onrender.com/chat"; // Updated API URL

// Initialize markdown-it
const md = new markdownit({ breaks: true, html: false });

// Keep track of the conversation history for continuous conversation
let conversationHistory = [];
let abortController; // Declare AbortController

// Function to add message with Markdown parsing (except for user messages)
const addMessage = (content, sender) => {
  let msg = document.createElement('div');
  msg.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');

  if (sender === 'user') {
    msg.textContent = content; // User message: plain text (no markdown rendering)
  } else {
    const normalizedContent = content.replace(/\n{2,}/g, '\n'); // Converts multiple \n\n\n to a single \n
    msg.innerHTML = md.render(normalizedContent);
  }

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
};

// Function to load chat history from local storage
const loadChatHistory = () => {
  const savedHistory = JSON.parse(localStorage.getItem('conversationHistory'));
  if (savedHistory) {
    savedHistory.forEach(message => {
      addMessage(message.content, message.role);
      // Ensure that the conversationHistory array is updated accordingly
      conversationHistory.push(message);
    });
  }
};

// Function to save chat history to local storage
const saveChatHistory = () => {
  localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
};

// Function to handle sending a message
const sendMessage = () => {
  let message = userInput.value.trim();
  if (!message) return;
  addMessage(message, 'user');
  userInput.value = '';
  userInput.style.height = "100px"; // Adjusted height
  sendButton.disabled = true;

  // Add the user message to the conversation history
  conversationHistory.push({ role: "user", content: message });
  saveChatHistory(); // Save chat history to local storage

  // Show "Thinking..." message before the response
  const thinkingMessage = document.createElement('div');
  thinkingMessage.classList.add('message', 'thinking-message');
  thinkingMessage.textContent = "Thinking... 💬";
  chatBox.appendChild(thinkingMessage);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Create a new AbortController for each request
  abortController = new AbortController();
  const { signal } = abortController;

  // Send the conversation history to the API using fetch()
  fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: conversationHistory }),
      signal: signal, // Attach the signal to fetch request
    })
    .then(response => response.json())
    .then(res => {
      console.log(res); // Log the response to inspect its structure
      // Remove Thinking... message after response
      thinkingMessage.remove();

      // Check if the response has the expected message
      if (res && res.response) {
        const botResponse = res.response || "Unexpected response format.";
        addMessage(botResponse, 'bot');
        conversationHistory.push({ role: "assistant", content: botResponse });
        saveChatHistory(); // Save updated chat history to local storage
      } else {
        addMessage("Error: Unexpected response format.", 'bot');
      }
    })
    .catch((error) => {
      if (error.name === 'AbortError') {
        console.log('Fetch request was aborted');
      } else {
        thinkingMessage.remove();
        const errorMsg = document.createElement('div');
        errorMsg.classList.add('message', 'bot-message', 'error-message');
        errorMsg.textContent = "Error: Could not reach AI service.";
        chatBox.appendChild(errorMsg);
        chatBox.scrollTop = chatBox.scrollHeight;
      }
    });
};

// Function to remove the welcome message once the user sends a message
const removeWelcomeMessage = () => {
  const welcomeMessage = document.querySelector('.welcome-message');
  if (welcomeMessage) {
    welcomeMessage.remove();
  }
};

// Function to check if the chat history is empty before displaying welcome message
const displayWelcomeMessageIfNeeded = () => {
  if (conversationHistory.length === 0) {
    let welcomeMsg = document.createElement('div');
    welcomeMsg.classList.add('message', 'bot-message', 'welcome-message');
    welcomeMsg.innerHTML = "How can I help you today?";
    chatBox.appendChild(welcomeMsg);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
};

// Load chat history from local storage
loadChatHistory();
displayWelcomeMessageIfNeeded();

// Handle user input
userInput.addEventListener('input', () => {
  userInput.style.height = "100px"; // Adjusted height for better input area
  userInput.style.height = Math.min(userInput.scrollHeight, 300) + "px";
  sendButton.disabled = !userInput.value.trim();
});

userInput.addEventListener('keydown', e => {
  if (window.innerWidth <= 768) return;

  if (e.key === 'Enter') {
    if (e.shiftKey) return;
    e.preventDefault();
    removeWelcomeMessage();
    sendMessage();
  }
});

sendButton.addEventListener('click', () => {
  removeWelcomeMessage();
  sendMessage();
});
