# beginning of LLM written Code, Model: gpt-5.3-codex
"""Local FastAPI bridge for model-price ingestion into Next.js."""

import json
from typing import Any, Dict, List
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator

from backend.constants import BACKEND_FASTAPI_HOST, BACKEND_FASTAPI_PORT, NEXT_MODEL_PRICE_INGEST_URL


class ModelPriceRow(BaseModel):
    assetTicker: str
    priceCents: int = Field(ge=0)
    timestamp: float

    @field_validator("assetTicker")
    @classmethod
    def normalize_ticker(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized:
            raise ValueError("assetTicker must be non-empty")
        return normalized


app = FastAPI(title="Bratva Local Price Ingest API")


def _forward_to_next(batch: List[Dict[str, Any]]) -> Dict[str, Any]:
    payload = json.dumps(batch).encode("utf-8")
    request = Request(
        NEXT_MODEL_PRICE_INGEST_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=10.0) as response:
            body = response.read().decode("utf-8")
            if not body:
                return {"status": response.status, "payload": {"ok": True}}
            return {
                "status": response.status,
                "payload": json.loads(body),
            }
    except HTTPError as error:
        error_body = error.read().decode("utf-8")
        return {
            "status": error.code,
            "payload": {
                "ok": False,
                "error": error_body or "Next.js ingestion endpoint returned an error",
            },
        }
    except URLError as error:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to reach Next.js ingestion endpoint: {error.reason}",
        ) from error


@app.post("/model-prices")
def ingest_model_prices(rows: List[ModelPriceRow]) -> Dict[str, Any]:
    forward_result = _forward_to_next([row.model_dump() for row in rows])
    status = int(forward_result["status"])

    if status >= 400:
        raise HTTPException(
            status_code=502,
            detail={
                "cause": "Next.js ingestion endpoint returned a non-success status",
                "status": status,
                "response": forward_result["payload"],
            },
        )

    return {
        "ok": True,
        "forwardedRows": len(rows),
        "nextResponse": forward_result["payload"],
    }


def main() -> None:
    uvicorn.run(app, host=BACKEND_FASTAPI_HOST, port=BACKEND_FASTAPI_PORT, log_level="info")


if __name__ == "__main__":
    main()
# end of LLM written Code
