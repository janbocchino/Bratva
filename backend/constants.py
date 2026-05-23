import os

# ML Model paths
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL")
POWER_MODEL = os.getenv("POWER_MODEL")


# Worker configuration
PRICE_UPDATE_INTERVAL = float(os.getenv("PRICE_UPDATE_INTERVAL", "1.0"))  # seconds

# beginning of LLM written Code, Model: GPT-5.5
# Shared with Next/Drizzle; backend.main loads root .env before importing the worker.
DATABASE_URL = os.environ["DATABASE_URL"]
# end of LLM written Code

