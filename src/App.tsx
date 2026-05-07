/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  Upload, 
  Type as TypeIcon, 
  Settings, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  FileText,
  Camera,
  Moon,
  Sun,
  Trash2,
  Sparkles,
  GraduationCap,
  Coffee
} from 'lucide-react';
import { cn } from './lib/utils';
import { Logo } from './components/Logo';
import { LandingPage } from './components/LandingPage';
import { SupportCard } from './components/SupportCard';
import { AppStep, AppPhase, DetectedCharacter, FontConfig, CHARACTERS_TO_DETECT, SavedFont } from './types';
import { generateTemplatePDF, pdfToImages } from './lib/pdf';
import { analyzeHandwriting, reanalyzeSpecificCharacter } from './lib/gemini';
import { loadImage, processCharacterImage, normalizeManualDrawing, downscaleForAnalysis } from './lib/imageProcessing';
import { vectorizeImage } from './lib/vectorizer';
import { buildFont } from './lib/fontBuilder';
import { CameraCapture } from './components/CameraCapture';
import { GlyphEditor } from './components/GlyphEditor';
import { HandwritingWriter } from './components/writer/HandwritingWriter';
import { HomeworkSolver } from './components/HomeworkSolver';
import { FindFont } from './components/FindFont';

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('font-creation');
  const [step, setStep] = useState<AppStep>(1);
  const [apiKey, setApiKey] = useState<string>(
    localStorage.getItem('geminiApiKey') || localStorage.getItem('gemini_api_key') || process.env.GEMINI_API_KEY || ''
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [editingCharIndex, setEditingCharIndex] = useState<number | null>(null);
  const [prefilledWriterText, setPrefilledWriterText] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(localStorage.getItem('theme') as 'light' | 'dark' || 'light');
  
  // App State
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [detectedChars, setDetectedChars] = useState<DetectedCharacter[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingChar, setProcessingChar] = useState("");
  const [fontConfig, setFontConfig] = useState<FontConfig>({
    name: 'MyHandwriting',
    author: 'Anonymous',
    letterSpacing: 0,
    fontSize: 48
  });
  const [fontUrl, setFontUrl] = useState<string | null>(null);
  const [savedFonts, setSavedFonts] = useState<SavedFont[]>([]);
  const [pendingProfile, setPendingProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Success toast timer
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load saved fonts from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('handfont_saved_fonts');
    if (stored) {
      try {
        setSavedFonts(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse saved fonts", e);
      }
    }
  }, []);

  // Save fonts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('handfont_saved_fonts', JSON.stringify(savedFonts));
  }, [savedFonts]);

  // Dark Mode Persistence
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleSaveFont = async () => {
    if (!fontUrl) return;
    
    const response = await fetch(fontUrl);
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const newFont: SavedFont = {
      id: Math.random().toString(36).substr(2, 9),
      name: fontConfig.name || `Custom Font ${savedFonts.length + 1}`,
      url: dataUrl,
      createdAt: Date.now(),
      source: "Phase 1"
    };
    setSavedFonts(prev => [...prev, newFont]);
    setToast("Font saved to library!");
  };

  const handleDeleteFont = (id: string) => {
    setSavedFonts(prev => prev.filter(f => f.id !== id));
  };

  const handleRenameFont = (id: string, newName: string) => {
    setSavedFonts(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
  };

  const handleEditFont = (font: SavedFont) => {
    // This is tricky because we don't store the original detectedChars/paths
    // For now, we'll just load the font into the writer
    setFontUrl(font.url);
    setFontConfig(prev => ({ ...prev, name: font.name }));
    setPhase('text-writer');
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('geminiApiKey', key);
    setIsSettingsOpen(false);
  };

  const handleDownloadTemplate = async () => {
    const pdfBytes = await generateTemplatePDF();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'InkTwin_Template.pdf';
    a.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.type === 'application/pdf') {
      const buffer = await file.arrayBuffer();
      const images = await pdfToImages(buffer);
      setUploadedImages(prev => [...prev, ...images]);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImages(prev => [...prev, event.target.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
    setStep(2);
  };

  useEffect(() => {
    if (step === 4) {
      processAndVectorize();
    }
  }, [step]);

  const startAnalysis = async () => {
    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    try {
      let allDetected: DetectedCharacter[] = [];
      for (const imgData of uploadedImages) {
        const results = await analyzeHandwriting(imgData, apiKey);
        
        if (!Array.isArray(results)) {
          console.warn("Gemini returned non-array results", results);
          continue;
        }

        const img = await loadImage(imgData);
        const processed = await Promise.all(results.map(async (res) => {
          try {
            const cropped = await processCharacterImage(img, res.boundingBox);
            return { ...res, imageData: cropped };
          } catch (e) {
            console.error(`Failed to process character ${res.char}`, e);
            return { ...res, confidence: 0 };
          }
        }));
        
        allDetected = [...allDetected, ...processed];
      }
      
      if (allDetected.length === 0) {
        throw new Error("No characters were detected. Please ensure your handwriting is clear and the image is well-lit.");
      }
      
      // Merge results (if multiple pages detected same char, take highest confidence)
      const merged = CHARACTERS_TO_DETECT.map(targetChar => {
        const found = allDetected.filter(d => d.char === targetChar)
          .sort((a, b) => b.confidence - a.confidence)[0];
        return found || { char: targetChar, confidence: 0, boundingBox: { x: 0, y: 0, width: 0, height: 0 } };
      });

      setDetectedChars(merged);
      setStep(3);
    } catch (err: any) {
      setError(err.message || "Failed to analyze handwriting. Check your API key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const processAndVectorize = async () => {
    setIsProcessing(true);
    setProcessingProgress(0);
    try {
      const charsToProcess = detectedChars.filter(c => c.imageData);
      const total = charsToProcess.length;
      if (total === 0) {
        setStep(5);
        return;
      }
      let count = 0;

      const updatedChars = [...detectedChars];
      
      for (let i = 0; i < updatedChars.length; i++) {
        const char = updatedChars[i];
        if (!char.imageData) continue;

        try {
          setProcessingChar(char.char);
          const svgPath = await vectorizeImage(char.imageData);
          updatedChars[i] = { ...char, svgPath };
        } catch (e) {
          console.warn(`Failed to vectorize ${char.char}`, e);
        }
        
        count++;
        setProcessingProgress(Math.round((count / total) * 100));
        // Small delay to allow UI to breathe
        await new Promise(r => setTimeout(r, 10));
      }

      setDetectedChars(updatedChars);
      setStep(5);
    } catch (err: any) {
      setError("Failed to vectorize characters.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReanalyzeChar = async (index: number) => {
    if (!apiKey) {
      setIsSettingsOpen(true);
      throw new Error("Please add your Gemini API key first.");
    }

    const charToReanalyze = detectedChars[index].char;
    if (!uploadedImages.length) {
      throw new Error("No source images available — re-upload your template.");
    }

    let bestResult: { result: DetectedCharacter; image: string } | null = null;
    const errors: string[] = [];

    for (const image of uploadedImages) {
      try {
        const result = await reanalyzeSpecificCharacter(charToReanalyze, image, apiKey);
        if (result && result.boundingBox.width > 0 && result.boundingBox.height > 0) {
          if (!bestResult || (result.confidence ?? 0) > (bestResult.result.confidence ?? 0)) {
            bestResult = { result, image };
          }
        }
      } catch (e: any) {
        errors.push(e?.message || String(e));
      }
    }

    if (!bestResult) {
      const detail = errors.length ? ` (${errors[0]})` : "";
      throw new Error(`Could not find "${charToReanalyze}" in your scans${detail}. Try drawing it manually.`);
    }

    try {
      const cropped = await processCharacterImage(bestResult.image, bestResult.result.boundingBox);
      setDetectedChars(prev => {
        const next = [...prev];
        next[index] = { ...bestResult!.result, imageData: cropped };
        return next;
      });
    } catch (e: any) {
      console.error("Failed to process re-analyzed image", e);
      throw new Error("Found the character, but failed to crop the image.");
    }
  };

  const generateFont = async () => {
    try {
      const buffer = await buildFont(detectedChars.filter(c => c.svgPath), fontConfig);
      const blob = new Blob([buffer], { type: 'font/ttf' });
      const url = URL.createObjectURL(blob);
      setFontUrl(url);
      
      // Register font under a stable name so renaming doesn't break the preview
      const fontFace = new FontFace('inktwin-preview', buffer);
      await fontFace.load();
      document.fonts.add(fontFace);
      
      setStep(6);
    } catch (err) {
      setError("Failed to build font file.");
    }
  };

  const downloadFont = () => {
    if (!fontUrl) return;
    const a = document.createElement('a');
    a.href = fontUrl;
    a.download = `${fontConfig.name}.ttf`;
    a.click();
  };

  if (!apiKey) {
    return <LandingPage onSaveKey={saveApiKey} />;
  }

  return (
    <div className="min-h-screen bg-white text-brutal-black font-body flex flex-col border-[8px] border-brutal-black selection:bg-neon-green selection:text-brutal-black">
      {/* Header */}
      <header className="border-b-2 border-brutal-black p-4 md:p-6 flex flex-col md:flex-row items-center md:items-end justify-between gap-4 md:gap-6 bg-white z-40 header-mobile-refine">
        <div className="flex flex-col gap-4 w-full md:w-auto">
          <div className="flex items-center gap-3">
            <Logo size={isMobile ? 32 : 44} showText={false} />
            <h1 className="text-3xl md:text-5xl font-display uppercase tracking-tighter leading-none app-title">
              Ink<span style={{ color: 'var(--neon-green)' }}>Twin</span>
            </h1>
          </div>
          
          {/* Phase Navigation */}
          <div className="flex gap-2 p-1 overflow-x-auto no-scrollbar scroll-smooth -webkit-overflow-scrolling-touch relative nav-container max-w-full">
            <style>{`
              .no-scrollbar::-webkit-scrollbar { display: none; }
              .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
              
              @media (max-width: 768px) {
                .header-mobile-refine {
                  padding-left: 16px !important;
                  overflow: visible !important;
                }
                .app-title {
                  font-size: clamp(1.2rem, 5vw, 2rem) !important;
                }
                .nav-container {
                  display: flex !important;
                  flex-direction: row !important;
                  overflow-x: auto !important;
                  overflow-y: hidden !important;
                  -webkit-overflow-scrolling: touch !important;
                  scrollbar-width: none !important;
                  gap: 8px !important;
                  padding: 0 16px !important;
                  margin-left: -16px;
                  margin-right: -16px;
                  width: calc(100% + 32px) !important;
                }
                .nav-tab { 
                  flex-shrink: 0 !important;
                  min-width: 130px !important;
                  font-size: 11px !important;
                  padding: 8px 12px !important;
                  height: 50px !important;
                  text-align: center;
                  white-space: nowrap;
                }
                .step-indicator-container {
                  display: flex !important;
                  overflow-x: auto !important;
                  scrollbar-width: none !important;
                  gap: 6px !important;
                  padding: 8px 16px !important;
                  margin-left: -16px;
                  margin-right: -16px;
                  width: calc(100% + 32px) !important;
                  -webkit-overflow-scrolling: touch !important;
                }
                .step-indicator-container::-webkit-scrollbar {
                  display: none;
                }
                .step-btn {
                  flex-shrink: 0 !important;
                  min-width: 44px !important;
                }
              }
            `}</style>
            <button 
              onClick={() => setPhase('font-creation')}
              className={cn(
                "px-4 py-2 border-2 border-brutal-black font-display uppercase text-sm transition-all nav-tab whitespace-nowrap",
                phase === 'font-creation' ? "bg-neon-green brutal-shadow" : "bg-white hover:bg-neutral-50"
              )}
            >
              ✏️ Create My Font
            </button>
            <button 
              onClick={() => setPhase('text-writer')}
              className={cn(
                "px-4 py-2 border-2 border-brutal-black font-display uppercase text-sm transition-all nav-tab whitespace-nowrap",
                phase === 'text-writer' ? "bg-neon-green brutal-shadow" : "bg-white hover:bg-neutral-50"
              )}
            >
              📝 Write with My Handwriting
            </button>
            <button 
              onClick={() => setPhase('homework-solver')}
              className={cn(
                "px-4 py-2 border-2 border-brutal-black font-display uppercase text-sm transition-all nav-tab whitespace-nowrap",
                phase === 'homework-solver' ? "bg-neon-green brutal-shadow" : "bg-white hover:bg-neutral-50"
              )}
            >
              🎓 AI Study Assistant
            </button>
            <button 
              onClick={() => setPhase('find-font')}
              className={cn(
                "px-4 py-2 border-2 border-brutal-black font-display uppercase text-sm transition-all nav-tab whitespace-nowrap",
                phase === 'find-font' ? "bg-neon-green brutal-shadow" : "bg-white hover:bg-neutral-50"
              )}
            >
              🔍 Find My Font
            </button>
          </div>
        </div>
        
        {phase === 'font-creation' && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 step-indicator-container">
            {[
              { id: 1, label: "01 TEMPLATE", short: "01" },
              { id: 2, label: "02 UPLOAD", short: "02" },
              { id: 3, label: "03 DETECT", short: "03" },
              { id: 4, label: "04 PROCESS", short: "04" },
              { id: 5, label: "05 VECTOR", short: "05" },
              { id: 6, label: "06 PREVIEW", short: "06" }
            ].map((s) => (
              <div 
                key={s.id}
                className={cn(
                  "font-mono text-[11px] font-bold px-3 py-1 border border-brutal-black transition-all flex-shrink-0 min-h-[44px] flex items-center justify-center min-w-[44px] step-btn",
                  step === s.id ? "bg-brutal-black text-white opacity-100" : "opacity-30 bg-white"
                )}
              >
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.short}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="p-2 border-2 border-brutal-black hover:bg-neon-green transition-colors bg-white text-brutal-black dark:bg-brutal-black dark:text-white"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 border-2 border-brutal-black hover:bg-neon-green transition-colors"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={() => {
              document.getElementById('support-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            title="Support InkTwin"
            className="p-2 border-2 border-brutal-black hover:bg-neon-green transition-colors"
          >
            <Coffee size={20} />
          </button>
        </div>
      </header>

      <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
        {phase === 'font-creation' ? (
          <>
            {/* Sidebar */}
            <aside className="w-full md:w-[280px] border-b-2 md:border-b-0 md:border-r-2 border-brutal-black p-6 flex flex-col gap-8 bg-white overflow-y-auto">
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60">System Status</h3>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span>Step:</span>
                <span className="font-bold">0{step}</span>
              </div>
              <div className="flex justify-between">
                <span>API:</span>
                <span className={cn("font-bold", apiKey ? "text-green-600" : "text-red-600")}>
                  {apiKey ? "CONNECTED" : "MISSING"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pages:</span>
                <span className="font-bold">{uploadedImages.length}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60">Instructions</h3>
            <p className="text-xs leading-relaxed">
              {step === 1 && "Start by downloading the template and filling it with your unique handwriting style."}
              {step === 2 && "Upload your completed template pages. Ensure the lighting is even and the text is clear."}
              {step === 3 && "Review the detected characters. Gemini has identified the bounding boxes for each glyph."}
              {step === 5 && "The characters have been vectorized. Review the paths before generating the final font file."}
              {step === 6 && "Your font is ready! Test it in the preview area and download the .ttf file."}
            </p>
          </div>

          <div className="mt-auto pt-6">
            {step === 3 && (
              <button 
                onClick={startAnalysis}
                disabled={isAnalyzing}
                className="w-full brutal-btn mb-3 flex items-center justify-center gap-2 bg-warning-yellow"
              >
                <RefreshCw className={cn(isAnalyzing && "animate-spin")} size={16} />
                Re-analyze All
              </button>
            )}
            {step > 1 && (
              <button 
                onClick={() => setStep((prev) => (prev - 1) as AppStep)}
                className="w-full brutal-btn mb-3"
              >
                ← Back
              </button>
            )}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-full brutal-btn text-xs"
            >
              Update API Key
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="flex-grow p-6 bg-neutral-100 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              {/* Step 1: Welcome & Template */}
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <h2 className="text-4xl sm:text-6xl font-display uppercase leading-none tracking-tighter break-words">Handwriting to Digital Font.</h2>
                    <p className="text-base sm:text-xl font-mono opacity-70">
                      [VERSION_1.0] AI-POWERED VECTORIZATION ENGINE
                    </p>
                  </div>

                  {/* Beginner-friendly explainer */}
                  <div className="brutal-card brutal-shadow bg-neon-green/10 border-neon-green">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="text-2xl">👋</span>
                      <div>
                        <h3 className="text-lg sm:text-xl font-display uppercase">New here? Read this first.</h3>
                        <p className="font-mono text-xs opacity-70 mt-1">
                          Pick whichever option works for you — all 3 give you a real digital font.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 font-mono text-xs sm:text-sm">
                      <div className="flex gap-3">
                        <span className="font-bold text-brutal-black whitespace-nowrap">OPTION A</span>
                        <span>
                          <span className="font-bold">Easy:</span> Tap <span className="font-bold">Download PDF</span> below, print it, fill every box with a black pen, then snap a photo and upload.
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <span className="font-bold text-brutal-black whitespace-nowrap">OPTION B</span>
                        <span>
                          <span className="font-bold">No printer?</span> Draw a grid that matches the template — <span className="font-bold">4 columns × 5 rows of equal-sized boxes</span> per page, leaving comfortable space between cells. Write the printed label (A, B, C…) in the top-left corner of each box, then the handwritten character clearly inside, filling roughly half the box. Use a black or dark-blue pen.
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <span className="font-bold text-brutal-black whitespace-nowrap">OPTION C</span>
                        <span>
                          <span className="font-bold">Just want letters:</span> Write <span className="font-bold">A–Z</span> (uppercase), <span className="font-bold">a–z</span> (lowercase) and <span className="font-bold">0–9</span> clearly on any paper, then upload.
                        </span>
                      </div>
                      <div className="flex gap-3 pt-3 border-t-2 border-brutal-black">
                        <span className="font-bold whitespace-nowrap">⏰ NO TIME?</span>
                        <span>
                          Skip this entirely — head to{' '}
                          <button
                            onClick={() => setPhase('find-font')}
                            className="underline font-bold hover:text-brutal-black"
                          >
                            🔍 Find My Font
                          </button>
                          {' '}and upload any handwritten sentence or page. We'll match it to the closest font for you.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-8 mt-8">
                    <div className="brutal-card brutal-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                      <div className="w-12 h-12 bg-brutal-black text-white flex items-center justify-center mb-6">
                        <Download size={24} />
                      </div>
                      <h3 className="text-2xl font-display uppercase mb-4">01. Download</h3>
                      <p className="font-mono text-sm mb-8 opacity-70">
                        Optional — grab the A4 template if you'd like printed boxes to write in. Skip if you're using your own paper.
                      </p>
                      <button 
                        onClick={handleDownloadTemplate}
                        className="w-full brutal-btn brutal-btn-primary"
                      >
                        Download PDF
                      </button>
                    </div>

                    <div className="brutal-card brutal-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                      <div className="w-12 h-12 bg-brutal-black text-white flex items-center justify-center mb-6">
                        <Upload size={24} />
                      </div>
                      <h3 className="text-2xl font-display uppercase mb-4">02. Upload</h3>
                      <p className="font-mono text-sm mb-8 opacity-70">
                        Photograph or scan your filled template, your own grid, or your A–Z & 0–9 page. Multiple photos OK.
                      </p>
                      <div className="flex flex-col gap-3">
                        <label className="w-full brutal-btn brutal-btn-primary flex items-center justify-center gap-2 cursor-pointer">
                          <Upload size={18} />
                          Upload Photo or PDF
                          <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                        </label>
                        <button 
                          onClick={() => setIsCameraOpen(true)}
                          className="w-full brutal-btn flex items-center justify-center gap-2"
                        >
                          <Camera size={18} />
                          Capture with Camera
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Review Uploads */}
              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between border-b-2 border-brutal-black pb-4">
                    <h2 className="text-3xl font-display uppercase">Review Uploads</h2>
                    <button 
                      onClick={startAnalysis}
                      disabled={isAnalyzing}
                      className="brutal-btn brutal-btn-primary flex items-center gap-2"
                    >
                      {isAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : "Start AI Analysis →"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {uploadedImages.map((img, i) => (
                      <div key={i} className="aspect-[3/4] brutal-border bg-white p-2 relative group brutal-shadow">
                        <img src={img} className="w-full h-full object-cover" alt={`Page ${i+1}`} />
                        <button 
                          onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-4 right-4 p-2 bg-error-red text-white border-2 border-brutal-black opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-[3/4] brutal-border border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-neon-green/10 transition-colors">
                      <Upload size={32} className="opacity-30" />
                      <span className="font-mono text-xs font-bold uppercase">Add Photo/PDF</span>
                      <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                    </label>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Detection Results */}
              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between border-b-2 border-brutal-black pb-4">
                    <h2 className="text-3xl font-display uppercase">Detected Glyphs</h2>
                    <div className="flex gap-4">
                      <button 
                        onClick={startAnalysis}
                        disabled={isAnalyzing}
                        className="brutal-btn flex items-center gap-2"
                      >
                        <RefreshCw className={cn(isAnalyzing && "animate-spin")} size={18} />
                        Re-analyze
                      </button>
                      <button 
                        onClick={() => setStep(4)}
                        className="brutal-btn brutal-btn-primary"
                      >
                        Process & Vectorize →
                      </button>
                    </div>
                  </div>

                  <div className="bg-white brutal-border p-6 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 brutal-shadow">
                    {detectedChars.map((char, i) => (
                      <div 
                        key={i} 
                        onClick={() => setEditingCharIndex(i)}
                        className={cn(
                          "aspect-square border-2 relative group overflow-hidden flex items-center justify-center cursor-pointer hover:scale-105 transition-transform",
                          char.confidence > 0.8 ? "border-neon-green bg-neon-green/5" :
                          char.confidence > 0.5 ? "border-warning-yellow bg-warning-yellow/5" :
                          char.confidence > 0 ? "border-error-red bg-error-red/5" : "border-neutral-200 border-dashed"
                        )}
                      >
                        <span className="absolute top-1 left-1 font-mono text-[9px] font-bold opacity-40">{char.char}</span>
                        {char.imageData ? (
                          <img src={char.imageData} className="w-full h-full object-contain p-2" alt={char.char} />
                        ) : (
                          <AlertCircle size={16} className="opacity-20" />
                        )}
                        
                        {char.confidence > 0 && (
                          <div className={cn(
                            "absolute bottom-0 right-0 px-1 font-mono text-[8px] font-bold text-white",
                            char.confidence > 0.8 ? "bg-neon-green text-brutal-black" :
                            char.confidence > 0.5 ? "bg-warning-yellow text-brutal-black" : "bg-error-red"
                          )}>
                            {char.confidence.toFixed(2)}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-brutal-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <RefreshCw size={16} className="text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 4: Processing */}
              {step === 4 && (
                <motion.div 
                  key="step4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-32 space-y-8 min-h-[400px]"
                >
                  <div className="relative">
                    <RefreshCw size={80} className="text-brutal-black animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-xl font-display text-brutal-black">{processingProgress}%</div>
                    </div>
                  </div>
                  <div className="text-center space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-4xl font-display uppercase text-brutal-black">Vectorizing...</h2>
                      <p className="font-mono text-sm opacity-60 text-brutal-black">CHARACTER: {processingChar || 'INITIALIZING'}</p>
                    </div>
                    <div className="w-64 h-4 brutal-border bg-white overflow-hidden">
                      <div 
                        className="h-full bg-neon-green transition-all duration-300" 
                        style={{ width: `${processingProgress}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 5: Vector Review */}
              {step === 5 && (
                <motion.div 
                  key="step5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between border-b-2 border-brutal-black pb-4">
                    <div className="space-y-1">
                      <h2 className="text-3xl font-display uppercase">Vector Paths</h2>
                      <p className="font-mono text-[10px] opacity-60 uppercase">Review the mathematical paths generated from your ink.</p>
                    </div>
                    <button 
                      onClick={generateFont}
                      className="brutal-btn brutal-btn-primary"
                    >
                      Assemble Font →
                    </button>
                  </div>

                  <div className="bg-white brutal-border p-6 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 brutal-shadow">
                    {detectedChars.map((char, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "aspect-square border-2 relative group flex items-center justify-center p-2",
                          char.svgPath ? "border-neon-green bg-white" : "border-neutral-200 border-dashed bg-neutral-50"
                        )}
                      >
                        <span className="absolute top-1 left-1 font-mono text-[8px] font-bold opacity-30">{char.char}</span>
                        
                        {char.svgPath ? (
                          <svg viewBox="0 0 500 500" className="w-full h-full fill-brutal-black">
                            <path d={char.svgPath} fillRule="evenodd" />
                          </svg>
                        ) : char.imageData ? (
                          <div className="flex flex-col items-center gap-1 opacity-40">
                            <AlertCircle size={12} />
                            <span className="font-mono text-[8px]">FAILED</span>
                          </div>
                        ) : (
                          <span className="font-mono text-[8px] opacity-20">EMPTY</span>
                        )}

                        {/* Hover to see original */}
                        {char.imageData && (
                          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                            <img src={char.imageData} className="w-full h-full object-contain opacity-40" alt="Original" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="bg-brutal-black text-white font-mono text-[8px] px-1">ORIGINAL</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 6: Preview & Download */}
              {step === 6 && (
                <motion.div 
                  key="step6"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                      <div className="brutal-card brutal-shadow space-y-6">
                        <h3 className="font-display uppercase text-xl">Font Config</h3>
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="font-mono text-[10px] font-bold uppercase opacity-60">Font Name</label>
                            <input 
                              type="text" 
                              value={fontConfig.name}
                              onChange={(e) => setFontConfig({...fontConfig, name: e.target.value})}
                              className="w-full px-4 py-2 brutal-border font-mono outline-none focus:bg-neon-green/10"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-mono text-[10px] font-bold uppercase opacity-60">Letter Spacing</label>
                            <input 
                              type="range" min="-50" max="100" 
                              value={fontConfig.letterSpacing}
                              onChange={(e) => setFontConfig({...fontConfig, letterSpacing: parseInt(e.target.value)})}
                              className="w-full accent-brutal-black"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-mono text-[10px] font-bold uppercase opacity-60">Preview Size</label>
                            <input 
                              type="range" min="12" max="120" 
                              value={fontConfig.fontSize}
                              onChange={(e) => setFontConfig({...fontConfig, fontSize: parseInt(e.target.value)})}
                              className="w-full accent-brutal-black"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={downloadFont}
                            className="flex-grow brutal-btn brutal-btn-primary flex items-center justify-center gap-2"
                          >
                            <Download size={20} />
                            Download .TTF
                          </button>
                          <button 
                            onClick={handleSaveFont}
                            className="brutal-btn bg-neon-green flex items-center justify-center p-2"
                            title="Save to Library"
                          >
                            <CheckCircle2 size={20} />
                          </button>
                        </div>
                        <button 
                          onClick={async () => {
                            await handleSaveFont();
                            setPhase('text-writer');
                          }}
                          className="w-full brutal-btn bg-warning-yellow flex items-center justify-center gap-2"
                        >
                          <Sparkles size={20} />
                          Use this Handwriting
                        </button>
                      </div>

                      <div className="p-6 brutal-border bg-neon-green/5 space-y-4">
                        <h4 className="font-display uppercase text-sm flex items-center gap-2">
                          <AlertCircle size={16} />
                          Installation
                        </h4>
                        <div className="font-mono text-[11px] space-y-2 leading-relaxed">
                          <p>WIN: Right-click &gt; Install</p>
                          <p>MAC: Double-click &gt; Install</p>
                          <p>IOS: Use iFont app</p>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-2 space-y-4">
                      <h3 className="font-display uppercase text-xl">Live Preview</h3>
                      <div className="brutal-card brutal-shadow min-h-[500px] flex flex-col">
                        <textarea 
                          className="flex-grow w-full bg-transparent outline-none resize-none leading-relaxed font-mono p-4"
                          placeholder="Type to test your font..."
                          style={{ 
                            fontFamily: 'inktwin-preview',
                            fontSize: `${fontConfig.fontSize}px`,
                            letterSpacing: `${fontConfig.letterSpacing / 10}px`
                          }}
                          defaultValue="THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG. 0123456789 !?@#"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
          </>
        ) : phase === 'text-writer' ? (
          <HandwritingWriter 
            fontUrl={fontUrl} 
            fontName={fontConfig.name} 
            apiKey={apiKey} 
            savedFonts={savedFonts}
            onSelectFont={(font) => {
              setFontUrl(font.url);
              setFontConfig(prev => ({ ...prev, name: font.name }));
            }}
            onDeleteFont={handleDeleteFont}
            onRenameFont={handleRenameFont}
            onUploadFont={(font) => {
              setSavedFonts(prev => [...prev, font]);
              setFontUrl(font.url);
              setFontConfig(prev => ({ ...prev, name: font.name }));
            }}
            initialText={prefilledWriterText}
            onTextConsumed={() => setPrefilledWriterText(null)}
            initialProfile={pendingProfile}
            onProfileApplied={() => setPendingProfile(null)}
            onNavigate={(p) => setPhase(p)}
          />
        ) : phase === 'homework-solver' ? (
          <HomeworkSolver 
            apiKey={apiKey}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSendToWriter={(text) => {
              setPrefilledWriterText(text);
              setPhase('text-writer');
            }}
            onOpenCamera={() => setIsCameraOpen(true)}
          />
        ) : phase === 'find-font' ? (
          <FindFont 
            apiKey={apiKey}
            onFontSelected={(name, url, profile) => {
              setFontUrl(url);
              setFontConfig(prev => ({ ...prev, name }));
              setPendingProfile(profile);
              setPhase('text-writer');

              // Save to library
              const newFont: SavedFont = {
                id: Math.random().toString(36).substr(2, 9),
                name: profile.fontFamily,
                url: url || '', 
                createdAt: Date.now(),
                source: "Found - Phase 4",
                fontFamily: profile.fontFamily,
                googleFont: true,
                styleProfile: {
                  slant: profile.slant,
                  letterSpacing: profile.letterSpacing,
                  lineHeight: profile.lineHeight,
                  inkColor: profile.inkColor,
                  wobble: profile.wobble,
                  strokeWeight: profile.strokeWeight,
                  irregularity: profile.irregularity
                }
              };
              setSavedFonts(prev => [...prev, newFont]);
              setToast("Font saved to library!");
            }}
            onGoToPhase1={() => setPhase('font-creation')}
          />
        ) : null}
      </div>

      {/* Support Section */}
      <div className="px-6 py-6 border-t-2 border-brutal-black bg-[var(--bg-secondary)]">
        <div className="max-w-2xl mx-auto">
          <SupportCard id="support-card" />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t-2 border-brutal-black p-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-white">
        <div className="flex gap-6">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold">
            <div className="w-3 h-3 bg-neon-green brutal-border" /> HIGH (0.8+)
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold">
            <div className="w-3 h-3 bg-warning-yellow brutal-border" /> MED (0.5-0.8)
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold">
            <div className="w-3 h-3 bg-error-red brutal-border" /> LOW (&lt;0.5)
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] opacity-40">INKTWIN_ENGINE_STABLE_V1.0</span>
          <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
        </div>
      </footer>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm"
              onClick={() => apiKey && setIsSettingsOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md p-8 brutal-shadow relative z-10 border-4 border-brutal-black"
            >
              <h2 className="text-3xl font-display uppercase mb-2">Gemini API Key</h2>
              <p className="font-mono text-xs opacity-60 mb-6 uppercase">
                [SECURE_STORAGE_V1] LOCAL_ONLY_ENCRYPTION
              </p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] font-bold uppercase opacity-60">API Key</label>
                  <input 
                    type="password" 
                    placeholder="Enter key..."
                    className="w-full px-4 py-3 bg-neutral-50 brutal-border font-mono outline-none focus:bg-neon-green/10"
                    onChange={(e) => setApiKey(e.target.value)}
                    value={apiKey}
                  />
                </div>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-brutal-black text-xs font-bold uppercase underline flex items-center gap-1 hover:text-neon-green"
                >
                  Get a free key from Google AI Studio
                  <ChevronRight size={14} />
                </a>
                <button 
                  onClick={() => saveApiKey(apiKey)}
                  className="w-full brutal-btn brutal-btn-primary"
                >
                  Save & Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-12 left-12 z-50 bg-error-red text-white px-6 py-4 border-4 border-brutal-black brutal-shadow flex items-center gap-4"
          >
            <AlertCircle size={24} />
            <div className="flex flex-col">
              <span className="font-display uppercase text-xs">System Error</span>
              <span className="font-mono text-[10px]">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="ml-4 hover:rotate-180 transition-transform">
              <RefreshCw size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-12 right-12 z-[100] bg-neon-green text-brutal-black px-6 py-4 border-4 border-brutal-black brutal-shadow flex items-center gap-4 font-display uppercase text-sm"
          >
            <CheckCircle2 size={24} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Capture Modal */}
      {isCameraOpen && (
        <CameraCapture 
          onCapture={async (img) => {
            const scaled = await downscaleForAnalysis(img, 1600, 0.9);
            setUploadedImages(prev => [...prev, scaled]);
            setStep(2);
          }}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* Glyph Editor Modal */}
      {editingCharIndex !== null && (
        <GlyphEditor 
          char={detectedChars[editingCharIndex].char}
          initialImage={detectedChars[editingCharIndex].imageData}
          onSave={async (newImg) => {
            const normalized = await normalizeManualDrawing(newImg);
            setDetectedChars(prev => {
              const next = [...prev];
              next[editingCharIndex] = {
                ...next[editingCharIndex],
                imageData: normalized,
                confidence: 1.0 // Manual edit is high confidence
              };
              return next;
            });
            setEditingCharIndex(null);
          }}
          onClose={() => setEditingCharIndex(null)}
          onReanalyze={() => handleReanalyzeChar(editingCharIndex)}
        />
      )}
    </div>
  );
}
