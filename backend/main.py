"""Main entry point for backend services."""

# beginning of LLM written Code, Model: GPT-5.5
from pathlib import Path

from dotenv import load_dotenv


def main():
    repo_root = Path(__file__).resolve().parents[1]
    load_dotenv(repo_root / ".env")

    from backend.worker import PriceWorker

    worker = PriceWorker()
    worker.run()
# end of LLM written Code


if __name__ == "__main__":
    main()
