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
  ChevronLeft,
  Lock,
  X
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Definimos los campos reales
interface AlumnoAsignado {
  rotacion_id: string;
  alumno_id: string;
  nombre_completo: string;
  email: string;
  curso: number;
  grupo: string;
  numero_rotacion: number; 
  estado_evaluacion: string;
}

export default function ProfesorDashboard() {
  const router = useRouter();
  const [alumnos, setAlumnos] = useState<AlumnoAsignado[]>([]);
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DE NAVEGACIÓN Y BÚSQUEDA ---
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("Todos");
  const [cursoActivo, setCursoActivo] = useState<number | null>(null);
  const [rotacionActiva, setRotacionActiva] = useState<number | null>(null);

  // --- ESTADOS PARA CAMBIO DE CONTRASEÑA ---
  const [showPassModal, setShowPassModal] = useState(false);
  const [passFormData, setPassFormData] = useState({ actual: "", nueva: "", confirmar: "" });
  const [passStatus, setPassStatus] = useState({ type: "", msg: "" });

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

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassStatus({ type: "info", msg: "Actualizando..." });

    if (passFormData.nueva !== passFormData.confirmar) {
      setPassStatus({ type: "error", msg: "Las contraseñas nuevas no coinciden." });
      return;
    }

    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch("http://127.0.0.1:8000/api/v1/auth/cambiar-password", {
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
        setPassStatus({ type: "error", msg: data.detail || "Error al cambiar la contraseña." });
      }
    } catch (error) {
      setPassStatus({ type: "error", msg: "Error de conexión." });
    }
  };

  // --- LÓGICA DE FILTRADO INTELIGENTE ---
  const alumnosPorEstado = alumnos.filter(a => filtroEstado === "Todos" || a.estado_evaluacion === filtroEstado);

  const cursosDisponibles = Array.from(new Set(alumnosPorEstado.map(a => a.curso))).sort();
  const rotacionesDelCurso = cursoActivo 
    ? Array.from(new Set(alumnosPorEstado.filter(a => a.curso === cursoActivo).map(a => a.numero_rotacion))).sort()
    : [];

  const isBuscando = busqueda.trim().length > 0;
  let alumnosAMostrar = alumnosPorEstado;
  
  if (isBuscando) {
    const texto = busqueda.toLowerCase();
    alumnosAMostrar = alumnosPorEstado.filter(a => 
      a.nombre_completo.toLowerCase().includes(texto) || 
      a.email.toLowerCase().includes(texto)
    );
  } else if (cursoActivo && rotacionActiva) {
    alumnosAMostrar = alumnosPorEstado.filter(a => a.curso === cursoActivo && a.numero_rotacion === rotacionActiva);
  }

  // --- COMPONENTES VISUALES REUTILIZABLES ---
  const TarjetaAlumno = ({ item }: { item: AlumnoAsignado }) => (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 border-t-4 border-t-ufv-azul overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col">
      <div className="p-6 flex-grow">
        <div className="flex justify-between items-start mb-6 gap-2">
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-ufv-azul">
              {item.curso}º Curso - {item.grupo}
            </div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
              Rotación {item.numero_rotacion}
            </div>
          </div>
          {item.estado_evaluacion === "Completada" ? (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 shrink-0">
              ✅ Evaluado
            </div>
          ) : item.estado_evaluacion === "En Proceso" ? (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 shrink-0">
              📝 Borrador
            </div>
          ) : (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 shrink-0">
              ⏳ Pendiente
            </div>
          )}
        </div>
        <h3 className="text-xl font-black text-ufv-azul-oscuro mb-1 group-hover:text-ufv-azul transition-colors">{item.nombre_completo}</h3>
        <div className="mt-4 space-y-3">
          <div className="flex items-center text-sm text-gray-500 font-medium">
            <Mail className="w-4 h-4 mr-3 text-gray-400" />
            <span className="truncate" title={item.email}>{item.email}</span>
          </div>
        </div>
      </div>
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 mt-auto flex flex-col gap-2">
        <button 
          onClick={() => router.push(`/profesor/evaluar/${item.rotacion_id}`)}
          className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-ufv-azul hover:text-white transition-all group-hover:bg-ufv-azul group-hover:text-white group-hover:border-ufv-azul shadow-sm"
        >
          {item.estado_evaluacion === "Completada" ? "Revisar Evaluación" : "Evaluar Alumno"}
          <ChevronRight className="w-4 h-4" />
        </button>
        <button 
          onClick={() => router.push(`/profesor/asistencia/${item.rotacion_id}`)}
          className="w-full bg-transparent text-gray-500 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all border border-transparent"
        >
          Ver Asistencia
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto pb-20">
        
        {/* CABECERA CORPORATIVA Y ACCIONES */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-gray-200 pb-8">
          <div className="flex items-center gap-4">
            <Image 
              src="/logo-ufv.png" 
              alt="Logo UFV" 
              width={56} 
              height={56} 
              className="object-contain" 
            />
            <div>
              <h1 className="text-3xl font-black text-ufv-azul-oscuro flex items-center gap-2">
                Practicum Docente
              </h1>
              <p className="text-xs font-bold text-ufv-rosa-oscuro uppercase tracking-widest mt-1">
                Universidad Francisco de Vitoria
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setShowPassModal(true)}
              className="flex items-center gap-2 bg-white text-ufv-azul px-4 py-2.5 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
            >
              <Lock className="w-4 h-4"/> Cambiar Contraseña
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white text-red-600 px-4 py-2.5 rounded-xl font-bold border border-red-200 hover:bg-red-50 transition-all shadow-sm active:scale-95"
            >
              <LogOut className="w-4 h-4" /> Cerrar Sesión
            </button>
          </div>
        </div>

        <main>
          <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-extrabold text-ufv-azul-oscuro">Directorio de Alumnos</h2>
              <p className="text-gray-500 mt-1 font-medium">Navega por las carpetas o busca un alumno directamente.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <select 
                value={filtroEstado} 
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  setCursoActivo(null); 
                  setRotacionActiva(null);
                }}
                className="bg-white border border-gray-200 text-gray-700 rounded-xl focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul p-3.5 shadow-sm font-bold outline-none cursor-pointer"
              >
                <option value="Todos">Todos los estados</option>
                <option value="Pendiente">⏳ Solo Pendientes</option>
                <option value="En Proceso">📝 Solo Borradores</option>
                <option value="Completada">✅ Solo Evaluados</option>
              </select>
              <div className="relative w-full sm:w-72">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul transition-all shadow-sm font-medium text-gray-900"
                  placeholder="Buscar alumno..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>
          </header>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ufv-azul"></div>
            </div>
          ) : alumnos.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2rem] p-16 text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700">Sin alumnos actualmente</h3>
              <p className="text-gray-500 mt-2 font-medium">No tienes alumnos asignados en este momento.</p>
            </div>
          ) : (
            <>
              {!isBuscando && (
                <div className="flex items-center text-sm text-gray-500 mb-6 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm inline-flex font-medium">
                  <button 
                    onClick={() => { setCursoActivo(null); setRotacionActiva(null); }}
                    className={`flex items-center gap-1.5 hover:text-ufv-azul transition-colors px-2 ${!cursoActivo ? "font-bold text-ufv-azul" : ""}`}
                  >
                    <Home className="w-4 h-4" /> Inicio
                  </button>
                  {cursoActivo && (
                    <>
                      <ChevronRight className="w-4 h-4 mx-1 text-gray-300" />
                      <button 
                        onClick={() => setRotacionActiva(null)}
                        className={`hover:text-ufv-azul transition-colors px-2 ${!rotacionActiva ? "font-bold text-ufv-azul" : ""}`}
                      >
                        {cursoActivo}º Curso
                      </button>
                    </>
                  )}
                  {rotacionActiva && (
                    <>
                      <ChevronRight className="w-4 h-4 mx-1 text-gray-300" />
                      <span className="font-bold text-ufv-azul px-2">Rotación {rotacionActiva}</span>
                    </>
                  )}
                </div>
              )}

              {isBuscando ? (
                <div>
                  <h3 className="text-lg font-black text-ufv-azul-oscuro mb-4">Resultados de búsqueda ({alumnosAMostrar.length})</h3>
                  {alumnosAMostrar.length === 0 ? (
                    <div className="text-center p-10 bg-white rounded-3xl border border-gray-200 shadow-sm">
                      <p className="text-gray-500 font-medium">No se encontraron alumnos que coincidan.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {alumnosAMostrar.map(item => <TarjetaAlumno key={item.rotacion_id} item={item} />)}
                    </div>
                  )}
                </div>
              ) : !cursoActivo ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cursosDisponibles.length === 0 ? (
                    <p className="col-span-full text-center text-gray-500 py-10 font-medium">No hay alumnos en este estado.</p>
                  ) : cursosDisponibles.map(curso => (
                    <button 
                      key={curso}
                      onClick={() => setCursoActivo(curso)}
                      className="flex items-center p-6 bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-ufv-azul transition-all text-left group"
                    >
                      <div className="bg-blue-50 p-4 rounded-2xl mr-5 group-hover:bg-ufv-azul transition-colors">
                        <Folder className="w-8 h-8 text-ufv-azul group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-ufv-azul-oscuro group-hover:text-ufv-azul transition-colors">{curso}º Curso</h3>
                        <p className="text-sm font-bold text-gray-500 mt-1">{alumnosPorEstado.filter(a => a.curso === curso).length} alumnos</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : !rotacionActiva ? (
                <div>
                  <button 
                    onClick={() => setCursoActivo(null)}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-ufv-azul mb-6 font-bold transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Volver a cursos
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rotacionesDelCurso.map(rot => (
                      <button 
                        key={rot}
                        onClick={() => setRotacionActiva(rot)}
                        className="flex items-center p-6 bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-ufv-azul transition-all text-left group"
                      >
                        <div className="bg-blue-50 p-4 rounded-2xl mr-5 group-hover:bg-ufv-azul transition-colors">
                          <Folder className="w-8 h-8 text-ufv-azul group-hover:text-white transition-colors" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-ufv-azul-oscuro group-hover:text-ufv-azul transition-colors">Rotación {rot}</h3>
                          <p className="text-sm font-bold text-gray-500 mt-1">
                            {alumnosPorEstado.filter(a => a.curso === cursoActivo && a.numero_rotacion === rot).length} alumnos
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <button 
                    onClick={() => setRotacionActiva(null)}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-ufv-azul mb-6 font-bold transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Volver a rotaciones
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {alumnosAMostrar.map(item => <TarjetaAlumno key={item.rotacion_id} item={item} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* MODAL CAMBIO CONTRASEÑA (ESTILO CORPORATIVO) */}
      {showPassModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border-t-4 border-ufv-azul animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-ufv-azul-oscuro">Cambiar contraseña</h2>
              <button onClick={() => setShowPassModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCambiarPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Contraseña Actual</label>
                <input 
                  type="password" required
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul outline-none transition-all text-gray-900"
                  value={passFormData.actual}
                  onChange={(e) => setPassFormData({...passFormData, actual: e.target.value})}
                />
              </div>

              <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Nueva Contraseña (mín. 8)</label>
                <input 
                  type="password" required minLength={8}
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul outline-none transition-all text-gray-900"
                  value={passFormData.nueva}
                  onChange={(e) => setPassFormData({...passFormData, nueva: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Confirmar Nueva</label>
                <input 
                  type="password" required
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul outline-none transition-all text-gray-900"
                  value={passFormData.confirmar}
                  onChange={(e) => setPassFormData({...passFormData, confirmar: e.target.value})}
                />
              </div>

              {passStatus.msg && (
                <p className={`text-center text-xs font-bold p-3.5 rounded-xl ${
                  passStatus.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 
                  passStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-blue-50 text-ufv-azul border border-blue-100'
                }`}>
                  {passStatus.msg}
                </p>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowPassModal(false)} 
                  className="flex-1 py-3.5 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors border border-transparent"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3.5 bg-ufv-azul text-white font-bold rounded-xl hover:bg-ufv-azul-oscuro shadow-md active:scale-95 transition-all border border-transparent"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}