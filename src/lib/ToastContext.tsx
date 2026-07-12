import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle, Info, RotateCcw, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  undoAction?: () => Promise<void> | void;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, options?: { undoAction?: () => Promise<void> | void; duration?: number }) => void;
  showSuccess: (message: string, options?: { undoAction?: () => Promise<void> | void; duration?: number }) => void;
  showError: (message: string, options?: { duration?: number }) => void;
  showInfo: (message: string, options?: { duration?: number }) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timeouts.current[id]) {
      clearTimeout(timeouts.current[id]);
      delete timeouts.current[id];
    }
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = 'info',
      options?: { undoAction?: () => Promise<void> | void; duration?: number }
    ) => {
      const id = Math.random().toString(36).substring(2, 9);
      const duration = options?.duration ?? (options?.undoAction ? 7000 : 4000); // give more time for undoable actions

      const newToast: Toast = {
        id,
        message,
        type,
        undoAction: options?.undoAction,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      const timeoutId = setTimeout(() => {
        removeToast(id);
      }, duration);

      timeouts.current[id] = timeoutId;
    },
    [removeToast]
  );

  const showSuccess = useCallback(
    (message: string, options?: { undoAction?: () => Promise<void> | void; duration?: number }) => {
      showToast(message, 'success', options);
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, options?: { duration?: number }) => {
      showToast(message, 'error', options);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, options?: { duration?: number }) => {
      showToast(message, 'info', options);
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, toasts }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} onShowToast={showToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
  onShowToast: (message: string, type?: ToastType) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove, onShowToast }) => {
  const [isUndoing, setIsUndoing] = useState<string | null>(null);

  const handleUndo = async (toast: Toast) => {
    if (!toast.undoAction || isUndoing === toast.id) return;
    setIsUndoing(toast.id);
    try {
      await toast.undoAction();
      onRemove(toast.id);
      onShowToast('Action successfully reverted', 'success');
    } catch (err: any) {
      console.error('Failed to undo action', err);
      onShowToast(`Undo failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsUndoing(null);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, y: -20, transition: { duration: 0.15 } }}
              className={`flex flex-col w-full bg-white border-2 border-mud-900 shadow-[8px_8px_0px_#261C1A] overflow-hidden rounded-sm`}
            >
              <div className="flex items-start p-4 gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  {isSuccess ? (
                    <CheckCircle className="w-5 h-5 text-leaf-500" />
                  ) : isError ? (
                    <AlertCircle className="w-5 h-5 text-terracotta-500" />
                  ) : (
                    <Info className="w-5 h-5 text-ochre-500" />
                  )}
                </div>
                
                <div className="flex-grow space-y-1">
                  <p className="text-xs font-black uppercase tracking-wider text-mud-900 leading-snug">
                    {toast.message}
                  </p>
                  
                  {toast.undoAction && (
                    <button
                      onClick={() => handleUndo(toast)}
                      disabled={isUndoing !== null}
                      className="inline-flex items-center space-x-1.5 text-[10px] font-black uppercase tracking-widest text-terracotta-500 hover:text-mud-900 transition-colors bg-terracotta-500/5 hover:bg-terracotta-500/10 px-2 py-1 rounded border border-terracotta-500/10 mt-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className={`w-3 h-3 ${isUndoing === toast.id ? 'animate-spin' : ''}`} />
                      <span>{isUndoing === toast.id ? 'Reverting...' : 'Undo Action'}</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => onRemove(toast.id)}
                  className="p-1 hover:bg-mud-900/5 rounded transition-colors text-mud-900/40 hover:text-mud-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Animating Duration Bar */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: (toast.duration ?? 4000) / 1000, ease: 'linear' }}
                className={`h-1 ${isSuccess ? 'bg-leaf-500' : isError ? 'bg-terracotta-500' : 'bg-ochre-500'}`}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
