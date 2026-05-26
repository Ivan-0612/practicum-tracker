"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  Loader2,
  Lock,
  AlertCircle,
  Download,
  Eye,
  CheckSquare
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { useToast } from "@/components/ToastProvider";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function PantallaEvaluacion() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const rotacionId = params.id as string;

  const [datos, setDatos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [respuestas, setRespuestas] = useState<Record<string, any>>({});
  const [guardando, setGuardando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [showConfirmFinalizar, setShowConfirmFinalizar] = useState(false);

  const [esSoloLectura, setEsSoloLectura] = useState(false);

  // Estado de paginación
  const [paginaActual, setPaginaActual] = useState(0);

  const intentoFinalizacion = datos?.hospital_finalize_count || 0;
  const esUltimaOportunidad = intentoFinalizacion === 1;

  useEffect(() => {
    cargarCuadernillo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotacionId]);

  // Al cambiar de página, hacer scroll al inicio
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [paginaActual]);

  // --- 1. FUNCIÓN DE CARGA ---
  const cargarCuadernillo = async () => {
    try {
      setLoading(true);
      const token = Cookies.get("practicum_token");

      if (!token) {
        setError("No hay sesión activa. Por favor, inicia sesión de nuevo.");
        setLoading(false);
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cuadernillos/molde/${rotacionId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setDatos(data);

        if (data.borrador) setRespuestas(data.borrador);

        if (data.rotacion_completada === true || data.es_tutor_universidad === true) {
          setEsSoloLectura(true);
        }

      } else {
        const errorData = await res.json();
        setError(errorData.detail || "No se pudo cargar la evaluación.");
      }
    } catch (err) {
      console.error("Error al cargar cuadernillo:", err);
      setError("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  // --- FUNCIONES DE PROGRESO ---
  const obtenerTotalPreguntas = () => {
    if (!datos || !datos.molde) return 0;
    const preguntasSinon = datos.molde.bloque_sinon?.elementos?.length || 0;
    const preguntasNiveles = datos.molde.apartados?.reduce(
      (total: number, apartado: any) => total + (apartado.elementos?.length || 0),
      0
    ) || 0;
    return preguntasSinon + preguntasNiveles;
  };

  const totalCount = obtenerTotalPreguntas();
  const respondidasCount = Object.values(respuestas).filter(
    (r: any) => (r.valor_sinon !== undefined && r.valor_sinon !== null) ||
         (r.valor_nivel !== undefined && r.valor_nivel !== null)
  ).length;

  // --- CONSTRUCCIÓN DE PÁGINAS ---
  const construirPaginas = () => {
    if (!datos?.molde) return [];
    const paginas: Array<{ tipo: "sinon" | "apartado"; datos: any }> = [];
    if (datos.molde.bloque_sinon) {
      paginas.push({ tipo: "sinon", datos: datos.molde.bloque_sinon });
    }
    for (const apartado of datos.molde.apartados || []) {
      paginas.push({ tipo: "apartado", datos: apartado });
    }
    return paginas;
  };

  // --- 2. MANEJADOR DE CAMBIOS ---
  const handleCambioRespuesta = (idElemento: string, bloque: number, campo: 'valor_sinon' | 'valor_nivel' | 'comentario', valor: any) => {
    if (esSoloLectura) return;
    setRespuestas(prev => ({
      ...prev,
      [idElemento]: {
        ...prev[idElemento],
        bloque,
        elemento_id: idElemento,
        [campo]: valor
      }
    }));
  };

  // --- 3. FUNCIONES DE GUARDADO ---
  const guardarBorrador = async () => {
    if (esSoloLectura) return;
    setGuardando(true);
    try {
      const token = Cookies.get("practicum_token");
      const payload = Object.values(respuestas);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cuadernillos/guardar/${rotacionId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) toast.success("Borrador guardado correctamente.");
      else { const errData = await res.json(); toast.error(`Error al guardar: ${errData.detail}`); }
    } catch { toast.error("Error de conexión al guardar."); }
    finally { setGuardando(false); }
  };

  const finalizarEvaluacion = () => {
    if (esSoloLectura) return;
    if (respondidasCount < totalCount) {
      toast.warning(
        `Completa todos los indicadores antes de finalizar (${respondidasCount}/${totalCount}).`
      );
      return;
    }
    setShowConfirmFinalizar(true);
  };

  const doFinalizarEvaluacion = async () => {
    setShowConfirmFinalizar(false);
    setFinalizando(true);
    try {
      const token = Cookies.get("practicum_token");
      const payload = Object.values(respuestas);
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cuadernillos/guardar/${rotacionId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cuadernillos/finalizar/${rotacionId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.bloqueada) {
          toast.success("Evaluación cerrada definitivamente. Se envió la nota final a ambos tutores.");
          router.push("/profesor/dashboard");
          return;
        }
        toast.success("Primera confirmación registrada. Se envió la nota al tutor hospital.");
        await cargarCuadernillo();
      } else {
        const errorData = await res.json();
        toast.error(`No se pudo finalizar: ${errorData.detail}`);
      }
    } catch { toast.error("Error de conexión al finalizar."); }
    finally { setFinalizando(false); }
  };

  const descargarPDF = async () => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cuadernillos/descargar-pdf/${rotacionId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Error al generar PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Evaluacion_${datos?.alumno?.nombre_completo.replace(/ /g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch { toast.error("Hubo un problema al descargar el PDF."); }
  };

  // --- ESTADOS DE CARGA ---
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4">
      <Loader2 className="w-10 h-10 text-ufv-azul animate-spin" />
      <p className="text-gray-500 font-medium">Cargando rúbrica...</p>
    </div>
  );

  if (error || !datos) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h2 className="text-xl font-bold text-gray-800 mb-2">Error de carga</h2>
      <p className="text-gray-500 mb-6">{error}</p>
      <button onClick={() => router.push("/profesor/dashboard")} className="px-6 py-2.5 bg-ufv-azul text-white font-bold rounded-xl shadow-md">
        Volver al Dashboard
      </button>
    </div>
  );

  const paginas = construirPaginas();
  const totalPaginas = paginas.length;
  const paginaInfo = paginas[paginaActual];
  const esUltimaPagina = paginaActual === totalPaginas - 1;
  const esPrimeraPagina = paginaActual === 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-28 md:pb-32">

      {/* CABECERA FLOTANTE SUPERIOR */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm px-4 py-4 md:px-8 flex items-center justify-between">
        <Breadcrumb className="" items={[
          { label: "Dashboard", href: "/profesor/dashboard" },
          { label: "Evaluación" },
        ]} />

        <div className="flex items-center gap-3">
          {datos.rotacion_completada ? (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 md:px-4 py-2 rounded-lg font-bold text-xs md:text-sm border border-green-200">
              <Lock className="w-4 h-4" /> Acta Cerrada
            </div>
          ) : intentoFinalizacion === 1 ? (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 md:px-4 py-2 rounded-lg font-bold text-xs md:text-sm border border-amber-200">
              <AlertCircle className="w-4 h-4" /> Pendiente 2ª Confirmación
            </div>
          ) : esSoloLectura ? (
            <div className="flex items-center gap-2 bg-blue-50 text-ufv-azul px-3 md:px-4 py-2 rounded-lg font-bold text-xs md:text-sm border border-blue-200">
              <Eye className="w-4 h-4" /> Modo Revisión
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 md:px-4 py-2 rounded-lg font-bold text-xs md:text-sm border border-amber-200">
              <CheckSquare className="w-4 h-4" /> En Proceso
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 mt-4 md:mt-8">

        {/* INFO DEL ALUMNO */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-ufv-rosa-oscuro text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
              Rotación {datos.alumno.numero_rotacion}
            </span>
            <span className="text-gray-500 font-bold text-sm">
              {datos.alumno.curso}º Enfermería
            </span>
          </div>

          <h1 className="text-2xl md:text-4xl font-black text-ufv-azul-oscuro tracking-tight mb-2">
            {datos.alumno.nombre_completo}
          </h1>
          <p className="text-sm md:text-base text-gray-500 font-medium">
            Especialidad: <span className="text-gray-800 font-bold">{datos.especialidad}</span>
          </p>

          {/* AVISO: TUTOR UNIVERSIDAD */}
          {datos.es_tutor_universidad && !datos.rotacion_completada && (
            <div className="mt-4 bg-blue-50 border border-blue-200 text-ufv-azul px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs md:text-sm shadow-sm">
              <Eye className="w-6 h-6 shrink-0" />
              <p>Como <span className="underline decoration-2 underline-offset-2">Tutor de la Universidad</span>, tu acceso es de Solo Lectura. La evaluación corresponde al Tutor Clínico del hospital.</p>
            </div>
          )}
        </div>

        {/* INDICADOR DE PASO */}
        <div className="mb-6 flex items-center gap-3">
          {/* Puntos de progreso */}
          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto py-1">
            {paginas.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setPaginaActual(idx)}
                className={`shrink-0 transition-all rounded-full ${
                  idx === paginaActual
                    ? "w-6 h-2.5 bg-ufv-azul"
                    : "w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Ir a página ${idx + 1}`}
              />
            ))}
          </div>
          <span className="shrink-0 text-xs font-bold text-gray-400 tabular-nums">
            {paginaActual + 1} / {totalPaginas}
          </span>
        </div>

        {/* CONTENIDO DE LA PÁGINA ACTUAL */}

        {/* PÁGINA: ACTIVIDADES ESPECÍFICAS (SÍ / NO) */}
        {paginaInfo.tipo === "sinon" && (
          <section className="bg-white rounded-2xl md:rounded-3xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-ufv-azul-oscuro p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-white text-lg md:text-xl font-black">Actividades Específicas (NIC)</h2>
                <p className="text-blue-200 text-xs md:text-sm mt-1">{paginaInfo.datos.titulo}</p>
              </div>
            </div>

            <div className="p-4 md:p-6 divide-y divide-gray-100">
              {paginaInfo.datos.elementos.map((item: any) => {
                const resp = respuestas[item.id];
                return (
                  <div key={item.id} className="py-4 md:py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-8 group">
                    <p className="text-sm md:text-base text-gray-700 font-medium leading-relaxed flex-1">
                      {item.texto}
                    </p>
                    <div className="flex bg-gray-100 rounded-lg p-1 shrink-0 w-full md:w-auto">
                      <button
                        disabled={esSoloLectura}
                        onClick={() => handleCambioRespuesta(item.id, 0, 'valor_sinon', true)}
                        className={`flex-1 md:w-20 py-2 rounded-md font-bold text-xs md:text-sm transition-all ${resp?.valor_sinon === true ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'} ${esSoloLectura ? 'cursor-default opacity-80' : ''}`}
                      >
                        SÍ
                      </button>
                      <button
                        disabled={esSoloLectura}
                        onClick={() => handleCambioRespuesta(item.id, 0, 'valor_sinon', false)}
                        className={`flex-1 md:w-20 py-2 rounded-md font-bold text-xs md:text-sm transition-all ${resp?.valor_sinon === false ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'} ${esSoloLectura ? 'cursor-default opacity-80' : ''}`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* PÁGINA: UNIDAD DE COMPETENCIA (NIVELES 1-3) */}
        {paginaInfo.tipo === "apartado" && (() => {
          const apartado = paginaInfo.datos;
          return (
            <section className="bg-white rounded-2xl md:rounded-3xl shadow-md border border-gray-100 p-4 md:p-8">

              <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8 border-b border-gray-100 pb-4">
                <div className="bg-ufv-azul-claro text-white font-black text-lg md:text-2xl w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  {apartado.numero}
                </div>
                <h2 className="text-base md:text-xl font-black text-gray-800 leading-tight">
                  {apartado.titulo}
                </h2>
              </div>

              {/* TABLA DE CRITERIOS DE EVALUACIÓN */}
              <div className="mb-8 overflow-x-auto">
                <table className="w-full min-w-[600px] text-xs md:text-sm text-left border-collapse border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <thead className="bg-gray-100 text-gray-700 font-bold">
                    <tr>
                      <th className="border border-gray-200 p-2 md:p-3 text-center bg-gray-200">CRITERIOS</th>
                      <th className="border border-gray-200 p-2 md:p-3 text-center w-1/4">NIVEL 1 (BÁSICO)</th>
                      <th className="border border-gray-200 p-2 md:p-3 text-center w-1/4">NIVEL 2 (INTERMEDIO)</th>
                      <th className="border border-gray-200 p-2 md:p-3 text-center w-1/4">NIVEL 3 (AVANZADO)</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 bg-white">
                    <tr>
                      <td className="border border-gray-200 p-2 md:p-3 font-bold bg-gray-50 text-center text-xs">FRECUENCIA DE REALIZACIÓN</td>
                      <td className="border border-gray-200 p-2 md:p-3 text-center">SIEMPRE</td>
                      <td className="border border-gray-200 p-2 md:p-3 text-center">SIEMPRE</td>
                      <td className="border border-gray-200 p-2 md:p-3 text-center">SIEMPRE</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-2 md:p-3 font-bold bg-gray-50 text-center text-xs">AUTONOMÍA PERSONAL</td>
                      <td className="border border-gray-200 p-2 md:p-3 text-center">ENTRE EL 51% Y EL 99%<br/><span className="text-[10px] text-gray-400">de las ocasiones...</span></td>
                      <td className="border border-gray-200 p-2 md:p-3 text-center">SIEMPRE</td>
                      <td className="border border-gray-200 p-2 md:p-3 text-center">SIEMPRE</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-2 md:p-3 font-bold bg-gray-50 text-center text-xs leading-tight">MOMENTO ADECUADO DE REALIZACIÓN</td>
                      <td className="border border-gray-200 p-2 md:p-3 text-center">HASTA EL 50%<br/><span className="text-[10px] text-gray-400">de las ocasiones...</span></td>
                      <td className="border border-gray-200 p-2 md:p-3 text-center">ENTRE EL 51% Y EL 99%<br/><span className="text-[10px] text-gray-400">de las ocasiones...</span></td>
                      <td className="border border-gray-200 p-2 md:p-3 text-center">SIEMPRE</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-2 md:p-3 font-bold bg-gray-50 text-center text-xs leading-tight">UTILIZACIÓN ADECUADA DE RECURSOS</td>
                      <td className="border border-gray-200 p-2 md:p-3 text-center">HASTA EL 50%<br/><span className="text-[10px] text-gray-400">de las ocasiones...</span></td>
                      <td className="border border-gray-200 p-2 md:p-3 text-center">ENTRE EL 51% Y EL 99%<br/><span className="text-[10px] text-gray-400">de las ocasiones...</span></td>
                      <td className="border border-gray-200 p-2 md:p-3 text-center">ENTRE EL 51% Y EL 99%<br/><span className="text-[10px] text-gray-400">de las ocasiones...</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="space-y-6 md:space-y-8">
                {apartado.elementos.map((item: any, idx: number) => {
                  const resp = respuestas[item.id];
                  return (
                    <div key={item.id} className="bg-gray-50/50 border border-gray-100 rounded-xl p-4 md:p-6 transition-all hover:border-blue-100 hover:bg-blue-50/30">
                      <div className="flex flex-col md:flex-row gap-4 md:gap-6 justify-between items-start">
                        <p className="text-sm md:text-base text-gray-700 font-medium leading-relaxed flex-1">
                          <span className="font-bold text-ufv-azul mr-2">{idx + 1}.</span>{item.texto}
                        </p>

                        <div className="flex gap-2 w-full md:w-auto shrink-0 justify-between md:justify-start">
                          {[1, 2, 3].map(nivel => (
                            <button
                              key={nivel}
                              disabled={esSoloLectura}
                              onClick={() => handleCambioRespuesta(item.id, apartado.numero, 'valor_nivel', nivel)}
                              className={`w-12 h-10 md:w-14 md:h-12 rounded-lg font-black text-sm md:text-base transition-all border ${
                                resp?.valor_nivel === nivel
                                ? 'bg-ufv-azul text-white border-ufv-azul shadow-md transform scale-105'
                                : 'bg-white text-gray-400 border-gray-200 hover:border-ufv-azul hover:text-ufv-azul'
                              } ${esSoloLectura ? 'cursor-default' : ''}`}
                            >
                              {nivel}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CAJA DE OBSERVACIONES DEL APARTADO */}
              <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-200">
                <label className="block text-xs md:text-sm font-bold text-ufv-azul-oscuro mb-2 md:mb-3">
                  Observaciones Generales de la Unidad {apartado.numero} (Opcional)
                </label>
                <textarea
                  placeholder={esSoloLectura ? "Sin observaciones registradas." : "Añadir un comentario sobre esta unidad competencial..."}
                  disabled={esSoloLectura}
                  onChange={(e) => handleCambioRespuesta(`comentario_apartado_${apartado.numero}`, apartado.numero, 'comentario', e.target.value)}
                  value={respuestas[`comentario_apartado_${apartado.numero}`]?.comentario || ""}
                  className={`w-full border-2 rounded-xl p-3 md:p-4 text-xs md:text-sm focus:outline-none transition-all ${
                    esSoloLectura
                    ? 'border-transparent bg-gray-50 text-gray-600 italic font-medium'
                    : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-ufv-azul focus:bg-white hover:border-gray-300 font-medium'
                  }`}
                  rows={3}
                />
              </div>
            </section>
          );
        })()}

      </main>

      {/* --- BARRA FLOTANTE INFERIOR --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col gap-3">

          {/* FILA SUPERIOR: progreso + confirmación */}
          {!datos.rotacion_completada && !esSoloLectura && (
            <div className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Progreso</span>
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <span className={`text-base font-black tabular-nums ${respondidasCount === totalCount ? 'text-green-600' : 'text-ufv-azul'}`}>
                    {respondidasCount}
                  </span>
                  <span className="text-gray-400 font-bold text-sm tabular-nums">/ {totalCount}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Confirmación</span>
                <span className="text-sm font-black text-ufv-azul">{intentoFinalizacion}/2</span>
              </div>
            </div>
          )}

          {/* FILA INFERIOR: botones de acción + navegación */}
          <div className="flex items-center gap-2">

            {datos.rotacion_completada ? (
              /* EVALUACIÓN CERRADA */
              <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-3">
                <span className="text-green-600 font-bold flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-5 h-5" /> Evaluación Cerrada Oficialmente
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    disabled={!esPrimeraPagina}
                    onClick={() => setPaginaActual(p => p - 1)}
                    className="px-3 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-bold text-sm disabled:opacity-30 hover:bg-gray-50 transition-all flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={esUltimaPagina}
                    onClick={() => setPaginaActual(p => p + 1)}
                    className="px-3 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-bold text-sm disabled:opacity-30 hover:bg-gray-50 transition-all flex items-center gap-1"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={descargarPDF}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-ufv-azul text-white font-bold rounded-xl shadow-md flex justify-center items-center gap-2 hover:bg-ufv-azul-oscuro transition-all text-sm"
                  >
                    <Download className="w-4 h-4" /> Descargar Acta PDF
                  </button>
                </div>
              </div>
            ) : esSoloLectura ? (
              /* MODO LECTURA */
              <div className="w-full flex items-center justify-between gap-2">
                <span className="text-gray-500 font-bold text-sm flex items-center gap-2">
                  <Eye className="w-5 h-5" /> Modo Lectura
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={esPrimeraPagina}
                    onClick={() => setPaginaActual(p => p - 1)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm disabled:opacity-30 hover:bg-gray-50 transition-all flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>
                  <button
                    disabled={esUltimaPagina}
                    onClick={() => setPaginaActual(p => p + 1)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm disabled:opacity-30 hover:bg-gray-50 transition-all flex items-center gap-1"
                  >
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* MODO EDICIÓN */
              <div className="w-full flex flex-wrap items-center gap-2">

                {/* Guardar — izquierda en desktop, fila inferior izquierda en móvil */}
                <button
                  onClick={guardarBorrador}
                  disabled={guardando || finalizando}
                  className="order-2 sm:order-1 flex-1 sm:flex-none px-4 py-2.5 bg-blue-50 text-ufv-azul border border-blue-200 text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-100 transition-all disabled:opacity-50"
                >
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar
                </button>

                {/* Navegación — fila superior completa en móvil, centro en desktop */}
                <div className="order-1 sm:order-2 w-full sm:w-auto sm:flex-1 flex items-center gap-2 justify-center">
                  <button
                    disabled={esPrimeraPagina || guardando || finalizando}
                    onClick={() => setPaginaActual(p => p - 1)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm disabled:opacity-30 hover:bg-gray-50 transition-all flex items-center justify-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>
                  <button
                    disabled={esUltimaPagina || guardando || finalizando}
                    onClick={() => setPaginaActual(p => p + 1)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm disabled:opacity-30 hover:bg-gray-50 transition-all flex items-center justify-center gap-1"
                  >
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Finalizar — derecha en desktop, fila inferior derecha en móvil */}
                <button
                  onClick={finalizarEvaluacion}
                  disabled={guardando || finalizando}
                  className="order-3 flex-1 sm:flex-none px-5 py-2.5 bg-green-600 text-white text-sm font-black rounded-xl shadow-md flex items-center justify-center gap-2 hover:bg-green-700 transition-all disabled:opacity-50 active:scale-95"
                >
                  {finalizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {esUltimaOportunidad ? "CERRAR (2/2)" : "FINALIZAR (1/2)"}
                </button>

              </div>
            )}

          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmFinalizar}
        variant={esUltimaOportunidad ? "danger" : "warning"}
        title={esUltimaOportunidad ? "Segunda confirmación — Cierre definitivo" : "Primera confirmación"}
        message={
          esUltimaOportunidad
            ? "Esta es la SEGUNDA y última confirmación.\n\nSe bloqueará la evaluación y se enviará la nota final al tutor hospital y al tutor universidad."
            : "Esta es la PRIMERA confirmación.\n\nSe enviará la nota final al tutor hospital, pero podrás seguir editando antes del cierre definitivo."
        }
        confirmLabel={esUltimaOportunidad ? "Cerrar evaluación (2/2)" : "Confirmar (1/2)"}
        onConfirm={doFinalizarEvaluacion}
        onCancel={() => setShowConfirmFinalizar(false)}
      />

    </div>
  );
}
