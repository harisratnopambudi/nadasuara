import React from 'react';

export default function VoiceButton({ voice, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left relative overflow-hidden group ${selected
        ? 'bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-500/10'
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold transition-colors ${selected ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
        }`}>
        {voice.gender === 'Male' ? 'M' : 'F'}
      </div>
      <div className="min-w-0">
        <div className={`font-semibold truncate text-sm ${selected ? 'text-indigo-600 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
          {voice.name}
        </div>
        <div className={`text-[11px] truncate ${selected ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-500'}`}>{voice.style}</div>
      </div>
    </button>
  );
}