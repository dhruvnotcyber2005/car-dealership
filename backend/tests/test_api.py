"""API tests for authentication, inventory, and authorization.

These tests describe the required behaviour. They are meant to be written
and run before the matching endpoint code.
"""

import os
import threading
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException

from models import User


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def register(client, username="alex", email="alex@example.com", password="password123", **extra):
    body = {
        "username": username,
        "email": email,
        "password": password,
    }
    body.update(extra)
    return client.post("/api/auth/register", json=body)


def vehicle_payload(**overrides):
    payload = {
        "make": "Toyota",
        "model": "Corolla",
        "category": "Sedan",
        "price": 18000,
        "quantity": 4,
    }
    payload.update(overrides)
    return payload


def create_vehicle(client, token, **overrides):
    return client.post(
        "/api/vehicles",
        json=vehicle_payload(**overrides),
        headers=bearer(token),
    )


class TestAuthentication:
    def test_register_creates_customer(self, client, db):
        response = register(client)
        assert response.status_code == 201
        body = response.json()
        assert body["username"] == "alex"
        assert body["email"] == "alex@example.com"
        assert body["role"] == "customer"
        assert "password" not in body
        assert "password_hash" not in body

        saved = db.query(User).filter(User.username == "alex").one()
        assert saved.role == "customer"

    def test_register_rejects_duplicate_username_and_email(self, client):
        first = register(client)
        assert first.status_code == 201

        duplicate_username = register(client, email="other@example.com")
        assert duplicate_username.status_code == 400

        duplicate_email = register(client, username="other", email="alex@example.com")
        assert duplicate_email.status_code == 400

    def test_register_hashes_password(self, client, db):
        response = register(client, password="password123")
        assert response.status_code == 201

        saved = db.query(User).filter(User.username == "alex").one()
        assert saved.password_hash != "password123"
        assert saved.password_hash.startswith("$argon2")

    def test_register_ignores_requested_admin_role(self, client, db):
        response = register(client, role="admin")
        assert response.status_code == 201
        assert response.json()["role"] == "customer"
        saved = db.query(User).filter(User.username == "alex").one()
        assert saved.role == "customer"

    def test_register_rejects_short_password(self, client):
        response = register(client, password="short")
        assert response.status_code == 422

    def test_login_returns_token(self, client):
        register(client)
        response = client.post(
            "/api/auth/login",
            json={"username": "alex", "password": "password123"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["token_type"] == "bearer"
        assert body["role"] == "customer"
        assert isinstance(body["access_token"], str)
        assert body["access_token"]

    def test_login_rejects_invalid_credentials(self, client):
        register(client)
        wrong_password = client.post(
            "/api/auth/login",
            json={"username": "alex", "password": "wrong-password"},
        )
        unknown_user = client.post(
            "/api/auth/login",
            json={"username": "nobody", "password": "password123"},
        )
        assert wrong_password.status_code == 401
        assert unknown_user.status_code == 401

    def test_missing_or_invalid_token_is_rejected(self, client):
        missing = client.get("/api/vehicles")
        invalid = client.get("/api/vehicles", headers=bearer("not-a-real-token"))
        assert missing.status_code == 401
        assert invalid.status_code == 401

    def test_expired_token_is_rejected(self, client):
        expired = jwt.encode(
            {
                "sub": "1",
                "username": "alex",
                "role": "customer",
                "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
            },
            os.environ["JWT_SECRET"],
            algorithm="HS256",
        )
        response = client.get("/api/vehicles", headers=bearer(expired))
        assert response.status_code == 401


class TestVehicles:
    def test_list_includes_out_of_stock_vehicles(self, client, admin_token, customer_token):
        assert create_vehicle(client, admin_token, model="InStock", quantity=2).status_code == 201
        assert create_vehicle(client, admin_token, model="Gone", quantity=0).status_code == 201

        response = client.get("/api/vehicles", headers=bearer(customer_token))
        assert response.status_code == 200
        models = {item["model"] for item in response.json()}
        assert models == {"InStock", "Gone"}

    def test_search_filters_by_make_model_category_and_price(self, client, admin_token, customer_token):
        assert create_vehicle(
            client, admin_token, make="Toyota", model="Camry", category="Sedan", price=22000
        ).status_code == 201
        assert create_vehicle(
            client, admin_token, make="Honda", model="CR-V", category="SUV", price=31000
        ).status_code == 201
        assert create_vehicle(
            client, admin_token, make="Toyota", model="RAV4", category="SUV", price=28000
        ).status_code == 201

        headers = bearer(customer_token)

        by_make = client.get("/api/vehicles/search", params={"make": "toy"}, headers=headers)
        assert by_make.status_code == 200
        assert {item["model"] for item in by_make.json()} == {"Camry", "RAV4"}

        by_model = client.get("/api/vehicles/search", params={"model": "cr-v"}, headers=headers)
        assert [item["model"] for item in by_model.json()] == ["CR-V"]

        by_category = client.get("/api/vehicles/search", params={"category": "suv"}, headers=headers)
        assert {item["model"] for item in by_category.json()} == {"CR-V", "RAV4"}

        by_price = client.get(
            "/api/vehicles/search",
            params={"min_price": 25000, "max_price": 30000},
            headers=headers,
        )
        assert [item["model"] for item in by_price.json()] == ["RAV4"]

        combined = client.get(
            "/api/vehicles/search",
            params={"make": "Toyota", "category": "SUV", "max_price": 29000},
            headers=headers,
        )
        assert [item["model"] for item in combined.json()] == ["RAV4"]

    def test_search_requires_authentication(self, client):
        response = client.get("/api/vehicles/search", params={"make": "Toyota"})
        assert response.status_code == 401

    def test_admin_can_create_update_and_delete(self, client, admin_token):
        created = create_vehicle(client, admin_token)
        assert created.status_code == 201
        vehicle_id = created.json()["id"]
        assert created.json()["make"] == "Toyota"

        updated = client.put(
            f"/api/vehicles/{vehicle_id}",
            json={"price": 17500, "model": "Corolla LE"},
            headers=bearer(admin_token),
        )
        assert updated.status_code == 200
        assert updated.json()["price"] == 17500
        assert updated.json()["model"] == "Corolla LE"
        assert updated.json()["make"] == "Toyota"

        deleted = client.delete(f"/api/vehicles/{vehicle_id}", headers=bearer(admin_token))
        assert deleted.status_code == 200

        missing = client.put(
            f"/api/vehicles/{vehicle_id}",
            json={"price": 16000},
            headers=bearer(admin_token),
        )
        assert missing.status_code == 404

    def test_invalid_price_and_quantity_are_rejected(self, client, admin_token):
        zero_price = create_vehicle(client, admin_token, price=0)
        negative_price = create_vehicle(client, admin_token, price=-5)
        negative_quantity = create_vehicle(client, admin_token, quantity=-1)
        assert zero_price.status_code == 422
        assert negative_price.status_code == 422
        assert negative_quantity.status_code == 422

        created = create_vehicle(client, admin_token)
        vehicle_id = created.json()["id"]
        bad_update = client.put(
            f"/api/vehicles/{vehicle_id}",
            json={"quantity": -2},
            headers=bearer(admin_token),
        )
        assert bad_update.status_code == 422

    def test_customer_cannot_manage_vehicles(self, client, admin_token, customer_token):
        created = create_vehicle(client, admin_token)
        vehicle_id = created.json()["id"]

        create_attempt = create_vehicle(client, customer_token, model="Blocked")
        update_attempt = client.put(
            f"/api/vehicles/{vehicle_id}",
            json={"price": 1000},
            headers=bearer(customer_token),
        )
        delete_attempt = client.delete(
            f"/api/vehicles/{vehicle_id}",
            headers=bearer(customer_token),
        )
        assert create_attempt.status_code == 403
        assert update_attempt.status_code == 403
        assert delete_attempt.status_code == 403

    def test_guests_cannot_manage_vehicles(self, client):
        assert client.post("/api/vehicles", json=vehicle_payload()).status_code == 401
        assert client.put("/api/vehicles/1", json={"price": 1000}).status_code == 401
        assert client.delete("/api/vehicles/1").status_code == 401


class TestInventory:
    def test_purchase_decreases_stock_by_one(self, client, admin_token, customer_token):
        created = create_vehicle(client, admin_token, quantity=2)
        vehicle_id = created.json()["id"]

        response = client.post(
            f"/api/vehicles/{vehicle_id}/purchase",
            headers=bearer(customer_token),
        )
        assert response.status_code == 200
        assert response.json()["quantity"] == 1

        second = client.post(
            f"/api/vehicles/{vehicle_id}/purchase",
            headers=bearer(customer_token),
        )
        assert second.status_code == 200
        assert second.json()["quantity"] == 0

    def test_purchase_rejects_zero_stock_and_missing_vehicle(self, client, admin_token, customer_token):
        created = create_vehicle(client, admin_token, quantity=0)
        vehicle_id = created.json()["id"]
        headers = bearer(customer_token)

        out_of_stock = client.post(f"/api/vehicles/{vehicle_id}/purchase", headers=headers)
        assert out_of_stock.status_code == 400

        listed = client.get("/api/vehicles", headers=headers)
        saved = next(item for item in listed.json() if item["id"] == vehicle_id)
        assert saved["quantity"] == 0

        missing = client.post("/api/vehicles/9999/purchase", headers=headers)
        assert missing.status_code == 404

    def test_purchase_requires_authentication(self, client, admin_token):
        created = create_vehicle(client, admin_token, quantity=1)
        vehicle_id = created.json()["id"]
        response = client.post(f"/api/vehicles/{vehicle_id}/purchase")
        assert response.status_code == 401

    def test_restock_increases_stock_for_admin_only(self, client, admin_token, customer_token):
        created = create_vehicle(client, admin_token, quantity=1)
        vehicle_id = created.json()["id"]

        forbidden = client.post(
            f"/api/vehicles/{vehicle_id}/restock",
            json={"quantity": 2},
            headers=bearer(customer_token),
        )
        assert forbidden.status_code == 403

        restocked = client.post(
            f"/api/vehicles/{vehicle_id}/restock",
            json={"quantity": 2},
            headers=bearer(admin_token),
        )
        assert restocked.status_code == 200
        assert restocked.json()["quantity"] == 3

        zero = client.post(
            f"/api/vehicles/{vehicle_id}/restock",
            json={"quantity": 0},
            headers=bearer(admin_token),
        )
        negative = client.post(
            f"/api/vehicles/{vehicle_id}/restock",
            json={"quantity": -4},
            headers=bearer(admin_token),
        )
        assert zero.status_code == 422
        assert negative.status_code == 422

        missing = client.post(
            "/api/vehicles/9999/restock",
            json={"quantity": 1},
            headers=bearer(admin_token),
        )
        assert missing.status_code == 404

    def test_concurrent_purchases_do_not_oversell(self, admin_token, customer_token, client, db):
        created = create_vehicle(client, admin_token, quantity=5, model="Limited")
        assert created.status_code == 201
        vehicle_id = created.json()["id"]
        # Release the setup session so it does not hold a SQLite lock.
        db.close()

        from main import purchase_one

        results = []
        barrier = threading.Barrier(10)

        def attempt():
            from database import SessionLocal

            barrier.wait()
            session = SessionLocal()
            try:
                purchase_one(session, vehicle_id)
                results.append(200)
            except HTTPException as exc:
                results.append(exc.status_code)
            finally:
                session.close()

        threads = [threading.Thread(target=attempt) for _ in range(10)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        assert results.count(200) == 5
        assert results.count(400) == 5
        assert 404 not in results

        listed = client.get("/api/vehicles", headers=bearer(customer_token))
        saved = next(item for item in listed.json() if item["id"] == vehicle_id)
        assert saved["quantity"] == 0


def test_delete_missing_vehicle_returns_404(client, admin_token):
    response = client.delete("/api/vehicles/9999", headers=bearer(admin_token))
    assert response.status_code == 404
