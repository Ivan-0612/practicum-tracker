"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import ModalNuevaRotacion from "@/components/ModalNuevaRotacion";
import ModalTipoAltaAlumno from "@/components/ModalTipoAltaAlumno";
import Breadcrumb from "@/components/Breadcrumb";
import { useToast } from "@/components/ToastProvider";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  Trash2, Mail, GraduationCap, Filter,
  Briefcase, UserPlus, Calendar, ChevronDown, ChevronUp, Building, Download, FileSpreadsheet, XCircle,
  CheckCircle, Activity
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
    campo?: string;
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
  const { toast } = useToast();
  const PAGE_SIZE = 20;
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [totalAlumnos, setTotalAlumnos] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCurso, setFiltroCurso] = useState("todos");
  const [filtroAño, setFiltroAño] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos"); // "todos" | "en_curso" | "finalizada"
  const [filtroTutor, setFiltroTutor] = useState("todos");   // "todos" | "con_tutor" | "sin_tutor"
  const [periodosDisponibles, setPeriodosDisponibles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // --- ESTADO PARA LOS DESPLEGABLES DE ROTACIONES ---
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  // --- ESTADOS PARA CONFIRMACIONES ---
  type ConfirmState =
    | { tipo: "rotacion"; id: string }
    | { tipo: "alumno";   id: string; email: string }
    | { tipo: "tutor";    rotacionId: string; email: string }
    | null;
  const [confirmPendiente, setConfirmPendiente] = useState<ConfirmState>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState({ id: "", email: "" });
  const [modalAltaAlumnoAbierto, setModalAltaAlumnoAbierto] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [selAlumnos, setSelAlumnos] = useState<Set<string>>(new Set());
  const [selRotaciones, setSelRotaciones] = useState<Set<string>>(new Set());
  const [modoSeleccion, setModoSeleccion] = useState(false);

  const cargarAlumnos = async () => {
    setLoading(true);
    try {
      const token = Cookies.get("practicum_token");
      const params = new URLSearchParams({
        page: String(paginaActual),
        page_size: String(PAGE_SIZE),
      });

      if (busqueda.trim()) params.set("busqueda", busqueda.trim());
      if (filtroCurso !== "todos") params.set("curso", filtroCurso);
      if (filtroAño !== "todos") params.set("periodo_academico", filtroAño);
      if (filtroEstado !== "todos") params.set("filtro_estado", filtroEstado);
      if (filtroTutor !== "todos") params.set("filtro_tutor", filtroTutor);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/alumnos/?${params.toString()}`, { 
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setAlumnos(Array.isArray(data.resultados) ? data.resultados : []);
        setTotalAlumnos(Number(data.total || 0));
        setPeriodosDisponibles(Array.isArray(data.periodos_disponibles) ? data.periodos_disponibles : []);
      }
    } catch (error) {
      console.error("Error al cargar alumnos", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroCurso, filtroAño, filtroEstado, filtroTutor]);

  useEffect(() => {
    cargarAlumnos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginaActual, busqueda, filtroCurso, filtroAño, filtroEstado, filtroTutor]);

  const handleEliminarRotacion = async (rotacionId: string) => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/alumnos/rotacion/${rotacionId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) { toast.success("Rotación eliminada."); cargarAlumnos(); }
      else { const err = await res.json(); toast.error(err.detail || "No se pudo borrar la rotación."); }
    } catch { toast.error("Error de conexión."); }
  };

  const handleEliminarAlumno = async (alumnoId: string) => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/alumnos/${alumnoId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) { toast.success("Alumno eliminado."); cargarAlumnos(); }
      else { const err = await res.json(); toast.error(err.detail || "No se pudo borrar el alumno."); }
    } catch { toast.error("Error de conexión."); }
  };

  const abrirModalRotacion = (id: string, email: string) => {
    setAlumnoSeleccionado({ id, email });
    setModalAbierto(true);
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
        toast.error(err.detail || "No se pudo descargar el Excel");
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
      toast.error("Error de conexión al descargar el Excel.");
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
        toast.error(err.detail || "No se pudo descargar el informe");
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
      toast.error("Error de conexión al descargar el informe de evaluaciones.");
    }
  };

  const handleEliminarTutorCampo = async (rotacionId: string) => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/rotaciones/${rotacionId}/tutores/campo`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Tutor de campo desasignado correctamente.");
        cargarAlumnos();
      } else {
        const err = await res.json();
        toast.error(err.detail || "No se pudo desasignar.");
      }
    } catch {
      toast.error("Error de conexión.");
    }
  };

  const handleEliminarSeleccionados = async () => {
    const token = Cookies.get("practicum_token");
    let errores = 0;
    // Delete whole students first (cascades their rotations)
    await Promise.all(Array.from(selAlumnos).map(async (id) => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/alumnos/${id}`, {
          method: "DELETE", headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) errores++;
      } catch { errores++; }
    }));
    // Delete individual rotations (skip any whose student was already deleted)
    const alumnosEliminados = selAlumnos;
    const rotsFiltradas = Array.from(selRotaciones).filter(rotId => {
      const alumno = alumnos.find(a => a.rotaciones.some(r => r.id === rotId));
      return !alumno || !alumnosEliminados.has(alumno.id);
    });
    await Promise.all(rotsFiltradas.map(async (id) => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/alumnos/rotacion/${id}`, {
          method: "DELETE", headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) errores++;
      } catch { errores++; }
    }));
    const totalOps = selAlumnos.size + rotsFiltradas.length;
    if (errores === 0) {
      const partes = [];
      if (selAlumnos.size > 0) partes.push(`${selAlumnos.size} alumno${selAlumnos.size > 1 ? "s" : ""}`);
      if (rotsFiltradas.length > 0) partes.push(`${rotsFiltradas.length} rotación${rotsFiltradas.length > 1 ? "es" : ""}`);
      toast.success(`${partes.join(" y ")} eliminado${totalOps > 1 ? "s" : ""} correctamente.`);
    } else {
      toast.error(`${errores} elemento${errores > 1 ? "s" : ""} no se pudo${errores > 1 ? "ron" : ""} eliminar.`);
    }
    setSelAlumnos(new Set());
    setSelRotaciones(new Set());
    setModoSeleccion(false);
    cargarAlumnos();
  };

  const toggleSelAlumno = (id: string) => {
    setSelAlumnos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelRotacion = (rotId: string) => {
    setSelRotaciones(prev => {
      const next = new Set(prev);
      if (next.has(rotId)) next.delete(rotId); else next.add(rotId);
      return next;
    });
  };

  // Función para alternar el desplegable de un alumno
  const toggleExpandido = (alumnoId: string) => {
    setExpandidos(prev => ({
      ...prev,
      [alumnoId]: !prev[alumnoId]
    }));
  };

  const totalPaginas = Math.max(1, Math.ceil(totalAlumnos / PAGE_SIZE));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const inicioPagina = (paginaSegura - 1) * PAGE_SIZE;
  const alumnosPaginados = alumnos;



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        <Breadcrumb items={[
          { label: "Panel", href: "/admin/panel" },
          { label: "Alumnos" },
        ]} />

        <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8">

          <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-xl text-ufv-azul">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black text-ufv-azul-oscuro dark:text-white">Gestión de Alumnos</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={descargarExcelEvaluacionesAlumnos}
                className="px-4 py-2 bg-white dark:bg-[#0B1120] text-ufv-azul rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800 transition-all shadow-sm text-sm shrink-0"
              >
                <Download className="w-4 h-4" /> Descargar evaluaciones
              </button>
              <button
                onClick={() => setModalAltaAlumnoAbierto(true)}
                className="px-4 py-2 bg-ufv-azul text-white rounded-xl font-bold flex items-center gap-2 hover:bg-ufv-azul-oscuro transition-all shadow-sm text-sm shrink-0"
              >
                <UserPlus className="w-4 h-4" /> Nuevo Alumno
              </button>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-2">
            {/* Buscador */}
            <div className="relative flex-1 min-w-[180px]">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por email..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul focus:bg-white outline-none transition-all text-sm text-gray-700 dark:text-gray-300 font-medium shadow-sm hover:border-gray-300 dark:hover:border-gray-500"
              />
            </div>
            {/* Filtro año */}
            <div className="relative">
              <select
                value={filtroAño}
                onChange={(e) => setFiltroAño(e.target.value)}
                className="pl-3 pr-8 py-2 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none appearance-none transition-all text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-500"
              >
                <option value="todos">Todos los años</option>
                {periodosDisponibles.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            {/* Filtro curso */}
            <div className="relative">
              <select
                value={filtroCurso}
                onChange={(e) => setFiltroCurso(e.target.value)}
                className="pl-3 pr-8 py-2 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none appearance-none transition-all text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-500"
              >
                <option value="todos">Todos los cursos</option>
                <option value="2">2º Curso</option>
                <option value="3">3º Curso</option>
                <option value="4">4º Curso</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            {/* Filtro estado rotación */}
            <div className="relative">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="pl-3 pr-8 py-2 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none appearance-none transition-all text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-500"
              >
                <option value="todos">Cualquier estado</option>
                <option value="en_curso">En curso</option>
                <option value="finalizada">Finalizadas</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            {/* Filtro tutor de campo */}
            <div className="relative">
              <select
                value={filtroTutor}
                onChange={(e) => setFiltroTutor(e.target.value)}
                className="pl-3 pr-8 py-2 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none appearance-none transition-all text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-500"
              >
                <option value="todos">Cualquier tutor</option>
                <option value="con_tutor">Con tutor asignado</option>
                <option value="sin_tutor">Sin tutor asignado</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {/* Barra de selección múltiple */}
          <div className="flex items-center justify-between mb-3 min-h-[36px]">
            <button
              onClick={() => { setModoSeleccion(v => !v); setSelAlumnos(new Set()); setSelRotaciones(new Set()); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm ${modoSeleccion ? "bg-ufv-azul text-white border-ufv-azul" : "bg-white dark:bg-[#0B1120] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-ufv-azul hover:text-ufv-azul"}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              {modoSeleccion ? "Cancelar selección" : "Selección múltiple"}
            </button>
            {modoSeleccion && (selAlumnos.size > 0 || selRotaciones.size > 0) && (
              <button
                onClick={() => setConfirmPendiente({ tipo: "alumno", id: "__bulk__", email: "" })}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar ({[selAlumnos.size > 0 ? `${selAlumnos.size} alumno${selAlumnos.size > 1 ? "s" : ""}` : "", selRotaciones.size > 0 ? `${selRotaciones.size} rotación${selRotaciones.size > 1 ? "es" : ""}` : ""].filter(Boolean).join(", ")})
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-20 text-ufv-azul font-bold animate-pulse">
              Cargando alumnos...
            </div>
          ) : (
            <>
            <div className="bg-white dark:bg-[#0f172a] border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
              {alumnosPaginados.length === 0 ? (
                <div className="text-center p-12 text-gray-500 dark:text-gray-400 font-medium bg-gray-50/50 dark:bg-gray-800/20">
                  {busqueda || filtroCurso !== "todos" || filtroAño !== "todos"
                    ? "No hay alumnos que coincidan con los filtros actuales."
                    : "No hay alumnos registrados."}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {alumnosPaginados.map((alumno) => {
                    const rotacionesFiltradas = alumno.rotaciones.filter(rot => {
                      const coincideC = filtroCurso === "todos" || rot.curso.toString() === filtroCurso;
                      const coincideA = filtroAño === "todos" || rot.periodo_academico === filtroAño;
                      const coincideE = filtroEstado === "todos" ||
                        (filtroEstado === "en_curso" && !rot.completada) ||
                        (filtroEstado === "finalizada" && rot.completada);
                      const coincideT = filtroTutor === "todos" ||
                        (filtroTutor === "con_tutor" && !!rot.tutores.campo) ||
                        (filtroTutor === "sin_tutor" && !rot.tutores.campo);
                      return coincideC && coincideA && coincideE && coincideT;
                    }).sort((a, b) => b.curso - a.curso);

                    if (rotacionesFiltradas.length === 0) return null;

                    const estaSeleccionado = selAlumnos.has(alumno.id);

                    return (
                      <div key={alumno.id} className={estaSeleccionado ? "bg-blue-50/60 dark:bg-blue-900/10" : ""}>
                        {/* Fila principal */}
                        <div className="p-4 px-5 flex items-center justify-between gap-4 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                          <div className="flex items-center gap-4 min-w-0">
                            {modoSeleccion && (
                              <input
                                type="checkbox"
                                checked={estaSeleccionado}
                                onChange={() => toggleSelAlumno(alumno.id)}
                                className="w-4 h-4 rounded accent-ufv-azul shrink-0 cursor-pointer"
                              />
                            )}
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black uppercase shrink-0 text-lg shadow-sm transition-all ${estaSeleccionado ? "bg-ufv-azul text-white" : "bg-blue-100 dark:bg-blue-900/30 text-ufv-azul"}`}
                              onClick={modoSeleccion ? () => toggleSelAlumno(alumno.id) : undefined}
                              style={modoSeleccion ? { cursor: "pointer" } : {}}
                            >
                              {alumno.email.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{alumno.email}</p>

                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {rotacionesFiltradas.length > 0 && (
                              <button
                                onClick={() => toggleExpandido(alumno.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:border-ufv-azul hover:text-ufv-azul hover:bg-blue-50/50 transition-all shadow-sm"
                              >
                                <Briefcase className="w-4 h-4" />
                                Rotaciones ({rotacionesFiltradas.length})
                                {expandidos[alumno.id]
                                  ? <ChevronUp className="w-4 h-4" />
                                  : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmPendiente({ tipo: "alumno", id: alumno.id, email: alumno.email })}
                              className="flex items-center justify-center p-2 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 text-gray-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-200 dark:hover:border-red-800 transition-all shadow-sm"
                              title="Borrar alumno"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Rotaciones expandidas */}
                        {expandidos[alumno.id] && rotacionesFiltradas.length > 0 && (
                          <div className="px-5 pb-4 border-t border-blue-50 dark:border-blue-900/30 bg-gray-50/50 dark:bg-gray-800/20">
                            <div className="pt-3 space-y-2">
                              {rotacionesFiltradas.map((rot, i) => (
                                <div key={i} className={`group text-sm bg-white dark:bg-[#0f172a] border rounded-xl p-3 flex items-start justify-between transition-all shadow-sm ${selRotaciones.has(rot.id) && !estaSeleccionado ? "border-red-300 dark:border-red-700 bg-red-50/40 dark:bg-red-900/10" : rot.completada ? "border-emerald-200 dark:border-emerald-800" : "border-gray-200 dark:border-gray-700 hover:border-ufv-azul-claro"}`}>
                                  <div className="flex flex-col gap-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold flex items-center gap-1.5 text-ufv-azul-oscuro dark:text-white">
                                        <Briefcase className="w-3.5 h-3.5 shrink-0" />
                                        {rot.especialidad?.trim() ? rot.especialidad : "Sin especialidad asignada"}
                                      </span>
                                      {rot.completada ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                                          <CheckCircle className="w-3 h-3" /> Evaluada
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 text-ufv-azul border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-md">
                                          <Activity className="w-3 h-3" /> En curso
                                        </span>
                                      )}
                                      {rot.periodo_academico && (
                                        <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700">
                                          {rot.periodo_academico}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                      {rot.curso}º Curso · Rotación {rot.numero_rotacion}
                                    </span>
                                    <div className="flex flex-col gap-0.5 mt-1">
                                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                                        <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                        <b className="text-gray-700 dark:text-gray-300">Centro:</b>&nbsp;{rot.centro_practicas || "No especificado"}
                                      </span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        <b className="text-gray-700 dark:text-gray-300">Hospital:</b> {rot.tutores.hospital || "No asignado"}
                                      </span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        <b className="text-gray-700 dark:text-gray-300">Universidad:</b> {rot.tutores.universidad || "No asignado"}
                                      </span>
                                      <div className="flex items-center gap-2 group/tutor">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                          <b className="text-gray-700 dark:text-gray-300">Tutor Campo:</b> {rot.tutores.campo || "Sin asignar"}
                                        </span>
                                        {rot.tutores.campo && (
                                          <button
                                            onClick={() => setConfirmPendiente({ tipo: "tutor", rotacionId: rot.id, email: rot.tutores.campo! })}
                                            className="opacity-0 group-hover/tutor:opacity-100 text-red-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                            title="Eliminar tutor de campo"
                                          >
                                            <XCircle className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    {modoSeleccion && !estaSeleccionado && (
                                      <input
                                        type="checkbox"
                                        checked={selRotaciones.has(rot.id)}
                                        onChange={() => toggleSelRotacion(rot.id)}
                                        className="w-4 h-4 rounded accent-ufv-azul cursor-pointer"
                                        title="Seleccionar rotación"
                                      />
                                    )}
                                    {!modoSeleccion && rot.completada && (
                                      <button
                                        onClick={() => descargarExcelRotacion(rot.id)}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-ufv-azul transition-all"
                                        title="Descargar Excel"
                                      >
                                        <Download className="w-4 h-4" />
                                      </button>
                                    )}
                                    {!modoSeleccion && (
                                      <button
                                        onClick={() => setConfirmPendiente({ tipo: "rotacion", id: rot.id })}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-600 transition-all"
                                        title="Borrar rotación"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
              <p className="text-xs font-medium text-gray-500">
                {alumnosPaginados.length === 0
                  ? "Sin resultados"
                  : `Mostrando ${inicioPagina + 1}–${Math.min(inicioPagina + alumnosPaginados.length, totalAlumnos)} de ${totalAlumnos} alumnos`
                }
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

      <ConfirmDialog
        isOpen={!!confirmPendiente}
        title={
          confirmPendiente?.tipo === "alumno" && confirmPendiente.id === "__bulk__" ? "Confirmar eliminación" :
          confirmPendiente?.tipo === "alumno"   ? "Borrar alumno permanentemente" :
          confirmPendiente?.tipo === "rotacion" ? "Borrar evaluación" :
          "Quitar tutor de campo"
        }
        message={
          confirmPendiente?.tipo === "alumno" && confirmPendiente.id === "__bulk__" ? [selAlumnos.size > 0 ? `${selAlumnos.size} alumno${selAlumnos.size > 1 ? "s completos" : " completo"} (con todas sus rotaciones)` : "", selRotaciones.size > 0 ? `${selRotaciones.size} rotación${selRotaciones.size > 1 ? "es individuales" : " individual"}` : ""].filter(Boolean).join(" y ") + " serán eliminados permanentemente. ¿Continuar?" :
          confirmPendiente?.tipo === "alumno"   ? `¿Borrar permanentemente a ${confirmPendiente.email}?\n\nEsta acción eliminará todas sus rotaciones y evaluaciones.` :
          confirmPendiente?.tipo === "rotacion" ? "¿Seguro que quieres borrar esta evaluación? Se perderán todos los datos asociados." :
          `¿Quitar el acceso al tutor de campo (${confirmPendiente?.tipo === "tutor" ? confirmPendiente.email : ""}) de esta rotación?`
        }
        confirmLabel="Sí, borrar"
        onConfirm={() => {
          if (!confirmPendiente) return;
          if (confirmPendiente.tipo === "alumno" && confirmPendiente.id === "__bulk__") { handleEliminarSeleccionados(); setConfirmPendiente(null); return; }
          if (confirmPendiente.tipo === "alumno")   handleEliminarAlumno(confirmPendiente.id);
          if (confirmPendiente.tipo === "rotacion") handleEliminarRotacion(confirmPendiente.id);
          if (confirmPendiente.tipo === "tutor")    handleEliminarTutorCampo(confirmPendiente.rotacionId);
          setConfirmPendiente(null);
        }}
        onCancel={() => setConfirmPendiente(null)}
      />

    </div>
  );
}
