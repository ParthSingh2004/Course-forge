from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router  
from fastapi.responses import HTMLResponse
import os

app = FastAPI(title="CourseForge API", version="1.0.0")

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://course-forge-frontend.onrender.com",
]

extra_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

allowed_origins = list(dict.fromkeys(default_origins + extra_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles

os.makedirs("media", exist_ok=True)
app.mount("/media", StaticFiles(directory="media"), name="media")

# <-- Tell the app to use our new routes
app.include_router(router, prefix="/api") 

@app.get("/")
async def root_status():
    return {"status": "online", "message": "CourseForge Backend is running!"}
