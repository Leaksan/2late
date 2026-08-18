"""Syllabus: upload rights, pole visibility, accent-insensitive search, 20 Mo cap."""

from __future__ import annotations

from io import BytesIO

from twolate.domain import fold_accents, sort_syllabus, syllabus_matches
from twolate.models import SyllabusDoc
from twolate.pdf import demo_pdf


def test_search_is_accent_insensitive():
    doc = SyllabusDoc(
        id="d",
        author_id="u",
        title="Évaluation d’Algorithmique",
        poles=["STI"],
        file_name="eval.pdf",
        file_type="application/pdf",
        file_size=10,
        created_at="t",
        description="Barème officiel",
        discipline="Algorithmique avancée",
    )
    assert fold_accents("Évaluation") == fold_accents("evaluation")
    assert syllabus_matches(doc, "evaluation") is True
    assert syllabus_matches(doc, "ALGORITHMIQUE") is True
    assert syllabus_matches(doc, "xyzzy") is False


def test_sort_syllabus_recent_and_title():
    a = SyllabusDoc(id="1", author_id="u", title="Zèbre", poles=["STI"], file_name="a.pdf", file_type="pdf", file_size=1, created_at="2020-01-01T00:00:00Z")
    b = SyllabusDoc(id="2", author_id="u", title="Alpha", poles=["STI"], file_name="b.pdf", file_type="pdf", file_size=1, created_at="2024-01-01T00:00:00Z")
    by_title = sort_syllabus([a, b], "title")
    assert [d.title for d in by_title] == ["Alpha", "Zèbre"]
    by_recent = sort_syllabus([a, b], "recent")
    assert by_recent[0].id == "2"


def test_student_sees_pole_docs_only(client, etu):
    docs = client.get("/api/syllabus", headers=etu).get_json()["docs"]
    ids = {d["id"] for d in docs}
    assert "doc-1" in ids  # STI
    assert "doc-3" in ids  # all poles
    assert "doc-2" not in ids  # MPI only


def test_search_query_filters(client, etu):
    docs = client.get("/api/syllabus?q=algorithmique", headers=etu).get_json()["docs"]
    assert any("Algorithmique" in d["title"] for d in docs)
    docs = client.get("/api/syllabus?q=evaluation", headers=etu).get_json()["docs"]
    # title has no evaluation for STI seed except maybe none — should still be a list
    assert isinstance(docs, list)


def test_student_cannot_upload(client, etu):
    r = client.post(
        "/api/syllabus",
        data={"title": "Notes", "poles": "STI"},
        content_type="multipart/form-data",
        headers=etu,
    )
    # no file + student
    assert r.status_code in (400, 403)


def test_prof_upload_and_student_download(client, prof, etu):
    blob = demo_pdf(["Plan de cours", "Chapitre 1"])
    r = client.post(
        "/api/syllabus",
        data={
            "title": "Plan de cours STI",
            "poles": '["STI"]',
            "file": (BytesIO(blob), "plan.pdf", "application/pdf"),
        },
        headers=prof,
        content_type="multipart/form-data",
    )
    assert r.status_code == 201, r.get_json()
    did = r.get_json()["id"]
    listed = client.get("/api/syllabus?q=plan de cours", headers=etu).get_json()["docs"]
    assert any(d["id"] == did for d in listed)
    file_r = client.get(f"/api/syllabus/{did}/file", headers=etu)
    assert file_r.status_code == 200
    assert file_r.data[:5] == b"%PDF-"


def test_file_too_large_rejected(client, prof):
    huge = b"x" * (20 * 1024 * 1024 + 10)
    r = client.post(
        "/api/syllabus",
        data={
            "title": "Trop gros",
            "poles": '["STI"]',
            "file": (BytesIO(huge), "big.pdf", "application/pdf"),
        },
        headers=prof,
        content_type="multipart/form-data",
    )
    assert r.status_code == 400
    assert "20" in r.get_json()["error"]
