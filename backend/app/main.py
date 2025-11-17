from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .core.config import settings
from .routers import auth, users, flows, flow_instances, tasks

app = FastAPI(
    title="Flow - Workflow Management API",
    description="API for Flow workflow management tool",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(flows.router, prefix="/api")
app.include_router(flow_instances.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# Serve static files in production
# Check if frontend/dist exists (production build)
frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    # Mount static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    # Serve specific HTML files
    @app.get("/login.html")
    async def serve_login():
        return FileResponse(frontend_dist / "login.html")

    @app.get("/register.html")
    async def serve_register():
        return FileResponse(frontend_dist / "register.html")

    @app.get("/auth-callback.html")
    async def serve_auth_callback():
        return FileResponse(frontend_dist / "auth-callback.html")

    @app.get("/flow-designer.html")
    async def serve_flow_designer():
        return FileResponse(frontend_dist / "flow-designer.html")

    # Serve index.html for root path and any other paths (SPA-like routing)
    @app.get("/")
    async def serve_root():
        return FileResponse(frontend_dist / "index.html")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve frontend application - catch-all for non-API routes"""
        # Check if it's a specific file that exists
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)

        # Otherwise serve index.html (for client-side routing)
        return FileResponse(frontend_dist / "index.html")
else:
    # Development mode - API only
    @app.get("/")
    async def root():
        """Health check endpoint"""
        return {
            "message": "Flow API is running",
            "version": "1.0.0",
            "status": "healthy"
        }
