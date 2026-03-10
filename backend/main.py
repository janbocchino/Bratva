"""Main entry point for backend services."""
import argparse
from backend.worker import PriceWorker
from backend.samples import samples


def main():
    print(f"Running with {len(samples)} sample(s)")
    
    worker = PriceWorker(samples=samples)
    worker.run()


if __name__ == "__main__":
    main()
