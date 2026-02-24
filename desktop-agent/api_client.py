import requests
import logging

logger = logging.getLogger("agent.api")

class ApiClient:
    def __init__(self, api_url: str, api_key: str, user_id: str):
        self.api_url = api_url
        self.api_key = api_key
        self.user_id = user_id

    def send(self, action: str, data: dict = None) -> dict | None:
        payload = {"action": action, "user_id": self.user_id}
        if data:
            payload["data"] = data
        try:
            resp = requests.post(
                self.api_url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=30,
            )
            if resp.status_code == 200:
                logger.info(f"Action '{action}' sent successfully")
                return resp.json()
            else:
                logger.error(f"API error {resp.status_code}: {resp.text}")
                return None
        except requests.RequestException as e:
            logger.error(f"Network error: {e}")
            return None
