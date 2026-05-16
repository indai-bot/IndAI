import sqlite3
import os
import bcrypt
import jwt
import uuid
import json
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ PATH SETUP FOR RENDER & LOCAL ============
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "indai.db")

# Static files paths (same directory structure)
INDEX_PATH = os.path.join(BASE_DIR, "index.html")
CSS_DIR = os.path.join(BASE_DIR, "css")
JS_DIR = os.path.join(BASE_DIR, "js")

# ============ EMAIL CONFIGURATION ============
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", SMTP_USER)

def send_email(to_email: str, subject: str, body: str):
    """Send email using SMTP"""
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f"Email not sent (no config): To={to_email}, Subject={subject}")
        print(f"Body: {body}")
        return False
    
    try:
        msg = MIMEMultipart()
        msg["From"] = SMTP_FROM
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html"))
        
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

# ============ DATABASE SETUP ============
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            gender TEXT DEFAULT 'Male',
            birthdate TEXT,
            country_code TEXT DEFAULT '+91',
            mobile TEXT,
            current_plan TEXT DEFAULT 'free',
            credits INTEGER DEFAULT 100,
            api_key TEXT UNIQUE,
            email_verified INTEGER DEFAULT 0,
            verification_code TEXT,
            reset_code TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Clients table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')
    
    # Folders table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            parent_folder_id INTEGER,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
            FOREIGN KEY (parent_folder_id) REFERENCES folders (id) ON DELETE CASCADE
        )
    ''')
    
    # Jobs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            folder_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            subject TEXT,
            description TEXT,
            frequency TEXT DEFAULT 'Daily',
            job_date TEXT,
            job_time TEXT DEFAULT '12:00',
            timezone TEXT DEFAULT 'Asia/Kolkata',
            estimated_hours REAL DEFAULT 1,
            credits INTEGER,
            verified INTEGER DEFAULT 0,
            running INTEGER DEFAULT 0,
            next_run TEXT,
            supporting_files TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE
        )
    ''')
    
    # Transactions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT DEFAULT CURRENT_TIMESTAMP,
            type TEXT NOT NULL,
            amount INTEGER NOT NULL,
            description TEXT,
            service TEXT,
            balance INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')
    
    # Notifications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            job_id INTEGER,
            job_name TEXT NOT NULL,
            client_name TEXT NOT NULL,
            from_user TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
            accepted_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')
    
    # Time saved records table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS time_saved (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT DEFAULT CURRENT_TIMESTAMP,
            job_name TEXT NOT NULL,
            estimated_hours REAL NOT NULL,
            actual_run_time TEXT,
            time_saved REAL NOT NULL,
            status TEXT DEFAULT 'success',
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')
    
    # Service usage table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS service_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            service_name TEXT NOT NULL,
            credits_used INTEGER NOT NULL,
            date TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')
    
    # Activity logs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER NOT NULL,
            time TEXT DEFAULT CURRENT_TIMESTAMP,
            message TEXT NOT NULL,
            duration TEXT,
            status TEXT DEFAULT 'info',
            FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
        )
    ''')
    
    # Contact messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contact_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

# JWT Settings
SECRET_KEY = os.getenv("JWT_SECRET", "indai_secret_key_2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

def create_token(user_id: int, email: str):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "email": email, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except:
        return None

def get_current_user(request: Request):
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = token.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"id": int(payload["sub"]), "email": payload["email"]}

# Pydantic models
class RegisterRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    first_name: str
    last_name: str
    gender: str
    birthdate: str
    country_code: str
    mobile: str
    email: str

class AddClientRequest(BaseModel):
    name: str

class AddFolderRequest(BaseModel):
    client_id: int
    parent_folder_id: Optional[int] = None
    name: str

class AddJobRequest(BaseModel):
    folder_id: int
    name: str
    subject: str
    description: str
    frequency: str
    job_date: str
    job_time: str
    timezone: str
    estimated_hours: float

class UpdateJobRequest(BaseModel):
    name: str
    subject: str
    description: str
    frequency: str
    job_date: str
    job_time: str
    timezone: str
    estimated_hours: float

class SendJobRequest(BaseModel):
    email: str

class SelectPlanRequest(BaseModel):
    plan: str

class AddCreditsRequest(BaseModel):
    credits: int

class ContactMessageRequest(BaseModel):
    name: str
    email: str
    subject: str
    message: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str

class VerifyEmailRequest(BaseModel):
    email: str
    code: str

class ResendCodeRequest(BaseModel):
    email: str

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

# ============ AUTH ROUTES ============
@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE email = ?", (req.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    api_key = "ind_" + str(uuid.uuid4()).replace("-", "")[:12]
    verification_code = str(random.randint(100000, 999999))
    
    cursor.execute('''
        INSERT INTO users (email, password_hash, first_name, last_name, api_key, verification_code)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (req.email, hashed, req.first_name, req.last_name, api_key, verification_code))
    
    user_id = cursor.lastrowid
    
    cursor.execute("INSERT INTO clients (user_id, name) VALUES (?, ?)", (user_id, "My Clients"))
    client_id = cursor.lastrowid
    cursor.execute("INSERT INTO folders (client_id, name) VALUES (?, ?)", (client_id, "Jobs"))
    
    cursor.execute('''
        INSERT INTO transactions (user_id, type, amount, description, service, balance)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (user_id, "purchase", 100, "Welcome bonus credits", "-", 100))
    
    conn.commit()
    conn.close()
    
    email_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif;">
        <h2>Welcome to Ind AI!</h2>
        <p>Hello {req.first_name},</p>
        <p>Your verification code is: <strong>{verification_code}</strong></p>
        <p>Thanks,<br>Ind AI Team</p>
    </body>
    </html>
    """
    send_email(req.email, "Verify Your Ind AI Account", email_body)
    
    return {"success": True, "message": "Registration successful. Please check your email for verification code."}

@app.post("/api/auth/verify-email")
async def verify_email(req: VerifyEmailRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, verification_code FROM users WHERE email = ?", (req.email,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    if user["verification_code"] != req.code:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    cursor.execute("UPDATE users SET email_verified = 1, verification_code = NULL WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Email verified successfully"}

@app.post("/api/auth/resend-code")
async def resend_code(req: ResendCodeRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, first_name FROM users WHERE email = ?", (req.email,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    new_code = str(random.randint(100000, 999999))
    cursor.execute("UPDATE users SET verification_code = ? WHERE id = ?", (new_code, user["id"]))
    conn.commit()
    conn.close()
    
    email_body = f"<h2>Your new verification code is: {new_code}</h2>"
    send_email(req.email, "Resend: Verify Your Ind AI Account", email_body)
    
    return {"success": True, "message": "New verification code sent"}

@app.post("/api/auth/login")
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

@app.post("/api/auth/forgot-password")
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
    
    email_body = f"<h2>Your password reset code is: {reset_code}</h2>"
    send_email(req.email, "Reset Your Ind AI Password", email_body)
    
    return {"success": True, "message": "Reset code sent to your email"}

@app.post("/api/auth/reset-password")
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

# ============ USER ROUTES ==========
@app.get("/api/users/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, first_name, last_name, gender, birthdate, country_code, mobile FROM users WHERE id = ?", (current_user["id"],))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user["id"],
        "email": user["email"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "gender": user["gender"],
        "birthdate": user["birthdate"],
        "country_code": user["country_code"],
        "mobile": user["mobile"]
    }

@app.put("/api/users/profile")
async def update_profile(req: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE email = ? AND id != ?", (req.email, current_user["id"]))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email already used by another account")
    
    cursor.execute('''
        UPDATE users 
        SET first_name = ?, last_name = ?, gender = ?, birthdate = ?, country_code = ?, mobile = ?, email = ?
        WHERE id = ?
    ''', (req.first_name, req.last_name, req.gender, req.birthdate, req.country_code, req.mobile, req.email, current_user["id"]))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Profile updated"}

@app.put("/api/users/password")
async def change_password(req: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT password_hash FROM users WHERE id = ?", (current_user["id"],))
    user = cursor.fetchone()
    
    if not bcrypt.checkpw(req.old_password.encode(), user["password_hash"].encode()):
        conn.close()
        raise HTTPException(status_code=401, detail="Old password is incorrect")
    
    new_hash = bcrypt.hashpw(req.new_password.encode(), bcrypt.gensalt()).decode()
    cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, current_user["id"]))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Password changed"}

@app.delete("/api/users/account")
async def delete_account(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = ?", (current_user["id"],))
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Account deleted"}

# ============ CLIENT ROUTES ==========
@app.get("/api/clients")
async def get_clients(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM clients WHERE user_id = ? ORDER BY name", (current_user["id"],))
    clients = cursor.fetchall()
    conn.close()
    
    result = []
    for client in clients:
        result.append({"id": client["id"], "name": client["name"]})
    
    return result

@app.post("/api/clients")
async def add_client(req: AddClientRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO clients (user_id, name) VALUES (?, ?)", (current_user["id"], req.name))
    client_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"success": True, "client_id": client_id, "name": req.name}

@app.delete("/api/clients/{client_id}")
async def delete_client(client_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM clients WHERE id = ? AND user_id = ?", (client_id, current_user["id"]))
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Client deleted"}

# ============ FOLDER ROUTES ==========
@app.get("/api/folders/{client_id}")
async def get_folders(client_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT f.id, f.name, f.parent_folder_id 
        FROM folders f
        JOIN clients c ON f.client_id = c.id
        WHERE c.id = ? AND c.user_id = ?
    ''', (client_id, current_user["id"]))
    folders = cursor.fetchall()
    conn.close()
    
    result = []
    for folder in folders:
        result.append({
            "id": folder["id"],
            "name": folder["name"],
            "parent_folder_id": folder["parent_folder_id"]
        })
    
    return result

@app.post("/api/folders")
async def add_folder(req: AddFolderRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM clients WHERE id = ? AND user_id = ?", (req.client_id, current_user["id"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Access denied")
    
    cursor.execute('''
        INSERT INTO folders (client_id, parent_folder_id, name)
        VALUES (?, ?, ?)
    ''', (req.client_id, req.parent_folder_id, req.name))
    
    folder_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"success": True, "folder_id": folder_id, "name": req.name}

@app.delete("/api/folders/{folder_id}")
async def delete_folder(folder_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        DELETE FROM folders WHERE id = ? AND client_id IN (SELECT id FROM clients WHERE user_id = ?)
    ''', (folder_id, current_user["id"]))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Folder deleted"}

# ============ JOB ROUTES ==========
@app.get("/api/jobs/{folder_id}")
async def get_jobs(folder_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT j.* FROM jobs j
        JOIN folders f ON j.folder_id = f.id
        JOIN clients c ON f.client_id = c.id
        WHERE f.id = ? AND c.user_id = ?
    ''', (folder_id, current_user["id"]))
    jobs = cursor.fetchall()
    conn.close()
    
    result = []
    for job in jobs:
        result.append({
            "id": job["id"],
            "name": job["name"],
            "subject": job["subject"],
            "description": job["description"],
            "frequency": job["frequency"],
            "job_date": job["job_date"],
            "job_time": job["job_time"],
            "timezone": job["timezone"],
            "estimated_hours": job["estimated_hours"],
            "credits": job["credits"],
            "verified": bool(job["verified"]),
            "running": bool(job["running"]),
            "next_run": job["next_run"],
            "created_at": job["created_at"],
            "supporting_files": json.loads(job["supporting_files"]) if job["supporting_files"] else []
        })
    
    return result

@app.post("/api/jobs")
async def add_job(req: AddJobRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT f.id FROM folders f
        JOIN clients c ON f.client_id = c.id
        WHERE f.id = ? AND c.user_id = ?
    ''', (req.folder_id, current_user["id"]))
    
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Access denied")
    
    next_run = f"{req.job_date} {req.job_time}"
    
    cursor.execute('''
        INSERT INTO jobs (folder_id, name, subject, description, frequency, job_date, job_time, timezone, estimated_hours, next_run)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (req.folder_id, req.name, req.subject, req.description, req.frequency, req.job_date, req.job_time, req.timezone, req.estimated_hours, next_run))
    
    job_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"success": True, "job_id": job_id, "message": "Job added"}

@app.put("/api/jobs/{job_id}")
async def update_job(job_id: int, req: UpdateJobRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT j.id FROM jobs j
        JOIN folders f ON j.folder_id = f.id
        JOIN clients c ON f.client_id = c.id
        WHERE j.id = ? AND c.user_id = ?
    ''', (job_id, current_user["id"]))
    
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Access denied")
    
    next_run = f"{req.job_date} {req.job_time}"
    
    cursor.execute('''
        UPDATE jobs 
        SET name = ?, subject = ?, description = ?, frequency = ?, job_date = ?, job_time = ?, timezone = ?, estimated_hours = ?, verified = 0, credits = NULL, next_run = ?
        WHERE id = ?
    ''', (req.name, req.subject, req.description, req.frequency, req.job_date, req.job_time, req.timezone, req.estimated_hours, next_run, job_id))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Job updated and needs verification"}

@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        DELETE FROM jobs WHERE id = ? AND folder_id IN (
            SELECT f.id FROM folders f
            JOIN clients c ON f.client_id = c.id
            WHERE c.user_id = ?
        )
    ''', (job_id, current_user["id"]))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Job deleted"}

@app.post("/api/jobs/{job_id}/verify")
async def verify_job(job_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT j.description, j.estimated_hours FROM jobs j
        JOIN folders f ON j.folder_id = f.id
        JOIN clients c ON f.client_id = c.id
        WHERE j.id = ? AND c.user_id = ?
    ''', (job_id, current_user["id"]))
    
    job = cursor.fetchone()
    
    if not job:
        conn.close()
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not job["description"] or len(job["description"]) < 5:
        conn.close()
        raise HTTPException(status_code=400, detail="Description too short for automation")
    
    estimated_credits = max(1, min(20, int(len(job["description"]) / 10) + int(job["estimated_hours"])))
    
    cursor.execute("SELECT credits FROM users WHERE id = ?", (current_user["id"],))
    user = cursor.fetchone()
    
    if user["credits"] < estimated_credits:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Insufficient credits. Need {estimated_credits}")
    
    cursor.execute("UPDATE jobs SET verified = 1, credits = ? WHERE id = ?", (estimated_credits, job_id))
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "verified": True,
        "credits": estimated_credits,
        "message": f"Job verified! Credits required: {estimated_credits}"
    }

@app.post("/api/jobs/{job_id}/run")
async def run_job(job_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT j.id, j.name, j.credits, j.estimated_hours, j.verified FROM jobs j
        JOIN folders f ON j.folder_id = f.id
        JOIN clients c ON f.client_id = c.id
        WHERE j.id = ? AND c.user_id = ?
    ''', (job_id, current_user["id"]))
    
    job = cursor.fetchone()
    
    if not job:
        conn.close()
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not job["verified"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Job not verified. Please verify first")
    
    cursor.execute("SELECT credits FROM users WHERE id = ?", (current_user["id"],))
    user = cursor.fetchone()
    
    if user["credits"] < job["credits"]:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Insufficient credits. Need {job['credits']}")
    
    new_credits = user["credits"] - job["credits"]
    cursor.execute("UPDATE users SET credits = ? WHERE id = ?", (new_credits, current_user["id"]))
    
    cursor.execute('''
        INSERT INTO transactions (user_id, type, amount, description, service, balance)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (current_user["id"], "usage", -job["credits"], f"Used for {job['name']}", "Job Execution", new_credits))
    
    cursor.execute("UPDATE jobs SET running = 1 WHERE id = ?", (job_id,))
    
    current_time = datetime.now().strftime("%b %d, %Y %I:%M:%S %p")
    cursor.execute('''
        INSERT INTO activity_logs (job_id, time, message, duration, status)
        VALUES (?, ?, ?, ?, ?)
    ''', (job_id, current_time, f"{job['name']} started ({job['credits']} credits)", "00:00:00", "running"))
    
    conn.commit()
    
    import time
    time.sleep(2)
    
    next_run = (datetime.now() + timedelta(days=1)).strftime("%b %d, %Y %I:%M:%S %p")
    cursor.execute("UPDATE jobs SET running = 0, next_run = ? WHERE id = ?", (next_run, job_id))
    
    time_saved_val = job["estimated_hours"]
    cursor.execute('''
        INSERT INTO time_saved (user_id, job_name, estimated_hours, actual_run_time, time_saved)
        VALUES (?, ?, ?, ?, ?)
    ''', (current_user["id"], job["name"], job["estimated_hours"], "00:00:30", time_saved_val))
    
    cursor.execute('''
        INSERT INTO activity_logs (job_id, time, message, duration, status)
        VALUES (?, ?, ?, ?, ?)
    ''', (job_id, datetime.now().strftime("%b %d, %Y %I:%M:%S %p"), f"{job['name']} completed! Time saved: {time_saved_val} hrs", "00:00:30", "success"))
    
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "message": f"Job completed! Time saved: {time_saved_val} hours",
        "credits_remaining": new_credits
    }

@app.post("/api/jobs/{job_id}/send")
async def send_job(job_id: int, req: SendJobRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT j.id, j.name, c.name as client_name FROM jobs j
        JOIN folders f ON j.folder_id = f.id
        JOIN clients c ON f.client_id = c.id
        WHERE j.id = ? AND c.user_id = ?
    ''', (job_id, current_user["id"]))
    
    job = cursor.fetchone()
    
    if not job:
        conn.close()
        raise HTTPException(status_code=404, detail="Job not found")
    
    cursor.execute('''
        INSERT INTO notifications (user_id, job_id, job_name, client_name, from_user)
        VALUES (?, ?, ?, ?, ?)
    ''', (current_user["id"], job_id, job["name"], job["client_name"], req.email))
    
    conn.commit()
    conn.close()
    
    email_body = f"""
    <html>
    <body>
        <h2>Job Shared with You</h2>
        <p>A job has been shared with you: <strong>{job['name']}</strong></p>
        <p>From: {current_user['email']}</p>
        <p>Login to your Ind AI account to view and accept this job.</p>
        <p>Thanks,<br>Ind AI Team</p>
    </body>
    </html>
    """
    send_email(req.email, f"Job Shared: {job['name']}", email_body)
    
    return {"success": True, "message": f"Job sent to {req.email}"}

@app.get("/api/jobs/{job_id}/logs")
async def get_job_logs(job_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT al.time, al.message, al.duration, al.status FROM activity_logs al
        JOIN jobs j ON al.job_id = j.id
        JOIN folders f ON j.folder_id = f.id
        JOIN clients c ON f.client_id = c.id
        WHERE al.job_id = ? AND c.user_id = ?
        ORDER BY al.time DESC
    ''', (job_id, current_user["id"]))
    
    logs = cursor.fetchall()
    conn.close()
    
    result = []
    for log in logs:
        result.append({
            "time": log["time"],
            "message": log["message"],
            "duration": log["duration"],
            "status": log["status"]
        })
    
    return result

# ============ SERVICES ROUTES ==========
SERVICES = [
    {"name": "Merge PDF", "desc": "Combine multiple PDF files into one document.", "credits": 2, "needs_two_files": True},
    {"name": "Split PDF", "desc": "Split a PDF into separate pages or ranges.", "credits": 2, "needs_two_files": False},
    {"name": "Compress PDF", "desc": "Reduce PDF file size while maintaining quality.", "credits": 1, "needs_two_files": False},
    {"name": "PDF to Word", "desc": "Convert PDF files to editable Word documents.", "credits": 1, "needs_two_files": False},
    {"name": "Word to PDF", "desc": "Convert Word documents to PDF format.", "credits": 2, "needs_two_files": False},
    {"name": "JPG to PDF", "desc": "Convert JPG images to PDF documents.", "credits": 1, "needs_two_files": False},
    {"name": "Watermark", "desc": "Add watermark to PDF documents.", "credits": 2, "needs_two_files": False},
    {"name": "Protect PDF", "desc": "Add password protection to PDF.", "credits": 1, "needs_two_files": False},
    {"name": "Unlock PDF", "desc": "Remove password from PDF files.", "credits": 1, "needs_two_files": False}
]

@app.get("/api/services")
async def get_services():
    return SERVICES

@app.post("/api/services/{service_name}/process")
async def process_service(service_name: str, current_user: dict = Depends(get_current_user)):
    service = next((s for s in SERVICES if s["name"] == service_name), None)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT credits FROM users WHERE id = ?", (current_user["id"],))
    user = cursor.fetchone()
    
    if user["credits"] < service["credits"]:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Insufficient credits. Need {service['credits']}")
    
    new_credits = user["credits"] - service["credits"]
    cursor.execute("UPDATE users SET credits = ? WHERE id = ?", (new_credits, current_user["id"]))
    
    cursor.execute('''
        INSERT INTO transactions (user_id, type, amount, description, service, balance)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (current_user["id"], "usage", -service["credits"], f"Used for {service_name}", service_name, new_credits))
    
    cursor.execute('''
        INSERT INTO service_usage (user_id, service_name, credits_used)
        VALUES (?, ?, ?)
    ''', (current_user["id"], service_name, service["credits"]))
    
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "message": f"{service_name} processed successfully!",
        "credits_remaining": new_credits
    }

# ============ BILLING ROUTES ==========
PLANS = [
    {"name": "free", "price": 0, "credits": 100, "period": "day"},
    {"name": "daily", "price": 10, "credits": 10000, "period": "day"},
    {"name": "monthly", "price": 250, "credits": 1000000, "period": "month"},
    {"name": "yearly", "price": 2500, "credits": 15000000, "period": "year"}
]

@app.get("/api/billing/plans")
async def get_plans():
    return PLANS

@app.post("/api/billing/select-plan")
async def select_plan(req: SelectPlanRequest, current_user: dict = Depends(get_current_user)):
    plan = next((p for p in PLANS if p["name"] == req.plan), None)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("UPDATE users SET current_plan = ?, credits = ? WHERE id = ?", 
                   (req.plan, plan["credits"], current_user["id"]))
    
    cursor.execute('''
        INSERT INTO transactions (user_id, type, amount, description, service, balance)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (current_user["id"], "plan_change", plan["credits"], f"Activated {req.plan} plan", "-", plan["credits"]))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "plan": req.plan, "credits": plan["credits"]}

@app.post("/api/billing/add-credits")
async def add_credits(req: AddCreditsRequest, current_user: dict = Depends(get_current_user)):
    if req.credits <= 0:
        raise HTTPException(status_code=400, detail="Invalid credit amount")
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT credits FROM users WHERE id = ?", (current_user["id"],))
    user = cursor.fetchone()
    
    new_credits = user["credits"] + req.credits
    cursor.execute("UPDATE users SET credits = ? WHERE id = ?", (new_credits, current_user["id"]))
    
    price = req.credits // 100
    cursor.execute('''
        INSERT INTO transactions (user_id, type, amount, description, service, balance)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (current_user["id"], "purchase", req.credits, f"Purchased {req.credits} credits for ${price}", "-", new_credits))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "credits": new_credits, "message": f"Added {req.credits} credits"}

@app.get("/api/billing/transactions")
async def get_transactions(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, date, type, amount, description, service, balance
        FROM transactions
        WHERE user_id = ?
        ORDER BY date DESC
        LIMIT 50
    ''', (current_user["id"],))
    
    transactions = cursor.fetchall()
    conn.close()
    
    result = []
    for t in transactions:
        result.append({
            "id": t["id"],
            "date": t["date"],
            "type": t["type"],
            "amount": t["amount"],
            "description": t["description"],
            "service": t["service"],
            "balance": t["balance"]
        })
    
    return result

# ============ NOTIFICATION ROUTES ==========
@app.get("/api/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM notifications
        WHERE user_id = ?
        ORDER BY sent_at DESC
    ''', (current_user["id"],))
    
    notifications = cursor.fetchall()
    conn.close()
    
    result = []
    for n in notifications:
        result.append({
            "id": n["id"],
            "job_id": n["job_id"],
            "job_name": n["job_name"],
            "client_name": n["client_name"],
            "from_user": n["from_user"],
            "status": n["status"],
            "sent_at": n["sent_at"]
        })
    
    return result

@app.post("/api/notifications/{notification_id}/accept")
async def accept_notification(notification_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT n.* FROM notifications n
        WHERE n.id = ? AND n.user_id = ?
    ''', (notification_id, current_user["id"]))
    
    notification = cursor.fetchone()
    
    if not notification:
        conn.close()
        raise HTTPException(status_code=404, detail="Notification not found")
    
    cursor.execute("SELECT id FROM clients WHERE user_id = ? LIMIT 1", (current_user["id"],))
    client = cursor.fetchone()
    
    if not client:
        cursor.execute("INSERT INTO clients (user_id, name) VALUES (?, ?)", (current_user["id"], "Received Jobs"))
        client_id = cursor.lastrowid
    else:
        client_id = client["id"]
    
    cursor.execute("SELECT id FROM folders WHERE client_id = ? LIMIT 1", (client_id,))
    folder = cursor.fetchone()
    
    if not folder:
        cursor.execute("INSERT INTO folders (client_id, name) VALUES (?, ?)", (client_id, "Shared Jobs"))
        folder_id = cursor.lastrowid
    else:
        folder_id = folder["id"]
    
    cursor.execute('''
        INSERT INTO jobs (folder_id, name, subject, description, frequency, job_date, job_time, timezone, estimated_hours)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (folder_id, notification["job_name"], notification["job_name"], "Shared job", "Daily", datetime.now().strftime("%Y-%m-%d"), "12:00", "Asia/Kolkata", 1))
    
    cursor.execute('''
        UPDATE notifications SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (notification_id,))
    
    conn.commit()
    conn.close()
    
    email_body = f"<h2>Job Accepted: {notification['job_name']}</h2><p>The job has been added to your account.</p>"
    send_email(notification["from_user"], f"Job Accepted: {notification['job_name']}", email_body)
    
    return {"success": True, "message": f"Job '{notification['job_name']}' added to your account"}

@app.post("/api/notifications/{notification_id}/reject")
async def reject_notification(notification_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE notifications SET status = 'rejected'
        WHERE id = ? AND user_id = ?
    ''', (notification_id, current_user["id"]))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Notification rejected"}

# ============ DASHBOARD ROUTES ==========
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT current_plan, credits FROM users WHERE id = ?", (current_user["id"],))
    user = cursor.fetchone()
    
    cursor.execute('''
        SELECT COUNT(*) as active_count FROM jobs j
        JOIN folders f ON j.folder_id = f.id
        JOIN clients c ON f.client_id = c.id
        WHERE c.user_id = ? AND j.running = 1
    ''', (current_user["id"],))
    active = cursor.fetchone()
    
    cursor.execute('''
        SELECT COUNT(*) as total_count FROM jobs j
        JOIN folders f ON j.folder_id = f.id
        JOIN clients c ON f.client_id = c.id
        WHERE c.user_id = ?
    ''', (current_user["id"],))
    total = cursor.fetchone()
    
    conn.close()
    
    return {
        "current_plan": user["current_plan"],
        "credits": user["credits"],
        "active_jobs": active["active_count"],
        "total_jobs": total["total_count"]
    }

@app.get("/api/dashboard/upcoming-jobs")
async def get_upcoming_jobs(date: str, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT j.name as job_name, c.name as client_name, j.frequency, j.job_date, j.job_time
        FROM jobs j
        JOIN folders f ON j.folder_id = f.id
        JOIN clients c ON f.client_id = c.id
        WHERE c.user_id = ? AND j.job_date = ?
        ORDER BY j.job_time
    ''', (current_user["id"], date))
    
    jobs = cursor.fetchall()
    conn.close()
    
    result = []
    for job in jobs:
        result.append({
            "job_name": job["job_name"],
            "client_name": job["client_name"],
            "frequency": job["frequency"],
            "date": job["job_date"],
            "time": job["job_time"]
        })
    
    return result

@app.get("/api/dashboard/time-saved-report")
async def get_time_saved_report(start_date: str = None, end_date: str = None, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM time_saved WHERE user_id = ?"
    params = [current_user["id"]]
    
    if start_date:
        query += " AND date >= ?"
        params.append(start_date)
    if end_date:
        query += " AND date <= ?"
        params.append(end_date)
    
    query += " ORDER BY date DESC"
    
    cursor.execute(query, params)
    records = cursor.fetchall()
    conn.close()
    
    total_time_saved = sum(r["time_saved"] for r in records)
    
    result = []
    for r in records:
        result.append({
            "id": r["id"],
            "date": r["date"],
            "job_name": r["job_name"],
            "estimated_hours": r["estimated_hours"],
            "actual_run_time": r["actual_run_time"],
            "time_saved": r["time_saved"],
            "status": r["status"]
        })
    
    return {
        "records": result,
        "total_time_saved": total_time_saved,
        "total_jobs": len(result)
    }

# ============ API KEY ROUTES ==========
@app.get("/api/api-keys")
async def get_api_keys(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT api_key FROM users WHERE id = ?", (current_user["id"],))
    user = cursor.fetchone()
    conn.close()
    
    return {"api_key": user["api_key"]}

@app.post("/api/api-keys")
async def generate_api_key(current_user: dict = Depends(get_current_user)):
    new_key = "ind_" + str(uuid.uuid4()).replace("-", "")[:12]
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET api_key = ? WHERE id = ?", (new_key, current_user["id"]))
    conn.commit()
    conn.close()
    
    return {"api_key": new_key}

# ============ CONTACT ROUTE ==========
@app.post("/api/contact")
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
    
    if SMTP_USER and SMTP_PASSWORD:
        email_body = f"""
        <html>
        <body>
            <h2>New Contact Message</h2>
            <p><strong>Name:</strong> {req.name}</p>
            <p><strong>Email:</strong> {req.email}</p>
            <p><strong>Subject:</strong> {req.subject}</p>
            <p><strong>Message:</strong></p>
            <p>{req.message}</p>
        </body>
        </html>
        """
        send_email(ADMIN_EMAIL, f"Contact Form: {req.subject}", email_body)
        
        auto_reply = f"""
        <html>
        <body>
            <h2>Thank you for contacting Ind AI</h2>
            <p>Dear {req.name},</p>
            <p>We have received your message and will get back to you within 24 hours.</p>
            <p>Thanks,<br>Ind AI Support Team</p>
        </body>
        </html>
        """
        send_email(req.email, "We received your message", auto_reply)
    
    return {"success": True, "message": "Message sent successfully"}

# ============ SERVE STATIC FILES ==========
@app.get("/")
async def serve_index():
    if os.path.exists(INDEX_PATH):
        return FileResponse(INDEX_PATH)
    return {"error": "index.html not found"}

app.mount("/css", StaticFiles(directory=CSS_DIR), name="css")
app.mount("/js", StaticFiles(directory=JS_DIR), name="js")

# ============ RUN SERVER ============
if __name__ == "__main__":
    port = int(os.getenv("PORT", 3000))
    uvicorn.run(app, host="0.0.0.0", port=port)