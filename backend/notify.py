"""Notifies the maintainer of a new report. Configured ONLY by environment variables, so no address
or password is ever written in the code or the repository. With nothing configured, reports are
still stored (report_service.py) and nothing is sent.

E-mail (SMTP; use a mailbox created for Camarine, with an application password):
    CAMARINE_SMTP_HOST       e.g. smtp.gmail.com, ssl0.ovh.net, smtp-mail.outlook.com
    CAMARINE_SMTP_PORT       587 (STARTTLS, default) or 465 (SSL)
    CAMARINE_SMTP_USER       login of that mailbox
    CAMARINE_SMTP_PASSWORD   its (application) password
    CAMARINE_NOTIFY_FROM     sender address (default: CAMARINE_SMTP_USER)
    CAMARINE_NOTIFY_TO       recipient address(es), comma-separated

Push notification (alternative or in addition, no mailbox needed), e.g. an ntfy.sh topic:
    CAMARINE_NOTIFY_WEBHOOK  URL receiving the text as a POST body (https://ntfy.sh/<secret-topic>)

Sending happens in a background thread (the visitor never waits for the mail server) and at most
MAX_PER_HOUR notifications are sent per hour, so a flood of reports can't flood the inbox.
"""

from __future__ import annotations

import logging
import os
import smtplib
import ssl
import threading
import time
import unicodedata
import urllib.request
from collections import deque
from email.message import EmailMessage

log = logging.getLogger("camarine.notify")

MAX_PER_HOUR = 20
_sent: deque[float] = deque()
_sent_lock = threading.Lock()


def _env(name: str) -> str:
    return os.environ.get(name, "").strip()


def channels() -> list[str]:
    """Configured channels, e.g. ['email', 'webhook'] (for logs and /api/health checks)."""
    out = []
    if _env("CAMARINE_SMTP_HOST") and _env("CAMARINE_NOTIFY_TO"):
        out.append("email")
    if _env("CAMARINE_NOTIFY_WEBHOOK"):
        out.append("webhook")
    return out


def _take_quota(now: float | None = None) -> bool:
    t = time.monotonic() if now is None else now
    with _sent_lock:
        while _sent and t - _sent[0] > 3600:
            _sent.popleft()
        if len(_sent) >= MAX_PER_HOUR:
            return False
        _sent.append(t)
        return True


def smtp_configured() -> bool:
    return bool(_env("CAMARINE_SMTP_HOST"))


def build_email(subject: str, body: str, to: str | None = None) -> EmailMessage:
    """`to` = one recipient (forum mails: verification, password reset); default = the maintainer."""
    msg = EmailMessage()  # refuses CR/LF in headers: no header injection
    msg["Subject"] = subject
    msg["From"] = _env("CAMARINE_NOTIFY_FROM") or _env("CAMARINE_SMTP_USER")
    msg["To"] = to or ", ".join(a.strip() for a in _env("CAMARINE_NOTIFY_TO").split(",") if a.strip())
    msg.set_content(body)
    return msg


def send_email(subject: str, body: str, to: str | None = None) -> None:
    host, port = _env("CAMARINE_SMTP_HOST"), int(_env("CAMARINE_SMTP_PORT") or 587)
    user, password = _env("CAMARINE_SMTP_USER"), _env("CAMARINE_SMTP_PASSWORD")
    msg = build_email(subject, body, to)
    context = ssl.create_default_context()
    if port == 465:
        server: smtplib.SMTP = smtplib.SMTP_SSL(host, port, context=context, timeout=15)
    else:
        server = smtplib.SMTP(host, port, timeout=15)
        server.starttls(context=context)
    with server:
        if user:
            server.login(user, password)
        server.send_message(msg)


def send_webhook(subject: str, body: str) -> None:
    url = _env("CAMARINE_NOTIFY_WEBHOOK")
    if not url.startswith("https://"):
        raise ValueError("CAMARINE_NOTIFY_WEBHOOK must be an https:// URL")
    req = urllib.request.Request(url, data=body.encode("utf-8"), method="POST", headers={"Title": unicodedata.normalize("NFKD", subject).encode("ascii", "ignore").decode(), "Content-Type": "text/plain; charset=utf-8"})
    with urllib.request.urlopen(req, timeout=15):  # noqa: S310 (https enforced above)
        pass


def _deliver(subject: str, body: str, active: list[str]) -> None:
    for channel, send in (("email", send_email), ("webhook", send_webhook)):
        if channel not in active:
            continue
        try:
            send(subject, body)
        except Exception as exc:  # never crash the API because a mail server is down
            log.warning("notification %s failed: %s", channel, exc)


def notify(subject: str, body: str, *, background: bool = True) -> bool:
    """Sends to every configured channel. Returns False when nothing is configured or the hourly
    quota is used up (the report itself is stored either way)."""
    active = channels()
    if not active or not _take_quota():
        return False
    if background:
        threading.Thread(target=_deliver, args=(subject, body, active), daemon=True).start()
    else:
        _deliver(subject, body, active)
    return True
