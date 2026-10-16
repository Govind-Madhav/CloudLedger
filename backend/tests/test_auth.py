from backend.app.config import settings

def test_admin_login_success(client):
    response = client.post("/api/v1/auth/login", json={
        "email": settings.DEFAULT_ADMIN_EMAIL,
        "password": settings.DEFAULT_ADMIN_PASSWORD
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["admin"]["email"] == settings.DEFAULT_ADMIN_EMAIL

def test_admin_login_invalid_password(client):
    response = client.post("/api/v1/auth/login", json={
        "email": settings.DEFAULT_ADMIN_EMAIL,
        "password": "WrongPassword123!"
    })
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]

def test_get_current_admin_me(client, auth_headers):
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == settings.DEFAULT_ADMIN_EMAIL

def test_unauthorized_access_blocked(client):
    response = client.get("/api/v1/analytics/overview")
    assert response.status_code == 401
