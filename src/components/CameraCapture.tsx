import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, RefreshCw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Could not access camera. Please ensure permissions are granted.');
      console.error(err);
    }
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(dataUrl);
  };

  const retake = () => {
    setCapturedImage(null);
  };

  const confirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl brutal-border brutal-shadow flex flex-col overflow-hidden rounded-2xl">
        <div className="p-4 border-b-2 border-neutral-950 flex items-center justify-between bg-warning-yellow text-neutral-950">
          <h3 className="font-display uppercase text-xl font-bold">Capture Template</h3>
          <button onClick={onClose} className="p-1 hover:bg-neutral-950 hover:text-white transition-colors rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="relative flex-grow bg-black aspect-video flex items-center justify-center">
          {error ? (
            <div className="text-white text-center p-8">
              <p className="font-mono text-sm mb-4">{error}</p>
              <button onClick={startCamera} className="brutal-btn bg-warning-yellow text-neutral-950 font-bold">Try Again</button>
            </div>
          ) : capturedImage ? (
            <img src={capturedImage} className="w-full h-full object-contain" alt="Captured" />
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-contain"
            />
          )}
        </div>

        <div className="p-6 border-t-2 border-neutral-200 dark:border-neutral-800 flex justify-center gap-4 bg-neutral-100 dark:bg-neutral-900">
          {!capturedImage ? (
            <button 
              onClick={capture}
              className="brutal-btn bg-warning-yellow hover:bg-amber-300 text-neutral-950 font-bold flex items-center gap-2 px-12 shadow-sm active:scale-95"
            >
              <Camera size={24} />
              Capture
            </button>
          ) : (
            <>
              <button onClick={retake} className="brutal-btn bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <RefreshCw size={20} />
                Retake
              </button>
              <button onClick={confirm} className="brutal-btn bg-warning-yellow hover:bg-amber-300 text-neutral-950 font-bold flex items-center gap-2 shadow-sm active:scale-95">
                <Check size={20} />
                Use Photo
              </button>
            </>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
