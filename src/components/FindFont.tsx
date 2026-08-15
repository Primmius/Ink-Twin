import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Camera, RefreshCw, CheckCircle2, AlertCircle, Type as TypeIcon, ArrowRight, Search, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { analyzeHandwritingForFontMatch } from '../lib/gemini';
import { CameraCapture } from './CameraCapture';

const allowedFonts = [
  "Zeyada", "Marck Script", "La Belle Aurore", "Nothing You Could Do", "Kristi",
  "Dancing Script", "Satisfy", "Allura", "Caveat", "Handlee", "Kalam",
  "Indie Flower", "Patrick Hand", "Architects Daughter", "Gochi Hand",
  "Gloria Hallelujah", "Homemade Apple", "Just Another Hand", "Loved by the King",
  "Waiting for the Sunrise"
];

const fontDatabase = [
  { name: "Zeyada", style: "cursive", weight: "thin", googleFont: "Zeyada", tags: ["elegant", "slanted"] },
  { name: "Marck Script", style: "cursive", weight: "medium", googleFont: "Marck+Script", tags: ["formal", "classic"] },
  { name: "La Belle Aurore", style: "cursive", weight: "thin", googleFont: "La+Belle+Aurore", tags: ["delicate", "airy"] },
  { name: "Nothing You Could Do", style: "mixed", weight: "thin", googleFont: "Nothing+You+Could+Do", tags: ["casual", "expressive"] },
  { name: "Kristi", style: "cursive", weight: "thin", googleFont: "Kristi", tags: ["slanted", "artistic"] },
  { name: "Dancing Script", style: "cursive", weight: "medium", googleFont: "Dancing+Script", tags: ["flowing", "bubbly"] },
  { name: "Satisfy", style: "cursive", weight: "medium", googleFont: "Satisfy", tags: ["clean", "vintage"] },
  { name: "Allura", style: "cursive", weight: "thin", googleFont: "Allura", tags: ["romantic", "smooth"] },
  { name: "Caveat", style: "mixed", weight: "thin", googleFont: "Caveat", tags: ["natural", "modern"] },
  { name: "Handlee", style: "mixed", weight: "thin", googleFont: "Handlee", tags: ["everyday", "round"] },
  { name: "Kalam", style: "print", weight: "medium", googleFont: "Kalam", tags: ["informal", "marker"] },
  { name: "Indie Flower", style: "print", weight: "thin", googleFont: "Indie+Flower", tags: ["cute", "bubbly"] },
  { name: "Patrick Hand", style: "print", weight: "medium", googleFont: "Patrick+Hand", tags: ["neat", "school"] },
  { name: "Architects Daughter", style: "print", weight: "medium", googleFont: "Architects+Daughter", tags: ["blueprint", "angular"] },
  { name: "Gochi Hand", style: "print", weight: "medium", googleFont: "Gochi+Hand", tags: ["fun", "kid"] },
  { name: "Gloria Hallelujah", style: "print", weight: "medium", googleFont: "Gloria+Hallelujah", tags: ["bold", "loud"] },
  { name: "Homemade Apple", style: "cursive", weight: "medium", googleFont: "Homemade+Apple", tags: ["authentic", "loose"] },
  { name: "Just Another Hand", style: "mixed", weight: "thin", googleFont: "Just+Another+Hand", tags: ["tall", "thin"] },
  { name: "Loved by the King", style: "mixed", weight: "thin", googleFont: "Loved+by+the+King", tags: ["unique", "sketched"] },
  { name: "Waiting for the Sunrise", style: "mixed", weight: "thin", googleFont: "Waiting+for+the+Sunrise", tags: ["student", "quick"] },
];

export interface HandwritingProfile {
  scriptType: string;
  connectionLevel: number;
  slant: number;
  spacingTightness: number;
  baselineShift: number;
  strokeSmoothness: number;
  wobble: number;
  strokeWeight: number;
  irregularity: number;
  inkColor: string;
  letterSpacing: number;
  lineHeight: number;
  fontFamily: string;
  styleLabel: string;
}

interface FindFontProps {
  apiKey: string;
  onFontSelected: (fontName: string, fontUrl: string, profile: HandwritingProfile) => void;
  onGoToPhase1: () => void;
}

export const FindFont: React.FC<FindFontProps> = ({ apiKey, onFontSelected, onGoToPhase1 }) => {
  const [step, setStep] = useState<'upload' | 'analyzing' | 'results'>('upload');
  const [analysis, setAnalysis] = useState<HandwritingProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState('Deep Scanning Strokes...');
  const [isLoadingFonts, setIsLoadingFonts] = useState(false);
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [styleFilter, setStyleFilter] = useState<'all' | 'cursive' | 'print' | 'mixed'>('all');
  const [weightFilter, setWeightFilter] = useState<'all' | 'thin' | 'medium' | 'thick'>('all');

  const loadingPhrases = [
    "Analyzing connection levels...",
    "Measuring baseline drift...",
    "Evaluating stroke smoothness...",
    "Mapping to Google Font library...",
    "Building your style profile..."
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      startDiscovery(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Font Loading Utility
  const loadGoogleFont = async (fontName: string) => {
    const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, "+")}&display=swap`;
    
    // Check if already loaded
    const existingLink = document.querySelector(
      `link[href*="${fontName.replace(/ /g, "+")}"]`
    );
    if (existingLink) {
      setLoadedFonts(prev => new Set(prev).add(fontName));
      return true;
    }
    
    return new Promise<boolean>((resolve) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = fontUrl;
      link.onload = () => {
        // Wait extra 500ms for font to actually render
        setTimeout(() => {
          setLoadedFonts(prev => new Set(prev).add(fontName));
          resolve(true);
        }, 500);
      };
      link.onerror = () => resolve(false);
      document.head.appendChild(link);
    });
  };

  // Preload fonts when results are ready
  React.useEffect(() => {
    if (step === 'results' && analysis) {
      const preloadResults = async () => {
        setIsLoadingFonts(true);
        const filtered = fontDatabase.filter(f => f.name !== analysis.fontFamily);
        const bestMatch = analysis.fontFamily;
        
        const allToLoad = [bestMatch, ...filtered.map(f => f.name)];
        
        await Promise.all(
          allToLoad.map(name => loadGoogleFont(name))
        );
        setIsLoadingFonts(false);
      };
      preloadResults();
    }
  }, [step, analysis]);

  const startDiscovery = async (imgData: string) => {
    if (!apiKey) {
      setError("Please set your Gemini API Key in settings first.");
      return;
    }

    setStep('analyzing');
    setError(null);
    
    let phraseIndex = 0;
    const interval = setInterval(() => {
      phraseIndex = (phraseIndex + 1) % loadingPhrases.length;
      setLoadingText(loadingPhrases[phraseIndex]);
    }, 2500);

    try {
      const rawRes = await analyzeHandwritingForFontMatch(imgData, apiKey);
      if (!rawRes) throw new Error("Analysis failed: Empty response from AI.");

      const isCursiveLike = rawRes.scriptType !== "print";
      const actualLetterSpacing = isCursiveLike ? Math.min(rawRes.letterSpacing, 0.3) : rawRes.letterSpacing;

      const profile: HandwritingProfile = {
        fontFamily: allowedFonts.includes(rawRes.fontFamily) ? rawRes.fontFamily : "Caveat",
        scriptType: ["cursive", "neat_cursive", "hybrid", "messy_cursive", "print"].includes(rawRes.scriptType) ? rawRes.scriptType : "hybrid",
        slant: Math.max(-15, Math.min(15, Number(rawRes.slantDegree) || 0)),
        letterSpacing: actualLetterSpacing,
        lineHeight: Math.max(1.2, Math.min(2.5, Number(rawRes.lineHeight) || 1.2)),
        inkColor: /^#[0-9a-fA-F]{6}$/.test(rawRes.inkColor) ? rawRes.inkColor : "#1a1a2e",
        wobble: Math.max(0, Math.min(1, Number(rawRes.wobble) || 0)),
        baselineShift: Math.max(0, Math.min(4, Number(rawRes.baselineDrift) || 0)),
        strokeWeight: Math.max(0.5, Math.min(2, Number(rawRes.strokeWeight) || 1)),
        irregularity: Math.max(0, Math.min(1, Number(rawRes.irregularity) || 0)),
        connectionLevel: Math.max(0, Math.min(1, Number(rawRes.connectionLevel) || 0)),
        styleLabel: rawRes.styleLabel || "natural handwriting",
        strokeSmoothness: Math.max(0, Math.min(1, Number(rawRes.strokeSmoothness) || 0.5)),
        spacingTightness: Math.max(0, Math.min(1, Number(rawRes.spacingTightness) || 0.5))
      };

      setAnalysis(profile);
      setStep('results');
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setStep('upload');
    } finally {
      clearInterval(interval);
    }
  };

  const getFilteredFonts = () => {
    if (!analysis) return [];
    
    const scoredFonts = fontDatabase
      .filter(f => f.name !== analysis.fontFamily)
      .map(font => {
        let score = 0;
        
        // Priority trait: Irregularity
        const hasIrregularTraits = font.tags.some(t => ['loose', 'informal', 'expressive', 'natural', 'authentic'].includes(t));
        if (analysis.irregularity > 0.6 && hasIrregularTraits) score += 40;
        if (analysis.irregularity < 0.4 && !hasIrregularTraits) score += 20;

        // Priority trait: Stroke Smoothness
        const hasSmoothTraits = font.tags.some(t => ['smooth', 'clean', 'formal', 'blueprint'].includes(t));
        const hasRoughTraits = font.tags.some(t => ['sketched', 'marker', 'kid'].includes(t));
        if (analysis.strokeSmoothness > 0.7 && hasSmoothTraits) score += 40;
        if (analysis.strokeSmoothness < 0.3 && hasRoughTraits) score += 40;

        // Weight match
        if (font.weight === weightFilter) score += 10;
        
        // Style match
        if (font.style === (analysis.scriptType === 'print' ? 'print' : analysis.scriptType.includes('cursive') ? 'cursive' : 'mixed')) score += 20;

        return { ...font, matchScore: score };
      });

    return scoredFonts
      .filter(f => styleFilter === 'all' || f.style === styleFilter)
      .filter(f => weightFilter === 'all' || f.weight === weightFilter)
      .filter(f => searchTerm === '' || f.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);
  };

  const loadFont = async (fontName: string, config: HandwritingProfile) => {
    setIsLoadingFonts(true);
    await loadGoogleFont(fontName);
    setIsLoadingFonts(false);
    
    const dbEntry = fontDatabase.find(f => f.name === fontName);
    const googleFont = dbEntry?.googleFont || fontName.replace(/ /g, '+');
    const fontUrl = `https://fonts.googleapis.com/css2?family=${googleFont}&display=swap`;
    
    onFontSelected(fontName, fontUrl, config);
  };

  return (
    <section className="flex-grow p-6 bg-neutral-100 overflow-y-auto">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        
        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full space-y-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-5xl font-display uppercase tracking-tighter leading-none">Find Your Twin Font.</h2>
                <p className="text-xl font-mono opacity-70 italic uppercase">
                  AI scans your unique rhythms & style
                </p>
              </div>

              <div className="brutal-card brutal-shadow bg-white p-12 text-center space-y-8">
                <div className="flex flex-col items-center gap-6">
                  <div className="w-24 h-24 bg-neon-green border-4 border-brutal-black rounded-full flex items-center justify-center brutal-shadow">
                    <Search size={48} className="text-brutal-black" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-display uppercase">Upload any page of your handwriting</h3>
                    <p className="font-mono text-sm opacity-60 max-w-md mx-auto">We will extract your complete style profile and find the closest matching professional font.</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <label className="brutal-btn bg-neon-green w-full max-w-sm flex items-center justify-center gap-3 cursor-pointer py-6 text-xl">
                    <Upload size={24} />
                    <span>Select Local Photo</span>
                    <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                  </label>
                  <button
                    onClick={() => setIsCameraOpen(true)}
                    className="brutal-btn bg-white w-full max-w-sm flex items-center justify-center gap-3 py-6 text-xl border-4 border-brutal-black hover:bg-neutral-50 transition-colors"
                  >
                    <Camera size={24} />
                    <span>Capture with Camera</span>
                  </button>
                  <p className="font-mono text-[11px] opacity-40 uppercase">
                    Supported: JPG, PNG, PDF. High lighting recommended.
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-6 bg-error-red border-4 border-brutal-black brutal-shadow flex items-center gap-4 text-white font-mono text-sm uppercase">
                  <AlertCircle size={24} />
                  <div>
                    <p className="font-bold">Encryption Error</p>
                    <p className="opacity-80">{error}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 'analyzing' && (
            <motion.div 
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32 space-y-8"
            >
              <RefreshCw size={100} className="text-brutal-black animate-spin" strokeWidth={3} />
              <div className="text-center space-y-3">
                <h2 className="text-5xl font-display uppercase italic tracking-tight">{loadingText}</h2>
                <p className="font-mono text-sm opacity-50 uppercase tracking-widest">Vision Neural Engine v4.0 is active</p>
              </div>
            </motion.div>
          )}

          {step === 'results' && analysis && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-12 pb-20"
            >
              {isLoadingFonts ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <RefreshCw size={48} className="text-brutal-black animate-spin" />
                  <p className="font-mono text-sm uppercase font-bold tracking-widest">Loading font previews...</p>
                </div>
              ) : (
                <>
              {/* Primary Match - Hero Card */}
              <div className="space-y-4">
                <h2 className="text-sm font-mono uppercase font-black tracking-[0.2em] opacity-40">Your Absolute Best Match</h2>
                <div className="brutal-card brutal-shadow bg-neon-green border-4 border-brutal-black overflow-hidden">
                  <div className="p-4 bg-brutal-black/5 border-b-2 border-brutal-black flex justify-between items-center">
                    <span className="font-mono text-[9px] uppercase font-bold">Preview rendered in: {analysis.fontFamily}</span>
                    {!loadedFonts.has(analysis.fontFamily) && <span className="font-mono text-[9px] uppercase font-bold text-error-red">Preview unavailable</span>}
                  </div>
                  <div className="p-8 border-b-4 border-brutal-black bg-white flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h3 className="text-6xl font-display uppercase leading-none mb-2">{analysis.fontFamily}</h3>
                      <p className="font-mono text-sm opacity-60 uppercase italic tracking-wide">{analysis.styleLabel}</p>
                    </div>
                    <button 
                      onClick={() => loadFont(analysis.fontFamily, analysis)}
                      className="brutal-btn bg-brutal-black text-white px-10 py-5 text-xl whitespace-nowrap"
                    >
                      Use High-Fidelity Match
                    </button>
                  </div>
                  
                  <div className="grid md:grid-cols-2">
                    <div className="p-12 bg-white flex flex-col justify-center gap-8 border-b-4 md:border-b-0 md:border-r-4 border-brutal-black min-h-[300px]">
                      <div 
                        style={{ fontFamily: `'${analysis.fontFamily}', cursive`, fontSize: '28px' }} 
                        className="leading-snug text-brutal-black"
                      >
                        Hello! My name is Alex and I love writing.
                      </div>
                      <div 
                        style={{ fontFamily: `'${analysis.fontFamily}', cursive`, fontSize: '16px' }} 
                        className="opacity-60 leading-tight"
                      >
                        abcdefghijklmnopqrstuvwxyz<br/>
                        0123456789 !?@#$%^&*()
                      </div>
                    </div>

                    <div className="p-8 bg-neutral-50 space-y-8">
                       <h4 className="font-mono text-[10px] uppercase font-black opacity-40 border-b border-brutal-black/10 pb-2">Traits Visualized</h4>
                       <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                         {[
                           { label: "Slant", value: `${analysis.slant > 0 ? '+' : ''}${analysis.slant}°` },
                           { label: "Weight", value: analysis.strokeWeight.toFixed(1) },
                           { label: "Wobble", value: analysis.wobble.toFixed(2) },
                           { label: "Spacing", value: analysis.spacingTightness > 0.6 ? 'Tight' : analysis.spacingTightness < 0.4 ? 'Wide' : 'Normal' },
                           { label: "Baseline", value: analysis.baselineShift > 0.6 ? 'Shifty' : 'Steady' },
                           { label: "Connection", value: Math.round(analysis.connectionLevel * 100) + '%' },
                           { label: "Irregularity", value: analysis.irregularity.toFixed(1) }
                         ].map((trait, i) => (
                           <div key={i} className="flex flex-col">
                             <span className="font-mono text-[9px] uppercase opacity-50 font-bold">{trait.label}</span>
                             <span className="font-display uppercase text-xl leading-none">{trait.value}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alternatives */}
              <div className="space-y-8 mt-16">
                 <div className="flex flex-col gap-6">
                   <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                     <div className="space-y-1">
                       <h2 className="text-3xl font-display uppercase">Deep Search Alternatives</h2>
                       <p className="font-mono text-[10px] opacity-60 uppercase">Other fonts that match your neural profile</p>
                     </div>
                     
                     <div className="flex flex-wrap gap-4">
                        <div className="flex flex-col gap-2">
                          <span className="font-mono text-[9px] uppercase font-bold opacity-40">Style</span>
                          <div className="flex gap-2 p-1 bg-white border-2 border-brutal-black brutal-shadow-small">
                            {['all', 'cursive', 'print', 'mixed'].map(s => (
                              <button 
                                key={s}
                                onClick={() => setStyleFilter(s as any)}
                                className={cn(
                                  "px-3 py-1 font-mono text-[10px] uppercase font-bold transition-all",
                                  styleFilter === s ? "bg-neon-green" : "hover:bg-neutral-100"
                                )}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className="font-mono text-[9px] uppercase font-bold opacity-40">Weight</span>
                          <div className="flex gap-2 p-1 bg-white border-2 border-brutal-black brutal-shadow-small">
                            {['all', 'thin', 'medium', 'thick'].map(w => (
                              <button 
                                key={w}
                                onClick={() => setWeightFilter(w as any)}
                                className={cn(
                                  "px-3 py-1 font-mono text-[10px] uppercase font-bold transition-all",
                                  weightFilter === w ? "bg-neon-green" : "hover:bg-neutral-100"
                                )}
                              >
                                {w}
                              </button>
                            ))}
                          </div>
                        </div>
                     </div>
                   </div>

                   <div className="relative w-full">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search alternative fonts by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 brutal-border font-mono text-sm outline-none focus:bg-neon-green/5 transition-colors"
                      />
                   </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {getFilteredFonts().map((font, i) => (
                      <motion.div 
                        key={font.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="brutal-card bg-white brutal-shadow-small flex flex-col hover:border-neon-green transition-colors group overflow-hidden"
                      >
                        <div className="p-2 bg-brutal-black/5 border-b border-brutal-black text-[8px] font-mono uppercase font-bold flex justify-between items-center">
                          <span className="truncate">Preview in: {font.name}</span>
                          {!loadedFonts.has(font.name) && <span className="text-error-red shrink-0 ml-2">Unavailable</span>}
                        </div>
                        <div className="p-6 space-y-4 flex flex-col flex-grow">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-display text-base uppercase leading-tight">{font.name}</span>
                            <span className="font-mono text-[9px] bg-neutral-100 px-2 py-0.5 border border-brutal-black/20 uppercase shrink-0">{font.style}</span>
                          </div>
                          <div 
                            style={{ fontFamily: `'${font.name}', cursive`, fontSize: '28px' }}
                            className="py-5 border-y border-brutal-black/10 min-h-[90px] flex items-center justify-center text-center leading-tight"
                          >
                            Rhythm of Ink
                          </div>
                          <div 
                            style={{ fontFamily: `'${font.name}', cursive`, fontSize: '15px' }}
                            className="pb-1 opacity-50 text-center leading-snug"
                          >
                            abcdefghij...
                          </div>
                          <button 
                            onClick={() => loadFont(font.name, analysis)}
                            className="w-full py-3 font-mono text-[11px] uppercase font-bold bg-neutral-900 text-white hover:bg-neon-green hover:text-brutal-black transition-colors mt-auto"
                          >
                            Switch to this
                          </button>
                        </div>
                      </motion.div>
                    ))}
                    {getFilteredFonts().length === 0 && (
                      <div className="col-span-full py-12 text-center border-2 border-dashed border-brutal-black/10 rounded-xl">
                        <p className="font-mono text-sm opacity-40 uppercase">No alternative fonts match these filters</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Retry */}
              <div className="pt-20 border-t-2 border-brutal-black/5 flex flex-col items-center gap-6">
                 <p className="font-mono text-sm opacity-40">Want to try a different handwriting sample?</p>
                 <button 
                    onClick={() => setStep('upload')}
                    className="brutal-btn bg-white border-2 px-12"
                 >
                   Re-scan neural patterns
                 </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {isCameraOpen && (
        <CameraCapture
          onCapture={(imageData) => {
            startDiscovery(imageData);
          }}
          onClose={() => setIsCameraOpen(false)}
        />
      )}
    </section>
  );
};
