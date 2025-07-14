from sqlalchemy.orm import Session
from database import User
from schemas import UserCreate, UserUpdate
from typing import List, Optional
from sqlalchemy import or_

def get_user(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    return db.query(User).offset(skip).limit(limit).all()

def search_users(db: Session, search_term: str = None, skip: int = 0, limit: int = 100) -> List[User]:
    if not search_term:
        return get_users(db, skip, limit)
    
    search_pattern = f"%{search_term}%"
    return db.query(User).filter(
        or_(
            User.name.ilike(search_pattern),
            User.email.ilike(search_pattern)
        )
    ).offset(skip).limit(limit).all()

def create_user(db: Session, user: UserCreate) -> User:
    db_user = User(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user:
        update_data = user_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_user, field, value)
        db.commit()
        db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int) -> bool:
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user:
        db.delete(db_user)
        db.commit()
        return True
    return False

def get_total_users(db: Session) -> int:
    return db.query(User).count()
