import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../services/api';
import { useApp } from './AppContext';
import { 
  auth, 
  isFirebaseActive,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut,
  onAuthStateChanged 
} from '../config/firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { triggerNotification, navigate } = useApp();

  // Restore/Sync user session on startup
  useEffect(() => {
    let unsubscribe = () => {};
    
    if (isFirebaseActive) {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const token = await firebaseUser.getIdToken();
            localStorage.setItem('studybuddy_token', token);
            const data = await api.getMe();
            setUser(data.user);
          } catch (err) {
            console.error("Firebase auth sync error:", err);
            api.logout();
            setUser(null);
          }
        } else {
          // If logged out on Firebase, ensure we clear local bypass tokens
          const token = localStorage.getItem('studybuddy_token');
          if (token && !token.startsWith('demo_')) {
            localStorage.removeItem('studybuddy_token');
            setUser(null);
          }
        }
        setLoading(false);
      });
    } else {
      // Local Auth Mode session restoration
      async function loadLocalSession() {
        const token = localStorage.getItem('studybuddy_token');
        if (token) {
          try {
            if (token === 'demo_teacher_token_bypass') {
              setUser({
                _id: 'demo_teacher_123',
                name: 'Dr. Ravi Kumar',
                email: 'teacher@studybuddy.com',
                role: 'teacher',
                status: 'approved',
                qualification: 'M.Sc Biology, B.Ed',
                specialization: 'Biology',
                institution: 'Andhra Pradesh Model School'
              });
              navigate('teacher-dashboard');
            } else {
              let data;
              try {
                data = await api.getMe();
                setUser(data.user);
                if (data.user.role === 'admin' || data.user.role === 'super_admin') {
                  navigate('admin-dashboard');
                } else if (data.user.role === 'teacher') {
                  navigate('teacher-dashboard');
                } else {
                  navigate('dashboard');
                }
              } catch (studentErr) {
                data = await api.getTeacherMe();
                setUser(data.user);
                if (data.user.role === 'admin' || data.user.role === 'super_admin') {
                  navigate('admin-dashboard');
                } else {
                  navigate('teacher-dashboard');
                }
              }
            }
          } catch (err) {
            console.error("Local auth session load failed:", err);
            api.logout();
          }
        }
        setLoading(false);
      }
      loadLocalSession();
    }

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      if (isFirebaseActive) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const token = await userCredential.user.getIdToken();
        localStorage.setItem('studybuddy_token', token);
        
        // Sync session details from MongoDB backend
        const data = await api.syncSession({});
        setUser(data.user);
        triggerNotification(`🎉 Welcome back, ${data.user.name}!`);
        if (data.user.role === 'admin' || data.user.role === 'super_admin') {
          navigate('admin-dashboard');
        } else if (data.user.role === 'teacher') {
          navigate('teacher-dashboard');
        } else {
          navigate('dashboard');
        }
        return data.user;
      } else {
        // Fallback to local server Auth
        const data = await api.login(email, password);
        setUser(data.user);
        triggerNotification(`🎉 Welcome back, ${data.user.name}!`);
        if (data.user.role === 'admin' || data.user.role === 'super_admin') {
          navigate('admin-dashboard');
        } else if (data.user.role === 'teacher') {
          navigate('teacher-dashboard');
        } else {
          navigate('dashboard');
        }
        return data.user;
      }
    } catch (err) {
      triggerNotification(err.message || 'Login failed. Please check credentials.', 'red');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      if (isFirebaseActive) {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        const token = await userCredential.user.getIdToken();
        localStorage.setItem('studybuddy_token', token);
        
        // Sync metadata (class, school, board, etc.) to MongoDB
        const data = await api.syncSession(userData);
        setUser(data.user);
        triggerNotification(`🌱 Welcome ${data.user.name}! Profile registered successfully.`);
        if (data.user.role === 'admin' || data.user.role === 'super_admin') {
          navigate('admin-dashboard');
        } else if (data.user.role === 'teacher') {
          navigate('teacher-dashboard');
        } else {
          navigate('dashboard');
        }
        return data.user;
      } else {
        // Fallback to local server Auth
        const data = await api.register(userData);
        setUser(data.user);
        triggerNotification(`🌱 Welcome ${data.user.name}! Profile registered successfully.`);
        if (data.user.role === 'admin' || data.user.role === 'super_admin') {
          navigate('admin-dashboard');
        } else if (data.user.role === 'teacher') {
          navigate('teacher-dashboard');
        } else {
          navigate('dashboard');
        }
        return data.user;
      }
    } catch (err) {
      triggerNotification(err.message || 'Registration failed.', 'red');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email) => {
    try {
      if (isFirebaseActive) {
        await sendPasswordResetEmail(auth, email);
        triggerNotification('✉️ Password reset email sent! Please check your inbox.', 'green');
      } else {
        // Simulating password reset email in local mock mode
        triggerNotification(`✉️ [Mock Mode] Password reset link sent to ${email}!`, 'green');
      }
    } catch (err) {
      triggerNotification(err.message || 'Failed to send password reset email.', 'red');
      throw err;
    }
  };

  const logout = async () => {
    try {
      if (isFirebaseActive) {
        await signOut(auth);
      }
    } catch (err) {
      console.error("Firebase Signout error:", err);
    }
    api.logout();
    setUser(null);
    triggerNotification('👋 Logged out successfully. See you tomorrow!');
    navigate('landing');
  };

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
    } catch (err) {
      console.error('Error refreshing session:', err);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const data = await api.updateProfile(profileData);
      setUser(data.user);
      triggerNotification('✏️ Profile updated successfully!');
      return data.user;
    } catch (err) {
      triggerNotification(err.message || 'Error updating profile details.', 'red');
      throw err;
    }
  };

  const awardXp = async (xp, reason) => {
    try {
      const data = await api.awardXp(xp, reason);
      setUser(data.user);
      return data.user;
    } catch (err) {
      console.error('Error awarding XP:', err);
      // Client-side fallback if server fails
      if (user && user.studentProfile) {
        const currentXp = (user.studentProfile.xp || 0) + Number(xp);
        const currentCoins = (user.studentProfile.coins || 0) + 10;
        setUser({
          ...user,
          studentProfile: {
            ...user.studentProfile,
            xp: currentXp,
            coins: currentCoins,
            achievementLevel: Math.floor(currentXp / 100) + 1
          }
        });
      }
    }
  };

  const loginTeacher = async (email, password) => {
    setLoading(true);
    try {
      const data = await api.loginTeacher(email, password);
      setUser(data.user);
      localStorage.setItem('studybuddy_token', data.token);
      triggerNotification(`🎉 Welcome back, ${data.user.name}!`);
      if (data.user.role === 'admin' || data.user.role === 'super_admin') {
        navigate('admin-dashboard');
      } else {
        navigate('teacher-dashboard');
      }
      return data.user;
    } catch (err) {
      triggerNotification(err.message || 'Login failed. Please check credentials.', 'red');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerTeacher = async (formData) => {
    setLoading(true);
    try {
      const data = await api.registerTeacher(formData);
      triggerNotification('🌱 Application submitted successfully! An admin will review it.');
      return data;
    } catch (err) {
      triggerNotification(err.message || 'Registration failed.', 'red');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const startDemoSession = (role = 'student') => {
    if (role === 'teacher') {
      const demoTeacher = {
        _id: 'demo_teacher_123',
        name: 'Dr. Ravi Kumar',
        email: 'teacher@studybuddy.com',
        role: 'teacher',
        status: 'approved',
        qualification: 'M.Sc Biology, B.Ed',
        specialization: 'Biology',
        institution: 'Andhra Pradesh Model School'
      };
      setUser(demoTeacher);
      localStorage.setItem('studybuddy_token', 'demo_teacher_token_bypass');
      triggerNotification(`💡 Entering Developer Demo Mode as ${demoTeacher.name}!`);
      navigate('teacher-dashboard');
      return;
    }

    const demoUser = {
      _id: 'demo_user_123',
      name: role === 'student' ? 'MD. IBADUR REHMAN' : 'Parent of Alex',
      email: role === 'student' ? 'alex@studybuddy.com' : 'parent@studybuddy.com',
      role: role,
      studentProfile: {
        class: 5,
        schoolName: 'Zilla Parishad High School',
        schoolType: 'Public',
        board: 'SSC',
        preferredLanguage: 'English',
        parentContact: '9988776655',
        parentPin: '5555',
        streak: 2,
        lastActiveDate: new Date().toDateString(),
        xp: 120,
        coins: 40,
        achievementLevel: 2,
        badges: ['streak_3']
      },
      parentProfile: {
        childEmails: ['alex@studybuddy.com'],
        customQuests: [
          { id: 'pq_1', title: 'Read Science Chapter 5', subject: 'Science', xp: 30, completed: false },
          { id: 'pq_2', title: 'Complete English Spelling Quiz', subject: 'English', xp: 20, completed: false }
        ],
        rewards: [
          { id: 'pr_1', title: '30 Minutes Video Game Time', costXp: 100, unlocked: false },
          { id: 'pr_2', title: 'Extra Ice Cream Cup', costXp: 150, unlocked: false },
          { id: 'pr_3', title: 'New Story Book Unlocked', costXp: 250, unlocked: false }
        ]
      }
    };
    
    setUser(demoUser);
    const mockToken = role === 'student' ? 'demo_student_token_bypass' : 'demo_parent_token_bypass';
    localStorage.setItem('studybuddy_token', mockToken);
    triggerNotification(`💡 Entering Developer Demo Mode as ${demoUser.name}!`);
    navigate('dashboard');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        register,
        loginTeacher,
        registerTeacher,
        sendPasswordReset,
        logout,
        refreshUser,
        updateProfile,
        awardXp,
        startDemoSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
