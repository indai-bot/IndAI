import bcrypt
import random
import uuid
from fastapi import APIRouter, HTTPException
from backend.database import get_db
from backend.email_utils import send_email
from backend.auth_middleware import create_token
from backend.models import (
    RegisterRequest, LoginRequest, ForgotPasswordRequest,
    ResetPasswordRequest, VerifyEmailRequest, ResendCodeRequest
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register")
async def register(req: RegisterRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE email = ?", (req.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    
    cursor.execute("SELECT id FROM pending_verifications WHERE email = ?", (req.email,))
    existing = cursor.fetchone()
    
    hashed = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    verification_code = str(random.randint(100000, 999999))
    
    if existing:
        cursor.execute('''
            UPDATE pending_verifications 
            SET password_hash = ?, first_name = ?, last_name = ?, verification_code = ?, 
                created_at = CURRENT_TIMESTAMP, expires_at = datetime('now', '+1 hour')
            WHERE email = ?
        ''', (hashed, req.first_name, req.last_name, verification_code, req.email))
    else:
        cursor.execute('''
            INSERT INTO pending_verifications (email, password_hash, first_name, last_name, verification_code)
            VALUES (?, ?, ?, ?, ?)
        ''', (req.email, hashed, req.first_name, req.last_name, verification_code))
    
    conn.commit()
    conn.close()
    
    email_body = f"<h2>Welcome to Ind AI!</h2><p>Your verification code: <strong>{verification_code}</strong></p>"
    send_email(req.email, "Verify Your Ind AI Account", email_body)
    
    return {"success": True, "message": "Verification code sent"}

@router.post("/verify-email")
async def verify_email(req: VerifyEmailRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM pending_verifications 
        WHERE email = ? AND verification_code = ? AND expires_at > CURRENT_TIMESTAMP
    ''', (req.email, req.code))
    
    pending = cursor.fetchone()
    
    if not pending:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    
    api_key = "ind_" + str(uuid.uuid4()).replace("-", "")[:12]
    
    cursor.execute('''
        INSERT INTO users (email, password_hash, first_name, last_name, api_key, email_verified, credits)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (pending["email"], pending["password_hash"], pending["first_name"], pending["last_name"], api_key, 1, 100))
    
    user_id = cursor.lastrowid
    
    cursor.execute("INSERT INTO clients (user_id, name) VALUES (?, ?)", (user_id, "My Clients"))
    client_id = cursor.lastrowid
    cursor.execute("INSERT INTO folders (client_id, name) VALUES (?, ?)", (client_id, "Jobs"))
    
    cursor.execute('''
        INSERT INTO transactions (user_id, type, amount, description, service, balance)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (user_id, "purchase", 100, "Welcome bonus credits", "-", 100))
    
    cursor.execute("DELETE FROM pending_verifications WHERE email = ?", (req.email,))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Email verified successfully"}

@router.post("/resend-code")
async def resend_code(req: ResendCodeRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT id, first_name FROM pending_verifications WHERE email = ?', (req.email,))
    pending = cursor.fetchone()
    
    if not pending:
        conn.close()
        raise HTTPException(status_code=404, detail="No pending verification found")
    
    new_code = str(random.randint(100000, 999999))
    cursor.execute('''
        UPDATE pending_verifications 
        SET verification_code = ?, created_at = CURRENT_TIMESTAMP, expires_at = datetime('now', '+1 hour')
        WHERE email = ?
    ''', (new_code, req.email))
    
    conn.commit()
    conn.close()
    
    send_email(req.email, "Resend: Verify Your Ind AI Account", f"<h2>Your new code: {new_code}</h2>")
    
    return {"success": True, "message": "New verification code sent"}

@router.post("/login")
async def login(req: LoginRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, email, password_hash, first_name, last_name, current_plan, credits, email_verified FROM users WHERE email = ?", (req.email,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user["email_verified"]:
        raise HTTPException(status_code=401, detail="Please verify your email first")
    
    if not bcrypt.checkpw(req.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"])
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "current_plan": user["current_plan"],
            "credits": user["credits"]
        }
    }

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, first_name FROM users WHERE email = ?", (req.email,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="Email not found")
    
    reset_code = str(random.randint(100000, 999999))
    cursor.execute("UPDATE users SET reset_code = ? WHERE id = ?", (reset_code, user["id"]))
    conn.commit()
    conn.close()
    
    send_email(req.email, "Reset Your Password", f"<h2>Your reset code: {reset_code}</h2>")
    
    return {"success": True, "message": "Reset code sent"}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, reset_code FROM users WHERE email = ?", (req.email,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    if user["reset_code"] != req.code:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid reset code")
    
    new_hash = bcrypt.hashpw(req.new_password.encode(), bcrypt.gensalt()).decode()
    cursor.execute("UPDATE users SET password_hash = ?, reset_code = NULL WHERE id = ?", (new_hash, user["id"]))
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Password reset successfully"}