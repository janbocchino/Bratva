"""Main entry point for backend services."""
from backend.worker import PriceWorker


def main():
    worker = PriceWorker()
    worker.run()


if __name__ == "__main__":
    main()
