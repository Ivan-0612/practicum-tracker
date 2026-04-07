"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import { ChevronLeft, ChevronRight, CalendarDays, CheckCircle2, AlertCircle, PenTool, Lock, Eye } from "lucide-react";

interface Fichaje { id: string; fecha: string; firmado_en: string; }

export default function CalendarioProfesor() {
  const params = useParams();
  const router = useRouter();
  const rotacionId = params.id as string;

  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [esTutorUni, setEsTutorUni] = useState(false);
  const [rotacionCerrada, setRotacionCerrada] = useState(false);
  const [loading, setLoading] = useState(true);
  const [firmando, setFirmando] = useState(false);
  const [error, setError] = useState("");

  const [fechaBase, setFechaBase] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  const hoyStr = new Date().toLocaleDateString('en-CA'); 

  useEffect(() => { cargarAsistencia(); }, [rotacionId]);

  const cargarAsistencia = async () => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/profesores/asistencia/${rotacionId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Error al cargar el registro.");
      
      const data = await res.json();
      setFichajes(data.registros || []);
      setEsTutorUni(data.es_tutor_universidad);
      setRotacionCerrada(data.rotacion_completada);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleFirmarDia = async () => {
    if (!diaSeleccionado || esTutorUni || rotacionCerrada) return;
    
    if (diaSeleccionado > hoyStr) {
        alert("⚠️ No puedes firmar un día que aún no ha pasado.");
        return;
    }

    setFirmando(true);
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/profesores/firmar-asistencia`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ rotacion_id: rotacionId, fecha: diaSeleccionado })
      });
      if (res.ok) {
        await cargarAsistencia();
        alert("✅ Jornada firmada correctamente.");
      } else {
        const err = await res.json();
        alert(`❌ ${err.detail}`);
      }
    } catch (error) { alert("Error de conexión."); } finally { setFirmando(false); }
  };

  const añoActual = fechaBase.getFullYear();
  const mesActual = fechaBase.getMonth();
  const diasEnMes = new Date(añoActual, mesActual + 1, 0).getDate();
  const offsetDias = (new Date(añoActual, mesActual, 1).getDay() + 6) % 7; 

  const fichajesDict = fichajes.reduce((acc, f) => { 
    if (f.fecha) {
        const fechaLimpia = f.fecha.split('T')[0].split(' ')[0];
        acc[fechaLimpia] = f; 
    }
    return acc; 
  }, {} as Record<string, Fichaje>);

  const getFormatFecha = (dia: number) => `${añoActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  
  const fichajeActivo = diaSeleccionado ? fichajesDict[diaSeleccionado] : null;

  if (loading) return <div className="p-10 text-center font-bold animate-pulse text-ufv-azul">Cargando calendario...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto pb-20">
        <button onClick={() => router.push("/profesor/dashboard")} className="mb-6 text-gray-500 font-bold flex items-center gap-2 hover:text-ufv-azul transition-colors">
          <ChevronLeft className="w-4 h-4" /> Volver al Panel
        </button>

        <div className="bg-ufv-blanco shadow-xl rounded-3xl p-6 md:p-10 border-t-4 border-ufv-azul">
          <div className="flex items-center gap-6 border-b border-gray-100 pb-8 mb-8">
            <Image src="/logo-ufv.png" alt="Logo UFV" width={56} height={56} className="object-contain" />
            <div>
              <h1 className="text-3xl font-black text-ufv-azul-oscuro">Control de Firmas</h1>
              <p className="text-xs font-bold text-ufv-rosa-oscuro uppercase mt-1">Universidad Francisco de Vitoria</p>
            </div>
          </div>

          {rotacionCerrada ? (
            <div className="mb-8 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-2xl flex items-center gap-4 font-bold shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
              <p>Evaluación Finalizada. El registro de asistencia está cerrado y solo se permite su visualización.</p>
            </div>
          ) : esTutorUni && (
            <div className="mb-8 bg-blue-50 border border-blue-200 text-ufv-azul px-6 py-4 rounded-2xl flex items-center gap-4 font-bold shadow-sm">
              <Eye className="w-6 h-6" />
              <p>Modo Lectura. Como Tutor de Universidad, tu función es supervisar las jornadas validadas por el Hospital.</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-[2rem] p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-ufv-azul-oscuro capitalize">{fechaBase.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h2>
                <div className="flex gap-2">
                  <button onClick={() => setFechaBase(new Date(añoActual, mesActual - 1, 1))} className="p-2 border rounded-xl hover:bg-gray-50 transition-colors"><ChevronLeft className="w-5 h-5"/></button>
                  <button onClick={() => setFechaBase(new Date(añoActual, mesActual + 1, 1))} className="p-2 border rounded-xl hover:bg-gray-50 transition-colors"><ChevronRight className="w-5 h-5"/></button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dia => <div key={dia} className="text-center text-xs font-bold text-gray-400">{dia}</div>)}
                {Array.from({ length: offsetDias }).map((_, i) => <div key={`empty-${i}`} className="h-14" />)}
                
                {Array.from({ length: diasEnMes }).map((_, i) => {
                  const fechaStr = getFormatFecha(i + 1);
                  const isSigned = !!fichajesDict[fechaStr];
                  const isSelected = diaSeleccionado === fechaStr;
                  const esFuturo = fechaStr > hoyStr;

                  // NUEVO: Bloqueo total para el tutor de universidad si el día no está firmado
                  const bloqueadoUni = esTutorUni && !isSigned;

                  return (
                    <button 
                      key={i} 
                      onClick={() => { if (!esFuturo && !bloqueadoUni) setDiaSeleccionado(fechaStr); }}
                      disabled={esFuturo || bloqueadoUni}
                      className={`h-14 rounded-xl border flex flex-col items-center justify-center transition-all 
                        ${esFuturo ? 'opacity-30 bg-gray-50 cursor-not-allowed border-transparent' : ''} 
                        ${bloqueadoUni && !esFuturo ? 'opacity-50 bg-gray-50/50 cursor-not-allowed border-transparent' : ''}
                        ${!esFuturo && !bloqueadoUni ? 'cursor-pointer hover:bg-gray-50 hover:border-gray-300' : ''}
                        ${isSelected && !esFuturo && !bloqueadoUni ? 'border-ufv-azul bg-blue-50 ring-2 ring-ufv-azul/20' : ''} 
                        ${isSigned ? 'border-green-200 bg-green-50/30' : (!esFuturo && !isSelected && !bloqueadoUni ? 'border-gray-200 bg-white' : '')}
                      `}
                    >
                      <span className={`font-bold ${isSigned ? 'text-green-700' : (esFuturo || bloqueadoUni ? 'text-gray-400' : 'text-gray-700')}`}>{i + 1}</span>
                      {isSigned && <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1"></div>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-1">
              {diaSeleccionado ? (
                <div className="bg-white rounded-[2rem] p-6 border border-gray-200 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Día seleccionado</p>
                  <h3 className="font-black text-ufv-azul-oscuro text-xl mb-6">{new Date(diaSeleccionado).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                  
                  {fichajeActivo ? (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
                      <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                      <p className="font-black text-green-800 text-lg">Jornada Validada</p>
                      <p className="text-[10px] font-bold text-green-600 mt-2 uppercase tracking-wide">Sello digital: {new Date(fichajeActivo.firmado_en).toLocaleString('es-ES')}</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-2xl p-5 text-center border border-dashed border-gray-200">
                      <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="font-bold text-gray-600">Sin firma registrada</p>
                      
                      {/* LÓGICA VISUAL ESTRICTA DEL BOTÓN */}
                      {esTutorUni ? (
                        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                          <Eye className="w-6 h-6 text-ufv-azul mx-auto mb-2" />
                          <p className="text-sm font-bold text-ufv-azul">Solo lectura</p>
                          <p className="text-xs text-blue-600 mt-1 leading-snug">El Tutor Clínico es el encargado de validar la asistencia.</p>
                        </div>
                      ) : diaSeleccionado > hoyStr ? (
                        <p className="mt-4 text-xs text-amber-600 font-bold bg-amber-50 p-3 rounded-xl border border-amber-100">No se puede firmar por adelantado</p>
                      ) : rotacionCerrada ? (
                        <p className="mt-4 text-xs text-gray-400 font-bold bg-gray-100 p-3 rounded-xl border border-gray-200">Modo lectura activo</p>
                      ) : (
                        <button onClick={handleFirmarDia} disabled={firmando} className="mt-4 w-full bg-ufv-azul text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-ufv-azul-oscuro active:scale-95 transition-all shadow-md">
                          {firmando ? <span className="animate-pulse">Procesando...</span> : <><PenTool className="w-4 h-4"/> Firmar Asistencia</>}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border-dashed border-2 border-gray-200 rounded-[2rem] p-8 text-center h-full flex flex-col justify-center min-h-[300px]">
                  <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">
                    {esTutorUni ? "Selecciona un día en verde para ver el sello de firma del Hospital." : "Selecciona un día en el calendario para ver los detalles o firmar."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}