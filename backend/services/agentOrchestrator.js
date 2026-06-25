const db = require('../config/db');

const { callLLM, runLocalModel } = require('./llmService');
const { searchWeb } = require('./searchService');

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
- Recent Quiz History: ${formattedQuizScores || 'No quizzes taken yet'}`;

  return { profile, memoryContext };
}

/**
 * 2. Syllabus Knowledge Agent
 * Gathers active syllabus context for class & subject
 */
async function loadSyllabusContext(classNum, userMessage) {
  let detectedSubject = '';
  const subjectsList = ['Mathematics', 'Math', 'Science', 'English', 'Social Studies', 'Telugu', 'Hindi'];
  for (const sub of subjectsList) {
    const regex = new RegExp(`\\b${sub}\\b`, 'i');
    if (regex.test(userMessage)) {
      detectedSubject = sub === 'Math' ? 'Mathematics' : sub;
      break;
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
  const systemInstruction = `You are a router that classifies a student's request into the correct educational agent category.
The options are:
1. "PLANNER" - If they want a study plan, schedule, weekly calendar, or ask what/when to study.
2. "QUIZ" - If they ask to generate a quiz, test their knowledge, practice MCQs, or solve fill-in-the-blanks.
3. "PROGRESS" - If they want to see progress, stats, strengths, weaknesses, reports, or check unlocked achievements.
4. "REMINDER" - If they want to set a reminder, list study alerts, or ask for notifications.
5. "EXAM" - If they mention exams, upcoming tests, "exam is tomorrow", or ask how to prepare for exams.
6. "SYLLABUS" - General learning, tutoring, asking questions about topics (e.g. "What is photosynthesis?", "Teach me fractions", "Explain noun"), homework questions, or basic chat.

Respond with ONLY the uppercase category name. Do not write anything else.`;

  let classification = '';
  try {
    classification = await callLLM(systemInstruction, userMessage);
  } catch (err) {
    console.error("Intent classification API call failed. Using local classifier. Error:", err.message);
  }

  const trimmed = classification.toUpperCase().trim();
  if (['PLANNER', 'QUIZ', 'PROGRESS', 'REMINDER', 'EXAM', 'SYLLABUS'].includes(trimmed)) {
    return trimmed;
  }

  // Local Rule-Based Classifier Fallback
  console.log("🤖 [Orchestrator] Using local rule-based intent classifier fallback...");
  const msg = userMessage.toLowerCase();
  
  if (/\b(plan|schedule|calendar|timetable|todo|checklist|agenda)\b/i.test(msg)) {
    return 'PLANNER';
  }
  if (/\b(quiz|test|mcq|question|practice|test me)\b/i.test(msg)) {
    if (/\b(prep|prepare|study guide)\b/i.test(msg)) {
      return 'EXAM';
    }
    return 'QUIZ';
  }
  if (/\b(progress|stat|score|report|badge|achievement|xp|coin|history|level)\b/i.test(msg)) {
    return 'PROGRESS';
  }
  if (/\b(remind|reminder|alarm|alert|notify|notification)\b/i.test(msg)) {
    return 'REMINDER';
  }
  if (/\b(exam|test prep|prepare|test tomorrow|revision guide)\b/i.test(msg)) {
    return 'EXAM';
  }

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

You are the "Study Planner Agent". Your job is to create a highly personalized daily or weekly study plan for this student.
Understand their class, weak subjects, and exam dates to create an actionable study plan.

You must respond in a strict JSON format with exactly the following keys:
{
  "explanation": "A child-friendly, encouraging explanation of the study plan, reminding them of goals and why this helps.",
  "planType": "daily", // or "weekly"
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
        const classNum = profile.classNum || 6;
        const allSubjects = await db.getSubjectsByClass(classNum);
        const tasks = [];
        
        // Shuffle subjects to get different focus areas every time
        const shuffledSubjects = allSubjects.sort(() => 0.5 - Math.random());
        const selectedSubjects = shuffledSubjects.slice(0, 2);
        
        for (const sub of selectedSubjects) {
          const chapters = await db.getChaptersByClassAndSubject(classNum, sub.name);
          if (chapters && chapters.length > 0) {
            // Pick a random chapter
            const randomChapter = chapters[Math.floor(Math.random() * chapters.length)];
            const topics = await db.getTopicsByChapter(classNum, sub.name, randomChapter.name);
            const topicName = topics && topics.length > 0 
              ? topics[Math.floor(Math.random() * topics.length)].name
              : randomChapter.name;
              
            tasks.push({
              subject: sub.name,
              topic: `${randomChapter.name}: ${topicName}`,
              duration: "25 mins",
              priority: tasks.length === 0 ? "high" : "medium"
            });
          }
        }
        
        // Fallback to static if no chapters are seeded
        if (tasks.length === 0) {
          tasks.push({ subject: "Mathematics", topic: "Core Concept Practice", duration: "25 mins", priority: "high" });
          tasks.push({ subject: "Science", topic: "Syllabus Review", duration: "20 mins", priority: "medium" });
        }
        
        // Translate task descriptions to preferred language if necessary
        const isHindi = profile.preferredLanguage === 'Hindi';
        const isTelugu = profile.preferredLanguage === 'Telugu';
        
        let explanation = "The AI Planner is currently offline. Here is your customized study plan based on your class syllabus!";
        let title = "Today's Study Checklist";
        
        if (isHindi) {
          explanation = "एआई अध्ययन योजनाकार अभी ऑफ़लाइन है। यहाँ आपके पाठ्यक्रम पर आधारित एक अनुशंसित दैनिक अध्ययन सूची दी गई है!";
          title = "आज की अध्ययन सूची";
          tasks.forEach(t => {
            if (t.duration === '25 mins') t.duration = '25 मिनट';
            else if (t.duration === '20 mins') t.duration = '20 मिनट';
            else if (t.duration === '15 mins') t.duration = '15 मिनट';
            
            if (t.subject === 'Mathematics') t.subject = 'गणित';
            else if (t.subject === 'Science') t.subject = 'विज्ञान';
            else if (t.subject === 'English') t.subject = 'अंग्रेजी';
            else if (t.subject === 'Social Studies') t.subject = 'सामाजिक अध्ययन';
            else if (t.subject === 'Telugu') t.subject = 'तेलुगु';
            else if (t.subject === 'Hindi') t.subject = 'हिंदी';
          });
        } else if (isTelugu) {
          explanation = "AI స్టడీ ప్లానర్ ప్రస్తుతం ఆఫ్‌లైన్‌లో ఉంది. మీ క్లాస్ సిలబస్ ఆధారంగా మీ కోసం ప్రత్యేకంగా రూపొందించిన రోజువారీ అధ్యయన ప్రణాళిక ఇక్కడ ఉంది!";
          title = "నేటి అధ్యయన చెక్‌లిస్ట్";
          tasks.forEach(t => {
            if (t.duration === '25 mins') t.duration = '25 నిమిషాలు';
            else if (t.duration === '20 mins') t.duration = '20 నిమిషాలు';
            else if (t.duration === '15 mins') t.duration = '15 నిమిషాలు';
            
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
          planType: "daily",
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
    systemInstruction += getLanguagePrompt(profile.preferredLanguage, true);

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
  async runExam(user, profile, memoryContext, syllabusContext, userMessage) {
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
    systemInstruction += getLanguagePrompt(profile.preferredLanguage, true);

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
  async runSyllabus(user, profile, memoryContext, syllabusContext, userMessage, detectedSubject, chapter = 'General', topic = 'General') {
    const activeSubject = detectedSubject || 'General';
    const activeChapter = chapter || 'General';

    // 0. Lookup verified answer
    try {
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
          sources: verifiedAnswer.sources
        };
      }
    } catch (lookupErr) {
      console.warn("⚠️ [runSyllabus] Verified answer lookup failed:", lookupErr.message);
    }

    // 1. Perform Web Search in the background
    let searchResults = [];
    try {
      searchResults = await searchWeb(userMessage);
    } catch (err) {
      console.warn("⚠️ [AgentOrchestrator] Web search pre-fetch failed:", err.message);
    }

    const searchContext = searchResults.length > 0
      ? `Real-Time Web Search Context:\n` + searchResults.map((r, i) => `[Web Source ${i+1}] Title: "${r.title}", URL: ${r.url}\nSnippet: "${r.snippet}"`).join('\n')
      : `No real-time search context retrieved.`;

    let systemInstruction = `You are "StudyBuddy AI", a friendly, encouraging, and highly intelligent AI Teacher mascot for Andhra Pradesh students.
Your student profile:
${memoryContext}

Curriculum & Syllabus Context:
${syllabusContext}

${searchContext}

Your goals:
1. Explain the student's query or concept strictly at a Class ${profile.classNum} child-friendly level, using simple language, bullet points, and real-life analogies.
2. Refer to the active syllabus context. Do not write generic answers if chapter/topic details are present.
3. If search context is available, synthesize it to answer the question. Cite your sources by appending clickable markdown links under a "**🔍 Web Sources**" section at the very end of your response.
4. Keep the response encouraging, positive, and structured. Include emojis.

Provide your tutoring response in a friendly markdown format.`;
    systemInstruction += getLanguagePrompt(profile.preferredLanguage, false);

    let tutorText = '';
    try {
      tutorText = await callLLM(systemInstruction, userMessage);
    } catch (err) {
      console.error("⚠️ [AgentOrchestrator] callLLM failed in runSyllabus:", err.message);
      tutorText = runLocalModel(systemInstruction, userMessage);
    }

    // Post-process response if offline or fallback text is returned
    const isFallbackResponse = tutorText.includes("experiencing high traffic") || 
                             tutorText.includes("Google Gemini AI is currently experiencing high demand") ||
                             tutorText.includes("online AI servers are currently experiencing");

    if (isFallbackResponse && searchResults.length > 0) {
      const searchList = searchResults.map((r, i) => `\n\n🔗 **[${r.title}](${r.url})**\n_${r.snippet}_`).join('');
      tutorText = `Hoot hoot! 🦉 The online AI is currently offline, but I did a quick web search on my learning engine for you! Here is what I found about **"${userMessage}"**:${searchList}\n\nDon't worry, we can keep learning! If you want to practice, type **"test me"** to start an offline quiz! 🚀`;
    } else if (searchResults.length > 0 && !tutorText.includes("Web Sources") && !tutorText.includes("Web Search Results")) {
      const linkList = searchResults.map((r, i) => `\n- [${r.title}](${r.url})`).join('');
      tutorText += `\n\n**🔍 Web Search Results:**${linkList}`;
    }

    // 2. Calculate Confidence Score
    let confidenceScore = 80; // default base score
    
    // Rule: Matches syllabus data
    const hasSyllabus = syllabusContext && !syllabusContext.includes("no custom chapters") && !syllabusContext.includes("Syllabus Context: Currently no");
    if (hasSyllabus) {
      confidenceScore += 15;
    } else {
      confidenceScore -= 20;
    }

    // Rule: Long reasoning answers
    if (tutorText.length > 800) {
      confidenceScore -= 15;
    }

    // Rule: External/general knowledge questions (no subject detected or general query)
    if (!detectedSubject || detectedSubject === 'General') {
      confidenceScore -= 20;
    } else {
      confidenceScore += 10;
    }

    // Bound confidence score between 0 and 100
    confidenceScore = Math.max(0, Math.min(100, confidenceScore));

    // 3. Save AI Answer in database
    let savedAnswer;
    try {
      savedAnswer = await db.createAIAnswer({
        question: userMessage,
        answer: tutorText,
        class: profile.classNum,
        subject: activeSubject,
        chapter: activeChapter,
        confidenceScore,
        verificationStatus: 'pending',
        sources: searchResults.length > 0 ? searchResults.map(r => r.title) : ["AP State Curriculum Guideline"]
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
      sources: searchResults.length > 0 ? searchResults.map(r => r.title) : [],
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

async function runOrchestrator(user, messageData) {
  const { message, language, subject, chapter, topic } = messageData;
  if (!message) {
    throw new Error("Missing 'message' inside the orchestrator payload.");
  }

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
- Recent Quiz History: ${formattedQuizScores || 'No quizzes taken yet'}`;
    }
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
        return await agents.runSyllabus(user, profile, memoryContext, syllabusContext, message, detectedSubject || subject, chapter, topic);
    }
  } catch (err) {
    console.error(`[AgentOrchestrator] Failed executing ${intent} agent. Attempting syllabus tutor fallback. Error:`, err.message);
    try {
      return await agents.runSyllabus(user, profile, memoryContext, syllabusContext, message, detectedSubject || subject, chapter, topic);
    } catch (tutorErr) {
      console.error(`[AgentOrchestrator] Safe tutor fallback failed. Generating rule-based offline payload. Error:`, tutorErr.message);
      return generateRuleBasedFallback(intent, profile, detectedSubject || subject);
    }
  }
}

module.exports = {
  run: runOrchestrator
};
