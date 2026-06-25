const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to retrieve auth token
function getAuthHeaders() {
  const token = localStorage.getItem('studybuddy_token');
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
      throw new Error(data.message || 'Something went wrong with the API request.');
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
      localStorage.setItem('studybuddy_token', data.token);
    }
    return data;
  },

  async register(userData) {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (data.token) {
      localStorage.setItem('studybuddy_token', data.token);
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
    localStorage.removeItem('studybuddy_token');
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

  // AI Teacher API
  async chatWithAI(message, subject = '', chapter = '', topic = '', studentClass = '') {
    return await request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, subject, chapter, topic, class: studentClass })
    });
  },

  async translateText(text, targetLanguage) {
    return await request('/ai/translate', {
      method: 'POST',
      body: JSON.stringify({ text, targetLanguage })
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
    const token = localStorage.getItem('studybuddy_token');
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

  async generateStudyPlan() {
    return await request('/planner/generate', {
      method: 'POST'
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
    const token = localStorage.getItem('studybuddy_token');
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
  }
};
