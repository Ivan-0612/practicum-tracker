"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function NuevoProfesor() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = Cookies.get("practicum_token");

    const response = await fetch("http://127.0.0.1:8000/api/v1/admin/profesores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ email, password, rol: "profesor" }),
    });

    if (response.ok) {
      setMensaje("✅ Profesor creado correctamente");
      setTimeout(() => router.push("/admin/panel"), 1500);
    } else {
      setMensaje("❌ Error al crear el profesor");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h1 className="text-xl font-bold mb-6 text-gray-900">Registrar Profesor</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Docente</label>
            <input type="email" required className="w-full border p-2 rounded text-gray-900 bg-white" 
              onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña Provisional</label>
            <input type="password" required className="w-full border p-2 rounded text-gray-900 bg-white" 
              onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">
            Dar de Alta
          </button>
          {mensaje && <p className="text-center text-sm font-medium mt-2">{mensaje}</p>}
        </form>
      </div>
    </div>
  );
}