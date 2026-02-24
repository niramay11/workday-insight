import base64
import io
import logging
from mss import mss
from PIL import Image

logger = logging.getLogger("agent.screenshot")

def capture_screenshot() -> str | None:
    """Capture full desktop screenshot, return base64 PNG string."""
    try:
        with mss() as sct:
            monitor = sct.monitors[0]  # Full virtual screen
            img = sct.grab(monitor)
            pil_image = Image.frombytes("RGB", img.size, img.bgra, "raw", "BGRX")
            # Resize to max 1920px wide for bandwidth
            max_w = 1920
            if pil_image.width > max_w:
                ratio = max_w / pil_image.width
                new_size = (max_w, int(pil_image.height * ratio))
                pil_image = pil_image.resize(new_size, Image.LANCZOS)
            buffer = io.BytesIO()
            pil_image.save(buffer, format="PNG", optimize=True)
            b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
            logger.info(f"Screenshot captured ({len(b64) // 1024} KB base64)")
            return b64
    except Exception as e:
        logger.error(f"Screenshot failed: {e}")
        return None
