"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import ModalNuevaRotacion from "@/components/ModalNuevaRotacion";
import ModalTipoAltaAlumno from "@/components/ModalTipoAltaAlumno";
import ModalTipoAsignarRotacion from "@/components/ModalTipoAsignarRotacion";
import { 
  Trash2, Mail, GraduationCap, ChevronLeft, Filter, 
  Briefcase, UserPlus, Calendar, ChevronDown, ChevronUp, Building, Download
} from "lucide-react";

interface RotacionInfo {
  id: string;
  curso: number;
  numero_rotacion: number;
  especialidad: string; 
  periodo_academico?: string;
  centro_practicas?: string;
  completada?: boolean;
  hospital_finalize_count?: number;
  tutores: {
    hospital: string;
    universidad: string;
  };
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
  const PAGE_SIZE = 20;
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCurso, setFiltroCurso] = useState("todos");
  const [filtroAño, setFiltroAño] = useState("todos");
  const [loading, setLoading] = useState(true);

  // --- ESTADO PARA LOS DESPLEGABLES DE ROTACIONES ---
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  const [modalAbierto, setModalAbierto] = useState(false);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState({ id: "", email: "" });
  const [modalAltaAlumnoAbierto, setModalAltaAlumnoAbierto] = useState(false);
  const [modalTipoRotacionAbierto, setModalTipoRotacionAbierto] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);

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
    setModalTipoRotacionAbierto(true);
  };

  const descargarExcelRotacion = async (rotacionId: string) => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/rotaciones/${rotacionId}/descargar-excel`,
        { headers: { "Authorization": `Bearer ${token}` } }
      );

      if (!res.ok) {
        const err = await res.json();
        alert(`❌ ${err.detail || "No se pudo descargar el Excel"}`);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evaluacion_${rotacionId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("❌ Error de conexión al descargar el Excel.");
    }
  };

  const descargarExcelEvaluacionesAlumnos = async () => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/alumnos/evaluaciones/exportar-excel`,
        { headers: { "Authorization": `Bearer ${token}` } }
      );

      if (!res.ok) {
        const err = await res.json();
        alert(`❌ ${err.detail || "No se pudo descargar el informe"}`);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "evaluaciones_alumnos.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("❌ Error de conexión al descargar el informe de evaluaciones.");
    }
  };

  // Función para alternar el desplegable de un alumno
  const toggleExpandido = (alumnoId: string) => {
    setExpandidos(prev => ({
      ...prev,
      [alumnoId]: !prev[alumnoId]
    }));
  };

  const periodosBrutos = alumnos.flatMap(a => a.rotaciones.map(r => r.periodo_academico)).filter(Boolean) as string[];
  const periodosDisponibles = Array.from(new Set(periodosBrutos)).sort().reverse();

  const alumnosFiltrados = alumnos.filter(a => {
    const coincideEmail = a.email?.toLowerCase().includes(busqueda.toLowerCase());
    
    const tieneRotacionEnCurso = a.rotaciones.some(r => r.curso.toString() === filtroCurso);
    const esCursoBase = a.curso_actual.toString() === filtroCurso;
    const coincideCurso = filtroCurso === "todos" || tieneRotacionEnCurso || esCursoBase;

    const coincideAño = filtroAño === "todos" || a.rotaciones.some(r => r.periodo_academico === filtroAño);

    return coincideEmail && coincideCurso && coincideAño;
  });

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroCurso, filtroAño, alumnos.length]);

  const totalPaginas = Math.max(1, Math.ceil(alumnosFiltrados.length / PAGE_SIZE));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const inicioPagina = (paginaSegura - 1) * PAGE_SIZE;
  const alumnosPaginados = alumnosFiltrados.slice(inicioPagina, inicioPagina + PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        <button 
          onClick={() => router.push("/admin/panel")} 
          className="mb-6 text-gray-500 hover:text-ufv-azul font-bold flex items-center gap-2 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Volver al Panel
        </button>

        <div className="bg-ufv-blanco shadow-xl rounded-3xl p-6 md:p-10 border-t-4 border-ufv-azul">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-gray-100 pb-8">
            <div className="flex items-center gap-4">
              <Image src="/logo-ufv.png" alt="Logo UFV" width={56} height={56} className="object-contain" />
              <div>
                <h1 className="text-3xl font-black text-ufv-azul-oscuro">Gestión de Alumnos</h1>
                <p className="text-xs font-bold text-ufv-rosa-oscuro uppercase tracking-widest mt-1">Universidad Francisco de Vitoria</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button 
                onClick={descargarExcelEvaluacionesAlumnos}
                className="bg-white text-ufv-azul px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 border border-blue-200 active:scale-95 transition-all shadow-sm shrink-0"
              >
                <Download className="w-5 h-5" /> Descargar evaluaciones
              </button>
              <button 
                onClick={() => setModalAltaAlumnoAbierto(true)} 
                className="bg-ufv-azul text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-ufv-azul-oscuro active:scale-95 transition-all shadow-sm shrink-0"
              >
                <UserPlus className="w-5 h-5" /> Nuevo Alumno
              </button>
            </div>
          </div>

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
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select 
                value={filtroAño} 
                onChange={(e) => setFiltroAño(e.target.value)} 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none appearance-none transition-all text-gray-900 font-bold"
              >
                <option value="todos">Todos los años</option>
                {periodosDisponibles.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
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

          {loading ? (
            <div className="text-center py-20 text-ufv-azul font-bold animate-pulse">
              Cargando alumnos...
            </div>
          ) : (
            <>
            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <table className="w-full text-left table-fixed">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-bold">
                    <th className="p-5 w-[58%]">Alumno y Rotaciones por Año</th>
                    <th className="p-5 w-[18%]">Perfil Base</th>
                    <th className="p-5 w-[24%] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {alumnosPaginados.map((alumno) => (
                    <tr key={alumno.id} className="hover:bg-gray-50 transition-colors">
                      
                      <td className="p-5 align-top">
                        <div className="font-bold text-lg text-ufv-azul-oscuro mb-3">{alumno.email}</div>
                        
                        {/* --- LÓGICA DE ROTACIONES CON DESPLEGABLE --- */}
                        <div className="space-y-2">
                          {alumno.rotaciones.length > 0 ? (
                            <div className="flex flex-col gap-3">
                              
                              {/* Botón Trigger del Acordeón */}
                              <button 
                                onClick={() => toggleExpandido(alumno.id)}
                                className="flex items-center justify-between w-full bg-white border border-gray-200 hover:border-ufv-azul hover:bg-blue-50/50 p-3 rounded-xl transition-all group shadow-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="bg-blue-50 text-ufv-azul p-2 rounded-lg group-hover:bg-ufv-azul group-hover:text-white transition-colors">
                                    <Briefcase className="w-4 h-4" />
                                  </div>
                                  <span className="font-bold text-sm text-gray-700 group-hover:text-ufv-azul-oscuro transition-colors">
                                    Ver rotaciones del alumno ({alumno.rotaciones.length})
                                  </span>
                                </div>
                                {expandidos[alumno.id] ? (
                                  <ChevronUp className="w-5 h-5 text-gray-400 group-hover:text-ufv-azul transition-colors" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-ufv-azul transition-colors" />
                                )}
                              </button>

                              {/* Contenido Desplegable */}
                              {expandidos[alumno.id] && (
                                <div className="space-y-2 pl-3 border-l-2 border-blue-100 ml-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                  {alumno.rotaciones
                                    .sort((a, b) => b.curso - a.curso)
                                    .map((rot, i) => (
                                      <div key={i} className="group text-sm bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between hover:border-ufv-azul-claro transition-all shadow-sm">
                                        <div className="flex flex-col gap-1">
                                          
                                          <div className="flex items-center gap-2">
                                            <span className={`font-bold flex items-center gap-1.5 ${rot.curso.toString() === filtroCurso ? 'text-ufv-rosa-oscuro' : 'text-ufv-azul-oscuro'}`}>
                                              <Briefcase className="w-3.5 h-3.5" />
                                              {rot.especialidad?.trim() ? rot.especialidad : "Sin especialidad asignada"}
                                            </span>
                                            {rot.periodo_academico && (
                                              <span className="text-[10px] font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md border border-gray-200">
                                                {rot.periodo_academico}
                                              </span>
                                            )}
                                          </div>
                                          
                                          <span className="text-xs font-bold text-gray-500 mt-1">
                                            {rot.curso}º Curso - Rotación {rot.numero_rotacion}
                                          </span>
                                          
                                          <div className="flex flex-col gap-0.5 mt-1">
                                            {/* --- NUEVO: MOSTRAR CENTRO DE PRÁCTICAS --- */}
                                            <span className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
                                              <Building className="w-3.5 h-3.5 text-gray-400" />
                                              <b className="text-gray-700">Centro:</b> {rot.centro_practicas || "No especificado"}
                                            </span>
                                            {/* ------------------------------------------ */}
                                            <span className="text-xs text-gray-500 font-medium">
                                              <b className="text-gray-700">Hospital:</b> {rot.tutores.hospital || "No asignado"}
                                            </span>
                                            <span className="text-xs text-gray-500 font-medium">
                                              <b className="text-gray-700">Universidad:</b> {rot.tutores.universidad || "No asignado"}
                                            </span>
                                          </div>
                                        </div>
                                        <button onClick={() => handleEliminarRotacion(rot.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-600 transition-all">
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                        {rot.completada && (
                                          <button
                                            onClick={() => descargarExcelRotacion(rot.id)}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-ufv-azul transition-all"
                                            title="Descargar Excel"
                                          >
                                            <Download className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded-lg font-bold border border-orange-100 italic w-fit mt-1">
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
                            className="bg-blue-50 text-ufv-azul px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 border border-blue-200 w-full max-w-[12rem] transition-colors"
                          >
                            Asignar Nueva Rotación
                          </button>
                          <button 
                            onClick={() => handleEliminarAlumno(alumno.id, alumno.email)} 
                            className="bg-white text-red-500 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-50 border border-red-200 w-full max-w-[12rem] flex items-center justify-center gap-2 transition-colors"
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

            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
              <p className="text-xs font-medium text-gray-500">
                Mostrando {alumnosFiltrados.length === 0 ? 0 : inicioPagina + 1} - {Math.min(inicioPagina + PAGE_SIZE, alumnosFiltrados.length)} de {alumnosFiltrados.length} alumnos
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                  disabled={paginaSegura <= 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-xs font-bold text-gray-500 px-2">
                  Página {paginaSegura} de {totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
                  disabled={paginaSegura >= totalPaginas}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
            </>
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

      <ModalTipoAltaAlumno
        isOpen={modalAltaAlumnoAbierto}
        onClose={() => setModalAltaAlumnoAbierto(false)}
        onManual={() => router.push("/admin/alumnos/nuevo")}
        onExcel={() => router.push("/admin/alumnos/importar")}
      />

      <ModalTipoAsignarRotacion
        isOpen={modalTipoRotacionAbierto}
        alumnoEmail={alumnoSeleccionado.email}
        onClose={() => setModalTipoRotacionAbierto(false)}
        onManual={() => {
          setModalTipoRotacionAbierto(false);
          setModalAbierto(true);
        }}
        onAutomatico={() => {
          setModalTipoRotacionAbierto(false);
          router.push("/admin/alumnos/rotaciones/importar");
        }}
      />
    </div>
  );
}