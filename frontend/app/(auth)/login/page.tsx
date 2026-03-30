"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Cookies from "js-cookie";

export default function LoginPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [infoMensaje, setInfoMensaje] = useState(""); // Para avisos de recuperación

  // --- LÓGICA DE LOGIN ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMensaje("");
    setInfoMensaje("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch("http://localhost:8000/api/v1/auth/login", {
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

  // --- LÓGICA DE RECUPERACIÓN (RGPD Compliant) ---
  const solicitarRecuperacion = async () => {
    const emailPrompt = prompt("Introduce tu email institucional para recibir el enlace de recuperación:");
    if (!emailPrompt) return;

    setIsLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/auth/recuperar-password/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailPrompt })
      });
      
      // Siempre mostramos el mismo mensaje aunque el correo no exista (Seguridad RGPD)
      setInfoMensaje("Si el correo está registrado, recibirás un enlace de recuperación en unos minutos.");
      setErrorMensaje("");
    } catch (error) {
      setErrorMensaje("Error al conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">
          Practicum <span className="text-indigo-600">Tracker</span>
        </h2>
        <p className="mt-2 text-sm text-slate-500 font-medium">
          Accede a tu panel de gestión de prácticas
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-xl rounded-[2rem] sm:px-12 border border-slate-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Campo Email */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Email institucional
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="nombre@universidad.es"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-slate-400 hover:text-indigo-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-slate-400 hover:text-indigo-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Mensajes de Estado */}
            {errorMensaje && (
              <div className="text-red-600 text-xs text-center font-bold bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2 justify-center">
                <span>⚠️ {errorMensaje}</span>
              </div>
            )}

            {infoMensaje && (
              <div className="text-indigo-700 text-xs text-center font-bold bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                {infoMensaje}
              </div>
            )}

            {/* Botón de Enviar */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white transition-all ${
                  isLoading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0"
                }`}
              >
                {isLoading ? "Procesando..." : "Iniciar sesión"}
              </button>
            </div>
          </form>

          {/* Enlace de recuperación */}
          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <button 
                onClick={solicitarRecuperacion}
                className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
                ¿Has olvidado tu contraseña?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}