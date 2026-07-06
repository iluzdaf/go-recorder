"""FastAPI entrypoint for the Go board-detection service."""

from __future__ import annotations

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .auth import require_api_key
from .corner_estimation import estimate_corners
from .detection import DetectionError, detect_board, parse_corners
from .schemas import CornerEstimate, CornerPoint, DetectionResult

app = FastAPI(title="Go Board Detection", version="1.0.0")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    # Treat missing/invalid form fields as malformed input (400), matching the
    # documented contract, rather than FastAPI's default 422.
    return JSONResponse(status_code=400, content={"detail": "Invalid request"})


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/detect", response_model=DetectionResult)
async def detect(
    image: UploadFile = File(...),
    corners: str = Form(...),
    _: None = Depends(require_api_key),
) -> DetectionResult:
    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image upload")

    try:
        corner_points = parse_corners(corners)
        return detect_board(raw, corner_points)
    except DetectionError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/detect-corners", response_model=CornerEstimate)
async def detect_corners(
    image: UploadFile = File(...),
    _: None = Depends(require_api_key),
) -> CornerEstimate:
    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image upload")

    try:
        estimated = estimate_corners(raw)
    except DetectionError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    if estimated is None:
        return CornerEstimate(corners=None)
    return CornerEstimate(
        corners=[CornerPoint(x=x, y=y) for x, y in estimated]
    )
