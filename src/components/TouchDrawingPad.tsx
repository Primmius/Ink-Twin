import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Check, RotateCcw, Eraser, PenTool } from 'lucide-react';
import { cn } from '../lib/utils';

interface TouchDrawingPadProps {
  char: string;
  initialImage?: string;
  onSave: (imageData: string) => void | Promise<void>;
  onClose: () => void;
}

export const TouchDrawingPad: React.FC<TouchDrawingPadProps> = ({
  char,
  initialImage,
  onSave,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(14);
  const [isEraser, setIsEraser] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (initialImage) {
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = initialImage;
    }
  }, [initialImage]);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = isEraser ? '#FFFFFF' : '#000000';
    ctx.moveTo(x, y);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(true);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      await onSave(dataUrl);
      onClose();
    } catch (err) {
      console.error('Failed to save character drawing', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning-yellow/20 border border-warning-yellow flex items-center justify-center font-display text-xl font-bold text-neutral-900 dark:text-white">
              {char}
            </div>
            <div>
              <h3 className="font-display font-bold text-sm tracking-tight text-neutral-900 dark:text-white">
                Draw Character '{char}'
              </h3>
              <p className="font-mono text-[11px] text-neutral-500">
                Use finger or stylus inside the box
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close drawing pad"
          >
            <X size={20} />
          </button>
        </div>

        {/* Canvas Area with Guidelines */}
        <div className="relative p-6 flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-950/60 flex-grow">
          <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] bg-white rounded-xl shadow-inner border-2 border-neutral-300 dark:border-neutral-700 overflow-hidden touch-none">
            {/* Guide lines */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 opacity-25">
              <div className="w-full border-b border-dashed border-red-500 text-[9px] font-mono text-red-500">Ascender (top)</div>
              <div className="w-full border-b border-dashed border-blue-500 text-[9px] font-mono text-blue-500">Mean line (mid)</div>
              <div className="w-full border-b-2 border-neutral-800 text-[9px] font-mono text-neutral-800">Baseline (bottom)</div>
              <div className="w-full border-b border-dashed border-red-500 text-[9px] font-mono text-red-500">Descender</div>
            </div>

            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="w-full h-full cursor-crosshair relative z-10"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          {/* Stroke tools */}
          <div className="mt-4 flex items-center justify-between w-full max-w-[320px] gap-2">
            <div className="flex items-center gap-1.5 bg-white dark:bg-neutral-800 p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setIsEraser(false)}
                className={cn(
                  "p-2 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all",
                  !isEraser
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                )}
                title="Pen mode"
              >
                <PenTool size={15} />
                Pen
              </button>
              <button
                type="button"
                onClick={() => setIsEraser(true)}
                className={cn(
                  "p-2 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all",
                  isEraser
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                )}
                title="Eraser mode"
              >
                <Eraser size={15} />
                Eraser
              </button>
            </div>

            {/* Stroke Thickness Picker */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700">
              {[8, 14, 22].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    setStrokeWidth(w);
                    setIsEraser(false);
                  }}
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                    strokeWidth === w && !isEraser
                      ? "ring-2 ring-warning-yellow bg-neutral-200 dark:bg-neutral-700"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  )}
                >
                  <span
                    className="rounded-full bg-neutral-900 dark:bg-white"
                    style={{ width: `${w / 2.5}px`, height: `${w / 2.5}px` }}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="p-2.5 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-red-600 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-red-300 transition-colors"
              title="Clear canvas"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-5 py-2.5 rounded-xl bg-warning-yellow hover:bg-amber-300 text-neutral-950 font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check size={16} />
                Save Character '{char}'
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
