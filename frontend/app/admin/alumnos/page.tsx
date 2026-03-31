"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import ModalNuevaRotacion from "@/components/ModalNuevaRotacion";
import { Trash2, Mail, GraduationCap, ChevronLeft, Filter, Briefcase } from "lucide-react";

interface RotacionInfo {
  id: string;
  curso: number;
  numero_rotacion: number;
  especialidad: string; // <-- AÑADIMOS EL CAMPO DE ESPECIALIDAD AQUÍ
  tutores: string[];
}

interface Alumno {
  id: string;
  email: string;
  curso_actual: number; 
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/alumnos/`, { 
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/alumnos/rotacion/${rotacionId}`, {
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/alumnos/${alumnoId}`, {
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

  const alumnosFiltrados = alumnos.filter(a => {
    const coincideEmail = a.email?.toLowerCase().includes(busqueda.toLowerCase());
    const tieneRotacionEnCurso = a.rotaciones.some(r => r.curso.toString() === filtroCurso);
    const esCursoBase = a.curso_actual.toString() === filtroCurso;
    const coincideCurso = filtroCurso === "todos" || tieneRotacionEnCurso || esCursoBase;

    return coincideEmail && coincideCurso;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Botón Volver */}
        <button 
          onClick={() => router.push("/admin/panel")} 
          className="mb-6 text-gray-500 hover:text-ufv-azul font-bold flex items-center gap-2 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Volver al Panel
        </button>

        <div className="bg-ufv-blanco shadow-xl rounded-3xl p-6 md:p-10 border-t-4 border-ufv-azul">
          
          {/* CABECERA CORPORATIVA */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-gray-100 pb-8">
            <div className="flex items-center gap-4">
              <Image 
                src="/logo-ufv.png" 
                alt="Logo UFV" 
                width={56} 
                height={56} 
                className="object-contain" 
              />
              <div>
                <h1 className="text-3xl font-black text-ufv-azul-oscuro">Gestión de Alumnos</h1>
                <p className="text-xs font-bold text-ufv-rosa-oscuro uppercase tracking-widest mt-1">
                  Universidad Francisco de Vitoria
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => router.push("/admin/alumnos/nuevo")} 
              className="bg-ufv-azul text-ufv-blanco px-6 py-3 rounded-2xl font-bold hover:bg-ufv-azul-oscuro transition-all shadow-md active:scale-95 border border-transparent"
            >
              + Registrar Alumno
            </button>
          </div>

          {/* BARRA DE BÚSQUEDA Y FILTROS */}
          <div className="mb-8 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Buscar por email..." 
                value={busqueda} 
                onChange={(e) => setBusqueda(e.target.value)} 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul focus:bg-white outline-none transition-all text-gray-900 font-medium" 
              />
            </div>
            
            <div className="relative w-full md:w-64">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select 
                value={filtroCurso} 
                onChange={(e) => setFiltroCurso(e.target.value)} 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none appearance-none transition-all text-gray-900 font-bold"
              >
                <option value="todos">Todos los cursos</option>
                <option value="2">Ver 2º Curso</option>
                <option value="3">Ver 3º Curso</option>
                <option value="4">Ver 4º Curso</option>
              </select>
            </div>
          </div>

          {/* TABLA DE RESULTADOS */}
          {loading ? (
            <div className="text-center py-20 text-ufv-azul font-bold animate-pulse">
              Cargando alumnos...
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-bold">
                    <th className="p-5">Alumno y Rotaciones por Año</th>
                    <th className="p-5">Perfil Base</th>
                    <th className="p-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {alumnosFiltrados.map((alumno) => (
                    <tr key={alumno.id} className="hover:bg-gray-50 transition-colors">
                      
                      <td className="p-5 align-top max-w-md">
                        <div className="font-bold text-lg text-ufv-azul-oscuro mb-3">{alumno.email}</div>
                        <div className="space-y-2">
                          {alumno.rotaciones.length > 0 ? (
                            alumno.rotaciones
                              .sort((a, b) => b.curso - a.curso)
                              .map((rot, i) => (
                                <div key={i} className="group text-sm bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between hover:border-ufv-azul-claro transition-all">
                                  <div className="flex flex-col gap-1">
                                    
                                    {/* NUEVO: Mostramos la Especialidad en la tabla */}
                                    <span className={`font-bold flex items-center gap-1.5 ${rot.curso.toString() === filtroCurso ? 'text-ufv-rosa-oscuro' : 'text-ufv-azul-oscuro'}`}>
                                      <Briefcase className="w-3.5 h-3.5" />
                                      {rot.especialidad}
                                    </span>
                                    
                                    <span className="text-xs font-bold text-gray-500">
                                      {rot.curso}º Curso - Rotación {rot.numero_rotacion}
                                    </span>
                                    
                                    <span className="text-xs text-gray-400 italic">Tutor: {rot.tutores.join(", ") || "No asignado"}</span>
                                  </div>
                                  <button onClick={() => handleEliminarRotacion(rot.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-600 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))
                          ) : (
                            <div className="text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded-lg font-bold border border-orange-100 italic w-fit">
                              Sin historial de prácticas
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="p-5 align-top">
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Inscripción Original</span>
                          <span className="text-ufv-azul-oscuro font-bold flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-gray-400" /> {alumno.curso_actual}º Curso
                          </span>
                          <span className="text-gray-500 text-sm font-medium pl-6">Grupo {alumno.grupo}</span>
                        </div>
                      </td>
                      
                      <td className="p-5 align-top text-right">
                        <div className="flex flex-col gap-2 items-end">
                          <button 
                            onClick={() => abrirModalRotacion(alumno.id, alumno.email)} 
                            className="bg-blue-50 text-ufv-azul px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 border border-blue-200 w-48 transition-colors"
                          >
                            Asignar Nueva Rotación
                          </button>
                          <button 
                            onClick={() => handleEliminarAlumno(alumno.id, alumno.email)} 
                            className="bg-white text-red-500 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-50 border border-red-200 w-48 flex items-center justify-center gap-2 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" /> Borrar Alumno
                          </button>
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

      <ModalNuevaRotacion 
        isOpen={modalAbierto} 
        onClose={() => setModalAbierto(false)} 
        alumnoId={alumnoSeleccionado.id} 
        emailAlumno={alumnoSeleccionado.email} 
        onSuccess={cargarAlumnos} 
      />
    </div>
  );
}