"""Tests of backend/report_service.py and backend/notify.py (no network, no FastAPI needed)."""

import os
import unittest
from datetime import datetime, timezone
from unittest import mock

from backend import notify
from backend import report_service as svc
from backend.suggestion_service import SuggestionError

NOW = datetime(2026, 10, 23, tzinfo=timezone.utc)


class BuildReportTest(unittest.TestCase):
    def test_record_shape_has_no_personal_data(self):
        r = svc.build_report("corail-rouge", "Corail Rouge", "source-manquante", "Il manque la source du seuil de 28 °C.", "https://doi.org/10.1/x", now=NOW)
        self.assertEqual(set(r), {"received_at", "species_id", "species_name", "kind", "message", "source_url", "status"})
        self.assertEqual(r["status"], "à vérifier")

    def test_rejects_unknown_species_id_and_kind(self):
        for bad_id in ("", "Corail", "../etc/passwd", "a b", "x" * 61, "corail\nrouge"):
            with self.assertRaises(SuggestionError, msg=repr(bad_id)):
                svc.build_report(bad_id, "", "autre", "message assez long")
        with self.assertRaises(SuggestionError):
            svc.build_report("corail-rouge", "", "spam", "message assez long")

    def test_message_is_required_and_cleaned(self):
        with self.assertRaises(SuggestionError):
            svc.build_report("corail-rouge", "", "autre", "  court ​ ")
        r = svc.build_report("corail-rouge", "", "autre", "=cmd|' /C calc'!A0 suffisamment long")
        self.assertTrue(r["message"].startswith("'"))

    def test_source_url_must_be_http(self):
        for bad in ("javascript:alert(1)", "ftp://x.org/a", "https://user:pw@x.org", "https://", "data:text/html,x"):
            with self.assertRaises(SuggestionError, msg=bad):
                svc.build_report("corail-rouge", "", "source-erronee", "le lien est mort depuis 2025", bad)
        self.assertEqual(svc.build_report("corail-rouge", "", "autre", "message assez long", "")["source_url"], "")

    def test_subject_only_contains_validated_values(self):
        r = svc.build_report("corail-rouge", "Corail\nBcc: x@evil", "autre", "message assez long", now=NOW)
        subject, body = svc.describe(r)
        self.assertEqual(subject, "[Camarine] Autre : corail-rouge")
        self.assertNotIn("\n", r["species_name"])  # single-line field
        self.assertIn("message assez long", body)

    def test_rate_limit(self):
        svc._limiter._recent.clear()
        allowed = [svc.allow_request("c", now=float(i)) for i in range(6)]
        self.assertEqual(allowed, [True] * 5 + [False])


class NotifyTest(unittest.TestCase):
    def setUp(self):
        notify._sent.clear()

    def test_nothing_configured_sends_nothing(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertEqual(notify.channels(), [])
            self.assertFalse(notify.notify("s", "b", background=False))

    def test_email_uses_env_only(self):
        env = {"CAMARINE_SMTP_HOST": "smtp.example.org", "CAMARINE_SMTP_USER": "bot@example.org", "CAMARINE_SMTP_PASSWORD": "pw", "CAMARINE_NOTIFY_TO": "a@example.org, b@example.org"}
        with mock.patch.dict(os.environ, env, clear=True), mock.patch("smtplib.SMTP") as smtp:
            self.assertTrue(notify.notify("[Camarine] Autre : corail-rouge", "corps", background=False))
            server = smtp.return_value
            smtp.return_value.starttls.assert_called_once()
            server.login.assert_called_once_with("bot@example.org", "pw")
            msg = server.send_message.call_args.args[0]
            self.assertEqual(msg["To"], "a@example.org, b@example.org")
            self.assertEqual(msg["From"], "bot@example.org")

    def test_smtp_failure_does_not_raise(self):
        env = {"CAMARINE_SMTP_HOST": "smtp.example.org", "CAMARINE_NOTIFY_TO": "a@example.org"}
        with mock.patch.dict(os.environ, env, clear=True), mock.patch("smtplib.SMTP", side_effect=OSError("down")):
            self.assertTrue(notify.notify("s", "b", background=False))

    def test_hourly_quota(self):
        with mock.patch.dict(os.environ, {"CAMARINE_NOTIFY_WEBHOOK": "https://ntfy.sh/x"}, clear=True), mock.patch.object(notify, "send_webhook") as hook:
            sent = [notify.notify("s", "b", background=False) for _ in range(notify.MAX_PER_HOUR + 3)]
            self.assertEqual(sent.count(True), notify.MAX_PER_HOUR)
            self.assertEqual(hook.call_count, notify.MAX_PER_HOUR)

    def test_webhook_requires_https(self):
        with mock.patch.dict(os.environ, {"CAMARINE_NOTIFY_WEBHOOK": "http://ntfy.sh/x"}, clear=True):
            with self.assertRaises(ValueError):
                notify.send_webhook("s", "b")


if __name__ == "__main__":
    unittest.main()
