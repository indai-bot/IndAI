// ============ AUTH FUNCTIONS ==========
let tempVerifyEmail = '';
let tempVerifyAction = '';
let tempVerifyPassword = '';
let countdownTimer = null;
let timeLeft = 60;
let isTimerExpired = false;

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
                    <div class="login-form-group"><label>Email Address</label><input type="email" id="loginUser" placeholder="Enter your email"></div>
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
    
    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }
    
    try {
        const result = await apiCall('/auth/login', 'POST', { email, password });
        
        if (result.requires_verification) {
            tempVerifyEmail = email;
            tempVerifyPassword = password;
            tempVerifyAction = 'login';
            isTimerExpired = false;
            showVerifyCodePage('login', email);
            setTimeout(() => {
                sendVerificationEmail('login');
            }, 100);
        }
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
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
        const result = await apiCall('/auth/register', 'POST', { 
            email, password, first_name: firstName, last_name: lastName 
        });
        
        if (result.requires_verification) {
            tempVerifyEmail = email;
            tempVerifyPassword = password;
            tempVerifyAction = 'register';
            window.tempRegData = { first_name: firstName, last_name: lastName };
            isTimerExpired = false;
            showVerifyCodePage('register', email);
            setTimeout(() => {
                sendVerificationEmail('register');
            }, 100);
        }
    } catch (error) {
        alert('Registration failed: ' + error.message);
    }
}

async function sendVerificationEmail(action) {
    try {
        if (action === 'register') {
            await apiCall('/auth/register', 'POST', {
                email: tempVerifyEmail,
                password: tempVerifyPassword,
                first_name: window.tempRegData?.first_name || '',
                last_name: window.tempRegData?.last_name || ''
            });
        } else if (action === 'login') {
            await apiCall('/auth/login', 'POST', {
                email: tempVerifyEmail,
                password: tempVerifyPassword
            });
        } else if (action === 'forgot') {
            await apiCall('/auth/forgot-password', 'POST', { 
                email: tempVerifyEmail
            });
        }
        console.log('Verification email sent successfully');
    } catch (error) {
        console.error('Failed to send verification email:', error);
    }
}

function showVerifyCodePage(action, email) {
    const loggedOutContent = document.getElementById('loggedOutContent');
    if (!loggedOutContent) return;
    
    let title = '';
    let message = '';
    
    if (action === 'register') {
        title = 'Verify Your Email';
        message = `Enter the verification code below. A code will be sent to ${email} shortly.`;
    } else if (action === 'login') {
        title = 'Verify Login';
        message = `Enter the verification code below. A code will be sent to ${email} shortly.`;
    } else if (action === 'forgot') {
        title = 'Verify Password Reset';
        message = `Enter the verification code below. A code will be sent to ${email} shortly.`;
    }
    
    document.getElementById('loggedOutHeadingText').innerText = title;
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
                    <div class="login-info-row"><div class="login-label">${title.toUpperCase()}</div><div class="login-value">${message}</div></div>
                </div>
                <div class="login-form-card">
                    <h2>${title}</h2>
                    <div class="login-form-group"><label>Verification Code</label><input type="text" id="verifyCode" placeholder="Enter 6-digit code"></div>
                    <div id="timerDisplay" style="text-align: center; font-size: 1.2rem; font-weight: bold; color: #0f172a; margin: 0.5rem 0;">02:00</div>
                    <div class="login-form-group" style="display: flex; gap: 1rem;">
                        <button class="login-submit-btn" id="verifyBtn" onclick="verifyCodeAction('${action}')" style="flex:1;">Verify →</button>
                        <button class="btn-secondary" id="resendCodeBtn" onclick="resendCodeAction('${action}')" style="display: none;">Resend Code</button>
                    </div>
                    <div class="register-link"><a onclick="showLoginPage()">Back to Login</a></div>
                </div>
            </div>
        </div>
    `;
    
    // Start timer
    startTimer();
}

function startTimer() {
    if (countdownTimer) clearInterval(countdownTimer);
    timeLeft = 60;
    isTimerExpired = false;
    updateTimerDisplay();
    
    // Reset button visibility: Verify visible, Resend hidden
    const verifyBtn = document.getElementById('verifyBtn');
    const resendBtn = document.getElementById('resendCodeBtn');
    
    if (verifyBtn) {
        verifyBtn.style.display = 'block';
        verifyBtn.style.flex = '1';
    }
    if (resendBtn) {
        resendBtn.style.display = 'none';
    }
    
    countdownTimer = setInterval(function() {
        if (timeLeft <= 0) {
            clearInterval(countdownTimer);
            isTimerExpired = true;
            // Timer expired: Verify HIDE, Resend SHOW
            if (verifyBtn) {
                verifyBtn.style.display = 'none';
            }
            if (resendBtn) {
                resendBtn.style.display = 'block';
                resendBtn.style.flex = 'auto';
            }
            const timerDisplay = document.getElementById('timerDisplay');
            if (timerDisplay) {
                timerDisplay.innerText = '00:00';
                timerDisplay.style.color = '#ef4444';
            }
        } else {
            timeLeft--;
            updateTimerDisplay();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timerString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.innerText = timerString;
        if (timeLeft === 0) {
            timerDisplay.innerText = '00:00';
            timerDisplay.style.color = '#ef4444';
        }
    }
}

async function verifyCodeAction(action) {
    const code = document.getElementById('verifyCode')?.value;
    if (!code || code.length !== 6) {
        alert('Please enter 6-digit verification code');
        return;
    }
    
    // Check if timer has expired
    if (isTimerExpired) {
        alert('Session timeout! Please click Resend Code to get a new verification code.');
        return;
    }
    
    // Timer continues - DO NOT STOP TIMER on wrong code
    // Only stop timer if verification is successful
    
    try {
        if (action === 'register') {
            const result = await apiCall('/auth/verify-registration', 'POST', { 
                email: tempVerifyEmail, 
                code: code 
            });
            // Success - stop timer
            if (countdownTimer) {
                clearInterval(countdownTimer);
                countdownTimer = null;
            }
            alert('Registration complete! You can now login.');
            showLoginPage();
        } 
        else if (action === 'login') {
            const result = await apiCall('/auth/verify-login', 'POST', { 
                email: tempVerifyEmail, 
                code: code 
            });
            // Success - stop timer
            if (countdownTimer) {
                clearInterval(countdownTimer);
                countdownTimer = null;
            }
            setAuthToken(result.token);
            setCurrentUser(result.user);
            setIsLoggedIn(true);
            document.getElementById('loggedInView').style.display = 'flex';
            document.getElementById('loggedOutView').style.display = 'none';
            await loadHeaderPhoto();
            showDashboard();
        }
        else if (action === 'forgot') {
            const result = await apiCall('/auth/verify-forgot', 'POST', { 
                email: tempVerifyEmail, 
                code: code 
            });
            if (result.verified) {
                // Success - stop timer
                if (countdownTimer) {
                    clearInterval(countdownTimer);
                    countdownTimer = null;
                }
                showNewPasswordPage();
            }
        }
    } catch (error) {
        alert('Verification failed: ' + error.message);
        // Timer continues - DO NOTHING to timer
        // Clear input field for user to try again
        document.getElementById('verifyCode').value = '';
    }
}

async function resendCodeAction(action) {
    if (!tempVerifyEmail) return;
    
    // Reset timer expired flag
    isTimerExpired = false;
    
    // Reset button visibility: Verify visible, Resend hidden
    const verifyBtn = document.getElementById('verifyBtn');
    const resendBtn = document.getElementById('resendCodeBtn');
    
    if (verifyBtn) {
        verifyBtn.style.display = 'block';
        verifyBtn.style.flex = '1';
    }
    if (resendBtn) {
        resendBtn.style.display = 'none';
    }
    
    // Reset timer display color
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.style.color = '#0f172a';
    }
    
    startTimer();
    
    // Send new verification email
    sendVerificationEmail(action);
    
    alert('New verification code sent to your email');
    document.getElementById('verifyCode').value = '';
}

function logout() { 
    setIsLoggedIn(false);
    clearAuthToken();
    clearCurrentUser();
    document.getElementById('loggedInView').style.display = 'none';
    document.getElementById('loggedOutView').style.display = 'flex';
    resetToHome(); 
}

function showForgotPasswordPage() {
    document.getElementById('loggedOutContent').innerHTML = `
        <div class="forgot-password-container">
            <div class="forgot-two-column">
                <div class="forgot-info-list">
                    <div class="login-info-row"><div class="login-label">RESET PASSWORD</div><div class="login-value">Enter your email to reset password</div></div>
                </div>
                <div class="login-form-card">
                    <h2>Forgot Password</h2>
                    <div class="login-form-group"><label>Email Address</label><input type="email" id="forgotEmailPage" placeholder="Enter your registered email"></div>
                    <button class="login-submit-btn" onclick="sendForgotCode()">Continue →</button>
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
        const result = await apiCall('/auth/forgot-password', 'POST', { email });
        
        if (result.requires_verification) {
            tempVerifyEmail = email;
            tempVerifyAction = 'forgot';
            isTimerExpired = false;
            showVerifyCodePage('forgot', email);
            setTimeout(() => {
                sendVerificationEmail('forgot');
            }, 100);
        }
    } catch (error) {
        alert('Failed: ' + error.message);
    }
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
            new_password: np
        });
        alert('Password reset successfully! Please login with your new password.');
        showLoginPage();
    } catch (error) {
        alert('Failed to reset password: ' + error.message);
    }
}