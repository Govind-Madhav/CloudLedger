def test_analytics_overview(client, auth_headers):
    resp = client.get("/api/v1/analytics/overview", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "kpis" in data
    assert data["kpis"]["student_count"] >= 5
    assert data["kpis"]["total_cost"] > 0
    assert "daily_trends" in data
    assert "service_breakdown" in data

def test_list_and_create_students(client, auth_headers):
    # List students
    resp = client.get("/api/v1/students", headers=auth_headers)
    assert resp.status_code == 200
    students = resp.json()
    assert len(students) >= 5

    # Create new student
    new_s = {
        "student_id": "STU-NEW-999",
        "full_name": "New Test Student",
        "email": "new.student@univ.edu",
        "course_code": "CS401",
        "budget_limit": 60.0,
        "iam_username": "student-new"
    }
    create_resp = client.post("/api/v1/students", json=new_s, headers=auth_headers)
    assert create_resp.status_code == 200
    created = create_resp.json()
    assert created["student_id"] == "STU-NEW-999"
    assert len(created["iam_identities"]) == 1

def test_resource_inventory_and_untagged(client, auth_headers):
    resp = client.get("/api/v1/resources", headers=auth_headers)
    assert resp.status_code == 200
    res_list = resp.json()
    assert len(res_list) > 0

    untagged_resp = client.get("/api/v1/resources/untagged", headers=auth_headers)
    assert untagged_resp.status_code == 200
    untagged = untagged_resp.json()
    assert any(not r["is_tagged_compliant"] for r in untagged)

def test_activity_events(client, auth_headers):
    resp = client.get("/api/v1/activity", headers=auth_headers)
    assert resp.status_code == 200
    events = resp.json()
    assert len(events) > 0
    assert any(e["event_name"] == "RunInstances" for e in events)

def test_system_trigger_sync(client, auth_headers):
    resp = client.post("/api/v1/system/trigger-sync", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
