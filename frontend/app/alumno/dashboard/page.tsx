"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { BookOpen, LogOut, Folder, Lock, CheckCircle, Users, MapPin, Loader2, CalendarDays, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function AlumnoDashboard() {
  const router = useRouter();
  const [datos, setDatos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fichando, setFichando] = useState<{ id: string, tipo: string } | null>(null);

  // ESTADOS PARA CAMBIO DE CONTRASEÑA
  const [showPassModal, setShowPassModal] = useState(false);
  const [passFormData, setPassFormData] = useState({ actual: "", nueva: "", confirmar: "" });
  const [passStatus, setPassStatus] = useState({ type: "", msg: "" });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/alumnos/mi-perfil-evaluacion`, { 
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

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassStatus({ type: "info", msg: "Actualizando..." });

    if (passFormData.nueva !== passFormData.confirmar) {
      setPassStatus({ type: "error", msg: "Las contraseñas nuevas no coinciden." });
      return;
    }

    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/cambiar-password`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          password_actual: passFormData.actual,
          nueva_password: passFormData.nueva,
          confirmar_password: passFormData.confirmar
        })
      });

      const data = await res.json();

      if (res.ok) {
        setPassStatus({ type: "success", msg: "¡Contraseña actualizada con éxito!" });
        setTimeout(() => {
          setShowPassModal(false);
          setPassFormData({ actual: "", nueva: "", confirmar: "" });
          setPassStatus({ type: "", msg: "" });
        }, 2000);
      } else {
        setPassStatus({ type: "error", msg: data.detail || "Error al cambiar la contraseña." });
      }
    } catch (error) {
      setPassStatus({ type: "error", msg: "Error de conexión con el servidor." });
    }
  };

  const handleFichar = async (rotacionId: string, tipo: "entrada" | "salida") => {
    const quiereUbicacion = window.confirm(
      `Vas a registrar tu ${tipo.toUpperCase()}.\n\nPara validar tu asistencia correctamente, se recomienda adjuntar tu ubicación GPS actual. Esta ubicación solo será visible para tus tutores asignados y el administrador.\n\n¿Deseas incluir tu ubicación en este fichaje?`
    );

    setFichando({ id: rotacionId, tipo });

    const enviarFichaje = async (ubicacionPermitida: boolean, lat?: string, lng?: string) => {
      try {
        const token = Cookies.get("practicum_token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/alumnos/fichar`, {
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
          cargarDatos();
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

    if (quiereUbicacion) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => enviarFichaje(true, pos.coords.latitude.toString(), pos.coords.longitude.toString()),
          (error) => {
            alert("⚠️ Tienes la ubicación bloqueada en tu navegador. Tu fichaje se guardará SIN ubicación.");
            enviarFichaje(false);
          },
          { timeout: 10000 }
        );
      } else {
        enviarFichaje(false);
      }
    } else {
      enviarFichaje(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-ufv-azul font-bold animate-pulse">Cargando tu expediente...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto pb-20">
        
        {/* CABECERA CORPORATIVA Y ACCIONES */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex items-center gap-4">
            <Image 
              src="/logo-ufv.png" 
              alt="Logo UFV" 
              width={56} 
              height={56} 
              className="object-contain" 
            />
            <div>
              <h1 className="text-3xl font-black text-ufv-azul-oscuro">Portal del Alumno</h1>
              <p className="text-xs font-bold text-ufv-rosa-oscuro uppercase tracking-widest mt-1">
                Universidad Francisco de Vitoria
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setShowPassModal(true)}
              className="flex items-center gap-2 bg-white text-ufv-azul px-4 py-2.5 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
            >
              <Lock className="w-4 h-4"/> Cambiar Contraseña
            </button>
            <button 
              onClick={() => { Cookies.remove("practicum_token"); router.push("/login"); }} 
              className="flex items-center gap-2 bg-white text-red-600 px-4 py-2.5 rounded-xl font-bold border border-red-200 hover:bg-red-50 transition-all shadow-sm active:scale-95"
            >
              <LogOut className="w-4 h-4"/> Salir
            </button>
          </div>
        </div>

        {/* SALUDO AL ALUMNO */}
        <div className="mb-8">
            <h2 className="text-2xl font-black text-ufv-azul-oscuro flex items-center gap-2">
                Hola, {datos?.alumno.nombre} <span className="text-3xl">👋</span>
            </h2>
            <p className="text-gray-500 font-medium mt-1">Selecciona una rotación para evaluarte o gestionar tu asistencia.</p>
        </div>

        {/* TARJETAS DE ROTACIÓN */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datos?.rotaciones.map((rot: any) => {
            const yaFichoEntrada = rot.estado_fichaje_hoy?.entrada;
            const yaFichoSalida = rot.estado_fichaje_hoy?.salida;

            return (
              <div key={rot.id} className="relative bg-white p-6 rounded-3xl border border-gray-200 border-t-4 border-t-ufv-azul shadow-sm flex flex-col hover:shadow-xl transition-all duration-300">
                
                {/* ZONA SUPERIOR (Evaluación) */}
                <div onClick={() => router.push(`/alumno/evaluar/${rot.id}`)} className="cursor-pointer group mb-5">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="bg-blue-50 p-3 rounded-xl text-ufv-azul group-hover:bg-ufv-azul group-hover:text-white transition-colors">
                      <Folder className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-ufv-azul-oscuro group-hover:text-ufv-azul transition-colors leading-tight">
                        {rot.especialidad} (Rotación {rot.numero})
                      </h3>
                      <p className="text-xs text-gray-500 font-bold mt-1 uppercase tracking-widest">{rot.curso}º Curso</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">
                      <Users className="w-3 h-3" /> Tutores Asignados
                    </div>
                    {rot.tutores?.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {rot.tutores.map((t: string, idx: number) => (
                          <span key={idx} className="text-sm font-bold text-ufv-azul-oscuro truncate block flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-ufv-rosa-claro"></span> {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Sin asignar</span>
                    )}
                  </div>
                </div>

                {/* ZONA INFERIOR (Asistencia) */}
                <div className="mt-auto pt-5 border-t border-gray-100">
                  {rot.completada ? (
                     <div className="flex items-center justify-center gap-2 text-sm font-black text-green-700 bg-green-50 px-4 py-3 rounded-xl border border-green-200">
                       <CheckCircle className="w-5 h-5" /> ROTACIÓN CERRADA
                     </div>
                  ) : (
                    <>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 text-center">Fichaje Diario</p>
                      
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                          onClick={() => handleFichar(rot.id, "entrada")}
                          disabled={yaFichoEntrada || fichando?.id === rot.id}
                          className={`py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all ${yaFichoEntrada ? 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 hover:shadow-sm'}`}
                        >
                          {fichando?.id === rot.id && fichando?.tipo === "entrada" ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                          <span className="text-[11px] uppercase tracking-wider">{yaFichoEntrada ? "Entrada Ok" : "Entrada"}</span>
                        </button>

                        <button
                          onClick={() => handleFichar(rot.id, "salida")}
                          disabled={!yaFichoEntrada || yaFichoSalida || fichando?.id === rot.id}
                          className={`py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all ${(!yaFichoEntrada || yaFichoSalida) ? 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 hover:shadow-sm'}`}
                        >
                           {fichando?.id === rot.id && fichando?.tipo === "salida" ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                          <span className="text-[11px] uppercase tracking-wider">{yaFichoSalida ? "Salida Ok" : "Salida"}</span>
                        </button>
                      </div>

                      <button 
                        onClick={() => router.push(`/alumno/asistencia/${rot.id}`)}
                        className="w-full mt-2 py-3 bg-white text-ufv-azul text-xs font-bold rounded-xl border border-gray-200 hover:border-ufv-azul-claro hover:bg-blue-50 flex items-center justify-center gap-2 transition-colors"
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
      </div>

      {/* MODAL DE CAMBIO DE CONTRASEÑA (ESTILO CORPORATIVO) */}
      {showPassModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border-t-4 border-ufv-azul animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-ufv-azul-oscuro">Cambiar contraseña</h2>
              <button onClick={() => setShowPassModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCambiarPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Contraseña Actual</label>
                <input 
                  type="password" required
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul outline-none transition-all text-gray-900"
                  value={passFormData.actual}
                  onChange={(e) => setPassFormData({...passFormData, actual: e.target.value})}
                />
              </div>

              <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Nueva Contraseña (mín. 8)</label>
                <input 
                  type="password" required minLength={8}
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul outline-none transition-all text-gray-900"
                  value={passFormData.nueva}
                  onChange={(e) => setPassFormData({...passFormData, nueva: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Confirmar Nueva</label>
                <input 
                  type="password" required
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul outline-none transition-all text-gray-900"
                  value={passFormData.confirmar}
                  onChange={(e) => setPassFormData({...passFormData, confirmar: e.target.value})}
                />
              </div>

              {passStatus.msg && (
                <p className={`text-center text-xs font-bold p-3.5 rounded-xl ${
                  passStatus.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 
                  passStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-blue-50 text-ufv-azul border border-blue-100'
                }`}>
                  {passStatus.msg}
                </p>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowPassModal(false)}
                  className="flex-1 py-3.5 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors border border-transparent"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3.5 bg-ufv-azul text-white font-bold rounded-xl hover:bg-ufv-azul-oscuro shadow-md active:scale-95 transition-all border border-transparent"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}