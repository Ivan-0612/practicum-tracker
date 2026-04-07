"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import { ChevronLeft, UserPlus, Mail, KeyRound, Save, CheckCircle2, AlertCircle } from "lucide-react";

export default function NuevoProfesor() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Mejoramos el estado del mensaje para manejar estilos de éxito/error y el loading
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMensaje({ tipo: "", texto: "" });
    
    const token = Cookies.get("practicum_token");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/profesores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ email, password, rol: "profesor" }),
      });

      if (!response.ok) {
        throw new Error("Error al crear el profesor. Verifica los datos o si el email ya existe.");
      }

      setMensaje({ tipo: "success", texto: "✅ Profesor dado de alta correctamente" });
      setTimeout(() => router.push("/admin/panel"), 1500);
      
    } catch (err: any) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        
        {/* BOTÓN VOLVER */}
        <button 
          type="button"
          onClick={() => router.push("/admin/panel")}
          className="mb-6 text-gray-500 hover:text-ufv-azul font-bold flex items-center gap-2 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Volver al Panel
        </button>

        <div className="bg-ufv-blanco shadow-xl rounded-3xl p-6 md:p-10 border-t-4 border-ufv-azul">
          
          {/* CABECERA CORPORATIVA */}
          <div className="flex flex-col md:flex-row items-start md:items-center mb-10 gap-6 border-b border-gray-100 pb-8">
            <Image 
              src="/logo-ufv.png" 
              alt="Logo UFV" 
              width={56} 
              height={56} 
              className="object-contain" 
            />
            <div>
              <h1 className="text-3xl font-black text-ufv-azul-oscuro">Alta de Nuevo Tutor</h1>
              <p className="text-xs font-bold text-ufv-rosa-oscuro uppercase tracking-widest mt-1">
                Universidad Francisco de Vitoria
              </p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* SECCIÓN DE DATOS DE ACCESO */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-50 p-2 rounded-lg text-ufv-azul">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-ufv-azul-oscuro">Credenciales del Tutor</h3>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                      type="email" 
                      required 
                      placeholder="ejemplo@gmail.com"
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none transition-all" 
                      onChange={e => setEmail(e.target.value)} 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Contraseña Provisional</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <KeyRound className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                      type="password" 
                      required 
                      placeholder="Mínimo 8 caracteres"
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none transition-all" 
                      onChange={e => setPassword(e.target.value)} 
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 font-medium">El profesor podrá cambiar esta contraseña al iniciar sesión.</p>
                </div>
              </div>
            </section>

            {/* MENSAJES DE ALERTA */}
            {mensaje.texto && (
              <div className={`p-4 rounded-xl font-bold flex items-center gap-3 ${mensaje.tipo === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {mensaje.tipo === "success" ? <CheckCircle2 className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
                {mensaje.texto}
              </div>
            )}

            {/* BOTÓN DE ENVÍO */}
            <div className="pt-4 border-t border-gray-100">
              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full py-4 rounded-xl font-bold text-ufv-blanco shadow-md flex justify-center items-center gap-3 transition-all ${
                  isLoading 
                    ? "bg-gray-400 cursor-not-allowed" 
                    : "bg-ufv-azul hover:bg-ufv-azul-oscuro active:scale-95"
                }`}
              >
                {isLoading ? "Registrando Tutor..." : (
                  <>
                    <Save className="w-5 h-5" />
                    Finalizar y Guardar 
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}