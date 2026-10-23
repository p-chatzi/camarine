"""Forum API tests (FastAPI TestClient, temporary SQLite database, no network).

Run: python -m unittest tests/test_forum.py
"""

import hashlib
import os
import re
import tempfile
import time
import unittest
from unittest import mock

_TMP = tempfile.mkdtemp(prefix="camarine-forum-test-")
os.environ.update(
    CAMARINE_DEV="1",
    CAMARINE_FORUM_DIR=_TMP,
    CAMARINE_FORUM_DB=f"sqlite:///{_TMP}/forum.db",
    CAMARINE_CHECK_BREACHED_PASSWORDS="0",
    CAMARINE_PUBLIC_URL="http://localhost:5173",
    CAMARINE_COOKIE_SECURE="0",
)

import sys  # noqa: E402
import types  # noqa: E402

# The map / time-series services need the Copernicus toolbox: not needed to test the forum.
for _name, _fn in (("backend.map_service", "get_map_payload"), ("backend.mhw_service", "get_mhw_payload")):
    if _name not in sys.modules:
        try:
            __import__(_name)
        except ImportError:
            _mod = types.ModuleType(_name)
            setattr(_mod, _fn, lambda *a, **k: {})
            sys.modules[_name] = _mod

import pyotp  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from backend.forum import antibot, auth, mfa, security, sso  # noqa: E402
from backend.forum.db import AuditLog, SecurityEvent, User, new_session  # noqa: E402
from backend.main import app  # noqa: E402

PASSWORD = "Une phrase de passe assez longue pour Camarine 2026"
HEADERS = {"X-Camarine": "1"}


def solve(challenge: dict) -> dict:
    nonce = 0
    while True:
        digest = hashlib.sha256((challenge["salt"] + str(nonce)).encode()).digest()
        if antibot._leading_zero_bits(digest) >= challenge["bits"]:
            return {**challenge, "nonce": str(nonce)}
        nonce += 1


class ForumTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.patch = mock.patch.object(antibot, "DIFFICULTY", 8)  # fast in tests (18 in production)
        cls.patch.start()
        cls.ctx = TestClient(app, base_url="http://localhost:5173")
        cls.ctx.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.ctx.__exit__(None, None, None)
        cls.patch.stop()

    def setUp(self):
        for limiter in (antibot.signup_limiter, antibot.login_limiter, antibot.reset_limiter, antibot.post_limiter, antibot.report_limiter):
            limiter._recent.clear()

    # --- helpers
    def client(self) -> TestClient:
        return TestClient(app, base_url="http://localhost:5173")

    def csrf(self, c: TestClient) -> dict:
        me = c.get("/api/forum/me").json()
        return {**HEADERS, "X-CSRF-Token": me["csrf"]} if me.get("user") else HEADERS

    def post(self, c: TestClient, url: str, json: dict | None = None, **kw):
        return c.post(url, json=json if json is not None else {}, headers=self.csrf(c), **kw)

    def register(self, c: TestClient, email: str, name: str, password: str = PASSWORD, **extra):
        pow_ = solve(c.get("/api/forum/auth/pow?purpose=signup").json())
        body = {"email": email, "password": password, "display_name": name, "accept": True, "pow": pow_, "elapsed_ms": 5000, **extra}
        return c.post("/api/forum/auth/register", json=body, headers=HEADERS)

    def last_link(self, to: str) -> str:
        for rcpt, _subject, body in reversed(auth.OUTBOX):
            if rcpt == to:
                return re.search(r"token=([\w\-]+)", body).group(1)
        raise AssertionError(f"no e-mail to {to}")

    def verified_user(self, email: str, name: str) -> TestClient:
        c = self.client()
        self.assertEqual(self.register(c, email, name).status_code, 201)
        r = self.post(c, "/api/forum/auth/verify-email", {"token": self.last_link(email)})
        self.assertTrue(r.json()["logged_in"])
        return c

    def set_role(self, email: str, role: str):
        with new_session() as db:
            u = db.query(User).filter_by(email_norm=email.casefold()).one()
            u.role = role
            db.commit()


class PasswordPolicyTest(unittest.TestCase):
    def test_length_and_strength(self):
        with self.assertRaises(security.InputError):
            security.check_password_policy("court")
        with self.assertRaises(security.InputError):
            security.check_password_policy("motdepasse123")  # weak
        with self.assertRaises(security.InputError):
            security.check_password_policy("x" * 257)
        security.check_password_policy("correct cheval agrafe batterie ✨ 2026")
        security.check_password_policy("é" * 5 + " " + "a8Zq!" * 15)  # 80+ characters, unicode: fine

    def test_personal_data_refused(self):
        with self.assertRaises(security.InputError):
            security.check_password_policy("jean.dupont-mer-bleue-2026!", email="jean.dupont@example.org")

    def test_argon2id_and_normalisation(self):
        h = security.hash_password("ﬁlet de pêche très long 2026")  # "ﬁ" ligature
        self.assertTrue(h.startswith("$argon2id$"))
        self.assertTrue(security.verify_password(h, "filet de pêche très long 2026"))  # NFKC
        self.assertFalse(security.verify_password(h, "filet de peche tres long 2026"))
        self.assertFalse(security.verify_password(None, "anything"))

    def test_display_names(self):
        self.assertEqual(security.clean_display_name("  Marie   Curie ")[0], "Marie Curie")
        self.assertEqual(security.clean_display_name("a\u202eb\u200bc d")[0], "abc d")  # invisible chars removed
        for bad in ("ab", "<script>", "Admin", "1234", "x" * 31):
            with self.assertRaises(security.InputError, msg=bad):
                security.clean_display_name(bad)


class AntiBotTest(unittest.TestCase):
    def test_challenge_is_signed_single_use_and_expires(self):
        ch = solve(antibot.new_challenge("signup"))
        self.assertFalse(antibot.verify_challenge({**ch, "bits": 1}, "signup"))  # tampered
        self.assertFalse(antibot.verify_challenge(ch, "reset"))  # wrong purpose
        self.assertTrue(antibot.verify_challenge(ch, "signup"))
        self.assertFalse(antibot.verify_challenge(ch, "signup"))  # replay
        late = solve(antibot.new_challenge("signup"))
        self.assertFalse(antibot.verify_challenge(late, "signup", now=time.time() + 3600))


class AccountFlowTest(ForumTestCase):
    def test_signup_verify_login_logout(self):
        c = self.client()
        r = self.register(c, "alice@example.org", "Alice")
        self.assertEqual(r.status_code, 201)
        self.assertIsNone(c.get("/api/forum/me").json()["user"])  # not logged in before confirmation
        r = self.post(c, "/api/forum/auth/verify-email", {"token": self.last_link("alice@example.org")})
        me = c.get("/api/forum/me").json()
        self.assertEqual(me["user"]["display_name"], "Alice")
        self.assertTrue(me["user"]["email_verified"])
        cookie = c.cookies.get("camarine_session")
        self.post(c, "/api/forum/auth/logout")
        self.assertIsNone(c.get("/api/forum/me").json()["user"])
        r = self.post(c, "/api/forum/auth/login", {"email": "ALICE@example.org", "password": PASSWORD})
        self.assertEqual(r.json()["status"], "ok")
        self.assertNotEqual(c.cookies.get("camarine_session"), cookie)  # new session token

    def test_no_enumeration(self):
        self.verified_user("bob@example.org", "Bob")
        c = self.client()
        r = self.register(c, "bob@example.org", "Bobby")
        self.assertEqual(r.status_code, 201)  # same answer as for a new e-mail
        unknown = self.post(c, "/api/forum/auth/login", {"email": "nobody@example.org", "password": PASSWORD})
        wrong = self.post(c, "/api/forum/auth/login", {"email": "bob@example.org", "password": PASSWORD + "x"})
        self.assertEqual((unknown.status_code, unknown.json()), (wrong.status_code, wrong.json()))

    def test_bots_and_csrf(self):
        c = self.client()
        r = self.register(c, "bot@example.org", "Robot", website="http://spam")
        self.assertEqual(r.status_code, 201)  # pretends, creates nothing
        with new_session() as db:
            self.assertIsNone(db.query(User).filter_by(email_norm="bot@example.org").one_or_none())
        r = c.post("/api/forum/auth/login", json={"email": "x@example.org", "password": "x" * 12})  # no X-Camarine
        self.assertEqual(r.status_code, 403)
        u = self.verified_user("carol@example.org", "Carol")
        r = u.post("/api/forum/categories/suggestions/threads", json={"title": "Sans jeton CSRF", "body": "test"}, headers=HEADERS)
        self.assertEqual(r.status_code, 403)

    def test_lockout_after_failures(self):
        self.verified_user("dave@example.org", "Dave")
        c = self.client()
        for _ in range(auth_lock := 5):
            self.post(c, "/api/forum/auth/login", {"email": "dave@example.org", "password": "wrong password 123456"})
        r = self.post(c, "/api/forum/auth/login", {"email": "dave@example.org", "password": PASSWORD})
        self.assertEqual(r.status_code, 429)
        self.assertEqual(auth_lock, 5)

    def test_password_reset_revokes_sessions(self):
        u = self.verified_user("erin@example.org", "Erin")
        c = self.client()
        r = self.post(c, "/api/forum/auth/password/forgot", {"email": "erin@example.org", "pow": solve(c.get("/api/forum/auth/pow?purpose=reset").json())})
        self.assertEqual(r.status_code, 200)
        new = "Un tout nouveau mot de passe très solide 77"
        r = self.post(c, "/api/forum/auth/password/reset", {"token": self.last_link("erin@example.org"), "password": new})
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(u.get("/api/forum/me").json()["user"])  # old session closed
        self.assertEqual(self.post(c, "/api/forum/auth/login", {"email": "erin@example.org", "password": new}).json()["status"], "ok")

    def test_export_and_delete(self):
        u = self.verified_user("fanny@example.org", "Fanny")
        self.post(u, "/api/forum/categories/suggestions/threads", {"title": "Une idée pour la carte", "body": "Ajouter les marées ?"})
        data = u.get("/api/forum/me/export").json()
        self.assertEqual(data["user"]["email"], "fanny@example.org")
        self.assertEqual(len(data["posts"]), 1)
        self.assertNotIn("csrf", data)
        r = self.post(u, "/api/forum/me/delete", {"password": PASSWORD, "confirm": "SUPPRIMER"})
        self.assertEqual(r.status_code, 200)
        threads = self.client().get("/api/forum/categories/suggestions").json()["threads"]
        self.assertEqual(threads[0]["author"]["name"], "Compte supprimé")


class MfaTest(ForumTestCase):
    def test_totp_login_replay_and_recovery(self):
        u = self.verified_user("gina@example.org", "Gina")
        secret = self.post(u, "/api/forum/me/totp/setup").json()["secret"]
        r = self.post(u, "/api/forum/me/totp/confirm", {"code": pyotp.TOTP(secret).now()})
        codes = r.json()["recovery_codes"]
        self.assertEqual(len(codes), 10)
        self.assertTrue(r.json()["mfa"]["totp"])

        c = self.client()
        r = self.post(c, "/api/forum/auth/login", {"email": "gina@example.org", "password": PASSWORD})
        self.assertEqual(r.json(), {"status": "mfa", "methods": ["totp", "recovery"]})
        self.assertIsNone(c.get("/api/forum/me").json()["user"])  # password alone is not enough
        self.assertEqual(self.post(c, "/api/forum/auth/mfa/totp", {"code": "000000"}).status_code, 400)
        # The code used to confirm the setup can't be replayed: use the next time step.
        nxt = pyotp.TOTP(secret).at(time.time() + 30)
        self.assertEqual(self.post(c, "/api/forum/auth/mfa/totp", {"code": nxt}).json()["status"], "ok")
        self.assertIsNotNone(c.get("/api/forum/me").json()["user"])

        c2 = self.client()
        self.post(c2, "/api/forum/auth/login", {"email": "gina@example.org", "password": PASSWORD})
        self.assertEqual(self.post(c2, "/api/forum/auth/mfa/totp", {"code": nxt}).status_code, 400)  # replay refused
        self.assertEqual(self.post(c2, "/api/forum/auth/mfa/recovery", {"code": codes[0].upper()}).json()["status"], "ok")
        c3 = self.client()
        self.post(c3, "/api/forum/auth/login", {"email": "gina@example.org", "password": PASSWORD})
        self.assertEqual(self.post(c3, "/api/forum/auth/mfa/recovery", {"code": codes[0]}).status_code, 400)  # single use

    def test_totp_secret_encrypted_at_rest(self):
        u = self.verified_user("hugo@example.org", "Hugo")
        secret = self.post(u, "/api/forum/me/totp/setup").json()["secret"]
        self.post(u, "/api/forum/me/totp/confirm", {"code": pyotp.TOTP(secret).now()})
        with new_session() as db:
            row = db.query(User).filter_by(email_norm="hugo@example.org").one()
            self.assertNotIn(secret.encode(), row.totp_secret_enc)
            self.assertEqual(security.decrypt(row.totp_secret_enc), secret)

    def test_mfa_attempts_limited(self):
        u = self.verified_user("ines@example.org", "Ines")
        secret = self.post(u, "/api/forum/me/totp/setup").json()["secret"]
        self.post(u, "/api/forum/me/totp/confirm", {"code": pyotp.TOTP(secret).now()})
        c = self.client()
        self.post(c, "/api/forum/auth/login", {"email": "ines@example.org", "password": PASSWORD})
        for _ in range(5):
            self.post(c, "/api/forum/auth/mfa/totp", {"code": "123456"})
        self.assertEqual(self.post(c, "/api/forum/auth/mfa/totp", {"code": pyotp.TOTP(secret).now()}).status_code, 429)

    def test_admin_needs_mfa(self):
        u = self.verified_user("jules@example.org", "Jules")
        self.set_role("jules@example.org", "admin")
        u = self.client()
        self.post(u, "/api/forum/auth/login", {"email": "jules@example.org", "password": PASSWORD})
        r = u.get("/api/forum/admin/overview")
        self.assertEqual(r.status_code, 403)
        self.assertIn("double authentification", r.json()["detail"])


class ForumFlowTest(ForumTestCase):
    def test_categories_include_species(self):
        cats = {c["slug"]: c for c in self.client().get("/api/forum/categories").json()}
        for slug in ("questions", "especes-faune", "especes-flore", "pelagos", "bons-gestes", "suggestions", "espece-posidonie"):
            self.assertIn(slug, cats)
        self.assertEqual(cats["espece-posidonie"]["parent"], "especes-flore")
        self.assertEqual(cats["espece-corail-rouge"]["parent"], "especes-faune")

    def test_qa_proposal_validated_by_scientist(self):
        asker = self.verified_user("kim@example.org", "Kim")
        helper = self.verified_user("leo@example.org", "Leo")
        sci = self.verified_user("marie@example.org", "Marie")
        self.set_role("marie@example.org", "scientist")
        sci = self.client()
        self.post(sci, "/api/forum/auth/login", {"email": "marie@example.org", "password": PASSWORD})

        tid = self.post(asker, "/api/forum/categories/questions/threads", {"title": "Pourquoi la posidonie souffre-t-elle ?", "body": "Question ?"}).json()["id"]
        r = self.post(helper, f"/api/forum/threads/{tid}/posts", {"body": "À cause des canicules marines, je crois."})
        self.assertEqual(r.json()["status"], "pending")
        pid = r.json()["id"]
        anon = self.client().get(f"/api/forum/threads/{tid}").json()
        self.assertEqual([p["kind"] for p in anon["posts"]], ["question"])  # proposal invisible to the public
        self.assertEqual(self.post(asker, f"/api/forum/posts/{pid}/validate").status_code, 403)  # members can't validate
        sci_view = sci.get(f"/api/forum/threads/{tid}").json()
        self.assertTrue(next(p for p in sci_view["posts"] if p["id"] == pid)["can_validate"])
        self.assertEqual(self.post(sci, f"/api/forum/posts/{pid}/validate").status_code, 200)
        r = self.post(sci, f"/api/forum/threads/{tid}/posts", {"body": "Au-delà de 28 °C, l’herbier dépérit."})
        self.assertEqual(r.json()["status"], "published")
        posts = self.client().get(f"/api/forum/threads/{tid}").json()["posts"]
        self.assertEqual([p["kind"] for p in posts], ["question", "answer", "answer"])
        self.assertEqual(posts[1]["validated_by"]["name"], "Marie")
        listing = self.client().get("/api/forum/categories/questions").json()["threads"]
        self.assertTrue(listing[0]["answered"])
        with new_session() as db:
            self.assertTrue(db.query(AuditLog).filter_by(action="proposal_validated").count())

    def test_unverified_cannot_post_and_text_is_inert(self):
        c = self.client()
        self.register(c, "nina@example.org", "Nina")
        self.post(c, "/api/forum/auth/login", {"email": "nina@example.org", "password": PASSWORD})
        r = self.post(c, "/api/forum/categories/suggestions/threads", {"title": "Je ne suis pas vérifiée", "body": "x"})
        self.assertEqual(r.status_code, 403)
        u = self.verified_user("oscar@example.org", "Oscar")
        tid = self.post(u, "/api/forum/categories/bons-gestes/threads", {"title": "<img src=x onerror=alert(1)>", "body": "a‮b\x00c <b>gras</b>"}).json()["id"]
        t = self.client().get(f"/api/forum/threads/{tid}").json()
        self.assertEqual(t["thread"]["title"], "<img src=x onerror=alert(1)>")  # stored as text, escaped by React
        self.assertEqual(t["posts"][0]["body"], "abc <b>gras</b>")  # control / bidi characters removed

    def test_reports_and_moderation(self):
        author = self.verified_user("paul@example.org", "Paul")
        reporter = self.verified_user("quentin@example.org", "Quentin")
        tid = self.post(author, "/api/forum/categories/pelagos/threads", {"title": "Message à signaler", "body": "contenu douteux"}).json()["id"]
        pid = self.client().get(f"/api/forum/threads/{tid}").json()["posts"][0]["id"]
        self.assertEqual(self.post(reporter, f"/api/forum/posts/{pid}/report", {"reason": "Hors sujet"}).status_code, 201)
        admin = self.verified_user("rose@example.org", "Rose")
        secret = self.post(admin, "/api/forum/me/totp/setup").json()["secret"]
        self.post(admin, "/api/forum/me/totp/confirm", {"code": pyotp.TOTP(secret).now()})
        self.set_role("rose@example.org", "admin")
        reports = admin.get("/api/forum/admin/reports").json()
        self.assertEqual(len(reports), 1)
        self.post(admin, f"/api/forum/admin/reports/{reports[0]['id']}", {"action": "hide"})
        post = self.client().get(f"/api/forum/threads/{tid}").json()["posts"][0]
        self.assertEqual((post["status"], post["body"]), ("hidden", ""))

    def test_scientist_request_approved(self):
        u = self.verified_user("sam@example.org", "Sam")
        r = self.post(u, "/api/forum/me/scientist-request", {"institution": "MIO, Marseille", "field": "Écologie marine", "orcid": "0000-0002-1825-0097", "justification": "Doctorant, thèse sur les herbiers de posidonie."})
        self.assertEqual(r.status_code, 201)
        admin = self.verified_user("tess@example.org", "Tess")
        secret = self.post(admin, "/api/forum/me/totp/setup").json()["secret"]
        self.post(admin, "/api/forum/me/totp/confirm", {"code": pyotp.TOTP(secret).now()})
        self.set_role("tess@example.org", "admin")
        req = admin.get("/api/forum/admin/scientist-requests").json()[0]
        self.post(admin, f"/api/forum/admin/scientist-requests/{req['id']}", {"decision": "approve"})
        self.assertIsNone(u.get("/api/forum/me").json()["user"])  # privileges changed → session renewed
        c = self.client()
        self.post(c, "/api/forum/auth/login", {"email": "sam@example.org", "password": PASSWORD})
        self.assertEqual(c.get("/api/forum/me").json()["user"]["role"], "scientist")


class SSOTest(unittest.TestCase):
    def test_microsoft_identity_uses_tid_oid_and_ignores_email_verification(self):
        ident = sso.identity_from_claims("microsoft", {"tid": "t1", "oid": "o1", "email": "x@example.org", "email_verified": True})
        self.assertEqual((ident.subject, ident.email_verified), ("t1:o1", False))

    def test_id_token_validation(self):
        import jwt
        from cryptography.hazmat.primitives.asymmetric import rsa

        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        cfg = sso.ProviderConfig("microsoft", "Microsoft", "", "client-123", "s")
        meta = {"issuer": "https://login.microsoftonline.com/{tenantid}/v2.0"}
        now = int(time.time())
        claims = {"iss": "https://login.microsoftonline.com/t1/v2.0", "aud": "client-123", "sub": "s", "tid": "t1", "oid": "o1", "iat": now, "exp": now + 300, "nonce": "n1"}
        good = jwt.encode(claims, key, algorithm="RS256")
        self.assertEqual(sso.validate_id_token(cfg, meta, good, "n1", key.public_key())["oid"], "o1")
        for bad_claims, nonce in (({"aud": "other"}, "n1"), ({"iss": "https://login.microsoftonline.com/t2/v2.0"}, "n1"), ({"exp": now - 600}, "n1"), ({}, "n2")):
            token = jwt.encode({**claims, **bad_claims}, key, algorithm="RS256")
            with self.assertRaises(sso.SSOError):
                sso.validate_id_token(cfg, meta, token, nonce, key.public_key())
        other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        with self.assertRaises(sso.SSOError):
            sso.validate_id_token(cfg, meta, jwt.encode(claims, other_key, algorithm="RS256"), "n1", key.public_key())


class LogsTest(ForumTestCase):
    def test_security_events_recorded(self):
        self.verified_user("ugo@example.org", "Ugo")
        with new_session() as db:
            events = {e.event for e in db.query(SecurityEvent).all()}
        self.assertTrue({"signup", "email_verified", "login"} <= events)


_ = mfa  # imported for side effects in some test runners

if __name__ == "__main__":
    unittest.main()
