import time
import threading
import logging
from pynput import keyboard, mouse

logger = logging.getLogger("agent.idle")

class IdleDetector:
    def __init__(self, threshold_seconds: int = 600):
        self.threshold = threshold_seconds
        self.last_activity = time.time()
        self.is_idle = False
        self._lock = threading.Lock()
        self._on_idle_start = None
        self._on_idle_end = None

    def set_callbacks(self, on_idle_start=None, on_idle_end=None):
        self._on_idle_start = on_idle_start
        self._on_idle_end = on_idle_end

    def _on_input(self, *args):
        with self._lock:
            self.last_activity = time.time()
            if self.is_idle:
                self.is_idle = False
                logger.info("User activity resumed")
                if self._on_idle_end:
                    threading.Thread(target=self._on_idle_end, daemon=True).start()

    def start(self):
        """Start keyboard and mouse listeners in background."""
        keyboard_listener = keyboard.Listener(on_press=self._on_input)
        mouse_listener = mouse.Listener(on_move=self._on_input, on_click=self._on_input)
        keyboard_listener.daemon = True
        mouse_listener.daemon = True
        keyboard_listener.start()
        mouse_listener.start()
        logger.info(f"Idle detector started (threshold: {self.threshold}s)")

        # Start idle check loop
        thread = threading.Thread(target=self._check_loop, daemon=True)
        thread.start()

    def _check_loop(self):
        while True:
            time.sleep(5)
            with self._lock:
                elapsed = time.time() - self.last_activity
                if not self.is_idle and elapsed >= self.threshold:
                    self.is_idle = True
                    logger.info(f"User idle for {int(elapsed)}s")
                    if self._on_idle_start:
                        threading.Thread(target=self._on_idle_start, daemon=True).start()

    @property
    def idle_seconds(self) -> float:
        with self._lock:
            return time.time() - self.last_activity
