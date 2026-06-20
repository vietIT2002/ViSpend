def test_transaction_has_receipt_flag_defaults_false(auth_client):
    cid = next(c["id"] for c in auth_client.get("/api/categories").json() if c["type"] == "expense")
    r = auth_client.post(
        "/api/transactions",
        json={"type": "expense", "amount": "10000", "category_id": cid,
              "occurred_on": "2026-06-20", "method": "cash"},
    )
    assert r.status_code == 201
    assert r.json()["has_receipt"] is False


import io

from app.intake import storage


def test_upload_receipt_sets_flag(auth_client, monkeypatch):
    monkeypatch.setattr(storage, "configured", lambda: True)
    monkeypatch.setattr(storage, "upload_receipt", lambda path, data, content_type: None)
    cid = next(c["id"] for c in auth_client.get("/api/categories").json() if c["type"] == "expense")
    txn = auth_client.post("/api/transactions", json={
        "type": "expense", "amount": "10000", "category_id": cid,
        "occurred_on": "2026-06-20", "method": "cash"}).json()
    files = {"file": ("r.jpg", io.BytesIO(b"\xff\xd8\xff"), "image/jpeg")}
    r = auth_client.post(f"/api/transactions/{txn['id']}/receipt", files=files)
    assert r.status_code == 200
    assert r.json()["has_receipt"] is True


def test_get_receipt_returns_decrypted_image(auth_client, monkeypatch):
    # Round-trip: bytes stored in Supabase are encrypted; GET decrypts and streams
    # the original image back with the right content-type.
    store: dict[str, bytes] = {}
    monkeypatch.setattr(storage, "configured", lambda: True)
    monkeypatch.setattr(storage, "upload_receipt",
                        lambda path, data, content_type: store.__setitem__(path, data))
    monkeypatch.setattr(storage, "download_receipt", lambda path: store[path])
    cid = next(c["id"] for c in auth_client.get("/api/categories").json() if c["type"] == "expense")
    txn = auth_client.post("/api/transactions", json={
        "type": "expense", "amount": "10000", "category_id": cid,
        "occurred_on": "2026-06-20", "method": "cash"}).json()
    original = b"\xff\xd8\xff\x00-secret-receipt-bytes"
    files = {"file": ("r.jpg", io.BytesIO(original), "image/jpeg")}
    auth_client.post(f"/api/transactions/{txn['id']}/receipt", files=files)
    r = auth_client.get(f"/api/transactions/{txn['id']}/receipt")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/jpeg")
    assert r.content == original  # decrypted back to the original
    stored = next(iter(store.values()))
    assert stored != original  # at rest it is ciphertext, not the raw image


def test_get_receipt_404_when_absent(auth_client):
    cid = next(c["id"] for c in auth_client.get("/api/categories").json() if c["type"] == "expense")
    txn = auth_client.post("/api/transactions", json={
        "type": "expense", "amount": "10000", "category_id": cid,
        "occurred_on": "2026-06-20", "method": "cash"}).json()
    assert auth_client.get(f"/api/transactions/{txn['id']}/receipt").status_code == 404


def test_upload_receipt_unconfigured_returns_503(auth_client, monkeypatch):
    from app.intake import storage
    monkeypatch.setattr(storage, "configured", lambda: False)
    cid = next(c["id"] for c in auth_client.get("/api/categories").json() if c["type"] == "expense")
    txn = auth_client.post("/api/transactions", json={
        "type": "expense", "amount": "10000", "category_id": cid,
        "occurred_on": "2026-06-20", "method": "cash"}).json()
    files = {"file": ("r.jpg", io.BytesIO(b"\xff\xd8\xff"), "image/jpeg")}
    assert auth_client.post(f"/api/transactions/{txn['id']}/receipt", files=files).status_code == 503


def test_upload_receipt_rejects_non_image(auth_client, monkeypatch):
    from app.intake import storage
    monkeypatch.setattr(storage, "configured", lambda: True)
    monkeypatch.setattr(storage, "upload_receipt", lambda path, data, content_type: None)
    cid = next(c["id"] for c in auth_client.get("/api/categories").json() if c["type"] == "expense")
    txn = auth_client.post("/api/transactions", json={
        "type": "expense", "amount": "10000", "category_id": cid,
        "occurred_on": "2026-06-20", "method": "cash"}).json()
    files = {"file": ("r.svg", io.BytesIO(b"<svg/>"), "image/svg+xml")}
    assert auth_client.post(f"/api/transactions/{txn['id']}/receipt", files=files).status_code == 422


def test_create_stores_ocr_text(auth_client, session):
    import uuid as _uuid
    from app.models import Transaction
    cid = next(c["id"] for c in auth_client.get("/api/categories").json() if c["type"] == "expense")
    r = auth_client.post("/api/transactions", json={
        "type": "expense", "amount": "73300", "category_id": cid,
        "occurred_on": "2026-06-20", "method": "cash",
        "note": "WinMart", "ocr_text": "WinMart PHIEU TINH TIEN ... TONG TIEN THANH TOAN 73.300"})
    assert r.status_code == 201
    txn = session.get(Transaction, _uuid.UUID(r.json()["id"]))
    assert txn.ocr_text.startswith("WinMart")
