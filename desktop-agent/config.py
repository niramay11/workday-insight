import json
import os
import sys

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

def load_config() -> dict:
    if not os.path.exists(CONFIG_FILE):
        print(f"ERROR: Config file not found at {CONFIG_FILE}")
        print("Copy config.example.json to config.json and fill in your details.")
        sys.exit(1)
    with open(CONFIG_FILE, "r") as f:
        cfg = json.load(f)
    required = ["api_url", "api_key", "user_id"]
    for key in required:
        if not cfg.get(key) or cfg[key].startswith("YOUR_"):
            print(f"ERROR: Please set '{key}' in config.json")
            sys.exit(1)
    cfg.setdefault("screenshot_interval_seconds", 300)
    cfg.setdefault("idle_threshold_seconds", 600)
    return cfg
