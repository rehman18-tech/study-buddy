require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./config/db');
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'studybuddy_super_secret_key';

// Middleware
app.use(cors());
app.use((req, res, next) => {
  // Disable caching for all API responses to prevent stale data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Status: ${res.statusCode}`);
  });
  next();
});
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize Database Connection
db.connectDB();

// Helper to decode/verify Firebase JWT tokens
const verifyFirebaseToken = async (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.email) {
      return {
        uid: decoded.user_id || decoded.sub,
        email: decoded.email,
        name: decoded.name || decoded.email.split('@')[0]
      };
    }
    return null;
  } catch (err) {
    console.error("Firebase token decoding error:", err);
    return null;
  }
};

// Global Auth Middleware
// Global Auth Middleware
const authMiddleware = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No authentication token provided.' });
  }

  // Support Demo Mode token bypass
  if (token === 'demo_student_token_bypass' || token === 'demo_parent_token_bypass' || token === 'demo_teacher_token_bypass') {
    if (token === 'demo_teacher_token_bypass') {
      try {
        let demoTeacher = await db.findTeacherByEmail('teacher@studybuddy.com');
        if (!demoTeacher) {
          demoTeacher = await db.createTeacher({
            name: 'Dr. Ravi Kumar',
            email: 'teacher@studybuddy.com',
            password: bcrypt.hashSync('teacher123', 10),
            phone: '+919876543210',
            country: 'India',
            qualification: 'M.Sc Biology, B.Ed',
            specialization: 'Biology',
            institution: 'Andhra Pradesh Model School',
            role: 'teacher',
            status: 'approved',
            approvedBy: 'System Admin'
          });
        }
        req.user = demoTeacher;
        req.teacher = demoTeacher;
        return next();
      } catch (err) {
        console.error("Error setting up demo teacher bypass in database:", err);
        return res.status(500).json({ message: 'Internal server error during demo setup.' });
      }
    }

    const isStudent = token === 'demo_student_token_bypass';
    const email = isStudent ? 'alex@studybuddy.com' : 'parent@studybuddy.com';
    try {
      let demoUser = await db.findUserByEmail(email);
      if (!demoUser) {
        const hashedPassword = await bcrypt.hash('demopass123', 10);
        demoUser = await db.createUser({
          name: isStudent ? 'MD. IBADUR REHMAN' : 'Parent of Alex',
          email: email,
          password: hashedPassword,
          role: isStudent ? 'student' : 'parent',
          studentProfile: !isStudent ? undefined : {
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
          parentProfile: isStudent ? undefined : {
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
        });
      }
      req.user = demoUser;
      req.teacher = demoUser;
      return next();
    } catch (err) {
      console.error("Error setting up demo user bypass in database:", err);
      return res.status(500).json({ message: 'Internal server error during demo setup.' });
    }
  }

  try {
    // Check if it is a Firebase token
    const decodedFirebase = await verifyFirebaseToken(token);
    if (decodedFirebase && decodedFirebase.email) {
      const user = await db.findUserByEmail(decodedFirebase.email);
      if (!user) {
        return res.status(401).json({ message: 'User profile not found. Please sync your details.' });
      }
      req.user = user;
      req.teacher = user;
      return next();
    }

    // Local JWT Verification fallback
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found in system.' });
    }
    req.user = user;
    req.teacher = user;
    next();
  } catch (err) {
    console.error("AuthMiddleware error:", err);
    return res.status(401).json({ message: 'Invalid or expired session token.' });
  }
};

// Permission RBAC verification helper
const verifyPermission = (permission) => {
  return (req, res, next) => {
    const user = req.user || req.teacher;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (user.role === 'super_admin') {
      return next();
    }
    if (user.permissions && user.permissions.includes(permission)) {
      return next();
    }
    return res.status(403).json({ message: `Access denied. Requires '${permission}' permission.` });
  };
};

// --- AUTH ROUTER ---
const authRouter = express.Router();

authRouter.post('/sync', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No authentication token provided.' });
  }

  try {
    let email, name;
    let user;
    
    if (token === 'demo_teacher_token_bypass') {
      user = await db.findTeacherByEmail('teacher@studybuddy.com');
      if (!user) {
        user = await db.createTeacher({
          name: 'Dr. Ravi Kumar',
          email: 'teacher@studybuddy.com',
          password: bcrypt.hashSync('teacher123', 10),
          phone: '+919876543210',
          country: 'India',
          qualification: 'M.Sc Biology, B.Ed',
          specialization: 'Biology',
          institution: 'Andhra Pradesh Model School',
          role: 'teacher',
          status: 'approved',
          approvedBy: 'System Admin'
        });
      }
      email = user.email;
      name = user.name;
    } else if (token === 'demo_student_token_bypass' || token === 'demo_parent_token_bypass') {
      const isStudent = token === 'demo_student_token_bypass';
      email = isStudent ? 'alex@studybuddy.com' : 'parent@studybuddy.com';
      name = isStudent ? 'MD. IBADUR REHMAN' : 'Parent of Alex';
    } else {
      const decoded = await verifyFirebaseToken(token);
      if (!decoded) {
        return res.status(401).json({ message: 'Invalid Firebase token.' });
      }
      email = decoded.email;
      name = decoded.name;
    }

    if (!user) {
      user = await db.findUserByEmail(email);
    }
    if (!user) {
      const { name: reqName, schoolName, schoolType, board, preferredLanguage, parentContact, studentClass, role, parentPin } = req.body;
      const hashedPassword = await bcrypt.hash('firebase_oauth_bypass', 10);
      user = await db.createUser({
        name: reqName || name || 'Student',
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'student',
        studentProfile: role === 'parent' ? undefined : {
          class: Number(studentClass) || 5,
          schoolName: schoolName || '',
          schoolType: schoolType || 'Public',
          board: board || 'SSC',
          preferredLanguage: preferredLanguage || 'English',
          parentContact: parentContact || '',
          parentPin: parentPin || '1234',
          streak: 0,
          lastActiveDate: '',
          xp: 0,
          coins: 0,
          achievementLevel: 1,
          badges: []
        },
        parentProfile: role === 'parent' ? {
          childEmails: [],
          customQuests: [],
          rewards: []
        } : undefined
      });
    } else {
      // Sync metadata if user already exists
      const { name: reqName, schoolName, schoolType, board, preferredLanguage, parentContact, studentClass } = req.body;
      const updates = {};
      if (reqName) updates.name = reqName;
      
      const profileUpdates = {};
      if (studentClass) profileUpdates.class = Number(studentClass);
      if (schoolName) profileUpdates.schoolName = schoolName;
      if (schoolType) profileUpdates.schoolType = schoolType;
      if (board) profileUpdates.board = board;
      if (preferredLanguage) profileUpdates.preferredLanguage = preferredLanguage;
      if (parentContact) profileUpdates.parentContact = parentContact;

      if (Object.keys(profileUpdates).length > 0 && user.studentProfile) {
        updates.studentProfile = {
          ...user.studentProfile,
          ...profileUpdates
        };
      }
      if (Object.keys(updates).length > 0) {
        user = await db.updateUser(user._id, updates);
      }
    }

    res.json({
      message: 'Session synced successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentProfile: user.studentProfile,
        parentProfile: user.parentProfile
      }
    });
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ message: 'Error syncing user session.' });
  }
});

authRouter.post('/register', async (req, res) => {
  const { name, email, password, role, studentClass, schoolName, schoolType, board, preferredLanguage, parentContact, parentPin } = req.body;
  try {
    const existing = await db.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ message: 'Email address already registered.' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'student',
      studentProfile: role === 'parent' ? undefined : {
        class: Number(studentClass) || 1,
        schoolName: schoolName || '',
        schoolType: schoolType || 'Public',
        board: board || 'SSC',
        preferredLanguage: preferredLanguage || 'English',
        parentContact: parentContact || '',
        parentPin: parentPin || '1234',
        streak: 0,
        lastActiveDate: '',
        xp: 0,
        coins: 0,
        achievementLevel: 1,
        badges: []
      },
      parentProfile: role === 'parent' ? {
        childEmails: [],
        customQuests: [],
        rewards: [
          { id: 'r1', title: '30 Minutes Video Game Time', costXp: 100, unlocked: false },
          { id: 'r2', title: 'Extra Ice Cream Treat', costXp: 200, unlocked: false },
          { id: 'r3', title: 'Weekend Movie Night', costXp: 300, unlocked: false }
        ]
      } : undefined
    };

    const newUser = await db.createUser(userData);
    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      message: 'Account registered successfully!',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        studentProfile: newUser.studentProfile,
        parentProfile: newUser.parentProfile
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server registration error.' });
  }
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentProfile: user.studentProfile,
        parentProfile: user.parentProfile
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server login error.' });
  }
});

authRouter.get('/me', authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      studentProfile: req.user.studentProfile,
      parentProfile: req.user.parentProfile
    }
  });
});

authRouter.put('/profile', authMiddleware, async (req, res) => {
  const { name, studentClass, schoolName, schoolType, board, preferredLanguage, parentContact, parentPin } = req.body;
  try {
    const updatedProfile = req.user.studentProfile ? {
      ...req.user.studentProfile,
      class: studentClass ? Number(studentClass) : req.user.studentProfile.class,
      schoolName: schoolName !== undefined ? schoolName : req.user.studentProfile.schoolName,
      schoolType: schoolType || req.user.studentProfile.schoolType,
      board: board || req.user.studentProfile.board,
      preferredLanguage: preferredLanguage || req.user.studentProfile.preferredLanguage,
      parentContact: parentContact !== undefined ? parentContact : req.user.studentProfile.parentContact,
      parentPin: parentPin || req.user.studentProfile.parentPin
    } : undefined;

    const updateData = {
      name: name || req.user.name,
      ...(updatedProfile ? { studentProfile: updatedProfile } : {})
    };

    const updatedUser = await db.updateUser(req.user._id, updateData);
    if (updatedProfile) {
      await db.saveStudentProfile(req.user._id, {
        name: updateData.name,
        classNum: updatedProfile.class,
        schoolName: updatedProfile.schoolName,
        schoolType: updatedProfile.schoolType,
        board: updatedProfile.board,
        preferredLanguage: updatedProfile.preferredLanguage,
        parentContact: updatedProfile.parentContact,
        parentPin: updatedProfile.parentPin
      });
    }
    res.json({
      message: 'Profile updated successfully!',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        studentProfile: updatedUser.studentProfile,
        parentProfile: updatedUser.parentProfile
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating profile details.' });
  }
});

app.use('/api/auth', authRouter);

// --- PLANNER / SCHEDULE ROUTER ---
const plannerRouter = express.Router();

function translateQuest(quest, lang) {
  if (!lang || lang === 'English') return quest;
  
  const translations = {
    'Hindi': {
      'Solve 5 Practice Math Problems': '5 अभ्यास गणित की समस्याएं हल करें',
      'Review weak Science concepts': 'कमजोर विज्ञान अवधारणाओं की समीक्षा करें',
      "Complete today's Mathematics lesson": 'आज का गणित का पाठ पूरा करें',
      "Complete today's lesson": 'आज का पाठ पूरा करें',
      'Read Science plant/body topic': 'विज्ञान के पौधे/शरीर विषय को पढ़ें',
      'Practice spelling in Hindi': 'हिंदी में वर्तनी का अभ्यास करें',
      'Practice spelling in Telugu': 'तेलुगु में वर्तनी का अभ्यास करें',
      'Practice spelling in English': 'अंग्रेजी में वर्तनी का अभ्यास करें',
      'Read Climate and geography map topic': 'जलवायु और भूगोल मानचित्र विषय पढ़ें',
      'Summarize English chapter text': 'अंग्रेजी अध्याय के पाठ का सारांश लिखें',
      'Analyze AP constitutional values topic': 'एपी संवैधानिक मूल्यों के विषय का विश्लेषण करें',
      'Draft analytical vocabulary essay': 'विश्लेषणात्मक शब्दावली निबंध का मसौदा तैयार करें',
      
      // Subjects
      'Mathematics': 'गणित',
      'Science': 'विज्ञान',
      'English': 'अंग्रेजी',
      'Social Studies': 'सामाजिक अध्ययन',
      'Telugu': 'तेलुगु',
      'Hindi': 'हिंदी',
      
      // Durations
      '10 mins': '10 मिनट',
      '15 mins': '15 मिनट',
      '20 mins': '20 मिनट',
      '25 mins': '25 मिनट'
    },
    'Telugu': {
      'Solve 5 Practice Math Problems': '5 ప్రాక్టీస్ గణిత సమస్యలను సాధించండి',
      'Review weak Science concepts': 'బలహీనమైన సైన్స్ భావనలను సమీక్షించండి',
      "Complete today's Mathematics lesson": 'ఈ రోజు గణిత పాఠాన్ని పూర్తి చేయండి',
      "Complete today's lesson": 'ఈ రోజు పాఠాన్ని పూర్తి చేయండి',
      'Read Science plant/body topic': 'సైన్స్ మొక్క/శరీర అంశాన్ని చదవండి',
      'Practice spelling in Hindi': 'హిందీలో స్పెల్లింగ్ ప్రాక్టీస్ చేయండి',
      'Practice spelling in Telugu': 'తెలుగులో స్పెల్లింగ్ ప్రాక్టీస్ చేయండి',
      'Practice spelling in English': 'ఇంగ్లీష్‌లో స్పెల్లింగ్ ప్రాక్టీస్ చేయండి',
      'Read Climate and geography map topic': 'వాతావరణం మరియు భూగోళశాస్త్ర పట అంశాన్ని చదవండి',
      'Summarize English chapter text': 'ఇంగ్లీష్ అధ్యాయం పాఠాన్ని సంగ్రహించండి',
      'Analyze AP constitutional values topic': 'ఏపీ రాజ్యాంగ విలువల అంశాన్ని విశ్లేషించండి',
      'Draft analytical vocabulary essay': 'విశ్లేషణాత్మక పదజాల వ్యాసాన్ని రూపొందించండి',
      
      // Subjects
      'Mathematics': 'గణితం',
      'Science': 'విజ్ఞాన శాస్త్రం',
      'English': 'ఇంగ్లీష్',
      'Social Studies': 'సాంఘిక శాస్త్రం',
      'Telugu': 'తెలుగు',
      'Hindi': 'హిందీ',
      
      // Durations
      '10 mins': '10 నిమిషాలు',
      '15 mins': '15 నిమిషాలు',
      '20 mins': '20 నిమిషాలు',
      '25 mins': '25 నిమిషాలు'
    }
  };

  const dict = translations[lang];
  if (!dict) return quest;

  const translatedQuest = { ...quest };
  if (dict[quest.title]) {
    translatedQuest.title = dict[quest.title];
  } else {
    // Check dynamic titles like "Practice spelling in Hindi/Telugu/English"
    for (const key of Object.keys(dict)) {
      if (quest.title.includes(key)) {
        translatedQuest.title = quest.title.replace(key, dict[key]);
      }
    }
  }
  if (dict[quest.subject]) {
    translatedQuest.subject = dict[quest.subject];
  }
  if (dict[quest.duration]) {
    translatedQuest.duration = dict[quest.duration];
  }
  return translatedQuest;
}

plannerRouter.get('/schedule', authMiddleware, async (req, res) => {
  const cl = req.user.studentProfile?.class || 1;
  const preferredLanguage = req.user.studentProfile?.preferredLanguage || 'English';

  // Determine weak subjects based on progress logs
  let weakSubjects = [];
  try {
    const logs = await db.getProgressByUser(req.user._id);
    const subjectScores = {};
    const subjectCounts = {};
    
    logs.forEach(log => {
      if (!subjectScores[log.subject]) {
        subjectScores[log.subject] = 0;
        subjectCounts[log.subject] = 0;
      }
      subjectScores[log.subject] += log.score;
      subjectCounts[log.subject] += 1;
    });

    const allSubjects = ['Mathematics', 'Science', 'English', 'Social Studies', 'Telugu', 'Hindi'];
    allSubjects.forEach(sub => {
      const attempts = subjectCounts[sub] || 0;
      if (attempts > 0) {
        const avg = subjectScores[sub] / attempts;
        if (avg < 70) {
          weakSubjects.push(sub);
        }
      } else {
        // No attempts yet: counts as a practice opportunity
        weakSubjects.push(sub);
      }
    });
  } catch (err) {
    console.error("Error calculating weak subjects for planner:", err);
  }

  let dailyQuests = [];
  
  // 1. Weak Subject practice recommendation
  if (weakSubjects.includes('Mathematics')) {
    dailyQuests.push({ id: 'q_weak_math', title: 'Solve 5 Practice Math Problems', subject: 'Mathematics', duration: '20 mins', xp: 30, completed: false });
  } else if (weakSubjects.includes('Science')) {
    dailyQuests.push({ id: 'q_weak_sci', title: 'Review weak Science concepts', subject: 'Science', duration: '15 mins', xp: 25, completed: false });
  } else {
    dailyQuests.push({ id: 'q_math_std', title: 'Complete today\'s Mathematics lesson', subject: 'Mathematics', duration: '15 mins', xp: 20, completed: false });
  }

  // 2. Syllabus specific topic review
  if (cl <= 4) {
    dailyQuests.push({ id: 'q_sci_elem', title: 'Read Science plant/body topic', subject: 'Science', duration: '10 mins', xp: 15, completed: false });
    dailyQuests.push({ id: 'q_lang_elem', title: `Practice spelling in ${preferredLanguage}`, subject: preferredLanguage, duration: '10 mins', xp: 15, completed: false });
  } else if (cl <= 7) {
    dailyQuests.push({ id: 'q_ss_mid', title: 'Read Climate and geography map topic', subject: 'Social Studies', duration: '20 mins', xp: 25, completed: false });
    dailyQuests.push({ id: 'q_lang_mid', title: `Summarize English chapter text`, subject: 'English', duration: '15 mins', xp: 20, completed: false });
  } else {
    dailyQuests.push({ id: 'q_ss_high', title: 'Analyze AP constitutional values topic', subject: 'Social Studies', duration: '25 mins', xp: 35, completed: false });
    dailyQuests.push({ id: 'q_lang_high', title: `Draft analytical vocabulary essay`, subject: 'English', duration: '20 mins', xp: 30, completed: false });
  }

  // Inject parent custom quests
  if (req.user.parentProfile?.customQuests) {
    const parentQuests = req.user.parentProfile.customQuests.filter(pq => !pq.completed);
    dailyQuests = [...dailyQuests, ...parentQuests];
  }

  const translatedQuests = dailyQuests.map(q => translateQuest(q, preferredLanguage));
  res.json({ quests: translatedQuests });
});

plannerRouter.get('/plans', authMiddleware, async (req, res) => {
  try {
    const list = await db.getStudyPlanByUser(req.user._id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error loading study plans.' });
  }
});

plannerRouter.get('/active/:planType', authMiddleware, async (req, res) => {
  try {
    const plan = await db.getActiveStudyPlan(req.user._id, req.params.planType);
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: 'Error loading active study plan.' });
  }
});

plannerRouter.post('/generate', authMiddleware, async (req, res) => {
  try {
    const planType = req.body.planType || 'daily';
    const result = await orchestrator.run(req.user, { 
      message: `Create a detailed ${planType} study plan`,
      planType
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error generating study plan: ' + err.message });
  }
});

app.use('/api/planner', plannerRouter);

// --- SYLLABUS ROUTER ---
const syllabusRouter = express.Router();

syllabusRouter.get('/classes', authMiddleware, async (req, res) => {
  try {
    const list = await db.getAllClasses();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error loading classes.' });
  }
});

syllabusRouter.get('/subjects/:class', authMiddleware, async (req, res) => {
  try {
    const list = await db.getSubjectsByClass(req.params.class);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error loading subjects.' });
  }
});

syllabusRouter.get('/chapters/:class/:subject', authMiddleware, async (req, res) => {
  try {
    const list = await db.getChaptersByClassAndSubject(req.params.class, req.params.subject);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error loading chapters.' });
  }
});

syllabusRouter.get('/topics/:chapter', authMiddleware, async (req, res) => {
  try {
    const { classNum, subject } = req.query;
    let list = [];
    if (classNum && subject) {
      list = await db.getTopicsByChapter(classNum, subject, req.params.chapter);
    } else {
      list = await db.getTopicsByChapterName(req.params.chapter);
    }
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error loading topics.' });
  }
});

syllabusRouter.post('/upload', authMiddleware, async (req, res) => {
  try {
    const syllabusList = req.body;
    if (!Array.isArray(syllabusList)) {
      return res.status(400).json({ message: 'Input must be a JSON array of syllabus records.' });
    }
    await db.bulkInsertSyllabus(syllabusList);
    res.json({ message: 'Syllabus bulk uploaded successfully!' });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: 'Error uploading syllabus: ' + err.message });
  }
});

syllabusRouter.get('/:class', authMiddleware, async (req, res) => {
  try {
    const list = await db.getSyllabusByClass(req.params.class);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error loading syllabus.' });
  }
});

app.use('/api/syllabus', syllabusRouter);

// --- QUIZ ROUTER ---
const quizRouter = express.Router();

quizRouter.get('/', authMiddleware, async (req, res) => {
  const cl = req.user.studentProfile?.class || 1;
  console.log("🔍 [Quiz Route] Fetching quizzes for class:", cl, "User:", req.user?.email, "studentProfile:", req.user?.studentProfile);
  try {
    const quizzes = await db.getQuizzesByClass(cl);
    console.log(`🔍 [Quiz Route] Found ${quizzes.length} quizzes for class ${cl}`);
    res.json(quizzes);
  } catch (err) {
    console.error("Error fetching quizzes:", err);
    res.status(500).json({ message: 'Error fetching quizzes.' });
  }
});

quizRouter.post('/generate', authMiddleware, async (req, res) => {
  const { subject, language } = req.body;
  const cl = req.user.studentProfile?.class || 6;
  try {
    const orchestrator = require('./services/agentOrchestrator');
    const message = `Generate a 10-question practice quiz for Class ${cl} on the subject ${subject}`;
    const result = await orchestrator.run(req.user, { message, language });
    
    if (result && result.agent === 'QUIZ' && result.quizData) {
      const generatedQuiz = {
        _id: 'ai_quiz_' + Date.now(),
        ...result.quizData,
        class: cl
      };
      res.json(generatedQuiz);
    } else {
      res.status(500).json({ message: 'Failed to generate quiz via AI agent.' });
    }
  } catch (err) {
    console.error("Quiz Generation Error:", err);
    res.status(500).json({ message: 'Error generating quiz: ' + err.message });
  }
});

quizRouter.post('/submit', authMiddleware, async (req, res) => {
  const { quizId, score, answers, subject } = req.body;
  const xpEarned = Math.round(score * 0.5); // 50 XP max for 100% score
  
  try {
    // Save progress log
    await db.saveProgress({
      userId: req.user._id,
      subject,
      quizId,
      score,
      xpEarned
    });

    // Save detailed quiz result
    await db.saveQuizResult({
      userId: req.user._id,
      quizId,
      subject,
      score,
      totalQuestions: answers ? answers.length : 5,
      correctAnswers: Math.round((score / 100) * (answers ? answers.length : 5)),
      answers
    });

    // Update Student Profile (XP, Streak, Badge checks)
    const today = new Date().toDateString();
    let streak = req.user.studentProfile.streak || 0;
    const lastActive = req.user.studentProfile.lastActiveDate;
    
    if (lastActive === '') {
      streak = 1;
    } else {
      const lastDate = new Date(lastActive);
      const diffTime = Math.abs(new Date(today) - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak += 1;
      } else if (diffDays > 1) {
        streak = 1; // reset streak if missed a day
      }
      // if diffDays === 0, keep streak same
    }

    const currentXp = (req.user.studentProfile.xp || 0) + xpEarned;
    const coinsEarned = Math.round(score * 0.2); // Up to 20 coins per quiz
    const currentCoins = (req.user.studentProfile.coins || 0) + coinsEarned;
    const achievementLevel = Math.floor(currentXp / 100) + 1;
    const currentBadges = [...(req.user.studentProfile.badges || [])];

    // Award Badges dynamically based on performance
    if (streak >= 3 && !currentBadges.includes('streak_3')) {
      currentBadges.push('streak_3'); // "Streak Starter" badge
    }
    if (currentXp >= 100 && !currentBadges.includes('xp_100')) {
      currentBadges.push('xp_100'); // "XP Achiever" badge
    }
    if (score === 100 && !currentBadges.includes('perfect_quiz')) {
      currentBadges.push('perfect_quiz'); // "Master Mind" badge
    }

    const updatedProfile = {
      ...req.user.studentProfile,
      xp: currentXp,
      coins: currentCoins,
      achievementLevel,
      streak,
      lastActiveDate: today,
      badges: currentBadges
    };

    const updatedUser = await db.updateUser(req.user._id, { studentProfile: updatedProfile });

    // Save/update student learning memory metrics
    try {
      const memory = await db.getStudentMemory(req.user._id);
      memory.quizHistory = memory.quizHistory || [];
      memory.quizHistory.push({
        quizId,
        subject,
        score,
        date: new Date()
      });

      // Update weak and strong chapters/subjects dynamically
      if (score < 60) {
        if (subject && !memory.weakChapters.includes(subject)) {
          memory.weakChapters.push(subject);
        }
        // Remove from strong
        memory.strongChapters = memory.strongChapters.filter(x => x !== subject);
      } else if (score >= 80) {
        if (subject && !memory.strongChapters.includes(subject)) {
          memory.strongChapters.push(subject);
        }
        // Remove from weak
        memory.weakChapters = memory.weakChapters.filter(x => x !== subject);
      }

      // Record any incorrect answers
      if (answers && answers.length > 0) {
        memory.previousMistakes = memory.previousMistakes || [];
        answers.forEach(ans => {
          if (ans.isCorrect === false || ans.correct === false) {
            memory.previousMistakes.push({
              question: ans.question || 'Practice Question',
              wrongAnswer: ans.selectedAnswer || ans.answer || '',
              correctAnswer: ans.correctAnswer || '',
              date: new Date()
            });
          }
        });
        // Limit size to last 20 mistakes
        if (memory.previousMistakes.length > 20) {
          memory.previousMistakes = memory.previousMistakes.slice(-20);
        }
      }

      // Update learning speed based on historical performance
      const avgScore = memory.quizHistory.reduce((sum, q) => sum + q.score, 0) / memory.quizHistory.length;
      if (avgScore >= 80) memory.learningSpeed = 'Fast';
      else if (avgScore <= 50) memory.learningSpeed = 'Slow';
      else memory.learningSpeed = 'Average';

      await db.saveStudentMemory(req.user._id, memory);
    } catch (memErr) {
      console.warn("⚠️ Failed to update student memory during quiz submission:", memErr.message);
    }

    res.json({
      message: 'Quiz submitted and saved!',
      score,
      xpEarned,
      coinsEarned,
      streak,
      badges: currentBadges,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        studentProfile: updatedUser.studentProfile
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error submitting quiz.' });
  }
});

app.use('/api/quizzes', quizRouter);

// --- PROGRESS / ANALYTICS ROUTER ---
const progressRouter = express.Router();

progressRouter.get('/stats', authMiddleware, async (req, res) => {
  try {
    const logs = await db.getProgressByUser(req.user._id);
    
    // 1. Calculate Average Score per Subject
    const subjectScores = {};
    const subjectCounts = {};
    
    logs.forEach(log => {
      if (!subjectScores[log.subject]) {
        subjectScores[log.subject] = 0;
        subjectCounts[log.subject] = 0;
      }
      subjectScores[log.subject] += log.score;
      subjectCounts[log.subject] += 1;
    });

    const subjectAverages = [];
    Object.keys(subjectScores).forEach(sub => {
      subjectAverages.push({
        subject: sub,
        avgScore: Math.round(subjectScores[sub] / subjectCounts[sub]),
        testsTaken: subjectCounts[sub]
      });
    });

    // 2. Identify Weak Subjects (< 70% average or no tests taken)
    const allSubjects = ['Mathematics', 'Science', 'English', 'Social Studies', 'Telugu', 'Hindi'];
    const weakSubjects = [];
    
    allSubjects.forEach(sub => {
      const match = subjectAverages.find(sa => sa.subject === sub);
      if (!match) {
        weakSubjects.push({
          subject: sub,
          reason: 'No quizzes attempted yet. Try your first!',
          rec: `Start with the basic ${sub} quiz today to baseline your skills!`
        });
      } else if (match.avgScore < 70) {
        weakSubjects.push({
          subject: sub,
          reason: `Average accuracy is only ${match.avgScore}%`,
          rec: `Practice standard ${sub} multiple-choice problems and ask StudyGuru AI for help with mistakes!`
        });
      }
    });

    res.json({
      subjectAverages,
      weakSubjects,
      totalQuizzes: logs.length,
      recentActivity: logs.slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ message: 'Error loading analytics.' });
  }
});

progressRouter.post('/award-xp', authMiddleware, async (req, res) => {
  const { xp, reason } = req.body;
  const xpAmount = Number(xp) || 0;
  try {
    const today = new Date().toDateString();
    let streak = req.user.studentProfile.streak || 0;
    const lastActive = req.user.studentProfile.lastActiveDate;

    if (lastActive === '') {
      streak = 1;
    } else {
      const lastDate = new Date(lastActive);
      const diffTime = Math.abs(new Date(today) - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak += 1;
      } else if (diffDays > 1) {
        streak = 1;
      }
    }

    const currentXp = (req.user.studentProfile.xp || 0) + xpAmount;
    // Award 10 coins for completed Focus Session / homework complete
    const coinsEarned = 10;
    const currentCoins = (req.user.studentProfile.coins || 0) + coinsEarned;
    const achievementLevel = Math.floor(currentXp / 100) + 1;
    const currentBadges = [...(req.user.studentProfile.badges || [])];

    if (streak >= 3 && !currentBadges.includes('streak_3')) {
      currentBadges.push('streak_3');
    }
    if (currentXp >= 100 && !currentBadges.includes('xp_100')) {
      currentBadges.push('xp_100');
    }

    const updatedProfile = {
      ...req.user.studentProfile,
      xp: currentXp,
      coins: currentCoins,
      achievementLevel,
      streak,
      lastActiveDate: today,
      badges: currentBadges
    };

    const updatedUser = await db.updateUser(req.user._id, { studentProfile: updatedProfile });
    
    // Log a progress record so it counts in their weekly report!
    await db.saveProgress({
      userId: req.user._id,
      subject: reason || 'Focus Session',
      quizId: 'session_xp_award',
      score: 100,
      xpEarned: xpAmount
    });

    res.json({
      message: 'XP awarded successfully!',
      xp: currentXp,
      coinsEarned,
      streak,
      badges: currentBadges,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        studentProfile: updatedUser.studentProfile
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error awarding XP.' });
  }
});

progressRouter.get('/report', authMiddleware, async (req, res) => {
  try {
    let profile = await db.getStudentProfileByUserId(req.user._id);
    if (!profile) {
      profile = await db.saveStudentProfile(req.user._id, { name: req.user.name });
    }
    const quizResults = await db.getQuizResultsByUser(req.user._id);
    const achievements = await db.getAchievementsByUser(req.user._id);
    const logs = await db.getProgressByUser(req.user._id);
    
    res.json({
      profile,
      quizResults,
      achievements,
      logs
    });
  } catch (err) {
    res.status(500).json({ message: 'Error generating progress report.' });
  }
});

progressRouter.get('/achievements', authMiddleware, async (req, res) => {
  try {
    const list = await db.getAchievementsByUser(req.user._id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error loading achievements.' });
  }
});

progressRouter.post('/quiz-result', authMiddleware, async (req, res) => {
  try {
    const { quizId, score, subject, chapterName, totalQuestions, correctAnswers, answers } = req.body;
    const result = await db.saveQuizResult({
      userId: req.user._id,
      quizId,
      score,
      subject,
      chapterName,
      totalQuestions,
      correctAnswers,
      answers
    });
    
    const xpEarned = Math.round(score * 0.5); 
    const coinsEarned = Math.round(score * 0.2); 
    
    await db.saveProgress({
      userId: req.user._id,
      subject,
      quizId,
      score,
      xpEarned
    });

    let profile = await db.getStudentProfileByUserId(req.user._id);
    if (!profile) {
      profile = await db.saveStudentProfile(req.user._id, { name: req.user.name });
    }
    
    const updatedXp = (profile.xp || 0) + xpEarned;
    const updatedCoins = (profile.coins || 0) + coinsEarned;
    
    const today = new Date().toDateString();
    let newStreak = profile.streak || 0;
    if (profile.updatedAt && new Date(profile.updatedAt).toDateString() !== today) {
      newStreak += 1;
    } else if (newStreak === 0) {
      newStreak = 1;
    }
    
    await db.saveStudentProfile(req.user._id, {
      xp: updatedXp,
      coins: updatedCoins,
      streak: newStreak
    });
    
    const unlockedBadges = [];
    if (newStreak >= 3) {
      const badge = await db.unlockAchievement(req.user._id, 'Streak Master', 'badge');
      unlockedBadges.push(badge.title);
    }
    if (score === 100) {
      const badge = await db.unlockAchievement(req.user._id, 'Perfect Score', 'badge');
      unlockedBadges.push(badge.title);
    }
    if (correctAnswers >= 3) {
      const badge = await db.unlockAchievement(req.user._id, 'Super Solver', 'badge');
      unlockedBadges.push(badge.title);
    }
    
    res.json({
      result,
      xpEarned,
      coinsEarned,
      streak: newStreak,
      unlockedBadges
    });
  } catch (err) {
    res.status(500).json({ message: 'Error logging quiz results: ' + err.message });
  }
});

app.use('/api/progress', progressRouter);

// --- HOMEWORK ROUTER ---
const homeworkRouter = express.Router();

homeworkRouter.get('/', authMiddleware, async (req, res) => {
  try {
    const list = await db.getHomeworkByUser(req.user._id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving homework.' });
  }
});

homeworkRouter.post('/', authMiddleware, async (req, res) => {
  const { title, subject, dueDate } = req.body;
  try {
    const item = await db.createHomework({
      userId: req.user._id,
      title,
      subject,
      dueDate
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: 'Error creating homework.' });
  }
});

homeworkRouter.put('/:id', authMiddleware, async (req, res) => {
  const { completed } = req.body;
  try {
    const item = await db.updateHomework(req.params.id, completed);
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Error updating homework.' });
  }
});

homeworkRouter.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await db.deleteHomework(req.params.id);
    res.json({ message: 'Homework deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting homework.' });
  }
});

app.use('/api/homework', homeworkRouter);

// --- REMINDERS ROUTER ---
const remindersRouter = express.Router();

remindersRouter.get('/', authMiddleware, async (req, res) => {
  try {
    const reminder = await db.getReminderByUser(req.user._id);
    res.json(reminder || { time: '', active: false });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving reminders.' });
  }
});

remindersRouter.post('/', authMiddleware, async (req, res) => {
  const { time, active } = req.body;
  try {
    const reminder = await db.saveReminder(req.user._id, time, active !== false);
    res.json(reminder);
  } catch (err) {
    res.status(500).json({ message: 'Error saving reminder.' });
  }
});

app.use('/api/reminders', remindersRouter);

// --- AI TEACHER ROUTER ---
const aiRouter = express.Router();
const orchestrator = require('./services/agentOrchestrator');

aiRouter.post('/chat', authMiddleware, async (req, res) => {
  try {
    const result = await orchestrator.run(req.user, req.body);
    res.json(result);
  } catch (err) {
    console.error("Agent Orchestrator Execution Exception:", err);
    res.status(500).json({ message: "Failed executing agent orchestrator: " + err.message });
  }
});

// Helper to translate long text via MyMemory by chunking it
// Helper to translate text via Google Translate Free API (no key required, highly reliable)
async function translateWithGoogleFree(text, sourceLang, targetLang) {
  if (!text || text.trim() === '') return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        return data[0].map(x => x[0] || '').join('');
      }
    }
  } catch (err) {
    console.warn("⚠️ [Google Free Translate] Translation failed:", err.message);
  }
  return text; // fallback to original
}

aiRouter.post('/translate', authMiddleware, async (req, res) => {
  const { text, texts, targetLanguage } = req.body;
  
  if (!targetLanguage) {
    return res.status(400).json({ message: 'Target language is required.' });
  }

  // Handle batch translation (array of strings)
  if (Array.isArray(texts)) {
    if (texts.length === 0) {
      return res.json({ translatedTexts: [] });
    }
    try {
      const { callLLM } = require('./services/llmService');
      const systemInstruction = `You are a professional translator translating learning content for primary and high school students.
Translate the following JSON array of strings into ${targetLanguage}.
CRITICAL REQUIREMENTS:
1. Translate all explanations, descriptions, and standard text to ${targetLanguage} using the correct script.
2. Retain any markdown formatting, bullet points, asterisks (**bold**), and emojis exactly as they are.
3. Retain any mathematical expressions or LaTeX formulas (e.g. $...$ or $$...$$) exactly as they are.
4. Keep the exact same array length, order, and structure.
5. Respond with ONLY the translated JSON array. Do not add any introductory or concluding sentences, comments, explanations, markdown code blocks (like \`\`\`json), or quotes. It must be parseable by JSON.parse.`;

      let translatedTexts;
      let fallbackNeeded = false;
      try {
        const prompt = JSON.stringify(texts);
        const responseText = await callLLM(systemInstruction, prompt, false, true);
        
        // Clean up responseText in case LLM wrapped it in markdown code blocks
        let cleanedResponse = responseText.trim();
        if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        }
        
        translatedTexts = JSON.parse(cleanedResponse);
        if (!Array.isArray(translatedTexts) || translatedTexts.length !== texts.length) {
          console.warn("⚠️ [Translation Route] LLM returned invalid array length or structure. Falling back...");
          fallbackNeeded = true;
        }
      } catch (llmErr) {
        console.warn("⚠️ [Translation Route] LLM batch translation failed, falling back to Google Free API:", llmErr.message);
        fallbackNeeded = true;
      }

      if (fallbackNeeded) {
        console.log("🔄 [Translation Route] LLM batch translation failed. Calling Google Free translation in parallel...");
        try {
          const targetLang = targetLanguage.toLowerCase() === 'telugu' ? 'te' : (targetLanguage.toLowerCase() === 'hindi' ? 'hi' : 'en');
          
          const promises = texts.map(async (t) => {
            const cleanT = t || '';
            const src = /[\u0c00-\u0c7f]/.test(cleanT) ? 'te' : (/[\u0900-\u097f]/.test(cleanT) ? 'hi' : 'en');
            if (src !== targetLang) {
              return await translateWithGoogleFree(cleanT, src, targetLang);
            }
            return cleanT;
          });
          translatedTexts = await Promise.all(promises);
        } catch (googleErr) {
          console.error("❌ [Translation Route] Google Free batch translation fallback failed:", googleErr.message);
          translatedTexts = texts; // fallback to original
        }
      }

      return res.json({ translatedTexts });
    } catch (err) {
      console.error("Batch translation error in endpoint:", err);
      return res.status(500).json({ message: 'Failed to translate texts: ' + err.message });
    }
  }

  // Handle single text translation
  if (!text) {
    return res.status(400).json({ message: 'Text or texts array is required for translation.' });
  }
  try {
    const { callLLM } = require('./services/llmService');
    const systemInstruction = `You are a professional translator translating learning content for primary and high school students.
Translate the student's text into ${targetLanguage}.
CRITICAL REQUIREMENTS:
1. Translate all explanations, descriptions, and standard text to ${targetLanguage} using the correct script.
2. Retain any markdown formatting, bullet points, asterisks (**bold**), and emojis exactly as they are.
3. Retain any mathematical expressions or LaTeX formulas (e.g. $...$ or $$...$$) exactly as they are.
4. Respond with ONLY the translated text. Do not add any introductory or concluding sentences, comments, explanations, or quotes.`;

    let translatedText;
    let fallbackNeeded = false;
    try {
      translatedText = await callLLM(systemInstruction, text, false, true);
      if (!translatedText || 
          translatedText === text || 
          translatedText.includes("experiencing high traffic") || 
          translatedText.includes("Google Gemini AI is currently experiencing high demand") ||
          translatedText.includes("online AI")) {
        fallbackNeeded = true;
      }
    } catch (llmErr) {
      console.warn("⚠️ [Translation Route] LLM call failed, falling back to Google Free API:", llmErr.message);
      fallbackNeeded = true;
    }

    if (fallbackNeeded) {
      console.log("🔄 [Translation Route] LLM returned fallback/failed. Calling Google Free translation...");
      try {
        const sourceLang = /[\u0c00-\u0c7f]/.test(text) ? 'te' : (/[\u0900-\u097f]/.test(text) ? 'hi' : 'en');
        const targetLang = targetLanguage.toLowerCase() === 'telugu' ? 'te' : (targetLanguage.toLowerCase() === 'hindi' ? 'hi' : 'en');
        
        if (sourceLang !== targetLang) {
          translatedText = await translateWithGoogleFree(text, sourceLang, targetLang);
          console.log(`✅ [Translation Route] Successfully translated via Google Free API: "${text.substring(0, 20)}..."`);
        } else {
          translatedText = text;
        }
      } catch (googleErr) {
        console.error("❌ [Translation Route] Google Free translation fallback failed:", googleErr.message);
        if (!translatedText) {
          translatedText = text; // safety fallback
        }
      }
    }

    res.json({ translatedText });
  } catch (err) {
    console.error("Translation error in endpoint:", err);
    res.status(500).json({ message: 'Failed to translate text: ' + err.message });
  }
});

app.use('/api/ai', aiRouter);

// --- PARENT ROUTER ---
const parentRouter = express.Router();

parentRouter.post('/verify-pin', authMiddleware, (req, res) => {
  const { pin } = req.body;
  const userPin = req.user.studentProfile?.parentPin || '1234';
  if (pin === userPin) {
    res.json({ success: true, message: 'Parent access granted.' });
  } else {
    res.status(400).json({ success: false, message: 'Incorrect 4-digit parent PIN.' });
  }
});

parentRouter.get('/students', authMiddleware, async (req, res) => {
  try {
    const currentProfile = await db.getStudentProfileByUserId(req.user._id) || { name: req.user.name, classNum: 5 };
    const sampleStudents = [
      currentProfile,
      { _id: 'sample_student_2', name: 'Ravi Kumar', classNum: 6, schoolName: 'Public High School', schoolType: 'Public', board: 'SSC', preferredLanguage: 'Telugu', streak: 4, xp: 450, coins: 90, weakSubjects: ['Mathematics'], strongSubjects: ['Science'] },
      { _id: 'sample_student_3', name: 'Sita Rani', classNum: 7, schoolName: 'St. Marys School', schoolType: 'Private', board: 'CBSE', preferredLanguage: 'English', streak: 1, xp: 210, coins: 30, weakSubjects: ['Social Studies'], strongSubjects: ['Mathematics'] }
    ];
    res.json(sampleStudents);
  } catch (err) {
    res.status(500).json({ message: 'Error loading students list: ' + err.message });
  }
});

parentRouter.post('/custom-quest', authMiddleware, async (req, res) => {
  const { title, subject, xp } = req.body;
  try {
    const parentProfile = req.user.parentProfile || { childEmails: [], customQuests: [], rewards: [] };
    const newQuest = {
      id: 'pq_' + Date.now(),
      title,
      subject,
      xp: Number(xp) || 30,
      completed: false
    };
    
    parentProfile.customQuests.push(newQuest);
    
    // Also save under child account (in mono-user simulation, child and parent share the user context)
    const updatedUser = await db.updateUser(req.user._id, { parentProfile });
    res.status(201).json(updatedUser.parentProfile.customQuests);
  } catch (err) {
    res.status(500).json({ message: 'Error adding custom quest.' });
  }
});

parentRouter.post('/reward', authMiddleware, async (req, res) => {
  const { title, costXp } = req.body;
  try {
    const parentProfile = req.user.parentProfile || { childEmails: [], customQuests: [], rewards: [] };
    const newReward = {
      id: 'pr_' + Date.now(),
      title,
      costXp: Number(costXp) || 100,
      unlocked: false
    };
    parentProfile.rewards.push(newReward);
    const updatedUser = await db.updateUser(req.user._id, { parentProfile });
    res.status(201).json(updatedUser.parentProfile.rewards);
  } catch (err) {
    res.status(500).json({ message: 'Error adding custom reward.' });
  }
});

parentRouter.post('/reward/unlock', authMiddleware, async (req, res) => {
  const { rewardId } = req.body;
  try {
    const parentProfile = req.user.parentProfile;
    const rewardIndex = parentProfile.rewards.findIndex(r => r.id === rewardId);
    if (rewardIndex === -1) {
      return res.status(404).json({ message: 'Reward not found.' });
    }
    
    const reward = parentProfile.rewards[rewardIndex];
    if (req.user.studentProfile.xp < reward.costXp) {
      return res.status(400).json({ message: 'Not enough XP earned by the student yet!' });
    }
    
    // Deduct student XP
    const studentProfile = req.user.studentProfile;
    studentProfile.xp -= reward.costXp;
    
    // Mark reward unlocked
    parentProfile.rewards[rewardIndex].unlocked = true;
    
    const updatedUser = await db.updateUser(req.user._id, { parentProfile, studentProfile });
    res.json({
      message: 'Reward unlocked successfully!',
      rewards: updatedUser.parentProfile.rewards,
      xp: updatedUser.studentProfile.xp
    });
  } catch (err) {
    res.status(500).json({ message: 'Error unlocking reward.' });
  }
});

app.use('/api/parent', parentRouter);

// --- STUDENT PROFILE ROUTER ---
const studentRouter = express.Router();

studentRouter.get('/profile', authMiddleware, async (req, res) => {
  try {
    let profile = await db.getStudentProfileByUserId(req.user._id);
    if (!profile) {
      profile = await db.saveStudentProfile(req.user._id, { name: req.user.name });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Error loading student profile.' });
  }
});

studentRouter.post('/profile', authMiddleware, async (req, res) => {
  try {
    const updated = await db.saveStudentProfile(req.user._id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Error updating student profile.' });
  }
});

app.use('/api/student', studentRouter);

// --- EXAMS ROUTER ---
const examRouter = express.Router();

examRouter.get('/', authMiddleware, async (req, res) => {
  try {
    const list = await db.getExamsByUser(req.user._id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error loading exams.' });
  }
});

examRouter.post('/', authMiddleware, async (req, res) => {
  try {
    const newExam = await db.createExam({ userId: req.user._id, ...req.body });
    res.status(201).json(newExam);
  } catch (err) {
    res.status(500).json({ message: 'Error creating exam.' });
  }
});

examRouter.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await db.deleteExam(req.params.id);
    res.json({ message: 'Exam deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting exam.' });
  }
});

app.use('/api/exams', examRouter);

// --- SYLLABUS INGESTION ROUTER ---
const ingestRouter = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const ingestService = require('./services/ingestService');

ingestRouter.get('/pending', authMiddleware, async (req, res) => {
  try {
    const list = await db.getPendingSyllabuses();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching pending syllabus uploads: ' + err.message });
  }
});

ingestRouter.post('/upload', authMiddleware, upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No PDF files uploaded.' });
    }

    for (const file of req.files) {
      // Process each file in the background asynchronously
      ingestService.processSyllabusPDF(file.buffer, file.originalname).catch(err => {
        console.error(`Error processing background PDF ${file.originalname}:`, err);
      });
    }

    res.json({ message: 'PDF files received. Ingestion processing has started in the background. Please refresh in a few seconds.' });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed: ' + err.message });
  }
});

ingestRouter.post('/approve/:id', authMiddleware, async (req, res) => {
  try {
    const pending = await db.getPendingSyllabusById(req.params.id);
    if (!pending) {
      return res.status(404).json({ message: 'Pending syllabus record not found.' });
    }

    // Publish to active syllabus collections (Class, Subject, Chapter, Topic)
    // Merges new topics into existing chapters if chapters already exist.
    await db.publishPendingSyllabusData(pending.classNum, pending.subjectName, pending.extractedData);

    // Update status to approved
    const updated = await db.updatePendingSyllabusStatus(req.params.id, 'approved');
    res.json({ message: 'Syllabus approved and published successfully!', record: updated });
  } catch (err) {
    res.status(500).json({ message: 'Approval failed: ' + err.message });
  }
});

ingestRouter.post('/reject/:id', authMiddleware, async (req, res) => {
  try {
    const pending = await db.getPendingSyllabusById(req.params.id);
    if (!pending) {
      return res.status(404).json({ message: 'Pending syllabus record not found.' });
    }

    const updated = await db.updatePendingSyllabusStatus(req.params.id, 'rejected');
    res.json({ message: 'Syllabus rejected.', record: updated });
  } catch (err) {
    res.status(500).json({ message: 'Rejection failed: ' + err.message });
  }
});

ingestRouter.delete('/pending/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await db.deletePendingSyllabus(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Pending syllabus record not found.' });
    }
    res.json({ message: 'Pending record removed successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Removal failed: ' + err.message });
  }
});

app.use('/api/ingest', ingestRouter);

// --- TEACHER VERIFICATION SYSTEM ENDPOINTS ---

const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Config Multer for Teacher proof/certificate upload
const multerDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const uploadFields = multer({ storage: multerDiskStorage }).fields([
  { name: 'teacherIdProof', maxCount: 1 },
  { name: 'certificates', maxCount: 5 }
]);

// Middlewares
const teacherAuthMiddleware = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No authentication token provided.' });
  }

  if (token === 'demo_teacher_token_bypass') {
    let demoTeacher = await db.findTeacherByEmail('teacher@studybuddy.com');
    if (!demoTeacher) {
      demoTeacher = await db.createTeacher({
        name: 'Dr. Ravi Kumar',
        email: 'teacher@studybuddy.com',
        password: bcrypt.hashSync('teacher123', 10),
        phone: '+919876543210',
        country: 'India',
        qualification: 'M.Sc Biology, B.Ed',
        specialization: 'Biology',
        institution: 'Andhra Pradesh Model School',
        role: 'teacher',
        status: 'approved',
        approvedBy: 'System Admin'
      });
    }
    req.teacher = demoTeacher;
    req.user = demoTeacher;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const teacher = await db.findTeacherById(decoded.id);
    if (!teacher) {
      return res.status(401).json({ message: 'Teacher/Admin profile not found.' });
    }
    req.teacher = teacher;
    req.user = teacher;
    next();
  } catch (err) {
    console.error("TeacherAuthMiddleware error:", err);
    return res.status(401).json({ message: 'Invalid or expired session token.' });
  }
};

const approvedTeacherAuth = (req, res, next) => {
  const user = req.user || req.teacher;
  if (!user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  if (user.status !== 'approved' && user.role !== 'admin' && user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Your teacher account is pending approval or has been suspended.' });
  }
  next();
};

const adminAuth = (req, res, next) => {
  const user = req.user || req.teacher;
  if (!user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  }
  next();
};

const superAdminAuth = (req, res, next) => {
  const user = req.user || req.teacher;
  if (!user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  if (user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied. Super Admin privileges required.' });
  }
  next();
};

// 1. Teachers Auth Router
const teachersRouter = express.Router();

teachersRouter.post('/register', uploadFields, async (req, res) => {
  try {
    const { name, email, phone, country, qualification, specialization, institution, password } = req.body;
    
    if (!name || !email || !phone || !country || !qualification || !specialization || !institution || !password) {
      return res.status(400).json({ message: 'All text fields are required.' });
    }

    // Validate phone matches E.164 international format
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phone)) {
      return res.status(400).json({ message: 'Phone number must be in E.164 international format (e.g. +919988776655).' });
    }

    const existing = await db.findTeacherByEmail(email);
    if (existing) {
      return res.status(400).json({ message: 'A teacher/admin with this email already exists.' });
    }

    const teacherIdProof = req.files && req.files['teacherIdProof'] ? `/uploads/${req.files['teacherIdProof'][0].filename}` : '';
    const certificates = req.files && req.files['certificates'] ? req.files['certificates'].map(f => `/uploads/${f.filename}`) : [];

    if (!teacherIdProof) {
      return res.status(400).json({ message: 'Government ID Proof is required for verification.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const teacherData = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      country,
      qualification,
      specialization,
      institution,
      teacherIdProof,
      certificates,
      role: 'teacher',
      status: 'pending',
      approvedBy: ''
    };

    const newTeacher = await db.createTeacher(teacherData);
    res.status(201).json({
      message: 'Application submitted successfully! Your account is pending administrator review.',
      teacher: {
        id: newTeacher._id,
        name: newTeacher.name,
        email: newTeacher.email,
        role: newTeacher.role,
        status: newTeacher.status
      }
    });
  } catch (err) {
    console.error("Teacher onboarding error:", err);
    res.status(500).json({ message: 'Error submitting teacher registration.' });
  }
});

teachersRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const teacher = await db.findTeacherByEmail(email);
    if (!teacher) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    if (teacher.status === 'pending') {
      return res.status(403).json({ message: 'Application under review' });
    }

    if (teacher.status === 'rejected') {
      return res.status(403).json({ message: 'Application rejected' });
    }

    if (teacher.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended by an administrator.' });
    }

    const token = jwt.sign({ id: teacher._id, role: teacher.role }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        status: teacher.status,
        qualification: teacher.qualification,
        specialization: teacher.specialization,
        institution: teacher.institution,
        country: teacher.country,
        phone: teacher.phone
      }
    });
  } catch (err) {
    console.error("Teacher login error:", err);
    res.status(500).json({ message: 'Server login error.' });
  }
});

teachersRouter.get('/me', teacherAuthMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.teacher._id,
      name: req.teacher.name,
      email: req.teacher.email,
      role: req.teacher.role,
      status: req.teacher.status,
      qualification: req.teacher.qualification,
      specialization: req.teacher.specialization,
      institution: req.teacher.institution,
      availabilityStatus: req.teacher.availabilityStatus || 'offline',
      soundEnabled: req.teacher.soundEnabled !== false,
      pushEnabled: req.teacher.pushEnabled !== false,
      emailEnabled: req.teacher.emailEnabled !== false,
      workingHoursStart: req.teacher.workingHoursStart || '09:00',
      workingHoursEnd: req.teacher.workingHoursEnd || '17:00',
      dndEnabled: req.teacher.dndEnabled || false,
      dndStart: req.teacher.dndStart || '22:00',
      dndEnd: req.teacher.dndEnd || '07:00',
      subjectsTaught: req.teacher.subjectsTaught || [req.teacher.specialization],
      classesTaught: req.teacher.classesTaught || []
    }
  });
});

// Get teacher notifications/settings
teachersRouter.get('/settings', teacherAuthMiddleware, (req, res) => {
  res.json({
    soundEnabled: req.teacher.soundEnabled !== false,
    pushEnabled: req.teacher.pushEnabled !== false,
    emailEnabled: req.teacher.emailEnabled !== false,
    workingHoursStart: req.teacher.workingHoursStart || '09:00',
    workingHoursEnd: req.teacher.workingHoursEnd || '17:00',
    dndEnabled: req.teacher.dndEnabled || false,
    dndStart: req.teacher.dndStart || '22:00',
    dndEnd: req.teacher.dndEnd || '07:00',
    subjectsTaught: req.teacher.subjectsTaught || [req.teacher.specialization],
    classesTaught: req.teacher.classesTaught || [],
    availabilityStatus: req.teacher.availabilityStatus || 'offline'
  });
});

// Update teacher notifications/settings
teachersRouter.post('/settings', teacherAuthMiddleware, async (req, res) => {
  try {
    const { 
      soundEnabled, pushEnabled, emailEnabled, 
      workingHoursStart, workingHoursEnd, 
      dndEnabled, dndStart, dndEnd, 
      subjectsTaught, classesTaught 
    } = req.body;

    const updated = await db.updateTeacher(req.teacher._id, {
      soundEnabled: soundEnabled !== undefined ? soundEnabled : true,
      pushEnabled: pushEnabled !== undefined ? pushEnabled : true,
      emailEnabled: emailEnabled !== undefined ? emailEnabled : true,
      workingHoursStart: workingHoursStart || '09:00',
      workingHoursEnd: workingHoursEnd || '17:00',
      dndEnabled: dndEnabled !== undefined ? dndEnabled : false,
      dndStart: dndStart || '22:00',
      dndEnd: dndEnd || '07:00',
      subjectsTaught: subjectsTaught || [],
      classesTaught: classesTaught || []
    });

    res.json({ message: 'Settings updated successfully!', settings: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update settings: ' + err.message });
  }
});

// Update teacher status
teachersRouter.post('/status', teacherAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['online', 'offline', 'busy', 'away', 'in_live_session'].includes(status)) {
      return res.status(400).json({ message: 'Invalid availability status.' });
    }
    const updated = await db.updateTeacher(req.teacher._id, { availabilityStatus: status });

    res.json({ message: 'Status updated!', status: updated.availabilityStatus });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status.' });
  }
});

// Get teacher notifications
teachersRouter.get('/notifications', teacherAuthMiddleware, async (req, res) => {
  try {
    const list = await db.getNotificationsForRecipient(req.teacher._id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load notifications.' });
  }
});

// Mark teacher notifications as read
teachersRouter.post('/notifications/read', teacherAuthMiddleware, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    await db.markNotificationsAsRead(req.teacher._id, notificationIds || []);
    res.json({ message: 'Notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark notifications read.' });
  }
});

// Save FCM Token
teachersRouter.post('/fcm-token', teacherAuthMiddleware, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    await db.updateTeacher(req.teacher._id, { fcmToken });
    res.json({ message: 'FCM Token saved.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save FCM token.' });
  }
});

// 2. Admin Router
const adminRouter = express.Router();

// GET list of admins (Super Admin only)
adminRouter.get('/admins', teacherAuthMiddleware, superAdminAuth, async (req, res) => {
  try {
    const allUsers = await db.getAllUsers();
    const admins = allUsers.filter(u => u.role === 'admin');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving admin accounts.' });
  }
});

// POST create new Admin (Super Admin only)
adminRouter.post('/admins', teacherAuthMiddleware, superAdminAuth, async (req, res) => {
  const { name, email, password, permissions, department } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }
    const existing = await db.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const permissionSet = Array.isArray(permissions) ? permissions : [];
    
    // Create unified User document with role 'admin'
    const newAdmin = await db.createUser({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      permissions: permissionSet
    });

    // Write to AdminProfile
    await db.createAdminProfile(newAdmin._id, req.user.email, permissionSet, department || 'General');

    // Audit Log
    await db.logAuditAction('create_admin', req.user.email, email, { permissions: permissionSet, department });

    res.status(201).json({
      message: 'Admin account created successfully!',
      user: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        permissions: newAdmin.permissions
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error creating admin account: ' + err.message });
  }
});

// POST update admin permissions (Super Admin only)
adminRouter.post('/admins/permissions/:id', teacherAuthMiddleware, superAdminAuth, async (req, res) => {
  const { permissions, department } = req.body;
  try {
    const adminUser = await db.findUserById(req.params.id);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(404).json({ message: 'Admin account not found.' });
    }

    const permissionSet = Array.isArray(permissions) ? permissions : [];
    await db.updateUser(req.params.id, { permissions: permissionSet });
    await db.createAdminProfile(req.params.id, req.user.email, permissionSet, department || 'General');

    // Audit Log
    await db.logAuditAction('update_permissions', req.user.email, adminUser.email, { permissions: permissionSet });

    res.json({ message: 'Permissions updated successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating permissions.' });
  }
});

// POST toggle suspend Admin (Super Admin only)
adminRouter.post('/admins/suspend/:id', teacherAuthMiddleware, superAdminAuth, async (req, res) => {
  const { status } = req.body; // 'active' or 'suspended'
  try {
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }
    const adminUser = await db.findUserById(req.params.id);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(404).json({ message: 'Admin account not found.' });
    }

    await db.updateUser(req.params.id, { status });

    // Audit Log
    await db.logAuditAction('suspend_admin', req.user.email, adminUser.email, { status });

    res.json({ message: `Admin account is now ${status}.` });
  } catch (err) {
    res.status(500).json({ message: 'Error suspending admin account.' });
  }
});

// DELETE Admin account (Super Admin only)
adminRouter.delete('/admins/:id', teacherAuthMiddleware, superAdminAuth, async (req, res) => {
  try {
    const adminUser = await db.findUserById(req.params.id);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(404).json({ message: 'Admin account not found.' });
    }

    await db.deleteUser(req.params.id);
    await db.deleteAdminProfile(req.params.id);

    // Audit Log
    await db.logAuditAction('delete_admin', req.user.email, adminUser.email);

    res.json({ message: 'Admin account deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting admin account.' });
  }
});

// GET platform audit logs (Super Admin only)
adminRouter.get('/logs', teacherAuthMiddleware, superAdminAuth, async (req, res) => {
  try {
    const logs = await db.getAuditLogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Error loading audit logs.' });
  }
});

// GET database health status (Super Admin only)
adminRouter.get('/health', teacherAuthMiddleware, superAdminAuth, async (req, res) => {
  try {
    const isMock = db.isMockMode();
    const uptime = process.uptime();
    res.json({
      status: 'healthy',
      database: isMock ? 'JSON Mock database' : 'MongoDB instance',
      uptime: `${Math.round(uptime / 60)} minutes`,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ message: 'Error checking system health.' });
  }
});

// POST system settings / optional modules toggles (Super Admin only)
let systemSettings = {
  aiStudyPlanner: true,
  quizCenter: true,
  aiTeacherChat: true
};
adminRouter.post('/settings', teacherAuthMiddleware, superAdminAuth, async (req, res) => {
  const { aiStudyPlanner, quizCenter, aiTeacherChat } = req.body;
  try {
    if (aiStudyPlanner !== undefined) systemSettings.aiStudyPlanner = aiStudyPlanner;
    if (quizCenter !== undefined) systemSettings.quizCenter = quizCenter;
    if (aiTeacherChat !== undefined) systemSettings.aiTeacherChat = aiTeacherChat;

    await db.logAuditAction('update_settings', req.user.email, '', systemSettings);
    res.json({ message: 'Platform settings updated successfully!', settings: systemSettings });
  } catch (err) {
    res.status(500).json({ message: 'Error updating system settings.' });
  }
});

// GET system settings (Public / Auth)
adminRouter.get('/settings/public', async (req, res) => {
  res.json(systemSettings);
});

// --- Announcements endpoints ---
// GET list of announcements
adminRouter.get('/announcements', async (req, res) => {
  try {
    const announcements = await db.getAnnouncements();
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving announcements.' });
  }
});

// POST create announcement (Admin/Super Admin)
adminRouter.post('/announcements', teacherAuthMiddleware, adminAuth, verifyPermission('manage_content'), async (req, res) => {
  const { title, content } = req.body;
  try {
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required.' });
    }
    const ann = await db.createAnnouncement(title, content, req.user.name);
    await db.logAuditAction('create_announcement', req.user.email, '', { title });
    res.status(201).json({ message: 'Announcement published successfully!', announcement: ann });
  } catch (err) {
    res.status(500).json({ message: 'Error publishing announcement.' });
  }
});

// DELETE announcement (Admin/Super Admin)
adminRouter.delete('/announcements/:id', teacherAuthMiddleware, adminAuth, verifyPermission('manage_content'), async (req, res) => {
  try {
    await db.deleteAnnouncement(req.params.id);
    await db.logAuditAction('delete_announcement', req.user.email, req.params.id);
    res.json({ message: 'Announcement removed successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting announcement.' });
  }
});

// --- Student Reports / Complaints endpoints ---
// GET list of reports (Admin/Super Admin)
adminRouter.get('/reports', teacherAuthMiddleware, adminAuth, async (req, res) => {
  try {
    const list = await db.getReports();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error loading reports queue.' });
  }
});

// POST resolve a report (Admin/Super Admin)
adminRouter.post('/reports/resolve/:id', teacherAuthMiddleware, adminAuth, async (req, res) => {
  const { status } = req.body; // 'resolved' or 'ignored'
  try {
    const updated = await db.updateReportStatus(req.params.id, status || 'resolved');
    await db.logAuditAction('resolve_report', req.user.email, '', { id: req.params.id, status });
    res.json({ message: `Report marked as ${status || 'resolved'}.`, report: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error resolving report.' });
  }
});

// POST report something (Students/Parents)
adminRouter.post('/reports', authMiddleware, async (req, res) => {
  const { type, content, targetItem } = req.body;
  try {
    if (!type || !content) {
      return res.status(400).json({ message: 'Type and content are required.' });
    }
    const report = await db.createReport(type, content, req.user.email, targetItem);
    res.status(201).json({ message: 'Report submitted successfully!', report });
  } catch (err) {
    res.status(500).json({ message: 'Error submitting report.' });
  }
});

// GET list of teachers (Admin/Super Admin)
adminRouter.get('/teachers', teacherAuthMiddleware, adminAuth, async (req, res) => {
  try {
    const teachers = await db.getAllTeachers();
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving teacher applications.' });
  }
});

// POST approve teacher (Admin/Super Admin, verify_teachers check)
adminRouter.post('/teachers/approve/:id', teacherAuthMiddleware, adminAuth, verifyPermission('verify_teachers'), async (req, res) => {
  try {
    const updated = await db.updateTeacherStatus(req.params.id, 'approved', req.teacher.name);
    if (!updated) {
      return res.status(404).json({ message: 'Teacher application not found.' });
    }
    await db.logAuditAction('approve_teacher', req.user.email, updated.email, { id: req.params.id });
    res.json({ message: 'Teacher application approved successfully!', teacher: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error approving teacher.' });
  }
});

// POST reject teacher (Admin/Super Admin, verify_teachers check)
adminRouter.post('/teachers/reject/:id', teacherAuthMiddleware, adminAuth, verifyPermission('verify_teachers'), async (req, res) => {
  try {
    const updated = await db.updateTeacherStatus(req.params.id, 'rejected', req.teacher.name);
    if (!updated) {
      return res.status(404).json({ message: 'Teacher application not found.' });
    }
    await db.logAuditAction('reject_teacher', req.user.email, updated.email, { id: req.params.id });
    res.json({ message: 'Teacher application rejected.', teacher: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error rejecting teacher.' });
  }
});

// POST suspend teacher (Admin/Super Admin, verify_teachers check)
adminRouter.post('/teachers/suspend/:id', teacherAuthMiddleware, adminAuth, verifyPermission('verify_teachers'), async (req, res) => {
  try {
    const updated = await db.updateTeacherStatus(req.params.id, 'suspended', req.teacher.name);
    if (!updated) {
      return res.status(404).json({ message: 'Teacher not found.' });
    }
    await db.logAuditAction('suspend_teacher', req.user.email, updated.email, { id: req.params.id });
    res.json({ message: 'Teacher account suspended.', teacher: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error suspending teacher.' });
  }
});

// DELETE Teacher application (Admin/Super Admin, manage_teachers check)
adminRouter.delete('/teachers/:id', teacherAuthMiddleware, adminAuth, verifyPermission('manage_teachers'), async (req, res) => {
  try {
    const teacher = await db.findTeacherById(req.params.id);
    const deleted = await db.deleteTeacher(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Teacher not found.' });
    }
    await db.logAuditAction('delete_teacher', req.user.email, teacher ? teacher.email : req.params.id);
    res.json({ message: 'Teacher application deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting teacher application.' });
  }
});

// PUT update teacher details (Admin/Super Admin, manage_teachers check)
adminRouter.put('/teachers/:id', teacherAuthMiddleware, adminAuth, verifyPermission('manage_teachers'), async (req, res) => {
  const { name, email, phone, country, qualification, specialization, institution, status, role } = req.body;
  try {
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (phone) updateData.phone = phone;
    if (country) updateData.country = country;
    if (qualification) updateData.qualification = qualification;
    if (specialization) updateData.specialization = specialization;
    if (institution) updateData.institution = institution;
    if (status) updateData.status = status;
    if (role) updateData.role = role;

    const updated = await db.updateTeacher(req.params.id, updateData);
    if (!updated) {
      return res.status(404).json({ message: 'Teacher not found.' });
    }
    await db.logAuditAction('update_teacher', req.user.email, updated.email, updateData);
    res.json({ message: 'Teacher details updated successfully!', teacher: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating teacher details.' });
  }
});

// GET list of students (Admin/Super Admin, manage_users check)
adminRouter.get('/students', teacherAuthMiddleware, adminAuth, verifyPermission('manage_users'), async (req, res) => {
  try {
    const allUsers = await db.getAllUsers();
    const students = allUsers.filter(u => u.role === 'student');
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error retrieving student profiles.' });
  }
});

// PUT update student details (Admin/Super Admin, manage_users check)
adminRouter.put('/students/:id', teacherAuthMiddleware, adminAuth, verifyPermission('manage_users'), async (req, res) => {
  const { name, email, studentProfile } = req.body;
  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (studentProfile !== undefined) updateData.studentProfile = studentProfile;

    const updated = await db.updateUser(req.params.id, updateData);
    if (!updated) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }
    await db.logAuditAction('update_student', req.user.email, updated.email, updateData);
    res.json({ message: 'Student updated successfully!', user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating student profile.' });
  }
});

// DELETE student account (Admin/Super Admin, manage_users check)
adminRouter.delete('/students/:id', teacherAuthMiddleware, adminAuth, verifyPermission('manage_users'), async (req, res) => {
  try {
    const studentUser = await db.findUserById(req.params.id);
    const deleted = await db.deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Student not found.' });
    }
    await db.logAuditAction('delete_student', req.user.email, studentUser ? studentUser.email : req.params.id);
    res.json({ message: 'Student account deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting student profile.' });
  }
});

// GET stats summary (Admin/Super Admin)
adminRouter.get('/stats', teacherAuthMiddleware, adminAuth, async (req, res) => {
  try {
    const stats = await db.getAIAnswersStats();
    const allTeachers = await db.getAllTeachers();
    const teacherCount = allTeachers.filter(t => t.role === 'teacher').length;
    const pendingTeacherCount = allTeachers.filter(t => t.role === 'teacher' && t.status === 'pending').length;
    res.json({
      ...stats,
      totalTeachers: teacherCount,
      pendingTeachers: pendingTeacherCount
    });
  } catch (err) {
    res.status(500).json({ message: 'Error loading admin stats.' });
  }
});

// Admin manual teacher creation endpoint (Admin/Super Admin, manage_teachers check)
adminRouter.post('/teachers/create', teacherAuthMiddleware, adminAuth, verifyPermission('manage_teachers'), async (req, res) => {
  const { name, email, phone, country, qualification, specialization, institution, password } = req.body;
  try {
    if (!name || !email || !phone || !country || !qualification || !specialization || !institution || !password) {
      return res.status(400).json({ message: 'All text fields are required.' });
    }

    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phone)) {
      return res.status(400).json({ message: 'Phone number must be in E.164 international format (e.g. +919988776655).' });
    }

    const existing = await db.findTeacherByEmail(email);
    if (existing) {
      return res.status(400).json({ message: 'A teacher/admin with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const teacherData = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      country,
      qualification,
      specialization,
      institution,
      teacherIdProof: '', // Manual addition does not require uploaded documents
      certificates: [],
      role: 'teacher',
      status: 'approved', // Pre-approved directly by the admin
      approvedBy: req.teacher.name
    };

    const newTeacher = await db.createTeacher(teacherData);
    await db.logAuditAction('create_teacher', req.user.email, email, { role: 'teacher' });
    res.status(201).json({
      message: 'Teacher account created and approved successfully!',
      teacher: {
        id: newTeacher._id,
        name: newTeacher.name,
        email: newTeacher.email,
        role: newTeacher.role,
        status: newTeacher.status
      }
    });
  } catch (err) {
    console.error("Direct teacher creation error:", err);
    res.status(500).json({ message: 'Error creating teacher account: ' + err.message });
  }
});

// POST Seed entire AP Board & CBSE syllabus (Class 6-10) in a single click
adminRouter.post('/seed-syllabus', teacherAuthMiddleware, adminAuth, verifyPermission('manage_syllabus'), async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const syllabusPath = path.join(__dirname, 'config', 'full_syllabus.json');
    if (!fs.existsSync(syllabusPath)) {
      return res.status(404).json({ message: 'Syllabus definition file not found.' });
    }
    const rawData = fs.readFileSync(syllabusPath, 'utf8');
    const syllabusArray = JSON.parse(rawData);
    
    await db.bulkInsertSyllabus(syllabusArray);
    await db.logAuditAction('seed_full_syllabus', req.user.email, '', { count: syllabusArray.length });
    
    res.json({ message: 'Successfully seeded entire AP Board & CBSE syllabus (Class 6-10)!' });
  } catch (err) {
    console.error("Error seeding syllabus:", err);
    res.status(500).json({ message: 'Error seeding syllabus: ' + err.message });
  }
});

// POST Add textbook content manually or via PDF parser (Layer 1 admin upload)
adminRouter.post('/textbook-content', teacherAuthMiddleware, adminAuth, verifyPermission('manage_syllabus'), async (req, res) => {
  const { classNum, subjectName, chapterName, topicName, content, sourceFile, pageNumber } = req.body;
  if (!classNum || !subjectName || !chapterName || !content) {
    return res.status(400).json({ message: 'Class, Subject, Chapter, and Content are required.' });
  }
  try {
    const newContent = await db.saveTextbookContent({
      classNum: Number(classNum),
      subjectName,
      chapterName,
      topicName: topicName || 'General',
      content,
      sourceFile: sourceFile || 'Uploaded Textbook Note',
      pageNumber: pageNumber ? Number(pageNumber) : null
    });
    await db.logAuditAction('add_textbook_content', req.user.email, '', { classNum, subjectName, chapterName, topicName });
    res.json({ message: 'Textbook content added successfully!', content: newContent });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add textbook content: ' + err.message });
  }
});

// Manual syllabus modification endpoints
syllabusRouter.post('/add-topic', teacherAuthMiddleware, adminAuth, verifyPermission('manage_syllabus'), async (req, res) => {
  const { classNum, subjectName, chapterName, topicName } = req.body;
  if (!classNum || !subjectName || !chapterName || !topicName) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  try {
    const topic = await db.addManualTopic(classNum, subjectName, chapterName, topicName);
    await db.logAuditAction('add_syllabus_topic', req.user.email, '', { classNum, subjectName, chapterName, topicName });
    res.json({ message: 'Topic added successfully!', topic });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add topic: ' + err.message });
  }
});

syllabusRouter.post('/delete-topic', teacherAuthMiddleware, adminAuth, verifyPermission('manage_syllabus'), async (req, res) => {
  const { classNum, subjectName, chapterName, topicName } = req.body;
  if (!classNum || !subjectName || !chapterName || !topicName) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  try {
    await db.deleteManualTopic(classNum, subjectName, chapterName, topicName);
    await db.logAuditAction('delete_syllabus_topic', req.user.email, '', { classNum, subjectName, chapterName, topicName });
    res.json({ message: 'Topic deleted successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete topic: ' + err.message });
  }
});

syllabusRouter.post('/delete-chapter', teacherAuthMiddleware, adminAuth, verifyPermission('manage_syllabus'), async (req, res) => {
  const { classNum, subjectName, chapterName } = req.body;
  if (!classNum || !subjectName || !chapterName) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  try {
    await db.deleteManualChapter(classNum, subjectName, chapterName);
    await db.logAuditAction('delete_syllabus_chapter', req.user.email, '', { classNum, subjectName, chapterName });
    res.json({ message: 'Chapter deleted successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete chapter: ' + err.message });
  }
});

syllabusRouter.post('/delete-subject', teacherAuthMiddleware, adminAuth, verifyPermission('manage_syllabus'), async (req, res) => {
  const { classNum, subjectName } = req.body;
  if (!classNum || !subjectName) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  try {
    await db.deleteManualSubject(classNum, subjectName);
    await db.logAuditAction('delete_syllabus_subject', req.user.email, '', { classNum, subjectName });
    res.json({ message: 'Subject deleted successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete subject: ' + err.message });
  }
});

// --- TEACHER REVIEW ROUTER ---
const teacherReviewRouter = express.Router();

teacherReviewRouter.get('/answers/pending', teacherAuthMiddleware, approvedTeacherAuth, async (req, res) => {
  try {
    const filters = { verificationStatus: 'pending' };
    if (req.query.class) filters.class = Number(req.query.class);
    if (req.query.subject) filters.subject = req.query.subject;
    const list = await db.getAIAnswers(filters);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving pending review queue.' });
  }
});

teacherReviewRouter.get('/answers/approved', teacherAuthMiddleware, approvedTeacherAuth, async (req, res) => {
  try {
    const filters = { verificationStatus: 'approved' };
    if (req.query.class) filters.class = Number(req.query.class);
    if (req.query.subject) filters.subject = req.query.subject;
    const list = await db.getAIAnswers(filters);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving approved answers.' });
  }
});

teacherReviewRouter.get('/answers/rejected', teacherAuthMiddleware, approvedTeacherAuth, async (req, res) => {
  try {
    const filters = { verificationStatus: 'rejected' };
    if (req.query.class) filters.class = Number(req.query.class);
    if (req.query.subject) filters.subject = req.query.subject;
    const list = await db.getAIAnswers(filters);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving rejected answers.' });
  }
});

teacherReviewRouter.post('/answers/review/:id', teacherAuthMiddleware, approvedTeacherAuth, async (req, res) => {
  const { action, answerText, teacherComments, sources } = req.body;
  try {
    if (!['approve', 'edit', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action.' });
    }

    let status = 'pending';
    if (action === 'approve') status = 'approved';
    if (action === 'reject') status = 'rejected';
    if (action === 'edit') status = 'edited';

    const extraFields = {
      teacherComments: teacherComments || '',
      sources: Array.isArray(sources) ? sources : [],
      verifiedBy: {
        name: req.teacher.name || 'Subject Teacher',
        qualification: req.teacher.qualification || 'Subject Expert',
        institution: req.teacher.institution || 'StudyBuddy'
      },
      // Set confidence score based on action: 100 for approve/edit, 0 for reject
      confidenceScore: (action === 'approve' || action === 'edit') ? 100 : 0,
      verifiedAt: new Date()
    };

    if (action === 'edit') {
      if (!answerText) {
        return res.status(400).json({ message: 'Answer text is required for editing.' });
      }
      extraFields.answer = answerText;
    }

    const updated = await db.updateAIAnswerVerification(req.params.id, status, extraFields);
    if (!updated) {
      return res.status(404).json({ message: 'Answer record not found.' });
    }

    await db.logAuditAction('review_answer', req.user.email, '', { id: req.params.id, action, status });
    res.json({ message: 'Answer reviewed successfully!', answer: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error reviewing answer.' });
  }
});

// GET Retrieve pending doubts for teachers
teacherReviewRouter.get('/doubts', teacherAuthMiddleware, approvedTeacherAuth, async (req, res) => {
  try {
    const filters = {};
    if (req.query.class) filters.classNum = Number(req.query.class);
    if (req.query.subject) filters.subject = req.query.subject;
    const list = await db.getPendingDoubts(filters);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving pending doubts: ' + err.message });
  }
});

// POST Resolve a doubt with a teacher's explanation
teacherReviewRouter.post('/doubts/resolve/:id', teacherAuthMiddleware, approvedTeacherAuth, async (req, res) => {
  const { teacherAnswer } = req.body;
  if (!teacherAnswer) {
    return res.status(400).json({ message: 'Teacher explanation is required.' });
  }
  try {
    const teacherObj = {
      name: req.teacher.name || 'Subject Teacher',
      qualification: req.teacher.qualification || 'Subject Expert',
      institution: req.teacher.institution || 'StudyBuddy'
    };
    const updated = await db.resolveDoubt(req.params.id, teacherAnswer, teacherObj);
    if (!updated) {
      return res.status(404).json({ message: 'Doubt ticket not found.' });
    }
    await db.logAuditAction('resolve_doubt', req.user.email, '', { id: req.params.id });
    res.json({ message: 'Doubt resolved successfully!', doubt: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error resolving doubt: ' + err.message });
  }
});

app.use('/api/teachers', teachersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/teachers-review', teacherReviewRouter);

// --- DOUBT / TICKET ROUTER (STUDENT-FACING) ---
const doubtRouter = express.Router();

// POST Submit a new doubt ticket
doubtRouter.post('/', authMiddleware, async (req, res) => {
  const { classNum, subject, question, aiAnswer } = req.body;
  if (!classNum || !subject || !question || !aiAnswer) {
    return res.status(400).json({ message: 'Class, Subject, Question, and AI Answer are required.' });
  }
  try {
    const newDoubt = await db.createDoubt({
      studentId: req.user._id || req.user.uid,
      studentName: req.user.name || 'Student',
      classNum: Number(classNum),
      subject,
      question,
      aiAnswer,
      status: 'pending'
    });
    res.json({ message: 'Doubt ticket created successfully!', doubt: newDoubt });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create doubt ticket: ' + err.message });
  }
});

// GET Get doubts for the logged-in student
doubtRouter.get('/', authMiddleware, async (req, res) => {
  try {
    const studentId = req.user._id || req.user.uid;
    const list = await db.getDoubtsByStudent(studentId);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve doubts: ' + err.message });
  }
});

// GET Get status of a specific doubt ticket
doubtRouter.get('/status/:id', authMiddleware, async (req, res) => {
  try {
    let doubt;
    if (db.isMockMode()) {
      // In mock mode, require the module dynamically or use it directly if available
      const fs = require('fs');
      const path = require('path');
      const mockDbPath = path.join(__dirname, 'data', 'mock_db.json');
      if (fs.existsSync(mockDbPath)) {
        const raw = fs.readFileSync(mockDbPath, 'utf8');
        const mockDb = JSON.parse(raw);
        const doubts = mockDb.doubts || [];
        doubt = doubts.find(d => d._id === req.params.id);
      }
    } else {
      const mongoose = require('mongoose');
      const DoubtModel = mongoose.model('Doubt');
      doubt = await DoubtModel.findById(req.params.id);
    }
    
    if (!doubt) return res.status(404).json({ message: 'Doubt ticket not found.' });
    res.json(doubt);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving doubt status: ' + err.message });
  }
});

app.use('/api/doubts', doubtRouter);

// Public answer status polling endpoint — used by student chat to auto-update verified answers
app.get('/api/answers/status/:id', authMiddleware, async (req, res) => {
  try {
    const answer = await db.findAIAnswerById(req.params.id);
    if (!answer) return res.status(404).json({ message: 'Answer not found.' });
    // Return only the fields needed for the student UI update
    res.json({
      _id: answer._id,
      verificationStatus: answer.verificationStatus,
      confidenceScore: answer.confidenceScore,
      isVerified: ['approved', 'edited'].includes(answer.verificationStatus),
      verifiedBy: answer.verifiedBy || null,
      verifiedAt: answer.verifiedAt || null,
      teacherComments: answer.teacherComments || '',
      answer: answer.answer,
      isSyllabusRelated: answer.isSyllabusRelated !== false,
      sources: answer.sources || []
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching answer status.' });
  }
});

// --- TEACHER SUPPORT SYSTEM: TICKETS ROUTER ---
const ticketsRouter = express.Router();

// 1. Create a support ticket (Student only)
ticketsRouter.post('/', authMiddleware, async (req, res) => {
  try {
    const { question, aiAnswer, supportType, subject, classNum } = req.body;
    if (!question || !aiAnswer || !supportType) {
      return res.status(400).json({ message: 'Question, AI Answer, and Support Type are required.' });
    }
    const ticket = await db.createSupportTicket({
      studentId: req.user._id,
      studentName: req.user.name,
      classNum: classNum || req.user.studentProfile?.classNum || 10,
      subject: subject || 'General',
      question,
      aiAnswer,
      supportType
    });

    // Trigger real-time routing alert for verified teachers
    try {
      const socketService = require('./services/socketService');
      socketService.routeDoubtRequest({
        ticketId: ticket._id,
        studentId: req.user._id,
        studentName: req.user.name,
        classNum: ticket.classNum,
        subject: ticket.subject,
        question: ticket.question,
        aiAnswer: ticket.aiAnswer,
        timeRaised: ticket.createdAt
      });
    } catch (sockErr) {
      console.warn("⚠️ Failed to trigger real-time routing alert:", sockErr.message);
    }

    res.status(201).json(ticket);
  } catch (err) {
    console.error("Error creating support ticket:", err);
    res.status(500).json({ message: 'Failed to create support ticket: ' + err.message });
  }
});

// 2. Get student's own tickets (Student only)
ticketsRouter.get('/student', authMiddleware, async (req, res) => {
  try {
    const tickets = await db.getStudentTickets(req.user._id);
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch student support tickets.' });
  }
});

// 3. Get pending tickets (Teacher/Admin only)
ticketsRouter.get('/pending', authMiddleware, async (req, res) => {
  try {
    if (!['teacher', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Only teachers/admins can view pending tickets.' });
    }
    const tickets = await db.getPendingTickets();
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending support tickets.' });
  }
});

// 4. Get active tickets for the logged-in teacher (Teacher/Admin only)
ticketsRouter.get('/active', authMiddleware, async (req, res) => {
  try {
    if (!['teacher', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const tickets = await db.getTeacherActiveTickets(req.user._id);
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch active support tickets.' });
  }
});

// 5. Get completed tickets for the logged-in teacher (Teacher/Admin only)
ticketsRouter.get('/completed', authMiddleware, async (req, res) => {
  try {
    if (!['teacher', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const tickets = await db.getTeacherCompletedTickets(req.user._id);
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch completed support tickets.' });
  }
});

// 6. Accept a support ticket (Teacher/Admin only)
ticketsRouter.post('/:id/accept', authMiddleware, async (req, res) => {
  try {
    if (!['teacher', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const ticket = await db.acceptSupportTicket(req.params.id, req.user._id, req.user.name);
    if (!ticket) {
      return res.status(404).json({ message: 'Support ticket not found.' });
    }

    try {
      const socketService = require('./services/socketService');
      socketService.notifyStudentDoubtAssigned(ticket, req.user);
    } catch (sockErr) {
      console.warn("⚠️ Failed to trigger socket notification on HTTP accept:", sockErr.message);
    }

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: 'Failed to accept support ticket: ' + err.message });
  }
});

// 7. Resolve a support ticket (Teacher/Admin only)
ticketsRouter.post('/:id/resolve', authMiddleware, async (req, res) => {
  try {
    if (!['teacher', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const { teacherAnswer, whiteboardImage } = req.body;
    const ticket = await db.resolveSupportTicket(req.params.id, teacherAnswer, whiteboardImage);
    if (!ticket) {
      return res.status(404).json({ message: 'Support ticket not found.' });
    }
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: 'Failed to resolve support ticket: ' + err.message });
  }
});

// 8. Get status of a specific ticket (polling endpoint for student chat)
ticketsRouter.get('/:id/status', authMiddleware, async (req, res) => {
  try {
    const ticket = await db.getTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Support ticket not found.' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving ticket status.' });
  }
});

// 9. Delete a support ticket (Student only)
ticketsRouter.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const ticket = await db.getTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Support ticket not found.' });
    }
    const studentId = req.user._id || req.user.uid;
    if (!studentId || ticket.studentId.toString() !== studentId.toString()) {
      return res.status(403).json({ message: 'Access denied. You can only delete your own support tickets.' });
    }
    
    // Clean up socket routing/escalation/assignments
    try {
      const socketService = require('./services/socketService');
      socketService.cancelDoubtRequest(req.params.id, ticket.assignedTeacher);
    } catch (sockErr) {
      console.warn("⚠️ Failed to cancel doubt request in socketService:", sockErr.message);
    }

    // Delete the notifications
    await db.deleteNotificationsForTicket(req.params.id);

    // Delete the ticket itself
    await db.deleteSupportTicket(req.params.id);

    res.json({ message: 'Support ticket deleted successfully.' });
  } catch (err) {
    console.error("Error deleting support ticket:", err);
    res.status(500).json({ message: 'Failed to delete support ticket: ' + err.message });
  }
});

// 10. Bulk delete support tickets (Student only)
ticketsRouter.post('/delete-bulk', authMiddleware, async (req, res) => {
  try {
    const { ticketIds } = req.body; // array of IDs, or 'all' to delete all student's tickets
    const studentId = req.user._id || req.user.uid;
    if (!studentId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    let targetTickets = [];
    if (ticketIds === 'all') {
      targetTickets = await db.getStudentTickets(studentId);
    } else if (Array.isArray(ticketIds)) {
      for (const id of ticketIds) {
        const ticket = await db.getTicketById(id);
        if (ticket && ticket.studentId.toString() === studentId.toString()) {
          targetTickets.push(ticket);
        }
      }
    }

    if (targetTickets.length === 0) {
      return res.json({ message: 'No tickets were found or deleted.' });
    }

    const socketService = require('./services/socketService');
    for (const ticket of targetTickets) {
      try {
        socketService.cancelDoubtRequest(ticket._id, ticket.assignedTeacher);
      } catch (sockErr) {
        console.warn("⚠️ Failed to cancel doubt request:", sockErr.message);
      }
      await db.deleteNotificationsForTicket(ticket._id);
      await db.deleteSupportTicket(ticket._id);
    }

    res.json({ message: 'Support tickets deleted successfully.' });
  } catch (err) {
    console.error("Error bulk deleting support tickets:", err);
    res.status(500).json({ message: 'Failed to bulk delete tickets: ' + err.message });
  }
});

app.use('/api/tickets', ticketsRouter);

// Serve frontend static files in production
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// Fallback for React Router (Single Page App)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Start server
const http = require('http');
const server = http.createServer(app);
const socketService = require('./services/socketService');

// Initialize Socket.IO
socketService.init(server);

server.listen(PORT, () => {
  console.log(`🚀 StudyBuddy Server running on port ${PORT}...`);
});
