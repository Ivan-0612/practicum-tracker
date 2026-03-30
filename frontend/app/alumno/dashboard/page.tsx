"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { BookOpen, LogOut, Folder, Lock, CheckCircle, Clock, Users, MapPin, Loader2, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AlumnoDashboard() {
  const router = useRouter();
  const [datos, setDatos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fichando, setFichando] = useState<{ id: string, tipo: string } | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch("http://127.0.0.1:8000/api/v1/alumnos/mi-perfil-evaluacion", { 
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setDatos(data);
    } catch (error) {
      console.error("Error al cargar dashboard", error);
    } finally { 
      setLoading(false); 
    }
  };

const handleFichar = async (rotacionId: string, tipo: "entrada" | "salida") => {
    // 1. AVISO LEGAL Y CONTROL MANUAL DEL USUARIO (RGPD)
    const quiereUbicacion = window.confirm(
      `Vas a registrar tu ${tipo.toUpperCase()}.\n\nPara validar tu asistencia correctamente, se recomienda adjuntar tu ubicación GPS actual. Esta ubicación solo será visible para tus tutores asignados y el administrador.\n\n¿Deseas incluir tu ubicación en este fichaje?`
    );

    setFichando({ id: rotacionId, tipo });

    const enviarFichaje = async (ubicacionPermitida: boolean, lat?: string, lng?: string) => {
      try {
        const token = Cookies.get("practicum_token");
        const res = await fetch("http://127.0.0.1:8000/api/v1/alumnos/fichar", {
          method: "POST",
          headers: { 
            "Authorization": `Bearer ${token}`, 
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({ 
            rotacion_id: rotacionId, 
            tipo, 
            ubicacion_permitida: ubicacionPermitida, 
            latitud: lat || null, 
            longitud: lng || null 
          })
        });

        if (res.ok) {
          alert(`✅ Fichaje de ${tipo.toUpperCase()} registrado ${ubicacionPermitida ? 'CON' : 'SIN'} ubicación.`);
          cargarDatos(); // Recargamos para bloquear el botón instantáneamente
        } else {
          const err = await res.json();
          alert("Error: " + err.detail);
        }
      } catch (error) {
        alert("Error de conexión al intentar fichar.");
      } finally { 
        setFichando(null); 
      }
    };

    // 2. LÓGICA DE UBICACIÓN BASADA EN SU RESPUESTA
    if (quiereUbicacion) {
      // Si dijo que SÍ, llamamos al GPS del navegador
      // (Si el navegador ya tiene permisos, lo cogerá directo. Si no, sacará su ventanita nativa)
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => enviarFichaje(true, pos.coords.latitude.toString(), pos.coords.longitude.toString()),
          (error) => {
            // Si dijo que sí en nuestra app, pero el navegador lo tiene bloqueado en el candado:
            alert("⚠️ Tienes la ubicación bloqueada en tu navegador. Tu fichaje se guardará SIN ubicación.");
            enviarFichaje(false);
          },
          { timeout: 10000 }
        );
      } else {
        enviarFichaje(false);
      }
    } else {
      // Si dijo que NO en nuestro mensaje legal, ni siquiera molestamos al GPS del navegador
      enviarFichaje(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-indigo-600 font-bold animate-pulse">Cargando tu expediente...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* NAVEGACIÓN */}
      <nav className="bg-white border-b px-8 py-4 flex justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-800">Practicum<span className="text-indigo-600">Alumno</span></span>
        </div>
        <button 
          onClick={() => { Cookies.remove("practicum_token"); router.push("/login"); }} 
          className="text-slate-500 hover:text-red-600 font-medium flex items-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4"/> Salir
        </button>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Hola, {datos?.alumno.nombre} 👋</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datos?.rotaciones.map((rot: any) => {
            const yaFichoEntrada = rot.estado_fichaje_hoy?.entrada;
            const yaFichoSalida = rot.estado_fichaje_hoy?.salida;

            return (
              <div key={rot.id} className="relative bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
                
                {/* ZONA SUPERIOR: INFO DE ROTACIÓN */}
                <div onClick={() => router.push(`/alumno/evaluar/${rot.id}`)} className="cursor-pointer group mb-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`p-4 rounded-xl transition-colors ${rot.completada ? 'bg-green-50 group-hover:bg-green-100' : 'bg-amber-50 group-hover:bg-amber-100'}`}>
                      <Folder className={`w-6 h-6 ${rot.completada ? 'text-green-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        Rotación {rot.numero}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">{rot.curso}º Curso</p>
                    </div>
                  </div>

                  {/* ZONA TUTORES RECUPERADA */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                      <Users className="w-3 h-3" /> Tutores Asignados
                    </div>
                    {rot.tutores?.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {rot.tutores.map((t: string, idx: number) => (
                          <span key={idx} className="text-sm font-medium text-indigo-700 truncate block">{t}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400 italic">Sin asignar</span>
                    )}
                  </div>
                </div>

                {/* ZONA INFERIOR: CONTROL DIARIO Y FICHAJE */}
                <div className="mt-auto pt-5 border-t border-slate-100">
                  {rot.completada ? (
                     <div className="flex items-center justify-center gap-2 text-sm font-bold text-green-600 bg-green-50 px-4 py-3 rounded-xl">
                       <CheckCircle className="w-5 h-5" /> ROTACIÓN FINALIZADA
                     </div>
                  ) : (
                    <>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Control de Asistencia Diario</p>
                      
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {/* BOTÓN ENTRADA */}
                        <button
                          onClick={() => handleFichar(rot.id, "entrada")}
                          disabled={yaFichoEntrada || fichando?.id === rot.id}
                          className={`py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all ${yaFichoEntrada ? 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 hover:shadow-sm'}`}
                        >
                          {fichando?.id === rot.id && fichando?.tipo === "entrada" ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                          <span className="text-xs">{yaFichoEntrada ? "Entrada Fichada" : "Fichar Entrada"}</span>
                        </button>

                        {/* BOTÓN SALIDA */}
                        <button
                          onClick={() => handleFichar(rot.id, "salida")}
                          disabled={!yaFichoEntrada || yaFichoSalida || fichando?.id === rot.id}
                          className={`py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all ${(!yaFichoEntrada || yaFichoSalida) ? 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 hover:shadow-sm'}`}
                        >
                           {fichando?.id === rot.id && fichando?.tipo === "salida" ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                          <span className="text-xs">{yaFichoSalida ? "Salida Fichada" : "Fichar Salida"}</span>
                        </button>
                      </div>

                      {/* BOTÓN VER CALENDARIO */}
                      <button 
                        onClick={() => router.push(`/alumno/asistencia/${rot.id}`)}
                        className="w-full mt-2 py-2.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center gap-2 transition-colors"
                      >
                        <CalendarDays className="w-4 h-4" /> Ver mi calendario
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}