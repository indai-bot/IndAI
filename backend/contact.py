from fastapi import APIRouter
from backend.database import get_db
from backend.email_utils import send_email
from backend.models import ContactMessageRequest
import os
from dotenv import load_dotenv

load_dotenv()
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")

router = APIRouter(prefix="/api/contact", tags=["contact"])

@router.post("/")
async def send_contact_message(req: ContactMessageRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO contact_messages (name, email, subject, message)
        VALUES (?, ?, ?, ?)
    ''', (req.name, req.email, req.subject, req.message))
    conn.commit()
    conn.close()
    
    print("=" * 50)
    print(f"NEW CONTACT MESSAGE")
    print(f"Name: {req.name}")
    print(f"Email: {req.email}")
    print(f"Subject: {req.subject}")
    print(f"Message: {req.message}")
    print("=" * 50)
    
    if ADMIN_EMAIL:
        email_body = f"<h2>New Contact Message</h2><p><strong>Name:</strong> {req.name}</p><p><strong>Email:</strong> {req.email}</p><p><strong>Message:</strong></p><p>{req.message}</p>"
        send_email(ADMIN_EMAIL, f"Contact Form: {req.subject}", email_body)
        
        auto_reply = f"<h2>Thank you for contacting Ind AI</h2><p>Dear {req.name},</p><p>We will get back to you within 24 hours.</p>"
        send_email(req.email, "We received your message", auto_reply)
    
    return {"success": True, "message": "Message sent"}