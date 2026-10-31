import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["platform"] == "FDR Guardian"

def test_auth_login_admin():
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@fdrguardian.internal",
        "password": "Admin@Guardian2026"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"

def test_auth_login_invalid():
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@fdrguardian.internal",
        "password": "WrongPassword123"
    })
    assert res.status_code == 401

def test_dashboard_summary():
    # Login as admin
    login_res = client.post("/api/v1/auth/login", json={
        "email": "admin@fdrguardian.internal",
        "password": "Admin@Guardian2026"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/analytics/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_fdrs"] >= 20
    assert data["total_institutions"] >= 3
    assert data["open_findings_count"] > 0
    assert len(data["maturity_distribution"]) > 0

def test_fdr_registry_list():
    login_res = client.post("/api/v1/auth/login", json={
        "email": "official@aicet.gov.in",
        "password": "Official@Review2026"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/fdr", headers=headers)
    assert res.status_code == 200
    fdrs = res.json()
    assert len(fdrs) >= 20

def test_audit_verify_chain_api():
    login_res = client.post("/api/v1/auth/login", json={
        "email": "admin@fdrguardian.internal",
        "password": "Admin@Guardian2026"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/audit/verify-chain", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is True
    assert data["total_events"] > 0

def test_relationship_graph_api():
    login_res = client.post("/api/v1/auth/login", json={
        "email": "admin@fdrguardian.internal",
        "password": "Admin@Guardian2026"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/graph", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["nodes"]) > 0
    assert len(data["edges"]) > 0

