"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import {
  User, LogOut, ChevronRight, Mail, Folder, Search, Home,
  ChevronLeft, Lock, X, Briefcase, Eye, PenTool,
  CheckCircle2, Calendar, BookOpen, Download, AlertCircle, BarChart2, Activity, Users
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ModalRubrica from "@/components/ModalRubrica";
import ConfirmDialog from "@/components/ConfirmDialog";
import * as XLSX from "xlsx";
import { validarPasswordFuerte } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/components/ToastProvider";

// Interfaz actualizada con el Centro de Prácticas
interface AlumnoAsignado {
  rotacion_id: string;
  alumno_id: string;
  nombre_completo: string;
  email: string;
  tutor_hospital_email?: string;
  tutor_universidad_email?: string;
  curso: number;
  grupo: string;
  numero_rotacion: number;
  especialidad: string;
  estado_evaluacion: string;
  hospital_finalize_count?: number;
  mi_rol: string;
  periodo_academico: string;
  centro_practicas?: string;
  nota?: string;
}

const formatearPeriodoAcademico = (inicio: number, fin: number) => `${inicio}/${String(fin).slice(-2)}`;
const obtenerPeriodoActual = () => {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  return hoy.getMonth() < 8 ? formatearPeriodoAcademico(anio - 1, anio) : formatearPeriodoAcademico(anio, anio + 1);
};
const generarPeriodos = () => {
  const hoy = new Date();
  const anioBase = hoy.getMonth() < 8 ? hoy.getFullYear() - 1 : hoy.getFullYear();
  const periodos = [];
  for (let i = -4; i <= 2; i++) {
    periodos.push(formatearPeriodoAcademico(anioBase + i, anioBase + i + 1));
  }
  return periodos.reverse();
};

interface EspecialidadDisponible {
  nombre: string;
  especialidadId?: string;
  rotacionId?: string;
}

export default function ProfesorDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [alumnos, setAlumnos] = useState<AlumnoAsignado[]>([]);
  const [loading, setLoading] = useState(true);

  // Lógica de memoria de navegación
  const [isInitialized, setIsInitialized] = useState(false);

  const [filtroPeriodoResumen, setFiltroPeriodoResumen] = useState<string>(obtenerPeriodoActual());
  const periodosResumen = generarPeriodos();
  const [filtroCursoResumen, setFiltroCursoResumen] = useState<string>("Todos");
  const [filtroEspecialidadResumen, setFiltroEspecialidadResumen] = useState<string>("Todos");

  // Estados de filtros y navegación
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("Todos");

  const [cursoActivo, setCursoActivo] = useState<number | null>(null);
  const [rotacionActiva, setRotacionActiva] = useState<number | null>(null);
  const [especialidadActiva, setEspecialidadActiva] = useState<string | null>(null);

  const [showPassModal, setShowPassModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [passFormData, setPassFormData] = useState({ actual: "", nueva: "", confirmar: "" });
  const [passStatus, setPassStatus] = useState({ type: "", msg: "" });
  const [isRubricaOpen, setIsRubricaOpen] = useState(false);
  const [rubricaActual, setRubricaActual] = useState({ nombre: "", molde: null });
  const [especialidadesSistema, setEspecialidadesSistema] = useState<EspecialidadDisponible[]>([]);
  const [estadoEvaluacionActivo, setEstadoEvaluacionActivo] = useState<"Evaluados" | "No Evaluados" | null>(null);

  // Estados modal Excel
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportCurso, setExportCurso] = useState("");
  const [exportRotacion, setExportRotacion] = useState("");
  const [exportEspecialidad, setExportEspecialidad] = useState("");
  const [exportPeriodo, setExportPeriodo] = useState("");
  const [exportSoloEvaluados, setExportSoloEvaluados] = useState(false);
  const [vistaPrincipalTab, setVistaPrincipalTab] = useState<"directorio" | "resumen">("directorio");

  const periodosParaExportar = (() => {
    const pActual = obtenerPeriodoActual();
    const añoInicio = Number(pActual.split("/")[0]);
    return [
      formatearPeriodoAcademico(añoInicio - 3, añoInicio - 2),
      formatearPeriodoAcademico(añoInicio - 2, añoInicio - 1),
      formatearPeriodoAcademico(añoInicio - 1, añoInicio),
      pActual,
      formatearPeriodoAcademico(añoInicio + 1, añoInicio + 2),
    ].reverse();
  })();

  // 1. Leer memoria al cargar
  useEffect(() => {
    const memoria = sessionStorage.getItem("profesor_memoria_navegacion");
    if (memoria) {
      try {
        const estadoGuardado = JSON.parse(memoria);
        if (estadoGuardado.filtroPeriodo) setFiltroPeriodo(estadoGuardado.filtroPeriodo);
        if (estadoGuardado.filtroEstado) setFiltroEstado(estadoGuardado.filtroEstado);
        if (estadoGuardado.busqueda !== undefined) setBusqueda(estadoGuardado.busqueda);
        if (estadoGuardado.cursoActivo !== undefined) setCursoActivo(estadoGuardado.cursoActivo);
        if (estadoGuardado.rotacionActiva !== undefined) setRotacionActiva(estadoGuardado.rotacionActiva);
        if (estadoGuardado.especialidadActiva !== undefined) setEspecialidadActiva(estadoGuardado.especialidadActiva);
        if (estadoGuardado.estadoEvaluacionActivo !== undefined) setEstadoEvaluacionActivo(estadoGuardado.estadoEvaluacionActivo);
      } catch (e) {
        console.error("Error leyendo memoria", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // 2. Guardar memoria ante cambios
  useEffect(() => {
    if (isInitialized) {
      sessionStorage.setItem("profesor_memoria_navegacion", JSON.stringify({
        filtroPeriodo,
        filtroEstado,
        busqueda,
        cursoActivo,
        rotacionActiva,
        especialidadActiva,
        estadoEvaluacionActivo
      }));
    }
  }, [isInitialized, filtroPeriodo, filtroEstado, busqueda, cursoActivo, rotacionActiva, especialidadActiva, estadoEvaluacionActivo]);

  // 3. Cargar datos del API
  useEffect(() => {
    cargarAlumnos();
    cargarEspecialidadesSistema();
  }, []);

  const cargarAlumnos = async () => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/profesores/mis-alumnos`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAlumnos(data);

        const memoria = sessionStorage.getItem("profesor_memoria_navegacion");
        if (!memoria) {
          const periodosUnicos = Array.from(new Set(data.map((a: any) => a.periodo_academico))).sort().reverse();
          if (periodosUnicos.length > 0) {
            setFiltroPeriodo(periodosUnicos[0] as string);
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const cargarEspecialidadesSistema = async () => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cuadernillos/especialidades`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setEspecialidadesSistema(data.map((esp: any) => ({
          nombre: esp.nombre,
          especialidadId: esp.id,
        })));
      }
    } catch (error) {
      console.error("Error cargando especialidades", error);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const doLogout = () => {
    Cookies.remove("practicum_token");
    Cookies.remove("practicum_rol");
    sessionStorage.removeItem("profesor_memoria_navegacion");
    router.push("/login");
  };

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassStatus({ type: "info", msg: "Actualizando..." });

    if (passFormData.nueva !== passFormData.confirmar) {
      setPassStatus({ type: "error", msg: "Las contraseñas nuevas no coinciden." });
      return;
    }

    const { valida, msg } = validarPasswordFuerte(passFormData.nueva);
    if (!valida) {
      setPassStatus({ type: "error", msg });
      return;
    }

    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/cambiar-password`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password_actual: passFormData.actual,
          nueva_password: passFormData.nueva,
          confirmar_password: passFormData.confirmar
        })
      });

      const data = await res.json();

      if (res.ok) {
        setPassStatus({ type: "success", msg: "¡Contraseña actualizada con éxito!" });
        setTimeout(() => {
          setShowPassModal(false);
          setPassFormData({ actual: "", nueva: "", confirmar: "" });
          setPassStatus({ type: "", msg: "" });
        }, 2000);
      } else {
        let errorFinal = "Error al cambiar la contraseña.";
        if (Array.isArray(data.detail)) {
          errorFinal = data.detail[0].msg;
        } else if (typeof data.detail === "string") {
          errorFinal = data.detail;
        }
        setPassStatus({ type: "error", msg: errorFinal });
      }
    } catch (error) {
      setPassStatus({ type: "error", msg: "Error de conexión con el servidor." });
    }
  };

  const abrirManualRubrica = async (rotacionId: string, especialidadNombre: string) => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cuadernillos/molde/${rotacionId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRubricaActual({ nombre: especialidadNombre, molde: data.molde });
        setIsRubricaOpen(true);
      } else {
        toast.error("No se pudo cargar el manual de esta especialidad.");
      }
    } catch (error) {
      console.error("Error al cargar la rúbrica", error);
    }
  };


  // Lógica de filtrado
  const periodosDisponibles = Array.from(new Set(alumnos.map(a => a.periodo_academico))).sort().reverse();

  const alumnosPorEstadoYPeriodo = alumnos.filter(a =>
    (filtroPeriodo === "Todos" || a.periodo_academico === filtroPeriodo) &&
    (filtroEstado === "Todos" || a.estado_evaluacion === filtroEstado)
  );

  // Aplicar filtro de Evaluados/No Evaluados desde el principio
  const alumnosPorEvaluacion = estadoEvaluacionActivo
    ? alumnosPorEstadoYPeriodo.filter(a =>
      estadoEvaluacionActivo === "Evaluados"
        ? a.estado_evaluacion === "Completada"
        : a.estado_evaluacion !== "Completada"
    )
    : alumnosPorEstadoYPeriodo;

  const cursosDisponibles = Array.from(new Set(alumnosPorEvaluacion.map(a => a.curso))).sort();
  const rotacionesDelCurso = cursoActivo ? Array.from(new Set(alumnosPorEvaluacion.filter(a => a.curso === cursoActivo).map(a => a.numero_rotacion))).sort() : [];
  const especialidadesDeLaRotacion = (cursoActivo && rotacionActiva) ? Array.from(new Set(alumnosPorEvaluacion.filter(a => a.curso === cursoActivo && a.numero_rotacion === rotacionActiva).map(a => a.especialidad))).sort() : [];
  const especialidadesDesdeAlumnos = Array.from(
    new Map(
      alumnosPorEvaluacion.map((a) => [a.especialidad, { nombre: a.especialidad, rotacionId: a.rotacion_id }])
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const especialidadesDisponibles = especialidadesSistema.length > 0 ? especialidadesSistema : especialidadesDesdeAlumnos;
  const puedeAbrirRubrica = especialidadesDisponibles.length > 0;

  const isBuscando = busqueda.trim().length > 0;
  let alumnosAMostrar = alumnosPorEvaluacion;

  if (isBuscando) {
    const texto = busqueda.toLowerCase();
    alumnosAMostrar = alumnosPorEvaluacion.filter(a => a.nombre_completo.toLowerCase().includes(texto) || a.email.toLowerCase().includes(texto));
  } else if (cursoActivo && rotacionActiva && especialidadActiva) {
    alumnosAMostrar = alumnosPorEvaluacion.filter(a => a.curso === cursoActivo && a.numero_rotacion === rotacionActiva && a.especialidad === especialidadActiva);
  }

  const alumnoParaRubrica = !isBuscando && cursoActivo && rotacionActiva && especialidadActiva
    ? alumnosAMostrar[0] || null
    : null;

  const alumnosResumenFiltrados = alumnos.filter(a => filtroPeriodoResumen === "Todos" || a.periodo_academico === filtroPeriodoResumen);

  const cursosDisponiblesResumen = Array.from(new Set(alumnosResumenFiltrados.map(a => a.curso.toString()))).sort();
  const especialidadesDisponiblesResumen = Array.from(new Set(alumnosResumenFiltrados.map(a => a.especialidad))).sort();

  const alumnosResumenTarjetasFiltrados = alumnosResumenFiltrados.filter(a => 
    (filtroCursoResumen === "Todos" || a.curso.toString() === filtroCursoResumen) &&
    (filtroEspecialidadResumen === "Todos" || a.especialidad === filtroEspecialidadResumen)
  );

  const totalAlumnosGlobal = alumnosResumenTarjetasFiltrados.length;
  const alumnosEvaluadosGlobal = alumnosResumenTarjetasFiltrados.filter((a) => a.estado_evaluacion === "Completada").length;
  const alumnosNoEvaluadosGlobal = totalAlumnosGlobal - alumnosEvaluadosGlobal;
  const progresoEvaluacionGlobal = totalAlumnosGlobal > 0 ? Math.round((alumnosEvaluadosGlobal / totalAlumnosGlobal) * 100) : 0;

  const alumnosResumenParaCursos = alumnosResumenFiltrados.filter(a => 
    filtroEspecialidadResumen === "Todos" || a.especialidad === filtroEspecialidadResumen
  );

  const resumenCursos = Array.from(
    new Map(alumnosResumenParaCursos.map((a) => [a.curso, alumnosResumenParaCursos.filter((item) => item.curso === a.curso).length]))
  )
    .map(([curso, total]) => ({ curso: Number(curso), total }))
    .sort((a, b) => a.curso - b.curso);

  const alumnosResumenParaEspecialidades = alumnosResumenFiltrados.filter(a => 
    filtroCursoResumen === "Todos" || a.curso.toString() === filtroCursoResumen
  );

  const resumenEspecialidades = Array.from(
    new Map(alumnosResumenParaEspecialidades.map((a) => [a.especialidad, alumnosResumenParaEspecialidades.filter((item) => item.especialidad === a.especialidad).length]))
  )
    .map(([especialidad, total]) => ({ especialidad: String(especialidad), total }))
    .sort((a, b) => b.total - a.total || a.especialidad.localeCompare(b.especialidad));

  const maxCurso = Math.max(...resumenCursos.map((item) => item.total), 1);
  const maxEspecialidad = Math.max(...resumenEspecialidades.map((item) => item.total), 1);

  // Componente de Tarjeta de Alumno
  const TarjetaAlumno = ({ item }: { item: AlumnoAsignado }) => (
    <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-300 group flex flex-col">
      <div className="p-6 flex-grow">
        <div className="flex justify-between items-start mb-6 gap-2">
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-600 border border-gray-200">
              {item.periodo_academico}
            </div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-ufv-azul">
              {item.curso}º Curso
            </div>
          </div>

          {item.estado_evaluacion === "Completada" ? (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 shrink-0">✅ Evaluado</div>
          ) : item.estado_evaluacion === "Pendiente Confirmación Final" ? (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 shrink-0">⚠️ Cierre 1/2</div>
          ) : item.estado_evaluacion === "En Proceso" ? (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 shrink-0">📝 Borrador</div>
          ) : (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 shrink-0">⏳ Pendiente</div>
          )}
        </div>
        <h3 className="text-xl font-black text-ufv-azul-oscuro mb-1 group-hover:text-ufv-azul transition-colors">{item.nombre_completo}</h3>
        <p className="text-xs font-bold text-gray-500 mb-3">{item.especialidad} (Rotación {item.numero_rotacion})</p>

        <div className="mt-4 space-y-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center text-sm text-gray-500 font-medium">
            <Briefcase className="w-4 h-4 mr-3 text-ufv-rosa-oscuro shrink-0" />
            <span className="truncate text-gray-700 font-bold" title={item.centro_practicas || "Centro clínico no especificado"}>
              {item.centro_practicas || "Centro no especificado"}
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-500 font-medium">
            <Mail className="w-4 h-4 mr-3 text-gray-400" />
            <span className="truncate" title={item.email}>{item.email}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500 font-medium">
            <Mail className="w-4 h-4 mr-3 text-gray-400" />
            <span className="truncate" title={item.tutor_hospital_email || "Sin tutor hospital"}>
              Tutor hospital: {item.tutor_hospital_email || "Sin asignar"}
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-500 font-medium">
            <Mail className="w-4 h-4 mr-3 text-gray-400" />
            <span className="truncate" title={item.tutor_universidad_email || "Sin tutor universidad"}>
              Tutor universidad: {item.tutor_universidad_email || "Sin asignar"}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-700 mt-auto flex flex-col gap-2">
        {item.estado_evaluacion === "Completada" ? (
          <button onClick={() => router.push(`/profesor/evaluar/${item.rotacion_id}`)} className="w-full bg-green-50 border border-green-200 text-green-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-100 transition-all shadow-sm text-sm">
            <CheckCircle2 className="w-4 h-4" /> Acta Cerrada (Revisar)
          </button>
        ) : item.estado_evaluacion === "Pendiente Confirmación Final" && item.mi_rol !== "universidad" ? (
          <button onClick={() => router.push(`/profesor/evaluar/${item.rotacion_id}`)} className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm text-sm bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100">
            <PenTool className="w-4 h-4" /> Confirmar Cierre Final (2/2)
          </button>
        ) : (
          <button onClick={() => router.push(`/profesor/evaluar/${item.rotacion_id}`)} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm text-sm ${item.mi_rol === 'universidad' ? 'bg-blue-50 border border-blue-200 text-ufv-azul hover:bg-blue-100' : 'bg-white border border-gray-200 text-gray-700 hover:bg-ufv-azul hover:text-white'}`}>
            {item.mi_rol === 'universidad' ? <><Eye className="w-4 h-4" /> Revisar Evaluación</> : <><PenTool className="w-4 h-4" /> Evaluar Alumno</>}
          </button>
        )}
        <button onClick={() => router.push(`/profesor/asistencia/${item.rotacion_id}`)} className="w-full bg-transparent text-gray-500 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all border border-transparent">
          Ver Asistencia
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] p-4 md:p-8">
      <div className="max-w-7xl mx-auto pb-20">

        {/* CABECERA PRINCIPAL */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex items-center gap-4">
            <Image src="/logo-ufv.png" alt="Logo UFV" width={56} height={56} className="object-contain" />
            <div>
              <h1 className="text-3xl font-black text-ufv-azul-oscuro">Practicum Docente</h1>
              <p className="text-xs font-bold text-ufv-rosa-oscuro uppercase tracking-widest mt-1">Universidad Francisco de Vitoria</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap lg:flex-nowrap items-stretch sm:items-center gap-3">
            {/* BOTÓN DEL MANUAL PDF (SUPABASE) */}
            <button
              onClick={() => {
                if (!puedeAbrirRubrica) return;

                if (alumnoParaRubrica) {
                  abrirManualRubrica(alumnoParaRubrica.rotacion_id, alumnoParaRubrica.especialidad);
                  return;
                }

                setRubricaActual({
                  nombre: especialidadActiva || especialidadesDisponibles[0]?.nombre || "",
                  molde: null,
                });
                setIsRubricaOpen(true);
              }}
              disabled={!puedeAbrirRubrica}
              title={puedeAbrirRubrica ? "Abrir criterios y rúbrica" : "No hay especialidades disponibles"}
              className="w-full sm:w-auto whitespace-nowrap bg-indigo-50 border border-indigo-200 text-indigo-700 py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BookOpen className="w-4 h-4" /> Criterios y Rúbrica
            </button>

            <button onClick={() => setShowPassModal(true)} className="w-full sm:w-auto whitespace-nowrap flex items-center justify-center gap-2 bg-white text-ufv-azul px-4 py-2.5 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition-all shadow-sm active:scale-95"><Lock className="w-4 h-4" /> Cambiar Contraseña</button>
            <ThemeToggle />
            <button onClick={handleLogout} className="w-full sm:w-auto whitespace-nowrap flex items-center justify-center gap-2 bg-white text-red-600 px-4 py-2.5 rounded-xl font-bold border border-red-200 hover:bg-red-50 transition-all shadow-sm active:scale-95"><LogOut className="w-4 h-4" /> Cerrar Sesión</button>
          </div>
        </div>

        <div className="mb-8 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-2xl p-1 flex gap-1 shadow-sm w-full max-w-2xl">
          <button
            type="button"
            onClick={() => setVistaPrincipalTab("directorio")}
            className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${vistaPrincipalTab === "directorio" ? "bg-ufv-azul text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
          >
            <Folder className="w-4 h-4" /> Directorio de Alumnos
          </button>
          <button
            type="button"
            onClick={() => setVistaPrincipalTab("resumen")}
            className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${vistaPrincipalTab === "resumen" ? "bg-ufv-azul text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
          >
            <BarChart2 className="w-4 h-4" /> Resumen global
          </button>
        </div>

        {vistaPrincipalTab === "resumen" && alumnos.length > 0 && (
          <section className="mb-8 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0B1120] shadow-sm overflow-hidden transition-colors">
            <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-white dark:from-[#0f172a] dark:to-[#0B1120] flex flex-col gap-3 md:flex-row md:items-end md:justify-between transition-colors">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-ufv-azul dark:text-blue-400">Vista general</p>
                <h2 className="text-lg md:text-xl font-black text-ufv-azul-oscuro dark:text-white transition-colors">Resumen global de tus alumnos</h2>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mt-1 transition-colors">
                  Agrupa evaluados y no evaluados, e incluye el reparto por curso y especialidad.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
                <div className="relative">
                  <select
                    value={filtroPeriodoResumen}
                    onChange={(e) => setFiltroPeriodoResumen(e.target.value)}
                    className="pl-3 pr-8 py-2 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none appearance-none transition-all text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-500"
                  >
                    <option value="Todos">Todos los años</option>
                    {periodosResumen.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={filtroCursoResumen}
                    onChange={(e) => setFiltroCursoResumen(e.target.value)}
                    className="pl-3 pr-8 py-2 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none appearance-none transition-all text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-500"
                  >
                    <option value="Todos">Todos los cursos</option>
                    {cursosDisponiblesResumen.map((c) => (
                      <option key={c} value={c}>{c}º Curso</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={filtroEspecialidadResumen}
                    onChange={(e) => setFiltroEspecialidadResumen(e.target.value)}
                    className="pl-3 pr-8 py-2 max-w-[200px] sm:max-w-xs bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none appearance-none transition-all text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-500 truncate"
                  >
                    <option value="Todos">Todas las especialidades</option>
                    {especialidadesDisponiblesResumen.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-5 space-y-4 max-w-6xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Total</span>
                    <div className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
                      <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-ufv-azul-oscuro dark:text-white">{totalAlumnosGlobal}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">alumnos en seguimiento</p>
                </div>

                <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Evaluados</span>
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                      <CheckCircle2 className="w-4 h-4 text-ufv-azul dark:text-blue-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-ufv-azul-oscuro dark:text-white">{alumnosEvaluadosGlobal}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">rotaciones completadas</p>
                  <div className="mt-3 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-ufv-azul dark:bg-blue-500 rounded-full" style={{ width: `${progresoEvaluacionGlobal}%` }} />
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">No evaluados</span>
                    <div className="bg-pink-50 dark:bg-pink-900/30 p-1.5 rounded-lg border border-pink-100 dark:border-pink-800/50">
                      <AlertCircle className="w-4 h-4 text-ufv-rosa-oscuro dark:text-pink-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-ufv-rosa-oscuro dark:text-pink-400">{alumnosNoEvaluadosGlobal}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">pendientes, borradores y sin confirmar</p>
                  <div className="mt-3 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-ufv-rosa-oscuro dark:bg-pink-500 rounded-full" style={{ width: `${totalAlumnosGlobal > 0 ? 100 - progresoEvaluacionGlobal : 0}%` }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-50 p-1.5 rounded-lg border border-blue-100">
                        <BarChart2 className="w-4 h-4 text-ufv-azul" />
                      </div>
                      <h3 className="text-sm font-black text-ufv-azul-oscuro uppercase tracking-widest">Por curso</h3>
                    </div>
                    <span className="text-xs font-bold text-gray-400">{resumenCursos.length} cursos</span>
                  </div>
                  <div className="space-y-3">
                    {resumenCursos.map((curso, i) => (
                      <div key={curso.curso}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-bold text-gray-700">{curso.curso}º Curso</span>
                          <span className="text-xs font-black text-gray-400 shrink-0 ml-2">{curso.total} alumnos</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${i % 2 === 0 ? "bg-ufv-azul" : "bg-ufv-rosa-oscuro"}`}
                            style={{ width: `${(curso.total / maxCurso) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="bg-pink-50 p-1.5 rounded-lg border border-pink-100">
                        <Activity className="w-4 h-4 text-ufv-rosa-oscuro" />
                      </div>
                      <h3 className="text-sm font-black text-ufv-azul-oscuro uppercase tracking-widest">Por especialidad</h3>
                    </div>
                    <span className="text-xs font-bold text-gray-400">{resumenEspecialidades.length} especialidades</span>
                  </div>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {resumenEspecialidades.map((especialidad, i) => (
                      <div key={especialidad.especialidad}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-bold text-gray-700 truncate max-w-[70%]">{especialidad.especialidad}</span>
                          <span className="text-xs font-black text-gray-400 shrink-0 ml-2">{especialidad.total} alumnos</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${i % 2 === 0 ? "bg-ufv-rosa-oscuro" : "bg-ufv-azul"}`}
                            style={{ width: `${(especialidad.total / maxEspecialidad) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </section>
        )}

        {vistaPrincipalTab === "directorio" && (
          <main>
            {/* BARRA DE FILTROS */}
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-extrabold text-ufv-azul-oscuro">Directorio de Alumnos</h2>
                  <button
                    onClick={() => setShowExportModal(true)}
                    title="Exportar listado a Excel"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors shadow-sm"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-gray-500 mt-1 font-medium">Navega por las carpetas o busca un alumno directamente.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">

                <div className="relative w-full sm:w-52">
                  <select
                    value={filtroPeriodo}
                    onChange={(e) => { setFiltroPeriodo(e.target.value); setCursoActivo(null); setRotacionActiva(null); setEspecialidadActiva(null); setEstadoEvaluacionActivo(null); }}
                    className="pl-3 pr-8 py-2 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none appearance-none transition-all text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-500 w-full cursor-pointer"
                  >
                    <option value="Todos">Todos los años</option>
                    {periodosDisponibles.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                <div className="relative w-full sm:w-auto">
                  <select
                    value={filtroEstado}
                    onChange={(e) => { setFiltroEstado(e.target.value); setCursoActivo(null); setRotacionActiva(null); setEspecialidadActiva(null); setEstadoEvaluacionActivo(null); }}
                    className="pl-3 pr-8 py-2 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none appearance-none transition-all text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-500 w-full cursor-pointer"
                  >
                    <option value="Todos">Todos los estados</option>
                    <option value="Pendiente">⏳ Pendientes</option>
                    <option value="En Proceso">📝 Borradores</option>
                    <option value="Pendiente Confirmación Final">⚠️ Sin confirmar</option>
                    <option value="Completada">✅ Evaluados</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                <div className="relative w-full sm:w-72">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
                  <input type="text" className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none transition-all text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-500" placeholder="Buscar alumno..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>
              </div>
            </header>

            {loading ? (
              <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ufv-azul"></div></div>
            ) : alumnos.length === 0 ? (
              <div className="bg-white dark:bg-[#0f172a] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-16 text-center">
                <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-700">Sin alumnos</h3>
                <p className="text-gray-500 mt-2 font-medium">No tienes alumnos asignados para los filtros seleccionados.</p>
              </div>
            ) : (
              <>
                {/* BREADCRUMBS */}
                {!isBuscando && (
                  <div className="flex flex-wrap items-center text-sm text-gray-500 mb-6 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm font-medium w-fit">
                    <button onClick={() => { setEstadoEvaluacionActivo(null); setCursoActivo(null); setRotacionActiva(null); setEspecialidadActiva(null); }} className={`flex items-center gap-1.5 hover:text-ufv-azul px-2 ${!estadoEvaluacionActivo ? "font-bold text-ufv-azul" : ""}`}><Home className="w-4 h-4" /> Inicio</button>
                    {estadoEvaluacionActivo && <><ChevronRight className="w-4 h-4 mx-1 text-gray-300" /><button onClick={() => { setCursoActivo(null); setRotacionActiva(null); setEspecialidadActiva(null); }} className={`px-2 ${!cursoActivo ? "font-bold text-ufv-azul" : ""}`}>{estadoEvaluacionActivo}</button></>}
                    {cursoActivo && <><ChevronRight className="w-4 h-4 mx-1 text-gray-300" /><button onClick={() => { setRotacionActiva(null); setEspecialidadActiva(null); }} className={`px-2 ${!rotacionActiva ? "font-bold text-ufv-azul" : ""}`}>{cursoActivo}º Curso</button></>}
                    {rotacionActiva && <><ChevronRight className="w-4 h-4 mx-1 text-gray-300" /><button onClick={() => setEspecialidadActiva(null)} className={`px-2 ${!especialidadActiva ? "font-bold text-ufv-azul" : ""}`}>Rotación {rotacionActiva}</button></>}
                    {especialidadActiva && <><ChevronRight className="w-4 h-4 mx-1 text-gray-300" /><span className="font-bold text-ufv-azul px-2">{especialidadActiva}</span></>}
                  </div>
                )}

                {/* LISTADO DINÁMICO */}
                {isBuscando ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {alumnosAMostrar.map(item => <TarjetaAlumno key={item.rotacion_id} item={item} />)}
                  </div>
                ) : !estadoEvaluacionActivo ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
                    {(() => {
                      const alumnosEvaluados = alumnosPorEstadoYPeriodo.filter(a => a.estado_evaluacion === "Completada");
                      const alumnosNoEvaluados = alumnosPorEstadoYPeriodo.filter(a => a.estado_evaluacion !== "Completada");

                      return (
                        <>
                          <button onClick={() => setEstadoEvaluacionActivo("Evaluados")} className="flex items-center p-6 bg-white dark:bg-[#0f172a] rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-ufv-azul dark:hover:border-ufv-azul transition-all text-left group">
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-2xl mr-5 group-hover:bg-ufv-azul transition-colors"><Folder className="w-8 h-8 text-ufv-azul group-hover:text-white" /></div>
                            <div>
                              <h3 className="text-xl font-black text-ufv-azul-oscuro dark:text-white group-hover:text-ufv-azul">Evaluados</h3>
                              <p className="text-sm font-bold text-gray-400 dark:text-gray-500 mt-1">{alumnosEvaluados.length} alumnos</p>
                            </div>
                          </button>
                          <button onClick={() => setEstadoEvaluacionActivo("No Evaluados")} className="flex items-center p-6 bg-white dark:bg-[#0f172a] rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-ufv-azul dark:hover:border-ufv-azul transition-all text-left group">
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-2xl mr-5 group-hover:bg-ufv-azul transition-colors"><Folder className="w-8 h-8 text-ufv-azul group-hover:text-white" /></div>
                            <div>
                              <h3 className="text-xl font-black text-ufv-azul-oscuro dark:text-white group-hover:text-ufv-azul">No Evaluados</h3>
                              <p className="text-sm font-bold text-gray-400 dark:text-gray-500 mt-1">{alumnosNoEvaluados.length} alumnos</p>
                            </div>
                          </button>
                        </>
                      );
                    })()}
                  </div>
                ) : !cursoActivo ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cursosDisponibles.map(curso => (
                      <button key={curso} onClick={() => setCursoActivo(curso)} className="flex items-center p-6 bg-white dark:bg-[#0f172a] rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-ufv-azul dark:hover:border-ufv-azul transition-all text-left group">
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-2xl mr-5 group-hover:bg-ufv-azul transition-colors"><Folder className="w-8 h-8 text-ufv-azul group-hover:text-white" /></div>
                        <div>
                          <h3 className="text-xl font-black text-ufv-azul-oscuro dark:text-white group-hover:text-ufv-azul">{curso}º Curso</h3>
                          <p className="text-sm font-bold text-gray-400 dark:text-gray-500 mt-1">{alumnosPorEvaluacion.filter(a => a.curso === curso).length} alumnos</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : !rotacionActiva ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rotacionesDelCurso.map(rot => (
                      <button key={rot} onClick={() => setRotacionActiva(rot)} className="flex items-center p-6 bg-white dark:bg-[#0f172a] rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-ufv-azul dark:hover:border-ufv-azul transition-all text-left group">
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-2xl mr-5 group-hover:bg-ufv-azul transition-colors"><Folder className="w-8 h-8 text-ufv-azul group-hover:text-white" /></div>
                        <div>
                          <h3 className="text-xl font-black text-ufv-azul-oscuro dark:text-white group-hover:text-ufv-azul">Rotación {rot}</h3>
                          <p className="text-sm font-bold text-gray-400 dark:text-gray-500 mt-1">{alumnosPorEvaluacion.filter(a => a.curso === cursoActivo && a.numero_rotacion === rot).length} alumnos</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : !especialidadActiva ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {especialidadesDeLaRotacion.map(esp => (
                      <button key={esp} onClick={() => setEspecialidadActiva(esp)} className="flex items-center p-6 bg-white dark:bg-[#0f172a] rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-ufv-azul dark:hover:border-ufv-azul transition-all text-left group">
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-2xl mr-5 group-hover:bg-ufv-azul transition-colors"><Briefcase className="w-8 h-8 text-ufv-azul group-hover:text-white" /></div>
                        <div>
                          <h3 className="text-lg font-black text-ufv-azul-oscuro dark:text-white group-hover:text-ufv-azul truncate max-w-[200px]">{esp}</h3>
                          <p className="text-sm font-bold text-gray-400 dark:text-gray-500 mt-1">{alumnosPorEvaluacion.filter(a => a.curso === cursoActivo && a.numero_rotacion === rotacionActiva && a.especialidad === esp).length} alumnos</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {alumnosAMostrar.map(item => <TarjetaAlumno key={item.rotacion_id} item={item} />)}
                  </div>
                )}
              </>
            )}
          </main>
        )}
      </div>

      <ModalRubrica
        isOpen={isRubricaOpen}
        onClose={() => setIsRubricaOpen(false)}
        especialidadNombre={rubricaActual.nombre}
        moldeEspecialidad={rubricaActual.molde}
        especialidadesDisponibles={especialidadesDisponibles}
        especialidadInicial={alumnoParaRubrica?.especialidad || especialidadesDisponibles[0]?.nombre}
      />

      {/* MODAL CAMBIO PASSWORD */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="px-6 pt-6 pb-5 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-black text-ufv-azul-oscuro dark:text-white">Cambiar contraseña</h3>
              <button onClick={() => setShowPassModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCambiarPassword} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Contraseña Actual</label>
                <input type="password" required className="w-full p-3 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul text-sm font-medium text-gray-700 dark:text-gray-300 transition-all" value={passFormData.actual} onChange={e => setPassFormData({ ...passFormData, actual: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Nueva Contraseña</label>
                <input type="password" required className="w-full p-3 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul text-sm font-medium text-gray-700 dark:text-gray-300 transition-all" value={passFormData.nueva} onChange={e => setPassFormData({ ...passFormData, nueva: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Confirmar Nueva Contraseña</label>
                <input type="password" required className="w-full p-3 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul text-sm font-medium text-gray-700 dark:text-gray-300 transition-all" value={passFormData.confirmar} onChange={e => setPassFormData({ ...passFormData, confirmar: e.target.value })} />
              </div>
              {passStatus.msg && <div className={`p-4 rounded-xl text-sm font-bold ${passStatus.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{passStatus.msg}</div>}
              <button type="submit" className="w-full py-2.5 bg-ufv-azul text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-ufv-azul-oscuro transition-all shadow-sm text-sm">Actualizar Contraseña</button>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Cerrar sesión"
        message="¿Estás seguro de que quieres cerrar sesión? Tendrás que iniciar sesión de nuevo para continuar."
        confirmLabel="Cerrar sesión"
        variant="warning"
        onConfirm={() => {
          doLogout();
          setShowLogoutConfirm(false);
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* MODAL INFORME Y EXPORTACIÓN */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="px-6 pt-6 pb-5 flex justify-between items-center border-b border-gray-100 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-50 dark:bg-emerald-900/30 p-1.5 rounded-lg"><BookOpen className="w-4 h-4 text-emerald-600" /></div>
                <h3 className="text-lg font-black text-ufv-azul-oscuro dark:text-white">Informe de calificaciones</h3>
              </div>
              <button onClick={() => setShowExportModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col lg:flex-row gap-8">
              {/* PANEL DE FILTROS LATERAL */}
              <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-2">Filtra la tabla en tiempo real antes de descargar.</p>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Curso</label>
                  <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 cursor-pointer text-sm font-bold text-gray-700" value={exportCurso} onChange={e => setExportCurso(e.target.value)}>
                    <option value="">Todos los cursos</option>
                    {Array.from(new Set(alumnos.map(a => a.curso))).sort().map(c => <option key={c} value={c}>{c}º Curso</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Rotación</label>
                  <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 cursor-pointer text-sm font-bold text-gray-700" value={exportRotacion} onChange={e => setExportRotacion(e.target.value)}>
                    <option value="">Todas las rotaciones</option>
                    {Array.from(new Set(alumnos.map(a => a.numero_rotacion))).sort().map(r => <option key={r} value={r}>Rotación {r}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Especialidad</label>
                  <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 cursor-pointer text-sm font-bold text-gray-700" value={exportEspecialidad} onChange={e => setExportEspecialidad(e.target.value)}>
                    <option value="">Todas las especialidades</option>
                    {Array.from(new Set(alumnos.map(a => a.especialidad))).sort().map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Año Académico</label>
                  <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 cursor-pointer text-sm font-bold text-gray-700" value={exportPeriodo} onChange={e => setExportPeriodo(e.target.value)}>
                    <option value="">Todos los años</option>
                    {periodosParaExportar.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Estado</label>
                  <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 cursor-pointer text-sm font-bold text-gray-700" value={exportSoloEvaluados ? "evaluados" : "todos"} onChange={e => setExportSoloEvaluados(e.target.value === "evaluados")}>
                    <option value="todos">Todos los alumnos</option>
                    <option value="evaluados">Solo evaluados (con nota)</option>
                  </select>
                </div>

                <div className="mt-auto pt-6">
                  <button
                    onClick={() => {
                      let filtrados = alumnos;
                      if (exportCurso) filtrados = filtrados.filter(a => a.curso.toString() === exportCurso);
                      if (exportRotacion) filtrados = filtrados.filter(a => a.numero_rotacion.toString() === exportRotacion);
                      if (exportEspecialidad) filtrados = filtrados.filter(a => a.especialidad === exportEspecialidad);
                      if (exportPeriodo) filtrados = filtrados.filter(a => a.periodo_academico === exportPeriodo);
                      if (exportSoloEvaluados) filtrados = filtrados.filter(a => a.estado_evaluacion === "Completada");

                      const filas = filtrados.map(a => ({
                        'Alumno': a.nombre_completo,
                        'Email': a.email,
                        'Curso': a.curso,
                        'Rotación': a.numero_rotacion,
                        'Periodo': a.periodo_academico,
                        'Especialidad': a.especialidad,
                        'Centro de Prácticas': a.centro_practicas || '',
                        'Estado': a.estado_evaluacion,
                        'Nota Final': a.nota || 'N/A'
                      }));

                      const worksheet = XLSX.utils.json_to_sheet(filas);
                      const workbook = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(workbook, worksheet, "Alumnos");
                      XLSX.writeFile(workbook, "Informe_Calificaciones.xlsx");
                    }}
                    className="w-full bg-emerald-500 text-white py-4 rounded-xl font-black shadow-lg hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" /> Descargar .xlsx
                  </button>
                </div>
              </div>

              {/* TABLA PRINCIPAL */}
              <div className="flex-1 border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full min-h-[400px]">
                <div className="overflow-x-auto overflow-y-auto max-h-[60vh] lg:max-h-full">
                  <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                    <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="p-4 font-bold text-gray-600 border-b border-gray-200">Alumno</th>
                        <th className="p-4 font-bold text-gray-600 border-b border-gray-200">Curso / Rot.</th>
                        <th className="p-4 font-bold text-gray-600 border-b border-gray-200">Especialidad</th>
                        <th className="p-4 font-bold text-gray-600 border-b border-gray-200">Estado</th>
                        <th className="p-4 font-bold text-gray-600 border-b border-gray-200 text-center">Nota Final</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {(() => {
                        let filtrados = alumnos;
                        if (exportCurso) filtrados = filtrados.filter(a => a.curso.toString() === exportCurso);
                        if (exportRotacion) filtrados = filtrados.filter(a => a.numero_rotacion.toString() === exportRotacion);
                        if (exportEspecialidad) filtrados = filtrados.filter(a => a.especialidad === exportEspecialidad);
                        if (exportPeriodo) filtrados = filtrados.filter(a => a.periodo_academico === exportPeriodo);
                        if (exportSoloEvaluados) filtrados = filtrados.filter(a => a.estado_evaluacion === "Completada");

                        if (filtrados.length === 0) {
                          return <tr><td colSpan={5} className="p-10 text-center text-gray-500 font-medium">No hay alumnos que coincidan con estos filtros.</td></tr>;
                        }

                        return filtrados.map(a => (
                          <tr key={a.rotacion_id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4">
                              <p className="font-bold text-ufv-azul-oscuro">{a.nombre_completo}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{a.email}</p>
                            </td>
                            <td className="p-4 font-medium text-gray-700">
                              <span className="font-bold">{a.curso}º</span> - Rot. {a.numero_rotacion}
                            </td>
                            <td className="p-4 text-xs font-bold text-gray-600">
                              <span className="bg-gray-100 px-2.5 py-1 rounded-md">{a.especialidad}</span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${a.estado_evaluacion === 'Completada' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                {a.estado_evaluacion}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`font-black text-base ${a.nota ? 'text-ufv-azul' : 'text-gray-400'}`}>
                                {a.nota || '-'}
                              </span>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}