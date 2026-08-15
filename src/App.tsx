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
  Coffee,
  Home,
  PenTool,
  Search,
  Wand2,
  Sliders,
  HelpCircle,
  Check
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
  const [prefilledWriterText, setPrefilledWriterText] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(localStorage.getItem('theme') as 'light' | 'dark' || 'light');
  const [pendingFontToName, setPendingFontToName] = useState<{ name: string; url: string; profile: any; fontFamily: string } | null>(null);
  const [humanizerPrefill, setHumanizerPrefill] = useState<string | null>(null);
  const [showOptionsAccordion, setShowOptionsAccordion] = useState(false);
  
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
      setToast("Already saved!");
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
    setApiKeyModalMessage(message || "You don't have the API key set up yet. Please set up the API key.");
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
    setToast("API key saved successfully!");
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
        throw new Error("No characters were detected. Please ensure your handwriting is clear and the image is well-lit.");
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
        setError(err.message || "Failed to analyze handwriting. Check your image quality.");
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

  // Navigation Items
  const navTabs: Array<{ id: AppPhase; label: string; icon: React.ReactNode; short: string }> = [
    { id: 'home', label: 'Home', icon: <Home size={18} />, short: 'Home' },
    { id: 'font-creation', label: 'Create Font', icon: <PenTool size={18} />, short: 'Create' },
    { id: 'text-writer', label: 'Handwriting Writer', icon: <TypeIcon size={18} />, short: 'Writer' },
    { id: 'homework-solver', label: 'AI Study Assistant', icon: <GraduationCap size={18} />, short: 'Solver' },
    { id: 'find-font', label: 'Find My Font', icon: <Search size={18} />, short: 'Find' },
    { id: 'ai-humanizer', label: 'AI Humanizer', icon: <Wand2 size={18} />, short: 'Humanizer' },
  ];

  const stepsList = [
    { id: 1, label: "Template", short: "01" },
    { id: 2, label: "Upload", short: "02" },
    { id: 3, label: "Detect", short: "03" },
    { id: 4, label: "Process", short: "04" },
    { id: 5, label: "Vector", short: "05" },
    { id: 6, label: "Preview", short: "06" }
  ];

  return (
    <div 
      className="min-h-[100dvh] font-body flex flex-col border-0 md:border-[8px] selection:bg-neon-green selection:text-brutal-black pb-20 md:pb-0" 
      style={{ 
        backgroundColor: 'var(--bg-primary)', 
        color: 'var(--text-primary)', 
        borderColor: 'var(--border-primary)' 
      }}
    >
      {/* Sleek Adaptive Header */}
      <header className="sticky top-0 z-40 border-b-2 bg-[var(--bg-primary)] px-3 py-2.5 sm:px-6 sm:py-4 flex flex-col gap-2.5" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center justify-between gap-2">
          {/* Brand Logo & Back to Home */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleGoHome}
              className="flex items-center gap-2 sm:gap-3 text-left bg-transparent border-0 p-0 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-green rounded transition-transform active:scale-95"
              title="Go to Home"
              aria-label="Go to InkTwin Home"
            >
              <Logo size={isMobile ? 28 : 38} showText={false} className="group-hover:scale-105 transition-transform shrink-0" />
              <div className="flex flex-col">
                <h1 className="text-xl sm:text-3xl font-display uppercase tracking-tighter leading-none flex items-baseline gap-1.5">
                  Ink<span style={{ color: 'var(--neon-green)' }}>Twin</span>
                </h1>
              </div>
            </button>
            <a
              href="https://primuez.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[9px] lowercase opacity-50 hover:text-warning-yellow hover:opacity-100 transition-all hidden sm:inline"
            >
              by primuez.in
            </a>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick API Key Status Pill on Mobile & Desktop */}
            <button
              onClick={() => promptApiKey(undefined, false)}
              className={cn(
                "px-2.5 py-1.5 sm:px-3 sm:py-2 border-2 border-brutal-black font-mono text-[10px] sm:text-xs font-bold uppercase transition-all flex items-center gap-1.5",
                apiKey 
                  ? "bg-white text-brutal-black hover:bg-neon-green" 
                  : "bg-warning-yellow text-brutal-black animate-pulse"
              )}
              title={apiKey ? "Gemini API Key Active" : "Click to Set API Key"}
            >
              <span className={cn("w-2 h-2 rounded-full", apiKey ? "bg-green-500 animate-pulse" : "bg-error-red")} />
              <span className="hidden sm:inline">{apiKey ? "API Connected" : "Set API Key"}</span>
              <span className="sm:hidden">{apiKey ? "Key OK" : "No Key"}</span>
            </button>

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 border-2 border-brutal-black hover:bg-neon-green transition-colors bg-white text-brutal-black dark:bg-brutal-black dark:text-white"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>

            {/* Support Coffee Button */}
            <button
              onClick={() => {
                document.getElementById('support-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              title="Support InkTwin"
              aria-label="Support InkTwin"
              className="p-1.5 sm:p-2 border-2 border-brutal-black hover:bg-neon-green transition-colors bg-white text-brutal-black"
            >
              <Coffee size={17} />
            </button>
          </div>
        </div>

        {/* Desktop Navigation Tabs (Hidden on small mobile screen, handled by bottom bar + swipe pills) */}
        <div className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => tab.id === 'home' ? handleGoHome() : setPhase(tab.id)}
              className={cn(
                "px-3.5 py-2 border-2 border-[var(--border-primary)] font-display uppercase text-xs transition-all whitespace-nowrap flex items-center gap-2",
                phase === tab.id 
                  ? "bg-neon-green text-brutal-black brutal-shadow-sm font-bold -translate-y-0.5" 
                  : "bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-warning-yellow hover:text-brutal-black"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Mobile Horizontal Fast Switcher */}
        <div className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => tab.id === 'home' ? handleGoHome() : setPhase(tab.id)}
              className={cn(
                "px-2.5 py-1.5 border border-brutal-black font-mono uppercase text-[11px] font-bold shrink-0 transition-all flex items-center gap-1.5 rounded-sm",
                phase === tab.id 
                  ? "bg-neon-green text-brutal-black brutal-shadow-sm" 
                  : "bg-white dark:bg-neutral-800 text-brutal-black dark:text-white"
              )}
            >
              <span className="scale-90">{tab.icon}</span>
              <span>{tab.short}</span>
            </button>
          ))}
        </div>

        {/* Step Indicator when in Phase 1 (Create Font) */}
        {phase === 'font-creation' && (
          <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar pt-1.5 border-t border-brutal-black/20">
            {stepsList.map((s) => (
              <div 
                key={s.id}
                onClick={() => {
                  if (s.id <= step || (step === 1 && s.id === 2 && uploadedImages.length > 0)) {
                    setStep(s.id as AppStep);
                  }
                }}
                className={cn(
                  "font-mono text-[10px] sm:text-xs font-bold px-2 py-1 border transition-all flex-1 text-center truncate flex items-center justify-center gap-1 cursor-pointer",
                  step === s.id 
                    ? "bg-brutal-black text-white border-brutal-black" 
                    : step > s.id 
                    ? "bg-neon-green/30 text-brutal-black border-neon-green" 
                    : "opacity-40 bg-white dark:bg-neutral-800 border-neutral-300"
                )}
              >
                <span className="shrink-0">{s.short}</span>
                <span className="hidden sm:inline truncate">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Main App Workspace */}
      <div className="flex-grow flex flex-col md:flex-row overflow-x-hidden">
        {phase === 'font-creation' ? (
          <>
            {/* Desktop-only status sidebar */}
            <aside className="hidden md:flex w-[260px] border-r-2 border-brutal-black p-6 flex-col gap-6 bg-white shrink-0 overflow-y-auto">
              <div className="space-y-3">
                <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60">System Status</h3>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between py-1 border-b border-neutral-100">
                    <span>Active Step:</span>
                    <span className="font-bold">0{step} / 06</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-100">
                    <span>API Service:</span>
                    <span className={cn("font-bold", apiKey ? "text-green-600" : "text-red-600")}>
                      {apiKey ? "READY" : "MISSING"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-100">
                    <span>Scanned Pages:</span>
                    <span className="font-bold">{uploadedImages.length}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 bg-neutral-50 p-4 border border-brutal-black/20">
                <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60">Step Guidance</h3>
                <p className="text-xs leading-relaxed opacity-80">
                  {step === 1 && "Upload your handwritten grid or filled template photo."}
                  {step === 2 && "Review scanned images before running the AI extraction engine."}
                  {step === 3 && "Review detected characters and bounding boxes. Tap to edit or draw missing ones."}
                  {step === 4 && "Vectorizing strokes into mathematical curves..."}
                  {step === 5 && "Review vectorized paths before final TTF font compilation."}
                  {step === 6 && "Test your font in the preview canvas and export as .ttf file!"}
                </p>
              </div>

              <div className="mt-auto pt-4 space-y-2">
                {step === 3 && (
                  <button 
                    onClick={startAnalysis}
                    disabled={isAnalyzing}
                    className="w-full brutal-btn flex items-center justify-center gap-2 bg-warning-yellow text-xs py-2"
                  >
                    <RefreshCw className={cn(isAnalyzing && "animate-spin")} size={14} />
                    Re-analyze All
                  </button>
                )}
                {step > 1 && (
                  <button 
                    onClick={() => setStep((prev) => (prev - 1) as AppStep)}
                    className="w-full brutal-btn text-xs py-2"
                  >
                    ← Back
                  </button>
                )}
                <button
                  onClick={() => promptApiKey(undefined, false)}
                  className="w-full brutal-btn text-xs py-2"
                >
                  Manage API Key
                </button>
              </div>
            </aside>

            {/* Main Content Area */}
            <section className="flex-grow p-3 sm:p-6 bg-neutral-100 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-6">
                <AnimatePresence mode="wait">
                  {/* Step 1: Welcome & Upload Options */}
                  {step === 1 && (
                    <motion.div 
                      key="step1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4 sm:space-y-6"
                    >
                      {/* Hero Banner */}
                      <div className="space-y-1 sm:space-y-2">
                        <span className="font-mono text-[10px] font-bold uppercase opacity-60 tracking-widest">[PHASE_01] FONT_CREATION</span>
                        <h2 className="text-3xl sm:text-5xl font-display uppercase leading-none tracking-tighter">
                          Handwriting to Font.
                        </h2>
                        <p className="text-xs sm:text-base font-mono opacity-70">
                          Turn your real handwriting into a functional .ttf font file using AI.
                        </p>
                      </div>

                      {/* Primary Mobile Action Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                        {/* 1. Camera Capture */}
                        <div className="brutal-card brutal-shadow bg-neon-green/10 border-2 border-brutal-black p-4 sm:p-6 flex flex-col justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-neon-green text-brutal-black border-2 border-brutal-black flex items-center justify-center shrink-0">
                              <Camera size={22} />
                            </div>
                            <div>
                              <h3 className="font-display uppercase text-lg sm:text-xl leading-tight">01. Take Photo</h3>
                              <p className="font-mono text-[11px] opacity-70 leading-snug">Instant capture via phone camera</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setIsCameraOpen(true)}
                            className="w-full brutal-btn bg-neon-green text-brutal-black flex items-center justify-center gap-2 py-3"
                          >
                            <Camera size={18} />
                            <span>Capture with Camera</span>
                          </button>
                        </div>

                        {/* 2. Upload Image or PDF */}
                        <div className="brutal-card brutal-shadow bg-white p-4 sm:p-6 flex flex-col justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-warning-yellow text-brutal-black border-2 border-brutal-black flex items-center justify-center shrink-0">
                              <Upload size={22} />
                            </div>
                            <div>
                              <h3 className="font-display uppercase text-lg sm:text-xl leading-tight">02. Upload Image / PDF</h3>
                              <p className="font-mono text-[11px] opacity-70 leading-snug">From photo gallery or files</p>
                            </div>
                          </div>
                          <label className="w-full brutal-btn brutal-btn-primary flex items-center justify-center gap-2 py-3 cursor-pointer">
                            <Upload size={18} />
                            <span>Select Photo / PDF</span>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                          </label>
                        </div>
                      </div>

                      {/* Template Download & Guide Accordion */}
                      <div className="brutal-card p-4 sm:p-6 bg-white space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brutal-black/20 pb-3">
                          <div>
                            <h4 className="font-display uppercase text-sm sm:text-base font-bold flex items-center gap-2">
                              <span>📄</span> Printable A4 Template (Optional)
                            </h4>
                            <p className="font-mono text-[11px] opacity-60 mt-0.5">
                              Pre-drawn letter boxes for optimal AI recognition.
                            </p>
                          </div>
                          <button 
                            onClick={handleDownloadTemplate}
                            className="brutal-btn text-xs py-2 px-4 flex items-center justify-center gap-2 shrink-0 bg-white"
                          >
                            <Download size={15} />
                            Download PDF Template
                          </button>
                        </div>

                        {/* Quick options explainer */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs pt-1">
                          <div className="p-2.5 bg-neutral-50 border border-brutal-black/20 rounded">
                            <span className="font-bold text-[10px] text-neon-green uppercase block">Option A</span>
                            <span className="text-[11px] leading-snug">Print template, write characters in boxes with black pen, snap photo.</span>
                          </div>
                          <div className="p-2.5 bg-neutral-50 border border-brutal-black/20 rounded">
                            <span className="font-bold text-[10px] text-warning-yellow uppercase block">Option B (No Printer)</span>
                            <span className="text-[11px] leading-snug">Draw a simple 4×5 grid on plain paper and write letters clearly.</span>
                          </div>
                          <div className="p-2.5 bg-neutral-50 border border-brutal-black/20 rounded">
                            <span className="font-bold text-[10px] text-blue-500 uppercase block">Option C (Quick Match)</span>
                            <span className="text-[11px] leading-snug">
                              Skip font build! Use{' '}
                              <button onClick={() => setPhase('find-font')} className="underline font-bold">
                                🔍 Find My Font
                              </button>{' '}
                              to match in 10s.
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Review Uploaded Pages */}
                  {step === 2 && (
                    <motion.div 
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-brutal-black pb-3">
                        <div>
                          <h2 className="text-2xl sm:text-3xl font-display uppercase">Review Uploads</h2>
                          <p className="font-mono text-xs opacity-60">Check lighting and clarity of scanned pages ({uploadedImages.length} ready)</p>
                        </div>
                        <button 
                          onClick={startAnalysis}
                          disabled={isAnalyzing || uploadedImages.length === 0}
                          className="brutal-btn brutal-btn-primary flex items-center justify-center gap-2 py-3 px-6 text-sm"
                        >
                          {isAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : "Start AI Analysis →"}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
                        {uploadedImages.map((img, i) => (
                          <div key={i} className="aspect-[3/4] brutal-border bg-white p-1.5 relative group brutal-shadow-sm">
                            <img src={img} loading="lazy" className="w-full h-full object-cover" alt={`Page ${i+1}`} />
                            <button 
                              onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-2 right-2 p-2 bg-error-red text-white border-2 border-brutal-black shadow active:scale-95"
                              title="Delete Page"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        <label className="aspect-[3/4] brutal-border border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-neon-green/10 transition-colors p-4 text-center">
                          <Upload size={26} className="opacity-40" />
                          <span className="font-mono text-xs font-bold uppercase">+ Add Another Page</span>
                          <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                        </label>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Detected Glyphs */}
                  {step === 3 && (
                    <motion.div 
                      key="step3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-brutal-black pb-3">
                        <div>
                          <h2 className="text-2xl sm:text-3xl font-display uppercase">Detected Characters</h2>
                          <p className="font-mono text-xs opacity-60">Tap any character box to draw or adjust</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={startAnalysis}
                            disabled={isAnalyzing}
                            className="brutal-btn flex items-center gap-1.5 text-xs py-2 px-3"
                          >
                            <RefreshCw className={cn(isAnalyzing && "animate-spin")} size={14} />
                            Re-analyze
                          </button>
                          <button 
                            onClick={() => setStep(4)}
                            className="brutal-btn brutal-btn-primary text-xs py-2 px-4"
                          >
                            Vectorize →
                          </button>
                        </div>
                      </div>

                      {/* Responsive Glyph Grid */}
                      <div className="bg-white brutal-border p-3 sm:p-6 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-3 brutal-shadow">
                        {detectedChars.map((char, i) => (
                          <div 
                            key={i} 
                            onClick={() => setEditingCharIndex(i)}
                            className={cn(
                              "aspect-square border-2 relative overflow-hidden flex items-center justify-center cursor-pointer active:scale-95 transition-all",
                              char.confidence > 0.8 ? "border-neon-green bg-neon-green/5" :
                              char.confidence > 0.5 ? "border-warning-yellow bg-warning-yellow/5" :
                              char.confidence > 0 ? "border-error-red bg-error-red/5" : "border-neutral-200 border-dashed"
                            )}
                          >
                            <span className="absolute top-0.5 left-1 font-mono text-[9px] font-bold opacity-50">{char.char}</span>
                            {char.imageData ? (
                              <img src={char.imageData} loading="lazy" className="w-full h-full object-contain p-1.5" alt={char.char} />
                            ) : (
                              <span className="font-mono text-[10px] opacity-30">Tap to draw</span>
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
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: Processing State */}
                  {step === 4 && (
                    <motion.div 
                      key="step4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-16 sm:py-24 space-y-6 text-center"
                    >
                      <div className="relative">
                        <RefreshCw size={64} className="text-brutal-black animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-sm font-display font-bold">{processingProgress}%</div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-2xl sm:text-3xl font-display uppercase">Vectorizing Characters...</h2>
                        <p className="font-mono text-xs opacity-60">GLYPH: {processingChar || 'INITIALIZING'}</p>
                      </div>
                      <div className="w-64 h-3.5 brutal-border bg-white overflow-hidden rounded">
                        <div 
                          className="h-full bg-neon-green transition-all duration-300" 
                          style={{ width: `${processingProgress}%` }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Step 5: Vector Review */}
                  {step === 5 && (
                    <motion.div 
                      key="step5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-brutal-black pb-3">
                        <div>
                          <h2 className="text-2xl sm:text-3xl font-display uppercase">Vector Paths</h2>
                          <p className="font-mono text-xs opacity-60">Mathematical contours extracted from your handwriting ink</p>
                        </div>
                        <button 
                          onClick={generateFont}
                          className="brutal-btn brutal-btn-primary py-2.5 px-6 text-sm"
                        >
                          Compile Font →
                        </button>
                      </div>

                      <div className="bg-white brutal-border p-3 sm:p-6 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-3 brutal-shadow">
                        {detectedChars.map((char, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "aspect-square border-2 relative flex items-center justify-center p-1.5",
                              char.svgPath ? "border-neon-green bg-white" : "border-neutral-200 border-dashed bg-neutral-50"
                            )}
                          >
                            <span className="absolute top-0.5 left-1 font-mono text-[8px] font-bold opacity-30">{char.char}</span>
                            
                            {char.svgPath ? (
                              <svg viewBox="0 0 500 500" className="w-full h-full fill-brutal-black">
                                <path d={char.svgPath} fillRule="evenodd" />
                              </svg>
                            ) : char.imageData ? (
                              <div className="flex flex-col items-center gap-0.5 opacity-40">
                                <AlertCircle size={10} />
                                <span className="font-mono text-[7px]">DRAW</span>
                              </div>
                            ) : (
                              <span className="font-mono text-[7px] opacity-20">EMPTY</span>
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
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Font Settings Card */}
                        <div className="brutal-card brutal-shadow space-y-5 lg:col-span-1">
                          <h3 className="font-display uppercase text-xl border-b pb-2">Font Export</h3>
                          
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <label className="font-mono text-[10px] font-bold uppercase opacity-60">Font Name</label>
                              <input 
                                type="text" 
                                value={fontConfig.name}
                                onChange={(e) => setFontConfig({...fontConfig, name: e.target.value})}
                                className="w-full px-3 py-2 brutal-border font-mono text-sm outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="flex justify-between font-mono text-[10px] font-bold uppercase opacity-60">
                                <span>Letter Spacing</span>
                                <span>{fontConfig.letterSpacing}px</span>
                              </label>
                              <input 
                                type="range" min="-50" max="100" 
                                value={fontConfig.letterSpacing}
                                onChange={(e) => setFontConfig({...fontConfig, letterSpacing: parseInt(e.target.value)})}
                                className="w-full"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="flex justify-between font-mono text-[10px] font-bold uppercase opacity-60">
                                <span>Preview Size</span>
                                <span>{fontConfig.fontSize}px</span>
                              </label>
                              <input 
                                type="range" min="16" max="96" 
                                value={fontConfig.fontSize}
                                onChange={(e) => setFontConfig({...fontConfig, fontSize: parseInt(e.target.value)})}
                                className="w-full"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 pt-2">
                            <button 
                              onClick={async () => {
                                await handleSaveFont();
                                setPhase('text-writer');
                              }}
                              className="w-full brutal-btn bg-neon-green flex items-center justify-center gap-2 py-3 text-sm"
                            >
                              <Sparkles size={18} />
                              Use in Handwriting Writer
                            </button>
                            <button 
                              onClick={downloadFont}
                              className="w-full brutal-btn brutal-btn-primary flex items-center justify-center gap-2 py-3 text-sm"
                            >
                              <Download size={18} />
                              Download .TTF Font File
                            </button>
                          </div>
                        </div>

                        {/* Live Typing Sandbox */}
                        <div className="lg:col-span-2 space-y-2">
                          <h3 className="font-display uppercase text-lg">Interactive Live Preview</h3>
                          <div className="brutal-card brutal-shadow min-h-[340px] flex flex-col p-4">
                            <textarea 
                              className="flex-grow w-full min-h-[280px] bg-transparent outline-none resize-none leading-relaxed font-mono text-base"
                              placeholder="Type something here to test your handwriting font..."
                              style={{ 
                                fontFamily: 'inktwin-preview',
                                fontSize: `${fontConfig.fontSize}px`,
                                letterSpacing: `${fontConfig.letterSpacing / 10}px`
                              }}
                              defaultValue="The quick brown fox jumps over the lazy dog. 0123456789 !?@#"
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

      {/* Support Section */}
      <div className="px-4 py-4 sm:px-6 sm:py-6 border-t-2 border-brutal-black bg-[var(--bg-secondary)]">
        <div className="max-w-2xl mx-auto">
          <SupportCard id="support-card" />
        </div>
      </div>

      {/* Mobile Sticky Bottom Navigation Dock (PWA / Native Feel) */}
      <nav 
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-neutral-900 border-t-2 border-brutal-black mobile-bottom-dock flex items-center justify-around px-1 py-1"
        style={{ borderColor: 'var(--border-primary)' }}
      >
        {navTabs.map((tab) => {
          const isActive = phase === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => tab.id === 'home' ? handleGoHome() : setPhase(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 px-0.5 min-h-[48px] rounded transition-all touch-manipulation",
                isActive 
                  ? "bg-neon-green text-brutal-black font-bold shadow-sm" 
                  : "text-neutral-600 dark:text-neutral-300 hover:text-black active:scale-95"
              )}
            >
              <span className={cn("transition-transform", isActive && "scale-110")}>
                {tab.icon}
              </span>
              <span className="text-[9px] font-mono uppercase tracking-tight mt-0.5 truncate max-w-[56px]">
                {tab.short}
              </span>
            </button>
          );
        })}
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
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-16 sm:bottom-12 left-4 right-4 sm:left-12 sm:right-auto z-50 bg-error-red text-white p-4 border-2 sm:border-4 border-brutal-black brutal-shadow flex items-center gap-3 max-w-md"
          >
            <AlertCircle size={20} className="shrink-0" />
            <div className="flex flex-col text-xs font-mono">
              <span className="font-display uppercase font-bold">Alert</span>
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="ml-auto p-1 font-bold">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Find My Font — Name Your Font Modal */}
      {pendingFontToName && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-brutal-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 border-4 border-brutal-black p-6 sm:p-8 w-full max-w-md shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="font-display uppercase text-xl sm:text-2xl mb-1">Name Your Font</h3>
            <p className="font-mono text-xs opacity-60 mb-4">Save this font into your library.</p>
            <input
              type="text"
              value={pendingFontToName.name}
              onChange={(e) => setPendingFontToName(prev => prev ? { ...prev, name: e.target.value } : prev)}
              className="w-full px-3 py-2.5 brutal-border font-mono text-base outline-none mb-4"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') savePendingFont(); if (e.key === 'Escape') setPendingFontToName(null); }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setPendingFontToName(null)}
                className="flex-1 brutal-btn text-xs py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={savePendingFont}
                className="flex-1 brutal-btn bg-neon-green text-brutal-black flex items-center justify-center gap-1 text-xs py-2.5"
              >
                <CheckCircle2 size={16} />
                Save &amp; Use
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-16 sm:bottom-12 right-4 sm:right-12 z-[100] bg-neon-green text-brutal-black px-4 py-3 border-2 sm:border-4 border-brutal-black brutal-shadow flex items-center gap-2.5 font-display uppercase text-xs sm:text-sm font-bold"
          >
            <CheckCircle2 size={18} />
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
