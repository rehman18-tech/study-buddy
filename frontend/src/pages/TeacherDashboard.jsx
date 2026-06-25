import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  Search, 
  Filter, 
  Check, 
  X, 
  Edit3, 
  MessageSquare, 
  BookOpen, 
  GraduationCap, 
  Bookmark,
  ChevronRight,
  TrendingUp,
  Inbox
} from 'lucide-react';

export const TeacherDashboard = () => {
  const { triggerNotification } = useApp();
  const { user, logout } = useAuth();
  
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeQueue, setActiveQueue] = useState('pending'); // 'pending', 'approved', 'rejected'
  
  // Filtering and Searching
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  
  // Selected Answer for Review
  const [reviewItem, setReviewItem] = useState(null);
  const [editedAnswerText, setEditedAnswerText] = useState('');
  const [teacherComments, setTeacherComments] = useState('');
  const [referenceSource, setReferenceSource] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, [activeQueue, filterClass, filterSubject]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const filters = {
        class: filterClass,
        subject: filterSubject
      };
      
      let data = [];
      if (activeQueue === 'pending') {
        data = await api.getPendingAnswers(filters);
      } else if (activeQueue === 'approved') {
        data = await api.getApprovedAnswers(filters);
      } else {
        data = await api.getRejectedAnswers(filters);
      }
      setAnswers(data);
    } catch (err) {
      console.error(err);
      triggerNotification('⚠️ Error loading answer queues.', 'red');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (item) => {
    setReviewItem(item);
    setEditedAnswerText(item.answer);
    setTeacherComments(item.teacherComments || '');
    setReferenceSource(item.sources && item.sources.length > 0 ? item.sources.join(', ') : '');
  };

  const handleCloseReview = () => {
    setReviewItem(null);
    setEditedAnswerText('');
    setTeacherComments('');
    setReferenceSource('');
  };

  const handleAction = async (actionType) => {
    // actionType: 'approve', 'edit', 'reject'
    if (!reviewItem) return;
    
    setSubmitLoading(true);
    try {
      const reviewData = {
        action: actionType,
        answerText: actionType === 'edit' ? editedAnswerText : reviewItem.answer,
        teacherComments,
        sources: referenceSource ? referenceSource.split(',').map(s => s.trim()) : []
      };
      
      await api.reviewAnswer(reviewItem._id, reviewData);
      triggerNotification(`🎉 Answer successfully reviewed and marked as ${actionType === 'reject' ? 'rejected' : 'verified'}!`, 'green');
      handleCloseReview();
      fetchQueue();
    } catch (err) {
      triggerNotification(err.message || 'Error saving review.', 'red');
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredAnswers = answers.filter(a => {
    return a.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
           a.answer.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in" style={{ textAlign: 'left' }}>
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-800 text-white shadow-xl relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/30 text-emerald-200 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/20">
              Teacher Verification Portal
            </span>
            <span className="bg-white/10 text-emerald-100 text-xs font-bold px-2 py-0.5 rounded-md">
              Expert: {user?.specialization || 'All Subjects'}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Welcome, {user?.name || 'Teacher'}</h1>
          <p className="text-emerald-100 text-sm max-w-xl">
            You are logged in as a verified educator at <b>{user?.institution}</b>. Review, edit, and approve AI tutor responses to build trust in education.
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex gap-3 z-10">
          <button 
            onClick={fetchQueue} 
            className="px-4 py-2 bg-white/10 hover:bg-white/20 active:scale-95 transition rounded-xl font-bold text-sm border border-white/10"
          >
            🔄 Refresh Queues
          </button>
          <button 
            onClick={logout} 
            className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 transition rounded-xl font-bold text-sm"
          >
            Log Out
          </button>
        </div>
        
        <div className="absolute right-[-10%] top-[-20%] w-80 h-80 bg-teal-600 rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute left-[40%] bottom-[-50%] w-60 h-60 bg-emerald-500 rounded-full blur-3xl opacity-20 pointer-events-none" />
      </div>

      {/* Verification Layout Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns: Queues and Filters */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Queue Selectors */}
            <div className="flex gap-2">
              <button
                onClick={() => { setActiveQueue('pending'); handleCloseReview(); }}
                className={`px-3 py-1.5 font-bold text-xs rounded-xl transition ${
                  activeQueue === 'pending' 
                    ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' 
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                📥 Pending Review
              </button>
              <button
                onClick={() => { setActiveQueue('approved'); handleCloseReview(); }}
                className={`px-3 py-1.5 font-bold text-xs rounded-xl transition ${
                  activeQueue === 'approved' 
                    ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' 
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                ✅ Approved ({answers.length})
              </button>
              <button
                onClick={() => { setActiveQueue('rejected'); handleCloseReview(); }}
                className={`px-3 py-1.5 font-bold text-xs rounded-xl transition ${
                  activeQueue === 'rejected' 
                    ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' 
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                ❌ Rejected ({answers.length})
              </button>
            </div>

            {/* Filter selectors */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                <Filter size={14} /> Filters:
              </div>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="">All Classes</option>
                {[...Array(10).keys()].map(i => <option key={i+1} value={i+1}>Class {i+1}</option>)}
              </select>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="">All Subjects</option>
                {['Science', 'Mathematics', 'English', 'Social Studies'].map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search active queue by keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Answer Cards List */}
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
              <p className="text-slate-400 text-sm font-semibold">Loading questions list...</p>
            </div>
          ) : filteredAnswers.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border-2 border-dashed border-slate-200 dark:border-slate-800">
              <Inbox size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Queue is empty</h3>
              <p className="text-xs text-slate-400 mt-1">There are no answers in the "{activeQueue}" list matching your filters.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {filteredAnswers.map((item) => {
                let scoreColor = 'text-red-500 bg-red-50 dark:bg-red-950/20';
                if (item.confidenceScore >= 80) scoreColor = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20';
                else if (item.confidenceScore >= 60) scoreColor = 'text-amber-600 bg-amber-50 dark:bg-amber-950/20';

                const isSelected = reviewItem && reviewItem._id === item._id;

                return (
                  <div
                    key={item._id}
                    onClick={() => handleOpenReview(item)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-center justify-between gap-4 ${
                      isSelected 
                        ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10' 
                        : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-200'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                          Class {item.class} • {item.subject}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${scoreColor}`}>
                          Confidence: {item.confidenceScore}%
                        </span>
                        {item.chapter && item.chapter !== 'General' && (
                          <span className="text-[10px] text-slate-400 font-bold">
                            📂 {item.chapter}
                          </span>
                        )}
                      </div>
                      
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate pr-4">
                        Q: {item.question}
                      </h4>
                      <p className="text-xs text-slate-400 truncate">
                        Ans: {item.answer}
                      </p>
                    </div>
                    
                    <ChevronRight size={18} className="text-slate-400 shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Columns: Review / Inspection pane */}
        <div className="lg:col-span-1">
          {reviewItem ? (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 shadow-md space-y-4 animate-slide-in">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <GraduationCap className="text-emerald-600" size={18} /> Reviewing Response
                </h3>
                <button
                  onClick={handleCloseReview}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Question Preview */}
              <div className="space-y-1 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Student Question</span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                  {reviewItem.question}
                </p>
              </div>

              {/* Edited Answer Area */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Tutor Answer</span>
                  <span className="text-[10px] text-slate-400 italic">Edit text box below if needed</span>
                </div>
                <textarea
                  value={editedAnswerText}
                  onChange={(e) => setEditedAnswerText(e.target.value)}
                  className="w-full h-44 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                />
              </div>

              {/* Teacher Comments */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase flex items-center gap-1">
                  <MessageSquare size={12} /> Teacher Explanation / Remarks
                </span>
                <input
                  type="text"
                  placeholder="Explain your changes or add tips for the student..."
                  value={teacherComments}
                  onChange={(e) => setTeacherComments(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              {/* Source References */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase flex items-center gap-1">
                  <BookOpen size={12} /> Citation / References
                </span>
                <input
                  type="text"
                  placeholder="e.g. NCERT Science Class 5, Chapter 2 (separate with commas)"
                  value={referenceSource}
                  onChange={(e) => setReferenceSource(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  disabled={submitLoading}
                  onClick={() => handleAction('reject')}
                  className="px-2 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl active:scale-95 transition flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <X size={12} /> Reject
                </button>
                <button
                  disabled={submitLoading}
                  onClick={() => handleAction('edit')}
                  className="px-2 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl active:scale-95 transition flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Edit3 size={12} /> Save Edits
                </button>
                <button
                  disabled={submitLoading}
                  onClick={() => handleAction('approve')}
                  className="px-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl active:scale-95 transition flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Check size={12} /> Approve
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl py-24 space-y-2">
              <Bookmark className="mx-auto text-slate-300 dark:text-slate-700" size={32} />
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Select a question to review</h4>
              <p className="text-[10px] text-slate-400">Click on any question card from the queue on the left to review its content and verify it.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
