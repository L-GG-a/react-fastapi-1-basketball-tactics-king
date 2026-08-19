"""One-command launcher for the packaged Python project."""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PACKAGE_DIR = ROOT / "python_packages"
if (PACKAGE_DIR / "fastapi" / "__init__.py").exists():
    sys.path.insert(0, str(PACKAGE_DIR))

import uvicorn

if __name__ == "__main__":
    os.environ.setdefault("BASELINE_DB", str(ROOT / "baseline.db"))
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=False)
