// Data Compose - Unified Application Framework
// Extensible single-page application with preserved functionality

class DataComposeApp {
    constructor() {
        this.currentSection = 'home';
        this.webhookUrl = CONFIG.WEBHOOK_URL;
        this.sections = new Map();
        this.init();
    }

    init() {
        this.setupNavigation();
        this.registerSections();
        this.showSection(this.currentSection);
        console.log('Data Compose App initialized with webhook:', this.webhookUrl);
    }

    // Navigation System
    setupNavigation() {
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = tab.getAttribute('data-section');
                this.showSection(sectionId);
            });
        });
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active state from all nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        const targetTab = document.querySelector(`[data-section="${sectionId}"]`);
        
        if (targetSection && targetTab) {
            targetSection.classList.add('active');
            targetTab.classList.add('active');
            this.currentSection = sectionId;
            
            // Call section-specific initialization if it exists
            if (this.sections.has(sectionId)) {
                this.sections.get(sectionId).onShow();
            }
        }
    }

    // Section Registration System - allows easy addition of new sections
    registerSection(id, sectionHandler) {
        this.sections.set(id, sectionHandler);
    }

    registerSections() {
        // Home Section
        this.registerSection('home', {
            onShow: () => {
                // Home section is static, no special handling needed
            }
        });

        // Chat Section
        this.registerSection('chat', {
            onShow: () => {
                this.initializeChatIfNeeded();
            }
        });

        // Workflows Section
        this.registerSection('workflows', {
            onShow: () => {
                this.loadWorkflows();
            }
        });
    }

    // Extensibility: Easy method to add new sections
    addSection(id, title, icon, contentHtml, handler = {}) {
        // Add navigation tab
        const navTabs = document.querySelector('.nav-tabs');
        const newTab = document.createElement('button');
        newTab.className = 'nav-tab';
        newTab.setAttribute('data-section', id);
        newTab.innerHTML = `<i class="${icon}"></i> ${title}`;
        navTabs.appendChild(newTab);

        // Add content section
        const appMain = document.querySelector('.app-main');
        const newSection = document.createElement('div');
        newSection.id = id;
        newSection.className = 'content-section';
        newSection.innerHTML = contentHtml;
        appMain.appendChild(newSection);

        // Register handler
        this.registerSection(id, handler);
        
        // Re-setup navigation to include new tab
        this.setupNavigation();
    }

    // Chat Functionality (Preserved from original)
    initializeChatIfNeeded() {
        const messageInput = document.getElementById('chat-input');
        if (messageInput && !messageInput.hasAttribute('data-initialized')) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
            messageInput.setAttribute('data-initialized', 'true');
        }
    }

    addMessage(text, isUser = false) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isUser ? 'user' : 'bot');
        messageDiv.textContent = text;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async sendMessage() {
        const messageInput = document.getElementById('chat-input');
        const message = messageInput.value.trim();
        
        if (!message) return;
        
        this.addMessage(message, true);
        messageInput.value = '';
        
        try {
            this.updateChatStatus('Sending...');
            
            const response = await fetch(this.webhookUrl, {
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
            this.updateChatStatus('');
            this.addMessage(responseText);
            
        } catch (error) {
            this.updateChatStatus('Error: ' + error.message);
            console.error('Chat error:', error);
        }
    }

    updateChatStatus(message) {
        const statusElement = document.getElementById('chat-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    // n8n Connection Test (Preserved from original)
    async testN8nConnection() {
        const resultBox = document.getElementById('connection-result');
        resultBox.innerHTML = '<p class="loading">Testing connection...</p>';
        resultBox.className = 'info-box';
        
        try {
            const response = await fetch('/n8n/healthz');
            const data = await response.json();
            
            resultBox.innerHTML = 
                '<p><strong>✅ Connection Successful!</strong></p>' +
                '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            resultBox.className = 'info-box success';
            
        } catch (error) {
            resultBox.innerHTML = 
                '<p><strong>❌ Connection Failed:</strong> ' + error.message + '</p>';
            resultBox.className = 'info-box error';
        }
    }

    // Workflows Functionality (Preserved from original)
    async loadWorkflows() {
        const workflowsList = document.getElementById('workflows-list');
        workflowsList.innerHTML = '<p class="loading">Loading workflows...</p>';
        
        try {
            const response = await fetch('/n8n/rest/workflows', {
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data && data.data && data.data.length > 0) {
                    let html = '<h3>Current Workflows:</h3>';
                    
                    data.data.forEach(workflow => {
                        const statusClass = workflow.active ? 'active' : 'inactive';
                        const statusText = workflow.active ? '✅ Active' : '⏸️ Inactive';
                        
                        html += `
                            <div class="workflow-item">
                                <span class="workflow-name">${workflow.name}</span>
                                <span class="workflow-status ${statusClass}">${statusText}</span>
                            </div>
                        `;
                    });
                    
                    workflowsList.innerHTML = html;
                } else {
                    workflowsList.innerHTML = 
                        '<p>No workflows found. <a href="/n8n/" target="_blank" class="btn btn-primary">Create your first workflow</a></p>';
                }
            } else {
                workflowsList.innerHTML = 
                    '<p class="text-center">Error fetching workflows. You may need to authenticate first.</p>';
            }
        } catch (error) {
            workflowsList.innerHTML = 
                '<p class="text-center">Error: ' + error.message + '</p>';
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DataComposeApp();
});

// Global functions for backwards compatibility and inline handlers
function testConnection() {
    window.app.testN8nConnection();
}

function sendMessage() {
    window.app.sendMessage();
}

// Example of how to add new sections dynamically:
// window.app.addSection('settings', 'Settings', 'fas fa-cog', 
//     '<h2>Settings</h2><p>Configuration options...</p>',
//     { onShow: () => console.log('Settings shown') }
// );