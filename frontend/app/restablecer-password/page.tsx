"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function RestablecerPasswordPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");
    const [pass, setPass] = useState("");

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("http://127.0.0.1:8000/api/v1/auth/recuperar-password/confirmar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, nueva_password: pass })
        });
        if (res.ok) {
            alert("¡Contraseña cambiada! Ya puedes iniciar sesión.");
            router.push("/login");
        } else {
            alert("El enlace ha caducado o es incorrecto.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <form onSubmit={handleReset} className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-200">
                <h1 className="text-2xl font-bold mb-6 text-slate-800">Nueva Contraseña</h1>
                <p className="text-sm text-slate-500 mb-4">Introduce tu nueva contraseña (mínimo 8 caracteres).</p>
                <input 
                    type="password" 
                    required 
                    minLength={8}
                    className="w-full p-3 rounded-xl border border-slate-300 mb-4"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                />
                <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                    Actualizar Contraseña
                </button>
            </form>
        </div>
    );
}