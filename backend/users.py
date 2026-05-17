import bcrypt
import os
import shutil
import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from backend.database import get_db
from backend.auth_middleware import get_current_user
from backend.models import ChangePasswordRequest, UpdateProfileRequest

router = APIRouter(prefix="/api/users", tags=["users"])

# Base directory for process folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESS_DIR = os.path.join(BASE_DIR, "process")
if not os.path.exists(PROCESS_DIR):
    os.makedirs(PROCESS_DIR)

def get_client_folder(user_id: int):
    """Get client folder path based on user ID"""
    client_folder = os.path.join(PROCESS_DIR, str(user_id))
    photos_folder = os.path.join(client_folder, "photos")
    os.makedirs(photos_folder, exist_ok=True)
    return client_folder, photos_folder

@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT id, email, first_name, last_name, gender, birthdate, country_code, mobile, photo_url FROM users WHERE id = ?", (current_user["id"],))
        user = cursor.fetchone()
        has_photo_column = True
    except:
        cursor.execute("SELECT id, email, first_name, last_name, gender, birthdate, country_code, mobile FROM users WHERE id = ?", (current_user["id"],))
        user = cursor.fetchone()
        has_photo_column = False
    
    conn.close()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = {
        "id": user["id"],
        "email": user["email"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "gender": user["gender"],
        "birthdate": user["birthdate"],
        "country_code": user["country_code"],
        "mobile": user["mobile"]
    }
    
    if has_photo_column:
        result["photo_url"] = user["photo_url"]
    else:
        result["photo_url"] = None
    
    return result

@router.put("/profile")
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

@router.put("/password")
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
    
    return {"success": True, "message": "Password changed successfully"}

@router.delete("/account")
async def delete_account(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    # Get user email before deleting
    cursor.execute("SELECT email FROM users WHERE id = ?", (current_user["id"],))
    user = cursor.fetchone()
    email = user["email"] if user else None
    
    cursor.execute("DELETE FROM users WHERE id = ?", (current_user["id"],))
    conn.commit()
    conn.close()
    
    # Delete user process folder
    client_folder = os.path.join(PROCESS_DIR, str(current_user["id"]))
    if os.path.exists(client_folder):
        shutil.rmtree(client_folder)
    
    return {"success": True, "message": "Account deleted successfully"}

# ============ PHOTO UPLOAD ROUTES ==========
@router.post("/upload-photo")
async def upload_photo(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    # Check file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Only image files allowed")
    
    # Check file size (max 2MB)
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 2MB")
    
    # Check file extension
    file_extension = os.path.splitext(file.filename)[1].lower()
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: jpg, jpeg, png, gif, webp")
    
    # Get client folder
    client_folder, photos_folder = get_client_folder(current_user["id"])
    
    # Delete old photo if exists
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT photo_url FROM users WHERE id = ?", (current_user["id"],))
        old_user = cursor.fetchone()
    except:
        old_user = None
    
    if old_user and old_user["photo_url"]:
        old_filename = os.path.basename(old_user["photo_url"])
        old_file_path = os.path.join(photos_folder, old_filename)
        if os.path.exists(old_file_path):
            os.remove(old_file_path)
    
    # Generate unique filename
    filename = f"user_{current_user['id']}_{uuid.uuid4().hex[:8]}{file_extension}"
    file_path = os.path.join(photos_folder, filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update database
    photo_url = f"/process/{current_user['id']}/photos/{filename}"
    
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN photo_url TEXT")
    except:
        pass
    
    cursor.execute("UPDATE users SET photo_url = ? WHERE id = ?", (photo_url, current_user["id"]))
    conn.commit()
    conn.close()
    
    return {"success": True, "photo_url": photo_url}

@router.delete("/delete-photo")
async def delete_photo(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    # Get current photo URL
    try:
        cursor.execute("SELECT photo_url FROM users WHERE id = ?", (current_user["id"],))
        user = cursor.fetchone()
    except:
        user = None
    
    if user and user["photo_url"]:
        # Delete file from disk
        old_filename = os.path.basename(user["photo_url"])
        old_file_path = os.path.join(PROCESS_DIR, str(current_user["id"]), "photos", old_filename)
        if os.path.exists(old_file_path):
            os.remove(old_file_path)
    
    # Remove from database
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN photo_url TEXT")
    except:
        pass
    
    cursor.execute("UPDATE users SET photo_url = NULL WHERE id = ?", (current_user["id"],))
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Photo deleted successfully"}