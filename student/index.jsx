import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  PlayCircle, 
  FileText, 
  LogOut, 
  Home, 
  Smartphone,
  Loader2,
  ShieldCheck
} from 'lucide-react';

// --- SUPABASE INITIALIZATION ---
// We use the UMD build for compatibility with the preview environment's module system
const supabaseUrl = 'https://qqkbsjrwgcafxjxwgbct.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxa2JzanJ3Z2NhZnhqeHdnYmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTMxOTcsImV4cCI6MjA3MjEyOTE5N30.XfWAPBgTbT12TIFf_wsdOPkt6cLQE-SsEYYXc8fuXxY';

let supabaseClient = null;

// --- WATERMARK COMPONENT ---
const Watermark = ({ phone }) => {
  const [pos, setPos] = useState({ top: '20%', left: '20%' });

  useEffect(() => {
    const move = () => {
      setPos({ 
        top: `${Math.floor(Math.random() * 70) + 10}%`, 
        left: `${Math.floor(Math.random() * 70) + 10}%` 
      });
    };
    const interval = setInterval(move, 12000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="fixed z-[9999] pointer-events-none text-white/30 font-black text-sm select-none mix-blend-difference transition-all duration-1000"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="flex items-center gap-1 bg-black/10 px-2 py-1 rounded tracking-widest uppercase">
        <Smartphone size={12} /> {phone}
      </div>
    </div>
  );
};

// --- VIDEO PLAYER COMPONENT ---
const SecureVideoPlayer = ({ videoId, phone }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    document.addEventListener('contextmenu', prevent);
    return () => document.removeEventListener('contextmenu', prevent);
  }, []);

  return (
    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900 z-10">
          <Loader2 className="animate-spin mb-2" />
          <p className="text-xs font-bold uppercase tracking-widest opacity-50">Encrypting Stream...</p>
        </div>
      )}
      <iframe
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0`}
        frameBorder="0"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={() => setLoading(false)}
      ></iframe>
      <Watermark phone={phone} />
    </div>
  );
};

// --- MAIN STUDENT APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [sdkReady, setSdkReady] = useState(false);

  // Initialize Supabase via script tag for environment compatibility
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.async = true;
    script.onload = () => {
      if (window.supabase) {
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
        setSdkReady(true);
      }
    };
    document.head.appendChild(script);
    return () => document.head.removeChild(script);
  }, []);

  useEffect(() => {
    if (!sdkReady || !supabaseClient) return;

    // Check active session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user.id);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [sdkReady]);

  const fetchUserData = async (userId) => {
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) setUserData(data);
  };

  useEffect(() => {
    if (!user || !supabaseClient) return;
    
    const fetchCourses = async () => {
      const { data, error } = await supabaseClient
        .from('courses')
        .select('*');
      
      if (data) setCourses(data);
    };

    fetchCourses();

    // Realtime subscription for course updates
    const channel = supabaseClient
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, fetchCourses)
      .subscribe();

    return () => supabaseClient.removeChannel(channel);
  }, [user, sdkReady]);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!supabaseClient) return;
    setError('');
    const fd = new FormData(e.target);
    const email = fd.get('email');
    const password = fd.get('password');

    try {
      if (authMode === 'register') {
        const { data, error: signUpError } = await supabaseClient.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          const { error: profileError } = await supabaseClient
            .from('profiles')
            .insert({
              id: data.user.id,
              full_name: fd.get('fullName'),
              phone: fd.get('phone'),
              email: email,
              role: 'student'
            });
          
          if (profileError) throw profileError;
        }
      } else {
        const { error: signInError } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) { 
      setError(err.message); 
    }
  };

  const handleSignOut = async () => {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
      setUser(null);
      setUserData(null);
    }
  };

  const getYTId = (url) => {
    const match = url?.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (!sdkReady || loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-slate-500 font-medium animate-pulse text-sm uppercase tracking-widest">Initializing Core Sdk...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-600 p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-3xl font-black text-center mb-8 italic tracking-tighter">PHYSICS LMS</h1>
          <form onSubmit={handleAuth} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold">{error}</div>}
            {authMode === 'register' && (
              <>
                <input name="fullName" placeholder="Full Name" required className="w-full p-3 bg-slate-50 border rounded-xl" />
                <input name="phone" placeholder="Phone (07XXXXXXXX)" required className="w-full p-3 bg-slate-50 border rounded-xl" />
              </>
            )}
            <input name="email" type="email" placeholder="Email" required className="w-full p-3 bg-slate-50 border rounded-xl" />
            <input name="password" type="password" placeholder="Password" required className="w-full p-3 bg-slate-50 border rounded-xl" />
            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl">
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
            <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full text-sm text-slate-500 hover:underline">
              {authMode === 'login' ? 'Need account? Register' : 'Have account? Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <BookOpen className="text-blue-600" />
          <span className="font-black text-lg">Quantum LMS</span>
        </div>
        <button onClick={handleSignOut} className="text-slate-400 hover:text-red-500 transition-colors">
          <LogOut size={20} />
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="hidden md:flex w-20 bg-white border-r flex-col items-center py-8 space-y-6">
          <button onClick={() => { setActiveTab('browse'); setSelectedCourse(null); }} className={`p-3 rounded-2xl ${activeTab === 'browse' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>
            <Home size={24} />
          </button>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          {!selectedCourse ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map(course => (
                <div key={course.id} onClick={() => setSelectedCourse(course)} className="bg-white rounded-3xl overflow-hidden border shadow-sm hover:shadow-xl cursor-pointer">
                  <img src={course.thumbnail} className="w-full h-48 object-cover" />
                  <div className="p-6">
                    <h4 className="font-bold text-lg">{course.title}</h4>
                    <p className="text-slate-500 text-sm mt-2 line-clamp-2">{course.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-6">
              <button onClick={() => { setSelectedCourse(null); setSelectedLesson(null); }} className="text-slate-500 font-bold">&larr; Dashboard</button>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8">
                  {selectedLesson ? (
                    <div className="space-y-6">
                      <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between">
                        <h2 className="font-bold">{selectedLesson.title}</h2>
                        <div className="flex items-center gap-2 text-green-500 text-xs font-bold uppercase"><ShieldCheck size={16}/> Secure</div>
                      </div>
                      {selectedLesson.type === 'video' && <SecureVideoPlayer videoId={getYTId(selectedLesson.content)} phone={userData?.phone || 'PRIVATE'} />}
                      {selectedLesson.type === 'pdf' && (
                        <div className="bg-slate-200 aspect-[1/1.4] rounded-2xl flex flex-col items-center justify-center p-10 relative overflow-hidden">
                          <FileText size={48} className="mb-4 text-slate-400" />
                          <a href={selectedLesson.content} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">View Document</a>
                          <Watermark phone={userData?.phone || 'PRIVATE'} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white p-12 rounded-3xl text-center border">
                      <h2 className="text-3xl font-black">{selectedCourse.title}</h2>
                      <p className="mt-4 text-slate-500">{selectedCourse.description}</p>
                    </div>
                  )}
                </div>
                <div className="lg:col-span-4 bg-white rounded-3xl border h-fit">
                  <div className="p-6 border-b font-bold">Curriculum</div>
                  <div className="p-2 space-y-1">
                    {selectedCourse.lessons?.map((l, i) => (
                      <button key={l.id || i} onClick={() => setSelectedLesson(l)} className={`w-full text-left p-4 rounded-2xl flex items-center gap-4 ${selectedLesson?.id === l.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-50'}`}>
                        <div className="shrink-0">{l.type === 'video' ? <PlayCircle size={18}/> : <FileText size={18}/>}</div>
                        <div className="text-sm font-bold truncate">{l.title}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
