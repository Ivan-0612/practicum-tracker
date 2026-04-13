"use client";

import { X, Briefcase, FileSpreadsheet, ArrowRight } from "lucide-react";

type ModalTipoAsignarRotacionProps = {
  isOpen: boolean;
  alumnoEmail: string;
  onClose: () => void;
  onManual: () => void;
  onAutomatico: () => void;
};

export default function ModalTipoAsignarRotacion({
  isOpen,
  alumnoEmail,
  onClose,
  onManual,
  onAutomatico,
}: ModalTipoAsignarRotacionProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100 bg-gray-50">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-ufv-rosa-oscuro mb-2">Nueva rotación</p>
            <h2 className="text-2xl font-black text-ufv-azul-oscuro">Elige forma de asignación</h2>
            <p className="text-sm text-gray-500 mt-1">Alumno seleccionado: {alumnoEmail}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
          <button
            type="button"
            onClick={onManual}
            className="group rounded-2xl border border-gray-200 bg-white p-5 text-left hover:border-ufv-azul hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-ufv-azul flex items-center justify-center">
                <Briefcase className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-ufv-azul transition-colors" />
            </div>
            <h3 className="text-lg font-black text-gray-900">Asignar manualmente</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Abre el formulario tradicional para asignar la rotación de este alumno.
            </p>
          </button>

          <button
            type="button"
            onClick={onAutomatico}
            className="group rounded-2xl border border-gray-200 bg-white p-5 text-left hover:border-ufv-azul hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-ufv-azul transition-colors" />
            </div>
            <h3 className="text-lg font-black text-gray-900">Asignar por Excel</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Importa varias rotaciones para alumnos existentes en una sola subida.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}