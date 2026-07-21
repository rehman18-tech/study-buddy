const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

const JWT_SECRET = process.env.JWT_SECRET || 'studybuddy_super_secret_key';

let io = null;

// Maps of active connections
// userId -> Set of socketIds (to handle multiple tabs!)
const teacherSockets = new Map();
const studentSockets = new Map();

// Map of active doubt request escalation state
// doubtId/ticketId -> { queue: [], currentIndex: 0, studentId: string, timeoutId: Timeout, data: object }
const activeEscalations = new Map();

const isTimeBetween = (time, start, end) => {
  if (!start || !end) return false;
  const [h, m] = time.split(':').map(Number);
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const target = h * 60 + m;
  const startVal = sh * 60 + sm;
  const endVal = eh * 60 + em;
  if (startVal <= endVal) {
    return target >= startVal && target <= endVal;
  } else { // crosses midnight!
    return target >= startVal || target <= endVal;
  }
};

const sendEmailAlert = async (teacher, requestData) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: process.env.SMTP_PORT || 587,
      auth: {
        user: process.env.SMTP_USER || 'demo@ethereal.email',
        pass: process.env.SMTP_PASS || 'demo_pass'
      }
    });

    const openTicketLink = `http://localhost:5173/teachers-dashboard?tab=tickets&ticketId=${requestData.ticketId || requestData.doubtId}`;

    const mailOptions = {
      from: '"StudyBuddy Support" <support@studybuddy.com>',
      to: teacher.email,
      subject: `🔔 New Doubt Raised: Class ${requestData.classNum} • ${requestData.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #6d28d9; margin-top: 0;">📚 New Student Doubt Alert</h2>
          <p>Hello <strong>${teacher.name}</strong>,</p>
          <p>A student has raised a doubt that matches your verified classes and subjects. Here are the details:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #666;">Student Class:</td>
              <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">Class ${requestData.classNum}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #666;">Subject:</td>
              <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${requestData.subject}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #666;">Chapter / Topic:</td>
              <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${requestData.chapter || 'General'} • ${requestData.topic || 'General'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #666;">Question Preview:</td>
              <td style="padding: 8px; border-bottom: 1px solid #f0f0f0; font-style: italic;">"${requestData.question}"</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #666;">Time Raised:</td>
              <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${new Date(requestData.timeRaised || Date.now()).toLocaleTimeString()}</td>
            </tr>
          </table>
          
          <div style="margin: 25px 0 15px 0; text-align: center;">
            <a href="${openTicketLink}" style="background-color: #6d28d9; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(109, 40, 217, 0.2);">
              🔓 Open Ticket & Respond
            </a>
          </div>
          
          <p style="font-size: 0.82rem; color: #888; text-align: center; margin-top: 25px; border-top: 1px solid #f0f0f0; padding-top: 15px;">
            If you are not available, you can ignore this alert or toggle your status to Offline in your <a href="http://localhost:5173/teachers-dashboard" style="color: #6d28d9;">Teacher Dashboard</a>.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✉️ Email alert sent successfully to teacher ${teacher.email}`);
  } catch (err) {
    console.warn("⚠️ Failed to send email alert to teacher:", err.message);
  }
};

const sendPushNotification = async (fcmToken, requestData) => {
  try {
    if (!fcmToken) return;
    if (admin.apps.length === 0) {
      console.log("[FCM Push Mock] Sent push notification:", {
        title: '🔔 New Student Doubt',
        body: `Class ${requestData.classNum} • ${requestData.subject}`
      });
      return;
    }
    const message = {
      notification: {
        title: '🔔 New Student Doubt',
        body: `Class ${requestData.classNum} • ${requestData.subject}. Tap to respond.`
      },
      data: {
        doubtId: String(requestData.doubtId || ''),
        ticketId: String(requestData.ticketId || '')
      },
      token: fcmToken
    };
    await admin.messaging().send(message);
    console.log('📱 FCM push notification sent successfully to token.');
  } catch (err) {
    console.warn("⚠️ Failed to send FCM push notification:", err.message);
  }
};

const init = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', async (socket) => {
    const token = socket.handshake.query.token;
    if (!token) return;

    try {
      if (token === 'demo_teacher_token_bypass') {
        const demoTeacher = await db.findTeacherByEmail('teacher@studybuddy.com');
        if (demoTeacher) {
          associateUserSocket(demoTeacher._id, 'teacher', socket.id);
          await db.updateTeacher(demoTeacher._id, { availabilityStatus: 'online' });
          emitAvailability(demoTeacher._id, 'online');
          syncUnreadNotifications(demoTeacher._id, socket);
          console.log(`🔌 Demo Teacher connected: ${demoTeacher.name} (Socket: ${socket.id})`);
        }
        return;
      }

      if (token === 'demo_student_token_bypass') {
        const demoStudent = await db.findUserByEmail('alex@studybuddy.com');
        if (demoStudent) {
          associateUserSocket(demoStudent._id, 'student', socket.id);
          console.log(`🔌 Demo Student connected: ${demoStudent.name} (Socket: ${socket.id})`);
        }
        return;
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await db.findUserById(decoded.id);
      if (!user) return;

      if (user.role === 'teacher') {
        associateUserSocket(user._id, 'teacher', socket.id);
        const targetStatus = user.availabilityStatus === 'offline' ? 'online' : user.availabilityStatus;
        await db.updateTeacher(user._id, { availabilityStatus: targetStatus });
        emitAvailability(user._id, targetStatus);
        syncUnreadNotifications(user._id, socket);
        console.log(`🔌 Verified Teacher connected: ${user.name} (Socket: ${socket.id})`);
      } else if (user.role === 'student') {
        associateUserSocket(user._id, 'student', socket.id);
        console.log(`🔌 Student connected: ${user.name} (Socket: ${socket.id})`);
      }

      socket.on('teacher:update-status', async (status) => {
        if (user.role === 'teacher') {
          await db.updateTeacher(user._id, { availabilityStatus: status });
          emitAvailability(user._id, status);
          console.log(`👨‍🏫 Teacher ${user.name} updated availability to: ${status}`);
        }
      });

      socket.on('disconnect', async () => {
        if (user.role === 'teacher') {
          deassociateUserSocket(user._id, 'teacher', socket.id);
          const activeSet = teacherSockets.get(user._id.toString());
          if (!activeSet || activeSet.size === 0) {
            await db.updateTeacher(user._id, { availabilityStatus: 'offline' });
            emitAvailability(user._id, 'offline');
            console.log(`🔌 Teacher disconnected and set offline: ${user.name}`);
          } else {
            console.log(`🔌 Teacher disconnected (active sessions remaining): ${user.name}`);
          }
        } else if (user.role === 'student') {
          deassociateUserSocket(user._id, 'student', socket.id);
          console.log(`🔌 Student disconnected: ${user.name}`);
        }
      });

    } catch (err) {
      console.warn("Socket connection auth error:", err.message);
    }
  });

  console.log("🔌 Real-time Socket.IO Gateway Initialized.");
};

const associateUserSocket = (userId, role, socketId) => {
  const key = userId.toString();
  const map = role === 'teacher' ? teacherSockets : studentSockets;
  if (!map.has(key)) {
    map.set(key, new Set());
  }
  map.get(key).add(socketId);
};

const deassociateUserSocket = (userId, role, socketId) => {
  const key = userId.toString();
  const map = role === 'teacher' ? teacherSockets : studentSockets;
  if (map.has(key)) {
    const set = map.get(key);
    set.delete(socketId);
    if (set.size === 0) {
      map.delete(key);
    }
  }
};

const emitAvailability = (teacherId, status) => {
  if (!io) return;
  io.emit('teacher:status-changed', { teacherId, status });
};

const syncUnreadNotifications = async (teacherId, socket) => {
  try {
    const list = await db.getNotificationsForRecipient(teacherId);
    const unread = list.filter(n => !n.read);
    socket.emit('notifications:sync', { all: list, unread });
  } catch (err) {
    console.error("Error syncing unread notifications:", err);
  }
};

const triggerBroadSync = async (teacherId) => {
  const key = teacherId.toString();
  const set = teacherSockets.get(key);
  if (!set || !io) return;
  try {
    const list = await db.getNotificationsForRecipient(teacherId);
    const unread = list.filter(n => !n.read);
    set.forEach(sid => {
      io.to(sid).emit('notifications:sync', { all: list, unread });
    });
  } catch (err) {
    console.error(err);
  }
};

// Main Smart Routing and Escalation Entry point
const routeDoubtRequest = async (requestData) => {
  const id = requestData.ticketId || requestData.doubtId;
  if (!id) return;

  console.log(`🧭 Smart Routing request: ${id} [Class ${requestData.classNum} • ${requestData.subject}]`);

  const allTeachers = await db.getAllTeachers();
  const teachers = allTeachers.filter(t => t.status === 'approved');

  console.log(`🔍 Total approved teachers found: ${teachers.length}`);
  teachers.forEach(t => {
    console.log(`👨‍🏫 Teacher: ${t.name} (${t.email}), Status: ${t.status}, Availability: ${t.availabilityStatus}`);
  });

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const matchingTeachers = teachers.filter(t => {
    if (t.email === 'teacher@studybuddy.com') {
      return true;
    }

    const matchesSubject = 
      t.specialization?.toLowerCase() === requestData.subject.toLowerCase() ||
      t.subjectsTaught?.some(s => s.toLowerCase() === requestData.subject.toLowerCase());
    
    const matchesClass = 
      t.classesTaught?.includes(Number(requestData.classNum)) ||
      t.classesTaught?.length === 0 || 
      !t.classesTaught;

    const isDndActive = t.dndEnabled && isTimeBetween(timeStr, t.dndStart, t.dndEnd);

    return matchesSubject && matchesClass && !isDndActive;
  });

  console.log(`🎯 Matching teachers: ${matchingTeachers.map(t => t.email).join(', ')}`);

  const onlineQueue = matchingTeachers.filter(t => 
    t.availabilityStatus === 'online' || t.availabilityStatus === 'away'
  );

  console.log(`🟢 Online matching queue count: ${onlineQueue.length}`);

  const offlineQueue = matchingTeachers.filter(t => 
    t.availabilityStatus === 'offline' || t.availabilityStatus === 'busy'
  );

  if (onlineQueue.length > 0) {
    // Set up escalation queue state
    const escalationState = {
      queue: onlineQueue.map(t => t._id),
      currentIndex: 0,
      studentId: requestData.studentId,
      data: requestData
    };
    activeEscalations.set(id, escalationState);
    dispatchToNextTeacher(id);
  } else {
    // No online teachers -> trigger offline fallback instantly
    await triggerOfflineAlerts(matchingTeachers.length > 0 ? matchingTeachers : teachers, requestData);
  }
};

const dispatchToNextTeacher = async (requestId) => {
  const state = activeEscalations.get(requestId);
  if (!state) return;

  const { queue, currentIndex, studentId, data } = state;

  if (currentIndex >= queue.length) {
    // Queue ended with no acceptance -> fallback offline alerts to all matching teachers
    console.log(`🚨 Escalation queue completed for ${requestId}. No teacher accepted. Sending offline alerts.`);
    const allTeachers = await db.getAllTeachers();
    const matchingTeachers = allTeachers.filter(t => queue.includes(t._id));
    await triggerOfflineAlerts(matchingTeachers, data);
    activeEscalations.delete(requestId);
    return;
  }

  const teacherId = queue[currentIndex];
  console.log(`📞 Escalating doubt ${requestId} to verified teacher: ${teacherId} (Step ${currentIndex + 1}/${queue.length})`);

  // Notify student socket of searching progress
  const studentSet = studentSockets.get(studentId.toString());
  if (studentSet && io) {
    studentSet.forEach(sid => {
      io.to(sid).emit('doubt:searching', {
        message: `Searching for verified teachers (Trying ${currentIndex + 1} of ${queue.length})...`
      });
    });
  }

  // Create notification in DB
  const notification = await db.createNotification({
    recipientId: teacherId,
    title: '🔔 Student Needs Help!',
    body: `Class ${data.classNum} student requested support for ${data.subject}.`,
    type: data.ticketId ? 'ticket' : 'doubt',
    status: 'new',
    metadata: {
      ...data,
      doubtId: data.doubtId,
      ticketId: data.ticketId
    }
  });

  await triggerBroadSync(teacherId);

  // Send request event to teacher sockets
  const teacherSet = teacherSockets.get(teacherId);
  if (teacherSet && io) {
    teacherSet.forEach(sid => {
      io.to(sid).emit('doubt:request', {
        requestId,
        notificationId: notification._id,
        studentName: data.studentName,
        classNum: data.classNum,
        subject: data.subject,
        chapter: data.chapter || 'General',
        topic: data.topic || 'General',
        question: data.question,
        timeRaised: data.timeRaised || new Date()
      });
    });
  }

  // Set 30-second countdown timeout
  state.timeoutId = setTimeout(async () => {
    console.log(`⏰ Timeout expired (30s) for doubt ${requestId} on teacher ${teacherId}`);
    
    // Update notification status to missed
    await db.updateNotificationStatus(notification._id, 'missed');
    await triggerBroadSync(teacherId);

    // Emit cancel to teacher
    if (teacherSet && io) {
      teacherSet.forEach(sid => {
        io.to(sid).emit('doubt:cancel', { requestId });
      });
    }

    // Advance queue
    state.currentIndex += 1;
    dispatchToNextTeacher(requestId);
  }, 30000);
};

const handleAccept = async (requestId, teacherId, socket) => {
  const state = activeEscalations.get(requestId);
  if (!state) {
    // Request might have already been accepted or escalated
    socket.emit('doubt:error', { message: 'This request is no longer available.' });
    return;
  }

  // Cancel timeout
  if (state.timeoutId) clearTimeout(state.timeoutId);

  const teacher = await db.findUserById(teacherId);
  if (!teacher) return;

  console.log(`🤝 Teacher ${teacher.name} accepted doubt request ${requestId}`);

  // Assign in database
  let updatedRecord = null;
  if (state.data.ticketId) {
    updatedRecord = await db.acceptSupportTicket(state.data.ticketId, teacherId, teacher.name);
  }

  // Update notification status
  const allNotifications = await db.getNotificationsForRecipient(teacherId);
  const notifications = allNotifications.filter(n => n.status === 'new');
  const targetNotification = notifications.find(n => n.metadata.ticketId === requestId || n.metadata.doubtId === requestId);
  if (targetNotification) {
    await db.updateNotificationStatus(targetNotification._id, 'accepted');
  }

  await triggerBroadSync(teacherId);

  // Set teacher availabilityStatus to busy
  await db.updateTeacher(teacherId, { availabilityStatus: 'in_live_session' });
  emitAvailability(teacherId, 'in_live_session');

  // Notify student socket
  const studentSet = studentSockets.get(state.studentId.toString());
  if (studentSet && io) {
    studentSet.forEach(sid => {
      io.to(sid).emit('doubt:assigned', {
        teacherName: teacher.name,
        qualification: teacher.qualification,
        institution: teacher.institution,
        ticket: updatedRecord || state.data
      });
    });
  }

  // Cancel this request across all other connections
  activeEscalations.delete(requestId);
};

const handleDecline = async (requestId, teacherId, socket) => {
  const state = activeEscalations.get(requestId);
  if (!state) return;

  // Verify it is the current teacher in queue who declined
  const currentId = state.queue[state.currentIndex];
  if (currentId !== teacherId) return;

  console.log(`🛑 Teacher ${teacherId} declined doubt request ${requestId}`);

  // Cancel timeout
  if (state.timeoutId) clearTimeout(state.timeoutId);

  // Update notification status to declined
  const allNotifications = await db.getNotificationsForRecipient(teacherId);
  const notifications = allNotifications.filter(n => n.status === 'new');
  const targetNotification = notifications.find(n => n.metadata.ticketId === requestId || n.metadata.doubtId === requestId);
  if (targetNotification) {
    await db.updateNotificationStatus(targetNotification._id, 'declined');
  }
  await triggerBroadSync(teacherId);

  // Emit cancel event to teacher dashboard
  const teacherSet = teacherSockets.get(teacherId.toString());
  if (teacherSet && io) {
    teacherSet.forEach(sid => {
      io.to(sid).emit('doubt:cancel', { requestId });
    });
  }

  // Advance queue immediately
  state.currentIndex += 1;
  dispatchToNextTeacher(requestId);
};

const triggerOfflineAlerts = async (teachers, requestData) => {
  console.log(`📬 Broad sending offline alerts (Push + Email) to ${teachers.length} teachers.`);

  for (const t of teachers) {
    // Create DB notification log
    await db.createNotification({
      recipientId: t._id,
      title: '🔔 Student Needs Offline Help!',
      body: `Class ${requestData.classNum} student requested support. Email/push alert sent.`,
      type: requestData.ticketId ? 'ticket' : 'doubt',
      status: 'new',
      metadata: {
        ...requestData,
        doubtId: requestData.doubtId,
        ticketId: requestData.ticketId
      }
    });

    await triggerBroadSync(t._id);

    // Send email alert
    if (t.emailEnabled !== false) {
      await sendEmailAlert(t, requestData);
    }

    // Send FCM push alert
    if (t.pushEnabled !== false && t.fcmToken) {
      await sendPushNotification(t.fcmToken, requestData);
    }
  }

  // Alert student that teachers are offline
  const studentSet = studentSockets.get(requestData.studentId.toString());
  if (studentSet && io) {
    studentSet.forEach(sid => {
      io.to(sid).emit('doubt:offline', {
        message: 'All verified subject teachers are currently offline. We have sent email and push notifications directly to their devices. They will resolve your doubt immediately upon logging in!'
      });
    });
  }
};

const notifyStudentDoubtAssigned = (ticket, teacher) => {
  if (!io) return;
  const studentIdStr = ticket.studentId.toString();
  const studentSet = studentSockets.get(studentIdStr);
  
  if (studentSet) {
    studentSet.forEach(sid => {
      io.to(sid).emit('doubt:assigned', {
        teacherName: teacher.name,
        qualification: teacher.qualification || 'Verified Teacher',
        institution: teacher.institution || 'StudyBuddy Partner',
        ticket
      });
    });
    console.log(`📡 Emitted doubt:assigned to student ${studentIdStr} via socketService`);
  } else {
    console.log(`⚠️ No active socket connection found for student ${studentIdStr}`);
  }
};

const cancelDoubtRequest = (requestId, assignedTeacherId = null) => {
  const state = activeEscalations.get(requestId);
  if (state) {
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
    }
    activeEscalations.delete(requestId);
    console.log(`❌ Cancelled active escalation queue for doubt/ticket ${requestId}`);
    
    // Notify the currently assigned teacher if applicable to clear their UI
    const currentTeacherId = state.queue[state.currentIndex];
    if (currentTeacherId) {
      const teacherSet = teacherSockets.get(currentTeacherId.toString());
      if (teacherSet && io) {
        teacherSet.forEach(sid => {
          io.to(sid).emit('doubt:cancel', { requestId });
        });
      }
      triggerBroadSync(currentTeacherId);
    }
  }

  // If there's an assigned teacher, notify them too
  if (assignedTeacherId) {
    const teacherSet = teacherSockets.get(assignedTeacherId.toString());
    if (teacherSet && io) {
      teacherSet.forEach(sid => {
        io.to(sid).emit('doubt:cancel', { requestId });
      });
    }
    triggerBroadSync(assignedTeacherId);
  }

  // Also broadcast doubt:cancel globally to all teachers to ensure offline alert cleanups are reflected immediately
  if (io) {
    io.emit('doubt:cancel', { requestId });
  }
};

module.exports = {
  init,
  routeDoubtRequest,
  handleAccept,
  handleDecline,
  notifyStudentDoubtAssigned,
  cancelDoubtRequest
};
