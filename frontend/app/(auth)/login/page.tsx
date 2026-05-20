"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Lock, Mail, ArrowLeft, Send } from "lucide-react";
import Cookies from "js-cookie";

type Modo = "login" | "recuperar";

export default function LoginPage() {
  const router = useRouter();

  const [modo, setModo] = useState<Modo>("login");

  // --- Estado login ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // --- Estado recuperación ---
  const [emailRecuperacion, setEmailRecuperacion] = useState("");
  const [mensajeRecuperacion, setMensajeRecuperacion] = useState("");
  const [errorRecuperacion, setErrorRecuperacion] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMensaje("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Error al iniciar sesión");
      }

      Cookies.set("practicum_token", data.access_token, { expires: 1 });
      Cookies.set("practicum_rol", data.rol, { expires: 1 });

      if (data.rol === "admin") {
        router.push("/admin/panel");
      } else if (data.rol === "profesor") {
        router.push("/profesor/dashboard");
      } else {
        router.push("/alumno/dashboard");
      }

    } catch (error: any) {
      setErrorMensaje(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecuperacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setMensajeRecuperacion("");
    setErrorRecuperacion("");

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/recuperar-password/solicitar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailRecuperacion })
      });
      // Respuesta siempre positiva (no revelamos si el email existe)
      setMensajeRecuperacion("Si el correo está registrado, recibirás el enlace en unos minutos. Revisa también la carpeta de spam.");
    } catch {
      setErrorRecuperacion("Error al conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const volverAlLogin = () => {
    setModo("login");
    setEmailRecuperacion("");
    setMensajeRecuperacion("");
    setErrorRecuperacion("");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">

      {/* CABECERA CORPORATIVA */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center text-center">
        <Image
          src="/logo-ufv.png"
          alt="Logo UFV"
          width={72}
          height={72}
          className="object-contain mb-4"
        />
        <h2 className="text-3xl font-black text-ufv-azul-oscuro tracking-tight">
          Practicum <span className="text-ufv-rosa-claro">Tracker</span>
        </h2>
        <p className="mt-2 text-xs text-gray-500 font-bold uppercase tracking-widest">
          Universidad Francisco de Vitoria
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-ufv-blanco py-10 px-6 shadow-xl rounded-2xl sm:px-12 border-t-4 border-t-ufv-azul">

          {/* ========================= MODO LOGIN ========================= */}
          {modo === "login" && (
            <>
              <form className="space-y-6" onSubmit={handleSubmit}>

                {/* Campo Email */}
                <div>
                  <label className="block text-sm font-bold text-ufv-azul-oscuro mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul sm:text-sm transition-all outline-none"
                      placeholder="Tu correo"
                    />
                  </div>
                </div>

                {/* Campo Contraseña */}
                <div>
                  <label className="block text-sm font-bold text-ufv-azul-oscuro mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul sm:text-sm transition-all outline-none"
                      placeholder="Tu contraseña"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-ufv-azul" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400 hover:text-ufv-azul" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {errorMensaje && (
                  <div className="text-ufv-rosa-oscuro text-xs text-center font-bold bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2 justify-center">
                    <span>⚠️ {errorMensaje}</span>
                  </div>
                )}

                {/* Botón Iniciar sesión */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-ufv-blanco transition-all ${
                      isLoading
                        ? "bg-ufv-azul-claro cursor-not-allowed"
                        : "bg-ufv-azul hover:bg-ufv-azul-oscuro hover:-translate-y-0.5 active:translate-y-0"
                    }`}
                  >
                    {isLoading ? "Procesando..." : "Iniciar sesión"}
                  </button>
                </div>
              </form>

              {/* Links inferiores */}
              <div className="mt-8 text-center border-t border-gray-100 pt-6 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => router.push("/registro")}
                  className="text-sm font-bold text-ufv-azul hover:text-ufv-azul-oscuro transition-colors"
                >
                  Crear cuenta
                </button>
                <span className="text-gray-300 font-bold">|</span>
                <button
                  type="button"
                  onClick={() => setModo("recuperar")}
                  className="text-sm font-bold text-ufv-rosa-oscuro hover:text-ufv-rosa-claro transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Política de privacidad */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => router.push("/politica-privacidad")}
                  className="text-xs text-gray-400 hover:text-ufv-azul transition-colors underline underline-offset-2"
                >
                  Política de privacidad
                </button>
              </div>
            </>
          )}

          {/* ====================== MODO RECUPERACIÓN ====================== */}
          {modo === "recuperar" && (
            <>
              {/* Cabecera del panel */}
              <div className="text-center mb-8">
                <div className="mx-auto w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mb-3">
                  <Mail className="w-6 h-6 text-ufv-rosa-oscuro" />
                </div>
                <h3 className="text-lg font-black text-ufv-azul-oscuro">Recuperar contraseña</h3>
                <p className="mt-1 text-xs text-gray-500 font-medium">
                  Introduce tu email y te enviaremos un enlace para restablecerla.
                </p>
              </div>

              {mensajeRecuperacion ? (
                /* Estado: email enviado */
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-medium p-4 rounded-xl text-center">
                    ✅ {mensajeRecuperacion}
                  </div>
                  <button
                    type="button"
                    onClick={volverAlLogin}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
                  </button>
                </div>
              ) : (
                /* Formulario de recuperación */
                <form onSubmit={handleRecuperacion} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-ufv-azul-oscuro mb-2">
                      Email institucional
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        required
                        autoFocus
                        value={emailRecuperacion}
                        onChange={(e) => setEmailRecuperacion(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul sm:text-sm transition-all outline-none"
                        placeholder="tu@correo.ufv.es"
                      />
                    </div>
                  </div>

                  {errorRecuperacion && (
                    <div className="text-red-600 text-xs text-center font-bold bg-red-50 p-3 rounded-xl border border-red-100">
                      ⚠️ {errorRecuperacion}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={enviando}
                    className={`w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white transition-all ${
                      enviando
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-ufv-rosa-oscuro hover:brightness-90 active:scale-95"
                    }`}
                  >
                    {enviando ? (
                      "Enviando..."
                    ) : (
                      <><Send className="w-4 h-4" /> Enviar enlace de recuperación</>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={volverAlLogin}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
                  </button>
                </form>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
