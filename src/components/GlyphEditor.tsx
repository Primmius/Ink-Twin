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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brutal-black/80 backdrop-blur-sm">
      <div className="bg-white w-full max-w-xl brutal-border brutal-shadow flex flex-col">
        <div className="p-4 border-b-2 border-brutal-black flex items-center justify-between bg-warning-yellow">
          <h3 className="font-display uppercase text-xl">Edit Glyph: {char}</h3>
          <button onClick={onClose} className="p-1 hover:bg-brutal-black hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-grow p-8 flex flex-col items-center gap-6">
          {reanalyzeError && (
            <div className="w-full max-w-[400px] bg-error-red text-white border-2 border-brutal-black p-3 text-xs font-mono flex items-start gap-2">
              <span className="flex-grow">{reanalyzeError}</span>
              <button onClick={() => setReanalyzeError(null)} className="font-bold">×</button>
            </div>
          )}
          <div className="relative brutal-border bg-white cursor-crosshair touch-none">
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
                className="p-2 bg-white border-2 border-brutal-black hover:bg-error-red hover:text-white transition-colors brutal-shadow"
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
                  "p-2 bg-white border-2 border-brutal-black hover:bg-warning-yellow transition-colors brutal-shadow",
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
                className="p-2 bg-white border-2 border-brutal-black hover:bg-warning-yellow transition-colors brutal-shadow"
                title="Reset to Original"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          </div>

          <p className="font-mono text-[10px] uppercase opacity-60 text-center">
            Draw your character clearly within the box. Use thick strokes for best results.
          </p>
        </div>

        <div className="p-6 border-t-2 border-brutal-black flex gap-4 bg-neutral-50">
          <button onClick={onClose} className="flex-grow brutal-btn">
            Cancel
          </button>
          <button 
            onClick={save} 
            disabled={isSaving || isReanalyzing}
            className="flex-grow brutal-btn brutal-btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <Check size={20} />
            )}
            {isSaving ? 'Saving...' : 'Save Glyph'}
          </button>
        </div>
      </div>
    </div>
  );
};
