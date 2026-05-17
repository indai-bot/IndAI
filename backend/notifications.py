from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from backend.database import get_db
from backend.auth_middleware import get_current_user
from backend.email_utils import send_email

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.get("/")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM notifications WHERE user_id = ? ORDER BY sent_at DESC
    ''', (current_user["id"],))
    
    notifications = cursor.fetchall()
    conn.close()
    
    return [{"id": n["id"], "job_id": n["job_id"], "job_name": n["job_name"], 
             "client_name": n["client_name"], "from_user": n["from_user"], 
             "status": n["status"], "sent_at": n["sent_at"]} for n in notifications]

@router.post("/{notification_id}/accept")
async def accept_notification(notification_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM notifications WHERE id = ? AND user_id = ?', (notification_id, current_user["id"]))
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
    ''', (folder_id, notification["job_name"], notification["job_name"], "Shared job", 
          "Daily", datetime.now().strftime("%Y-%m-%d"), "12:00", "Asia/Kolkata", 1))
    
    cursor.execute('UPDATE notifications SET status = "accepted", accepted_at = CURRENT_TIMESTAMP WHERE id = ?', (notification_id,))
    
    conn.commit()
    conn.close()
    
    send_email(notification["from_user"], f"Job Accepted: {notification['job_name']}", 
               f"<h2>Job Accepted</h2><p>{notification['job_name']} has been added to your account.</p>")
    
    return {"success": True, "message": f"Job '{notification['job_name']}' added"}

@router.post("/{notification_id}/reject")
async def reject_notification(notification_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('UPDATE notifications SET status = "rejected" WHERE id = ? AND user_id = ?', 
                   (notification_id, current_user["id"]))
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Notification rejected"}