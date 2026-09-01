import React from 'react';
import { AlertTriangle, Trash2, HelpCircle, X } from 'lucide-react';

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  icon?: 'trash' | 'alert' | 'help';
  onConfirm: () => void | Promise<void>;
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  icon?: 'trash' | 'alert' | 'help';
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  variant = 'danger',
  icon = 'trash',
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } finally {
      onClose();
    }
  };

  const getIcon = () => {
    if (icon === 'trash' || variant === 'danger') {
      return (
        <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60 shadow-xs">
          <Trash2 className="w-6 h-6" />
        </div>
      );
    }
    if (icon === 'alert' || variant === 'warning') {
      return (
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-900/60 shadow-xs">
          <AlertTriangle className="w-6 h-6" />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-900/60 shadow-xs">
        <HelpCircle className="w-6 h-6" />
      </div>
    );
  };

  const getConfirmButtonClasses = () => {
    if (variant === 'danger') {
      return 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 dark:shadow-none focus:ring-rose-500';
    }
    if (variant === 'warning') {
      return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200 dark:shadow-none focus:ring-amber-500';
    }
    return 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none focus:ring-indigo-500';
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 relative transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4 pt-1">
          {getIcon()}
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${getConfirmButtonClasses()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
