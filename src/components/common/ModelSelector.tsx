import React, { useState } from 'react';
import { Cpu, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AVAILABLE_GEMINI_MODELS, GeminiModelOption } from '../../lib/geminiModels';

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  customModel: string;
  onChangeCustomModel: (val: string) => void;
  isCustomModelActive: boolean;
  onSetCustomModelActive: (active: boolean) => void;
  label?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onSelectModel,
  customModel,
  onChangeCustomModel,
  isCustomModelActive,
  onSetCustomModelActive,
  label = "Gemini Model"
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const activeModelOption = AVAILABLE_GEMINI_MODELS.find(m => m.id === selectedModel);

  return (
    <div className="space-y-1.5 p-3 brutal-border bg-neutral-50 dark:bg-neutral-900/60">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase font-bold tracking-widest opacity-70 flex items-center gap-1.5 text-text-primary">
          <Cpu size={13} className="text-warning-yellow" />
          {label}
        </label>
        <span className="text-[9px] font-mono opacity-50 uppercase">Free & High Quota</span>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDropdown(prev => !prev)}
          className="w-full p-2.5 brutal-border bg-white dark:bg-neutral-800 text-left flex items-center justify-between text-xs font-mono font-bold transition-all hover:border-warning-yellow"
        >
          <div className="flex flex-col truncate pr-2">
            <span className="truncate text-neutral-900 dark:text-neutral-100">
              {isCustomModelActive ? (customModel.trim() || 'Custom Model ID...') : (activeModelOption?.name || selectedModel)}
            </span>
            <span className="text-[9px] font-normal opacity-60 truncate">
              {isCustomModelActive ? 'User custom model' : (activeModelOption?.description || selectedModel)}
            </span>
          </div>
          <ChevronDown size={14} className={cn("transition-transform shrink-0", showDropdown ? "rotate-180" : "")} />
        </button>

        {showDropdown && (
          <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-neutral-900 brutal-border brutal-shadow p-1.5 space-y-1 max-h-60 overflow-y-auto">
            {AVAILABLE_GEMINI_MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelectModel(m.id);
                  onSetCustomModelActive(false);
                  setShowDropdown(false);
                }}
                className={cn(
                  "w-full text-left p-2 rounded text-xs transition-colors flex items-center justify-between gap-2",
                  !isCustomModelActive && selectedModel === m.id
                    ? "bg-warning-yellow text-neutral-950 font-bold"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-200"
                )}
              >
                <div className="flex flex-col">
                  <span className="font-mono font-bold">{m.name}</span>
                  <span className="text-[9px] opacity-70 font-sans">{m.description}</span>
                </div>
                {m.tag && (
                  <span className={cn(
                    "text-[9px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0 font-bold",
                    !isCustomModelActive && selectedModel === m.id
                      ? "bg-neutral-950 text-warning-yellow"
                      : "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                  )}>
                    {m.tag}
                  </span>
                )}
              </button>
            ))}

            {/* Custom Model Option */}
            <div className="pt-1.5 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  onSetCustomModelActive(true);
                  setShowDropdown(false);
                }}
                className={cn(
                  "w-full text-left p-2 rounded text-xs transition-colors flex items-center justify-between",
                  isCustomModelActive
                    ? "bg-warning-yellow text-neutral-950 font-bold"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-200"
                )}
              >
                <span className="font-mono">Enter Custom Model ID...</span>
                <span className="text-[9px] font-mono opacity-60">Custom</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {isCustomModelActive && (
        <div className="pt-1">
          <input
            type="text"
            value={customModel}
            onChange={(e) => onChangeCustomModel(e.target.value)}
            placeholder="e.g. gemini-2.5-flash"
            className="w-full p-2 brutal-border bg-white dark:bg-neutral-800 font-mono text-xs outline-none focus:border-warning-yellow"
          />
          <p className="text-[9px] font-mono opacity-50 mt-1">
            Any valid Gemini model ID supported by your API key.
          </p>
        </div>
      )}
    </div>
  );
};
