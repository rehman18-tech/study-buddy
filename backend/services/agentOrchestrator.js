const db = require('../config/db');
const { callLLM, runLocalModel, getEmbedding } = require('./llmService');
const { searchWeb } = require('./searchService');

const chapterEmbeddingCache = {};
const topicEmbeddingCache = {};

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0.0 || normB === 0.0) return 0.0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 1. Student Memory Agent
 * Gathers and formats student memory context
 */
async function loadMemoryContext(userId, name, userObj) {
  let profile = await db.getStudentProfileByUserId(userId);
  if (!profile) {
    // Lazy initialize default profile if student profile doesn't exist
    profile = await db.saveStudentProfile(userId, {
      name: name || 'Student',
      classNum: userObj?.studentProfile?.class || 6,
      schoolName: userObj?.studentProfile?.schoolName || 'Zilla Parishad High School',
      schoolType: userObj?.studentProfile?.schoolType || 'Public',
      board: userObj?.studentProfile?.board || 'SSC',
      preferredLanguage: userObj?.studentProfile?.preferredLanguage || 'English',
      learningGoals: ['Understand core concepts', 'Score above 80% on quizzes'],
      weakSubjects: ['Mathematics'],
      strongSubjects: ['Science']
    });
  } else if (userObj?.studentProfile) {
    // Sync values if database state is out of sync
    let needsUpdate = false;
    const updates = {};
    if (userObj.studentProfile.preferredLanguage && profile.preferredLanguage !== userObj.studentProfile.preferredLanguage) {
      updates.preferredLanguage = userObj.studentProfile.preferredLanguage;
      needsUpdate = true;
    }
    if (userObj.studentProfile.class && profile.classNum !== userObj.studentProfile.class) {
      updates.classNum = userObj.studentProfile.class;
      needsUpdate = true;
    }
    if (needsUpdate) {
      profile = await db.saveStudentProfile(userId, updates);
    }
  }

  const exams = await db.getExamsByUser(userId);
  const homework = await db.getHomeworkByUser(userId);
  const quizResults = await db.getQuizResultsByUser(userId);

  const formattedExams = exams.map(e => `${e.subject} Exam on ${e.date} (${e.title})`).join('; ');
  const formattedHomework = homework.filter(h => !h.completed).map(h => `${h.subject}: ${h.title} (Due: ${h.dueDate})`).join('; ');
  const formattedQuizScores = quizResults.slice(0, 5).map(q => `${q.subject} - ${q.score}% (${q.chapterName || 'General'})`).join(', ');

  const studentMemory = await db.getStudentMemory(userId);

  const memoryContext = `Student Profile Memory:
- Name: ${profile.name}
- Grade/Class: Class ${profile.classNum}
- Board: ${profile.board}
- School Type: ${profile.schoolType} School
- Preferred Language: ${profile.preferredLanguage}
- Learning Goals: ${profile.learningGoals.join(', ')}
- Weak Subjects: ${profile.weakSubjects.join(', ')}
- Strong Subjects: ${profile.strongSubjects.join(', ')}
- Stats: ${profile.xp} XP, ${profile.coins} Coins, Streak: ${profile.streak} days, Total Study Time: ${profile.studyTime} mins
- Upcoming Exams: ${formattedExams || 'None scheduled'}
- Uncompleted Homework: ${formattedHomework || 'None'}
- Recent Quiz History: ${formattedQuizScores || 'No quizzes taken yet'}
- Student Learning Memory:
  * Weak Chapters: ${studentMemory?.weakChapters?.join(', ') || 'None yet'}
  * Strong Chapters: ${studentMemory?.strongChapters?.join(', ') || 'None yet'}
  * Completed Chapters: ${studentMemory?.completedChapters?.join(', ') || 'None yet'}
  * Previous Mistakes: ${JSON.stringify(studentMemory?.previousMistakes || [])}
  * Learning Speed: ${studentMemory?.learningSpeed || 'Average'}`;

  return { profile, memoryContext };
}

/**
 * 2. Syllabus Knowledge Agent
 * Gathers active syllabus context for class & subject
 */
async function loadSyllabusContext(classNum, userMessage) {
  let detectedSubject = '';
  const subjectsList = ['Mathematics', 'Math', 'Science', 'English', 'Social Studies', 'Telugu', 'Hindi'];
  
  const cleanMsg = userMessage.toLowerCase();
  const subjectKeywords = {
    'Science': [
      'photosynthesis', 'cell', 'gravity', 'acid', 'base', 'chemical', 'physics', 
      'chemistry', 'biology', 'plant', 'animal', 'organism', 'fertiliz', 'zygote', 
      'atom', 'molecule', 'energy', 'force', 'organ', 'evolution', 'dna', 'rna',
      'respiration', 'digestion', 'heart', 'brain', 'bacteria', 'virus', 'steam engine'
    ],
    'Social Studies': [
      'slogan', 'decentralis', 'india', 'movement', 'history', 'civics', 'geography', 
      'quit india', 'gandhi', 'government', 'constitution', 'war', 'revolution',
      'parliament', 'democracy', 'election', 'map', 'river', 'soil', 'climate', 'president',
      'nationalism', 'satyagraha', 'british', 'colonial'
    ],
    'Mathematics': [
      'arithmetic', 'progression', 'fraction', 'solve', 'equation', 'algebra', 'geometry', 
      'triangle', 'number', 'theorem', 'sum', 'multiply', 'divide', 'subtract', 'add',
      'derivative', 'integral', 'matrix', 'vector', 'probability', 'statistics'
    ]
  };

  // 1. Try exact match of subject name first
  for (const sub of subjectsList) {
    const regex = new RegExp(`\\b${sub}\\b`, 'i');
    if (regex.test(userMessage)) {
      detectedSubject = sub === 'Math' ? 'Mathematics' : sub;
      break;
    }
  }

  // 2. Try keyword matches if no exact match found
  if (!detectedSubject) {
    for (const [sub, keywords] of Object.entries(subjectKeywords)) {
      for (const keyword of keywords) {
        if (cleanMsg.includes(keyword)) {
          detectedSubject = sub;
          break;
        }
      }
      if (detectedSubject) break;
    }
  }

  let syllabusContext = '';
  if (detectedSubject) {
    const chapters = await db.getChaptersByClassAndSubject(classNum, detectedSubject);
    if (chapters && chapters.length > 0) {
      const chapterDetails = [];
      for (const ch of chapters) {
        const topics = await db.getTopicsByChapter(classNum, detectedSubject, ch.name);
        chapterDetails.push(`Chapter: "${ch.name}" (Topics: ${topics.map(t => t.name).join(', ')})`);
      }
      syllabusContext = `Syllabus Knowledge Context (Class ${classNum} - ${detectedSubject}):\n` + chapterDetails.join('\n');
    } else {
      syllabusContext = `Syllabus Context: Currently no custom chapters are uploaded in database for Class ${classNum} ${detectedSubject}. Fallback to standard Andhra Pradesh Class ${classNum} curriculum topics.`;
    }
  } else {
    // Load general classes syllabus summary with their chapters
    const allSubjects = await db.getSubjectsByClass(classNum);
    const subjectSummaries = [];
    for (const sub of allSubjects) {
      const chapters = await db.getChaptersByClassAndSubject(classNum, sub.name);
      if (chapters && chapters.length > 0) {
        const chapterList = chapters.map(ch => `"${ch.name}"`).join(', ');
        subjectSummaries.push(`- ${sub.name} Chapters: ${chapterList}`);
      } else {
        subjectSummaries.push(`- ${sub.name}: No chapters uploaded yet.`);
      }
    }
    syllabusContext = `Syllabus Context (Class ${classNum} general):\n` + subjectSummaries.join('\n');
  }

  return { detectedSubject, syllabusContext };
}

/**
 * Intent Classifier
 */
async function classifyIntent(userMessage) {
  const msg = userMessage.toLowerCase().trim();
  
  // 1. Comprehensive Local Rule-Based Classifier (saves LLM quota & latency)
  if (/\b(plan|schedule|calendar|timetable|todo|checklist|agenda|routine|what should i study|when should i study|study schedule|study plan|revision schedule|study calendar)\b/i.test(msg)) {
    return 'PLANNER';
  }
  if (/\b(quiz|test|mcq|practice|test me|solve questions|give me questions|ask me questions|question bank|quiz me|practice test|mock test|multiple choice|fill in the blank)\b/i.test(msg)) {
    if (/\b(prep|prepare|study guide)\b/i.test(msg)) {
      return 'EXAM';
    }
    return 'QUIZ';
  }
  if (/\b(progress|stat|score|report|badge|achievement|xp|coin|history|level|analytics|how am i doing|my performance|my grades|my progress|view stats|show progress)\b/i.test(msg)) {
    return 'PROGRESS';
  }
  if (/\b(remind|reminder|alarm|alert|notify|notification|set alarm|study alert|set reminder|daily reminder)\b/i.test(msg)) {
    return 'REMINDER';
  }
  if (/\b(exam|test prep|prepare|test tomorrow|revision guide|test date|final exam|midterm|how to prepare|exam prep)\b/i.test(msg)) {
    return 'EXAM';
  }

  // If it does not match any of the specific agent keywords, it is a learning/tutoring question.
  // Bypass the LLM intent classification call entirely to save 3-4 seconds of latency!
  return 'SYLLABUS';
}

function getLanguagePrompt(preferredLanguage, isJson = true) {
  if (preferredLanguage === 'Hindi') {
    return `\n\nCRITICAL: The student's preferred language is Hindi. All user-facing text values (explanations, responses, titles, questions, options, topics, tips, definitions, etc.) MUST be written in Hindi (using Hindi script).${isJson ? ' Keep JSON keys in English.' : ''}`;
  } else if (preferredLanguage === 'Telugu') {
    return `\n\nCRITICAL: The student's preferred language is Telugu. All user-facing text values (explanations, responses, titles, questions, options, topics, tips, definitions, etc.) MUST be written in Telugu (using Telugu script).${isJson ? ' Keep JSON keys in English.' : ''}`;
  } else {
    return `\n\nCRITICAL: The student's preferred language is English. All user-facing text values (explanations, responses, titles, questions, options, topics, tips, definitions, etc.) MUST be written in English. Do NOT use Hindi or Telugu.`;
  }
}

const fallbackTranslations = {
  'Hindi': {
    subjects: {
      'Mathematics': 'गणित',
      'Science': 'विज्ञान',
      'English': 'अंग्रेजी',
      'Social Studies': 'सामाजिक अध्ययन',
      'Telugu': 'तेलुगु',
      'Hindi': 'हिंदी'
    },
    quiz: {
      text: "एआई वर्तमान में उच्च मांग का सामना कर रहा है। कोई चिंता नहीं! मैंने आपके लिए एक त्वरित स्थानीय अभ्यास प्रश्नोत्तरी तैयार की है। आइए आपके कौशल का परीक्षण करें!",
      title: "अभ्यास प्रश्नोत्तरी",
      chapterName: "सामान्य अवधारणाएं",
      q1: "में महारत हासिल करने का सबसे अच्छा तरीका क्या है?",
      q1_opts: ['रोजाना स्टडी बडी के साथ अध्ययन करना', 'परीक्षा से एक रात पहले रटना', 'अभ्यास छोड़ना', 'देर से गृहकार्य करना'],
      q1_exp: 'गहन समझ और उच्च अंक प्राप्त करने के लिए लगातार दैनिक अभ्यास महत्वपूर्ण है!',
      q2: 'संशोधन के लिए पाठ्यक्रम अध्याय नोट्स अत्यधिक उपयोगी हैं।',
      q2_opts: ['सही', 'गलत'],
      q2_exp: 'हां! सारांश बुलेट नोट्स की समीक्षा करने से याददाश्त मजबूत होती है।',
      q3: 'आपके व्यक्तिगत एआई अध्ययन एजेंट का नाम स्टडी _________ है।',
      q3_ans: 'Buddy',
      q3_exp: 'आपके सहायक ट्यूटर साथी का नाम स्टडी बडी है।'
    },
    planner: {
      text: "योजना बनाने वाली सेवा अभी व्यस्त है, इसलिए मैंने आपके लिए एक अनुशंसित दैनिक फोकस सूची लोड की है!",
      title: "दैनिक फोकस सूची",
      topic1: "मूल अवधारणा समीक्षा",
      topic2: "शब्दावली अभ्यास"
    },
    progress: {
      text: "यहाँ आपके सक्रिय प्रोफ़ाइल आँकड़ों से गणना की गई आपकी प्रगति स्थिति है!",
      strongAreas: ['सामान्य विज्ञान']
    },
    exam: {
      text: "यहाँ आपकी आगामी परीक्षाओं के लिए एक कस्टम परीक्षा तैयारी मार्गदर्शिका है!",
      notes: [
        'सभी अध्याय पाठ्यक्रम नोट्स की समीक्षा करें।',
        'पहले कमजोर प्रश्नोत्तरी विषयों को हल करने पर ध्यान दें।'
      ],
      questions: [
        'इस अध्याय के प्राथमिक सिद्धांतों का सारांश दें।',
        'शिक्षक के लिए एक त्वरित पुनरीक्षण नोट का मसौदा तैयार करें।'
      ],
      plan: 'आज कम से कम दो अभ्यास क्विज़ हल करें, और सुधार के लिए स्टडी बडी से पूछें!'
    },
    syllabus: {
      text: "हूठ हूठ! 🦉 गूगल जेमिनी एआई वर्तमान में उच्च मांग का सामना कर रहा है। स्पाइक्स अस्थायी हैं! इस बीच, आप अभी भी अपने स्टडी प्लानर कैलेंडर की जांच कर सकते हैं, अपनी प्रगति रिपोर्ट की समीक्षा कर सकते हैं, या अपनी दैनिक सूचनाएं कॉन्फ़िगर कर सकते हैं। आइए सीखते रहें!"
    }
  },
  'Telugu': {
    subjects: {
      'Mathematics': 'గణితం',
      'Science': 'విజ్ఞాన శాస్త్రం',
      'English': 'ఇంగ్లీష్',
      'Social Studies': 'సాంఘిక శాస్త్రం',
      'Telugu': 'తెలుగు',
      'Hindi': 'హిందీ'
    },
    quiz: {
      text: "AI ప్రస్తుతం అధిక డిమాండ్‌ను ఎదుర్కొంటోంది. చింతించకండి! నేను మీ కోసం శీఘ్ర స్థానిక ప్రాక్టీస్ క్విజ్‌ను రూపొందించాను. మీ నైపుణ్యాలను పరీక్షించుకుందాం!",
      title: "ప్రాక్టీస్ క్విజ్",
      chapterName: "సాధారణ భావనలు",
      q1: "లో నైపుణ్యం సాధించడానికి ఉత్తమ మార్గం ఏది?",
      q1_opts: ['ప్రతిరోజూ స్టడీ బడ్డీతో చదువుకోవడం', 'పరీక్షకు ముందు రోజు రాత్రి చదవడం', 'ప్రాక్టీస్ దాటవేయడం', 'హోంవర్క్ ఆలస్యంగా చేయడం'],
      q1_exp: 'లోతైన అవగాహన మరియు అధిక స్కోర్‌లను సాధించడానికి నిరంతర రోజువారీ ప్రాక్టీస్ కీలకం!',
      q2: 'పునర్విమర్శ కోసం సిలబస్ అధ్యాయం నోట్స్ చాలా ఉపయోగకరంగా ఉంటాయి.',
      q2_opts: ['సరియైనది', 'తప్పు'],
      q2_exp: 'అవును! సారాంశ బులెట్ నోట్స్‌ని సమీక్షించడం జ్ఞాపకశక్తిని బలోపేతం చేయడానికి సహాయపడుతుంది.',
      q3: 'మీ వ్యక్తిగత AI స్టడీ ఏజెంట్ పేరు స్టడీ _________.',
      q3_ans: 'Buddy',
      q3_exp: 'మీ సహాయక ట్యూటర్ సహచరుడి పేరు స్టడీ బడ్డీ.'
    },
    planner: {
      text: "ప్లానర్ సర్వీస్ ప్రస్తుతం బిజీగా ఉంది, కాబట్టి నేను మీ కోసం సిఫార్సు చేయబడిన రోజువారీ ఫోకస్ చెక్‌లిస్ట్‌ను లోడ్ చేసాను!",
      title: "రోజువారీ ఫోకస్ షెడ్యూల్",
      topic1: "కోర్ కాన్సెప్ట్ రివ్యూ",
      topic2: "పదజాలం సాధన"
    },
    progress: {
      text: "మీ యాక్టివ్ ప్రొఫైల్ గణాంకాల నుండి లెక్కించబడిన మీ పురోగతి స్థితి ఇక్కడ ఉంది!",
      strongAreas: ['సాధారణ విజ్ఞాన శాస్త్రం']
    },
    exam: {
      text: "మీ రాబోయే పరీక్షల కోసం అనుకూల పరీక్షల తయారీ గైడ్ ఇక్కడ ఉంది!",
      notes: [
        'అన్ని అధ్యాయాల సిలబస్ నోట్స్‌ని సమీక్షించండి.',
        'ముందుగా బలహీనమైన క్విజ్ అంశాలను పరిష్కరించడంపై దృష్టి పెట్టండి.'
      ],
      questions: [
        'ఈ అధ్యాయంలోని ప్రాథమిక సిద్ధాంతాలను సంగ్రహించండి.',
        'ఉపాధ్యాయుడి కోసం శీఘ్ర పునర్విమర్శ గమనికను సిద్ధం చేయండి.'
      ],
      plan: 'ఈ రోజు కనీసం రెండు ప్రాక్టీస్ క్విజ్‌లను పరిష్కరించండి మరియు సవరణల కోసం స్టడీ బడ్డీని అడగండి!'
    },
    syllabus: {
      text: "హూట్ హూట్! 🦉 గూగుల్ జెమిని AI ప్రస్తుతం అధిక డిమాండ్‌ను ఎదుర్కొంటోంది. ఈ రద్దీ తాత్కాలికమే! ఈలోగా, మీరు మీ స్టడీ ప్లానర్ క్యాలెండర్‌ను తనిఖీ చేయవచ్చు, మీ పురోగతి నివేదికను సమీక్షించవచ్చు లేదా మీ రోజువారీ నోటిఫికేషన్‌లను కాన్ఫిగర్ చేయవచ్చు. నేర్చుకుంటూనే ఉందాం!"
    }
  }
};

/**
 * Agent Implementations
 */
const agents = {
  // 3. Study Planner Agent
  async runPlanner(user, profile, memoryContext, syllabusContext, userMessage) {
    let systemInstruction = `${memoryContext}
${syllabusContext}

You are the "Study Planner Agent". Your job is to create a highly personalized daily, weekly, or monthly study plan for this student based on the request type.
Understand their class, weak subjects, and exam dates to create an actionable study plan.

You must respond in a strict JSON format with exactly the following keys:
{
  "explanation": "A child-friendly, encouraging explanation of the study plan, reminding them of goals and why this helps.",
  "planType": "daily", // "daily", "weekly", or "monthly" depending on what the user requested
  "planData": {
    "title": "Study Plan Title",
    "tasks": [
      { "subject": "Math", "topic": "Fractions Practice", "duration": "20 mins", "priority": "high" },
      { "subject": "Science", "topic": "Photosynthesis Review", "duration": "15 mins", "priority": "medium" }
    ]
  }
}
Ensure the response is valid JSON and contains nothing else.`;
    systemInstruction += getLanguagePrompt(profile.preferredLanguage, true);

    let parsed;
    try {
      const responseText = await callLLM(systemInstruction, userMessage, true, true);
      parsed = JSON.parse(responseText.trim());
    } catch (err) {
      console.warn("⚠️ [AgentOrchestrator] Failed generating study plan via LLM. Using local plan fallback.", err.message);
      
      // DYNAMIC FALLBACK: Load real syllabus from DB and generate a customized study plan
      try {
        let reqPlanType = 'daily';
        if (userMessage.toLowerCase().includes('weekly')) {
          reqPlanType = 'weekly';
        } else if (userMessage.toLowerCase().includes('monthly')) {
          reqPlanType = 'monthly';
        }

        const classNum = profile.classNum || 6;
        const allSubjects = await db.getSubjectsByClass(classNum);
        const tasks = [];
        
        const taskCount = reqPlanType === 'daily' ? 2 : reqPlanType === 'weekly' ? 5 : 8;

        if (allSubjects && allSubjects.length > 0) {
          for (let i = 0; i < taskCount; i++) {
            const sub = allSubjects[i % allSubjects.length];
            const chapters = await db.getChaptersByClassAndSubject(classNum, sub.name);
            if (chapters && chapters.length > 0) {
              const randomChapter = chapters[Math.floor(Math.random() * chapters.length)];
              const topics = await db.getTopicsByChapter(classNum, sub.name, randomChapter.name);
              const topicName = topics && topics.length > 0 
                ? topics[Math.floor(Math.random() * topics.length)].name
                : randomChapter.name;
                
              tasks.push({
                subject: sub.name,
                topic: `${randomChapter.name}: ${topicName}`,
                duration: reqPlanType === 'daily' ? "25 mins" : reqPlanType === 'weekly' ? "40 mins" : "55 mins",
                priority: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low"
              });
            }
          }
        }
        
        // Fallback to static if no chapters/subjects are seeded
        if (tasks.length === 0) {
          if (reqPlanType === 'daily') {
            tasks.push({ subject: "Mathematics", topic: "Core Concept Practice", duration: "25 mins", priority: "high" });
            tasks.push({ subject: "Science", topic: "Syllabus Review", duration: "20 mins", priority: "medium" });
          } else if (reqPlanType === 'weekly') {
            tasks.push({ subject: "Mathematics", topic: "Algebra and Equations", duration: "45 mins", priority: "high" });
            tasks.push({ subject: "Science", topic: "Physics Mechanics Review", duration: "40 mins", priority: "medium" });
            tasks.push({ subject: "English", topic: "Grammar & Vocabulary Builder", duration: "30 mins", priority: "low" });
            tasks.push({ subject: "Social Studies", topic: "History Chapter 3 Review", duration: "40 mins", priority: "medium" });
            tasks.push({ subject: "Science", topic: "Chemistry Lab Concepts", duration: "45 mins", priority: "high" });
          } else {
            tasks.push({ subject: "Mathematics", topic: "Complete Chapter 1 and 2 Test Prep", duration: "60 mins", priority: "high" });
            tasks.push({ subject: "Science", topic: "Biology Unit 1 Overview", duration: "60 mins", priority: "high" });
            tasks.push({ subject: "English", topic: "Essay Writing Practice", duration: "45 mins", priority: "medium" });
            tasks.push({ subject: "Social Studies", topic: "Geography Map Quiz Prep", duration: "40 mins", priority: "low" });
            tasks.push({ subject: "Mathematics", topic: "Geometry Revision Questions", duration: "50 mins", priority: "high" });
            tasks.push({ subject: "Science", topic: "Chemical Reactions Study Guide", duration: "50 mins", priority: "medium" });
            tasks.push({ subject: "English", topic: "Reading Comprehension Mastery", duration: "30 mins", priority: "low" });
            tasks.push({ subject: "Social Studies", topic: "Civics & Government Review", duration: "45 mins", priority: "medium" });
          }
        }
        
        // Translate task descriptions to preferred language if necessary
        const isHindi = profile.preferredLanguage === 'Hindi';
        const isTelugu = profile.preferredLanguage === 'Telugu';
        
        let explanation = `The AI Planner is currently offline. Here is your customized ${reqPlanType} study plan based on your class syllabus!`;
        let title = "Today's Study Checklist";
        if (reqPlanType === 'weekly') title = "Weekly Study Calendar";
        if (reqPlanType === 'monthly') title = "Monthly Study Blueprint";
        
        if (isHindi) {
          explanation = reqPlanType === 'daily' 
            ? "एआई अध्ययन योजनाकार अभी ऑफ़लाइन है। यहाँ आपके पाठ्यक्रम पर आधारित एक अनुशंसित दैनिक अध्ययन सूची दी गई है!"
            : reqPlanType === 'weekly'
              ? "एआई अध्ययन योजनाकार अभी ऑफ़लाइन है। यहाँ आपके पाठ्यक्रम पर आधारित एक अनुशंसित साप्ताहिक अध्ययन सूची दी गई है!"
              : "एआई अध्ययन योजनाकार अभी ऑफ़लाइन है। यहाँ आपके पाठ्यक्रम पर आधारित एक अनुशंसित मासिक अध्ययन सूची दी गई है!";
          title = reqPlanType === 'daily' ? "आज की अध्ययन सूची" : reqPlanType === 'weekly' ? "साप्ताहिक अध्ययन सूची" : "मासिक अध्ययन सूची";
          tasks.forEach(t => {
            if (t.duration === '25 mins') t.duration = '25 मिनट';
            else if (t.duration === '20 mins') t.duration = '20 मिनट';
            else if (t.duration === '15 mins') t.duration = '15 मिनट';
            else if (t.duration === '40 mins') t.duration = '40 मिनट';
            else if (t.duration === '45 mins') t.duration = '45 मिनट';
            else if (t.duration === '50 mins') t.duration = '50 मिनट';
            else if (t.duration === '55 mins') t.duration = '55 मिनट';
            else if (t.duration === '60 mins') t.duration = '60 मिनट';
            else if (t.duration === '30 mins') t.duration = '30 मिनट';
            
            if (t.subject === 'Mathematics') t.subject = 'गणित';
            else if (t.subject === 'Science') t.subject = 'विज्ञान';
            else if (t.subject === 'English') t.subject = 'अंग्रेजी';
            else if (t.subject === 'Social Studies') t.subject = 'सामाजिक अध्ययन';
            else if (t.subject === 'Telugu') t.subject = 'तेलुगु';
            else if (t.subject === 'Hindi') t.subject = 'हिंदी';
          });
        } else if (isTelugu) {
          explanation = reqPlanType === 'daily'
            ? "AI స్టడీ ప్లానర్ ప్రస్తుతం ఆఫ్‌లైన్‌లో ఉంది. మీ క్లాస్ సిలబస్ ఆధారంగా మీ కోసం ప్రత్యేకంగా రూపొందించిన రోజువారీ అధ్యయన ప్రణాళిక ఇక్కడ ఉంది!"
            : reqPlanType === 'weekly'
              ? "AI స్టడీ ప్లానర్ ప్రస్తుతం ఆఫ్‌లైన్‌లో ఉంది. మీ క్లాస్ సిలబస్ ఆధారంగా మీ కోసం ప్రత్యేకంగా రూపొందించిన వారపు అధ్యయన ప్రణాళిక ఇక్కడ ఉంది!"
              : "AI స్టడీ ప్లానర్ ప్రస్తుతం ఆఫ్‌లైన్‌లో ఉంది. మీ క్లాస్ సిలబస్ ఆధారంగా మీ కోసం ప్రత్యేకంగా రూపొందించిన నెలవారీ అధ్యయన ప్రణాళిక ఇక్కడ ఉంది!";
          title = reqPlanType === 'daily' ? "నేటి అధ్యయన చెక్‌లిస్ట్" : reqPlanType === 'weekly' ? "వారపు అధ్యయన చెక్‌లిస్ట్" : "నెలవారీ అధ్యయన ప్రణాళిక";
          tasks.forEach(t => {
            if (t.duration === '25 mins') t.duration = '25 నిమిషాలు';
            else if (t.duration === '20 mins') t.duration = '20 నిమిషాలు';
            else if (t.duration === '15 mins') t.duration = '15 నిమిషాలు';
            else if (t.duration === '40 mins') t.duration = '40 నిమిషాలు';
            else if (t.duration === '45 mins') t.duration = '45 నిమిషాలు';
            else if (t.duration === '50 mins') t.duration = '50 నిమిషాలు';
            else if (t.duration === '55 mins') t.duration = '55 నిమిషాలు';
            else if (t.duration === '60 mins') t.duration = '60 నిమిషాలు';
            else if (t.duration === '30 mins') t.duration = '30 నిమిషాలు';
            
            if (t.subject === 'Mathematics') t.subject = 'గణితం';
            else if (t.subject === 'Science') t.subject = 'విజ్ఞాన శాస్త్రం';
            else if (t.subject === 'English') t.subject = 'ఇంగ్లీష్';
            else if (t.subject === 'Social Studies') t.subject = 'సాంఘిక శాస్త్రం';
            else if (t.subject === 'Telugu') t.subject = 'తెలుగు';
            else if (t.subject === 'Hindi') t.subject = 'హిందీ';
          });
        }
        
        parsed = {
          explanation,
          planType: reqPlanType,
          planData: {
            title,
            tasks
          }
        };
      } catch (fallbackErr) {
        console.error("⚠️ Fallback planner generation failed, reverting to static model fallback:", fallbackErr.message);
        parsed = JSON.parse(runLocalModel(systemInstruction, userMessage, true));
      }
    }

    // Save study plan in MongoDB
    await db.createStudyPlan({
      userId: user._id,
      planType: parsed.planType || 'daily',
      planData: parsed.planData
    });

    return {
      agent: 'PLANNER',
      text: parsed.explanation,
      planData: parsed.planData
    };
  },

  // 4. Quiz Agent
  async runQuiz(user, profile, memoryContext, syllabusContext, userMessage, detectedSubject) {
    let systemInstruction = `${memoryContext}
${syllabusContext}

You are the "Quiz Agent". Your job is to generate a syllabus-aligned practice quiz for the student.
Generate 10 interactive questions based on their class curriculum and the requested subject/chapter.

CRITICAL DIFFICULTY RULE: The questions must be slightly challenging and conceptual, targeting deeper comprehension rather than basic rote-memory facts. Include a mix of analytical and problem-solving questions appropriate for Class ${profile.classNum} level (e.g. avoid overly trivial questions like simple arithmetic or basic definitions; include multi-step problems, logical application, or reasoning questions).

Questions can be a mix of:
- MCQ (mcq): Multiple Choice Questions with "options" array and "correctAnswerIndex".
- Fill in the Blanks (fib): Fill in the blank with "correctAnswerText" (case-insensitive string).
- True/False (tf): T/F with "options" as ["True", "False"] and "correctAnswerIndex".

You must respond in a strict JSON format with exactly the following keys:
{
  "explanation": "An encouraging message inviting the student to take the quiz.",
  "quizData": {
    "title": "Quiz Title",
    "subject": "Subject Name",
    "chapterName": "Chapter Name",
    "questions": [
      {
        "type": "mcq", // "mcq" or "tf" or "fib"
        "question": "Question text...",
        "options": ["Option A", "Option B", "Option C", "Option D"], // leave empty or omit for "fib"
        "correctAnswerIndex": 0, // omit for "fib"
        "correctAnswerText": "blank_word", // omit for "mcq" and "tf"
        "explanation": "Why this answer is correct..."
      }
    ]
  }
}
Ensure the response is valid JSON and contains nothing else.`;
    if (detectedSubject === 'Hindi') {
      systemInstruction += `\n\nCRITICAL: The subject is Hindi. All user-facing text values (explanations, responses, titles, questions, options, topics, tips, definitions, etc.) MUST be written in Hindi (using Devanagari script). Keep JSON keys in English.`;
    } else if (detectedSubject === 'Telugu') {
      systemInstruction += `\n\nCRITICAL: The subject is Telugu. All user-facing text values (explanations, responses, titles, questions, options, topics, tips, definitions, etc.) MUST be written in Telugu (using Telugu script). Keep JSON keys in English.`;
    } else {
      systemInstruction += getLanguagePrompt(profile.preferredLanguage, true);
    }

    let parsed;
    try {
      const responseText = await callLLM(systemInstruction, userMessage, true);
      parsed = JSON.parse(responseText.trim());
    } catch (err) {
      console.warn("⚠️ [AgentOrchestrator] Failed generating quiz via LLM. Using local quiz fallback.", err.message);
      parsed = JSON.parse(runLocalModel(systemInstruction, userMessage, true));
    }

    return {
      agent: 'QUIZ',
      text: parsed.explanation,
      quizData: parsed.quizData
    };
  },

  // 5. Progress Analysis Agent
  async runProgress(user, profile, memoryContext, syllabusContext, userMessage) {
    let systemInstruction = `${memoryContext}

You are the "Progress Analysis Agent". Your job is to analyze the student's study time, streaking, and quiz scores, and compile a friendly progress report card with improvement suggestions.
You should check if they qualify for any special badges or achievements:
- "Streak Master" (streak >= 3 days)
- "Math Wizard" (Math quiz average >= 80%)
- "Super Solver" (taken >= 3 quizzes)
- "First Step" (xp >= 50)

You must respond in a strict JSON format with exactly the following keys:
{
  "explanation": "A child-friendly markdown progress report reviewing quiz performance, study time, and goals.",
  "progressData": {
    "quizAverage": 82, // calculated average score
    "totalStudyTimeMins": 95,
    "weakAreas": ["Math Fractions"],
    "strongAreas": ["Science Life Cycle"],
    "achievementUnlocked": "Streak Master" // title of badge if unlocked, else null
  }
}
Ensure the response is valid JSON and contains nothing else.`;
    systemInstruction += getLanguagePrompt(profile.preferredLanguage, true);

    let parsed;
    try {
      const responseText = await callLLM(systemInstruction, userMessage, true);
      parsed = JSON.parse(responseText.trim());
    } catch (err) {
      console.warn("⚠️ [AgentOrchestrator] Failed generating progress report via LLM. Using local progress fallback.", err.message);
      parsed = JSON.parse(runLocalModel(systemInstruction, userMessage, true));
    }

    // Save achievement if unlocked
    if (parsed.progressData.achievementUnlocked) {
      await db.unlockAchievement(user._id, parsed.progressData.achievementUnlocked, 'badge');
    }

    return {
      agent: 'PROGRESS',
      text: parsed.explanation,
      progressData: parsed.progressData
    };
  },

  // 6. Reminder Agent
  async runReminder(user, profile, memoryContext, syllabusContext, userMessage) {
    let systemInstruction = `${memoryContext}

You are the "Reminder Agent". Your job is to help the student configure, view, or review reminders for homework, exams, or focus sessions.
Review their uncompleted homework and upcoming exams.

You must respond in a strict JSON format with exactly the following keys:
{
  "explanation": "A helpful response confirming set reminders or reminding them of pending study sessions.",
  "reminderData": {
    "action": "create" || "list" || "status",
    "reminders": [
      { "title": "Math Homework reminder", "time": "18:00", "active": true }
    ]
  }
}
Ensure the response is valid JSON and contains nothing else.`;
    systemInstruction += getLanguagePrompt(profile.preferredLanguage, true);

    let parsed;
    try {
      const responseText = await callLLM(systemInstruction, userMessage, true);
      parsed = JSON.parse(responseText.trim());
    } catch (err) {
      console.warn("⚠️ [AgentOrchestrator] Failed generating reminders via LLM. Using local reminder fallback.", err.message);
      parsed = JSON.parse(runLocalModel(systemInstruction, userMessage, true));
    }

    // Save reminder in database
    if (parsed.reminderData.reminders && parsed.reminderData.reminders.length > 0) {
      const rem = parsed.reminderData.reminders[0];
      await db.saveReminder(user._id, rem.time, rem.active);
    }

    return {
      agent: 'REMINDER',
      text: parsed.explanation,
      reminderData: parsed.reminderData
    };
  },

  // 7. Exam Preparation Agent
  async runExam(user, profile, memoryContext, syllabusContext, userMessage, detectedSubject) {
    let systemInstruction = `${memoryContext}
${syllabusContext}

You are the "Exam Preparation Agent". Your job is to help the student prepare for upcoming exams.
Generate a structured study guide, important concepts summary, and key preparation questions based on their class level.

You must respond in a strict JSON format with exactly the following keys:
{
  "explanation": "A motivating text block summarizing how they should approach this subject's preparation.",
  "examData": {
    "subject": "Science",
    "quickNotes": [
      "Key Concept 1 definition...",
      "Key Concept 2 definition..."
    ],
    "importantQuestions": [
      "What is the difference between X and Y?",
      "Solve: a + b = c"
    ],
    "revisionPlan": "Revision study roadmap summary..."
  }
}
Ensure the response is valid JSON and contains nothing else.`;
    if (detectedSubject === 'Hindi') {
      systemInstruction += `\n\nCRITICAL HINDI LANGUAGE RULE: Since the subject is Hindi, all quickNotes, importantQuestions, revisionPlan, explanations, etc. MUST be written in Hindi (using Devanagari script). Keep JSON keys in English.`;
    } else if (detectedSubject === 'Telugu') {
      systemInstruction += `\n\nCRITICAL TELUGU LANGUAGE RULE: Since the subject is Telugu, all quickNotes, importantQuestions, revisionPlan, explanations, etc. MUST be written in Telugu (using Telugu script). Keep JSON keys in English.`;
    } else {
      systemInstruction += getLanguagePrompt(profile.preferredLanguage, true);
    }

    let parsed;
    try {
      const responseText = await callLLM(systemInstruction, userMessage, true);
      parsed = JSON.parse(responseText.trim());
    } catch (err) {
      console.warn("⚠️ [AgentOrchestrator] Failed generating exam guide via LLM. Using local exam fallback.", err.message);
      parsed = JSON.parse(runLocalModel(systemInstruction, userMessage, true));
    }

    return {
      agent: 'EXAM',
      text: parsed.explanation,
      examData: parsed.examData
    };
  },

  // 2. Syllabus Knowledge Agent (Tutor)
  async runSyllabus(user, profile, memoryContext, syllabusContext, userMessage, detectedSubject, chapter = 'General', topic = 'General', overrideChoice = null) {
    const activeSubject = detectedSubject || 'General';
    const activeChapter = chapter || 'General';

    // 0. Lookup any existing answer (approved/edited first, then pending) — prevents duplicates in teacher queue
    try {
      // First check for an already-approved/edited answer (best case — serve immediately)
      const verifiedAnswer = await db.findVerifiedAnswer(userMessage, profile.classNum, activeSubject, activeChapter);
      if (verifiedAnswer) {
        console.log(`🎯 [runSyllabus] Found verified answer for: "${userMessage}"`);
        return {
          agent: 'SYLLABUS',
          text: verifiedAnswer.answer,
          verificationStatus: verifiedAnswer.verificationStatus,
          confidenceScore: verifiedAnswer.confidenceScore,
          isVerified: true,
          verifiedBy: verifiedAnswer.verifiedBy,
          verifiedAt: verifiedAnswer.verifiedAt,
          teacherComments: verifiedAnswer.teacherComments || '',
          sources: verifiedAnswer.sources,
          isSyllabusRelated: verifiedAnswer.isSyllabusRelated,
          reliabilityScore: verifiedAnswer.reliabilityScore,
          reliabilitySummary: verifiedAnswer.reliabilitySummary,
          learningCompanion: verifiedAnswer.learningCompanion,
          practiceQuestions: verifiedAnswer.practiceQuestions,
          miniQuiz: verifiedAnswer.miniQuiz,
          answerId: verifiedAnswer._id
        };
      }

      // Next, check if a PENDING answer already exists — if so, reuse it to avoid duplicate queue entries
      const pendingAnswer = await db.findExistingAnswer(userMessage, profile.classNum, activeSubject);
      if (pendingAnswer && pendingAnswer.verificationStatus === 'pending') {
        console.log(`♻️ [runSyllabus] Reusing existing pending answer for: "${userMessage}"`);
        return {
          agent: 'SYLLABUS',
          text: pendingAnswer.answer,
          verificationStatus: 'pending',
          confidenceScore: pendingAnswer.confidenceScore,
          isVerified: false,
          sources: pendingAnswer.sources || [],
          isSyllabusRelated: pendingAnswer.isSyllabusRelated,
          reliabilityScore: pendingAnswer.reliabilityScore,
          reliabilitySummary: pendingAnswer.reliabilitySummary,
          learningCompanion: pendingAnswer.learningCompanion,
          practiceQuestions: pendingAnswer.practiceQuestions,
          miniQuiz: pendingAnswer.miniQuiz,
          answerId: pendingAnswer._id
        };
      }
    } catch (lookupErr) {
      console.warn("⚠️ [runSyllabus] Answer lookup failed:", lookupErr.message);
    }

    // 1. Check if the question is Syllabus-Related vs. Out-of-Syllabus using semantic embeddings
    let isSyllabusRelated = false;
    let matchedChapterName = 'General';
    let matchedTopicName = 'General';

    if (overrideChoice !== 'general' && activeSubject && activeSubject !== 'General') {
      try {
        const chapters = await db.getChaptersByClassAndSubject(profile.classNum, activeSubject);
        if (chapters && chapters.length > 0) {
          // Syllabus-wide synonym query expansion dictionary
          const SYLLABUS_SYNONYMS = {
            'thales': 'Triangles Similarity of Triangles Basic Proportionality Theorem BPT',
            'bpt': 'Triangles Similarity of Triangles Basic Proportionality Theorem BPT',
            'basic proportionality': 'Triangles Similarity of Triangles BPT Thales Theorem',
            'pythagoras': 'Triangles Pythagoras Theorem',
            'trigonometry': 'Introduction to Trigonometry',
            'real number': 'Real Numbers',
            'polynomial': 'Polynomials',
            'linear equation': 'Pair of Linear Equations in Two Variables',
            'quadratic': 'Quadratic Equations',
            'arithmetic progression': 'Arithmetic Progressions AP',
            'coordinate': 'Coordinate Geometry',
            'acid': 'Acids, Bases and Salts',
            'base': 'Acids, Bases and Salts',
            'salt': 'Acids, Bases and Salts',
            'metal': 'Metals and Non-metals',
            'non-metal': 'Metals and Non-metals',
            'carbon': 'Carbon and its Compounds',
            'life process': 'Life Processes',
            'control': 'Control and Coordination',
            'coordination': 'Control and Coordination',
            'reproduce': 'How do Organisms Reproduce',
            'heredity': 'Heredity and Evolution',
            'evolution': 'Heredity and Evolution',
            'nationalism': 'Nationalism in India The Rise of Nationalism in Europe',
            'federalism': 'Federalism',
            'lencho': 'A Letter to God',
            'mandela': 'Nelson Mandela: Long Walk to Freedom',
            'anne frank': 'From the Diary of Anne Frank'
          };

          let expandedQuery = userMessage;
          const cleanUserMessage = userMessage.toLowerCase();
          for (const [key, expansion] of Object.entries(SYLLABUS_SYNONYMS)) {
            if (cleanUserMessage.includes(key)) {
              expandedQuery += ` ${expansion}`;
            }
          }

          // Generate embedding for expanded query message
          const queryEmbedding = await getEmbedding(expandedQuery);

          let bestChapter = null;
          let bestChapterScore = -1;
          let matchedTopicAfterMatch = 'General';

          // 1. Evaluate chapters
          for (const ch of chapters) {
            // Get topics for chapter
            const topics = await db.getTopicsByChapter(profile.classNum, activeSubject, ch.name);
            const topicNames = topics.map(t => t.name).join(', ');
            const chContextString = `Chapter: ${ch.name}. Topics: ${topicNames || 'General'}`;

            // Check embedding cache
            const cacheKey = `ch-${profile.classNum}-${activeSubject}-${ch.name}`;
            let chEmbedding = chapterEmbeddingCache[cacheKey];
            if (!chEmbedding) {
              chEmbedding = await getEmbedding(chContextString);
              chapterEmbeddingCache[cacheKey] = chEmbedding;
            }

            const chSimilarity = cosineSimilarity(queryEmbedding, chEmbedding);
            let chapterMaxScore = chSimilarity;
            let chapterBestTopic = null;
            let chapterBestTopicScore = -1;

            // Check embedding similarity for every individual topic inside this chapter
            for (const t of topics) {
              const topicContextString = `Topic: ${t.name}. Context: Part of chapter ${ch.name} in subject ${activeSubject}`;
              const tCacheKey = `t-${profile.classNum}-${activeSubject}-${ch.name}-${t.name}`;
              let tEmbedding = topicEmbeddingCache[tCacheKey];
              if (!tEmbedding) {
                tEmbedding = await getEmbedding(topicContextString);
                topicEmbeddingCache[tCacheKey] = tEmbedding;
              }

              const tSimilarity = cosineSimilarity(queryEmbedding, tEmbedding);
              if (tSimilarity > chapterBestTopicScore) {
                chapterBestTopicScore = tSimilarity;
                chapterBestTopic = t;
              }
            }

            if (chapterBestTopicScore > chapterMaxScore) {
              chapterMaxScore = chapterBestTopicScore;
            }

            // Keyword boost: If question explicitly mentions chapter or topic name, boost similarity score
            const cleanQuery = userMessage.toLowerCase();
            const cleanExpanded = expandedQuery.toLowerCase();
            let hasKeywordMatch = cleanQuery.includes(ch.name.toLowerCase()) || cleanExpanded.includes(ch.name.toLowerCase());
            for (const t of topics) {
              if (t.name && t.name.length > 3 && (cleanQuery.includes(t.name.toLowerCase()) || cleanExpanded.includes(t.name.toLowerCase()))) {
                hasKeywordMatch = true;
              }
            }

            if (hasKeywordMatch) {
              chapterMaxScore = Math.max(chapterMaxScore, 0.95);
            }

            if (chapterMaxScore > bestChapterScore) {
              bestChapterScore = chapterMaxScore;
              bestChapter = ch;
              matchedTopicAfterMatch = chapterBestTopic ? chapterBestTopic.name : 'General';
            }
          }

          console.log(`🧠 [runSyllabus] Optimized semantic similarity match: Best Chapter: "${bestChapter?.name}" with score: ${bestChapterScore.toFixed(4)}`);

          // Only match if score is at least 85% (0.85)
          if (bestChapter && bestChapterScore >= 0.85) {
            isSyllabusRelated = true;
            matchedChapterName = bestChapter.name;
            matchedTopicName = matchedTopicAfterMatch;
          }
        }
      } catch (err) {
        console.warn("⚠️ [runSyllabus] Semantic syllabus matching failed, falling back to out-of-syllabus:", err.message);
        isSyllabusRelated = false;
      }
    }

    let verificationLayer = 'web';
    let sourceDetails = [];
    let textbookText = '';

    // LAYER 1: Syllabus / Textbook Verification
    if (isSyllabusRelated) {
      verificationLayer = 'textbook';
      // Search local textbook content
      try {
        const matches = await db.searchTextbookContent(profile.classNum, activeSubject, matchedChapterName, userMessage);
        if (matches && matches.length > 0) {
          textbookText = matches.map(m => `[Source: ${m.sourceFile}, Page: ${m.pageNumber || 'N/A'}]\n${m.content}`).join('\n\n');
          sourceDetails = matches.map(m => ({
            type: 'textbook',
            board: profile.board || 'CBSE / AP State Board',
            class: profile.classNum,
            subject: activeSubject,
            chapter: m.chapterName,
            topic: m.topicName,
            sourceFile: m.sourceFile,
            pageNumber: m.pageNumber
          }));
        }
      } catch (err) {
        console.warn("⚠️ [AgentOrchestrator] Local textbook search failed:", err.message);
      }

      // If no textbook content was found in database, we can create a default source detailing the syllabus alignment
      if (sourceDetails.length === 0) {
        sourceDetails = [{
          type: 'textbook',
          board: profile.board || 'CBSE / AP State Board',
          class: profile.classNum,
          subject: activeSubject,
          chapter: matchedChapterName,
          topic: matchedTopicName,
          sourceFile: 'AP State Board Syllabus Chapter',
          pageNumber: null
        }];
      }
    }

    // 2. Perform Web Search based on classification
    let searchResults = [];
    if (!isSyllabusRelated || textbookText === '') {
      // Perform web search for out-of-syllabus or if we need supplementary info
      try {
        const searchQuery = isSyllabusRelated ? `${activeSubject} ${userMessage}` : userMessage;
        const rawResults = await searchWeb(searchQuery, isSyllabusRelated ? 2 : 5);
        
        // LAYER 2: Web Verification - Filter and Rank by Trust
        const rankWebSources = (results) => {
          const getScore = (url) => {
            try {
              const domain = new URL(url).hostname.toLowerCase();
              if (domain.endsWith('.gov') || domain.endsWith('.gov.in') || domain.endsWith('.nic.in')) return 4;
              if (domain.endsWith('.edu') || domain.endsWith('.edu.in') || domain.endsWith('.ac.in') || domain.includes('ncert.nic.in')) return 3;
              if (domain.includes('wikipedia.org') || domain.includes('britannica.com') || domain.includes('khanacademy.org') || domain.includes('org')) return 2;
              return 1;
            } catch (e) {
              return 0;
            }
          };
          return [...results].sort((a, b) => getScore(b.url) - getScore(a.url));
        };

        searchResults = rankWebSources(rawResults);
        
        if (!isSyllabusRelated) {
          verificationLayer = 'web';
          sourceDetails = searchResults.map(r => ({
            type: 'web',
            title: r.title,
            url: r.url,
            snippet: r.snippet
          }));
        }
      } catch (err) {
        console.warn("⚠️ [AgentOrchestrator] Web search pre-fetch failed:", err.message);
      }
    }

    const searchContext = searchResults.length > 0
      ? `Real-Time Web Search Context (Ranked by Trust):\n` + searchResults.map((r, i) => `[Web Source ${i+1}] Title: "${r.title}", URL: ${r.url}\nSnippet: "${r.snippet}"`).join('\n')
      : `No real-time search context retrieved.`;

    const textbookContext = textbookText !== ''
      ? `TEXTBOOK VERIFIED CONTENT (PRIORITIZE THIS):\n${textbookText}`
      : `No matching textbook/notes text found in database.`;

    let systemInstruction = `You are "StudyBuddy AI", a friendly, encouraging, and highly intelligent AI Teacher mascot for Andhra Pradesh students.
Your student profile:
${memoryContext}

Curriculum & Syllabus Context:
${syllabusContext}

${textbookContext}

${searchContext}

Your goals:`;

    if (isSyllabusRelated) {
      systemInstruction += `
1. **Class-Specific Explanation**: Explain the query strictly at a Class ${profile.classNum} child-friendly level. Use simple vocabulary, short sentences, and engaging analogies suitable for a Class ${profile.classNum} student.
2. **Clear & Organized Structure**: Organize the response with clear headings (e.g., "What is it?", "How it works", "Analogy", "Key Points"). Use bullet points, bold text for key terms, and emojis to make it highly readable and visually engaging.
3. **Syllabus Connection**: Focus on teaching this syllabus topic. Refer to the active syllabus context (Chapter: "${matchedChapterName}", Topic: "${matchedTopicName}").
4. **Textbook Priority**: If TEXTBOOK VERIFIED CONTENT is provided above, you MUST base your answer primarily on that textbook text. Do not invent details outside of it.
5. **Source Citations (CRITICAL)**: You must clearly cite where you filtered this information from at the very bottom of your response:
   - If you used **Textbook Content**, add a section:
     ### 📖 Textbook Reference
     - AP Board Class ${profile.classNum} Textbook
   - If you used **Web Search Context**, add a section:
     ### 🔍 Filtered Web Sources
     List the websites you used as clickable markdown links. Format them as:
     - [Website Title / Source Name](url)
     Do not show raw URL text; always use descriptive link text.
6. **Tone**: Encourage the student, be positive, and keep them excited about learning!`;
    } else {
      systemInstruction += `
1. **Class-Specific Explanation**: This is a general knowledge or OUT-OF-SYLLABUS question. Answer the student's question clearly, accurately, and in a friendly, student-appropriate manner suitable for a Class ${profile.classNum} student.
2. **Clear & Organized Structure**: Organize the response with clear headings. Use bullet points and bold text for key terms to make it highly readable and visually engaging.
3. **Web Search Synthesis**: Synthesize information from the multiple trusted websites provided in the Web Search Context.
4. **Source Citations (CRITICAL)**: You must clearly cite where you filtered this information from at the very bottom of your response under a:
   ### 🔍 Filtered Web Sources
   List the websites you used as clickable markdown links. Format them as:
   - [Website Title / Source Name](url)
   Do not show raw URL text; always use descriptive link text.
5. **Tone**: Encourage the student, be positive, and keep them excited about learning!`;
    }

    systemInstruction += `\n\nProvide your tutoring response in a friendly markdown format.`;

    if (activeSubject === 'Hindi') {
      systemInstruction += `\n\nCRITICAL HINDI LANGUAGE RULE: Since the active subject is Hindi, you MUST write your explanations, examples, and answers in Hindi (using Devanagari script).`;
    } else if (activeSubject === 'Telugu') {
      systemInstruction += `\n\nCRITICAL TELUGU LANGUAGE RULE: Since the active subject is Telugu, you MUST write your explanations, examples, and answers in Telugu (using Telugu script).`;
    } else {
      systemInstruction += getLanguagePrompt(profile.preferredLanguage, false);
    }

    let tutorText = '';
    let reliabilityScore = null;
    let reliabilitySummary = null;
    let learningCompanion = null;
    let practiceQuestions = null;
    let miniQuiz = null;

    const responseJsonSchemaPrompt = `
You MUST respond in a strict JSON format with exactly the following keys:
{
  "answer": "The complete synthesized child-friendly markdown explanation of the topic. Do not include duplicate headings if already generated.",
  "learningCompanion": {
    "learningLevel": "Beginner, Intermediate, or Advanced",
    "prerequisites": ["Prerequisite Concept 1", "Prerequisite Concept 2"],
    "relatedTopics": ["Related Topic 1", "Related Topic 2"],
    "keyPoints": ["Important Key Point 1", "Important Key Point 2"],
    "memoryTricks": ["Fun Mnemonic/Memory Trick 1", "Fun Mnemonic/Memory Trick 2"],
    "realLifeExamples": ["Real-world Application/Example 1", "Real-world Application/Example 2"],
    "commonMistakes": ["Typical Mistake 1", "Typical Mistake 2"],
    "examTips": ["Useful Exam Preparation Tip 1", "Useful Exam Preparation Tip 2"],
    "estimatedLearningTime": "e.g., 15 mins"
  },
  "practiceQuestions": [
    {
      "type": "mcq",
      "question": "A multiple choice practice question testing this concept.",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "hint": "Useful hint to solve it...",
      "solution": "Detailed step-by-step solution..."
    },
    {
      "type": "mcq",
      "question": "Another multiple choice practice question testing this concept.",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 1,
      "hint": "Useful hint...",
      "solution": "Detailed solution..."
    },
    {
      "type": "short",
      "question": "A short answer practice question requiring a few sentences.",
      "hint": "Hint...",
      "solution": "Solution..."
    },
    {
      "type": "long",
      "question": "A detailed long answer practice question requiring a complete explanation.",
      "hint": "Hint...",
      "solution": "Solution..."
    }
  ],
  "miniQuiz": [
    {
      "type": "mcq",
      "question": "Quiz question...",
      "options": ["Opt 1", "Opt 2", "Opt 3", "Opt 4"],
      "correctAnswerIndex": 0,
      "explanation": "Detailed explanation of why this option is correct."
    },
    {
      "type": "tf",
      "question": "True or False statement...",
      "options": ["True", "False"],
      "correctAnswerIndex": 0,
      "explanation": "Detailed explanation..."
    },
    {
      "type": "fib",
      "question": "Fill in the blank question: The capital of India is ______.",
      "correctAnswerText": "New Delhi",
      "explanation": "Detailed explanation..."
    },
    {
      "type": "mcq",
      "question": "Another quiz question...",
      "options": ["Opt A", "Opt B", "Opt C", "Opt D"],
      "correctAnswerIndex": 1,
      "explanation": "Detailed explanation..."
    },
    {
      "type": "tf",
      "question": "Another True or False statement...",
      "options": ["True", "False"],
      "correctAnswerIndex": 1,
      "explanation": "Detailed explanation..."
    }
  ]
}
Ensure the response is valid JSON and contains nothing else.`;

    if (!isSyllabusRelated) {
      const getDomainScore = (url) => {
        try {
          const domain = new URL(url).hostname.toLowerCase();
          if (domain.endsWith('.gov') || domain.endsWith('.gov.in') || domain.endsWith('.nic.in')) return 35;
          if (domain.endsWith('.edu') || domain.endsWith('.edu.in') || domain.endsWith('.ac.in') || domain.includes('ncert.nic.in')) return 30;
          if (domain.includes('wikipedia.org') || domain.includes('britannica.com') || domain.includes('khanacademy.org') || domain.endsWith('.org')) return 25;
          return 15;
        } catch (e) {
          return 15;
        }
      };

      let sourceQualityScore = sourceDetails.length > 0
        ? Math.round(sourceDetails.slice(0, 3).reduce((sum, s) => sum + getDomainScore(s.url), 0) / Math.min(sourceDetails.length, 3))
        : 0;

      const verificationInstruction = `You are the "StudyBuddy AI Web Verification Agent".
Your task is to:
1. Review the user question: "${userMessage}"
2. Review the following real-time search context retrieved from the web:
${searchContext}
3. Compare information between different sources to detect contradictions/conflicts.
4. Verify the consistency of the synthesized answer against the facts in the search results.
5. Calculate the following reliability sub-scores (0 to 65 total):
   - agreementScore (0 to 25): How much do the retrieved sources agree with each other on the facts? (Full agreement: 25, minor complementary/detail differences: 18-24, conflicting/contradictory facts: 5-15, no multiple sources to compare but the fact is universally accepted general knowledge: 20-25, otherwise 0)
   - consistencyScore (0 to 20): How well does the final generated explanation align with the facts in the search results or with standard general knowledge? (Highly consistent: 20, minor extrapolation: 10-19, inconsistent: 0)
   - completenessScore (0 to 10): Does the final explanation fully answer all aspects of the user's question? (Completely: 10, partially: 5-9, not at all: 0)
   - hallucinationScore (0 to 10): Are there any unverified facts, risks of hallucination, or safety concerns in the synthesized answer? (No hallucination/risk: 10, minor risk/unverified detail: 5-9, high risk/major hallucination: 0)

6. Synthesize the final tutoring answer and package it into the required JSON structure.
   - Make the answer child-friendly, friendly, engaging, and clear for a Class ${profile.classNum} student.
   - Use headings, bold terms, bullet points, and emojis.
   - You MUST include a citation section at the very bottom of the "answer" field under a "### 🔍 Filtered Web Sources" header containing clickable markdown links for all sources used. Format them as:
     - [Website Title / Source Name](url)
     Do not show raw URL text.

7. Return a strict JSON response with the following keys:
{
  "answer": "The complete synthesized markdown answer text with citations at the bottom.",
  "agreementScore": 25,
  "consistencyScore": 20,
  "completenessScore": 10,
  "hallucinationScore": 10,
  "conflictingFound": false,
  "consistencyPassed": true,
  "isGeneralKnowledge": true, // Set to true if the question is about widely accepted, universally known facts (e.g. who is Steve Jobs, capital of France) that do not require real-time search context to be highly accurate and safe.
  "evaluationExplanation": "A short 1-2 sentence explanation of how the reliability scores were determined.",
  "learningCompanion": { ... },
  "practiceQuestions": [ ... ],
  "miniQuiz": [ ... ]
}
${responseJsonSchemaPrompt}`;

      try {
        const responseText = await callLLM(verificationInstruction, userMessage, true, true);
        const parsedEval = JSON.parse(responseText.trim());
        
        if (parsedEval) {
          tutorText = parsedEval.answer;
          learningCompanion = parsedEval.learningCompanion || null;
          practiceQuestions = parsedEval.practiceQuestions || null;
          miniQuiz = parsedEval.miniQuiz || null;

          let agreementScore = parsedEval.agreementScore !== undefined ? parsedEval.agreementScore : 25;
          let consistencyScore = parsedEval.consistencyScore !== undefined ? parsedEval.consistencyScore : 20;
          const completenessScore = parsedEval.completenessScore !== undefined ? parsedEval.completenessScore : 10;
          const hallucinationScore = parsedEval.hallucinationScore !== undefined ? parsedEval.hallucinationScore : 10;

          if (sourceDetails.length === 0 && parsedEval.isGeneralKnowledge) {
            sourceQualityScore = 25; // Treat as verified general knowledge
            if (agreementScore === 0) agreementScore = 25;
            if (consistencyScore === 0) consistencyScore = 20;
          }

          reliabilityScore = sourceQualityScore + agreementScore + consistencyScore + completenessScore + hallucinationScore;
          reliabilityScore = Math.max(0, Math.min(100, reliabilityScore));

          reliabilitySummary = {
            sourceCount: searchResults.length,
            conflictingFound: parsedEval.conflictingFound || false,
            consistencyPassed: parsedEval.consistencyPassed || parsedEval.isGeneralKnowledge || false,
            explanation: parsedEval.evaluationExplanation || "Reliability evaluated based on retrieved sources."
          };
        }
      } catch (err) {
        console.warn("⚠️ [AgentOrchestrator] Web verification JSON mode failed, falling back:", err.message);
      }
    } else {
      const syllabusInstruction = `You are a personal learning tutor for Class ${profile.classNum} student.
Your subject is "${activeSubject}".
You must answer their question using the provided textbook content:
${textbookText}

${responseJsonSchemaPrompt}`;

      try {
        const responseText = await callLLM(syllabusInstruction, userMessage, true, true);
        const parsedSyllabus = JSON.parse(responseText.trim());
        
        if (parsedSyllabus) {
          tutorText = parsedSyllabus.answer;
          learningCompanion = parsedSyllabus.learningCompanion || null;
          practiceQuestions = parsedSyllabus.practiceQuestions || null;
          miniQuiz = parsedSyllabus.miniQuiz || null;
        }
      } catch (err) {
        console.warn("⚠️ [AgentOrchestrator] Syllabus JSON mode failed, falling back:", err.message);
      }
    }

    if (!tutorText) {
      try {
        tutorText = await callLLM(systemInstruction, userMessage);
      } catch (err) {
        console.error("⚠️ [AgentOrchestrator] callLLM failed in runSyllabus:", err.message);
        tutorText = runLocalModel(systemInstruction, userMessage);
      }
    }

    const isFallbackResponse = tutorText.includes("experiencing high traffic") || 
                             tutorText.includes("Google Gemini AI is currently experiencing high demand") ||
                             tutorText.includes("online AI servers are currently experiencing");

    if (isFallbackResponse && searchResults.length > 0) {
      const searchList = searchResults.map((r, i) => `
#### 🔗 [Source ${i+1}: ${r.title}](${r.url})
> ${r.snippet}
`).join('\n');
      tutorText = `Hoot hoot! 🦉 **The online AI is currently offline** (rate limit reached), but StudyBuddy AI has retrieved these verified learning resources for you!

---

### 📚 Filtered Web Resources (Class ${profile.classNum} Level)
Here is the information filtered from the web:

${searchList}

---

Don't worry, we can keep learning! If you want to practice, type **"test me"** to start an offline quiz! 🚀`;
    } else if (textbookText === '' && searchResults.length > 0 && !tutorText.includes("Web Sources") && !tutorText.includes("Web Search Results") && !tutorText.includes("Filtered Web Sources")) {
      const linkList = searchResults.map((r, i) => `\n- [${r.title}](${r.url})`).join('');
      tutorText += `\n\n### 🔍 Filtered Web Sources${linkList}`;
    }

    // 3. Calculate Genuine Confidence Score
    let confidenceScore = 50;
    const hasSyllabus = syllabusContext && !syllabusContext.includes("no custom chapters") && !syllabusContext.includes("Syllabus Context: Currently no");
    const syllabusPoints = hasSyllabus ? 20 : 0;
    const subjectPoints = (detectedSubject && detectedSubject !== 'General') ? 15 : 0;
    const webPoints = searchResults.length > 0 ? Math.min(15, searchResults.length * 3) : 0;
    const textbookPoints = textbookText !== '' ? 25 : 0;

    let verbosityPenalty = 0;
    if (tutorText.length < 200) verbosityPenalty = -15;
    else if (tutorText.length > 2000) verbosityPenalty = -5;

    let qHash = 0;
    for (let i = 0; i < userMessage.length; i++) {
      qHash = ((qHash << 5) - qHash + userMessage.charCodeAt(i)) | 0;
    }
    const hashVariance = ((Math.abs(qHash) % 17) - 8);

    confidenceScore = 50 + syllabusPoints + subjectPoints + webPoints + textbookPoints + verbosityPenalty + hashVariance;
    confidenceScore = Math.max(40, Math.min(95, confidenceScore));

    // 4. Save AI Answer in database
    let savedAnswer;
    try {
      savedAnswer = await db.createAIAnswer({
        question: userMessage,
        answer: tutorText,
        class: profile.classNum,
        subject: activeSubject,
        chapter: matchedChapterName,
        confidenceScore,
        verificationStatus: 'pending',
        isSyllabusRelated,
        sources: sourceDetails,
        reliabilityScore,
        reliabilitySummary,
        learningCompanion,
        practiceQuestions,
        miniQuiz
      });
    } catch (saveErr) {
      console.error("⚠️ [AgentOrchestrator] Failed saving AI answer to database:", saveErr.message);
    }

    return {
      agent: 'SYLLABUS',
      text: tutorText,
      verificationStatus: 'pending',
      confidenceScore,
      isVerified: false,
      isSyllabusRelated,
      verificationLayer,
      sources: sourceDetails,
      reliabilityScore,
      reliabilitySummary,
      learningCompanion,
      practiceQuestions,
      miniQuiz,
      answerId: savedAnswer ? savedAnswer._id : null
    };
  }
};

/**
 * 8. Agent Orchestrator (Central Router)
 */
function generateRuleBasedFallback(intent, profile, subject) {
  const activeSubject = subject || 'Mathematics';
  const lang = profile.preferredLanguage || 'English';
  
  const trans = fallbackTranslations[lang];
  const subTrans = (trans && trans.subjects[activeSubject]) || activeSubject;

  if (intent === 'QUIZ') {
    if (activeSubject === 'Hindi') {
      return {
        agent: 'QUIZ',
        text: "एआई वर्तमान में उच्च मांग का सामना कर रहा है। कोई चिंता नहीं! मैंने आपके लिए एक हिंदी व्याकरण अभ्यास प्रश्नोत्तरी तैयार की है।",
        quizData: {
          quizId: 'fallback_quiz_hindi_' + Date.now(),
          title: "हिंदी व्याकरण अभ्यास प्रश्नोत्तरी",
          subject: "Hindi",
          chapterName: "व्याकरण",
          questions: [
            {
              type: 'mcq',
              question: "हिंदी वर्णमाला में कितने स्वर होते हैं?",
              options: ["11", "13", "33", "52"],
              correctAnswerIndex: 0,
              explanation: "हिंदी वर्णमाला में मूल रूप से 11 स्वर होते हैं।"
            },
            {
              type: 'mcq',
              question: "सूर्योदय का संधि विच्छेद क्या होगा?",
              options: ["सूर्य + उदय", "सूर्य + दय", "सूर्यो + उदय", "सूर + उदय"],
              correctAnswerIndex: 0,
              explanation: "सूर्य + उदय मिलकर सूर्योदय बनता है (गुण संधि)।"
            },
            {
              type: 'fib',
              question: "जो सब कुछ जानता हो, उसे ________ कहते हैं।",
              correctAnswerText: "सर्वज्ञ",
              explanation: "सब कुछ जानने वाले को सर्वज्ञ कहा जाता है।"
            }
          ]
        }
      };
    }

    if (activeSubject === 'Telugu') {
      return {
        agent: 'QUIZ',
        text: "AI ప్రస్తుతం బిజీగా ఉంది. చింతించకండి! నేను మీ కోసం ఒక తెలుగు వ్యాకరణ ప్రాక్టీస్ క్విజ్ సిద్ధం చేసాను.",
        quizData: {
          quizId: 'fallback_quiz_telugu_' + Date.now(),
          title: "తెలుగు వ్యాకరణ ప్రాక్టీస్ క్విజ్",
          subject: "Telugu",
          chapterName: "వ్యాకరణం",
          questions: [
            {
              type: 'mcq',
              question: "తెలుగు భాషలో మొత్తం ఎన్ని అచ్చులు ఉన్నాయి?",
              options: ["12", "16", "36", "56"],
              correctAnswerIndex: 1,
              explanation: "తెలుగు వర్ణమాలలో 16 అచ్చులు ఉన్నాయి."
            },
            {
              type: 'mcq',
              question: "సూర్యోదయం ఏ సంధి?",
              options: ["సవర్ణదీర్ఘ సంధి", "గుణ సంధి", "యణాదేశ సంధి", "వృద్ధి సంధి"],
              correctAnswerIndex: 1,
              explanation: "సూర్య + ఉదయం = సూర్యోదయం (గుణ సంధి)."
            },
            {
              type: 'fib',
              question: "క్రింది వాటిలో 'రాముడు' అనేది ఒక ___________ పదం (నామవాచకం/క్రియ).",
              correctAnswerText: "నామవాచకం",
              explanation: "రాముడు అనేది ఒక వ్యక్తి పేరు, కాబట్టి ఇది నామవాచకం."
            }
          ]
        }
      };
    }

    if (trans) {
      return {
        agent: 'QUIZ',
        text: trans.quiz.text,
        quizData: {
          quizId: 'fallback_quiz_' + Date.now(),
          title: `${subTrans} ${trans.quiz.title}`,
          subject: subTrans,
          chapterName: trans.quiz.chapterName,
          questions: [
            {
              type: 'mcq',
              question: `${subTrans} ${trans.quiz.q1}`,
              options: trans.quiz.q1_opts,
              correctAnswerIndex: 0,
              explanation: trans.quiz.q1_exp
            },
            {
              type: 'tf',
              question: trans.quiz.q2,
              options: trans.quiz.q2_opts,
              correctAnswerIndex: 0,
              explanation: trans.quiz.q2_exp
            },
            {
              type: 'fib',
              question: trans.quiz.q3,
              correctAnswerText: trans.quiz.q3_ans,
              explanation: trans.quiz.q3_exp
            }
          ]
        }
      };
    }
    return {
      agent: 'QUIZ',
      text: "The AI is currently experiencing high demand. No worries! I have generated a quick local practice quiz for you. Let's test your skills!",
      quizData: {
        quizId: 'fallback_quiz_' + Date.now(),
        title: `${activeSubject} Practice Quiz`,
        subject: activeSubject,
        chapterName: 'General Concepts',
        questions: [
          {
            type: 'mcq',
            question: `What is the best way to master ${activeSubject}?`,
            options: ['Studying with Study Buddy daily', 'Cramming the night before', 'Skipping practice', 'Doing homework late'],
            correctAnswerIndex: 0,
            explanation: 'Consistent daily practice is the key to deep comprehension and high scores!'
          },
          {
            type: 'tf',
            question: 'Syllabus chapter notes are highly useful for revision.',
            options: ['True', 'False'],
            correctAnswerIndex: 0,
            explanation: 'Yes! Reviewing summary bullet notes helps consolidate memory.'
          },
          {
            type: 'fib',
            question: 'The name of your personal AI Study agent is Study _________.',
            correctAnswerText: 'Buddy',
            explanation: 'Your helpful tutor companion is named Study Buddy.'
          }
        ]
      }
    };
  }

  if (intent === 'PLANNER') {
    if (trans) {
      return {
        agent: 'PLANNER',
        text: trans.planner.text,
        planData: {
          title: trans.planner.title,
          tasks: [
            { subject: subTrans, topic: trans.planner.topic1, duration: lang === 'Hindi' ? '20 मिनट' : '20 నిమిషాలు', priority: 'high' },
            { subject: lang === 'Hindi' ? 'अंग्रेजी' : 'ఇంగ్లీష్', topic: trans.planner.topic2, duration: lang === 'Hindi' ? '15 मिनट' : '15 నిమిషాలు', priority: 'medium' }
          ]
        }
      };
    }
    return {
      agent: 'PLANNER',
      text: "The planner service is busy right now, so I have loaded a recommended daily focus checklist for you!",
      planData: {
        title: 'Daily Focus Schedule',
        tasks: [
          { subject: activeSubject, topic: 'Core Concept Review', duration: '20 mins', priority: 'high' },
          { subject: 'English', topic: 'Vocabulary Practice', duration: '15 mins', priority: 'medium' }
        ]
      }
    };
  }

  if (intent === 'PROGRESS') {
    if (trans) {
      return {
        agent: 'PROGRESS',
        text: trans.progress.text,
        progressData: {
          quizAverage: 75,
          totalStudyTimeMins: profile.studyTime || 40,
          weakAreas: [subTrans],
          strongAreas: trans.progress.strongAreas,
          achievementUnlocked: null
        }
      };
    }
    return {
      agent: 'PROGRESS',
      text: "Here is your progress status computed from your active profile statistics!",
      progressData: {
        quizAverage: 75,
        totalStudyTimeMins: profile.studyTime || 40,
        weakAreas: [activeSubject],
        strongAreas: ['General Science'],
        achievementUnlocked: null
      }
    };
  }

  if (intent === 'EXAM') {
    if (trans) {
      return {
        agent: 'EXAM',
        text: trans.exam.text,
        examData: {
          subject: subTrans,
          quickNotes: trans.exam.notes,
          importantQuestions: trans.exam.questions,
          revisionPlan: trans.exam.plan
        }
      };
    }
    return {
      agent: 'EXAM',
      text: `Here is a custom exam preparation guide for your upcoming tests!`,
      examData: {
        subject: activeSubject,
        quickNotes: [
          'Review all chapter syllabus notes.',
          'Focus on solving weaker quiz topics first.'
        ],
        importantQuestions: [
          `Summarize the primary theories inside this chapter.`,
          `Draft a quick revision note for the teacher.`
        ],
        revisionPlan: 'Solve at least two practice quizzes today, and ask Study Buddy for corrections!'
      }
    };
  }

  if (trans) {
    return {
      agent: 'SYLLABUS',
      text: trans.syllabus.text
    };
  }
  return {
    agent: 'SYLLABUS',
    text: "Hoot hoot! 🦉 The Google Gemini AI is currently experiencing high demand. Spikes are temporary! Meanwhile, you can still check your Study Planner calendar, review your Progress report, or configure your daily notifications. Let's keep learning!"
  };
}

async function contextualizeQuery(userMessage, history) {
  if (!Array.isArray(history) || history.length === 0) {
    return userMessage;
  }

  // If the last message in history was an AI fallback/offline message, it has no conversational context.
  // Bypass contextualization so we don't accidentally reformulate the query into the fallback text.
  const lastMsg = history[history.length - 1];
  const lastText = (lastMsg?.text || lastMsg?.explanation || '').toLowerCase();
  if (lastMsg?.sender === 'buddy' && (
      lastText.includes('offline') || 
      lastText.includes('experiencing high') || 
      lastText.includes('temporary') || 
      lastText.includes('demand') || 
      lastText.includes('hoot hoot')
  )) {
    return userMessage;
  }

  const cleanMsg = userMessage.toLowerCase().trim();
  
  // A query is standalone if it doesn't contain pronouns or follow-up adverbs that refer to previous messages.
  // We can skip LLM contextualization if:
  // 1. The message is a quiz or practice request.
  // 2. Or if it doesn't contain any pronouns or follow-up indicators (indicating it's a standalone question).
  const hasFollowUpIndicator = /\b(it|they|them|this|that|these|those|again|more|why|he|she|him|her|prev|previous|above|before|latter|former)\b/i.test(cleanMsg);
  
  if (!hasFollowUpIndicator || cleanMsg.includes('quiz') || cleanMsg.includes('practice') || cleanMsg.includes('test me') || cleanMsg.includes('study plan')) {
    return userMessage;
  }

  // Only take the last 6 messages to keep the context window tight and focused
  const historyStr = history
    .slice(-6)
    .map(m => `${m.sender === 'student' ? 'Student' : 'AI'}: ${m.text || m.explanation || ''}`)
    .join('\n');

  const systemInstruction = `You are an educational assistant that reformulates student questions to be self-contained.
Given the conversation history and the latest student message:
1. If the latest message is a follow-up, pronoun-heavy, or ambiguous (e.g., "why?", "explain more", "what are the differences?", "again"), rewrite it to be a standalone, self-contained question in English that includes all necessary context from the history.
2. CRITICAL: If the latest message is already a standalone question, a command (e.g., "Create a practice quiz..."), or a new topic, you MUST return the latest student message EXACTLY as-is.
3. CRITICAL: NEVER repeat, copy, or summarize any of the AI's previous responses. Do not output "Hoot hoot!" or any AI greeting.
4. Do NOT answer the question. Only return the reformulated question.`;

  const prompt = `Conversation History:
${historyStr}

Latest Student Message:
"${userMessage}"

Reformulated Standalone Message:`;

  try {
    // Pass throwOnError = true so we don't receive the local model's fallback response string
    const reformulated = await callLLM(systemInstruction, prompt, false, true);
    const clean = reformulated.trim().replace(/^"|"$/g, ''); // remove wrapping quotes if any
    
    // Safety check: if the local model or a misbehaving model returned the fallback string, discard it
    if (clean.toLowerCase().includes("hoot hoot") || 
        clean.toLowerCase().includes("experiencing high") || 
        clean.toLowerCase().includes("offline")) {
      return userMessage;
    }
    
    console.log(`[Contextualizer] Original: "${userMessage}" -> Reformulated: "${clean}"`);
    return clean || userMessage;
  } catch (err) {
    console.warn("⚠️ [Contextualizer] Query reformulation failed, using original:", err.message);
    return userMessage;
  }
}

async function runOrchestrator(user, messageData) {
  const { message: originalMessage, language, subject, chapter, topic, history, overrideChoice } = messageData;
  if (!originalMessage) {
    throw new Error("Missing 'message' inside the orchestrator payload.");
  }

  const message = await contextualizeQuery(originalMessage, history);

  // 1. Load Student Memory Profile
  let { profile, memoryContext } = await loadMemoryContext(user._id, user.name, user);

  // Override language preference for this specific run if explicitly requested in client UI
  if (language) {
    const dbLang = language === 'hi' ? 'Hindi' : language === 'te' ? 'Telugu' : 'English';
    if (profile.preferredLanguage !== dbLang) {
      profile.preferredLanguage = dbLang;
      // Re-generate memoryContext with overridden language to match
      const exams = await db.getExamsByUser(user._id);
      const homework = await db.getHomeworkByUser(user._id);
      const quizResults = await db.getQuizResultsByUser(user._id);

      const formattedExams = exams.map(e => `${e.subject} Exam on ${e.date} (${e.title})`).join('; ');
      const formattedHomework = homework.filter(h => !h.completed).map(h => `${h.subject}: ${h.title} (Due: ${h.dueDate})`).join('; ');
      const formattedQuizScores = quizResults.slice(0, 5).map(q => `${q.subject} - ${q.score}% (${q.chapterName || 'General'})`).join(', ');

      const studentMemory = await db.getStudentMemory(user._id);

      memoryContext = `Student Profile Memory:
- Name: ${profile.name}
- Grade/Class: Class ${profile.classNum}
- Board: ${profile.board}
- School Type: ${profile.schoolType} School
- Preferred Language: ${profile.preferredLanguage}
- Learning Goals: ${profile.learningGoals.join(', ')}
- Weak Subjects: ${profile.weakSubjects.join(', ')}
- Strong Subjects: ${profile.strongSubjects.join(', ')}
- Stats: ${profile.xp} XP, ${profile.coins} Coins, Streak: ${profile.streak} days, Total Study Time: ${profile.studyTime} mins
- Upcoming Exams: ${formattedExams || 'None scheduled'}
- Uncompleted Homework: ${formattedHomework || 'None'}
- Recent Quiz History: ${formattedQuizScores || 'No quizzes taken yet'}
- Student Learning Memory:
  * Weak Chapters: ${studentMemory?.weakChapters?.join(', ') || 'None yet'}
  * Strong Chapters: ${studentMemory?.strongChapters?.join(', ') || 'None yet'}
  * Completed Chapters: ${studentMemory?.completedChapters?.join(', ') || 'None yet'}
  * Previous Mistakes: ${JSON.stringify(studentMemory?.previousMistakes || [])}
  * Learning Speed: ${studentMemory?.learningSpeed || 'Average'}`;
    }
  }

  // STEP 1 & 2: Subject validation logic
  let isMismatch = false;
  let predictedSubject = '';
  let highestConfidence = 0;
  let subjectConfidences = {};

  if (overrideChoice !== 'general' && overrideChoice !== 'stay' && subject && subject !== 'General') {
    const analysisInstruction = `You are the "StudyBuddy AI Question Analyzer Agent".
Your task is to analyze the student's question and extract metadata.
You must respond in a strict JSON format with exactly the following keys:
{
  "subject": "The predicted subject (choose from: Mathematics, Science, Social Studies, English, Telugu, Hindi, Computer Science)",
  "chapter": "Detected chapter name or 'General'",
  "topic": "Detected topic name or 'General'",
  "keywords": ["keyword1", "keyword2"],
  "difficultyLevel": "Beginner, Intermediate, or Advanced",
  "questionType": "Conceptual, Problem Solving, Factual, etc.",
  "subjectConfidences": {
    "Mathematics": 2,
    "Science": 18,
    "Social Studies": 8,
    "English": 1,
    "Telugu": 0,
    "Hindi": 0,
    "Computer Science": 97
  }
}
Ensure the response is valid JSON and contains nothing else.`;

    try {
      const analysisResponse = await callLLM(analysisInstruction, message, true, true);
      const parsedAnalysis = JSON.parse(analysisResponse.trim());
      
      predictedSubject = parsedAnalysis.subject;
      subjectConfidences = parsedAnalysis.subjectConfidences || {};
      highestConfidence = subjectConfidences[predictedSubject] || 0;

      // Find the highest confidence subject just in case it doesn't match the string field
      let maxConf = -1;
      let maxSub = '';
      for (const [sub, conf] of Object.entries(subjectConfidences)) {
        if (conf > maxConf) {
          maxConf = conf;
          maxSub = sub;
        }
      }
      if (maxSub && maxConf > highestConfidence) {
        predictedSubject = maxSub;
        highestConfidence = maxConf;
      }

      // Check if predicted subject differs from selected subject
      // Only trigger mismatch if confidence is high enough (e.g. >= 60%) to avoid false positives
      if (predictedSubject && predictedSubject.toLowerCase() !== subject.toLowerCase() && highestConfidence >= 60) {
        isMismatch = true;
      }
    } catch (err) {
      console.warn("⚠️ [AgentOrchestrator] Question analysis LLM call failed, proceeding normally:", err.message);
    }
  }

  if (isMismatch) {
    console.log(`⚠️ [AgentOrchestrator] Subject Mismatch detected: Selected Subject: "${subject}" vs Predicted: "${predictedSubject}" (${highestConfidence}%)`);
    return {
      status: "mismatch",
      subjectMismatch: true,
      selectedSubject: subject,
      suggestedSubject: predictedSubject,
      confidence: highestConfidence,
      allConfidences: subjectConfidences,
      text: "This question appears to belong to another subject."
    };
  }

  // 2. Load Syllabus Context
  const { detectedSubject, syllabusContext } = await loadSyllabusContext(profile.classNum, message);

  // 3. Classify intent
  const intent = await classifyIntent(message);
  console.log(`[AgentOrchestrator] Intent classified: ${intent} for message: "${message}"`);

  // 4. Run correct sub-agent
  try {
    switch (intent) {
      case 'PLANNER':
        return await agents.runPlanner(user, profile, memoryContext, syllabusContext, message);
      case 'QUIZ':
        return await agents.runQuiz(user, profile, memoryContext, syllabusContext, message, detectedSubject);
      case 'PROGRESS':
        return await agents.runProgress(user, profile, memoryContext, syllabusContext, message);
      case 'REMINDER':
        return await agents.runReminder(user, profile, memoryContext, syllabusContext, message);
      case 'EXAM':
        return await agents.runExam(user, profile, memoryContext, syllabusContext, message);
      case 'SYLLABUS':
      default:
        return await agents.runSyllabus(user, profile, memoryContext, syllabusContext, message, detectedSubject || subject, chapter, topic, overrideChoice);
    }
  } catch (err) {
    console.error(`[AgentOrchestrator] Failed executing ${intent} agent. Attempting syllabus tutor fallback. Error:`, err.message);
    try {
      return await agents.runSyllabus(user, profile, memoryContext, syllabusContext, message, detectedSubject || subject, chapter, topic, overrideChoice);
    } catch (tutorErr) {
      console.error(`[AgentOrchestrator] Safe tutor fallback failed. Generating rule-based offline payload. Error:`, tutorErr.message);
      return generateRuleBasedFallback(intent, profile, detectedSubject || subject);
    }
  }
}

module.exports = {
  run: runOrchestrator
};
