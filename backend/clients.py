from fastapi import APIRouter, HTTPException, Depends
from backend.database import get_db
from backend.auth_middleware import get_current_user
from backend.models import AddClientRequest

router = APIRouter(prefix="/api/clients", tags=["clients"])

@router.get("/")
async def get_clients(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM clients WHERE user_id = ? ORDER BY name", (current_user["id"],))
    clients = cursor.fetchall()
    conn.close()
    
    return [{"id": c["id"], "name": c["name"]} for c in clients]

@router.post("/")
async def add_client(req: AddClientRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO clients (user_id, name) VALUES (?, ?)", (current_user["id"], req.name))
    client_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"success": True, "client_id": client_id, "name": req.name}

@router.delete("/{client_id}")
async def delete_client(client_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM clients WHERE id = ? AND user_id = ?", (client_id, current_user["id"]))
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Client deleted"}