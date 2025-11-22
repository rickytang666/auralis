"""
FastAPI main application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import conversation, tts, insights

app = FastAPI(
    title="AI Doctor API",
    description="Backend API for AI Doctor video consultation app",
    version="1.0.0"
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(conversation.router, prefix="/api", tags=["conversation"])
app.include_router(tts.router, prefix="/api", tags=["tts"])
app.include_router(insights.router, prefix="/api", tags=["insights"])


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "AI Doctor API is running"}


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "services": {
            "gemini": "configured",
            "elevenlabs": "configured"
        }
    }

