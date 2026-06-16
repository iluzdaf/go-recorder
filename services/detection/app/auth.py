"""Optional shared-secret authentication for the detection endpoint.

When ``DETECTION_API_KEY`` is set in the environment, ``POST /detect`` requires a
matching ``X-API-Key`` header. When it is unset (local development and tests),
no authentication is enforced. ``/health`` is always open for readiness probes.
"""

from __future__ import annotations

import hmac
import os

from fastapi import Header, HTTPException


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    expected = os.environ.get("DETECTION_API_KEY")
    if not expected:
        return
    if not x_api_key or not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
