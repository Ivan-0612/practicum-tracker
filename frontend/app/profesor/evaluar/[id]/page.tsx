"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { 
  ChevronLeft, 
  Save, 
  CheckCircle2, 
  Loader2, 
  Lock, 
  AlertCircle, 
  Download, 
  Eye,
  CheckSquare
} from "lucide-react";

export default function PantallaEvaluacion() {
  const params = useParams();
  const router = useRouter();
  const rotacionId = params.id as string;

  const [datos, setDatos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [respuestas, setRespuestas] = useState<Record<string, any>>({});
  const [guardando, setGuardando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  
  const [esSoloLectura, setEsSoloLectura] = useState(false);

  useEffect(() => {
    cargarCuadernillo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotacionId]);

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

  // --- NUEVO: FUNCIONES DE PROGRESO RESTAURADAS ---
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

      if (res.ok) alert("✅ Borrador guardado correctamente.");
      else { const errData = await res.json(); alert(`❌ Error al guardar: ${errData.detail}`); }
    } catch (err) { alert("❌ Error de conexión al guardar."); } 
    finally { setGuardando(false); }
  };

  const finalizarEvaluacion = async () => {
    if (esSoloLectura) return;

    // VALIDACIÓN DEL PROGRESO ANTES DE FINALIZAR
    if (respondidasCount < totalCount) {
      alert(
        `⚠️ No puedes finalizar todavía.\n\n` +
        `Has completado ${respondidasCount} de ${totalCount} indicadores.\n` +
        `Es obligatorio calificar todos los puntos antes de cerrar la evaluación.`
      );
      return;
    }

    if (!confirm("⚠️ ¿Estás seguro de que deseas FINALIZAR la evaluación?\n\nUna vez finalizada, las notas serán definitivas y no podrás hacer más cambios.")) return;
    
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
        alert("✅ Evaluación finalizada con éxito.");
        router.push("/profesor/dashboard");
      } else {
        const errorData = await res.json();
        alert(`❌ No se pudo finalizar:\n${errorData.detail}`);
      }
    } catch (err) { alert("❌ Error de conexión al finalizar."); } 
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
    } catch (error) { alert("❌ Hubo un problema al descargar el PDF."); }
  };


  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4"><Loader2 className="w-10 h-10 text-ufv-azul animate-spin" /><p className="text-gray-500 font-medium">Cargando rúbrica...</p></div>;
  if (error || !datos) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h2 className="text-xl font-bold text-gray-800 mb-2">Error de carga</h2>
      <p className="text-gray-500 mb-6">{error}</p>
      <button onClick={() => router.push("/profesor/dashboard")} className="px-6 py-2.5 bg-ufv-azul text-white font-bold rounded-xl shadow-md">Volver al Dashboard</button>
    </div>
  );

  const molde = datos.molde;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-32">
      
      {/* CABECERA FLOTANTE SUPERIOR */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm px-4 py-4 md:px-8 flex items-center justify-between">
        <button onClick={() => router.push("/profesor/dashboard")} className="flex items-center gap-2 text-gray-500 hover:text-ufv-azul transition-colors font-bold text-sm md:text-base">
          <ChevronLeft className="w-5 h-5" /> <span className="hidden md:inline">Volver a mis alumnos</span>
        </button>
        
        <div className="flex items-center gap-3">
          {datos.rotacion_completada ? (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 md:px-4 py-2 rounded-lg font-bold text-xs md:text-sm border border-green-200">
              <Lock className="w-4 h-4" /> Acta Cerrada
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
        <div className="mb-8 md:mb-10">
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
            <div className="mt-6 bg-blue-50 border border-blue-200 text-ufv-azul px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs md:text-sm shadow-sm">
              <Eye className="w-6 h-6 shrink-0" />
              <p>Como <span className="underline decoration-2 underline-offset-2">Tutor de la Universidad</span>, tu acceso es de Solo Lectura. La evaluación corresponde al Tutor Clínico del hospital.</p>
            </div>
          )}
        </div>

        {/* 1. ACTIVIDADES ESPECÍFICAS (SÍ / NO) */}
        {molde.bloque_sinon && (
          <section className="bg-white rounded-2xl md:rounded-3xl shadow-md border border-gray-100 overflow-hidden mb-8 md:mb-12">
            <div className="bg-ufv-azul-oscuro p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-white text-lg md:text-xl font-black">Actividades Específicas (NIC)</h2>
                <p className="text-blue-200 text-xs md:text-sm mt-1">{molde.bloque_sinon.titulo}</p>
              </div>
            </div>

            <div className="p-4 md:p-6 divide-y divide-gray-100">
              {molde.bloque_sinon.elementos.map((item: any) => {
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

        {/* 2. UNIDADES DE COMPETENCIA (NIVELES 1-3) */}
        {molde.apartados.map((apartado: any) => (
          <section key={apartado.numero} className="bg-white rounded-2xl md:rounded-3xl shadow-md border border-gray-100 p-4 md:p-8 mb-8 md:mb-12">
            
            <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8 border-b border-gray-100 pb-4">
              <div className="bg-ufv-azul-claro text-white font-black text-lg md:text-2xl w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                {apartado.numero}
              </div>
              <h2 className="text-base md:text-xl font-black text-gray-800 leading-tight">
                {apartado.titulo}
              </h2>
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
        ))}
      </main>

      {/* --- BARRA FLOTANTE INFERIOR: CONTADOR DE PROGRESO + BOTONES --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          {datos.rotacion_completada ? (
            <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4">
              <span className="text-green-600 font-bold flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-5 h-5" /> Evaluación Cerrada Oficialmente
              </span>
              <button 
                onClick={descargarPDF}
                className="w-full md:w-auto px-6 py-3 bg-ufv-azul text-white font-bold rounded-xl shadow-md flex justify-center items-center gap-2 hover:bg-ufv-azul-oscuro transition-all"
              >
                <Download className="w-5 h-5" /> Descargar Acta PDF
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4">
              
              {esSoloLectura ? (
                 <span className="text-gray-500 font-bold text-sm flex items-center gap-2">
                    <Eye className="w-5 h-5" /> Modo Lectura Activo - No puedes evaluar
                 </span>
              ) : (
                <>
                  {/* --- AQUÍ ESTÁ EL CONTADOR DE PROGRESO RESTAURADO --- */}
                  <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 w-full md:w-auto justify-center md:justify-start">
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Progreso</span>
                    <div className="flex items-center gap-1.5">
                        <span className={`text-lg font-black ${respondidasCount === totalCount ? 'text-green-600' : 'text-ufv-azul'}`}>
                          {respondidasCount}
                        </span>
                        <span className="text-gray-400 font-bold text-sm">/ {totalCount}</span>
                    </div>
                  </div>

                  {/* BOTONES DE GUARDAR */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <button 
                      onClick={guardarBorrador}
                      disabled={guardando || finalizando}
                      className="w-full sm:w-auto px-6 py-3.5 bg-blue-50 text-ufv-azul border border-blue-200 font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-blue-100 transition-all disabled:opacity-50"
                    >
                      {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 
                      Guardar Borrador
                    </button>

                    <button 
                      onClick={finalizarEvaluacion}
                      disabled={guardando || finalizando}
                      className="w-full sm:w-auto px-8 py-3.5 bg-green-600 text-white font-black rounded-xl shadow-md flex justify-center items-center gap-2 hover:bg-green-700 transition-all disabled:opacity-50 active:scale-95"
                    >
                      {finalizando ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                      FINALIZAR
                    </button>
                  </div>
                </>
              )}

            </div>
          )}
          
        </div>
      </div>
      
    </div>
  );
}