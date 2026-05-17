// ============ AUTH FUNCTIONS ==========
let tempVerifyEmail = '';

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
        setAuthToken(result.token);
        setCurrentUser(result.user);
        setIsLoggedIn(true);
        
        document.getElementById('loggedInView').style.display = 'flex';
        document.getElementById('loggedOutView').style.display = 'none';
        
        // Load header photo after login
        await loadHeaderPhoto();
        
        showDashboard();
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

function logout() { 
    setIsLoggedIn(false);
    clearAuthToken();
    clearCurrentUser();
    document.getElementById('loggedInView').style.display = 'none';
    document.getElementById('loggedOutView').style.display = 'flex';
    resetToHome(); 
}

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
        const result = await apiCall('/auth/register', 'POST', { email, password, first_name: firstName, last_name: lastName });
        alert('Registration successful! Please check your email for verification code.');
        showVerifyEmailPage(email);
    } catch (error) {
        alert('Registration failed: ' + error.message);
    }
}

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
        alert('Email verified successfully! You can now login.');
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
        tempVerifyEmail = email;
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
            email: tempVerifyEmail, 
            code: document.getElementById('verifyResetCode')?.value, 
            new_password: np 
        });
        alert('Password reset successfully! Please login with your new password.');
        showLoginPage();
    } catch (error) {
        alert('Failed to reset password: ' + error.message);
    }
}