// ============ INITIALIZATION ==========
window.addEventListener('DOMContentLoaded', function() {
    renderFeatureCards();
    addHRLines();
    checkSavedLogin();
});

function addHRLines() {
    const headings = document.querySelectorAll('.page-heading-fixed');
    headings.forEach(heading => {
        if (!heading.querySelector('hr')) {
            const hr = document.createElement('hr');
            heading.appendChild(hr);
        }
    });
}

function checkSavedLogin() {
    const token = localStorage.getItem('authToken');
    if (token) {
        setAuthToken(token);
        fetch(`${API_BASE_URL}/users/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            if (res.ok) {
                setIsLoggedIn(true);
                document.getElementById('loggedInView').style.display = 'flex';
                document.getElementById('loggedOutView').style.display = 'none';
                loadHeaderPhoto();
                showDashboard();
            } else {
                clearAuthToken();
            }
        })
        .catch(() => {
            clearAuthToken();
        });
    }
}

// ============ HEADER PHOTO FUNCTIONS ==========
function updateHeaderPhoto(photoUrl) {
    const profileIcon = document.querySelector('#loggedInView .profile-icon');
    if (profileIcon) {
        if (photoUrl) {
            profileIcon.innerHTML = `<img src="${photoUrl}?t=${Date.now()}" style="width:38px; height:38px; border-radius:50%; object-fit:cover;">`;
        } else {
            profileIcon.innerHTML = '👤';
        }
    }
}

async function loadHeaderPhoto() {
    if (!getAuthToken()) return;
    
    try {
        const profile = await apiCall('/users/profile', 'GET');
        if (profile && profile.photo_url) {
            updateHeaderPhoto(profile.photo_url);
        } else {
            updateHeaderPhoto(null);
        }
    } catch (error) {
        console.error('Error loading header photo:', error);
    }
}

// ============ MODAL FUNCTIONS ==========
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function togglePassword(fieldId) { const f = document.getElementById(fieldId); if (f) f.type = f.type === 'password' ? 'text' : 'password'; }

// ============ FEATURE CARDS RENDER ==========
function renderFeatureCards() {
    const features = [
        { icon: "🤖", title: "Smart Solutions", desc: "Intelligent solutions tailored to your business needs." },
        { icon: "🔒", title: "Secure & Reliable", desc: "Enterprise-grade security with high reliability." },
        { icon: "📈", title: "Scalable Platform", desc: "Built to scale with your business." },
        { icon: "⚡", title: "Powerful APIs", desc: "Easy to integrate APIs." },
        { icon: "🛡️", title: "24/7 Support", desc: "Our team is always here to help." }
    ];
    const c = document.getElementById('featuresGrid');
    if (c) { c.innerHTML = ''; features.forEach(f => { c.innerHTML += `<div class="feature-card" onclick="showLoginPage()"><h4>${f.icon} ${f.title}</h4><p>${f.desc}</p></div>`; }); }
}

// ============ DROPDOWN FUNCTIONS ==========
function toggleDropdownIn(event) {
    if (event) event.stopPropagation();
    const container = document.querySelector('#loggedInView .profile-container');
    if (container) {
        const isActive = container.classList.contains('active');
        document.querySelectorAll('#loggedInView .profile-container').forEach(c => {
            c.classList.remove('active');
        });
        if (!isActive) {
            container.classList.add('active');
        }
    }
}

document.addEventListener('click', function(e) {
    const containers = document.querySelectorAll('#loggedInView .profile-container');
    containers.forEach(container => {
        if (!container.contains(e.target)) {
            container.classList.remove('active');
        }
    });
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu && !contextMenu.contains(e.target)) {
        contextMenu.remove();
    }
});

document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.style.display = 'none';
    });
});

// ============ ACTIVE NAV LINK UPDATE ==========
function updateActiveNavLink(pageId) {
    document.querySelectorAll('#loggedInView .nav-links a').forEach(l => l.classList.remove('active'));
    document.querySelector(`#loggedInView .nav-links a[data-page="${pageId}"]`)?.classList.add('active');
}

// ============ RESET TO HOME ==========
function resetToHome() {
    const v = document.getElementById('loggedOutView');
    if (v && v.style.display !== 'none') {
        const s = document.getElementById('loggedOutContent');
        if (s) s.innerHTML = `<div class="hero" id="homeSection"><h1>Powering the Future with Artificial Intelligence</h1><p>Ind AI builds AI-powered solutions and APIs that help businesses automate, innovate and grow.</p><div class="hero-buttons"><button class="btn-primary" onclick="showLoginPage()">Get Started</button><button class="btn-secondary" onclick="showLoginPage()">Explore Services</button></div><div class="features" id="featuresGrid"></div></div>`;
        renderFeatureCards();
        document.getElementById('loggedOutHeadingText').innerHTML = '';
        const headingContainer = document.getElementById('loggedOutFixedHeading');
        const existingHr = headingContainer.querySelector('hr');
        if (existingHr) existingHr.remove();
        document.querySelectorAll('#loggedOutView .nav-links a').forEach(l => l.classList.remove('active'));
        document.getElementById('homeNavLink')?.classList.add('active');
    }
}

// ============ API DOCUMENT FUNCTIONS ==========
function showApiDocument() {
    document.getElementById('page-heading-text').innerHTML = 'API Documentation';
    const headingContainer = document.getElementById('page-fixed-heading');
    if (headingContainer && !headingContainer.querySelector('hr')) {
        const hr = document.createElement('hr');
        headingContainer.appendChild(hr);
    }
    document.getElementById('appContent').style.display = 'block';
    document.getElementById('changePasswordPage').style.display = 'none';
    document.getElementById('appContent').innerHTML = `
        <div class="api-container">
            <div class="api-section"><h2>🔑 API Key Management</h2><button class="generate-btn" onclick="generateApiKey()">+ Generate New API Key</button><div id="api-key-display" style="display:none;" class="api-key-box"><code id="api-key-value"></code><button onclick="copyApiKey()" class="copy-api-btn">Copy</button></div></div>
            <div class="api-section"><h2>📡 Job Management APIs</h2>
                <div class="api-endpoint"><div><span class="api-method method-get">GET</span> <span class="api-url">/api/v1/jobs</span></div><button class="copy-api-btn" onclick="copyToClipboard('/api/v1/jobs')">Copy</button></div>
                <div class="api-endpoint"><div><span class="api-method method-post">POST</span> <span class="api-url">/api/v1/jobs</span></div><button class="copy-api-btn" onclick="copyToClipboard('/api/v1/jobs')">Copy</button></div>
                <div class="api-endpoint"><div><span class="api-method method-get">GET</span> <span class="api-url">/api/v1/jobs/{id}</span></div><button class="copy-api-btn" onclick="copyToClipboard('/api/v1/jobs/{id}')">Copy</button></div>
                <div class="api-endpoint"><div><span class="api-method method-post">POST</span> <span class="api-url">/api/v1/jobs/{id}/run</span></div><button class="copy-api-btn" onclick="copyToClipboard('/api/v1/jobs/{id}/run')">Copy</button></div>
                <div class="api-endpoint"><div><span class="api-method method-post">POST</span> <span class="api-url">/api/v1/jobs/{id}/stop</span></div><button class="copy-api-btn" onclick="copyToClipboard('/api/v1/jobs/{id}/stop')">Copy</button></div>
                <div class="api-endpoint"><div><span class="api-method method-put">PUT</span> <span class="api-url">/api/v1/jobs/{id}</span></div><button class="copy-api-btn" onclick="copyToClipboard('/api/v1/jobs/{id}')">Copy</button></div>
                <div class="api-endpoint"><div><span class="api-method method-delete">DELETE</span> <span class="api-url">/api/v1/jobs/{id}</span></div><button class="copy-api-btn" onclick="copyToClipboard('/api/v1/jobs/{id}')">Copy</button></div>
                <div class="api-endpoint"><div><span class="api-method method-get">GET</span> <span class="api-url">/api/v1/jobs/{id}/logs</span></div><button class="copy-api-btn" onclick="copyToClipboard('/api/v1/jobs/{id}/logs')">Copy</button></div>
            </div>
            <div class="api-section"><h2>🛠️ Services API Reference</h2>
                <div class="api-endpoint"><div><span class="api-method method-post">POST</span> <span class="api-url">/api/v1/services/merge-pdf</span></div><button class="copy-api-btn" onclick="copyToClipboard('/api/v1/services/merge-pdf')">Copy</button></div>
                <div class="api-endpoint"><div><span class="api-method method-post">POST</span> <span class="api-url">/api/v1/services/split-pdf</span></div><button class="copy-api-btn" onclick="copyToClipboard('/api/v1/services/split-pdf')">Copy</button></div>
                <div class="api-endpoint"><div><span class="api-method method-post">POST</span> <span class="api-url">/api/v1/services/compress-pdf</span></div><button class="copy-api-btn" onclick="copyToClipboard('/api/v1/services/compress-pdf')">Copy</button></div>
                <div class="api-endpoint"><div><span class="api-method method-post">POST</span> <span class="api-url">/api/v1/services/pdf-to-word</span></div><button class="copy-api-btn" onclick="copyToClipboard('/api/v1/services/pdf-to-word')">Copy</button></div>
                <div class="api-endpoint"><div><span class="api-method method-post">POST</span> <span class="api-url">/api/v1/services/jpg-to-pdf</span></div><button class="copy-api-btn" onclick="copyToClipboard('/api/v1/services/jpg-to-pdf')">Copy</button></div>
                <div class="api-endpoint"><div><span class="api-method method-post">POST</span> <span class="api-url">/api/v1/services/watermark</span></div><button class="copy-api-btn" onclick="copyToClipboard('/api/v1/services/watermark')">Copy</button></div>
                <div class="api-endpoint"><div><span class="api-method method-post">POST</span> <span class="api-url">/api/v1/services/protect-pdf</span></div><button class="copy-api-btn" onclick="copyToClipboard('/api/v1/services/protect-pdf')">Copy</button></div>
                <div class="api-endpoint"><div><span class="api-method method-post">POST</span> <span class="api-url">/api/v1/services/unlock-pdf</span></div><button class="copy-api-btn" onclick="copyToClipboard('/api/v1/services/unlock-pdf')">Copy</button></div>
            </div>
        </div>
    `;
    updateActiveNavLink('api');
}

let currentApiKeyGlobal = null;

async function generateApiKey() {
    try {
        const result = await apiCall('/api-keys/', 'POST');
        currentApiKeyGlobal = result.api_key;
        document.getElementById('api-key-value').innerText = result.api_key;
        document.getElementById('api-key-display').style.display = 'flex';
        alert('New API Key generated!');
    } catch (error) {
        alert('Failed to generate API key: ' + error.message);
    }
}

function copyApiKey() { 
    if (currentApiKeyGlobal) { 
        navigator.clipboard.writeText(currentApiKeyGlobal); 
        alert('API Key copied!'); 
    } else { 
        alert('Generate first'); 
    } 
}

function copyToClipboard(text) { 
    navigator.clipboard.writeText(`https://api.indai.com${text}`).then(() => alert(`Copied: https://api.indai.com${text}`)); 
}