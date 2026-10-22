"""Tests of backend/suggestion_service.py (no FastAPI needed)."""

import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from backend import suggestion_service as svc


class SuggestionServiceTest(unittest.TestCase):
    def test_build_record_cleans_and_caps(self):
        record = svc.build_record("  Oursin\x00 violet\x1b ", "x" * 5000, now=datetime(2026, 10, 22, tzinfo=timezone.utc))
        self.assertEqual(record["species_name"], "Oursin violet")
        self.assertEqual(len(record["message"]), svc.MESSAGE_MAX)
        self.assertEqual(record["received_at"], "2026-10-22T00:00:00+00:00")
        self.assertNotIn("ip", record)

    def test_build_record_keeps_newlines(self):
        record = svc.build_record("Mérou", "ligne 1\nligne 2")
        self.assertEqual(record["message"], "ligne 1\nligne 2")

    def test_build_record_rejects_empty_name(self):
        with self.assertRaises(svc.SuggestionError):
            svc.build_record(" \x07 ", "texte")

    def test_append_record_writes_one_json_line(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "sub" / "suggestions.jsonl"
            svc.append_record({"species_name": "Éponge"}, path)
            svc.append_record({"species_name": "Nacre"}, path)
            lines = path.read_text(encoding="utf-8").splitlines()
            self.assertEqual([json.loads(line)["species_name"] for line in lines], ["Éponge", "Nacre"])

    def test_rate_limit_sliding_window(self):
        key = "test-client"
        svc._recent.pop(key, None)
        allowed = [svc.allow_request(key, now=float(i)) for i in range(svc.RATE_LIMIT + 1)]
        self.assertEqual(allowed, [True] * svc.RATE_LIMIT + [False])
        self.assertTrue(svc.allow_request(key, now=svc.RATE_WINDOW_S + 10.0))


if __name__ == "__main__":
    unittest.main()
