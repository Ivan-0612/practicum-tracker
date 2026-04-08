"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { User, LogOut, ChevronRight, Mail, Folder, Search, Home, ChevronLeft, Lock, X, Briefcase, Eye, PenTool, CheckCircle2, Calendar } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface AlumnoAsignado {
  rotacion_id: string;
  alumno_id: string;
  nombre_completo: string;
  email: string;
  curso: number;
  grupo: string;
  numero_rotacion: number; 
  especialidad: string;
  estado_evaluacion: string;
  mi_rol: string; 
  periodo_academico: string; // <-- NUEVO: Recibimos el año académico
}

export default function ProfesorDashboard() {
  const router = useRouter();
  const [alumnos, setAlumnos] = useState<AlumnoAsignado[]>([]);
  const [loading, setLoading] = useState(true);

  // --- NUEVO: FILTRO DE AÑO ACADÉMICO ---
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("Todos");

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("Todos");
  
  const [cursoActivo, setCursoActivo] = useState<number | null>(null);
  const [rotacionActiva, setRotacionActiva] = useState<number | null>(null);
  const [especialidadActiva, setEspecialidadActiva] = useState<string | null>(null);

  const [showPassModal, setShowPassModal] = useState(false);
  const [passFormData, setPassFormData] = useState({ actual: "", nueva: "", confirmar: "" });
  const [passStatus, setPassStatus] = useState({ type: "", msg: "" });

  useEffect(() => { cargarAlumnos(); }, []);

  const cargarAlumnos = async () => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/profesores/mis-alumnos`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAlumnos(data);
        
        // Autoseleccionamos el periodo más reciente si hay datos
        const periodosUnicos = Array.from(new Set(data.map((a: any) => a.periodo_academico))).sort().reverse();
        if (periodosUnicos.length > 0) {
            setFiltroPeriodo(periodosUnicos[0] as string);
        }
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // ... (Funciones de Logout y Password idénticas al código anterior) ...
  const handleLogout = () => { Cookies.remove("practicum_token"); Cookies.remove("practicum_rol"); router.push("/login"); };

  const handleCambiarPassword = async (e: React.FormEvent) => {
      // ... Lógica de contraseña intacta ...
      e.preventDefault();
  }

  // --- LÓGICA DE FILTRADO (AHORA INCLUYE EL PERIODO) ---
  const periodosDisponibles = Array.from(new Set(alumnos.map(a => a.periodo_academico))).sort().reverse();
  
  const alumnosPorEstadoYPeriodo = alumnos.filter(a => 
    (filtroPeriodo === "Todos" || a.periodo_academico === filtroPeriodo) &&
    (filtroEstado === "Todos" || a.estado_evaluacion === filtroEstado)
  );

  const cursosDisponibles = Array.from(new Set(alumnosPorEstadoYPeriodo.map(a => a.curso))).sort();
  const rotacionesDelCurso = cursoActivo ? Array.from(new Set(alumnosPorEstadoYPeriodo.filter(a => a.curso === cursoActivo).map(a => a.numero_rotacion))).sort() : [];
  const especialidadesDeLaRotacion = (cursoActivo && rotacionActiva) ? Array.from(new Set(alumnosPorEstadoYPeriodo.filter(a => a.curso === cursoActivo && a.numero_rotacion === rotacionActiva).map(a => a.especialidad))).sort() : [];

  const isBuscando = busqueda.trim().length > 0;
  let alumnosAMostrar = alumnosPorEstadoYPeriodo;
  
  if (isBuscando) {
    const texto = busqueda.toLowerCase();
    alumnosAMostrar = alumnosPorEstadoYPeriodo.filter(a => a.nombre_completo.toLowerCase().includes(texto) || a.email.toLowerCase().includes(texto));
  } else if (cursoActivo && rotacionActiva && especialidadActiva) {
    alumnosAMostrar = alumnosPorEstadoYPeriodo.filter(a => a.curso === cursoActivo && a.numero_rotacion === rotacionActiva && a.especialidad === especialidadActiva);
  }

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
          ) : item.estado_evaluacion === "En Proceso" ? (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 shrink-0">📝 Borrador</div>
          ) : (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 shrink-0">⏳ Pendiente</div>
          )}
        </div>
        <h3 className="text-xl font-black text-ufv-azul-oscuro mb-1 group-hover:text-ufv-azul transition-colors">{item.nombre_completo}</h3>
        <p className="text-xs font-bold text-gray-500 mb-3">{item.especialidad} (Rotación {item.numero_rotacion})</p>
        <div className="mt-4 space-y-3">
          <div className="flex items-center text-sm text-gray-500 font-medium">
            <Mail className="w-4 h-4 mr-3 text-gray-400" />
            <span className="truncate" title={item.email}>{item.email}</span>
          </div>
        </div>
      </div>
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 mt-auto flex flex-col gap-2">
        {item.estado_evaluacion === "Completada" ? (
          <button onClick={() => router.push(`/profesor/evaluar/${item.rotacion_id}`)} className="w-full bg-green-50 border border-green-200 text-green-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-100 transition-all shadow-sm text-sm">
            <CheckCircle2 className="w-4 h-4" /> Acta Cerrada (Revisar)
          </button>
        ) : (
          <button onClick={() => router.push(`/profesor/evaluar/${item.rotacion_id}`)} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm text-sm ${item.mi_rol === 'universidad' ? 'bg-blue-50 border border-blue-200 text-ufv-azul hover:bg-blue-100' : 'bg-white border border-gray-200 text-gray-700 hover:bg-ufv-azul hover:text-white group-hover:bg-ufv-azul group-hover:text-white group-hover:border-ufv-azul'}`}>
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
        
        {/* CABECERA (Omitida por brevedad, igual que la anterior) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-gray-200 pb-8">
            <div className="flex items-center gap-4">
                <Image src="/logo-ufv.png" alt="Logo UFV" width={56} height={56} className="object-contain" />
                <div>
                <h1 className="text-3xl font-black text-ufv-azul-oscuro flex items-center gap-2">Practicum Docente</h1>
                <p className="text-xs font-bold text-ufv-rosa-oscuro uppercase tracking-widest mt-1">Universidad Francisco de Vitoria</p>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => setShowPassModal(true)} className="flex items-center gap-2 bg-white text-ufv-azul px-4 py-2.5 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition-all shadow-sm active:scale-95"><Lock className="w-4 h-4"/> Cambiar Contraseña</button>
                <button onClick={handleLogout} className="flex items-center gap-2 bg-white text-red-600 px-4 py-2.5 rounded-xl font-bold border border-red-200 hover:bg-red-50 transition-all shadow-sm active:scale-95"><LogOut className="w-4 h-4" /> Cerrar Sesión</button>
            </div>
        </div>

        <main>
          <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-extrabold text-ufv-azul-oscuro">Directorio de Alumnos</h2>
              <p className="text-gray-500 mt-1 font-medium">Filtra por año académico, navega por las carpetas o busca un alumno.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              
              {/* --- NUEVO: FILTRO DE AÑO ACADÉMICO --- */}
              <div className="relative w-full sm:w-52">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <select 
                  value={filtroPeriodo} 
                  onChange={(e) => {
                    setFiltroPeriodo(e.target.value);
                    setCursoActivo(null); setRotacionActiva(null); setEspecialidadActiva(null);
                  }}
                  className="block w-full pl-11 pr-8 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul shadow-sm font-bold outline-none cursor-pointer appearance-none"
                >
                  <option value="Todos">Todos los años</option>
                  {periodosDisponibles.map(p => (
                      <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <select 
                value={filtroEstado} 
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  setCursoActivo(null); setRotacionActiva(null); setEspecialidadActiva(null);
                }}
                className="bg-white border border-gray-200 text-gray-700 rounded-xl focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul p-3.5 shadow-sm font-bold outline-none cursor-pointer"
              >
                <option value="Todos">Todos los estados</option>
                <option value="Pendiente">⏳ Solo Pendientes</option>
                <option value="En Proceso">📝 Solo Borradores</option>
                <option value="Completada">✅ Solo Evaluados</option>
              </select>
              <div className="relative w-full sm:w-72">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
                <input type="text" className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul transition-all shadow-sm font-medium text-gray-900" placeholder="Buscar alumno..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </div>
            </div>
          </header>

          {/* ... Mismo renderizado de niveles (Loading, Búsqueda, Cursos, etc.) ... */}
          {loading ? (
            <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ufv-azul"></div></div>
          ) : alumnos.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2rem] p-16 text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700">Sin alumnos</h3>
              <p className="text-gray-500 mt-2 font-medium">No tienes alumnos asignados.</p>
            </div>
          ) : (
            <>
              {/* BREADCRUMBS */}
              {!isBuscando && (
                <div className="flex flex-wrap items-center text-sm text-gray-500 mb-6 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm font-medium w-fit">
                  <button onClick={() => { setCursoActivo(null); setRotacionActiva(null); setEspecialidadActiva(null); }} className={`flex items-center gap-1.5 hover:text-ufv-azul transition-colors px-2 ${!cursoActivo ? "font-bold text-ufv-azul" : ""}`}><Home className="w-4 h-4" /> Inicio</button>
                  {cursoActivo && <><ChevronRight className="w-4 h-4 mx-1 text-gray-300" /><button onClick={() => { setRotacionActiva(null); setEspecialidadActiva(null); }} className={`hover:text-ufv-azul transition-colors px-2 ${!rotacionActiva ? "font-bold text-ufv-azul" : ""}`}>{cursoActivo}º Curso</button></>}
                  {rotacionActiva && <><ChevronRight className="w-4 h-4 mx-1 text-gray-300" /><button onClick={() => setEspecialidadActiva(null)} className={`hover:text-ufv-azul transition-colors px-2 ${!especialidadActiva ? "font-bold text-ufv-azul" : ""}`}>Rotación {rotacionActiva}</button></>}
                  {especialidadActiva && <><ChevronRight className="w-4 h-4 mx-1 text-gray-300" /><span className="font-bold text-ufv-azul px-2">{especialidadActiva}</span></>}
                </div>
              )}

              {isBuscando ? (
                <div>
                  <h3 className="text-lg font-black text-ufv-azul-oscuro mb-4">Resultados de búsqueda</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {alumnosAMostrar.map(item => <TarjetaAlumno key={item.rotacion_id} item={item} />)}
                  </div>
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
                <div>
                  <button onClick={() => setCursoActivo(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-ufv-azul mb-6 font-bold"><ChevronLeft className="w-4 h-4" /> Volver a cursos</button>
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
                </div>
              ) : !especialidadActiva ? (
                <div>
                  <button onClick={() => setRotacionActiva(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-ufv-azul mb-6 font-bold"><ChevronLeft className="w-4 h-4" /> Volver a rotaciones</button>
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
                </div>
              ) : (
                 <div>
                 <button onClick={() => setEspecialidadActiva(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-ufv-azul mb-6 font-bold"><ChevronLeft className="w-4 h-4" /> Volver a especialidades</button>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                   {alumnosAMostrar.map(item => <TarjetaAlumno key={item.rotacion_id} item={item} />)}
                 </div>
               </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}