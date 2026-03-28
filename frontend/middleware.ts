import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Intentamos obtener el token y el rol de las cookies
  const token = request.cookies.get('practicum_token')?.value;
  const rol = request.cookies.get('practicum_rol')?.value;

  const { pathname } = request.nextUrl;

  // 2. Si el usuario intenta entrar a una ruta protegida sin token, al login
  if (!token && (pathname.startsWith('/admin') || pathname.startsWith('/profesor') || pathname.startsWith('/alumno'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Protección de rutas por ROL (RBAC)
  if (pathname.startsWith('/admin') && rol !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname.startsWith('/profesor') && rol !== 'profesor') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname.startsWith('/alumno') && rol !== 'estudiante') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Configuramos en qué rutas debe actuar este middleware
export const config = {
  matcher: ['/admin/:path*', '/profesor/:path*', '/alumno/:path*'],
};