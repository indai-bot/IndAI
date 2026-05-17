// ============ TIME SAVED REPORT FUNCTIONS ==========
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