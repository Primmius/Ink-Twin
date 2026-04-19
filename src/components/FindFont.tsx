import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Camera, RefreshCw, CheckCircle2, AlertCircle, Type as TypeIcon, ArrowRight, Search, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { analyzeHandwritingForFontMatch } from '../lib/gemini';

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
    <section className="flex-grow p-4 md:p-6 bg-neutral-100 overflow-y-auto overflow-x-hidden">
      <div className="max-w-4xl mx-auto flex flex-col items-center w-full">
        
        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full space-y-8"
            >
              <div className="text-center space-y-3 md:space-y-4 px-2">
                <h2 className="text-2xl md:text-5xl font-display uppercase tracking-tighter leading-none">Find Your Twin Font.</h2>
                <p className="text-sm md:text-xl font-mono opacity-70 italic uppercase">
                  AI scans your unique rhythms & style
                </p>
              </div>

              <div className="brutal-card brutal-shadow bg-white p-6 md:p-12 text-center space-y-6 md:space-y-8 w-full">
                <div className="flex flex-col items-center gap-4 md:gap-6">
                  <div className="w-16 h-16 md:w-24 md:h-24 bg-neon-green border-4 border-brutal-black rounded-full flex items-center justify-center brutal-shadow">
                    <Search size={32} className="text-brutal-black md:hidden" />
                    <Search size={48} className="text-brutal-black hidden md:block" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl md:text-3xl font-display uppercase">Upload any page of your handwriting</h3>
                    <p className="font-mono text-xs md:text-sm opacity-60 max-w-md mx-auto px-2">We will extract your complete style profile and find the closest matching professional font.</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4 w-full">
                  <label className="brutal-btn bg-neon-green w-full max-w-sm flex items-center justify-center gap-2 md:gap-3 cursor-pointer py-4 md:py-6 text-base md:text-xl">
                    <Upload size={20} className="md:hidden" />
                    <Upload size={24} className="hidden md:block" />
                    <span>Select Local Photo</span>
                    <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                  </label>
                  <p className="font-mono text-[10px] md:text-[11px] opacity-40 uppercase px-4">
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
              className="flex flex-col items-center justify-center py-16 md:py-32 space-y-6 md:space-y-8 px-4"
            >
              <RefreshCw size={60} className="text-brutal-black animate-spin md:hidden" strokeWidth={3} />
              <RefreshCw size={100} className="text-brutal-black animate-spin hidden md:block" strokeWidth={3} />
              <div className="text-center space-y-3">
                <h2 className="text-2xl md:text-5xl font-display uppercase italic tracking-tight">{loadingText}</h2>
                <p className="font-mono text-xs md:text-sm opacity-50 uppercase tracking-widest">Vision Neural Engine v4.0 is active</p>
              </div>
            </motion.div>
          )}

          {step === 'results' && analysis && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-8 md:space-y-12 pb-20"
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
                  <div className="p-4 md:p-8 border-b-4 border-brutal-black bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                    <div>
                      <h3 className="text-3xl md:text-6xl font-display uppercase leading-none mb-2">{analysis.fontFamily}</h3>
                      <p className="font-mono text-xs md:text-sm opacity-60 uppercase italic tracking-wide">{analysis.styleLabel}</p>
                    </div>
                    <button 
                      onClick={() => loadFont(analysis.fontFamily, analysis)}
                      className="brutal-btn bg-brutal-black text-white px-6 md:px-10 py-4 md:py-5 text-sm md:text-xl whitespace-nowrap w-full md:w-auto"
                    >
                      Use High-Fidelity Match
                    </button>
                  </div>
                  
                  <div className="grid md:grid-cols-2">
                    <div className="p-6 md:p-12 bg-white flex flex-col justify-center gap-4 md:gap-8 border-b-4 md:border-b-0 md:border-r-4 border-brutal-black min-h-[200px] md:min-h-[300px]">
                      <div 
                        style={{ fontFamily: `'${analysis.fontFamily}', cursive`, fontSize: 'clamp(18px, 4vw, 28px)' }} 
                        className="leading-snug text-brutal-black"
                      >
                        Hello! My name is Alex and I love writing.
                      </div>
                      <div 
                        style={{ fontFamily: `'${analysis.fontFamily}', cursive`, fontSize: 'clamp(12px, 2.5vw, 16px)' }} 
                        className="opacity-60 leading-tight"
                      >
                        abcdefghijklmnopqrstuvwxyz<br/>
                        0123456789 !?@#$%^&*()
                      </div>
                    </div>

                    <div className="p-4 md:p-8 bg-neutral-50 space-y-4 md:space-y-8">
                       <h4 className="font-mono text-[10px] uppercase font-black opacity-40 border-b border-brutal-black/10 pb-2">Traits Visualized</h4>
                       <div className="grid grid-cols-2 gap-y-4 md:gap-y-6 gap-x-4 md:gap-x-8">
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
                             <span className="font-mono text-[8px] md:text-[9px] uppercase opacity-50 font-bold">{trait.label}</span>
                             <span className="font-display uppercase text-base md:text-xl leading-none">{trait.value}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alternatives */}
              <div className="space-y-6 md:space-y-8 mt-8 md:mt-16">
                 <div className="flex flex-col gap-4 md:gap-6">
                   <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
                     <div className="space-y-1">
                       <h2 className="text-xl md:text-3xl font-display uppercase">Deep Search Alternatives</h2>
                       <p className="font-mono text-[9px] md:text-[10px] opacity-60 uppercase">Other fonts that match your neural profile</p>
                     </div>
                     
                     <div className="flex flex-wrap gap-3 md:gap-4 w-full md:w-auto">
                        <div className="flex flex-col gap-1 md:gap-2 flex-1 md:flex-none">
                          <span className="font-mono text-[8px] md:text-[9px] uppercase font-bold opacity-40">Style</span>
                          <div className="flex gap-1 md:gap-2 p-1 bg-white border-2 border-brutal-black brutal-shadow-small overflow-x-auto">
                            {['all', 'cursive', 'print', 'mixed'].map(s => (
                              <button 
                                key={s}
                                onClick={() => setStyleFilter(s as any)}
                                className={cn(
                                  "px-2 md:px-3 py-1.5 font-mono text-[9px] md:text-[10px] uppercase font-bold transition-all min-h-[36px] whitespace-nowrap",
                                  styleFilter === s ? "bg-neon-green" : "hover:bg-neutral-100"
                                )}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 md:gap-2 flex-1 md:flex-none">
                          <span className="font-mono text-[8px] md:text-[9px] uppercase font-bold opacity-40">Weight</span>
                          <div className="flex gap-1 md:gap-2 p-1 bg-white border-2 border-brutal-black brutal-shadow-small overflow-x-auto">
                            {['all', 'thin', 'medium', 'thick'].map(w => (
                              <button 
                                key={w}
                                onClick={() => setWeightFilter(w as any)}
                                className={cn(
                                  "px-2 md:px-3 py-1.5 font-mono text-[9px] md:text-[10px] uppercase font-bold transition-all min-h-[36px] whitespace-nowrap",
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

                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
                    {getFilteredFonts().map((font, i) => (
                      <motion.div 
                        key={font.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="brutal-card bg-white brutal-shadow-small flex flex-col hover:border-neon-green transition-colors group overflow-hidden"
                      >
                        <div className="p-2 bg-brutal-black/5 border-b border-brutal-black text-[7px] font-mono uppercase font-bold flex justify-between">
                          <span>Preview in: {font.name}</span>
                          {!loadedFonts.has(font.name) && <span className="text-error-red">Preview unavailable</span>}
                        </div>
                        <div className="p-4 space-y-4 flex flex-col flex-grow">
                          <div className="flex justify-between items-start">
                            <span className="font-display text-sm uppercase">{font.name}</span>
                            <span className="font-mono text-[8px] bg-neutral-100 px-1 border border-brutal-black/10 uppercase">{font.style}</span>
                          </div>
                          <div 
                            style={{ fontFamily: `'${font.name}', cursive`, fontSize: '24px' }}
                            className="py-4 border-y border-brutal-black/5 min-h-[100px] flex items-center justify-center text-center leading-tight"
                          >
                            Rhythm of Ink
                          </div>
                          <div 
                            style={{ fontFamily: `'${font.name}', cursive`, fontSize: '16px' }}
                            className="pb-2 opacity-40 font-mono text-center truncate italic"
                          >
                            abcdefghijklmnopqrstuvwxyz
                          </div>
                          <button 
                            onClick={() => loadFont(font.name, analysis)}
                            className="w-full py-2 font-mono text-[10px] uppercase font-bold bg-neutral-900 text-white hover:bg-neon-green hover:text-brutal-black transition-colors"
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
              <div className="pt-12 md:pt-20 border-t-2 border-brutal-black/5 flex flex-col items-center gap-4 md:gap-6 px-4">
                 <p className="font-mono text-xs md:text-sm opacity-40 text-center">Want to try a different handwriting sample?</p>
                 <button 
                    onClick={() => setStep('upload')}
                    className="brutal-btn bg-white border-2 px-6 md:px-12 w-full sm:w-auto"
                 >
                   Re-scan neural patterns
                 </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
};
