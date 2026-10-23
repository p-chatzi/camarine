"""Forum administration from the server's command line (no web route can create the first admin).

    python -m backend.forum promote <e-mail> admin|scientist|member
    python -m backend.forum purge          # run the data-retention purge now
    python -m backend.forum users          # list accounts (id, role, status, MFA, e-mail)

The account must exist (sign up on the site first). An admin must then enable a second factor in
"Mon compte" before the administration pages open.
"""

from __future__ import annotations

import sys

from sqlalchemy import select

from . import startup
from .db import AuditLog, User, new_session
from .maintenance import purge


def main(argv: list[str]) -> int:
    startup(background=False)
    if len(argv) == 3 and argv[0] == "promote" and argv[2] in ("admin", "scientist", "member"):
        with new_session() as db:
            user = db.scalar(select(User).where(User.email_norm == argv[1].strip().casefold()))
            if user is None:
                print("Aucun compte avec cet e-mail (créez-le d’abord sur le site).")
                return 1
            db.add(AuditLog(actor_id=None, action="role_changed_cli", target=f"user {user.id}", detail=f"{user.role} → {argv[2]}"))
            user.role = argv[2]
            db.commit()
            print(f"{user.display_name} <{user.email}> : {argv[2]}" + ("" if user.mfa_enabled or argv[2] != "admin" else " (doit activer la double authentification)"))
        return 0
    if argv == ["purge"]:
        print(purge())
        return 0
    if argv == ["users"]:
        with new_session() as db:
            for u in db.scalars(select(User).order_by(User.id)):
                print(f"{u.id:5d}  {u.role:9s}  {u.status:6s}  mfa={'oui' if u.mfa_enabled else 'non'}  {u.email}")
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
