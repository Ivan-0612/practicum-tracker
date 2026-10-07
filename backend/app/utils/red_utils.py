from fastapi import Request
from slowapi.util import get_remote_address


def obtener_ip_cliente(request: Request) -> str:
    """IP real del usuario para el limitador de peticiones.

    En Render las peticiones llegan a través de su proxy (Cloudflare), así que
    request.client.host es la IP del proxy y no la del usuario. Si se usara esa
    IP, todos los usuarios compartirían el mismo límite de intentos de login y
    bastaría con que unos pocos tutores entraran a la vez para bloquear a todos.
    """
    ip = request.headers.get("cf-connecting-ip")
    if ip:
        return ip.strip()

    reenviada = request.headers.get("x-forwarded-for")
    if reenviada:
        return reenviada.split(",")[0].strip()

    return get_remote_address(request)
