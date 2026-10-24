"""Ashford Motor Co. API."""

import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import models  # noqa: F401  (registers tables on Base)
from auth import create_access_token, get_current_user, hash_password, require_admin, verify_password
from database import Base, engine, get_db
from models import User, Vehicle, utcnow
from schemas import (
    LoginRequest,
    Message,
    RegisterRequest,
    RestockRequest,
    TokenResponse,
    UserPublic,
    VehicleData,
    VehiclePublic,
    VehicleUpdate,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if os.getenv("JWT_SECRET", "dev-only-change-me-not-for-production-use") == "dev-only-change-me-not-for-production-use":
        print("WARNING: Using the default development JWT secret. Set JWT_SECRET before any real deployment.")
    yield


app = FastAPI(title="Ashford Motor Co. API", version="1.0.0", lifespan=lifespan)

_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _like(value: str) -> str:
    """Build a contains-pattern without treating user % or _ as wildcards."""
    escaped = value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def purchase_one(db: Session, vehicle_id: int) -> Vehicle:
    """Decrease stock by one if at least one unit is available.

    The quantity check and the decrease happen in one UPDATE statement.
    Two purchases cannot both take the last unit.
    """
    updated = db.execute(
        update(Vehicle)
        .where(Vehicle.id == vehicle_id, Vehicle.quantity > 0)
        .values(quantity=Vehicle.quantity - 1, updated_at=utcnow())
        .returning(Vehicle.id)
    ).first()
    if updated is None:
        db.rollback()
        if db.get(Vehicle, vehicle_id) is None:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        raise HTTPException(status_code=400, detail="Vehicle is out of stock")
    db.commit()
    return db.get(Vehicle, vehicle_id)


@app.get("/")
def health():
    return {"message": "Ashford Motor Co. API"}


@app.post("/api/auth/register", response_model=UserPublic, status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.scalar(
        select(User).where(or_(User.username == data.username, User.email == data.email))
    )
    if existing is not None:
        if existing.username == data.username:
            raise HTTPException(status_code=400, detail="Username is already registered")
        raise HTTPException(status_code=400, detail="Email is already registered")

    # The role is always customer. It is not taken from the request.
    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
        role="customer",
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Username or email is already registered")
    db.refresh(user)
    return user


@app.post("/api/auth/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == data.username))
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return TokenResponse(
        access_token=create_access_token(user),
        username=user.username,
        role=user.role,
    )


@app.get("/api/vehicles", response_model=list[VehiclePublic])
def list_vehicles(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(select(Vehicle).order_by(Vehicle.id.desc())).all()


@app.get("/api/vehicles/search", response_model=list[VehiclePublic])
def search_vehicles(
    make: str | None = None,
    model: str | None = None,
    category: str | None = None,
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(status_code=400, detail="Minimum price cannot be greater than maximum price")

    query = select(Vehicle)
    if make and make.strip():
        query = query.where(Vehicle.make.ilike(_like(make.strip()), escape="\\"))
    if model and model.strip():
        query = query.where(Vehicle.model.ilike(_like(model.strip()), escape="\\"))
    if category and category.strip():
        query = query.where(Vehicle.category.ilike(_like(category.strip()), escape="\\"))
    if min_price is not None:
        query = query.where(Vehicle.price >= min_price)
    if max_price is not None:
        query = query.where(Vehicle.price <= max_price)
    return db.scalars(query.order_by(Vehicle.id.desc())).all()


@app.post("/api/vehicles", response_model=VehiclePublic, status_code=201)
def create_vehicle(
    data: VehicleData,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    vehicle = Vehicle(**data.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@app.put("/api/vehicles/{vehicle_id}", response_model=VehiclePublic)
def update_vehicle(
    vehicle_id: int,
    data: VehicleUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    changes = data.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=400, detail="No fields to update")

    for field, value in changes.items():
        setattr(vehicle, field, value)
    vehicle.updated_at = utcnow()
    db.commit()
    db.refresh(vehicle)
    return vehicle


@app.delete("/api/vehicles/{vehicle_id}", response_model=Message)
def delete_vehicle(
    vehicle_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    db.delete(vehicle)
    db.commit()
    return {"message": "Vehicle deleted"}


@app.post("/api/vehicles/{vehicle_id}/purchase", response_model=VehiclePublic)
def purchase_vehicle(
    vehicle_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return purchase_one(db, vehicle_id)


@app.post("/api/vehicles/{vehicle_id}/restock", response_model=VehiclePublic)
def restock_vehicle(
    vehicle_id: int,
    data: RestockRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    updated = db.execute(
        update(Vehicle)
        .where(Vehicle.id == vehicle_id)
        .values(quantity=Vehicle.quantity + data.quantity, updated_at=utcnow())
        .returning(Vehicle.id)
    ).first()
    if updated is None:
        db.rollback()
        raise HTTPException(status_code=404, detail="Vehicle not found")
    db.commit()
    return db.get(Vehicle, vehicle_id)
