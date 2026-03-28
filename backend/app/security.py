# codigo necesario para cifrar contraseñas y cifrar datos sensibles (nombre y email)

import os
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import jwt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import secrets
from dotenv import load_dotenv
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from . import models, database  # Asegúrate de que estas rutas son correctas
import os


load_dotenv()

# --- CONFIGURACIÓN DE VARIABLES ---
SECRET_KEY = os.getenv("SECRET_KEY", "super_secreto_fallback")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))

# Convertimos la clave del .env a bytes (debe tener exactamente 32 caracteres/bytes para AES-256)
MASTER_KEY = os.getenv(
    "MASTER_ENCRYPTION_KEY", "12345678901234567890123456789012"
).encode("utf-8")

# --- 1. HASHING DE CONTRASEÑAS (Argon2) ---
# Configuramos Passlib para usar Argon2
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """Convierte una contraseña en texto plano a un hash indescifrable"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Comprueba si la contraseña introducida coincide con el hash guardado"""
    return pwd_context.verify(plain_password, hashed_password)


# --- 2. TOKENS JWT (Autenticación) ---
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Genera el token de sesión temporal para el usuario"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# --- 3. CIFRADO RGPD (AES-256-GCM) ---
def _get_aesgcm() -> AESGCM:
    return AESGCM(MASTER_KEY)


def cifrar_dato(texto_plano: str) -> bytes:
    """Cifra un texto (ej: 'Juan') y devuelve bytes ilegibles"""
    if not texto_plano:
        return b""
    aesgcm = _get_aesgcm()
    # AES-GCM requiere un 'nonce' (número usado una sola vez) de 12 bytes por seguridad
    nonce = secrets.token_bytes(12)
    # Ciframos el texto
    ciphertext = aesgcm.encrypt(nonce, texto_plano.encode("utf-8"), None)
    # Pegamos el nonce al principio para saber cómo descifrarlo después
    return nonce + ciphertext


def descifrar_dato(dato_cifrado: bytes) -> str:
    """Toma los bytes ilegibles de la BD y devuelve el texto original"""
    if not dato_cifrado:
        return ""
    aesgcm = _get_aesgcm()
    # Separamos el nonce (los primeros 12 bytes) del texto cifrado (el resto)
    nonce = dato_cifrado[:12]
    ciphertext = dato_cifrado[12:]
    # Desciframos
    texto_plano = aesgcm.decrypt(nonce, ciphertext, None)
    return texto_plano.decode("utf-8")


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el acceso",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Desciframos el token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # ¡EL CAMBIO CLAVE! Extraemos el ID, no el email
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    # Buscamos al usuario en la base de datos por su ID
    user = db.query(models.Usuario).filter(models.Usuario.id == user_id_str).first()

    if user is None:
        raise credentials_exception

    return user
