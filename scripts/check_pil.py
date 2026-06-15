import sys
print(f"Python: {sys.version}", flush=True)
try:
    from PIL import Image
    print(f"Pillow OK: {Image.__version__}", flush=True)
except ImportError as e:
    print(f"Pillow MISSING: {e}", flush=True)
