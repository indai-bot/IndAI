from fastapi import APIRouter, Depends
from backend.database import get_db
from backend.auth_middleware import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats")
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

@router.get("/upcoming-jobs")
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
    
    return [{"job_name": j["job_name"], "client_name": j["client_name"], 
             "frequency": j["frequency"], "date": j["job_date"], "time": j["job_time"]} for j in jobs]

@router.get("/time-saved-report")
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
    
    result = [{
        "id": r["id"], "date": r["date"], "job_name": r["job_name"],
        "estimated_hours": r["estimated_hours"], "actual_run_time": r["actual_run_time"],
        "time_saved": r["time_saved"], "status": r["status"]
    } for r in records]
    
    return {"records": result, "total_time_saved": total_time_saved, "total_jobs": len(result)}