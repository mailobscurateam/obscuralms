import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Plus, 
  LogOut, 
  Trash2, 
  Loader2
} from 'lucide-react';

// --- CONFIGURATION ---
// These match your Supabase setup
const supabaseUrl = 'https://qqkbsjrwgcafxjxwgbct.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxa2JzanJ3Z2NhZnhqeHdnYmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTMxOTcsImV4cCI6MjA3MjEyOTE5N30.XfWAPBgTbT12TIFf_wsdOPkt6cLQE-SsEYYXc8fuXxY';

let supabaseClient = null;

// --- COMPONENTS ---
const Skeleton = () => (
  <div className="animate-pulse flex space-x-4 p-4">
    <div className="rounded-full bg-slate-200 h-10 w-10"></div>
    <div className="flex-1 space-y-6 py-1">
      <div className="h-2 bg-slate-200 rounded"></div>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-4">
          <div className="h-2 bg-slate-200 rounded col-span-2"></div>
          <div className="h-2 bg-slate-200 rounded col-span-1"></div>
        </div>
        <div className="h-2 bg-slate-200 rounded"></div>
      </div>
    </div>
  </div>
);

// --- MAIN ADMIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authMode, setAuthMode] = useState('login');
  const [error, setError] = useState('');
  const [sdkReady, setSdkReady] = useState(false);
  
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);

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
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [sdkReady]);

  // Data Fetching
  useEffect(() => {
    if (!user || !supabaseClient) return;

    const fetchData = async () => {
      // Fetch Courses
      const { data: courseData } = await supabaseClient.from('courses').select('*');
      if (courseData) setCourses(courseData);

      // Fetch Students
      const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('role', 'student');
      if (profileData) setStudents(profileData);
    };

    fetchData();

    // Subscribe to realtime changes
    const channel = supabaseClient
      .channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchData)
      .subscribe();

    return () => supabaseClient.removeChannel(channel);
  }, [user, sdkReady]);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!supabaseClient) return;
    setError('');
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      if (authMode === 'register') {
        const { data, error: signUpError } = await supabaseClient.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        
        if (data.user) {
          await supabaseClient.from('profiles').insert({
            id: data.user.id,
            email,
            role: 'admin'
          });
        }
      } else {
        const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        // Check if admin
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
          
        if (!profile || profile.role !== 'admin') {
          await supabaseClient.auth.signOut();
          throw new Error("Access denied. Admin role required.");
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const addCourse = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newCourse = {
      title: formData.get('title'),
      description: formData.get('description'),
      price: parseFloat(formData.get('price') || '0'),
      thumbnail: formData.get('thumbnail') || 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=800',
      lessons: []
    };
    
    await supabaseClient.from('courses').insert(newCourse);
    setActiveTab('courses');
  };

  const addLesson = async (courseId, e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const lesson = {
      id: crypto.randomUUID(),
      title: formData.get('title'),
      type: formData.get('type'),
      content: formData.get('content'),
      created_at: new Date().toISOString()
    };
    
    const course = courses.find(c => c.id === courseId);
    const updatedLessons = [...(course.lessons || []), lesson];
    
    await supabaseClient
      .from('courses')
      .update({ lessons: updatedLessons })
      .eq('id', courseId);
      
    setSelectedCourse(prev => ({ ...prev, lessons: updatedLessons }));
    e.target.reset();
  };

  const deleteCourse = async (id) => {
    if (window.confirm("Delete this course permanently?")) {
      await supabaseClient.from('courses').delete().eq('id', id);
    }
  };

  if (!sdkReady || loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8 text-center bg-blue-600 text-white">
            <h1 className="text-3xl font-bold italic tracking-tighter">PHYSICS ADMIN</h1>
          </div>
          <form onSubmit={handleAuth} className="p-8 space-y-4">
            {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input name="email" type="email" required className="mt-1 w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input name="password" type="password" required className="mt-1 w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg">
              {authMode === 'login' ? 'Login' : 'Register'}
            </button>
            <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full text-slate-500 text-sm hover:underline">
              {authMode === 'login' ? "Need account? Register" : "Have account? Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full lg:static z-40">
        <div className="p-6 text-white border-b border-slate-800 flex items-center gap-3">
          <BookOpen className="text-blue-500" />
          <span className="font-bold text-xl">LMS Admin</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => { setActiveTab('dashboard'); setSelectedCourse(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => { setActiveTab('courses'); setSelectedCourse(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === 'courses' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
            <BookOpen size={20} /> Courses
          </button>
          <button onClick={() => { setActiveTab('students'); setSelectedCourse(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === 'students' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
            <Users size={20} /> Students
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={() => supabaseClient.auth.signOut()} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <p className="text-slate-500 text-sm">Courses</p>
              <h3 className="text-3xl font-bold">{courses.length}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <p className="text-slate-500 text-sm">Students</p>
              <h3 className="text-3xl font-bold">{students.length}</h3>
            </div>
          </div>
        )}

        {activeTab === 'courses' && !selectedCourse && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Course Management</h2>
              <button onClick={() => setActiveTab('add_course')} className="bg-blue-600 text-white px-5 py-2 rounded-xl flex items-center gap-2 font-bold">
                <Plus size={20} /> New Course
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {courses.map(course => (
                <div key={course.id} className="bg-white rounded-2xl overflow-hidden border shadow-sm">
                  <img src={course.thumbnail} className="w-full h-40 object-cover" alt="" />
                  <div className="p-5">
                    <h3 className="font-bold text-lg">{course.title}</h3>
                    <div className="mt-4 flex justify-between items-center">
                      <button onClick={() => setSelectedCourse(course)} className="text-blue-600 font-bold text-sm">Manage Lessons</button>
                      <button onClick={() => deleteCourse(course.id)} className="text-red-500"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'add_course' && (
          <div className="max-w-xl bg-white p-8 rounded-2xl border shadow-sm">
            <h3 className="text-xl font-bold mb-6">Create Course</h3>
            <form onSubmit={addCourse} className="space-y-4">
              <input name="title" placeholder="Title" required className="w-full p-3 border rounded-xl" />
              <input name="price" placeholder="Price" type="number" required className="w-full p-3 border rounded-xl" />
              <input name="thumbnail" placeholder="Thumbnail URL" className="w-full p-3 border rounded-xl" />
              <textarea name="description" placeholder="Description" className="w-full p-3 border rounded-xl"></textarea>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl">Create</button>
            </form>
          </div>
        )}

        {selectedCourse && (
          <div className="space-y-6">
            <button onClick={() => setSelectedCourse(null)} className="text-blue-600 font-bold">&larr; Back</button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h4 className="font-bold mb-4">Lessons</h4>
                {selectedCourse.lessons?.map((l, i) => (
                  <div key={l.id} className="p-3 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">{i+1}</span>
                      <p className="font-medium">{l.title}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h4 className="font-bold mb-4">Add Lesson</h4>
                <form onSubmit={(e) => addLesson(selectedCourse.id, e)} className="space-y-4">
                  <input name="title" placeholder="Lesson Title" required className="w-full p-3 border rounded-xl" />
                  <select name="type" className="w-full p-3 border rounded-xl">
                    <option value="video">Video</option>
                    <option value="pdf">PDF</option>
                  </select>
                  <input name="content" placeholder="URL/Link" required className="w-full p-3 border rounded-xl" />
                  <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl">Add</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Email</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} className="border-t">
                    <td className="px-6 py-4">{s.full_name}</td>
                    <td className="px-6 py-4">{s.phone}</td>
                    <td className="px-6 py-4">{s.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
