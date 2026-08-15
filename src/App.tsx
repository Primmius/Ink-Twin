/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  Upload, 
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
  Coffee,
  PenTool,
  Search,
  Check,
  RotateCcw,
  Sliders,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  ExternalLink
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
import { TouchDrawingPad } from './components/TouchDrawingPad';
import { HandwritingWriter } from './components/writer/HandwritingWriter';
import { HomeworkSolver } from './components/HomeworkSolver';
import { FindFont } from './components/FindFont';
import { AIHumanizer } from './components/AIHumanizer';
import { UseCasePage } from './use-cases/UseCasePage';
import { ApiKeyModal } from './components/ApiKeyModal';

export function isApiKeyProblem(err: any): boolean {
  if (!err) return false;
  const msg = typeof err === 'string' ? err : err?.message || JSON.stringify(err) || '';
  const lower = msg.toLowerCase();
  return (
    lower.includes("you don't have the api key set up yet") ||
    lower.includes("api key not valid") ||
    lower.includes("api_key_invalid") ||
    lower.includes("invalid api key") ||
    lower.includes("api key not found") ||
    lower.includes("api key missing") ||
    lower.includes("invalid_argument") ||
    lower.includes("unauthenticated") ||
    lower.includes("permission_denied") ||
    lower.includes("400") ||
    lower.includes("403")
  );
}

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('home');
  const [useCaseSlug, setUseCaseSlug] = useState<string | null>(null);
  const [step, setStep] = useState<AppStep>(1);
  const [apiKey, setApiKey] = useState<string>(() => {
    const saved = localStorage.getItem('geminiApiKey') || localStorage.getItem('gemini_api_key') || '';
    if (!saved || saved.includes('YOUR_API') || saved.trim().length < 8) {
      return '';
    }
    return saved.trim();
  });
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyModalInvalid, setApiKeyModalInvalid] = useState(false);
  const [apiKeyModalMessage, setApiKeyModalMessage] = useState<string | undefined>(undefined);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [editingCharIndex, setEditingCharIndex] = useState<number | null>(null);
  const [drawingCharIndex, setDrawingCharIndex] = useState<number | null>(null);
  const [prefilledWriterText, setPrefilledWriterText] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(localStorage.getItem('theme') as 'light' | 'dark' || 'light');
  const [pendingFontToName, setPendingFontToName] = useState<{ name: string; url: string; profile: any; fontFamily: string } | null>(null);
  const [humanizerPrefill, setHumanizerPrefill] = useState<string | null>(null);
  const [charFilter, setCharFilter] = useState<'all' | 'detected' | 'missing'>('all');
  
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
    fontSize: 44
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

  useEffect(() => {
    const handleRoute = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path.startsWith('/use-cases/')) {
        const slug = path.split('/use-cases/')[1];
        setUseCaseSlug(slug);
        setPhase('use-case' as any);
      } else if (hash.startsWith('#/use-cases/')) {
        const slug = hash.split('#/use-cases/')[1];
        setUseCaseSlug(slug);
        setPhase('use-case' as any);
      }
    };
    handleRoute();
    window.addEventListener('popstate', handleRoute);
    window.addEventListener('hashchange', handleRoute);
    return () => {
      window.removeEventListener('popstate', handleRoute);
      window.removeEventListener('hashchange', handleRoute);
    };
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
    const fontName = fontConfig.name || `Custom Font ${savedFonts.length + 1}`;
    const alreadySaved = savedFonts.some(f => f.name === fontName && f.source === 'Phase 1');
    if (alreadySaved) {
      setToast("Already in library!");
      return;
    }
    const response = await fetch(fontUrl);
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    setSavedFonts(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      name: fontName,
      url: dataUrl,
      createdAt: Date.now(),
      source: 'Phase 1',
    }]);
    setToast("Font saved to library!");
  };

  const savePendingFont = () => {
    if (!pendingFontToName) return;
    const { name, url, profile, fontFamily } = pendingFontToName;
    const trimmedName = name.trim() || fontFamily;
    setSavedFonts(prev => {
      const alreadySaved = prev.some(f => f.name === trimmedName && f.googleFont);
      if (alreadySaved) {
        setToast("Font already in library!");
        return prev;
      }
      return [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        name: trimmedName,
        url,
        createdAt: Date.now(),
        source: 'Find My Font',
        fontFamily,
        googleFont: true,
        styleProfile: {
          slant: profile.slant,
          letterSpacing: profile.letterSpacing,
          lineHeight: profile.lineHeight,
          inkColor: profile.inkColor,
          wobble: profile.wobble,
          strokeWeight: profile.strokeWeight,
          irregularity: profile.irregularity,
        },
      }];
    });
    setToast("Font saved to library!");
    setFontUrl(url);
    setFontConfig(prev => ({ ...prev, name: trimmedName }));
    setPendingProfile(profile);
    setPendingFontToName(null);
    setPhase('text-writer');
  };

  const handleDeleteFont = (id: string) => {
    setSavedFonts(prev => prev.filter(f => f.id !== id));
  };

  const handleRenameFont = (id: string, newName: string) => {
    setSavedFonts(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
  };

  const handleGoHome = () => {
    setPhase('home');
    setStep(1);
    setUseCaseSlug(null);
    if (window.location.hash || window.location.pathname.startsWith('/use-cases/')) {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const promptApiKey = (message?: string, isInvalid = false) => {
    setApiKeyModalMessage(message || "Connect your free Gemini API key to enable AI handwriting recognition and homework solving.");
    setApiKeyModalInvalid(isInvalid);
    setIsApiKeyModalOpen(true);
  };

  const saveApiKey = (key: string) => {
    const cleanKey = key.trim();
    setApiKey(cleanKey);
    localStorage.setItem('geminiApiKey', cleanKey);
    localStorage.setItem('gemini_api_key', cleanKey);
    setIsApiKeyModalOpen(false);
    setIsSettingsOpen(false);
    setError(null);
    setToast("API key saved!");
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
    if (!apiKey || !apiKey.trim() || apiKey.trim().length < 8) {
      promptApiKey("You don't have the API key set up yet. Please set up the API key.");
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
        throw new Error("No characters were detected. Please ensure your handwriting photo is well-lit and clear.");
      }
      
      // Merge results
      const merged = CHARACTERS_TO_DETECT.map(targetChar => {
        const found = allDetected.filter(d => d.char === targetChar)
          .sort((a, b) => b.confidence - a.confidence)[0];
        return found || { char: targetChar, confidence: 0, boundingBox: { x: 0, y: 0, width: 0, height: 0 } };
      });

      setDetectedChars(merged);
      setStep(3);
    } catch (err: any) {
      console.error("Analysis error", err);
      if (isApiKeyProblem(err)) {
        setApiKey('');
        localStorage.removeItem('geminiApiKey');
        localStorage.removeItem('gemini_api_key');
        promptApiKey("Your API key is invalid or not set up. Please set up the API key.", true);
      } else {
        setError(err.message || "Failed to analyze handwriting. Check image quality.");
      }
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
    if (!apiKey || !apiKey.trim() || apiKey.trim().length < 8) {
      promptApiKey("You don't have the API key set up yet. Please set up the API key.");
      throw new Error("You don't have the API key set up yet. Please set up the API key.");
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
        if (isApiKeyProblem(e)) {
          setApiKey('');
          localStorage.removeItem('geminiApiKey');
          localStorage.removeItem('gemini_api_key');
          promptApiKey("Your API key is invalid or expired. Please set up a valid Gemini API key.", true);
          return;
        }
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

  const stepNames: Record<AppStep, string> = {
    1: "Template & Upload",
    2: "Review Uploaded Scans",
    3: "Character Extraction",
    4: "Vectorizing Paths",
    5: "Fine-tune Glyphs",
    6: "Test & Export Font"
  };

  const filteredChars = detectedChars.filter(c => {
    if (charFilter === 'detected') return c.confidence > 0;
    if (charFilter === 'missing') return !c.confidence || c.confidence === 0;
    return true;
  });

  const detectedCount = detectedChars.filter(c => c.confidence > 0).length;

  if (phase === 'home') {
    return (
      <LandingPage
        onSaveKey={saveApiKey}
        onExplore={(p) => setPhase(p || 'font-creation')}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div 
      className="min-h-screen font-body flex flex-col selection:bg-warning-yellow selection:text-neutral-950 pb-20 md:pb-0" 
      style={{ 
        backgroundColor: 'var(--bg-primary)', 
        color: 'var(--text-primary)' 
      }}
    >
      {/* Sticky Top Header */}
      <header 
        className="sticky top-0 z-30 border-b p-3 sm:p-4 flex items-center justify-between backdrop-blur-md bg-white/90 dark:bg-neutral-900/90"
        style={{ borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleGoHome}
            className="flex items-center gap-2 text-left bg-transparent border-0 p-0 cursor-pointer group active:scale-95 transition-transform"
            title="Go to InkTwin Home"
            aria-label="Go to InkTwin Home"
          >
            <Logo size={32} showText={false} className="group-hover:scale-105 transition-transform" />
            <h1 className="text-lg sm:text-xl font-display font-bold uppercase tracking-tight leading-none flex items-baseline gap-0.5 text-neutral-950 dark:text-white">
              Ink<span className="text-warning-yellow">Twin</span>
            </h1>
          </button>

          <a
            href="https://primuez.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-warning-yellow hover:border-warning-yellow transition-all"
            title="Visit Primuez portfolio (primuez.in)"
          >
            <span className="opacity-60 text-[9px]">by</span>
            <span className="underline underline-offset-2">primuez.in</span>
            <ExternalLink size={10} className="opacity-60" />
          </a>

          {/* Desktop Navigation Pill Bar */}
          <nav className="hidden md:flex items-center gap-1.5 ml-4 bg-neutral-100 dark:bg-neutral-800/70 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
            <button
              onClick={handleGoHome}
              className={cn(
                "px-3 py-1.5 rounded-lg font-display text-xs font-bold uppercase tracking-wider transition-all",
                phase === 'home' 
                  ? "bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-sm" 
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              Home
            </button>
            <button
              onClick={() => setPhase('font-creation')}
              className={cn(
                "px-3 py-1.5 rounded-lg font-display text-xs font-bold uppercase tracking-wider transition-all",
                phase === 'font-creation' 
                  ? "bg-warning-yellow text-neutral-950 shadow-sm" 
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              ✏️ Create Font
            </button>
            <button
              onClick={() => setPhase('text-writer')}
              className={cn(
                "px-3 py-1.5 rounded-lg font-display text-xs font-bold uppercase tracking-wider transition-all",
                phase === 'text-writer' 
                  ? "bg-warning-yellow text-neutral-950 shadow-sm" 
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              📝 Studio Writer
            </button>
            <button
              onClick={() => setPhase('homework-solver')}
              className={cn(
                "px-3 py-1.5 rounded-lg font-display text-xs font-bold uppercase tracking-wider transition-all",
                phase === 'homework-solver' 
                  ? "bg-warning-yellow text-neutral-950 shadow-sm" 
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              🎓 AI Solver
            </button>
            <button
              onClick={() => setPhase('find-font')}
              className={cn(
                "px-3 py-1.5 rounded-lg font-display text-xs font-bold uppercase tracking-wider transition-all",
                phase === 'find-font' 
                  ? "bg-warning-yellow text-neutral-950 shadow-sm" 
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              🔍 Find Font
            </button>
            <button
              onClick={() => setPhase('ai-humanizer')}
              className={cn(
                "px-3 py-1.5 rounded-lg font-display text-xs font-bold uppercase tracking-wider transition-all",
                phase === 'ai-humanizer' 
                  ? "bg-warning-yellow text-neutral-950 shadow-sm" 
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              ✨ Humanizer
            </button>
          </nav>
        </div>

        {/* Right Tools: API status, Theme, Settings */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* API Key Status Badge */}
          <button
            onClick={() => promptApiKey(undefined, false)}
            className={cn(
              "px-2.5 py-1.5 rounded-xl border text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-all active:scale-95",
              apiKey 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
            )}
            title="Gemini API Key Connection"
          >
            <div className={cn("w-2 h-2 rounded-full", apiKey ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} />
            <span className="hidden sm:inline">{apiKey ? "AI Connected" : "Connect AI"}</span>
          </button>

          <button 
            onClick={toggleTheme}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            aria-label="Toggle dark mode"
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>

          <button
            onClick={() => promptApiKey(undefined, false)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
            title="Settings"
            aria-label="Open Settings"
          >
            <Settings size={17} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-grow flex flex-col overflow-x-hidden">
        {phase === 'font-creation' ? (
          <div className="flex-grow flex flex-col">
            {/* Step Navigation Sub-Header */}
            <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-2.5 z-20 shadow-xs">
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {step > 1 && (
                    <button
                      onClick={() => setStep((prev) => (prev - 1) as AppStep)}
                      className="p-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
                      title="Previous step"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold uppercase text-warning-yellow bg-warning-yellow/10 px-2 py-0.5 rounded border border-warning-yellow/30">
                      Step 0{step} / 06
                    </span>
                    <span className="font-display font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                      {stepNames[step]}
                    </span>
                  </div>
                </div>

                {/* Step indicator pills */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        // Allow jumping to steps already unlocked
                        if (s <= step || (s === 2 && uploadedImages.length > 0) || (s === 3 && detectedChars.length > 0)) {
                          setStep(s as AppStep);
                        }
                      }}
                      className={cn(
                        "w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-[10px] sm:text-xs font-mono font-bold flex items-center justify-center transition-all",
                        step === s 
                          ? "bg-warning-yellow text-black font-bold shadow-sm ring-2 ring-warning-yellow/50" 
                          : s < step 
                            ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700" 
                            : "bg-neutral-100 dark:bg-neutral-800/40 text-neutral-400 opacity-40 cursor-not-allowed"
                      )}
                      title={`Step ${s}: ${stepNames[s as AppStep]}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step Body */}
            <div className="flex-grow p-4 sm:p-6 md:p-8 bg-neutral-50 dark:bg-neutral-950 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-6">
                <AnimatePresence mode="wait">

                  {/* Step 1: Welcome & Template Options */}
                  {step === 1 && (
                    <motion.div 
                      key="step1"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="space-y-6"
                    >
                      <div className="space-y-2 text-center sm:text-left pb-2 border-b border-neutral-200 dark:border-neutral-800">
                        <span className="text-xs font-mono uppercase text-warning-yellow font-bold tracking-wider">
                          Step 01 // Template & Upload
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-display font-extrabold uppercase tracking-tight text-neutral-900 dark:text-white">
                          Turn Handwriting into a Font
                        </h2>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-xl">
                          Create your own .ttf font file from handwriting photos or draw glyphs directly on your screen.
                        </p>
                      </div>

                      {/* Primary Action Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Option 1: Mobile Camera */}
                        <div className="p-5 rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-4 shadow-sm hover:border-neutral-900 dark:hover:border-neutral-600 transition-all flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="w-12 h-12 rounded-xl bg-warning-yellow/20 text-neutral-950 dark:text-warning-yellow flex items-center justify-center">
                              <Camera size={24} />
                            </div>
                            <h3 className="font-display font-bold text-lg text-neutral-900 dark:text-white">
                              Snap with Mobile Camera
                            </h3>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                              Take a photo of your handwritten A–Z and 0–9 on paper with your phone's camera.
                            </p>
                          </div>
                          <button
                            onClick={() => setIsCameraOpen(true)}
                            className="w-full py-3 rounded-xl bg-warning-yellow hover:bg-amber-300 text-black font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform"
                          >
                            <Camera size={16} />
                            Open Camera Shutter
                          </button>
                        </div>

                        {/* Option 2: Upload Photo / PDF */}
                        <div className="p-5 rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-4 shadow-sm hover:border-neutral-900 dark:hover:border-neutral-600 transition-all flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="w-12 h-12 rounded-xl bg-warning-yellow/20 text-neutral-950 dark:text-warning-yellow flex items-center justify-center">
                              <Upload size={24} />
                            </div>
                            <h3 className="font-display font-bold text-lg text-neutral-900 dark:text-white">
                              Upload Existing Photo / PDF
                            </h3>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                              Choose a photo or PDF scan from your photo gallery or files.
                            </p>
                          </div>
                          <label className="w-full py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95 transition-transform">
                            <Upload size={16} />
                            <span>Select Image / PDF</span>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                          </label>
                        </div>

                        {/* Option 3: Download A4 Grid Template */}
                        <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-4 shadow-sm flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
                              <Download size={20} />
                            </div>
                            <h3 className="font-display font-bold text-base text-neutral-900 dark:text-white">
                              Download Printable Template
                            </h3>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                              Print our pre-formatted A4 boxes to write in with a black pen, then photograph it.
                            </p>
                          </div>
                          <button
                            onClick={handleDownloadTemplate}
                            className="w-full py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 font-display font-bold text-xs uppercase tracking-wider text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center gap-2 transition-colors"
                          >
                            <Download size={15} />
                            Download PDF Grid
                          </button>
                        </div>

                        {/* Option 4: Draw directly on screen */}
                        <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-4 shadow-sm flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
                              <PenTool size={20} />
                            </div>
                            <h3 className="font-display font-bold text-base text-neutral-900 dark:text-white">
                              Draw on Screen with Finger
                            </h3>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                              No paper needed. Draw all characters one-by-one right on your touchscreen or tablet.
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              // Initialize blank detection and jump to Step 3
                              const blankChars = CHARACTERS_TO_DETECT.map(char => ({
                                char,
                                boundingBox: { x: 0, y: 0, width: 0, height: 0 },
                                confidence: 0
                              }));
                              setDetectedChars(blankChars);
                              setStep(3);
                            }}
                            className="w-full py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 font-display font-bold text-xs uppercase tracking-wider text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center gap-2 transition-colors"
                          >
                            <PenTool size={15} />
                            Start Drawing on Screen
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Review Scans / Uploads */}
                  {step === 2 && (
                    <motion.div 
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                        <div>
                          <span className="text-xs font-mono uppercase text-warning-yellow font-bold tracking-wider">
                            Step 02 // Review Uploads
                          </span>
                          <h2 className="text-xl sm:text-3xl font-display font-extrabold uppercase tracking-tight text-neutral-900 dark:text-white">
                            Review Uploaded Scans
                          </h2>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {uploadedImages.length} page{uploadedImages.length !== 1 ? 's' : ''} ready for AI analysis
                          </p>
                        </div>

                        <button 
                          onClick={startAnalysis}
                          disabled={isAnalyzing || uploadedImages.length === 0}
                          className="px-6 py-3 rounded-xl bg-warning-yellow hover:bg-amber-300 text-black font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-50 transition-all"
                        >
                          {isAnalyzing ? (
                            <>
                              <RefreshCw className="animate-spin" size={16} />
                              Analyzing Characters...
                            </>
                          ) : (
                            <>
                              <span>Start AI Analysis</span>
                              <ChevronRight size={16} />
                            </>
                          )}
                        </button>
                      </div>

                      {/* Upload grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {uploadedImages.map((img, i) => (
                          <div 
                            key={i} 
                            className="aspect-[3/4] rounded-xl border-2 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2 relative group overflow-hidden shadow-sm"
                          >
                            <img 
                              src={img} 
                              loading="lazy" 
                              className="w-full h-full object-contain rounded-lg" 
                              alt={`Scan Page ${i+1}`} 
                            />
                            <div className="absolute top-3 left-3 bg-neutral-900/80 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                              Page {i+1}
                            </div>
                            <button 
                              onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-3 right-3 p-2 bg-red-600 text-white rounded-lg opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete page"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}

                        <label className="aspect-[3/4] rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors p-4 text-center">
                          <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                            <Upload size={18} />
                          </div>
                          <span className="font-display font-bold text-xs uppercase text-neutral-700 dark:text-neutral-300">
                            Add Another Page
                          </span>
                          <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                        </label>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Detected Glyphs Grid */}
                  {step === 3 && (
                    <motion.div 
                      key="step3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-6"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                        <div>
                          <span className="text-xs font-mono uppercase text-warning-yellow font-bold tracking-wider">
                            Step 03 // Character Extraction
                          </span>
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl sm:text-3xl font-display font-extrabold uppercase tracking-tight text-neutral-900 dark:text-white">
                              Character Review &amp; Tuning
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full bg-warning-yellow/20 text-neutral-950 dark:text-yellow-300 font-mono text-xs font-bold">
                              {detectedCount} / {detectedChars.length} Detected
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            Tap any character to draw or adjust it directly on your screen
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={startAnalysis}
                            disabled={isAnalyzing || uploadedImages.length === 0}
                            className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-mono font-bold flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            title="Re-analyze images"
                          >
                            <RefreshCw className={cn(isAnalyzing && "animate-spin")} size={14} />
                            <span className="hidden sm:inline">Re-scan</span>
                          </button>
                          <button 
                            onClick={() => setStep(4)}
                            className="px-5 py-2.5 rounded-xl bg-warning-yellow hover:bg-amber-300 text-black font-display font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                          >
                            <span>Vectorize &amp; Continue</span>
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Filter Chips */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCharFilter('all')}
                          className={cn(
                            "px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all",
                            charFilter === 'all'
                              ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                              : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                          )}
                        >
                          All ({detectedChars.length})
                        </button>
                        <button
                          onClick={() => setCharFilter('detected')}
                          className={cn(
                            "px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all",
                            charFilter === 'detected'
                              ? "bg-emerald-500 text-white"
                              : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                          )}
                        >
                          Detected ({detectedCount})
                        </button>
                        <button
                          onClick={() => setCharFilter('missing')}
                          className={cn(
                            "px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all",
                            charFilter === 'missing'
                              ? "bg-amber-500 text-white"
                              : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                          )}
                        >
                          Missing ({detectedChars.length - detectedCount})
                        </button>
                      </div>

                      {/* Character Grid */}
                      <div className="p-4 sm:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5 sm:gap-3">
                        {filteredChars.map((char) => {
                          const originalIdx = detectedChars.findIndex(c => c.char === char.char);
                          const hasData = !!char.imageData;

                          return (
                            <div 
                              key={char.char} 
                              onClick={() => {
                                if (hasData) {
                                  setEditingCharIndex(originalIdx);
                                } else {
                                  setDrawingCharIndex(originalIdx);
                                }
                              }}
                              className={cn(
                                "aspect-square rounded-xl border-2 relative group overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 p-1.5",
                                char.confidence > 0.8 
                                  ? "border-emerald-500 bg-emerald-500/5 hover:border-emerald-600" 
                                  : char.confidence > 0.4 
                                    ? "border-amber-500 bg-amber-500/5 hover:border-amber-600" 
                                    : "border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/30 hover:border-warning-yellow"
                              )}
                              title={hasData ? `Edit '${char.char}'` : `Draw '${char.char}' on screen`}
                            >
                              <span className="absolute top-1 left-1.5 font-mono text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                                {char.char}
                              </span>

                              {hasData ? (
                                <img 
                                  src={char.imageData} 
                                  loading="lazy" 
                                  className="w-full h-full object-contain p-1.5" 
                                  alt={char.char} 
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center opacity-40 group-hover:opacity-100 group-hover:text-warning-yellow transition-all">
                                  <PenTool size={16} />
                                  <span className="text-[8px] font-mono mt-0.5">DRAW</span>
                                </div>
                              )}
                              
                              {char.confidence > 0 && (
                                <div className={cn(
                                  "absolute bottom-1 right-1 px-1 rounded text-[8px] font-mono font-bold text-white",
                                  char.confidence > 0.8 ? "bg-emerald-500" : "bg-amber-500"
                                  )}>
                                  {Math.round(char.confidence * 100)}%
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: Vectorizing Loading Screen */}
                  {step === 4 && (
                    <motion.div 
                      key="step4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-20 sm:py-28 space-y-6 text-center"
                    >
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full border-4 border-neutral-200 dark:border-neutral-800 border-t-warning-yellow animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center font-display font-bold text-xl text-neutral-900 dark:text-white">
                          {processingProgress}%
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-mono uppercase text-warning-yellow font-bold tracking-wider">
                          Step 04 // Vectorization
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-neutral-900 dark:text-white">
                          Vectorizing Glyph Paths...
                        </h2>
                        <p className="font-mono text-xs text-neutral-500 uppercase">
                          CURRENT GLYPH: <span className="font-bold text-warning-yellow">{processingChar || 'INITIALIZING'}</span>
                        </p>
                      </div>

                      <div className="w-full max-w-xs h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-warning-yellow transition-all duration-200 rounded-full" 
                          style={{ width: `${processingProgress}%` }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Step 5: Vector Review Grid */}
                  {step === 5 && (
                    <motion.div 
                      key="step5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-6"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                        <div>
                          <span className="text-xs font-mono uppercase text-warning-yellow font-bold tracking-wider">
                            Step 05 // Bezier Inspection
                          </span>
                          <h2 className="text-xl sm:text-3xl font-display font-extrabold uppercase tracking-tight text-neutral-900 dark:text-white">
                            Fine-tune Vector Glyphs
                          </h2>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            Mathematical bezier curves converted for font compilation
                          </p>
                        </div>

                        <button 
                          onClick={generateFont}
                          className="px-6 py-3 rounded-xl bg-warning-yellow hover:bg-amber-300 text-black font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
                        >
                          <Check size={16} />
                          <span>Assemble TrueType Font →</span>
                        </button>
                      </div>

                      <div className="p-4 sm:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5 sm:gap-3">
                        {detectedChars.map((char, i) => (
                          <div 
                            key={i} 
                            onClick={() => {
                              if (char.imageData) setEditingCharIndex(i);
                              else setDrawingCharIndex(i);
                            }}
                            className={cn(
                              "aspect-square rounded-xl border-2 relative group flex items-center justify-center p-2 cursor-pointer transition-all active:scale-95",
                              char.svgPath 
                                ? "border-emerald-500 bg-white dark:bg-neutral-800" 
                                : "border-neutral-200 dark:border-neutral-700 border-dashed bg-neutral-50 dark:bg-neutral-800/30"
                            )}
                            title={`Inspect/Edit ${char.char}`}
                          >
                            <span className="absolute top-1 left-1.5 font-mono text-[9px] font-bold text-neutral-400">
                              {char.char}
                            </span>
                            
                            {char.svgPath ? (
                              <svg viewBox="0 0 500 500" className="w-full h-full fill-neutral-900 dark:fill-white">
                                <path d={char.svgPath} fillRule="evenodd" />
                              </svg>
                            ) : (
                              <span className="font-mono text-[8px] text-neutral-400 opacity-40">EMPTY</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 6: Font Test Playground & Export */}
                  {step === 6 && (
                    <motion.div 
                      key="step6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Font Configuration Panel */}
                        <div className="space-y-4">
                          <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-4 shadow-sm">
                            <span className="text-xs font-mono uppercase text-warning-yellow font-bold tracking-wider">
                              Step 06 // Font Assembly
                            </span>
                            <h3 className="font-display font-bold text-base text-neutral-900 dark:text-white uppercase">
                              Font Details &amp; Metadata
                            </h3>

                            <div className="space-y-3">
                              <div>
                                <label className="text-[11px] font-mono font-bold uppercase text-neutral-500 block mb-1">
                                  Font Name
                                </label>
                                <input 
                                  type="text" 
                                  value={fontConfig.name}
                                  onChange={(e) => setFontConfig({...fontConfig, name: e.target.value})}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-medium focus:ring-2 focus:ring-warning-yellow outline-none"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[11px] font-mono font-bold text-neutral-500 mb-1">
                                  <span>Letter Spacing</span>
                                  <span>{fontConfig.letterSpacing}px</span>
                                </div>
                                <input 
                                  type="range" min="-30" max="80" 
                                  value={fontConfig.letterSpacing}
                                  onChange={(e) => setFontConfig({...fontConfig, letterSpacing: parseInt(e.target.value)})}
                                  className="w-full accent-warning-yellow"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[11px] font-mono font-bold text-neutral-500 mb-1">
                                  <span>Preview Size</span>
                                  <span>{fontConfig.fontSize}px</span>
                                </div>
                                <input 
                                  type="range" min="16" max="96" 
                                  value={fontConfig.fontSize}
                                  onChange={(e) => setFontConfig({...fontConfig, fontSize: parseInt(e.target.value)})}
                                  className="w-full accent-warning-yellow"
                                />
                              </div>
                            </div>

                            {/* Export Buttons */}
                            <div className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                              <button 
                                onClick={downloadFont}
                                className="w-full py-3 rounded-xl bg-warning-yellow hover:bg-amber-300 text-black font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform"
                              >
                                <Download size={16} />
                                Download .TTF Font File
                              </button>

                              <button 
                                onClick={handleSaveFont}
                                className="w-full py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 font-display font-bold text-xs uppercase tracking-wider text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center gap-2 transition-colors"
                              >
                                <CheckCircle2 size={15} />
                                Save to Font Library
                              </button>

                              <button 
                                onClick={async () => {
                                  await handleSaveFont();
                                  setPhase('text-writer');
                                }}
                                className="w-full py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform"
                              >
                                <Sparkles size={16} />
                                Write Documents in Studio →
                              </button>
                            </div>
                          </div>

                          {/* Quick Mobile Installation Guide */}
                          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900/50 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
                            <div className="font-display font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                              <Info size={14} className="text-warning-yellow" />
                              <span>How to install .ttf on mobile</span>
                            </div>
                            <p className="text-[11px] leading-relaxed">
                              <strong>iOS:</strong> Download .ttf and open with <em>iFont</em> app.<br />
                              <strong>Android:</strong> Apply in Theme / Font Settings.<br />
                              <strong>PC/Mac:</strong> Double-click to install universally.
                            </p>
                          </div>
                        </div>

                        {/* Interactive Mobile Typing Playground */}
                        <div className="lg:col-span-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-display font-bold text-base text-neutral-900 dark:text-white uppercase">
                              Live Handwriting Playground
                            </h3>
                            <span className="text-[11px] font-mono text-neutral-500">
                              Type to test your font
                            </span>
                          </div>

                          <div className="p-5 sm:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm min-h-[360px] flex flex-col justify-between">
                            <textarea 
                              className="w-full flex-grow bg-transparent outline-none resize-none leading-relaxed font-normal"
                              placeholder="Type something in your handwriting font..."
                              style={{ 
                                fontFamily: 'inktwin-preview, sans-serif',
                                fontSize: `${fontConfig.fontSize}px`,
                                letterSpacing: `${fontConfig.letterSpacing / 10}px`
                              }}
                              defaultValue="The quick brown fox jumps over the lazy dog. 0123456789"
                            />

                            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs font-mono text-neutral-500">
                              <span>Font: {fontConfig.name}</span>
                              <span className="text-warning-yellow font-bold">Vectorized .TTF Ready</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>
          </div>
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
            onSendToHumanizer={(text) => {
              setHumanizerPrefill(text);
              setPhase('ai-humanizer');
            }}
            onOpenCamera={() => setIsCameraOpen(true)}
          />
        ) : phase === 'ai-humanizer' ? (
          <AIHumanizer
            apiKey={apiKey}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSendToWriter={(text) => {
              setPrefilledWriterText(text);
              setPhase('text-writer');
            }}
            prefillText={humanizerPrefill}
          />
        ) : phase === 'find-font' ? (
          <FindFont
            apiKey={apiKey}
            onFontSelected={(name, url, profile) => {
              setPendingFontToName({
                name: profile.fontFamily,
                url: url || '',
                profile,
                fontFamily: profile.fontFamily,
              });
            }}
            onGoToPhase1={() => setPhase('font-creation')}
            onOpenSettings={() => promptApiKey()}
          />
        ) : phase === 'use-case' && useCaseSlug ? (
          <UseCasePage
            slug={useCaseSlug}
            onBack={() => {
              window.history.pushState(null, '', '/');
              setPhase('font-creation');
              setUseCaseSlug(null);
            }}
          />
        ) : null}
      </div>

      {/* Mobile Bottom Navigation Dock (All 6 Tabs Always Accessible) */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-lg border-t border-neutral-200 dark:border-neutral-800 md:hidden flex items-center justify-between px-1 py-1.5 pb-safe shadow-lg"
        aria-label="Mobile Navigation Dock"
      >
        <button
          onClick={handleGoHome}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 py-1 px-1.5 rounded-xl transition-all active:scale-90 flex-1",
            phase === 'home' 
              ? "text-warning-yellow font-bold" 
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          )}
        >
          <span className="text-base leading-none">🏠</span>
          <span className="text-[9px] font-display uppercase tracking-tight whitespace-nowrap">Home</span>
        </button>

        <button
          onClick={() => setPhase('font-creation')}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 py-1 px-1.5 rounded-xl transition-all active:scale-90 flex-1",
            phase === 'font-creation' 
              ? "text-warning-yellow font-bold" 
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          )}
        >
          <PenTool size={16} className={phase === 'font-creation' ? "text-warning-yellow" : ""} />
          <span className="text-[9px] font-display uppercase tracking-tight whitespace-nowrap">Create</span>
        </button>

        <button
          onClick={() => setPhase('text-writer')}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 py-1 px-1.5 rounded-xl transition-all active:scale-90 flex-1",
            phase === 'text-writer' 
              ? "text-warning-yellow font-bold" 
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          )}
        >
          <FileText size={16} className={phase === 'text-writer' ? "text-warning-yellow" : ""} />
          <span className="text-[9px] font-display uppercase tracking-tight whitespace-nowrap">Studio</span>
        </button>

        <button
          onClick={() => setPhase('homework-solver')}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 py-1 px-1.5 rounded-xl transition-all active:scale-90 flex-1",
            phase === 'homework-solver' 
              ? "text-warning-yellow font-bold" 
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          )}
        >
          <GraduationCap size={16} className={phase === 'homework-solver' ? "text-warning-yellow" : ""} />
          <span className="text-[9px] font-display uppercase tracking-tight whitespace-nowrap">Solver</span>
        </button>

        <button
          onClick={() => setPhase('ai-humanizer')}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 py-1 px-1.5 rounded-xl transition-all active:scale-90 flex-1",
            phase === 'ai-humanizer' 
              ? "text-warning-yellow font-bold" 
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          )}
        >
          <Sparkles size={16} className={phase === 'ai-humanizer' ? "text-warning-yellow" : ""} />
          <span className="text-[9px] font-display uppercase tracking-tight whitespace-nowrap">Humanizer</span>
        </button>

        <button
          onClick={() => setPhase('find-font')}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 py-1 px-1.5 rounded-xl transition-all active:scale-90 flex-1",
            phase === 'find-font' 
              ? "text-warning-yellow font-bold" 
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          )}
        >
          <Search size={16} className={phase === 'find-font' ? "text-warning-yellow" : ""} />
          <span className="text-[9px] font-display uppercase tracking-tight whitespace-nowrap">Find Font</span>
        </button>
      </nav>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen || isSettingsOpen}
        onClose={() => {
          setIsApiKeyModalOpen(false);
          setIsSettingsOpen(false);
        }}
        onSave={saveApiKey}
        currentKey={apiKey}
        isInvalid={apiKeyModalInvalid}
        customMessage={apiKeyModalMessage}
      />

      {/* Notification Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 font-body text-sm"
          >
            <AlertCircle size={20} className="shrink-0" />
            <span className="flex-1 text-xs sm:text-sm">{error}</span>
            <button 
              onClick={() => setError(null)} 
              className="p-1 rounded-lg hover:bg-white/20 transition-colors"
            >
              <RotateCcw size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Find My Font — Name Your Font Modal */}
      {pendingFontToName && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div>
              <h3 className="font-display font-bold uppercase text-xl text-neutral-900 dark:text-white">
                Name Your Font
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Give your matched handwriting font a name before adding to your studio library.
              </p>
            </div>

            <input
              type="text"
              value={pendingFontToName.name}
              onChange={(e) => setPendingFontToName(prev => prev ? { ...prev, name: e.target.value } : prev)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-display font-bold text-base outline-none focus:ring-2 focus:ring-warning-yellow"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') savePendingFont(); if (e.key === 'Escape') setPendingFontToName(null); }}
            />

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setPendingFontToName(null)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={savePendingFont}
                className="flex-1 py-2.5 rounded-xl bg-warning-yellow hover:bg-amber-300 text-black font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform"
              >
                <CheckCircle2 size={16} />
                Save &amp; Use in Studio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Success Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-24 right-4 sm:right-6 z-[100] bg-warning-yellow text-neutral-950 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 font-display font-bold uppercase text-xs tracking-wider"
          >
            <CheckCircle2 size={18} />
            <span>{toast}</span>
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

      {/* Touch / Stylus Drawing Pad Modal (Mobile Native Drawing) */}
      {drawingCharIndex !== null && (
        <TouchDrawingPad
          char={detectedChars[drawingCharIndex].char}
          initialImage={detectedChars[drawingCharIndex].imageData}
          onSave={async (newImg) => {
            const normalized = await normalizeManualDrawing(newImg);
            setDetectedChars(prev => {
              const next = [...prev];
              next[drawingCharIndex] = {
                ...next[drawingCharIndex],
                imageData: normalized,
                confidence: 1.0
              };
              return next;
            });
            setDrawingCharIndex(null);
          }}
          onClose={() => setDrawingCharIndex(null)}
        />
      )}

      {/* Glyph Fine-Tuning Modal */}
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
                confidence: 1.0
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
