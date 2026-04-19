import React from 'react';
import { Trash2, Clock, BookOpen, ChevronRight } from 'lucide-react';
import { HomeworkResult } from '../lib/homeworkService';
import { cn } from '../lib/utils';

interface HomeworkHistoryProps {
  history: HomeworkResult[];
  onSelect: (item: HomeworkResult) => void;
  onClear: () => void;
}

export const HomeworkHistory: React.FC<HomeworkHistoryProps> = ({ history, onSelect, onClear }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-60 flex items-center gap-2">
          <Clock size={12} />
          Recent Homework
        </h3>
        {history.length > 0 && (
          <button 
            onClick={onClear}
            className="text-[10px] uppercase font-bold text-error-red hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {history.length === 0 ? (
          <div className="text-center py-8 opacity-30 italic text-xs">
            No history yet
          </div>
        ) : (
          history.map((item, i) => (
            <button
              key={i}
              onClick={() => onSelect(item)}
              className="w-full text-left p-3 brutal-border theme-card hover:bg-neon-green/5 transition-colors group relative"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] bg-brutal-black text-white px-1 font-mono">{item.subject}</span>
                <span className="text-[9px] opacity-40 font-mono">
                  {new Date(item.timestamp).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs font-bold line-clamp-2 leading-tight">
                {item.question}
              </p>
              <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight size={14} />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
