import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Mascot } from '../components/Mascot';
import { BookOpen, Clock, Play, Pause, RotateCcw, CheckCircle, GraduationCap, Search, Sparkles, Calendar, AlertCircle } from 'lucide-react';

export const StudyPlanner = () => {
  const { triggerNotification, navigate, t } = useApp();
  const { user, refreshUser } = useAuth();
  
  // Tab states
  const [plannerTab, setPlannerTab] = useState('plans'); // 'plans' | 'syllabus' | 'clock'
  const [planType, setPlanType] = useState('daily'); // 'daily' | 'weekly' | 'monthly'

  // AI Planner states
  const [activePlan, setActivePlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  // Syllabus state
  const [syllabusList, setSyllabusList] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [selectedClass, setSelectedClass] = useState(6);
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [completedTopics, setCompletedTopics] = useState([]);
  const [loadingSyllabus, setLoadingSyllabus] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Study timer states
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes default
  const [timerRunning, setTimerRunning] = useState(false);
  const [initialTime, setInitialTime] = useState(600);

  // Load available classes list
  useEffect(() => {
    async function loadClasses() {
      try {
        const list = await api.getClasses();
        if (list && list.length > 0) {
          const filtered = list.filter(c => c >= 6 && c <= 10);
          setClassesList(filtered.length > 0 ? filtered : [6, 7, 8, 9, 10]);
        } else {
          setClassesList([6, 7, 8, 9, 10]);
        }
      } catch (err) {
        setClassesList([6, 7, 8, 9, 10]);
      }
    }
    loadClasses();
  }, []);

  // Update selected class when user profile changes
  useEffect(() => {
    if (user?.studentProfile?.class) {
      setSelectedClass(Number(user.studentProfile.class));
      const saved = localStorage.getItem(`completed_topics_${user._id}`);
      setCompletedTopics(saved ? JSON.parse(saved) : []);
    } else {
      const saved = localStorage.getItem('completed_topics_guest');
      setCompletedTopics(saved ? JSON.parse(saved) : []);
    }
  }, [user]);

  // Load syllabus data when class changes
  useEffect(() => {
    async function loadSyllabus() {
      setLoadingSyllabus(true);
      try {
        const list = await api.getSyllabus(selectedClass);
        setSyllabusList(list || []);
        
        if (list && list.length > 0) {
          const firstSub = list[0].subject;
          const exists = list.find(s => s.subject.toLowerCase() === selectedSubject.toLowerCase());
          if (!exists) {
            setSelectedSubject(firstSub);
          }
        }
      } catch (err) {
        console.error("Error loading syllabus:", err);
      } finally {
        setLoadingSyllabus(false);
      }
    }
    loadSyllabus();
  }, [selectedClass]);

  // Load active study plan on type select
  const loadActivePlan = async () => {
    try {
      const plan = await api.getActiveStudyPlan(planType);
      setActivePlan(plan);
    } catch (err) {
      console.error("Error loading active study plan:", err);
    }
  };

  useEffect(() => {
    if (plannerTab === 'plans') {
      loadActivePlan();
    }
  }, [planType, plannerTab]);

  // Sync completed topics in localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(`completed_topics_${user._id}`, JSON.stringify(completedTopics));
    } else {
      localStorage.setItem('completed_topics_guest', JSON.stringify(completedTopics));
    }
  }, [completedTopics, user]);

  // Study Timer Logic
  useEffect(() => {
    let interval = null;
    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerRunning) {
      setTimerRunning(false);
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  const handleTimerComplete = async () => {
    triggerNotification('🏆 Focus session completed! You earned +50 XP and +10 Coins!', 'purple');
    try {
      await api.awardXp(50, 'Focus Session');
      refreshUser();
    } catch (err) {
      console.error(err);
    }
    setTimeLeft(initialTime);
  };

  const handleSetTimer = (minutes) => {
    const seconds = minutes * 60;
    setTimeLeft(seconds);
    setInitialTime(seconds);
    setTimerRunning(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGeneratePlan = async () => {
    setLoadingPlan(true);
    try {
      const res = await api.generateStudyPlan(planType);
      triggerNotification('✨ New study plan generated by Study Planner Agent!', 'purple');
      loadActivePlan();
    } catch (err) {
      triggerNotification('❌ Failed to generate study plan: ' + err.message, 'red');
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleCompleteTask = async (taskIdx) => {
    if (!activePlan) return;
    try {
      const tasks = [...activePlan.planData.tasks];
      const task = tasks[taskIdx];
      if (task.completed) return;

      task.completed = true;
      await api.awardXp(20, `Completed task: ${task.topic}`);
      triggerNotification(`🌟 Plan task completed! +20 XP!`, 'green');

      setActivePlan({
        ...activePlan,
        planData: {
          ...activePlan.planData,
          tasks
        }
      });
      refreshUser();
    } catch (err) {
      console.error("Error completing plan task:", err);
    }
  };

  const toggleTopicCompleted = (topicName) => {
    if (completedTopics.includes(topicName)) {
      setCompletedTopics(prev => prev.filter(t => t !== topicName));
      triggerNotification('✏️ Topic set back to active.');
    } else {
      setCompletedTopics(prev => [...prev, topicName]);
      triggerNotification('🎉 Topic mastered! Keep learning!', 'green');
    }
  };

  const toggleChapterCompleted = (chapterName, topics) => {
    if (!topics || topics.length === 0) return;
    const allDone = topics.every(t => completedTopics.includes(t));
    if (allDone) {
      setCompletedTopics(prev => prev.filter(t => !topics.includes(t)));
      triggerNotification('✏️ Chapter topics set back to active.');
    } else {
      setCompletedTopics(prev => {
        const newCompleted = [...prev];
        topics.forEach(t => {
          if (!newCompleted.includes(t)) {
            newCompleted.push(t);
          }
        });
        return newCompleted;
      });
      triggerNotification('🎉 Chapter mastered! All topics completed!', 'green');
    }
  };

  // Syllabus searchable topics logic
  const searchableTopics = [];
  syllabusList.forEach(subj => {
    if (subj.chapters && Array.isArray(subj.chapters)) {
      subj.chapters.forEach(ch => {
        if (ch.topics && Array.isArray(ch.topics)) {
          ch.topics.forEach(tName => {
            searchableTopics.push({
              subject: subj.subject,
              chapter: ch.name,
              topic: tName,
              type: 'topic'
            });
          });
        }
        searchableTopics.push({
          subject: subj.subject,
          chapter: ch.name,
          type: 'chapter',
          topics: ch.topics || []
        });
      });
    }
  });

  const filteredResults = searchQuery.trim() ? searchableTopics.filter(item => {
    const query = searchQuery.toLowerCase();
    if (item.type === 'topic') {
      return item.topic.toLowerCase().includes(query) || 
             item.chapter.toLowerCase().includes(query) || 
             item.subject.toLowerCase().includes(query);
    } else {
      return item.chapter.toLowerCase().includes(query) || 
             item.subject.toLowerCase().includes(query);
    }
  }) : [];

  const currentSyllabus = syllabusList.find(
    s => s.subject.toLowerCase() === selectedSubject.toLowerCase()
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '15px', borderBottom: '2.5px solid var(--border-light)', paddingBottom: '10px' }}>
        <button
          onClick={() => setPlannerTab('plans')}
          className={`btn-3d ${plannerTab === 'plans' ? 'btn-3d-purple' : 'btn-3d-light'}`}
          style={{ padding: '8px 20px', fontSize: '0.9rem' }}
        >
          📅 AI Study Plans
        </button>
        <button
          onClick={() => setPlannerTab('syllabus')}
          className={`btn-3d ${plannerTab === 'syllabus' ? 'btn-3d-purple' : 'btn-3d-light'}`}
          style={{ padding: '8px 20px', fontSize: '0.9rem' }}
        >
          🌿 Syllabus Tracker
        </button>
        <button
          onClick={() => setPlannerTab('clock')}
          className={`btn-3d ${plannerTab === 'clock' ? 'btn-3d-purple' : 'btn-3d-light'}`}
          style={{ padding: '8px 20px', fontSize: '0.9rem' }}
        >
          ⏱️ Mascot Study Clock
        </button>
      </div>

      {/* PLANNER TAB: AI plans display */}
      {plannerTab === 'plans' && (
        <div className="dashboard-grid">
          
          {/* Main Plan Area */}
          <section className="card-buddy" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '15px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={22} fill="var(--color-yellow)" color="var(--color-yellow)" /> AI Learning Calendars
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
                  Custom topics recommended by the Study Planner Agent based on your weak subjects.
                </p>
              </div>

              <button
                onClick={handleGeneratePlan}
                disabled={loadingPlan}
                className="btn-3d btn-3d-purple"
                style={{ padding: '8px 20px', fontSize: '0.85rem' }}
              >
                {loadingPlan ? 'Planning...' : '✨ Renew Calendar'}
              </button>
            </div>

            {/* Plan Type Selector */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
              {['daily', 'weekly', 'monthly'].map(type => (
                <button
                  key={type}
                  onClick={() => setPlanType(type)}
                  className={`btn-3d ${planType === type ? 'btn-3d-green' : 'btn-3d-light'}`}
                  style={{ padding: '6px 14px', fontSize: '0.8rem', textTransform: 'capitalize' }}
                >
                  {type} Plan
                </button>
              ))}
            </div>

            {/* Render Selected Plan */}
            {activePlan && activePlan.planData && activePlan.planData.tasks && activePlan.planData.tasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '5px', color: 'var(--text-main)' }}>
                  {activePlan.planData.title || `${planType.toUpperCase()} Target Tasks`}
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activePlan.planData.tasks.map((task, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleCompleteTask(idx)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '14px 18px', borderRadius: 'var(--radius-sm)',
                        backgroundColor: task.completed ? 'var(--color-green-light)' : 'var(--bg-card)',
                        border: `2.5px solid ${task.completed ? 'var(--color-green)' : 'var(--border-light)'}`,
                        cursor: task.completed ? 'default' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        backgroundColor: task.completed ? 'var(--color-green)' : 'var(--bg-card)',
                        color: task.completed ? '#ffffff' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', fontSize: '0.8rem', border: '1.5px solid var(--border-light)'
                      }}>
                        {task.completed ? '✓' : idx + 1}
                      </div>

                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: '0.92rem', fontWeight: 'bold',
                          textDecoration: task.completed ? 'line-through' : 'none',
                          color: task.completed ? 'var(--color-green-dark)' : 'var(--text-main)',
                          margin: 0
                        }}>{task.topic}</p>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                          Subject: {task.subject} • Target Study: {task.duration} {task.priority && `• Priority: ${task.priority.toUpperCase()}`}
                        </span>
                      </div>

                      {!task.completed && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-yellow-dark)', backgroundColor: 'var(--color-yellow-light)', padding: '2px 8px', borderRadius: '8px' }}>
                          +20 XP
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', border: '1.5px dashed var(--border-light)', borderRadius: '12px', backgroundColor: 'var(--bg-app)' }}>
                <AlertCircle size={36} color="var(--color-purple)" style={{ marginBottom: '10px', display: 'inline-block' }} />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '8px' }}>No Active {planType.toUpperCase()} Plan</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px', maxWidth: '350px', margin: '0 auto 20px auto' }}>
                  Our Planner Agent can construct custom revision routines tailored to your weak areas and exam schedule.
                </p>
                <button
                  onClick={handleGeneratePlan}
                  disabled={loadingPlan}
                  className="btn-3d btn-3d-purple"
                  style={{ padding: '8px 24px', fontSize: '0.88rem' }}
                >
                  {loadingPlan ? 'Structuring Plan...' : '✨ Generate Study Plan'}
                </button>
              </div>
            )}
          </section>

          {/* Right Column Planner Tips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <section className="card-buddy" style={{ background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)', borderColor: '#e1bee7' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', color: '#4a148c' }}>
                💡 Planner Agent Insights
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: '#4a148c', lineHeight: '1.4' }}>
                <p>
                  1. **Weak Area Focus**: The Planner Agent automatically places weak subjects at the top of your checklist.
                </p>
                <p>
                  2. **Spacing Effect**: Break down complex lessons into 15–20 minute cycles for maximum memory consolidation.
                </p>
                <p>
                  3. **Streak Multiplier**: Finishing all daily planner tasks keeps your streak active and adds +20XP bonuses!
                </p>
              </div>
            </section>

            {/* AI Mascot widget */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '15px',
              backgroundColor: 'var(--color-green-light)', border: '2px solid var(--color-green)',
              borderRadius: 'var(--radius-md)', padding: '16px 20px', boxShadow: '0 4px 0 var(--color-green)'
            }}>
              <Mascot size={60} expression="thinking" />
              <div>
                <p style={{ fontSize: '0.88rem', fontWeight: 'bold', color: 'var(--color-green-dark)', lineHeight: '1.4', margin: 0 }}>
                  "Follow your study calendar closely to stay ahead of exams! Mastered topics will unlock special badge rewards."
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SYLLABUS TAB: Syllabus Tracker */}
      {plannerTab === 'syllabus' && (
        <div className="dashboard-grid">
          
          {/* Main Syllabus chapters list */}
          <section className="card-buddy" style={{ padding: '30px' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '2px solid var(--border-light)', paddingBottom: '12px', marginBottom: '20px', flexWrap: 'wrap', gap: '10px'
            }}>
              <h3 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                <GraduationCap size={22} color="var(--color-purple)" /> Curriculum Syllabus Tracker
              </h3>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(Number(e.target.value))}
                  style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)',
                    fontFamily: 'var(--font-header)', fontSize: '0.85rem', fontWeight: 'bold', outline: 'none',
                    color: 'var(--color-green-dark)', cursor: 'pointer', backgroundColor: 'var(--bg-card)'
                  }}
                >
                  {classesList.map(cNum => (
                    <option key={cNum} value={cNum} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>Class {cNum}</option>
                  ))}
                </select>

                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)',
                    fontFamily: 'var(--font-header)', fontSize: '0.85rem', fontWeight: 'bold', outline: 'none',
                    color: 'var(--color-purple)', cursor: 'pointer', backgroundColor: 'var(--bg-card)'
                  }}
                  disabled={syllabusList.length === 0}
                >
                  {syllabusList.map(s => (
                    <option key={s.subject} value={s.subject} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>{s.subject}</option>
                  ))}
                  {syllabusList.length === 0 && (
                    <option value="" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>No Subjects</option>
                  )}
                </select>
              </div>
            </div>

            {/* Search Bar Input */}
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Search syllabus chapters & topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 42px',
                  borderRadius: 'var(--radius-sm)',
                  border: '2px solid var(--border-light)',
                  fontSize: '0.92rem',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)'
                }}
              />
              <Search 
                size={18} 
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1rem'
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {/* Results */}
            {searchQuery.trim() ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
                {filteredResults.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>No matching results.</p>
                ) : (
                  filteredResults.map((item, idx) => {
                    if (item.type === 'chapter') {
                      const total = item.topics.length;
                      const doneCount = item.topics.filter(t => completedTopics.includes(t)).length;
                      const allDone = total > 0 && doneCount === total;
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                            backgroundColor: allDone ? 'var(--color-purple-light)' : 'var(--bg-card)',
                            border: `2px solid ${allDone ? 'var(--color-purple)' : 'var(--border-light)'}`,
                            display: 'flex', justifyValue: 'space-between', alignItems: 'center'
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-purple)', fontWeight: 'bold' }}>CHAPTER • {item.subject}</span>
                            <h5 style={{ fontSize: '0.92rem', color: 'var(--text-main)', fontWeight: 'bold', margin: '2px 0' }}>{item.chapter}</h5>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Progress: {doneCount}/{total} mastered</span>
                          </div>
                          <button
                            onClick={() => toggleChapterCompleted(item.chapter, item.topics)}
                            className={`btn-3d ${allDone ? 'btn-3d-purple' : 'btn-3d-light'}`}
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          >
                            {allDone ? 'Mastered ✓' : 'Master Chapter'}
                          </button>
                        </div>
                      );
                    } else {
                      const isDone = completedTopics.includes(item.topic);
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleTopicCompleted(item.topic)}
                          style={{
                            padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                            backgroundColor: isDone ? 'var(--color-green-light)' : 'var(--bg-card)',
                            border: `2px solid ${isDone ? 'var(--color-green)' : 'var(--border-light)'}`,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px'
                          }}
                        >
                          <CheckCircle size={18} style={{ color: isDone ? 'var(--color-green)' : 'var(--text-muted)', flexShrink: 0 }} />
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-green-dark)', fontWeight: 'bold' }}>TOPIC • {item.subject} • {item.chapter}</span>
                            <p style={{ fontSize: '0.88rem', fontWeight: 'bold', color: isDone ? 'var(--color-green-dark)' : 'var(--text-main)', textDecoration: isDone ? 'line-through' : 'none' }}>{item.topic}</p>
                          </div>
                        </div>
                      );
                    }
                  })
                )}
              </div>
            ) : (
              loadingSyllabus ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading syllabus...</p>
              ) : currentSyllabus ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '420px', overflowY: 'auto' }}>
                  {currentSyllabus.chapters.map((ch, chIdx) => (
                    <div key={chIdx} style={{ border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '14px', backgroundColor: 'var(--bg-app)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h4 style={{ fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                          <BookOpen size={16} style={{ color: 'var(--color-purple)' }} /> {ch.name}
                        </h4>
                        <button 
                          onClick={() => toggleChapterCompleted(ch.name, ch.topics)}
                          className="btn-3d btn-3d-light"
                          style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                        >
                          Toggle Master
                        </button>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '22px' }}>
                        {ch.topics.map((tName, tIdx) => {
                          const isDone = completedTopics.includes(tName);
                          return (
                            <div 
                              key={tIdx} 
                              onClick={() => toggleTopicCompleted(tName)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                                borderRadius: 'var(--radius-sm)', backgroundColor: isDone ? 'var(--color-green-light)' : 'var(--bg-card)',
                                border: `1.5px solid ${isDone ? 'var(--color-green)' : 'var(--border-light)'}`,
                                cursor: 'pointer', transition: 'all 0.2s ease'
                              }}
                            >
                              <CheckCircle size={16} style={{ color: isDone ? 'var(--color-green)' : 'var(--text-muted)' }} />
                              <span style={{
                                fontSize: '0.85rem', fontWeight: '600',
                                color: isDone ? 'var(--color-green-dark)' : 'var(--text-main)',
                                textDecoration: isDone ? 'line-through' : 'none'
                              }}>{tName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No syllabus records found for Class {selectedClass}.</p>
              )
            )}
          </section>

          {/* Right Column Syllabus Guide */}
          <section className="card-buddy">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '15px' }}>
              📚 Master AP Boards
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.4', marginBottom: '15px' }}>
              Every time you check off all topics inside a chapter, we mark it as **Chapter Mastered**. 
              This feeds directly into the **Progress Analysis Agent** to calculate grade accuracies and unlocks badges in your cabinet.
            </p>
            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>CURRENT MASTERED TOPICS</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--color-green-dark)' }}>{completedTopics.length}</span>
            </div>
          </section>

        </div>
      )}

      {/* CLOCK TAB: Pomodoro Timer */}
      {plannerTab === 'clock' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'center', justifyContent: 'center' }}>
          
          <section className="card-buddy" style={{ textAlign: 'center', padding: '40px 30px', gridColumn: 'span 2', maxWidth: '650px', margin: '0 auto', width: '100%' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <Clock size={24} color="var(--color-green)" /> Mascot Study Clock
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '25px' }}>
              Select a time limit, focus on studying your syllabus, and earn coins/XP once the clock runs out!
            </p>

            {/* Timer Face */}
            <div style={{
              width: '200px', height: '200px', borderRadius: '50%', border: '8px solid var(--border-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px auto',
              position: 'relative', backgroundColor: 'var(--bg-app)', boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.05)'
            }}>
              <h2 style={{ fontSize: '3.2rem', color: timerRunning ? 'var(--color-green)' : 'var(--text-main)', fontFamily: 'var(--font-header)' }}>
                {formatTime(timeLeft)}
              </h2>
              <div style={{ position: 'absolute', bottom: '25px' }}>
                <Mascot size={55} expression={timerRunning ? 'thinking' : 'happy'} />
              </div>
            </div>

            {/* Time Presets */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '30px', flexWrap: 'wrap' }}>
              <button onClick={() => handleSetTimer(5)} className="btn-3d btn-3d-light" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>5 Mins</button>
              <button onClick={() => handleSetTimer(10)} className="btn-3d btn-3d-light" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>10 Mins</button>
              <button onClick={() => handleSetTimer(25)} className="btn-3d btn-3d-light" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>25 Mins (Pomodoro)</button>
            </div>

            {/* Action Controls */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className={`btn-3d ${timerRunning ? 'btn-3d-red' : 'btn-3d-green'}`}
                style={{ padding: '12px 28px', fontSize: '0.95rem', width: '140px' }}
              >
                {timerRunning ? <><Pause size={16} style={{ marginRight: '6px' }} /> Pause</> : <><Play size={16} style={{ marginRight: '6px' }} /> Start</>}
              </button>
              <button
                onClick={() => { setTimeLeft(initialTime); setTimerRunning(false); }}
                className="btn-3d btn-3d-light"
                style={{ padding: '12px 18px' }}
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </section>

        </div>
      )}

    </div>
  );
};
