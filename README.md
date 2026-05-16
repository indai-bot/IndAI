# Ind AI Platform

AI-powered automation platform with job scheduling, PDF tools, and credit-based billing.

## Features

- User Authentication (Register/Login with Email Verification)
- Job Management (Create, Edit, Delete, Run Jobs)
- Client & Folder Organization
- PDF Tools (Merge, Split, Compress, Convert, etc.)
- Credit-based Billing System
- Pricing Plans (Free, Daily, Monthly, Yearly)
- Notifications System
- Time Saved Reports
- API Key Generation
- Contact Form with Email

## Tech Stack

- Backend: FastAPI (Python)
- Database: SQLite
- Frontend: HTML, CSS, JavaScript
- Email: SMTP (Gmail)

## Local Development

1. Clone the repository
2. Create virtual environment: `python -m venv venv`
3. Activate: `source venv/bin/activate` (Linux/Mac) or `venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Copy `.env.example` to `.env` and fill in your values
6. Run: `python main.py`
7. Open: `http://localhost:3000`

## Deployment on Render

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect repository
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `python main.py`
6. Add environment variables
7. Deploy

## Environment Variables

| Variable | Description |
|----------|-------------|
| SMTP_HOST | SMTP server host (smtp.gmail.com) |
| SMTP_PORT | SMTP server port (587) |
| SMTP_USER | Email address for sending emails |
| SMTP_PASSWORD | App password for email |
| SMTP_FROM | From email address |
| ADMIN_EMAIL | Admin email to receive contact messages |
| JWT_SECRET | Secret key for JWT tokens |

## License

MIT