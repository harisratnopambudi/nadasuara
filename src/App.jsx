import React, { useState } from 'react';
import { Mic, History, Loader2, Wand2, Sparkles, Info, Megaphone, Lock, ArrowRight, KeyRound, Sun, Moon } from 'lucide-react';

import VoiceButton from './components/VoiceButton';
import AudioCard from './components/AudioCard';
import { pcmToWav } from './utils/audioUtils';
import { VOICES } from './data/voices';

// --- FUNGSI FETCH DENGAN RETRY ---
const fetchWithRetry = async (url, options, retries = 5, delay = 1000) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      if (retries > 0 && (response.status === 429 || response.status >= 500)) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 2);
      }
      const errorText = await response.text();
      throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
};

export default function App() {
  // State untuk Authentikasi
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [authError, setAuthError] = useState('');

  // State Theme
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // State Aplikasi Utama
  const [text, setText] = useState('Dapatkan promo spesial hari ini! Diskon 50% untuk semua produk. Jangan sampai kehabisan, beli sekarang juga!');
  const [selectedVoice, setSelectedVoice] = useState(VOICES[2]); // Default Andi (Marketing)
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // --- LOGIC AUTHENTIKASI ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (passkeyInput === import.meta.env.VITE_APP_PASSKEY) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Passkey salah. Akses ditolak.');
      setPasskeyInput('');
    }
  };

  // --- LOGIC APLIKASI UTAMA ---
  const handleEnhanceText = async () => {
    if (!text.trim()) return;
    setIsEnhancing(true);
    setError(null);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

      const prompt = `
        Ubah teks berikut menjadi naskah iklan/promosi yang menarik (copywriting) dalam Bahasa Indonesia.
        Buatlah terdengar natural untuk Voice Over (VO).
        
        Gunakan teknik:
        1. Tambahkan jeda napas dengan koma (,) atau titik tiga (...) di tempat yang pas.
        2. Berikan penekanan pada kata kunci.
        3. Gaya bahasa harus sesuai dengan karakter suara yang dipilih: "${selectedVoice.style}".
        4. JANGAN melebihi 500 karakter.
        5. HANYA berikan hasil teksnya saja.
        
        Teks Asli: "${text}"
      `;

      const payload = {
        contents: [{ parts: [{ text: prompt }] }]
      };

      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const enhancedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (enhancedText) {
        setText(enhancedText.trim().slice(0, 500));
      } else {
        throw new Error('Gagal memproses teks.');
      }

    } catch (err) {
      console.error(err);
      setError('Gagal mengoptimalkan teks. Silakan coba lagi.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

      const payload = {
        contents: [{ parts: [{ text: text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: selectedVoice.id
              }
            }
          }
        }
      };

      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const candidate = data.candidates?.[0]?.content?.parts?.[0];

      if (candidate?.inlineData) {
        const pcmData = candidate.inlineData.data;
        const wavUrl = pcmToWav(pcmData, 24000);

        const newEntry = {
          id: Date.now(),
          text: text,
          audioUrl: wavUrl,
          voice: selectedVoice.name,
          date: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        };

        setHistory([newEntry, ...history]);
      } else {
        throw new Error('Tidak ada data audio yang diterima dari server.');
      }

    } catch (err) {
      console.error("Generate Error:", err);
      if (err.message.includes('HTTP Error')) {
        setError(`Terjadi kesalahan jaringan (${err.message}). Coba lagi sebentar lagi.`);
      } else {
        setError('Gagal membuat suara. Pastikan teks tidak kosong dan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id) => {
    setHistory(history.filter(item => item.id !== id));
  };

  const marketingVoices = VOICES.filter(v => v.category === 'Marketing');
  const narrativeVoices = VOICES.filter(v => v.category === 'Narasi');

  // --- TAMPILAN LOGIN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-300">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-slate-200 dark:shadow-black/50 p-8 border border-slate-200 dark:border-slate-700 transition-colors duration-300">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-500 p-3 rounded-xl text-white shadow-lg shadow-indigo-500/30 mb-4 animate-pulse-slow">
              <Megaphone size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight text-center">
              Nada<span className="text-indigo-500">Suara</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase mt-2">Professional AI Voiceover</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="passkey" className="block text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1">
                Access Passkey
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  type="password"
                  id="passkey"
                  value={passkeyInput}
                  onChange={(e) => setPasskeyInput(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm"
                  placeholder="••••••••••••"
                  autoFocus
                />
              </div>
            </div>

            {authError && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-900/50 animate-pulse">
                <Info size={16} />
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-indigo-500 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              Enter Studio <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-600">
              Get Your Access Key — <a href="https://lynk.id/harisratnopambudi/r0v9x81909g3" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-400 transition-colors font-bold underline">Click Here</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- TAMPILAN UTAMA (SETELAH LOGIN) ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-sans selection:bg-indigo-500 selection:text-white flex flex-col transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md sticky top-0 z-10 shadow-sm dark:shadow-lg dark:shadow-black/20 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-lg text-white shadow-md shadow-indigo-500/20">
              <Megaphone size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Nada<span className="text-indigo-500">Suara</span>
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase">Pro Edition</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              System Online
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Logout"
            >
              <Lock size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 w-full">

        {/* Kolom Kiri: Input & Kontrol */}
        <div className="lg:col-span-8 space-y-6">

          {/* Voice Selector */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Sparkles size={14} className="text-indigo-500" /> Voice Character
            </h3>

            <div className="mb-6">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3 block">Marketing & Promo</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {marketingVoices.map((voice) => (
                  <VoiceButton
                    key={voice.id}
                    voice={voice}
                    selected={selectedVoice.id === voice.id}
                    onClick={() => setSelectedVoice(voice)}
                  />
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3 block">Narrative & Story</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {narrativeVoices.map((voice) => (
                  <VoiceButton
                    key={voice.id}
                    voice={voice}
                    selected={selectedVoice.id === voice.id}
                    onClick={() => setSelectedVoice(voice)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Text Input Area */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-1 shadow-sm hover:shadow-md transition-shadow relative group">
            {/* Toolbar Input */}
            <div className="absolute top-3 right-3 z-10 flex gap-2">
              <button
                onClick={handleEnhanceText}
                disabled={isEnhancing || !text.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-indigo-500 text-xs font-semibold hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Enhance with AI"
              >
                {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                AI Polish
              </button>
            </div>

            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder="Enter your script here..."
              className="w-full h-64 bg-slate-800 p-6 rounded-xl text-lg leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-slate-700 text-slate-50 placeholder-slate-600 pt-14 font-mono"
              spellCheck="false"
            />

            <div className="absolute bottom-4 left-6 flex items-center gap-4 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                <Info size={14} />
                <span>Pro Tip: Use commas for natural pauses.</span>
              </div>
            </div>
            <div className={`absolute bottom-4 right-4 text-xs font-medium px-2 py-1 rounded border ${text.length >= 450
              ? 'bg-red-900/20 text-red-400 border-red-900/50'
              : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}>
              {text.length} / 500
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 px-4 py-3 rounded-lg border border-red-900/50 w-full sm:w-auto text-center sm:text-left shadow-sm">
                {error}
              </div>
            )}
            <div className="flex-1"></div>
            <button
              onClick={handleGenerate}
              disabled={isLoading || !text.trim()}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/20 transition-all ${isLoading || !text.trim()
                ? 'bg-slate-700 cursor-not-allowed text-slate-400 shadow-none'
                : 'bg-indigo-500 hover:bg-indigo-600 hover:scale-[1.01] active:scale-[0.99]'
                }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processing...
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  Generate Audio
                </>
              )}
            </button>
          </div>

        </div>

        {/* Kolom Kanan: History / Hasil */}
        <div className="lg:col-span-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 h-full flex flex-col shadow-sm min-h-[500px]">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-700">
              <History className="text-slate-400" size={20} />
              <h2 className="font-semibold text-white">Generation History</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {history.length === 0 ? (
                <div className="text-center text-slate-400 py-12 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-slate-700">
                    <Mic size={24} className="opacity-40" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-slate-200">No audio generated yet.</p>
                    <p className="text-xs max-w-[200px] mx-auto text-slate-500">Your generated voiceovers will appear here.</p>
                  </div>
                </div>
              ) : (
                history.map((item) => (
                  <AudioCard key={item.id} item={item} onDelete={handleDelete} />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-slate-800 border-t border-slate-700 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-400">
            Build by <a href="https://harisratnopambudi.github.io/portfolio/" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-400 font-medium transition-colors">Haris Ratno Pambudi</a>
          </p>
        </div>
      </footer>
    </div>
  );
}