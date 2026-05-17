// ============ JOBS FUNCTIONS ==========
let clientsData = [];
let selectedClientId = null;
let selectedJobId = null;
let selectedJob = null;
let selectedClient = null;
let currentJobLogs = [];
let isRightPanelVisible = true;
let isEditMode = false;
let editingJobId = null;

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