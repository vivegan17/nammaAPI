import os
import sys

# Ensure root directory is on Python path for Vercel serverless functions
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from server import app

# Vercel entrypoint
if __name__ == "__main__":
    app.run()
