import os

# ML Model paths
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "models/gte-base")
POWER_MODEL = os.getenv("POWER_MODEL", "models/powerModel/model_1768577407.6430953.safetensors")


# Worker configuration
PRICE_UPDATE_INTERVAL = float(os.getenv("PRICE_UPDATE_INTERVAL", "1.0"))  # seconds

# beginning of LLM written Code, Model: gpt-5.3-codex
# Local ingestion bridge configuration
BACKEND_FASTAPI_HOST = os.getenv("BACKEND_FASTAPI_HOST", "127.0.0.1")
BACKEND_FASTAPI_PORT = int(os.getenv("BACKEND_FASTAPI_PORT", "8010"))
FASTAPI_MODEL_PRICE_URL = os.getenv(
    "FASTAPI_MODEL_PRICE_URL",
    f"http://{BACKEND_FASTAPI_HOST}:{BACKEND_FASTAPI_PORT}/model-prices",
)
FASTAPI_MODEL_PRICE_TOKEN = os.getenv("FASTAPI_MODEL_PRICE_TOKEN", "")
# end of LLM written Code

