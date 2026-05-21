"use client";

import { AlertTriangle, Trash2 } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" = rojo (borrado), "warning" = ámbar, "primary" = azul UFV */
  variant?: "danger" | "warning" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const iconBg = {
    danger:  "bg-red-100 text-red-600",
    warning: "bg-amber-100 text-amber-600",
    primary: "bg-blue-100 text-ufv-azul",
  }[variant];

  const btnStyle = {
    danger:  "bg-red-600 hover:bg-red-700 text-white shadow-sm",
    warning: "bg-amber-500 hover:bg-amber-600 text-white shadow-sm",
    primary: "bg-ufv-azul hover:bg-ufv-azul-oscuro text-white shadow-sm",
  }[variant];

  const icon = variant === "danger" ? (
    <Trash2 className="w-5 h-5" />
  ) : (
    <AlertTriangle className="w-5 h-5" />
  );

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100
          animate-in zoom-in-95 fade-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Cuerpo */}
        <div className="p-6 flex items-start gap-4">
          <div className={`p-2.5 rounded-2xl shrink-0 ${iconBg}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black text-gray-900 mb-1 leading-snug">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">{message}</p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700
              font-bold text-sm hover:bg-gray-50 transition-all active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${btnStyle}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
