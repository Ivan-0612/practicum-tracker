"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { ChevronLeft, Save, CheckCircle2, Loader2, CheckSquare, Lock, AlertCircle } from "lucide-react";

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
  }, [rotacionId]);

  const cargarCuadernillo = async () => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`http://127.0.0.1:8000/api/v1/cuadernillos/molde/${rotacionId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("No se pudo cargar el cuadernillo.");
      
      const data = await res.json();
      setDatos(data);

      if (data.rotacion_completada === true) {
        setEsSoloLectura(true);
      }
      
      if (data.borrador && Object.keys(data.borrador).length > 0) {
        setRespuestas(data.borrador);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * CALCULAR SEGÚN MOLDE:
   * Suma los elementos del bloque SÍ/NO y de todos los apartados numéricos.
   */
  const obtenerTotalPreguntas = () => {
    if (!datos || !datos.molde) return 0;
    
    const preguntasSinon = datos.molde.bloque_sinon.elementos.length;
    const preguntasNiveles = datos.molde.apartados.reduce(
      (total: number, apartado: any) => total + apartado.elementos.length, 
      0
    );
    
    return preguntasSinon + preguntasNiveles;
  };

  const handleCambioRespuesta = (elemento_id: string, bloque: number, campo: string, valor: any) => {
    if (esSoloLectura) return;
    
    setRespuestas(prev => ({
      ...prev,
      [elemento_id]: {
        ...prev[elemento_id],
        bloque: bloque,
        elemento_id: elemento_id,
        [campo]: valor
      }
    }));
  };

  const ejecutarGuardado = async (token: string) => {
    const listaRespuestas = Object.values(respuestas);
    if (listaRespuestas.length === 0) return true;

    const res = await fetch(`http://127.0.0.1:8000/api/v1/cuadernillos/guardar/${rotacionId}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(listaRespuestas)
    });
    
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Error al guardar los datos");
    }
    return true;
  };

  const handleGuardarBorrador = async () => {
    if (esSoloLectura) return;
    setGuardando(true);
    try {
      const token = Cookies.get("practicum_token") || "";
      await ejecutarGuardado(token);
      alert("✅ Borrador guardado correctamente. Puedes seguir editando luego.");
    } catch (err: any) {
      alert("❌ " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleFinalizarRotacion = async () => {
    if (esSoloLectura) return;

    // VALIDACIÓN: Comprobar que todos los campos están rellenos
    const totalRequerido = obtenerTotalPreguntas();
    const totalRespondidas = Object.keys(respuestas).length;

    if (totalRespondidas < totalRequerido) {
      alert(
        `⚠️ No puedes finalizar todavía.\n\n` +
        `Has completado ${totalRespondidas} de ${totalRequerido} indicadores.\n` +
        `Es obligatorio calificar todos los puntos antes de cerrar la evaluación.`
      );
      return;
    }

    const confirmar = window.confirm(
      "¿Estás seguro de finalizar? Una vez hecho, el acta se cerrará y no podrás modificar las notas."
    );
    if (!confirmar) return;

    setFinalizando(true);
    try {
      const token = Cookies.get("practicum_token") || "";
      
      // 1. Guardamos los cambios actuales por última vez
      await ejecutarGuardado(token);

      // 2. Llamamos al endpoint de finalización
      const resFinalizar = await fetch(`http://127.0.0.1:8000/api/v1/cuadernillos/finalizar/${rotacionId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!resFinalizar.ok) {
          const errorData = await resFinalizar.json();
          throw new Error(errorData.detail || "Error al intentar finalizar.");
      }

      alert("🎉 Evaluación finalizada y cerrada con éxito.");
      setEsSoloLectura(true);
      router.push("/profesor/dashboard");

    } catch (err: any) {
      alert("❌ " + err.message);
    } finally {
      setFinalizando(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-indigo-600 font-bold animate-pulse">Cargando cuadernillo...</div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-red-50 border-2 border-red-200 p-8 rounded-3xl max-w-md text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-red-900 font-bold text-xl mb-2">Error de carga</h2>
            <p className="text-red-700 mb-6">{error}</p>
            <button onClick={() => router.push("/profesor/dashboard")} className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold">Volver al panel</button>
        </div>
    </div>
  );
  if (!datos) return null;

  const { alumno, molde } = datos;
  const respondidasCount = Object.keys(respuestas).length;
  const totalCount = obtenerTotalPreguntas();

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button onClick={() => router.push("/profesor/dashboard")} className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-1 font-medium transition-colors">
              <ChevronLeft className="w-4 h-4" /> Volver al panel
            </button>
            <h1 className="text-xl font-bold text-slate-900">{alumno.nombre_completo}</h1>
            <p className="text-sm text-slate-500 font-medium">{molde.titulo_rotacion} • {alumno.curso}º Curso</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* CONTADOR DE PROGRESO */}
            {!esSoloLectura && (
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progreso</span>
                <span className={`text-sm font-black ${respondidasCount === totalCount ? 'text-green-600' : 'text-indigo-600'}`}>
                  {respondidasCount} / {totalCount}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {!esSoloLectura ? (
                <>
                  <button 
                    onClick={handleGuardarBorrador}
                    disabled={guardando || finalizando}
                    className="bg-white border-2 border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
                  >
                    {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {guardando ? "..." : "Guardar Borrador"}
                  </button>

                  <button 
                    onClick={handleFinalizarRotacion}
                    disabled={guardando || finalizando}
                    className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
                  >
                    {finalizando ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckSquare className="w-5 h-5" />}
                    {finalizando ? "..." : "Finalizar Evaluación"}
                  </button>
                </>
              ) : (
                <div className="bg-amber-50 text-amber-700 px-5 py-2 rounded-xl font-bold border border-amber-200 flex items-center gap-2 shadow-sm">
                  <Lock className="w-5 h-5" />
                  Evaluación Cerrada
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* BLOQUE 0: SÍ / NO */}
        <section className={`bg-white p-8 rounded-3xl shadow-sm border border-slate-200 transition-opacity ${esSoloLectura ? 'opacity-80' : ''}`}>
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                <CheckCircle2 className="w-6 h-6" />
            </div>
            {molde.bloque_sinon.titulo}
          </h2>
          <div className="space-y-4">
            {molde.bloque_sinon.elementos.map((item: any) => {
              const respuestaPrevia = respuestas[item.id];
              return (
                <div key={item.id} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:bg-slate-50 transition-colors">
                  <span className="font-semibold text-slate-700 flex-grow leading-snug">{item.texto}</span>
                  <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
                    <button 
                        disabled={esSoloLectura}
                        onClick={() => handleCambioRespuesta(item.id, 0, 'valor_sinon', true)}
                        className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${respuestaPrevia?.valor_sinon === true ? 'bg-green-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        SÍ
                    </button>
                    <button 
                        disabled={esSoloLectura}
                        onClick={() => handleCambioRespuesta(item.id, 0, 'valor_sinon', false)}
                        className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${respuestaPrevia?.valor_sinon === false ? 'bg-red-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        NO
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* BLOQUES 1-7: NIVELES */}
        {molde.apartados.map((apartado: any) => (
          <section key={apartado.numero} className={`bg-white p-8 rounded-3xl shadow-sm border border-slate-200 transition-opacity ${esSoloLectura ? 'opacity-80' : ''}`}>
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xl">
                    {apartado.numero}
                </div>
                <h2 className="text-xl font-extrabold text-slate-800">{apartado.titulo}</h2>
            </div>

            <div className="mb-8 p-5 bg-indigo-50/40 rounded-2xl border border-indigo-100/50">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Guía de calificación</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(n => (
                    <div key={n} className="flex gap-3 items-start">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                        <p className="text-xs text-indigo-900/70 font-medium leading-relaxed">{molde.niveles[n.toString()]}</p>
                    </div>
                ))}
              </div>
            </div>

            <div className="space-y-10">
              {apartado.elementos.map((item: any) => {
                const respuestaPrevia = respuestas[item.id];
                return (
                  <div key={item.id} className="group">
                    <p className="font-bold text-slate-700 mb-5 leading-relaxed group-hover:text-indigo-600 transition-colors">{item.texto}</p>
                    <div className="flex flex-wrap gap-3 mb-4">
                      {[1, 2, 3].map(num => (
                        <button
                            key={num}
                            disabled={esSoloLectura}
                            onClick={() => handleCambioRespuesta(item.id, apartado.numero, 'valor_nivel', num)}
                            className={`flex-1 min-w-[120px] py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                respuestaPrevia?.valor_nivel === num 
                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'
                            }`}
                        >
                          Nivel {num}
                        </button>
                      ))}
                    </div>
                    <textarea 
                      placeholder={esSoloLectura ? "Sin comentarios registrados" : "Añadir una observación (opcional)..."}
                      disabled={esSoloLectura}
                      onChange={(e) => handleCambioRespuesta(item.id, apartado.numero, 'comentario', e.target.value)}
                      value={respuestaPrevia?.comentario || ""}
                      className={`w-full border-2 border-slate-100 rounded-xl p-4 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none transition-all ${esSoloLectura ? 'bg-slate-50/50 italic' : 'bg-slate-50/30 hover:bg-white'}`}
                      rows={2}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}