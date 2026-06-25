import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  ShieldCheck, 
  UserX, 
  FileCheck2, 
  TrendingUp, 
  Clock, 
  Search, 
  FileText, 
  Trash2, 
  ChevronRight, 
  Sparkles,
  Layers,
  Award
} from 'lucide-react';

export const AdminDashboard = () => {
  const { triggerNotification } = useApp();
  const { logout } = useAuth();
  
  const [teachers, setTeachers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    avgConfidence: 0,
    totalTeachers: 0,
    pendingTeachers: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending-teachers'); // 'pending-teachers', 'all-teachers', 'stats'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProofFile, setSelectedProofFile] = useState(null); // Modal for viewing proofs/certificates
  
  const API_SERVER_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const teachersList = await api.getAdminTeachers();
      setTeachers(teachersList);
      
      const statsData = await api.getAdminStats();
      setStats(statsData);
    } catch (err) {
      console.error(err);
      triggerNotification('⚠️ Failed to load admin dashboard data.', 'red');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.approveTeacher(id);
      triggerNotification('✅ Teacher application approved successfully!', 'green');
      fetchData();
    } catch (err) {
      triggerNotification(err.message || 'Approval failed.', 'red');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to REJECT this teacher application?')) return;
    try {
      await api.rejectTeacher(id);
      triggerNotification('❌ Teacher application rejected.', 'yellow');
      fetchData();
    } catch (err) {
      triggerNotification(err.message || 'Rejection failed.', 'red');
    }
  };

  const handleSuspend = async (id) => {
    if (!window.confirm('Are you sure you want to SUSPEND this teacher account? They will lose access to the portal.')) return;
    try {
      await api.suspendTeacher(id);
      triggerNotification('🚫 Teacher account suspended.', 'red');
      fetchData();
    } catch (err) {
      triggerNotification(err.message || 'Suspension failed.', 'red');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to DELETE this application entirely? This cannot be undone.')) return;
    try {
      await api.deleteTeacherApplication(id);
      triggerNotification('🗑️ Application record deleted.', 'yellow');
      fetchData();
    } catch (err) {
      triggerNotification(err.message || 'Deletion failed.', 'red');
    }
  };

  const getFullDocUrl = (urlPath) => {
    if (!urlPath) return '#';
    if (urlPath.startsWith('http')) return urlPath;
    return `${API_SERVER_URL}${urlPath}`;
  };

  const filteredTeachers = teachers.filter(t => {
    // Exclude the current admin from lists
    if (t.role === 'admin') return false;
    
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.specialization.toLowerCase().includes(searchTerm.toLowerCase());
                          
    if (activeTab === 'pending-teachers') {
      return matchesSearch && t.status === 'pending';
    }
    return matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in" style={{ textAlign: 'left' }}>
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-800 text-white shadow-xl relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="bg-purple-500/30 text-purple-200 text-xs font-bold px-3 py-1 rounded-full border border-purple-400/20">
              System Admin Portal
            </span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Trust & Verification Hub</h1>
          <p className="text-purple-100 text-sm max-w-xl">
            Monitor teacher applications, verify credentials, and view AI accuracy analytics to maintain the highest standard of childhood education.
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex gap-3 z-10">
          <button 
            onClick={fetchData} 
            className="px-4 py-2 bg-white/10 hover:bg-white/20 active:scale-95 transition rounded-xl font-bold text-sm border border-white/10 flex items-center gap-2"
          >
            🔄 Refresh Hub
          </button>
          <button 
            onClick={logout} 
            className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 transition rounded-xl font-bold text-sm flex items-center gap-2"
          >
            🚪 Log Out
          </button>
        </div>
        
        {/* Visual Background blobs */}
        <div className="absolute right-[-10%] top-[-20%] w-80 h-80 bg-purple-600 rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute left-[30%] bottom-[-50%] w-60 h-60 bg-blue-500 rounded-full blur-3xl opacity-20 pointer-events-none" />
      </div>

      {/* Stats Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending Applications */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
            <Clock size={28} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Pending Teachers</span>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.pendingTeachers} Applicants</span>
          </div>
        </div>

        {/* Card 2: Approved Teachers */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={28} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Verified Teachers</span>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.totalTeachers} Active</span>
          </div>
        </div>

        {/* Card 3: AI Answers Review Queue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400">
            <Layers size={28} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Review Queue</span>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.pending} Answers</span>
          </div>
        </div>

        {/* Card 4: Average Confidence */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
            <TrendingUp size={28} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">AI Avg Confidence</span>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.avgConfidence}% Rating</span>
          </div>
        </div>
      </div>

      {/* Tabs and Searching */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('pending-teachers')}
            className={`px-4 py-2 font-bold text-sm rounded-xl transition ${
              activeTab === 'pending-teachers' 
                ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400' 
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            📋 Pending Applications ({teachers.filter(t => t.role === 'teacher' && t.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('all-teachers')}
            className={`px-4 py-2 font-bold text-sm rounded-xl transition ${
              activeTab === 'all-teachers' 
                ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400' 
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            👥 All Teachers ({teachers.filter(t => t.role === 'teacher').length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 font-bold text-sm rounded-xl transition ${
              activeTab === 'stats' 
                ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400' 
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            📊 Verification Statistics
          </button>
        </div>

        {activeTab !== 'stats' && (
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by name, expertise..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-500"
            />
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent" />
          <p className="text-slate-400 text-sm font-semibold">Loading Admin Dashboard data...</p>
        </div>
      ) : activeTab === 'stats' ? (
        /* STATS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Award className="text-purple-600" size={20} /> AI Ingestion & Accuracy Metrics
            </h3>
            
            {/* SVG Visual Progress Bar */}
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>VERIFICATION RATE (Approved / Total Questions)</span>
                  <span>{stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>PENDING TEACHER REVIEW RATIO</span>
                  <span>{stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 text-center">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <span className="text-xs font-bold text-slate-400 block">Total Questions</span>
                <span className="text-xl font-black text-slate-800 dark:text-slate-100">{stats.total}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <span className="text-xs font-bold text-slate-400 block">Approved</span>
                <span className="text-xl font-black text-slate-800 dark:text-slate-100">{stats.approved}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <span className="text-xs font-bold text-slate-400 block">Rejected</span>
                <span className="text-xl font-black text-slate-800 dark:text-slate-100">{stats.rejected}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="text-purple-600" size={20} /> Verification Accuracy Chart (Lightweight SVG)
            </h3>
            
            <div className="h-48 w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-xl p-4 relative">
              {stats.total === 0 ? (
                <p className="text-xs text-slate-400 font-bold">No AI Answer history generated yet to graph.</p>
              ) : (
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <circle cx="50" cy="50" r="35" fill="transparent" stroke="#f1f5f9" strokeWidth="15" />
                  <circle 
                    cx="50" cy="50" r="35" fill="transparent" 
                    stroke="#10b981" strokeWidth="15" 
                    strokeDasharray={`${(stats.approved / (stats.total || 1)) * 220} 220`}
                    strokeDashoffset="0"
                  />
                  <circle 
                    cx="50" cy="50" r="35" fill="transparent" 
                    stroke="#f59e0b" strokeWidth="15" 
                    strokeDasharray={`${(stats.pending / (stats.total || 1)) * 220} 220`}
                    strokeDashoffset={`-${(stats.approved / (stats.total || 1)) * 220}`}
                  />
                </svg>
              )}
              {stats.total > 0 && (
                <div className="absolute bottom-2 left-2 flex gap-3 text-[10px] font-bold text-slate-500">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Approved ({Math.round(stats.approved/stats.total*100)}%)</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-yellow-400 inline-block" /> Pending ({Math.round(stats.pending/stats.total*100)}%)</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block" /> Rejected ({Math.round(stats.rejected/stats.total*100)}%)</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every question asked by students generates an entry in the AIAnswers table. High-confidence answers (>=80%) are verified asynchronously, while low-confidence questions block immediate trust indicators until a teacher verifies them.
            </p>
          </div>
        </div>
      ) : (
        /* TEACHERS LIST VIEW */
        <div className="space-y-4">
          {filteredTeachers.length === 0 ? (
            <div className="py-20 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border-2 border-dashed border-slate-200 dark:border-slate-800">
              <Users size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No applications found</h3>
              <p className="text-xs text-slate-400 mt-1">There are no teacher records matching the search criteria or active tab.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredTeachers.map((teacher) => {
                let badgeColor = 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200';
                if (teacher.status === 'approved') badgeColor = 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200';
                if (teacher.status === 'rejected') badgeColor = 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200';
                if (teacher.status === 'suspended') badgeColor = 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-200';

                return (
                  <div 
                    key={teacher._id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6 transition hover:border-purple-300"
                  >
                    <div className="space-y-3 flex-1">
                      {/* Name & Badge Row */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">{teacher.name}</h3>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${badgeColor} uppercase tracking-wider`}>
                          {teacher.status}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">
                          Applied: {new Date(teacher.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Info Metadata */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs font-semibold text-slate-500">
                        <div>📧 Email: <span className="text-slate-800 dark:text-slate-200 font-bold">{teacher.email}</span></div>
                        <div>📞 Phone: <span className="text-slate-800 dark:text-slate-200 font-bold">{teacher.phone}</span></div>
                        <div>🎓 Degree: <span className="text-slate-800 dark:text-slate-200 font-bold">{teacher.qualification}</span></div>
                        <div>🔬 Expertise: <span className="text-purple-600 dark:text-purple-400 font-bold">{teacher.specialization}</span></div>
                        <div>🏫 School: <span className="text-slate-800 dark:text-slate-200 font-bold">{teacher.institution}</span></div>
                        {teacher.approvedBy && <div>Approved By: <span className="text-slate-800 dark:text-slate-200 font-bold">{teacher.approvedBy}</span></div>}
                      </div>

                      {/* Documents Attachments Review Section */}
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => setSelectedProofFile(getFullDocUrl(teacher.teacherIdProof))}
                          className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
                        >
                          <FileText size={14} /> Review Govt ID Proof
                        </button>
                        {teacher.certificates && teacher.certificates.length > 0 ? (
                          teacher.certificates.map((cert, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedProofFile(getFullDocUrl(cert))}
                              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
                            >
                              <FileCheck2 size={14} /> Review Certificate {index + 1}
                            </button>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No supplemental certificates uploaded</span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex md:flex-col gap-2 shrink-0 md:justify-end">
                      {teacher.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(teacher._id)}
                            className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl active:scale-95 transition flex items-center justify-center gap-1"
                          >
                            Approve Application
                          </button>
                          <button
                            onClick={() => handleReject(teacher._id)}
                            className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl active:scale-95 transition flex items-center justify-center gap-1"
                          >
                            Reject Application
                          </button>
                        </>
                      )}
                      
                      {teacher.status === 'approved' && (
                        <button
                          onClick={() => handleSuspend(teacher._id)}
                          className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl active:scale-95 transition flex items-center justify-center gap-1"
                        >
                          <UserX size={14} /> Suspend Access
                        </button>
                      )}
                      
                      {teacher.status === 'suspended' && (
                        <button
                          onClick={() => handleApprove(teacher._id)}
                          className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl active:scale-95 transition flex items-center justify-center gap-1"
                        >
                          Re-approve Teacher
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(teacher._id)}
                        className="px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 rounded-xl transition flex items-center justify-center gap-1"
                        title="Delete application permanently"
                      >
                        <Trash2 size={14} /> Delete Application
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL WINDOW FOR DOCUMENT VIEWING */}
      {selectedProofFile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden max-w-4xl w-full max-h-[85vh] shadow-2xl flex flex-col border border-slate-100 dark:border-slate-700">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <span className="font-black text-sm text-slate-700 dark:text-slate-300">Document Inspection Viewer</span>
              <div className="flex gap-2">
                <a 
                  href={selectedProofFile} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition"
                >
                  Open in New Tab ↗
                </a>
                <button 
                  onClick={() => setSelectedProofFile(null)} 
                  className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition"
                >
                  Close Viewer
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900 flex justify-center items-center p-4 min-h-[400px]">
              {selectedProofFile.toLowerCase().endsWith('.pdf') || selectedProofFile.includes('/pdf') ? (
                <iframe 
                  src={selectedProofFile} 
                  title="Credential PDF" 
                  className="w-full h-[60vh] border-0 rounded-xl"
                />
              ) : (
                <img 
                  src={selectedProofFile} 
                  alt="Credential Proof Doc" 
                  className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-md"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.parentNode.innerHTML = `
                      <div class="text-center p-6 space-y-2">
                        <p class="text-xs text-slate-400 font-bold">Failed to load file directly or it is a binary/PDF file.</p>
                        <a href="${selectedProofFile}" target="_blank" class="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl inline-block">Download / View File in New Tab</a>
                      </div>
                    `;
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
