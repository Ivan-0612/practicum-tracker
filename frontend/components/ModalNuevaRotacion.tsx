"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { X, Briefcase, GraduationCap, Loader2, Save, AlertCircle } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  alumnoId: string;
  emailAlumno: string;
  onSuccess: () => void;
}

export default function ModalNuevaRotacion({ isOpen, onClose, alumnoId, emailAlumno, onSuccess }: ModalProps) {
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    curso: 2,
    numero_rotacion: 1,
    especialidad_id: "",
    email_tutor_hospital: "",
    email_tutor_universidad: "",
  });

  useEffect(() => {
    if (isOpen) {
      cargarEspecialidades();
      // Reset form on open
      setFormData({
        curso: 2,
        numero_rotacion: 1,
        especialidad_id: "",
        email_tutor_hospital: "",
        email_tutor_universidad: "",
      });
      setError("");
    }
  }, [isOpen]);

  const cargarEspecialidades = async () => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/especialidades`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEspecialidades(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, especialidad_id: data[0].id }));
        }
      }
    } catch (err) {
      console.error("Error al cargar especialidades", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.especialidad_id) {
      setError("Debes seleccionar una especialidad.");
      setLoading(false);
      return;
    }

    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/alumnos/asignar-rotacion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          alumno_id: alumnoId,
          ...formData,
          curso: Number(formData.curso),
          numero_rotacion: Number(formData.numero_rotacion),
        })
      });

      if (res.ok) {
        onSuccess();
        onClose();
        alert("✅ Nueva rotación asignada con éxito.");
      } else {
        const errData = await res.json();
        setError(errData.detail || "Error al asignar rotación");
      }
    } catch (err) {
      setError("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border-t-4 border-ufv-azul animate-in fade-in zoom-in duration-200">
        
        {/* CABECERA */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
          <div>
            <h3 className="text-xl font-black text-ufv-azul-oscuro">Asignar Nueva Rotación</h3>
            <p className="text-sm text-gray-500 font-bold mt-1 flex items-center gap-1.5">
              Alumno: <span className="text-ufv-azul">{emailAlumno}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-white border border-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* CURSO */}
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><GraduationCap className="w-4 h-4" /> Curso Académico</label>
              <select 
                value={formData.curso} 
                onChange={e => setFormData({...formData, curso: parseInt(e.target.value)})} 
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul outline-none transition-all text-gray-900 font-bold"
              >
                <option value={2}>2º Grado Enfermería</option>
                <option value={3}>3º Grado Enfermería</option>
                <option value={4}>4º Grado Enfermería</option>
              </select>
            </div>

            {/* NÚMERO ROTACIÓN */}
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Número de Rotación</label>
              <select 
                value={formData.numero_rotacion} 
                onChange={e => setFormData({...formData, numero_rotacion: parseInt(e.target.value)})} 
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul outline-none transition-all text-gray-900 font-bold"
              >
                <option value={1}>Rotación 1</option>
                <option value={2}>Rotación 2</option>
                <option value={3}>Rotación 3</option>
              </select>
            </div>
          </div>

          {/* ESPECIALIDAD */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> Especialidad (Unidad)</label>
            <select 
              required
              value={formData.especialidad_id}
              onChange={e => setFormData({...formData, especialidad_id: e.target.value})}
              className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul outline-none transition-all text-gray-900 font-medium"
            >
              {especialidades.length === 0 && <option value="">No hay especialidades disponibles</option>}
              {especialidades.map(esp => (
                  <option key={esp.id} value={esp.id}>{esp.nombre}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-5">
             {/* TUTOR HOSPITAL */}
             <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Email Tutor Clínico (Hospital)</label>
              <input 
                type="email" 
                required 
                placeholder="Ej: hospital@gmail.com"
                className="w-full p-3.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul outline-none transition-all text-gray-900" 
                value={formData.email_tutor_hospital} 
                onChange={(e) => setFormData({...formData, email_tutor_hospital: e.target.value})} 
              />
            </div>

            {/* TUTOR UNIVERSIDAD */}
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Email Tutor Académico (Universidad)</label>
              <input 
                type="email" 
                required 
                placeholder="Ej: universidad@ufv.es"
                className="w-full p-3.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul outline-none transition-all text-gray-900" 
                value={formData.email_tutor_universidad} 
                onChange={(e) => setFormData({...formData, email_tutor_universidad: e.target.value})} 
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl font-bold border border-red-100 flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 bg-ufv-azul text-white font-bold rounded-xl hover:bg-ufv-azul-oscuro shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {loading ? "Asignando..." : "Asignar Rotación"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}