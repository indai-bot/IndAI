// ============ SERVICES FUNCTIONS ==========
let currentService = null;
let currentServiceCredits = 0;
let currentServiceNeedsTwoFiles = false;

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
        const services = await apiCall('/services/list', 'GET');
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
    currentServiceNeedsTwoFiles = needsTwoFiles;
    const modal = document.getElementById('serviceModal');
    const title = document.getElementById('serviceModalTitle');
    const form = document.getElementById('serviceModalForm');
    if (!modal || !title || !form) return;
    title.innerText = `${name} (${credits} credits)`;
    
    let formHtml = `
        <div class="form-group-simple"><label>Select ${needsTwoFiles ? '2' : '1'} File(s)</label>
        <input type="file" id="serviceFiles" accept=".pdf,.jpg,.jpeg,.png" ${needsTwoFiles ? 'multiple' : ''} style="width:100%; padding:0.5rem; border:1px solid #e2e8f0; border-radius:8px; background:#f8fafc;"></div>
        <div class="form-group-simple"><label>Output Name</label><input type="text" id="outputName" value="${name.toLowerCase().replace(/ /g, '_')}_output.pdf" style="width:100%; padding:0.5rem;"></div>
    `;
    
    if (name === 'Split PDF') {
        formHtml += `
            <div class="form-group-simple"><label>Split Mode</label>
                <select id="splitMode" onchange="toggleSplitRange()" style="width:100%; padding:0.5rem;">
                    <option value="Every Page">Every Page</option>
                    <option value="Specific Page Range">Specific Page Range</option>
                </select>
            </div>
            <div class="form-group-simple" id="pageRangeDiv" style="display:none;">
                <label>Page Range (e.g., 1-5,8,10)</label>
                <input type="text" id="pageRange" placeholder="1-5,8,10" style="width:100%; padding:0.5rem;">
            </div>
        `;
    }
    if (name === 'Watermark') {
        formHtml += `<div class="form-group-simple"><label>Watermark Text</label><input type="text" id="watermarkText" value="CONFIDENTIAL" style="width:100%; padding:0.5rem;"></div>`;
    }
    if (name === 'Protect PDF' || name === 'Unlock PDF') {
        formHtml += `<div class="form-group-simple"><label>Password</label><input type="password" id="password" placeholder="Enter password" style="width:100%; padding:0.5rem;"></div>`;
    }
    if (name === 'Rotate PDF') {
        formHtml += `
            <div class="form-group-simple"><label>Rotation Angle</label>
                <select id="rotation" style="width:100%; padding:0.5rem;">
                    <option value="90">90° Clockwise</option>
                    <option value="180">180°</option>
                    <option value="270">270° Clockwise</option>
                </select>
            </div>
        `;
    }
    if (name === 'Crop PDF') {
        formHtml += `
            <div class="form-group-simple"><label>Crop Top (points)</label><input type="number" id="cropTop" value="0" style="width:100%; padding:0.5rem;"></div>
            <div class="form-group-simple"><label>Crop Bottom (points)</label><input type="number" id="cropBottom" value="0" style="width:100%; padding:0.5rem;"></div>
            <div class="form-group-simple"><label>Crop Left (points)</label><input type="number" id="cropLeft" value="0" style="width:100%; padding:0.5rem;"></div>
            <div class="form-group-simple"><label>Crop Right (points)</label><input type="number" id="cropRight" value="0" style="width:100%; padding:0.5rem;"></div>
        `;
    }
    
    form.innerHTML = formHtml;
    modal.style.display = 'flex';
}

function toggleSplitRange() {
    const splitMode = document.getElementById('splitMode')?.value;
    const pageRangeDiv = document.getElementById('pageRangeDiv');
    if (pageRangeDiv) {
        pageRangeDiv.style.display = splitMode === 'Specific Page Range' ? 'block' : 'none';
    }
}

async function processDynamicService() {
    const files = document.getElementById('serviceFiles')?.files;
    if (!files || files.length === 0) { 
        alert('Please select file(s)'); 
        return; 
    }
    
    if (currentServiceNeedsTwoFiles && files.length < 2) {
        alert('Please select at least 2 files for this service');
        return;
    }
    
    closeModal('serviceModal');
    
    // Determine endpoint based on service name
    let endpoint = '';
    let formData = new FormData();
    
    switch(currentService) {
        case 'Merge PDF':
            endpoint = '/services/merge-pdf/process';
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }
            break;
        case 'Split PDF':
            endpoint = '/services/split-pdf/process';
            formData.append('file', files[0]);
            formData.append('split_mode', document.getElementById('splitMode')?.value || 'Every Page');
            if (document.getElementById('splitMode')?.value === 'Specific Page Range') {
                formData.append('page_range', document.getElementById('pageRange')?.value || '');
            }
            break;
        case 'Compress PDF':
            endpoint = '/services/compress-pdf/process';
            formData.append('file', files[0]);
            break;
        case 'JPG to PDF':
            endpoint = '/services/jpg-to-pdf/process';
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }
            break;
        case 'Watermark':
            endpoint = '/services/watermark/process';
            formData.append('file', files[0]);
            formData.append('watermark_text', document.getElementById('watermarkText')?.value || 'CONFIDENTIAL');
            break;
        case 'Protect PDF':
            endpoint = '/services/protect-pdf/process';
            formData.append('file', files[0]);
            formData.append('password', document.getElementById('password')?.value || '');
            break;
        case 'Unlock PDF':
            endpoint = '/services/unlock-pdf/process';
            formData.append('file', files[0]);
            formData.append('password', document.getElementById('password')?.value || '');
            break;
        case 'Rotate PDF':
            endpoint = '/services/rotate-pdf/process';
            formData.append('file', files[0]);
            formData.append('rotation', document.getElementById('rotation')?.value || '90');
            break;
        case 'Add Page Numbers':
            endpoint = '/services/add-page-numbers/process';
            formData.append('file', files[0]);
            break;
        default:
            alert(`${currentService} service is coming soon!`);
            return;
    }
    
    // Show loading
    const processBtn = document.querySelector('#serviceModal .btn-primary');
    const originalText = processBtn?.innerText;
    if (processBtn) processBtn.innerText = 'Processing...';
    
    try {
        const response = await fetch(`/api${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Processing failed');
        }
        
        // Download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const outputName = document.getElementById('outputName')?.value || 'output.pdf';
        a.download = outputName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert(`✅ ${currentService} completed successfully! -${currentServiceCredits} credits`);
        
        // Refresh dashboard to update credits
        const heading = document.getElementById('page-heading-text')?.innerHTML;
        if (heading === 'User Dashboard') {
            await showDashboard();
        }
    } catch (error) {
        alert('Failed to process service: ' + error.message);
    } finally {
        if (processBtn) processBtn.innerText = originalText || 'Process →';
    }
}