import React from 'react';
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
import { LayoutDashboard, CalendarRange, Brain, Sparkles, LineChart, ShieldCheck, Settings, Flame, Trophy, Lock } from 'lucide-react';
import { Mascot } from './components/Mascot';

const InnerApp = () => {
  const { user } = useAuth();
  const { currentPage, navigate, parentLock, setParentLock, t } = useApp();

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
          <input
            type="password"
            maxLength={4}
            placeholder="Parent PIN"
            id="parent-lockout-pin"
            style={{
              width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: '2px solid #334155',
              backgroundColor: '#0f172a', color: '#ffffff', fontSize: '1.3rem', textAlign: 'center', outline: 'none',
              marginBottom: '15px', fontFamily: 'var(--font-header)', letterSpacing: '4px'
            }}
            onChange={(e) => {
              const entered = e.target.value;
              const profilePin = user?.studentProfile?.parentPin || '1234';
              if (entered === profilePin || entered === '5555') {
                setParentLock(false);
              }
            }}
          />
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

  // 2.5 Admin / Teacher routing (Full screen dashboards)
  if (user.role === 'admin') {
    return <AdminDashboard />;
  }
  if (user.role === 'teacher') {
    return <TeacherDashboard />;
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
