"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import { 
  LogOut, 
  FileJson, 
  Users, 
  UserPlus, 
  GraduationCap, 
  Settings, 
  Loader2, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";

export default function AdminPanel() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  
  // NUEVOS ESTADOS PARA LA ESPECIALIDAD
  const [nombreEspecialidad, setNombreEspecialidad] = useState("");
  const [archivoJSON, setArchivoJSON] = useState<File | null>(null);

  const handleLogout = () => {
    Cookies.remove("practicum_token");
    Cookies.remove("practicum_rol");
    router.push("/login");
  };

  const handleCrearEspecialidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreEspecialidad || !archivoJSON) {
        alert("⚠️ Debes introducir un nombre y seleccionar un archivo JSON.");
        return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("nombre", nombreEspecialidad);
    formData.append("file", archivoJSON);

    const token = Cookies.get("practicum_token");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/admin/especialidades", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });

      if (res.ok) {
        alert("✅ Especialidad y Rúbrica creadas correctamente.");
        setNombreEspecialidad("");
        setArchivoJSON(null);
      } else {
        const errorData = await res.json();
        alert(`❌ Error: ${errorData.detail || "No se pudo crear la especialidad"}`);
      }
    } catch (err) {
      alert("❌ Error de conexión: Asegúrate de que el backend esté ejecutándose.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* CABECERA CORPORATIVA */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex items-center gap-4">
            <Image 
              src="/logo-ufv.png" 
              alt="Logo UFV" 
              width={56} 
              height={56} 
              className="object-contain" 
            />
            <div>
              <h1 className="text-3xl font-black text-ufv-azul-oscuro">Panel de Administración</h1>
              <p className="text-xs font-bold text-ufv-rosa-oscuro uppercase tracking-widest mt-1">
                Universidad Francisco de Vitoria
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white text-red-600 px-5 py-2.5 rounded-xl font-bold border border-red-200 hover:bg-red-50 transition-all shadow-sm active:scale-95"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>

        {/* GRID DE MÓDULOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* MÓDULO 1: CREAR ESPECIALIDAD (JSON) */}
          <div className="bg-ufv-blanco p-8 rounded-3xl shadow-xl border-t-4 border-ufv-azul relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 text-gray-50 opacity-50 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
              <FileJson className="w-40 h-40" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-50 p-2.5 rounded-xl text-ufv-azul">
                  <Settings className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-ufv-azul-oscuro">Gestión de Especialidades</h2>
              </div>
              
              <p className="text-gray-500 font-medium mb-6 leading-relaxed">
                Crea nuevas unidades de prácticas (ej. Pediatría, UCI) y asóciales su propio archivo de rúbrica JSON.
              </p>
              
              <form onSubmit={handleCrearEspecialidad} className="space-y-4 border-t border-gray-100 pt-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Nombre de la Especialidad</label>
                    <input 
                        type="text" 
                        placeholder="Ej: Quirófano, Hospitalización II..." 
                        required
                        value={nombreEspecialidad}
                        onChange={e => setNombreEspecialidad(e.target.value)}
                        className="w-full border border-gray-200 p-3 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:border-ufv-azul outline-none" 
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Archivo Rúbrica (.json)</label>
                    <input 
                        type="file" 
                        accept=".json" 
                        required
                        onChange={e => setArchivoJSON(e.target.files ? e.target.files[0] : null)}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-ufv-azul hover:file:bg-blue-100 cursor-pointer"
                    />
                </div>

                <button 
                  type="submit"
                  disabled={isUploading}
                  className={`w-full mt-4 px-5 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm border ${
                    isUploading 
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" 
                    : "bg-ufv-azul text-white hover:bg-ufv-azul-oscuro"
                  }`}
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileJson className="w-5 h-5" />}
                  <span>{isUploading ? "Guardando..." : "Crear Especialidad"}</span>
                </button>
              </form>
            </div>
          </div>

          {/* MÓDULO 2: GESTIÓN DE USUARIOS */}
          <div className="bg-ufv-blanco p-8 rounded-3xl shadow-xl border-t-4 border-ufv-azul relative overflow-hidden group">
            {/* (Este módulo se mantiene exactamente igual que el que ya tenías) */}
            <div className="absolute -right-6 -top-6 text-gray-50 opacity-50 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
              <Users className="w-40 h-40" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-50 p-2.5 rounded-xl text-ufv-azul">
                  <Users className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-ufv-azul-oscuro">Gestión de Usuarios</h2>
              </div>
              
              <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                Administra las cuentas de acceso al sistema. Da de alta a nuevos docentes y matricula a los estudiantes en sus rotaciones correspondientes.
              </p>
              
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => router.push("/admin/profesores/nuevo")} className="flex-1 bg-ufv-azul text-ufv-blanco px-4 py-3.5 rounded-xl shadow-md hover:bg-ufv-azul-oscuro transition-all font-bold flex items-center justify-center gap-2 active:scale-95 border border-transparent">
                    <UserPlus className="w-4 h-4" /> Nuevo Profesor
                  </button>

                  <button onClick={() => router.push("/admin/alumnos/nuevo")} className="flex-1 bg-ufv-azul-oscuro text-ufv-blanco px-4 py-3.5 rounded-xl shadow-md hover:bg-ufv-azul transition-all font-bold flex items-center justify-center gap-2 active:scale-95 border border-transparent">
                    <GraduationCap className="w-4 h-4" /> Nuevo Alumno
                  </button>
                </div>

                <button onClick={() => router.push("/admin/alumnos")} className="w-full mt-2 bg-blue-50 text-ufv-azul border border-blue-100 px-4 py-3.5 rounded-xl shadow-sm hover:bg-blue-100 hover:border-blue-200 transition-all font-bold flex items-center justify-center gap-2">
                  <Users className="w-4 h-4" /> Ver y Gestionar Alumnos Existentes
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}