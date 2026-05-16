// ============ API BASE URL ============
const API_BASE_URL = '/api';
let authToken = localStorage.getItem('authToken') || null;
let currentUser = null;

// ============ GLOBAL VARIABLES ============
let currentApiKeyGlobal = null;
let currentService = null;
let currentServiceCredits = 0;
let isRightPanelVisible = true;
let isEditMode = false;
let editingJobId = null;
let currentJobLogs = [];

// ============ CLIENTS & JOBS DATA (from API) ==========
let clientsData = [];
let selectedClientId = null;
let selectedJobId = null;
let selectedJob = null;
let selectedClient = null;

// ============ INITIALIZATION ============
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
        authToken = token;
        fetch(`${API_BASE_URL}/users/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        })
        .then(res => {
            if (res.ok) {
                isLoggedIn = true;
                document.getElementById('loggedInView').style.display = 'flex';
                document.getElementById('loggedOutView').style.display = 'none';
                showDashboard();
            } else {
                localStorage.removeItem('authToken');
                authToken = null;
            }
        })
        .catch(() => {
            localStorage.removeItem('authToken');
            authToken = null;
        });
    }
}

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
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.detail || result.message || 'Something went wrong');
    }
    
    return result;
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

// ============ LOGIN PAGE FUNCTIONS ==========
function showLoginPage() {
    const loggedOutContent = document.getElementById('loggedOutContent');
    if (!loggedOutContent) return;
    
    document.getElementById('loggedOutHeadingText').innerText = 'Welcome Back';
    const headingContainer = document.getElementById('loggedOutFixedHeading');
    if (headingContainer && !headingContainer.querySelector('hr')) {
        const hr = document.createElement('hr');
        headingContainer.appendChild(hr);
    }
    document.querySelectorAll('#loggedOutView .nav-links a').forEach(l => l.classList.remove('active'));
    
    loggedOutContent.innerHTML = `
        <div class="login-page-container">
            <div class="login-two-column">
                <div class="login-info-list">
                    <div class="login-info-row"><div class="login-label">SECURE ACCESS</div><div class="login-value">Login to access your dashboard and manage your automation jobs</div></div>
                    <div class="login-info-row"><div class="login-label">BENEFITS</div><div class="login-value">✓ Create and manage automation jobs<br>✓ Access all PDF tools and services<br>✓ Track your credits and usage<br>✓ Get API access for developers</div></div>
                    <div class="login-info-row"><div class="login-label">SUPPORT</div><div class="login-value">Need help? <a onclick="showContact()" style="color:#0f172a;cursor:pointer;font-weight:600;">Contact our support team</a></div></div>
                </div>
                <div class="login-form-card">
                    <h2>Login</h2>
                    <div class="login-form-group"><label>Username or Email</label><input type="text" id="loginUser" placeholder="Enter your username or email"></div>
                    <div class="login-form-group"><label>Password</label><div class="password-field"><input type="password" id="loginPass" placeholder="Enter your password"><span class="toggle-eye" onclick="togglePassword('loginPass')">👁️</span></div></div>
                    <div class="remember-forgot-row"><label><input type="checkbox" id="rememberMe"> Remember me</label><a class="forgot-link" onclick="showForgotPasswordPage()">Forgot Password?</a></div>
                    <button class="login-submit-btn" onclick="doLogin()">Login →</button>
                    <div class="register-link">Don't have an account? <a onclick="showRegisterPage()">Sign up for free</a></div>
                </div>
            </div>
        </div>
    `;
}

async function doLogin() { 
    const email = document.getElementById('loginUser')?.value; 
    const password = document.getElementById('loginPass')?.value; 
    const remember = document.getElementById('rememberMe')?.checked; 
    
    if (!email || !password) { 
        alert('Please enter email and password'); 
        return; 
    }
    
    try {
        const result = await apiCall('/auth/login', 'POST', { email, password });
        authToken = result.token;
        currentUser = result.user;
        
        if (remember) {
            localStorage.setItem('authToken', authToken);
        } else {
            localStorage.removeItem('authToken');
        }
        
        isLoggedIn = true;
        document.getElementById('loggedInView').style.display = 'flex';
        document.getElementById('loggedOutView').style.display = 'none';
        showDashboard();
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

function logout() { 
    isLoggedIn = false;
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    document.getElementById('loggedInView').style.display = 'none';
    document.getElementById('loggedOutView').style.display = 'flex';
    resetToHome(); 
}

// ============ REGISTER PAGE ==========
function showRegisterPage() {
    document.getElementById('loggedOutContent').innerHTML = `
        <div class="register-page-container">
            <div class="register-two-column">
                <div class="register-info-list">
                    <div class="login-info-row"><div class="login-label">CREATE ACCOUNT</div><div class="login-value">Join Ind AI and start automating your workflow</div></div>
                    <div class="login-info-row"><div class="login-label">BENEFITS</div><div class="login-value">✓ Free 100 credits to start<br>✓ Access to all PDF tools<br>✓ Create automation jobs<br>✓ API access for developers</div></div>
                </div>
                <div class="login-form-card">
                    <h2>Sign Up</h2>
                    <div class="two-columns">
                        <div class="login-form-group"><label>First Name</label><input type="text" id="regFirst" placeholder="First Name"></div>
                        <div class="login-form-group"><label>Last Name</label><input type="text" id="regLast" placeholder="Last Name"></div>
                    </div>
                    <div class="login-form-group"><label>Email Address</label><input type="email" id="regEmail" placeholder="Enter your email"></div>
                    <div class="login-form-group"><label>Password</label><div class="password-field"><input type="password" id="regPassword" placeholder="Create password"><span class="toggle-eye" onclick="togglePassword('regPassword')">👁️</span></div></div>
                    <div class="login-form-group"><label>Confirm Password</label><div class="password-field"><input type="password" id="regConfirm" placeholder="Confirm password"><span class="toggle-eye" onclick="togglePassword('regConfirm')">👁️</span></div></div>
                    <button class="login-submit-btn" onclick="doRegister()">Create Account →</button>
                    <div class="register-link">Already have an account? <a onclick="showLoginPage()">Login</a></div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('loggedOutHeadingText').innerText = 'Create Account';
}

async function doRegister() {
    const firstName = document.getElementById('regFirst')?.value;
    const lastName = document.getElementById('regLast')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const confirm = document.getElementById('regConfirm')?.value;
    
    if (!firstName || !lastName || !email || !password) { alert('Please fill all fields'); return; }
    if (password !== confirm) { alert('Passwords do not match'); return; }
    if (password.length < 6) { alert('Password must be at least 6 characters'); return; }
    if (!email.includes('@')) { alert('Enter valid email'); return; }
    
    try {
        await apiCall('/auth/register', 'POST', { email, password, first_name: firstName, last_name: lastName });
        alert('Registration successful! Please check your email for verification code.');
        showVerifyEmailPage(email);
    } catch (error) {
        alert('Registration failed: ' + error.message);
    }
}

// ============ VERIFY EMAIL PAGE ==========
let tempVerifyEmail = '';

function showVerifyEmailPage(email) {
    tempVerifyEmail = email;
    const loggedOutContent = document.getElementById('loggedOutContent');
    if (!loggedOutContent) return;
    
    document.getElementById('loggedOutHeadingText').innerText = 'Verify Your Email';
    const headingContainer = document.getElementById('loggedOutFixedHeading');
    if (headingContainer && !headingContainer.querySelector('hr')) {
        const hr = document.createElement('hr');
        headingContainer.appendChild(hr);
    }
    document.querySelectorAll('#loggedOutView .nav-links a').forEach(l => l.classList.remove('active'));
    
    loggedOutContent.innerHTML = `
        <div class="register-page-container">
            <div class="register-two-column">
                <div class="register-info-list">
                    <div class="login-info-row"><div class="login-label">VERIFY YOUR EMAIL</div><div class="login-value">We sent a 6-digit verification code to ${email}</div></div>
                    <div class="login-info-row"><div class="login-label">CHECK YOUR INBOX</div><div class="login-value">Enter the code below to verify your account</div></div>
                </div>
                <div class="login-form-card">
                    <h2>Verify Email</h2>
                    <div class="login-form-group"><label>Verification Code</label><input type="text" id="verifyCode" placeholder="Enter 6-digit code"></div>
                    <div class="login-form-group" style="display: flex; gap: 1rem;">
                        <button class="login-submit-btn" onclick="verifyEmailCode()" style="flex:1;">Verify →</button>
                        <button class="btn-secondary" onclick="resendVerificationCode()" style="flex:1;">Resend Code</button>
                    </div>
                    <div class="register-link"><a onclick="showLoginPage()">Back to Login</a></div>
                </div>
            </div>
        </div>
    `;
}

async function verifyEmailCode() {
    const code = document.getElementById('verifyCode')?.value;
    if (!code || code.length !== 6) {
        alert('Please enter 6-digit verification code');
        return;
    }
    
    try {
        await apiCall('/auth/verify-email', 'POST', { email: tempVerifyEmail, code: code });
        alert('Email verified successfully! Please login.');
        showLoginPage();
    } catch (error) {
        alert('Verification failed: ' + error.message);
    }
}

async function resendVerificationCode() {
    if (!tempVerifyEmail) return;
    
    try {
        await apiCall('/auth/resend-code', 'POST', { email: tempVerifyEmail });
        alert('New verification code sent to your email');
    } catch (error) {
        alert('Failed to resend code: ' + error.message);
    }
}

// ============ FORGOT PASSWORD PAGE ==========
let tempEmailForReset = '';
let tempCode = '';

function showForgotPasswordPage() {
    document.getElementById('loggedOutContent').innerHTML = `
        <div class="forgot-password-container">
            <div class="forgot-two-column">
                <div class="forgot-info-list">
                    <div class="login-info-row"><div class="login-label">RESET PASSWORD</div><div class="login-value">Enter your email to receive verification code</div></div>
                    <div class="login-info-row"><div class="login-label">SECURITY</div><div class="login-value">We'll send a 6-digit code to verify your identity</div></div>
                </div>
                <div class="login-form-card">
                    <h2>Forgot Password</h2>
                    <div class="login-form-group"><label>Email Address</label><input type="email" id="forgotEmailPage" placeholder="Enter your registered email"></div>
                    <button class="login-submit-btn" onclick="sendForgotCode()">Send Code →</button>
                    <div class="register-link"><a onclick="showLoginPage()">Back to Login</a></div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('loggedOutHeadingText').innerText = 'Reset Password';
}

async function sendForgotCode() {
    const email = document.getElementById('forgotEmailPage')?.value;
    if (!email) { alert('Please enter email address'); return; }
    
    try {
        await apiCall('/auth/forgot-password', 'POST', { email });
        tempEmailForReset = email;
        alert('Reset code sent to your email');
        showVerifyResetCodePage();
    } catch (error) {
        alert('Failed: ' + error.message);
    }
}

function showVerifyResetCodePage() {
    document.getElementById('loggedOutContent').innerHTML = `
        <div class="forgot-password-container">
            <div class="forgot-two-column">
                <div class="forgot-info-list">
                    <div class="login-info-row"><div class="login-label">VERIFY CODE</div><div class="login-value">Enter the 6-digit code sent to your email</div></div>
                </div>
                <div class="login-form-card">
                    <h2>Verify Code</h2>
                    <div class="login-form-group"><label>Verification Code</label><input type="text" id="verifyResetCode" placeholder="Enter 6-digit code"></div>
                    <button class="login-submit-btn" onclick="verifyResetCode()">Verify →</button>
                    <div class="register-link"><a onclick="showForgotPasswordPage()">Back</a></div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('loggedOutHeadingText').innerText = 'Verify Code';
}

async function verifyResetCode() {
    const code = document.getElementById('verifyResetCode')?.value;
    if (!code || code.length !== 6) {
        alert('Please enter 6-digit code');
        return;
    }
    tempCode = code;
    showNewPasswordPage();
}

function showNewPasswordPage() {
    document.getElementById('loggedOutContent').innerHTML = `
        <div class="forgot-password-container">
            <div class="forgot-two-column">
                <div class="forgot-info-list">
                    <div class="login-info-row"><div class="login-label">NEW PASSWORD</div><div class="login-value">Create a strong password for your account</div></div>
                </div>
                <div class="login-form-card">
                    <h2>New Password</h2>
                    <div class="login-form-group"><label>New Password</label><div class="password-field"><input type="password" id="newPassPage" placeholder="Enter new password"><span class="toggle-eye" onclick="togglePassword('newPassPage')">👁️</span></div></div>
                    <div class="login-form-group"><label>Confirm Password</label><div class="password-field"><input type="password" id="confirmPassPage" placeholder="Confirm new password"><span class="toggle-eye" onclick="togglePassword('confirmPassPage')">👁️</span></div></div>
                    <button class="login-submit-btn" onclick="resetPassword()">Reset Password →</button>
                    <div class="register-link"><a onclick="showLoginPage()">Back to Login</a></div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('loggedOutHeadingText').innerText = 'Reset Password';
}

async function resetPassword() {
    const np = document.getElementById('newPassPage')?.value;
    const cp = document.getElementById('confirmPassPage')?.value;
    if (!np || !cp) { alert('Please fill both password fields'); return; }
    if (np !== cp) { alert('Passwords do not match'); return; }
    if (np.length < 6) { alert('Password must be at least 6 characters'); return; }
    
    try {
        await apiCall('/auth/reset-password', 'POST', { 
            email: tempEmailForReset, 
            code: tempCode, 
            new_password: np 
        });
        alert('Password reset successfully! Please login with your new password.');
        showLoginPage();
    } catch (error) {
        alert('Failed to reset password: ' + error.message);
    }
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

// ============ DASHBOARD FUNCTIONS ==========
async function showDashboard() {
    const today = new Date().toISOString().slice(0,10);
    document.getElementById('page-heading-text').innerHTML = 'User Dashboard';
    const headingContainer = document.getElementById('page-fixed-heading');
    if (headingContainer && !headingContainer.querySelector('hr')) {
        const hr = document.createElement('hr');
        headingContainer.appendChild(hr);
    }
    document.getElementById('appContent').style.display = 'block';
    document.getElementById('changePasswordPage').style.display = 'none';
    
    try {
        const stats = await apiCall('/dashboard/stats', 'GET');
        
        document.getElementById('appContent').innerHTML = `
            <div class="dashboard-container">
                <div class="dashboard-top-row">
                    <div class="dashboard-card">
                        <h3>📊 Plan & Credits Summary</h3>
                        <div class="plan-summary">
                            <p><strong>Current Plan:</strong> ${stats.current_plan === 'free' ? 'Free Plan' : stats.current_plan === 'daily' ? 'Daily Plan' : stats.current_plan === 'monthly' ? 'Monthly Plan' : 'Yearly Plan'}</p>
                            <p>Credits Available: <strong>${stats.credits} Credits</strong></p>
                            <p style="color:#f59e0b; font-size:0.75rem;">Reset in: 12 hours</p>
                        </div>
                        <div class="button-group" style="margin-top:0.8rem;">
                            <button class="btn-outline" onclick="showPricing()">💰 Upgrade Plan</button>
                        </div>
                    </div>
                    <div class="dashboard-card">
                        <h3>⚡ Active Jobs Overview</h3>
                        <div class="active-jobs-count">${stats.active_jobs}</div>
                        <div>Active Jobs Running</div>
                        <div style="margin-top:0.3rem; font-size:0.7rem; color:#64748b;">Total Jobs: ${stats.total_jobs}</div>
                    </div>
                    <div class="dashboard-card">
                        <h3>🎁 Referral Dashboard</h3>
                        <table style="width:100%; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <th style="text-align: left; padding: 0.2rem 0; font-size: 0.5rem; font-weight: 600; color: #64748b;">REFERRAL ID</th>
                                    <th style="text-align: left; padding: 0.2rem 0; font-size: 0.5rem; font-weight: 600; color: #64748b;">CREDIT PER REFERRAL</th>
                                    <th style="text-align: left; padding: 0.2rem 0; font-size: 0.5rem; font-weight: 600; color: #64748b;">TOTAL EARNED</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding: 0.3rem 0; font-size: 0.6rem;"><span style="font-family: monospace;">USER123456</span><button onclick="copyReferralLink()" style="background:#e2e8f0; border:none; padding:0.1rem 0.3rem; border-radius:20px; margin-left:0.3rem; cursor:pointer;">Copy</button></td>
                                    <td style="padding: 0.3rem 0; font-size: 0.6rem;">500 Credits</td>
                                    <td style="padding: 0.3rem 0; font-size: 0.6rem;">12,500 Credits</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="dashboard-bottom-row">
                    <div class="dashboard-card">
                        <div class="job-date-filter">
                            <h3>📋 Upcoming Scheduled Jobs</h3>
                            <div>
                                <input type="date" id="upcomingJobsDate" value="${today}">
                                <button onclick="filterUpcomingJobs()">Filter</button>
                            </div>
                        </div>
                        <table class="upcoming-jobs-table" id="upcomingJobsTable">
                            <thead><tr><th>Client Name</th><th>Job Name</th><th>Frequency</th><th>Schedule Date</th><th>Schedule Time</th><th>Actions</th></tr></thead>
                            <tbody id="upcomingJobsBody"></tbody>
                        </table>
                        <div class="view-all" onclick="showJobs()">View All Jobs →</div>
                    </div>
                </div>
            </div>
        `;
        await renderUpcomingJobs(today);
    } catch (error) {
        document.getElementById('appContent').innerHTML = `<div class="dashboard-card"><p>Error loading dashboard: ${error.message}</p></div>`;
    }
    updateActiveNavLink('dashboard');
}

async function renderUpcomingJobs(date) {
    const tbody = document.getElementById('upcomingJobsBody');
    if (!tbody) return;
    
    try {
        const jobs = await apiCall(`/dashboard/upcoming-jobs?date=${date}`, 'GET');
        if (jobs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No jobs scheduled for this date</td></tr>';
        } else {
            tbody.innerHTML = jobs.map(job => `
                <tr>
                    <td>${job.client_name}</td>
                    <td>${job.job_name}</td>
                    <td>${job.frequency}</td>
                    <td>${job.date}</td>
                    <td>${job.time}</td>
                    <td><a onclick="showJobs()" class="edit-link">Edit</a></td>
                </tr>
            `).join('');
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6">Error loading jobs</td></tr>';
    }
}

async function filterUpcomingJobs() {
    const date = document.getElementById('upcomingJobsDate')?.value;
    if (date) await renderUpcomingJobs(date);
}

function copyReferralLink() { 
    navigator.clipboard.writeText('https://ind.ai/ref/USER123456').then(() => alert('Referral link copied!')); 
}

// ============ TIME SAVED REPORT ==========
async function showTimeSavedReport() {
    document.getElementById('page-heading-text').innerHTML = '⏱️ Time Saved Report';
    const headingContainer = document.getElementById('page-fixed-heading');
    if (headingContainer && !headingContainer.querySelector('hr')) {
        const hr = document.createElement('hr');
        headingContainer.appendChild(hr);
    }
    document.getElementById('appContent').style.display = 'block';
    document.getElementById('changePasswordPage').style.display = 'none';
    
    const today = new Date().toISOString().slice(0,10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    document.getElementById('appContent').innerHTML = `
        <div class="dashboard-container">
            <div class="dashboard-card">
                <div class="usage-date-filters">
                    <label>Start Date:</label>
                    <input type="date" id="timeSavedStartDate" value="${startDate.toISOString().slice(0,10)}">
                    <label>End Date:</label>
                    <input type="date" id="timeSavedEndDate" value="${today}">
                    <button class="btn-outline" onclick="loadTimeSavedReport()">Apply Filter</button>
                </div>
                <div id="timeSavedReportResult"></div>
            </div>
        </div>
    `;
    await loadTimeSavedReport();
    updateActiveNavLink('profile');
}

async function loadTimeSavedReport() {
    const startDate = document.getElementById('timeSavedStartDate')?.value;
    const endDate = document.getElementById('timeSavedEndDate')?.value;
    const resultDiv = document.getElementById('timeSavedReportResult');
    if (!resultDiv) return;
    
    try {
        let url = '/dashboard/time-saved-report';
        if (startDate) url += `?start_date=${startDate}`;
        if (endDate) url += `${startDate ? '&' : '?'}end_date=${endDate}`;
        
        const data = await apiCall(url, 'GET');
        
        resultDiv.innerHTML = `
            <div class="time-saved-summary">
                <div class="time-saved-card"><div class="time-saved-label">Total Time Saved</div><div class="time-saved-value">${data.total_time_saved.toFixed(2)} hrs</div></div>
                <div class="time-saved-card"><div class="time-saved-label">Jobs Automated</div><div class="time-saved-value">${data.total_jobs}</div></div>
                <div class="time-saved-card"><div class="time-saved-label">Avg Time Saved/Job</div><div class="time-saved-value">${data.total_jobs > 0 ? (data.total_time_saved / data.total_jobs).toFixed(2) : 0} hrs</div></div>
            </div>
            <table class="usage-table">
                <thead><tr><th>Date</th><th>Job Name</th><th>Est. Manual Hours</th><th>Actual Runtime</th><th>Time Saved</th><th>Status</th></tr></thead>
                <tbody>${data.records.length === 0 ? '<tr><td colspan="6" style="text-align:center;">No records found</td></tr>' : data.records.map(r => `
                    <tr>
                        <td>${r.date}</td>
                        <td>${r.job_name}</td>
                        <td>${r.estimated_hours} hrs</td>
                        <td>${r.actual_run_time}</td>
                        <td class="credit-positive">${r.time_saved.toFixed(2)} hrs</td>
                        <td><span style="color:#10b981;">✓ ${r.status}</span></td>
                    </tr>
                `).join('')}</tbody>
            </table>
        `;
    } catch (error) {
        resultDiv.innerHTML = `<p>Error loading report: ${error.message}</p>`;
    }
}

// ============ CHANGE PASSWORD PAGE ==========
function showChangePasswordPage() {
    document.getElementById('page-heading-text').innerHTML = 'Change Password';
    const headingContainer = document.getElementById('page-fixed-heading');
    if (headingContainer && !headingContainer.querySelector('hr')) {
        const hr = document.createElement('hr');
        headingContainer.appendChild(hr);
    }
    document.getElementById('appContent').style.display = 'none';
    const changePage = document.getElementById('changePasswordPage');
    changePage.style.display = 'block';
    changePage.innerHTML = `
        <div class="contact-page-simple">
            <div class="contact-two-column">
                <div class="contact-info-list">
                    <div class="contact-info-row"><div class="contact-label">SECURITY</div><div class="contact-value">Keep your account secure</div></div>
                    <div class="contact-info-row"><div class="contact-label">PASSWORD TIPS</div><div class="contact-value">Use at least 8 characters with mix of letters, numbers & symbols</div></div>
                </div>
                <div class="contact-form-card-simple">
                    <h2>🔐 Change Password</h2>
                    <div class="form-group-simple"><label>Old Password</label><div class="password-field"><input type="password" id="oldPassPage"><span class="toggle-eye" onclick="togglePassword('oldPassPage')">👁️</span></div></div>
                    <div class="form-group-simple"><label>New Password</label><div class="password-field"><input type="password" id="newPassPage"><span class="toggle-eye" onclick="togglePassword('newPassPage')">👁️</span></div></div>
                    <div class="form-group-simple"><label>Confirm Password</label><div class="password-field"><input type="password" id="confirmPassPage"><span class="toggle-eye" onclick="togglePassword('confirmPassPage')">👁️</span></div></div>
                    <div class="profile-buttons"><button class="btn-save-profile" onclick="changePasswordFromPage()">Update</button><button class="btn-secondary" onclick="showDashboard()">Cancel</button></div>
                </div>
            </div>
        </div>
    `;
    updateActiveNavLink('profile');
}

async function changePasswordFromPage() {
    const oldPass = document.getElementById('oldPassPage')?.value;
    const newPass = document.getElementById('newPassPage')?.value;
    const confirmPass = document.getElementById('confirmPassPage')?.value;
    
    if (!oldPass || !newPass || !confirmPass) { alert('Please fill all fields'); return; }
    if (newPass !== confirmPass) { alert('Passwords do not match'); return; }
    if (newPass.length < 6) { alert('Password must be at least 6 characters'); return; }
    
    try {
        await apiCall('/users/password', 'PUT', { old_password: oldPass, new_password: newPass });
        alert('Password changed successfully!');
        showDashboard();
    } catch (error) {
        alert('Failed to change password: ' + error.message);
    }
}

// ============ JOBS FUNCTIONS ==========
async function showJobs() {
    document.getElementById('page-heading-text').innerHTML = 'Jobs';
    const headingContainer = document.getElementById('page-fixed-heading');
    if (headingContainer && !headingContainer.querySelector('hr')) {
        const hr = document.createElement('hr');
        headingContainer.appendChild(hr);
    }
    document.getElementById('appContent').style.display = 'block';
    document.getElementById('changePasswordPage').style.display = 'none';
    document.getElementById('appContent').innerHTML = `
        <div class="jobs-container-complete">
            <div class="jobs-complete-layout">
                <div class="clients-complete-panel">
                    <div class="clients-complete-header"><h3>Clients</h3><button class="add-client-btn-header" onclick="addNewClient()">+</button></div>
                    <div class="clients-complete-search"><input type="text" id="clientSearchComplete" placeholder="Search Client..." onkeyup="filterClientsComplete()"></div>
                    <div class="clients-complete-tree" id="clientsTreeComplete"></div>
                </div>
                <div class="right-complete-panel">
                    <div class="job-detail-complete-card">
                        <div class="breadcrumb-inside" id="breadcrumbInside"></div>
                        <div class="job-detail-header">
                            <span class="job-detail-title" id="jobDetailTitle">Select a job</span>
                            <button onclick="toggleRightPanel()" style="background:#e2e8f0; border:none; padding:0.3rem 0.8rem; border-radius:8px;">✕</button>
                        </div>
                        <div class="job-detail-actions" id="jobDetailActions"></div>
                        <div class="job-info-section" id="jobInfoSection">
                            <div class="job-subject" id="jobSubject">-</div>
                            <div class="job-created-info" id="jobCreatedInfo">-</div>
                            <div class="supporting-files-section">
                                <span class="supporting-files-label">📎 SUPPORTING FILES</span>
                                <div class="supporting-files-list" id="supportingFilesList">No files</div>
                            </div>
                            <div class="schedule-row-single" id="scheduleRowSingle">
                                <div class="schedule-item-single"><div class="schedule-label-single">FREQUENCY</div><div class="schedule-value-single" id="frequencyValue">-</div></div>
                                <div class="schedule-item-single"><div class="schedule-label-single">DATE</div><div class="schedule-value-single" id="dateValue">-</div></div>
                                <div class="schedule-item-single"><div class="schedule-label-single">TIME</div><div class="schedule-value-single" id="timeValue">-</div></div>
                                <div class="schedule-item-single"><div class="schedule-label-single">TIMEZONE</div><div class="schedule-value-single" id="timezoneValue">-</div></div>
                                <div class="schedule-item-single"><div class="schedule-label-single">NEXT RUN</div><div class="schedule-value-single" id="nextRunValue">-</div></div>
                            </div>
                        </div>
                        <div class="activity-log-section">
                            <div class="activity-log-header">
                                <h4>📋 Job Activity Log</h4>
                                <div class="activity-log-actions">
                                    <input type="date" class="log-date-filter-small" id="logDateFilterSmall" onchange="filterActivityLogsSmall()">
                                    <button class="download-log-btn" onclick="downloadActivityLog()">⬇ Download</button>
                                </div>
                            </div>
                            <div class="activity-log-list" id="activityLogListComplete"></div>
                        </div>
                        <div style="padding:1rem; border-top:1px solid #eef2f6;">
                            <button onclick="verifyCurrentJob()" style="width:100%; background:#0f172a; color:white; border:none; padding:0.7rem; border-radius:40px; cursor:pointer;">🔍 Verify Automation & Calculate Credits</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    await loadClientsData();
    renderClientsTreeComplete();
    updateActiveNavLink('jobs');
}

async function loadClientsData() {
    try {
        clientsData = await apiCall('/clients', 'GET');
    } catch (error) {
        console.error('Error loading clients:', error);
        clientsData = [];
    }
}

async function loadFolders(clientId) {
    try {
        return await apiCall(`/folders/${clientId}`, 'GET');
    } catch (error) {
        return [];
    }
}

async function loadJobs(folderId) {
    try {
        return await apiCall(`/jobs/${folderId}`, 'GET');
    } catch (error) {
        return [];
    }
}

async function renderClientsTreeComplete() {
    const container = document.getElementById('clientsTreeComplete');
    if (!container) return;
    
    if (clientsData.length === 0) {
        container.innerHTML = '<div style="padding:1rem; text-align:center; color:#94a3b8;">No clients. Click + to add</div>';
        return;
    }
    
    container.innerHTML = '';
    
    for (const client of clientsData) {
        const clientDiv = document.createElement('div');
        clientDiv.className = 'client-complete-node';
        clientDiv.id = `client-${client.id}`;
        
        const folders = await loadFolders(client.id);
        
        const clientHeader = document.createElement('div');
        clientHeader.className = 'client-complete-header';
        clientHeader.innerHTML = `
            <div class="client-complete-name">🏢 ${client.name}</div>
            <div class="client-complete-actions">
                <button class="options-btn" onclick="event.stopPropagation(); showClientContextMenu(event, ${client.id})">⋮</button>
                <span class="client-toggle" id="client-toggle-${client.id}">▼</span>
            </div>
        `;
        
        let isExpanded = true;
        clientHeader.onclick = () => {
            isExpanded = !isExpanded;
            const itemsDiv = document.getElementById(`client-items-${client.id}`);
            const toggle = document.getElementById(`client-toggle-${client.id}`);
            if (itemsDiv) {
                itemsDiv.style.display = isExpanded ? 'block' : 'none';
                toggle.textContent = isExpanded ? '▼' : '▶';
            }
        };
        
        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'items-complete-list';
        itemsDiv.id = `client-items-${client.id}`;
        itemsDiv.style.display = 'block';
        
        for (const folder of folders) {
            const jobs = await loadJobs(folder.id);
            
            const folderDiv = document.createElement('div');
            folderDiv.className = 'folder-complete-node';
            
            const folderHeader = document.createElement('div');
            folderHeader.className = 'folder-complete-header';
            folderHeader.innerHTML = `
                <div class="folder-complete-name">📁 ${folder.name}</div>
                <div class="folder-complete-actions">
                    <button class="options-btn" onclick="event.stopPropagation(); showFolderContextMenu(event, ${client.id}, ${folder.id})">⋮</button>
                    <span class="folder-toggle" id="folder-toggle-${folder.id}">▼</span>
                </div>
            `;
            
            let folderExpanded = true;
            folderHeader.onclick = (e) => {
                e.stopPropagation();
                folderExpanded = !folderExpanded;
                const subItems = document.getElementById(`folder-items-${folder.id}`);
                const toggle = document.getElementById(`folder-toggle-${folder.id}`);
                if (subItems) {
                    subItems.style.display = folderExpanded ? 'block' : 'none';
                    toggle.textContent = folderExpanded ? '▼' : '▶';
                }
            };
            
            const jobsDiv = document.createElement('div');
            jobsDiv.className = 'subitems-complete-list';
            jobsDiv.id = `folder-items-${folder.id}`;
            jobsDiv.style.display = 'block';
            
            for (const job of jobs) {
                const jobDiv = document.createElement('div');
                jobDiv.className = 'job-complete-node';
                const jobHeader = document.createElement('div');
                jobHeader.className = 'job-complete-header';
                jobHeader.innerHTML = `
                    <div class="job-complete-info">
                        <span class="job-complete-name">📄 ${job.name}</span>
                        <span class="job-credits-badge">🔺 ${job.credits ? job.credits + ' cr' : '?'}</span>
                        <span class="job-verified-badge ${job.verified ? 'verified' : 'unverified'}">${job.verified ? '✅' : '❌'}</span>
                        ${job.running ? '<span class="job-running-badge"></span>' : ''}
                        <span class="job-nextrun-badge">⏩ ${job.next_run || '-'}</span>
                    </div>
                    <div class="job-complete-actions">
                        <span class="job-toggle">▶</span>
                    </div>
                `;
                jobHeader.onclick = (e) => {
                    e.stopPropagation();
                    selectJob(client.id, folder.id, job.id);
                    showRightPanel();
                };
                jobDiv.appendChild(jobHeader);
                jobsDiv.appendChild(jobDiv);
            }
            
            folderDiv.appendChild(folderHeader);
            folderDiv.appendChild(jobsDiv);
            itemsDiv.appendChild(folderDiv);
        }
        
        clientDiv.appendChild(clientHeader);
        clientDiv.appendChild(itemsDiv);
        container.appendChild(clientDiv);
    }
}

function filterClientsComplete() {
    const term = document.getElementById('clientSearchComplete')?.value.toLowerCase() || '';
    const nodes = document.querySelectorAll('.client-complete-node');
    nodes.forEach(node => {
        const name = node.querySelector('.client-complete-name')?.innerText.toLowerCase() || '';
        node.style.display = name.includes(term) ? 'block' : 'none';
    });
}

async function selectJob(clientId, folderId, jobId) {
    try {
        const jobs = await loadJobs(folderId);
        const job = jobs.find(j => j.id === jobId);
        if (!job) return;
        
        selectedClientId = clientId;
        selectedJobId = jobId;
        selectedJob = job;
        
        const client = clientsData.find(c => c.id === clientId);
        selectedClient = client;
        
        document.getElementById('breadcrumbInside').innerHTML = `${client?.name || 'Client'} \\ <span>${job.name}</span>`;
        document.getElementById('jobDetailTitle').innerText = job.name;
        document.getElementById('jobDetailActions').innerHTML = `
            <button class="detail-action-btn-complete run" onclick="runSelectedJob()">▶ Run Now</button>
            <button class="detail-action-btn-complete edit" onclick="editSelectedJob()">✏️ Edit</button>
            <button class="detail-action-btn-complete delete" onclick="deleteSelectedJob()">🗑 Delete</button>
            <button class="detail-action-btn-complete send" onclick="sendJob()">📤 Send</button>
        `;
        document.getElementById('jobSubject').innerText = job.subject || job.name;
        document.getElementById('jobCreatedInfo').innerText = `Created: ${job.created_at || '-'}`;
        document.getElementById('supportingFilesList').innerHTML = '<span class="file-tag">No files</span>';
        document.getElementById('frequencyValue').innerHTML = job.frequency || 'Daily';
        document.getElementById('dateValue').innerHTML = job.job_date || '-';
        document.getElementById('timeValue').innerHTML = job.job_time || '-';
        document.getElementById('timezoneValue').innerHTML = job.timezone || 'Asia/Kolkata';
        document.getElementById('nextRunValue').innerHTML = job.next_run || '-';
        
        await loadActivityLogs(jobId);
        
    } catch (error) {
        console.error('Error selecting job:', error);
    }
}

async function loadActivityLogs(jobId) {
    try {
        const logs = await apiCall(`/jobs/${jobId}/logs`, 'GET');
        currentJobLogs = logs;
        renderActivityLogsComplete();
    } catch (error) {
        currentJobLogs = [];
        renderActivityLogsComplete();
    }
}

function renderActivityLogsComplete() {
    const container = document.getElementById('activityLogListComplete');
    if (!container) return;
    
    if (currentJobLogs.length === 0) {
        container.innerHTML = '<div style="padding:1rem; text-align:center; color:#94a3b8;">No activity logs yet</div>';
        return;
    }
    
    container.innerHTML = '';
    currentJobLogs.forEach(log => {
        const div = document.createElement('div');
        div.className = `log-complete-entry ${log.status}`;
        div.innerHTML = `
            <div class="log-complete-time">📅 ${log.time}</div>
            <div class="log-complete-message">${log.message}</div>
            <div class="log-complete-duration">⏱ Duration: ${log.duration}</div>
        `;
        container.appendChild(div);
    });
}

function filterActivityLogsSmall() {
    const filterDate = document.getElementById('logDateFilterSmall')?.value;
    const container = document.getElementById('activityLogListComplete');
    if (!container) return;
    
    if (!filterDate) {
        renderActivityLogsComplete();
        return;
    }
    
    const filtered = currentJobLogs.filter(log => log.time.includes(filterDate));
    container.innerHTML = '';
    filtered.forEach(log => {
        const div = document.createElement('div');
        div.className = `log-complete-entry ${log.status}`;
        div.innerHTML = `
            <div class="log-complete-time">📅 ${log.time}</div>
            <div class="log-complete-message">${log.message}</div>
            <div class="log-complete-duration">⏱ Duration: ${log.duration}</div>
        `;
        container.appendChild(div);
    });
}

function downloadActivityLog() {
    let txt = "Job Activity Log\n" + "=".repeat(50) + "\n\n";
    currentJobLogs.forEach(l => txt += `${l.time} - ${l.message} (${l.status}) - Duration: ${l.duration}\n`);
    const blob = new Blob([txt]), a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = `activity_log_${new Date().toISOString().slice(0,19)}.txt`; a.click(); URL.revokeObjectURL(url);
    alert('Log downloaded!');
}

function toggleRightPanel() {
    const rightPanel = document.querySelector('.right-complete-panel');
    if (rightPanel) { isRightPanelVisible = !isRightPanelVisible; rightPanel.style.display = isRightPanelVisible ? 'flex' : 'none'; }
}

function showRightPanel() {
    const rightPanel = document.querySelector('.right-complete-panel');
    if (rightPanel) { isRightPanelVisible = true; rightPanel.style.display = 'flex'; }
}

async function addNewClient() {
    const name = prompt("Enter client name:");
    if (name && name.trim()) {
        try {
            await apiCall('/clients', 'POST', { name: name.trim() });
            await loadClientsData();
            await renderClientsTreeComplete();
            alert(`Client "${name}" added!`);
        } catch (error) {
            alert('Failed to add client: ' + error.message);
        }
    }
}

function showClientContextMenu(event, clientId) {
    event.preventDefault(); event.stopPropagation();
    const existing = document.getElementById('contextMenu');
    if (existing) existing.remove();
    const menu = document.createElement('div'); menu.id = 'contextMenu'; menu.className = 'context-menu';
    menu.style.left = event.pageX + 'px'; menu.style.top = event.pageY + 'px';
    menu.innerHTML = `
        <div class="context-menu-item" onclick="addFolderToClient(${clientId})">📁 Add Folder</div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" onclick="deleteClient(${clientId})">🗑 Delete Client</div>
    `;
    document.body.appendChild(menu);
    setTimeout(() => { document.addEventListener('click', function close(e) { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', close); } }); }, 100);
}

function showFolderContextMenu(event, clientId, folderId) {
    event.preventDefault(); event.stopPropagation();
    const existing = document.getElementById('contextMenu');
    if (existing) existing.remove();
    const menu = document.createElement('div'); menu.id = 'contextMenu'; menu.className = 'context-menu';
    menu.style.left = event.pageX + 'px'; menu.style.top = event.pageY + 'px';
    menu.innerHTML = `
        <div class="context-menu-item" onclick="addJobToFolder(${clientId}, ${folderId})">📄 Add Job</div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" onclick="deleteFolder(${clientId}, ${folderId})">🗑 Delete Folder</div>
    `;
    document.body.appendChild(menu);
    setTimeout(() => { document.addEventListener('click', function close(e) { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', close); } }); }, 100);
}

async function addFolderToClient(clientId) {
    const name = prompt("Enter folder name:");
    if (name && name.trim()) {
        try {
            await apiCall('/folders', 'POST', { client_id: clientId, name: name.trim() });
            await renderClientsTreeComplete();
            alert(`Folder "${name}" added!`);
        } catch (error) {
            alert('Failed to add folder: ' + error.message);
        }
    }
}

async function deleteClient(clientId) {
    if (confirm('Delete this client and all its contents?')) {
        try {
            await apiCall(`/clients/${clientId}`, 'DELETE');
            await loadClientsData();
            await renderClientsTreeComplete();
            alert('Client deleted!');
        } catch (error) {
            alert('Failed to delete client: ' + error.message);
        }
    }
}

async function addJobToFolder(clientId, folderId) {
    const name = prompt("Enter job name:");
    if (name && name.trim()) {
        try {
            await apiCall('/jobs', 'POST', {
                folder_id: folderId,
                name: name.trim(),
                subject: name.trim(),
                description: "New automation job",
                frequency: "Daily",
                job_date: new Date().toISOString().slice(0,10),
                job_time: "12:00",
                timezone: "Asia/Kolkata",
                estimated_hours: 1
            });
            await renderClientsTreeComplete();
            alert(`Job "${name}" added!`);
        } catch (error) {
            alert('Failed to add job: ' + error.message);
        }
    }
}

async function deleteFolder(clientId, folderId) {
    if (confirm('Delete this folder and all its contents?')) {
        try {
            await apiCall(`/folders/${folderId}`, 'DELETE');
            await renderClientsTreeComplete();
            alert('Folder deleted!');
        } catch (error) {
            alert('Failed to delete folder: ' + error.message);
        }
    }
}

function editSelectedJob() {
    if (!selectedJob) { alert('Select a job first'); return; }
    isEditMode = true;
    editingJobId = selectedJob.id;
    
    const rightPanel = document.querySelector('.right-complete-panel');
    if (rightPanel) {
        rightPanel.innerHTML = `
            <div class="job-detail-complete-card">
                <div class="job-detail-header">
                    <h3 style="color:#0f172a;">✏️ Edit Job: ${selectedJob.name}</h3>
                    <button onclick="closeEditMode()" style="background:#e2e8f0; border:none; padding:0.3rem 0.8rem; border-radius:8px; cursor:pointer;">✕ Close</button>
                </div>
                <div class="edit-job-form">
                    <div class="full-width"><label>Job Title</label><input type="text" id="editJobTitle" value="${selectedJob.name}"></div>
                    <div><label>Subject</label><input type="text" id="editJobSubject" value="${selectedJob.subject || selectedJob.name}"></div>
                    <div><label>Estimated Hours</label><input type="number" step="0.5" id="editEstimatedHours" value="${selectedJob.estimated_hours || 1}" class="estimated-hours-input"><div class="time-saved-info">⏱️ Will save ${selectedJob.estimated_hours || 1} hours/run</div></div>
                    <div class="full-width"><label>Description</label><textarea id="editJobDescription" rows="2">${selectedJob.description || ''}</textarea></div>
                    <div class="full-width"><label>Supporting Files</label><div class="file-attach-edit" onclick="alert('File upload coming soon')">📂 Click to attach files</div></div>
                    <div class="schedule-row-inline-edit">
                        <div><label>Frequency</label><select id="editJobFrequency"><option ${selectedJob.frequency === 'Daily' ? 'selected' : ''}>Daily</option><option ${selectedJob.frequency === 'Weekly' ? 'selected' : ''}>Weekly</option><option ${selectedJob.frequency === 'Monthly' ? 'selected' : ''}>Monthly</option></select></div>
                        <div><label>Date</label><input type="date" id="editJobDate" value="${selectedJob.job_date || ''}"></div>
                        <div><label>Time</label><input type="time" id="editJobTime" value="${selectedJob.job_time || ''}"></div>
                        <div><label>Timezone</label><select id="editJobTimezone"><option ${selectedJob.timezone === 'Asia/Kolkata' ? 'selected' : ''}>Asia/Kolkata</option><option ${selectedJob.timezone === 'America/New_York' ? 'selected' : ''}>America/New_York</option></select></div>
                    </div>
                    <div class="full-width" style="display:flex; gap:1rem; margin-top:1rem;">
                        <button class="detail-action-btn-complete edit" onclick="updateJobDetails()" style="background:#10b981; flex:1;">💾 Update Job</button>
                        <button class="detail-action-btn-complete delete" onclick="closeEditMode()" style="background:#6b7280; flex:1;">Cancel</button>
                    </div>
                </div>
            </div>
        `;
    }
}

async function updateJobDetails() {
    if (!editingJobId) return;
    
    const newTitle = document.getElementById('editJobTitle')?.value;
    const newSubject = document.getElementById('editJobSubject')?.value;
    const newDescription = document.getElementById('editJobDescription')?.value;
    const newFrequency = document.getElementById('editJobFrequency')?.value;
    const newDate = document.getElementById('editJobDate')?.value;
    const newTime = document.getElementById('editJobTime')?.value;
    const newTimezone = document.getElementById('editJobTimezone')?.value;
    const newEstimatedHours = parseFloat(document.getElementById('editEstimatedHours')?.value) || 1;
    
    if (!newTitle) { alert('Job Title is required'); return; }
    
    try {
        await apiCall(`/jobs/${editingJobId}`, 'PUT', {
            name: newTitle,
            subject: newSubject || newTitle,
            description: newDescription,
            frequency: newFrequency,
            job_date: newDate,
            job_time: newTime,
            timezone: newTimezone,
            estimated_hours: newEstimatedHours
        });
        
        alert(`Job "${newTitle}" updated and needs verification!`);
        await renderClientsTreeComplete();
        closeEditMode();
        
        if (selectedClientId && editingJobId) {
            const client = clientsData.find(c => c.id === selectedClientId);
            if (client) {
                const folders = await loadFolders(selectedClientId);
                for (const folder of folders) {
                    const jobs = await loadJobs(folder.id);
                    const job = jobs.find(j => j.id === editingJobId);
                    if (job) {
                        await selectJob(selectedClientId, folder.id, editingJobId);
                        break;
                    }
                }
            }
        }
    } catch (error) {
        alert('Failed to update job: ' + error.message);
    }
}

function closeEditMode() {
    isEditMode = false;
    editingJobId = null;
    showRightPanel();
    if (selectedClientId && selectedJobId) {
        location.reload();
    }
}

async function verifyCurrentJob() {
    if (!selectedJobId) { alert('Select a job first'); return; }
    
    try {
        const result = await apiCall(`/jobs/${selectedJobId}/verify`, 'POST');
        alert(result.message);
        await renderClientsTreeComplete();
    } catch (error) {
        alert('Verification failed: ' + error.message);
    }
}

async function runSelectedJob() {
    if (!selectedJobId) { alert('Select a job first'); return; }
    
    try {
        const result = await apiCall(`/jobs/${selectedJobId}/run`, 'POST');
        alert(result.message);
        await loadActivityLogs(selectedJobId);
        await renderClientsTreeComplete();
        
        const heading = document.getElementById('page-heading-text')?.innerHTML;
        if (heading === 'User Dashboard') {
            await showDashboard();
        }
    } catch (error) {
        alert('Failed to run job: ' + error.message);
    }
}

async function deleteSelectedJob() {
    if (!selectedJobId) { alert('Select a job first'); return; }
    if (confirm('Delete this job?')) {
        try {
            await apiCall(`/jobs/${selectedJobId}`, 'DELETE');
            alert('Job deleted!');
            await renderClientsTreeComplete();
            selectedJobId = null;
            selectedJob = null;
            document.getElementById('jobDetailTitle').innerText = 'Select a job';
            document.getElementById('jobSubject').innerText = '-';
        } catch (error) {
            alert('Failed to delete job: ' + error.message);
        }
    }
}

async function sendJob() {
    if (!selectedJobId) { alert('Select a job first'); return; }
    const email = prompt(`Send job "${selectedJob?.name}" to:`, "");
    if (email && email.trim()) {
        try {
            await apiCall(`/jobs/${selectedJobId}/send`, 'POST', { email: email.trim() });
            alert(`✅ Job sent to ${email}`);
        } catch (error) {
            alert('Failed to send job: ' + error.message);
        }
    }
}

// ============ NOTIFICATION FUNCTIONS ==========
async function showNotifications() {
    document.getElementById('page-heading-text').innerHTML = '🔔 Notifications';
    const headingContainer = document.getElementById('page-fixed-heading');
    if (headingContainer && !headingContainer.querySelector('hr')) {
        const hr = document.createElement('hr');
        headingContainer.appendChild(hr);
    }
    document.getElementById('appContent').style.display = 'block';
    document.getElementById('changePasswordPage').style.display = 'none';
    
    try {
        const notifications = await apiCall('/notifications', 'GET');
        const pending = notifications.filter(n => n.status === 'pending');
        const accepted = notifications.filter(n => n.status === 'accepted');
        
        let html = `<div class="dashboard-container"><div class="dashboard-card"><h3>🔔 Notifications (${pending.length} pending)</h3><div style="margin-top:1rem;">`;
        
        pending.forEach(notif => {
            html += `<div style="background:#f8fafc; border-radius:12px; padding:1rem; margin-bottom:0.8rem; border-left:3px solid #0f172a;">
                        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:0.5rem;">
                            <div>
                                <div style="font-weight:600;">📄 ${notif.job_name}</div>
                                <div style="font-size:0.7rem;">Client: ${notif.client_name} | From: ${notif.from_user}</div>
                                <div style="font-size:0.65rem;">Sent: ${notif.sent_at}</div>
                            </div>
                            <div>
                                <button onclick="acceptNotification(${notif.id})" style="background:#10b981; color:white; border:none; padding:0.3rem 0.8rem; border-radius:20px;">✓ Accept</button>
                                <button onclick="rejectNotification(${notif.id})" style="background:#ef4444; color:white; border:none; padding:0.3rem 0.8rem; border-radius:20px;">✗ Reject</button>
                            </div>
                        </div>
                    </div>`;
        });
        
        if (pending.length === 0) {
            html += `<div style="text-align:center; padding:2rem; color:#94a3b8;">No pending notifications</div>`;
        }
        
        html += `</div></div>`;
        
        if (accepted.length > 0) {
            html += `<div class="dashboard-card" style="margin-top:1rem;"><h3>✅ Accepted Jobs</h3><div style="margin-top:1rem;">`;
            accepted.forEach(notif => {
                html += `<div style="background:#f0fdf4; border-radius:12px; padding:0.8rem; margin-bottom:0.5rem; border-left:3px solid #10b981;">
                            <div style="font-weight:500;">${notif.job_name}</div>
                            <div style="font-size:0.65rem;">From: ${notif.from_user}</div>
                        </div>`;
            });
            html += `</div></div>`;
        }
        
        document.getElementById('appContent').innerHTML = html;
    } catch (error) {
        document.getElementById('appContent').innerHTML = `<div class="dashboard-card"><p>Error loading notifications: ${error.message}</p></div>`;
    }
    updateActiveNavLink('notifications');
}

async function acceptNotification(id) {
    try {
        await apiCall(`/notifications/${id}/accept`, 'POST');
        alert('Job accepted and added to your account!');
        showNotifications();
        await renderClientsTreeComplete();
    } catch (error) {
        alert('Failed to accept: ' + error.message);
    }
}

async function rejectNotification(id) {
    try {
        await apiCall(`/notifications/${id}/reject`, 'POST');
        alert('Notification rejected');
        showNotifications();
    } catch (error) {
        alert('Failed to reject: ' + error.message);
    }
}

// ============ SERVICES FUNCTIONS ==========
async function showServices() {
    document.getElementById('page-heading-text').innerHTML = 'Our Services';
    const headingContainer = document.getElementById('page-fixed-heading');
    if (headingContainer && !headingContainer.querySelector('hr')) {
        const hr = document.createElement('hr');
        headingContainer.appendChild(hr);
    }
    document.getElementById('appContent').style.display = 'block';
    document.getElementById('changePasswordPage').style.display = 'none';
    
    try {
        const services = await apiCall('/services', 'GET');
        let gridHtml = '<div class="services-container"><div class="services-grid">';
        services.forEach(s => {
            gridHtml += `
                <div class="service-card" onclick="openServiceModal('${s.name}', ${s.needs_two_files}, ${s.credits})">
                    <div class="service-thumbnail"><div class="service-thumb-icon">📄</div></div>
                    <div class="service-content"><h4>${s.name}</h4><p>${s.desc}</p></div>
                    <div class="service-footer"><div class="service-credits">${s.credits} Credit${s.credits > 1 ? 's' : ''}</div></div>
                </div>
            `;
        });
        gridHtml += '</div></div>';
        document.getElementById('appContent').innerHTML = gridHtml;
    } catch (error) {
        document.getElementById('appContent').innerHTML = `<div class="dashboard-card"><p>Error loading services: ${error.message}</p></div>`;
    }
    updateActiveNavLink('services');
}

function openServiceModal(name, needsTwoFiles, credits) {
    currentService = name;
    currentServiceCredits = credits;
    const modal = document.getElementById('serviceModal');
    const title = document.getElementById('serviceModalTitle');
    const form = document.getElementById('serviceModalForm');
    if (!modal || !title || !form) return;
    title.innerText = `${name} (${credits} credits)`;
    form.innerHTML = `
        <div class="form-group-simple"><label>Select ${needsTwoFiles ? '2' : '1'} PDF File(s)</label><input type="file" id="serviceFiles" accept=".pdf" ${needsTwoFiles ? 'multiple' : ''} style="width:100%; padding:0.5rem; border:1px solid #e2e8f0; border-radius:8px; background:#f8fafc;"></div>
        <div class="form-group-simple"><label>Output Name</label><input type="text" id="outputName" value="${name.toLowerCase().replace(' ', '_')}.pdf" style="width:100%; padding:0.5rem;"></div>
    `;
    if (name === 'Split PDF') form.innerHTML += `<div class="form-group-simple"><label>Split Mode</label><select id="splitMode"><option>Every Page</option><option>Specific Page Range</option></select></div><div class="form-group-simple"><label>Page Range</label><input type="text" id="pageRange" placeholder="1-5,8,10"></div>`;
    if (name === 'Watermark') form.innerHTML += `<div class="form-group-simple"><label>Watermark Text</label><input type="text" id="watermarkText" value="CONFIDENTIAL"></div>`;
    if (name === 'Protect PDF') form.innerHTML += `<div class="form-group-simple"><label>Password</label><input type="password" id="password"></div>`;
    if (name === 'Unlock PDF') form.innerHTML += `<div class="form-group-simple"><label>Password</label><input type="password" id="password"></div>`;
    modal.style.display = 'flex';
}

async function processDynamicService() {
    const files = document.getElementById('serviceFiles')?.files;
    if (!files || files.length === 0) { alert('Please select file(s)'); return; }
    closeModal('serviceModal');
    
    try {
        const result = await apiCall(`/services/${currentService}/process`, 'POST');
        alert(`✅ ${currentService} processed! -${currentServiceCredits} credits\nRemaining: ${result.credits_remaining} credits`);
        
        const heading = document.getElementById('page-heading-text')?.innerHTML;
        if (heading === 'User Dashboard') {
            await showDashboard();
        }
    } catch (error) {
        alert('Failed to process service: ' + error.message);
    }
}

// ============ PRICING FUNCTIONS ==========
async function showPricing() {
    document.getElementById('page-heading-text').innerHTML = 'Pricing Plans';
    const headingContainer = document.getElementById('page-fixed-heading');
    if (headingContainer && !headingContainer.querySelector('hr')) {
        const hr = document.createElement('hr');
        headingContainer.appendChild(hr);
    }
    document.getElementById('appContent').style.display = 'block';
    document.getElementById('changePasswordPage').style.display = 'none';
    
    try {
        const plans = await apiCall('/billing/plans', 'GET');
        const stats = await apiCall('/dashboard/stats', 'GET');
        const currentPlan = stats.current_plan;
        
        let plansHtml = '<div class="pricing-container"><div class="pricing-two-column"><div class="pricing-plans-column"><h3>📋 Choose Your Plan</h3><div class="pricing-grid">';
        
        plans.forEach(plan => {
            let isPopular = plan.name === 'monthly';
            let isCurrent = currentPlan === plan.name;
            plansHtml += `
                <div class="pricing-card ${isCurrent ? 'selected' : ''} ${isPopular ? 'popular' : ''}" onclick="selectPlan('${plan.name}')">
                    ${isPopular ? '<div class="popular-badge">🔥 POPULAR</div>' : ''}
                    <div class="plan-info">
                        <div class="plan-name">${plan.name === 'free' ? 'Free Plan' : plan.name === 'daily' ? 'Daily Plan' : plan.name === 'monthly' ? 'Monthly Plan' : 'Yearly Plan'}</div>
                        <div class="plan-price">$${plan.price} <span>/ ${plan.period}</span></div>
                    </div>
                    <div>
                        ${isCurrent ? '<span class="current-plan-badge">Current</span>' : ''}
                        <button class="choose-plan-btn">Choose</button>
                    </div>
                </div>
            `;
        });
        
        plansHtml += `</div></div>
            <div class="pricing-right-column">
                <div class="add-credits-column"><h3>➕ Add Credits</h3><div class="credits-grid">
                    <div class="credit-card" onclick="addCredits(1000)"><div class="credit-amount">1,000 Credits</div><div class="credit-price">$10</div></div>
                    <div class="credit-card" onclick="addCredits(5000)"><div class="credit-amount">5,000 Credits</div><div class="credit-price">$45</div></div>
                    <div class="credit-card" onclick="addCredits(10000)"><div class="credit-amount">10,000 Credits</div><div class="credit-price">$85</div></div>
                    <div class="custom-credit-card" onclick="customCredit()"><div class="credit-amount">✨ Custom</div><div class="credit-price">Enter amount</div></div>
                </div><button class="buy-credits-btn" onclick="proceedToBuy()">💳 Buy Credits</button></div>
                <div class="referral-column"><h3>🎁 Referral Dashboard</h3><table class="referral-table"><thead><tr><th>REFERRAL ID</th><th>CREDIT PER REFERRAL</th><th>TOTAL EARNED</th></tr></thead><tbody><tr><td><span class="referral-code">USER123456</span><button class="copy-code-btn-table" onclick="copyReferralCode()">Copy</button></td><td class="referral-value">500 Credits</td><td class="referral-value">12,500 Credits</td></tr></tbody></table></div>
            </div>
        </div></div>`;
        
        document.getElementById('appContent').innerHTML = plansHtml;
    } catch (error) {
        document.getElementById('appContent').innerHTML = `<div class="dashboard-card"><p>Error loading pricing: ${error.message}</p></div>`;
    }
    updateActiveNavLink('pricing');
}

async function selectPlan(plan) {
    try {
        const result = await apiCall('/billing/select-plan', 'POST', { plan });
        alert(`${plan} Plan activated! ${result.credits} credits`);
        await showPricing();
        await showDashboard();
    } catch (error) {
        alert('Failed to select plan: ' + error.message);
    }
}

async function addCredits(credits) {
    try {
        const result = await apiCall('/billing/add-credits', 'POST', { credits });
        alert(`Added ${credits} credits! Total: ${result.credits}`);
        await showPricing();
        await showDashboard();
    } catch (error) {
        alert('Failed to add credits: ' + error.message);
    }
}

function customCredit() {
    let amount = prompt('Enter credit amount:');
    if (amount && !isNaN(amount) && parseInt(amount) > 0) {
        addCredits(parseInt(amount));
    }
}

function proceedToBuy() { alert("Proceed to payment gateway."); }
function copyReferralCode() { navigator.clipboard.writeText('USER123456').then(() => alert('Referral code copied!')); }

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

async function generateApiKey() {
    try {
        const result = await apiCall('/api-keys', 'POST');
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

// ============ PROFILE FUNCTIONS ==========
async function showProfile() {
    document.getElementById('page-heading-text').innerHTML = 'User Profile';
    const headingContainer = document.getElementById('page-fixed-heading');
    if (headingContainer && !headingContainer.querySelector('hr')) {
        const hr = document.createElement('hr');
        headingContainer.appendChild(hr);
    }
    document.getElementById('appContent').style.display = 'block';
    document.getElementById('changePasswordPage').style.display = 'none';
    
    try {
        const profile = await apiCall('/users/profile', 'GET');
        document.getElementById('appContent').innerHTML = `
            <div class="profile-wrapper"><div class="profile-2col"><div class="profile-left"><div class="profile-avatar">👤</div><h3>${profile.first_name} ${profile.last_name}</h3><p>${profile.email}</p><button class="upload-photo-btn" onclick="alert('Upload coming soon')">📸 Upload Photo</button></div>
            <div class="profile-right"><div class="form-row"><div class="form-field"><label>First Name</label><input type="text" id="profile-firstname" value="${profile.first_name}"></div><div class="form-field"><label>Last Name</label><input type="text" id="profile-lastname" value="${profile.last_name}"></div></div>
            <div class="form-row"><div class="form-field"><label>Gender</label><select id="profile-gender"><option value="Male" ${profile.gender === 'Male' ? 'selected' : ''}>Male</option><option value="Female" ${profile.gender === 'Female' ? 'selected' : ''}>Female</option><option value="Other" ${profile.gender === 'Other' ? 'selected' : ''}>Other</option></select></div><div class="form-field"><label>Birthdate</label><input type="date" id="profile-birthdate" value="${profile.birthdate || ''}"></div></div>
            <div class="form-row"><div class="form-field"><label>Country Code</label><input type="text" id="profile-country" value="${profile.country_code || '+91'}"></div><div class="form-field"><label>Mobile Number</label><input type="text" id="profile-mobile" value="${profile.mobile || ''}"></div></div>
            <div class="form-field"><label>Email Address</label><input type="email" id="profile-email" value="${profile.email}"></div>
            <div class="profile-buttons"><button class="btn-save-profile" onclick="saveProfile()">💾 Save Changes</button><button class="btn-delete-account" onclick="deleteAccount()">🗑 Delete Account</button></div></div></div></div>`;
    } catch (error) {
        document.getElementById('appContent').innerHTML = `<div class="dashboard-card"><p>Error loading profile: ${error.message}</p></div>`;
    }
    updateActiveNavLink('profile');
}

async function saveProfile() {
    const data = {
        first_name: document.getElementById('profile-firstname')?.value,
        last_name: document.getElementById('profile-lastname')?.value,
        gender: document.getElementById('profile-gender')?.value,
        birthdate: document.getElementById('profile-birthdate')?.value,
        country_code: document.getElementById('profile-country')?.value,
        mobile: document.getElementById('profile-mobile')?.value,
        email: document.getElementById('profile-email')?.value
    };
    
    try {
        await apiCall('/users/profile', 'PUT', data);
        alert('Profile saved!');
        showProfile();
    } catch (error) {
        alert('Failed to save profile: ' + error.message);
    }
}

async function deleteAccount() {
    if (confirm('Are you sure? This action cannot be undone.')) {
        try {
            await apiCall('/users/account', 'DELETE');
            alert('Account deleted');
            logout();
        } catch (error) {
            alert('Failed to delete account: ' + error.message);
        }
    }
}

// ============ INITIAL SERVICES DATA (for display) ==========
let isLoggedIn = false;