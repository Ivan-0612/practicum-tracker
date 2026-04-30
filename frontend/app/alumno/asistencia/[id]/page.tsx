"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import { 
  ChevronLeft, 
  ChevronRight,
  CalendarDays, 
  CheckCircle2, 
  AlertCircle
} from "lucide-react";

// NUEVA INTERFAZ ADAPTADA AL SISTEMA DE FIRMAS
interface Fichaje {
  id: string;
  fecha: string;
  firmado_en: string;
  firmado_por: string;
  fecha_recuperada?: string;
}

export default function CalendarioAsistenciaAlumno() {
  const params = useParams();
  const router = useRouter();
  const rotacionId = params.id as string;

  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ESTADOS DEL CALENDARIO
  const [fechaBase, setFechaBase] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  useEffect(() => {
    cargarAsistencia();
  }, [rotacionId]);

  const cargarAsistencia = async () => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/alumnos/asistencia/${rotacionId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Error al cargar tu registro de asistencia.");
      
      const data = await res.json();
      setFichajes(data);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DEL CALENDARIO ---
  const añoActual = fechaBase.getFullYear();
  const mesActual = fechaBase.getMonth();

  const diasEnMes = new Date(añoActual, mesActual + 1, 0).getDate();
  const primerDiaMes = new Date(añoActual, mesActual, 1).getDay();
  const offsetDias = primerDiaMes === 0 ? 6 : primerDiaMes - 1; 

  const cambiarMes = (direccion: number) => {
    setFechaBase(new Date(añoActual, mesActual + direccion, 1));
  };

  // LIMPIAMOS LA FECHA IGUAL QUE EN EL PROFESOR PARA EVITAR ERRORES DE FORMATO
  const fichajesDict = fichajes.reduce((acc, f) => {
    if (f.fecha) {
        const fechaLimpia = String(f.fecha).split('T')[0].split(' ')[0];
        acc[fechaLimpia] = f;
    }
    return acc;
  }, {} as Record<string, Fichaje>);

  const getFormatFecha = (dia: number) => {
    return `${añoActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  };

  const formatoMes = fechaBase.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  const hoyStr = new Date().toLocaleDateString('en-CA');

  const fichajeActivo = diaSeleccionado ? fichajesDict[diaSeleccionado] : null;

  if (loading) return <div className="p-10 text-center text-ufv-azul font-bold animate-pulse">Cargando tu calendario...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto pb-20">
        
        {/* BOTÓN VOLVER */}
        <button 
          onClick={() => router.push("/alumno/dashboard")}
          className="mb-6 text-gray-500 hover:text-ufv-azul font-bold flex items-center gap-2 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Volver a mis rotaciones
        </button>

        {/* CABECERA CORPORATIVA Y CONTENEDOR PRINCIPAL */}
        <div className="bg-ufv-blanco shadow-xl rounded-3xl p-6 md:p-10 border-t-4 border-ufv-azul mb-8">
          
          <div className="flex flex-col md:flex-row items-start md:items-center mb-10 gap-6 border-b border-gray-100 pb-8">
            <Image 
              src="/logo-ufv.png" 
              alt="Logo UFV" 
              width={56} 
              height={56} 
              className="object-contain" 
            />
            <div>
              <h1 className="text-3xl font-black text-ufv-azul-oscuro">Mi Calendario de Asistencia</h1>
              <p className="text-xs font-bold text-ufv-rosa-oscuro uppercase tracking-widest mt-1">
                Universidad Francisco de Vitoria
              </p>
            </div>
          </div>

          {error ? (
            <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 font-bold flex items-center gap-2">
              <AlertCircle className="w-6 h-6" /> {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* ZONA CALENDARIO */}
              <div className="lg:col-span-2 bg-white rounded-[2rem] p-6 md:p-8 border border-gray-200 shadow-sm">
                
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-ufv-azul-oscuro">{formatoMes}</h2>
                  <div className="flex gap-2">
                    <button onClick={() => cambiarMes(-1)} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={() => cambiarMes(1)} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"><ChevronRight className="w-5 h-5" /></button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dia => (
                    <div key={dia} className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider">{dia}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2 md:gap-3">
                  {Array.from({ length: offsetDias }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-12 md:h-16 rounded-xl bg-gray-50/50 border border-gray-50"></div>
                  ))}
                  
                  {Array.from({ length: diasEnMes }).map((_, i) => {
                    const diaNum = i + 1;
                    const fechaString = getFormatFecha(diaNum);
                    const isSigned = !!fichajesDict[fechaString];
                    const isSelected = diaSeleccionado === fechaString;
                    const esFuturo = fechaString > hoyStr;

                    return (
                      <button 
                        key={diaNum}
                        onClick={() => { if (!esFuturo) setDiaSeleccionado(fechaString); }}
                        disabled={esFuturo}
                        className={`
                          relative h-12 md:h-16 rounded-xl md:rounded-2xl border flex flex-col items-center justify-center transition-all
                          ${esFuturo ? 'opacity-40 cursor-not-allowed bg-gray-50 border-transparent' : 'cursor-pointer hover:bg-gray-50'}
                          ${isSelected && !esFuturo ? 'bg-blue-50 border-ufv-azul ring-2 ring-ufv-azul/20 shadow-sm z-10' : ''}
                          ${isSigned ? 'border-green-200 bg-green-50/30 text-green-700' : (!esFuturo && !isSelected ? 'border-gray-200 bg-white text-gray-700' : '')}
                        `}
                      >
                        <span className={`text-sm md:text-base font-bold ${esFuturo ? 'text-gray-400' : ''}`}>{diaNum}</span>
                        
                        {isSigned && (
                          <div className={`absolute bottom-2 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-ufv-azul' : 'bg-green-500'}`}></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ZONA DETALLES FICHAJE ACTIVO */}
              <div className="lg:col-span-1">
                {diaSeleccionado ? (
                  <div className="bg-white rounded-[2rem] p-6 border border-gray-200 shadow-sm sticky top-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="border-b border-gray-100 pb-4 mb-6">
                      <p className="text-xs font-black text-ufv-azul uppercase tracking-widest mb-1">Detalles de la jornada</p>
                      <h3 className="font-extrabold text-ufv-azul-oscuro text-lg leading-tight capitalize">
                        {new Date(diaSeleccionado).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {fichajeActivo ? (
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                            <p className="font-black text-green-800 text-xl">Jornada Validada</p>
                            
                            {/* Mostrar si fue recuperada */}
                            {fichajeActivo.fecha_recuperada && (
                              <p className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-100 py-1.5 px-3 rounded-lg inline-block border border-emerald-200">
                                Recuperada el {new Date(fichajeActivo.fecha_recuperada).toLocaleDateString('es-ES')}
                              </p>
                            )}

                            <div className="mt-4 bg-white/60 p-3 rounded-xl border border-green-100/50">
                              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide mb-1">Firmado digitalmente por:</p>
                              <p className="text-sm font-bold text-green-900 truncate">{fichajeActivo.firmado_por}</p>
                              <p className="text-xs font-bold text-green-600 mt-2 uppercase tracking-wider">
                                  Sellado el: <br/> {new Date(fichajeActivo.firmado_en).toLocaleString('es-ES')}
                              </p>
                            </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center">
                            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="font-bold text-gray-600 text-lg">Sin firma</p>
                            <p className="text-sm font-medium text-gray-500 mt-2 leading-relaxed">
                                Tu tutor de prácticas clínicas aún no ha validado tu asistencia para este día.
                            </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-[2rem] p-10 flex flex-col items-center justify-center h-full text-center sticky top-8 min-h-[300px]">
                    <CalendarDays className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">Haz clic en un día del calendario para comprobar si ha sido validado por tu tutor del hospital.</p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}