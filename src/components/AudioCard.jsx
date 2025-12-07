import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Trash2 } from 'lucide-react';

export default function AudioCard({ item, onDelete }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-indigo-500/50 hover:shadow-md hover:shadow-indigo-500/5 transition-all group">
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
          {item.voice}
        </span>
        <span className="text-[10px] text-slate-500 font-medium">{item.date}</span>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2 leading-relaxed italic opacity-90 border-l-2 border-slate-200 dark:border-slate-700 pl-2">
        "{item.text}"
      </p>

      <audio ref={audioRef} src={item.audioUrl} className="hidden" />

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100 dark:border-slate-700">
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center transition-transform active:scale-95 shadow-sm shadow-indigo-500/20"
        >
          {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
        </button>

        <div className="flex gap-1">
          <a
            href={item.audioUrl}
            download={`promo-vo-${item.id}.wav`}
            className="p-2 text-slate-400 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
            title="Download WAV"
          >
            <Download size={18} />
          </a>
          <button
            onClick={() => onDelete(item.id)}
            className="p-2 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Hapus"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}