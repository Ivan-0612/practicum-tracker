"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Cookies from "js-cookie";

export default function LoginPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [infoMensaje, setInfoMensaje] = useState(""); 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMensaje("");
    setInfoMensaje("");

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

  const solicitarRecuperacion = async () => {
    const emailPrompt = prompt("Introduce tu email institucional para recibir el enlace de recuperación:");
    if (!emailPrompt) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/recuperar-password/solicitar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailPrompt })
      });
      
      setInfoMensaje("Si el correo está registrado, recibirás un enlace de recuperación en unos minutos.");
      setErrorMensaje("");
    } catch (error) {
      setErrorMensaje("Error al conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
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

      {/* FORMULARIO DE LOGIN */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-ufv-blanco py-10 px-6 shadow-xl rounded-2xl sm:px-12 border-t-4 border-t-ufv-azul">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Campo Email */}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul sm:text-sm transition-all outline-none"
                  placeholder="nombre@ufv.es"
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

            {/* Mensajes de Estado */}
            {errorMensaje && (
              <div className="text-ufv-rosa-oscuro text-xs text-center font-bold bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2 justify-center">
                <span>⚠️ {errorMensaje}</span>
              </div>
            )}

            {infoMensaje && (
              <div className="text-ufv-azul text-xs text-center font-bold bg-blue-50 p-3 rounded-xl border border-blue-100">
                {infoMensaje}
              </div>
            )}

            {/* Botón Principal (Azul UFV) */}
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

          {/* Enlace de recuperación (Rosa UFV) */}
          <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <button 
                onClick={solicitarRecuperacion}
                className="text-sm font-bold text-ufv-rosa-oscuro hover:text-ufv-rosa-claro transition-colors"
            >
                ¿Has olvidado tu contraseña?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}