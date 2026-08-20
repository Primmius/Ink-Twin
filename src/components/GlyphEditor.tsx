import React, { useRef, useEffect, useState } from 'react';
import { X, Eraser, Check, RotateCcw, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface GlyphEditorProps {
  char: string;
  initialImage?: string;
  onSave: (imageData: string) => void | Promise<void>;
  onClose: () => void;
  onReanalyze?: () => Promise<void>;
}

export const GlyphEditor: React.FC<GlyphEditorProps> = ({ char, initialImage, onSave, onClose, onReanalyze }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#000000';

    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load initial image if exists
    if (initialImage) {
      const img = new Image();
      img.onload = () => {
        // Clear again to be sure
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = initialImage;
    }
  }, [initialImage]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.beginPath();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    // Scale coordinates if canvas size differs from display size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineTo(x * scaleX, y * scaleY);
    ctx.stroke();
    setHasChanges(true);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasChanges(true);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsSaving(true);
    try {
      await onSave(canvas.toDataURL('image/png'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 w-full max-w-xl brutal-border brutal-shadow flex flex-col rounded-2xl overflow-hidden">
        <div className="p-4 border-b-2 border-neutral-950 flex items-center justify-between bg-warning-yellow text-neutral-950">
          <h3 className="font-display uppercase text-xl font-bold">Edit Glyph: {char}</h3>
          <button onClick={onClose} className="p-1 hover:bg-neutral-950 hover:text-white transition-colors rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="flex-grow p-6 sm:p-8 flex flex-col items-center gap-6 bg-neutral-50 dark:bg-neutral-950/60">
          {reanalyzeError && (
            <div className="w-full max-w-[400px] bg-error-red text-white border-2 border-neutral-900 p-3 text-xs font-mono flex items-start gap-2 rounded-lg">
              <span className="flex-grow">{reanalyzeError}</span>
              <button onClick={() => setReanalyzeError(null)} className="font-bold">×</button>
            </div>
          )}
          <div className="relative border-2 border-neutral-300 dark:border-neutral-700 bg-white cursor-crosshair touch-none rounded-xl overflow-hidden">
            <canvas
              ref={canvasRef}
              width={500}
              height={500}
              className="w-full max-w-[400px] aspect-square"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <div className="absolute top-2 right-2 flex flex-col gap-2">
              <button 
                onClick={clear}
                className="p-2 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 border-2 border-neutral-300 dark:border-neutral-700 hover:bg-error-red hover:text-white dark:hover:bg-error-red dark:hover:text-white transition-colors brutal-shadow-small rounded-lg"
                title="Clear Canvas"
              >
                <Eraser size={20} />
              </button>
              <button 
                onClick={async () => {
                  if (onReanalyze) {
                    setIsReanalyzing(true);
                    setReanalyzeError(null);
                    try {
                      await onReanalyze();
                    } catch (e: any) {
                      setReanalyzeError(e?.message || "Re-analysis failed.");
                    } finally {
                      setIsReanalyzing(false);
                    }
                  }
                }}
                disabled={isReanalyzing}
                className={cn(
                  "p-2 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 border-2 border-neutral-300 dark:border-neutral-700 hover:bg-warning-yellow hover:text-neutral-950 dark:hover:bg-warning-yellow dark:hover:text-neutral-950 transition-colors brutal-shadow-small rounded-lg",
                  isReanalyzing && "animate-pulse cursor-wait"
                )}
                title="Re-analyze from Scans"
              >
                <RefreshCw size={20} className={isReanalyzing ? "animate-spin" : ""} />
              </button>
              <button 
                onClick={() => {
                  if (initialImage) {
                    const canvas = canvasRef.current;
                    if (canvas) {
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        const img = new Image();
                        img.onload = () => {
                          ctx.fillStyle = '#FFFFFF';
                          ctx.fillRect(0, 0, canvas.width, canvas.height);
                          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        };
                        img.src = initialImage;
                      }
                    }
                  }
                }}
                className="p-2 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 border-2 border-neutral-300 dark:border-neutral-700 hover:bg-warning-yellow hover:text-neutral-950 dark:hover:bg-warning-yellow dark:hover:text-neutral-950 transition-colors brutal-shadow-small rounded-lg"
                title="Reset to Original"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          </div>

          <p className="font-mono text-[10px] uppercase opacity-60 text-center text-neutral-600 dark:text-neutral-400">
            Draw your character clearly within the box. Use thick strokes for best results.
          </p>
        </div>

        <div className="p-5 border-t-2 border-neutral-200 dark:border-neutral-800 flex gap-3 bg-neutral-100 dark:bg-neutral-900">
          <button onClick={onClose} className="flex-1 brutal-btn bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
            Cancel
          </button>
          <button 
            onClick={save} 
            disabled={isSaving || isReanalyzing}
            className="flex-1 brutal-btn bg-warning-yellow text-neutral-950 hover:bg-amber-300 font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isSaving ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Check size={18} />
            )}
            {isSaving ? 'Saving...' : 'Save Glyph'}
          </button>
        </div>
      </div>
    </div>
  );
};
