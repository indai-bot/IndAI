// ============ API BASE URL ==========
const API_BASE_URL = '/api';
let authToken = localStorage.getItem('authToken') || null;
let currentUser = null;
let isLoggedIn = false;

// ============ API HELPER FUNCTIONS ==========
async function apiCall(endpoint, method, data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    if (authToken) {
        options.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        // Check if response is empty
        const text = await response.text();
        if (!text) {
            throw new Error('Empty response from server');
        }
        
        const result = JSON.parse(text);
        
        if (!response.ok) {
            throw new Error(result.detail || result.message || 'Something went wrong');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function apiCallWithoutJson(endpoint, method, data = null) {
    const options = {
        method: method,
        headers: {},
    };
    
    if (authToken) {
        options.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    if (data) {
        options.body = data;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    return response;
}

// ============ TOKEN MANAGEMENT ==========
function setAuthToken(token) {
    authToken = token;
    if (token) {
        localStorage.setItem('authToken', token);
    } else {
        localStorage.removeItem('authToken');
    }
}

function getAuthToken() {
    return authToken;
}

function clearAuthToken() {
    authToken = null;
    localStorage.removeItem('authToken');
}

// ============ USER MANAGEMENT ==========
function setCurrentUser(user) {
    currentUser = user;
}

function getCurrentUser() {
    return currentUser;
}

function clearCurrentUser() {
    currentUser = null;
}

function setIsLoggedIn(status) {
    isLoggedIn = status;
}

function getIsLoggedIn() {
    return isLoggedIn;
}