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
        const notifications = await apiCall('/notifications/', 'GET');
        const pending = notifications.filter(n => n.status === 'pending');
        const accepted = notifications.filter(n => n.status === 'accepted');
        const rejected = notifications.filter(n => n.status === 'rejected');
        
        let html = `<div class="dashboard-container"><div class="dashboard-card"><h3>🔔 Notifications (${pending.length} pending)</h3><div style="margin-top:1rem;">`;
        
        if (pending.length === 0) {
            html += `<div style="text-align:center; padding:2rem; color:#94a3b8;">No pending notifications</div>`;
        } else {
            pending.forEach(notif => {
                html += `<div style="background:#f8fafc; border-radius:12px; padding:1rem; margin-bottom:0.8rem; border-left:3px solid #0f172a;">
                            <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:0.5rem;">
                                <div>
                                    <div style="font-weight:600;">📄 ${notif.job_name}</div>
                                    <div style="font-size:0.7rem;">Client: ${notif.client_name} | From: ${notif.from_user}</div>
                                    <div style="font-size:0.65rem;">Sent: ${notif.sent_at}</div>
                                </div>
                                <div>
                                    <button onclick="acceptNotification(${notif.id})" style="background:#10b981; color:white; border:none; padding:0.3rem 0.8rem; border-radius:20px; cursor:pointer;">✓ Accept</button>
                                    <button onclick="rejectNotification(${notif.id})" style="background:#ef4444; color:white; border:none; padding:0.3rem 0.8rem; border-radius:20px; margin-left:0.5rem; cursor:pointer;">✗ Reject</button>
                                </div>
                            </div>
                        </div>`;
            });
        }
        
        html += `</div></div>`;
        
        if (accepted.length > 0) {
            html += `<div class="dashboard-card" style="margin-top:1rem;"><h3>✅ Accepted Jobs (${accepted.length})</h3><div style="margin-top:1rem;">`;
            accepted.forEach(notif => {
                html += `<div style="background:#f0fdf4; border-radius:12px; padding:0.8rem; margin-bottom:0.5rem; border-left:3px solid #10b981;">
                            <div style="font-weight:500;">📄 ${notif.job_name}</div>
                            <div style="font-size:0.65rem;">From: ${notif.from_user} | Accepted: ${notif.accepted_at || notif.sent_at}</div>
                        </div>`;
            });
            html += `</div></div>`;
        }
        
        if (rejected.length > 0) {
            html += `<div class="dashboard-card" style="margin-top:1rem;"><h3>❌ Rejected Jobs (${rejected.length})</h3><div style="margin-top:1rem;">`;
            rejected.forEach(notif => {
                html += `<div style="background:#fef2f2; border-radius:12px; padding:0.8rem; margin-bottom:0.5rem; border-left:3px solid #ef4444;">
                            <div style="font-weight:500;">📄 ${notif.job_name}</div>
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
        const result = await apiCall(`/notifications/${id}/accept`, 'POST');
        alert(result.message || 'Job accepted and added to your account!');
        showNotifications();
        if (typeof renderClientsTreeComplete === 'function') {
            await renderClientsTreeComplete();
        }
    } catch (error) {
        alert('Failed to accept: ' + error.message);
    }
}

async function rejectNotification(id) {
    try {
        const result = await apiCall(`/notifications/${id}/reject`, 'POST');
        alert(result.message || 'Notification rejected');
        showNotifications();
    } catch (error) {
        alert('Failed to reject: ' + error.message);
    }
}