document.addEventListener('DOMContentLoaded', function() {
    // Setup sidebar toggle
    const toggleBtn = document.querySelector('.toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    toggleBtn.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    });
    
    // Setup dropdown toggles
    const dropdownToggles = document.querySelectorAll('.dropdown > a');
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            this.parentElement.classList.toggle('open');
        });
    });
    
    // Chat functionality
    console.log("Chat.js loaded - initializing webhook from:", CONFIG.WEBHOOK_URL);
    window.webhookUrl = CONFIG.WEBHOOK_URL;
});

function addMessage(text, isUser = false) {
    const chat = document.getElementById('chat');
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(isUser ? 'user-message' : 'bot-message');
    
    msgDiv.textContent = text;
    chat.appendChild(msgDiv);
    chat.scrollTop = chat.scrollHeight;
}

async function sendMessage() {
    const messageInput = document.getElementById('message');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    addMessage(message, true);
    messageInput.value = '';
    
    try {
        document.getElementById('status').textContent = 'Sending...';
        
        const response = await fetch(window.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                timestamp: new Date().toISOString()
            })
        });
        
        const responseText = await response.text();
        document.getElementById('status').textContent = '';
        
        // Add the response to chat
        addMessage(responseText);
    } catch (error) {
        document.getElementById('status').textContent = 'Error: ' + error.message;
        console.error(error);
    }
}

// Enable sending with Enter key
document.getElementById('message').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
});
