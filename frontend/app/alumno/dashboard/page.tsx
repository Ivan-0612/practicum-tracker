"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { User, BookOpen, LogOut, Folder, Lock, CheckCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AlumnoDashboard() {
  const router = useRouter();
  const [datos, setDatos] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch("http://127.0.0.1:8000/api/v1/alumnos/mi-perfil-evaluacion", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setDatos(data);
    } catch (error) {
      console.error("Error al cargar dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-indigo-600 animate-pulse">Cargando tu expediente...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* NAVBAR SIMPLE */}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <BookOpen className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">Practicum<span className="text-indigo-600">Alumno</span></span>
        </div>
        <button onClick={() => { Cookies.remove("practicum_token"); router.push("/login"); }} className="flex items-center gap-2 text-slate-500 hover:text-red-600 font-medium transition-colors">
          <LogOut className="w-5 h-5" /> Salir
        </button>
      </nav>

      <main className="max-w-5xl mx-auto px-8 py-10">
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900">Hola, {datos?.alumno.nombre} 👋</h1>
          <p className="text-slate-500 mt-2">Aquí tienes el estado de tus rotaciones y evaluaciones.</p>
        </header>

        {/* SECCIÓN TUTOR ASIGNADO */}
        <section className="mb-12">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Mi Tutor Asignado</h2>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-indigo-50 p-3 rounded-full">
              <User className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Tutor de Prácticas</p>
              <p className="text-lg font-bold text-slate-800">{datos?.tutor.nombre_tutor}</p>
            </div>
          </div>
        </section>

        {/* SECCIÓN CARPETAS DE ROTACIÓN */}
        <section>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Mis Evaluaciones</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {datos?.rotaciones.map((rot: any) => (
              <button
                key={rot.id}
                onClick={() => router.push(`/alumno/evaluar/${rot.id}`)}
                className="group relative bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm hover:border-indigo-500 hover:shadow-xl transition-all text-left flex items-start"
              >
                <div className={`p-4 rounded-2xl mr-4 transition-colors ${rot.completada ? 'bg-green-50 group-hover:bg-green-100' : 'bg-amber-50 group-hover:bg-amber-100'}`}>
                  <Folder className={`w-8 h-8 ${rot.completada ? 'text-green-600' : 'text-amber-600'}`} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Rotación {rot.numero}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    {rot.completada ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                        <CheckCircle className="w-3 h-3" /> EVALUADO
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                        <Clock className="w-3 h-3" /> EN CURSO
                      </span>
                    )}
                  </div>
                </div>
                <div className="absolute top-4 right-4">
                  <Lock className="w-4 h-4 text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}