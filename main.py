from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router  
from fastapi.responses import HTMLResponse

app = FastAPI(title="CourseForge API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
from fastapi.staticfiles import StaticFiles

os.makedirs("media", exist_ok=True)
app.mount("/media", StaticFiles(directory="media"), name="media")

# <-- Tell the app to use our new routes
app.include_router(router, prefix="/api") 

@app.get("/")
async def root_status():
    return {"status": "online", "message": "CourseForge Backend is running!"}