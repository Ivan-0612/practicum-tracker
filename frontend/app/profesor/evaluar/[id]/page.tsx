"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import { ChevronLeft, Save, CheckCircle2, Loader2, CheckSquare, Lock, AlertCircle, Download } from "lucide-react";

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

      if (res.status === 404) {
        throw new Error("No existe una evaluación o cuadernillo para esta rotación específica.");
      }

      if (!res.ok) throw new Error("Error al conectar con el servidor.");
      
      const data = await res.json();

      if (data.rotacion_id && String(data.rotacion_id) !== String(rotacionId)) {
        throw new Error("Error de integridad: Los datos recibidos no corresponden a esta rotación.");
      }
      
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

    const totalRequerido = obtenerTotalPreguntas();
    
    const totalRespondidas = Object.values(respuestas).filter(
        r => (r.valor_sinon !== undefined && r.valor_sinon !== null) || 
             (r.valor_nivel !== undefined && r.valor_nivel !== null)
    ).length;

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
      
      await ejecutarGuardado(token);

      const resFinalizar = await fetch(`http://127.0.0.1:8000/api/v1/cuadernillos/finalizar/${rotacionId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!resFinalizar.ok) {
          const errorData = await resFinalizar.json();
          throw new Error(errorData.detail || "Error al intentar finalizar.");
      }

      alert("🎉 Evaluación finalizada y firmada con éxito.");
      setEsSoloLectura(true);
      router.push("/profesor/dashboard");

    } catch (err: any) {
      alert("❌ " + err.message);
    } finally {
      setFinalizando(false);
    }
  };

  const handleDescargarPDF = async () => {
    try {
      const token = Cookies.get("practicum_token") || "";
      
      const res = await fetch(`http://127.0.0.1:8000/api/v1/cuadernillos/descargar-pdf/${rotacionId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Error al generar el PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `Evaluacion_${datos.alumno.nombre_completo.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (err: any) {
      alert("❌ Error al descargar el PDF: " + err.message);
    }
  };

  if (loading) return <div className="p-10 text-center text-ufv-azul font-bold animate-pulse">Cargando cuadernillo...</div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="bg-red-50 border border-red-200 p-8 rounded-3xl max-w-md text-center shadow-sm">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-red-900 font-bold text-xl mb-2">Error de carga</h2>
            <p className="text-red-700 mb-6 font-medium">{error}</p>
            <button onClick={() => router.push("/profesor/dashboard")} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-md">Volver al panel</button>
        </div>
    </div>
  );
  if (!datos) return null;

  const { alumno, molde } = datos;
  const totalCount = obtenerTotalPreguntas();
  
  // CAMBIO IMPORTANTE AQUÍ TAMBIÉN
  const respondidasCount = Object.values(respuestas).filter(
    r => (r.valor_sinon !== undefined && r.valor_sinon !== null) || 
         (r.valor_nivel !== undefined && r.valor_nivel !== null)
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
// ...
      
      {/* HEADER ADHERIDO CON LOGO Y BOTONES */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <button onClick={() => router.push("/profesor/dashboard")} className="text-sm text-gray-500 hover:text-ufv-azul flex items-center gap-1 mb-4 font-bold transition-colors">
              <ChevronLeft className="w-4 h-4" /> Volver al panel
            </button>
            
            <div className="flex items-center gap-3 mb-1">
              <Image src="/logo-ufv.png" alt="UFV" width={32} height={32} className="object-contain" />
              <span className="text-[10px] font-bold text-ufv-rosa-oscuro uppercase tracking-widest">Universidad Francisco de Vitoria</span>
            </div>

            <h1 className="text-2xl font-black text-ufv-azul-oscuro leading-tight">{alumno.nombre_completo}</h1>
            <p className="text-xs text-gray-500 font-bold mt-1 uppercase tracking-widest">{molde.titulo_rotacion} • {alumno.curso}º Curso</p>
          </div>
          
          <div className="flex items-center gap-5">
            {/* CONTADOR DE PROGRESO */}
            {!esSoloLectura && (
              <div className="hidden md:flex flex-col items-end mr-2 shrink-0">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progreso</span>
                <span className={`text-lg font-black ${respondidasCount === totalCount ? 'text-green-600' : 'text-ufv-azul'}`}>
                  {respondidasCount} / {totalCount}
                </span>
              </div>
            )}

            {/* CONTENEDOR DE BOTONES (Forzamos una sola línea sin wrap) */}
            <div className="flex items-center gap-3">
              {!esSoloLectura && (
                <>
                  <button 
                    onClick={handleGuardarBorrador}
                    disabled={guardando || finalizando}
                    className="whitespace-nowrap bg-white border-2 border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:border-ufv-azul hover:text-ufv-azul transition-all disabled:opacity-50"
                  >
                    {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {guardando ? "..." : "Guardar Borrador"}
                  </button>

                  <button 
                    onClick={handleFinalizarRotacion}
                    disabled={guardando || finalizando}
                    className="whitespace-nowrap bg-ufv-azul text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-ufv-azul-oscuro shadow-md active:scale-95 transition-all disabled:opacity-50"
                  >
                    {finalizando ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckSquare className="w-5 h-5" />}
                    {finalizando ? "..." : "Finalizar Evaluación"}
                  </button>
                </>
              )}

              {esSoloLectura && (
                <>
                  <div className="whitespace-nowrap bg-amber-50 text-amber-700 px-5 py-2.5 rounded-xl font-bold border border-amber-200 flex items-center gap-2 shadow-sm">
                    <Lock className="w-5 h-5" />
                    Acta Cerrada
                  </div>

                  <button 
                    onClick={handleDescargarPDF}
                    className="whitespace-nowrap bg-ufv-azul-oscuro text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-ufv-azul shadow-md transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    Descargar PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        
        {/* BLOQUE 0: SÍ / NO (NICs) */}
        <section className={`bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-gray-200 transition-opacity ${esSoloLectura ? 'opacity-80' : ''}`}>
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-ufv-azul">
                <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-ufv-azul-oscuro">
              {molde.bloque_sinon.titulo}
            </h2>
          </div>

          <div className="space-y-4">
            {molde.bloque_sinon.elementos.map((item: any) => {
              const respuestaPrevia = respuestas[item.id];
              return (
                <div key={item.id} className="p-5 bg-gray-50/50 rounded-2xl border border-gray-100 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:bg-white transition-colors">
                  <span className="font-bold text-gray-700 flex-grow leading-snug">{item.texto}</span>
                  <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm shrink-0">
                    <button 
                        disabled={esSoloLectura}
                        onClick={() => handleCambioRespuesta(item.id, 0, 'valor_sinon', true)}
                        className={`px-5 py-2 rounded-lg font-black text-xs transition-all ${respuestaPrevia?.valor_sinon === true ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        SÍ
                    </button>
                    <button 
                        disabled={esSoloLectura}
                        onClick={() => handleCambioRespuesta(item.id, 0, 'valor_sinon', false)}
                        className={`px-5 py-2 rounded-lg font-black text-xs transition-all ${respuestaPrevia?.valor_sinon === false ? 'bg-red-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        NO
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* BLOQUES 1-7: NIVELES Y COMPETENCIAS */}
        {molde.apartados.map((apartado: any) => (
          <section key={apartado.numero} className={`bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-gray-200 transition-opacity ${esSoloLectura ? 'opacity-80' : ''}`}>
            
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center font-black text-ufv-azul text-xl border border-blue-100">
                    {apartado.numero}
                </div>
                <h2 className="text-2xl font-black text-ufv-azul-oscuro">{apartado.titulo}</h2>
            </div>

            {/* GUÍA DE CALIFICACIÓN (Leyenda) */}
            <div className="mb-10 p-5 bg-gray-50 rounded-2xl border border-gray-200">
              <h4 className="text-[10px] font-black text-ufv-azul uppercase tracking-widest mb-3">Guía de calificación - Escala ECOEnf</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(n => (
                    <div key={n} className="flex gap-3 items-start">
                        <span className="w-6 h-6 rounded-lg bg-ufv-azul text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                        <p className="text-xs text-gray-600 font-medium leading-relaxed">{molde.niveles[n.toString()]}</p>
                    </div>
                ))}
              </div>
            </div>

            {/* PREGUNTAS (Resultados de Aprendizaje) */}
            <div className="space-y-6">
              {apartado.elementos.map((item: any) => {
                const respuestaPrevia = respuestas[item.id];
                return (
                  <div key={item.id} className="group pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                    <p className="font-bold text-gray-800 mb-4 leading-relaxed text-lg group-hover:text-ufv-azul transition-colors">{item.texto}</p>
                    
                    {/* BOTONES DE NIVEL */}
                    <div className="flex flex-wrap gap-3">
                      {[1, 2, 3].map(num => (
                        <button
                            key={num}
                            disabled={esSoloLectura}
                            onClick={() => handleCambioRespuesta(item.id, apartado.numero, 'valor_nivel', num)}
                            className={`flex-1 min-w-[120px] py-4 rounded-xl border-2 font-black text-sm transition-all flex items-center justify-center gap-2 ${
                                respuestaPrevia?.valor_nivel === num 
                                ? 'border-ufv-azul bg-ufv-azul text-white shadow-lg shadow-blue-900/20 scale-[1.02]' 
                                : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300'
                            }`}
                        >
                          Nivel {num}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TEXTAREA OBSERVACIONES GLOBAL DEL APARTADO */}
            {(() => {
                const idComentario = `comentario_apartado_${apartado.numero}`;
                const respuestaPrevia = respuestas[idComentario];
                return (
                    <div className="mt-8 pt-8 border-t border-gray-200">
                        <label className="block text-sm font-bold text-ufv-azul-oscuro mb-3">Observaciones del Apartado {apartado.numero} (Opcional)</label>
                        <textarea 
                            placeholder={esSoloLectura ? "Sin observaciones registradas." : "Añadir un comentario general sobre este bloque de competencias..."}
                            disabled={esSoloLectura}
                            onChange={(e) => handleCambioRespuesta(idComentario, apartado.numero, 'comentario', e.target.value)}
                            value={respuestaPrevia?.comentario || ""}
                            className={`w-full border-2 rounded-xl p-4 text-sm focus:outline-none transition-all ${
                                esSoloLectura 
                                ? 'border-transparent bg-gray-50 text-gray-600 italic font-medium' 
                                : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-ufv-azul focus:bg-white hover:border-gray-300 font-medium'
                            }`}
                            rows={3}
                        />
                    </div>
                );
            })()}

          </section>
        ))}
      </main>
    </div>
  );
}