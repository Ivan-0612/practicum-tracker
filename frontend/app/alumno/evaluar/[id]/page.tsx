"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { ChevronLeft, CheckCircle2, Lock, Users, Info, Clock, AlertTriangle, Download, Mail } from "lucide-react";

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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4">
        <div className="w-10 h-10 border-2 border-ufv-azul border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Cargando rúbrica...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Error de carga</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <button onClick={() => router.push("/alumno/dashboard")} className="px-6 py-2.5 bg-ufv-azul text-white font-bold rounded-xl shadow-md">
          Volver al Dashboard
        </button>
      </div>
    );
  }

  const { molde, borrador, rotacion_completada, tutores, tutor_hospital_email, evaluado_por_email, evaluado_por_rol, alumno, especialidad } = datos;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-32">
      
      {/* CABECERA FLOTANTE SUPERIOR */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm px-4 py-4 md:px-8 flex items-center justify-between">
        <button onClick={() => router.push("/alumno/dashboard")} className="flex items-center gap-2 text-gray-500 hover:text-ufv-azul transition-colors font-bold text-sm md:text-base">
          <ChevronLeft className="w-5 h-5" /> <span className="hidden md:inline">Volver a mis rotaciones</span>
        </button>

        <div className="flex items-center gap-3">
          {rotacion_completada ? (
            <>
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 md:px-4 py-2 rounded-lg font-bold text-xs md:text-sm border border-green-200">
                <Lock className="w-4 h-4" /> Acta Cerrada
              </div>
              <button
                onClick={handleDescargarPDF}
                className="flex items-center gap-2 bg-ufv-azul-oscuro text-white px-3 md:px-4 py-2 rounded-lg font-bold text-xs md:text-sm border border-ufv-azul-oscuro hover:bg-ufv-azul transition-all shadow-sm"
              >
                <Download className="w-4 h-4" /> Descargar PDF
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 md:px-4 py-2 rounded-lg font-bold text-xs md:text-sm border border-amber-200">
              <Clock className="w-4 h-4" /> En Proceso
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 mt-4 md:mt-8">
        {/* INFO DEL ALUMNO */}
        <div className="mb-8 md:mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-ufv-rosa-oscuro text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
              Rotación {alumno.numero_rotacion}
            </span>
            <span className="text-gray-500 font-bold text-sm">{alumno.curso}º Enfermería</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-black text-ufv-azul-oscuro tracking-tight mb-2">{alumno.nombre_completo}</h1>
          <p className="text-sm md:text-base text-gray-500 font-medium">
            Especialidad: <span className="text-gray-800 font-bold">{especialidad}</span>
          </p>
          <p className="text-sm md:text-base text-gray-500 font-medium mt-1 flex items-center gap-2">
            <Mail className="w-4 h-4" /> {alumno.email}
          </p>
        </div>
        
        {!rotacion_completada ? (
            
          /* VISTA: EVALUACIÓN EN CURSO (Oculta) */
          <section className="bg-white p-8 md:p-16 rounded-2xl md:rounded-3xl shadow-md border border-gray-100 text-center">
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
            <div className="bg-ufv-azul-oscuro rounded-2xl md:rounded-3xl p-5 md:p-8 text-white shadow-md flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-5 relative overflow-hidden mb-8 md:mb-12">
              <div className="absolute -right-4 -top-4 opacity-10 pointer-events-none hidden md:block">
                <Users className="w-40 h-40" />
              </div>
              
              <div className="bg-white/10 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10 z-10">
                <Users className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="z-10 w-full">
                <h2 className="text-[10px] md:text-[11px] font-black text-ufv-azul-claro uppercase tracking-widest mb-2">Evaluado y Firmado por:</h2>
                <div className="flex flex-wrap items-center gap-3">
                  {evaluado_por_email ? (
                    <>
                      <span className="bg-white/10 px-3 md:px-4 py-1.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold border border-white/20 shadow-sm backdrop-blur-sm truncate max-w-full">
                        {evaluado_por_email}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                        evaluado_por_rol === 'campo' 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}>
                        {evaluado_por_rol === 'campo' ? 'Tutor de Campo' : 'Tutor Clínico'}
                      </span>
                    </>
                  ) : tutor_hospital_email ? (
                    <span className="bg-white/10 px-3 md:px-4 py-1.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold border border-white/20 shadow-sm backdrop-blur-sm truncate max-w-full">
                      {tutor_hospital_email}
                    </span>
                  ) : (
                    <span className="text-xs md:text-sm italic opacity-70">Tutor no especificado</span>
                  )}
                </div>
              </div>
            </div>

            {/* BLOQUE 0: SÍ / NO (NICs) */}
            <section className="bg-white rounded-2xl md:rounded-3xl shadow-md border border-gray-100 overflow-hidden mb-8 md:mb-12">
              <div className="bg-ufv-azul-oscuro p-4 md:p-6">
                <h2 className="text-white text-lg md:text-xl font-black">Actividades Específicas (NIC)</h2>
                <p className="text-blue-200 text-xs md:text-sm mt-1">{molde.bloque_sinon.titulo}</p>
              </div>

              <div className="p-4 md:p-6 divide-y divide-gray-100">
                {molde.bloque_sinon.elementos.map((item: any) => {
                  const valorPrevia = borrador[item.id]?.valor_sinon;
                  return (
                    <div key={item.id} className="py-4 md:py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-8">
                      <p className="text-sm md:text-base text-gray-700 font-medium leading-relaxed flex-1">{item.texto}</p>
                      <div className="flex bg-gray-100 rounded-lg p-1 shrink-0 w-full md:w-auto">
                        <button 
                            disabled
                            className={`flex-1 md:w-20 py-2 rounded-md font-bold text-xs md:text-sm transition-all ${valorPrevia === true ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 bg-transparent'}`}
                        >
                            SÍ
                        </button>
                        <button 
                            disabled
                            className={`flex-1 md:w-20 py-2 rounded-md font-bold text-xs md:text-sm transition-all ${valorPrevia === false ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 bg-transparent'}`}
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
              <section key={apartado.numero} className="bg-white rounded-2xl md:rounded-3xl shadow-md border border-gray-100 p-4 md:p-8 mb-8 md:mb-12">
                
                <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8 border-b border-gray-100 pb-4">
                    <div className="bg-ufv-azul-claro text-white font-black text-lg md:text-2xl w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                        {apartado.numero}
                    </div>
                    <h2 className="text-base md:text-xl font-black text-gray-800 leading-tight">{apartado.titulo}</h2>
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

                {/* PREGUNTAS (Resultados de Aprendizaje) */}
                <div className="space-y-6">
                  {apartado.elementos.map((item: any, idx: number) => {
                    const nivelPrevia = borrador[item.id]?.valor_nivel;
                    return (
                      <div key={item.id} className="bg-gray-50/50 border border-gray-100 rounded-xl p-4 md:p-6 transition-all">
                        <div className="flex flex-col md:flex-row gap-4 md:gap-6 justify-between items-start">
                          <p className="text-sm md:text-base text-gray-700 font-medium leading-relaxed flex-1">
                            <span className="font-bold text-ufv-azul mr-2">{idx + 1}.</span>{item.texto}
                          </p>
                        
                          <div className="flex gap-2 w-full md:w-auto shrink-0 justify-between md:justify-start">
                            {[1, 2, 3].map(num => (
                              <button
                                  key={num}
                                  disabled
                                  className={`w-12 h-10 md:w-14 md:h-12 rounded-lg font-black text-sm md:text-base transition-all border ${
                                      nivelPrevia === num 
                                      ? 'bg-ufv-azul text-white border-ufv-azul shadow-md transform scale-105' 
                                      : 'bg-white text-gray-400 border-gray-200'
                                  }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
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
                          <div className="w-full border-2 border-transparent bg-gray-50 text-gray-600 rounded-xl p-4 text-sm italic font-medium">
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