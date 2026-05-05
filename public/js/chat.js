const socket = io();

// DOM Elements
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const loginError = document.getElementById('login-error');
const chatContainer = document.getElementById('chat-container');
const messagesDiv = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const currentUsernameSpan = document.getElementById('current-username');
const currentRoomSpan = document.getElementById('current-room');
const usersListDiv = document.getElementById('users-list');
const roomsListDiv = document.getElementById('rooms-list');
const userCountSpan = document.getElementById('user-count');
const typingIndicator = document.getElementById('typing-indicator');

// State
let currentUser = null;
let currentRoom = 'General';
let typingTimeout = null;
let isTyping = false;

// Login Handler
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();

    if (!username) {
        showError('Please enter a username');
        return;
    }

    console.log('Attempting to join with username:', username);
    
    socket.emit('user-join', username, (response) => {
        console.log('Join response:', response);
        
        if (response.success) {
            currentUser = username;
            currentUsernameSpan.textContent = username;
            loginModal.classList.add('hidden');
            chatContainer.classList.remove('hidden');
            document.title = `ChatApp - ${username}`;
            messageInput.focus();
            
            // Clear welcome message
            messagesDiv.innerHTML = '';
        } else {
            showError(response.message);
        }
    });
});

function showError(message) {
    loginError.textContent = message;
    setTimeout(() => {
        loginError.textContent = '';
    }, 3000);
}

// Message Handler
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();

    if (text && currentUser) {
        console.log('Sending message:', text);
        socket.emit('send-message', { text });
        messageInput.value = '';
        messageInput.focus();
        
        if (isTyping) {
            socket.emit('typing', false);
            isTyping = false;
        }
    }
});

// Typing Indicator
messageInput.addEventListener('input', () => {
    if (!isTyping && currentUser) {
        isTyping = true;
        socket.emit('typing', true);
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        if (isTyping) {
            isTyping = false;
            socket.emit('typing', false);
        }
    }, 1000);
});

// Receive Messages
socket.on('message', (message) => {
    console.log('Received message:', message);
    addMessageToUI(message);
});

function addMessageToUI(message) {
    const messageDiv = document.createElement('div');
    
    if (message.isSystem) {
        messageDiv.className = 'system-message';
        messageDiv.innerHTML = `🔔 ${escapeHtml(message.text)}`;
    } else {
        messageDiv.className = 'message';
        const isOwnMessage = message.username === currentUser;
        if (isOwnMessage) messageDiv.classList.add('own');
        
        const date = new Date(message.timestamp);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <span class="message-username">${escapeHtml(message.username)}</span>
                    <span class="message-time">${timeStr}</span>
                </div>
                <div class="message-text">${escapeHtml(message.text)}</div>
            </div>
        `;
    }
    
    messagesDiv.appendChild(messageDiv);
    scrollToBottom();
}

// Typing Indicator Handler
socket.on('user-typing', ({ username, isTyping }) => {
    if (username !== currentUser) {
        if (isTyping) {
            typingIndicator.textContent = `✏️ ${username} is typing...`;
        } else {
            typingIndicator.textContent = '';
        }
    }
});

// Update Users List
socket.on('users-list', (users) => {
    console.log('Users list updated:', users);
    userCountSpan.textContent = users.length;
    if (users.length === 0) {
        usersListDiv.innerHTML = '<div class="user-item">No other users</div>';
    } else {
        usersListDiv.innerHTML = users.map(user => `
            <div class="user-item">
                👤 ${escapeHtml(user)}
            </div>
        `).join('');
    }
});

// Update User Count
socket.on('user-count', (count) => {
    userCountSpan.textContent = count;
});

// Update Rooms List
socket.on('rooms-list', (rooms) => {
    console.log('Rooms list updated:', rooms);
    roomsListDiv.innerHTML = rooms.map(room => `
        <div class="room-item ${room === currentRoom ? 'active' : ''}" data-room="${room}">
            # ${escapeHtml(room)}
        </div>
    `).join('');
    
    document.querySelectorAll('.room-item').forEach(roomElement => {
        roomElement.addEventListener('click', () => {
            const roomName = roomElement.dataset.room;
            switchRoom(roomName);
        });
    });
});

// Switch Room
function switchRoom(newRoom) {
    if (newRoom === currentRoom) return;
    
    console.log('Switching to room:', newRoom);
    socket.emit('switch-room', newRoom, (response) => {
        if (response.success) {
            currentRoom = response.room;
            currentRoomSpan.textContent = currentRoom;
            messagesDiv.innerHTML = ''; // Clear messages when switching rooms
            console.log('Successfully switched to room:', currentRoom);
        }
    });
}

// Helper Functions
function scrollToBottom() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Connection status
socket.on('connect', () => {
    console.log('✅ Connected to server');
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
    alert('Disconnected from server. Please refresh the page.');
});

socket.on('connect_error', (error) => {
    console.log('Connection error:', error);
    alert('Failed to connect to server. Make sure the server is running.');
});