"use client";

import { X, UserPlus, FileSpreadsheet, ArrowRight } from "lucide-react";

type ModalTipoAltaAlumnoProps = {
  isOpen: boolean;
  onClose: () => void;
  onManual: () => void;
  onExcel: () => void;
};

export default function ModalTipoAltaAlumno({
  isOpen,
  onClose,
  onManual,
  onExcel,
}: ModalTipoAltaAlumnoProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100 bg-gray-50">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-ufv-rosa-oscuro mb-2">Nuevo alumno</p>
            <h2 className="text-2xl font-black text-ufv-azul-oscuro">Elige cómo quieres dar de alta</h2>
            <p className="text-sm text-gray-500 mt-1">Puedes añadir un alumno manualmente o importar varios desde Excel.</p>
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
                <UserPlus className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-ufv-azul transition-colors" />
            </div>
            <h3 className="text-lg font-black text-gray-900">Añadir manualmente</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Abre el formulario clásico para crear un único alumno paso a paso.
            </p>
          </button>

          <button
            type="button"
            onClick={onExcel}
            className="group rounded-2xl border border-gray-200 bg-white p-5 text-left hover:border-ufv-azul hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-ufv-azul transition-colors" />
            </div>
            <h3 className="text-lg font-black text-gray-900">Subir Excel</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Importa varios alumnos a la vez desde la plantilla de Excel.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}