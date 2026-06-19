def test_list_includes_default_categories(auth_client):
    r = auth_client.get("/api/categories")
    assert r.status_code == 200
    data = r.json()
    assert any(c["name"] == "Food & Drink" and c["is_default"] for c in data)
    assert any(c["name"] == "Salary" and c["is_default"] for c in data)


def test_default_categories_expose_stable_keys(auth_client):
    data = auth_client.get("/api/categories").json()
    by_name = {(c["name"], c["type"]): c for c in data}
    assert by_name[("Food & Drink", "expense")]["key"] == "food_drink"
    assert by_name[("Salary", "income")]["key"] == "salary"
    # The two "Other" rows are disambiguated by type.
    assert by_name[("Other", "expense")]["key"] == "other_expense"
    assert by_name[("Other", "income")]["key"] == "other_income"


def test_custom_category_has_no_key(auth_client):
    r = auth_client.post("/api/categories", json={"name": "Coffee", "type": "expense"})
    assert r.status_code == 201
    assert r.json()["key"] is None


def test_create_update_delete_custom_category(auth_client):
    r = auth_client.post(
        "/api/categories",
        json={"name": "Coffee", "type": "expense", "icon": "cup", "color": "#8b5cf6"},
    )
    assert r.status_code == 201
    category = r.json()
    assert category["name"] == "Coffee"
    assert category["is_default"] is False

    r = auth_client.patch(
        f"/api/categories/{category['id']}",
        json={"name": "Cafe", "color": "#14b8a6"},
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Cafe"
    assert r.json()["color"] == "#14b8a6"

    r = auth_client.delete(f"/api/categories/{category['id']}")
    assert r.status_code == 204


def test_cannot_modify_default_category(auth_client):
    default = next(
        c for c in auth_client.get("/api/categories").json() if c["name"] == "Food & Drink"
    )
    assert auth_client.patch(
        f"/api/categories/{default['id']}",
        json={"name": "Nope"},
    ).status_code == 403
    assert auth_client.delete(f"/api/categories/{default['id']}").status_code == 403
