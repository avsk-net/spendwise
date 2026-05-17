import pytest

BASE = "/api/v1/categorization-rules"
CAT_BASE = "/api/v1/categories"


@pytest.mark.asyncio
async def test_list_rules_empty(auth_client):
    client, _ = auth_client
    r = await client.get(BASE)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@pytest.mark.asyncio
async def test_create_rule(auth_client):
    client, _ = auth_client
    cats = await client.get(CAT_BASE)
    cat_id = cats.json()[0]["id"]
    r = await client.post(
        BASE,
        json={
            "keyword": "netflix",
            "category_id": cat_id,
            "priority": 5,
        },
    )
    assert r.status_code == 201
    data = r.json()
    assert data["keyword"] == "netflix"
    assert data["priority"] == 5


@pytest.mark.asyncio
async def test_suggest_category(auth_client):
    client, _ = auth_client
    cats = await client.get(CAT_BASE)
    cat_id = cats.json()[0]["id"]
    await client.post(BASE, json={"keyword": "spotify", "category_id": cat_id})
    r = await client.post(f"{BASE}/suggest", json={"text": "Spotify premium"})
    assert r.status_code == 200
    assert r.json()["category_id"] == cat_id


@pytest.mark.asyncio
async def test_update_rule(auth_client):
    client, _ = auth_client
    cats = await client.get(CAT_BASE)
    cat_id = cats.json()[0]["id"]
    create = await client.post(BASE, json={"keyword": "amazon", "category_id": cat_id})
    rule_id = create.json()["id"]
    r = await client.patch(f"{BASE}/{rule_id}", json={"priority": 10})
    assert r.status_code == 200
    assert r.json()["priority"] == 10


@pytest.mark.asyncio
async def test_delete_rule(auth_client):
    client, _ = auth_client
    cats = await client.get(CAT_BASE)
    cat_id = cats.json()[0]["id"]
    create = await client.post(BASE, json={"keyword": "uber", "category_id": cat_id})
    rule_id = create.json()["id"]
    r = await client.delete(f"{BASE}/{rule_id}")
    assert r.status_code == 204
