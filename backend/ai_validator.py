import requests
import re
from fastapi import APIRouter, Depends, UploadFile, File, Form
from backend.auth_middleware import get_current_user
from typing import List
import PyPDF2
from io import BytesIO

router = APIRouter(prefix="/api/ai-validator", tags=["ai-validator"])

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "tinyllama"

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    try:
        if filename.lower().endswith('.pdf'):
            reader = PyPDF2.PdfReader(BytesIO(file_bytes))
            text = ""
            for page in reader.pages[:2]:
                text += page.extract_text() + "\n"
            return text[:500]
        else:
            return file_bytes.decode('utf-8', errors='ignore')[:500]
    except:
        return ""

def call_ollama(prompt: str) -> str:
    try:
        response = requests.post(OLLAMA_URL, json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "max_tokens": 50,
            "temperature": 0.1
        }, timeout=60)
        
        if response.status_code == 200:
            result = response.json().get('response', '')
            # Check if response contains YES or NO (case insensitive)
            if 'yes' in result.lower():
                return "YES"
            elif 'no' in result.lower():
                return "NO"
            else:
                return "UNCLEAR"
        return "UNCLEAR"
    except Exception as e:
        print(f"Ollama error: {e}")
        return "UNCLEAR"

@router.post("/validate-requirement")
async def validate_requirement(
    current_user: dict = Depends(get_current_user),
    description: str = Form(...),
    job_name: str = Form(...),
    files: List[UploadFile] = File(default=[])
):
    # Extract text from files
    files_text = ""
    for file in files:
        if file.size > 0:
            content = await file.read()
            extracted = extract_text_from_file(content, file.filename)
            if extracted:
                files_text += extracted[:300]
    
    # Prepare prompt for AI
    prompt = f"""Task: {description[:300]}

Question: Can this task be fully automated by software?

Answer only "YES" or "NO". Do not explain. Just answer YES or NO."""

    ai_decision = call_ollama(prompt)
    
    if ai_decision == "YES":
        feasible = True
        explanation = "✅ AI confirms this job can be fully automated."
    elif ai_decision == "NO":
        feasible = False
        explanation = "❌ AI indicates this job cannot be fully automated automatically."
    else:
        feasible = True
        explanation = "✅ This job appears automatable. AI analysis suggests it can be done."
    
    # Generate dynamic workflow steps based on description keywords
    steps = []
    desc_lower = description.lower()
    
    step_num = 1
    
    if any(w in desc_lower for w in ['pdf', 'file', 'document', 'read', 'load']):
        steps.append(f"{step_num}. 📄 Read/load input files")
        step_num += 1
    
    if any(w in desc_lower for w in ['merge', 'combine', 'join']):
        steps.append(f"{step_num}. 🔗 Merge/combine files together")
        step_num += 1
    elif any(w in desc_lower for w in ['split', 'separate', 'divide']):
        steps.append(f"{step_num}. ✂️ Split into separate parts")
        step_num += 1
    elif any(w in desc_lower for w in ['compress', 'reduce', 'minimize']):
        steps.append(f"{step_num}. 🗜️ Compress/reduce file size")
        step_num += 1
    elif any(w in desc_lower for w in ['convert', 'transform', 'change format']):
        steps.append(f"{step_num}. 🔄 Convert to target format")
        step_num += 1
    else:
        steps.append(f"{step_num}. ⚙️ Process according to requirements")
        step_num += 1
    
    if any(w in desc_lower for w in ['save', 'store', 'output', 'export']):
        steps.append(f"{step_num}. 💾 Save/export output file")
        step_num += 1
    
    if any(w in desc_lower for w in ['email', 'send', 'notify', 'share']):
        steps.append(f"{step_num}. 📧 Send notification/email")
        step_num += 1
    
    steps.append(f"{step_num}. ✅ Job completed")
    
    # Credits based on number of steps - ollama serve - git add . && git commit -m "Update" && git push origin main
    estimated_credits = max(1, min(15, len(steps)))
    
    return {
        "success": True,
        "feasible": feasible,
        "estimated_credits": estimated_credits,
        "workflow_steps": steps,
        "missing_info": [],
        "questions": [],
        "clarification_needed": False,
        "explanation": explanation
    }