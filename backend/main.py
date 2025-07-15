from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel
import os
import redis
import json
from datetime import datetime
import time
from sqlalchemy import text
import logging

from database import get_db, Base, engine
from schemas import UserCreate, UserUpdate, UserResponse
import crud

# Configurar logging
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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

# Health check response model
class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    services: Dict[str, Any]
    response_time_ms: float

@app.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    logger.info("Health check requested")
    start_time = time.time()
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "services": {},
        "response_time_ms": 0.0
    }
    
    # Test database connection
    try:
        db.execute(text("SELECT 1"))
        health_status["services"]["database"] = {
            "status": "healthy",
            "message": "Database connection successful"
        }
        logger.info("Database health check: OK")
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["services"]["database"] = {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}"
        }
        logger.error(f"Database health check failed: {e}")
    
    # Test Redis connection
    try:
        redis_client.ping()
        health_status["services"]["redis"] = {
            "status": "healthy",
            "message": "Redis connection successful"
        }
        logger.info("Redis health check: OK")
    except Exception as e:
        # Redis is optional, so we mark as warning instead of unhealthy
        health_status["services"]["redis"] = {
            "status": "warning",
            "message": f"Redis connection failed: {str(e)}"
        }
        logger.warning(f"Redis health check failed: {e}")
    
    # Calculate response time
    end_time = time.time()
    health_status["response_time_ms"] = round((end_time - start_time) * 1000, 2)
    
    # Determine overall status
    db_status = health_status["services"]["database"]["status"]
    if db_status == "unhealthy":
        health_status["status"] = "unhealthy"
    elif db_status == "healthy" and health_status["services"]["redis"]["status"] in ["healthy", "warning"]:
        health_status["status"] = "healthy"
    
    logger.info(f"Health check completed - Status: {health_status['status']}, Response time: {health_status['response_time_ms']}ms")
    return health_status

@app.get("/health/ready")
def readiness_check():
    """Simple readiness check without dependencies - faster for load balancers"""
    logger.info("Readiness check requested")
    return {
        "status": "ready",
        "timestamp": datetime.now().isoformat(),
        "message": "Application is ready to serve requests"
    }

@app.post("/users/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    logger.info(f"Creating new user with email: {user.email}")
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        logger.warning(f"Attempt to create user with existing email: {user.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    new_user = crud.create_user(db=db, user=user)
    logger.info(f"User created successfully with ID: {new_user.id}")
    
    # Limpa cache de listagem quando criar um novo usuário
    try:
        # Remove todas as chaves de cache de listagem
        for key in redis_client.scan_iter(match="users:skip:*"):
            redis_client.delete(key)
        logger.info("Cache cleared for user creation")
    except redis.ConnectionError as e:
        logger.warning(f"Redis connection error when clearing cache: {e}")
    except Exception as e:
        logger.error(f"Unexpected error when clearing cache: {e}")
    
    return new_user

# Create a response model for paginated users
class PaginatedUsers(BaseModel):
    items: List[UserResponse]
    total: int
    skip: int
    limit: int

@app.get("/users/", response_model=List[UserResponse])
def read_users(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    cache_key = f"users:skip:{skip}:limit:{limit}"
    logger.info(f"Fetching users with skip={skip}, limit={limit}")
    
    # Tenta buscar no cache, mas trata erro se Redis não estiver disponível
    try:
        cached_users = redis_client.get(cache_key)
        if cached_users:
            logger.info(f"Cache hit for key: {cache_key}")
            users_data = json.loads(cached_users)
            return [UserResponse(**user) for user in users_data]
        else:
            logger.info(f"Cache miss for key: {cache_key}")
    except redis.ConnectionError as e:
        logger.warning(f"Redis connection error: {e}")
    except Exception as e:
        logger.error(f"Redis error when reading cache: {e}")
    
    # Busca no banco de dados
    users = crud.get_users(db, skip=skip, limit=limit)
    logger.info(f"Retrieved {len(users)} users from database")
    
    # Tenta salvar no cache, mas não falha se Redis não estiver disponível
    try:
        users_json = [UserResponse.model_validate(user).model_dump() for user in users]
        redis_client.setex(cache_key, CACHE_EXPIRE_SECONDS, json.dumps(users_json, default=str))
        logger.info(f"Cache saved for key: {cache_key}")
    except redis.ConnectionError as e:
        logger.warning(f"Redis connection error when saving cache: {e}")
    except Exception as e:
        logger.error(f"Unexpected error when saving cache: {e}")
    
    return users

@app.get("/users/{user_id}", response_model=UserResponse)
def read_user(user_id: int, db: Session = Depends(get_db)):
    cache_key = f"user:{user_id}"
    logger.info(f"Fetching user with ID: {user_id}")
    
    # Tenta buscar no cache, mas trata erro se Redis não estiver disponível
    try:
        cached_user = redis_client.get(cache_key)
        if cached_user:
            logger.info(f"Cache hit for user ID: {user_id}")
            return json.loads(cached_user)
        else:
            logger.info(f"Cache miss for user ID: {user_id}")
    except redis.ConnectionError as e:
        logger.warning(f"Redis connection error: {e}")
    except Exception as e:
        logger.error(f"Redis error when reading cache: {e}")
    
    # Busca no banco de dados
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        logger.warning(f"User not found with ID: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    logger.info(f"User {user_id} retrieved from database")
    
    # Tenta salvar no cache, mas não falha se Redis não estiver disponível
    user_response = UserResponse.model_validate(db_user)
    try:
        redis_client.setex(cache_key, CACHE_EXPIRE_SECONDS, user_response.model_dump_json())
        logger.info(f"Cache saved for user ID: {user_id}")
    except redis.ConnectionError as e:
        logger.warning(f"Redis connection error when saving cache: {e}")
    except Exception as e:
        logger.error(f"Unexpected error when saving cache: {e}")
    
    return user_response

@app.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    logger.info(f"Updating user with ID: {user_id}")
    db_user = crud.update_user(db, user_id=user_id, user_update=user_update)
    if db_user is None:
        logger.warning(f"Attempt to update non-existent user: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    logger.info(f"User {user_id} updated successfully")
    
    # Limpa cache do usuário específico e cache de listagem
    try:
        cache_key = f"user:{user_id}"
        redis_client.delete(cache_key)
        # Remove cache de listagem também
        for key in redis_client.scan_iter(match="users:skip:*"):
            redis_client.delete(key)
        logger.info(f"Cache cleared for user update: {user_id}")
    except redis.ConnectionError as e:
        logger.warning(f"Redis connection error when clearing cache: {e}")
    except Exception as e:
        logger.error(f"Unexpected error when clearing cache: {e}")
    
    return db_user

@app.get("/users/search/", response_model=List[UserResponse])
def search_users_api(search: str = "", skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    cache_key = f"users:search:{search}:skip:{skip}:limit:{limit}"
    logger.info(f"Searching users with term: '{search}', skip={skip}, limit={limit}")
    
    # Tenta buscar no cache, mas trata erro se Redis não estiver disponível
    try:
        cached_users = redis_client.get(cache_key)
        if cached_users:
            logger.info(f"Cache hit for search: {search}")
            users_data = json.loads(cached_users)
            return [UserResponse(**user) for user in users_data]
        else:
            logger.info(f"Cache miss for search: {search}")
    except redis.ConnectionError as e:
        logger.warning(f"Redis connection error: {e}")
    except Exception as e:
        logger.error(f"Redis error when reading cache: {e}")
    
    # Busca no banco de dados
    users = crud.search_users(db, search_term=search, skip=skip, limit=limit)
    logger.info(f"Search returned {len(users)} users for term: '{search}'")
    
    # Tenta salvar no cache, mas não falha se Redis não estiver disponível
    try:
        users_json = [UserResponse.model_validate(user).model_dump() for user in users]
        redis_client.setex(cache_key, CACHE_EXPIRE_SECONDS, json.dumps(users_json, default=str))
        logger.info(f"Cache saved for search: {search}")
    except redis.ConnectionError as e:
        logger.warning(f"Redis connection error when saving cache: {e}")
    except Exception as e:
        logger.error(f"Unexpected error when saving cache: {e}")
    
    return users

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    logger.info(f"Attempting to delete user with ID: {user_id}")
    if not crud.delete_user(db, user_id=user_id):
        logger.warning(f"Attempt to delete non-existent user: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    logger.info(f"User {user_id} deleted successfully")
    
    # Limpa cache do usuário específico e cache de listagem
    try:
        cache_key = f"user:{user_id}"
        redis_client.delete(cache_key)
        # Remove cache de listagem também
        for key in redis_client.scan_iter(match="users:skip:*"):
            redis_client.delete(key)
        logger.info(f"Cache cleared for user deletion: {user_id}")
    except redis.ConnectionError as e:
        logger.warning(f"Redis connection error when clearing cache: {e}")
    except Exception as e:
        logger.error(f"Unexpected error when clearing cache: {e}")
    
    return {"message": f"User {user_id} deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
