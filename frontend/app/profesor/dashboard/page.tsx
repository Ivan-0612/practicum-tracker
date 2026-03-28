"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
// He quitado Eye, EyeOff porque ya no hacen falta
import { 
  User, 
  BookOpen, 
  LogOut, 
  ChevronRight,
  ClipboardCheck,
  Mail // Añadido icono de email
} from "lucide-react";
import { useRouter } from "next/navigation";

// Definimos los campos reales que ahora nos manda el backend
interface AlumnoAsignado {
  rotacion_id: string;
  alumno_id: string;
  nombre_completo: string; // Real descifrado
  email_personal: string;  // Real descifrado
  curso: number;
  grupo: string;
  version_cuadernillo: string;
}

export default function ProfesorDashboard() {
  const router = useRouter();
  const [alumnos, setAlumnos] = useState<AlumnoAsignado[]>([]);
  const [loading, setLoading] = useState(true);
  
  // YA NO HAY ESTADOS DE "REVELAR NOMBRES"

  useEffect(() => {
    cargarAlumnos();
  }, []);

  const cargarAlumnos = async () => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch("http://127.0.0.1:8000/api/v1/profesores/mis-alumnos", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAlumnos(data);
      }
    } catch (error) {
      console.error("Error al cargar alumnos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Cookies.remove("practicum_token");
    Cookies.remove("practicum_rol");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar Superior */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">Practicum <span className="text-indigo-600">Docente</span></span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900">Mis Alumnos Asignados</h1>
          <p className="text-slate-500 mt-2">Gestiona las evaluaciones de tus alumnos actuales.</p>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : alumnos.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
            <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-700">Sin alumnos actualmente</h2>
            <p className="text-slate-500 mt-2">No tienes alumnos asignados por el administrador.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {alumnos.map((item) => (
              <div key={item.alumno_id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                      {item.curso}º Curso - {item.grupo}
                    </div>
                  </div>

                  {/* --- NUEVO: Usamos el nombre real directamente --- */}
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    {item.nombre_completo}
                  </h3>
                  
                  <div className="mt-4 space-y-3">
                    {/* --- NUEVO: Mostramos el Email real --- */}
                    <div className="flex items-center text-sm text-slate-600">
                      <Mail className="w-4 h-4 mr-3 text-slate-400" />
                      <span>Email: <span className="font-semibold text-slate-700">{item.email_personal}</span></span>
                    </div>

                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                  <button 
                    onClick={() => router.push(`/profesor/evaluar/${item.rotacion_id}`)}
                    className="w-full bg-white border border-slate-200 text-slate-700 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600"
                  >
                    Evaluar Alumno
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}