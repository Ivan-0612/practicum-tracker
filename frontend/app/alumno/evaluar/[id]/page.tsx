"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
// He añadido Clock y AlertTriangle para el estado de espera
import { ChevronLeft, CheckCircle2, Lock, Users, Info, Clock, AlertTriangle } from "lucide-react";

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
      const res = await fetch(`http://127.0.0.1:8000/api/v1/cuadernillos/molde/${rotacionId}`, {
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

  if (loading) return <div className="p-10 text-center text-indigo-600 font-bold animate-pulse">Cargando evaluación...</div>;
  if (error) return <div className="p-10 text-center text-red-600 bg-red-50 m-10 rounded-xl border border-red-200">{error}</div>;

  const { alumno, molde, borrador, rotacion_completada, tutores } = datos;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* HEADER - Se mantiene para que el alumno pueda volver atrás */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <button onClick={() => router.push("/alumno/dashboard")} className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-1 font-medium transition-colors">
              <ChevronLeft className="w-4 h-4" /> Mis Rotaciones
            </button>
            <h1 className="text-xl font-bold text-slate-900">Registro de Seguimiento</h1>
            <p className="text-sm text-slate-500">{molde.titulo_rotacion}</p>
          </div>
          
          {rotacion_completada ? (
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold border border-green-200 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Evaluación Finalizada
            </div>
          ) : (
            <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl font-bold border border-amber-200 flex items-center gap-2">
              <Lock className="w-5 h-5" /> En curso
            </div>
          )}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        
        {/* LÓGICA DE PRIVACIDAD: Si no está completada, mostramos pantalla de espera */}
        {!rotacion_completada ? (
          <div className="bg-white rounded-[2.5rem] p-12 text-center border border-slate-200 shadow-sm space-y-6">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800">Evaluación en proceso</h2>
              <p className="text-slate-500 max-w-md mx-auto">
                Tu profesor está cumplimentando el cuadernillo de seguimiento. 
                Los resultados serán visibles una vez que la evaluación se haya finalizado oficialmente.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-400 uppercase tracking-widest">
              <AlertTriangle className="w-4 h-4" /> Los borradores son privados
            </div>
          </div>
        ) : (
          <>
            {/* TODO EL CONTENIDO RESTANTE (Banner de tutores, Sí/No, Niveles) 
                Solo se renderiza si rotacion_completada === true */}
            
            <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg flex items-start gap-5">
              <div className="bg-white/20 p-4 rounded-2xl">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">Evaluado por:</h2>
                <div className="flex flex-wrap gap-2">
                  {tutores && tutores.length > 0 ? (
                    tutores.map((email: string, idx: number) => (
                      <span key={idx} className="bg-white/10 px-3 py-1 rounded-lg text-sm font-semibold border border-white/20">
                        {email}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm italic opacity-70">Pendiente de asignación de tutores</span>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN SÍ / NO */}
            <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">{molde.bloque_sinon.titulo}</h2>
              <div className="space-y-3">
                {molde.bloque_sinon.elementos.map((item: any) => {
                  const valor = borrador[item.id]?.valor_sinon;
                  return (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-slate-700 font-medium leading-tight max-w-[70%]">{item.texto}</span>
                      <div className={`px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider ${valor === true ? 'bg-green-500 text-white' : valor === false ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {valor === true ? "SÍ" : valor === false ? "NO" : "Sin evaluar"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* SECCIÓN COMPETENCIAS POR NIVELES */}
            {molde.apartados.map((apartado: any) => (
              <section key={apartado.numero} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-6 border-l-4 border-indigo-500 pl-4">
                  {apartado.titulo}
                </h2>
                <div className="space-y-10">
                  {apartado.elementos.map((item: any) => {
                    const nivelAlcanzado = borrador[item.id]?.valor_nivel;
                    const comentario = borrador[item.id]?.comentario;
                    return (
                      <div key={item.id} className="group">
                        <p className="text-slate-800 font-semibold mb-4 leading-relaxed">{item.texto}</p>
                        <div className="grid grid-cols-3 gap-3">
                          {[1, 2, 3].map(n => (
                            <div key={n} className={`py-3 rounded-xl text-center text-xs font-bold border-2 transition-all ${nivelAlcanzado === n ? 'bg-indigo-600 border-indigo-600 text-white shadow-md ring-4 ring-indigo-100' : 'bg-white border-slate-100 text-slate-300'}`}>
                              NIVEL {n}
                            </div>
                          ))}
                        </div>
                        {comentario && (
                          <div className="mt-4 flex gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-sm text-slate-600">
                            <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                            <p>"{comentario}"</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </>
        )}
      </main>
    </div>
  );
}