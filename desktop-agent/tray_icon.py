import threading
import logging
from PIL import Image, ImageDraw

logger = logging.getLogger("agent.tray")

try:
    import pystray
    HAS_TRAY = True
except ImportError:
    HAS_TRAY = False
    logger.warning("pystray not available, running without system tray")

def _create_icon_image(color: str) -> Image.Image:
    colors = {"green": "#22c55e", "yellow": "#eab308", "red": "#ef4444", "gray": "#6b7280"}
    img = Image.new("RGB", 64, 64)
    img = Image.new("RGB", (64, 64), "#1e293b")
    draw = ImageDraw.Draw(img)
    draw.ellipse([12, 12, 52, 52], fill=colors.get(color, "#6b7280"))
    return img

class TrayIcon:
    def __init__(self, on_quit=None):
        self._icon = None
        self._on_quit = on_quit

    def start(self):
        if not HAS_TRAY:
            return
        menu = pystray.Menu(
            pystray.MenuItem("TimeTrack Agent", None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Quit", self._quit),
        )
        self._icon = pystray.Icon("timetrack", _create_icon_image("green"), "TimeTrack Agent", menu)
        thread = threading.Thread(target=self._icon.run, daemon=True)
        thread.start()
        logger.info("System tray icon started")

    def set_status(self, status: str):
        if self._icon:
            color_map = {"active": "green", "idle": "yellow", "disconnected": "red", "offline": "gray"}
            self._icon.icon = _create_icon_image(color_map.get(status, "gray"))
            self._icon.title = f"TimeTrack - {status.capitalize()}"

    def _quit(self, icon, item):
        if self._on_quit:
            self._on_quit()
        if self._icon:
            self._icon.stop()

    def stop(self):
        if self._icon:
            self._icon.stop()
