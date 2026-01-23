import React, { useState, useEffect } from 'react';
import { 
  Play, 
  FileText, 
  Info, 
  X, 
  ChevronRight, 
  ShieldAlert,
  Loader2,
  ExternalLink
} from 'lucide-react';

// --- CONFIGURATION ---
// Safely handle process.env for browser environments to prevent "ReferenceError: process is not defined"
const getEnv = (key, fallback) => {
  try {
    return (typeof process !== 'undefined' && process.env && process.env[key]) || fallback;
  } catch (e) {
    return fallback;
  }
};

const SPREADSHEET_ID = getEnv('REACT_APP_SPREADSHEET_ID', '1fpcKuMYWPLjZO0LKDkNf-HS0UwGiY2KAW7GWj_bI9DY');
const API_KEY = getEnv('REACT_APP_API_KEY', 'AIzaSyDzdiDMtiY250DS-lDuZeIZOocw9oqMlhM');
const RANGE = 'Lessons!A2:F100';

const App = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  
  // Watermark Position State
  const [watermarkPos, setWatermarkPos] = useState({ top: '10%', left: '10%' });

  useEffect(() => {
    fetchData();
  }, []);

  // Effect to move watermark randomly every 5 seconds when video is active
  useEffect(() => {
    let interval;
    if (activeVideo) {
      interval = setInterval(() => {
        const top = Math.floor(Math.random() * 80) + 10;
        const left = Math.floor(Math.random() * 70) + 5;
        setWatermarkPos({ top: `${top}%`, left: `${left}%` });
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [activeVideo]);

  const fetchData = async () => {
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(RANGE)}?key=${API_KEY}`;

    try {
      const response = await fetch(sheetsUrl);
      if (!response.ok) throw new Error("API call failed - Check your Vercel Environment Variables");
      const data = await response.json();

      if (data.values && data.values.length > 0) {
        processData(data.values);
      } else {
        throw new Error("No data found in the specified range");
      }
    } catch (err) {
      setError("Cloud sync unavailable. Connection to Google Sheets failed.");
      showDemoData();
    } finally {
      setLoading(false);
    }
  };

  const processData = (rows) => {
    const grouped = {};
    rows.forEach((row, index) => {
      const [courseName, lessonName, partName, _u, link, type] = row;
      if (!courseName) return;

      if (!grouped[courseName]) {
        grouped[courseName] = { name: courseName, lessons: {} };
      }
      if (!grouped[courseName].lessons[lessonName]) {
        grouped[courseName].lessons[lessonName] = [];
      }
      grouped[courseName].lessons[lessonName].push({ 
        part: partName, 
        link, 
        type: type || 'Video', 
        id: index 
      });
    });
    setCourses(Object.values(grouped));
  };

  const showDemoData = () => {
    // Fallback data for testing in Vercel preview environments
    const demoRows = [
      ["Cybersecurity Essentials", "Network Security", "Firewall Fundamentals", "", "https://www.youtube.com/embed/dQw4w9WgXcQ", "Video"],
      ["Advanced Frontend", "React Architecture", "Fiber Engine Deep Dive", "", "https://www.youtube.com/embed/7YhdqIR2Yzo", "Video"]
    ];
    processData(demoRows);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-indigo-500/30 relative overflow-x-hidden">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-900/10 blur-[140px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
              OBSCURA <span className="text-indigo-500">LMS</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium tracking-wide">Secure Digital Intelligence Portal</p>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md px-6 py-4 rounded-3xl flex items-center gap-4 border border-white/5 shadow-2xl">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <Info size={18} />
            </div>
            <div className="text-sm">
              <p className="text-slate-300 font-bold uppercase text-[10px] tracking-widest">System Status</p>
              <p className="text-green-500 font-mono text-[11px]">HYBRID_ENV_ACTIVE</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-8 flex items-center gap-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-200/80 text-sm max-w-2xl mx-auto backdrop-blur-sm">
            <ShieldAlert size={18} />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="relative">
              <Loader2 className="animate-spin text-indigo-500" size={56} strokeWidth={1.5} />
              <div className="absolute inset-0 blur-xl bg-indigo-500/20 animate-pulse" />
            </div>
            <h3 className="text-sm font-black text-slate-500 tracking-[0.4em] uppercase mt-8 animate-pulse">Establishing Link...</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course, idx) => (
              <div 
                key={idx}
                className="group relative bg-slate-900/40 backdrop-blur-md border border-white/5 p-8 rounded-[2.5rem] hover:border-indigo-500/30 hover:bg-slate-900/60 transition-all duration-500 flex flex-col justify-between overflow-hidden shadow-xl"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors" />
                
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40" />
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/10" />
                    </div>
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Archived Curriculum</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-indigo-400 transition-colors tracking-tight">
                    {course.name}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed opacity-70">
                    Proprietary modules and research documentation for {course.name}.
                  </p>
                </div>

                <button 
                  onClick={() => setSelectedCourse(course)}
                  className="mt-10 w-full py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-indigo-600 hover:border-indigo-400 text-white font-bold tracking-widest uppercase text-xs transition-all duration-300 flex items-center justify-center gap-3 group/btn"
                >
                  Access Files
                  <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Course Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#020617]/95 backdrop-blur-md" onClick={() => setSelectedCourse(null)} />
          
          <div className="relative bg-[#0f172a] border border-white/10 rounded-[3rem] w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="h-32 bg-gradient-to-r from-indigo-900/20 via-slate-900 to-transparent p-10 flex items-end justify-between relative">
               <button 
                onClick={() => setSelectedCourse(null)}
                className="absolute top-8 right-8 p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-xl text-slate-400 transition-all border border-white/5"
              >
                <X size={20} />
              </button>
              <div>
                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Subject Decryption</p>
                <h2 className="text-3xl font-black text-white tracking-tighter">{selectedCourse.name}</h2>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-10 space-y-12 scrollbar-none">
              {Object.entries(selectedCourse.lessons).map(([lessonName, parts], lIdx) => (
                <div key={lIdx} className="relative pl-10 border-l border-white/5">
                  <div className="absolute top-0 -left-[13px] w-6 h-6 rounded-full bg-slate-900 border-2 border-indigo-500/40" />
                  <h4 className="text-lg font-bold text-white/90 mb-6 flex items-center gap-3">
                    {lessonName}
                    <span className="h-px flex-grow bg-white/5" />
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {parts.map((item, pIdx) => {
                      const isPdf = item.type?.toUpperCase().includes('PDF');
                      return (
                        <button
                          key={pIdx}
                          onClick={() => {
                            if (isPdf) window.open(item.link, '_blank', 'noopener,noreferrer');
                            else setActiveVideo(item);
                          }}
                          className={`group flex items-center justify-between p-5 rounded-2xl border transition-all text-left ${
                            isPdf 
                              ? 'bg-purple-500/5 border-purple-500/10 hover:border-purple-500/30' 
                              : 'bg-indigo-500/5 border-indigo-500/10 hover:border-indigo-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                              isPdf ? 'bg-purple-500/10 text-purple-400' : 'bg-indigo-500/10 text-indigo-400'
                            }`}>
                              {isPdf ? <FileText size={20} /> : <Play size={20} fill="currentColor" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{item.part}</p>
                              <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mt-1">{item.type || 'Video'}</p>
                            </div>
                          </div>
                          <ExternalLink size={14} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-xl">
          <div className="w-full max-w-6xl aspect-video relative group px-4">
            
            <div className="absolute top-[-60px] left-0 right-0 flex justify-between items-center px-4">
              <div>
                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em] mb-1">Secure Stream Active</p>
                <h2 className="text-xl font-bold text-white">{activeVideo.part}</h2>
              </div>
              <button 
                onClick={() => setActiveVideo(null)}
                className="p-3 bg-white/10 hover:bg-red-500/40 rounded-full text-white transition-all backdrop-blur-md border border-white/5"
              >
                <X size={24} />
              </button>
            </div>

            <div className="w-full h-full bg-slate-900 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.15)] border border-white/10 relative">
              
              {/* Movable Watermark */}
              <div 
                className="absolute z-10 pointer-events-none transition-all duration-1000 ease-in-out opacity-20 select-none whitespace-nowrap"
                style={{ top: watermarkPos.top, left: watermarkPos.left }}
              >
                <div className="flex flex-col items-center">
                  <p className="text-white font-mono text-[10px] tracking-widest uppercase">Obscura Security Asset</p>
                  <p className="text-indigo-400 font-mono text-[8px] uppercase">VERCEL_NODE_ID: {Math.random().toString(36).substr(2, 9)}</p>
                </div>
              </div>

              {/* Iframe Video Player */}
              <iframe 
                width="100%" 
                height="100%" 
                src={activeVideo.link} 
                frameBorder="0" 
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture" 
                allowFullScreen
                className="w-full h-full"
                title={activeVideo.part}
                loading="lazy"
              />
            </div>

            <div className="mt-6 flex items-center justify-between px-4 opacity-40">
               <div className="flex items-center gap-4 text-xs font-mono text-indigo-400 uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  Remote Decryption Successful
               </div>
               <p className="hidden md:block text-[10px] text-slate-500 uppercase tracking-[0.2em]">Asset protection enabled • Moving watermark active</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
