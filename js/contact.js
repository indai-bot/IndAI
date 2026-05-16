// ============ CONTACT FUNCTIONS ==========

function showContact() {
    const contactHTML = `<div class="contact-page-simple"><div class="contact-two-column"><div class="contact-info-list"><div class="contact-info-row"><div class="contact-label">EMAIL</div><div class="contact-value">hello@indai.com</div></div><div class="contact-info-row"><div class="contact-label">PHONE</div><div class="contact-value">+91 12345 67890</div></div><div class="contact-info-row"><div class="contact-label">LOCATION</div><div class="contact-value">India</div></div><div class="contact-info-row"><div class="contact-label">WORKING HOURS</div><div class="contact-value">Mon - Fri: 9:00 AM - 6:00 PM</div></div></div><div class="contact-form-card-simple"><div class="form-group-simple"><label>Full Name</label><input type="text" id="contact-name" placeholder="Enter your name"></div><div class="form-group-simple"><label>Email Address</label><input type="email" id="contact-email" placeholder="Enter your email"></div><div class="form-group-simple"><label>Subject</label><input type="text" id="contact-subject" placeholder="Enter subject"></div><div class="form-group-simple"><label>Message</label><textarea rows="5" id="contact-message" placeholder="Write your message..."></textarea></div><button class="contact-submit-simple" onclick="sendContactMessage()">Send Message →</button></div></div></div>`;
    const out = document.getElementById('loggedOutView'), inV = document.getElementById('loggedInView');
    if (out && out.style.display !== 'none') {
        document.getElementById('loggedOutContent').innerHTML = contactHTML;
        document.getElementById('loggedOutHeadingText').innerText = 'Contact Us';
        const headingContainer = document.getElementById('loggedOutFixedHeading');
        if (headingContainer && !headingContainer.querySelector('hr')) {
            const hr = document.createElement('hr');
            headingContainer.appendChild(hr);
        }
        document.querySelectorAll('#loggedOutView .nav-links a').forEach(l => l.classList.remove('active'));
        document.getElementById('contactNavLink').classList.add('active');
    } else if (inV && inV.style.display !== 'none') {
        document.getElementById('page-heading-text').innerHTML = 'Contact Us';
        const headingContainer = document.getElementById('page-fixed-heading');
        if (headingContainer && !headingContainer.querySelector('hr')) {
            const hr = document.createElement('hr');
            headingContainer.appendChild(hr);
        }
        document.getElementById('appContent').style.display = 'block';
        document.getElementById('changePasswordPage').style.display = 'none';
        document.getElementById('appContent').innerHTML = contactHTML;
        updateActiveNavLink('contact');
    }
}

async function sendContactMessage() {
    const name = document.getElementById('contact-name')?.value;
    const email = document.getElementById('contact-email')?.value;
    const subject = document.getElementById('contact-subject')?.value;
    const message = document.getElementById('contact-message')?.value;
    
    if (!name || !email || !subject || !message) alert('Please fill all fields');
    else if (!email.includes('@')) alert('Valid email required');
    else {
        try {
            await apiCall('/contact', 'POST', { name, email, subject, message });
            alert(`Thank you ${name}! We'll get back to you.`);
            document.getElementById('contact-name').value = '';
            document.getElementById('contact-email').value = '';
            document.getElementById('contact-subject').value = '';
            document.getElementById('contact-message').value = '';
        } catch (error) {
            alert('Failed to send message: ' + error.message);
        }
    }
}