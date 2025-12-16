from datetime import datetime, timedelta
from jose import jwt
import bcrypt
import os


SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET is not configured")

if not ALGORITHM:
    raise RuntimeError("JWT Algorithm is not configured")

ACCESS_TOKEN_EXPIRE_MINUTES = 600

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # bcrypt benötigt byte-strings, daher encode()
    # checkpw vergleicht das Klartext-PW mit dem Hash
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )

def get_password_hash(password: str) -> str:
    # Salt generieren und Passwort hashen
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    # Rückgabe als String für die Datenbank
    return hashed.decode('utf-8')

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt