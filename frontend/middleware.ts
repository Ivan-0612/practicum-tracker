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

export function middleware(request: NextRequest) {
  const token = request.cookies.get('practicum_token')?.value;
  const rol   = request.cookies.get('practicum_rol')?.value;
  const { pathname } = request.nextUrl;

  const esPublica = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

  // ── 1. Usuario autenticado intentando entrar a una página pública ──
  //    → redirigir a su propio dashboard
  if (token && rol && esPublica) {
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
    return NextResponse.redirect(loginUrl);
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

  return NextResponse.next();
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
