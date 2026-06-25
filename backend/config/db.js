const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

let isMockMode = false;
const MOCK_DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

// --- MongoDB Schemas (For Mongoose Mode) ---
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'parent'], default: 'student' },
  studentProfile: {
    class: { type: Number, default: 6 },
    schoolName: { type: String, default: '' },
    schoolType: { type: String, enum: ['Public', 'Private'], default: 'Public' },
    board: { type: String, enum: ['SSC', 'CBSE'], default: 'SSC' },
    preferredLanguage: { type: String, enum: ['English', 'Telugu', 'Hindi'], default: 'English' },
    parentContact: { type: String, default: '' },
    parentPin: { type: String, default: '1234' },
    streak: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: '' },
    xp: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    achievementLevel: { type: Number, default: 1 },
    badges: { type: [String], default: [] }
  },
  parentProfile: {
    childEmails: { type: [String], default: [] },
    customQuests: [{
      id: String,
      title: String,
      subject: String,
      xp: Number,
      completed: Boolean
    }],
    rewards: [{
      id: String,
      title: String,
      costXp: Number,
      unlocked: Boolean
    }]
  }
}, { timestamps: true });

const QuizSchema = new mongoose.Schema({
  class: { type: Number, required: true },
  subject: { type: String, required: true },
  title: { type: String, required: true },
  questions: [{
    type: { type: String, enum: ['mcq', 'tf', 'fib'], default: 'mcq' },
    question: { type: String, required: true },
    options: { type: [String], default: [] },
    correctAnswerIndex: { type: Number }, // for MCQ and T/F
    correctAnswerText: { type: String }, // for FIB
    explanation: { type: String, required: true },
    isDynamic: { type: Boolean, default: false },
    dynamicType: { type: String }
  }]
});

const ClassSchema = new mongoose.Schema({
  classNum: { type: Number, required: true, unique: true }
});

const SubjectSchema = new mongoose.Schema({
  classNum: { type: Number, required: true },
  name: { type: String, required: true }
});

const ChapterSchema = new mongoose.Schema({
  classNum: { type: Number, required: true },
  subjectName: { type: String, required: true },
  name: { type: String, required: true }
});

const TopicSchema = new mongoose.Schema({
  classNum: { type: Number, required: true },
  subjectName: { type: String, required: true },
  chapterName: { type: String, required: true },
  name: { type: String, required: true }
});

const ProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  subject: { type: String, required: true },
  quizId: { type: String, required: true },
  score: { type: Number, required: true }, // percentage
  xpEarned: { type: Number, default: 0 },
  date: { type: Date, default: Date.now }
});

const HomeworkSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  subject: { type: String, required: true },
  dueDate: { type: String, required: true },
  completed: { type: Boolean, default: false }
}, { timestamps: true });

const ReminderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  time: { type: String, required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const PendingSyllabusSchema = new mongoose.Schema({
  classNum: { type: Number },
  subjectName: { type: String },
  fileName: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  extractedData: [{
    chapterName: { type: String },
    topics: { type: [String] }
  }],
  logs: { type: [String], default: [] },
  errorReport: { type: String, default: '' }
}, { timestamps: true });

const StudentProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  classNum: { type: Number, default: 6 },
  schoolName: { type: String, default: '' },
  schoolType: { type: String, enum: ['Public', 'Private'], default: 'Public' },
  board: { type: String, enum: ['SSC', 'CBSE'], default: 'SSC' },
  preferredLanguage: { type: String, enum: ['English', 'Telugu', 'Hindi'], default: 'English' },
  learningGoals: { type: [String], default: [] },
  weakSubjects: { type: [String], default: [] },
  strongSubjects: { type: [String], default: [] },
  streak: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  coins: { type: Number, default: 0 },
  studyTime: { type: Number, default: 0 }
}, { timestamps: true });

const ExamSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  subject: { type: String, required: true },
  title: { type: String, required: true },
  date: { type: String, required: true },
  chapters: { type: [String], default: [] }
}, { timestamps: true });

const StudyPlanSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  planType: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
  planData: { type: mongoose.Schema.Types.Mixed, required: true },
  date: { type: Date, default: Date.now }
});

const QuizResultSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  quizId: { type: String, required: true },
  subject: { type: String, required: true },
  chapterName: { type: String, default: '' },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, default: 5 },
  correctAnswers: { type: Number, default: 0 },
  answers: { type: mongoose.Schema.Types.Mixed, default: [] },
  date: { type: Date, default: Date.now }
});

const AchievementSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, required: true },
  unlockedAt: { type: Date, default: Date.now }
});

const TeacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  qualification: { type: String, required: true },
  specialization: { type: String, required: true },
  institution: { type: String, required: true },
  teacherIdProof: { type: String },
  certificates: { type: [String], default: [] },
  role: { type: String, enum: ['teacher', 'admin'], default: 'teacher' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending' },
  approvedBy: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const AIAnswerSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  class: { type: Number, required: true },
  subject: { type: String, required: true },
  chapter: { type: String, default: 'General' },
  confidenceScore: { type: Number, default: 0 },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'edited'], default: 'pending' },
  verifiedBy: { type: mongoose.Schema.Types.Mixed },
  teacherComments: { type: String, default: '' },
  sources: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  verifiedAt: { type: Date }
}, { timestamps: true });

// Declare Mongoose Models (only compiles if Mongo connects)
let UserModel, QuizModel, ProgressModel, HomeworkModel, ReminderModel, ClassModel, SubjectModel, ChapterModel, TopicModel, PendingSyllabusModel, StudentProfileModel, ExamModel, StudyPlanModel, QuizResultModel, AchievementModel, TeacherModel, AIAnswerModel;

// --- Mock File Database Helpers ---
function readMockDB() {
  if (!fs.existsSync(path.dirname(MOCK_DB_PATH))) {
    fs.mkdirSync(path.dirname(MOCK_DB_PATH), { recursive: true });
  }
  
  const defaultDB = {
    users: [],
    quizzes: [],
    progress: [],
    homeworks: [],
    reminders: [],
    classes: [],
    subjects: [],
    chapters: [],
    topics: [],
    pendingSyllabuses: [],
    studentProfiles: [],
    exams: [],
    studyPlans: [],
    quizResults: [],
    achievements: [],
    teachers: [],
    aiAnswers: []
  };

  if (!fs.existsSync(MOCK_DB_PATH)) {
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(defaultDB, null, 2), 'utf8');
    return defaultDB;
  }
  try {
    const data = fs.readFileSync(MOCK_DB_PATH, 'utf8');
    const parsed = JSON.parse(data);
    return { ...defaultDB, ...parsed };
  } catch (err) {
    console.error("Error reading JSON database, resetting. Error:", err);
    return defaultDB;
  }
}

function writeMockDB(data) {
  fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function getQuestionsForClass(cl, subject) {
  const isLower = cl <= 3;
  const isMiddle = cl >= 4 && cl <= 7;
  const prefix = `[Class ${cl}] `;

  if (subject === 'Math') {
    if (isLower) {
      return [
        { type: 'mcq', isDynamic: true, dynamicType: 'math_add', question: 'What is A + B?', options: [], correctAnswerIndex: 0, explanation: 'A + B = ANSWER.' },
        { type: 'mcq', isDynamic: true, dynamicType: 'math_sub', question: 'What is A - B?', options: [], correctAnswerIndex: 0, explanation: 'A - B = ANSWER.' },
        { type: 'mcq', isDynamic: true, dynamicType: 'math_mul', question: 'What is A × B?', options: [], correctAnswerIndex: 0, explanation: 'A × B = ANSWER.' },
        { type: 'mcq', question: prefix + "What is 10 plus 10?", options: ["15", "20", "25", "30"], correctAnswerIndex: 1, explanation: "10 + 10 = 20." },
        { type: 'mcq', question: prefix + "If you have 3 apples and get 4 more, how many apples do you have?", options: ["6", "7", "8", "9"], correctAnswerIndex: 1, explanation: "3 + 4 = 7 apples." },
        { type: 'mcq', question: prefix + "Which number is the smallest?", options: ["12", "8", "19", "5"], correctAnswerIndex: 3, explanation: "5 is the smallest number among the options." },
        { type: 'mcq', question: prefix + "What shape has 3 sides?", options: ["Circle", "Square", "Triangle", "Rectangle"], correctAnswerIndex: 2, explanation: "A triangle has 3 sides." },
        { type: 'mcq', question: prefix + "What is half of 10?", options: ["2", "4", "5", "6"], correctAnswerIndex: 2, explanation: "Half of 10 is 5 (10 ÷ 2 = 5)." },
        
        // 8 New Questions
        { type: 'mcq', question: prefix + "What is 5 plus 3?", options: ["7", "8", "9", "6"], correctAnswerIndex: 1, explanation: "5 + 3 = 8." },
        { type: 'mcq', question: prefix + "Which number comes after 19?", options: ["18", "20", "21", "22"], correctAnswerIndex: 1, explanation: "20 comes after 19." },
        { type: 'mcq', question: prefix + "A rectangle has how many corners?", options: ["3", "4", "5", "6"], correctAnswerIndex: 1, explanation: "A rectangle has 4 corners." },
        { type: 'mcq', question: prefix + "If you share 6 candies equally between 2 friends, how many does each get?", options: ["2", "3", "4", "5"], correctAnswerIndex: 1, explanation: "6 ÷ 2 = 3 candies." },
        { type: 'mcq', question: prefix + "What is 20 minus 5?", options: ["10", "12", "15", "18"], correctAnswerIndex: 2, explanation: "20 - 5 = 15." },
        { type: 'mcq', question: prefix + "How many wheels does a bicycle have?", options: ["1", "2", "3", "4"], correctAnswerIndex: 1, explanation: "A bicycle has 2 wheels." },
        { type: 'mcq', question: prefix + "What is the double of 6?", options: ["10", "12", "14", "16"], correctAnswerIndex: 1, explanation: "Double of 6 is 12 (6 + 6 = 12)." },
        { type: 'mcq', isDynamic: true, dynamicType: 'math_add', question: 'What is A + B?', options: [], correctAnswerIndex: 0, explanation: 'A + B = ANSWER.' }
      ];
    } else if (isMiddle) {
      return [
        { type: 'mcq', isDynamic: true, dynamicType: 'math_mul', question: 'What is A × B?', options: [], correctAnswerIndex: 0, explanation: 'A × B = ANSWER.' },
        { type: 'mcq', isDynamic: true, dynamicType: 'math_div', question: 'What is A ÷ B?', options: [], correctAnswerIndex: 0, explanation: 'A ÷ B = ANSWER.' },
        { type: 'mcq', isDynamic: true, dynamicType: 'math_linear', question: 'Solve for x: Ax + B = C', options: [], correctAnswerIndex: 0, explanation: 'x = ANSWER.' },
        { type: 'mcq', question: prefix + "What is the perimeter of a square with side length 6 cm?", options: ["12 cm", "24 cm", "36 cm", "18 cm"], correctAnswerIndex: 1, explanation: "Perimeter of a square = 4 × side = 4 × 6 cm = 24 cm." },
        { type: 'mcq', question: prefix + "If x + 15 = 40, what is x?", options: ["15", "25", "35", "20"], correctAnswerIndex: 1, explanation: "x = 40 - 15 = 25." },
        { type: 'mcq', question: prefix + "What is 3/4 represented as a decimal?", options: ["0.34", "0.50", "0.75", "0.80"], correctAnswerIndex: 2, explanation: "3/4 = 75/100 = 0.75." },
        { type: 'mcq', question: prefix + "Which of these is a prime number?", options: ["9", "15", "17", "21"], correctAnswerIndex: 2, explanation: "17 is a prime number because it is only divisible by 1 and itself." },
        { type: 'mcq', question: prefix + "What is the value of 5 cubed (5^3)?", options: ["15", "25", "75", "125"], correctAnswerIndex: 3, explanation: "5^3 = 5 × 5 × 5 = 125." },
        
        // 8 New Questions
        { type: 'mcq', question: prefix + "What is 100 divided by 4?", options: ["20", "25", "30", "50"], correctAnswerIndex: 1, explanation: "100 ÷ 4 = 25." },
        { type: 'mcq', question: prefix + "What is the area of a rectangle with length 5 cm and width 4 cm?", options: ["9 sq cm", "18 sq cm", "20 sq cm", "25 sq cm"], correctAnswerIndex: 2, explanation: "Area = length × width = 5 × 4 = 20 sq cm." },
        { type: 'mcq', question: prefix + "Find the average of 10, 20, and 30?", options: ["15", "20", "25", "30"], correctAnswerIndex: 1, explanation: "Average = (10 + 20 + 30) ÷ 3 = 60 ÷ 3 = 20." },
        { type: 'mcq', question: prefix + "What is 15% of 200?", options: ["15", "30", "45", "60"], correctAnswerIndex: 1, explanation: "15% of 200 = 15/100 × 200 = 30." },
        { type: 'mcq', question: prefix + "If a triangle has angles of 60° and 50°, what is the third angle?", options: ["60°", "70°", "80°", "90°"], correctAnswerIndex: 1, explanation: "Sum of angles in a triangle is 180°. Third angle = 180° - 60° - 50° = 70°." },
        { type: 'mcq', question: prefix + "Convert 0.4 into a fraction in its simplest form.", options: ["1/4", "2/5", "4/10", "1/2"], correctAnswerIndex: 1, explanation: "0.4 = 4/10 = 2/5." },
        { type: 'mcq', question: prefix + "What is the value of 2 to the power of 5 (2^5)?", options: ["10", "16", "32", "64"], correctAnswerIndex: 2, explanation: "2^5 = 2 × 2 × 2 × 2 × 2 = 32." },
        { type: 'mcq', isDynamic: true, dynamicType: 'math_sub', question: 'What is A - B?', options: [], correctAnswerIndex: 0, explanation: 'A - B = ANSWER.' }
      ];
    } else {
      return [
        { type: 'mcq', isDynamic: true, dynamicType: 'math_linear', question: 'Solve for x: Ax + B = C', options: [], correctAnswerIndex: 0, explanation: 'x = ANSWER.' },
        { type: 'mcq', isDynamic: true, dynamicType: 'math_square_root', question: 'What is the square root of N?', options: [], correctAnswerIndex: 0, explanation: 'The square root of N is ANSWER.' },
        { type: 'mcq', isDynamic: true, dynamicType: 'math_mul', question: 'What is A × B?', options: [], correctAnswerIndex: 0, explanation: 'A × B = ANSWER.' },
        { type: 'mcq', question: prefix + "What is the square root of 225?", options: ["13", "14", "15", "16"], correctAnswerIndex: 2, explanation: "15 × 15 = 225, so the square root of 225 is 15." },
        { type: 'mcq', question: prefix + "If log_2(x) = 5, what is the value of x?", options: ["10", "25", "32", "64"], correctAnswerIndex: 2, explanation: "log_2(x) = 5 means x = 2^5 = 32." },
        { type: 'mcq', question: prefix + "In a right-angled triangle, if base = 3cm and height = 4cm, what is the hypotenuse?", options: ["5cm", "6cm", "7cm", "12cm"], correctAnswerIndex: 0, explanation: "Hypotenuse = √(base^2 + height^2) = √(3^2 + 4^2) = √(9 + 16) = √25 = 5cm." },
        { type: 'mcq', question: prefix + "What is the value of sin(90 degrees)?", options: ["0", "0.5", "1", "undefined"], correctAnswerIndex: 2, explanation: "In trigonometry, the sine of 90 degrees is exactly 1." },
        { type: 'mcq', question: prefix + "Solve for x: x^2 - 9 = 0", options: ["x = 3", "x = -3", "x = ±3", "x = 9"], correctAnswerIndex: 2, explanation: "x^2 = 9, which means x = ±√9 = ±3." },
        
        // 8 New Questions
        { type: 'mcq', question: prefix + "Evaluate: (x + 3)(x - 3)", options: ["x^2 + 9", "x^2 - 9", "x^2 - 6x - 9", "x^2 - 6"], correctAnswerIndex: 1, explanation: "(a+b)(a-b) = a^2 - b^2. So, (x+3)(x-3) = x^2 - 9." },
        { type: 'mcq', question: prefix + "If f(x) = 2x^2 - 3x + 5, what is f(2)?", options: ["5", "7", "9", "11"], correctAnswerIndex: 1, explanation: "f(2) = 2(2)^2 - 3(2) + 5 = 8 - 6 + 5 = 7." },
        { type: 'mcq', question: prefix + "Find the slope of the line y = 3x - 5.", options: ["-5", "3", "5", "1/3"], correctAnswerIndex: 1, explanation: "The equation is in slope-intercept form y = mx + c, where slope m = 3." },
        { type: 'mcq', question: prefix + "What is the probability of tossing a coin and getting heads?", options: ["0", "0.5", "1", "0.25"], correctAnswerIndex: 1, explanation: "Probability of heads = 1 favorable outcome / 2 total outcomes = 0.5." },
        { type: 'mcq', question: prefix + "If a circle has a radius of 7 cm, what is its approximate area? (Use pi = 22/7)", options: ["44 sq cm", "154 sq cm", "22 sq cm", "88 sq cm"], correctAnswerIndex: 1, explanation: "Area = pi × r^2 = 22/7 × 7 × 7 = 154 sq cm." },
        { type: 'mcq', question: prefix + "Solve for x: 2^(x+1) = 8", options: ["x = 1", "x = 2", "x = 3", "x = 4"], correctAnswerIndex: 1, explanation: "2^(x+1) = 2^3, which means x + 1 = 3. So, x = 2." },
        { type: 'mcq', question: prefix + "What is the value of cos(0 degrees)?", options: ["0", "0.5", "1", "undefined"], correctAnswerIndex: 2, explanation: "In trigonometry, the cosine of 0 degrees is exactly 1." },
        { type: 'mcq', isDynamic: true, dynamicType: 'math_div', question: 'What is A ÷ B?', options: [], correctAnswerIndex: 0, explanation: 'A ÷ B = ANSWER.' }
      ];
    }
  }

  if (subject === 'Science') {
    if (isLower) {
      return [
        { type: 'mcq', question: prefix + "Which part of a plant grows under the ground?", options: ["Stem", "Leaf", "Flower", "Roots"], correctAnswerIndex: 3, explanation: "Roots anchor the plant in the soil and absorb water and nutrients." },
        { type: 'mcq', question: prefix + "What gas do humans breathe in to live?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Helium"], correctAnswerIndex: 0, explanation: "Humans require Oxygen for cellular respiration." },
        { type: 'mcq', question: prefix + "Which animal is known as the King of the Jungle?", options: ["Tiger", "Elephant", "Lion", "Giraffe"], correctAnswerIndex: 2, explanation: "The Lion is traditionally called the King of the Jungle." },
        { type: 'mcq', question: prefix + "Water turns into ice when it gets very...", options: ["Hot", "Cold", "Dry", "Windy"], correctAnswerIndex: 1, explanation: "Freezing occurs when water is cooled to 0°C (32°F) or below." },
        { type: 'mcq', question: prefix + "Which of these is a living thing?", options: ["Rock", "Toy Car", "Tree", "Book"], correctAnswerIndex: 2, explanation: "Trees are living things as they grow, breathe, and reproduce." },
        { type: 'mcq', question: prefix + "How many senses do humans have?", options: ["3", "4", "5", "6"], correctAnswerIndex: 2, explanation: "Humans have 5 basic senses: sight, hearing, smell, taste, and touch." },
        { type: 'mcq', question: prefix + "Which planet is our home?", options: ["Mars", "Venus", "Earth", "Jupiter"], correctAnswerIndex: 2, explanation: "Earth is the third planet from the Sun and our home planet." },
        { type: 'mcq', question: prefix + "What is the main source of light for Earth?", options: ["Moon", "Sun", "Stars", "Fireflies"], correctAnswerIndex: 1, explanation: "The Sun is our solar system's star and provides light and heat to Earth." },
        
        // 8 New Questions
        { type: 'mcq', question: prefix + "Which plant part makes food?", options: ["Roots", "Leaves", "Stem", "Flower"], correctAnswerIndex: 1, explanation: "Leaves make food for the plant using sunlight (photosynthesis)." },
        { type: 'mcq', question: prefix + "Which animal lays eggs?", options: ["Dog", "Cat", "Hen", "Cow"], correctAnswerIndex: 2, explanation: "Hens lay eggs, while mammals give birth to live young." },
        { type: 'mcq', question: prefix + "Which organ do we use to see?", options: ["Ears", "Nose", "Eyes", "Skin"], correctAnswerIndex: 2, explanation: "We use our eyes to see the world." },
        { type: 'mcq', question: prefix + "What do we call a baby dog?", options: ["Kitten", "Puppy", "Cub", "Calf"], correctAnswerIndex: 1, explanation: "A baby dog is called a puppy." },
        { type: 'mcq', question: prefix + "Which of these is a non-living thing?", options: ["Bird", "Fish", "Table", "Grass"], correctAnswerIndex: 2, explanation: "A table does not grow, breathe, or reproduce." },
        { type: 'mcq', question: prefix + "How many legs does a spider have?", options: ["6", "8", "10", "12"], correctAnswerIndex: 1, explanation: "Spiders are arachnids and have 8 legs." },
        { type: 'mcq', question: prefix + "What is the color of a fresh leaf?", options: ["Red", "Blue", "Green", "Yellow"], correctAnswerIndex: 2, explanation: "Fresh leaves are green due to chlorophyll." },
        { type: 'mcq', question: prefix + "We get wool from which animal?", options: ["Cow", "Sheep", "Horse", "Pig"], correctAnswerIndex: 1, explanation: "Sheep provide us with wool to make warm clothes." }
      ];
    } else if (isMiddle) {
      return [
        { type: 'mcq', question: prefix + "Which gas do plants absorb during photosynthesis?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], correctAnswerIndex: 1, explanation: "Plants take in Carbon Dioxide (CO2) and release Oxygen (O2) during photosynthesis." },
        { type: 'mcq', question: prefix + "What is the boiling point of water at standard sea level?", options: ["50°C", "90°C", "100°C", "120°C"], correctAnswerIndex: 2, explanation: "Water boils at 100 degrees Celsius (212°F)." },
        { type: 'mcq', question: prefix + "Which organ pumps blood throughout the human body?", options: ["Lungs", "Brain", "Liver", "Heart"], correctAnswerIndex: 3, explanation: "The heart is a muscular organ that pumps blood through the circulatory system." },
        { type: 'mcq', question: prefix + "What is the closest planet to the Sun?", options: ["Venus", "Earth", "Mercury", "Mars"], correctAnswerIndex: 2, explanation: "Mercury is the closest planet to the Sun." },
        { type: 'mcq', question: prefix + "Which pigment gives plants their green color?", options: ["Carotene", "Chlorophyll", "Hemoglobin", "Melanin"], correctAnswerIndex: 1, explanation: "Chlorophyll absorbs light energy and gives plants their green color." },
        { type: 'mcq', question: prefix + "What force pulls objects toward the center of the Earth?", options: ["Friction", "Magnetism", "Gravity", "Tension"], correctAnswerIndex: 2, explanation: "Gravity is the attractive force exerted by the Earth's mass." },
        { type: 'mcq', question: prefix + "Which of these is a solid state of water?", options: ["Steam", "Rain", "Ice", "Dew"], correctAnswerIndex: 2, explanation: "Ice is water in its solid phase." },
        { type: 'mcq', question: prefix + "What part of the cell is known as the powerhouse?", options: ["Nucleus", "Mitochondria", "Ribosome", "Cell Wall"], correctAnswerIndex: 1, explanation: "Mitochondria generate most of the chemical energy needed to power the cell's reactions." },
        
        // 8 New Questions
        { type: 'mcq', question: prefix + "Which planet is known for its beautiful rings?", options: ["Mars", "Jupiter", "Saturn", "Neptune"], correctAnswerIndex: 2, explanation: "Saturn has the most extensive ring system in the solar system." },
        { type: 'mcq', question: prefix + "What gas do humans release when they breathe out?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Carbon Monoxide"], correctAnswerIndex: 1, explanation: "Humans breathe out Carbon Dioxide as a waste product of respiration." },
        { type: 'mcq', question: prefix + "Which organ helps us breathe?", options: ["Stomach", "Lungs", "Heart", "Kidneys"], correctAnswerIndex: 1, explanation: "Lungs exchange oxygen and carbon dioxide in our body." },
        { type: 'mcq', question: prefix + "Which state of matter has a fixed volume but no fixed shape?", options: ["Solid", "Liquid", "Gas", "Plasma"], correctAnswerIndex: 1, explanation: "Liquids take the shape of their container but maintain a constant volume." },
        { type: 'mcq', question: prefix + "What is the process of water changing into water vapor called?", options: ["Condensation", "Evaporation", "Freezing", "Melting"], correctAnswerIndex: 1, explanation: "Evaporation is the process of liquid water changing into gas (vapor)." },
        { type: 'mcq', question: prefix + "Which vitamin do we get from sunlight?", options: ["Vitamin A", "Vitamin B", "Vitamin C", "Vitamin D"], correctAnswerIndex: 3, explanation: "Our skin synthesizes Vitamin D when exposed to sunlight." },
        { type: 'mcq', question: prefix + "What is the primary function of plant roots?", options: ["Make food", "Produce flowers", "Absorb water and minerals", "Release oxygen"], correctAnswerIndex: 2, explanation: "Roots absorb water and dissolved minerals from the soil." },
        { type: 'mcq', question: prefix + "Which instrument is used to measure temperature?", options: ["Barometer", "Thermometer", "Speedometer", "Rain gauge"], correctAnswerIndex: 1, explanation: "A thermometer measures temperature, usually in Celsius or Fahrenheit." }
      ];
    } else {
      return [
        { type: 'mcq', question: prefix + "Which element has the chemical symbol 'O'?", options: ["Gold", "Oxygen", "Osmium", "Carbon"], correctAnswerIndex: 1, explanation: "O is the chemical symbol for Oxygen." },
        { type: 'mcq', question: prefix + "What is the speed of light in a vacuum?", options: ["300,000 km/s", "150,000 km/s", "450,000 km/s", "600,000 km/s"], correctAnswerIndex: 0, explanation: "The speed of light is approximately 299,792 km/s, commonly rounded to 300,000 km/s." },
        { type: 'mcq', question: prefix + "What type of bond is formed by sharing electrons?", options: ["Ionic bond", "Covalent bond", "Hydrogen bond", "Metallic bond"], correctAnswerIndex: 1, explanation: "Covalent bonding involves the sharing of electron pairs between atoms." },
        { type: 'mcq', question: prefix + "What is the unit of electrical resistance?", options: ["Volt", "Ampere", "Ohm", "Watt"], correctAnswerIndex: 2, explanation: "Ohm (Ω) is the SI unit of electrical resistance." },
        { type: 'mcq', question: prefix + "Which law states that action and reaction are equal and opposite?", options: ["Newton's 1st Law", "Newton's 2nd Law", "Newton's 3rd Law", "Kepler's Law"], correctAnswerIndex: 2, explanation: "Newton's Third Law of Motion states that for every action, there is an equal and opposite reaction." },
        { type: 'mcq', question: prefix + "What is the main component of natural gas?", options: ["Ethane", "Propane", "Butane", "Methane"], correctAnswerIndex: 3, explanation: "Natural gas is composed mostly of Methane (CH4), typically around 70-90%." },
        { type: 'mcq', question: prefix + "Which blood cells help in blood clotting?", options: ["Red blood cells", "White blood cells", "Platelets", "Plasma"], correctAnswerIndex: 2, explanation: "Platelets (thrombocytes) adhere to cut edges and release chemicals that start clotting." },
        { type: 'mcq', question: prefix + "What is the pH level of pure water?", options: ["5.5", "7.0", "8.5", "9.0"], correctAnswerIndex: 1, explanation: "Pure water has a neutral pH of exactly 7.0." },
        
        // 8 New Questions
        { type: 'mcq', question: prefix + "What is the chemical formula of table salt?", options: ["NaCl", "HCl", "NaOH", "KCl"], correctAnswerIndex: 0, explanation: "Table salt is Sodium Chloride (NaCl)." },
        { type: 'mcq', question: prefix + "What is the powerhouse of the cell?", options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi Body"], correctAnswerIndex: 1, explanation: "Mitochondria generate ATP, the cell's energy currency." },
        { type: 'mcq', question: prefix + "Which metal is liquid at room temperature?", options: ["Gold", "Iron", "Mercury", "Copper"], correctAnswerIndex: 2, explanation: "Mercury (Hg) is the only metal that is liquid at standard room temperature." },
        { type: 'mcq', question: prefix + "What type of mirror is used as a shaving mirror?", options: ["Plane mirror", "Concave mirror", "Convex mirror", "Double mirror"], correctAnswerIndex: 1, explanation: "Concave mirrors form magnified, erect images when objects are close." },
        { type: 'mcq', question: prefix + "What is the SI unit of force?", options: ["Joule", "Watt", "Newton", "Pascal"], correctAnswerIndex: 2, explanation: "Newton (N) is the SI unit of force, named after Sir Isaac Newton." },
        { type: 'mcq', question: prefix + "Which component of blood carries oxygen?", options: ["White Blood Cells", "Red Blood Cells", "Platelets", "Plasma"], correctAnswerIndex: 1, explanation: "Red blood cells contain hemoglobin, which binds and carries oxygen." },
        { type: 'mcq', question: prefix + "What is the escape velocity of Earth?", options: ["7.2 km/s", "9.8 km/s", "11.2 km/s", "15.0 km/s"], correctAnswerIndex: 2, explanation: "The escape velocity from Earth's surface is about 11.2 km/s." },
        { type: 'mcq', question: prefix + "What is the main function of the kidneys?", options: ["Pump blood", "Digest food", "Filter waste from blood", "Produce hormones"], correctAnswerIndex: 2, explanation: "Kidneys filter blood to remove waste products and excess fluids as urine." }
      ];
    }
  }

  if (subject === 'English') {
    if (isLower) {
      return [
        { type: 'mcq', question: prefix + "Choose the naming word (noun) in: 'The dog barked.'", options: ["dog", "barked", "The", "loudly"], correctAnswerIndex: 0, explanation: "'dog' is a noun because it names an animal." },
        { type: 'mcq', question: prefix + "What is the opposite of 'Hot'?", options: ["Warm", "Cold", "Dry", "Wet"], correctAnswerIndex: 1, explanation: "The antonym of hot is cold." },
        { type: 'mcq', question: prefix + "Which letter is a vowel?", options: ["B", "M", "E", "T"], correctAnswerIndex: 2, explanation: "A, E, I, O, U are vowels. E is a vowel." },
        { type: 'mcq', question: prefix + "Choose the correct spelling:", options: ["Aple", "Appel", "Apple", "Aplee"], correctAnswerIndex: 2, explanation: "The correct spelling is 'Apple'." },
        { type: 'mcq', question: prefix + "Complete: 'The birds are ___ in the sky.'", options: ["flying", "fly", "flown", "flew"], correctAnswerIndex: 0, explanation: "'flying' is the present participle needed for the continuous tense." },
        { type: 'mcq', question: prefix + "What is the plural of 'Cat'?", options: ["Cats", "Cates", "Catse", "Kittens"], correctAnswerIndex: 0, explanation: "The plural of cat is formed by adding 's', resulting in 'Cats'." },
        { type: 'mcq', question: prefix + "Choose the action word (verb) in: 'She runs fast.'", options: ["She", "runs", "fast", "beautifully"], correctAnswerIndex: 1, explanation: "'runs' is a verb because it describes an action." },
        { type: 'mcq', question: prefix + "Which word starts with a capital letter?", options: ["monday", "Monday", "mOnday", "MONday"], correctAnswerIndex: 1, explanation: "Days of the week are proper nouns and must be capitalized: 'Monday'." },
        
        // 8 New Questions
        { type: 'mcq', question: prefix + "Choose the correct pronoun: '___ is a good boy.'", options: ["She", "He", "It", "They"], correctAnswerIndex: 1, explanation: "'He' is the pronoun used for boys." },
        { type: 'mcq', question: prefix + "What is the opposite of 'Big'?", options: ["Huge", "Small", "Tall", "Heavy"], correctAnswerIndex: 1, explanation: "The opposite of big is small." },
        { type: 'mcq', question: prefix + "Identify the adjective in: 'She has a blue pen.'", options: ["She", "pen", "blue", "has"], correctAnswerIndex: 2, explanation: "'blue' describes the pen, so it is an adjective." },
        { type: 'mcq', question: prefix + "What is the plural of 'Dog'?", options: ["Doges", "Dogs", "Doggies", "Dogse"], correctAnswerIndex: 1, explanation: "The plural of dog is dogs." },
        { type: 'mcq', question: prefix + "Which word rhymes with 'Cat'?", options: ["Car", "Hat", "Cot", "Cut"], correctAnswerIndex: 1, explanation: "'Hat' rhymes with 'Cat' as they have the same ending sound." },
        { type: 'mcq', question: prefix + "Complete: 'I have ___ apple.'", options: ["a", "an", "the", "some"], correctAnswerIndex: 1, explanation: "'apple' starts with a vowel sound, so we use 'an'." },
        { type: 'mcq', question: prefix + "What is the opposite of 'Happy'?", options: ["Sad", "Glad", "Angry", "Silly"], correctAnswerIndex: 0, explanation: "The opposite of happy is sad." },
        { type: 'mcq', question: prefix + "Which of these is a verb (doing word)?", options: ["Boy", "Apple", "Run", "Green"], correctAnswerIndex: 2, explanation: "'Run' describes an action, so it is a verb." }
      ];
    } else if (isMiddle) {
      return [
        { type: 'mcq', question: prefix + "Choose the correct spelling:", options: ["Recieve", "Receive", "Recievee", "Riceive"], correctAnswerIndex: 1, explanation: "Remember: 'I before E except after C'. Hence, 'Receive'." },
        { type: 'mcq', question: prefix + "What is the synonym of 'Enormous'?", options: ["Tiny", "Huge", "Weak", "Bright"], correctAnswerIndex: 1, explanation: "'Enormous' means extremely large; 'Huge' is the closest synonym." },
        { type: 'mcq', question: prefix + "Identify the noun in the sentence: 'She plays the piano beautifully.'", options: ["plays", "piano", "beautifully", "She"], correctAnswerIndex: 1, explanation: "'piano' is a noun because it names an instrument." },
        { type: 'mcq', question: prefix + "Which word is a conjunction?", options: ["quickly", "under", "but", "apple"], correctAnswerIndex: 2, explanation: "'but' is a coordinating conjunction connecting clauses." },
        { type: 'mcq', question: prefix + "Identify the adjective in: 'The quick brown fox jumps over the lazy dog.'", options: ["jumps", "over", "quick", "fox"], correctAnswerIndex: 2, explanation: "'quick' describes the noun 'fox', making it an adjective." },
        { type: 'mcq', question: prefix + "What is the past tense of the verb 'go'?", options: ["goes", "going", "gone", "went"], correctAnswerIndex: 3, explanation: "'went' is the irregular past tense form of 'go'." },
        { type: 'mcq', question: prefix + "Choose the sentence with correct punctuation:", options: ["Where are you going?", "Where are you going.", "where are you going", "Where are you going!"], correctAnswerIndex: 0, explanation: "Interrogative sentences require a question mark." },
        { type: 'mcq', question: prefix + "What is the antonym of 'Generous'?", options: ["Kind", "Selfish", "Giving", "Friendly"], correctAnswerIndex: 1, explanation: "'Selfish' is the opposite of being giving and generous." },
        
        // 8 New Questions
        { type: 'mcq', question: prefix + "Identify the adverb in: 'He ran quickly.'", options: ["He", "ran", "quickly", "fast"], correctAnswerIndex: 2, explanation: "'quickly' describes how he ran, making it an adverb." },
        { type: 'mcq', question: prefix + "What is the synonym of 'Courageous'?", options: ["Timid", "Brave", "Scared", "Polite"], correctAnswerIndex: 1, explanation: "'Courageous' means brave." },
        { type: 'mcq', question: prefix + "What is the antonym of 'Difficult'?", options: ["Hard", "Simple/Easy", "Rough", "Tough"], correctAnswerIndex: 1, explanation: "The opposite of difficult is easy." },
        { type: 'mcq', question: prefix + "Complete: 'Neither Mary nor her friends ___ going to the party.'", options: ["is", "are", "am", "was"], correctAnswerIndex: 1, explanation: "In neither-nor construction, the verb agrees with the closer subject 'friends' (plural), so we use 'are'." },
        { type: 'mcq', question: prefix + "Identify the conjunction: 'We stayed indoors because it was raining.'", options: ["stayed", "indoors", "because", "raining"], correctAnswerIndex: 2, explanation: "'because' joins two clauses, so it is a conjunction." },
        { type: 'mcq', question: prefix + "Choose the correct spelling:", options: ["Tommorrow", "Tomorrow", "Tomorow", "To-morrow"], correctAnswerIndex: 1, explanation: "The correct spelling is 'Tomorrow'." },
        { type: 'mcq', question: prefix + "What is a group of lions called?", options: ["Pack", "Herd", "Pride", "Flock"], correctAnswerIndex: 2, explanation: "A group of lions is called a pride." },
        { type: 'mcq', question: prefix + "Which word is a preposition in: 'The key is under the mat.'", options: ["key", "under", "mat", "is"], correctAnswerIndex: 1, explanation: "'under' indicates position, so it is a preposition." }
      ];
    } else {
      return [
        { type: 'mcq', question: prefix + "Identify the figure of speech: 'The stars danced playfully in the moonlit sky.'", options: ["Metaphor", "Simile", "Personification", "Hyperbole"], correctAnswerIndex: 2, explanation: "Giving human traits (dancing) to non-human things (stars) is personification." },
        { type: 'mcq', question: prefix + "What is the synonym of 'Pragmatic'?", options: ["Idealistic", "Practical", "Careless", "Dynamic"], correctAnswerIndex: 1, explanation: "'Pragmatic' means dealing with things sensibly and realistically, hence 'Practical'." },
        { type: 'mcq', question: prefix + "Identify the passive voice version of: 'John wrote the letter.'", options: ["John was writing the letter.", "The letter was written by John.", "The letter had been written by John.", "The letter is written by John."], correctAnswerIndex: 1, explanation: "'The letter was written by John' is passive because the target receives the action." },
        { type: 'mcq', question: prefix + "Which word means 'a person who has deep knowledge of a subject'?", options: ["Novice", "Amateur", "Connoisseur", "Pundit"], correctAnswerIndex: 3, explanation: "A 'Pundit' is an expert in a particular subject who is frequently called on to give opinions." },
        { type: 'mcq', question: prefix + "Identify the correct usage:", options: ["Its raining outside.", "It's raining outside.", "Its' raining outside.", "It is raining outside'"], correctAnswerIndex: 1, explanation: "'It's' is the contraction of 'It is'." },
        { type: 'mcq', question: prefix + "What is the antonym of 'Ephemeral'?", options: ["Short-lived", "Transient", "Eternal", "Brief"], correctAnswerIndex: 2, explanation: "'Ephemeral' means lasting a very short time; 'Eternal' means lasting forever." },
        { type: 'mcq', question: prefix + "Identify the subordinate clause: 'Although she was tired, she completed the homework.'", options: ["Although she was tired", "she completed the homework", "completed the homework", "Although she"], correctAnswerIndex: 0, explanation: "'Although she was tired' starts with a subordinating conjunction and cannot stand alone." },
        { type: 'mcq', question: prefix + "What is the meaning of the idiom 'Spill the beans'?", options: ["To cook food", "To reveal a secret", "To waste money", "To make a mistake"], correctAnswerIndex: 1, explanation: "'Spill the beans' means to disclose confidential information or a secret." },
        
        // 8 New Questions
        { type: 'mcq', question: prefix + "Identify the correct meaning of 'Altruistic':", options: ["Selfish", "Unselfish/Generous", "Arrogant", "Quiet"], correctAnswerIndex: 1, explanation: "'Altruistic' means showing unselfish concern for the welfare of others." },
        { type: 'mcq', question: prefix + "What is the antonym of 'Obsolete'?", options: ["Ancient", "Outdated", "Modern/Current", "Extinct"], correctAnswerIndex: 2, explanation: "'Obsolete' means no longer in use; its opposite is modern/current." },
        { type: 'mcq', question: prefix + "Identify the figure of speech: 'He is as busy as a bee.'", options: ["Metaphor", "Simile", "Alliteration", "Oxymoron"], correctAnswerIndex: 1, explanation: "A comparison using 'as' or 'like' is a simile." },
        { type: 'mcq', question: prefix + "Complete: 'If I ___ you, I would study harder.'", options: ["was", "were", "am", "had been"], correctAnswerIndex: 1, explanation: "In subjunctive mood for hypothetical situations, we use 'were' regardless of the subject." },
        { type: 'mcq', question: prefix + "What does the idiom 'Beat around the bush' mean?", options: ["To cut trees", "To avoid the main topic", "To work hard", "To play in the forest"], correctAnswerIndex: 1, explanation: "'Beat around the bush' means to talk about irrelevant things to avoid speaking directly about the main topic." },
        { type: 'mcq', question: prefix + "Identify the correct spelling:", options: ["Accomodate", "Accommodate", "Acomodate", "Accomodatte"], correctAnswerIndex: 1, explanation: "The correct spelling is 'Accommodate' with double 'c' and double 'm'." },
        { type: 'mcq', question: prefix + "What is the subordinate clause in: 'She will pass the exam if she studies.'", options: ["She will pass the exam", "if she studies", "pass the exam", "studies"], correctAnswerIndex: 1, explanation: "'if she studies' is a conditional subordinate clause." },
        { type: 'mcq', question: prefix + "Which word means 'a person who hates or distrusts humankind'?", options: ["Philanthropist", "Optimist", "Misanthrope", "Pessimist"], correctAnswerIndex: 2, explanation: "A 'Misanthrope' is a person who dislikes humankind and avoids human society." }
      ];
    }
  }

  if (subject === 'Social Studies') {
    if (isLower) {
      return [
        { type: 'mcq', question: prefix + "Who is the 'Father of the Nation' in India?", options: ["Jawaharlal Nehru", "Mahatma Gandhi", "Subhas Chandra Bose", "Bhagat Singh"], correctAnswerIndex: 1, explanation: "Mahatma Gandhi is widely known as the Father of the Nation in India." },
        { type: 'mcq', question: prefix + "Which country do we live in?", options: ["India", "USA", "Canada", "Australia"], correctAnswerIndex: 0, explanation: "We live in India." },
        { type: 'mcq', question: prefix + "How many colors are there in the Indian national flag?", options: ["2", "3", "4", "5"], correctAnswerIndex: 1, explanation: "The flag has 3 horizontal bands: saffron, white, and green." },
        { type: 'mcq', question: prefix + "What is the capital of India?", options: ["Mumbai", "Kolkata", "New Delhi", "Chennai"], correctAnswerIndex: 2, explanation: "New Delhi is the official capital city of India." },
        { type: 'mcq', question: prefix + "Which festival is known as the Festival of Lights?", options: ["Holi", "Diwali", "Eid", "Christmas"], correctAnswerIndex: 1, explanation: "Diwali is the Hindu festival of lights, representing victory of light over darkness." },
        { type: 'mcq', question: prefix + "What vehicle runs on tracks?", options: ["Car", "Train", "Bicycle", "Boat"], correctAnswerIndex: 1, explanation: "Trains run on iron tracks called rails." },
        { type: 'mcq', question: prefix + "Who helps us when we are sick?", options: ["Teacher", "Doctor", "Farmer", "Postman"], correctAnswerIndex: 1, explanation: "Doctors treat illnesses and help us stay healthy." },
        { type: 'mcq', question: prefix + "What is the shape of the Earth?", options: ["Flat", "Round/Sphere", "Square", "Triangle"], correctAnswerIndex: 1, explanation: "The Earth is an oblate spheroid, which is round like a ball." },
        
        // 8 New Questions
        { type: 'mcq', question: prefix + "Which is the national animal of India?", options: ["Lion", "Elephant", "Tiger", "Leopard"], correctAnswerIndex: 2, explanation: "The Royal Bengal Tiger is the national animal of India." },
        { type: 'mcq', question: prefix + "How many days are there in a normal year?", options: ["360", "365", "366", "350"], correctAnswerIndex: 1, explanation: "A normal year has 365 days, while a leap year has 366." },
        { type: 'mcq', question: prefix + "Which is the tallest mountain in the world?", options: ["Mount K2", "Mount Everest", "Kangchenjunga", "Kilimanjaro"], correctAnswerIndex: 1, explanation: "Mount Everest is the Earth's highest mountain above sea level." },
        { type: 'mcq', question: prefix + "What do we call a land surrounded by water on all sides?", options: ["Peninsula", "Island", "Continent", "Desert"], correctAnswerIndex: 1, explanation: "An island is a piece of land completely surrounded by water." },
        { type: 'mcq', question: prefix + "Who was the first citizen of India?", options: ["Prime Minister", "President", "Chief Justice", "Governor"], correctAnswerIndex: 1, explanation: "The President of India is considered the first citizen of the nation." },
        { type: 'mcq', question: prefix + "Which is the smallest ocean in the world?", options: ["Indian Ocean", "Arctic Ocean", "Atlantic Ocean", "Pacific Ocean"], correctAnswerIndex: 1, explanation: "The Arctic Ocean is the smallest and shallowest of the world's five major oceans." },
        { type: 'mcq', question: prefix + "What is the national flower of India?", options: ["Rose", "Lotus", "Marigold", "Jasmine"], correctAnswerIndex: 1, explanation: "The Lotus is the national flower of India." },
        { type: 'mcq', question: prefix + "Which direction does the Sun rise in?", options: ["West", "North", "South", "East"], correctAnswerIndex: 3, explanation: "The Sun always rises in the East." }
      ];
    } else if (isMiddle) {
      return [
        { type: 'mcq', question: prefix + "Who was the first President of the United States?", options: ["Thomas Jefferson", "Abraham Lincoln", "George Washington", "John Adams"], correctAnswerIndex: 2, explanation: "George Washington served as the first US President from 1789 to 1797." },
        { type: 'mcq', question: prefix + "Which is the largest ocean on Earth?", options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"], correctAnswerIndex: 3, explanation: "The Pacific Ocean covers more than 30% of the Earth's surface." },
        { type: 'mcq', question: prefix + "Which continent is known as the 'Dark Continent'?", options: ["Asia", "Africa", "South America", "Australia"], correctAnswerIndex: 1, explanation: "Africa was called the 'Dark Continent' because its interiors were largely unknown to outsiders." },
        { type: 'mcq', question: prefix + "What is the capital of France?", options: ["Rome", "Berlin", "London", "Paris"], correctAnswerIndex: 3, explanation: "Paris is the capital and largest city of France." },
        { type: 'mcq', question: prefix + "Which is the longest river in the world?", options: ["Amazon River", "Nile River", "Yangtze River", "Mississippi River"], correctAnswerIndex: 1, explanation: "The Nile River in Africa is about 6,650 km long and generally considered the longest." },
        { type: 'mcq', question: prefix + "Who wrote the Indian Constitution?", options: ["Mahatma Gandhi", "Dr. B.R. Ambedkar", "Jawaharlal Nehru", "Subhas Chandra Bose"], correctAnswerIndex: 1, explanation: "Dr. Bhimrao Ramji Ambedkar was the Chairman of the Drafting Committee." },
        { type: 'mcq', question: prefix + "Which is the smallest state in India by area?", options: ["Goa", "Sikkim", "Tripura", "Mizoram"], correctAnswerIndex: 0, explanation: "Goa is India's smallest state by land area." },
        { type: 'mcq', question: prefix + "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correctAnswerIndex: 1, explanation: "Mars appears red due to iron oxide (rust) on its surface." },
        
        // 8 New Questions
        { type: 'mcq', question: prefix + "Who was the first woman Prime Minister of India?", options: ["Pratibha Patil", "Indira Gandhi", "Sarojini Naidu", "Sushma Swaraj"], correctAnswerIndex: 1, explanation: "Indira Gandhi served as the first and only female Prime Minister of India." },
        { type: 'mcq', question: prefix + "Which is the largest hot desert in the world?", options: ["Thar Desert", "Gobi Desert", "Sahara Desert", "Kalahari Desert"], correctAnswerIndex: 2, explanation: "The Sahara Desert in Africa is the largest hot desert on Earth." },
        { type: 'mcq', question: prefix + "Which civilization was built along the Nile River?", options: ["Mesopotamian", "Egyptian", "Harappan", "Chinese"], correctAnswerIndex: 1, explanation: "The ancient Egyptian civilization flourished along the fertile banks of the Nile." },
        { type: 'mcq', question: prefix + "What is the imaginary line passing through the center of the Earth horizontally?", options: ["Prime Meridian", "Equator", "Tropic of Cancer", "Tropic of Capricorn"], correctAnswerIndex: 1, explanation: "The Equator divides the Earth into the Northern and Southern Hemispheres." },
        { type: 'mcq', question: prefix + "Which planet is known as the 'Morning Star'?", options: ["Mercury", "Venus", "Mars", "Jupiter"], correctAnswerIndex: 1, explanation: "Venus is often called the morning or evening star due to its bright appearance." },
        { type: 'mcq', question: prefix + "Who invented the printing press?", options: ["Albert Einstein", "Isaac Newton", "Johannes Gutenberg", "Galileo Galilei"], correctAnswerIndex: 2, explanation: "Johannes Gutenberg introduced printing to Europe with the printing press around 1440." },
        { type: 'mcq', question: prefix + "Which is the highest waterfall in the world?", options: ["Niagara Falls", "Angel Falls", "Victoria Falls", "Iguazu Falls"], correctAnswerIndex: 1, explanation: "Angel Falls in Venezuela is the world's highest uninterrupted waterfall." },
        { type: 'mcq', question: prefix + "Which country is also called the land of the Rising Sun?", options: ["China", "Japan", "Norway", "Australia"], correctAnswerIndex: 1, explanation: "Japan is called the Land of the Rising Sun because it lies to the far east of the Asian continent." }
      ];
    } else {
      return [
        { type: 'mcq', question: prefix + "In which year did India gain Independence from British rule?", options: ["1942", "1945", "1947", "1950"], correctAnswerIndex: 2, explanation: "India achieved independence on August 15, 1947." },
        { type: 'mcq', question: prefix + "Who was the first Prime Minister of independent India?", options: ["Mahatma Gandhi", "Jawaharlal Nehru", "Sardar Vallabhbhai Patel", "Dr. Rajendra Prasad"], correctAnswerIndex: 1, explanation: "Jawaharlal Nehru took office on August 15, 1947." },
        { type: 'mcq', question: prefix + "Which is the largest country in the world by land area?", options: ["Canada", "USA", "China", "Russia"], correctAnswerIndex: 3, explanation: "Russia is the largest country, spanning Eastern Europe and Northern Asia." },
        { type: 'mcq', question: prefix + "The Harappan Civilization was situated near which river basin?", options: ["Ganges", "Indus", "Yamuna", "Narmada"], correctAnswerIndex: 1, explanation: "The Bronze Age Harappan civilization flourished around the Indus River basin." },
        { type: 'mcq', question: prefix + "What is the term duration of the Lok Sabha in India?", options: ["4 years", "5 years", "6 years", "7 years"], correctAnswerIndex: 1, explanation: "The Lok Sabha, or lower house of Parliament, has a term of 5 years." },
        { type: 'mcq', question: prefix + "Which line divides India into almost two equal parts?", options: ["Equator", "Tropic of Cancer", "Tropic of Capricorn", "Prime Meridian"], correctAnswerIndex: 1, explanation: "The Tropic of Cancer (23.5° N latitude) passes through 8 Indian states." },
        { type: 'mcq', question: prefix + "Which Indian state has the longest coastline?", options: ["Maharashtra", "Tamil Nadu", "Gujarat", "Andhra Pradesh"], correctAnswerIndex: 2, explanation: "Gujarat has a coastline of about 1,600 km, the longest in India." },
        { type: 'mcq', question: prefix + "Who was the founder of the Maurya Empire?", options: ["Ashoka", "Chandragupta Maurya", "Samudragupta", "Harsha"], correctAnswerIndex: 1, explanation: "Chandragupta Maurya founded the empire in 322 BCE with the help of Chanakya." },
        
        // 8 New Questions
        { type: 'mcq', question: prefix + "Who was the first President of independent India?", options: ["Dr. S. Radhakrishnan", "Dr. Rajendra Prasad", "Zakir Husain", "V.V. Giri"], correctAnswerIndex: 1, explanation: "Dr. Rajendra Prasad served as the first President from 1950 to 1962." },
        { type: 'mcq', question: prefix + "Which organization was founded after World War I to maintain world peace?", options: ["United Nations", "League of Nations", "NATO", "European Union"], correctAnswerIndex: 1, explanation: "The League of Nations was founded in 1920 but was later replaced by the United Nations in 1945." },
        { type: 'mcq', question: prefix + "Which is the deepest trench in the world?", options: ["Java Trench", "Mariana Trench", "Puerto Rico Trench", "Sunda Trench"], correctAnswerIndex: 1, explanation: "The Mariana Trench in the western Pacific Ocean is the deepest trench on Earth." },
        { type: 'mcq', question: prefix + "Who was the author of the famous book 'Discovery of India'?", options: ["Mahatma Gandhi", "Jawaharlal Nehru", "Rabindranath Tagore", "Bal Gangadhar Tilak"], correctAnswerIndex: 1, explanation: "Jawaharlal Nehru wrote 'The Discovery of India' during his imprisonment at Ahmednagar Fort." },
        { type: 'mcq', question: prefix + "What is the minimum voting age in India?", options: ["16 years", "18 years", "20 years", "21 years"], correctAnswerIndex: 1, explanation: "The 61st Amendment Act reduced the voting age from 21 to 18 in 1989." },
        { type: 'mcq', question: prefix + "Which French revolution slogan spread across Europe?", options: ["Peace, Land, Bread", "Liberty, Equality, Fraternity", "No taxation without representation", "Work and Freedom"], correctAnswerIndex: 1, explanation: "'Liberty, Equality, Fraternity' was the famous motto of the French Revolution." },
        { type: 'mcq', question: prefix + "Which Indian ruler was known as the Tiger of Mysore?", options: ["Haider Ali", "Tipu Sultan", "Chikka Devaraja", "Krishna Raja Wadiyar"], correctAnswerIndex: 1, explanation: "Tipu Sultan was known as the Tiger of Mysore due to his fierce resistance to British forces." },
        { type: 'mcq', question: prefix + "Which treaty officially ended World War I?", options: ["Treaty of Paris", "Treaty of Versailles", "Treaty of Geneva", "Treaty of London"], correctAnswerIndex: 1, explanation: "The Treaty of Versailles, signed in 1919, officially ended the state of war between Germany and the Allied Powers." }
      ];
    }
  }

  return [];
}

// Seed helper for mock database to ensure user has pre-built quizzes
function seedMockQuizzes(db) {
  const needsReseed = db.quizzes.length === 0 || db.quizzes.some(q => q.questions.length <= 8);
  if (!needsReseed) return;

  db.quizzes = [];
  const subjects = ['Math', 'Science', 'English', 'Social Studies'];

  // Seed quizzes for all classes 6-10
  for (let cl = 6; cl <= 10; cl++) {
    subjects.forEach(subject => {
      const questions = getQuestionsForClass(cl, subject);
      db.quizzes.push({
        _id: crypto.randomUUID(),
        class: cl,
        subject: subject,
        title: `${subject} Quiz for Class ${cl}`,
        questions: questions
      });
    });
  }

  writeMockDB(db);
  console.log("🌱 Mock Quizzes successfully seeded in JSON Database!");
}

// --- DB Connection Core ---
async function connectDB() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studybuddy';
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2000 // 2 seconds fail fast
    });
    console.log('💚 MongoDB connected successfully!');
    isMockMode = false;
    
    // Compile models
    UserModel = mongoose.model('User', UserSchema);
    QuizModel = mongoose.model('Quiz', QuizSchema);
    ProgressModel = mongoose.model('Progress', ProgressSchema);
    HomeworkModel = mongoose.model('Homework', HomeworkSchema);
    ReminderModel = mongoose.model('Reminder', ReminderSchema);
    ClassModel = mongoose.model('Class', ClassSchema);
    SubjectModel = mongoose.model('Subject', SubjectSchema);
    ChapterModel = mongoose.model('Chapter', ChapterSchema);
    TopicModel = mongoose.model('Topic', TopicSchema);
    PendingSyllabusModel = mongoose.model('PendingSyllabus', PendingSyllabusSchema);
    StudentProfileModel = mongoose.model('StudentProfile', StudentProfileSchema);
    ExamModel = mongoose.model('Exam', ExamSchema);
    StudyPlanModel = mongoose.model('StudyPlan', StudyPlanSchema);
    QuizResultModel = mongoose.model('QuizResult', QuizResultSchema);
    AchievementModel = mongoose.model('Achievement', AchievementSchema);
    TeacherModel = mongoose.model('Teacher', TeacherSchema);
    AIAnswerModel = mongoose.model('AIAnswer', AIAnswerSchema);
    
    // Seed default admin in MongoDB if none exists
    const adminCount = await TeacherModel.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      const hashedPassword = bcrypt.hashSync('adminpassword123', 10);
      await TeacherModel.create({
        name: 'System Admin',
        email: 'admin@studybuddy.com',
        password: hashedPassword,
        phone: '0000000000',
        qualification: 'System Administrator',
        specialization: 'System Management',
        institution: 'StudyBuddy Org',
        role: 'admin',
        status: 'approved',
        approvedBy: 'System'
      });
      console.log("🌱 Default Admin successfully seeded in MongoDB!");
    }
    
    // Seed standard quizzes if none exist or if they are the old small ones
    const quizCount = await QuizModel.countDocuments();
    let needsReseed = quizCount === 0;
    if (quizCount > 0) {
      const sampleQuiz = await QuizModel.findOne({});
      if (sampleQuiz && sampleQuiz.questions.length <= 8) {
        needsReseed = true;
      }
    }
    
    if (needsReseed) {
      console.log("🌱 Seeding/Resetting MongoDB quizzes...");
      await QuizModel.deleteMany({});
      const mockDB = { quizzes: [] };
      seedMockQuizzes(mockDB);
      // Map mock format to mongoose
      const formattedQuizzes = mockDB.quizzes.map(q => {
        const { _id, ...rest } = q;
        return rest;
      });
      await QuizModel.insertMany(formattedQuizzes);
      console.log("🌱 MongoDB quizzes seeded!");
    }
  } catch (err) {
    console.log('⚠️ MongoDB connection failed. Falling back to local file-based JSON DB.');
    isMockMode = true;
    const db = readMockDB();
    seedMockQuizzes(db); // Seeds quizzes if db.json is empty

    // Seed default admin in mock DB if none exists
    if (!db.teachers) db.teachers = [];
    if (!db.teachers.some(t => t.role === 'admin')) {
      const hashedPassword = bcrypt.hashSync('adminpassword123', 10);
      db.teachers.push({
        _id: crypto.randomUUID(),
        name: 'System Admin',
        email: 'admin@studybuddy.com',
        password: hashedPassword,
        phone: '0000000000',
        qualification: 'System Administrator',
        specialization: 'System Management',
        institution: 'StudyBuddy Org',
        role: 'admin',
        status: 'approved',
        approvedBy: 'System',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      writeMockDB(db);
      console.log("🌱 Default Admin successfully seeded in JSON Database!");
    }
  }
}

// --- Abstract Data Access Interface ---

// Users API
async function findUserByEmail(email) {
  if (!isMockMode) {
    return await UserModel.findOne({ email: email.toLowerCase() });
  } else {
    const db = readMockDB();
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }
}

async function findUserById(id) {
  if (!isMockMode) {
    return await UserModel.findById(id);
  } else {
    const db = readMockDB();
    return db.users.find(u => u._id === id) || null;
  }
}

async function createUser(userData) {
  if (!isMockMode) {
    const user = new UserModel(userData);
    return await user.save();
  } else {
    const db = readMockDB();
    const newUser = {
      _id: crypto.randomUUID(),
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.users.push(newUser);
    writeMockDB(db);
    return newUser;
  }
}

async function updateUser(id, updateData) {
  let updatedUser;
  if (!isMockMode) {
    updatedUser = await UserModel.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  } else {
    const db = readMockDB();
    const userIndex = db.users.findIndex(u => u._id === id);
    if (userIndex === -1) return null;
    
    // Deep merge profile updates
    const user = db.users[userIndex];
    if (updateData.studentProfile) {
      user.studentProfile = { ...user.studentProfile, ...updateData.studentProfile };
    }
    if (updateData.parentProfile) {
      user.parentProfile = { ...user.parentProfile, ...updateData.parentProfile };
    }
    
    // Merge standard properties
    Object.keys(updateData).forEach(key => {
      if (key !== 'studentProfile' && key !== 'parentProfile') {
        user[key] = updateData[key];
      }
    });
    
    user.updatedAt = new Date().toISOString();
    db.users[userIndex] = user;
    writeMockDB(db);
    updatedUser = user;
  }

  // Sync to separate StudentProfile if studentProfile was updated
  if (updatedUser && updatedUser.role === 'student' && updatedUser.studentProfile) {
    try {
      if (!isMockMode) {
        await StudentProfileModel.findOneAndUpdate(
          { userId: id },
          {
            $set: {
              name: updatedUser.name,
              classNum: Number(updatedUser.studentProfile.class),
              schoolName: updatedUser.studentProfile.schoolName || '',
              schoolType: updatedUser.studentProfile.schoolType || 'Public',
              board: updatedUser.studentProfile.board || 'SSC',
              preferredLanguage: updatedUser.studentProfile.preferredLanguage || 'English',
              streak: Number(updatedUser.studentProfile.streak || 0),
              xp: Number(updatedUser.studentProfile.xp || 0),
              coins: Number(updatedUser.studentProfile.coins || 0)
            }
          },
          { upsert: true, new: true }
        );
      } else {
        const db = readMockDB();
        if (!db.studentProfiles) db.studentProfiles = [];
        const spIdx = db.studentProfiles.findIndex(sp => sp.userId === id);
        const existingSp = spIdx > -1 ? db.studentProfiles[spIdx] : {};
        const updatedSp = {
          ...existingSp,
          userId: id,
          name: updatedUser.name,
          classNum: Number(updatedUser.studentProfile.class),
          schoolName: updatedUser.studentProfile.schoolName || '',
          schoolType: updatedUser.studentProfile.schoolType || 'Public',
          board: updatedUser.studentProfile.board || 'SSC',
          preferredLanguage: updatedUser.studentProfile.preferredLanguage || 'English',
          streak: Number(updatedUser.studentProfile.streak || 0),
          xp: Number(updatedUser.studentProfile.xp || 0),
          coins: Number(updatedUser.studentProfile.coins || 0),
          updatedAt: new Date().toISOString()
        };
        if (spIdx > -1) {
          db.studentProfiles[spIdx] = updatedSp;
        } else {
          updatedSp._id = crypto.randomUUID();
          updatedSp.createdAt = new Date().toISOString();
          db.studentProfiles.push(updatedSp);
        }
        writeMockDB(db);
      }
    } catch (err) {
      console.error("⚠️ Failed to sync StudentProfile during updateUser:", err.message);
    }
  }

  return updatedUser;
}

// Quizzes API
async function getQuizzesByClass(classNum) {
  if (!isMockMode) {
    return await QuizModel.find({ class: Number(classNum) });
  } else {
    const db = readMockDB();
    return db.quizzes.filter(q => q.class === Number(classNum));
  }
}

async function getQuizById(id) {
  if (!isMockMode) {
    return await QuizModel.findById(id);
  } else {
    const db = readMockDB();
    return db.quizzes.find(q => q._id === id) || null;
  }
}

// Progress API
async function saveProgress(progressData) {
  if (!isMockMode) {
    const progress = new ProgressModel(progressData);
    return await progress.save();
  } else {
    const db = readMockDB();
    const newProgress = {
      _id: crypto.randomUUID(),
      ...progressData,
      date: new Date().toISOString()
    };
    db.progress.push(newProgress);
    writeMockDB(db);
    return newProgress;
  }
}

async function getProgressByUser(userId) {
  if (!isMockMode) {
    return await ProgressModel.find({ userId: userId }).sort({ date: -1 });
  } else {
    const db = readMockDB();
    return db.progress
      .filter(p => p.userId === userId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

// Homework API
async function getHomeworkByUser(userId) {
  if (!isMockMode) {
    return await HomeworkModel.find({ userId: userId }).sort({ createdAt: -1 });
  } else {
    const db = readMockDB();
    return db.homeworks
      .filter(h => h.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

async function createHomework(homeworkData) {
  if (!isMockMode) {
    const homework = new HomeworkModel(homeworkData);
    return await homework.save();
  } else {
    const db = readMockDB();
    const newHomework = {
      _id: crypto.randomUUID(),
      completed: false,
      ...homeworkData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.homeworks.push(newHomework);
    writeMockDB(db);
    return newHomework;
  }
}

async function updateHomework(homeworkId, completed) {
  if (!isMockMode) {
    return await HomeworkModel.findByIdAndUpdate(homeworkId, { completed }, { new: true });
  } else {
    const db = readMockDB();
    const homeworkIndex = db.homeworks.findIndex(h => h._id === homeworkId);
    if (homeworkIndex === -1) return null;
    db.homeworks[homeworkIndex].completed = completed;
    db.homeworks[homeworkIndex].updatedAt = new Date().toISOString();
    writeMockDB(db);
    return db.homeworks[homeworkIndex];
  }
}

async function deleteHomework(homeworkId) {
  if (!isMockMode) {
    return await HomeworkModel.findByIdAndDelete(homeworkId);
  } else {
    const db = readMockDB();
    const homeworkIndex = db.homeworks.findIndex(h => h._id === homeworkId);
    if (homeworkIndex === -1) return null;
    const deleted = db.homeworks.splice(homeworkIndex, 1);
    writeMockDB(db);
    return deleted[0];
  }
}

async function getAllClasses() {
  if (!isMockMode) {
    const list = await ClassModel.find({}).sort({ classNum: 1 });
    return list.map(c => c.classNum);
  } else {
    const db = readMockDB();
    if (!db.classes) db.classes = [];
    const nums = db.classes.map(c => c.classNum);
    return [...new Set(nums)].sort((a, b) => a - b);
  }
}

async function getSubjectsByClass(classNum) {
  if (!isMockMode) {
    return await SubjectModel.find({ classNum: Number(classNum) }).sort({ name: 1 });
  } else {
    const db = readMockDB();
    if (!db.subjects) db.subjects = [];
    return db.subjects.filter(s => s.classNum === Number(classNum)).sort((a, b) => a.name.localeCompare(b.name));
  }
}

async function getChaptersByClassAndSubject(classNum, subjectName) {
  if (!isMockMode) {
    return await ChapterModel.find({
      classNum: Number(classNum),
      subjectName: new RegExp(`^${subjectName}$`, 'i')
    }).sort({ name: 1 });
  } else {
    const db = readMockDB();
    if (!db.chapters) db.chapters = [];
    return db.chapters.filter(
      c => c.classNum === Number(classNum) && c.subjectName.toLowerCase() === subjectName.toLowerCase()
    ).sort((a, b) => a.name.localeCompare(b.name));
  }
}

async function getTopicsByChapter(classNum, subjectName, chapterName) {
  if (!isMockMode) {
    return await TopicModel.find({
      classNum: Number(classNum),
      subjectName: new RegExp(`^${subjectName}$`, 'i'),
      chapterName: new RegExp(`^${chapterName}$`, 'i')
    }).sort({ name: 1 });
  } else {
    const db = readMockDB();
    if (!db.topics) db.topics = [];
    return db.topics.filter(
      t => t.classNum === Number(classNum) &&
           t.subjectName.toLowerCase() === subjectName.toLowerCase() &&
           t.chapterName.toLowerCase() === chapterName.toLowerCase()
    ).sort((a, b) => a.name.localeCompare(b.name));
  }
}


async function getTopicsByChapterName(chapterName) {
  if (!isMockMode) {
    return await TopicModel.find({ chapterName: new RegExp(`^${chapterName}$`, 'i') }).sort({ name: 1 });
  } else {
    const db = readMockDB();
    if (!db.topics) db.topics = [];
    return db.topics.filter(t => t.chapterName.toLowerCase() === chapterName.toLowerCase()).sort((a, b) => a.name.localeCompare(b.name));
  }
}

async function clearSyllabus() {
  if (!isMockMode) {
    await ClassModel.deleteMany({});
    await SubjectModel.deleteMany({});
    await ChapterModel.deleteMany({});
    await TopicModel.deleteMany({});
  } else {
    const db = readMockDB();
    db.classes = [];
    db.subjects = [];
    db.chapters = [];
    db.topics = [];
    writeMockDB(db);
  }
}

async function bulkInsertSyllabus(syllabusArray) {
  await clearSyllabus();
  
  if (!isMockMode) {
    for (const record of syllabusArray) {
      const classNum = Number(record.class);
      const subjectName = record.subject;
      
      // Upsert Class
      await ClassModel.findOneAndUpdate(
        { classNum },
        { classNum },
        { upsert: true, new: true }
      );
      
      // Create Subject
      await SubjectModel.create({ classNum, name: subjectName });
      
      if (record.chapters && Array.isArray(record.chapters)) {
        for (const ch of record.chapters) {
          const chapterName = ch.name;
          // Create Chapter
          await ChapterModel.create({ classNum, subjectName, name: chapterName });
          
          if (ch.topics && Array.isArray(ch.topics)) {
            for (const tName of ch.topics) {
              // Create Topic
              await TopicModel.create({ classNum, subjectName, chapterName, name: tName });
            }
          }
        }
      }
    }
  } else {
    const db = readMockDB();
    
    for (const record of syllabusArray) {
      const classNum = Number(record.class);
      const subjectName = record.subject;
      
      if (!db.classes.find(c => c.classNum === classNum)) {
        db.classes.push({ _id: crypto.randomUUID(), classNum });
      }
      
      const subId = crypto.randomUUID();
      db.subjects.push({ _id: subId, classNum, name: subjectName });
      
      if (record.chapters && Array.isArray(record.chapters)) {
        for (const ch of record.chapters) {
          const chapterName = ch.name;
          const chId = crypto.randomUUID();
          db.chapters.push({ _id: chId, classNum, subjectName, name: chapterName });
          
          if (ch.topics && Array.isArray(ch.topics)) {
            for (const tName of ch.topics) {
              db.topics.push({
                _id: crypto.randomUUID(),
                classNum,
                subjectName,
                chapterName,
                name: tName
              });
            }
          }
        }
      }
    }
    writeMockDB(db);
  }
}

async function getFullSyllabusForClass(classNum) {
  const subjects = await getSubjectsByClass(classNum);
  const result = [];
  
  for (const sub of subjects) {
    const chapters = await getChaptersByClassAndSubject(classNum, sub.name);
    const chapterList = [];
    
    for (const ch of chapters) {
      const topics = await getTopicsByChapter(classNum, sub.name, ch.name);
      chapterList.push({
        name: ch.name,
        topics: topics.map(t => t.name)
      });
    }
    
    result.push({
      class: Number(classNum),
      subject: sub.name,
      chapters: chapterList
    });
  }
  return result;
}

async function getSyllabusByClassAndSubject(classNum, subjectName) {
  const chapters = await getChaptersByClassAndSubject(classNum, subjectName);
  if (chapters.length === 0) return null;
  
  const chapterList = [];
  for (const ch of chapters) {
    const topics = await getTopicsByChapter(classNum, subjectName, ch.name);
    chapterList.push({
      name: ch.name,
      topics: topics.map(t => t.name)
    });
  }
  
  return {
    class: Number(classNum),
    subject: subjectName,
    chapters: chapterList
  };
}

async function getSyllabusByClass(classNum) {
  return await getFullSyllabusForClass(classNum);
}

async function getReminderByUser(userId) {
  if (!isMockMode) {
    return await ReminderModel.findOne({ userId });
  } else {
    const db = readMockDB();
    if (!db.reminders) db.reminders = [];
    return db.reminders.find(r => r.userId === userId) || null;
  }
}

async function saveReminder(userId, time, active = true) {
  if (!isMockMode) {
    return await ReminderModel.findOneAndUpdate(
      { userId },
      { time, active },
      { new: true, upsert: true }
    );
  } else {
    const db = readMockDB();
    if (!db.reminders) db.reminders = [];
    const index = db.reminders.findIndex(r => r.userId === userId);
    const newReminder = { userId, time, active, updatedAt: new Date().toISOString() };
    if (index > -1) {
      db.reminders[index] = { ...db.reminders[index], ...newReminder };
    } else {
      newReminder._id = crypto.randomUUID();
      db.reminders.push(newReminder);
    }
    writeMockDB(db);
    return index > -1 ? db.reminders[index] : newReminder;
  }
}

// --- Ingestion System Helper Functions ---
async function createPendingSyllabus(data) {
  if (!isMockMode) {
    const pending = new PendingSyllabusModel(data);
    return await pending.save();
  } else {
    const db = readMockDB();
    if (!db.pendingSyllabuses) db.pendingSyllabuses = [];
    const newPending = {
      _id: crypto.randomUUID(),
      status: 'pending',
      logs: [],
      errorReport: '',
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.pendingSyllabuses.push(newPending);
    writeMockDB(db);
    return newPending;
  }
}

async function getPendingSyllabuses() {
  if (!isMockMode) {
    return await PendingSyllabusModel.find({}).sort({ createdAt: -1 });
  } else {
    const db = readMockDB();
    if (!db.pendingSyllabuses) db.pendingSyllabuses = [];
    return [...db.pendingSyllabuses].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

async function getPendingSyllabusById(id) {
  if (!isMockMode) {
    return await PendingSyllabusModel.findById(id);
  } else {
    const db = readMockDB();
    if (!db.pendingSyllabuses) db.pendingSyllabuses = [];
    return db.pendingSyllabuses.find(p => p._id === id) || null;
  }
}

async function updatePendingSyllabusStatus(id, status, extraFields = {}) {
  if (!isMockMode) {
    return await PendingSyllabusModel.findByIdAndUpdate(id, { $set: { status, ...extraFields } }, { new: true });
  } else {
    const db = readMockDB();
    if (!db.pendingSyllabuses) db.pendingSyllabuses = [];
    const idx = db.pendingSyllabuses.findIndex(p => p._id === id);
    if (idx === -1) return null;
    db.pendingSyllabuses[idx] = {
      ...db.pendingSyllabuses[idx],
      status,
      ...extraFields,
      updatedAt: new Date().toISOString()
    };
    writeMockDB(db);
    return db.pendingSyllabuses[idx];
  }
}

async function deletePendingSyllabus(id) {
  if (!isMockMode) {
    return await PendingSyllabusModel.findByIdAndDelete(id);
  } else {
    const db = readMockDB();
    if (!db.pendingSyllabuses) db.pendingSyllabuses = [];
    const idx = db.pendingSyllabuses.findIndex(p => p._id === id);
    if (idx === -1) return null;
    const deleted = db.pendingSyllabuses.splice(idx, 1);
    writeMockDB(db);
    return deleted[0];
  }
}

async function publishPendingSyllabusData(classNum, subjectName, extractedData) {
  classNum = Number(classNum);
  if (!isMockMode) {
    // 1. Ensure Class exists
    await ClassModel.findOneAndUpdate(
      { classNum },
      { classNum },
      { upsert: true, new: true }
    );

    // 2. Ensure Subject exists
    let subject = await SubjectModel.findOne({
      classNum,
      name: new RegExp(`^${subjectName}$`, 'i')
    });
    if (!subject) {
      subject = await SubjectModel.create({ classNum, name: subjectName });
    }

    // 3. Process each chapter
    for (const ch of extractedData) {
      const chapterName = ch.chapterName;
      let chapter = await ChapterModel.findOne({
        classNum,
        subjectName: subject.name,
        name: new RegExp(`^${chapterName}$`, 'i')
      });
      if (!chapter) {
        chapter = await ChapterModel.create({ classNum, subjectName: subject.name, name: chapterName });
      }

      // Process topics
      if (ch.topics && Array.isArray(ch.topics)) {
        for (const tName of ch.topics) {
          const topicExists = await TopicModel.findOne({
            classNum,
            subjectName: subject.name,
            chapterName: chapter.name,
            name: new RegExp(`^${tName}$`, 'i')
          });
          if (!topicExists) {
            await TopicModel.create({
              classNum,
              subjectName: subject.name,
              chapterName: chapter.name,
              name: tName
            });
          }
        }
      }
    }
  } else {
    const db = readMockDB();
    if (!db.classes) db.classes = [];
    if (!db.subjects) db.subjects = [];
    if (!db.chapters) db.chapters = [];
    if (!db.topics) db.topics = [];

    // 1. Ensure Class exists
    if (!db.classes.find(c => c.classNum === classNum)) {
      db.classes.push({ _id: crypto.randomUUID(), classNum });
    }

    // 2. Ensure Subject exists
    let subject = db.subjects.find(s => s.classNum === classNum && s.name.toLowerCase() === subjectName.toLowerCase());
    if (!subject) {
      subject = { _id: crypto.randomUUID(), classNum, name: subjectName };
      db.subjects.push(subject);
    }

    // 3. Process each chapter
    for (const ch of extractedData) {
      const chapterName = ch.chapterName;
      let chapter = db.chapters.find(
        c => c.classNum === classNum &&
             c.subjectName.toLowerCase() === subject.name.toLowerCase() &&
             c.name.toLowerCase() === chapterName.toLowerCase()
      );
      if (!chapter) {
        chapter = { _id: crypto.randomUUID(), classNum, subjectName: subject.name, name: chapterName };
        db.chapters.push(chapter);
      }

      // Process topics
      if (ch.topics && Array.isArray(ch.topics)) {
        for (const tName of ch.topics) {
          const topicExists = db.topics.find(
            t => t.classNum === classNum &&
                 t.subjectName.toLowerCase() === subject.name.toLowerCase() &&
                 t.chapterName.toLowerCase() === chapter.name.toLowerCase() &&
                 t.name.toLowerCase() === tName.toLowerCase()
          );
          if (!topicExists) {
            db.topics.push({
              _id: crypto.randomUUID(),
              classNum,
              subjectName: subject.name,
              chapterName: chapter.name,
              name: tName
            });
          }
        }
      }
    }
    writeMockDB(db);
  }
}

// --- Study Buddy Dynamic Helpers ---
async function getStudentProfileByUserId(userId) {
  if (!isMockMode) {
    return await StudentProfileModel.findOne({ userId });
  } else {
    const db = readMockDB();
    if (!db.studentProfiles) db.studentProfiles = [];
    return db.studentProfiles.find(sp => sp.userId === userId) || null;
  }
}

async function saveStudentProfile(userId, profileData) {
  if (!isMockMode) {
    const profile = await StudentProfileModel.findOneAndUpdate(
      { userId },
      { $set: profileData },
      { new: true, upsert: true }
    );
    
    // Sync to User's embedded profile
    try {
      const userUpdates = {};
      if (profileData.name !== undefined) userUpdates.name = profileData.name;
      
      const studentProfileUpdates = {};
      if (profileData.classNum !== undefined) studentProfileUpdates.class = Number(profileData.classNum);
      if (profileData.schoolName !== undefined) studentProfileUpdates.schoolName = profileData.schoolName;
      if (profileData.schoolType !== undefined) studentProfileUpdates.schoolType = profileData.schoolType;
      if (profileData.board !== undefined) studentProfileUpdates.board = profileData.board;
      if (profileData.preferredLanguage !== undefined) studentProfileUpdates.preferredLanguage = profileData.preferredLanguage;
      if (profileData.parentContact !== undefined) studentProfileUpdates.parentContact = profileData.parentContact;
      if (profileData.parentPin !== undefined) studentProfileUpdates.parentPin = profileData.parentPin;
      if (profileData.streak !== undefined) studentProfileUpdates.streak = Number(profileData.streak);
      if (profileData.xp !== undefined) studentProfileUpdates.xp = Number(profileData.xp);
      if (profileData.coins !== undefined) studentProfileUpdates.coins = Number(profileData.coins);
      
      if (Object.keys(studentProfileUpdates).length > 0) {
        const setQuery = {};
        if (userUpdates.name) setQuery.name = userUpdates.name;
        Object.keys(studentProfileUpdates).forEach(k => {
          setQuery[`studentProfile.${k}`] = studentProfileUpdates[k];
        });
        await UserModel.findByIdAndUpdate(userId, { $set: setQuery });
      } else if (userUpdates.name) {
        await UserModel.findByIdAndUpdate(userId, { $set: userUpdates });
      }
    } catch (err) {
      console.error("⚠️ Failed to sync User studentProfile during saveStudentProfile:", err.message);
    }
    
    return profile;
  } else {
    const db = readMockDB();
    if (!db.studentProfiles) db.studentProfiles = [];
    const idx = db.studentProfiles.findIndex(sp => sp.userId === userId);
    
    // Build default values if inserting
    const existing = idx > -1 ? db.studentProfiles[idx] : {};
    
    const updated = {
      userId,
      name: profileData.name !== undefined ? profileData.name : (existing.name || 'Student'),
      classNum: profileData.classNum !== undefined ? Number(profileData.classNum) : (existing.classNum || 6),
      schoolName: profileData.schoolName !== undefined ? profileData.schoolName : (existing.schoolName || ''),
      schoolType: profileData.schoolType !== undefined ? profileData.schoolType : (existing.schoolType || 'Public'),
      board: profileData.board !== undefined ? profileData.board : (existing.board || 'SSC'),
      preferredLanguage: profileData.preferredLanguage !== undefined ? profileData.preferredLanguage : (existing.preferredLanguage || 'English'),
      learningGoals: profileData.learningGoals !== undefined ? profileData.learningGoals : (existing.learningGoals || []),
      weakSubjects: profileData.weakSubjects !== undefined ? profileData.weakSubjects : (existing.weakSubjects || []),
      strongSubjects: profileData.strongSubjects !== undefined ? profileData.strongSubjects : (existing.strongSubjects || []),
      streak: profileData.streak !== undefined ? Number(profileData.streak) : (existing.streak || 0),
      xp: profileData.xp !== undefined ? Number(profileData.xp) : (existing.xp || 0),
      coins: profileData.coins !== undefined ? Number(profileData.coins) : (existing.coins || 0),
      studyTime: profileData.studyTime !== undefined ? Number(profileData.studyTime) : (existing.studyTime || 0),
      updatedAt: new Date().toISOString()
    };
    
    if (idx > -1) {
      db.studentProfiles[idx] = { ...existing, ...updated };
    } else {
      updated._id = crypto.randomUUID();
      updated.createdAt = new Date().toISOString();
      db.studentProfiles.push(updated);
    }
    
    // Sync to User's embedded profile in mock db
    const userIndex = db.users.findIndex(u => u._id === userId);
    if (userIndex > -1) {
      const user = db.users[userIndex];
      if (profileData.name !== undefined) user.name = profileData.name;
      if (!user.studentProfile) user.studentProfile = {};
      
      if (profileData.classNum !== undefined) user.studentProfile.class = Number(profileData.classNum);
      if (profileData.schoolName !== undefined) user.studentProfile.schoolName = profileData.schoolName;
      if (profileData.schoolType !== undefined) user.studentProfile.schoolType = profileData.schoolType;
      if (profileData.board !== undefined) user.studentProfile.board = profileData.board;
      if (profileData.preferredLanguage !== undefined) user.studentProfile.preferredLanguage = profileData.preferredLanguage;
      if (profileData.parentContact !== undefined) user.studentProfile.parentContact = profileData.parentContact;
      if (profileData.parentPin !== undefined) user.studentProfile.parentPin = profileData.parentPin;
      if (profileData.streak !== undefined) user.studentProfile.streak = Number(profileData.streak);
      if (profileData.xp !== undefined) user.studentProfile.xp = Number(profileData.xp);
      if (profileData.coins !== undefined) user.studentProfile.coins = Number(profileData.coins);
      
      user.updatedAt = new Date().toISOString();
      db.users[userIndex] = user;
    }
    
    writeMockDB(db);
    return idx > -1 ? db.studentProfiles[idx] : updated;
  }
}

async function getExamsByUser(userId) {
  if (!isMockMode) {
    return await ExamModel.find({ userId }).sort({ date: 1 });
  } else {
    const db = readMockDB();
    if (!db.exams) db.exams = [];
    return db.exams.filter(e => e.userId === userId).sort((a, b) => a.date.localeCompare(b.date));
  }
}

async function createExam(examData) {
  if (!isMockMode) {
    const exam = new ExamModel(examData);
    return await exam.save();
  } else {
    const db = readMockDB();
    if (!db.exams) db.exams = [];
    const newExam = {
      _id: crypto.randomUUID(),
      ...examData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.exams.push(newExam);
    writeMockDB(db);
    return newExam;
  }
}

async function deleteExam(examId) {
  if (!isMockMode) {
    return await ExamModel.findByIdAndDelete(examId);
  } else {
    const db = readMockDB();
    if (!db.exams) db.exams = [];
    const idx = db.exams.findIndex(e => e._id === examId);
    if (idx === -1) return null;
    const deleted = db.exams.splice(idx, 1);
    writeMockDB(db);
    return deleted[0];
  }
}

async function createStudyPlan(planData) {
  if (!isMockMode) {
    const plan = new StudyPlanModel(planData);
    return await plan.save();
  } else {
    const db = readMockDB();
    if (!db.studyPlans) db.studyPlans = [];
    const newPlan = {
      _id: crypto.randomUUID(),
      ...planData,
      date: new Date().toISOString()
    };
    db.studyPlans.push(newPlan);
    writeMockDB(db);
    return newPlan;
  }
}

async function getStudyPlanByUser(userId) {
  if (!isMockMode) {
    return await StudyPlanModel.find({ userId }).sort({ date: -1 });
  } else {
    const db = readMockDB();
    if (!db.studyPlans) db.studyPlans = [];
    return db.studyPlans.filter(p => p.userId === userId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

async function getActiveStudyPlan(userId, planType) {
  if (!isMockMode) {
    return await StudyPlanModel.findOne({ userId, planType }).sort({ date: -1 });
  } else {
    const db = readMockDB();
    if (!db.studyPlans) db.studyPlans = [];
    const plans = db.studyPlans.filter(p => p.userId === userId && p.planType === planType);
    if (plans.length === 0) return null;
    return plans.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  }
}

async function saveQuizResult(resultData) {
  if (!isMockMode) {
    const result = new QuizResultModel(resultData);
    return await result.save();
  } else {
    const db = readMockDB();
    if (!db.quizResults) db.quizResults = [];
    const newResult = {
      _id: crypto.randomUUID(),
      ...resultData,
      date: new Date().toISOString()
    };
    db.quizResults.push(newResult);
    writeMockDB(db);
    return newResult;
  }
}

async function getQuizResultsByUser(userId) {
  if (!isMockMode) {
    return await QuizResultModel.find({ userId }).sort({ date: -1 });
  } else {
    const db = readMockDB();
    if (!db.quizResults) db.quizResults = [];
    return db.quizResults.filter(q => q.userId === userId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

async function getAchievementsByUser(userId) {
  if (!isMockMode) {
    return await AchievementModel.find({ userId }).sort({ unlockedAt: -1 });
  } else {
    const db = readMockDB();
    if (!db.achievements) db.achievements = [];
    return db.achievements.filter(a => a.userId === userId).sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt));
  }
}

async function unlockAchievement(userId, title, type) {
  if (!isMockMode) {
    const existing = await AchievementModel.findOne({ userId, title });
    if (existing) return existing;
    const ach = new AchievementModel({ userId, title, type });
    return await ach.save();
  } else {
    const db = readMockDB();
    if (!db.achievements) db.achievements = [];
    const existing = db.achievements.find(a => a.userId === userId && a.title === title);
    if (existing) return existing;
    const newAch = {
      _id: crypto.randomUUID(),
      userId,
      title,
      type,
      unlockedAt: new Date().toISOString()
    };
    db.achievements.push(newAch);
    writeMockDB(db);
    return newAch;
  }
}

// --- Teacher Verification System DB Helpers ---

// 1. Teacher APIs
async function findTeacherByEmail(email) {
  if (!isMockMode) {
    return await TeacherModel.findOne({ email: email.toLowerCase() });
  } else {
    const db = readMockDB();
    if (!db.teachers) db.teachers = [];
    return db.teachers.find(t => t.email.toLowerCase() === email.toLowerCase()) || null;
  }
}

async function findTeacherById(id) {
  if (!isMockMode) {
    return await TeacherModel.findById(id);
  } else {
    const db = readMockDB();
    if (!db.teachers) db.teachers = [];
    return db.teachers.find(t => t._id === id) || null;
  }
}

async function createTeacher(teacherData) {
  if (!isMockMode) {
    const teacher = new TeacherModel(teacherData);
    return await teacher.save();
  } else {
    const db = readMockDB();
    if (!db.teachers) db.teachers = [];
    const newTeacher = {
      _id: crypto.randomUUID(),
      ...teacherData,
      role: teacherData.role || 'teacher',
      status: teacherData.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.teachers.push(newTeacher);
    writeMockDB(db);
    return newTeacher;
  }
}

async function updateTeacherStatus(id, status, approvedBy = '') {
  if (!isMockMode) {
    const update = { status };
    if (approvedBy) update.approvedBy = approvedBy;
    return await TeacherModel.findByIdAndUpdate(id, { $set: update }, { new: true });
  } else {
    const db = readMockDB();
    if (!db.teachers) db.teachers = [];
    const idx = db.teachers.findIndex(t => t._id === id);
    if (idx !== -1) {
      db.teachers[idx] = {
        ...db.teachers[idx],
        status,
        approvedBy: approvedBy || db.teachers[idx].approvedBy,
        updatedAt: new Date().toISOString()
      };
      writeMockDB(db);
      return db.teachers[idx];
    }
    return null;
  }
}

async function getAllTeachers() {
  if (!isMockMode) {
    return await TeacherModel.find({}).sort({ createdAt: -1 });
  } else {
    const db = readMockDB();
    if (!db.teachers) db.teachers = [];
    return [...db.teachers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

async function deleteTeacher(id) {
  if (!isMockMode) {
    return await TeacherModel.findByIdAndDelete(id);
  } else {
    const db = readMockDB();
    if (!db.teachers) db.teachers = [];
    const idx = db.teachers.findIndex(t => t._id === id);
    if (idx !== -1) {
      const deleted = db.teachers.splice(idx, 1);
      writeMockDB(db);
      return deleted[0];
    }
    return null;
  }
}

// 2. AIAnswers APIs
async function createAIAnswer(data) {
  if (!isMockMode) {
    const answer = new AIAnswerModel(data);
    return await answer.save();
  } else {
    const db = readMockDB();
    if (!db.aiAnswers) db.aiAnswers = [];
    const newAnswer = {
      _id: crypto.randomUUID(),
      ...data,
      verificationStatus: data.verificationStatus || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.aiAnswers.push(newAnswer);
    writeMockDB(db);
    return newAnswer;
  }
}

async function findAIAnswerById(id) {
  if (!isMockMode) {
    return await AIAnswerModel.findById(id);
  } else {
    const db = readMockDB();
    if (!db.aiAnswers) db.aiAnswers = [];
    return db.aiAnswers.find(a => a._id === id) || null;
  }
}

async function getAIAnswers(filters = {}) {
  if (!isMockMode) {
    const query = {};
    if (filters.class) query.class = Number(filters.class);
    if (filters.subject) query.subject = filters.subject;
    if (filters.chapter) query.chapter = filters.chapter;
    if (filters.verificationStatus) query.verificationStatus = filters.verificationStatus;
    if (filters.search) {
      query.question = new RegExp(filters.search, 'i');
    }
    return await AIAnswerModel.find(query).sort({ createdAt: -1 });
  } else {
    const db = readMockDB();
    if (!db.aiAnswers) db.aiAnswers = [];
    let list = db.aiAnswers;
    if (filters.class) list = list.filter(a => Number(a.class) === Number(filters.class));
    if (filters.subject) list = list.filter(a => a.subject === filters.subject);
    if (filters.chapter) list = list.filter(a => a.chapter === filters.chapter);
    if (filters.verificationStatus) list = list.filter(a => a.verificationStatus === filters.verificationStatus);
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      list = list.filter(a => a.question.toLowerCase().includes(searchLower));
    }
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

async function updateAIAnswerVerification(id, verificationStatus, extraFields = {}) {
  if (!isMockMode) {
    const update = { verificationStatus, ...extraFields };
    return await AIAnswerModel.findByIdAndUpdate(id, { $set: update }, { new: true });
  } else {
    const db = readMockDB();
    if (!db.aiAnswers) db.aiAnswers = [];
    const idx = db.aiAnswers.findIndex(a => a._id === id);
    if (idx !== -1) {
      db.aiAnswers[idx] = {
        ...db.aiAnswers[idx],
        verificationStatus,
        ...extraFields,
        updatedAt: new Date().toISOString()
      };
      writeMockDB(db);
      return db.aiAnswers[idx];
    }
    return null;
  }
}

async function findVerifiedAnswer(questionText, className, subjectName, chapterName) {
  const cleanQ = questionText.trim().toLowerCase().replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s+/g, " ");
  if (!isMockMode) {
    const query = {
      class: Number(className),
      subject: subjectName,
      verificationStatus: { $in: ['approved', 'edited'] }
    };
    const answers = await AIAnswerModel.find(query);
    return answers.find(a => {
      const cleanA = a.question.trim().toLowerCase().replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s+/g, " ");
      return cleanA === cleanQ;
    }) || null;
  } else {
    const db = readMockDB();
    if (!db.aiAnswers) db.aiAnswers = [];
    const list = db.aiAnswers.filter(a => 
      Number(a.class) === Number(className) && 
      a.subject === subjectName && 
      ['approved', 'edited'].includes(a.verificationStatus)
    );
    return list.find(a => {
      const cleanA = a.question.trim().toLowerCase().replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s+/g, " ");
      return cleanA === cleanQ;
    }) || null;
  }
}

async function getAIAnswersStats() {
  if (!isMockMode) {
    const total = await AIAnswerModel.countDocuments();
    const approved = await AIAnswerModel.countDocuments({ verificationStatus: { $in: ['approved', 'edited'] } });
    const pending = await AIAnswerModel.countDocuments({ verificationStatus: 'pending' });
    const rejected = await AIAnswerModel.countDocuments({ verificationStatus: 'rejected' });
    const avgConfRes = await AIAnswerModel.aggregate([
      { $group: { _id: null, avgConf: { $avg: '$confidenceScore' } } }
    ]);
    const avgConfidence = avgConfRes.length > 0 ? Math.round(avgConfRes[0].avgConf) : 0;
    return { total, approved, pending, rejected, avgConfidence };
  } else {
    const db = readMockDB();
    if (!db.aiAnswers) db.aiAnswers = [];
    const total = db.aiAnswers.length;
    const approved = db.aiAnswers.filter(a => ['approved', 'edited'].includes(a.verificationStatus)).length;
    const pending = db.aiAnswers.filter(a => a.verificationStatus === 'pending').length;
    const rejected = db.aiAnswers.filter(a => a.verificationStatus === 'rejected').length;
    let avgConfidence = 0;
    if (total > 0) {
      const sum = db.aiAnswers.reduce((s, a) => s + (a.confidenceScore || 0), 0);
      avgConfidence = Math.round(sum / total);
    }
    return { total, approved, pending, rejected, avgConfidence };
  }
}

module.exports = {
  connectDB,
  isMockMode: () => isMockMode,
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  getQuizzesByClass,
  getQuizById,
  saveProgress,
  getProgressByUser,
  getHomeworkByUser,
  createHomework,
  updateHomework,
  deleteHomework,
  getSyllabusByClassAndSubject,
  getSyllabusByClass,
  clearSyllabus,
  getReminderByUser,
  saveReminder,
  
  // Expose new helpers
  getAllClasses,
  getSubjectsByClass,
  getChaptersByClassAndSubject,
  getTopicsByChapter,
  getTopicsByChapterName,
  bulkInsertSyllabus,
  getFullSyllabusForClass,

  // Ingestion helpers
  createPendingSyllabus,
  getPendingSyllabuses,
  getPendingSyllabusById,
  updatePendingSyllabusStatus,
  deletePendingSyllabus,
  publishPendingSyllabusData,

  // Study Buddy dynamic helpers
  getStudentProfileByUserId,
  saveStudentProfile,
  getExamsByUser,
  createExam,
  deleteExam,
  createStudyPlan,
  getStudyPlanByUser,
  getActiveStudyPlan,
  saveQuizResult,
  getQuizResultsByUser,
  getAchievementsByUser,
  unlockAchievement,

  // Teacher Verification System Helpers
  findTeacherByEmail,
  findTeacherById,
  createTeacher,
  updateTeacherStatus,
  getAllTeachers,
  deleteTeacher,
  createAIAnswer,
  findAIAnswerById,
  getAIAnswers,
  updateAIAnswerVerification,
  findVerifiedAnswer,
  getAIAnswersStats
};
