def test_google_login_rejects_invalid_credential(client):
    # An invalid credential must be rejected as 401 by the real verification
    # path, not crash with a 500 from a missing transport dependency.
    r = client.post("/api/auth/google", json={"credential": "not-a-real-token"})
    assert r.status_code == 401, r.text
