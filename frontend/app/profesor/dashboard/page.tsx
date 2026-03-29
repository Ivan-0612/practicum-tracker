"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { 
  User, 
  LogOut, 
  ChevronRight,
  ClipboardCheck,
  Mail,
  Folder,
  Search,
  Home,
  ChevronLeft
} from "lucide-react";
import { useRouter } from "next/navigation";

// Definimos los campos reales
interface AlumnoAsignado {
  rotacion_id: string;
  alumno_id: string;
  nombre_completo: string;
  email_personal: string;
  curso: number;
  grupo: string;
  numero_rotacion: number; 
  estado_evaluacion: string; // <-- NUEVO CAMPO AÑADIDO
}

export default function ProfesorDashboard() {
  const router = useRouter();
  const [alumnos, setAlumnos] = useState<AlumnoAsignado[]>([]);
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DE NAVEGACIÓN Y BÚSQUEDA ---
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("Todos"); // <-- NUEVO ESTADO
  const [cursoActivo, setCursoActivo] = useState<number | null>(null);
  const [rotacionActiva, setRotacionActiva] = useState<number | null>(null);

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

  // --- 🧠 NUEVA LÓGICA DE FILTRADO INTELIGENTE ---
  // 1. Primero filtramos TODOS los alumnos según el selector de Estado
  const alumnosPorEstado = alumnos.filter(a => filtroEstado === "Todos" || a.estado_evaluacion === filtroEstado);

  // 2. Extraemos las carpetas basándonos SOLO en los alumnos que cumplen el filtro
  const cursosDisponibles = Array.from(new Set(alumnosPorEstado.map(a => a.curso))).sort();
  const rotacionesDelCurso = cursoActivo 
    ? Array.from(new Set(alumnosPorEstado.filter(a => a.curso === cursoActivo).map(a => a.numero_rotacion))).sort()
    : [];

  // 3. Lógica final de Búsqueda y Navegación
  const isBuscando = busqueda.trim().length > 0;
  let alumnosAMostrar = alumnosPorEstado;
  
  if (isBuscando) {
    const texto = busqueda.toLowerCase();
    alumnosAMostrar = alumnosPorEstado.filter(a => 
      a.nombre_completo.toLowerCase().includes(texto) || 
      a.email_personal.toLowerCase().includes(texto)
    );
  } else if (cursoActivo && rotacionActiva) {
    alumnosAMostrar = alumnosPorEstado.filter(a => a.curso === cursoActivo && a.numero_rotacion === rotacionActiva);
  }

  // --- COMPONENTES VISUALES REUTILIZABLES ---
  const TarjetaAlumno = ({ item }: { item: AlumnoAsignado }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
      <div className="p-6 flex-grow">
        
        {/* ENCABEZADO DE LA TARJETA (AQUÍ VAN LAS PÍLDORAS) */}
        <div className="flex justify-between items-start mb-6 gap-2">
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
              {item.curso}º Curso - {item.grupo}
            </div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              Rotación {item.numero_rotacion}
            </div>
          </div>

          {/* NUEVO: ETIQUETA VISUAL DE ESTADO */}
          {item.estado_evaluacion === "Completada" ? (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 shrink-0">
              ✅ Evaluado
            </div>
          ) : (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 shrink-0">
              ⏳ Pendiente
            </div>
          )}
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-1">{item.nombre_completo}</h3>
        <div className="mt-4 space-y-3">
          <div className="flex items-center text-sm text-slate-600">
            <Mail className="w-4 h-4 mr-3 text-slate-400" />
            <span className="truncate" title={item.email_personal}>{item.email_personal}</span>
          </div>
        </div>
      </div>
      
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 mt-auto">
        <button 
          onClick={() => router.push(`/profesor/evaluar/${item.rotacion_id}`)}
          className="w-full bg-white border border-slate-200 text-slate-700 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600"
        >
          {item.estado_evaluacion === "Completada" ? "Revisar Evaluación" : "Evaluar Alumno"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
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
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Directorio de Alumnos</h1>
            <p className="text-slate-500 mt-2">Navega por las carpetas o busca un alumno directamente.</p>
          </div>
          
          {/* NUEVA BARRA DE CONTROLES: FILTRO + BUSCADOR */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            
            <select 
              value={filtroEstado} 
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                // Si cambian el filtro general, reiniciamos la navegación por seguridad
                setCursoActivo(null); 
                setRotacionActiva(null);
              }}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-3 shadow-sm font-medium outline-none"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Pendiente">⏳ Solo Pendientes</option>
              <option value="Completada">✅ Solo Evaluados</option>
            </select>

            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                placeholder="Buscar por nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : alumnos.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
            <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-700">Sin alumnos actualmente</h2>
            <p className="text-slate-500 mt-2">No tienes alumnos asignados en este momento.</p>
          </div>
        ) : (
          <>
            {/* MIGA DE PAN (BREADCRUMBS) */}
            {!isBuscando && (
              <div className="flex items-center text-sm text-slate-500 mb-6 bg-white p-3 rounded-xl border border-slate-200 shadow-sm inline-flex">
                <button 
                  onClick={() => { setCursoActivo(null); setRotacionActiva(null); }}
                  className={`flex items-center gap-1 hover:text-indigo-600 transition-colors ${!cursoActivo ? "font-bold text-indigo-700" : ""}`}
                >
                  <Home className="w-4 h-4" /> Inicio
                </button>
                
                {cursoActivo && (
                  <>
                    <ChevronRight className="w-4 h-4 mx-2 text-slate-300" />
                    <button 
                      onClick={() => setRotacionActiva(null)}
                      className={`hover:text-indigo-600 transition-colors ${!rotacionActiva ? "font-bold text-indigo-700" : ""}`}
                    >
                      {cursoActivo}º Curso
                    </button>
                  </>
                )}

                {rotacionActiva && (
                  <>
                    <ChevronRight className="w-4 h-4 mx-2 text-slate-300" />
                    <span className="font-bold text-indigo-700">Rotación {rotacionActiva}</span>
                  </>
                )}
              </div>
            )}

            {/* VISTA 1: BUSCADOR ACTIVO */}
            {isBuscando ? (
              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-4">Resultados de búsqueda ({alumnosAMostrar.length})</h3>
                {alumnosAMostrar.length === 0 ? (
                  <div className="text-center p-10 bg-white rounded-2xl border border-slate-200">
                    <p className="text-slate-500">No se encontraron alumnos que coincidan.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {alumnosAMostrar.map(item => <TarjetaAlumno key={item.alumno_id} item={item} />)}
                  </div>
                )}
              </div>
            ) : 

            /* VISTA 2: CARPETAS DE CURSOS (NIVEL 1) */
            !cursoActivo ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {cursosDisponibles.length === 0 ? (
                  <p className="col-span-full text-center text-slate-500 py-10">No hay alumnos en este estado.</p>
                ) : cursosDisponibles.map(curso => (
                  <button 
                    key={curso}
                    onClick={() => setCursoActivo(curso)}
                    className="flex items-center p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left group"
                  >
                    <div className="bg-indigo-50 p-4 rounded-xl mr-4 group-hover:bg-indigo-100 transition-colors">
                      <Folder className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{curso}º Curso</h3>
                      <p className="text-sm text-slate-500">{alumnosPorEstado.filter(a => a.curso === curso).length} alumnos</p>
                    </div>
                  </button>
                ))}
              </div>
            ) :

            /* VISTA 3: CARPETAS DE ROTACIONES (NIVEL 2) */
            !rotacionActiva ? (
              <div>
                <button 
                  onClick={() => setCursoActivo(null)}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-4 font-medium"
                >
                  <ChevronLeft className="w-4 h-4" /> Volver a cursos
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rotacionesDelCurso.map(rot => (
                    <button 
                      key={rot}
                      onClick={() => setRotacionActiva(rot)}
                      className="flex items-center p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all text-left group"
                    >
                      <div className="bg-amber-50 p-4 rounded-xl mr-4 group-hover:bg-amber-100 transition-colors">
                        <Folder className="w-8 h-8 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 group-hover:text-amber-700 transition-colors">Rotación {rot}</h3>
                        <p className="text-sm text-slate-500">
                          {alumnosPorEstado.filter(a => a.curso === cursoActivo && a.numero_rotacion === rot).length} alumnos
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : 

            /* VISTA 4: LISTA DE ALUMNOS FINAL (NIVEL 3) */
            (
              <div>
                <button 
                  onClick={() => setRotacionActiva(null)}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-6 font-medium"
                >
                  <ChevronLeft className="w-4 h-4" /> Volver a rotaciones
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {alumnosAMostrar.map(item => <TarjetaAlumno key={item.alumno_id} item={item} />)}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}