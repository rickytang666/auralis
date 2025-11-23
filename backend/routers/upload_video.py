from fastapi import APIRouter, UploadFile, File, HTTPException, Form
import os
import subprocess
from pathlib import Path
import time

router = APIRouter()


@router.post("/upload_video")
async def upload_video(file: UploadFile = File(...), api_key: str = Form(None)):
    """Save uploaded video and launch the Smartspectra helper container with the file mounted.

    Returns the websocket URL and container start status.
    """
    uploads_dir = Path("native-helper/uploads")
    uploads_dir.mkdir(parents=True, exist_ok=True)

    safe_name = Path(file.filename).name
    if not safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename")

    dest_path = uploads_dir / safe_name
    # Write file to disk
    with dest_path.open("wb") as f:
        contents = await file.read()
        f.write(contents)

    # Determine API key
    if not api_key:
        api_key = os.environ.get("PRESAGE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="API key must be provided as form field or PRESAGE_API_KEY env var")

    # Build docker command to run helper with mounted file
    host_path = str(dest_path.resolve())
    container_input_path = "/input/video.mp4"
    container_name = f"smartspectra_run_{int(time.time())}"

    cmd = [
        "docker", "run", "--rm", "-d",
        "-p", "8765:8765",
        "-v", f"{host_path}:{container_input_path}:ro",
        "--name", container_name,
        "smartspectra-helper",
        api_key,
        container_input_path,
    ]

    try:
        proc = subprocess.run(cmd, check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Failed to start helper container: {e.stderr.decode()}")

    return {
        "status": "started",
        "websocket_url": "ws://localhost:8765",
        "saved_path": host_path,
        "container_name": container_name,
    }
