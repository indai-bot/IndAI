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