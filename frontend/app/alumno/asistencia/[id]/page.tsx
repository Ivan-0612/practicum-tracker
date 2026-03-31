"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
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
    if (!horaStr) return "--:--";
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
          className="flex items-center justify-center gap-2 bg-blue-50 text-ufv-azul px-3 py-2 rounded-xl font-bold border border-blue-100 hover:bg-blue-100 transition-colors shadow-sm text-xs mt-2"
        >
          <MapPin className="w-4 h-4" /> Ver Mapa <ExternalLink className="w-3 h-3 opacity-50" />
        </a>
      );
    }
    return (
      <div className="flex items-center justify-center gap-1.5 bg-gray-100 text-gray-400 px-3 py-2 rounded-xl font-bold border border-gray-200 text-xs cursor-not-allowed mt-2">
        <MapPinOff className="w-4 h-4" /> Sin GPS
      </div>
    );
  };

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
          ) : fichajes.length === 0 ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-16 text-center">
              <h2 className="text-xl font-bold text-ufv-azul-oscuro">Aún no has fichado</h2>
              <p className="text-gray-500 mt-2 font-medium">Tus registros diarios aparecerán aquí cuando comiences tu rotación.</p>
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
                    const tieneFichaje = !!fichajesDict[fechaString];
                    const esSeleccionado = diaSeleccionado === fechaString;

                    return (
                      <button 
                        key={diaNum}
                        onClick={() => tieneFichaje && setDiaSeleccionado(fechaString)}
                        disabled={!tieneFichaje}
                        className={`
                          relative h-12 md:h-16 rounded-xl md:rounded-2xl border flex flex-col items-center justify-center transition-all
                          ${tieneFichaje ? 'cursor-pointer hover:border-ufv-azul-claro' : 'cursor-default bg-gray-100 border-gray-200 text-gray-400'}
                          ${esSeleccionado ? 'bg-ufv-azul border-ufv-azul text-ufv-blanco shadow-md transform scale-105 z-10' : tieneFichaje ? 'bg-white border-gray-200 text-gray-700 font-bold' : ''}
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

              {/* ZONA DETALLES FICHAJE ACTIVO */}
              <div className="lg:col-span-1">
                {fichajeActivo ? (
                  <div className="bg-white rounded-[2rem] p-6 border border-gray-200 shadow-sm sticky top-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="border-b border-gray-100 pb-4 mb-6">
                      <p className="text-xs font-black text-ufv-azul uppercase tracking-widest mb-1">Detalles de la jornada</p>
                      <h3 className="font-extrabold text-ufv-azul-oscuro text-lg leading-tight">
                        {formatearFechaLarga(fichajeActivo.fecha)}
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {/* ENTRADA */}
                      <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Entrada Registrada</p>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><LogIn className="w-5 h-5" /></div>
                          <span className="text-2xl font-black text-gray-800">
                            {formatearHora(fichajeActivo.hora_entrada)}
                          </span>
                        </div>
                        <BotonMapa permitida={fichajeActivo.ubicacion_entrada_permitida} lat={fichajeActivo.latitud_entrada} lng={fichajeActivo.longitud_entrada} />
                      </div>

                      {/* SALIDA */}
                      <div className={`rounded-2xl p-4 border ${fichajeActivo.hora_salida ? 'bg-rose-50/50 border-rose-100' : 'bg-gray-50 border-gray-200 border-dashed'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${fichajeActivo.hora_salida ? 'text-rose-600' : 'text-gray-400'}`}>Salida Registrada</p>
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg ${fichajeActivo.hora_salida ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-400'}`}><LogOut className="w-5 h-5" /></div>
                          <span className={`text-2xl font-black ${fichajeActivo.hora_salida ? 'text-gray-800' : 'text-gray-400'}`}>
                            {formatearHora(fichajeActivo.hora_salida)}
                          </span>
                        </div>
                        {fichajeActivo.hora_salida ? (
                          <BotonMapa permitida={fichajeActivo.ubicacion_salida_permitida} lat={fichajeActivo.latitud_salida} lng={fichajeActivo.longitud_salida} />
                        ) : (
                           <div className="text-center bg-gray-100 text-gray-500 py-2 rounded-xl text-xs font-bold border border-gray-200 mt-2">
                             Fichaje pendiente
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-[2rem] p-10 flex flex-col items-center justify-center h-full text-center sticky top-8">
                    <CalendarDays className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">Haz clic en un día del calendario que tenga un puntito para ver a qué hora fichaste.</p>
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