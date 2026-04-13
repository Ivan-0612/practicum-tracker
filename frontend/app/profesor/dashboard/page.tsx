"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { 
  User, LogOut, ChevronRight, Mail, Folder, Search, Home, 
  ChevronLeft, Lock, X, Briefcase, Eye, PenTool, 
  CheckCircle2, Calendar, BookOpen 
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ModalRubrica from "@/components/ModalRubrica";

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
}

interface EspecialidadDisponible {
  nombre: string;
  especialidadId?: string;
  rotacionId?: string;
}

export default function ProfesorDashboard() {
  const router = useRouter();
  const [alumnos, setAlumnos] = useState<AlumnoAsignado[]>([]);
  const [loading, setLoading] = useState(true);

  // Lógica de memoria de navegación
  const [isInitialized, setIsInitialized] = useState(false);

  // Estados de filtros y navegación
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("Todos");
  
  const [cursoActivo, setCursoActivo] = useState<number | null>(null);
  const [rotacionActiva, setRotacionActiva] = useState<number | null>(null);
  const [especialidadActiva, setEspecialidadActiva] = useState<string | null>(null);

  const [showPassModal, setShowPassModal] = useState(false);
  const [passFormData, setPassFormData] = useState({ actual: "", nueva: "", confirmar: "" });
  const [passStatus, setPassStatus] = useState({ type: "", msg: "" });
  const [isRubricaOpen, setIsRubricaOpen] = useState(false);
  const [rubricaActual, setRubricaActual] = useState({ nombre: "", molde: null });
  const [especialidadesSistema, setEspecialidadesSistema] = useState<EspecialidadDisponible[]>([]);

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
        especialidadActiva
      }));
    }
  }, [isInitialized, filtroPeriodo, filtroEstado, busqueda, cursoActivo, rotacionActiva, especialidadActiva]);

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
        alert("No se pudo cargar el manual de esta especialidad.");
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

  const cursosDisponibles = Array.from(new Set(alumnosPorEstadoYPeriodo.map(a => a.curso))).sort();
  const rotacionesDelCurso = cursoActivo ? Array.from(new Set(alumnosPorEstadoYPeriodo.filter(a => a.curso === cursoActivo).map(a => a.numero_rotacion))).sort() : [];
  const especialidadesDeLaRotacion = (cursoActivo && rotacionActiva) ? Array.from(new Set(alumnosPorEstadoYPeriodo.filter(a => a.curso === cursoActivo && a.numero_rotacion === rotacionActiva).map(a => a.especialidad))).sort() : [];
  const especialidadesDesdeAlumnos = Array.from(
    new Map(
      alumnosPorEstadoYPeriodo.map((a) => [a.especialidad, { nombre: a.especialidad, rotacionId: a.rotacion_id }])
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const especialidadesDisponibles = especialidadesSistema.length > 0 ? especialidadesSistema : especialidadesDesdeAlumnos;
  const puedeAbrirRubrica = especialidadesDisponibles.length > 0;

  const isBuscando = busqueda.trim().length > 0;
  let alumnosAMostrar = alumnosPorEstadoYPeriodo;
  
  if (isBuscando) {
    const texto = busqueda.toLowerCase();
    alumnosAMostrar = alumnosPorEstadoYPeriodo.filter(a => a.nombre_completo.toLowerCase().includes(texto) || a.email.toLowerCase().includes(texto));
  } else if (cursoActivo && rotacionActiva && especialidadActiva) {
    alumnosAMostrar = alumnosPorEstadoYPeriodo.filter(a => a.curso === cursoActivo && a.numero_rotacion === rotacionActiva && a.especialidad === especialidadActiva);
  }

  const alumnoParaRubrica = !isBuscando && cursoActivo && rotacionActiva && especialidadActiva
    ? alumnosAMostrar[0] || null
    : null;

  // Componente de Tarjeta de Alumno
  const TarjetaAlumno = ({ item }: { item: AlumnoAsignado }) => (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 border-t-4 border-t-ufv-azul overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col">
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
        
        <div className="mt-4 space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
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

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 mt-auto flex flex-col gap-2">
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto pb-20">
        
        {/* CABECERA PRINCIPAL */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-gray-200 pb-8">
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

                <button onClick={() => setShowPassModal(true)} className="w-full sm:w-auto whitespace-nowrap flex items-center justify-center gap-2 bg-white text-ufv-azul px-4 py-2.5 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition-all shadow-sm active:scale-95"><Lock className="w-4 h-4"/> Cambiar Contraseña</button>
                <button onClick={handleLogout} className="w-full sm:w-auto whitespace-nowrap flex items-center justify-center gap-2 bg-white text-red-600 px-4 py-2.5 rounded-xl font-bold border border-red-200 hover:bg-red-50 transition-all shadow-sm active:scale-95"><LogOut className="w-4 h-4" /> Cerrar Sesión</button>
            </div>
        </div>

        <main>
          {/* BARRA DE FILTROS */}
          <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-extrabold text-ufv-azul-oscuro">Directorio de Alumnos</h2>
              <p className="text-gray-500 mt-1 font-medium">Navega por las carpetas o busca un alumno directamente.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              
              <div className="relative w-full sm:w-52">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Calendar className="h-4 w-4 text-gray-400" /></div>
                <select 
                  value={filtroPeriodo} 
                  onChange={(e) => { setFiltroPeriodo(e.target.value); setCursoActivo(null); setRotacionActiva(null); setEspecialidadActiva(null); }}
                  className="block w-full pl-11 pr-8 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl focus:ring-2 focus:ring-ufv-azul outline-none font-bold appearance-none cursor-pointer"
                >
                  <option value="Todos">Todos los años</option>
                  {periodosDisponibles.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <select 
                value={filtroEstado} 
                onChange={(e) => { setFiltroEstado(e.target.value); setCursoActivo(null); setRotacionActiva(null); setEspecialidadActiva(null); }}
                className="bg-white border border-gray-200 text-gray-700 rounded-xl p-3.5 shadow-sm font-bold outline-none cursor-pointer"
              >
                <option value="Todos">Todos los estados</option>
                <option value="Pendiente">⏳ Pendientes</option>
                <option value="En Proceso">📝 Borradores</option>
                <option value="Pendiente Confirmación Final">⚠️ Cierre 1/2</option>
                <option value="Completada">✅ Evaluados</option>
              </select>

              <div className="relative w-full sm:w-72">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
                <input type="text" className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-ufv-azul outline-none shadow-sm font-medium" placeholder="Buscar alumno..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </div>
            </div>
          </header>

          {loading ? (
            <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ufv-azul"></div></div>
          ) : alumnos.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2rem] p-16 text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700">Sin alumnos</h3>
              <p className="text-gray-500 mt-2 font-medium">No tienes alumnos asignados para los filtros seleccionados.</p>
            </div>
          ) : (
            <>
              {/* BREADCRUMBS */}
              {!isBuscando && (
                <div className="flex flex-wrap items-center text-sm text-gray-500 mb-6 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm font-medium w-fit">
                  <button onClick={() => { setCursoActivo(null); setRotacionActiva(null); setEspecialidadActiva(null); }} className={`flex items-center gap-1.5 hover:text-ufv-azul px-2 ${!cursoActivo ? "font-bold text-ufv-azul" : ""}`}><Home className="w-4 h-4" /> Inicio</button>
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
              ) : !cursoActivo ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cursosDisponibles.map(curso => (
                    <button key={curso} onClick={() => setCursoActivo(curso)} className="flex items-center p-6 bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-ufv-azul transition-all text-left group">
                      <div className="bg-blue-50 p-4 rounded-2xl mr-5 group-hover:bg-ufv-azul transition-colors"><Folder className="w-8 h-8 text-ufv-azul group-hover:text-white" /></div>
                      <div>
                        <h3 className="text-xl font-black text-ufv-azul-oscuro group-hover:text-ufv-azul">{curso}º Curso</h3>
                        <p className="text-sm font-bold text-gray-500 mt-1">{alumnosPorEstadoYPeriodo.filter(a => a.curso === curso).length} alumnos</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : !rotacionActiva ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rotacionesDelCurso.map(rot => (
                    <button key={rot} onClick={() => setRotacionActiva(rot)} className="flex items-center p-6 bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-ufv-azul transition-all text-left group">
                      <div className="bg-blue-50 p-4 rounded-2xl mr-5 group-hover:bg-ufv-azul transition-colors"><Folder className="w-8 h-8 text-ufv-azul group-hover:text-white" /></div>
                      <div>
                        <h3 className="text-xl font-black text-ufv-azul-oscuro group-hover:text-ufv-azul">Rotación {rot}</h3>
                        <p className="text-sm font-bold text-gray-500 mt-1">{alumnosPorEstadoYPeriodo.filter(a => a.curso === cursoActivo && a.numero_rotacion === rot).length} alumnos</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : !especialidadActiva ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {especialidadesDeLaRotacion.map(esp => (
                    <button key={esp} onClick={() => setEspecialidadActiva(esp)} className="flex items-center p-6 bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-ufv-azul transition-all text-left group">
                      <div className="bg-blue-50 p-4 rounded-2xl mr-5 group-hover:bg-ufv-azul transition-colors"><Briefcase className="w-8 h-8 text-ufv-azul group-hover:text-white" /></div>
                      <div>
                        <h3 className="text-lg font-black text-ufv-azul-oscuro group-hover:text-ufv-azul truncate max-w-[200px]">{esp}</h3>
                        <p className="text-sm font-bold text-gray-500 mt-1">{alumnosPorEstadoYPeriodo.filter(a => a.curso === cursoActivo && a.numero_rotacion === rotacionActiva && a.especialidad === esp).length} alumnos</p>
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
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border-t-4 border-ufv-azul">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-black text-ufv-azul-oscuro">Cambiar Contraseña</h3>
              <button onClick={() => setShowPassModal(false)} className="p-2 text-gray-400 hover:text-gray-600 bg-white border border-gray-200 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCambiarPassword} className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Contraseña Actual</label>
                <input type="password" required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-ufv-azul" value={passFormData.actual} onChange={e => setPassFormData({...passFormData, actual: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Nueva Contraseña</label>
                <input type="password" required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-ufv-azul" value={passFormData.nueva} onChange={e => setPassFormData({...passFormData, nueva: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Confirmar Nueva Contraseña</label>
                <input type="password" required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-ufv-azul" value={passFormData.confirmar} onChange={e => setPassFormData({...passFormData, confirmar: e.target.value})} />
              </div>
              {passStatus.msg && <div className={`p-4 rounded-xl text-sm font-bold ${passStatus.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{passStatus.msg}</div>}
              <button type="submit" className="w-full bg-ufv-azul text-white py-4 rounded-xl font-black shadow-lg hover:bg-ufv-azul-oscuro active:scale-95 transition-all">Actualizar Contraseña</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}