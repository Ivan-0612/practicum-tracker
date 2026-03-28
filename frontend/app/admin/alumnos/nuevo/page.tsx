"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function NuevoAlumno() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    email_personal: "",
    curso: 2,
    grupo: "",
    email_acceso: "",
    password_acceso: "",
    // --- NUEVOS CAMPOS DE ROTACIÓN Y TUTOR ---
    email_tutor: "",
    numero_rotacion: 1,
  });
  
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMensaje({ tipo: "", texto: "" });

    try {
      const token = Cookies.get("practicum_token");
      const response = await fetch("http://127.0.0.1:8000/api/v1/alumnos/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          curso: Number(formData.curso),
          numero_rotacion: Number(formData.numero_rotacion)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Error al crear el alumno y su rotación");
      }

      setMensaje({ tipo: "success", texto: "✅ Alumno, Tutor y Rotación vinculados con éxito" });
      setTimeout(() => router.push("/admin/panel"), 2000);
    } catch (err: any) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-xl p-8">
        <h1 className="text-2xl font-bold mb-8 text-gray-900 border-b pb-4">Alta Completa de Alumno</h1>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* SECCIÓN 1: DATOS PERSONALES */}
          <section>
            <h3 className="text-lg font-semibold text-blue-700 mb-4">1. Información Personal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                <input type="text" required className="w-full border p-2 rounded text-gray-900 bg-white" 
                  onChange={e => setFormData({...formData, nombre: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Apellidos</label>
                <input type="text" required className="w-full border p-2 rounded text-gray-900 bg-white" 
                  onChange={e => setFormData({...formData, apellidos: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Email Personal de contacto</label>
                <input
                type="email"
                required
                className="w-full border p-2 rounded text-gray-900 bg-white"
                onChange={e => setFormData({...formData, email_personal: e.target.value, email_acceso: e.target.value})}
                />
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: DATOS ACADÉMICOS */}
          <section>
            <h3 className="text-lg font-semibold text-blue-700 mb-4">2. Ubicación Académica</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Curso (2, 3 o 4)</label>
                <input type="number" min="2" max="4" value={formData.curso} required className="w-full border p-2 rounded text-gray-900 bg-white" 
                  onChange={e => setFormData({...formData, curso: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Grupo / Turno</label>
                <input type="text" placeholder="Ej: Mañana A" required className="w-full border p-2 rounded text-gray-900 bg-white" 
                  onChange={e => setFormData({...formData, grupo: e.target.value})} />
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: ASIGNACIÓN DE PRÁCTICAS Y TUTOR */}
          <section className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">3. Asignación de Prácticas y Tutor</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 font-bold">Email del Tutor/a Responsable</label>
                <input type="email" placeholder="Cualquier profesor ya registrado..." required className="w-full border-2 border-blue-200 p-2 rounded text-gray-900 bg-white focus:border-blue-500" 
                  onChange={e => setFormData({...formData, email_tutor: e.target.value})} />
                <p className="text-xs text-gray-500 mt-1">El profesor debe estar dado de alta previamente.</p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 4: LOGIN DEL ALUMNO */}
          <section>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">4. Credenciales de Acceso (Login)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="password" placeholder="Contraseña provisional" required className="w-full border p-2 rounded text-gray-900 bg-white" 
                onChange={e => setFormData({...formData, password_acceso: e.target.value})} />
            </div>
          </section>

          {mensaje.texto && (
            <div className={`p-4 rounded-md text-center font-medium ${mensaje.tipo === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {mensaje.texto}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all ${isLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700 active:transform active:scale-95"}`}
          >
            {isLoading ? "Procesando Alta..." : "Finalizar y Vincular Todo"}
          </button>
        </form>
      </div>
    </div>
  );
}