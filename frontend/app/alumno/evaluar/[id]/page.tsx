"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import { ChevronLeft, CheckCircle2, Lock, Users, Info, Clock, AlertTriangle, Download } from "lucide-react";

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

  const { molde, borrador, rotacion_completada, tutores } = datos;

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-8">
      <div className="max-w-4xl mx-auto pb-10 md:pb-20">
        
        {/* BOTÓN VOLVER */}
        <button 
          onClick={() => router.push("/alumno/dashboard")}
          className="mb-4 md:mb-6 text-gray-500 hover:text-ufv-azul font-bold flex items-center gap-2 transition-colors text-sm md:text-base"
        >
          <ChevronLeft className="w-4 h-4" /> Volver a Mis Rotaciones
        </button>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="bg-ufv-blanco shadow-xl rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-10 border-t-4 border-ufv-azul mb-8">
          
          {/* CABECERA CORPORATIVA Y ESTADO */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 gap-6 border-b border-gray-100 pb-6 md:pb-8">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="shrink-0">
                <Image 
                  src="/logo-ufv.png" 
                  alt="Logo UFV" 
                  width={48} 
                  height={48} 
                  className="object-contain md:w-[56px] md:h-[56px]" 
                />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-black text-ufv-azul-oscuro leading-tight">Registro de Seguimiento</h1>
                <p className="text-[10px] md:text-xs font-bold text-ufv-rosa-oscuro uppercase tracking-widest mt-1">
                  Universidad Francisco de Vitoria
                </p>
                <p className="text-[10px] md:text-xs text-gray-500 font-bold mt-1 uppercase tracking-widest">{datos.especialidad} (Rotación {datos.alumno.numero_rotacion}) • {datos.alumno.curso}º Curso</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
              {rotacion_completada ? (
                <>
                  <div className="whitespace-nowrap bg-green-50 text-green-700 px-4 md:px-5 py-2.5 rounded-xl md:rounded-2xl font-bold border border-green-200 flex items-center justify-center gap-2 shadow-sm text-sm md:text-base">
                    <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> Evaluación Finalizada
                  </div>
                  
                  <button 
                    onClick={handleDescargarPDF}
                    className="whitespace-nowrap bg-ufv-azul-oscuro text-white px-4 md:px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-ufv-azul shadow-md transition-all active:scale-95 text-sm md:text-base"
                  >
                    <Download className="w-4 h-4 md:w-5 md:h-5" />
                    Descargar PDF
                  </button>
                </>
              ) : (
                <div className="bg-blue-50 text-ufv-azul px-4 md:px-5 py-2.5 rounded-xl md:rounded-2xl font-bold border border-blue-100 flex items-center justify-center gap-2 shadow-sm text-sm md:text-base">
                  <Lock className="w-4 h-4 md:w-5 md:h-5" /> Evaluación en Curso
                </div>
              )}
            </div>
          </div>

          {!rotacion_completada ? (
            <div className="text-center py-8 md:py-10 space-y-4 md:space-y-6">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-gray-50 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 md:w-10 md:h-10 text-gray-400" />
              </div>
              <div className="space-y-2 md:space-y-3">
                <h2 className="text-lg md:text-2xl font-black text-ufv-azul-oscuro">Calificaciones ocultas</h2>
                <p className="text-sm md:text-base text-gray-500 max-w-md mx-auto font-medium leading-relaxed px-2">
                  Tu profesor está cumplimentando el cuadernillo de seguimiento. 
                  Los resultados serán visibles de forma oficial una vez que la evaluación haya sido cerrada y firmada.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-ufv-azul rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest mt-2">
                <AlertTriangle className="w-3 h-3 md:w-4 md:h-4" /> Los borradores son privados
              </div>
            </div>
          ) : (
            <div className="space-y-8 md:space-y-10">
              
              {/* BANNER DE TUTORES */}
              <div className="bg-ufv-azul-oscuro rounded-2xl md:rounded-3xl p-5 md:p-8 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-5 relative overflow-hidden">
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
                        <span key={idx} className="bg-white/10 px-3 md:px-4 py-1 rounded-lg md:rounded-xl text-xs md:text-sm font-bold border border-white/20 shadow-sm backdrop-blur-sm truncate max-w-full">
                          {email}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs md:text-sm italic opacity-70">Pendiente de asignación de tutores</span>
                    )}
                  </div>
                </div>
              </div>

              {/* SECCIÓN SÍ / NO */}
              <section className="bg-gray-50 rounded-2xl md:rounded-3xl p-4 md:p-8 border border-gray-100">
                <h2 className="text-lg md:text-2xl font-black text-ufv-azul-oscuro mb-4 md:mb-6">{molde.bloque_sinon.titulo}</h2>
                <div className="space-y-2 md:space-y-3">
                  {molde.bloque_sinon.elementos.map((item: any) => {
                    const valor = borrador[item.id]?.valor_sinon;
                    return (
                      <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-4 bg-white rounded-xl md:rounded-2xl border border-gray-200 shadow-sm gap-3 sm:gap-4">
                        <span className="text-sm md:text-base text-gray-700 font-bold leading-tight flex-1">{item.texto}</span>
                        <div className={`shrink-0 px-4 md:px-6 py-1.5 md:py-2 rounded-lg md:rounded-xl font-black text-[10px] md:text-xs uppercase tracking-wider self-end sm:self-center ${valor === true ? 'bg-green-100 text-green-700 border border-green-200' : valor === false ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                          {valor === true ? "SÍ" : valor === false ? "NO" : "Sin evaluar"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* SECCIÓN COMPETENCIAS POR NIVELES */}
              {molde.apartados.map((apartado: any) => {
                const comentarioApartado = borrador[`comentario_apartado_${apartado.numero}`]?.comentario;

                return (
                  <section key={apartado.numero} className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 border border-gray-200 shadow-sm">
                    
                    <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-ufv-azul rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg md:text-xl border border-blue-100 shrink-0">
                        {apartado.numero}
                      </div>
                      <h2 className="text-lg md:text-2xl font-black text-ufv-azul-oscuro leading-tight">{apartado.titulo}</h2>
                    </div>

                    <div className="space-y-6 md:space-y-8">
                      {apartado.elementos.map((item: any) => {
                        const nivelAlcanzado = borrador[item.id]?.valor_nivel;
                        return (
                          <div key={item.id} className="group pb-5 md:pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                            <p className="text-sm md:text-lg text-gray-800 font-bold mb-4 leading-relaxed">{item.texto}</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                              {[1, 2, 3].map(n => (
                                <div 
                                  key={n} 
                                  className={`py-2.5 md:py-4 rounded-xl md:rounded-2xl text-center text-xs md:text-sm font-black border-2 transition-all ${
                                    nivelAlcanzado === n 
                                      ? 'bg-ufv-azul border-ufv-azul text-white shadow-md md:shadow-lg md:shadow-blue-900/20 md:scale-[1.02]' 
                                      : 'bg-gray-50 border-gray-100 text-gray-400'
                                  }`}
                                >
                                  NIVEL {n}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {comentarioApartado && (
                      <div className="mt-5 md:mt-6 flex gap-3 md:gap-4 p-4 md:p-6 bg-pink-50/50 rounded-xl md:rounded-2xl border border-pink-100 relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 md:w-1.5 bg-ufv-rosa-claro"></div>
                        <Info className="w-5 h-5 md:w-6 md:h-6 text-ufv-rosa-oscuro shrink-0" />
                        <div>
                          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-ufv-rosa-oscuro mb-1 md:mb-2 block">
                            Observaciones Generales (Apartado {apartado.numero})
                          </span>
                          <p className="italic text-sm md:text-base text-gray-700 font-medium leading-relaxed">
                            "{comentarioApartado}"
                          </p>
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}