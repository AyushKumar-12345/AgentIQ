"""AgentIQ Backend Runner.

This script ensures paths are correctly resolved and starts the FastAPI server.
Usage:
    python run_backend.py
"""

import sys
from pathlib import Path

# Ensure 'backend' directory is at the front of sys.path
_BACKEND_DIR = Path(__file__).resolve().parent / "backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

if __name__ == "__main__":
    import uvicorn
    from app.config import settings

    print(f"[*] Starting {settings.PROJECT_NAME} on http://{settings.BACKEND_HOST}:{settings.BACKEND_PORT}")
    print(f"[*] Interactive API Docs: http://localhost:{settings.BACKEND_PORT}/docs")
    
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True,
        app_dir=str(_BACKEND_DIR),
    )
