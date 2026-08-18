"""Participative collect: pole gate, 20 Mo, download rights AUTHOR/PROF/RELAIS."""

from __future__ import annotations

from io import BytesIO

from twolate.domain import can_download_submission, can_submit_to
from twolate.pdf import demo_pdf


def test_can_submit_and_download_rules(svc):
    a8 = svc.repo.announcement("a8")
    etu = svc.repo.user_by_id("u-etu")
    sophie = svc.repo.user_by_id("u-sophie")
    prof = svc.repo.user_by_id("u-prof")
    marc = svc.repo.user_by_id("u-marc")
    admin = svc.repo.user_by_id("u-admin")
    ok, _ = can_submit_to(etu, a8)
    assert ok is True
    ok, err = can_submit_to(sophie, a8)
    assert ok is False
    assert "pôle" in (err or "").lower()
    a8.collect_access = "AUTHOR"
    assert can_download_submission(prof, a8) is True  # author
    assert can_download_submission(admin, a8) is True
    assert can_download_submission(marc, a8) is False
    a8.collect_access = "PROF"
    assert can_download_submission(prof, a8) is True
    assert can_download_submission(marc, a8) is False
    a8.collect_access = "RELAIS"
    assert can_download_submission(marc, a8) is True
    assert can_download_submission(etu, a8) is False


def test_other_pole_cannot_submit(client, svc):
    from tests.conftest import auth_header

    sophie = auth_header(client, "sophie@2late.com", "sophie")
    blob = demo_pdf(["x"])
    r = client.post(
        "/api/announcements/a8/submissions",
        data={"file": (BytesIO(blob), "x.pdf", "application/pdf")},
        headers=sophie,
        content_type="multipart/form-data",
    )
    assert r.status_code == 403
    assert "pôle" in r.get_json()["error"].lower()


def test_submit_and_download_as_author(client, etu, prof):
    blob = demo_pdf(["Exercice rendu"])
    r = client.post(
        "/api/announcements/a8/submissions",
        data={"file": (BytesIO(blob), "td4.pdf", "application/pdf")},
        headers=etu,
        content_type="multipart/form-data",
    )
    assert r.status_code == 201, r.get_json()
    sid = r.get_json()["id"]
    # student can download own
    own = client.get(f"/api/submissions/{sid}/file", headers=etu)
    assert own.status_code == 200
    assert own.data[:5] == b"%PDF-"
    # prof (author + PROF access) can download
    got = client.get(f"/api/submissions/{sid}/file", headers=prof)
    assert got.status_code == 200


def test_author_only_blocks_relais_download(client, admin, marc, svc):
    r = client.post("/api/announcements/a8/collect-access", json={"access": "AUTHOR"}, headers=admin)
    assert r.status_code == 200
    # existing seed submission sub-1
    r = client.get("/api/submissions/sub-1/file", headers=marc)
    assert r.status_code == 403


def test_oversized_submission_rejected(client, etu):
    huge = b"y" * (20 * 1024 * 1024 + 8)
    r = client.post(
        "/api/announcements/a8/submissions",
        data={"file": (BytesIO(huge), "huge.bin", "application/octet-stream")},
        headers=etu,
        content_type="multipart/form-data",
    )
    assert r.status_code == 400
    assert "20" in r.get_json()["error"]
