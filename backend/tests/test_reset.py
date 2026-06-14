def test_forgot_then_reset(client):
    client.post(
        "/api/auth/register",
        json={"email": "u@test.com", "password": "password123"},
    )
    r = client.post("/api/auth/forgot-password", json={"email": "u@test.com"})
    assert r.status_code == 200
    token = r.json()["reset_token"]

    r = client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": "newpass12"},
    )
    assert r.status_code == 200

    r = client.post(
        "/api/auth/login",
        data={"username": "u@test.com", "password": "newpass12"},
    )
    assert r.status_code == 200
