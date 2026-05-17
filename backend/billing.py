from fastapi import APIRouter, HTTPException, Depends
from backend.database import get_db
from backend.auth_middleware import get_current_user
from backend.models import SelectPlanRequest, AddCreditsRequest

router = APIRouter(prefix="/api/billing", tags=["billing"])

PLANS = [
    {"name": "free", "price": 0, "credits": 100, "period": "day"},
    {"name": "daily", "price": 10, "credits": 10000, "period": "day"},
    {"name": "monthly", "price": 250, "credits": 1000000, "period": "month"},
    {"name": "yearly", "price": 2500, "credits": 15000000, "period": "year"}
]

@router.get("/plans")
async def get_plans():
    return PLANS

@router.post("/select-plan")
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

@router.post("/add-credits")
async def add_credits(req: AddCreditsRequest, current_user: dict = Depends(get_current_user)):
    if req.credits <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")
    
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

@router.get("/transactions")
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
    
    return [{"id": t["id"], "date": t["date"], "type": t["type"], "amount": t["amount"], 
             "description": t["description"], "service": t["service"], "balance": t["balance"]} for t in transactions]