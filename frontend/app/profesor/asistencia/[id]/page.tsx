"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { 
  ChevronLeft, 
  ChevronRight,
  CalendarDays, 
  MapPin, 
  MapPinOff, 
  AlertCircle,
  ExternalLink,
  LogOut,
  LogIn
} from "lucide-react";

interface Fichaje {
  id: string;
  fecha: string;
  hora_entrada: string | null;
  ubicacion_entrada_permitida: boolean;
  latitud_entrada: string | null;
  longitud_entrada: string | null;
  
  hora_salida: string | null;
  ubicacion_salida_permitida: boolean;
  latitud_salida: string | null;
  longitud_salida: string | null;
}

export default function CalendarioAsistenciaProfesor() {
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
      const res = await fetch(`http://127.0.0.1:8000/api/v1/profesores/asistencia/${rotacionId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Error al cargar el registro de asistencia.");
      
      const data: Fichaje[] = await res.json();
      setFichajes(data);

      if (data.length > 0) {
        setDiaSeleccionado(data[0].fecha);
        setFechaBase(new Date(data[0].fecha));
      }

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
  
  // Ajuste para que la semana empiece en Lunes
  const offsetDias = primerDiaMes === 0 ? 6 : primerDiaMes - 1; 

  const cambiarMes = (direccion: number) => {
    setFechaBase(new Date(añoActual, mesActual + direccion, 1));
  };

  const fichajesDict = fichajes.reduce((acc, fichaje) => {
    acc[fichaje.fecha] = fichaje;
    return acc;
  }, {} as Record<string, Fichaje>);

  const getFormatFecha = (dia: number) => {
    return `${añoActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  };

  const formatoMes = fechaBase.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  
  const formatearFechaLarga = (fechaStr: string) => {
    return new Date(fechaStr).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  };

  const formatearHora = (horaStr: string | null | undefined) => {
        // 1. Si es null o undefined, cortamos por lo sano y devolvemos "--:--"
        if (!horaStr) return "--:--";
        
        // 2. Si llega aquí, TypeScript ya sabe al 100% que es un texto seguro
        try {
        return horaStr.split('T')[1].substring(0, 5);
        } catch (e) {
        return "--:--";
        }
    }; 
  const BotonMapa = ({ permitida, lat, lng }: { permitida: boolean, lat: string | null, lng: string | null }) => {
    if (permitida && lat && lng) {
      return (
        <a 
          href={`http://googleusercontent.com/maps.google.com/?q=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-white text-indigo-600 px-3 py-2 rounded-xl font-bold border border-indigo-100 hover:bg-indigo-50 transition-colors shadow-sm text-xs"
        >
          <MapPin className="w-4 h-4" /> Ver Mapa <ExternalLink className="w-3 h-3 opacity-50" />
        </a>
      );
    }
    return (
      <div className="flex items-center justify-center gap-1.5 bg-slate-100 text-slate-400 px-3 py-2 rounded-xl font-bold border border-slate-200 text-xs cursor-not-allowed">
        <MapPinOff className="w-4 h-4" /> Sin GPS
      </div>
    );
  };

  const fichajeActivo = diaSeleccionado ? fichajesDict[diaSeleccionado] : null;

  if (loading) return <div className="p-10 text-center text-indigo-600 font-bold animate-pulse">Cargando registros...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto pb-20">
        
        <button 
          onClick={() => router.push("/profesor/dashboard")}
          className="mb-6 text-slate-500 hover:text-indigo-600 font-medium flex items-center gap-2 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Volver al Panel de Alumnos
        </button>

        <div className="bg-white shadow-sm rounded-3xl p-6 border border-slate-200 mb-8 flex items-center gap-4">
          <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600 shrink-0">
            <CalendarDays className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Control de Asistencia</h1>
            <p className="text-slate-500 font-medium mt-1">Selecciona un día en el calendario para ver los detalles.</p>
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 font-bold">{error}</div>
        ) : fichajes.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
            <h2 className="text-xl font-bold text-slate-700">Sin registros</h2>
            <p className="text-slate-500 mt-2">El alumno aún no ha fichado en esta rotación.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2 bg-white rounded-[2rem] p-6 md:p-8 border border-slate-200 shadow-sm">
              
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-slate-800">{formatoMes}</h2>
                <div className="flex gap-2">
                  <button onClick={() => cambiarMes(-1)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                  <button onClick={() => cambiarMes(1)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"><ChevronRight className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dia => (
                  <div key={dia} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{dia}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2 md:gap-3">
                {Array.from({ length: offsetDias }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-12 md:h-16 rounded-xl bg-slate-50/50 border border-slate-50"></div>
                ))}
                
                {Array.from({ length: diasEnMes }).map((_, i) => {
                  const diaNum = i + 1;
                  const fechaString = getFormatFecha(diaNum);
                  const tieneFichaje = !!fichajesDict[fechaString];
                  const esSeleccionado = diaSeleccionado === fechaString;

                  return (
                    <button 
                      key={diaNum}
                      onClick={() => tieneFichaje && setDiaSeleccionado(fechaString)}
                      disabled={!tieneFichaje}
                      className={`
                        relative h-12 md:h-16 rounded-xl md:rounded-2xl border flex flex-col items-center justify-center transition-all
                        ${tieneFichaje ? 'cursor-pointer hover:border-indigo-300' : 'cursor-default bg-slate-200 border-slate-300 text-slate-500'}
                        ${esSeleccionado ? 'bg-indigo-600 border-indigo-600 text-white shadow-md transform scale-105 z-10' : tieneFichaje ? 'bg-white border-slate-200 text-slate-700 font-bold' : ''}
                      `}
                    >
                      <span className="text-sm md:text-base">{diaNum}</span>
                      
                      {tieneFichaje && !esSeleccionado && (
                        <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                      )}
                      {tieneFichaje && esSeleccionado && (
                        <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-white opacity-80"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-1">
              {fichajeActivo ? (
                <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm sticky top-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="border-b border-slate-100 pb-4 mb-6">
                    <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-1">Detalles de la jornada</p>
                    <h3 className="font-extrabold text-slate-800 text-lg leading-tight">
                      {formatearFechaLarga(fichajeActivo.fecha)}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Entrada Registrada</p>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><LogIn className="w-5 h-5" /></div>
                        <span className="text-2xl font-black text-slate-800">
                          {formatearHora(fichajeActivo.hora_entrada)}
                        </span>
                      </div>
                      <BotonMapa permitida={fichajeActivo.ubicacion_entrada_permitida} lat={fichajeActivo.latitud_entrada} lng={fichajeActivo.longitud_entrada} />
                    </div>

                    <div className={`rounded-2xl p-4 border ${fichajeActivo.hora_salida ? 'bg-rose-50/50 border-rose-100' : 'bg-slate-50 border-slate-100 border-dashed'}`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${fichajeActivo.hora_salida ? 'text-rose-600' : 'text-slate-400'}`}>Salida Registrada</p>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${fichajeActivo.hora_salida ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-300'}`}><LogOut className="w-5 h-5" /></div>
                        <span className={`text-2xl font-black ${fichajeActivo.hora_salida ? 'text-slate-800' : 'text-slate-300'}`}>
                          {formatearHora(fichajeActivo.hora_salida)}
                        </span>
                      </div>
                      {fichajeActivo.hora_salida ? (
                        <BotonMapa permitida={fichajeActivo.ubicacion_salida_permitida} lat={fichajeActivo.latitud_salida} lng={fichajeActivo.longitud_salida} />
                      ) : (
                         <div className="text-center bg-slate-100 text-slate-500 py-2 rounded-xl text-xs font-bold border border-slate-200">
                           Fichaje pendiente
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[2rem] p-10 flex flex-col items-center justify-center h-full text-center sticky top-8">
                  <CalendarDays className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">Haz clic en un día del calendario que tenga un puntito para ver a qué hora fichó el alumno.</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}