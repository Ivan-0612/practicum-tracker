"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Lock, Mail, ArrowLeft, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import Cookies from "js-cookie";
import { despertarServidor, fetchConReintento, leerJson } from "@/lib/servidor";

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
  const [despertando, setDespertando] = useState(false);

  useEffect(() => {
    despertarServidor();
  }, []);

  // --- Estado recuperación ---
  const [emailRecuperacion, setEmailRecuperacion] = useState("");
  const [mensajeRecuperacion, setMensajeRecuperacion] = useState("");
  const [errorRecuperacion, setErrorRecuperacion] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setDespertando(false);
    setErrorMensaje("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", email.trim().toLowerCase());
      formData.append("password", password);

      const response = await fetchConReintento(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData,
        },
        () => setDespertando(true)
      );

      const data = await leerJson(response);

      if (!response.ok) {
        const detalle = typeof data.detail === "string" ? data.detail : "";
        throw new Error(
          detalle ||
            (response.status >= 500
              ? "El servidor ha tenido un problema. Vuelve a intentarlo en unos segundos."
              : "Error al iniciar sesión")
        );
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
      setDespertando(false);
    }
  };

  const handleRecuperacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setMensajeRecuperacion("");
    setErrorRecuperacion("");

    try {
      await fetchConReintento(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/recuperar-password/solicitar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailRecuperacion.trim() })
      });
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

  const inputClass = "w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none transition-all text-sm text-gray-700 dark:text-gray-200 font-medium shadow-sm hover:border-gray-300 dark:hover:border-gray-500";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">

      {/* CABECERA */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center text-center mb-8">
        <div className="bg-white dark:bg-[#0f172a] border border-gray-100 dark:border-gray-700 rounded-2xl p-3 shadow-sm mb-5">
          <Image
            src="/logo-ufv.png"
            alt="Logo UFV"
            width={52}
            height={52}
            className="object-contain"
          />
        </div>
        <h2 className="text-3xl font-black text-ufv-azul-oscuro dark:text-white tracking-tight">
          Practicum <span className="text-ufv-rosa-claro">Tracker</span>
        </h2>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
          Universidad Francisco de Vitoria
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">

          {/* ========================= MODO LOGIN ========================= */}
          {modo === "login" && (
            <>
              <div className="flex items-center gap-3 mb-7">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-xl text-ufv-azul">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-ufv-azul-oscuro dark:text-white">Iniciar sesión</h1>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">Accede con tu cuenta</p>
                </div>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      placeholder="tu@correo.ufv.es"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClass} pr-10`}
                      placeholder="Tu contraseña"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-ufv-azul transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {despertando && !errorMensaje && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    El servidor se está iniciando tras un rato sin uso. Puede tardar hasta un minuto, no cierres la página.
                  </div>
                )}

                {errorMensaje && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {errorMensaje}
                  </div>
                )}

                <div className="pt-1 border-t border-gray-100 dark:border-gray-700 mt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-ufv-azul text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-ufv-azul-oscuro transition-all shadow-sm text-sm disabled:opacity-60 disabled:cursor-not-allowed mt-4"
                  >
                    {isLoading ? "Procesando..." : "Iniciar sesión"}
                  </button>
                </div>
              </form>

              <div className="mt-6 flex items-center justify-center gap-4 pt-5 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => router.push("/registro")}
                  className="text-xs font-bold text-ufv-azul hover:text-ufv-azul-oscuro transition-colors"
                >
                  Crear cuenta
                </button>
                <span className="text-gray-200 dark:text-gray-700 font-bold">|</span>
                <button
                  type="button"
                  onClick={() => setModo("recuperar")}
                  className="text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-ufv-azul dark:hover:text-ufv-azul transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => router.push("/politica-privacidad")}
                  className="text-xs text-gray-300 dark:text-gray-600 hover:text-ufv-azul dark:hover:text-ufv-azul transition-colors underline underline-offset-2"
                >
                  Política de privacidad
                </button>
              </div>
            </>
          )}

          {/* ====================== MODO RECUPERACIÓN ====================== */}
          {modo === "recuperar" && (
            <>
              <div className="flex items-center gap-3 mb-7">
                <div className="bg-rose-50 dark:bg-rose-900/20 p-2.5 rounded-xl text-ufv-rosa-oscuro">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-ufv-azul-oscuro dark:text-white">Recuperar contraseña</h1>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">Te enviaremos un enlace de restablecimiento</p>
                </div>
              </div>

              {mensajeRecuperacion ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    {mensajeRecuperacion}
                  </div>
                  <button
                    type="button"
                    onClick={volverAlLogin}
                    className="w-full py-2.5 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRecuperacion} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Email institucional
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <input
                        type="email"
                        required
                        autoFocus
                        value={emailRecuperacion}
                        onChange={(e) => setEmailRecuperacion(e.target.value)}
                        className={inputClass}
                        placeholder="tu@correo.ufv.es"
                      />
                    </div>
                  </div>

                  {errorRecuperacion && (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errorRecuperacion}
                    </div>
                  )}

                  <div className="pt-1 border-t border-gray-100 dark:border-gray-700 space-y-2 mt-2">
                    <button
                      type="submit"
                      disabled={enviando}
                      className="w-full py-2.5 bg-ufv-azul text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-ufv-azul-oscuro transition-all shadow-sm text-sm disabled:opacity-60 disabled:cursor-not-allowed mt-4"
                    >
                      {enviando ? "Enviando..." : <><Send className="w-4 h-4" /> Enviar enlace</>}
                    </button>
                    <button
                      type="button"
                      onClick={volverAlLogin}
                      className="w-full py-2.5 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm text-sm"
                    >
                      <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
