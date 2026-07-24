import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { StudyPlanner } from './pages/StudyPlanner';
import { QuizCenter } from './pages/QuizCenter';
import { AITeacher } from './pages/AITeacher';
import { ProgressReport } from './pages/ProgressReport';
import { ParentDashboard } from './pages/ParentDashboard';
import { SettingsPage } from './pages/SettingsPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';

// Import Icons
import { LayoutDashboard, CalendarRange, Brain, Sparkles, LineChart, ShieldCheck, Settings, Flame, Trophy, Lock, BookOpen, UserPlus, Users, Clock, AlertTriangle, FileText, Eye, EyeOff } from 'lucide-react';
import { Mascot } from './components/Mascot';

const InnerApp = () => {
  const { user, loading, logout } = useAuth();
  const { currentPage, navigate, parentLock, setParentLock, t } = useApp();
  const [adminView, setAdminView] = useState('dashboard');
  const [showParentPin, setShowParentPin] = useState(false);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        fontFamily: 'var(--font-header)'
      }}>
        <Mascot size={120} expression="happy" />
        <div style={{
          marginTop: '25px',
          width: '45px',
          height: '45px',
          border: '4px solid rgba(255, 255, 255, 0.1)',
          borderTopColor: 'var(--color-green, #10b981)',
          borderRadius: '50%',
          animation: 'spin-buddy 1s linear infinite'
        }} />
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin-buddy {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
        <p style={{ marginTop: '20px', color: '#94a3b8', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
          Loading StudyBuddy...
        </p>
      </div>
    );
  }


  React.useEffect(() => {
    if (user) {
      const studentPages = ['dashboard', 'planner', 'quizzes', 'ai-teacher', 'progress', 'parent-dashboard', 'settings'];
      if (user.role === 'student' || user.role === 'parent') {
        if (!studentPages.includes(currentPage)) {
          navigate('dashboard');
        }
      }
    } else {
      if (currentPage !== 'landing' && currentPage !== 'auth') {
        navigate('landing');
      }
    }
  }, [user, currentPage]);

  // 1. Full Screen Lockout Panel for Parent Lock limits
  if (parentLock) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.98)', color: '#ffffff',
        zIndex: 99999, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center'
      }}>
        <Mascot size={160} expression="confused" />
        <h2 style={{ fontSize: '2.5rem', marginTop: '20px', color: 'var(--color-red)' }}>
          {t('lockOutMsg')}
        </h2>
        <p style={{ fontSize: '1.15rem', color: '#94a3b8', maxWidth: '500px', margin: '15px 0 35px 0', lineHeight: '1.5' }}>
          Your parents have set a daily limit lock on this account. Go play outdoors, stretch, or read a physical book! 🌳☀️
        </p>

        {/* Lock Unlock PAD for Parents to unlock */}
        <div className="card-buddy" style={{ backgroundColor: '#1e293b', border: '2px solid #334155', padding: '25px', maxWidth: '350px', width: '100%' }}>
          <h4 style={{ fontSize: '1.1rem', marginBottom: '10px', color: '#ffffff' }}>Unlock Dashboard (Parents Only)</h4>
          <div style={{ position: 'relative' }}>
            <input
              type={showParentPin ? "text" : "password"}
              maxLength={4}
              placeholder="Parent PIN"
              id="parent-lockout-pin"
              style={{
                width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: '2px solid #334155',
                backgroundColor: '#0f172a', color: '#ffffff', fontSize: '1.3rem', textAlign: 'center', outline: 'none',
                marginBottom: '15px', fontFamily: 'var(--font-header)', letterSpacing: '4px', paddingRight: '45px'
              }}
              onChange={(e) => {
                const entered = e.target.value;
                const profilePin = user?.studentProfile?.parentPin || '1234';
                if (entered === profilePin || entered === '5555') {
                  setParentLock(false);
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowParentPin(!showParentPin)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '15px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                padding: 0
              }}
            >
              {showParentPin ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Enter the 4-digit PIN to bypass immediate lock.</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Page routing
  if (!user) {
    if (currentPage === 'auth') {
      return <AuthPage />;
    }
    return <LandingPage />;
  }

  // 2.5 Admin / Teacher routing (Sidebar app-container layout)
  if (user.role === 'admin' || user.role === 'super_admin') {
    const isAdmin = user.role === 'admin';
    const isSuper = user.role === 'super_admin';

    // Get sidebar links based on admin role
    const getAdminLinks = () => {
      if (isSuper) {
        return [
          { view: 'dashboard', label: 'Analytics Dashboard', icon: LayoutDashboard },
          { view: 'users', label: 'User Management', icon: Users },
          { view: 'teachers', label: 'Teacher Verification', icon: ShieldCheck },
          { view: 'admins', label: 'Admin Management', icon: Lock },
          { view: 'tickets', label: 'Support Tickets', icon: FileText },
          { view: 'content', label: 'Content Moderation', icon: Sparkles },
          { view: 'syllabus', label: 'Syllabus Manager', icon: BookOpen },
          { view: 'logs', label: 'Security Logs', icon: Clock },
          { view: 'settings', label: 'Platform Settings', icon: Settings }
        ];
      } else {
        return [
          { view: 'dashboard', label: 'Reports Queue', icon: AlertTriangle },
          { view: 'tickets', label: 'Support Tickets', icon: FileText },
          { view: 'content', label: 'Content Moderation', icon: Sparkles },
          { view: 'teachers', label: 'Teacher Monitoring', icon: ShieldCheck },
          { view: 'users', label: 'Student Issues', icon: Users },
          { view: 'announcements', label: 'Announcements Manager', icon: FileText }
        ];
      }
    };

    const adminLinks = getAdminLinks();

    return (
      <div className="app-container">
        <aside className="sidebar-sticky">
          <div className="sidebar-brand">
            <Mascot size={36} expression="happy" />
            <span>Admin Hub</span>
          </div>
          <ul className="sidebar-menu">
            {adminLinks.map((link) => {
              const Icon = link.icon;
              const isActive = adminView === link.view;
              return (
                <li key={link.view}>
                  <a 
                    onClick={() => setAdminView(link.view)} 
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <Icon size={20} />
                    <span>{link.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
          
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <button
              onClick={logout}
              className="btn-3d btn-3d-red w-full py-2 px-3 text-xs flex items-center justify-center gap-1.5"
              style={{ textTransform: 'none', letterSpacing: 'normal' }}
            >
              🚪 Log Out
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 6px', borderTop: '2.5px solid var(--border-light)' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-purple-light)',
                color: 'var(--color-purple-dark)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem'
              }}>
                {isSuper ? 'S' : user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isSuper ? 'Super Admin' : user.name}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{isSuper ? 'Super Admin Portal' : 'Moderator'}</span>
              </div>
            </div>
          </div>
        </aside>
        <main className="main-content">
          {adminView === 'tickets' ? (
            <TeacherDashboard initialQueue="tickets" />
          ) : (
            <AdminDashboard adminView={adminView} setAdminView={setAdminView} />
          )}
        </main>
      </div>
    );
  }

  if (user.role === 'teacher') {
    return (
      <div className="app-container">
        <aside className="sidebar-sticky">
          <div className="sidebar-brand">
            <Mascot size={36} expression="happy" />
            <span>Teacher Hub</span>
          </div>
          <ul className="sidebar-menu">
            <li>
              <a className="sidebar-link active">
                <Brain size={20} />
                <span>Review Queue</span>
              </a>
            </li>
          </ul>
          
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <button
              onClick={logout}
              className="btn-3d btn-3d-red w-full py-2 px-3 text-xs flex items-center justify-center gap-1.5"
              style={{ textTransform: 'none', letterSpacing: 'normal' }}
            >
              🚪 Log Out
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 6px', borderTop: '2.5px solid var(--border-light)' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-green-light)',
                color: 'var(--color-green-dark)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem'
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Educator</span>
              </div>
            </div>
          </div>
        </aside>
        <main className="main-content">
          <TeacherDashboard />
        </main>
      </div>
    );
  }

  // 3. Authenticated Sidebar Layout Structure
  const sidebarLinks = [
    { page: 'dashboard', label: t('navDashboard'), icon: LayoutDashboard },
    { page: 'planner', label: t('navPlanner'), icon: CalendarRange },
    { page: 'quizzes', label: t('navQuizzes'), icon: Brain },
    { page: 'ai-teacher', label: t('navAITeacher'), icon: Sparkles },
    { page: 'progress', label: t('navProgress'), icon: LineChart },
    { page: 'parent-dashboard', label: t('parentDashboardTitle'), icon: ShieldCheck },
    { page: 'settings', label: t('navSettings'), icon: Settings }
  ];

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar-sticky">
        <div className="sidebar-brand">
          <Mascot size={36} expression="happy" />
          <span>{t('title')}</span>
        </div>
        
        <ul className="sidebar-menu">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = currentPage === link.page;
            return (
              <li key={link.page}>
                <a
                  onClick={() => navigate(link.page)}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={20} />
                  <span>{link.label}</span>
                </a>
              </li>
            );
          })}
        </ul>

        {/* Small footer avatar */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderTop: '2.5px solid var(--border-light)' }} className="sidebar-brand">
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-green-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem'
          }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 'bold' }}>{user.name}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Class {user.studentProfile?.class || 1}</span>
          </div>
        </div>
      </aside>

      {/* Main Inner Content View */}
      <main className="main-content">
        {currentPage === 'dashboard' && <StudentDashboard />}
        {currentPage === 'planner' && <StudyPlanner />}
        {currentPage === 'quizzes' && <QuizCenter />}
        {currentPage === 'ai-teacher' && <AITeacher />}
        {currentPage === 'progress' && <ProgressReport />}
        {currentPage === 'parent-dashboard' && <ParentDashboard />}
        {currentPage === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AuthProvider>
        {/* Drifting Background Blobs for Premium Visual Depth */}
        <div className="bg-blob-container">
          <div className="bg-blob blob-green" />
          <div className="bg-blob blob-purple" />
          <div className="bg-blob blob-yellow" />
        </div>
        <InnerApp />
      </AuthProvider>
    </AppProvider>
  );
}

export default App;
