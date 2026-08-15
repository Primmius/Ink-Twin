import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Type, 
  Settings, 
  Download, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Image as ImageIcon, 
  FileUp, 
  Layout, 
  Maximize2, 
  Minimize2,
  Palette,
  RefreshCw,
  Undo2,
  Redo2,
  Layers,
  Edit3,
  RotateCcw,
  X,
  History,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { PageConfig, WriterPage, AppPhase, WriterElement, WriterImage, SavedFont } from '../../types';
import { CanvasPage, renderCanvasPage } from './CanvasPage';
import { wrapTextIntoPages } from '../../lib/localLayout';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';

interface HandwritingWriterProps {
  fontUrl: string | null;
  fontName: string;
  apiKey: string;
  savedFonts: SavedFont[];
  onSelectFont: (font: SavedFont) => void;
  onDeleteFont: (id: string) => void;
  onRenameFont: (id: string, newName: string) => void;
  onUploadFont?: (font: SavedFont) => void;
  initialText?: string | null;
  onTextConsumed?: () => void;
  initialProfile?: any;
  onProfileApplied?: () => void;
  onNavigate?: (p: AppPhase) => void;
}

export const HandwritingWriter: React.FC<HandwritingWriterProps> = ({ 
  fontUrl, 
  fontName, 
  apiKey,
  savedFonts,
  onSelectFont,
  onDeleteFont,
  onRenameFont,
  onUploadFont,
  initialText,
  onTextConsumed,
  initialProfile,
  onProfileApplied,
  onNavigate
}) => {
  const [pages, setPages] = useState<WriterPage[]>([
    { id: '1', content: 'Type your text here...', images: [], elements: [] }
  ]);
  const [history, setHistory] = useState<WriterPage[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize history
  useEffect(() => {
    if (history.length === 0) {
      setHistory([pages]);
      setHistoryIndex(0);
    }
  }, []);

  const saveToHistory = (newPages: WriterPage[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    // Deep clone to prevent direct mutations in history
    newHistory.push(JSON.parse(JSON.stringify(newPages)));
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setPages(JSON.parse(JSON.stringify(prev)));
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setPages(JSON.parse(JSON.stringify(next)));
      setHistoryIndex(historyIndex + 1);
    }
  };

  const updatePages = (newPagesOrFn: WriterPage[] | ((prev: WriterPage[]) => WriterPage[]), skipHistory = false) => {
    setPages(prev => {
      const next = typeof newPagesOrFn === 'function' ? newPagesOrFn(prev) : newPagesOrFn;
      if (!skipHistory) saveToHistory(next);
      return next;
    });
  };

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileDrawer, setActiveMobileDrawer] = useState<'font' | 'style' | 'type' | 'effects' | 'elements' | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [mode, setMode] = useState<'default' | 'classic'>('default');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [fontVersion, setFontVersion] = useState(0);
  const [activeFontId, setActiveFontId] = useState<string | null>(null);
  const loadedSavedFontIds = useRef<Set<string>>(new Set());

  // The font family the canvas/textarea actually uses.
  // - For Google Fonts (Phase 4): use the real CSS family name.
  // - For binary fonts (Phase 1): use a unique id-based family so two
  //   fonts with the same display name never collide.
  const activeFont = activeFontId
    ? savedFonts.find(f => f.id === activeFontId) || null
    : null;
  const effectiveFontName = activeFont
    ? (activeFont.googleFont
        ? (activeFont.fontFamily || activeFont.name)
        : `inktwin-font-${activeFont.id}`)
    : fontName;
  
  const [settings, setSettings] = useState<PageConfig>({
    fontSize: 24,
    lineHeight: 32,
    paragraphSpacing: 20,
    wordSpacing: 0,
    letterSpacing: 1,
    slant: 0,
    thickness: 0,
    leftMargin: 60,
    topMargin: 40,
    inkColor: "#000000",
    naturalRandomness: true,
    randomnessIntensity: 0.5,
    inkVariation: false,
    inkVariationIntensity: 0.3,
    effect: "normal",
    pageStyle: "black-lined"
  });

  const [mobileScale, setMobileScale] = useState(1);
  useEffect(() => {
    if (!isMobile) {
      setMobileScale(1);
      return;
    }
    const updateScale = () => {
      const availableWidth = window.innerWidth - 32; 
      setMobileScale(Math.min(1, availableWidth / 595));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isMobile]);

  const renderFontLibrary = () => (
    <section className="space-y-4">
      <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60 flex items-center gap-2">
        <Type size={14} /> Font Library
      </h3>
      <div className={cn("grid gap-2", isMobile ? "grid-cols-2" : "space-y-2")}>
        {savedFonts.length === 0 && (
          <div className="text-[10px] opacity-40 italic space-y-1 col-span-full">
            <p>No saved fonts yet.</p>
            <p>
              Create one in <button onClick={() => onNavigate?.('font-creation')} className="underline hover:text-black hover:opacity-100 transition-all">✏️ Phase 1</button>
            </p>
            <p>
              or find one in <button onClick={() => onNavigate?.('find-font')} className="underline hover:text-black hover:opacity-100 transition-all">🔍 Phase 4</button>!
            </p>
          </div>
        )}
        {savedFonts.map(font => {
          const isActive = activeFontId
            ? activeFontId === font.id
            : fontName === font.name;
          return (
          <div 
            key={font.id}
            className={cn(
              "group brutal-border p-2 flex flex-col gap-2 transition-colors",
              isActive ? "bg-warning-yellow/10 border-warning-yellow" : "bg-white"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col flex-grow">
                <input 
                  type="text"
                  value={font.name}
                  onChange={(e) => onRenameFont(font.id, e.target.value)}
                  className="bg-transparent font-mono text-[10px] font-bold outline-none w-full"
                />
                <span className="font-mono text-[8px] opacity-50 uppercase tracking-tighter">
                  {font.source === 'Found - Phase 4' ? '🔍 Found match' : '✏️ Your handwriting'}
                </span>
              </div>
              <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    if (window.confirm(`Delete "${font.name}"? This cannot be undone.`)) {
                      if (activeFontId === font.id) setActiveFontId(null);
                      onDeleteFont(font.id);
                      loadedSavedFontIds.current.delete(font.id);
                    }
                  }}
                  className="p-2 hover:text-error-red touch-manipulation"
                  aria-label={`Delete ${font.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <button 
              onClick={() => {
                setActiveFontId(font.id);
                onSelectFont(font);
              }}
              className={cn(
                "w-full py-1 font-mono text-[8px] uppercase font-bold brutal-border h-11 sm:h-auto",
                isActive ? "bg-warning-yellow" : "bg-white hover:bg-neutral-50"
              )}
            >
              {isActive ? "Active" : "Use Font"}
            </button>
          </div>
          );
        })}
      </div>
      {!isMobile && (
        <label className="w-full brutal-btn flex items-center justify-center gap-2 cursor-pointer text-xs mt-4">
          <Type size={14} />
          Upload Custom .TTF
          <input type="file" className="hidden" accept=".ttf" onChange={handleCustomFontUpload} />
        </label>
      )}
    </section>
  );

  const renderPageStyle = () => {
    const STYLE_LABELS: Record<string, string> = {
      'white':'White','black-lined':'Black Lined','paper2':'Paper',
      'blue-lined':'Blue Lined','gray-lined':'Gray Lined','grid':'Grid',
      'old-paper':'Old Paper','note':'Note','wishlist':'Wishlist',
      'birthday':'Birthday','love-letter':'Love Letter','legal-pad':'Legal Pad',
      'newspaper':'Newspaper','graph-paper':'Graph Paper','kraft':'Kraft','blackboard':'Blackboard',
      'project-floral':'Floral File','project-ocean':'Ocean File','project-music':'Music File',
      'project-colorful':'Colorful File','project-purple':'Purple File','project-pink':'Pink File',
    };
    const BG: Record<string,string> = {
      'paper2':'#faf8f5','note':'#fff9c4','old-paper':'#f5e6c8','birthday':'#fff0f5',
      'love-letter':'#fdf6e3','legal-pad':'#fefbd8','newspaper':'#f0eeea',
      'blackboard':'#1a1a1b','kraft':'#c4a882',
      'project-floral':'#fffef8','project-ocean':'#f8fcff','project-music':'#fdf8ee',
      'project-colorful':'#fffde7','project-purple':'#f3e5f5','project-pink':'#fff5f8',
    };
    const LINE_CLR: Record<string,string> = {
      'black-lined':'#444','blue-lined':'#90b8d8','gray-lined':'#ccc','legal-pad':'#90b8d8',
      'project-floral':'#555','project-ocean':'#1a73e8','project-music':'#666',
      'project-colorful':'#bbb','project-purple':'#9c27b0','project-pink':'#ec407a',
    };
    const LINED = new Set(['black-lined','blue-lined','gray-lined','legal-pad',
      'project-floral','project-ocean','project-music','project-colorful','project-pink']);
    const GRID_SET = new Set(['grid','graph-paper']);
    const PROJECT = new Set(['project-floral','project-ocean','project-music','project-colorful','project-purple','project-pink']);

    const allStyles = [
      'white','black-lined','paper2','blue-lined','gray-lined','grid','old-paper','note',
      'wishlist','birthday','love-letter','legal-pad','newspaper','graph-paper','kraft','blackboard',
      'project-floral','project-ocean','project-music','project-colorful','project-purple','project-pink',
    ] as const;

    return (
      <section className="space-y-4">
        <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60 flex items-center gap-2">
          <Palette size={14} /> Page Style
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-2 overflow-y-auto max-h-[420px] pr-1">
          {allStyles.map(bg => {
            const isLined   = LINED.has(bg);
            const isGrid    = GRID_SET.has(bg);
            const isProject = PROJECT.has(bg);
            const bgColor   = BG[bg] || '#ffffff';
            const lineColor = LINE_CLR[bg] || '#888';
            const lineStart = isProject ? 23 : (bg === 'legal-pad' ? 18 : 13);
            const lineStep  = isProject ? 8 : 8.5;
            const lineCount = 9;

            return (
              <button
                key={bg}
                onClick={() => updateSetting('pageStyle', bg)}
                className={cn(
                  "flex flex-col border-2 border-brutal-black hover:scale-105 transition-transform overflow-hidden",
                  settings.pageStyle === bg ? "ring-2 ring-warning-yellow" : "opacity-80 hover:opacity-100"
                )}
              >
                {/* Thumbnail — A4 proportioned */}
                <div
                  className="w-full aspect-[3/4] border-b border-brutal-black relative overflow-hidden"
                  style={{ backgroundColor: bgColor }}
                >
                  {/* Grid / graph */}
                  {isGrid && (
                    <div className="absolute inset-0" style={{
                      backgroundImage: `linear-gradient(${bg==='grid'?'#ccc':'#b0d0f0'} 1px,transparent 1px),linear-gradient(90deg,${bg==='grid'?'#ccc':'#b0d0f0'} 1px,transparent 1px)`,
                      backgroundSize: bg==='grid' ? '20% 20%' : '12% 12%',
                    }} />
                  )}

                  {/* Blackboard grain + text */}
                  {bg === 'blackboard' && (
                    <>
                      <div className="absolute inset-0 opacity-10" style={{ backgroundImage:'radial-gradient(circle,#fff 1%,transparent 1%)', backgroundSize:'3px 3px' }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-mono text-[6px] text-white opacity-25 italic">CHALK</span>
                      </div>
                    </>
                  )}

                  {/* Wishlist dashed border */}
                  {bg === 'wishlist' && <div className="absolute inset-[10%] border border-dashed border-[#d4a0a0]" />}

                  {/* Love letter solid border */}
                  {bg === 'love-letter' && <div className="absolute inset-[8%] border-2 border-[#e8b4b8]" />}

                  {/* Birthday star */}
                  {bg === 'birthday' && <div className="absolute inset-0 flex items-center justify-center text-xl opacity-25">⭐</div>}

                  {/* project-colorful: inset rainbow border */}
                  {bg === 'project-colorful' && (
                    <div className="absolute inset-0 pointer-events-none" style={{ boxShadow:'inset 0 0 0 4px #f44336,inset 0 0 0 8px #ff9800,inset 0 0 0 12px #ffeb3b,inset 0 0 0 16px #4caf50,inset 0 0 0 20px #2196f3,inset 0 0 0 24px #9c27b0' }} />
                  )}

                  {/* project-purple: dark side bars + top */}
                  {bg === 'project-purple' && (
                    <>
                      <div className="absolute top-0 left-0 right-0" style={{ height:'22%', backgroundColor:'#6a1b9a' }} />
                      <div className="absolute left-0" style={{ top:'22%', bottom:0, width:'9%', backgroundColor:'#6a1b9a' }} />
                      <div className="absolute right-0" style={{ top:'22%', bottom:0, width:'9%', backgroundColor:'#6a1b9a' }} />
                      <div className="absolute" style={{ top:'11%', left:'50%', transform:'translateX(-50%)', width:8, height:8, borderRadius:'50%', backgroundColor:'#fff176' }} />
                      {/* lines inside purple content area */}
                      {Array.from({length:8}).map((_,i)=>(
                        <div key={i} className="absolute" style={{ top:`${27+i*9}%`, left:'11%', right:'11%', height:'0.5px', backgroundColor:'#9c27b0', opacity:0.55 }} />
                      ))}
                      <div className="absolute" style={{ top:'26%', bottom:'3%', left:'22%', width:'1px', backgroundColor:'#ff8888', opacity:0.65 }} />
                    </>
                  )}

                  {/* project-floral: green bottom strip */}
                  {bg === 'project-floral' && (
                    <div className="absolute bottom-0 left-0 right-0" style={{ height:'14%', backgroundColor:'#2e7d32', opacity:0.85 }} />
                  )}

                  {/* project-ocean: blue wave bottom */}
                  {bg === 'project-ocean' && (
                    <div className="absolute bottom-0 left-0 right-0" style={{ height:'18%', backgroundColor:'#1565c0', opacity:0.28, borderRadius:'70% 70% 0 0 / 90% 90% 0 0', transform:'scaleX(1.4)' }} />
                  )}

                  {/* project-pink: inset pink border */}
                  {bg === 'project-pink' && (
                    <div className="absolute inset-0 pointer-events-none" style={{ boxShadow:'inset 0 0 0 6px #f48fb1', opacity:0.75 }} />
                  )}

                  {/* Lined styles (excluding project-purple which is inline above) */}
                  {isLined && (
                    <>
                      {/* Project header box */}
                      {isProject && (
                        <div className="absolute" style={{ top:'5%', left:'8%', right:'8%', height:'15%', border:`0.5px solid ${lineColor}`, opacity:0.6 }}>
                          <div className="absolute top-0 bottom-0" style={{ left:'48%', width:'0.5px', backgroundColor:lineColor }} />
                          <div className="absolute top-0 bottom-0" style={{ left:'74%', width:'0.5px', backgroundColor:lineColor }} />
                        </div>
                      )}
                      {/* Horizontal lines */}
                      {Array.from({length:lineCount}).map((_,i)=>(
                        <div key={i} className="absolute" style={{
                          top:`${lineStart + i*lineStep}%`,
                          left:'20%', right:'4%',
                          height:'0.5px',
                          backgroundColor: lineColor,
                          opacity: 0.8,
                        }} />
                      ))}
                      {/* Red margin line */}
                      <div className="absolute" style={{
                        top:`${lineStart-2}%`,
                        bottom: bg==='project-floral' ? '16%' : '3%',
                        left:'20%', width:'1px',
                        backgroundColor:'#ff8888', opacity:0.75,
                      }} />
                    </>
                  )}
                </div>

                <span className="text-[7px] font-bold uppercase p-1 bg-white page-style-label text-center w-full truncate leading-tight">
                  {STYLE_LABELS[bg]}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    );
  };

  const renderTypography = () => (
    <section className="space-y-4">
      <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60 flex items-center gap-2">
        <Sparkles size={14} /> Typography
      </h3>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="flex justify-between font-mono text-[10px] font-bold uppercase">
            <span>Font Size</span>
            <span>{settings.fontSize}px</span>
          </label>
          <input 
            type="range" min="12" max="72" 
            value={settings.fontSize}
            onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
            className="w-full accent-brutal-black h-8"
          />
        </div>
        <div className="space-y-1">
          <label className="flex justify-between font-mono text-[10px] font-bold uppercase">
            <span>Line Height</span>
            <span>{settings.lineHeight}px</span>
          </label>
          <input 
            type="range" min="12" max="96" 
            value={settings.lineHeight}
            onChange={(e) => updateSetting('lineHeight', parseInt(e.target.value))}
            className="w-full accent-brutal-black h-8"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-mono text-[10px] font-bold uppercase opacity-60">Slant</label>
            <input 
              type="range" min="-15" max="15" 
              value={settings.slant}
              onChange={(e) => updateSetting('slant', parseInt(e.target.value))}
              className="w-full accent-brutal-black h-8"
            />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[10px] font-bold uppercase opacity-60">Letter Spacing</label>
            <input 
              type="range" min="-2" max="10" 
              value={settings.letterSpacing}
              onChange={(e) => updateSetting('letterSpacing', parseInt(e.target.value))}
              className="w-full accent-brutal-black h-8"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-mono text-[10px] font-bold uppercase opacity-60">Word Spacing</label>
            <input 
              type="range" min="-5" max="20" 
              value={settings.wordSpacing}
              onChange={(e) => updateSetting('wordSpacing', parseInt(e.target.value))}
              className="w-full accent-brutal-black h-8"
            />
          </div>
          <div className="space-y-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-mono text-[10px] font-bold uppercase opacity-60">Margins</label>
            <input 
              type="range" min="0" max="150" 
              value={settings.leftMargin}
              onChange={(e) => updateSetting('leftMargin', parseInt(e.target.value))}
              className="w-full accent-brutal-black h-8"
            />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[10px] font-bold uppercase opacity-60">Ink Color</label>
            <div className="flex items-center gap-2">
              <input 
                type="color" 
                value={settings.inkColor}
                onChange={(e) => updateSetting('inkColor', e.target.value)}
                className="w-full h-8 p-0 border-2 border-brutal-black"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const renderEffects = () => (
    <div className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60 flex items-center gap-2">
          <Settings size={14} /> Realism
        </h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer min-h-[44px]">
            <span className="font-mono text-xs font-bold uppercase">Natural Randomness</span>
            <input 
              type="checkbox" 
              checked={settings.naturalRandomness}
              onChange={(e) => updateSetting('naturalRandomness', e.target.checked)}
              className="w-6 h-6 accent-warning-yellow"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer min-h-[44px]">
            <span className="font-mono text-xs font-bold uppercase">Ink Variation</span>
            <input 
              type="checkbox" 
              checked={settings.inkVariation}
              onChange={(e) => updateSetting('inkVariation', e.target.checked)}
              className="w-6 h-6 accent-warning-yellow"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60 flex items-center gap-2">
          <Layout size={14} /> Visual Effects
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {(['normal', 'shadow', 'scanner', 'saturate'] as const).map(eff => (
            <button 
              key={eff}
              onClick={() => updateSetting('effect', eff)}
              className={cn(
                "px-2 py-3 border-2 border-[var(--border-primary)] text-[10px] font-bold uppercase min-h-[44px] transition-all duration-150 cursor-pointer",
                settings.effect === eff
                  ? "bg-warning-yellow text-brutal-black shadow-[2px_2px_0px_var(--shadow-color)]"
                  : "bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--warning-yellow)] hover:text-brutal-black hover:border-brutal-black hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[3px_3px_0px_var(--shadow-color)] active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0px_var(--shadow-color)]"
              )}
            >
              {eff}
            </button>
          ))}
        </div>
      </section>
    </div>
  );

  const renderElements = () => (
    <section className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60 flex items-center gap-2">
          <Layout size={14} /> Interactive Elements
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => addElement('text')} className="brutal-btn text-[10px] p-2 min-h-[44px] h-auto">Add Text</button>
          <button onClick={() => addElement('heading')} className="brutal-btn text-[10px] p-2 min-h-[44px] h-auto">Add Heading</button>
          <label className="brutal-btn text-[10px] p-2 flex items-center justify-center gap-1 col-span-2 cursor-pointer min-h-[44px]">
            <ImageIcon size={14} /> Add Image
            <input type="file" className="hidden" accept="image/*" onChange={addImage} />
          </label>
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60">Quick Emojis</h3>
        <div className="grid grid-cols-6 sm:grid-cols-4 gap-1">
          {['❤', '⭐', '✓', '🎈', '🎁', '→', '•', '✨', '🔥', '👍', '😊', '💡'].map(emoji => (
            <button 
              key={emoji}
              onClick={() => {
                addElement('emoji', emoji);
                if (isMobile) setActiveMobileDrawer(null);
              }}
              className="aspect-square brutal-border hover:bg-warning-yellow/10 transition-colors text-lg flex items-center justify-center min-h-[44px]"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </section>
  );

  const renderPage = (newSettings?: PageConfig, textToUse?: string) => {
    const activeSettings = newSettings || settings;
    const contentToUse = textToUse !== undefined ? textToUse : inputText;
    if (!contentToUse) return;
    
    // 1. Reflow pagination
    const fitted = wrapTextIntoPages(contentToUse, {
      width: 595,
      height: 842,
      fontSize: activeSettings.fontSize,
      lineHeight: activeSettings.lineHeight,
      leftMargin: activeSettings.leftMargin,
      topMargin: activeSettings.topMargin,
      wordSpacing: activeSettings.wordSpacing,
      letterSpacing: activeSettings.letterSpacing,
      paragraphSpacing: activeSettings.paragraphSpacing
    }, effectiveFontName);
    
    setPages(prev => {
      // Preserve images/elements for matching indices
      return fitted.map((content, idx) => {
        const existingPage = prev[idx];
        return {
          id: existingPage?.id || Math.random().toString(36).substr(2, 9),
          content,
          images: existingPage?.images || [],
          elements: existingPage?.elements || []
        };
      });
    });
    
    // Note: CanvasPage components will redraw visually when props change
  };

  const handleTextChange = (newPageContent: string) => {
    // 1. Update everything atomically to avoid state delays
    setPages(prev => {
      const nextPages = prev.map((p, idx) => 
        idx === currentPageIndex ? { ...p, content: newPageContent } : p
      );
      
      // 2. Update full document text using the new pages array
      const fullText = nextPages.map(p => p.content).join('\n\n');
      setInputText(fullText);

      // 3. Debounce the layout reflow
      const timeoutId = (window as any)._renderTimeout;
      if (timeoutId) clearTimeout(timeoutId);
      (window as any)._renderTimeout = setTimeout(() => {
        renderPage(settings, fullText);
      }, 1000);

      return nextPages;
    });
  };

  const updateSetting = <K extends keyof PageConfig>(key: K, value: PageConfig[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    renderPage(next);
  };

  const [inputText, setInputText] = useState('');
  const [showReflowPrompt, setShowReflowPrompt] = useState(false);
  const [isAIEditPanelOpen, setIsAIEditPanelOpen] = useState(false);
  const [aiUserInstruction, setAiUserInstruction] = useState('');
  const [aiHistory, setAiHistory] = useState<string[]>([]);
  const [lastAIPages, setLastAIPages] = useState<WriterPage[] | null>(null);
  const [lastAIText, setLastAIText] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAIWarning, setShowAIWarning] = useState(false);
  const [aiPartialData, setAiPartialData] = useState<{validatedText: string, newSettings: PageConfig} | null>(null);

  // Apply profile from Phase 4
  useEffect(() => {
    if (initialProfile) {
      const p = initialProfile;
      const newSettings = {
        ...settings,
        slant: p.slant,
        letterSpacing: p.letterSpacing,
        lineHeight: p.lineHeight * settings.fontSize,
        inkColor: p.inkColor,
        thickness: (p.strokeWeight - 1) * 5,
        naturalRandomness: p.wobble > 0.2,
        randomnessIntensity: p.wobble,
        inkVariation: p.irregularity > 0.3,
        inkVariationIntensity: p.irregularity
      };
      setSettings(newSettings);
      renderPage(newSettings);
      setToast("Font and style loaded from your handwriting analysis!");
      if (onProfileApplied) onProfileApplied();
    }
  }, [initialProfile]);

  // Success toast timer
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load AI history on mount
  useEffect(() => {
    const saved = localStorage.getItem('writer_ai_history');
    if (saved) {
      try {
        setAiHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load AI history", e);
      }
    }
  }, []);

  const saveToAIHistory = (instruction: string) => {
    const newHistory = [instruction, ...aiHistory.filter(i => i !== instruction)].slice(0, 5);
    setAiHistory(newHistory);
    localStorage.setItem('writer_ai_history', JSON.stringify(newHistory));
  };

  const applyAIResult = (validatedText: string, newSettings: PageConfig) => {
    // Update settings and trigger center render
    setSettings(newSettings);
    
    const fittedPages = wrapTextIntoPages(validatedText, {
      width: 595,
      height: 842,
      fontSize: newSettings.fontSize,
      lineHeight: newSettings.lineHeight,
      leftMargin: newSettings.leftMargin,
      topMargin: newSettings.topMargin,
      wordSpacing: newSettings.wordSpacing,
      letterSpacing: newSettings.letterSpacing,
      paragraphSpacing: newSettings.paragraphSpacing
    }, effectiveFontName);

    const newPages: WriterPage[] = fittedPages.map((content) => ({
      id: Math.random().toString(36).substr(2, 9),
      content,
      images: [],
      elements: []
    }));

    setPages(newPages);
    setCurrentPageIndex(0);
    setInputText(validatedText);
    saveToAIHistory(aiUserInstruction);
    setIsAIEditPanelOpen(false);
    setToast("AI edits applied!");
    setShowAIWarning(false);
    setAiPartialData(null);
  };

  const handleAIEdit = async () => {
    setAiError(null);
    const documentText = pages.map(p => p.content).join('\n\n');
    const userInstruction = aiUserInstruction;

    const fullPrompt = `You are a handwriting document formatter. 
Your job is to take a plain text document and 
re-output the ENTIRE document with formatting 
tags inserted correctly.

CRITICAL RULES YOU MUST FOLLOW:

RULE 1 — TAG EVERY SINGLE LINE:
You must add an [INK:color] tag before EVERY 
line of text in the document without exception.
Never leave any line without an ink color tag.
If a line has no tag the color bleeds from the 
previous line which breaks the formatting.

RULE 2 — COLOR DOES NOT AUTO RESET:
The ink color stays the same until you 
explicitly change it with a new [INK:] tag.
So if you set [INK:blue] on line 5 and forget 
to tag line 6, line 6 will also be blue.
This is why EVERY line must have its own tag.

RULE 3 — OUTPUT THE COMPLETE DOCUMENT:
You must output every single line of the 
input document in your response.
Do not summarize, skip, truncate, or stop early.
Even if the document is very long, output all of it.
If you stop early the missing content is lost forever.

RULE 4 — NEVER ADD EXTRA TEXT:
Do not add explanations, comments, notes, 
or any text that was not in the original document.
Only output the original text with tags added.

RULE 5 — TAG FORMAT IS EXACT:
Tags must be written exactly like this:
[INK:black]
[INK:blue]
[INK:red]
[HEADING]
[GAP]
[BREAK]
[CENTER]
[SIZE:20]
No spaces inside tags. No other formats accepted.

---

HOW TO FORMAT A HOMEWORK DOCUMENT:

For a document with questions and answers 
use this logic for every single line:

- Question numbers and labels → [INK:black]
- Subject, difficulty, requirement lines → [INK:black]
- Lines that start with Step → [INK:red]
- Step content and explanation lines → [INK:red]
- FINAL ANSWER label → [INK:black]
- Answer content lines → [INK:blue]
- QUESTION headings → [HEADING][INK:black]
- Blank lines between sections → [GAP]

EXAMPLE OF CORRECT OUTPUT:

[HEADING][INK:black]QUESTION 1
[INK:black]1. Subject Area: Mathematics
[INK:black]2. Specific Question: Prove the square root
[INK:black]of 2 is irrational.
[INK:black]3. Difficulty Level: University
[INK:black]4. Requirement: Step by step working.
[GAP]
[INK:red]Step 1. Assume for contradiction that root 2
[INK:red]is rational. Write it as a/b with no common
[INK:red]factors and b not zero.
[GAP]
[INK:red]Step 2. Square both sides.
[INK:red]2 equals a squared over b squared.
[GAP]
[INK:black]FINAL ANSWER
[INK:blue]The root 2 is irrational because
[INK:blue]assuming it is rational leads to contradiction.
[BREAK]

NOTICE in the example above:
- Every single line has [INK:tag] before it
- Steps are red
- Answers are blue
- Labels and questions are black
- [GAP] appears between sections
- [BREAK] appears at end of each question

---

NOW APPLY THE USER INSTRUCTION:

The user's instruction tells you which colors 
and styles to use. Follow it exactly.
If user says steps in red, every step line gets 
[INK:red] before it, no exceptions.
If user says answers in blue, every answer line 
gets [INK:blue] before it, no exceptions.

Apply these rules to the ENTIRE document.
Start from line 1 and go to the very last line.
Do not stop until the entire document is tagged.

User instruction: ${userInstruction}

Document to format:
${documentText}`;

    try {
      if (!apiKey || !apiKey.trim()) {
        throw new Error("You don't have the API key set up yet. Please set up the API key.");
      }
      if (!documentText || documentText.trim() === "") {
        throw new Error("Document is empty");
      }

      // Save current state for undo
      const undoSnapshot = JSON.parse(JSON.stringify(pages));
      setLastAIPages(undoSnapshot);
      setLastAIText(inputText);

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: fullPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192
        }
      };

      console.log("Gemini Request Body:", JSON.stringify(requestBody, null, 2));
      setIsAIProcessing(true);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Gemini API error:", errorBody);
        throw new Error("API call failed: " + errorBody);
      }

      const data = await response.json();
      const rawText = data.contents?.[0]?.parts?.[0]?.text 
        || data.candidates?.[0]?.content?.parts?.[0]?.text;

      console.log("Gemini Raw Response:", rawText);

      if (!rawText || rawText.trim() === "") {
        throw new Error("AI returned empty content — no changes made");
      }

      // Line count safety check
      const originalLines = documentText.split('\n').filter(l => l.trim() !== "").length;
      const responseLines = rawText.split('\n').filter(l => l.trim() !== "").length;

      // Safe tag parser to ensure content integrity only — does NOT mutate global settings
      // FIX 1: keep newSettings as a clean copy of current settings so that AI ink color
      // tags in the text don't permanently overwrite the user's chosen global ink color.
      let newSettings = { ...settings };
      const parseTaggedContent = (text: string) => {
        const parts = text.split(/(\[INK:[^\]]+\]|\[SIZE:\d+\]|\[HEADING\]|\[CENTER\]|\[GAP\]|\[BREAK\]|\[BOLD\]|\[NORMAL\]|\[LINE:\d+\])/);

        let hasContent = false;
        for (const part of parts) {
          if (part && !part.startsWith('[') && part.trim() !== "") {
            hasContent = true;
            break;
          }
        }
        return hasContent ? text : null;
      };

      const validatedText = parseTaggedContent(rawText);
      if (!validatedText) {
        throw new Error("AI returned empty content — no changes made");
      }

      if (responseLines < originalLines * 0.7) {
        setAiPartialData({ validatedText, newSettings });
        setShowAIWarning(true);
        return;
      }

      applyAIResult(validatedText, newSettings);
    } catch (e: any) {
      console.error("AI Edit error:", e);
      const msg = e?.message || "";
      if (
        msg.toLowerCase().includes("api key") ||
        msg.toLowerCase().includes("invalid_argument") ||
        msg.toLowerCase().includes("400") ||
        msg.toLowerCase().includes("403")
      ) {
        setAiError("You don't have the API key set up yet. Please set up the API key.");
      } else {
        setAiError(e.message || "Failed to call Gemini API");
      }
      // Recovery is handled by ensuring setPages is NOT called with bad data
    } finally {
      setIsAIProcessing(false);
    }
  };

  const undoAIEdit = () => {
    if (lastAIPages && lastAIText !== null) {
      setPages(lastAIPages);
      setInputText(lastAIText);
      setLastAIPages(null);
      setLastAIText(null);
      setToast("AI edits undone");
    }
  };

  // Handle prefilled text from Homework Solver
  useEffect(() => {
    if (initialText) {
      const fitted = wrapTextIntoPages(initialText, {
        width: 595,
        height: 842,
        fontSize: settings.fontSize,
        lineHeight: settings.lineHeight,
        leftMargin: settings.leftMargin,
        topMargin: settings.topMargin,
        wordSpacing: settings.wordSpacing,
        letterSpacing: settings.letterSpacing,
        paragraphSpacing: settings.paragraphSpacing
      }, effectiveFontName);
      
      const newPages: WriterPage[] = fitted.map(content => ({
        id: Math.random().toString(36).substr(2, 9),
        content,
        images: [],
        elements: []
      }));
      
      setPages(newPages);
      setCurrentPageIndex(0);
      setInputText(initialText);
      
      onTextConsumed?.();
    }
  }, [initialText, onTextConsumed, fontName, settings]);

  // Reactive Reflow: Removed in favor of manual renderPage calls for tighter control

  const handleCustomFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const name = file.name.split('.')[0];
    const fontFace = new FontFace(name, `url(${url})`);
    fontFace.load().then((loadedFace) => {
      document.fonts.add(loadedFace);
      if (onUploadFont) {
        onUploadFont({
          id: Math.random().toString(36).substr(2, 9),
          name,
          url,
          createdAt: Date.now()
        });
      }
    });
  };

  const [snapGuides, setSnapGuides] = useState<{ x?: number, y?: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getScale = () => {
    if (!containerRef.current) return 1;
    // The internal coordinate system is fixed at 595 width
    const rect = containerRef.current.getBoundingClientRect();
    return 595 / rect.width;
  };

  // FIX 3: Convert a mouse/pointer event's client coordinates into canvas-internal
  // coordinates (0–595 × 0–842), accounting for any CSS transform scaling applied
  // to the canvas wrapper on mobile devices.
  const getCanvasRelativePosition = (event: React.MouseEvent | MouseEvent, canvasEl: HTMLElement) => {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = 595 / rect.width;
    const scaleY = 842 / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const snap = (x: number, y: number, width: number, height: number) => {
    const snapThreshold = 10;
    let snappedX = x;
    let snappedY = y;
    let activeGuides: { x?: number, y?: number } = {};

    // Snap to margins
    if (Math.abs(x - settings.leftMargin) < snapThreshold) {
      snappedX = settings.leftMargin;
      activeGuides.x = settings.leftMargin;
    }
    if (Math.abs(x + width - (595 - settings.leftMargin)) < snapThreshold) {
      snappedX = 595 - settings.leftMargin - width;
      activeGuides.x = 595 - settings.leftMargin;
    }
    
    // Snap to horizontal center
    if (Math.abs(x + width / 2 - 595 / 2) < snapThreshold) {
      snappedX = 595 / 2 - width / 2;
      activeGuides.x = 595 / 2;
    }

    // Snap to top margin
    if (Math.abs(y - settings.topMargin) < snapThreshold) {
      snappedY = settings.topMargin;
      activeGuides.y = settings.topMargin;
    }

    return { x: snappedX, y: snappedY, guides: activeGuides };
  };

  const addElement = (type: 'text' | 'heading' | 'emoji', content: string = '') => {
    const newId = Math.random().toString(36).substr(2, 9);
    const size = type === 'heading' ? settings.fontSize * 1.5 : (type === 'emoji' ? 40 : settings.fontSize);
    
    // Better default dimensions to prevent misalignment
    const defaultWidth = type === 'emoji' ? 40 : (type === 'heading' ? 200 : 100);
    const defaultHeight = type === 'emoji' ? 40 : (type === 'heading' ? 40 : 24);

    const newElement: WriterElement = {
      id: newId,
      type,
      content: content || (type === 'text' ? 'New Text' : type === 'heading' ? 'New Heading' : '❤'),
      x: 100,
      y: 100,
      layer: 'above',
      rotation: 0,
      fontSize: size,
      width: defaultWidth,
      height: defaultHeight
    };
    
    updatePages(prev => prev.map((page, idx) => 
      idx === currentPageIndex 
        ? { ...page, elements: [...page.elements, newElement] }
        : page
    ));
    setSelectedElementId(newId);
  };

  const addImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const src = evt.target?.result as string;
      const newId = Math.random().toString(36).substr(2, 9);
      
      // Load once to get natural dimensions for sync
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        const width = 200;
        const height = 200 / ratio;

        const newImage: WriterImage = {
          id: newId,
          src,
          x: 100,
          y: 100,
          width,
          height,
          layer: 'above',
          rotation: 0
        };
        
        updatePages(prev => prev.map((page, idx) => 
          idx === currentPageIndex 
            ? { ...page, images: [...page.images, newImage] }
            : page
        ));
        setSelectedElementId(newId);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const updateElement = (id: string, updates: Partial<WriterElement | WriterImage>, skipHistory = false) => {
    updatePages(prev => prev.map((page, idx) => {
      if (idx !== currentPageIndex) return page;
      
      const newElements = page.elements.map(el => 
        el.id === id ? { ...el, ...updates } as WriterElement : el
      );
      const newImages = page.images.map(img => 
        img.id === id ? { ...img, ...updates } as WriterImage : img
      );
      
      return { ...page, elements: newElements, images: newImages };
    }), skipHistory);
  };

  const deleteElement = (id: string) => {
    updatePages(prev => prev.map((page, idx) => {
      if (idx !== currentPageIndex) return page;
      return {
        ...page,
        elements: page.elements.filter(e => e.id !== id),
        images: page.images.filter(i => i.id !== id)
      };
    }));
    setSelectedElementId(null);
  };

  const moveElementLayer = (id: string, direction: 'front' | 'back') => {
    updatePages(prev => prev.map((page, idx) => {
      if (idx !== currentPageIndex) return page;
      
      const newElements = [...page.elements];
      const elIndex = newElements.findIndex(e => e.id === id);
      if (elIndex !== -1) {
        const el = newElements.splice(elIndex, 1)[0];
        if (direction === 'front') newElements.push(el);
        else newElements.unshift(el);
      }
      
      const newImages = [...page.images];
      const imgIndex = newImages.findIndex(i => i.id === id);
      if (imgIndex !== -1) {
        const img = newImages.splice(imgIndex, 1)[0];
        if (direction === 'front') newImages.push(img);
        else newImages.unshift(img);
      }
      
      return { ...page, elements: newElements, images: newImages };
    }));
  };

  const downloadAllAsZip = async () => {
    const zip = new JSZip();
    // In a real app, we'd capture each canvas as a blob
    pages.forEach((page, i) => {
      zip.file(`page_${i + 1}.txt`, page.content);
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Handwritten_Pages.zip';
    a.click();
  };

  // Eagerly load every saved font into document.fonts.
  // - Google Fonts (Phase 4): inject CSS link, use the real family name.
  // - Binary fonts (Phase 1): load bytes under a unique id-based family.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const font of savedFonts) {
        if (loadedSavedFontIds.current.has(font.id)) continue;

        try {
          if (font.googleFont) {
            const family = font.fontFamily || font.name;
            if (font.url && !document.querySelector(`link[href="${font.url}"]`)) {
              const link = document.createElement('link');
              link.href = font.url;
              link.rel = 'stylesheet';
              document.head.appendChild(link);
            }
            const sizes = [12, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72];
            await Promise.all(
              sizes.map(s => document.fonts.load(`${s}px "${family}"`).catch(() => {}))
            );
          } else {
            const family = `inktwin-font-${font.id}`;
            const res = await fetch(font.url);
            const buffer = await res.arrayBuffer();
            if (cancelled) return;
            const face = new FontFace(family, buffer);
            const loaded = await face.load();
            if (cancelled) return;
            document.fonts.add(loaded);
            const sizes = [12, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72];
            await Promise.all(
              sizes.map(s => document.fonts.load(`${s}px "${family}"`).catch(() => {}))
            );
          }
          if (cancelled) return;
          loadedSavedFontIds.current.add(font.id);
          setFontVersion(v => v + 1);
        } catch (err) {
          console.error(`Failed to load saved font ${font.name}:`, err);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [savedFonts]);

  // If the parent supplies a freshly-built font (blob: URL), drop any
  // active saved-font selection so the new build actually shows.
  useEffect(() => {
    if (fontUrl && fontUrl.startsWith('blob:')) {
      setActiveFontId(null);
    }
  }, [fontUrl]);

  // Auto-load font if URL changes
  useEffect(() => {
    if (!fontUrl) return;

    if (fontUrl.includes('fonts.googleapis.com')) {
      if (!document.querySelector(`link[href="${fontUrl}"]`)) {
        const link = document.createElement('link');
        link.href = fontUrl;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      document.fonts.ready.then(() => setFontVersion(v => v + 1));
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // Fetch as ArrayBuffer — works for blob:, data:, and http(s): URLs
        // and is more reliable than passing data URLs through `url(...)`.
        const res = await fetch(fontUrl);
        const buffer = await res.arrayBuffer();
        if (cancelled) return;

        // Remove any existing faces under this family so the new one wins.
        const toDelete: FontFace[] = [];
        document.fonts.forEach(face => {
          if (face.family === fontName) toDelete.push(face);
        });
        toDelete.forEach(face => document.fonts.delete(face));

        const fontFace = new FontFace(fontName, buffer);
        const loadedFace = await fontFace.load();
        if (cancelled) return;
        document.fonts.add(loadedFace);

        // Pre-warm the font for canvas2d at the sizes the writer uses.
        // ctx.fillText falls back silently if the size isn't loaded yet.
        const sizes = [12, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72];
        await Promise.all(
          sizes.map(s => document.fonts.load(`${s}px "${fontName}"`).catch(() => {}))
        );
        if (cancelled) return;

        setFontVersion(v => v + 1);
      } catch (err) {
        console.error('Font load error:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [fontUrl, fontName]);

  const addPage = () => {
    const newPage: WriterPage = { 
      id: Math.random().toString(36).substr(2, 9), 
      content: '', 
      images: [], 
      elements: [] 
    };
    updatePages([...pages, newPage]);
    setCurrentPageIndex(pages.length);
  };

  const removePage = (index: number) => {
    if (pages.length === 1) return;
    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);
    setCurrentPageIndex(Math.max(0, index - 1));
  };


  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      const text = data.map(row => row.join(' ')).join('\n');
      setInputText(text);
    };
    reader.readAsBinaryString(file);
  };

  const onResizeStart = (e: React.PointerEvent, corner: string) => {
    e.stopPropagation();
    e.preventDefault();
    const el = pages[currentPageIndex].elements.find(element => element.id === selectedElementId) || 
               pages[currentPageIndex].images.find(img => img.id === selectedElementId);
    if (!el) return;

    const isImage = 'src' in el;
    const scale = getScale();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = el.width || (el.type === 'heading' ? 200 : (el.type === 'emoji' ? el.fontSize || 40 : 100));
    const startH = el.height || (el.type === 'heading' ? 40 : (el.type === 'emoji' ? el.fontSize || 40 : 24));

    const onPointerMove = (moveE: PointerEvent) => {
      const deltaX = (moveE.clientX - startX) * scale;
      const deltaY = (moveE.clientY - startY) * scale;

      let newW = startW;
      let newH = startH;

      if (corner.includes('right')) newW = startW + deltaX;
      if (corner.includes('left')) newW = startW - deltaX;
      if (corner.includes('bottom')) newH = startH + deltaY;
      if (corner.includes('top')) newH = startH - deltaY;

      if (el.type === 'emoji' || isImage) {
        const ratio = startW / startH;
        if (Math.abs(deltaX) >= Math.abs(deltaY)) {
          newH = newW / ratio;
        } else {
          newW = newH * ratio;
        }
      }

      updateElement(el.id, {
        width: Math.max(20, newW),
        height: Math.max(20, newH),
        ...(el.type === 'emoji' && { fontSize: Math.max(10, Math.max(20, newH)) }),
      }, true);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      updateElement(el.id, {});
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const downloadPDF = async () => {
    const pdfDoc = await PDFDocument.create();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 595;
    tempCanvas.height = 842;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    const cache = new Map<string, HTMLImageElement>();
    
    for (const page of pages) {
      await renderCanvasPage(ctx, page, settings, effectiveFontName, 595, 842, cache);
      const imageData = tempCanvas.toDataURL('image/jpeg', 0.8);
      const imageBytes = await fetch(imageData).then(r => r.arrayBuffer());
      const pdfImage = await pdfDoc.embedJpg(imageBytes);
      const pdfPage = pdfDoc.addPage([595, 842]);
      pdfPage.drawImage(pdfImage, {
        x: 0,
        y: 0,
        width: 595,
        height: 842,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Handwritten_Document.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-100 dark:bg-neutral-950">
      {/* Top Toolbar */}
      {/* Header / Toolbar */}
      <div className={cn(
        "bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-3 sm:p-4 z-30 transition-all shadow-sm",
        isMobile ? "flex flex-col gap-3" : "flex items-center justify-between"
      )}>
        <div className={cn("flex flex-wrap items-center gap-2 sm:gap-3", isMobile && "justify-between w-full")}>
          {onNavigate && isMobile && (
            <button 
              onClick={() => onNavigate('home')}
              className="brutal-btn p-2 min-h-[40px] min-w-[40px] flex items-center justify-center gap-1 text-xs"
              title="Return to Home"
            >
              <ChevronLeft size={16} />
              <span className="font-display uppercase text-[10px] font-bold">Home</span>
            </button>
          )}

          <button 
            onClick={() => setMode(mode === 'default' ? 'classic' : 'default')}
            className="brutal-btn p-2 min-h-[40px] min-w-[40px] flex items-center justify-center"
            title={mode === 'default' ? "Collapse sidebars" : "Expand sidebars"}
          >
            {mode === 'default' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          {!isMobile && <div className="h-7 w-[1px] bg-neutral-300 dark:bg-neutral-700" />}
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsAIEditPanelOpen(true)}
              className="brutal-btn bg-warning-yellow hover:bg-amber-300 text-black flex items-center justify-center gap-1.5 px-3 h-10 transition-colors"
            >
              <Sparkles size={15} />
              <span className="font-display uppercase text-xs font-bold">✨ AI Edit</span>
            </button>
          </div>
          
          {showReflowPrompt && (
            <motion.button 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => {
                setIsAIEditPanelOpen(true);
                setShowReflowPrompt(false);
              }}
              className="brutal-btn bg-warning-yellow hover:bg-amber-300 text-black flex items-center justify-center gap-2 px-3 border-dashed h-10"
            >
              <RefreshCw size={14} />
              <span className="font-mono text-[9px] font-bold uppercase">Reflow?</span>
            </motion.button>
          )}
        </div>

        <div className={cn("flex flex-wrap items-center gap-2", isMobile && "justify-center w-full")}>
          <button 
            onClick={undo} 
            disabled={historyIndex <= 0}
            className="brutal-btn p-2 disabled:opacity-30 flex items-center justify-center gap-1 min-h-[44px] min-w-[44px]"
            title="Undo"
          >
            <Undo2 size={18} />
          </button>
          <button 
            onClick={redo} 
            disabled={historyIndex >= history.length - 1}
            className="brutal-btn p-2 disabled:opacity-30 flex items-center justify-center gap-1 min-h-[44px] min-w-[44px]"
            title="Redo"
          >
            <Redo2 size={18} />
          </button>
          {!isMobile && <div className="h-7 w-[1px] bg-neutral-300 dark:bg-neutral-700 mx-1" />}
          <span className="font-mono text-xs font-bold px-2 text-neutral-800 dark:text-neutral-200">
            PAGE {currentPageIndex + 1} OF {pages.length}
          </span>
          <button 
            onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))} 
            disabled={currentPageIndex === 0}
            className="brutal-btn p-2 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-30"
            title="Previous page"
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))} 
            disabled={currentPageIndex >= pages.length - 1}
            className="brutal-btn p-2 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-30"
            title="Next page"
          >
            <ChevronRight size={18} />
          </button>
          {!isMobile && <div className="h-7 w-[1px] bg-neutral-300 dark:bg-neutral-700 mx-1" />}
          <button 
            onClick={addPage} 
            className="brutal-btn p-2 bg-warning-yellow hover:bg-amber-300 text-black min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Add new page"
          >
            <Plus size={18} />
          </button>
          <button 
            onClick={() => removePage(currentPageIndex)} 
            disabled={pages.length <= 1}
            className="brutal-btn p-2 bg-error-red text-white min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-30"
            title="Delete current page"
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div className={cn("flex flex-wrap items-center gap-2", isMobile && "justify-center w-full")}>
          <button onClick={downloadPDF} className="brutal-btn bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center gap-2 px-4 h-11 shadow-sm">
            <Download size={17} />
            <span className="font-display uppercase text-xs font-bold">PDF</span>
          </button>
          <button onClick={downloadAllAsZip} className="brutal-btn bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center gap-2 px-4 h-11 shadow-sm">
            <Download size={17} />
            <span className="font-display uppercase text-xs font-bold">ZIP</span>
          </button>
        </div>
      </div>

      <div 
        className={cn(
          "flex flex-grow overflow-hidden",
          isMobile ? "flex-col" : "flex-row"
        )} 
        onPaste={(e) => {
          const items = e.clipboardData.items;
          for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
              const file = item.getAsFile();
              if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                  const src = evt.target?.result as string;
                  const newId = Math.random().toString(36).substr(2, 9);
                  const img = new Image();
                  img.onload = () => {
                    const ratio = img.width / img.height;
                    const w = 200;
                    const h = 200 / ratio;
                    updatePages(prev => prev.map((page, idx) => 
                      idx === currentPageIndex 
                        ? { ...page, images: [...page.images, { id: newId, src, x: 147, y: 150, width: w, height: h, layer: 'above', rotation: 0 }] }
                        : page
                    ));
                    setSelectedElementId(newId);
                  };
                  img.src = src;
                };
                reader.readAsDataURL(file);
              }
            }
          }
        }}
      >
        {/* Left Sidebar: Controls (Desktop Only) */}
        {!isMobile && mode === 'default' && (
          <aside className="w-80 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 overflow-y-auto p-6 space-y-8">
            {renderFontLibrary()}
            {renderPageStyle()}
            {renderTypography()}
            {renderEffects()}
            
            <section className="space-y-4">
              <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60 flex items-center gap-2">
                <FileUp size={14} /> Import Options
              </h3>
              <div className="space-y-2">
                <label className="w-full brutal-btn flex items-center justify-center gap-2 cursor-pointer text-xs">
                  <FileUp size={14} />
                  Import Excel/CSV
                  <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImportExcel} />
                </label>
              </div>
            </section>
          </aside>
        )}

        {/* Center: Canvas Area Workbench */}
        <main className={cn(
          "flex-grow flex flex-col items-center bg-neutral-200 dark:bg-[#0c0d11] overflow-x-hidden",
          isMobile ? "gap-6 p-4 pb-36 overflow-y-auto" : "gap-12 p-12 overflow-auto"
        )}>
          {/* Canvas Wrapper for Scaling */}
          <div
            className="relative"
            style={isMobile ? {
              width: `${595 * mobileScale}px`,
              height: `${842 * mobileScale}px`,
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              flexShrink: 0
            } : { width: '595px', height: '842px' }}
          >
            <div
              className="relative group shadow-2xl bg-white rounded-sm overflow-hidden"
              style={{
                width: '595px',
                height: '842px',
                transform: isMobile ? `scale(${mobileScale})` : undefined,
                transformOrigin: 'top left',
                backgroundColor: '#FFFFFF',
              }}
              ref={containerRef}
              onClick={(e) => {
                // FIX 3: convert click to canvas-internal coordinates before hit-testing
                // so that element deselection works correctly on mobile-scaled canvases
                if (containerRef.current) {
                  const pos = getCanvasRelativePosition(e, containerRef.current);
                  const hitEl = pages[currentPageIndex]?.elements.find(el => {
                    const w = el.width || 100;
                    const h = el.height || 24;
                    return pos.x >= el.x && pos.x <= el.x + w && pos.y >= el.y && pos.y <= el.y + h;
                  });
                  if (!hitEl) setSelectedElementId(null);
                } else {
                  setSelectedElementId(null);
                }
              }}
            >
              <CanvasPage 
                key={`${effectiveFontName}-${fontVersion}`}
                page={pages[currentPageIndex]} 
                config={settings} 
                fontName={effectiveFontName}
                skipImages={true}
              >
                {/* Guides */}
                {snapGuides && (
                  <div className="absolute inset-0 pointer-events-none z-40">
                    {snapGuides.x !== undefined && (
                      <div className="absolute top-0 bottom-0 w-[1px] border-l border-dashed border-warning-yellow bg-warning-yellow/20" style={{ left: snapGuides.x }} />
                    )}
                    {snapGuides.y !== undefined && (
                      <div className="absolute left-0 right-0 h-[1px] border-t border-dashed border-warning-yellow bg-warning-yellow/20" style={{ top: snapGuides.y }} />
                    )}
                  </div>
                )}

                    <textarea
                      value={pages[currentPageIndex].content}
                      onChange={(e) => handleTextChange(e.target.value)}
                      onPaste={(e) => {
                        const pastedText = e.clipboardData.getData('text');
                        if (pastedText.length > 200) {
                          e.preventDefault();
                          const fitted = wrapTextIntoPages(pastedText, {
                            width: 595,
                            height: 842,
                            fontSize: settings.fontSize,
                            lineHeight: settings.lineHeight,
                            leftMargin: settings.leftMargin,
                            topMargin: settings.topMargin,
                            wordSpacing: settings.wordSpacing,
                            letterSpacing: settings.letterSpacing,
                            paragraphSpacing: settings.paragraphSpacing
                          }, effectiveFontName);
                          
                          const newPages: WriterPage[] = fitted.map(content => ({
                            id: Math.random().toString(36).substr(2, 9),
                            content,
                            images: [],
                            elements: []
                          }));
                          setPages(newPages);
                          setCurrentPageIndex(0);
                          setInputText(pastedText);
                        }
                      }}
                      className="paper-textarea absolute inset-0 w-full h-full !bg-transparent !text-transparent caret-neutral-900 resize-none outline-none border-none font-mono selection:bg-warning-yellow/30 pointer-events-auto"
                      style={{
                        paddingTop: `${settings.topMargin}px`,
                        paddingLeft: `${settings.leftMargin}px`,
                        paddingRight: `${settings.leftMargin}px`,
                        fontSize: `${settings.fontSize}px`,
                        lineHeight: `${settings.lineHeight}px`,
                        zIndex: 10,
                        fontFamily: effectiveFontName,
                        backgroundColor: 'transparent',
                        color: 'transparent',
                      }}
                      spellCheck={false}
                      placeholder="Start writing directly on the page..."
                    />

                {/* Interactive Element Overlays — Canva-style DOM rendering */}
                <div className="absolute inset-0 pointer-events-none z-20">
                  {[...pages[currentPageIndex].elements, ...pages[currentPageIndex].images].map((el) => {
                    const isSelected = selectedElementId === el.id;
                    const isImage = 'src' in el;

                    const elWidth = el.width || (el.type === 'heading' ? 200 : (el.type === 'emoji' ? el.fontSize || 40 : 100));
                    const elHeight = el.height || (el.type === 'heading' ? 40 : (el.type === 'emoji' ? el.fontSize || 40 : 24));

                    const startDrag = (e: React.PointerEvent) => {
                      if ((e.target as HTMLElement).dataset.handle) return;
                      e.stopPropagation();
                      e.preventDefault();
                      setSelectedElementId(el.id);
                      const scale = getScale();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const origX = el.x;
                      const origY = el.y;
                      let moved = false;

                      const onMove = (me: PointerEvent) => {
                        moved = true;
                        const dx = (me.clientX - startX) * scale;
                        const dy = (me.clientY - startY) * scale;
                        const snapResult = snap(origX + dx, origY + dy, elWidth, elHeight);
                        setSnapGuides(snapResult.guides);
                        updateElement(el.id, { x: snapResult.x, y: snapResult.y }, true);
                      };
                      const onUp = () => {
                        window.removeEventListener('pointermove', onMove);
                        window.removeEventListener('pointerup', onUp);
                        setSnapGuides(null);
                        if (moved) updateElement(el.id, {});
                      };
                      window.addEventListener('pointermove', onMove);
                      window.addEventListener('pointerup', onUp);
                    };

                    return (
                      <div
                        key={el.id}
                        className={cn("absolute pointer-events-auto cursor-move select-none", isSelected ? "z-50" : "z-20")}
                        style={{
                          left: el.x,
                          top: el.y,
                          width: elWidth,
                          height: elHeight,
                          transform: `rotate(${el.rotation || 0}deg)`,
                          transformOrigin: 'center center',
                        }}
                        onPointerDown={startDrag}
                        onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); }}
                      >
                        {/* Images render as real visible DOM elements (not on canvas in live mode) */}
                        {isImage && (
                          <img
                            src={(el as WriterImage).src}
                            draggable={false}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
                            alt=""
                          />
                        )}

                        {isSelected ? (
                          <>
                            {/* Selection border */}
                            <div className="absolute inset-[-3px] border-2 border-warning-yellow bg-warning-yellow/5 pointer-events-none" />

                            {/* Corner resize handles */}
                            {[
                              { pos: '-top-2 -left-2', cursor: 'cursor-nw-resize', corner: 'top-left' },
                              { pos: '-top-2 -right-2', cursor: 'cursor-ne-resize', corner: 'top-right' },
                              { pos: '-bottom-2 -left-2', cursor: 'cursor-sw-resize', corner: 'bottom-left' },
                              { pos: '-bottom-2 -right-2', cursor: 'cursor-se-resize', corner: 'bottom-right' },
                            ].map(({ pos, cursor, corner }) => (
                              <div
                                key={corner}
                                data-handle="resize"
                                className={`absolute ${pos} w-3.5 h-3.5 bg-white border-2 border-warning-yellow rounded-sm ${cursor} z-50 shadow`}
                                onPointerDown={(e) => { e.stopPropagation(); onResizeStart(e, corner); }}
                              />
                            ))}

                            {/* Rotation handle */}
                            <div
                              data-handle="rotate"
                              className="absolute -top-11 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-alias z-50"
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                                const cx = rect.left + rect.width / 2;
                                const cy = rect.top + rect.height / 2;
                                const onMove = (me: PointerEvent) => {
                                  let deg = Math.atan2(me.clientY - cy, me.clientX - cx) * (180 / Math.PI) + 90;
                                  const snaps = [0, 45, 90, 135, 180, 225, 270, 315, 360];
                                  for (const a of snaps) { if (Math.abs((deg % 360 + 360) % 360 - a) < 5) { deg = a; break; } }
                                  updateElement(el.id, { rotation: deg }, true);
                                };
                                const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); updateElement(el.id, {}); };
                                window.addEventListener('pointermove', onMove);
                                window.addEventListener('pointerup', onUp);
                              }}
                            >
                              <div className="w-[1px] h-6 bg-warning-yellow" />
                              <div className="w-6 h-6 bg-warning-yellow rounded-full flex items-center justify-center border-2 border-white shadow-md hover:scale-125 transition-transform">
                                <RotateCcw size={12} className="text-white pointer-events-none" />
                              </div>
                            </div>

                            {/* Bottom action toolbar */}
                            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-brutal-black/90 p-1.5 rounded-full shadow-2xl border border-white/20 z-50 whitespace-nowrap">
                              <button
                                data-handle="toolbar"
                                onClick={(e) => { e.stopPropagation(); updateElement(el.id, { layer: el.layer === 'above' ? 'below' : 'above' }); }}
                                className={cn("p-1.5 rounded-full transition-colors", el.layer === 'above' ? "bg-warning-yellow text-black" : "hover:bg-white/10 text-white")}
                                title="Toggle Layer"
                              >
                                <Layers size={14} />
                              </button>
                              <button data-handle="toolbar" onClick={(e) => { e.stopPropagation(); moveElementLayer(el.id, 'front'); }} className="p-1.5 hover:bg-white/10 text-white rounded-full transition-colors" title="Bring to Front">
                                <Maximize2 size={14} />
                              </button>
                              <button data-handle="toolbar" onClick={(e) => { e.stopPropagation(); moveElementLayer(el.id, 'back'); }} className="p-1.5 hover:bg-white/10 text-white rounded-full transition-colors" title="Send to Back">
                                <Minimize2 size={14} />
                              </button>
                              {!isImage && (
                                <button data-handle="toolbar" onClick={(e) => { e.stopPropagation(); const newContent = prompt('Edit Content:', el.content); if (newContent !== null) updateElement(el.id, { content: newContent }); }} className="p-1.5 hover:bg-white/10 text-white rounded-full transition-colors">
                                  <Edit3 size={14} />
                                </button>
                              )}
                              <div className="h-4 w-[1px] bg-white/20 mx-1" />
                              <button data-handle="toolbar" onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-full transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 border border-transparent hover:border-warning-yellow/30 pointer-events-none" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CanvasPage>
            </div>
          </div>
          
          {/* Mobile Text Input Area */}
          {isMobile && (
            <div className="w-full px-4 mb-32">
              <div className="brutal-card bg-white space-y-2 p-4">
                <h3 className="font-display uppercase text-xs opacity-70">Text Input</h3>
                <textarea 
                  value={inputText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInputText(val);
                    renderPage(settings, val);
                  }}
                  className="w-full min-h-[120px] p-4 brutal-border bg-white font-mono text-base outline-none focus:ring-4 ring-warning-yellow/20"
                  placeholder="Start typing your handwritten masterpiece..."
                />
              </div>
            </div>
          )}

          {/* Desktop Text Input area */}
          {!isMobile && (
            <div className="w-full max-w-[595px] space-y-4">
              <h3 className="font-display uppercase text-sm opacity-40">Text Input</h3>
              <textarea 
                value={inputText}
                onChange={(e) => {
                  const val = e.target.value;
                  setInputText(val);
                  renderPage(settings, val);
                }}
                className="w-full h-40 p-6 brutal-border bg-white font-mono text-sm outline-none focus:ring-4 ring-warning-yellow/20"
                placeholder="Start typing your handwritten masterpiece..."
              />
            </div>
          )}
        </main>

        {/* AI Edit Slide-in Panel */}
        <AnimatePresence>
          {isAIEditPanelOpen && (
            <>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAIEditPanelOpen(false)}
                className="fixed inset-0 bg-brutal-black/20 backdrop-blur-sm z-[100]"
              />
              {/* Panel */}
              <motion.aside 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-[380px] max-w-full bg-white border-l-2 border-brutal-black z-[101] shadow-2xl flex flex-col"
              >
                {/* Panel Header */}
                <div className="p-6 border-b-2 border-brutal-black flex items-center justify-between bg-neutral-50">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-warning-yellow" size={24} />
                    <h2 className="font-display text-lg uppercase tracking-tight">AI Smart Editor</h2>
                  </div>
                  <button 
                    onClick={() => setIsAIEditPanelOpen(false)}
                    className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Panel Content */}
                <div className="flex-grow overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-neutral-300">
                  
                  {/* Quick Presets */}
                  <div className="space-y-3">
                    <h3 className="font-mono text-[10px] font-bold uppercase opacity-60 tracking-widest">Quick Presets</h3>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Questions black, answers blue",
                        "Student rough notes style",
                        "Exam answer sheet format",
                        "Headings red, body black",
                        "All blue ballpoint pen",
                        "Add paragraph spacing",
                        "Clean up formatting",
                        "Make it look natural"
                      ].map(preset => (
                        <button 
                          key={preset}
                          onClick={() => setAiUserInstruction(preset)}
                          className="px-3 py-1.5 bg-neutral-100 border-2 border-brutal-black text-[10px] font-bold uppercase hover:bg-warning-yellow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-0 active:translate-y-0 active:shadow-none"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-[1px] bg-neutral-100" />

                  {/* Instruction Box */}
                  <div className="space-y-3">
                    <h3 className="font-mono text-[10px] font-bold uppercase opacity-60 tracking-widest">Your Instruction</h3>
                    <div className="relative">
                      <textarea 
                        value={aiUserInstruction}
                        onChange={(e) => setAiUserInstruction(e.target.value)}
                        placeholder="Tell AI what to do with your document...&#10;Example: Make questions black ink and answers blue ink, add proper spacing between sections, format headings larger"
                        className="w-full h-40 brutal-border p-4 font-mono text-xs resize-none bg-neutral-50 focus:bg-white focus:ring-4 focus:ring-warning-yellow/10 transition-all outline-none"
                      />
                      <div className="absolute top-2 right-2 opacity-5 animate-pulse"><Edit3 size={14} /></div>
                    </div>
                    <p className="text-[10px] font-mono opacity-50 italic leading-relaxed">
                      AI can change ink colors, adjust spacing, add page breaks, format headings, and make your document look naturally handwritten
                    </p>
                  </div>

                  {/* History */}
                  {aiHistory.length > 0 && (
                    <div className="space-y-3 pt-4">
                      <div className="flex items-center gap-2">
                        <History size={12} className="opacity-40" />
                        <h3 className="font-mono text-[10px] font-bold uppercase opacity-40 tracking-widest">Recent</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {aiHistory.map((h, i) => (
                          <button 
                            key={i}
                            onClick={() => {
                              setAiUserInstruction(h);
                              setAiError(null);
                            }}
                            className="px-2 py-1 text-[9px] font-mono border border-dashed border-neutral-300 hover:border-brutal-black hover:bg-neutral-50 transition-colors"
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Error Display */}
                  {aiError && (
                    <div className="mt-4 p-3 bg-red-50 border-brutal-black border-2 flex gap-3 text-red-600 animate-in fade-in slide-in-from-top-1">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-tighter">AI Error</p>
                        <p className="text-[10px] font-mono leading-tight">{aiError}</p>
                      </div>
                    </div>
                  )}

                  {/* Bottom Actions */}
                  <div className="mt-8 space-y-3">
                    <button 
                      onClick={handleAIEdit}
                      disabled={isAIProcessing || !aiUserInstruction}
                      className={cn(
                        "w-full h-14 bg-warning-yellow brutal-border font-display uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:grayscale",
                        !isAIProcessing && "hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      )}
                    >
                      {isAIProcessing ? (
                        <>
                          <RefreshCw size={20} className="animate-spin" />
                          <span>AI is editing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={20} />
                          <span>Apply AI Edits</span>
                        </>
                      )}
                    </button>
                    
                    {lastAIPages && (
                      <button 
                        onClick={undoAIEdit}
                        className="w-full py-2 font-mono text-[10px] font-bold uppercase text-neutral-400 hover:text-error-red flex items-center justify-center gap-2 transition-colors"
                      >
                        <RotateCcw size={14} />
                        Undo Last AI Edit
                      </button>
                    )}
                  </div>

                  <div className="bg-neutral-50 brutal-border p-4 mt-8">
                    <div className="flex gap-2 items-start opacity-60">
                      <Layout size={14} className="mt-0.5" />
                      <p className="text-[10px] font-mono leading-relaxed">
                        Tags used: [INK:color], [SIZE:N], [BREAK], [GAP], [CENTER], [HEADING].
                        Handwriting is preserved, only the layout and ink style changes.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Global Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 bg-neutral-950 text-white font-display uppercase text-sm brutal-border z-[200] shadow-2xl flex items-center gap-3"
            >
              <Sparkles className="text-warning-yellow" size={18} />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Sidebar: Elements (Desktop Only) */}
        {!isMobile && mode === 'default' && (
          <aside className="w-64 bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 overflow-y-auto p-6 space-y-8">
            {renderElements()}
          </aside>
        )}

        {/* Mobile Floating Studio Tool Ribbon & Drawer (Docked above global bottom nav) */}
        {isMobile && (
          <>
            {/* Drawer Overlay (Clear, non-blurring to keep live paper view completely visible) */}
            <AnimatePresence>
              {activeMobileDrawer && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveMobileDrawer(null)}
                  className="fixed inset-0 bg-black/10 z-[25]"
                />
              )}
            </AnimatePresence>

            {/* Floating Studio Editing Toolbar (Docked above the global navigation dock) */}
            <div className="fixed bottom-[58px] left-2 right-2 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-2 border-neutral-900 dark:border-neutral-700 rounded-2xl z-30 px-2 py-1.5 flex gap-1 items-center justify-between shadow-xl">
              {[
                { id: 'font' as const, icon: <Type size={16} />, label: 'Font' },
                { id: 'style' as const, icon: <Palette size={16} />, label: 'Paper & Ink' },
                { id: 'type' as const, icon: <Sparkles size={16} />, label: 'Type' },
                { id: 'effects' as const, icon: <Settings size={16} />, label: 'Effects' },
                { id: 'elements' as const, icon: <Layout size={16} />, label: 'Elements' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMobileDrawer(activeMobileDrawer === tab.id ? null : tab.id)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 flex-1 py-1 transition-all active:scale-95",
                    activeMobileDrawer === tab.id ? "text-neutral-950 dark:text-white font-bold" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-xl transition-all",
                    activeMobileDrawer === tab.id ? "bg-warning-yellow text-neutral-950 shadow-sm" : ""
                  )}>
                    {tab.icon}
                  </div>
                  <span className="text-[9px] font-display font-bold uppercase tracking-tight">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Bottom Drawer (Compact height above floating tool ribbon so paper is always visible) */}
            <AnimatePresence>
              {activeMobileDrawer && (
                <motion.div
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '100%', opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed bottom-[118px] left-2 right-2 bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 z-35 h-[42vh] max-h-[360px] flex flex-col shadow-2xl rounded-2xl overflow-hidden"
                >
                  {/* Header / Drag Handle */}
                  <div 
                    className="w-full h-9 flex items-center justify-between px-3.5 cursor-pointer bg-neutral-100 dark:bg-neutral-950/70 border-b border-neutral-200 dark:border-neutral-800 select-none"
                    onClick={() => setActiveMobileDrawer(null)}
                  >
                    <span className="font-display text-[11px] uppercase font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      {activeMobileDrawer === 'font' && '🔤 Font Library'}
                      {activeMobileDrawer === 'style' && '🎨 Paper & Ink Style'}
                      {activeMobileDrawer === 'type' && '✨ Typography & Spacing'}
                      {activeMobileDrawer === 'effects' && '⚙️ Realism & Effects'}
                      {activeMobileDrawer === 'elements' && '🧩 Document Elements'}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveMobileDrawer(null); }}
                      className="px-2 py-0.5 rounded-lg bg-warning-yellow text-neutral-950 text-[10px] font-display font-bold uppercase hover:scale-105 active:scale-95 transition-transform"
                    >
                      Done ✕
                    </button>
                  </div>
                  <div className="flex-grow overflow-y-auto p-4 pb-8">
                    {activeMobileDrawer === 'font' && renderFontLibrary()}
                    {activeMobileDrawer === 'style' && renderPageStyle()}
                    {activeMobileDrawer === 'type' && renderTypography()}
                    {activeMobileDrawer === 'effects' && renderEffects()}
                    {activeMobileDrawer === 'elements' && renderElements()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      <AnimatePresence>
        {showAIWarning && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAIWarning(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 p-6 rounded-2xl shadow-2xl z-[201]"
            >
              <div className="flex items-center gap-3 text-error-red mb-4">
                <AlertTriangle size={24} />
                <h3 className="font-display text-xl uppercase">Partial Result Warning</h3>
              </div>
              <p className="font-mono text-sm mb-8 leading-relaxed">
                AI only formatted part of the document. Click Apply anyway or try again.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => aiPartialData && applyAIResult(aiPartialData.validatedText, aiPartialData.newSettings)}
                  className="w-full py-3 bg-warning-yellow border-2 border-brutal-black font-display uppercase text-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-0 active:translate-y-0 active:shadow-none"
                >
                  Apply Partial
                </button>
                <button 
                  onClick={() => {
                    setShowAIWarning(false);
                    handleAIEdit();
                  }}
                  className="w-full py-3 bg-white border-2 border-brutal-black font-display uppercase text-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-0 active:translate-y-0 active:shadow-none"
                >
                  Retry
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Processing Overlay */}
      <AnimatePresence>
        {isAIProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-brutal-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white"
          >
            <Sparkles size={80} className="animate-pulse text-warning-yellow mb-8" />
            <h2 className="text-4xl font-display uppercase tracking-tighter mb-4">Gemini is writing...</h2>
            <p className="font-mono text-sm opacity-60">OPTIMIZING LAYOUT & DISTRIBUTING TEXT</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
