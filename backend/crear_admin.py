from app.database import SessionLocal
from app.models import Usuario
from app.security import get_password_hash


def crear_superuser():
    db = SessionLocal()
    email_admin = "admin@universidad.es"
    password_plana = "Admin1234!"

    # Comprobamos si ya existe para no duplicarlo
    usuario_existente = db.query(Usuario).filter(Usuario.email == email_admin).first()
    if usuario_existente:
        print(f"El usuario {email_admin} ya existe en la base de datos.")
        db.close()
        return

    # Creamos el nuevo usuario admin
    nuevo_admin = Usuario(
        email=email_admin, password_hash=get_password_hash(password_plana), rol="admin"
    )

    db.add(nuevo_admin)
    db.commit()
    print(f"¡Éxito! Usuario '{email_admin}' creado con contraseña: '{password_plana}'")
    db.close()


if __name__ == "__main__":
    crear_superuser()
