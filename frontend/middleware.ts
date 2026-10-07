import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = [
  '/login',
  '/registro',
  '/restablecer-password',
  '/politica-privacidad',
  '/tutor-campo/registro',
];

// Dashboard de destino por rol
const DASHBOARD: Record<string, string> = {
  admin:      '/admin/panel',
  profesor:   '/profesor/dashboard',
  estudiante: '/alumno/dashboard',
};

// La cookie dura 1 día pero el token caduca antes (ACCESS_TOKEN_EXPIRE_MINUTES
// en el backend). Con un token caducado el usuario quedaba atrapado: el backend
// rechazaba todo y /login le devolvía al panel. Leemos el "exp" del JWT para
// tratar ese caso como "sin sesión".
function tokenCaducado(token: string): boolean {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
    return typeof exp === 'number' && exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function borrarSesion(response: NextResponse) {
  response.cookies.delete('practicum_token');
  response.cookies.delete('practicum_rol');
  return response;
}

export function middleware(request: NextRequest) {
  const tokenCookie = request.cookies.get('practicum_token')?.value;
  const caducado = !!tokenCookie && tokenCaducado(tokenCookie);
  const token = caducado ? undefined : tokenCookie;
  const rol   = request.cookies.get('practicum_rol')?.value;
  const { pathname } = request.nextUrl;

  const respuesta = (r: NextResponse) => (caducado ? borrarSesion(r) : r);

  const esPublica = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

  // ── 1. Usuario autenticado intentando entrar al login o al registro ──
  //    → redirigir a su propio dashboard. El resto de páginas públicas
  //    (enlace de tutor de campo, restablecer contraseña, privacidad) deben
  //    abrirse aunque haya sesión.
  const esLoginORegistro = pathname === '/login' || pathname === '/registro';
  if (token && rol && esPublica && esLoginORegistro) {
    const destino = DASHBOARD[rol];
    if (destino) {
      return NextResponse.redirect(new URL(destino, request.url));
    }
  }

  // ── 2. Usuario NO autenticado intentando entrar a ruta protegida ──
  const esProtegida =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/profesor') ||
    pathname.startsWith('/alumno');

  if (!token && esProtegida) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return respuesta(NextResponse.redirect(loginUrl));
  }

  // ── 3. Usuario autenticado en sección que no le corresponde ──
  //    → redirigir a SU dashboard, no al login
  if (token && rol) {
    const mismatch =
      (pathname.startsWith('/admin')    && rol !== 'admin')    ||
      (pathname.startsWith('/profesor') && rol !== 'profesor') ||
      (pathname.startsWith('/alumno')   && rol !== 'estudiante');

    if (mismatch) {
      const destino = DASHBOARD[rol] ?? '/login';
      return NextResponse.redirect(new URL(destino, request.url));
    }
  }

  return respuesta(NextResponse.next());
}

export const config = {
  matcher: [
    // Rutas protegidas
    '/admin/:path*',
    '/profesor/:path*',
    '/alumno/:path*',
    // Rutas públicas para la redirección del paso 1
    '/login',
    '/registro',
    '/restablecer-password',
    '/politica-privacidad',
    '/tutor-campo/registro',
  ],
};
