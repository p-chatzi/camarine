"""Tests of backend/suggestion_service.py (no FastAPI needed)."""

import json
import os
import stat
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

from backend import suggestion_service as svc


class CleanTextTest(unittest.TestCase):
    def test_removes_control_and_invisible_characters(self):
        # NUL, ESC (terminal escape), bidi override (Trojan Source), zero-width space, BOM
        raw = "Ours\x00in\x1b[31m ‮vio​let﻿"
        self.assertEqual(svc.clean_text(raw, 120, multiline=False), "Oursin[31m violet")

    def test_single_line_fields_drop_newlines(self):
        self.assertEqual(svc.clean_text("Mérou\nbrun", 120, multiline=False), "Mérou brun")

    def test_multiline_keeps_newlines_but_caps_blank_lines(self):
        cleaned = svc.clean_text("ligne 1\r\n\r\n\r\n\r\nligne 2\tfin", 2000, multiline=True)
        self.assertEqual(cleaned, "ligne 1\n\nligne 2 fin")

    def test_caps_number_of_lines(self):
        cleaned = svc.clean_text("x\n" * 100, 2000, multiline=True)
        self.assertEqual(cleaned.count("\n"), svc.MAX_NEWLINES - 1)

    def test_neutralises_spreadsheet_formulas(self):
        for payload in ("=HYPERLINK(\"http://evil\")", "+1+1", "-2", "@SUM(A1)"):
            self.assertTrue(svc.clean_text(payload, 120, multiline=False).startswith("'"), payload)

    def test_nfc_normalisation(self):
        decomposed = "Éponge"  # É written as E + combining acute
        self.assertEqual(svc.clean_text(decomposed, 120, multiline=False), "Éponge")

    def test_length_cap_after_cleaning(self):
        self.assertEqual(len(svc.clean_text("a" * 5000, svc.MESSAGE_MAX, multiline=True)), svc.MESSAGE_MAX)


class BuildRecordTest(unittest.TestCase):
    def test_record_shape_has_no_personal_data(self):
        record = svc.build_record("  Oursin violet ", "Vu à Marseille", now=datetime(2026, 10, 22, tzinfo=timezone.utc))
        self.assertEqual(set(record), {"received_at", "species_name", "message", "status"})
        self.assertEqual(record["species_name"], "Oursin violet")
        self.assertEqual(record["received_at"], "2026-10-22T00:00:00+00:00")

    def test_rejects_names_without_letters(self):
        for bad in (" \x07 ", "12", "!!", "​​"):
            with self.assertRaises(svc.SuggestionError, msg=repr(bad)):
                svc.build_record(bad, "")

    def test_html_is_stored_as_inert_text(self):
        record = svc.build_record("<script>alert(1)</script>", "<img src=x onerror=alert(1)>")
        line = json.dumps(record, ensure_ascii=False)
        self.assertEqual(json.loads(line)["species_name"], "<script>alert(1)</script>")  # kept as text, never rendered as HTML


class AppendRecordTest(unittest.TestCase):
    def test_one_json_line_per_record_even_with_newlines(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "sub" / "suggestions.jsonl"
            svc.append_record({"species_name": "Éponge", "message": "a\nb"}, path)
            svc.append_record({"species_name": "Nacre", "message": ""}, path)
            lines = path.read_text(encoding="utf-8").splitlines()
            self.assertEqual([json.loads(line)["species_name"] for line in lines], ["Éponge", "Nacre"])
            if os.name == "posix":
                self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)

    def test_refuses_when_file_is_full(self):
        with tempfile.TemporaryDirectory() as tmp, mock.patch.object(svc, "MAX_FILE_BYTES", 60):
            path = Path(tmp) / "s.jsonl"
            svc.append_record({"species_name": "A" * 20}, path)
            with self.assertRaises(svc.StorageFullError):
                svc.append_record({"species_name": "B" * 20}, path)


class RateLimitTest(unittest.TestCase):
    def setUp(self):
        svc._recent.clear()

    def test_sliding_window(self):
        allowed = [svc.allow_request("client", now=float(i)) for i in range(svc.RATE_LIMIT + 1)]
        self.assertEqual(allowed, [True] * svc.RATE_LIMIT + [False])
        self.assertTrue(svc.allow_request("client", now=svc.RATE_WINDOW_S + 10.0))

    def test_memory_is_bounded(self):
        with mock.patch.object(svc, "MAX_TRACKED_CLIENTS", 3):
            for i in range(10):
                svc.allow_request(f"client-{i}", now=0.0)
            self.assertEqual(list(svc._recent), ["client-7", "client-8", "client-9"])


if __name__ == "__main__":
    unittest.main()
