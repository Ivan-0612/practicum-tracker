"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import { ChevronLeft, User, GraduationCap, Briefcase, KeyRound, Save, AlertCircle, CheckCircle2 } from "lucide-react";

export default function NuevoAlumno() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    email_personal: "",
    curso: 2,
    grupo: "",
    email_acceso: "",
    password_acceso: "",
    email_tutor: "",
    numero_rotacion: 1,
  });
  
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMensaje({ tipo: "", texto: "" });

    try {
      const token = Cookies.get("practicum_token");
      const response = await fetch("http://127.0.0.1:8000/api/v1/alumnos/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          curso: Number(formData.curso),
          numero_rotacion: Number(formData.numero_rotacion),
          version_cuadernillo: "General" 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = "Error desconocido al crear el alumno";
        
        if (data.detail && Array.isArray(data.detail)) {
          const primerError = data.detail[0];
          const campo = primerError.loc[primerError.loc.length - 1]; 
          const mensajeOriginal = primerError.msg;

          const traducciones: Record<string, string> = {
            "String should have at least 8 characters": "debe tener al menos 8 caracteres.",
            "Field required": "es un campo obligatorio y no puede estar vacío.",
            "value is not a valid email address": "no tiene un formato de correo válido.",
            "Input should be a valid integer, unable to parse string as an integer": "debe ser un número válido."
          };

          const mensajeTraducido = traducciones[mensajeOriginal] || mensajeOriginal;
          errorMsg = `El campo '${campo}' ${mensajeTraducido}`;
        } 
        else if (data.detail && typeof data.detail === "string") {
          errorMsg = data.detail;
        }

        throw new Error(errorMsg);
      }

      setMensaje({ tipo: "success", texto: "✅ Alumno, Tutor y Rotación vinculados con éxito" });
      setTimeout(() => router.push("/admin/panel"), 2000);
    } catch (err: any) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* BOTÓN VOLVER */}
        <button 
          type="button"
          onClick={() => router.push("/admin/panel")}
          className="mb-6 text-gray-500 hover:text-ufv-azul font-bold flex items-center gap-2 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Volver al Panel
        </button>

        <div className="bg-ufv-blanco shadow-xl rounded-3xl p-6 md:p-10 border-t-4 border-ufv-azul">
          
          {/* CABECERA CORPORATIVA */}
          <div className="flex flex-col md:flex-row items-start md:items-center mb-10 gap-6 border-b border-gray-100 pb-8">
            <Image 
              src="/logo-ufv.png" 
              alt="Logo UFV" 
              width={56} 
              height={56} 
              className="object-contain" 
            />
            <div>
              <h1 className="text-3xl font-black text-ufv-azul-oscuro">Alta de Nuevo Alumno</h1>
              <p className="text-xs font-bold text-ufv-rosa-oscuro uppercase tracking-widest mt-1">
                Universidad Francisco de Vitoria
              </p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-10">
            
            {/* SECCIÓN 1: DATOS PERSONALES */}
            <section>
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-3">
                <div className="bg-blue-50 p-2 rounded-lg text-ufv-azul">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-ufv-azul-oscuro">Información Personal</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nombre</label>
                  <input type="text" required className="w-full border border-gray-200 p-3 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none transition-all" 
                    onChange={e => setFormData({...formData, nombre: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Apellidos</label>
                  <input type="text" required className="w-full border border-gray-200 p-3 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none transition-all" 
                    onChange={e => setFormData({...formData, apellidos: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Institucional (@ufv.es)</label>
                  <input
                    type="email"
                    required
                    className="w-full border border-gray-200 p-3 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none transition-all"
                    onChange={e => setFormData({...formData, email_personal: e.target.value, email_acceso: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-2 font-medium">Este email se utilizará tanto para notificaciones como para el acceso a la plataforma.</p>
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: DATOS ACADÉMICOS */}
            <section>
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-3">
                <div className="bg-blue-50 p-2 rounded-lg text-ufv-azul">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-ufv-azul-oscuro">Ubicación Académica</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Curso Académico</label>
                  <select 
                    value={formData.curso} 
                    onChange={e => setFormData({...formData, curso: parseInt(e.target.value)})}
                    className="w-full border border-gray-200 p-3 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none transition-all"
                  >
                    <option value={2}>2º Grado Enfermería</option>
                    <option value={3}>3º Grado Enfermería</option>
                    <option value={4}>4º Grado Enfermería</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Grupo / Turno</label>
                  <input type="text" placeholder="Ej: Mañana A" required className="w-full border border-gray-200 p-3 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none transition-all" 
                    onChange={e => setFormData({...formData, grupo: e.target.value})} />
                </div>
              </div>
            </section>

            {/* SECCIÓN 3: ASIGNACIÓN DE PRÁCTICAS Y TUTOR */}
            <section className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-white p-2 rounded-lg text-ufv-rosa-oscuro shadow-sm border border-gray-100">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-ufv-azul-oscuro">Asignación de Prácticas y Tutor</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Número de Rotación</label>
                  <select 
                    value={formData.numero_rotacion}
                    onChange={e => setFormData({...formData, numero_rotacion: parseInt(e.target.value)})}
                    className="w-full border border-gray-300 p-3 rounded-xl text-gray-900 bg-white focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none transition-all"
                  >
                    <option value={1}>Rotación 1</option>
                    <option value={2}>Rotación 2</option>
                    <option value={3}>Rotación 3</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2 font-medium">Periodo práctico activo.</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email del Tutor/a Responsable</label>
                  <input type="email" placeholder="Profesor ya registrado en el sistema..." required className="w-full border border-gray-300 p-3 rounded-xl text-gray-900 bg-white focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none transition-all" 
                    onChange={e => setFormData({...formData, email_tutor: e.target.value})} />
                  <p className="text-xs text-gray-500 mt-2 font-medium">Debe coincidir exactamente con el email del profesor dado de alta.</p>
                </div>
              </div>
            </section>

            {/* SECCIÓN 4: LOGIN DEL ALUMNO */}
            <section>
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-3">
                <div className="bg-blue-50 p-2 rounded-lg text-ufv-azul">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-ufv-azul-oscuro">Credenciales de Acceso</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Contraseña Provisional</label>
                  <input type="password" placeholder="Mínimo 8 caracteres" required className="w-full border border-gray-200 p-3 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none transition-all" 
                    onChange={e => setFormData({...formData, password_acceso: e.target.value})} />
                </div>
              </div>
            </section>

            {/* MENSAJES DE ALERTA */}
            {mensaje.texto && (
              <div className={`p-4 rounded-xl font-bold flex items-center gap-3 ${mensaje.tipo === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {mensaje.tipo === "success" ? <CheckCircle2 className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
                {mensaje.texto}
              </div>
            )}

            {/* BOTÓN DE ENVÍO */}
            <button 
              type="submit" 
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-bold text-ufv-blanco shadow-md flex justify-center items-center gap-3 transition-all ${
                isLoading 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-ufv-azul hover:bg-ufv-azul-oscuro active:scale-95"
              }`}
            >
              {isLoading ? "Procesando Alta..." : (
                <>
                  <Save className="w-5 h-5" />
                  Finalizar y Vincular Todo
                </>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}