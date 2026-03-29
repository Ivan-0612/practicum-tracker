"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { ChevronLeft, Save, CheckCircle2, Loader2, CheckSquare } from "lucide-react";

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
      
      // --- NUEVO: SI EL BACKEND NOS MANDA UN BORRADOR, LO CARGAMOS EN EL ESTADO ---
      if (data.borrador && Object.keys(data.borrador).length > 0) {
        setRespuestas(data.borrador);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCambioRespuesta = (elemento_id: string, bloque: number, campo: string, valor: any) => {
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

  const handleGuardarBorrador = async () => {
    setGuardando(true);
    try {
      const token = Cookies.get("practicum_token");
      const listaRespuestas = Object.values(respuestas);
      
      if (listaRespuestas.length > 0) {
        const res = await fetch(`http://127.0.0.1:8000/api/v1/cuadernillos/guardar/${rotacionId}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(listaRespuestas)
        });
        if (!res.ok) throw new Error("Error al guardar el borrador");
      }
      alert("✅ Borrador guardado correctamente");
    } catch (err: any) {
      alert("❌ " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleFinalizarRotacion = async () => {
    const confirmar = window.confirm(
      "¿Estás seguro de que quieres FINALIZAR esta evaluación?\n\nUna vez finalizada, ya no podrás modificar las notas y el alumno podrá ver los resultados finales."
    );
    if (!confirmar) return;

    setFinalizando(true);
    try {
      const token = Cookies.get("practicum_token");
      const listaRespuestas = Object.values(respuestas);
      
      if (listaRespuestas.length > 0) {
        const resGuardar = await fetch(`http://127.0.0.1:8000/api/v1/cuadernillos/guardar/${rotacionId}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(listaRespuestas)
        });
        if (!resGuardar.ok) throw new Error("Error al guardar las últimas notas.");
      }

      const resFinalizar = await fetch(`http://127.0.0.1:8000/api/v1/cuadernillos/finalizar/${rotacionId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!resFinalizar.ok) throw new Error("Error al intentar finalizar la rotación.");

      alert("🎉 Evaluación finalizada y cerrada con éxito.");
      router.push("/profesor/dashboard");

    } catch (err: any) {
      alert("❌ " + err.message);
      setFinalizando(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-indigo-600 font-bold animate-pulse">Cargando cuadernillo dinámico...</div>;
  if (error) return <div className="p-10 text-center text-red-600 font-bold bg-red-50 m-10 rounded-xl border border-red-200">{error}</div>;
  if (!datos) return null;

  const { alumno, molde } = datos;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button onClick={() => router.push("/profesor/dashboard")} className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-1 font-medium">
              <ChevronLeft className="w-4 h-4" /> Volver al panel
            </button>
            <h1 className="text-xl font-bold text-slate-900">{alumno.nombre_completo}</h1>
            <p className="text-sm text-slate-500">{molde.titulo_rotacion} • {alumno.curso}º Curso</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={handleGuardarBorrador}
              disabled={guardando || finalizando}
              className={`bg-white border-2 border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all hover:bg-slate-50 hover:border-slate-300`}
            >
              {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar Borrador
            </button>

            <button 
              onClick={handleFinalizarRotacion}
              disabled={guardando || finalizando}
              className={`bg-green-600 border border-green-700 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md hover:bg-green-700 hover:shadow-lg`}
            >
              {finalizando ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckSquare className="w-5 h-5" />}
              {finalizando ? "Cerrando acta..." : "Finalizar Rotación"}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* BLOQUE 0: SÍ / NO */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-indigo-600" />
            {molde.bloque_sinon.titulo}
          </h2>
          <div className="space-y-6">
            {molde.bloque_sinon.elementos.map((item: any) => {
              // --- NUEVO: Extraemos la respuesta previa si existe ---
              const respuestaPrevia = respuestas[item.id];
              return (
                <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <span className="font-medium text-slate-700 flex-grow">{item.texto}</span>
                  <div className="flex gap-4 shrink-0 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-green-50 rounded-md cursor-pointer transition-colors">
                      <input type="radio" name={`radio_${item.id}`} 
                        onChange={() => handleCambioRespuesta(item.id, 0, 'valor_sinon', true)}
                        checked={respuestaPrevia?.valor_sinon === true} // <-- NUEVO: Pone el check si estaba guardado
                        className="w-4 h-4 text-green-600 focus:ring-green-500" />
                      <span className="text-sm font-semibold text-slate-700">SÍ</span>
                    </label>
                    <div className="w-px bg-slate-200"></div>
                    <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 rounded-md cursor-pointer transition-colors">
                      <input type="radio" name={`radio_${item.id}`} 
                        onChange={() => handleCambioRespuesta(item.id, 0, 'valor_sinon', false)}
                        checked={respuestaPrevia?.valor_sinon === false} // <-- NUEVO: Pone el check si estaba guardado
                        className="w-4 h-4 text-red-600 focus:ring-red-500" />
                      <span className="text-sm font-semibold text-slate-700">NO</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* BLOQUES 1-7: NIVELES */}
        {molde.apartados.map((apartado: any) => (
          <section key={apartado.numero} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Apartado {apartado.numero}: {apartado.titulo}</h2>
            <div className="mb-6 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-sm">
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 text-indigo-800">
                <li><span className="font-bold">1:</span> {molde.niveles["1"]}</li>
                <li><span className="font-bold">2:</span> {molde.niveles["2"]}</li>
                <li><span className="font-bold">3:</span> {molde.niveles["3"]}</li>
              </ul>
            </div>

            <div className="space-y-4">
              {apartado.elementos.map((item: any) => {
                // --- NUEVO: Extraemos la respuesta previa si existe ---
                const respuestaPrevia = respuestas[item.id];
                return (
                  <div key={item.id} className="p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <p className="font-medium text-slate-800 mb-4">{item.texto}</p>
                    <div className="flex flex-wrap gap-4">
                      {[1, 2, 3].map(num => (
                        <label key={num} className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 px-4 py-2 rounded-lg hover:border-indigo-400 hover:shadow-sm transition-all">
                          <input type="radio" name={`radio_${item.id}`} 
                            onChange={() => handleCambioRespuesta(item.id, apartado.numero, 'valor_nivel', num)}
                            checked={respuestaPrevia?.valor_nivel === num} // <-- NUEVO: Pone el check si estaba guardado
                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm font-semibold text-slate-700">Nivel {num}</span>
                        </label>
                      ))}
                    </div>
                    <textarea 
                      placeholder="Comentario opcional sobre este punto..."
                      onChange={(e) => handleCambioRespuesta(item.id, apartado.numero, 'comentario', e.target.value)}
                      value={respuestaPrevia?.comentario || ""} // <-- NUEVO: Pone el texto si estaba guardado
                      className="mt-3 w-full border border-slate-200 rounded-lg p-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      rows={1}
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