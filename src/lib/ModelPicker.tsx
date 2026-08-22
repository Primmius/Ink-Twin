import React, { useMemo, useState } from 'react';
import { ChevronDown, Cpu, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { GeminiModel, DEFAULT_MODEL } from './models';

interface ModelPickerProps {
  value: string;
  onChange: (id: string) => void;
  models: GeminiModel[]; // already sorted (free first)
  loading?: boolean;
}

/**
 * Dropdown for picking which Gemini model InkTwin calls. Designed for the
 * Settings modal — shows a search box, free tier highlighted, and a custom
 * input for any model id the user types manually.
 */
export const ModelPicker: React.FC<ModelPickerProps> = ({ value, onChange, models, loading }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [customMode, setCustomMode] = useState(false);

  // Make sure the currently-selected value is shown even if the live list
  // no longer has it (deprecated / custom).
  const displayList = useMemo(() => {
    const found = models.find((m) => m.id === value);
    if (found) return models;
    return [
      ...models,
      { id: value, label: value, tier: 'unknown' as const, description: 'Custom or deprecated' },
    ];
  }, [models, value]);

  const freeList = useMemo(
    () => displayList.filter((m) => m.tier === 'free'),
    [displayList]
  );
  const paidList = useMemo(
    () => displayList.filter((m) => m.tier !== 'free'),
    [displayList]
  );

  const q = query.trim().toLowerCase();
  const matches = (m: GeminiModel) =>
    !q || m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q);

  const selected = displayList.find((m) => m.id === value);

  return (
    <div className="space-y-2">
      <label className="font-mono text-[10px] font-bold uppercase opacity-60 flex items-center gap-1">
        <Cpu size={11} /> AI Model
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full px-4 py-3 bg-neutral-50 brutal-border font-mono text-left flex items-center justify-between gap-2 hover:bg-neon-green/5 transition-colors"
        >
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold truncate">
              {selected?.label || value || DEFAULT_MODEL}
            </span>
            <span className="text-[10px] opacity-50 truncate">
              {selected?.tier === 'free' ? '✓ Free tier' : selected?.tier === 'paid' ? 'Paid tier' : 'Custom / unknown'}
              {selected?.description ? ` • ${selected.description}` : ''}
            </span>
          </div>
          <ChevronDown size={16} className={cn('transition-transform flex-shrink-0', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white brutal-border max-h-80 overflow-y-auto brutal-shadow">
            {/* Search box */}
            <div className="sticky top-0 bg-white border-b-2 border-brutal-black p-2">
              <div className="flex items-center gap-2 px-2 py-1 bg-neutral-50 brutal-border">
                <Search size={12} className="opacity-50" />
                <input
                  type="text"
                  placeholder="Search models..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent text-xs font-mono outline-none"
                  autoFocus
                />
              </div>
            </div>

            {loading && (
              <div className="px-3 py-2 text-[10px] font-mono opacity-50 uppercase">Loading live model list...</div>
            )}

            {freeList.filter(matches).length > 0 && (
              <SectionGroup title="Free tier (recommended)">
                {freeList.filter(matches).map((m) => (
                  <ModelRow
                    key={m.id}
                    model={m}
                    selected={m.id === value}
                    onClick={() => { onChange(m.id); setOpen(false); setQuery(''); }}
                  />
                ))}
              </SectionGroup>
            )}

            {paidList.filter(matches).length > 0 && (
              <SectionGroup title="Paid tier">
                {paidList.filter(matches).map((m) => (
                  <ModelRow
                    key={m.id}
                    model={m}
                    selected={m.id === value}
                    onClick={() => { onChange(m.id); setOpen(false); setQuery(''); }}
                  />
                ))}
              </SectionGroup>
            )}

            {/* Custom id input — last resort, always available */}
            <div className="border-t-2 border-brutal-black p-2 bg-neutral-50">
              {!customMode ? (
                <button
                  type="button"
                  onClick={() => setCustomMode(true)}
                  className="w-full text-left px-2 py-1.5 text-[10px] font-mono opacity-70 hover:opacity-100 hover:bg-neon-green/10"
                >
                  + Use a custom model id
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const id = String(fd.get('customId') || '').trim();
                    if (id) {
                      onChange(id);
                      setOpen(false);
                      setQuery('');
                      setCustomMode(false);
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    name="customId"
                    placeholder="models/gemini-..."
                    className="flex-1 px-2 py-1.5 brutal-border font-mono text-xs outline-none focus:bg-neon-green/10"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2 py-1.5 brutal-border bg-neon-green font-mono text-[10px] font-bold uppercase"
                  >
                    Use
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] font-mono opacity-50">
        If a model is no longer available, InkTwin will retry once with a fallback and then show an error.
      </p>
    </div>
  );
};

const SectionGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div className="px-3 pt-2 pb-1 text-[9px] font-mono font-bold uppercase opacity-50 tracking-widest">
      {title}
    </div>
    <div>{children}</div>
  </div>
);

const ModelRow: React.FC<{ model: GeminiModel; selected: boolean; onClick: () => void }> = ({
  model, selected, onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'w-full text-left px-3 py-2 font-mono text-xs hover:bg-neon-green/10 transition-colors',
      selected && 'bg-neon-green/20 font-bold'
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="truncate">{model.label}</span>
      {selected && <span className="text-[9px] font-bold opacity-70">✓</span>}
    </div>
    {model.description && (
      <div className="text-[9px] opacity-50 truncate">{model.description}</div>
    )}
  </button>
);
