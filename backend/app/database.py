# este archivo se utiliza para conectarse a la base de datos
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Cargar las variables de entorno del archivo .env
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "")

# requirements.txt instala psycopg 3. Si la URL no indica driver
# ("postgresql://" o "postgres://"), SQLAlchemy buscaría psycopg2, que ya no
# está instalado, y el backend no arrancaría. Forzamos el driver correcto.
for _prefijo in ("postgresql://", "postgres://"):
    if DATABASE_URL.startswith(_prefijo):
        DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len(_prefijo):]
        break

SQLALCHEMY_DATABASE_URL = DATABASE_URL
# Crear el motor de conexión.
# pool_pre_ping: comprueba la conexión antes de usarla. Supabase cierra las
# conexiones inactivas y, sin esto, la primera petición tras un rato sin uso
# (normalmente el login) fallaba con error 500.
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)

# Crear la fábrica de sesiones para hablar con la base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Clase base de la que heredarán todos nuestros modelos
Base = declarative_base()


# Dependencia para inyectar la conexión en nuestros endpoints de FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
