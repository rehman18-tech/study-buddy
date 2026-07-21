import React, { useState, useEffect, useRef } from 'react';
import { Mascot } from '../components/Mascot';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { io } from 'socket.io-client';
import {
  Check,
  X,
  Search,
  Filter,
  RefreshCw,
  BookOpen,
  HelpCircle,
  Clock,
  User,
  ChevronRight,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  GraduationCap,
  Edit3,
  Maximize2,
  Minimize2,
  Bell,
  Volume2,
  VolumeX,
  Sliders,
  Calendar,
  Settings,
  Shield,
  Activity
} from 'lucide-react';

const Whiteboard = ({ onSave, onSubmit, submitLoading }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1e293b'); // Default dark slate
  const [lineWidth, setLineWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [drawingData, setDrawingData] = useState('');
  
  const prevDimensions = useRef({ width: 600, height: 320 });
  const canvasWidth = isMaximized ? Math.min(window.innerWidth - 80, 1100) : 600;
  const canvasHeight = isMaximized ? Math.min(window.innerHeight - 180, 580) : 320;

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const getEraserCursor = () => {
    const radius = lineWidth * 4;
    const size = radius * 2 + 8;
    const center = size / 2;
    const finalSize = Math.min(size, 128);
    const finalCenter = finalSize / 2;
    const finalRadius = Math.min(radius, finalCenter - 2);

    return `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='${finalSize}' height='${finalSize}' viewBox='0 0 ${finalSize} ${finalSize}'><circle cx='${finalCenter}' cy='${finalCenter}' r='${finalRadius}' stroke='%23475569' stroke-width='1.5' fill='white' fill-opacity='0.4'/></svg>") ${finalCenter} ${finalCenter}, auto`;
  };

  const startDrawing = ({ nativeEvent }) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (nativeEvent.clientX || nativeEvent.touches?.[0]?.clientX) - rect.left;
    const y = (nativeEvent.clientY || nativeEvent.touches?.[0]?.clientY) - rect.top;

    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    nativeEvent.preventDefault();

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (nativeEvent.clientX || nativeEvent.touches?.[0]?.clientX) - rect.left;
    const y = (nativeEvent.clientY || nativeEvent.touches?.[0]?.clientY) - rect.top;

    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    setDrawingData(dataUrl);
    onSave(dataUrl);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    setDrawingData('');
    onSave('');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = isEraser ? '#ffffff' : color;
    context.lineWidth = isEraser ? lineWidth * 8 : lineWidth;
    contextRef.current = context;

    const sizeChanged = prevDimensions.current.width !== canvasWidth || prevDimensions.current.height !== canvasHeight;
    
    if (sizeChanged && drawingData) {
      const img = new Image();
      img.src = drawingData;
      img.onload = () => {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      prevDimensions.current = { width: canvasWidth, height: canvasHeight };
    } else if (sizeChanged) {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      prevDimensions.current = { width: canvasWidth, height: canvasHeight };
    }
  }, [canvasWidth, canvasHeight, color, lineWidth, isEraser]);

  return (
    <div style={isMaximized ? {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      zIndex: 999999,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      gap: '12px',
      justifyContent: 'center',
      alignItems: 'center'
    } : {
      border: '2.5px solid var(--border-light)',
      borderRadius: 'var(--radius-sm)',
      backgroundColor: 'var(--bg-app)',
      padding: '12px'
    }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        marginBottom: '10px',
        backgroundColor: 'var(--bg-card)',
        padding: '8px',
        borderRadius: '8px',
        border: '1.5px solid var(--border-light)',
        width: isMaximized ? `${Math.min(window.innerWidth - 80, 1100)}px` : '100%',
        maxWidth: '100%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Colors */}
          <button
            type="button"
            onClick={() => { setColor('#1e293b'); setIsEraser(false); }}
            style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#1e293b', border: color === '#1e293b' && !isEraser ? '2px solid var(--color-purple)' : '2px solid transparent', cursor: 'pointer' }}
          />
          <button
            type="button"
            onClick={() => { setColor('#ef4444'); setIsEraser(false); }}
            style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ef4444', border: color === '#ef4444' && !isEraser ? '2px solid var(--color-purple)' : '2px solid transparent', cursor: 'pointer' }}
          />
          <button
            type="button"
            onClick={() => { setColor('#10b981'); setIsEraser(false); }}
            style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#10b981', border: color === '#10b981' && !isEraser ? '2px solid var(--color-purple)' : '2px solid transparent', cursor: 'pointer' }}
          />
          <button
            type="button"
            onClick={() => { setColor('#3b82f6'); setIsEraser(false); }}
            style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#3b82f6', border: color === '#3b82f6' && !isEraser ? '2px solid var(--color-purple)' : '2px solid transparent', cursor: 'pointer' }}
          />
          
          <div style={{ width: '1.5px', height: '20px', backgroundColor: 'var(--border-light)', margin: '0 4px' }} />

          {/* Eraser */}
          <button
            type="button"
            onClick={() => setIsEraser(true)}
            style={{
              padding: '2px 8px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              borderRadius: '6px',
              border: '1.5px solid',
              borderColor: isEraser ? 'var(--color-purple)' : 'var(--border-light)',
              backgroundColor: isEraser ? 'var(--color-purple-light)' : 'var(--bg-card)',
              color: isEraser ? 'var(--color-purple-dark)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            Eraser
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Size:</span>
          <select
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            style={{ fontSize: '0.7rem', border: '1.5px solid var(--border-light)', borderRadius: '6px', padding: '2px 4px', backgroundColor: 'var(--bg-card)', fontWeight: 'bold' }}
          >
            <option value={2}>Thin</option>
            <option value={4}>Medium</option>
            <option value={8}>Thick</option>
            <option value={15}>Extra Thick</option>
          </select>

          <button
            type="button"
            onClick={clearCanvas}
            style={{
              padding: '2px 8px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              borderRadius: '6px',
              border: '1.5px solid var(--border-light)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            Clear All
          </button>

          {isMaximized && onSubmit && (
            <button
              type="button"
              disabled={submitLoading}
              onClick={onSubmit}
              style={{
                padding: '2px 10px',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--color-purple)',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: submitLoading ? 0.7 : 1
              }}
            >
              {submitLoading ? 'Submitting...' : '📤 Submit Solution'}
            </button>
          )}

          <button
            type="button"
            onClick={toggleMaximize}
            style={{
              padding: '2px 8px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              borderRadius: '6px',
              border: '1.5px solid var(--border-light)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            {isMaximized ? 'Minimize' : 'Maximize'}
          </button>
        </div>
      </div>

      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1.5px solid var(--border-light)',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        width: isMaximized ? `${Math.min(window.innerWidth - 80, 1100)}px` : '100%',
        maxWidth: '100%'
      }}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{
            cursor: isEraser ? getEraserCursor() : 'crosshair',
            display: 'block',
            backgroundColor: '#ffffff'
          }}
        />
      </div>
    </div>
  );
};

export const TeacherDashboard = ({ initialQueue = 'pending' }) => {
  const { triggerNotification } = useApp();
  const { user, logout } = useAuth();
  
  const [answers, setAnswers] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ticketSubTab, setTicketSubTab] = useState('pending'); // 'pending', 'active', 'completed'
  const [whiteboardImage, setWhiteboardImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeQueue, setActiveQueue] = useState(initialQueue); // 'pending', 'approved', 'rejected', 'doubts', 'tickets'
  
  // Stats strip
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    doubts: 0,
    tickets: 0,
    avgConfidence: 0
  });

  const statsRef = useRef({ pending: 0, doubts: 0, tickets: 0, initialized: false });
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('teacher_sound_enabled') !== 'false');
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // Simple single A5 note
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35); // clean quick decay
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (err) {
      console.warn("Failed to play notification sound:", err);
    }
  };

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('teacher_sound_enabled', String(next));
      if (next) {
        setTimeout(() => {
          playNotificationSound();
        }, 100);
      }
      return next;
    });
  };

  // Real-time & Notification System States
  const [socket, setSocket] = useState(null);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [countdownTime, setCountdownTime] = useState(30);
  const [notificationsList, setNotificationsList] = useState([]);
  const [notificationsSubTab, setNotificationsSubTab] = useState('all'); // 'all', 'unread'
  
  // Settings States
  const [soundPref, setSoundPref] = useState(true);
  const [pushPref, setPushPref] = useState(true);
  const [emailPref, setEmailPref] = useState(true);
  const [workHoursStart, setWorkHoursStart] = useState('09:00');
  const [workHoursEnd, setWorkHoursEnd] = useState('17:00');
  const [dndActive, setDndActive] = useState(false);
  const [dndStart, setDndStart] = useState('22:00');
  const [dndEnd, setDndEnd] = useState('07:00');
  const [subjTaught, setSubjTaught] = useState([]);
  const [clsTaught, setClsTaught] = useState([]);
  const [userStatus, setUserStatus] = useState('offline');

  const chimeIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const soundPrefRef = useRef(soundPref);

  // Sync soundPrefRef
  useEffect(() => {
    soundPrefRef.current = soundPref;
  }, [soundPref]);

  // Load Settings on Mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.getTeacherSettings();
        if (res) {
          setSoundPref(res.soundEnabled);
          setPushPref(res.pushEnabled);
          setEmailPref(res.emailEnabled);
          setWorkHoursStart(res.workingHoursStart);
          setWorkHoursEnd(res.workingHoursEnd);
          setDndActive(res.dndEnabled);
          setDndStart(res.dndStart);
          setDndEnd(res.dndEnd);
          setSubjTaught(res.subjectsTaught);
          setClsTaught(res.classesTaught);
          setUserStatus(res.availabilityStatus);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    loadSettings();
  }, []);

  // Update Status REST helper
  const handleStatusChange = async (status) => {
    try {
      const res = await api.updateTeacherStatus(status);
      setUserStatus(res.status);
      if (socket) {
        socket.emit('teacher:update-status', res.status);
      }
      triggerNotification(`🟢 Status updated to ${status.toUpperCase()}!`, 'green');
    } catch (err) {
      triggerNotification('⚠️ Failed to update status: ' + err.message, 'red');
    }
  };

  // Socket Connection Setup
  useEffect(() => {
    const token = localStorage.getItem('studybuddy_token') || 'demo_teacher_token_bypass';
    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : (typeof window !== 'undefined' && (window.location.hostname !== 'localhost' || window.location.port === '5000')
          ? `${window.location.protocol}//${window.location.host}`
          : 'http://localhost:5000');
    
    const s = io(socketUrl, {
      query: { token }
    });

    s.on('connect', () => {
      console.log('Connected to notification gateway!');
    });

    s.on('doubt:request', (request) => {
      setIncomingRequest(request);
      setCountdownTime(30);

      // Play chime sound recursively every 2.5 seconds if sound enabled
      if (soundPrefRef.current) {
        playNotificationSound();
        chimeIntervalRef.current = setInterval(() => {
          playNotificationSound();
        }, 2500);
      }

      // Circular 30s Countdown Ring
      countdownIntervalRef.current = setInterval(() => {
        setCountdownTime(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);
            s.emit('doubt:decline', { requestId: request.requestId });
            setIncomingRequest(null);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    });

    s.on('doubt:cancel', ({ requestId }) => {
      setIncomingRequest(null);
      if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      
      // Instantly remove the ticket/doubt from local dashboard states
      setTickets(prev => prev.filter(t => t._id !== requestId));
      setDoubts(prev => prev.filter(d => d._id !== requestId));
      
      // If the currently reviewed item is this ticket/doubt, close the modal/detail panel
      setReviewItem(prev => (prev && prev._id === requestId ? null : prev));
      
      // Refresh statistics and data queues silently
      fetchQueue(true);
    });

    s.on('notifications:sync', ({ all }) => {
      setNotificationsList(all);
    });

    setSocket(s);

    return () => {
      s.disconnect();
      if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const handleAcceptRequest = async (requestId) => {
    if (socket && incomingRequest) {
      socket.emit('doubt:accept', { requestId });
      
      // Stop chimes
      if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      const ticketId = incomingRequest.ticketId;
      setIncomingRequest(null);
      
      triggerNotification('🤝 Request Accepted! Opening live support session.', 'green');
      
      // Wait for DB to update and reload
      setTimeout(async () => {
        setActiveQueue('tickets');
        setTicketSubTab('active');
        const activeTickets = await api.getTeacherActiveTickets();
        setTickets(activeTickets);
        const acceptedTicket = activeTickets.find(t => t._id === ticketId);
        if (acceptedTicket) {
          handleOpenReview(acceptedTicket);
        }
      }, 500);
    }
  };

  const handleDeclineRequest = async (requestId) => {
    if (socket) {
      socket.emit('doubt:decline', { requestId });
      setIncomingRequest(null);
      
      if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      
      triggerNotification('Decline request sent. Escalating doubt.', 'yellow');
    }
  };

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
  const hasInitializedTab = useRef(false);

  useEffect(() => {
    fetchQueue();
  }, [activeQueue, ticketSubTab, filterClass, filterSubject]);

  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchQueue(true);
    }, 12000);
    return () => clearInterval(pollInterval);
  }, [filterClass, filterSubject]);

  const fetchQueue = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const filters = {
        class: filterClass,
        subject: filterSubject
      };
      
      const [pendingList, approvedList, rejectedList, doubtsList, pendingTicketsList, activeTicketsList] = await Promise.all([
        api.getPendingAnswers(filters),
        api.getApprovedAnswers(filters),
        api.getRejectedAnswers(filters),
        api.getPendingDoubts({ classNum: filterClass, subject: filterSubject }),
        api.getPendingTickets(),
        api.getTeacherActiveTickets()
      ]);

      const allItems = [...pendingList, ...approvedList, ...rejectedList];
      const avgConfidence = allItems.length > 0
        ? Math.round(allItems.reduce((acc, item) => acc + (item.confidenceScore || 0), 0) / allItems.length)
        : 0;

      // Check if we should play a notification sound (only for doubts and support tickets)
      const prevPendingCount = statsRef.current.pending;
      const prevDoubtsCount = statsRef.current.doubts;
      const prevTicketsCount = statsRef.current.tickets;

      const newPendingCount = pendingList.length;
      const newDoubtsCount = doubtsList.length;
      const newTicketsCount = pendingTicketsList.length;

      // Play sound if doubts or support tickets count increases
      const hasNewItems = 
        newDoubtsCount > prevDoubtsCount ||
        newTicketsCount > prevTicketsCount;

      if (hasNewItems && statsRef.current.initialized && soundEnabledRef.current) {
        playNotificationSound();
      }

      statsRef.current = {
        pending: newPendingCount,
        doubts: newDoubtsCount,
        tickets: newTicketsCount,
        initialized: true
      };

      setStats({
        pending: pendingList.length,
        approved: approvedList.length,
        rejected: rejectedList.length,
        doubts: doubtsList.length,
        tickets: pendingTicketsList.length,
        activeTickets: activeTicketsList.length,
        avgConfidence
      });

      if (activeTicketsList.length > 0 && !hasInitializedTab.current) {
        setTicketSubTab('active');
        hasInitializedTab.current = true;
      }

      // Set active queue lists
      if (activeQueue === 'pending') {
        setAnswers(pendingList);
      } else if (activeQueue === 'approved') {
        setAnswers(approvedList);
      } else if (activeQueue === 'rejected') {
        setAnswers(rejectedList);
      } else if (activeQueue === 'doubts') {
        setDoubts(doubtsList);
      } else if (activeQueue === 'tickets') {
        let ticketList = [];
        if (ticketSubTab === 'pending') {
          ticketList = await api.getPendingTickets();
        } else if (ticketSubTab === 'active') {
          ticketList = await api.getTeacherActiveTickets();
        } else if (ticketSubTab === 'completed') {
          ticketList = await api.getTeacherCompletedTickets();
        }
        setTickets(ticketList);
      }
    } catch (err) {
      console.error(err);
      if (!isSilent) triggerNotification('⚠️ Error loading answer queues.', 'red');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleOpenReview = (item) => {
    setReviewItem(item);
    setWhiteboardImage('');
    if (activeQueue === 'doubts') {
      setEditedAnswerText('');
      setTeacherComments('');
      setReferenceSource('');
    } else if (activeQueue === 'tickets') {
      setEditedAnswerText(item.teacherAnswer || '');
      setWhiteboardImage(item.whiteboardImage || '');
    } else {
      setEditedAnswerText(item.answer);
      setTeacherComments(item.teacherComments || '');
      setReferenceSource(item.sources && item.sources.length > 0 ? item.sources.join(', ') : '');
    }
  };

  const handleCloseReview = () => {
    setReviewItem(null);
    setEditedAnswerText('');
    setTeacherComments('');
    setReferenceSource('');
  };

  const handleResolveDoubt = async () => {
    if (!editedAnswerText.trim()) {
      triggerNotification('⚠️ Please write an explanation.', 'yellow');
      return;
    }
    setSubmitLoading(true);
    try {
      await api.resolveDoubt(reviewItem._id, { teacherAnswer: editedAnswerText });
      triggerNotification('✅ Doubt resolved successfully!', 'green');
      handleCloseReview();
      fetchQueue();
    } catch (err) {
      console.error(err);
      triggerNotification('⚠️ Failed to resolve doubt: ' + err.message, 'red');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAcceptTicket = async () => {
    if (!reviewItem) return;
    setSubmitLoading(true);
    try {
      const updatedTicket = await api.acceptSupportTicket(reviewItem._id);
      setReviewItem(updatedTicket);
      triggerNotification('🎫 Support ticket accepted successfully!', 'green');
      fetchQueue();
    } catch (err) {
      console.error(err);
      triggerNotification('⚠️ Failed to accept ticket: ' + err.message, 'red');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!reviewItem) return;
    if (!editedAnswerText.trim() && reviewItem.supportType === 'text') {
      triggerNotification('⚠️ Please write an explanation before submitting.', 'yellow');
      return;
    }
    if (reviewItem.supportType === 'whiteboard' && !whiteboardImage) {
      triggerNotification('⚠️ Please draw and click save on the whiteboard before submitting.', 'yellow');
      return;
    }
    
    setSubmitLoading(true);
    try {
      const updatedTicket = await api.resolveSupportTicket(reviewItem._id, editedAnswerText, whiteboardImage);
      setReviewItem(updatedTicket);
      triggerNotification('✅ Support ticket resolved and marked solved!', 'green');
      setEditedAnswerText('');
      setWhiteboardImage('');
      fetchQueue();
    } catch (err) {
      console.error(err);
      triggerNotification('⚠️ Failed to resolve ticket: ' + err.message, 'red');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAction = async (actionType) => {
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
      triggerNotification(`🎉 Response successfully reviewed and marked as ${actionType === 'reject' ? 'rejected' : 'verified'}!`, 'green');
      handleCloseReview();
      fetchQueue();
    } catch (err) {
      triggerNotification(err.message || 'Error saving review.', 'red');
    } finally {
      setSubmitLoading(false);
    }
  };

  const renderSettingsTab = () => {
    return (
      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '25px', width: '100%', textAlign: 'left' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '25px'
        }}>
          {/* Section 1: Notification Preferences */}
          <div className="card-buddy" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', margin: 0, borderBottom: '1.5px solid var(--border-light)', paddingBottom: '12px' }}>
              <Bell className="text-purple-600" size={20} /> Alert Toggles
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Sound toggle */}
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Chime Ringtone Sound</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Play double-note synthesizer chiming on incoming doubts</span>
                </span>
                <input
                  type="checkbox"
                  checked={soundPref}
                  onChange={(e) => setSoundPref(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--color-purple)' }}
                />
              </label>

              {/* Push notifications */}
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-main)' }}>FCM Push Notifications</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Send high-priority alerts directly to mobile device</span>
                </span>
                <input
                  type="checkbox"
                  checked={pushPref}
                  onChange={(e) => setPushPref(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--color-purple)' }}
                />
              </label>

              {/* Email alerts */}
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Email Alerts (Nodemailer)</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Send HTML summaries when questions matching criteria are raised</span>
                </span>
                <input
                  type="checkbox"
                  checked={emailPref}
                  onChange={(e) => setEmailPref(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--color-purple)' }}
                />
              </label>
            </div>
          </div>

          {/* Section 2: Working Hours & DND */}
          <div className="card-buddy" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', margin: 0, borderBottom: '1.5px solid var(--border-light)', paddingBottom: '12px' }}>
              <Clock className="text-purple-600" size={20} /> Availability Schedule
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Working Hours */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Working Hours</span>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="time"
                    value={workHoursStart}
                    onChange={(e) => setWorkHoursStart(e.target.value)}
                    className="buddy-filter-input-student"
                    style={{ flex: 1, minHeight: '38px', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                  />
                  <span style={{ color: 'var(--text-muted)' }}>to</span>
                  <input
                    type="time"
                    value={workHoursEnd}
                    onChange={(e) => setWorkHoursEnd(e.target.value)}
                    className="buddy-filter-input-student"
                    style={{ flex: 1, minHeight: '38px', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              {/* DND Toggle & Range */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '5px' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Do Not Disturb (DND) Mode</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Silence all real-time call booking alerts during these hours</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={dndActive}
                    onChange={(e) => setDndActive(e.target.checked)}
                    style={{ width: '20px', height: '20px', accentColor: 'var(--color-purple)' }}
                  />
                </label>

                {dndActive && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
                    <input
                      type="time"
                      value={dndStart}
                      onChange={(e) => setDndStart(e.target.value)}
                      className="buddy-filter-input-student"
                      style={{ flex: 1, minHeight: '38px', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                    />
                    <span style={{ color: 'var(--text-muted)' }}>to</span>
                    <input
                      type="time"
                      value={dndEnd}
                      onChange={(e) => setDndEnd(e.target.value)}
                      className="buddy-filter-input-student"
                      style={{ flex: 1, minHeight: '38px', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Subjects & Classes Taught */}
          <div className="card-buddy" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', margin: 0, borderBottom: '1.5px solid var(--border-light)', paddingBottom: '12px' }}>
              <BookOpen className="text-purple-600" size={20} /> Teaching Criteria (Routing Filters)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {/* Classes Taught */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Classes You Teach</span>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {[6, 7, 8, 9, 10].map(classNum => {
                    const isChecked = clsTaught.includes(classNum);
                    return (
                      <label key={classNum} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: `1.5px solid ${isChecked ? 'var(--color-purple)' : 'var(--border-light)'}`,
                        backgroundColor: isChecked ? 'var(--color-purple-light)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.82rem',
                        transition: 'all 0.15s'
                      }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setClsTaught(prev => [...prev, classNum]);
                            } else {
                              setClsTaught(prev => prev.filter(c => c !== classNum));
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        Class {classNum}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Subjects Taught */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Subjects You Teach</span>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {['Science', 'Mathematics', 'English', 'Social Studies', 'Biology', 'Chemistry', 'Physics'].map(sub => {
                    const isChecked = subjTaught.includes(sub);
                    return (
                      <label key={sub} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: `1.5px solid ${isChecked ? 'var(--color-purple)' : 'var(--border-light)'}`,
                        backgroundColor: isChecked ? 'var(--color-purple-light)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.82rem',
                        transition: 'all 0.15s'
                      }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSubjTaught(prev => [...prev, sub]);
                            } else {
                              setSubjTaught(prev => prev.filter(s => s !== sub));
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        {sub}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit settings button */}
        <button
          type="submit"
          className="btn-3d btn-3d-purple py-3"
          style={{ alignSelf: 'flex-start', paddingLeft: '40px', paddingRight: '40px', fontWeight: 'bold', fontSize: '0.95rem' }}
        >
          💾 Save Settings & Configurations
        </button>
      </form>
    );
  };

  const renderNotificationsTab = () => {
    const list = notificationsSubTab === 'unread' 
      ? notificationsList.filter(n => !n.read) 
      : notificationsList;

    const handleMarkAllRead = async () => {
      try {
        const unreadIds = notificationsList.filter(n => !n.read).map(n => n._id);
        if (unreadIds.length > 0) {
          await api.markNotificationsRead(unreadIds);
          setNotificationsList(prev => prev.map(n => ({ ...n, read: true })));
          triggerNotification('🔔 All notifications marked as read.', 'green');
        }
      } catch (err) {
        console.error(err);
      }
    };

    const handleMarkSingleRead = async (id) => {
      try {
        await api.markNotificationsRead([id]);
        setNotificationsList(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      } catch (err) {
        console.error(err);
      }
    };

    const handleOpenNotificationItem = async (n) => {
      handleMarkSingleRead(n._id);
      if (n.metadata?.ticketId) {
        setActiveQueue('tickets');
        setTicketSubTab(n.status === 'completed' ? 'completed' : 'active');
        const list = await api.getTeacherActiveTickets();
        setTickets(list);
        const item = list.find(t => t._id === n.metadata.ticketId) || n.metadata;
        handleOpenReview(item);
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          {/* Subtabs All vs Unread */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'unread'].map(t => (
              <button
                key={t}
                onClick={() => setNotificationsSubTab(t)}
                type="button"
                className="btn-3d btn-3d-sm"
                style={{
                  backgroundColor: notificationsSubTab === t ? 'var(--color-purple)' : 'var(--bg-card)',
                  color: notificationsSubTab === t ? '#ffffff' : 'var(--text-muted)',
                  borderColor: notificationsSubTab === t ? 'var(--color-purple)' : 'var(--border-light)',
                  textTransform: 'capitalize'
                }}
              >
                {t} ({t === 'unread' ? notificationsList.filter(n => !n.read).length : notificationsList.length})
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={notificationsList.filter(n => !n.read).length === 0}
            className="btn-3d btn-3d-light btn-3d-sm"
          >
            Mark All Read
          </button>
        </div>

        {list.length === 0 ? (
          <div className="card-buddy" style={{ padding: '50px', textAlign: 'center' }}>
            <Mascot size={100} expression="happy" style={{ margin: '0 auto 15px auto' }} />
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', margin: '0 0 5px 0' }}>All Caught Up!</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>You have no notifications in this filter.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {list.map(n => {
              const statusColors = {
                new: { bg: '#e0f2fe', text: '#0369a1', label: 'New Help' },
                accepted: { bg: '#dcfce7', text: '#15803d', label: 'Accepted Live' },
                missed: { bg: '#fef3c7', text: '#b45309', label: 'Missed Request' },
                declined: { bg: '#fee2e2', text: '#b91c1c', label: 'Declined' },
                completed: { bg: '#f3e8ff', text: '#6b21a8', label: 'Completed' }
              };
              const styleSet = statusColors[n.status] || { bg: '#f3f4f6', text: '#374151', label: n.status };

              return (
                <div
                  key={n._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    backgroundColor: n.read ? 'var(--bg-card)' : 'rgba(109, 40, 217, 0.03)',
                    border: `1.5px solid ${n.read ? 'var(--border-light)' : 'rgba(109, 40, 217, 0.15)'}`,
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {!n.read && (
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-purple)' }} />
                      )}
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        backgroundColor: styleSet.bg,
                        color: styleSet.text,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${styleSet.text}1c`
                      }}>
                        {styleSet.label}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                        📅 {new Date(n.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.92rem', margin: 0, fontWeight: 'bold', color: 'var(--text-main)' }}>
                      {n.title}
                    </h4>
                    <p style={{ fontSize: '0.82rem', margin: 0, color: 'var(--text-muted)' }}>
                      {n.body}
                    </p>
                    
                    {n.metadata && n.metadata.questionPreview && (
                      <p style={{ fontSize: '0.78rem', margin: '4px 0 0 0', fontStyle: 'italic', color: 'var(--text-muted)', paddingLeft: '8px', borderLeft: '2px solid var(--border-light)' }}>
                        Question Preview: "{n.metadata.questionPreview}"
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {n.metadata && (n.metadata.ticketId || n.metadata.doubtId) && (
                      <button
                        type="button"
                        onClick={() => handleOpenNotificationItem(n)}
                        className="btn-3d btn-3d-purple btn-3d-sm"
                      >
                        Inspect
                      </button>
                    )}
                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => handleMarkSingleRead(n._id)}
                        className="btn-3d btn-3d-light btn-3d-sm"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.updateTeacherSettings({
        soundEnabled: soundPref,
        pushEnabled: pushPref,
        emailEnabled: emailPref,
        workingHoursStart: workHoursStart,
        workingHoursEnd: workHoursEnd,
        dndEnabled: dndActive,
        dndStart: dndStart,
        dndEnd: dndEnd,
        subjectsTaught: subjTaught,
        classesTaught: clsTaught
      });
      triggerNotification('⚙️ Settings saved successfully!', 'green');
      fetchQueue();
    } catch (err) {
      triggerNotification('⚠️ Failed to save settings: ' + err.message, 'red');
    }
  };

  const filteredAnswers = answers.filter(a => {
    return a.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
           a.answer.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', textAlign: 'left' }}>
      
      {/* Header Banner */}
      <div 
        className="card-buddy"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, var(--color-purple-dark) 0%, var(--color-purple) 100%)',
          color: '#ffffff',
          border: '2px solid var(--color-purple)',
          boxShadow: '0 8px 0 var(--shadow-color)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', zIndex: 10 }}>
          <div>
            <Mascot size={72} expression="smart" className="animate-mascot" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                padding: '4px 12px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}>
                Teacher Verification Portal
              </span>
              <span style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                padding: '3px 8px',
                borderRadius: '6px'
              }}>
                Expert: {user?.specialization || 'All Subjects'}
              </span>
            </div>
            <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: 800, fontFamily: 'var(--font-header)' }}>
              Welcome, {user?.name || 'Teacher'}
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#e0e7ff', margin: 0, opacity: 0.9 }}>
              Logged in as a verified educator at <b>{user?.institution}</b>. Inspect and verify student answers.
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10, flexWrap: 'wrap' }}>
          {/* Availability Status Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#e0e7ff', fontWeight: 'bold' }}>Status:</span>
            <select
              value={userStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{
                backgroundColor: userStatus === 'online' ? '#22c55e' : userStatus === 'busy' ? '#ef4444' : userStatus === 'away' ? '#eab308' : 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                border: '1.5px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s'
              }}
            >
              <option value="online" style={{ color: '#000' }}>🟢 Online</option>
              <option value="away" style={{ color: '#000' }}>🟡 Away</option>
              <option value="busy" style={{ color: '#000' }}>🔴 Busy</option>
              <option value="offline" style={{ color: '#000' }}>⚪ Offline</option>
            </select>
          </div>

          <button 
            onClick={() => setSoundPref(prev => !prev)} 
            className="btn-3d btn-3d-light btn-3d-sm"
            type="button"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '120px' }}
          >
            {soundPref ? '🔊 Sound: On' : '🔇 Sound: Off'}
          </button>
          <button 
            onClick={() => fetchQueue(false)} 
            className="btn-3d btn-3d-light btn-3d-sm"
            type="button"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🔄 Refresh Queues
          </button>
          <button 
            onClick={logout} 
            className="btn-3d btn-3d-red btn-3d-sm"
            type="button"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🚪 Log Out
          </button>
        </div>
      </div>

      {/* Top Stats Strip */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '20px'
      }}>
        {/* Card 1: Pending Review */}
        <div 
          className="card-buddy"
          style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
            borderColor: '#ffe0b2'
          }}
        >
          <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.7)', color: '#ff6d00', display: 'flex', shrink: 0 }}>
            <Clock size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', color: '#ff6d00', letterSpacing: '0.5px' }}>Pending Review</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#e65100', fontFamily: 'var(--font-header)' }}>{stats.pending} Questions</span>
          </div>
        </div>

        {/* Card 2: Verified Answers */}
        <div 
          className="card-buddy"
          style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
            borderColor: '#c8e6c9'
          }}
        >
          <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.7)', color: '#2e7d32', display: 'flex', shrink: 0 }}>
            <CheckCircle size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', color: '#2e7d32', letterSpacing: '0.5px' }}>Verified Answers</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1b5e20', fontFamily: 'var(--font-header)' }}>{stats.approved} Approved</span>
          </div>
        </div>

        {/* Card 3: Flagged Questions */}
        <div 
          className="card-buddy"
          style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
            borderColor: '#ffcdd2'
          }}
        >
          <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.7)', color: '#d32f2f', display: 'flex', shrink: 0 }}>
            <AlertTriangle size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', color: '#d32f2f', letterSpacing: '0.5px' }}>Flagged Questions</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#c62828', fontFamily: 'var(--font-header)' }}>{stats.rejected} Rejected</span>
          </div>
        </div>

        {/* Card 4: Average AI Confidence */}
        <div 
          className="card-buddy"
          style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            background: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)',
            borderColor: '#b2ebf2'
          }}
        >
          <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.7)', color: '#0097a7', display: 'flex', shrink: 0 }}>
            <TrendingUp size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', color: '#0097a7', letterSpacing: '0.5px' }}>Avg AI Confidence</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#006064', fontFamily: 'var(--font-header)' }}>{stats.avgConfidence}% Accuracy</span>
          </div>
        </div>
      </section>

      {/* Main Layout Grid */}
      <div className="dashboard-grid">
        
        {activeQueue === 'settings' && (
          <div style={{ gridColumn: 'span 2', width: '100%' }}>
            {renderSettingsTab()}
          </div>
        )}
        {activeQueue === 'notifications' && (
          <div style={{ gridColumn: 'span 2', width: '100%' }}>
            {renderNotificationsTab()}
          </div>
        )}

        {/* Left Column: Queues and Filters */}
        {activeQueue !== 'settings' && activeQueue !== 'notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
          
          {/* Tabs and filters wrapper */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* Button group Tab Bar */}
            <div style={{
              display: 'flex',
              backgroundColor: 'var(--bg-app)',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              border: '2px solid var(--border-light)',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              {[
                { id: 'pending', label: '📥 Pending Review' },
                { id: 'approved', label: '✅ Approved Verified' },
                { id: 'rejected', label: '❌ Rejected / Flagged' },
                { id: 'doubts', label: '🙋 Student Doubts' },
                { id: 'tickets', label: '🎫 Support Tickets' },
                { id: 'notifications', label: `🔔 Notifications` },
                { id: 'settings', label: '⚙️ Settings' }
              ].map((tab) => {
                const isActive = activeQueue === tab.id;
                const unreadNotifications = notificationsList.filter(n => !n.read).length;
                const countVal = tab.id === 'pending' 
                  ? stats.pending 
                  : tab.id === 'approved' 
                    ? stats.approved 
                    : tab.id === 'rejected' 
                      ? stats.rejected 
                      : tab.id === 'doubts' 
                        ? stats.doubts 
                        : tab.id === 'tickets' 
                          ? (stats.tickets + (stats.activeTickets || 0)) 
                          : tab.id === 'notifications' 
                            ? unreadNotifications 
                            : 0;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveQueue(tab.id); handleCloseReview(); }}
                    type="button"
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      fontFamily: 'var(--font-header)',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: 'none',
                      backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                      color: isActive ? 'var(--color-purple-dark)' : 'var(--text-muted)',
                      boxShadow: isActive ? '0 4px 0 var(--shadow-color)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>{tab.label}</span>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 'bold',
                      backgroundColor: isActive ? 'var(--color-purple-light)' : 'var(--border-light)',
                      color: isActive ? 'var(--color-purple-dark)' : 'var(--text-muted)'
                    }}>
                      {countVal}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filter selectors and search bar in a clean row */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              
              {/* Search input */}
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search questions by keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="buddy-filter-input-student w-full"
                  style={{ paddingLeft: '40px', minHeight: '38px', fontSize: '0.88rem' }}
                />
              </div>

              {/* Class Selector Dropdown */}
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="buddy-filter-input-student"
                style={{ minHeight: '38px', fontSize: '0.88rem', flex: '0 0 auto', width: '130px' }}
              >
                <option value="">All Classes</option>
                {[6, 7, 8, 9, 10].map(i => <option key={i} value={i}>Class {i}</option>)}
              </select>

              {/* Subject Selector Dropdown */}
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="buddy-filter-input-student"
                style={{ minHeight: '38px', fontSize: '0.88rem', flex: '0 0 auto', width: '150px' }}
              >
                <option value="">All Subjects</option>
                {['Science', 'Mathematics', 'English', 'Social Studies', 'Biology', 'Chemistry', 'Physics'].map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Scrollable Answer Cards List */}
          {loading ? (
            <div className="card-buddy" style={{ padding: '40px', textAlign: 'center' }}>
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent" />
              <p style={{ marginTop: '10px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>Loading questions list...</p>
            </div>
          ) : (activeQueue === 'doubts' ? doubts : activeQueue === 'tickets' ? tickets : filteredAnswers).length === 0 ? (
            <div className="card-buddy" style={{ padding: '40px', textAlign: 'center' }}>
              <Mascot size={100} expression="happy" style={{ margin: '0 auto 15px auto' }} />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', margin: '0 0 5px 0' }}>Queue is empty!</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Excellent work! There are no items in the current queue matching your filters.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '5px', minWidth: 0 }}>
              {activeQueue === 'tickets' && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {['pending', 'active', 'completed'].map((subTab) => {
                    const isSubActive = ticketSubTab === subTab;
                    return (
                      <button
                        key={subTab}
                        onClick={() => { setTicketSubTab(subTab); handleCloseReview(); }}
                        type="button"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 'bold',
                          borderRadius: '8px',
                          border: '1.5px solid',
                          borderColor: isSubActive ? 'var(--color-purple)' : 'var(--border-light)',
                          backgroundColor: isSubActive ? 'var(--color-purple-light)' : 'var(--bg-card)',
                          color: isSubActive ? 'var(--color-purple-dark)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          textTransform: 'capitalize'
                        }}
                      >
                        {subTab} Tickets
                      </button>
                    );
                  })}
                </div>
              )}
              {activeQueue === 'tickets' && stats.activeTickets > 0 && (
                <div style={{
                  backgroundColor: 'var(--color-purple-light)',
                  border: '1.5px solid var(--color-purple)',
                  color: 'var(--color-purple-dark)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}>
                  <span>⚠️ You have {stats.activeTickets} accepted support ticket(s) in progress. Please complete them!</span>
                  {ticketSubTab !== 'active' && (
                    <button
                      type="button"
                      onClick={() => setTicketSubTab('active')}
                      style={{
                        backgroundColor: 'var(--color-purple-dark)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      View Active
                    </button>
                  )}
                </div>
              )}
              {activeQueue === 'tickets' ? (
                tickets.map((item) => {
                  const isSelected = reviewItem && reviewItem._id === item._id;
                  return (
                    <div
                      key={item._id}
                      onClick={() => handleOpenReview(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '15px',
                        padding: '16px',
                        borderRadius: 'var(--radius-sm)',
                        border: '2.5px solid',
                        borderColor: isSelected ? 'var(--color-purple)' : 'var(--border-light)',
                        backgroundColor: isSelected ? 'var(--color-purple-light)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        minWidth: 0
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{
                            backgroundColor: item.supportType === 'whiteboard' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            color: item.supportType === 'whiteboard' ? '#047857' : '#1d4ed8',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            border: '1.5px solid',
                            borderColor: item.supportType === 'whiteboard' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                            textTransform: 'uppercase'
                          }}>
                            {item.supportType} support
                          </span>
                          <span style={{
                            backgroundColor: 'rgba(124, 58, 237, 0.1)',
                            color: 'var(--color-purple-dark)',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            border: '1.5px solid rgba(124, 58, 237, 0.2)',
                          }}>
                            Class {item.classNum} • {item.subject}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                            👤 Student: {item.studentName}
                          </span>
                        </div>
                        
                        <h4 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 'bold', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Q: {item.question}
                        </h4>
                      </div>
                      
                      <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  );
                })
              ) : activeQueue === 'doubts' ? (
                doubts.map((item) => {
                  const isSelected = reviewItem && reviewItem._id === item._id;
                  return (
                    <div
                      key={item._id}
                      onClick={() => handleOpenReview(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '15px',
                        padding: '16px',
                        borderRadius: 'var(--radius-sm)',
                        border: '2.5px solid',
                        borderColor: isSelected ? 'var(--color-purple)' : 'var(--border-light)',
                        backgroundColor: isSelected ? 'var(--color-purple-light)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        minWidth: 0
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{
                            backgroundColor: 'rgba(124, 58, 237, 0.1)',
                            color: 'var(--color-purple-dark)',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            border: '1.5px solid rgba(124, 58, 237, 0.2)',
                            textTransform: 'uppercase'
                          }}>
                            Doubt • Class {item.classNum} • {item.subject}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                            👤 Student: {item.studentName}
                          </span>
                        </div>
                        
                        <h4 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 'bold', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Q: {item.question}
                        </h4>
                      </div>
                      
                      <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  );
                })
              ) : (
                filteredAnswers.map((item) => {
                  let scoreColor = 'var(--color-red-dark)';
                  let scoreBg = 'var(--color-red-light)';
                  if (item.confidenceScore >= 80) {
                    scoreColor = 'var(--color-green-dark)';
                    scoreBg = 'var(--color-green-light)';
                  } else if (item.confidenceScore >= 60) {
                    scoreColor = 'var(--color-yellow-dark)';
                    scoreBg = 'var(--color-yellow-light)';
                  }

                  const isSelected = reviewItem && reviewItem._id === item._id;

                  return (
                    <div
                      key={item._id}
                      onClick={() => handleOpenReview(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '15px',
                        padding: '16px',
                        borderRadius: 'var(--radius-sm)',
                        border: '2.5px solid',
                        borderColor: isSelected ? 'var(--color-purple)' : 'var(--border-light)',
                        backgroundColor: isSelected ? 'var(--color-purple-light)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        minWidth: 0
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{
                            backgroundColor: 'var(--bg-app)',
                            color: 'var(--text-main)',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            border: '1.5px solid var(--border-light)',
                            textTransform: 'uppercase'
                          }}>
                            Class {item.class} • {item.subject}
                          </span>
                          <span style={{
                            backgroundColor: scoreBg,
                            color: scoreColor,
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '6px'
                          }}>
                            Confidence: {item.confidenceScore}%
                          </span>
                          {item.chapter && item.chapter !== 'General' && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                              📂 {item.chapter}
                            </span>
                          )}
                        </div>
                        
                        <h4 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 'bold', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Q: {item.question}
                        </h4>
                        <p style={{ fontSize: '0.82rem', margin: 0, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '505' }}>
                          Ans: {item.answer}
                        </p>
                      </div>
                      
                      <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        )}

        {/* Right Column: Review / Inspection pane or Mascot state */}
        {activeQueue !== 'settings' && activeQueue !== 'notifications' && (
          <div style={{ minWidth: 0 }}>
          {reviewItem ? (
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '2px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '26px',
              boxShadow: '0 10px 0 var(--shadow-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              position: 'relative'
            }}>
              
              {/* Back button visible only on mobile/tablet viewports */}
              <button
                type="button"
                onClick={handleCloseReview}
                className="btn-3d btn-3d-light btn-3d-sm"
                style={{ width: 'fit-content', marginBottom: '10px' }}
              >
                ← Back to Questions List
              </button>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-light)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                  <GraduationCap className="text-purple-600" size={20} /> Inspect Student Query
                </h3>
                <button
                  onClick={handleCloseReview}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Question Preview Box */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                backgroundColor: 'var(--bg-app)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '2px solid var(--border-light)'
              }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Student Question</span>
                <p style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>
                  {reviewItem.question}
                </p>
              </div>

              {activeQueue === 'tickets' ? (
                <>
                  {/* AI Response Preview (For reference) */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    backgroundColor: 'rgba(124, 58, 237, 0.04)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px dashed var(--color-purple)'
                  }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--color-purple)', textTransform: 'uppercase' }}>AI Generated Explanation</span>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                      {reviewItem.aiAnswer}
                    </p>
                  </div>

                  {/* If ticket is pending, show Accept button */}
                  {reviewItem.status === 'pending' && (
                    <div style={{ padding: '10px 0' }}>
                      <button
                        disabled={submitLoading}
                        onClick={handleAcceptTicket}
                        className="btn-3d btn-3d-purple w-full py-3"
                        style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                      >
                        {submitLoading ? 'Accepting...' : '🤝 Accept Support Ticket'}
                      </button>
                    </div>
                  )}

                  {/* If ticket is assigned, show resolution tools */}
                  {reviewItem.status === 'assigned' && (
                    <>
                      {/* Text Explanation */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Your Custom Explanation & Answer</span>
                        <textarea
                          placeholder="Write a clear explanation for the student..."
                          value={editedAnswerText}
                          onChange={(e) => setEditedAnswerText(e.target.value)}
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

                      {/* Whiteboard Drawing Canvas */}
                      {reviewItem.supportType === 'whiteboard' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Whiteboard Canvas Drawing</span>
                          <Whiteboard 
                            onSave={(base64Image) => setWhiteboardImage(base64Image)} 
                            onSubmit={handleResolveTicket}
                            submitLoading={submitLoading}
                          />
                        </div>
                      )}

                      {/* Submit Button */}
                      <button
                        disabled={submitLoading}
                        onClick={handleResolveTicket}
                        className="btn-3d btn-3d-purple w-full py-3"
                        style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                      >
                        {submitLoading ? 'Sending...' : '📤 Submit Solution & Mark Solved'}
                      </button>
                    </>
                  )}

                  {/* If ticket is completed, show resolved details */}
                  {reviewItem.status === 'completed' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div style={{
                        backgroundColor: '#f0fdf4',
                        border: '1.5px solid #bbf7d0',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#15803d', textTransform: 'uppercase' }}>Resolved by {reviewItem.assignedTeacherName}</span>
                        <p style={{ fontSize: '0.85rem', color: '#166534', margin: 0, fontWeight: 'bold', lineHeight: 1.4 }}>
                          {reviewItem.teacherAnswer || '(No text explanation provided)'}
                        </p>
                      </div>

                      {reviewItem.whiteboardImage && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Whiteboard Explanation Drawing</span>
                          <div style={{ backgroundColor: '#ffffff', border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '10px', display: 'flex', justifyContent: 'center' }}>
                            <img src={reviewItem.whiteboardImage} alt="Teacher Whiteboard Drawing" style={{ maxWidth: '100%', maxHeight: '250px' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : activeQueue === 'doubts' ? (
                <>
                  {/* AI Response Preview (For reference) */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    backgroundColor: 'rgba(124, 58, 237, 0.04)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px dashed var(--color-purple)'
                  }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--color-purple)', textTransform: 'uppercase' }}>AI Generated Explanation</span>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                      {reviewItem.aiAnswer}
                    </p>
                  </div>

                  {/* Teacher Explanation Textarea */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Your Custom Explanation & Answer</span>
                    <textarea
                      placeholder="Write a clear, grade-appropriate explanation or correct the AI's response for the student..."
                      value={editedAnswerText}
                      onChange={(e) => setEditedAnswerText(e.target.value)}
                      style={{
                        width: '100%',
                        height: '160px',
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

                  {/* Submit Resolution Button */}
                  <button
                    disabled={submitLoading}
                    onClick={handleResolveDoubt}
                    className="btn-3d btn-3d-purple w-full py-3"
                    style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                  >
                    {submitLoading ? 'Sending...' : '📤 Submit Explanation & Solve'}
                  </button>
                </>
              ) : (
                <>
                  {/* Edited Answer Area */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tutor Verified Response</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Edit text below if needed</span>
                    </div>
                    <textarea
                      value={editedAnswerText}
                      onChange={(e) => setEditedAnswerText(e.target.value)}
                      style={{
                        width: '100%',
                        height: '140px',
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

                  {/* Teacher Comments */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MessageSquare size={14} /> Tutor Explanation & Tips
                    </span>
                    <input
                      type="text"
                      placeholder="Explain corrections or add learning guidance for the student..."
                      value={teacherComments}
                      onChange={(e) => setTeacherComments(e.target.value)}
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

                  {/* Source References */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <BookOpen size={14} /> Citation References
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. SCERT Science Class 6, Chapter 3 (comma separated)"
                      value={referenceSource}
                      onChange={(e) => setReferenceSource(e.target.value)}
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

                  {/* Action Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', pt: '10px', borderTop: '1.5px solid var(--border-light)' }}>
                    <button
                      disabled={submitLoading}
                      onClick={() => handleAction('reject')}
                      className="btn-3d btn-3d-red btn-3d-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}
                    >
                      <X size={12} /> Reject
                    </button>
                    <button
                      disabled={submitLoading}
                      onClick={() => handleAction('edit')}
                      className="btn-3d btn-3d-blue btn-3d-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}
                    >
                      <Edit3 size={12} /> Save Edits
                    </button>
                    <button
                      disabled={submitLoading}
                      onClick={() => handleAction('approve')}
                      className="btn-3d btn-3d-green btn-3d-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}
                    >
                      <Check size={12} /> Approve
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="card-buddy" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', minHeight: '350px' }}>
              <Mascot size={110} expression="thinking" className="animate-mascot" style={{ marginBottom: '15px' }} />
              <h4 style={{ fontSize: '1.1rem', margin: '0 0 8px 0', textTransform: 'uppercase', color: 'var(--text-main)', fontFamily: 'var(--font-header)' }}>Select an Item to Review</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, maxWidth: '240px', lineHeight: 1.4 }}>
                Click on any item card from the queue on the left to review its content, write explanations, and resolve doubts or verify answers.
              </p>
            </div>
          )}
        </div>
        )}

      </div>

      {/* Rapido-style Ride-Request Full-Screen Popup */}
      {incomingRequest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '3px solid var(--color-purple)',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(109, 40, 217, 0.4)',
            maxWidth: '550px',
            width: '100%',
            overflow: 'hidden',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative'
          }}>
            {/* Header / Subject Banner */}
            <div style={{
              background: 'linear-gradient(135deg, var(--color-purple-dark) 0%, var(--color-purple) 100%)',
              color: '#ffffff',
              padding: '24px',
              textAlign: 'center',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}>
                {incomingRequest.ticketId ? '🎫 Support Ticket' : '🙋 Doubt Request'}
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '900', margin: '0 0 4px 0', fontFamily: 'var(--font-header)' }}>
                Incoming Help Request!
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#e0e7ff', margin: 0 }}>
                A student is waiting for a verified subject teacher.
              </p>
            </div>

            {/* Countdown timer & Details */}
            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '25px', textAlign: 'center' }}>
              {/* Circular Countdown Ring */}
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: '8px solid var(--border-light)',
                borderTopColor: countdownTime > 10 ? '#22c55e' : countdownTime > 5 ? '#eab308' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: '900',
                color: countdownTime > 10 ? '#22c55e' : countdownTime > 5 ? '#eab308' : '#ef4444',
                fontFamily: 'var(--font-header)',
                animation: countdownTime <= 5 ? 'pulse 1s infinite' : 'none'
              }}>
                {countdownTime}s
              </div>

              {/* Student Metadata table */}
              <div style={{ width: '100%', backgroundColor: 'var(--bg-app)', padding: '20px', borderRadius: '16px', border: '1.5px solid var(--border-light)', textAlign: 'left' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>Student Name</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{incomingRequest.studentName}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>Class / Subject</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Class {incomingRequest.classNum} • {incomingRequest.subject}</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>Topic / Chapter</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 'bold', color: 'var(--text-main)', display: 'block', marginBottom: '15px' }}>
                    📂 {incomingRequest.chapter} • {incomingRequest.topic}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>Question Preview</span>
                  <p style={{ fontSize: '0.85rem', margin: 0, fontWeight: 'bold', fontStyle: 'italic', color: 'var(--text-main)', lineHeight: 1.4 }}>
                    "{incomingRequest.question}"
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', width: '100%', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleDeclineRequest(incomingRequest.requestId)}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '2.5px solid #ef4444',
                    borderRadius: '16px',
                    padding: '14px 20px',
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  Decline
                </button>
                
                <button
                  type="button"
                  onClick={() => handleAcceptRequest(incomingRequest.requestId)}
                  style={{
                    backgroundColor: '#22c55e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '14px 20px',
                    fontWeight: '900',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 8px 16px rgba(34, 197, 94, 0.3)',
                    transition: 'all 0.15s'
                  }}
                >
                  🤝 Accept & Open Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
