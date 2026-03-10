import os

# ML Model paths
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "models/gte-base")
POWER_MODEL = os.getenv("POWER_MODEL", "models/powerModel/model_1768577407.6430953.safetensors")


# Worker configuration
PRICE_UPDATE_INTERVAL = float(os.getenv("PRICE_UPDATE_INTERVAL", "1.0"))  # seconds

