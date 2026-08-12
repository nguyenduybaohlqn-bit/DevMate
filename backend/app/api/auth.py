from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services import auth_service

router = APIRouter(prefix="/auth")

class SignupRequest(BaseModel):
    username: str
    email: str
    password: str

class SigninRequest(BaseModel):
    email: str
    password: str

@router.post("/signup")
def signup(signup_request: SignupRequest):
    try:
        return auth_service.signup(
            signup_request.username, 
            signup_request.email, 
            signup_request.password
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Lỗi hệ thống nội bộ!"
        )

@router.post("/signin")
def signin(signin_request: SigninRequest):
    try:
        return auth_service.signin(signin_request.email, signin_request.password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Lỗi hệ thống nội bộ!"
        )