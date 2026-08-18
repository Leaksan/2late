"""Cross-cutting: API JSON never echoes password material."""

from __future__ import annotations

from twolate.domain import assert_no_secret


def test_common_payloads_have_no_password(client, etu, admin):
    paths = [
        ("/api/auth/me", etu),
        ("/api/feed", etu),
        ("/api/bootstrap", etu),
        ("/api/rooms", etu),
        ("/api/schedule", etu),
        ("/api/grades", etu),
        ("/api/admin/stats", admin),
        ("/api/admin/members", admin),
        ("/api/admin/export", admin),
    ]
    for path, headers in paths:
        r = client.get(path, headers=headers)
        assert r.status_code == 200, (path, r.get_json())
        assert_no_secret(r.get_json())
        text = r.get_data(as_text=True)
        assert "password_hash" not in text
        assert '"password":' not in text
