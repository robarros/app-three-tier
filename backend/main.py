from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import os
import redis
import json
from datetime import datetime

from database import get_db, Base, engine
from schemas import UserCreate, UserUpdate, UserResponse
import crud

# Redis client
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.from_url(redis_url, decode_responses=True)

# Tempo de expiração do cache em segundos
CACHE_EXPIRE_SECONDS = int(os.getenv("CACHE_EXPIRE_SECONDS", 300))

# Serializer customizado para datetime
def datetime_serializer(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="User Management API",
    description="A simple CRUD API for user management",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "User Management API is running!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/users/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    return crud.create_user(db=db, user=user)

# Create a response model for paginated users
class PaginatedUsers(BaseModel):
    items: List[UserResponse]
    total: int
    skip: int
    limit: int

@app.get("/users/", response_model=List[UserResponse])
def read_users(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

@app.get("/users/{user_id}", response_model=UserResponse)
def read_user(user_id: int, db: Session = Depends(get_db)):
    cache_key = f"user:{user_id}"
    
    # Tenta buscar no cache, mas trata erro se Redis não estiver disponível
    try:
        cached_user = redis_client.get(cache_key)
        if cached_user:
            return json.loads(cached_user)
    except redis.ConnectionError:
        # Redis não disponível, continua sem cache
        pass
    except Exception:
        # Qualquer outro erro do Redis, continua sem cache
        pass
    
    # Busca no banco de dados
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Tenta salvar no cache, mas não falha se Redis não estiver disponível
    user_response = UserResponse.model_validate(db_user)
    try:
        redis_client.setex(cache_key, CACHE_EXPIRE_SECONDS, user_response.model_dump_json())
    except:
        # Falha silenciosamente se não conseguir salvar no cache
        pass
    
    return user_response

@app.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    db_user = crud.update_user(db, user_id=user_id, user_update=user_update)
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    # Tenta limpar cache, mas não falha se Redis não estiver disponível
    try:
        cache_key = f"user:{user_id}"
        redis_client.delete(cache_key)
    except:
        pass
    return db_user

@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    if not crud.delete_user(db, user_id=user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    # Tenta limpar cache, mas não falha se Redis não estiver disponível
    try:
        cache_key = f"user:{user_id}"
        redis_client.delete(cache_key)
    except:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
