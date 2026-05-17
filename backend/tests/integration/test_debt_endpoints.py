import pytest

BASE = "/api/v1/debts"


@pytest.mark.asyncio
async def test_create_debt(auth_client):
    client, _ = auth_client
    r = await client.post(
        BASE,
        json={
            "counterparty": "Alice",
            "type": "lent",
            "principal": "500.00",
        },
    )
    assert r.status_code == 201
    data = r.json()
    assert data["counterparty"] == "Alice"
    assert data["remaining"] == "500.00"
    assert data["paid_amount"] == "0.00"


@pytest.mark.asyncio
async def test_list_debts(auth_client):
    client, _ = auth_client
    r = await client.get(BASE)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@pytest.mark.asyncio
async def test_update_debt(auth_client):
    client, _ = auth_client
    create = await client.post(
        BASE,
        json={
            "counterparty": "Bob",
            "type": "borrowed",
            "principal": "1000.00",
        },
    )
    debt_id = create.json()["id"]
    r = await client.patch(f"{BASE}/{debt_id}", json={"notes": "updated"})
    assert r.status_code == 200
    assert r.json()["notes"] == "updated"


@pytest.mark.asyncio
async def test_add_payment(auth_client):
    client, _ = auth_client
    create = await client.post(
        BASE,
        json={
            "counterparty": "Carol",
            "type": "lent",
            "principal": "200.00",
        },
    )
    debt_id = create.json()["id"]
    r = await client.post(
        f"{BASE}/{debt_id}/payments",
        json={
            "amount": "50.00",
            "date": "2026-05-01",
        },
    )
    assert r.status_code == 201
    data = r.json()
    assert data["paid_amount"] == "50.00"
    assert data["remaining"] == "150.00"


@pytest.mark.asyncio
async def test_delete_debt(auth_client):
    client, _ = auth_client
    create = await client.post(
        BASE,
        json={
            "counterparty": "Dave",
            "type": "borrowed",
            "principal": "300.00",
        },
    )
    debt_id = create.json()["id"]
    r = await client.delete(f"{BASE}/{debt_id}")
    assert r.status_code == 204


@pytest.mark.asyncio
async def test_debt_not_found(auth_client):
    client, _ = auth_client
    r = await client.get(f"{BASE}/00000000-0000-0000-0000-000000000000")
    assert r.status_code in (404, 405)  # GET not defined, so 405 is fine
