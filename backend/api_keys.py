import uuid
from fastapi import APIRouter, Depends, HTTPException
from backend.database import get_db
from backend.auth_middleware import get_current_user

router = APIRouter(prefix="/api/api-keys", tags=["api-keys"])

@router.get("/")
async def get_api_keys(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    # Ensure api_key column exists
    try:
        cursor.execute("SELECT api_key FROM users WHERE id = ?", (current_user["id"],))
        user = cursor.fetchone()
    except:
        # Column doesn't exist, add it
        cursor.execute("ALTER TABLE users ADD COLUMN api_key TEXT")
        conn.commit()
        cursor.execute("SELECT api_key FROM users WHERE id = ?", (current_user["id"],))
        user = cursor.fetchone()
    
    conn.close()
    
    if not user or not user["api_key"]:
        return {"api_key": None}
    
    return {"api_key": user["api_key"]}

@router.post("/")
async def generate_api_key(current_user: dict = Depends(get_current_user)):
    new_key = "ind_" + str(uuid.uuid4()).replace("-", "")[:12]
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Ensure api_key column exists
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN api_key TEXT")
        conn.commit()
    except:
        pass  # Column already exists
    
    cursor.execute("UPDATE users SET api_key = ? WHERE id = ?", (new_key, current_user["id"]))
    conn.commit()
    conn.close()
    
    return {"api_key": new_key}