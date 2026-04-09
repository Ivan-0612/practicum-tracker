"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { BookOpen, LogOut, Folder, Lock, CheckCircle, Users, Loader2, CalendarDays, X, Building, Home } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ModalRubrica from "@/components/ModalRubrica";

interface EspecialidadDisponible {
  nombre: string;
  especialidadId?: string;
  rotacionId?: string;
}

export default function AlumnoDashboard() {
  const router = useRouter();
  const [datos, setDatos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mostrarPasadas, setMostrarPasadas] = useState(false);
  const [filtroCursoPasadas, setFiltroCursoPasadas] = useState<string>("Todos");
  const [isInitialized, setIsInitialized] = useState(false);

  // ESTADOS PARA CAMBIO DE CONTRASEÑA
  const [showPassModal, setShowPassModal] = useState(false);
  const [passFormData, setPassFormData] = useState({ actual: "", nueva: "", confirmar: "" });
  const [passStatus, setPassStatus] = useState({ type: "", msg: "" });
  const [isRubricaOpen, setIsRubricaOpen] = useState(false);
  const [rubricaActual, setRubricaActual] = useState({ nombre: "", molde: null });
  const [especialidadesSistema, setEspecialidadesSistema] = useState<EspecialidadDisponible[]>([]);

  // 1. Leer memoria al cargar
  useEffect(() => {
    const memoria = sessionStorage.getItem("alumno_memoria_navegacion");
    if (memoria) {
      try {
        const estadoGuardado = JSON.parse(memoria);
        if (estadoGuardado.mostrarPasadas !== undefined) setMostrarPasadas(estadoGuardado.mostrarPasadas);
        if (estadoGuardado.filtroCursoPasadas !== undefined) setFiltroCursoPasadas(estadoGuardado.filtroCursoPasadas);
      } catch (e) {
        console.error("Error leyendo memoria", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // 2. Guardar memoria ante cambios
  useEffect(() => {
    if (isInitialized) {
      sessionStorage.setItem("alumno_memoria_navegacion", JSON.stringify({
        mostrarPasadas,
        filtroCursoPasadas
      }));
    }
  }, [isInitialized, mostrarPasadas, filtroCursoPasadas]);

  // 3. Cargar datos del API
  useEffect(() => {
    cargarDatos();
    cargarEspecialidadesSistema();
  }, []);

  const cargarDatos = async () => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/alumnos/mi-perfil-evaluacion`, { 
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
    sessionStorage.removeItem("alumno_memoria_navegacion");
    router.push("/login");
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
        setRubricaActual({ nombre: especialidadNombre, molde: null });
        setIsRubricaOpen(true);
      }
    } catch (error) {
      console.error("Error al cargar la rúbrica", error);
      setRubricaActual({ nombre: especialidadNombre, molde: null });
      setIsRubricaOpen(true);
    }
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
        // --- CAMBIO AQUÍ: Manejo inteligente del error de validación ---
        let errorFinal = "Error al cambiar la contraseña.";

        if (Array.isArray(data.detail)) {
          // Si es un error de validación de Pydantic, extraemos el mensaje del validador
          errorFinal = data.detail[0].msg;
        } else if (typeof data.detail === "string") {
          // Si es un error manual (HTTPException)
          errorFinal = data.detail;
        }

        setPassStatus({ type: "error", msg: errorFinal });
      }
    } catch (error) {
      setPassStatus({ type: "error", msg: "Error de conexión con el servidor." });
    }
  };

  if (loading) return <div className="p-10 text-center text-ufv-azul font-bold animate-pulse">Cargando tu expediente...</div>;

  const especialidadesDesdeRotaciones = Array.from(
    new Map<string, EspecialidadDisponible>(
      (datos?.rotaciones || []).map((rot: any) => [
        rot.especialidad,
        {
          nombre: rot.especialidad,
          rotacionId: rot.id,
        },
      ])
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const especialidadesDisponibles = especialidadesSistema.length > 0 ? especialidadesSistema : especialidadesDesdeRotaciones;
  const puedeAbrirRubrica = especialidadesDisponibles.length > 0;
  const rotacionesActivas = (datos?.rotaciones || []).filter((rot: any) => !rot.completada);
  const rotacionesPasadas = (datos?.rotaciones || []).filter((rot: any) => rot.completada);

  const TarjetaRotacion = ({ rot }: { rot: any }) => (
    <div className="relative bg-white p-6 rounded-3xl border border-gray-200 border-t-4 border-t-ufv-azul shadow-sm flex flex-col hover:shadow-xl transition-all duration-300">
      {/* ZONA SUPERIOR (Evaluación) */}
      <div onClick={() => router.push(`/alumno/evaluar/${rot.id}`)} className="cursor-pointer group mb-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded-xl text-ufv-azul group-hover:bg-ufv-azul group-hover:text-white transition-colors"><Folder className="w-6 h-6" /></div>
          <div>
            <h3 className="text-lg font-black text-ufv-azul-oscuro group-hover:text-ufv-azul transition-colors leading-tight">
              {rot.especialidad} (Rotación {rot.numero})
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">{rot.curso}º Curso</span>
              <span className="text-[10px] font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md border border-gray-200">
                {rot.periodo_academico || "2024/2025"}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3 text-sm font-bold text-gray-600">
              <Building className="w-4 h-4 text-ufv-rosa-oscuro shrink-0" />
              <span className="truncate">{rot.centro_practicas || "Centro clínico no especificado"}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest">
            <Users className="w-3 h-3" /> Tutores Asignados
          </div>
          {rot.tutores ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-ufv-azul-oscuro truncate flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-ufv-rosa-claro shrink-0"></span>
                <span className="text-gray-500 font-medium text-xs w-16">Hospital:</span>
                {rot.tutores.hospital || <span className="text-gray-400 italic font-normal text-xs">Sin asignar</span>}
              </span>
              <span className="text-sm font-bold text-ufv-azul-oscuro truncate flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-ufv-azul shrink-0"></span>
                <span className="text-gray-500 font-medium text-xs w-16">Académico:</span>
                {rot.tutores.universidad || <span className="text-gray-400 italic font-normal text-xs">Sin asignar</span>}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-400 italic">Sin asignar</span>
          )}
        </div>
      </div>

      {/* ZONA INFERIOR (Asistencia) */}
      <div className="mt-auto pt-5 border-t border-gray-100">
        <div className={`flex items-center justify-center gap-2 text-sm font-black px-4 py-3 rounded-xl border mb-3 ${rot.completada ? "text-green-700 bg-green-50 border-green-200" : "text-ufv-azul bg-blue-50 border-blue-100"}`}>
          <CheckCircle className="w-5 h-5" /> {rot.completada ? "ROTACIÓN CERRADA" : "ROTACIÓN ACTIVA"}
        </div>

        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 text-center">Registro de Prácticas</p>
        <button onClick={() => router.push(`/alumno/asistencia/${rot.id}`)} className="w-full py-3.5 bg-blue-50 text-ufv-azul text-sm font-bold rounded-xl border border-blue-100 hover:border-ufv-azul hover:bg-blue-100 flex items-center justify-center gap-2 transition-colors">
          <CalendarDays className="w-5 h-5" /> Ver calendario de firmas
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto pb-20">
        
        {/* CABECERA CORPORATIVA Y ACCIONES */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex items-center gap-4">
            <Image src="/logo-ufv.png" alt="Logo UFV" width={56} height={56} className="object-contain" />
            <div>
              <h1 className="text-3xl font-black text-ufv-azul-oscuro">Portal del Alumno</h1>
              <p className="text-xs font-bold text-ufv-rosa-oscuro uppercase tracking-widest mt-1">Universidad Francisco de Vitoria</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                if (!puedeAbrirRubrica) return;
                const primeraRotacion = (datos?.rotaciones || [])[0];
                if (primeraRotacion?.id && primeraRotacion?.especialidad) {
                  void abrirManualRubrica(primeraRotacion.id, primeraRotacion.especialidad);
                  return;
                }

                setRubricaActual({ nombre: especialidadesDisponibles[0]?.nombre || "", molde: null });
                setIsRubricaOpen(true);
              }}
              disabled={!puedeAbrirRubrica}
              title={puedeAbrirRubrica ? "Abrir criterios y rúbrica" : "No hay especialidades disponibles"}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl font-bold border border-indigo-200 hover:bg-indigo-100 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BookOpen className="w-4 h-4"/> Criterios y Rúbrica
            </button>
            <button onClick={() => setShowPassModal(true)} className="flex items-center gap-2 bg-white text-ufv-azul px-4 py-2.5 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition-all shadow-sm active:scale-95">
              <Lock className="w-4 h-4"/> Cambiar Contraseña
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 bg-white text-red-600 px-4 py-2.5 rounded-xl font-bold border border-red-200 hover:bg-red-50 transition-all shadow-sm active:scale-95">
              <LogOut className="w-4 h-4"/> Cerrar Sesión
            </button>
          </div>
        </div>

        {/* SALUDO AL ALUMNO */}
        <div className="mb-8">
            <h2 className="text-2xl font-black text-ufv-azul-oscuro flex items-center gap-2">
                Hola, {datos?.alumno.nombre} <span className="text-3xl">👋</span>
            </h2>
            <p className="text-gray-500 font-medium mt-1">Navega por tu rotación activa o consulta el historial en la carpeta de rotaciones pasadas.</p>
        </div>

        {/* SISTEMA DE CARPETAS */}
        {!mostrarPasadas ? (
          <div className="space-y-8">
            <section>
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Rotación Activa</h3>
              {rotacionesActivas.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2rem] p-10 text-center">
                  <h4 className="text-lg font-bold text-gray-700">Sin rotación activa</h4>
                  <p className="text-gray-500 mt-2 font-medium">Tu próxima rotación aparecerá aquí cuando esté disponible.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rotacionesActivas.map((rot: any) => (
                    <TarjetaRotacion key={rot.id} rot={rot} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Histórico</h3>
              <button
                onClick={() => setMostrarPasadas(true)}
                className="w-full md:w-auto flex items-center p-6 bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-ufv-azul transition-all text-left group"
              >
                <div className="bg-blue-50 p-4 rounded-2xl mr-5 group-hover:bg-ufv-azul transition-colors"><Folder className="w-8 h-8 text-ufv-azul group-hover:text-white" /></div>
                <div>
                  <h4 className="text-xl font-black text-ufv-azul-oscuro group-hover:text-ufv-azul">Rotaciones Pasadas</h4>
                  <p className="text-sm font-bold text-gray-500 mt-1">{rotacionesPasadas.length} cerradas</p>
                </div>
              </button>
            </section>
          </div>
        ) : (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center text-sm text-gray-500 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm font-medium w-fit">
              <button onClick={() => setMostrarPasadas(false)} className={`flex items-center gap-1.5 hover:text-ufv-azul px-2 ${!mostrarPasadas ? "font-bold text-ufv-azul" : ""}`}>
                <Home className="w-4 h-4" /> Inicio
              </button>
              <span className="mx-2 text-gray-300">/</span>
              <span className="px-2 font-bold text-ufv-azul">Rotaciones Pasadas</span>
            </div>

            {rotacionesPasadas.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2rem] p-10 text-center">
                <h4 className="text-lg font-bold text-gray-700">Sin rotaciones pasadas</h4>
                <p className="text-gray-500 mt-2 font-medium">Cuando cierres una rotación, aparecerá aquí.</p>
              </div>
            ) : (
              <>
                {/* FILTRO POR CURSO */}
                <div className="relative w-full sm:w-52">
                  <select 
                    value={filtroCursoPasadas}
                    onChange={(e) => setFiltroCursoPasadas(e.target.value)}
                    className="block w-full px-4 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl focus:ring-2 focus:ring-ufv-azul outline-none font-bold appearance-none cursor-pointer"
                  >
                    <option value="Todos">Todos los cursos</option>
                    {Array.from(new Set(rotacionesPasadas.map((rot: any) => rot.curso)) as unknown as number[])
                      .sort((a, b) => a - b)
                      .map(curso => (
                        <option key={curso} value={String(curso)}>{curso}º Curso</option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rotacionesPasadas
                    .filter((rot: any) => filtroCursoPasadas === "Todos" || rot.curso === parseInt(filtroCursoPasadas))
                    .map((rot: any) => (
                      <TarjetaRotacion key={rot.id} rot={rot} />
                    ))}
                </div>
              </>
            )}
          </section>
        )}
      </div>

      <ModalRubrica
        isOpen={isRubricaOpen}
        onClose={() => setIsRubricaOpen(false)}
        especialidadNombre={rubricaActual.nombre}
        moldeEspecialidad={rubricaActual.molde}
        especialidadesDisponibles={especialidadesDisponibles}
        especialidadInicial={rubricaActual.nombre || especialidadesDisponibles[0]?.nombre}
      />

      {/* MODAL DE CAMBIO DE CONTRASEÑA */}
      {showPassModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border-t-4 border-ufv-azul animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-ufv-azul-oscuro">Cambiar contraseña</h2>
              <button onClick={() => setShowPassModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCambiarPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Contraseña Actual</label>
                <input type="password" required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul outline-none transition-all text-gray-900" value={passFormData.actual} onChange={(e) => setPassFormData({...passFormData, actual: e.target.value})} />
              </div>
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Nueva Contraseña (mín. 8)</label>
                <input type="password" required minLength={8} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul outline-none transition-all text-gray-900" value={passFormData.nueva} onChange={(e) => setPassFormData({...passFormData, nueva: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Confirmar Nueva</label>
                <input type="password" required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul outline-none transition-all text-gray-900" value={passFormData.confirmar} onChange={(e) => setPassFormData({...passFormData, confirmar: e.target.value})} />
              </div>

              {passStatus.msg && (
                <p className={`text-center text-xs font-bold p-3.5 rounded-xl ${passStatus.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : passStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-blue-50 text-ufv-azul border border-blue-100'}`}>
                  {passStatus.msg}
                </p>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowPassModal(false)} className="flex-1 py-3.5 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors border border-transparent">Cancelar</button>
                <button type="submit" className="flex-1 py-3.5 bg-ufv-azul text-white font-bold rounded-xl hover:bg-ufv-azul-oscuro shadow-md active:scale-95 transition-all border border-transparent">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}