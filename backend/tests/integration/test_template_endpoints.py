import pytest

BASE = "/api/v1/templates"
CAT_BASE = "/api/v1/categories"


@pytest.mark.asyncio
async def test_list_templates_empty(auth_client):
    client, _ = auth_client
    r = await client.get(BASE)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@pytest.mark.asyncio
async def test_create_and_list_template(auth_client):
    client, _ = auth_client
    # Get a category from the seeded set
    cats = await client.get(CAT_BASE)
    cat_id = cats.json()[0]["id"]
    r = await client.post(
        BASE,
        json={
            "name": "Lunch",
            "type": "expense",
            "category_id": cat_id,
            "amount": "12.50",
        },
    )
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Lunch"
    assert data["category_id"] == cat_id


@pytest.mark.asyncio
async def test_delete_template(auth_client):
    client, _ = auth_client
    cats = await client.get(CAT_BASE)
    cat_id = cats.json()[0]["id"]
    create = await client.post(
        BASE,
        json={
            "name": "Coffee",
            "type": "expense",
            "category_id": cat_id,
        },
    )
    tmpl_id = create.json()["id"]
    r = await client.delete(f"{BASE}/{tmpl_id}")
    assert r.status_code == 204
    # Confirm gone
    listed = await client.get(BASE)
    ids = [t["id"] for t in listed.json()]
    assert tmpl_id not in ids
