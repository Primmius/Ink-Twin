import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Link as LinkIcon, 
  Type, 
  Camera,
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  Send, 
  Copy, 
  Edit3, 
  ChevronRight,
  Brain,
  Trash2,
  Trash,
  Wand2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import mammoth from 'mammoth';
import { cn } from '../lib/utils';
import { pdfToText, pdfToImages } from '../lib/pdf';
import { HomeworkInput, AnswerMode, solveHomework, HomeworkResult } from '../lib/homeworkService';
import { HomeworkHistory } from './HomeworkHistory';

interface HomeworkSolverProps {
  apiKey: string;
  onSendToWriter: (text: string) => void;
  onSendToHumanizer: (text: string) => void;
  onOpenSettings: () => void;
  onOpenCamera: () => void;
}

export const HomeworkSolver: React.FC<HomeworkSolverProps> = ({ apiKey, onSendToWriter, onSendToHumanizer, onOpenSettings, onOpenCamera }) => {
  const [input, setInput] = useState<HomeworkInput>({});
  const [inputText, setInputText] = useState('');
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [answerMode, setAnswerMode] = useState<AnswerMode>('both');
  const [result, setResult] = useState<HomeworkResult | null>(null);
  const [editableAnswer, setEditableAnswer] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [history, setHistory] = useState<HomeworkResult[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'text' | 'url' | 'camera'>('upload');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'detected' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Loading messages rotation
  useEffect(() => {
    if (!isProcessing) return;
    const messages = [
      "Reading your homework...",
      "Thinking really hard...",
      "Almost done...",
      "Checking the answer..."
    ];
    let i = 0;
    setLoadingMessage(messages[0]);
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadingMessage(messages[i]);
    }, 2000);
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('homework_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveHistory = (newResult: HomeworkResult) => {
    const updated = [newResult, ...history].slice(0, 10);
    setHistory(updated);
    localStorage.setItem('homework_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('homework_history');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      if (file.type === 'application/pdf') {
        const buffer = await file.arrayBuffer();
        const text = await pdfToText(buffer);
        const images = await pdfToImages(buffer);
        setInput({ pdfText: text, imageData: images[0] }); // Just first page as preview image
        setUploadStatus('detected');
      } else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setInput({ imageData: event.target.result as string });
            setUploadStatus('detected');
          }
        };
        reader.readAsDataURL(file);
      } else if (file.name.endsWith('.docx')) {
        const buffer = await file.arrayBuffer();
        const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
        setInput({ docxText: value });
        setUploadStatus('detected');
      }
    } catch (err) {
      console.error("Upload failed", err);
      setUploadStatus('error');
    }
  };

  const isApiKeyProblem = (err: any) => {
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
  };

  const handleSolve = async () => {
    if (!apiKey || !apiKey.trim() || apiKey.trim().length < 8) {
      setError("You don't have the API key set up yet. Please set up the API key.");
      onOpenSettings();
      return;
    }

    const finalInput = { ...input };
    if (inputText) finalInput.text = inputText;
    if (url) finalInput.sourceUrl = url;

    setIsProcessing(true);
    setError(null);
    try {
      const res = await solveHomework(finalInput, answerMode, apiKey);
      setResult(res);
      setEditableAnswer(res.answer);
      saveHistory(res);
    } catch (err: any) {
      console.error("Solver failed", err);
      if (isApiKeyProblem(err)) {
        setError("You don't have the API key set up yet. Please set up the API key.");
        onOpenSettings();
      } else {
        setError(err?.message || "Solver failed. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFollowUp = async () => {
    if (!apiKey || !apiKey.trim() || apiKey.trim().length < 8) {
      setError("You don't have the API key set up yet. Please set up the API key.");
      onOpenSettings();
      return;
    }
    if (!followUp || !result) return;
    setIsProcessing(true);
    setError(null);
    try {
      const res = await solveHomework(input, answerMode, apiKey, followUp, result.answer);
      setResult(res);
      setEditableAnswer(res.answer);
      setFollowUp('');
    } catch (err: any) {
      console.error("Follow-up failed", err);
      if (isApiKeyProblem(err)) {
        setError("You don't have the API key set up yet. Please set up the API key.");
        onOpenSettings();
      } else {
        setError(err?.message || "Follow-up failed. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editableAnswer);
    alert("Copied to clipboard!");
  };

  const handleRegenerate = () => {
    handleSolve();
  };

  return (
    <div className="flex flex-col lg:flex-row lg:h-full overflow-y-auto lg:overflow-hidden theme-bg">
      {/* Left Column: Upload & Input */}
      <div className="w-full lg:w-1/3 border-b-2 lg:border-b-0 lg:border-r-2 theme-border p-6 flex flex-col gap-6 theme-bg lg:overflow-y-auto">
        <div className="space-y-4">
          <h2 className="text-3xl font-display uppercase">Step 1: Upload</h2>
          
          <div className="flex border-2 theme-border font-mono text-xs mb-4">
            <button 
              onClick={() => setActiveTab('upload')}
              className={cn("flex-1 py-3 transition-colors flex items-center justify-center gap-2", activeTab === 'upload' ? "bg-warning-yellow text-brutal-black" : "hover:bg-neutral-100 dark:hover:bg-neutral-800")}
            >
              <Upload size={14} />
              FILE
            </button>
            <button 
              onClick={() => setActiveTab('text')}
              className={cn("flex-1 py-3 border-l-2 border-r-2 theme-border transition-colors flex items-center justify-center gap-2", activeTab === 'text' ? "bg-warning-yellow text-brutal-black" : "hover:bg-neutral-100 dark:hover:bg-neutral-800")}
            >
              <Type size={14} />
              TEXT
            </button>
            <button 
              onClick={() => setActiveTab('url')}
              className={cn("flex-1 py-3 border-r-2 theme-border transition-colors flex items-center justify-center gap-2", activeTab === 'url' ? "bg-warning-yellow text-brutal-black" : "hover:bg-neutral-100 dark:hover:bg-neutral-800")}
            >
              <LinkIcon size={14} />
              URL
            </button>
            <button 
              onClick={onOpenCamera}
              className="px-4 py-3 hover:bg-warning-yellow transition-colors flex items-center justify-center"
              title="Capture with Camera"
            >
              <Camera size={16} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'upload' && (
              <motion.div 
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <label className="w-full h-32 brutal-border border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-warning-yellow/5 transition-colors group">
                  <Upload size={24} className="opacity-30 group-hover:opacity-100 group-hover:scale-110 transition-all text-warning-yellow" />
                  <span className="font-mono text-[10px] font-bold uppercase">PDF, JPG, PNG, DOCX</span>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={handleFileUpload} />
                </label>
                {uploadStatus === 'detected' && (
                  <div className="p-3 bg-warning-yellow/10 border-2 border-warning-yellow text-[11px] font-mono flex items-center justify-between">
                    <span className="flex items-center gap-2">
                       <CheckCircle2 size={14} className="text-warning-yellow" /> 
                       Content Detected
                    </span>
                    <button onClick={() => { setInput({}); setUploadStatus('idle'); }} className="text-error-red font-bold hover:underline">RESET</button>
                  </div>
                )}
                {input.imageData && (
                  <div className="brutal-border p-2 bg-neutral-50">
                    <img src={input.imageData} alt="Preview" className="w-full max-h-40 object-contain" />
                  </div>
                )}
                {(input.pdfText || input.docxText) && (
                   <div className="brutal-border p-3 bg-neutral-50 text-[10px] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                     {input.pdfText || input.docxText}
                   </div>
                )}
              </motion.div>
            )}

            {activeTab === 'text' && (
              <motion.div 
                key="text"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste or type your homework questions here..."
                  className="w-full h-40 brutal-border p-4 font-mono text-xs outline-none focus:bg-warning-yellow/5 transition-colors resize-none"
                />
              </motion.div>
            )}

            {activeTab === 'url' && (
              <motion.div 
                key="url"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste question URL here..."
                  className="w-full brutal-border px-4 py-2 font-mono text-xs outline-none focus:bg-warning-yellow/5 transition-colors"
                />
                <p className="text-[10px] opacity-40 font-mono italic px-1">Note: Gemini will visit this page to read the question.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-4 mb-4">
          <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-text-primary">Answer Mode</h3>
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'final', label: 'Final Answer Only', desc: 'Direct solution' },
              { id: 'step-by-step', label: 'Step by Step', desc: 'Detailed working' },
              { id: 'both', label: 'Both', desc: 'Working + Final' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setAnswerMode(m.id as AnswerMode)}
                className={cn(
                  "p-3 brutal-border text-left transition-all",
                  answerMode === m.id ? "bg-warning-yellow brutal-shadow" : "theme-card hover:bg-neutral-50"
                )}
              >
                <div className="font-display uppercase text-xs font-bold text-text-primary">{m.label}</div>
                <div className="text-[9px] font-mono opacity-50 uppercase text-text-primary">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border-2 border-error-red text-error-red text-xs font-mono flex items-start justify-between gap-2">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="font-bold underline text-[10px] uppercase shrink-0">Dismiss</button>
          </div>
        )}

        <button
          onClick={handleSolve}
          disabled={isProcessing || (!input.imageData && !input.pdfText && !input.docxText && !inputText && !url)}
          className={cn(
            "w-full brutal-btn bg-brutal-black text-white hover:bg-warning-yellow hover:text-brutal-black transition-all flex items-center justify-center gap-2 group",
            "lg:mt-auto py-4"
          )}
        >
          {isProcessing ? <RefreshCw size={20} className="animate-spin" /> : <Brain size={20} className="group-hover:scale-110 transition-transform" />}
          <span className="font-display uppercase">Solve Homework</span>
        </button>

        <div className="mt-8 border-t-2 border-brutal-black pt-6">
          <HomeworkHistory history={history} onSelect={(item) => { setResult(item); setEditableAnswer(item.answer); }} onClear={clearHistory} />
        </div>
      </div>

      {/* Center Column: Answer Preview */}
      <div className="flex-grow flex flex-col p-4 lg:p-6 lg:overflow-hidden bg-bg-secondary min-h-[60vh] lg:min-h-0">
        <div className="flex-grow theme-card brutal-border brutal-shadow flex flex-col lg:overflow-hidden">
          <div className="p-4 border-b-2 theme-border flex items-center justify-between bg-bg-secondary">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-text-primary text-bg-primary flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-display uppercase text-sm leading-tight text-text-primary">Gemini Answer</h3>
                {result && (
                  <div className="flex gap-2 text-text-primary">
                     <span className="text-[9px] font-mono uppercase opacity-50">Subject: {result.subject}</span>
                     <span className="text-[9px] font-mono uppercase opacity-50">Level: {result.difficulty}</span>
                  </div>
                )}
              </div>
            </div>
            {result && (
               <div className="flex gap-2">
                 <button onClick={copyToClipboard} className="p-2 brutal-border hover:bg-warning-yellow transition-colors" title="Copy">
                   <Copy size={14} />
                 </button>
               </div>
            )}
          </div>

          <div className="flex-grow lg:overflow-y-auto p-4 lg:p-8 relative min-h-[400px]">
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center space-y-4 matrix-scanner z-50 p-6 text-center bg-neutral-900/95 dark:bg-[#0a0a0c]/98 border-2 border-warning-yellow rounded-[4px] text-white"
                >
                  <RefreshCw size={40} className="animate-spin text-warning-yellow" />
                  <div className="font-display uppercase text-2xl tracking-tighter animate-pulse text-warning-yellow">{loadingMessage}</div>
                  <p className="font-mono text-[10px] opacity-40 max-w-xs text-text-primary">Our AI is crunching the numbers and reading the context to provide the most accurate solution for you.</p>
                </motion.div>
              ) : result ? (
                <motion.div 
                  key="answer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="prose prose-sm max-w-none text-text-primary"
                >
                  <div className="edit-container relative">
                    <textarea
                      value={editableAnswer}
                      onChange={(e) => setEditableAnswer(e.target.value)}
                      className="w-full min-h-[500px] h-auto font-mono text-sm leading-relaxed student-notebook-ruled outline-none focus:border-warning-yellow transition-all resize-none overflow-hidden tech-crosshair-container border-2 border-brutal-black rounded-[4px] brutal-shadow"
                      style={{ height: 'auto', minHeight: '500px' }}
                      onInput={(e: any) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-warning-yellow px-2 py-1 font-mono text-[9px] font-bold uppercase pointer-events-none">
                      Editable Mode
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center space-y-4 opacity-20 text-center"
                >
                  <Brain size={100} strokeWidth={1} />
                  <div className="max-w-xs">
                    <h3 className="font-display uppercase text-xl">Solve it with AI</h3>
                    <p className="font-mono text-xs">Upload your homework question, photo, or doc to get started.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {result && (
            <div className="p-4 border-t-2 border-brutal-black bg-neutral-50 flex gap-2">
              <input 
                type="text"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFollowUp()}
                placeholder="Ask follow-up question..."
                className="flex-grow brutal-border px-4 py-2 font-mono text-xs outline-none focus:bg-warning-yellow/5 transition-colors"
                disabled={isProcessing}
              />
              <button 
                onClick={handleFollowUp}
                disabled={isProcessing || !followUp}
                className="brutal-btn bg-brutal-black text-white hover:bg-warning-yellow hover:text-brutal-black disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Options & Send */}
      <div className="w-full lg:w-[300px] border-t-2 lg:border-t-0 lg:border-l-2 theme-border p-6 flex flex-col gap-8 theme-bg overflow-y-auto mb-16 lg:mb-0">
        <div className="space-y-6">
          <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-text-primary">Actions</h3>
          <div className="space-y-4">
            <button 
              onClick={() => onSendToWriter(editableAnswer)}
              disabled={!editableAnswer}
              className="w-full brutal-btn bg-warning-yellow flex flex-col items-start gap-1 group disabled:opacity-50 disabled:grayscale text-brutal-black"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-display uppercase text-sm">Send to Editor</span>
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
              <span className="text-[9px] font-mono opacity-50 uppercase text-left">Auto-layout in your handwriting font</span>
            </button>

            <button 
              onClick={() => onSendToHumanizer(editableAnswer)}
              disabled={!editableAnswer}
              className="w-full brutal-btn bg-brutal-black text-white hover:bg-warning-yellow hover:text-brutal-black flex flex-col items-start gap-1 group disabled:opacity-50 disabled:grayscale transition-all"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-display uppercase text-sm">Humanize with AI</span>
                <Wand2 size={18} className="group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[9px] font-mono opacity-50 uppercase text-left">Make it sound naturally human</span>
            </button>

            <button 
              onClick={copyToClipboard}
              disabled={!editableAnswer}
              className="w-full brutal-btn flex items-center justify-center gap-2 text-xs font-mono uppercase bg-theme-bg text-text-primary disabled:opacity-50 border-theme-border"
            >
              <Copy size={16} />
              Copy Answer
            </button>
          </div>
        </div>

        {result && (
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-text-primary">Quick Format</h3>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => { setAnswerMode('final'); handleSolve(); }}
                className="w-full p-2 text-left brutal-border text-[10px] uppercase font-bold hover:bg-warning-yellow/10 transition-colors text-text-primary"
              >
                Final Answer Only
              </button>
              <button 
                onClick={() => { setAnswerMode('step-by-step'); handleSolve(); }}
                className="w-full p-2 text-left brutal-border text-[10px] uppercase font-bold hover:bg-warning-yellow/10 transition-colors text-text-primary"
              >
                Step by Step
              </button>
              <button 
                onClick={() => { setAnswerMode('both'); handleSolve(); }}
                className="w-full p-2 text-left brutal-border text-[10px] uppercase font-bold hover:bg-warning-yellow/10 transition-colors text-text-primary"
              >
                Both
              </button>
            </div>
          </div>
        )}

        <div className="mt-auto p-4 theme-card brutal-border border-dashed space-y-2">
           <div className="flex items-center gap-2 text-warning-yellow">
              <CheckCircle2 size={16} />
              <span className="font-display uppercase text-[10px]">HW Engine v3.0</span>
           </div>
           <p className="text-[9px] font-mono opacity-60 leading-tight uppercase text-text-primary">
             Optimized for handwriting output. No markdown symbols or cluttered formatting.
           </p>
        </div>
      </div>
    </div>
  );
};
