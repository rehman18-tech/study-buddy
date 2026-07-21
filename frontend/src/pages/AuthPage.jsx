import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Mascot } from '../components/Mascot';
import { 
  Mail, 
  Lock, 
  User, 
  GraduationCap,
  Eye,
  EyeOff, 
  School, 
  ShieldCheck, 
  Phone, 
  Globe, 
  BookOpen, 
  FileText,
  FileCheck2,
  LockKeyhole
} from 'lucide-react';

const countriesList = [
  { name: 'India', code: '+91', length: 10 },
  { name: 'United States', code: '+1', length: 10 },
  { name: 'United Kingdom', code: '+44', length: 10 },
  { name: 'Australia', code: '+61', length: 9 },
  { name: 'United Arab Emirates', code: '+971', length: 9 },
  { name: 'Singapore', code: '+65', length: 8 }
];

export const AuthPage = () => {
  const { login, register, loginTeacher, registerTeacher, sendPasswordReset, startDemoSession } = useAuth();
  const { navigate, triggerNotification } = useApp();
  
  // Common states
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [isTeacherPortal, setIsTeacherPortal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Student / Parent Form values
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('student');
  const [studentClass, setStudentClass] = useState('6');
  const [schoolName, setSchoolName] = useState('');
  const [schoolType, setSchoolType] = useState('Public');
  const [board, setBoard] = useState('SSC');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [parentContact, setParentContact] = useState('');
  const [parentPin, setParentPin] = useState('1234');
  
  // Teacher Form values
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [country, setCountry] = useState('India');
  const [qualification, setQualification] = useState('');
  
  const handleCountryChange = (countryName) => {
    setCountry(countryName);
    const config = countriesList.find(c => c.name === countryName);
    if (config) {
      setPhoneCountryCode(config.code);
    }
  };

  const handleCountryCodeChange = (code) => {
    setPhoneCountryCode(code);
    const config = countriesList.find(c => c.code === code);
    if (config) {
      setCountry(config.name);
    }
  };
  const [specialization, setSpecialization] = useState('');
  const [institution, setInstitution] = useState('');
  const [teacherIdProof, setTeacherIdProof] = useState(null);
  const [teacherCertificates, setTeacherCertificates] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      triggerNotification('Please enter your email address.', 'red');
      return;
    }

    setLoading(true);
    try {
      if (isTeacherPortal) {
        // Teacher Workflow
        if (authMode === 'register') {
          if (!name || !email || !phoneDigits || !country || !qualification || !specialization || !institution || !password) {
            triggerNotification('⚠️ Please fill out all text fields!', 'red');
            setLoading(false);
            return;
          }
          if (!teacherIdProof) {
            triggerNotification('⚠️ Government ID proof is required for verification.', 'red');
            setLoading(false);
            return;
          }

          // Validate phone format and length
          const countryConfig = countriesList.find(c => c.name === country);
          const expectedLength = countryConfig ? countryConfig.length : 10;
          const cleanDigits = phoneDigits.replace(/\D/g, '');
          
          if (cleanDigits.length !== expectedLength) {
            triggerNotification(`⚠️ Please enter a valid ${expectedLength}-digit phone number for ${country}.`, 'red');
            setLoading(false);
            return;
          }
          
          const formattedPhone = phoneCountryCode + cleanDigits;

          const formData = new FormData();
          formData.append('name', name);
          formData.append('email', email);
          formData.append('phone', formattedPhone);
          formData.append('country', country);
          formData.append('qualification', qualification);
          formData.append('specialization', specialization);
          formData.append('institution', institution);
          formData.append('password', password);
          formData.append('teacherIdProof', teacherIdProof);
          for (let i = 0; i < teacherCertificates.length; i++) {
            formData.append('certificates', teacherCertificates[i]);
          }

          await registerTeacher(formData);
          // Reset fields & switch to login
          setName('');
          setPhoneDigits('');
          setPhoneCountryCode('+91');
          setCountry('India');
          setQualification('');
          setSpecialization('');
          setInstitution('');
          setPassword('');
          setTeacherIdProof(null);
          setTeacherCertificates([]);
          setAuthMode('login');
        } else {
          // Teacher Login
          await loginTeacher(email, password);
        }
      } else {
        // Student / Parent Workflow
        if (authMode === 'forgot') {
          await sendPasswordReset(email);
          setAuthMode('login');
        } else if (authMode === 'register') {
          if (!email || !password || !name) {
            triggerNotification('⚠️ Please fill out all required fields!', 'red');
            setLoading(false);
            return;
          }
          await register({
            name,
            email,
            password,
            role,
            studentClass: role === 'student' ? Number(studentClass) : undefined,
            schoolName: role === 'student' ? schoolName : undefined,
            schoolType: role === 'student' ? schoolType : undefined,
            board: role === 'student' ? board : undefined,
            preferredLanguage: role === 'student' ? preferredLanguage : undefined,
            parentContact: role === 'student' ? parentContact : undefined,
            parentPin: role === 'student' ? parentPin : undefined
          });
        } else {
          await login(email, password);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e, field) => {
    if (e.target.files) {
      if (field === 'idProof') {
        setTeacherIdProof(e.target.files[0]);
      } else if (field === 'certs') {
        setTeacherCertificates(Array.from(e.target.files));
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'linear-gradient(135deg, var(--bg-app) 0%, var(--border-light) 100%)'
    }}>
      <div className="card-buddy" style={{
        maxWidth: isTeacherPortal && authMode === 'register' ? '680px' : '560px',
        width: '100%',
        padding: '40px 30px',
        backgroundColor: 'var(--bg-card)',
        textAlign: 'center',
        transition: 'max-width 0.3s ease'
      }}>
        {/* Floating Mascot */}
        <div style={{ marginTop: '-70px', marginBottom: '15px' }}>
          <Mascot size={100} expression={authMode === 'register' ? 'thinking' : authMode === 'forgot' ? 'confused' : 'happy'} />
        </div>

        {/* Dynamic Titles */}
        <h2 style={{ fontSize: '2.1rem', color: 'var(--text-main)', marginBottom: '6px' }}>
          {isTeacherPortal 
            ? (authMode === 'register' ? 'Teacher Onboarding Application' : 'Educator & Admin Portal') 
            : (authMode === 'register' ? 'Join Study Buddy!' : authMode === 'forgot' ? 'Reset Password' : 'Welcome Back!')
          }
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '25px', fontWeight: '600', fontSize: '0.92rem' }}>
          {isTeacherPortal
            ? (authMode === 'register' ? 'Register your teaching credentials for administrative verification.' : 'Sign in to access review lists and verify student answers.')
            : (authMode === 'register' ? 'Create student profile for Andhra Pradesh State Board & CBSE' : authMode === 'forgot' ? 'Enter your email to receive a password reset link' : 'Sign in to access quizzes, schedules and StudyGuru AI')
          }
        </p>

        {/* Tab Selector (only show if not in forgot password mode) */}
        {authMode !== 'forgot' && (
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-app)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px',
            marginBottom: '25px'
          }}>
            <button
              onClick={() => setAuthMode('login')}
              type="button"
              style={{
                flex: 1, padding: '10px', border: 'none',
                background: authMode === 'login' ? 'var(--bg-card)' : 'transparent',
                fontFamily: 'var(--font-header)', fontSize: '0.95rem',
                borderRadius: 'calc(var(--radius-sm) - 4px)', cursor: 'pointer',
                color: authMode === 'login' ? (isTeacherPortal ? 'var(--color-purple)' : 'var(--color-green)') : 'var(--text-muted)',
                fontWeight: '700', transition: 'all 0.2s ease'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode('register')}
              type="button"
              style={{
                flex: 1, padding: '10px', border: 'none',
                background: authMode === 'register' ? 'var(--bg-card)' : 'transparent',
                fontFamily: 'var(--font-header)', fontSize: '0.95rem',
                borderRadius: 'calc(var(--radius-sm) - 4px)', cursor: 'pointer',
                color: authMode === 'register' ? (isTeacherPortal ? 'var(--color-purple)' : 'var(--color-green)') : 'var(--text-muted)',
                fontWeight: '700', transition: 'all 0.2s ease'
              }}
            >
              {isTeacherPortal ? 'Apply to Teach' : 'Create Account'}
            </button>
          </div>
        )}

        {/* Form Panel */}
        <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {authMode === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder={isTeacherPortal ? "Enter your full name" : "Enter student name"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={isTeacherPortal ? "buddy-input" : "buddy-input-student"}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                placeholder={isTeacherPortal ? "teacher@school.com" : "student@school.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={isTeacherPortal ? "buddy-input" : "buddy-input-student"}
                required
              />
            </div>
          </div>

          {authMode !== 'forgot' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={isTeacherPortal ? "buddy-input" : "buddy-input-student"}
                  style={{ paddingRight: '45px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* TEACHER METADATA ONBOARDING FIELDS */}
          {isTeacherPortal && authMode === 'register' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Country & Phone Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>Country Selector</label>
                  <div style={{ position: 'relative' }}>
                    <Globe size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                    <select
                      value={country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="buddy-input"
                      required
                    >
                      {countriesList.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>Phone Number (International)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={phoneCountryCode}
                      onChange={(e) => handleCountryCodeChange(e.target.value)}
                      className="buddy-input buddy-input-noicon"
                      style={{ width: '90px' }}
                    >
                      {countriesList.map(c => (
                        <option key={c.code} value={c.code}>{c.code}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      placeholder={`e.g. ${countriesList.find(c => c.name === country)?.length}-digits`}
                      value={phoneDigits}
                      onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, ''))}
                      className="buddy-input buddy-input-noicon"
                      style={{ flex: 1 }}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Qualification & Subject expertise */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>Highest Qualification</label>
                  <div style={{ position: 'relative' }}>
                    <GraduationCap size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="e.g. M.Sc Chemistry, B.Ed"
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                      className="buddy-input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>Subject Expertise</label>
                  <div style={{ position: 'relative' }}>
                    <BookOpen size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="e.g. Science / Biology"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="buddy-input"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Institution */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>School / Institution</label>
                <div style={{ position: 'relative' }}>
                  <School size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="e.g. AP Model School"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="buddy-input"
                    required
                  />
                </div>
              </div>

              {/* Uploads Block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ marginTop: '5px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>
                    Government ID Upload (.pdf, .jpg, .png) *
                  </label>
                  <label 
                    className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:border-purple-400 dark:hover:border-purple-500 cursor-pointer transition text-center space-y-1.5"
                  >
                    <FileText className={teacherIdProof ? "text-emerald-500" : "text-purple-500"} size={24} />
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)' }}>
                      {teacherIdProof ? '✓ ID Proof Selected' : 'Choose Govt ID File'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                      {teacherIdProof ? teacherIdProof.name : 'PDF, JPG, PNG up to 10MB'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'idProof')}
                      className="hidden"
                      required={!teacherIdProof}
                    />
                  </label>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>
                    Degree Certificate Upload (multiple)
                  </label>
                  <label 
                    className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:border-purple-400 dark:hover:border-purple-500 cursor-pointer transition text-center space-y-1.5"
                  >
                    <FileCheck2 className={teacherCertificates.length > 0 ? "text-emerald-500" : "text-purple-500"} size={24} />
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)' }}>
                      {teacherCertificates.length > 0 ? `✓ ${teacherCertificates.length} Certificates Selected` : 'Choose Certificates'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                      {teacherCertificates.length > 0 
                        ? teacherCertificates.map(c => c.name).join(', ') 
                        : 'PDF, JPG, PNG multiple files'
                      }
                    </span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'certs')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STUDENT/PARENT REGISTRATION METADATA FIELDS */}
          {!isTeacherPortal && authMode === 'register' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>Registering as</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="buddy-input-student buddy-input-noicon"
                >
                  <option value="student">Student Profile</option>
                  <option value="parent">Parent Profile</option>
                </select>
              </div>

              {role === 'student' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>Class / Grade</label>
                      <select
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        className="buddy-input-student buddy-input-noicon"
                        style={{ fontWeight: 'bold' }}
                      >
                        {[6, 7, 8, 9, 10].map((num) => (
                          <option key={num} value={num}>Class {num}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>Curriculum Board</label>
                      <select
                        value={board}
                        onChange={(e) => setBoard(e.target.value)}
                        className="buddy-input-student buddy-input-noicon"
                        style={{ fontWeight: 'bold' }}
                      >
                        <option value="SSC">SSC (State Board)</option>
                        <option value="CBSE">CBSE aligned</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>School Name</label>
                    <div style={{ position: 'relative' }}>
                      <School size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="e.g. ZP High School, Nellore"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        className="buddy-input-student"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>School Management</label>
                      <select
                        value={schoolType}
                        onChange={(e) => setSchoolType(e.target.value)}
                        className="buddy-input-student buddy-input-noicon"
                      >
                        <option value="Public">Public School</option>
                        <option value="Private">Private School</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>Study Medium</label>
                      <select
                        value={preferredLanguage}
                        onChange={(e) => setPreferredLanguage(e.target.value)}
                        className="buddy-input-student buddy-input-noicon"
                      >
                        <option value="English">English</option>
                        <option value="Telugu">Telugu (తెలుగు)</option>
                        <option value="Hindi">Hindi (हिंदी)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>Parent Contact Number</label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                        <input
                          type="tel"
                          placeholder="Parent mobile number"
                          value={parentContact}
                          onChange={(e) => setParentContact(e.target.value)}
                          className="buddy-input-student"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>Parent Pin (4 digits)</label>
                      <div style={{ position: 'relative' }}>
                        <ShieldCheck size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="1234"
                          value={parentPin}
                          onChange={(e) => setParentPin(e.target.value.replace(/\D/g, ''))}
                          className="buddy-input-student"
                          style={{ textAlign: 'center', fontWeight: 'bold' }}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Forgot Password trigger */}
          {authMode === 'login' && !isTeacherPortal && (
            <div style={{ textAlign: 'right', marginTop: '-5px' }}>
              <button
                type="button"
                onClick={() => setAuthMode('forgot')}
                style={{
                  background: 'none', border: 'none', color: 'var(--color-purple)',
                  fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline'
                }}
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            className={isTeacherPortal ? "btn-3d btn-3d-purple" : "btn-3d btn-3d-green"}
            style={{ width: '100%', marginTop: '10px', padding: '14px' }}
            disabled={loading}
          >
            {loading 
              ? 'Processing...' 
              : isTeacherPortal 
                ? (authMode === 'register' ? 'Submit Application Form' : 'Educator Sign In') 
                : (authMode === 'forgot' ? 'Send Password Reset Email' : authMode === 'register' ? 'Register & Start Studying!' : 'Sign In')
            }
          </button>
        </form>

        {/* Back link for Forgot Password */}
        {authMode === 'forgot' && (
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={() => setAuthMode('login')}
              style={{
                background: 'none', border: 'none', color: 'var(--color-green)',
                fontFamily: 'var(--font-header)', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer'
              }}
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        {/* Developer Bypass & Portal Switch */}
        {authMode !== 'forgot' && (
          <div style={{ marginTop: '20px', borderTop: '2px solid var(--border-light)', paddingTop: '15px' }}>
            {isTeacherPortal ? (
              /* Teacher Portal View Bypasses */
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
                  Developer shortcuts for verification testing:
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '12px' }}>
                  <button 
                    type="button"
                    onClick={() => startDemoSession('teacher')} 
                    style={{
                      background: 'none', border: 'none', color: 'var(--color-purple)', fontFamily: 'var(--font-header)',
                      fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer'
                    }}
                  >
                    Demo Teacher
                  </button>
                </div>
                <button
                  onClick={() => { setIsTeacherPortal(false); setAuthMode('login'); }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--color-green)', fontFamily: 'var(--font-header)',
                    fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline'
                  }}
                >
                  ← Go back to Student & Parent Portal
                </button>
              </>
            ) : (
              /* Student Portal View Bypasses */
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
                  Testing out the platform as a developer?
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '12px' }}>
                  <button 
                    onClick={() => startDemoSession('student')} 
                    style={{
                      background: 'none', border: 'none', color: 'var(--color-green)', fontFamily: 'var(--font-header)',
                      fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer'
                    }}
                  >
                    Demo Student
                  </button>
                  <span style={{ color: 'var(--text-muted)' }}>|</span>
                  <button 
                    onClick={() => startDemoSession('parent')} 
                    style={{
                      background: 'none', border: 'none', color: 'var(--color-purple)', fontFamily: 'var(--font-header)',
                      fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer'
                    }}
                  >
                    Demo Parent
                  </button>
                </div>
                
                <button
                  onClick={() => { setIsTeacherPortal(true); setAuthMode('login'); }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--color-purple)', fontFamily: 'var(--font-header)',
                    fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline',
                    display: 'flex', items: 'center', gap: '4px', margin: '0 auto'
                  }}
                >
                  <LockKeyhole size={14} /> Access Teacher & Admin Portal
                </button>
              </>
            )}
          </div>
        )}

        <button
          onClick={() => navigate('landing')}
          style={{
            marginTop: '25px', background: 'none', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem',
            textDecoration: 'underline'
          }}
        >
          ← Back to Homepage
        </button>
      </div>
    </div>
  );
};
