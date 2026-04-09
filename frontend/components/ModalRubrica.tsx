"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { X, BookOpen, FileJson, AlertCircle, Tag, Clapperboard, Loader2 } from "lucide-react";

interface ModalRubricaProps {
  isOpen: boolean;
  onClose: () => void;
  especialidadNombre: string;
  moldeEspecialidad: any; 
  especialidadesDisponibles: Array<{
    nombre: string;
    especialidadId?: string;
    rotacionId?: string;
  }>;
  especialidadInicial?: string;
}

// --- COMPONENTE INTERNO: EL RENDERIZADOR OFICIAL (COPIADO DEL ADMIN) ---
const RenderizadorEvaluacionCompacta = ({ data }: { data: any }) => {
  if (!data || !data.apartados) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-900 p-5 rounded-2xl text-sm font-medium flex items-center gap-3">
        <AlertCircle className="w-6 h-6 text-amber-500" />
        <div>
          <p className="font-bold">Estructura JSON no reconocida.</p>
          <p className="text-xs opacity-80">No se encontraron los 'apartados' esperados.</p>
        </div>
      </div>
    );
  }

  const nivelesKeys = data.niveles ? Object.keys(data.niveles).sort() : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Cabecera del Molde */}
      <div className="bg-ufv-azul-oscuro p-5 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-10 -top-10 opacity-10"><FileJson className="w-40 h-40" /></div>
        <div className="relative z-10">
          <div className="flex gap-2 mb-2">
            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Versión {data.version}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Curso {data.curso_academico}</span>
          </div>
          <h2 className="text-xl font-black">{data.titulo_rotacion}</h2>
          <p className="text-sm text-blue-100 font-medium mt-1">Curso {data.curso}º - Rotación {data.rotacion}</p>
        </div>
      </div>

      {/* Leyenda/Niveles */}
      {data.niveles && (
        <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl">
          <h3 className="text-xs font-black text-ufv-azul uppercase tracking-widest mb-3 flex items-center gap-2"><Tag className="w-4 h-4" /> Leyenda de Evaluación</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(data.niveles).map(([key, descripcion]) => (
              <div key={key} className="bg-white p-3 rounded-xl border border-blue-100/50 shadow-sm flex items-start gap-3">
                <div className="bg-ufv-azul text-white font-black w-6 h-6 rounded flex items-center justify-center shrink-0 text-sm">{key}</div>
                <p className="text-[11px] text-gray-600 font-medium leading-snug">{String(descripcion)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bloque NIC (Actividades) */}
      {data.bloque_sinon && data.bloque_sinon.elementos && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 border-b border-gray-200 p-3 px-4"><h3 className="text-sm font-black text-gray-800">{data.bloque_sinon.titulo}</h3></div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 max-h-64 overflow-y-auto bg-gray-50/30">
            {data.bloque_sinon.elementos.map((item: any) => (
              <div key={item.id} className="flex items-start gap-2 group">
                <div className="w-4 h-4 rounded border border-gray-300 mt-0.5 shrink-0 bg-white group-hover:border-ufv-azul transition-colors"></div>
                <span className="text-[11px] text-gray-600 font-medium leading-tight group-hover:text-gray-900 transition-colors">{item.texto}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Apartados/Competencias */}
      <div className="space-y-4">
        {data.apartados.map((apartado: any) => (
          <div key={apartado.numero} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 p-3 px-4 flex items-center gap-3">
              <div className="bg-ufv-azul-oscuro text-white text-xs font-black rounded-full w-6 h-6 flex items-center justify-center shrink-0">{apartado.numero}</div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide">{apartado.titulo}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {apartado.elementos.map((elemento: any, idx: number) => (
                <div key={elemento.id} className="p-3 px-4 flex flex-col md:flex-row gap-4 items-start md:items-center hover:bg-blue-50/30 transition-colors">
                  <p className="text-xs text-gray-700 font-medium leading-relaxed flex-1"><span className="text-gray-400 font-bold mr-2">{idx + 1}.</span>{elemento.texto}</p>
                  <div className="flex gap-1.5 shrink-0 self-end md:self-auto">
                    {nivelesKeys.map(nivel => (
                      <div key={nivel} className="w-8 h-8 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400">{nivel}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ModalRubrica({
  isOpen,
  onClose,
  especialidadNombre,
  moldeEspecialidad,
  especialidadesDisponibles,
  especialidadInicial,
}: ModalRubricaProps) {
  const [activeTab, setActiveTab] = useState<"pdf" | "molde">("pdf");
  const [selectedEspecialidad, setSelectedEspecialidad] = useState<string | null>(null);
  const [moldeActual, setMoldeActual] = useState<any>(moldeEspecialidad || null);
  const [nombreActual, setNombreActual] = useState(especialidadNombre);
  const [isLoadingMolde, setIsLoadingMolde] = useState(false);
  const [errorMolde, setErrorMolde] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const especialidadPorDefecto = especialidadNombre || null;
    const inicial = especialidadInicial || especialidadPorDefecto || especialidadesDisponibles[0]?.nombre || null;
    const seleccionInicial = especialidadesDisponibles.find((especialidad) => especialidad.nombre === inicial) || especialidadesDisponibles[0] || null;

    if (seleccionInicial) {
      setSelectedEspecialidad(seleccionInicial.nombre);
      void cargarMolde(seleccionInicial.nombre, seleccionInicial.especialidadId, seleccionInicial.rotacionId);
      return;
    }
    setMoldeActual(moldeEspecialidad || null);
    setNombreActual(especialidadNombre);
  }, [isOpen, especialidadInicial, especialidadNombre, especialidadesDisponibles, moldeEspecialidad]);

  const cargarMolde = async (nombre: string, especialidadId?: string, rotacionId?: string) => {
    try {
      setIsLoadingMolde(true);
      setErrorMolde("");
      const token = Cookies.get("practicum_token");
      const endpoint = especialidadId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/cuadernillos/molde-especialidad/${especialidadId}`
        : rotacionId
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/cuadernillos/molde/${rotacionId}`
          : null;

      if (!endpoint) {
        throw new Error("No hay identificador para cargar la especialidad");
      }

      const res = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error("No se pudo cargar la rúbrica");
      }

      const data = await res.json();
      setMoldeActual(data.molde);
      setNombreActual(nombre);
      setSelectedEspecialidad(nombre);
    } catch (error) {
      setErrorMolde("No se pudo cargar la especialidad seleccionada.");
      setMoldeActual(null);
    } finally {
      setIsLoadingMolde(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 shrink-0">
          <div>
            <h3 className="text-xl font-black text-ufv-azul-oscuro flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-ufv-rosa-oscuro" /> Manual de Evaluación
            </h3>
            <p className="text-sm text-gray-500 font-bold mt-1">Especialidad: {especialidadNombre || "Cargando..."}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-white border border-gray-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-gray-200 bg-white shrink-0 px-6 pt-4">
          <button onClick={() => setActiveTab("pdf")} className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === "pdf" ? "border-ufv-azul text-ufv-azul" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}><BookOpen className="w-4 h-4" /> Criterios ECOEnf (PDF)</button>
          <button onClick={() => setActiveTab("molde")} className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === "molde" ? "border-ufv-azul text-ufv-azul" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}><Clapperboard className="w-4 h-4" /> Vista Previa Especialidad</button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto flex-grow bg-gray-50">
          {activeTab === "pdf" && (
            <div className="h-full w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-200">
              {/* SUSTITUYE ESTE SRC CON TU URL DE SUPABASE */}
              <iframe 
                src={`${process.env.NEXT_PUBLIC_SUPABASE_PDF_URL}#toolbar=0`}
                className="w-full h-full min-h-[600px]"
                title="Manual PDF"
              />
            </div>
          )}

          {activeTab === "molde" && (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4 max-w-6xl mx-auto">
              <aside className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 lg:sticky lg:top-0 h-fit">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-blue-50 text-ufv-azul p-2 rounded-xl"><Clapperboard className="w-4 h-4" /></div>
                  <div>
                    <h4 className="text-sm font-black text-gray-800">Especialidades</h4>
                    <p className="text-[11px] text-gray-500 font-medium">Selecciona una para ver su rúbrica</p>
                  </div>
                </div>

                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                  {especialidadesDisponibles.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 font-medium bg-gray-50 rounded-xl border border-gray-100">
                      No hay especialidades disponibles con los filtros actuales.
                    </div>
                  ) : (
                    especialidadesDisponibles.map((especialidad) => {
                      const isActive = especialidad.nombre === selectedEspecialidad;
                      return (
                        <button
                          key={`${especialidad.nombre}-${especialidad.especialidadId || especialidad.rotacionId || "sin-id"}`}
                          onClick={() => void cargarMolde(especialidad.nombre, especialidad.especialidadId, especialidad.rotacionId)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${isActive ? "bg-blue-50 border-blue-200 text-ufv-azul" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                        >
                          <div className="font-bold text-sm truncate">{especialidad.nombre}</div>
                          <div className="text-[11px] text-gray-500 truncate">Especialidad clínica</div>
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>

              <section className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div>
                      <h4 className="text-lg font-black text-ufv-azul-oscuro">Vista Previa Especialidad</h4>
                      <p className="text-sm text-gray-500 font-medium">{nombreActual || "Selecciona una especialidad"}</p>
                    </div>
                  </div>

                  {isLoadingMolde ? (
                    <div className="flex justify-center items-center min-h-[260px] text-gray-500 font-medium gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-ufv-azul" />
                      Cargando rúbrica...
                    </div>
                  ) : errorMolde ? (
                    <div className="p-8 text-center text-gray-500 font-bold bg-gray-50 rounded-2xl border border-gray-200">
                      <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      {errorMolde}
                    </div>
                  ) : moldeActual ? (
                    <RenderizadorEvaluacionCompacta data={moldeActual} />
                  ) : (
                    <div className="p-8 text-center text-gray-500 font-bold bg-gray-50 rounded-2xl border border-gray-200">
                      <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      No se pudo cargar el diseño de esta especialidad.
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}