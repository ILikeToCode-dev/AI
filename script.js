// Configuration
const apiKey = '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';
const model = 'deepseek/deepseek-chat-v3-0324:free';
let currentMode = 'normal';
let conversationHistory = [{ 
    role: 'system', 
    content: 'You are a virtual assistant made by Utkarsh. You are helpful and respond accordingly. Use Markdown for formatting, such as **bold**, *italics*, lists, and `````` for code.' 
}];

// Utility Functions
function addMessage(text, className) {
    const messages = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `message ${className}`;
    div.textContent = text;
    messages.appendChild(div);
    setTimeout(() => div.classList.add('visible'), 10);
    messages.scrollTop = messages.scrollHeight;
}

function removeLoadingMessage() {
    const messages = document.getElementById('chat-messages');
    const loading = messages.querySelector('.loading');
    if (loading) loading.remove();
}

function typeMessage(markdownText, className) {
    if (!markdownText) {
        addMessage('No response content received.', 'bot-message');
        return;
    }

    const messages = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `message ${className}`;
    messages.appendChild(div);
    setTimeout(() => div.classList.add('visible'), 10);

    let accumulated = '';
    let i = 0;
    const typingSpeed = 20;

    function type() {
        if (i < markdownText.length) {
            accumulated += markdownText.charAt(i);
            div.innerHTML = marked.parse(accumulated);
            i++;
            setTimeout(type, typingSpeed);
        } else {
            highlightCode(div);
            addCopyButtons(div);
        }
        messages.scrollTop = messages.scrollHeight;
    }
    type();
}

function highlightCode(messageDiv) {
    const codeBlocks = messageDiv.querySelectorAll('pre code');
    codeBlocks.forEach((block) => {
        hljs.highlightElement(block);
    });
}

function addCopyButtons(messageDiv) {
    const codeBlocks = messageDiv.querySelectorAll('pre');
    codeBlocks.forEach((block) => {
        const button = document.createElement('button');
        button.className = 'copy-button';
        button.textContent = 'Copy';
        button.onclick = () => {
            const code = block.querySelector('code') ? block.querySelector('code').textContent : block.textContent;
            navigator.clipboard.writeText(code).then(() => {
                button.textContent = 'Copied!';
                setTimeout(() => button.textContent = 'Copy', 2000);
            });
        };
        block.appendChild(button);
    });
}

// Web Search Function
async function performWebSearch(query) {
    try {
        const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&pretty=1`);
        const data = await response.json();
        let result = '';
        
        if (data.Abstract) {
            result += `${data.Abstract}\nSource: [${data.AbstractSource}](${data.AbstractURL})\n\n`;
        } else if (data.Heading) {
            result += `${data.Heading}\n`;
        } else {
            result += "No main results found.\n\n";
        }
        
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            result += "Related Topics:\n";
            data.RelatedTopics.forEach((topic) => {
                if (topic.Text && topic.FirstURL) {
                    result += `- [${topic.Text}](${topic.FirstURL})\n`;
                }
            });
        }
        
        return result || "No results found.";
    } catch (error) {
        return "Error performing search: " + error.message;
    }
}

// Main API Call Function
async function callAPI(messages) {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Chatbot by Utkarsh'
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                max_tokens: 2000,
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        console.log('API Response:', data); // Debug logging

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response structure: ' + JSON.stringify(data));
        }

        return data.choices[0].message.content;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Main Send Message Function
async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    if (!message) return;

    addMessage(message, 'user-message');
    input.value = '';

    // Add user message to conversation history
    conversationHistory.push({ role: 'user', content: message });

    // Show loading
    addMessage('Thinking...', 'bot-message loading');

    const slowTimer = setTimeout(() => {
        const loading = document.querySelector('.loading');
        if (loading) {
            const notice = document.createElement('div');
            notice.className = 'slow-notice';
            notice.textContent = 'Hang tight, this might take a moment due to slow connection...';
            loading.appendChild(notice);
        }
    }, 5000);

    try {
        let finalResponse;

        // Handle different modes
        if (currentMode === 'search' || currentMode === 'coding') {
            // Always search for these modes
            const searchResult = await performWebSearch(message);
            const searchContext = `Based on this search result: ${searchResult}\n\nUser question: ${message}`;
            
            const contextualMessages = [...conversationHistory];
            contextualMessages[contextualMessages.length - 1] = { role: 'user', content: searchContext };
            
            finalResponse = await callAPI(contextualMessages);
        } else {
            // Normal mode - just call API directly
            finalResponse = await callAPI(conversationHistory);
        }

        clearTimeout(slowTimer);
        removeLoadingMessage();
        
        if (finalResponse) {
            typeMessage(finalResponse, 'bot-message');
            conversationHistory.push({ role: 'assistant', content: finalResponse });
        } else {
            addMessage('No response received from the AI.', 'bot-message');
        }

    } catch (error) {
        clearTimeout(slowTimer);
        removeLoadingMessage();
        addMessage(`Error: ${error.message}. Please try again or check your connection.`, 'bot-message');
    }
}

// Settings Functions
function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    panel.classList.toggle('visible');
}

function applySettings() {
    const bgColor = document.getElementById('bg-color').value;
    const userMsgColor = document.getElementById('user-msg-color').value;
    const botMsgColor = document.getElementById('bot-msg-color').value;
    const fontSize = document.getElementById('font-size').value + 'px';
    currentMode = document.getElementById('mode-select').value;

    document.body.style.backgroundColor = bgColor;
    document.querySelectorAll('.user-message').forEach(el => el.style.backgroundColor = userMsgColor);
    document.querySelectorAll('.bot-message').forEach(el => el.style.backgroundColor = botMsgColor);
    document.body.style.fontSize = fontSize;
    document.getElementById('chat-messages').style.fontSize = fontSize;
    document.getElementById('user-input').style.fontSize = fontSize;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Show/hide disclaimer based on mode selection
    const modeSelect = document.getElementById('mode-select');
    const disclaimer = document.getElementById('mode-disclaimer');
    
    modeSelect.addEventListener('change', function() {
        if (this.value === 'search' || this.value === 'coding') {
            disclaimer.style.display = 'block';
        } else {
            disclaimer.style.display = 'none';
        }
    });

    // Enter key to send message
    document.getElementById('user-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
