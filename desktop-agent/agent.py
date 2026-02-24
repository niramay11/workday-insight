#!/usr/bin/env python3
"""
TimeTrack Desktop Agent
Captures screenshots, detects idle time, and reports to the TimeTrack backend.
"""
import time
import sys
import signal
import logging
import threading

from config import load_config
from api_client import ApiClient
from screenshot import capture_screenshot
from idle_detector import IdleDetector
from tray_icon import TrayIcon

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("agent")

class TimeTrackAgent:
    def __init__(self):
        self.config = load_config()
        self.api = ApiClient(
            self.config["api_url"],
            self.config["api_key"],
            self.config["user_id"],
        )
        self.idle_detector = IdleDetector(self.config["idle_threshold_seconds"])
        self.tray = TrayIcon(on_quit=self.stop)
        self.running = False
        self._screenshot_timer = None

    def start(self):
        logger.info("TimeTrack Agent starting...")
        self.running = True

        # Set up idle detection callbacks
        self.idle_detector.set_callbacks(
            on_idle_start=self._handle_idle_start,
            on_idle_end=self._handle_idle_end,
        )
        self.idle_detector.start()

        # Start system tray
        self.tray.start()
        self.tray.set_status("active")

        # Start screenshot loop
        self._schedule_screenshot()

        logger.info(
            f"Agent running. Screenshots every {self.config['screenshot_interval_seconds']}s, "
            f"idle threshold {self.config['idle_threshold_seconds']}s"
        )

        # Keep main thread alive
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop()

    def stop(self):
        logger.info("Agent stopping...")
        self.running = False
        if self._screenshot_timer:
            self._screenshot_timer.cancel()
        self.tray.stop()
        sys.exit(0)

    def _schedule_screenshot(self):
        if not self.running:
            return
        self._take_and_send_screenshot()
        self._screenshot_timer = threading.Timer(
            self.config["screenshot_interval_seconds"],
            self._schedule_screenshot,
        )
        self._screenshot_timer.daemon = True
        self._screenshot_timer.start()

    def _take_and_send_screenshot(self):
        if self.idle_detector.is_idle:
            logger.debug("Skipping screenshot while idle")
            return
        b64 = capture_screenshot()
        if b64:
            result = self.api.send("screenshot", {"image_base64": b64})
            if result:
                self.tray.set_status("active")
            else:
                self.tray.set_status("disconnected")

    def _handle_idle_start(self):
        self.tray.set_status("idle")
        self.api.send("idle_start")

    def _handle_idle_end(self):
        self.tray.set_status("active")
        self.api.send("idle_end")


if __name__ == "__main__":
    signal.signal(signal.SIGINT, lambda *_: sys.exit(0))
    agent = TimeTrackAgent()
    agent.start()
