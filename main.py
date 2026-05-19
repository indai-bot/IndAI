import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

from backend.database import init_db
from backend.auth import router as auth_router
from backend.users import router as users_router
from backend.clients import router as clients_router
from backend.folders import router as folders_router
from backend.jobs import router as jobs_router
from backend.services import router as services_router
from backend.billing import router as billing_router
from backend.notifications import router as notifications_router
from backend.dashboard import router as dashboard_router
from backend.api_keys import router as api_keys_router
from backend.contact import router as contact_router
from backend.ai_validator import router as ai_validator_router

load_dotenv()

app = FastAPI()

# CORS - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ PATH SETUP ============
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_PATH = os.path.join(BASE_DIR, "index.html")
CSS_DIR = os.path.join(BASE_DIR, "css")
JS_DIR = os.path.join(BASE_DIR, "js")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
PROCESS_DIR = os.path.join(BASE_DIR, "process")
IMAGES_DIR = os.path.join(BASE_DIR, "images")

# Create directories if not exists
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
if not os.path.exists(PROCESS_DIR):
    os.makedirs(PROCESS_DIR)
if not os.path.exists(IMAGES_DIR):
    os.makedirs(IMAGES_DIR)

# ============ DATABASE INITIALIZATION ============
@app.on_event("startup")
async def startup_event():
    init_db()

# ============ INCLUDE ALL ROUTERS ============
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(clients_router)
app.include_router(folders_router)
app.include_router(jobs_router)
app.include_router(services_router)
app.include_router(billing_router)
app.include_router(notifications_router)
app.include_router(dashboard_router)
app.include_router(api_keys_router)
app.include_router(contact_router)
app.include_router(ai_validator_router)

# ============ SERVE STATIC FILES ============
@app.get("/")
async def serve_index():
    """Serve the main index.html file"""
    if os.path.exists(INDEX_PATH):
        return FileResponse(INDEX_PATH)
    return {"error": "index.html not found", "path": INDEX_PATH}

# Mount static directories
app.mount("/css", StaticFiles(directory=CSS_DIR), name="css")
app.mount("/js", StaticFiles(directory=JS_DIR), name="js")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/process", StaticFiles(directory=PROCESS_DIR), name="process")
app.mount("/images", StaticFiles(directory=IMAGES_DIR), name="images")

# ============ HEALTH CHECK ENDPOINT ============
@app.get("/health")
async def health_check():
    """Health check endpoint for Render"""
    return {"status": "healthy", "message": "Ind AI Platform is running"}

# ============ RUN SERVER ============
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 3000))
    uvicorn.run(app, host="0.0.0.0", port=port)