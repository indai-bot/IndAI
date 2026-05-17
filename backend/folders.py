from fastapi import APIRouter, HTTPException, Depends
from backend.database import get_db
from backend.auth_middleware import get_current_user
from backend.models import AddFolderRequest

router = APIRouter(prefix="/api/folders", tags=["folders"])

@router.get("/{client_id}")
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
    
    return [{"id": f["id"], "name": f["name"], "parent_folder_id": f["parent_folder_id"]} for f in folders]

@router.post("/")
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

@router.delete("/{folder_id}")
async def delete_folder(folder_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        DELETE FROM folders WHERE id = ? AND client_id IN (SELECT id FROM clients WHERE user_id = ?)
    ''', (folder_id, current_user["id"]))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Folder deleted"}