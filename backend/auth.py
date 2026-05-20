import bcrypt
import random
import uuid
import time
from fastapi import APIRouter, HTTPException
from backend.database import get_db
from backend.email_utils import send_email
from backend.auth_middleware import create_token
from backend.models import (
    RegisterRequest, LoginRequest, ForgotPasswordRequest,
    ResetPasswordRequest, VerifyEmailRequest, ResendCodeRequest
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Store verification codes temporarily
verification_codes = {}

def generate_verification_code():
    return str(random.randint(100000, 999999))

def send_verification_code(email: str, code: str, action: str):
    action_text = {
        "register": "account registration",
        "login": "login",
        "forgot": "password reset"
    }.get(action, "verification")
    
    email_body = f"""
    <h2>Ind AI - Verification Code</h2>
    <p>Your verification code for {action_text} is:</p>
    <h1 style="font-size: 32px; letter-spacing: 5px;">{code}</h1>
    <p>This code will expire in 10 minutes.</p>
    """
    send_email(email, f"Ind AI - {action_text.capitalize()} Verification", email_body)

@router.post("/register")
async def register(req: RegisterRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE email = ?", (req.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    
    code = generate_verification_code()
    verification_codes[req.email] = {
        "code": code,
        "expires": time.time() + 600,
        "action": "register",
        "user_data": {
            "email": req.email,
            "password": req.password,
            "first_name": req.first_name,
            "last_name": req.last_name
        }
    }
    
    send_verification_code(req.email, code, "register")
    
    return {"success": True, "requires_verification": True, "message": "Verification code sent to your email"}

@router.post("/verify-registration")
async def verify_registration(req: VerifyEmailRequest):
    if req.email not in verification_codes:
        raise HTTPException(status_code=400, detail="No verification request found")
    
    stored = verification_codes[req.email]
    
    if stored["action"] != "register":
        raise HTTPException(status_code=400, detail="Invalid verification type")
    
    if time.time() > stored["expires"]:
        del verification_codes[req.email]
        raise HTTPException(status_code=400, detail="Verification code expired")
    
    if stored["code"] != req.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    user_data = stored["user_data"]
    conn = get_db()
    cursor = conn.cursor()
    
    hashed = bcrypt.hashpw(user_data["password"].encode(), bcrypt.gensalt()).decode()
    api_key = "ind_" + str(uuid.uuid4()).replace("-", "")[:12]
    
    cursor.execute('''
        INSERT INTO users (email, password_hash, first_name, last_name, api_key, email_verified, credits)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (user_data["email"], hashed, user_data["first_name"], user_data["last_name"], api_key, 1, 100))
    
    user_id = cursor.lastrowid
    
    cursor.execute("INSERT INTO clients (user_id, name) VALUES (?, ?)", (user_id, "My Clients"))
    cursor.execute("INSERT INTO folders (client_id, name) VALUES (?, ?)", (user_id, "Jobs"))
    
    cursor.execute('''
        INSERT INTO transactions (user_id, type, amount, description, service, balance)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (user_id, "purchase", 100, "Welcome bonus credits", "-", 100))
    
    conn.commit()
    conn.close()
    
    del verification_codes[req.email]
    
    return {"success": True, "message": "Registration complete! You can now login."}

@router.post("/login")
async def login(req: LoginRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, email, password_hash, first_name, last_name, current_plan, credits FROM users WHERE email = ?", (req.email,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.checkpw(req.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    code = generate_verification_code()
    verification_codes[req.email] = {
        "code": code,
        "expires": time.time() + 600,
        "action": "login",
        "user_id": user["id"],
        "email": user["email"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "current_plan": user["current_plan"],
        "credits": user["credits"]
    }
    
    send_verification_code(req.email, code, "login")
    
    return {"success": True, "requires_verification": True, "message": "Verification code sent to your email"}

@router.post("/verify-login")
async def verify_login(req: VerifyEmailRequest):
    if req.email not in verification_codes:
        raise HTTPException(status_code=400, detail="No verification request found")
    
    stored = verification_codes[req.email]
    
    if stored["action"] != "login":
        raise HTTPException(status_code=400, detail="Invalid verification type")
    
    if time.time() > stored["expires"]:
        del verification_codes[req.email]
        raise HTTPException(status_code=400, detail="Verification code expired")
    
    if stored["code"] != req.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    token = create_token(stored["user_id"], stored["email"])
    
    del verification_codes[req.email]
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": stored["user_id"],
            "email": stored["email"],
            "first_name": stored["first_name"],
            "last_name": stored["last_name"],
            "current_plan": stored["current_plan"],
            "credits": stored["credits"]
        }
    }

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE email = ?", (req.email,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
    
    code = generate_verification_code()
    verification_codes[req.email] = {
        "code": code,
        "expires": time.time() + 600,
        "action": "forgot",
        "user_id": user["id"]
    }
    
    send_verification_code(req.email, code, "forgot")
    
    return {"success": True, "requires_verification": True, "message": "Verification code sent to your email"}

@router.post("/verify-forgot")
async def verify_forgot(req: VerifyEmailRequest):
    if req.email not in verification_codes:
        raise HTTPException(status_code=400, detail="No verification request found")
    
    stored = verification_codes[req.email]
    
    if stored["action"] != "forgot":
        raise HTTPException(status_code=400, detail="Invalid verification type")
    
    if time.time() > stored["expires"]:
        del verification_codes[req.email]
        raise HTTPException(status_code=400, detail="Verification code expired")
    
    if stored["code"] != req.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    verification_codes[req.email]["action"] = "forgot_verified"
    
    return {"success": True, "verified": True, "message": "Code verified. You can now reset your password."}

@router.post("/reset-password")
async def reset_password(req: dict):
    email = req.get("email")
    new_password = req.get("new_password")
    
    if not email or not new_password:
        raise HTTPException(status_code=400, detail="Email and new password required")
    
    if email not in verification_codes:
        raise HTTPException(status_code=400, detail="Please verify your code first")
    
    stored = verification_codes[email]
    
    if stored["action"] != "forgot_verified":
        raise HTTPException(status_code=400, detail="Please verify your code first")
    
    if time.time() > stored["expires"]:
        del verification_codes[email]
        raise HTTPException(status_code=400, detail="Verification expired")
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user["id"]))
    conn.commit()
    conn.close()
    
    del verification_codes[email]
    
    return {"success": True, "message": "Password reset successfully"}

@router.post("/resend-code")
async def resend_code(req: ResendCodeRequest):
    if req.email not in verification_codes:
        raise HTTPException(status_code=400, detail="No verification request found")
    
    new_code = generate_verification_code()
    verification_codes[req.email]["code"] = new_code
    verification_codes[req.email]["expires"] = time.time() + 600
    
    action = verification_codes[req.email]["action"]
    if action == "register":
        action_text = "registration"
    elif action == "login":
        action_text = "login"
    else:
        action_text = "password reset"
    
    send_verification_code(req.email, new_code, action_text)
    
    return {"success": True, "message": "New verification code sent"}