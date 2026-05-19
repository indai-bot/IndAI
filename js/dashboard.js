// ============ DASHBOARD FUNCTIONS ==========
async function showDashboard() {
    const today = new Date().toISOString().slice(0,10);
    
    // Hide header only on dashboard page
    const pageHeading = document.getElementById('page-heading-text');
    if (pageHeading) {
        pageHeading.style.display = 'none';
    }
    const headingContainer = document.getElementById('page-fixed-heading');
    if (headingContainer) {
        headingContainer.style.display = 'none';
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
                            <p><strong>Credits Available:</strong> ${stats.credits} Credits</p>
                            <p style="color:#f59e0b;"><strong>Reset in:</strong> 12 hours</p>
                        </div>
                    </div>
                    <div class="dashboard-card">
                        <h3>⚡ Active Jobs Overview</h3>
                        <div class="active-jobs-info">
                            <div class="active-jobs-count">${stats.active_jobs}</div>
                            <div>Active Jobs Running</div>
                            <div style="margin-top:0.2rem; font-size:0.6rem; color:#64748b;">Total Jobs: ${stats.total_jobs}</div>
                        </div>
                    </div>
                    <div class="dashboard-card">
                        <h3>🎁 Referral Dashboard</h3>
                        <div class="referral-rows">
                            <div class="referral-row">
                                <span class="referral-row-label">REFERRAL ID</span>
                                <span class="referral-row-value">USER123456</span>
                            </div>
                            <div class="referral-row">
                                <span class="referral-row-label">CREDIT PER REFERRAL</span>
                                <span class="referral-row-value">500 Credits</span>
                            </div>
                            <div class="referral-row">
                                <span class="referral-row-label">TOTAL EARNED</span>
                                <span class="referral-row-value">12,500 Credits</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="dashboard-bottom-row">
                    <div class="dashboard-card">
                        <div class="job-date-filter">
                            <h3>📋 Upcoming Scheduled Jobs</h3>
                            <input type="date" id="upcomingJobsDate" value="${today}" onchange="filterUpcomingJobs()">
                        </div>
                        <div class="upcoming-jobs-table-container">
                            <table class="upcoming-jobs-table" id="upcomingJobsTable">
                                <thead>
                                    <tr>
                                        <th>Client Name</th>
                                        <th>Job Name</th>
                                        <th>Frequency</th>
                                        <th>Schedule Date</th>
                                        <th>Schedule Time</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="upcomingJobsBody"></tbody>
                            </table>
                        </div>
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

function showChangePasswordPage() {
    // Show header for change password page
    const pageHeading = document.getElementById('page-heading-text');
    if (pageHeading) {
        pageHeading.style.display = 'block';
    }
    const headingContainer = document.getElementById('page-fixed-heading');
    if (headingContainer) {
        headingContainer.style.display = 'block';
    }
    
    document.getElementById('page-heading-text').innerHTML = 'Change Password';
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

// ============ PROFILE FUNCTIONS WITH PHOTO UPLOAD ==========
function showProfile() {
    // Show header for profile page
    const pageHeading = document.getElementById('page-heading-text');
    if (pageHeading) {
        pageHeading.style.display = 'block';
    }
    const headingContainer = document.getElementById('page-fixed-heading');
    if (headingContainer) {
        headingContainer.style.display = 'block';
    }
    
    document.getElementById('page-heading-text').innerHTML = 'User Profile';
    if (headingContainer && !headingContainer.querySelector('hr')) {
        const hr = document.createElement('hr');
        headingContainer.appendChild(hr);
    }
    document.getElementById('appContent').style.display = 'block';
    document.getElementById('changePasswordPage').style.display = 'none';
    
    apiCall('/users/profile', 'GET').then(profile => {
        let avatarHtml = '';
        if (profile.photo_url) {
            avatarHtml = `<img src="${profile.photo_url}?t=${Date.now()}" style="width:100px; height:100px; border-radius:50%; object-fit:cover;">`;
        } else {
            avatarHtml = '👤';
        }
        
        document.getElementById('appContent').innerHTML = `
            <div class="profile-wrapper">
                <div class="profile-2col">
                    <div class="profile-left">
                        <div class="profile-avatar" id="profileAvatar">${avatarHtml}</div>
                        <h3>${profile.first_name} ${profile.last_name}</h3>
                        <p>${profile.email}</p>
                        <input type="file" id="photo-upload" accept="image/*" style="display:none;" onchange="uploadPhoto()">
                        <button class="upload-photo-btn" onclick="document.getElementById('photo-upload').click()">📸 Upload Photo</button>
                        ${profile.photo_url ? '<button class="upload-photo-btn" onclick="deletePhoto()" style="margin-top:0.5rem; background:#ef4444;">🗑 Delete Photo</button>' : ''}
                    </div>
                    <div class="profile-right">
                        <div class="form-row">
                            <div class="form-field"><label>First Name</label><input type="text" id="profile-firstname" value="${profile.first_name}"></div>
                            <div class="form-field"><label>Last Name</label><input type="text" id="profile-lastname" value="${profile.last_name}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-field"><label>Gender</label>
                                <select id="profile-gender">
                                    <option value="Male" ${profile.gender === 'Male' ? 'selected' : ''}>Male</option>
                                    <option value="Female" ${profile.gender === 'Female' ? 'selected' : ''}>Female</option>
                                    <option value="Other" ${profile.gender === 'Other' ? 'selected' : ''}>Other</option>
                                </select>
                            </div>
                            <div class="form-field"><label>Birthdate</label><input type="date" id="profile-birthdate" value="${profile.birthdate || ''}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-field"><label>Country Code</label><input type="text" id="profile-country" value="${profile.country_code || '+91'}"></div>
                            <div class="form-field"><label>Mobile Number</label><input type="text" id="profile-mobile" value="${profile.mobile || ''}"></div>
                        </div>
                        <div class="form-field"><label>Email Address</label><input type="email" id="profile-email" value="${profile.email}"></div>
                        <div class="profile-buttons">
                            <button class="btn-save-profile" onclick="saveProfile()">💾 Save Changes</button>
                            <button class="btn-delete-account" onclick="deleteAccount()">🗑 Delete Account</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).catch(error => {
        document.getElementById('appContent').innerHTML = `<div class="dashboard-card"><p>Error loading profile: ${error.message}</p></div>`;
    });
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
        showProfile();
        const profile = await apiCall('/users/profile', 'GET');
        if (profile && profile.photo_url) {
            updateHeaderPhoto(profile.photo_url);
        }
    } catch (error) {
        alert('Failed to save profile: ' + error.message);
    }
}

async function uploadPhoto() {
    const fileInput = document.getElementById('photo-upload');
    const file = fileInput.files[0];
    
    if (!file) { return; }
    
    if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB');
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        alert('Only image files are allowed');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadBtn = document.querySelector('.upload-photo-btn');
    const originalText = uploadBtn?.innerText;
    if (uploadBtn) uploadBtn.innerText = '📸 Uploading...';
    
    try {
        const response = await fetch('/api/users/upload-photo', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` },
            body: formData
        });
        
        const result = await response.json();
        if (result.success) {
            showProfile();
            updateHeaderPhoto(result.photo_url);
        } else {
            alert('Upload failed: ' + (result.detail || 'Unknown error'));
        }
    } catch (error) {
        alert('Upload failed: ' + error.message);
    } finally {
        if (uploadBtn) uploadBtn.innerText = originalText || '📸 Upload Photo';
        fileInput.value = '';
    }
}

async function deletePhoto() {
    if (!confirm('Are you sure you want to delete your profile photo?')) return;
    
    try {
        const result = await apiCall('/users/delete-photo', 'DELETE');
        if (result.success) {
            showProfile();
            updateHeaderPhoto(null);
        }
    } catch (error) {
        alert('Failed to delete photo: ' + error.message);
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