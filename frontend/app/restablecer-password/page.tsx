"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { KeyRound, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";

// Separamos el contenido en un componente interno para poder envolverlo en Suspense
// (Requisito de Next.js cuando se usa useSearchParams en componentes de cliente)
function RestablecerForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");
    
    const [pass, setPass] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMensaje({ tipo: "", texto: "" });

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/recuperar-password/confirmar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, nueva_password: pass })
            });
            
            if (res.ok) {
                setMensaje({ tipo: "success", texto: "¡Contraseña actualizada con éxito! Redirigiendo..." });
                setTimeout(() => {
                    router.push("/login");
                }, 2000);
            } else {
                setMensaje({ tipo: "error", texto: "El enlace ha caducado, es incorrecto o ya ha sido utilizado." });
            }
        } catch (error) {
            setMensaje({ tipo: "error", texto: "Error de conexión con el servidor." });
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
                    Restablecer <span className="text-ufv-rosa-claro">Contraseña</span>
                </h2>
                <p className="mt-2 text-xs text-gray-500 font-bold uppercase tracking-widest">
                    Universidad Francisco de Vitoria
                </p>
            </div>

            {/* FORMULARIO */}
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-10 px-6 shadow-xl rounded-2xl sm:px-12 border-t-4 border-t-ufv-azul">
                    
                    <div className="text-center mb-8">
                        <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                            <ShieldCheck className="w-6 h-6 text-ufv-azul" />
                        </div>
                        <p className="text-sm text-gray-500 font-medium">
                            Por favor, introduce tu nueva contraseña para acceder a la plataforma.
                        </p>
                    </div>

                    <form onSubmit={handleReset} className="space-y-6">
                        
                        <div>
                            <label className="block text-sm font-bold text-ufv-azul-oscuro mb-2">
                                Nueva Contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <KeyRound className="h-5 w-5 text-gray-400" />
                                </div>
                                <input 
                                    type="password" 
                                    required 
                                    minLength={8}
                                    placeholder="Mínimo 8 caracteres"
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul sm:text-sm transition-all outline-none"
                                    value={pass}
                                    onChange={(e) => setPass(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Mensajes de Estado */}
                        {mensaje.texto && (
                            <div className={`p-4 rounded-xl text-xs text-center font-bold flex items-center justify-center gap-2 border ${
                                mensaje.tipo === "success" 
                                    ? "bg-green-50 text-green-700 border-green-200" 
                                    : "bg-red-50 text-red-700 border-red-200"
                            }`}>
                                {mensaje.tipo === "success" ? <ShieldCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                <span>{mensaje.texto}</span>
                            </div>
                        )}

                        {/* Botón Principal */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white transition-all ${
                                    isLoading 
                                        ? "bg-gray-400 cursor-not-allowed" 
                                        : "bg-ufv-azul hover:bg-ufv-azul-oscuro active:scale-95"
                                }`}
                            >
                                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isLoading ? "Actualizando..." : "Guardar nueva contraseña"}
                            </button>
                        </div>
                        
                    </form>
                    
                    <div className="mt-8 text-center border-t border-gray-100 pt-6">
                        <button 
                            type="button"
                            onClick={() => router.push("/login")}
                            className="text-sm font-bold text-gray-500 hover:text-ufv-azul transition-colors"
                        >
                            Volver a iniciar sesión
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default function RestablecerPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-ufv-azul font-bold animate-pulse">Cargando...</div>}>
            <RestablecerForm />
        </Suspense>
    );
}