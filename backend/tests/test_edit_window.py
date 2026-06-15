import uuid
from datetime import datetime, timedelta, timezone

from app.models import Transaction


def _expense_category(auth_client) -> str:
    cats = auth_client.get("/api/categories").json()
    return next(c["id"] for c in cats if c["type"] == "expense")


def _create_txn(auth_client) -> str:
    r = auth_client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": "10000",
            "category_id": _expense_category(auth_client),
            "occurred_on": "2026-06-15",
            "method": "cash",
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_can_edit_within_24h(auth_client):
    txn_id = _create_txn(auth_client)
    assert auth_client.patch(f"/api/transactions/{txn_id}", json={"amount": "20000"}).status_code == 200
    assert auth_client.delete(f"/api/transactions/{txn_id}").status_code == 204


def test_cannot_edit_or_delete_after_24h(auth_client, session):
    txn_id = _create_txn(auth_client)

    # Age the transaction so it falls outside the 24h edit window.
    txn = session.get(Transaction, uuid.UUID(txn_id))
    txn.created_at = datetime.now(timezone.utc) - timedelta(hours=25)
    session.add(txn)
    session.commit()

    assert auth_client.patch(f"/api/transactions/{txn_id}", json={"amount": "20000"}).status_code == 403
    assert auth_client.delete(f"/api/transactions/{txn_id}").status_code == 403
