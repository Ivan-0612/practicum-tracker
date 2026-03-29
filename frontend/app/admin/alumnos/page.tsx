"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import ModalNuevaRotacion from "@/components/ModalNuevaRotacion";
import { Trash2, Mail, GraduationCap, ChevronLeft, Filter } from "lucide-react";

interface RotacionInfo {
  id: string;
  curso: number;
  numero_rotacion: number;
  tutores: string[];
}

interface Alumno {
  id: string;
  email: string;
  curso_actual: number; // Este es el curso base del alta
  grupo: string;
  codigo: string;
  rotaciones: RotacionInfo[];
}

export default function ListaAlumnosAdmin() {
  const router = useRouter();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCurso, setFiltroCurso] = useState("todos");
  const [loading, setLoading] = useState(true);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState({ id: "", email: "" });

  useEffect(() => {
    cargarAlumnos();
  }, []);

  const cargarAlumnos = async () => {
    setLoading(true);
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch("http://127.0.0.1:8000/api/v1/alumnos/", { 
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setAlumnos(Array.isArray(data) ? data : data.alumnos || []); 
      }
    } catch (error) {
      console.error("Error al cargar alumnos", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarRotacion = async (rotacionId: string) => {
    if (!window.confirm("¿Borrar evaluación?")) return;
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`http://127.0.0.1:8000/api/v1/alumnos/rotacion/${rotacionId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) cargarAlumnos();
    } catch (error) {
      alert("Error de conexión.");
    }
  };

  const handleEliminarAlumno = async (alumnoId: string, email: string) => {
    if (!window.confirm(`¿Borrar permanentemente a ${email}?`)) return;
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`http://127.0.0.1:8000/api/v1/alumnos/${alumnoId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) cargarAlumnos();
    } catch (error) {
      alert("Error de conexión.");
    }
  };

  const abrirModalRotacion = (id: string, email: string) => {
    setAlumnoSeleccionado({ id, email });
    setModalAbierto(true);
  };

  // --- LÓGICA DE FILTRADO CORREGIDA ---
  const alumnosFiltrados = alumnos.filter(a => {
    const coincideEmail = a.email?.toLowerCase().includes(busqueda.toLowerCase());
    
    // El filtro ahora busca SI el alumno tiene AL MENOS UNA rotación en el curso seleccionado
    // O si su curso base coincide (para alumnos nuevos sin rotaciones aún)
    const tieneRotacionEnCurso = a.rotaciones.some(r => r.curso.toString() === filtroCurso);
    const esCursoBase = a.curso_actual.toString() === filtroCurso;
    
    const coincideCurso = filtroCurso === "todos" || tieneRotacionEnCurso || esCursoBase;

    return coincideEmail && coincideCurso;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => router.push("/admin/panel")} className="mb-6 text-slate-500 hover:text-indigo-600 font-medium flex items-center gap-2 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Volver al Panel
        </button>

        <div className="bg-white shadow-xl rounded-3xl p-6 md:p-10 border border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-100 pb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">Gestión de Alumnos</h1>
              <p className="text-slate-500 mt-1">Sincronizado con el historial de rotaciones por año.</p>
            </div>
            <button onClick={() => router.push("/admin/alumnos/nuevo")} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95">
              + Registrar Alumno
            </button>
          </div>

          <div className="mb-8 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input type="text" placeholder="Buscar por email..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all text-slate-900 font-medium" />
            </div>
            
            <div className="relative w-full md:w-64">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none appearance-none transition-all text-slate-900 font-bold">
                <option value="todos">Todos los cursos</option>
                <option value="2">Ver 2º Curso</option>
                <option value="3">Ver 3º Curso</option>
                <option value="4">Ver 4º Curso</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-indigo-600 font-bold animate-pulse">Cargando...</div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                    <th className="p-5">Alumno y Rotaciones por Año</th>
                    <th className="p-5">Perfil Base</th>
                    <th className="p-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {alumnosFiltrados.map((alumno) => (
                    <tr key={alumno.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5 align-top max-w-md">
                        <div className="font-bold text-lg text-slate-900 mb-3">{alumno.email}</div>
                        <div className="space-y-2">
                          {alumno.rotaciones.length > 0 ? (
                            alumno.rotaciones
                              // Ordenamos para que las más recientes (curso más alto) salgan primero
                              .sort((a, b) => b.curso - a.curso)
                              .map((rot, i) => (
                                <div key={i} className="group text-sm bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:border-indigo-200 transition-all">
                                  <div className="flex flex-col">
                                    <span className={`font-bold ${rot.curso.toString() === filtroCurso ? 'text-indigo-600' : 'text-slate-700'}`}>
                                      {rot.curso}º Curso - Rotación {rot.numero_rotacion}
                                    </span>
                                    <span className="text-xs text-slate-400 italic">Tutor: {rot.tutores.join(", ") || "No asignado"}</span>
                                  </div>
                                  <button onClick={() => handleEliminarRotacion(rot.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-600 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))
                          ) : (
                            <div className="text-xs text-amber-500 bg-amber-50 px-3 py-2 rounded-lg font-medium italic">Sin historial de prácticas</div>
                          )}
                        </div>
                      </td>
                      
                      <td className="p-5 align-top">
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Inscripción Original</span>
                          <span className="text-slate-900 font-bold flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-slate-400" /> {alumno.curso_actual}º Curso
                          </span>
                          <span className="text-slate-500 text-sm font-medium pl-6">Grupo {alumno.grupo}</span>
                        </div>
                      </td>
                      
                      <td className="p-5 align-top text-right">
                        <div className="flex flex-col gap-2 items-end">
                          <button onClick={() => abrirModalRotacion(alumno.id, alumno.email)} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 border border-emerald-100 w-40">Asignar Nueva Rotación</button>
                          <button onClick={() => handleEliminarAlumno(alumno.id, alumno.email)} className="bg-white text-red-500 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-50 border border-red-100 w-40 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Borrar Alumno</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ModalNuevaRotacion isOpen={modalAbierto} onClose={() => setModalAbierto(false)} alumnoId={alumnoSeleccionado.id} emailAlumno={alumnoSeleccionado.email} onSuccess={cargarAlumnos} />
    </div>
  );
}