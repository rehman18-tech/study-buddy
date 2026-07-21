import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Mascot } from '../components/Mascot';
import { Settings, Globe, Moon, Sun, Trees, Sparkles, BookOpen, Eye, EyeOff } from 'lucide-react';

export const SettingsPage = () => {
  const { theme, setTheme, language, setLanguage, t, triggerNotification } = useApp();
  const { user, logout, updateProfile, setUser } = useAuth();

  // Edit states
  const [editName, setEditName] = useState(user?.name || '');
  const [editClass, setEditClass] = useState(user?.studentProfile?.class || '6');
  const [editBoard, setEditBoard] = useState(user?.studentProfile?.board || 'SSC');
  const [editSchoolType, setEditSchoolType] = useState(user?.studentProfile?.schoolType || 'Public');
  const [editPin, setEditPin] = useState(user?.studentProfile?.parentPin || '1234');
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleLanguageChange = async (langCode) => {
    setLanguage(langCode);
    const dbLang = langCode === 'hi' ? 'Hindi' : langCode === 'te' ? 'Telugu' : 'English';
    try {
      await updateProfile({ preferredLanguage: dbLang });
    } catch (err) {
      if (user && user.studentProfile) {
        setUser({
          ...user,
          studentProfile: {
            ...user.studentProfile,
            preferredLanguage: dbLang
          }
        });
      }
    }
    let msg = '🌐 Language updated!';
    if (langCode === 'en') msg = '🌐 Language updated to English!';
    if (langCode === 'hi') msg = '🌐 भाषा बदलकर हिंदी की गई!';
    if (langCode === 'te') msg = '🌐 భాష తెలుగులోకి మార్చబడింది!';
    triggerNotification(msg, 'purple');
  };

  const handleThemeChange = (themeName) => {
    setTheme(themeName);
    triggerNotification(`🎨 Theme changed to ${themeName.charAt(0).toUpperCase() + themeName.slice(1)}!`);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        name: editName,
        studentClass: Number(editClass),
        board: editBoard,
        schoolType: editSchoolType,
        parentPin: editPin
      });
      triggerNotification('💾 Profile changes synchronized successfully!', 'green');
    } catch (err) {
      console.error(err);
      // Demo mode fallback
      if (user) {
        setUser({
          ...user,
          name: editName,
          studentProfile: {
            ...user.studentProfile,
            class: Number(editClass),
            board: editBoard,
            schoolType: editSchoolType,
            parentPin: editPin
          }
        });
        triggerNotification('💾 Profile changes saved locally!');
      }
    } finally {
      setSaving(false);
    }
  };

  const currentClass = user?.studentProfile?.class || 1;
  const currentBoard = user?.studentProfile?.board || 'SSC';

  return (
    <div className="settings-grid">
      
      {/* Left Column: Language and Theme configurations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Language Selection Card */}
        <section className="card-buddy">
          <h3 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={22} color="var(--color-green)" /> {t('settingsLanguage')}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`btn-3d ${language === 'en' ? 'btn-3d-green' : 'btn-3d-light'}`}
              style={{ padding: '12px 10px', fontSize: '0.9rem' }}
            >
              🇺🇸 English
            </button>
            <button
              onClick={() => handleLanguageChange('hi')}
              className={`btn-3d ${language === 'hi' ? 'btn-3d-green' : 'btn-3d-light'}`}
              style={{ padding: '12px 10px', fontSize: '0.9rem' }}
            >
              🇮🇳 हिंदी (Hindi)
            </button>
            <button
              onClick={() => handleLanguageChange('te')}
              className={`btn-3d ${language === 'te' ? 'btn-3d-green' : 'btn-3d-light'}`}
              style={{ padding: '12px 10px', fontSize: '0.9rem' }}
            >
              🇮🇳 తెలుగు (Telugu)
            </button>
          </div>
        </section>

        {/* Theme Customizer Card */}
        <section className="card-buddy">
          <h3 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={22} color="var(--color-purple)" /> {t('settingsTheme')}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {/* Light */}
            <button
              onClick={() => handleThemeChange('light')}
              style={{
                padding: '20px 10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)',
                backgroundColor: '#ffffff', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '8px', fontWeight: 'bold', fontFamily: 'var(--font-header)',
                color: theme === 'light' ? 'var(--color-purple)' : '#2b303b',
                borderColor: theme === 'light' ? 'var(--color-purple)' : 'var(--border-light)',
                transition: 'all 0.2s ease'
              }}
            >
              <Sun size={24} color="#ff9800" />
              <span>Light Mode</span>
            </button>

            {/* Dark */}
            <button
              onClick={() => handleThemeChange('dark')}
              style={{
                padding: '20px 10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)',
                backgroundColor: '#1e293b', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '8px', fontWeight: 'bold', fontFamily: 'var(--font-header)',
                color: '#ffffff',
                borderColor: theme === 'dark' ? 'var(--color-purple)' : '#334155',
                transition: 'all 0.2s ease'
              }}
            >
              <Moon size={24} color="#ffd54f" />
              <span>Slate Dark</span>
            </button>

            {/* Forest */}
            <button
              onClick={() => handleThemeChange('forest')}
              style={{
                padding: '20px 10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)',
                backgroundColor: '#eef1ec', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '8px', fontWeight: 'bold', fontFamily: 'var(--font-header)',
                color: '#1f2b1d',
                borderColor: theme === 'forest' ? 'var(--color-purple)' : '#d4ded1',
                transition: 'all 0.2s ease'
              }}
            >
              <Trees size={24} color="#4caf50" />
              <span>Forest Earth</span>
            </button>
          </div>
        </section>

        {/* Profile Editing Form Card */}
        {user?.role === 'student' && (
          <section className="card-buddy">
            <h3 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={22} color="var(--color-blue)" /> Edit Student Metrics
            </h3>
            
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>
                  Student Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)',
                    fontSize: '0.95rem', outline: 'none'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>
                    Class / Grade
                  </label>
                  <select
                    value={editClass}
                    onChange={(e) => setEditClass(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)',
                      fontSize: '0.95rem', outline: 'none', cursor: 'pointer', fontWeight: 'bold'
                    }}
                  >
                    {[6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num}>Class {num}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>
                    Board
                  </label>
                  <select
                    value={editBoard}
                    onChange={(e) => setEditBoard(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)',
                      fontSize: '0.95rem', outline: 'none', cursor: 'pointer', fontWeight: 'bold'
                    }}
                  >
                    <option value="SSC">SSC (State Board)</option>
                    <option value="CBSE">CBSE</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>
                    School Type
                  </label>
                  <select
                    value={editSchoolType}
                    onChange={(e) => setEditSchoolType(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)',
                      fontSize: '0.95rem', outline: 'none', cursor: 'pointer'
                    }}
                  >
                    <option value="Public">Public</option>
                    <option value="Private">Private</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>
                    Parent PIN
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPin ? "text" : "password"}
                      maxLength={4}
                      value={editPin}
                      onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ''))}
                      style={{
                        width: '100%', padding: '10px 12px', paddingRight: '45px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)',
                        fontSize: '0.95rem', outline: 'none', textAlign: 'center', fontWeight: 'bold'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '11px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0
                      }}
                    >
                      {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-3d btn-3d-blue" style={{ width: '100%', marginTop: '10px', padding: '12px' }} disabled={saving}>
                {saving ? 'Saving...' : '💾 Save Profile Changes'}
              </button>
            </form>
          </section>
        )}

      </div>

      {/* Right Column: User Profile details & habit suggestions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Profile statistics */}
        <section className="card-buddy">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <Mascot size={70} expression="happy" />
            <div style={{ textAlign: 'left' }}>
              <h4 style={{ fontSize: '1.25rem' }}>{user?.name || 'Buddy Learner'}</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>
                Class {currentClass} student • {currentBoard} Board
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Account Role:</span>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{user?.role?.toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>School Type:</span>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{user?.studentProfile?.schoolType || 'Public'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', marginBottom: '15px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Registered Email:</span>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{user?.email}</span>
            </div>
          </div>

          <button onClick={logout} className="btn-3d btn-3d-red" style={{ width: '100%', padding: '12px' }}>
            {t('logout')}
          </button>
        </section>

        {/* Pedagogical habit suggestions */}
        <section className="card-buddy" style={{ backgroundColor: 'var(--color-purple-light)', borderColor: 'var(--color-purple)' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--color-purple-dark)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookOpen size={18} /> Daily Study Advice
          </h3>
          <ul style={{
            paddingLeft: '20px', color: 'var(--color-purple-dark)', fontSize: '0.85rem',
            lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '8px', fontWeight: '600'
          }}>
            <li><b>Study in blocks</b>: Focus in short bursts of 20 minutes (Pomodoro timer) and take 5-minute rests.</li>
            <li><b>Be consistent</b>: Quizzing for just 10 minutes a day yields 2x higher retainment than 2-hour cram sessions!</li>
            <li><b>Earn Rewards</b>: Parents can configure rewards to celebrate milestones together!</li>
          </ul>
        </section>

      </div>
    </div>
  );
};
