const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && (window.location.hostname !== 'localhost' || window.location.port === '5000')
    ? `${window.location.protocol}//${window.location.host}/api` 
    : 'http://localhost:5000/api');

// Tab-isolated Token Storage Manager
export const tokenStorage = {
  get() {
    if (typeof window === 'undefined') return null;
    let token = sessionStorage.getItem('studybuddy_token');
    if (!token) {
      token = localStorage.getItem('studybuddy_token');
      if (token) {
        sessionStorage.setItem('studybuddy_token', token);
      }
    }
    return token;
  },
  set(token) {
    if (typeof window === 'undefined') return;
    if (token) {
      sessionStorage.setItem('studybuddy_token', token);
      localStorage.setItem('studybuddy_token', token);
    } else {
      this.remove();
    }
  },
  remove() {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('studybuddy_token');
    localStorage.removeItem('studybuddy_token');
  }
};

// Helper to retrieve auth token
function getAuthHeaders() {
  const token = tokenStorage.get();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 401) {
        tokenStorage.remove();
        if (typeof window !== 'undefined') {
          console.warn("Session expired, invalid, or missing token. Clearing storage and reloading.");
          window.location.reload();
          // Return a pending promise to block execution and prevent error alerts
          return new Promise(() => {});
        }
      }

      const err = new Error(data.message || 'Something went wrong with the API request.');
      err.status = response.status;
      throw err;
    }
    
    return data;
  } catch (error) {
    console.error(`API Error in ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Auth API
  async syncSession(userData) {
    const data = await request('/auth/sync', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return data;
  },

  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) {
      tokenStorage.set(data.token);
    }
    return data;
  },

  async register(userData) {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (data.token) {
      tokenStorage.set(data.token);
    }
    return data;
  },

  async getMe() {
    return await request('/auth/me');
  },

  async updateProfile(profileData) {
    return await request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  logout() {
    tokenStorage.remove();
  },

  // Syllabus API
  async getSyllabus(classNum) {
    return await request(`/syllabus/${classNum}`);
  },

  async getClasses() {
    return await request('/syllabus/classes');
  },

  async getSubjects(classNum) {
    return await request(`/syllabus/subjects/${classNum}`);
  },

  async getChapters(classNum, subject) {
    return await request(`/syllabus/chapters/${classNum}/${subject}`);
  },

  async getTopics(chapter, classNum = '', subject = '') {
    const query = classNum && subject ? `?classNum=${classNum}&subject=${encodeURIComponent(subject)}` : '';
    return await request(`/syllabus/topics/${encodeURIComponent(chapter)}${query}`);
  },

  async uploadSyllabus(syllabusArray) {
    return await request('/syllabus/upload', {
      method: 'POST',
      body: JSON.stringify(syllabusArray)
    });
  },

  async getSchedule() {
    return await request('/planner/schedule');
  },

  // Quizzes API
  async getQuizzes() {
    return await request('/quizzes');
  },

  async submitQuiz(quizId, score, answers, subject) {
    return await request('/quizzes/submit', {
      method: 'POST',
      body: JSON.stringify({ quizId, score, answers, subject })
    });
  },

  async generateQuiz(subject, language) {
    return await request('/quizzes/generate', {
      method: 'POST',
      body: JSON.stringify({ subject, language })
    });
  },

  // Progress API
  async getProgressStats() {
    return await request('/progress/stats');
  },

  async awardXp(xp, reason) {
    return await request('/progress/award-xp', {
      method: 'POST',
      body: JSON.stringify({ xp, reason })
    });
  },

  // Homework API
  async getHomework() {
    return await request('/homework');
  },

  // Reminders API
  async getReminder() {
    return await request('/reminders');
  },

  async saveReminder(time, active = true) {
    return await request('/reminders', {
      method: 'POST',
      body: JSON.stringify({ time, active })
    });
  },

  async createHomework(title, subject, dueDate) {
    return await request('/homework', {
      method: 'POST',
      body: JSON.stringify({ title, subject, dueDate })
    });
  },

  async updateHomework(id, completed) {
    return await request(`/homework/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ completed })
    });
  },

  async deleteHomework(id) {
    return await request(`/homework/${id}`, {
      method: 'DELETE'
    });
  },

  async chatWithAI(message, subject = '', chapter = '', topic = '', studentClass = '', history = [], overrideChoice = null) {
    return await request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, subject, chapter, topic, class: studentClass, history, overrideChoice })
    });
  },

  async translateText(textOrTexts, targetLanguage) {
    const payload = Array.isArray(textOrTexts)
      ? { texts: textOrTexts, targetLanguage }
      : { text: textOrTexts, targetLanguage };
    return await request('/ai/translate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Parent API
  async verifyParentPin(pin) {
    return await request('/parent/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin })
    });
  },

  async createCustomQuest(title, subject, xp) {
    return await request('/parent/custom-quest', {
      method: 'POST',
      body: JSON.stringify({ title, subject, xp })
    });
  },

  async createCustomReward(title, costXp) {
    return await request('/parent/reward', {
      method: 'POST',
      body: JSON.stringify({ title, costXp })
    });
  },

  async unlockReward(rewardId) {
    return await request('/parent/reward/unlock', {
      method: 'POST',
      body: JSON.stringify({ rewardId })
    });
  },

  // Syllabus Ingestion API
  async uploadSyllabusPDFs(files) {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    const token = tokenStorage.get();
    const response = await fetch(`${API_BASE_URL}/ingest/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'File upload failed.');
    }
    return data;
  },

  async getPendingSyllabuses() {
    return await request('/ingest/pending');
  },

  async approveSyllabus(id) {
    return await request(`/ingest/approve/${id}`, {
      method: 'POST'
    });
  },

  async rejectSyllabus(id) {
    return await request(`/ingest/reject/${id}`, {
      method: 'POST'
    });
  },

  async deletePendingSyllabus(id) {
    return await request(`/ingest/pending/${id}`, {
      method: 'DELETE'
    });
  },

  // Exams API
  async getExams() {
    return await request('/exams');
  },

  async createExam(examData) {
    return await request('/exams', {
      method: 'POST',
      body: JSON.stringify(examData)
    });
  },

  async deleteExam(id) {
    return await request(`/exams/${id}`, {
      method: 'DELETE'
    });
  },

  // Planner Plans API
  async getStudyPlans() {
    return await request('/planner/plans');
  },

  async getActiveStudyPlan(planType = 'daily') {
    return await request(`/planner/active/${planType}`);
  },

  async generateStudyPlan(planType = 'daily') {
    return await request('/planner/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planType })
    });
  },

  // Progress Reports API
  async getProgressReport() {
    return await request('/progress/report');
  },

  async getAchievements() {
    return await request('/progress/achievements');
  },

  async submitQuizResult(resultData) {
    return await request('/progress/quiz-result', {
      method: 'POST',
      body: JSON.stringify(resultData)
    });
  },

  // Student Profile API
  async getStudentProfile() {
    return await request('/student/profile');
  },

  async saveStudentProfile(profileData) {
    return await request('/student/profile', {
      method: 'POST',
      body: JSON.stringify(profileData)
    });
  },

  // Parent Student Management API
  async getParentStudents() {
    return await request('/parent/students');
  },

  // Teacher Auth & Onboarding API
  async registerTeacher(formData) {
    const token = tokenStorage.get();
    const response = await fetch(`${API_BASE_URL}/teachers/register`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Error registering teacher.');
    }
    return data;
  },

  async loginTeacher(email, password) {
    return await request('/teachers/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async getTeacherMe() {
    return await request('/teachers/me');
  },

  // Admin Dashboard API
  async getAdminTeachers() {
    return await request('/admin/teachers');
  },

  async approveTeacher(id) {
    return await request(`/admin/teachers/approve/${id}`, {
      method: 'POST'
    });
  },

  async rejectTeacher(id) {
    return await request(`/admin/teachers/reject/${id}`, {
      method: 'POST'
    });
  },

  async suspendTeacher(id) {
    return await request(`/admin/teachers/suspend/${id}`, {
      method: 'POST'
    });
  },

  async deleteTeacherApplication(id) {
    return await request(`/admin/teachers/${id}`, {
      method: 'DELETE'
    });
  },

  async getAdminStats() {
    return await request('/admin/stats');
  },

  async getAdminStudents() {
    return await request('/admin/students');
  },

  async updateStudent(id, studentData) {
    return await request(`/admin/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData)
    });
  },

  async deleteStudent(id) {
    return await request(`/admin/students/${id}`, {
      method: 'DELETE'
    });
  },

  async updateTeacher(id, teacherData) {
    return await request(`/admin/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(teacherData)
    });
  },

  // Teacher Review API
  async getPendingAnswers(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return await request(`/teachers-review/answers/pending?${params}`);
  },

  async getApprovedAnswers(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return await request(`/teachers-review/answers/approved?${params}`);
  },

  async getRejectedAnswers(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return await request(`/teachers-review/answers/rejected?${params}`);
  },

  async reviewAnswer(id, reviewData) {
    return await request(`/teachers-review/answers/review/${id}`, {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });
  },

  async seedSyllabus() {
    return await request('/admin/seed-syllabus', {
      method: 'POST'
    });
  },

  // Direct Teacher registry by Admin
  async createTeacher(teacherData) {
    return await request('/admin/teachers/create', {
      method: 'POST',
      body: JSON.stringify(teacherData)
    });
  },

  // Manual Syllabus management by Admin
  async addSyllabusTopic(topicData) {
    return await request('/syllabus/add-topic', {
      method: 'POST',
      body: JSON.stringify(topicData)
    });
  },

  async deleteSyllabusTopic(topicData) {
    return await request('/syllabus/delete-topic', {
      method: 'POST',
      body: JSON.stringify(topicData)
    });
  },

  async deleteSyllabusChapter(chapterData) {
    return await request('/syllabus/delete-chapter', {
      method: 'POST',
      body: JSON.stringify(chapterData)
    });
  },

  async deleteSyllabusSubject(subjectData) {
    return await request('/syllabus/delete-subject', {
      method: 'POST',
      body: JSON.stringify(subjectData)
    });
  },

  // --- RBAC & System Management APIs ---
  async getAdmins() {
    return await request('/admin/admins');
  },

  async createAdmin(adminData) {
    return await request('/admin/admins', {
      method: 'POST',
      body: JSON.stringify(adminData)
    });
  },

  async updateAdminPermissions(id, permissionsData) {
    return await request(`/admin/admins/permissions/${id}`, {
      method: 'POST',
      body: JSON.stringify(permissionsData)
    });
  },

  async suspendAdmin(id, status) {
    return await request(`/admin/admins/suspend/${id}`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
  },

  async deleteAdmin(id) {
    return await request(`/admin/admins/${id}`, {
      method: 'DELETE'
    });
  },

  async getAuditLogs() {
    return await request('/admin/logs');
  },

  async getHealthStatus() {
    return await request('/admin/health');
  },

  async updateSystemSettings(settings) {
    return await request('/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  },

  async getSystemSettingsPublic() {
    return await request('/admin/settings/public');
  },

  // --- Announcements APIs ---
  async getAnnouncements() {
    return await request('/admin/announcements');
  },

  async createAnnouncement(annData) {
    return await request('/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(annData)
    });
  },

  async deleteAnnouncement(id) {
    return await request(`/admin/announcements/${id}`, {
      method: 'DELETE'
    });
  },

  // --- Reports APIs ---
  async getReports() {
    return await request('/admin/reports');
  },

  async resolveReport(id, status) {
    return await request(`/admin/reports/resolve/${id}`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
  },

  async createReport(reportData) {
    return await request('/admin/reports', {
      method: 'POST',
      body: JSON.stringify(reportData)
    });
  },

  // --- Multi-Layer Trust & Doubt APIs ---
  async createDoubt(doubtData) {
    return await request('/doubts', {
      method: 'POST',
      body: JSON.stringify(doubtData)
    });
  },

  async getStudentDoubts() {
    return await request('/doubts');
  },

  async getDoubtStatus(id) {
    return await request(`/doubts/status/${id}`);
  },

  async getPendingDoubts(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return await request(`/teachers-review/doubts?${params}`);
  },

  async resolveDoubt(id, resolveData) {
    return await request(`/teachers-review/doubts/resolve/${id}`, {
      method: 'POST',
      body: JSON.stringify(resolveData)
    });
  },

  // --- Teacher Support System: Ticket APIs ---
  async createSupportTicket(ticketData) {
    return await request('/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData)
    });
  },

  async getStudentTickets() {
    return await request('/tickets/student');
  },

  async getPendingTickets() {
    return await request('/tickets/pending');
  },

  async getTeacherActiveTickets() {
    return await request('/tickets/active');
  },

  async getTeacherCompletedTickets() {
    return await request('/tickets/completed');
  },

  async acceptSupportTicket(id) {
    return await request(`/tickets/${id}/accept`, {
      method: 'POST'
    });
  },

  async resolveSupportTicket(id, teacherAnswer, whiteboardImage) {
    return await request(`/tickets/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ teacherAnswer, whiteboardImage })
    });
  },

  async getTicketStatus(id) {
    return await request(`/tickets/${id}/status`);
  },

  async deleteSupportTicket(id) {
    return await request(`/tickets/${id}`, {
      method: 'DELETE'
    });
  },

  async deleteBulkSupportTickets(ticketIds) {
    return await request('/tickets/delete-bulk', {
      method: 'POST',
      body: JSON.stringify({ ticketIds })
    });
  },

  async getDoubtStatus(id) {
    return await request(`/doubts/status/${id}`);
  },

  async getAnswerStatus(id) {
    return await request(`/answers/status/${id}`);
  },

  async addTextbookContent(contentData) {
    return await request('/admin/textbook-content', {
      method: 'POST',
      body: JSON.stringify(contentData)
    });
  },

  // --- Teacher Real-Time Notifications & Settings ---
  async getTeacherSettings() {
    return await request('/teachers/settings');
  },

  async updateTeacherSettings(settingsData) {
    return await request('/teachers/settings', {
      method: 'POST',
      body: JSON.stringify(settingsData)
    });
  },

  async updateTeacherStatus(status) {
    return await request('/teachers/status', {
      method: 'POST',
      body: JSON.stringify({ status })
    });
  },

  async getTeacherNotifications() {
    return await request('/teachers/notifications');
  },

  async markNotificationsRead(notificationIds) {
    return await request('/teachers/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ notificationIds })
    });
  },

  async saveTeacherFcmToken(fcmToken) {
    return await request('/teachers/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ fcmToken })
    });
  }
};
