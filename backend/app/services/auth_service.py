from app.database import SessionLocal
from app.models.user import User
from app.repositories import user_repository


def signin(email: str, password: str):
    db = SessionLocal()
    try:
        user = user_repository.get_by_email(db, email)
        if user is None:
            raise ValueError("Email không tồn tại!")
        if user.password == password:
            return {"status": "success",
            "message": "Đăng nhập thành công!",
            "user": {
                "id": user.id,
                "username": user.username,
            }}
        else:
            raise ValueError("Mật khẩu không chính xác!")
        
    except Exception as e:
        raise e
        
    finally:
        db.close()

def signup(username: str, email: str, password: str):
    db = SessionLocal()
    try:
        existing_user = user_repository.get_by_email(db, email)
        if existing_user:
            raise ValueError("Email đã tồn tại trong hệ thống!")
        
        new_user = User(username=username, email=email, password=password)
        user_repository.create_user(db, new_user)
        return {"status": "success", "message": "Đăng ký thành công!"}
        
    except Exception as e:
        raise e
        
    finally:
        db.close()