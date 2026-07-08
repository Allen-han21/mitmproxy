"""Mock response addon - intercepts requests and returns configured mock responses.

Rules are persisted to ~/.config/mitmios/mock_responses.json.
Managed via the web UI (/mock-rules API).
"""

import json
import logging
from pathlib import Path

from mitmproxy import http

logger = logging.getLogger(__name__)

CONFIG_PATH = Path.home() / ".config" / "mitmios" / "mock_responses.json"


class MockResponseAddon:
    def __init__(self):
        self.rules: list[dict] = []
        self._load_from_disk()

    def _load_from_disk(self):
        if not CONFIG_PATH.exists():
            self.rules = []
            return
        try:
            data = json.loads(CONFIG_PATH.read_text())
            self.rules = data.get("rules", []) if data else []
        except Exception as e:
            logger.warning(f"[mock] Failed to load rules: {e}")
            self.rules = []

    def _save_to_disk(self):
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        data = {"rules": self.rules}
        CONFIG_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2))

    def get_rules(self) -> list[dict]:
        return self.rules

    def set_rules(self, rules: list[dict]):
        self.rules = rules
        self._save_to_disk()

    def request(self, flow: http.HTTPFlow) -> None:
        for rule in self.rules:
            if not rule.get("enabled", True):
                continue
            if rule.get("url_pattern", "") in flow.request.pretty_url:
                status = rule.get("status_code", 500)
                body = rule.get("body", "")
                flow.response = http.Response.make(
                    status,
                    body.encode(),
                    {"Content-Type": "application/json"},
                )
                logger.info(f"[mock] {flow.request.pretty_url} -> {status}")
                return
