import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Mascot } from '../components/Mascot';
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
  Award,
  X,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Edit3,
  GraduationCap,
  School,
  Globe,
  Phone,
  Mail,
  UserPlus,
  BookOpen,
  Filter,
  Plus,
  Lock,
  AlertTriangle,
  Settings,
  Check,
  MessageSquare
} from 'lucide-react';

const countriesList = [
  { name: 'India', code: '+91', length: 10 },
  { name: 'United States', code: '+1', length: 10 },
  { name: 'United Kingdom', code: '+44', length: 10 },
  { name: 'Australia', code: '+61', length: 9 },
  { name: 'United Arab Emirates', code: '+971', length: 9 },
  { name: 'Singapore', code: '+65', length: 8 }
];

const availablePermissions = [
  { key: 'manage_users', label: 'Manage Student Profiles' },
  { key: 'verify_teachers', label: 'Verify Teacher Applications' },
  { key: 'manage_syllabus', label: 'Manage Syllabus & Curriculum' },
  { key: 'manage_content', label: 'Moderate Content & Announcements' }
];

export const AdminDashboard = ({ adminView = 'dashboard', setAdminView }) => {
  const { triggerNotification } = useApp();
  const { logout, user } = useAuth();
  
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [reports, setReports] = useState([]);
  const [answers, setAnswers] = useState([]); // Content Moderation Queue
  const [isReviewMaximized, setIsReviewMaximized] = useState(false);
  const [showAddTeacherPassword, setShowAddTeacherPassword] = useState(false);
  const [showAddAdminPassword, setShowAddAdminPassword] = useState(false);
  
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    avgConfidence: 0,
    totalTeachers: 0,
    pendingTeachers: 0
  });
  
  const [settings, setSettings] = useState({
    aiStudyPlanner: true,
    quizCenter: true,
    aiTeacherChat: true
  });
  const [healthStatus, setHealthStatus] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending-teachers'); // 'pending-teachers', 'all-teachers'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [selectedProofFile, setSelectedProofFile] = useState(null); // Proof view modal
  
  // Modals editing states
  const [editingStudent, setEditingStudent] = useState(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentEmail, setEditStudentEmail] = useState('');
  const [editStudentClass, setEditStudentClass] = useState(6);
  const [editStudentSchool, setEditStudentSchool] = useState('');
  const [editStudentBoard, setEditStudentBoard] = useState('SSC');
  const [editStudentLang, setEditStudentLang] = useState('English');
  const [editStudentContact, setEditStudentContact] = useState('');
  const [editStudentPin, setEditStudentPin] = useState('1234');

  const [editingTeacher, setEditingTeacher] = useState(null);
  const [editTeacherName, setEditTeacherName] = useState('');
  const [editTeacherEmail, setEditTeacherEmail] = useState('');
  const [editTeacherPhone, setEditTeacherPhone] = useState('');
  const [editTeacherCountry, setEditTeacherCountry] = useState('India');
  const [editTeacherQualification, setEditTeacherQualification] = useState('');
  const [editTeacherSpecialization, setEditTeacherSpecialization] = useState('Science');
  const [editTeacherInstitution, setEditTeacherInstitution] = useState('');
  const [editTeacherStatus, setEditTeacherStatus] = useState('pending');
  const [editTeacherRole, setEditTeacherRole] = useState('teacher');

  // Admin management registry states
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [addAdminName, setAddAdminName] = useState('');
  const [addAdminEmail, setAddAdminEmail] = useState('');
  const [addAdminPassword, setAddAdminPassword] = useState('');
  const [addAdminDept, setAddAdminDept] = useState('General');
  const [addAdminPerms, setAddAdminPerms] = useState([]);
  const [addAdminLoading, setAddAdminLoading] = useState(false);

  // Content moderation active item
  const [reviewItem, setReviewItem] = useState(null);
  const [editedAnswerText, setEditedAnswerText] = useState('');
  const [teacherComments, setTeacherComments] = useState('');
  const [referenceSource, setReferenceSource] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Announcements states
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [publishingAnn, setPublishingAnn] = useState(false);

  // Syllabus Manager state variables
  const [syllabusClass, setSyllabusClass] = useState(6);
  const [syllabusSubject, setSyllabusSubject] = useState('');
  const [classSyllabus, setClassSyllabus] = useState([]);
  const [syllabusLoading, setSyllabusLoading] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [activeChapterForTopic, setActiveChapterForTopic] = useState('');
  const [pendingSyllabuses, setPendingSyllabuses] = useState([]);
  const [ingestUploading, setIngestUploading] = useState(false);
  const [activeReviewItem, setActiveReviewItem] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);

  // Direct Teacher creation state variables
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [addTeacherName, setAddTeacherName] = useState('');
  const [addTeacherEmail, setAddTeacherEmail] = useState('');
  const [addTeacherPhoneCode, setAddTeacherPhoneCode] = useState('+91');
  const [addTeacherPhoneDigits, setAddTeacherPhoneDigits] = useState('');
  const [addTeacherCountry, setAddTeacherCountry] = useState('India');
  const [addTeacherQualification, setAddTeacherQualification] = useState('');
  const [addTeacherSpecialization, setAddTeacherSpecialization] = useState('Science');
  const [addTeacherInstitution, setAddTeacherInstitution] = useState('');
  const [addTeacherPassword, setAddTeacherPassword] = useState('');
  const [addTeacherLoading, setAddTeacherLoading] = useState(false);

  const API_SERVER_URL = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace('/api', '') 
    : (typeof window !== 'undefined' && (window.location.hostname !== 'localhost' || window.location.port === '5000')
        ? `${window.location.protocol}//${window.location.host}`
        : 'http://localhost:5000');

  const [seedingLoading, setSeedingLoading] = useState(false);

  const handleSeedSyllabus = async () => {
    if (!window.confirm("⚠️ WARNING: Seeding will clear any existing manual syllabus entries and replace them with the complete AP Board & CBSE syllabus for Classes 6-10. Do you want to proceed?")) {
      return;
    }
    setSeedingLoading(true);
    try {
      const res = await api.seedSyllabus();
      triggerNotification(`🎉 ${res.message}`, 'success');
      fetchSyllabusForClass(syllabusClass);
      fetchPendingSyllabuses();
    } catch (err) {
      console.error(err);
      triggerNotification(err.message || 'Failed to seed syllabus.', 'red');
    } finally {
      setSeedingLoading(false);
    }
  };

  const fetchDataForView = async () => {
    setLoading(true);
    try {
      if (adminView === 'dashboard') {
        const statsData = await api.getAdminStats();
        setStats(statsData || {
          total: 0, approved: 0, pending: 0, rejected: 0, avgConfidence: 0, totalTeachers: 0, pendingTeachers: 0
        });
        if (user?.role === 'admin') {
          const reportsData = await api.getReports();
          setReports(reportsData || []);
        }
      } else if (adminView === 'users') {
        const studentsList = await api.getAdminStudents();
        setStudents(studentsList || []);
      } else if (adminView === 'teachers') {
        const teachersList = await api.getAdminTeachers();
        setTeachers(teachersList || []);
      } else if (adminView === 'admins') {
        const adminsList = await api.getAdmins();
        setAdmins(adminsList || []);
      } else if (adminView === 'content') {
        const pendingAnswersList = await api.getPendingAnswers();
        setAnswers(pendingAnswersList || []);
      } else if (adminView === 'syllabus') {
        await fetchSyllabusForClass(syllabusClass);
        await fetchPendingSyllabuses();
      } else if (adminView === 'logs') {
        const logsData = await api.getAuditLogs();
        setAuditLogs(logsData || []);
      } else if (adminView === 'settings') {
        const settingsData = await api.getSystemSettingsPublic();
        setSettings(settingsData || {
          aiStudyPlanner: true,
          quizCenter: true,
          aiTeacherChat: true
        });
        const healthData = await api.getHealthStatus();
        setHealthStatus(healthData);
      } else if (adminView === 'announcements') {
        const annList = await api.getAnnouncements();
        setAnnouncements(annList || []);
      }
    } catch (err) {
      console.error(err);
      triggerNotification(`⚠️ Error loading panel data: ${err.message}`, 'red');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataForView();
  }, [adminView, syllabusClass]);

  // Syllabus Ingest queue
  const fetchPendingSyllabuses = async () => {
    try {
      const pendingData = await api.getPendingSyllabuses();
      setPendingSyllabuses(pendingData || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSyllabusForClass = async (classNum) => {
    setSyllabusLoading(true);
    try {
      const data = await api.getSyllabus(classNum);
      setClassSyllabus(data || []);
      if (data && data.length > 0) {
        setSyllabusSubject(data[0].subject);
      } else {
        setSyllabusSubject('');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('⚠️ Failed to load syllabus info.', 'red');
    } finally {
      setSyllabusLoading(false);
    }
  };

  // Teacher approvals
  const handleApproveTeacher = async (id) => {
    try {
      await api.approveTeacher(id);
      triggerNotification('✅ Teacher application approved successfully!', 'green');
      fetchDataForView();
    } catch (err) {
      triggerNotification(err.message || 'Approval failed.', 'red');
    }
  };

  const handleRejectTeacher = async (id) => {
    if (!window.confirm('Are you sure you want to REJECT this teacher application?')) return;
    try {
      await api.rejectTeacher(id);
      triggerNotification('❌ Teacher application rejected.', 'yellow');
      fetchDataForView();
    } catch (err) {
      triggerNotification(err.message || 'Rejection failed.', 'red');
    }
  };

  const handleSuspendTeacher = async (id) => {
    if (!window.confirm('Are you sure you want to SUSPEND this teacher account?')) return;
    try {
      await api.suspendTeacher(id);
      triggerNotification('🚫 Teacher account suspended.', 'red');
      fetchDataForView();
    } catch (err) {
      triggerNotification(err.message || 'Suspension failed.', 'red');
    }
  };

  const handleDeleteTeacher = async (id) => {
    if (!window.confirm('Are you sure you want to DELETE this application entirely?')) return;
    try {
      await api.deleteTeacherApplication(id);
      triggerNotification('🗑️ Application record deleted.', 'yellow');
      fetchDataForView();
    } catch (err) {
      triggerNotification(err.message || 'Deletion failed.', 'red');
    }
  };

  // Student edits
  const handleOpenEditStudent = (student) => {
    setEditingStudent(student);
    setEditStudentName(student.name);
    setEditStudentEmail(student.email);
    setEditStudentClass(student.studentProfile?.class || 6);
    setEditStudentSchool(student.studentProfile?.schoolName || '');
    setEditStudentBoard(student.studentProfile?.board || 'SSC');
    setEditStudentLang(student.studentProfile?.preferredLanguage || 'English');
    setEditStudentContact(student.studentProfile?.parentContact || '');
    setEditStudentPin(student.studentProfile?.parentPin || '1234');
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      const studentData = {
        name: editStudentName,
        email: editStudentEmail,
        studentProfile: {
          class: parseInt(editStudentClass),
          schoolName: editStudentSchool,
          board: editStudentBoard,
          preferredLanguage: editStudentLang,
          parentContact: editStudentContact,
          parentPin: editStudentPin
        }
      };
      await api.updateStudent(editingStudent._id, studentData);
      triggerNotification('🎓 Student profile updated successfully!', 'green');
      setEditingStudent(null);
      fetchDataForView();
    } catch (err) {
      triggerNotification(err.message || 'Failed to update student.', 'red');
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student account?')) return;
    try {
      await api.deleteStudent(id);
      triggerNotification('🗑️ Student account deleted.', 'yellow');
      fetchDataForView();
    } catch (err) {
      triggerNotification(err.message || 'Student deletion failed.', 'red');
    }
  };

  // Teacher edits
  const handleOpenEditTeacher = (teacher) => {
    setEditingTeacher(teacher);
    setEditTeacherName(teacher.name);
    setEditTeacherEmail(teacher.email);
    setEditTeacherPhone(teacher.phone || '');
    setEditTeacherCountry(teacher.country || 'India');
    setEditTeacherQualification(teacher.qualification || '');
    setEditTeacherSpecialization(teacher.specialization || 'Science');
    setEditTeacherInstitution(teacher.institution || '');
    setEditTeacherStatus(teacher.status || 'pending');
    setEditTeacherRole(teacher.role || 'teacher');
  };

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    try {
      const teacherData = {
        name: editTeacherName,
        email: editTeacherEmail,
        phone: editTeacherPhone,
        country: editTeacherCountry,
        qualification: editTeacherQualification,
        specialization: editTeacherSpecialization,
        institution: editTeacherInstitution,
        status: editTeacherStatus,
        role: editTeacherRole
      };
      await api.updateTeacher(editingTeacher._id, teacherData);
      triggerNotification('👥 Teacher profile updated successfully!', 'green');
      setEditingTeacher(null);
      fetchDataForView();
    } catch (err) {
      triggerNotification(err.message || 'Failed to update teacher.', 'red');
    }
  };

  // Admin account creation
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!addAdminName || !addAdminEmail || !addAdminPassword) {
      triggerNotification('Please fill in name, email, and password.', 'red');
      return;
    }
    setAddAdminLoading(true);
    try {
      await api.createAdmin({
        name: addAdminName,
        email: addAdminEmail,
        password: addAdminPassword,
        department: addAdminDept,
        permissions: addAdminPerms
      });
      triggerNotification('🛡️ New moderator account created successfully!', 'green');
      setAddAdminName('');
      setAddAdminEmail('');
      setAddAdminPassword('');
      setAddAdminDept('General');
      setAddAdminPerms([]);
      setShowAddAdmin(false);
      fetchDataForView();
    } catch (err) {
      triggerNotification('❌ Failed to create admin: ' + err.message, 'red');
    } finally {
      setAddAdminLoading(false);
    }
  };

  const handleToggleAdminStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await api.suspendAdmin(id, { status: nextStatus });
      triggerNotification(`Admin account marked as ${nextStatus}.`, 'green');
      fetchDataForView();
    } catch (err) {
      triggerNotification('Error suspending admin account: ' + err.message, 'red');
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (!window.confirm('Delete this admin account permanently?')) return;
    try {
      await api.deleteAdmin(id);
      triggerNotification('🗑️ Admin account removed.', 'yellow');
      fetchDataForView();
    } catch (err) {
      triggerNotification('Error removing admin account.', 'red');
    }
  };

  const handleTogglePerm = (permKey) => {
    if (addAdminPerms.includes(permKey)) {
      setAddAdminPerms(prev => prev.filter(k => k !== permKey));
    } else {
      setAddAdminPerms(prev => [...prev, permKey]);
    }
  };

  // Content Moderation Queue Action
  const handleOpenReview = (item) => {
    setReviewItem(item);
    setEditedAnswerText(item.answer);
    setTeacherComments(item.teacherComments || '');
    setReferenceSource(item.sources && item.sources.length > 0 ? item.sources.join(', ') : '');
  };

  const handleActionOnContent = async (actionType) => {
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
      triggerNotification(`🎉 Verified response marked as ${actionType}!`, 'green');
      setReviewItem(null);
      setIsReviewMaximized(false);
      fetchDataForView();
    } catch (err) {
      triggerNotification(err.message || 'Error saving review.', 'red');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Announcements publishing
  const handlePublishAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) {
      triggerNotification('Please enter both title and content.', 'red');
      return;
    }
    setPublishingAnn(true);
    try {
      await api.createAnnouncement({ title: newAnnTitle, content: newAnnContent });
      triggerNotification('📢 Announcement published successfully!', 'green');
      setNewAnnTitle('');
      setNewAnnContent('');
      fetchDataForView();
    } catch (err) {
      triggerNotification('❌ Failed to publish announcement: ' + err.message, 'red');
    } finally {
      setPublishingAnn(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Are you sure you want to remove this announcement?')) return;
    try {
      await api.deleteAnnouncement(id);
      triggerNotification('🗑️ Announcement removed.', 'yellow');
      fetchDataForView();
    } catch (err) {
      triggerNotification('Error deleting: ' + err.message, 'red');
    }
  };

  // Reports Queue resolving
  const handleResolveReport = async (id, status) => {
    try {
      await api.resolveReport(id, status);
      triggerNotification(`Report marked as ${status}.`, 'green');
      fetchDataForView();
    } catch (err) {
      triggerNotification('Error resolving report: ' + err.message, 'red');
    }
  };

  // Direct Teacher creation
  const handleCreateTeacherDirect = async (e) => {
    e.preventDefault();
    if (!addTeacherPhoneDigits || !addTeacherName || !addTeacherEmail || !addTeacherPassword) {
      triggerNotification('Please fill in name, email, password, and phone.', 'red');
      return;
    }
    setAddTeacherLoading(true);
    try {
      const fullPhone = `${addTeacherPhoneCode}${addTeacherPhoneDigits}`;
      await api.createTeacher({
        name: addTeacherName,
        email: addTeacherEmail,
        phone: fullPhone,
        password: addTeacherPassword,
        country: addTeacherCountry,
        qualification: addTeacherQualification,
        specialization: addTeacherSpecialization,
        institution: addTeacherInstitution
      });
      triggerNotification('🎉 Verified educator registered and pre-approved successfully!', 'green');
      setAddTeacherName('');
      setAddTeacherEmail('');
      setAddTeacherPhoneDigits('');
      setAddTeacherPassword('');
      setAddTeacherQualification('');
      setAddTeacherInstitution('');
      setShowAddTeacher(false);
      fetchDataForView();
    } catch (err) {
      triggerNotification(err.message || 'Educator registry failed.', 'red');
    } finally {
      setAddTeacherLoading(false);
    }
  };

  // Settings module toggles
  const handleToggleSetting = async (key, val) => {
    try {
      const updated = { ...settings, [key]: val };
      const res = await api.updateSystemSettings(updated);
      setSettings(res.settings || updated);
      triggerNotification('🔧 Platform setting updated successfully!', 'green');
    } catch (err) {
      triggerNotification('❌ Failed to update settings: ' + err.message, 'red');
    }
  };

  // Syllabus Ingest
  const handleAddChapter = async (e) => {
    e.preventDefault();
    if (!newChapterName.trim() || !syllabusSubject) {
      triggerNotification('Please input chapter name and verify subject is active.', 'red');
      return;
    }
    try {
      const payload = {
        classNum: syllabusClass,
        subjectName: syllabusSubject,
        chapterName: newChapterName.trim(),
        topicName: 'General Introduction'
      };
      await api.addSyllabusTopic(payload);
      triggerNotification('📂 New chapter successfully added!', 'green');
      setNewChapterName('');
      fetchSyllabusForClass(syllabusClass);
    } catch (err) {
      triggerNotification(err.message || 'Failed to add chapter.', 'red');
    }
  };

  const handleAddTopic = async (chapterName) => {
    if (!newTopicName.trim()) {
      triggerNotification('Please enter a topic name.', 'red');
      return;
    }
    try {
      const payload = {
        classNum: syllabusClass,
        subjectName: syllabusSubject,
        chapterName: chapterName,
        topicName: newTopicName.trim()
      };
      await api.addSyllabusTopic(payload);
      triggerNotification('✨ Topic added successfully to curriculum!', 'green');
      setNewTopicName('');
      setActiveChapterForTopic('');
      fetchSyllabusForClass(syllabusClass);
    } catch (err) {
      triggerNotification(err.message || 'Failed to add topic.', 'red');
    }
  };

  const handleDeleteTopic = async (chapterName, topicName) => {
    if (!window.confirm(`Are you sure you want to remove topic "${topicName}"?`)) return;
    try {
      const payload = {
        classNum: syllabusClass,
        subjectName: syllabusSubject,
        chapterName: chapterName,
        topicName: topicName
      };
      await api.deleteSyllabusTopic(payload);
      triggerNotification('🗑️ Topic deleted.', 'yellow');
      fetchSyllabusForClass(syllabusClass);
    } catch (err) {
      triggerNotification(err.message || 'Failed to delete topic.', 'red');
    }
  };

  const handleDeleteChapter = async (chapterName) => {
    if (!window.confirm(`Are you sure you want to delete chapter "${chapterName}" and ALL of its topics?`)) return;
    try {
      const payload = {
        classNum: syllabusClass,
        subjectName: syllabusSubject,
        chapterName: chapterName
      };
      await api.deleteSyllabusChapter(payload);
      triggerNotification('🗑️ Chapter deleted successfully.', 'yellow');
      fetchSyllabusForClass(syllabusClass);
    } catch (err) {
      triggerNotification(err.message || 'Failed to delete chapter.', 'red');
    }
  };

  const handleDeleteSubject = async () => {
    if (!window.confirm(`⚠️ DANGER: Are you sure you want to delete the entire "${syllabusSubject}" subject?`)) return;
    try {
      const payload = {
        classNum: syllabusClass,
        subjectName: syllabusSubject
      };
      await api.deleteSyllabusSubject(payload);
      triggerNotification('🗑️ Subject deleted.', 'red');
      setSyllabusSubject('');
      fetchSyllabusForClass(syllabusClass);
    } catch (err) {
      triggerNotification(err.message || 'Failed to delete subject.', 'red');
    }
  };

  const handleIngestPDFs = async (files) => {
    setIngestUploading(true);
    try {
      const res = await api.uploadSyllabusPDFs(files);
      triggerNotification(res.message || '📚 Textbook PDF uploaded successfully!', 'purple');
      fetchPendingSyllabuses();
    } catch (err) {
      triggerNotification(err.message || 'PDF upload failed.', 'red');
    } finally {
      setIngestUploading(false);
    }
  };

  const handleDeletePending = async (id) => {
    if (!window.confirm('Delete this ingestion entry?')) return;
    try {
      await api.deletePendingSyllabus(id);
      triggerNotification('🗑️ Extraction record removed.', 'yellow');
      if (activeReviewItem && activeReviewItem._id === id) setActiveReviewItem(null);
      fetchPendingSyllabuses();
    } catch (err) {
      triggerNotification(err.message || 'Delete failed.', 'red');
    }
  };

  const handleApproveSyllabus = async (id) => {
    try {
      await api.approveSyllabus(id);
      triggerNotification('🎉 Syllabus approved and published!', 'green');
      setActiveReviewItem(null);
      fetchPendingSyllabuses();
      fetchSyllabusForClass(syllabusClass);
    } catch (err) {
      triggerNotification(err.message || 'Approval failed.', 'red');
    }
  };

  const handleRejectSyllabus = async (id) => {
    try {
      await api.rejectSyllabus(id);
      triggerNotification('⚠️ Syllabus rejected.', 'yellow');
      setActiveReviewItem(null);
      fetchPendingSyllabuses();
    } catch (err) {
      triggerNotification(err.message || 'Rejection failed.', 'red');
    }
  };

  const handleJsonFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setBulkUploadFile(e.target.files[0]);
    }
  };

  const handleUploadSyllabusJson = async () => {
    if (!bulkUploadFile) return;
    setBulkUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!Array.isArray(parsed)) {
          throw new Error('Syllabus JSON file must contain a root-level array of records.');
        }
        await api.uploadSyllabus(parsed);
        triggerNotification('🚀 Database syllabus bulk import completed!', 'purple');
        setBulkUploadFile(null);
        fetchSyllabusForClass(syllabusClass);
      } catch (err) {
        triggerNotification('❌ Import failed: ' + err.message, 'red');
      } finally {
        setBulkUploading(false);
      }
    };
    reader.readAsText(bulkUploadFile);
  };

  const getFullDocUrl = (urlPath) => {
    if (!urlPath) return '#';
    if (urlPath.startsWith('http')) return urlPath;
    return `${API_SERVER_URL}${urlPath}`;
  };

  const getHeaderDetails = () => {
    switch (adminView) {
      case 'dashboard':
        return {
          title: user.role === 'super_admin' ? 'Trust & Verification Hub' : 'Moderator Reports Queue',
          subtitle: user.role === 'super_admin' 
            ? 'Monitor verification metrics, check platform status logs, and view AI accuracy details.' 
            : 'View outstanding student reports, parents block requests, and general system issues.',
          badge: 'Super Admin Portal'
        };
      case 'users':
        return {
          title: user.role === 'super_admin' ? 'Student & Parent Profiles Directory' : 'Student Issues & Locker PINs',
          subtitle: 'Search user accounts, view active progress stats, and reset parent pin codes.',
          badge: 'User Directory'
        };
      case 'teachers':
        return {
          title: user.role === 'super_admin' ? 'Teacher Verification Applications' : 'Verified Teacher Monitoring',
          subtitle: 'Inspect educator applications, review government documents, and verify credentials.',
          badge: 'Educator Registry'
        };
      case 'admins':
        return {
          title: 'System Moderators & Admins Control',
          subtitle: 'Register new admin moderators, configure access permissions, and audit departments.',
          badge: 'Moderator Controls'
        };
      case 'content':
        return {
          title: 'AI Answer Content Moderation',
          subtitle: 'Inspect and verify AI-generated answers to ensure accurate responses for students.',
          badge: 'Answer Moderation'
        };
      case 'syllabus':
        return {
          title: 'Syllabus & Curriculum Manager',
          subtitle: 'Import curriculum datasets, upload textbook PDFs, and manage subjects, chapters, and topics.',
          badge: 'Curriculum Control'
        };
      case 'logs':
        return {
          title: 'Security Audit Logs',
          subtitle: 'Audit sensitive database actions, role changes, and admin operations timeline.',
          badge: 'Audit Trails'
        };
      case 'settings':
        return {
          title: 'System Toggles & Modules',
          subtitle: 'Enable or disable interactive student modules (planner, quiz center, AI teacher chat) globally.',
          badge: 'System Controls'
        };
      case 'announcements':
        return {
          title: 'Announcements Board',
          subtitle: 'Publish custom notifications that display instantly at the top of the Student Dashboard.',
          badge: 'Announcements Board'
        };
      default:
        return { title: 'Admin Control Panel', subtitle: '', badge: 'Admin Hub' };
    }
  };

  const header = getHeaderDetails();

  // Filters calculations
  const filteredTeachers = teachers.filter(t => {
    if (t.role === 'admin' || t.role === 'super_admin') return false;
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCountry = filterCountry ? t.country === filterCountry : true;
    const matchesSubject = filterSubject ? t.specialization.toLowerCase() === filterSubject.toLowerCase() : true;
    
    if (activeTab === 'pending-teachers') {
      return matchesSearch && matchesCountry && matchesSubject && t.status === 'pending';
    }
    return matchesSearch && matchesCountry && matchesSubject;
  });

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.studentProfile?.schoolName && s.studentProfile.schoolName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const filteredLogs = auditLogs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    return log.action.toLowerCase().includes(searchLower) ||
           log.performedBy.toLowerCase().includes(searchLower) ||
           (log.targetUser && log.targetUser.toLowerCase().includes(searchLower));
  });

  const activeSubjectData = classSyllabus.find(s => s.subject === syllabusSubject);
  const totalChaptersCount = classSyllabus.reduce((acc, sub) => acc + (sub.chapters?.length || 0), 0);
  const totalSubjectsList = classSyllabus.map(s => s.subject);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', textAlign: 'left' }}>
      
      {/* Dynamic Header Banner */}
      <div 
        className="card-buddy"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, var(--color-purple-dark) 0%, #4f46e5 100%)',
          color: '#ffffff',
          border: '2px solid var(--color-purple)',
          boxShadow: '0 8px 0 var(--shadow-color)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              padding: '4px 12px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              {header.badge}
            </span>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34d399', animation: 'pulse 2s infinite' }} />
          </div>
          <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: 800, fontFamily: 'var(--font-header)' }}>
            {header.title}
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#e0e7ff', margin: 0, opacity: 0.9 }}>
            {header.subtitle}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', zIndex: 10 }}>
          <button 
            onClick={fetchDataForView} 
            className="btn-3d btn-3d-light btn-3d-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🔄 Refresh View
          </button>
          <button 
            onClick={logout} 
            className="btn-3d btn-3d-red btn-3d-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🚪 Log Out
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card-buddy" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div className="inline-block animate-spin" style={{ display: 'inline-block', width: '32px', height: '32px', border: '4px solid var(--color-purple)', borderTopColor: 'transparent', borderRadius: '50%' }} />
          <p style={{ marginTop: '15px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>Loading dashboard content...</p>
        </div>
      ) : (
        <>
          {/* VIEW 1: SUPER ADMIN ANALYTICS DASHBOARD */}
          {adminView === 'dashboard' && user.role === 'super_admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {/* Stats Summary Cards Grid */}
              <section style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '20px'
              }}>
                <div className="card-buddy"
                     style={{ 
                       display: 'flex', alignItems: 'center', gap: '16px',
                       background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)', 
                       borderColor: '#ffe0b2' 
                     }}>
                  <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.7)', color: '#ff6d00', display: 'flex', shrink: 0 }}>
                    <Clock size={28} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', color: '#ff6d00', letterSpacing: '0.5px' }}>Pending Teachers</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#e65100', fontFamily: 'var(--font-header)' }}>{stats.pendingTeachers} Applicants</span>
                  </div>
                </div>

                <div className="card-buddy"
                     style={{ 
                       display: 'flex', alignItems: 'center', gap: '16px',
                       background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', 
                       borderColor: '#c8e6c9' 
                     }}>
                  <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.7)', color: '#2e7d32', display: 'flex', shrink: 0 }}>
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', color: '#2e7d32', letterSpacing: '0.5px' }}>Active Teachers</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1b5e20', fontFamily: 'var(--font-header)' }}>{stats.totalTeachers} Active</span>
                  </div>
                </div>

                <div className="card-buddy"
                     style={{ 
                       display: 'flex', alignItems: 'center', gap: '16px',
                       background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)', 
                       borderColor: '#e1bee7' 
                     }}>
                  <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.7)', color: '#7b1fa2', display: 'flex', shrink: 0 }}>
                    <Layers size={28} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', color: '#7b1fa2', letterSpacing: '0.5px' }}>Review Queue</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#4a148c', fontFamily: 'var(--font-header)' }}>{stats.pending} Answers</span>
                  </div>
                </div>

                <div className="card-buddy"
                     style={{ 
                       display: 'flex', alignItems: 'center', gap: '16px',
                       background: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)', 
                       borderColor: '#b2ebf2' 
                     }}>
                  <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.7)', color: '#0097a7', display: 'flex', shrink: 0 }}>
                    <TrendingUp size={28} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', color: '#0097a7', letterSpacing: '0.5px' }}>AI Accuracy</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#006064', fontFamily: 'var(--font-header)' }}>{stats.avgConfidence}% Rating</span>
                  </div>
                </div>
              </section>

              {/* Main Analytics Content */}
              <div className="dashboard-grid">
                
                {/* Accuracy graph */}
                <div className="card-buddy" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '10px', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', margin: 0 }}>
                      <TrendingUp className="text-indigo-600" size={20} /> AI Verification Performance
                    </h3>
                  </div>
                  
                  <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', padding: '16px', border: '2px solid var(--border-light)', position: 'relative' }}>
                    {stats.total === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold', textAlign: 'center' }}>No AI Answer history generated yet to graph.</p>
                    ) : (
                      <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                        <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="35" fill="transparent" stroke="var(--border-light)" strokeWidth="12" />
                          <circle 
                            cx="50" cy="50" r="35" fill="transparent" 
                            stroke="var(--color-green)" strokeWidth="12" 
                            strokeDasharray={`${(stats.approved / (stats.total || 1)) * 220} 220`}
                            strokeDashoffset="0"
                            strokeLinecap="round"
                          />
                          <circle 
                            cx="50" cy="50" r="35" fill="transparent" 
                            stroke="var(--color-yellow)" strokeWidth="12" 
                            strokeDasharray={`${(stats.pending / (stats.total || 1)) * 220} 220`}
                            strokeDashoffset={`-${(stats.approved / (stats.total || 1)) * 220}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1 }}>{stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>Verified</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    <div style={{ padding: '10px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontSize: '0.65rem' }}>Total Questions</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-main)' }}>{stats.total}</span>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)' }}>
                      <span style={{ color: 'var(--color-green-dark)', display: 'block', textTransform: 'uppercase', fontSize: '0.65rem' }}>Approved</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-green-dark)' }}>{stats.approved}</span>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)' }}>
                      <span style={{ color: 'var(--color-yellow-dark)', display: 'block', textTransform: 'uppercase', fontSize: '0.65rem' }}>Pending Review</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-yellow-dark)' }}>{stats.pending}</span>
                    </div>
                  </div>
                </div>

                {/* DB Health check */}
                <div className="card-buddy" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '10px', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', margin: 0 }}>
                      <ShieldCheck className="text-emerald-500" size={20} /> Database & System Status
                    </h3>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, fontSize: '0.82rem', fontWeight: 'bold' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1.5px solid var(--border-light)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Database Engine:</span>
                      <span style={{ color: 'var(--text-main)' }}>{healthStatus?.database || 'JSON Mock DB'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1.5px solid var(--border-light)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>System Uptime:</span>
                      <span style={{ color: 'var(--text-main)' }}>{healthStatus?.uptime || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1.5px solid var(--border-light)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Status Check:</span>
                      <span style={{ backgroundColor: 'var(--color-green-light)', color: 'var(--color-green-dark)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem' }}>HEALTHY</span>
                    </div>
                  </div>
                  
                  <div style={{ padding: '16px', borderRadius: 'var(--radius-sm)', border: '2.5px solid var(--color-green)', backgroundColor: 'var(--color-green-light)', display: 'flex', gap: '15px', alignItems: 'start', marginTop: '10px' }}>
                    <Mascot size={52} expression="happy" className="animate-mascot" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <h4 style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-green-dark)', margin: 0 }}>Super Admin Info</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-green-dark)', margin: 0, fontWeight: 'bold', lineHeight: 1.4 }}>
                        Platform modules can be adjusted instantly in Settings to enable/disable AI capabilities.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
                               {/* VIEW 2: STANDARD ADMIN REPORTS QUEUE */}
          {adminView === 'dashboard' && user.role === 'admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <section className="card-buddy">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '10px', marginBottom: '15px' }}>
                  <h3 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                    <AlertTriangle className="text-red-500 animate-pulse" size={22} /> Student Issue Tickets
                  </h3>
                </div>
                {reports.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>
                    No outstanding complaints or reports from students.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {reports.map((item) => (
                      <div 
                        key={item._id} 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '15px',
                          padding: '16px',
                          borderRadius: 'var(--radius-sm)',
                          border: '2.5px solid var(--border-light)',
                          backgroundColor: 'var(--bg-card)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{
                              backgroundColor: 'var(--color-red-light)',
                              color: 'var(--color-red-dark)',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              textTransform: 'uppercase'
                            }}>
                              {item.type}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reported by: <b>{item.reportedBy}</b></span>
                          </div>
                          <p style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>{item.content}</p>
                          {item.targetItem && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target Item ID: {item.targetItem}</span>}
                        </div>
                        {item.status === 'open' ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => handleResolveReport(item._id, 'resolved')}
                              className="btn-3d btn-3d-green btn-3d-sm"
                            >
                              Resolve
                            </button>
                            <button 
                              onClick={() => handleResolveReport(item._id, 'ignored')}
                              className="btn-3d btn-3d-light btn-3d-sm"
                            >
                              Ignore
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Resolved</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* VIEW 3: USER MANAGEMENT / STUDENT locker */}
          {adminView === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <section className="card-buddy">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1.5px solid var(--border-light)', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                    <Users className="text-purple-600" size={22} /> {user.role === 'super_admin' ? 'All Registered Student Accounts' : 'Student Profiles Directory'}
                  </h3>
                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input 
                      type="text" 
                      placeholder="Search name, school, email..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="buddy-filter-input-student"
                      style={{ paddingLeft: '36px', minHeight: '34px', fontSize: '0.8rem', width: '100%' }}
                    />
                  </div>
                </div>

                {filteredStudents.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>
                    No student records found.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    {filteredStudents.map((student) => (
                      <div 
                        key={student._id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '15px',
                          padding: '16px',
                          borderRadius: 'var(--radius-sm)',
                          border: '2.5px solid var(--border-light)',
                          backgroundColor: 'var(--bg-card)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '8px' }}>
                            <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 'bold' }}>{student.name}</h4>
                            <span style={{
                              backgroundColor: 'var(--color-purple-light)',
                              color: 'var(--color-purple-dark)',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              padding: '2px 8px',
                              borderRadius: '6px'
                            }}>
                              Class {student.studentProfile?.class || 'N/A'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            <div>📧 Email: <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{student.email}</span></div>
                            <div>🏫 School: <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{student.studentProfile?.schoolName || 'Not Set'}</span></div>
                            <div>📂 Board: <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{student.studentProfile?.board || 'SSC'}</span></div>
                            <div>🗣️ Study Medium: <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{student.studentProfile?.preferredLanguage || 'English'}</span></div>
                            <div>📞 Parent Phone: <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{student.studentProfile?.parentContact || 'Not Set'}</span></div>
                            
                            <div style={{
                              padding: '10px',
                              borderRadius: '12px',
                              backgroundColor: 'var(--color-yellow-light)',
                              border: '1.5px solid var(--color-yellow)',
                              color: 'var(--color-yellow-dark)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: '8px',
                              fontWeight: 'bold'
                            }}>
                              <span>🔑 Parent Lock PIN:</span>
                              <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>{student.studentProfile?.parentPin || '1234'}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.72rem', fontWeight: 'bold' }}>
                              <div style={{ color: '#e65100' }}>🔥 Streak: {student.studentProfile?.streak || 0}</div>
                              <div style={{ color: 'var(--color-purple)' }}>🏆 XP: {student.studentProfile?.xp || 0}</div>
                              <div style={{ color: 'var(--color-yellow-dark)' }}>🪙 Coins: {student.studentProfile?.coins || 0}</div>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1.5px solid var(--border-light)' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditStudent(student)}
                            className="btn-3d btn-3d-blue btn-3d-sm"
                          >
                            Edit Locker
                          </button>
                          {user.role === 'super_admin' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(student._id)}
                              className="btn-3d btn-3d-red btn-3d-sm"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
                      {/* VIEW 4: TEACHER VERIFICATION / monitoring */}
          {adminView === 'teachers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <section className="card-buddy">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: '10px', borderBottom: '1.5px solid var(--border-light)', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                    <School className="text-purple-600" size={22} /> {user.role === 'super_admin' ? 'Teacher Applications & Registry' : 'Active Verified Educators'}
                  </h3>
                  
                  {user.role === 'super_admin' && (
                    <button 
                      onClick={() => setShowAddTeacher(true)}
                      className="btn-3d btn-3d-green btn-3d-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <UserPlus size={14} /> Add Pre-Approved Teacher
                    </button>
                  )}
                </div>

                {user.role === 'super_admin' && (
                  <div style={{
                    display: 'flex',
                    backgroundColor: 'var(--bg-app)',
                    padding: '6px',
                    borderRadius: 'var(--radius-sm)',
                    border: '2px solid var(--border-light)',
                    gap: '8px',
                    marginBottom: '20px',
                    width: 'fit-content'
                  }}>
                    <button 
                      onClick={() => setActiveTab('pending-teachers')} 
                      type="button"
                      style={{
                        padding: '8px 16px',
                        fontFamily: 'var(--font-header)',
                        fontWeight: 'bold',
                        fontSize: '0.8rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: 'none',
                        backgroundColor: activeTab === 'pending-teachers' ? 'var(--bg-card)' : 'transparent',
                        color: activeTab === 'pending-teachers' ? 'var(--color-purple-dark)' : 'var(--text-muted)',
                        boxShadow: activeTab === 'pending-teachers' ? '0 3px 0 var(--shadow-color)' : 'none'
                      }}
                    >
                      Pending ({teachers.filter(t => t.role === 'teacher' && t.status === 'pending').length})
                    </button>
                    <button 
                      onClick={() => setActiveTab('all-teachers')} 
                      type="button"
                      style={{
                        padding: '8px 16px',
                        fontFamily: 'var(--font-header)',
                        fontWeight: 'bold',
                        fontSize: '0.8rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: 'none',
                        backgroundColor: activeTab === 'all-teachers' ? 'var(--bg-card)' : 'transparent',
                        color: activeTab === 'all-teachers' ? 'var(--color-purple-dark)' : 'var(--text-muted)',
                        boxShadow: activeTab === 'all-teachers' ? '0 3px 0 var(--shadow-color)' : 'none'
                      }}
                    >
                      All ({teachers.filter(t => t.role === 'teacher').length})
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input 
                      type="text" 
                      placeholder="Search educator name, subject..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="buddy-filter-input-student"
                      style={{ paddingLeft: '36px', minHeight: '34px', fontSize: '0.8rem', width: '100%' }}
                    />
                  </div>
                  <select 
                    value={filterCountry} 
                    onChange={e => setFilterCountry(e.target.value)}
                    className="buddy-filter-input-student"
                    style={{ minHeight: '34px', fontSize: '0.8rem', width: '150px' }}
                  >
                    <option value="">All Countries</option>
                    {countriesList.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                {filteredTeachers.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>No teacher profiles found.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                    {filteredTeachers.map((teacher) => {
                      let statusColor = 'var(--color-purple-dark)';
                      let statusBg = 'var(--color-purple-light)';
                      if (teacher.status === 'approved') {
                        statusColor = 'var(--color-green-dark)';
                        statusBg = 'var(--color-green-light)';
                      } else if (teacher.status === 'suspended') {
                        statusColor = 'var(--text-muted)';
                        statusBg = 'var(--bg-app)';
                      }

                      return (
                        <div 
                          key={teacher._id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '15px',
                            padding: '16px',
                            borderRadius: 'var(--radius-sm)',
                            border: '2.5px solid var(--border-light)',
                            backgroundColor: 'var(--bg-card)',
                            marginTop: '5px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <h4 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 'bold' }}>{teacher.name}</h4>
                              <span style={{
                                backgroundColor: statusBg,
                                color: statusColor,
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                textTransform: 'uppercase'
                              }}>
                                {teacher.status}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Joined: {new Date(teacher.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                            <div>📧 Email: <span style={{ color: 'var(--text-main)' }}>{teacher.email}</span></div>
                            <div>📞 Phone: <span style={{ color: 'var(--text-main)' }}>{teacher.phone}</span></div>
                            <div>🎓 Degree: <span style={{ color: 'var(--text-main)' }}>{teacher.qualification}</span></div>
                            <div>🔬 Specialty: <span style={{ color: 'var(--color-purple-dark)' }}>{teacher.specialization}</span></div>
                            <div>🏫 Institution: <span style={{ color: 'var(--text-main)' }}>{teacher.institution}</span></div>
                            <div>🌍 Country: <span style={{ color: 'var(--text-main)' }}>{teacher.country}</span></div>
                          </div>

                          {/* Verification files review */}
                          {user.role === 'super_admin' && teacher.teacherIdProof && (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setSelectedProofFile(getFullDocUrl(teacher.teacherIdProof))}
                                className="btn-3d btn-3d-light btn-3d-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <FileText size={12} /> Inspect Govt ID
                              </button>
                              {teacher.certificates && teacher.certificates.map((c, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setSelectedProofFile(getFullDocUrl(c))}
                                  className="btn-3d btn-3d-light btn-3d-sm"
                                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <FileCheck2 size={12} /> Inspect Cert {i + 1}
                                </button>
                              ))}
                            </div>
                          )}

                          {user.role === 'super_admin' && (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1.5px solid var(--border-light)', paddingTop: '10px', flexWrap: 'wrap' }}>
                              {teacher.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApproveTeacher(teacher._id)}
                                    className="btn-3d btn-3d-green btn-3d-sm"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectTeacher(teacher._id)}
                                    className="btn-3d btn-3d-red btn-3d-sm"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {teacher.status === 'approved' && (
                                <button
                                  onClick={() => handleSuspendTeacher(teacher._id)}
                                  className="btn-3d btn-3d-light btn-3d-sm"
                                >
                                  Suspend
                                </button>
                              )}
                              {teacher.status === 'suspended' && (
                                <button
                                  onClick={() => handleApproveTeacher(teacher._id)}
                                  className="btn-3d btn-3d-green btn-3d-sm"
                                >
                                  Activate
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEditTeacher(teacher)}
                                className="btn-3d btn-3d-blue btn-3d-sm"
                              >
                                Edit Profile
                              </button>
                              <button
                                onClick={() => handleDeleteTeacher(teacher._id)}
                                className="btn-3d btn-3d-red btn-3d-sm"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* VIEW 5: ADMIN/MODERATORS LIST */}
          {adminView === 'admins' && user.role === 'super_admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <section className="card-buddy">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1.5px solid var(--border-light)', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                    <Lock className="text-purple-600" size={22} /> Platform Moderators & Admins
                  </h3>
                  <button 
                    onClick={() => setShowAddAdmin(true)}
                    className="btn-3d btn-3d-green btn-3d-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} /> Register Moderator
                  </button>
                </div>

                {admins.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>
                    No moderator accounts created yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {admins.map((adm) => (
                      <div 
                        key={adm._id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          padding: '16px',
                          borderRadius: 'var(--radius-sm)',
                          border: '2.5px solid var(--border-light)',
                          backgroundColor: 'var(--bg-card)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '6px' }}>
                          <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 'bold' }}>{adm.name}</h4>
                          <span style={{
                            backgroundColor: 'var(--color-purple-light)',
                            color: 'var(--color-purple-dark)',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            textTransform: 'uppercase'
                          }}>
                            {adm.role}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          <div>📧 Email: <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{adm.email}</span></div>
                          <div>🏢 Department: <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{adm.adminProfile?.department || 'General'}</span></div>
                          
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold' }}>Permissions:</span>
                            {adm.adminProfile?.permissions && adm.adminProfile.permissions.length > 0 ? (
                              adm.adminProfile.permissions.map((p, i) => (
                                <span key={i} style={{
                                  backgroundColor: 'var(--color-green-light)',
                                  color: 'var(--color-green-dark)',
                                  fontSize: '0.65rem',
                                  fontWeight: 'bold',
                                  padding: '2px 8px',
                                  borderRadius: '10px'
                                }}>
                                  {p}
                                </span>
                              ))
                            ) : (
                              <span style={{ fontSize: '0.72rem', fontStyle: 'italic' }}>None (View Only)</span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1.5px solid var(--border-light)', paddingTop: '10px', gap: '8px' }}>
                          {adm.email !== user.email && (
                            <button
                              onClick={() => handleDeleteAdmin(adm._id)}
                              className="btn-3d btn-3d-red btn-3d-sm"
                            >
                              Revoke Access
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* VIEW 6: CONTENT MODERATION */}
          {adminView === 'content' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="dashboard-grid" style={{ gridTemplateColumns: isReviewMaximized ? '1fr' : '1.2fr 0.8fr' }}>
                
                {/* Left column: Flagged list */}
                <div style={{ display: isReviewMaximized ? 'none' : 'flex', flexDirection: 'column', gap: '15px' }}>
                  <section className="card-buddy" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '10px' }}>
                      <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', margin: 0 }}>
                        Flagged Answers Queue
                      </h3>
                    </div>
                    
                    {answers.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>
                        No content reported or pending review.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '5px' }}>
                        {answers.map((item) => {
                          const isSelected = reviewItem && reviewItem._id === item._id;
                          return (
                            <div 
                              key={item._id}
                              onClick={() => {
                                setReviewItem(item);
                                setEditedAnswerText(item.answer);
                                setTeacherComments(item.teacherComments || '');
                                setReferenceSource(item.sources && item.sources.length > 0 ? item.sources.join(', ') : '');
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '15px',
                                padding: '14px',
                                borderRadius: 'var(--radius-sm)',
                                border: '2.5px solid',
                                borderColor: isSelected ? 'var(--color-purple)' : 'var(--border-light)',
                                backgroundColor: isSelected ? 'var(--color-purple-light)' : 'var(--bg-card)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '150px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <span style={{
                                    backgroundColor: 'var(--bg-app)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.65rem',
                                    fontWeight: 'bold',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: '1.5px solid var(--border-light)',
                                    textTransform: 'uppercase'
                                  }}>
                                    Class {item.class} • {item.subject}
                                  </span>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--color-yellow-dark)', fontWeight: 'bold' }}>
                                    Conf: {item.confidenceScore}%
                                  </span>
                                </div>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', margin: 0, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                  Q: {item.question}
                                </h4>
                              </div>
                              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>

                {/* Right column: Review Pane */}
                <div>
                  {reviewItem ? (
                    <section className="card-buddy" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '10px' }}>
                        <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', margin: 0 }}>
                          Review Answer
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button 
                            onClick={() => setIsReviewMaximized(!isReviewMaximized)} 
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '4px' }}
                            title={isReviewMaximized ? "Restore view" : "Maximize view"}
                          >
                            {isReviewMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                          </button>
                          <button 
                            onClick={() => { setReviewItem(null); setIsReviewMaximized(false); }} 
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '4px' }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        backgroundColor: 'var(--bg-app)',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '2px solid var(--border-light)'
                      }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Question</span>
                        <p style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>
                          {reviewItem.question}
                        </p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Verify Explanation Text</span>
                        <textarea 
                          value={editedAnswerText}
                          onChange={e => setEditedAnswerText(e.target.value)}
                          style={{
                            width: '100%',
                            height: '120px',
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '2px solid var(--border-light)',
                            fontSize: '0.85rem',
                            outline: 'none',
                            fontFamily: 'var(--font-body)',
                            resize: 'vertical',
                            lineHeight: '1.4',
                            fontWeight: '600'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Feedback / Comments</span>
                        <input 
                          type="text" 
                          placeholder="Add comments..."
                          value={teacherComments}
                          onChange={e => setTeacherComments(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '2px solid var(--border-light)',
                            fontSize: '0.85rem',
                            outline: 'none',
                            fontFamily: 'var(--font-body)',
                            fontWeight: '600'
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', borderTop: '1.5px solid var(--border-light)', paddingTop: '10px' }}>
                        <button 
                          onClick={() => handleActionOnContent('reject')}
                          disabled={submitLoading}
                          className="btn-3d btn-3d-red btn-3d-sm"
                        >
                          Reject
                        </button>
                        <button 
                          onClick={() => handleActionOnContent('edit')}
                          disabled={submitLoading}
                          className="btn-3d btn-3d-blue btn-3d-sm"
                        >
                          Edit & Verify
                        </button>
                        <button 
                          onClick={() => handleActionOnContent('approve')}
                          disabled={submitLoading}
                          className="btn-3d btn-3d-green btn-3d-sm"
                        >
                          Approve
                        </button>
                      </div>
                    </section>
                  ) : (
                    <div className="card-buddy" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', minHeight: '350px' }}>
                      <Mascot size={90} expression="thinking" className="animate-mascot" style={{ marginBottom: '15px' }} />
                      <h4 style={{ fontSize: '1.1rem', margin: '0 0 8px 0', textTransform: 'uppercase', color: 'var(--text-main)', fontFamily: 'var(--font-header)' }}>Select Answer to Moderate</h4>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* VIEW 7: SYLLABUS MANAGER */}
          {adminView === 'syllabus' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {/* Syllabus Stats cards */}
              <section style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '20px'
              }}>
                <div className="card-buddy"
                     style={{ 
                       display: 'flex', alignItems: 'center', gap: '16px',
                       background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)', 
                       borderColor: '#e1bee7' 
                     }}>
                  <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.7)', color: '#4a148c', display: 'flex', shrink: 0 }}>
                    <School size={26} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', color: '#4a148c', letterSpacing: '0.5px' }}>Classes Loaded</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#4a148c', fontFamily: 'var(--font-header)' }}>Class 6 to 10</span>
                  </div>
                </div>

                <div className="card-buddy"
                     style={{ 
                       display: 'flex', alignItems: 'center', gap: '16px',
                       background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', 
                       borderColor: '#c8e6c9' 
                     }}>
                  <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.7)', color: '#1b5e20', display: 'flex', shrink: 0 }}>
                    <BookOpen size={26} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', color: '#1b5e20', letterSpacing: '0.5px' }}>Total Subjects</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1b5e20', fontFamily: 'var(--font-header)' }}>{totalSubjectsList.length} Active</span>
                  </div>
                </div>

                <div className="card-buddy"
                     style={{ 
                       display: 'flex', alignItems: 'center', gap: '16px',
                       background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)', 
                       borderColor: '#ffe0b2' 
                     }}>
                  <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.7)', color: '#e65100', display: 'flex', shrink: 0 }}>
                    <Layers size={26} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', color: '#e65100', letterSpacing: '0.5px' }}>Total Chapters</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#e65100', fontFamily: 'var(--font-header)' }}>{totalChaptersCount} Chapters</span>
                  </div>
                </div>

                <div className="card-buddy"
                     style={{ 
                       display: 'flex', alignItems: 'center', gap: '16px',
                       background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)', 
                       borderColor: '#ffcdd2' 
                     }}>
                  <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.7)', color: '#c62828', display: 'flex', shrink: 0 }}>
                    <Clock size={26} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', color: '#c62828', letterSpacing: '0.5px' }}>Ingest Queue</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#c62828', fontFamily: 'var(--font-header)' }}>{pendingSyllabuses.length} Pending</span>
                  </div>
                </div>
              </section>

              {/* Quick Seed Banner */}
              <div className="card-buddy" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(135deg, rgba(133, 77, 255, 0.08) 0%, rgba(133, 77, 255, 0.15) 100%)',
                borderColor: 'var(--color-purple)',
                padding: '20px',
                borderRadius: '16px',
                flexWrap: 'wrap',
                gap: '15px',
                boxShadow: '0 4px 6px rgba(133, 77, 255, 0.05)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--color-purple-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⚡ Quick Setup: Seed AP State Board & CBSE Syllabus
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Instantly load the complete, officially-aligned syllabus for <strong>Classes 6, 7, 8, 9, and 10</strong> across all core subjects (Mathematics, Science, Social Studies, English, Telugu, and Hindi).
                  </p>
                </div>
                <button
                  onClick={handleSeedSyllabus}
                  disabled={seedingLoading}
                  className="btn-3d btn-3d-purple"
                  style={{ minWidth: '180px', padding: '10px 20px', fontWeight: 'bold' }}
                >
                  {seedingLoading ? 'Seeding...' : '🚀 Seed Syllabus (1-Click)'}
                </button>
              </div>

              {/* Main Layout Grid for Syllabus */}
              <div className="dashboard-grid">
                
                {/* Left Column: Curriculum Tree Editor & JSON bulk import */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  
                  {/* Curriculum Tree Editor */}
                  <section className="card-buddy" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '10px', marginBottom: '5px', flexWrap: 'wrap', gap: '10px' }}>
                      <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', margin: 0 }}>
                        <GraduationCap className="text-purple-600" size={20} /> Curriculum Tree Editor
                      </h3>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <select
                          value={syllabusClass}
                          onChange={(e) => { setSyllabusClass(parseInt(e.target.value)); setSyllabusSubject(''); }}
                          className="buddy-filter-input-student"
                          style={{ padding: '4px 10px', minHeight: '32px', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                          {[6, 7, 8, 9, 10].map(c => <option key={c} value={c}>Class {c}</option>)}
                        </select>
                        {totalSubjectsList.length > 0 && (
                          <select
                            value={syllabusSubject}
                            onChange={(e) => setSyllabusSubject(e.target.value)}
                            className="buddy-filter-input-student"
                            style={{ padding: '4px 10px', minHeight: '32px', fontSize: '0.8rem', fontWeight: 'bold' }}
                          >
                            {totalSubjectsList.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                      </div>
                    </div>

                    {syllabusLoading ? (
                      <div style={{ textAlign: 'center', padding: '30px 15px' }}>
                        <div className="inline-block animate-spin" style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--color-purple)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                        <p style={{ marginTop: '10px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>Loading syllabus content...</p>
                      </div>
                    ) : !syllabusSubject ? (
                      <div style={{ textAlign: 'center', padding: '30px 15px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No curriculum subjects registered yet for Class {syllabusClass}.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Add Chapter Form */}
                        <form onSubmit={handleAddChapter} style={{ display: 'flex', gap: '10px', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border-light)', backgroundColor: 'var(--bg-app)', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            placeholder="Add new chapter name (e.g. Fractions)..." 
                            value={newChapterName} 
                            onChange={(e) => setNewChapterName(e.target.value)} 
                            style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)' }}
                            required
                          />
                          <button 
                            type="submit" 
                            className="btn-3d btn-3d-purple btn-3d-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Plus size={14} /> Add Chapter
                          </button>
                        </form>

                        {/* Active Subject Curriculum Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            <span>Subject: {syllabusSubject} (Class {syllabusClass})</span>
                            <button 
                              onClick={handleDeleteSubject}
                              className="text-red-500 hover:underline border-0 bg-transparent cursor-pointer font-bold"
                              style={{ fontSize: '0.75rem' }}
                            >
                              🗑️ Delete Entire Subject
                            </button>
                          </div>

                          {activeSubjectData && activeSubjectData.chapters && activeSubjectData.chapters.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '5px' }}>
                              {activeSubjectData.chapters.map((ch, idx) => (
                                <div 
                                  key={idx} 
                                  style={{
                                    padding: '14px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '2px solid var(--border-light)',
                                    backgroundColor: 'var(--bg-card)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <h4 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 'bold', color: 'var(--text-main)' }}>
                                      Chapter {idx + 1}: {ch.name}
                                    </h4>
                                    <button 
                                      onClick={() => handleDeleteChapter(ch.name)}
                                      style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer', padding: '0 4px' }}
                                      title="Delete chapter"
                                    >
                                      🗑️ Delete Chapter
                                    </button>
                                  </div>

                                  {/* Topics tags grid */}
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {ch.topics && ch.topics.map((topic, tIdx) => (
                                      <span 
                                        key={tIdx} 
                                        style={{
                                          backgroundColor: 'var(--color-purple-light)',
                                          color: 'var(--color-purple-dark)',
                                          fontSize: '0.75rem',
                                          fontWeight: 'bold',
                                          padding: '4px 10px',
                                          borderRadius: '12px',
                                          border: '1.5px solid var(--color-purple)',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px'
                                        }}
                                      >
                                        {topic}
                                        <button 
                                          onClick={() => handleDeleteTopic(ch.name, topic)}
                                          style={{ padding: 0, fontSize: '0.8rem', lineHeight: 1, border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                          &times;
                                        </button>
                                      </span>
                                    ))}
                                  </div>

                                  {/* Topic addition inline toggler */}
                                  {activeChapterForTopic === ch.name ? (
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                                      <input 
                                        type="text" 
                                        placeholder="Enter topic name..." 
                                        value={newTopicName} 
                                        onChange={(e) => setNewTopicName(e.target.value)} 
                                        style={{ flex: 1, padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.8rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                                        autoFocus
                                      />
                                      <button 
                                        onClick={() => handleAddTopic(ch.name)} 
                                        className="btn-3d btn-3d-green btn-3d-sm"
                                      >
                                        Save
                                      </button>
                                      <button 
                                        onClick={() => { setActiveChapterForTopic(''); setNewTopicName(''); }} 
                                        className="btn-3d btn-3d-light btn-3d-sm"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => setActiveChapterForTopic(ch.name)}
                                      style={{ fontSize: '0.75rem', fontWeight: 'bold', width: 'fit-content', padding: 0, color: 'var(--color-purple)', border: 'none', background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                    >
                                      + Add topic to Chapter
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              No chapters registered under Subject "{syllabusSubject}" yet.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </section>

                  {/* JSON Bulk Import */}
                  <section className="card-buddy" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '10px', marginBottom: '5px' }}>
                      <FileCheck2 className="text-purple-600" size={20} /> Bulk Import Curriculum (JSON)
                    </h3>
                    
                    <div style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-sm)',
                      border: '2px dashed var(--border-light)',
                      backgroundColor: 'var(--bg-app)',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <input 
                        type="file" 
                        accept=".json" 
                        id="bulk-json-input" 
                        onChange={handleJsonFileChange}
                        className="hidden" 
                      />
                      <label 
                        htmlFor="bulk-json-input"
                        className="btn-3d btn-3d-purple btn-3d-sm cursor-pointer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        Select JSON File
                      </label>
                      {bulkUploadFile && (
                        <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-green-dark)', margin: 0 }}>
                          Selected: {bulkUploadFile.name} ({(bulkUploadFile.size / 1024).toFixed(2)} KB)
                        </p>
                      )}
                    </div>

                    <button 
                      onClick={handleUploadSyllabusJson}
                      disabled={!bulkUploadFile || bulkUploading}
                      className="btn-3d btn-3d-green"
                      style={{ width: '100%' }}
                    >
                      {bulkUploading ? 'Importing Dataset...' : '🚀 Start Bulk Seeding'}
                    </button>
                  </section>
                </div>

                {/* Right Column: AI Ingestion PDF queue */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  {/* Drag & Drop PDF upload box */}
                  <section className="card-buddy" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '10px', marginBottom: '5px' }}>
                      <Sparkles className="text-purple-600" size={18} /> Ingest Textbook PDF via Gemini
                    </h3>
                    
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => { 
                        e.preventDefault(); 
                        setIsDragOver(false); 
                        if (e.dataTransfer.files) {
                          handleIngestPDFs(Array.from(e.dataTransfer.files));
                        }
                      }}
                      style={{
                        border: `2px dashed ${isDragOver ? 'var(--color-purple)' : 'var(--border-light)'}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: '24px',
                        textAlign: 'center',
                        backgroundColor: isDragOver ? 'var(--color-purple-light)' : 'var(--bg-app)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '160px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <BookOpen size={36} className="text-purple-600 mb-2" />
                      <p style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--text-main)', maxWidth: '200px', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                        Drag and drop textbook syllabus PDFs here, or click below
                      </p>
                      
                      <input 
                        type="file" 
                        multiple 
                        accept=".pdf" 
                        id="syllabus-pdf-input" 
                        onChange={(e) => {
                          if (e.target.files) {
                            handleIngestPDFs(Array.from(e.target.files));
                          }
                        }}
                        className="hidden" 
                      />
                      <label 
                        htmlFor="syllabus-pdf-input"
                        className="btn-3d btn-3d-purple btn-3d-sm cursor-pointer"
                      >
                        Select PDF Files
                      </label>
                    </div>
                    
                    {ingestUploading && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-purple-dark)' }}>
                        <div className="inline-block animate-spin" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid var(--color-purple)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                        <span>Processing PDF in background...</span>
                      </div>
                    )}
                  </section>

                  {/* Extraction Queue Card */}
                  <section className="card-buddy" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '10px', marginBottom: '5px' }}>
                      <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', margin: 0 }}>
                        <Clock size={16} className="text-amber-500" /> AI Extractions Review Queue
                      </h3>
                      <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', backgroundColor: 'var(--bg-app)', border: '1.5px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-muted)' }}>
                        {pendingSyllabuses.length} items
                      </span>
                    </div>

                    {pendingSyllabuses.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>Queue is empty.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
                        {pendingSyllabuses.map((pending) => (
                          <div 
                            key={pending._id} 
                            style={{
                              padding: '12px 14px',
                              borderRadius: 'var(--radius-sm)',
                              border: '2px solid var(--border-light)',
                              backgroundColor: 'var(--bg-card)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px'
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pending.fileName}>
                                📄 {pending.fileName}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginTop: '2px' }}>
                                Class {pending.classNum} • {pending.subjectName || 'Analyzing...'}
                              </span>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', shrink: 0 }}>
                              <button 
                                onClick={() => setActiveReviewItem(pending)}
                                className="btn-3d btn-3d-purple btn-3d-sm"
                              >
                                Review
                              </button>
                              <button 
                                onClick={() => handleDeletePending(pending._id)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

              </div>
            </div>
          )}

          {/* VIEW 8: SECURITY LOGS */}
          {adminView === 'logs' && user.role === 'super_admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <section className="card-buddy">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '10px', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', margin: 0 }}>
                    <Clock className="text-purple-650" size={22} /> Platform Audit Timeline
                  </h3>
                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input 
                      type="text" 
                      placeholder="Search log action or actor..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="buddy-filter-input-student"
                      style={{ paddingLeft: '36px', minHeight: '34px', fontSize: '0.8rem', width: '100%' }}
                    />
                  </div>
                </div>

                {filteredLogs.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>No logs recorded.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '5px' }}>
                    {filteredLogs.map((log) => (
                      <div 
                        key={log._id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: '2px solid var(--border-light)',
                          backgroundColor: 'var(--bg-card)',
                          fontSize: '0.82rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                          <span>[{new Date(log.timestamp).toLocaleString()}]</span>
                          <span>Actor: <b>{log.performedBy}</b></span>
                        </div>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                          Action: <span style={{ color: 'var(--color-purple)' }}>{log.action}</span>
                          {log.targetUser && <span> &rarr; Target: <b style={{ color: 'var(--text-muted)' }}>{log.targetUser}</b></span>}
                        </div>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <pre style={{ marginTop: '8px', padding: '10px', borderRadius: '4px', backgroundColor: '#0f172a', color: '#34d399', fontSize: '0.75rem', overflowX: 'auto', whitespace: 'pre-wrap', maxHeight: '100px', border: '1.5px solid var(--border-light)' }}>
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* VIEW 9: PLATFORM MODULE SETTINGS */}
          {adminView === 'settings' && user.role === 'super_admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <section className="card-buddy" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '10px', marginBottom: '10px' }}>
                  <Settings className="text-purple-600 animate-spin-slow" size={22} /> Module Configurations
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '600px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '2px solid var(--border-light)',
                    backgroundColor: 'var(--bg-card)'
                  }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, color: 'var(--text-main)' }}>AI Study Planner</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Allows students to automatically generate schedules based on weak subject profiles.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.aiStudyPlanner}
                      onChange={e => handleToggleSetting('aiStudyPlanner', e.target.checked)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--color-purple)' }}
                    />
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '2px solid var(--border-light)',
                    backgroundColor: 'var(--bg-card)'
                  }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, color: 'var(--text-main)' }}>Quiz Center</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Enables automated quiz creation, answer tracking, and badge shelves awards.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.quizCenter}
                      onChange={e => handleToggleSetting('quizCenter', e.target.checked)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--color-purple)' }}
                    />
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '2px solid var(--border-light)',
                    backgroundColor: 'var(--bg-card)'
                  }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, color: 'var(--text-main)' }}>AI Teacher Tutor</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Opens the chat interface for students to get immediate textbook explanations from Gemini AI.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.aiTeacherChat}
                      onChange={e => handleToggleSetting('aiTeacherChat', e.target.checked)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--color-purple)' }}
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* VIEW 10: ANNOUNCEMENTS BOARD */}
          {adminView === 'announcements' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="dashboard-grid">
                
                {/* Left Column: Publish Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <section className="card-buddy" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '10px', marginBottom: '10px' }}>
                      <Sparkles className="text-purple-600" size={20} /> Publish Announcement Banner
                    </h3>
                    <form onSubmit={handlePublishAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Announcement Title</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Unit Test 2 Schedule Released"
                          value={newAnnTitle}
                          onChange={e => setNewAnnTitle(e.target.value)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '2px solid var(--border-light)',
                            fontSize: '0.85rem',
                            outline: 'none',
                            fontFamily: 'var(--font-body)',
                            width: '100%',
                            boxSizing: 'border-box',
                            backgroundColor: 'var(--bg-app)',
                            color: 'var(--text-main)'
                          }}
                          required
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Announcement Body Content</label>
                        <textarea 
                          placeholder="Details..."
                          value={newAnnContent}
                          onChange={e => setNewAnnContent(e.target.value)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '2px solid var(--border-light)',
                            fontSize: '0.85rem',
                            outline: 'none',
                            fontFamily: 'var(--font-body)',
                            width: '100%',
                            height: '130px',
                            resize: 'vertical',
                            boxSizing: 'border-box',
                            backgroundColor: 'var(--bg-app)',
                            color: 'var(--text-main)'
                          }}
                          required
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={publishingAnn}
                        className="btn-3d btn-3d-green"
                        style={{ width: '100%' }}
                      >
                        {publishingAnn ? 'Publishing...' : '📢 Publish to Student Dashboards'}
                      </button>
                    </form>
                  </section>
                </div>

                {/* Right Column: Existing Banners */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <section className="card-buddy">
                    <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '10px', marginBottom: '10px' }}>
                      <Clock size={18} className="text-indigo-505" /> Active Announcements
                    </h3>
                    {announcements.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>No announcements published.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '5px' }}>
                        {announcements.map((ann) => (
                          <div 
                            key={ann._id}
                            style={{
                              padding: '14px',
                              borderRadius: 'var(--radius-sm)',
                              border: '2px solid var(--border-light)',
                              backgroundColor: 'var(--bg-card)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'start',
                              gap: '15px'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                              <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', margin: 0, color: 'var(--text-main)' }}>{ann.title}</h4>
                              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: '1.4', fontWeight: '500' }}>{ann.content}</p>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px', fontWeight: 'bold' }}>
                                Published by: {ann.createdBy || 'Admin'} on {new Date(ann.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <button 
                              onClick={() => handleDeleteAnnouncement(ann._id)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          )}
      {showAddTeacher && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="card-buddy" style={{
            backgroundColor: 'var(--bg-card)',
            border: '2.5px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 0 var(--shadow-color)',
            maxWidth: '600px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh',
            overflow: 'hidden',
            padding: 0
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1.5px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-app)'
            }}>
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', margin: 0, fontWeight: 'bold' }}>
                <UserPlus className="text-purple-600" size={22} /> Add Verified Teacher Profile
              </h3>
              <button onClick={() => setShowAddTeacher(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTeacherDirect} style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Full Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Dr. Ravi Kumar"
                    value={addTeacherName} 
                    onChange={e => setAddTeacherName(e.target.value)} 
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                    required 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email Address</label>
                  <input 
                    type="email" 
                    placeholder="e.g. ravi@institution.edu"
                    value={addTeacherEmail} 
                    onChange={e => setAddTeacherEmail(e.target.value)} 
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Country</label>
                  <select 
                    value={addTeacherCountry} 
                    onChange={e => setAddTeacherCountry(e.target.value)} 
                    className="buddy-filter-input-student"
                    style={{ minHeight: '38px', fontSize: '0.85rem', fontWeight: 'bold', width: '100%' }}
                  >
                    {countriesList.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone Number</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select 
                      value={addTeacherPhoneCode} 
                      onChange={e => setAddTeacherPhoneCode(e.target.value)}
                      className="buddy-filter-input-student"
                      style={{ minHeight: '38px', fontSize: '0.85rem', fontWeight: 'bold', width: '70px', shrink: 0 }}
                    >
                      {countriesList.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                    <input 
                      type="text" 
                      placeholder="Phone Digits"
                      value={addTeacherPhoneDigits} 
                      onChange={e => setAddTeacherPhoneDigits(e.target.value)} 
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                      required 
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Qualification Degree</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Ph.D. in Botany"
                    value={addTeacherQualification} 
                    onChange={e => setAddTeacherQualification(e.target.value)} 
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                    required 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subject Expertise</label>
                  <select 
                    value={addTeacherSpecialization} 
                    onChange={e => setAddTeacherSpecialization(e.target.value)} 
                    className="buddy-filter-input-student"
                    style={{ minHeight: '38px', fontSize: '0.85rem', fontWeight: 'bold', width: '100%' }}
                    required
                  >
                    {['Science', 'Mathematics', 'English', 'Social Studies', 'Biology', 'Chemistry', 'Physics'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Affiliated Institution</label>
                <input 
                  type="text" 
                  placeholder="e.g. Nellore Public School"
                  value={addTeacherInstitution} 
                  onChange={e => setAddTeacherInstitution(e.target.value)} 
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                  required 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Account Password</label>
                <div style={{ position: 'relative', display: 'flex', width: '100%' }}>
                  <input 
                    type={showAddTeacherPassword ? "text" : "password"} 
                    placeholder="At least 6 characters"
                    value={addTeacherPassword} 
                    onChange={e => setAddTeacherPassword(e.target.value)} 
                    style={{ width: '100%', padding: '8px 12px', paddingRight: '40px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddTeacherPassword(!showAddTeacherPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '10px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0
                    }}
                  >
                    {showAddTeacherPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', borderTop: '1.5px solid var(--border-light)', marginTop: '10px', paddingTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddTeacher(false)}
                  className="btn-3d btn-3d-light"
                  style={{ flex: 1, fontSize: '0.82rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={addTeacherLoading}
                  className="btn-3d btn-3d-green"
                  style={{ flex: 1, fontSize: '0.82rem', fontWeight: 'bold' }}
                >
                  {addTeacherLoading ? 'Creating Profile...' : '🚀 Register Educator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER ADMIN MODAL OVERLAY */}
      {showAddAdmin && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="card-buddy" style={{
            backgroundColor: 'var(--bg-card)',
            border: '2.5px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 0 var(--shadow-color)',
            maxWidth: '500px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh',
            overflow: 'hidden',
            padding: 0
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1.5px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-app)'
            }}>
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', margin: 0, fontWeight: 'bold' }}>
                <Lock className="text-purple-600" size={22} /> Add Platform Moderator
              </h3>
              <button onClick={() => setShowAddAdmin(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateAdmin} style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. John Doe"
                  value={addAdminName} 
                  onChange={e => setNewAnnTitle(e.target.value)} // Wait, addAdminName is set by addAdminName, let's keep original bindings
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                  required 
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email Address</label>
                <input 
                  type="email" 
                  placeholder="e.g. john@studybuddy.com"
                  value={addAdminEmail} 
                  onChange={e => setAddAdminEmail(e.target.value)} 
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                  required 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Moderator Department</label>
                <input 
                  type="text" 
                  placeholder="e.g. Support, Curriculum..."
                  value={addAdminDept} 
                  onChange={e => setAddAdminDept(e.target.value)} 
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                  required 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Account Password</label>
                <div style={{ position: 'relative', display: 'flex', width: '100%' }}>
                  <input 
                    type={showAddAdminPassword ? "text" : "password"} 
                    placeholder="At least 6 characters"
                    value={addAdminPassword} 
                    onChange={e => setAddAdminPassword(e.target.value)} 
                    style={{ width: '100%', padding: '8px 12px', paddingRight: '40px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddAdminPassword(!showAddAdminPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '10px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0
                    }}
                  >
                    {showAddAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '5px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Moderator Permission Scope</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {availablePermissions.map((perm) => (
                    <label key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-main)', cursor: 'pointer' }}>
                      <input 
                        type="checkbox"
                        checked={addAdminPerms.includes(perm.key)}
                        onChange={() => handleTogglePerm(perm.key)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-purple)' }}
                      />
                      <span>{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', borderTop: '1.5px solid var(--border-light)', marginTop: '10px', paddingTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddAdmin(false)}
                  className="btn-3d btn-3d-light"
                  style={{ flex: 1, fontSize: '0.82rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={addAdminLoading}
                  className="btn-3d btn-3d-green"
                  style={{ flex: 1, fontSize: '0.82rem', fontWeight: 'bold' }}
                >
                  {addAdminLoading ? 'Registering...' : '🚀 Create Admin Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {editingStudent && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="card-buddy" style={{
            backgroundColor: 'var(--bg-card)',
            border: '2.5px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 0 var(--shadow-color)',
            maxWidth: '500px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh',
            overflow: 'hidden',
            padding: 0
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1.5px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-app)'
            }}>
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', margin: 0, fontWeight: 'bold' }}>
                <GraduationCap className="text-purple-600" size={22} /> Edit Student Profile
              </h3>
              <button 
                onClick={() => setEditingStudent(null)} 
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateStudent} style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Student Name</label>
                <input 
                  type="text" 
                  value={editStudentName} 
                  onChange={e => setEditStudentName(e.target.value)} 
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                  required 
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email Address</label>
                <input 
                  type="email" 
                  value={editStudentEmail} 
                  onChange={e => setEditStudentEmail(e.target.value)} 
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Grade Class</label>
                  <select 
                    value={editStudentClass} 
                    onChange={e => setEditStudentClass(parseInt(e.target.value))} 
                    className="buddy-filter-input-student"
                    style={{ minHeight: '38px', fontSize: '0.85rem', fontWeight: 'bold', width: '100%' }}
                  >
                    {[6,7,8,9,10].map(c => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Curriculum Board</label>
                  <select 
                    value={editStudentBoard} 
                    onChange={e => setEditStudentBoard(e.target.value)} 
                    className="buddy-filter-input-student"
                    style={{ minHeight: '38px', fontSize: '0.85rem', fontWeight: 'bold', width: '100%' }}
                  >
                    <option value="SSC">SSC State Board</option>
                    <option value="CBSE">CBSE Board</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Study Medium</label>
                  <input 
                    type="text" 
                    value={editStudentLang} 
                    onChange={e => setEditStudentLang(e.target.value)} 
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Parent Contact</label>
                  <input 
                    type="text" 
                    value={editStudentContact} 
                    onChange={e => setEditStudentContact(e.target.value)} 
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Parental PIN Lock</label>
                <input 
                  type="text" 
                  value={editStudentPin} 
                  onChange={e => setEditStudentPin(e.target.value)} 
                  maxLength={4}
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', textAlign: 'center', fontWeight: 'bold', letterSpacing: '2px' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', borderTop: '1.5px solid var(--border-light)', marginTop: '10px', paddingTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setEditingStudent(null)} 
                  className="btn-3d btn-3d-light"
                  style={{ flex: 1, fontSize: '0.82rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-3d btn-3d-green"
                  style={{ flex: 1, fontSize: '0.82rem', fontWeight: 'bold' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEACHER MODAL */}
      {editingTeacher && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="card-buddy" style={{
            backgroundColor: 'var(--bg-card)',
            border: '2.5px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 0 var(--shadow-color)',
            maxWidth: '500px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh',
            overflow: 'hidden',
            padding: 0
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1.5px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-app)'
            }}>
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', margin: 0, fontWeight: 'bold' }}>
                <School className="text-purple-600" size={22} /> Edit Teacher Profile
              </h3>
              <button 
                onClick={() => setEditingTeacher(null)} 
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateTeacher} style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Full Name</label>
                <input 
                  type="text" 
                  value={editTeacherName} 
                  onChange={e => setEditTeacherName(e.target.value)} 
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                  required 
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email Address</label>
                <input 
                  type="email" 
                  value={editTeacherEmail} 
                  onChange={e => setEditTeacherEmail(e.target.value)} 
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone Number</label>
                  <input 
                    type="text" 
                    value={editTeacherPhone} 
                    onChange={e => setEditTeacherPhone(e.target.value)} 
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                    required 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Country</label>
                  <input 
                    type="text" 
                    value={editTeacherCountry} 
                    onChange={e => setEditTeacherCountry(e.target.value)} 
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Qualification</label>
                  <input 
                    type="text" 
                    value={editTeacherQualification} 
                    onChange={e => setEditTeacherQualification(e.target.value)} 
                    style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                    required 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Specialization</label>
                  <select 
                    value={editTeacherSpecialization} 
                    onChange={e => setEditTeacherSpecialization(e.target.value)} 
                    className="buddy-filter-input-student"
                    style={{ minHeight: '38px', fontSize: '0.85rem', fontWeight: 'bold', width: '100%' }}
                    required
                  >
                    {['Science', 'Mathematics', 'English', 'Social Studies', 'Biology', 'Chemistry', 'Physics'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Institution</label>
                <input 
                  type="text" 
                  value={editTeacherInstitution} 
                  onChange={e => setEditTeacherInstitution(e.target.value)} 
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-body)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</label>
                  <select 
                    value={editTeacherStatus} 
                    onChange={e => setEditTeacherStatus(e.target.value)} 
                    className="buddy-filter-input-student"
                    style={{ minHeight: '38px', fontSize: '0.85rem', fontWeight: 'bold', width: '100%' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Role</label>
                  <select 
                    value={editTeacherRole} 
                    onChange={e => setEditTeacherRole(e.target.value)} 
                    className="buddy-filter-input-student"
                    style={{ minHeight: '38px', fontSize: '0.85rem', fontWeight: 'bold', width: '100%' }}
                  >
                    <option value="teacher">Teacher</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', borderTop: '1.5px solid var(--border-light)', marginTop: '10px', paddingTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setEditingTeacher(null)} 
                  className="btn-3d btn-3d-light"
                  style={{ flex: 1, fontSize: '0.82rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-3d btn-3d-green"
                  style={{ flex: 1, fontSize: '0.82rem', fontWeight: 'bold' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI EXTRACTION REVIEW OVERLAY MODAL */}
      {activeReviewItem && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="card-buddy" style={{
            backgroundColor: 'var(--bg-card)',
            border: '2.5px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 0 var(--shadow-color)',
            maxWidth: '900px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh',
            overflow: 'hidden',
            padding: 0
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1.5px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-app)',
              flexShrink: 0
            }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', margin: 0, fontWeight: 'bold' }}>
                  <Sparkles className="text-purple-600" size={22} /> Review AI Ingested Syllabus Chapters
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginTop: '4px' }}>
                  File: {activeReviewItem.fileName}
                </span>
              </div>
              <button 
                onClick={() => setActiveReviewItem(null)} 
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              flex: 1,
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '20px',
                overflowY: 'auto',
                borderRight: '1.5px solid var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                backgroundColor: 'var(--bg-app)'
              }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📂 Extracted Chapters
                </h4>
                
                {activeReviewItem.extractedData && activeReviewItem.extractedData.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Class Level</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)', display: 'block', marginTop: '2px' }}>Class {activeReviewItem.classNum}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Subject Group</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)', display: 'block', marginTop: '2px' }}>{activeReviewItem.subjectName}</span>
                      </div>
                    </div>
                    
                    <div style={{
                      borderTop: '1.5px solid var(--border-light)',
                      paddingTop: '15px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      overflowY: 'auto',
                      maxHeight: '40vh'
                    }}>
                      {activeReviewItem.extractedData.map((ch, idx) => (
                        <div key={idx} style={{
                          padding: '12px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-card)',
                          border: '1.5px solid var(--border-light)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                            Chapter {idx + 1}: {ch.chapterName}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {ch.topics && ch.topics.map((t, tIdx) => (
                              <span key={tIdx} style={{
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                backgroundColor: 'var(--color-green-light)',
                                color: 'var(--color-green-dark)',
                                border: '1.5px solid var(--border-light)',
                                padding: '2px 8px',
                                borderRadius: '12px'
                              }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>No curriculum structures extracted.</p>
                )}
              </div>

              <div style={{
                padding: '20px',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-app)',
                color: 'var(--text-main)',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                fontFamily: 'monospace',
                fontSize: '0.75rem'
              }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '8px' }}>
                  📟 Processing Logs Console
                </h4>
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  lineHeight: '1.4',
                  maxHeight: '40vh'
                }}>
                  {activeReviewItem.logs && activeReviewItem.logs.length > 0 ? (
                    activeReviewItem.logs.map((log, lIdx) => {
                      let logColor = 'var(--text-main)';
                      if (log.toLowerCase().includes('error') || log.toLowerCase().includes('failed')) logColor = 'var(--color-red-dark)';
                      else if (log.toLowerCase().includes('success') || log.toLowerCase().includes('complete') || log.toLowerCase().includes('approved')) logColor = 'var(--color-green-dark)';
                      
                      return (
                        <div key={lIdx} style={{ color: logColor, wordBreak: 'break-all' }}>
                          [{new Date(activeReviewItem.createdAt).toLocaleTimeString()}] {log}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No console logs available.</div>
                  )}
                </div>
              </div>
            </div>

            <div style={{
              padding: '16px 20px',
              borderTop: '1.5px solid var(--border-light)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-app)',
              flexShrink: 0
            }}>
              <button 
                onClick={() => handleDeletePending(activeReviewItem._id)}
                className="btn-3d btn-3d-red btn-3d-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Trash2 size={14} /> Delete Entry
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setActiveReviewItem(null)}
                  className="btn-3d btn-3d-light btn-3d-sm"
                >
                  Close
                </button>
                {activeReviewItem.status === 'pending' && activeReviewItem.extractedData?.length > 0 && (
                  <>
                    <button 
                      onClick={() => handleRejectSyllabus(activeReviewItem._id)}
                      className="btn-3d btn-3d-red btn-3d-sm"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => handleApproveSyllabus(activeReviewItem._id)}
                      className="btn-3d btn-3d-green btn-3d-sm"
                      style={{ fontWeight: 'bold' }}
                    >
                      Approve & Publish
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PROOF INSPECTION VIEWER MODAL */}
      {selectedProofFile && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="card-buddy" style={{
            backgroundColor: 'var(--bg-card)',
            border: '2.5px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 0 var(--shadow-color)',
            maxWidth: '900px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh',
            overflow: 'hidden',
            padding: 0
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1.5px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-app)',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-main)' }}>ID / Certificate Document Inspection</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a 
                  href={selectedProofFile} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn-3d btn-3d-purple btn-3d-sm"
                  style={{ textTransform: 'none', letterSpacing: 'normal', textDecoration: 'none' }}
                >
                  Open in New Tab ↗
                </a>
                <button 
                  onClick={() => setSelectedProofFile(null)} 
                  className="btn-3d btn-3d-light btn-3d-sm"
                  style={{ textTransform: 'none', letterSpacing: 'normal' }}
                >
                  Close
                </button>
              </div>
            </div>
            
            <div style={{
              flex: 1,
              overflow: 'auto',
              backgroundColor: 'var(--bg-app)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
              minHeight: '400px'
            }}>
              {selectedProofFile.toLowerCase().endsWith('.pdf') || selectedProofFile.includes('/pdf') ? (
                <iframe 
                  src={selectedProofFile} 
                  title="Credential PDF" 
                  style={{ width: '100%', height: '60vh', border: 'none', borderRadius: 'var(--radius-sm)' }}
                />
              ) : (
                <img 
                  src={selectedProofFile} 
                  alt="Credential Proof Doc" 
                  style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.parentNode.innerHTML = `
                      <div style="text-align: center; padding: 20px; display: flex; flex-direction: column; gap: 10px; align-items: center;">
                        <p style="font-size: 0.85rem; color: var(--text-muted); font-weight: bold;">PDF / Binary file inspection.</p>
                        <a href="${selectedProofFile}" target="_blank" class="btn-3d btn-3d-purple" style="text-decoration: none;">Download / View Document</a>
                      </div>
                    `;
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}

    </div>
  );
};
