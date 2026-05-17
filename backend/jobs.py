import json
import time
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from backend.database import get_db
from backend.auth_middleware import get_current_user
from backend.email_utils import send_email
from backend.models import AddJobRequest, UpdateJobRequest, SendJobRequest

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

@router.get("/{folder_id}")
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

@router.get("/all/{client_id}")
async def get_all_jobs(client_id: int, current_user: dict = Depends(get_current_user)):
    """Get all folders and jobs in one API call - OPTIMIZED"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify client belongs to user
    cursor.execute("SELECT id FROM clients WHERE id = ? AND user_id = ?", (client_id, current_user["id"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all folders for this client
    cursor.execute('''
        SELECT f.id, f.name, f.parent_folder_id 
        FROM folders f
        WHERE f.client_id = ?
        ORDER BY f.name
    ''', (client_id,))
    folders = cursor.fetchall()
    
    # Get all jobs for these folders
    folder_ids = [f["id"] for f in folders]
    jobs_by_folder = {}
    
    if folder_ids:
        placeholders = ','.join('?' * len(folder_ids))
        cursor.execute(f'''
            SELECT j.*, j.folder_id FROM jobs j
            WHERE j.folder_id IN ({placeholders})
            ORDER BY j.name
        ''', folder_ids)
        jobs = cursor.fetchall()
        
        for job in jobs:
            folder_id = job["folder_id"]
            if folder_id not in jobs_by_folder:
                jobs_by_folder[folder_id] = []
            jobs_by_folder[folder_id].append({
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
                "created_at": job["created_at"]
            })
    
    conn.close()
    
    return {
        "folders": [{"id": f["id"], "name": f["name"], "parent_folder_id": f["parent_folder_id"]} for f in folders],
        "jobs_by_folder": jobs_by_folder
    }

@router.post("/")
@router.post("/")
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
    
    # Use req.estimated_hours directly (don't override with 1)
    cursor.execute('''
        INSERT INTO jobs (folder_id, name, subject, description, frequency, job_date, job_time, timezone, estimated_hours, next_run)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (req.folder_id, req.name, req.subject, req.description, req.frequency, req.job_date, req.job_time, req.timezone, req.estimated_hours, next_run))
    
    job_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"success": True, "job_id": job_id, "message": "Job added"}
    
@router.put("/{job_id}")
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
    
    return {"success": True, "message": "Job updated"}

@router.delete("/{job_id}")
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

@router.post("/{job_id}/verify")
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
        raise HTTPException(status_code=400, detail="Description too short")
    
    estimated_credits = max(1, min(20, int(len(job["description"]) / 10) + int(job["estimated_hours"])))
    
    cursor.execute("SELECT credits FROM users WHERE id = ?", (current_user["id"],))
    user = cursor.fetchone()
    
    if user["credits"] < estimated_credits:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Insufficient credits. Need {estimated_credits}")
    
    cursor.execute("UPDATE jobs SET verified = 1, credits = ? WHERE id = ?", (estimated_credits, job_id))
    conn.commit()
    conn.close()
    
    return {"success": True, "verified": True, "credits": estimated_credits, "message": f"Job verified! Credits: {estimated_credits}"}

@router.post("/{job_id}/run")
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
        raise HTTPException(status_code=400, detail="Job not verified")
    
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
    
    return {"success": True, "message": f"Job completed! Time saved: {time_saved_val} hours", "credits_remaining": new_credits}

@router.post("/{job_id}/send")
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
    
    email_body = f"<h2>Job Shared: {job['name']}</h2><p>From: {current_user['email']}</p>"
    send_email(req.email, f"Job Shared: {job['name']}", email_body)
    
    return {"success": True, "message": f"Job sent to {req.email}"}

@router.get("/{job_id}/logs")
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
    
    return [{"time": l["time"], "message": l["message"], "duration": l["duration"], "status": l["status"]} for l in logs]