"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import { ChevronLeft, CheckCircle2, Lock, Users, Info, Clock, AlertTriangle, Download, Mail, CheckSquare, Eye } from "lucide-react";

export default function VistaEvaluacionAlumno() {
  const params = useParams();
  const router = useRouter();
  const rotacionId = params.id as string;

  const [datos, setDatos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarEvaluacion();
  }, [rotacionId]);

  const cargarEvaluacion = async () => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cuadernillos/molde/${rotacionId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("No se pudo cargar la evaluación.");
      
      const data = await res.json();
      setDatos(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDescargarPDF = async () => {
    try {
      const token = Cookies.get("practicum_token") || "";
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cuadernillos/descargar-pdf/${rotacionId}`, {
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

  if (loading) return <div className="p-10 text-center text-ufv-azul font-bold animate-pulse">Cargando evaluación...</div>;
  if (error) return <div className="p-10 text-center text-red-600 bg-red-50 m-4 md:m-10 rounded-xl border border-red-200 font-bold">{error}</div>;

  const { molde, borrador, rotacion_completada, tutores, alumno, especialidad } = datos;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* HEADER ADHERIDO CON LOGO Y BOTONES (Estilo Profesor) */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div>
            <button onClick={() => router.push("/alumno/dashboard")} className="text-xs md:text-sm text-gray-500 hover:text-ufv-azul flex items-center gap-1 mb-3 md:mb-4 font-bold transition-colors">
              <ChevronLeft className="w-4 h-4" /> Volver a mis rotaciones
            </button>
            
            <div className="flex items-center gap-2 md:gap-3 mb-1">
              <Image src="/logo-ufv.png" alt="UFV" width={28} height={28} className="object-contain md:w-[32px] md:h-[32px]" />
              <span className="text-[9px] md:text-[10px] font-bold text-ufv-rosa-oscuro uppercase tracking-widest">Universidad Francisco de Vitoria</span>
            </div>

            <h1 className="text-xl md:text-2xl font-black text-ufv-azul-oscuro leading-tight mb-1.5">{alumno.nombre_completo}</h1>
            
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-bold text-gray-600 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-gray-400" /> {alumno.email}
              </p>
              <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest">
                {especialidad} (Rotación {alumno.numero_rotacion}) • {alumno.curso}º Curso
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-5 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-gray-100">
            {/* CONTENEDOR DE ESTADOS Y BOTONES */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 w-full md:w-auto">
              
              {rotacion_completada ? (
                <>
                  <div className="w-full sm:w-auto sm:whitespace-nowrap bg-green-50 text-green-700 px-5 py-2.5 rounded-xl font-bold border border-green-200 flex items-center justify-center gap-2 shadow-sm text-sm md:text-base">
                    <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                    Acta Cerrada
                  </div>

                  <button 
                    onClick={handleDescargarPDF}
                    className="w-full sm:w-auto sm:whitespace-nowrap bg-ufv-azul-oscuro text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-ufv-azul shadow-md transition-all active:scale-95 text-sm md:text-base"
                  >
                    <Download className="w-4 h-4 md:w-5 md:h-5" />
                    Descargar PDF
                  </button>
                </>
              ) : (
                <div className="w-full sm:w-auto sm:whitespace-nowrap bg-amber-50 text-amber-700 px-5 py-2.5 rounded-xl font-bold border border-amber-200 flex items-center justify-center gap-2 shadow-sm text-sm md:text-base">
                  <Lock className="w-4 h-4 md:w-5 md:h-5" />
                  Evaluación en Curso
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-6 md:py-8 space-y-6 md:space-y-8">
        
        {!rotacion_completada ? (
            
          /* VISTA: EVALUACIÓN EN CURSO (Oculta) */
          <section className="bg-white p-8 md:p-16 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-200 text-center">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-blue-50 border-2 border-dashed border-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 md:w-10 md:h-10 text-ufv-azul opacity-70" />
            </div>
            <div className="space-y-3">
              <h2 className="text-xl md:text-2xl font-black text-ufv-azul-oscuro">Calificaciones ocultas</h2>
              <p className="text-sm md:text-base text-gray-500 max-w-md mx-auto font-medium leading-relaxed">
                Tu profesor está cumplimentando el cuadernillo de seguimiento. 
                Los resultados serán visibles de forma oficial una vez que la evaluación haya sido cerrada y firmada.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest mt-8 border border-amber-200">
              <AlertTriangle className="w-3 h-3 md:w-4 md:h-4" /> Los borradores son privados
            </div>
          </section>

        ) : (

          /* VISTA: EVALUACIÓN COMPLETADA (Rúbrica visible) */
          <>
            {/* BANNER DE TUTORES */}
            <div className="bg-ufv-azul-oscuro rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-5 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10 pointer-events-none hidden md:block">
                <Users className="w-40 h-40" />
              </div>
              
              <div className="bg-white/10 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10 z-10">
                <Users className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="z-10 w-full">
                <h2 className="text-[10px] md:text-[11px] font-black text-ufv-azul-claro uppercase tracking-widest mb-2">Evaluado y Firmado por:</h2>
                <div className="flex flex-wrap gap-2">
                  {tutores && tutores.length > 0 ? (
                    tutores.map((email: string, idx: number) => (
                      <span key={idx} className="bg-white/10 px-3 md:px-4 py-1.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold border border-white/20 shadow-sm backdrop-blur-sm truncate max-w-full">
                        {email}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs md:text-sm italic opacity-70">Tutor no especificado</span>
                  )}
                </div>
              </div>
            </div>

            {/* BLOQUE 0: SÍ / NO (NICs) */}
            <section className="bg-white p-4 md:p-10 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-200 opacity-90">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 mb-6 md:mb-8 pb-4 md:pb-6 border-b border-gray-100">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center text-ufv-azul shrink-0">
                    <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-ufv-azul-oscuro">
                  {molde.bloque_sinon.titulo}
                </h2>
              </div>

              <div className="space-y-3 md:space-y-4">
                {molde.bloque_sinon.elementos.map((item: any) => {
                  const valorPrevia = borrador[item.id]?.valor_sinon;
                  return (
                    <div key={item.id} className="p-4 md:p-5 bg-gray-50/50 rounded-xl md:rounded-2xl border border-gray-100 flex flex-col sm:flex-row gap-3 md:gap-4 items-start sm:items-center justify-between">
                      <span className="font-bold text-sm md:text-base text-gray-700 flex-grow leading-snug">{item.texto}</span>
                      <div className="flex gap-2 bg-white p-1 md:p-1.5 rounded-lg md:rounded-xl border border-gray-200 shadow-sm shrink-0 w-full sm:w-auto justify-center">
                        <button 
                            disabled
                            className={`flex-1 sm:flex-none px-4 md:px-5 py-2 rounded-md md:rounded-lg font-black text-xs transition-all ${valorPrevia === true ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 bg-gray-50'}`}
                        >
                            SÍ
                        </button>
                        <button 
                            disabled
                            className={`flex-1 sm:flex-none px-4 md:px-5 py-2 rounded-md md:rounded-lg font-black text-xs transition-all ${valorPrevia === false ? 'bg-red-500 text-white shadow-md' : 'text-gray-400 bg-gray-50'}`}
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
              <section key={apartado.numero} className="bg-white p-4 md:p-10 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-200 opacity-90">
                
                <div className="flex items-center gap-3 md:gap-4 mb-5 md:mb-6">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-ufv-azul text-lg md:text-xl border border-blue-100 shrink-0">
                        {apartado.numero}
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-ufv-azul-oscuro leading-tight">{apartado.titulo}</h2>
                </div>

                {/* GUÍA DE CALIFICACIÓN (Leyenda) */}
                <div className="mb-6 md:mb-10 p-4 md:p-5 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-200">
                  <h4 className="text-[9px] md:text-[10px] font-black text-ufv-azul uppercase tracking-widest mb-3">Guía de calificación - Escala ECOEnf</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    {[1, 2, 3].map(n => (
                        <div key={n} className="flex gap-2 md:gap-3 items-start">
                            <span className="w-5 h-5 md:w-6 md:h-6 rounded-md md:rounded-lg bg-ufv-azul text-white text-[9px] md:text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                            <p className="text-[11px] md:text-xs text-gray-600 font-medium leading-relaxed">{molde.niveles[n.toString()]}</p>
                        </div>
                    ))}
                  </div>
                </div>

                {/* PREGUNTAS (Resultados de Aprendizaje) */}
                <div className="space-y-6">
                  {apartado.elementos.map((item: any) => {
                    const nivelPrevia = borrador[item.id]?.valor_nivel;
                    return (
                      <div key={item.id} className="pb-5 md:pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                        <p className="font-bold text-gray-800 text-sm md:text-lg mb-3 md:mb-4 leading-relaxed">{item.texto}</p>
                        
                        {/* BOTONES DE NIVEL (Solo Lectura) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                          {[1, 2, 3].map(num => (
                            <button
                                key={num}
                                disabled
                                className={`py-3 md:py-4 rounded-xl border-2 font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
                                    nivelPrevia === num 
                                    ? 'border-ufv-azul bg-ufv-azul text-white shadow-md' 
                                    : 'border-gray-200 bg-gray-50 text-gray-400'
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

                {/* TEXTAREA OBSERVACIONES GLOBAL DEL APARTADO (Solo lectura) */}
                {(() => {
                    const idComentario = `comentario_apartado_${apartado.numero}`;
                    const comentarioPrevia = borrador[idComentario]?.comentario;
                    
                    if (!comentarioPrevia) return null; // Si no hay comentario, no lo mostramos en la vista final
                    
                    return (
                        <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-200">
                            <label className="block text-xs md:text-sm font-bold text-ufv-azul-oscuro mb-2 md:mb-3 flex items-center gap-2">
                              <Info className="w-4 h-4 text-ufv-azul" /> 
                              Observaciones del Apartado {apartado.numero}
                            </label>
                            <div className="w-full border-2 border-transparent bg-blue-50/50 rounded-xl p-4 text-sm text-gray-800 italic font-medium">
                                "{comentarioPrevia}"
                            </div>
                        </div>
                    );
                })()}

              </section>
            ))}
          </>
        )}
      </main>
    </div>
  );
}