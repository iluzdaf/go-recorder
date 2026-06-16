"""FastAPI entrypoint for the Go board-detection service."""

from __future__ import annotations

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from .detection import DetectionError, detect_board, parse_corners
from .schemas import DetectionResult

app = FastAPI(title="Go Board Detection", version="1.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/detect", response_model=DetectionResult)
async def detect(
    image: UploadFile = File(...),
    corners: str = Form(...),
) -> DetectionResult:
    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image upload")

    try:
        corner_points = parse_corners(corners)
        return detect_board(raw, corner_points)
    except DetectionError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
