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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-brutal-black/80 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl brutal-border brutal-shadow flex flex-col overflow-hidden max-h-[95vh]">
        <div className="p-3 md:p-4 border-b-2 border-brutal-black flex items-center justify-between bg-neon-green">
          <h3 className="font-display uppercase text-lg md:text-xl">Capture Template</h3>
          <button onClick={onClose} className="p-2 hover:bg-brutal-black hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X size={24} />
          </button>
        </div>

        <div className="relative flex-grow bg-brutal-black aspect-video flex items-center justify-center">
          {error ? (
            <div className="text-white text-center p-8">
              <p className="font-mono text-sm mb-4">{error}</p>
              <button onClick={startCamera} className="brutal-btn brutal-btn-primary">Try Again</button>
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

        <div className="p-4 md:p-6 border-t-2 border-brutal-black flex justify-center gap-3 md:gap-4 bg-neutral-50">
          {!capturedImage ? (
            <button 
              onClick={capture}
              className="brutal-btn brutal-btn-primary flex items-center gap-2 px-8 md:px-12"
            >
              <Camera size={22} />
              <span className="text-sm md:text-base">Capture</span>
            </button>
          ) : (
            <>
              <button onClick={retake} className="brutal-btn flex items-center gap-2 text-sm md:text-base">
                <RefreshCw size={18} />
                Retake
              </button>
              <button onClick={confirm} className="brutal-btn brutal-btn-primary flex items-center gap-2 text-sm md:text-base">
                <Check size={18} />
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
