"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Mail, Lock, ShieldCheck, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff, ArrowRight, ExternalLink } from "lucide-react";

// ─── Validación de contraseña ────────────────────────────────────────────────
function validarPassword(v: string): string | null {
  const patron = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!patron.test(v))
    return "Mínimo 8 caracteres: mayúscula, minúscula, número y carácter especial (@$!%*?&).";
  return null;
}

// ─── Tipos ───────────────────────────────────────────────────────────────────
type Paso = "cargando" | "token_invalido" | "email" | "password_nueva" | "confirmar_existente" | "exito";

// ─── Componente interno (necesita useSearchParams) ───────────────────────────
function RegistroTutorCampoForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [paso, setPaso] = useState<Paso>("cargando");
  const [contexto, setContexto] = useState({ alumno_nombre: "", especialidad: "", ya_usado: false });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorPassword, setErrorPassword] = useState("");

  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");

  // ── 1. Validar token al cargar ──
  useEffect(() => {
    if (!token) { setPaso("token_invalido"); return; }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tutores-campo/verificar-token?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (!data.valido) {
          setContexto(c => ({ ...c, ya_usado: data.ya_usado || false }));
          setPaso("token_invalido");
        } else {
          setContexto({ alumno_nombre: data.alumno_nombre, especialidad: data.especialidad, ya_usado: false });
          setPaso("email");
        }
      })
      .catch(() => setPaso("token_invalido"));
  }, [token]);

  // ── 2. Comprobar si el email ya existe ──
  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGeneral("");
    setCargando(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tutores-campo/verificar-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorGeneral(data.detail || "Error al verificar el email."); return; }
      setPaso(data.existe ? "confirmar_existente" : "password_nueva");
    } catch {
      setErrorGeneral("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  // ── 3. Registrar tutor ──
  const handleRegistrar = async (esNuevo: boolean) => {
    if (esNuevo) {
      const err = validarPassword(password);
      if (err) { setErrorPassword(err); return; }
      setErrorPassword("");
    }
    setErrorGeneral("");
    setCargando(true);
    try {
      const body: any = { token, email };
      if (esNuevo) body.password = password;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tutores-campo/registrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setErrorGeneral(data.detail || "Error al completar el registro."); return; }
      setPaso("exito");
    } catch {
      setErrorGeneral("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  // ── Render ──
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">

      {/* Cabecera corporativa */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center text-center mb-8">
        <Image src="/logo-ufv.png" alt="Logo UFV" width={64} height={64} className="object-contain mb-3" />
        <h2 className="text-2xl font-black text-ufv-azul-oscuro tracking-tight">
          Practicum <span className="text-ufv-rosa-claro">Tracker</span>
        </h2>
        <p className="mt-1 text-xs text-gray-500 font-bold uppercase tracking-widest">
          Universidad Francisco de Vitoria
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-xl rounded-2xl sm:px-10 border-t-4 border-t-ufv-azul">

          {/* ──────────── CARGANDO ──────────── */}
          {paso === "cargando" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-8 h-8 text-ufv-azul animate-spin" />
              <p className="text-gray-500 font-medium text-sm">Verificando enlace...</p>
            </div>
          )}

          {/* ──────────── TOKEN INVÁLIDO ──────────── */}
          {paso === "token_invalido" && (
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
              <h3 className="text-xl font-black text-gray-800">Enlace no válido</h3>
              <p className="text-sm text-gray-500 font-medium">
                {contexto.ya_usado
                  ? "Este enlace ya fue utilizado. Si el tutor ya se registró, puede acceder directamente con su cuenta."
                  : "El enlace ha caducado o no es correcto. Pide al alumno que genere uno nuevo desde su panel."}
              </p>
              <button
                onClick={() => router.push("/login")}
                className="mt-4 px-6 py-2.5 bg-ufv-azul text-white font-bold rounded-xl text-sm hover:bg-ufv-azul-oscuro transition-all"
              >
                Ir al inicio de sesión
              </button>
            </div>
          )}

          {/* ──────────── PASO: EMAIL ──────────── */}
          {paso === "email" && (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-5 h-5 text-ufv-azul" />
                  <h3 className="text-xl font-black text-ufv-azul-oscuro">Registro como Tutor de Campo</h3>
                </div>
                <p className="text-sm text-gray-500 font-medium">
                  Has sido invitado a evaluar a <span className="font-bold text-gray-700">{contexto.alumno_nombre}</span> en la especialidad de <span className="font-bold text-gray-700">{contexto.especialidad}</span>.
                </p>
              </div>

              <form onSubmit={handleSubmitEmail} className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                    Tu email profesional
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul sm:text-sm transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Cláusula informativa */}
                <div className={`rounded-xl border p-4 transition-colors ${aceptaPrivacidad ? "border-ufv-azul bg-blue-50" : "border-gray-200 bg-gray-50"}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aceptaPrivacidad}
                      onChange={(e) => setAceptaPrivacidad(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-ufv-azul shrink-0"
                    />
                    <span className="text-xs text-gray-600 leading-relaxed">
                      He leído y acepto la{" "}
                      <a
                        href="/politica-privacidad"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-ufv-azul hover:text-ufv-azul-oscuro underline inline-flex items-center gap-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        política de privacidad
                        <ExternalLink className="w-3 h-3" />
                      </a>{" "}
                      de la UFV. El responsable del tratamiento es la Universidad Francisco de Vitoria. La
                      legitimación es el consentimiento del interesado. Los datos se conservarán cinco años.
                      Puede ejercitar sus derechos en{" "}
                      <a href="mailto:dpd@ufv.es" className="font-bold text-ufv-azul underline" onClick={(e) => e.stopPropagation()}>
                        dpd@ufv.es
                      </a>.
                    </span>
                  </label>
                </div>

                {errorGeneral && (
                  <p className="text-red-600 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100">
                    ⚠️ {errorGeneral}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={cargando || !aceptaPrivacidad}
                  className="w-full flex justify-center items-center gap-2 py-3 bg-ufv-azul text-white font-bold rounded-xl hover:bg-ufv-azul-oscuro shadow-md active:scale-95 transition-all disabled:opacity-50"
                >
                  {cargando
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Comprobando...</>
                    : <><ArrowRight className="w-4 h-4" /> Siguiente</>
                  }
                </button>
              </form>
            </>
          )}

          {/* ──────────── PASO: NUEVA CUENTA → CREAR CONTRASEÑA ──────────── */}
          {paso === "password_nueva" && (
            <>
              <div className="mb-6">
                <h3 className="text-xl font-black text-ufv-azul-oscuro mb-1">Crea tu contraseña</h3>
                <p className="text-sm text-gray-500 font-medium">
                  El correo <span className="font-bold text-gray-700">{email}</span> no tiene cuenta todavía. Elige una contraseña para registrarte.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      autoFocus
                      value={password}
                      onChange={e => { setPassword(e.target.value); setErrorPassword(""); }}
                      placeholder="Mínimo 8 caracteres"
                      className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul sm:text-sm transition-all outline-none"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(s => !s)}
                    >
                      {showPassword
                        ? <EyeOff className="h-5 w-5 text-gray-400" />
                        : <Eye className="h-5 w-5 text-gray-400" />
                      }
                    </button>
                  </div>
                  {errorPassword && (
                    <p className="text-red-500 text-xs mt-1.5 font-medium">{errorPassword}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-1.5 font-medium">
                    Debe incluir mayúscula, minúscula, número y símbolo especial.
                  </p>
                </div>

                {errorGeneral && (
                  <p className="text-red-600 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100">
                    ⚠️ {errorGeneral}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setPaso("email"); setErrorGeneral(""); }}
                    className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors text-sm"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRegistrar(true)}
                    disabled={cargando || !password}
                    className="flex-1 py-3 bg-ufv-azul text-white font-bold rounded-xl hover:bg-ufv-azul-oscuro shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {cargando
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</>
                      : "Crear cuenta"
                    }
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ──────────── PASO: CUENTA EXISTENTE → CONFIRMAR ──────────── */}
          {paso === "confirmar_existente" && (
            <>
              <div className="mb-6">
                <h3 className="text-xl font-black text-ufv-azul-oscuro mb-1">Ya tienes cuenta</h3>
                <p className="text-sm text-gray-500 font-medium">
                  El correo <span className="font-bold text-gray-700">{email}</span> ya está registrado en la plataforma.
                  Confirma para quedar asignado como tutor de <span className="font-bold text-gray-700">{contexto.alumno_nombre}</span>.
                </p>
              </div>

              {errorGeneral && (
                <p className="text-red-600 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100 mb-4">
                  ⚠️ {errorGeneral}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setPaso("email"); setErrorGeneral(""); }}
                  className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors text-sm"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={() => handleRegistrar(false)}
                  disabled={cargando}
                  className="flex-1 py-3 bg-ufv-azul text-white font-bold rounded-xl hover:bg-ufv-azul-oscuro shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {cargando
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : "Confirmar asignación"
                  }
                </button>
              </div>
            </>
          )}

          {/* ──────────── ÉXITO ──────────── */}
          {paso === "exito" && (
            <div className="text-center space-y-4 py-2">
              <CheckCircle2 className="w-14 h-14 text-ufv-azul mx-auto" />
              <h3 className="text-2xl font-black text-ufv-azul-oscuro">¡Todo listo!</h3>
              <p className="text-sm text-gray-500 font-medium">
                Quedas asignado como tutor de campo de <span className="font-bold text-gray-700">{contexto.alumno_nombre}</span>. Ya puedes acceder a la plataforma con tu correo y contraseña.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="mt-4 w-full py-3 bg-ufv-azul text-white font-bold rounded-xl hover:bg-ufv-azul-oscuro shadow-md active:scale-95 transition-all"
              >
                Ir al inicio de sesión
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Wrapper con Suspense (requerido por Next.js para useSearchParams) ───────
export default function RegistroTutorCampoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-ufv-azul animate-spin" />
      </div>
    }>
      <RegistroTutorCampoForm />
    </Suspense>
  );
}
