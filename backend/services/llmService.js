const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const LOCAL_QUIZ_HINDI = {
  title: "हिंदी व्याकरण अभ्यास प्रश्नोत्तरी",
  questions: [
    { type: "mcq", question: "हिंदी वर्णमाला में कितने स्वर होते हैं?", options: ["11", "13", "33", "52"], correctAnswerIndex: 0, explanation: "हिंदी वर्णमाला में मूल रूप से 11 स्वर होते हैं।" },
    { type: "mcq", question: "निम्नलिखित में से संज्ञा शब्द कौन सा है?", options: ["सुंदर", "लिखना", "दिल्ली", "धीरे-धीरे"], correctAnswerIndex: 2, explanation: "दिल्ली एक व्यक्तिवाचक संज्ञा है।" },
    { type: "mcq", question: "सूर्योदय का संधि विच्छेद क्या होगा?", options: ["सूर्य + उदय", "सूर्य + दय", "सूर्यो + उदय", "सूर + उदय"], correctAnswerIndex: 0, explanation: "सूर्य + उदय मिलकर सूर्योदय बनता है (गुण संधि)।" },
    { type: "mcq", question: "अग्नि का पर्यायवाची शब्द क्या है?", options: ["जल", "पवन", "अनल", "गगन"], correctAnswerIndex: 2, explanation: "अग्नि का पर्यायवाची अनल है।" },
    { type: "mcq", question: "सूरदास ने मुख्य रूप से किस भाषा में रचनाएँ की हैं?", options: ["अवधी", "खड़ी बोली", "ब्रजभाषा", "मैथिली"], correctAnswerIndex: 2, explanation: "सूरदास की अधिकांश रचनाएँ ब्रजभाषा में हैं।" },
    { type: "mcq", question: "काल के कितने भेद होते हैं?", options: ["दो", "तीन", "चार", "पांच"], correctAnswerIndex: 1, explanation: "काल के तीन भेद होते हैं: भूतकाल, वर्तमानकाल और भविष्यकाल।" },
    { type: "mcq", question: "गंगा भारत की पवित्र नदी है - इसमें 'गंगा' कौन सी संज्ञा है?", options: ["जातिवाचक", "भाववाचक", "समूहवाचक", "व्यक्तिवाचक"], correctAnswerIndex: 3, explanation: "गंगा एक विशेष नदी का नाम है, इसलिए यह व्यक्तिवाचक संज्ञा है।" },
    { type: "mcq", question: "निम्नलिखित में से अशुद्ध शब्द कौन सा है?", options: ["कवि", "कवयित्री", "उज्ज्वल", "कविइत्री"], correctAnswerIndex: 3, explanation: "कविइत्री अशुद्ध रूप है, शुद्ध रूप कवयित्री है।" },
    { type: "mcq", question: "जो सब कुछ जानता हो, उसे क्या कहते हैं?", options: ["अल्पज्ञ", "सर्वज्ञ", "विद्वान", "ज्ञानी"], correctAnswerIndex: 1, explanation: "सब कुछ जानने वाले को सर्वज्ञ कहा जाता है।" },
    { type: "mcq", question: "आँखों का तारा होना मुहावरे का क्या अर्थ है?", options: ["बहुत प्यारा होना", "दूर होना", "अंधा होना", "कम दिखना"], correctAnswerIndex: 0, explanation: "आँखों का तारा होने का अर्थ है अत्यधिक प्रिय या बहुत प्यारा होना।" }
  ]
};

const LOCAL_QUIZ_TELUGU = {
  title: "తెలుగు వ్యాకరణ సాధన క్విజ్",
  questions: [
    { type: "mcq", question: "తెలుగు భాషలో మొత్తం ఎన్ని అచ్చులు ఉన్నాయి?", options: ["12", "16", "36", "56"], correctAnswerIndex: 1, explanation: "తెలుగు వర్ణమాలలో 16 అచ్చులు ఉన్నాయి." },
    { type: "mcq", question: "క్రింది వాటిలో నామవాచకం (Noun) ఏది?", options: ["రాముడు", "వెళ్ళాడు", "అక్కడ", "అందమైన"], correctAnswerIndex: 0, explanation: "రాముడు అనేది ఒక వ్యక్తి పేరు, కాబట్టి ఇది నామవాచకం." },
    { type: "mcq", question: "సూర్యోదయం ఏ సంధి?", options: ["సవర్ణదీర్ఘ సంధి", "గుణ సంధి", "యణాదేశ సంధి", "వృద్ధి సంధి"], correctAnswerIndex: 1, explanation: "సూర్య + ఉదయం = సూర్యోదయం (గుణ సంధి)." },
    { type: "mcq", question: "భానుడు అంటే అర్థం ఏమిటి?", options: ["చంద్రుడు", "సూర్యుడు", "నక్షత్రం", "ఆకాశం"], correctAnswerIndex: 1, explanation: "భానుడు అనగా సూర్యుడు." },
    { type: "mcq", question: "తెలుగు వర్ణమాలలో హల్లులు ఎన్ని?", options: ["16", "37", "56", "21"], correctAnswerIndex: 1, explanation: "తెలుగు వర్ణమాలలో హల్లులు 37 ఉన్నాయి." },
    { type: "mcq", question: "క్రియా పదం (Verb) ఏది?", options: ["అతడు", "చదివాడు", "రాము", "పెద్ద"], correctAnswerIndex: 1, explanation: "చదివాడు అనేది ఒక పనిని సూచిస్తుంది, కాబట్టి ఇది క్రియా పదం." },
    { type: "mcq", question: "తెలుగులో విభక్తులు ఎన్ని రకాలు?", options: ["5", "6", "7", "8"], correctAnswerIndex: 3, explanation: "తెలుగులో ప్రథమా విభక్తి నుండి సంబోధనా ప్రథమా విభక్తి వరకు మొత్తం 8 విభక్తులు ఉన్నాయి." },
    { type: "mcq", question: "అమ్మకు సమానమైన దైవం లేదు - ఇందులో అమ్మ ఏ లింగం?", options: ["పుంలింగం", "స్త్రీలింగం", "నపుంసకలింగం", "మహద్వాచకం"], correctAnswerIndex: 1, explanation: "అమ్మ అనేది స్త్రీలింగ పదం." },
    { type: "mcq", question: "రామాయణం కావ్యాన్ని రాసిన కవి ఎవరు?", options: ["వ్యాసుడు", "వాల్మీకి", "కాళిదాసు", "నన్నయ"], correctAnswerIndex: 1, explanation: "రామాయణాన్ని సంస్కృతంలో వాల్మీకి మహర్షి రచించారు." },
    { type: "mcq", question: "తెలుగు తిథులలో మొదటిది ఏది?", options: ["పాడ్యమి", "తదియ", "విదియ", "చవితి"], correctAnswerIndex: 0, explanation: "తెలుగు తిథులలో మొదటి తిథి పాడ్యమి." }
  ]
};

// Local model dataset for offline fallback
const LOCAL_QUIZZES_EN = {
  Hindi: LOCAL_QUIZ_HINDI,
  Telugu: LOCAL_QUIZ_TELUGU,
  Mathematics: {
    title: "Mathematics Practice Quiz",
    questions: [
      { type: "mcq", question: "Solve for x: 3x - 7 = 14.", options: ["7", "6", "5", "8"], correctAnswerIndex: 0, explanation: "Add 7 to both sides: 3x = 21, then divide by 3: x = 7." },
      { type: "mcq", question: "Simplify the expression: (2/3) + (1/4)", options: ["11/12", "3/7", "5/12", "3/4"], correctAnswerIndex: 0, explanation: "Find the common denominator (12): 8/12 + 3/12 = 11/12." },
      { type: "tf", question: "The sum of angles in a quadrilateral is 360 degrees.", options: ["True", "False"], correctAnswerIndex: 0, explanation: "Any quadrilateral can be split into two triangles, each having 180 degrees, totaling 360 degrees." },
      { type: "mcq", question: "What is the area of a triangle with a base of 8 cm and a height of 5 cm?", options: ["40 sq cm", "20 sq cm", "13 sq cm", "10 sq cm"], correctAnswerIndex: 1, explanation: "Area = 0.5 x base x height = 0.5 x 8 x 5 = 20 sq cm." },
      { type: "mcq", question: "Solve for y: 5y - 12 = 3y + 8.", options: ["5", "10", "4", "2"], correctAnswerIndex: 1, explanation: "Subtract 3y from both sides: 2y - 12 = 8. Add 12: 2y = 20. Divide by 2: y = 10." },
      { type: "mcq", question: "If a circle has a radius of 7 cm, what is its approximate circumference? (Use pi = 22/7)", options: ["44 cm", "154 cm", "22 cm", "88 cm"], correctAnswerIndex: 0, explanation: "Circumference = 2 * pi * r = 2 * (22/7) * 7 = 44 cm." },
      { type: "mcq", question: "What is 15% of 400?", options: ["40", "50", "60", "70"], correctAnswerIndex: 2, explanation: "15% of 400 is (15/100) * 400 = 60." },
      { type: "mcq", question: "The diagonal of a rectangle with length 8 cm and width 6 cm is:", options: ["10 cm", "14 cm", "48 cm", "12 cm"], correctAnswerIndex: 0, explanation: "By Pythagoras theorem, diagonal = sqrt(8^2 + 6^2) = sqrt(64 + 36) = sqrt(100) = 10 cm." },
      { type: "mcq", question: "What is the value of x if x^2 - 9 = 0 and x > 0?", options: ["3", "9", "6", "1"], correctAnswerIndex: 0, explanation: "x^2 = 9. Since x > 0, x = sqrt(9) = 3." },
      { type: "mcq", question: "If the ratio of two numbers is 3:5 and their sum is 80, what is the smaller number?", options: ["30", "50", "24", "40"], correctAnswerIndex: 0, explanation: "Let the numbers be 3a and 5a. 3a + 5a = 8a = 80 => a = 10. The smaller number is 3a = 30." }
    ]
  },
  Science: {
    title: "Science Practice Quiz",
    questions: [
      { type: "mcq", question: "Which gas do plants absorb during photosynthesis?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], correctAnswerIndex: 1, explanation: "Plants take in Carbon Dioxide (CO2) from the air and release Oxygen (O2)." },
      { type: "tf", question: "The Earth goes around the Sun.", options: ["True", "False"], correctAnswerIndex: 0, explanation: "Yes, the Earth orbit takes 365 days." },
      { type: "mcq", question: "What is the chemical formula for water?", options: ["CO2", "H2O", "O2", "NaCl"], correctAnswerIndex: 1, explanation: "Water consists of 2 Hydrogen atoms and 1 Oxygen atom." },
      { type: "mcq", question: "Which planet is closest to the Sun?", options: ["Earth", "Venus", "Mars", "Mercury"], correctAnswerIndex: 3, explanation: "Mercury is the nearest planet to the Sun." },
      { type: "mcq", question: "What is the primary source of energy for Earth?", options: ["Wind", "Coal", "The Sun", "Nuclear"], correctAnswerIndex: 2, explanation: "The Sun is the main source of light and heat energy." },
      { type: "tf", question: "Sound travels faster in water than in air.", options: ["True", "False"], correctAnswerIndex: 0, explanation: "Sound waves travel faster in liquids like water than in gases like air." },
      { type: "mcq", question: "Which organ pumps blood in the human body?", options: ["Lungs", "Brain", "Heart", "Kidney"], correctAnswerIndex: 2, explanation: "The heart pumps oxygenated blood throughout the body." },
      { type: "mcq", question: "What state of matter is water vapor?", options: ["Solid", "Liquid", "Gas", "Plasma"], correctAnswerIndex: 2, explanation: "Water vapor is water in gaseous form." },
      { type: "tf", question: "Gravity is the force that pulls things down.", options: ["True", "False"], correctAnswerIndex: 0, explanation: "Gravity is the force of attraction that pulls objects toward the Earth's center." },
      { type: "mcq", question: "Which gas do we breathe out?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Argon"], correctAnswerIndex: 1, explanation: "Humans inhale Oxygen and exhale Carbon Dioxide." }
    ]
  },
  default: {
    title: "General Knowledge Quiz",
    questions: [
      { type: "mcq", question: "Which animal is known as the Ship of the Desert?", options: ["Horse", "Elephant", "Camel", "Lion"], correctAnswerIndex: 2, explanation: "The Camel is adapted to desert life." },
      { type: "tf", question: "Study Buddy is your personal tutor.", options: ["True", "False"], correctAnswerIndex: 0, explanation: "Study Buddy is here to help you learn!" },
      { type: "mcq", question: "Which is the largest ocean on Earth?", options: ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"], correctAnswerIndex: 2, explanation: "The Pacific Ocean is the largest and deepest ocean." },
      { type: "mcq", question: "How many hours are there in a day?", options: ["12", "24", "48", "60"], correctAnswerIndex: 1, explanation: "A single day contains 24 hours." },
      { type: "tf", question: "The capital of India is New Delhi.", options: ["True", "False"], correctAnswerIndex: 0, explanation: "New Delhi is the official capital of India." },
      { type: "mcq", question: "Which is the tallest animal on Earth?", options: ["Giraffe", "Elephant", "Ostrich", "Blue Whale"], correctAnswerIndex: 0, explanation: "The giraffe is the tallest living terrestrial animal." },
      { type: "mcq", question: "How many colors are in a rainbow?", options: ["5", "6", "7", "8"], correctAnswerIndex: 2, explanation: "A rainbow consists of 7 colors: Violet, Indigo, Blue, Green, Yellow, Orange, Red." },
      { type: "tf", question: "Light travels faster than sound.", options: ["True", "False"], correctAnswerIndex: 0, explanation: "Light travels at 300,000 km/s, while sound travels at 343 m/s in air." },
      { type: "mcq", question: "Which is the largest country in the world by area?", options: ["Canada", "China", "USA", "Russia"], correctAnswerIndex: 3, explanation: "Russia is the largest country, covering over 17 million square kilometers." },
      { type: "mcq", question: "What is the name of our galaxy?", options: ["Andromeda", "Milky Way", "Triangulum", "Sombrero"], correctAnswerIndex: 1, explanation: "Our solar system resides inside the Milky Way galaxy." }
    ]
  }
};

const LOCAL_QUIZZES_HI = {
  Hindi: LOCAL_QUIZ_HINDI,
  Telugu: LOCAL_QUIZ_TELUGU,
  Mathematics: {
    title: "गणित अभ्यास प्रश्नोत्तरी",
    questions: [
      { type: "mcq", question: "x के लिए हल करें: 3x - 7 = 14.", options: ["7", "6", "5", "8"], correctAnswerIndex: 0, explanation: "दोनों पक्षों में 7 जोड़ें: 3x = 21, फिर 3 से विभाजित करें: x = 7।" },
      { type: "mcq", question: "व्यंजक को सरल करें: (2/3) + (1/4)", options: ["11/12", "3/7", "5/12", "3/4"], correctAnswerIndex: 0, explanation: "समान हर (12) ज्ञात करें: 8/12 + 3/12 = 11/12।" },
      { type: "tf", question: "एक चतुर्भुज के कोणों का योग 360 डिग्री होता है।", options: ["सही", "गलत"], correctAnswerIndex: 0, explanation: "किसी भी चतुर्भुज को दो त्रिभुजों में विभाजित किया जा सकता है, जिनमें से प्रत्येक का योग 180 डिग्री होता है, कुल 360 डिग्री होता है।" },
      { type: "mcq", question: "8 सेमी आधार और 5 सेमी ऊंचाई वाले त्रिभुज का क्षेत्रफल क्या है?", options: ["40 वर्ग सेमी", "20 वर्ग सेमी", "13 वर्ग सेमी", "10 वर्ग सेमी"], correctAnswerIndex: 1, explanation: "क्षेत्रफल = 0.5 x आधार x ऊंचाई = 0.5 x 8 x 5 = 20 वर्ग सेमी।" },
      { type: "mcq", question: "y के लिए हल करें: 5y - 12 = 3y + 8.", options: ["5", "10", "4", "2"], correctAnswerIndex: 1, explanation: "दोनों पक्षों से 3y घटाएं: 2y - 12 = 8. 12 जोड़ें: 2y = 20. 2 से विभाजित करें: y = 10।" },
      { type: "mcq", question: "यदि किसी वृत्त की त्रिज्या 7 सेमी है, तो उसकी अनुमानित परिधि क्या है? (pi = 22/7 का प्रयोग करें)", options: ["44 सेमी", "154 सेमी", "22 सेमी", "88 सेमी"], correctAnswerIndex: 0, explanation: "परिधि = 2 * pi * r = 2 * (22/7) * 7 = 44 सेमी।" },
      { type: "mcq", question: "400 का 15% क्या है?", options: ["40", "50", "60", "70"], correctAnswerIndex: 2, explanation: "400 का 15% (15/100) * 400 = 60 होता है।" },
      { type: "mcq", question: "8 सेमी लंबाई और 6 सेमी चौड़ाई वाले आयत का विकर्ण है:", options: ["10 सेमी", "14 सेमी", "48 सेमी", "12 सेमी"], correctAnswerIndex: 0, explanation: "पाइथागोरस प्रमेय द्वारा, विकर्ण = sqrt(8^2 + 6^2) = sqrt(64 + 36) = sqrt(100) = 10 सेमी।" },
      { type: "mcq", question: "यदि x^2 - 9 = 0 और x > 0 है, तो x का मान क्या है?", options: ["3", "9", "6", "1"], correctAnswerIndex: 0, explanation: "x^2 = 9. चूंकि x > 0, x = sqrt(9) = 3।" },
      { type: "mcq", question: "यदि दो संख्याओं का अनुपात 3:5 है और उनका योग 80 है, तो छोटी संख्या क्या है?", options: ["30", "50", "24", "40"], correctAnswerIndex: 0, explanation: "संख्याओं को 3a और 5a मान लें। 3a + 5a = 8a = 80 => a = 10. छोटी संख्या 3a = 30 है।" }
    ]
  },
  Science: {
    title: "विज्ञान अभ्यास प्रश्नोत्तरी",
    questions: [
      { type: "mcq", question: "पौधे प्रकाश संश्लेषण के दौरान कौन सी गैस अवशोषित करते हैं?", options: ["ऑक्सीजन", "कार्बन डाइऑक्साइड", "नाइट्रोजन", "हाइड्रोजन"], correctAnswerIndex: 1, explanation: "पौधे हवा से कार्बन डाइऑक्साइड (CO2) लेते हैं और ऑक्सीजन (O2) छोड़ते हैं।" },
      { type: "tf", question: "पृथ्वी सूर्य के चारों ओर चक्कर लगाती है।", options: ["सही", "गलत"], correctAnswerIndex: 0, explanation: "हाँ, पृथ्वी की एक परिक्रमा में 365 दिन लगते हैं।" },
      { type: "mcq", question: "जल का रासायनिक सूत्र क्या है?", options: ["CO2", "H2O", "O2", "NaCl"], correctAnswerIndex: 1, explanation: "जल में 2 हाइड्रोजन परमाणु और 1 ऑक्सीजन परमाणु होता है।" },
      { type: "mcq", question: "सूर्य के सबसे निकट कौन सा ग्रह है?", options: ["पृथ्वी", "शुक्र", "मंगल", "बुध"], correctAnswerIndex: 3, explanation: "बुध सूर्य का सबसे करीबी ग्रह है।" },
      { type: "mcq", question: "पृथ्वी के लिए ऊर्जा का प्राथमिक स्रोत क्या है?", options: ["हवा", "कोयला", "सूर्य", "परमाणु ऊर्जा"], correctAnswerIndex: 2, explanation: "सूर्य प्रकाश और ऊष्मा ऊर्जा का मुख्य स्रोत है।" },
      { type: "tf", question: "ध्वनि हवा की तुलना में पानी में तेजी से यात्रा करती है।", options: ["सही", "गलत"], correctAnswerIndex: 0, explanation: "ध्वनि तरंगें गैसों (हवा) की तुलना में द्रवों (पानी) में अधिक तेजी से यात्रा करती हैं।" },
      { type: "mcq", question: "मानव शरीर में कौन सा अंग रक्त पंप करता है?", options: ["फेफड़े", "मस्तिष्क", "हृदय", "गुर्दा"], correctAnswerIndex: 2, explanation: "हृदय पूरे शरीर में ऑक्सीजन युक्त रक्त पंप करता है।" },
      { type: "mcq", question: "जलवाष्प पदार्थ की कौन सी अवस्था है?", options: ["ठोस", "तरल", "गैस", "प्लाज्मा"], correctAnswerIndex: 2, explanation: "जलवाष्प गैस के रूप में पानी होता है।" },
      { type: "tf", question: "गुरुत्वाकर्षण वह बल है जो चीजों को नीचे खींचता है।", options: ["सही", "गलत"], correctAnswerIndex: 0, explanation: "गुरुत्वाकर्षण वह बल है जो सभी वस्तुओं को पृथ्वी के केंद्र की ओर खींचता है।" },
      { type: "mcq", question: "हम कौन सी गैस बाहर छोड़ते हैं?", options: ["ऑक्सीजन", "कार्बन डाइऑक्साइड", "नाइट्रोजन", "आर्गन"], correctAnswerIndex: 1, explanation: "मनुष्य ऑक्सीजन सांस में लेते हैं और कार्बन डाइऑक्साइड छोड़ते हैं।" }
    ]
  },
  default: {
    title: "सामान्य ज्ञान प्रश्नोत्तरी",
    questions: [
      { type: "mcq", question: "किस जानवर को रेगिस्तान का जहाज कहा जाता है?", options: ["घोड़ा", "हाथी", "ऊंत", "शेर"], correctAnswerIndex: 2, explanation: "ऊंट मरुस्थलीय जीवन के लिए पूरी तरह अनुकूलित है।" },
      { type: "tf", question: "स्टडी बडी आपका व्यक्तिगत ट्यूटर है।", options: ["सही", "गलत"], correctAnswerIndex: 0, explanation: "स्टडी बडी आपकी सीखने में मदद के लिए यहाँ है!" },
      { type: "mcq", question: "पृथ्वी पर सबसे बड़ा महासागर कौन सा है?", options: ["अटलांटिक महासागर", "हिंद महासागर", "प्रशांत महासागर", "आर्कटिक महासागर"], correctAnswerIndex: 2, explanation: "प्रशांत महासागर सबसे बड़ा और गहरा महासागर है।" },
      { type: "mcq", question: "एक दिन में कितने घंटे होते हैं?", options: ["12", "24", "48", "60"], correctAnswerIndex: 1, explanation: "एक दिन में कुल 24 घंटे होते हैं।" },
      { type: "tf", question: "भारत की राजधानी नई दिल्ली है।", options: ["सही", "गलत"], correctAnswerIndex: 0, explanation: "नई दिल्ली भारत की आधिकारिक राजधानी है।" },
      { type: "mcq", question: "पृथ्वी पर सबसे लंबा जानवर कौन सा है?", options: ["जिराफ़", "हाथी", "शुतुरमुर्ग", "ब्लू व्हेल"], correctAnswerIndex: 0, explanation: "जिराफ़ दुनिया का सबसे ऊँचा जमीनी जानवर है।" },
      { type: "mcq", question: "इंद्रधनुष में कितने रंग होते हैं?", options: ["5", "6", "7", "8"], correctAnswerIndex: 2, explanation: "इंद्रधनुष में 7 रंग होते हैं: बैंगनी, जामुनी, नीला, हरा, पीला, नारंगी, लाल।" },
      { type: "tf", question: "प्रकाश ध्वनि से तेज यात्रा करता है।", options: ["सही", "गलत"], correctAnswerIndex: 0, explanation: "प्रकाश की गति 300,000 किमी/सेकंड है जबकि हवा में ध्वनि की गति 343 मीटर/सेकंड है।" },
      { type: "mcq", question: "क्षेत्रफल के हिसाब से दुनिया का सबसे बड़ा देश कौन सा है?", options: ["कनाडा", "चीन", "अमेरिका", "रूस"], correctAnswerIndex: 3, explanation: "रूस दुनिया का सबसे बड़ा देश है।" },
      { type: "mcq", question: "हमारी आकाशगंगा का नाम क्या है?", options: ["एंड्रोमेडा", "मिल्की वे", "ट्राइएंगुलम", "सॉम्ब्रेरो"], correctAnswerIndex: 1, explanation: "हमारा सौर मंडल मिल्की वे (दुग्धमेखला) आकाशगंगा में स्थित है।" }
    ]
  }
};

const LOCAL_QUIZZES_TE = {
  Hindi: LOCAL_QUIZ_HINDI,
  Telugu: LOCAL_QUIZ_TELUGU,
  Mathematics: {
    title: "గణిత సాధన క్విజ్",
    questions: [
      { type: "mcq", question: "x విలువను కనుగొనండి: 3x - 7 = 14.", options: ["7", "6", "5", "8"], correctAnswerIndex: 0, explanation: "ఇరువైపులా 7 కలపండి: 3x = 21, తర్వాత 3 తో భాగించండి: x = 7." },
      { type: "mcq", question: "సూక్ష్మీకరించండి: (2/3) + (1/4)", options: ["11/12", "3/7", "5/12", "3/4"], correctAnswerIndex: 0, explanation: "సాధారణ హారం (12) కనుగొనండి: 8/12 + 3/12 = 11/12." },
      { type: "tf", question: "ఒక చతుర్భుజంలోని కోణాల మొత్తం 360 డిగ్రీలు ఉంటుంది.", options: ["సరియైనది", "తప్పు"], correctAnswerIndex: 0, explanation: "ఏదైనా చతుర్భుజాన్ని రెండు త్రిభుజాలుగా విభజించవచ్చు, ప్రతి త్రిభుజం 180 డిగ్రీలను కలిగి ఉండి, మొత్తం 360 డిగ్రీలు అవుతుంది." },
      { type: "mcq", question: "భూమి 8 సెం.మీ మరియు ఎత్తు 5 సెం.మీ కలిగిన త్రిభుజ వైశాల్యం ఎంత?", options: ["40 చ.సెం.మీ", "20 చ.సెం.మీ", "13 చ.సెం.మీ", "10 చ.సెం.మీ"], correctAnswerIndex: 1, explanation: "వైశాల్యం = 0.5 x భూమి x ఎత్తు = 0.5 x 8 x 5 = 20 చ.సెం.మీ." },
      { type: "mcq", question: "y విలువను కనుగొనండి: 5y - 12 = 3y + 8.", options: ["5", "10", "4", "2"], correctAnswerIndex: 1, explanation: "ఇరువైపులా 3y తీసివేయండి: 2y - 12 = 8. 12 కలపండి: 2y = 20. 2 తో భాగించండి: y = 10." },
      { type: "mcq", question: "ఒక వృత్తం వ్యాసార్థం 7 సెం.మీ అయితే, దాని సుమారు చుట్టుకొలత ఎంత? (pi = 22/7 ఉపయోగించండి)", options: ["44 సెం.మీ", "154 సెం.మీ", "22 సెం.మీ", "88 సెం.మీ"], correctAnswerIndex: 0, explanation: "చుట్టుకొలత = 2 * pi * r = 2 * (22/7) * 7 = 44 సెం.మీ." },
      { type: "mcq", question: "400 లో 15% ఎంత?", options: ["40", "50", "60", "70"], correctAnswerIndex: 2, explanation: "400 లో 15% అనగా (15/100) * 400 = 60." },
      { type: "mcq", question: "పొడవు 8 సెం.మీ మరియు వెడల్పు 6 సెం.మీ కలిగిన దీర్ఘచతురస్ర కర్ణం పొడవు ఎంత?", options: ["10 సెం.మీ", "14 సెం.మీ", "48 సెం.మీ", "12 సెం.మీ"], correctAnswerIndex: 0, explanation: "పొడవు 8 సెం.మీ మరియు వెడల్పు 6 సెం.మీ కలిగిన దీర్ఘచతురస్ర కర్ణం పొడవు 10 సెం.మీ." },
      { type: "mcq", question: "x^2 - 9 = 0 మరియు x > 0 అయితే, x విలువ ఎంత?", options: ["3", "9", "6", "1"], correctAnswerIndex: 0, explanation: "x^2 = 9. x > 0 కాబట్టి, x = sqrt(9) = 3." },
      { type: "mcq", question: "రెండు సంఖ్యల నిష్పత్తి 3:5 మరియు వాటి మొత్తం 80 అయితే, చిన్న సంఖ్య ఏది?", options: ["30", "50", "24", "40"], correctAnswerIndex: 0, explanation: "సంఖ్యలను 3a మరియు 5a అనుకుందాం. 3a + 5a = 8a = 80 => a = 10. చిన్న సంఖ్య 3a = 30." }
    ]
  },
  Science: {
    title: "విజ్ఞాన శాస్త్ర సాధన క్విజ్",
    questions: [
      { type: "mcq", question: "కిరణజన్య సంయోగక్రియ సమయంలో మొక్కలు ఏ వాయువును గ్రహిస్తాయి?", options: ["ఆక్సిజన్", "కార్బన్ డయాక్సైడ్", "నైట్రోజన్", "హైడ్రోజన్"], correctAnswerIndex: 1, explanation: "మొక్కలు గాలి నుండి కార్బన్ డయాక్సైడ్ (CO2) ను గ్రహించి ఆక్సిజన్ (O2) ను విడుదల చేస్తాయి." },
      { type: "tf", question: "భూమి సూర్యుని చుట్టూ తిరుగుతుంది.", options: ["సరియైనది", "తప్పు"], correctAnswerIndex: 0, explanation: "అవును, భూమి సూర్యుని చుట్టూ తిరగడానికి 365 రోజులు పడుతుంది." },
      { type: "mcq", question: "నీటి రసాయన సూత్రం ఏమిటి?", options: ["CO2", "H2O", "O2", "NaCl"], correctAnswerIndex: 1, explanation: "నీటి అణువులో 2 హేడ్రోజన్ పరమాణువులు మరియు 1 ఆక్సిజన్ పరమాణువు ఉంటాయి." },
      { type: "mcq", question: "సూర్యునికి అత్యంత దగ్గరగా ఉన్న గ్రహం ఏది?", options: ["భూమి", "శుక్రుడు", "అంగారకుడు", "बुधుడు"], correctAnswerIndex: 3, explanation: "బుధుడు సూర్యునికి అత్యంత సమీపంలో ఉన్న గ్రహం." },
      { type: "mcq", question: "భూమికి ప్రాథమిక శక్తి వనరు ఏది?", options: ["గాలి", "బొగ్గు", "సూర్యుడు", "అణుశక్తి"], correctAnswerIndex: 2, explanation: "సూర్యుడు కాంతి మరియు ఉష్ణ శక్తికి ప్రధాన వనరు." },
      { type: "tf", question: "శబ్దం గాలి కంటే నీటిలో వేగంగా ప్రయాణిస్తుంది.", options: ["సరియైనది", "తప్పు"], correctAnswerIndex: 0, explanation: "శబ్ద తరంగాలు గాలి కంటే నీరు వంటి ద్రవపదార్థాలలో వేగంగా ప్రయాణిస్తాయి." },
      { type: "mcq", question: "మానవ శరీరంలో రక్తాన్ని పంప్ చేసే అవయవం ఏది?", options: ["ఊపిరితిత్తులు", "మెదడు", "గుండె", "కిడ్నీ"], correctAnswerIndex: 2, explanation: "గుండె శరీరం మొత్తానికి రక్తాన్ని పంపుతుంది." },
      { type: "mcq", question: "నీటి ఆవిరి పదార్థం యొక్క ఏ స్థితి?", options: ["ఘన", "ద్రవ", "వాయు", "ప్లాస్మా"], correctAnswerIndex: 2, explanation: "నీటి ఆవిరి అనేది వాయు స్థితిలో ఉన్న నీరు." },
      { type: "tf", question: "గురుత్వాకర్షణ అనేది వస్తువులను కిందికి లాగే శక్తి.", options: ["సరియైనది", "తప్పు"], correctAnswerIndex: 0, explanation: "గురుత్వాకర్షణ వస్తువులను భూమి కేంద్రం వైపునకు ఆకర్షిస్తుంది." },
      { type: "mcq", question: "మనం ఏ వాయువును బయటకు వదులుతాము?", options: ["ఆక్సిజన్", "కార్బన్ డయాక్సైడ్", "నైట్రోజన్", "ఆర్గాన్"], correctAnswerIndex: 1, explanation: "మానవులు ఆక్సిజన్ పీల్చుకుని కార్బన్ డయాక్సైడ్ విడుదల చేస్తారు." }
    ]
  },
  default: {
    title: "సాధారణ జ్ఞాన క్విజ్",
    questions: [
      { type: "mcq", question: "ఎడారి ఓడ అని ఏ జంతువును పిలుస్తారు?", options: ["గుర్రం", "ఏనుగు", "ఒంటె", "సింహం"], correctAnswerIndex: 2, explanation: "ఒంటె ఎడారి జీవితానికి అనుకూలమైన జంతువు." },
      { type: "tf", question: "స్టడీ బడ్డీ మీ వ్యక్తిగత ట్యూటర్.", options: ["సరియైనది", "తప్పు"], correctAnswerIndex: 0, explanation: "మీరు చదువుకోవడానికి సహాయం చేయడానికి స్టడీ బడ్డీ ఎల్లప్పుడూ సిద్ధంగా ఉంటుంది!" },
      { type: "mcq", question: "భూమిపై అతి పెద్ద మహాసముద్రం ఏది?", options: ["అట్లాంటిక్ మహాసముద్రం", "హిందూ మహాసముద్రం", "పసిఫిక్ మహాసముద్రం", "ఆర్క్టిక్ మహాసముద్రం"], correctAnswerIndex: 2, explanation: "పసిఫిక్ మహాసముద్రం భూమిపైనే అత్యంత పెద్దది మరియు లోతైనది." },
      { type: "mcq", question: "రోజుకు ఎన్ని గంటలు ఉంటాయి?", options: ["12", "24", "48", "60"], correctAnswerIndex: 1, explanation: "ఒక రోజుకు 24 గంటలు ఉంటాయి." },
      { type: "tf", question: "భారతదేశ రాజధాని న్యూ ఢిల్లీ.", options: ["సరియైనది", "తప్పు"], correctAnswerIndex: 0, explanation: "భారతదేశ అధికారిక రాజధాని న్యూ ఢిల్లీ." },
      { type: "mcq", question: "భూమిపై అత్యంత పొడవైన జంతువు ఏది?", options: ["జిరాఫీ", "ఏనుగు", "ఉష్ట్రపక్షి", "బ్లూ వేల్"], correctAnswerIndex: 0, explanation: "జిరాఫీ భూమిపై ఉన్న అత్యంత పొడవైన జంతువు." },
      { type: "mcq", question: "ఇంద్రధనుస్సులో ఎన్ని రంగులు ఉంటాయి?", options: ["5", "6", "7", "8"], correctAnswerIndex: 2, explanation: "ఇంద్రధనుస్సులో 7 రంగులు ఉంటాయి (VIBGYOR)." },
      { type: "tf", question: "కాంతి ధ్వని కంటే వేగంగా ప్రయాణిస్తుంది.", options: ["సరియైనది", "తప్పు"], correctAnswerIndex: 0, explanation: "కాంతి సెకనుకు 3,000,000 కి.మీ వేగంతో ప్రయాణిస్తుంది, ధ్వని గాలిలో సెకనుకు 343 మీటర్లు మాత్రమే ప్రయాణిస్తుంది." },
      { type: "mcq", question: "వైశాల్యం పరంగా ప్రపంచంలోనే అతి పెద్ద దేశం ఏది?", options: ["కెనడా", "చైనా", "అమెరికా", "రష్యా"], correctAnswerIndex: 3, explanation: "రష్యా ప్రపంచంలోనే అత్యంత వైశాల్యమున్న దేశం." },
      { type: "mcq", question: "మన గెలాక్సీ పేరు ఏమిటి?", options: ["ఆండ్రోమెడ", "మిల్కీ వే", "ట్రయాంగులమ్", "పాలపుంత"], correctAnswerIndex: 1, explanation: "మన సౌర కుటుంబం మిల్కీ వే (పాలపుంత) గెలాక్సీలో ఉంది." }
    ]
  }
};

const LOCAL_EXAMS = {
  Hindi: {
    quickNotes: [
      "संज्ञा, सर्वनाम, क्रिया और विशेषण के भेदों को ध्यान से पढ़ें।",
      "संधि विच्छेद और मुहावरों का अभ्यास नियमित रूप से करें।"
    ],
    importantQuestions: [
      "सूर्योदय का संधि विच्छेद कीजिए और संधि का नाम बताइए।",
      "संज्ञा किसे कहते हैं? उदाहरण सहित स्पष्ट कीजिए।"
    ],
    revisionPlan: "20 मिनट हिंदी व्याकरण के नियमों का अभ्यास करें और 5 मिनट का ब्रेक लें।"
  },
  Telugu: {
    quickNotes: [
      "తెలుగు వ్యాకరణంలో సంధులు మరియు సమాసాలను బాగా అధ్యయనం చేయండి.",
      "విభక్తులు మరియు వాటి ప్రత్యయాలను గుర్తుంచుకోండి."
    ],
    importantQuestions: [
      "సూర్యోదయం పదాన్ని విడదీసి, సంధి పేరు రాయండి.",
      "నామవాచకం అనగానేమి? రెండు ఉదాహరణలు ఇవ్వండి."
    ],
    revisionPlan: "20 నిమిషాలు తెలుగు వ్యాకరణం మరియు పద్యాలను చదవండి, తర్వాత 5 నిమిషాల విరామం తీసుకోండి."
  },
  Mathematics: {
    quickNotes: [
      "Practice fractions, decimals, and basic percentages.",
      "Remember: Area = Length x Width for rectangles."
    ],
    importantQuestions: [
      "Find the value of x: 4x - 8 = 12.",
      "Calculate the perimeter of a square with side 6cm."
    ],
    revisionPlan: "Spend 25 minutes solving math textbook problems, and take a 5-minute break."
  },
  Science: {
    quickNotes: [
      "Review the process of photosynthesis: plants make food using sunlight.",
      "Remember the three states of matter: Solid, Liquid, Gas."
    ],
    importantQuestions: [
      "Draw and label the parts of a plant cell.",
      "Explain how evaporation changes water into vapor."
    ],
    revisionPlan: "Spend 20 minutes reading your science chapter summaries and drawing diagrams."
  },
  default: {
    quickNotes: [
      "Summarize each chapter section in your own words.",
      "Ask Study Buddy for revision quizzes on difficult topics."
    ],
    importantQuestions: [
      "What are the main concepts covered in your upcoming syllabus?",
      "Solve the summary review questions at the end of the chapter."
    ],
    revisionPlan: "Create a 30-minute study session block and review your notebook highlights."
  }
};

const localTranslations = {
  'Hindi': {
    subjects: {
      'Mathematics': 'गणित',
      'Science': 'विज्ञान',
      'English': 'अंग्रेजी',
      'Social Studies': 'सामाजिक अध्ययन',
      'Telugu': 'तेलुगु',
      'Hindi': 'हिंदी',
      'default': 'सामान्य'
    },
    quiz: {
      text: "एआई वर्तमान में उच्च मांग का सामना कर रहा है। कोई चिंता नहीं! मैंने आपके लिए एक त्वरित स्थानीय अभ्यास प्रश्नोत्तरी तैयार की है। आइए आपके कौशल का परीक्षण करें!",
      title: "अभ्यास प्रश्नोत्तरी",
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
    photosynthesis_response: `हूठ हूठ! 🦉 ऑनलाइन एआई वर्तमान में ऑफ़लाइन है, लेकिन स्टडी बडी **प्रकाश संश्लेषण (Photosynthesis)** के बारे में सब कुछ जानता है! 🌿

प्रकाश संश्लेषण वह प्रक्रिया है जिसका उपयोग हरे पौधे अपना भोजन बनाने के लिए करते हैं:
1. **पानी**: जड़ों द्वारा मिट्टी से लिया जाता है।
2. **कार्बन डाइऑक्साइड**: पत्तियों में छोटे छिद्रों द्वारा हवा से अवशोषित किया जाता है जिन्हें रंध्र (stomata) कहा जाता है।
3. **सूर्य का प्रकाश**: हरे रंग के वर्णक द्वारा ग्रहण किया जाता है जिसे **क्लोरोफिल** कहा जाता है।

सूर्य के प्रकाश की ऊर्जा का उपयोग करके, पौधे पानी और कार्बन डाइऑक्साइड को ग्लूकोज (उनके भोजन) में बदल देते हैं और हमारे सांस लेने के लिए **ऑक्सीजन** छोड़ते हैं!

$$\\text{पानी} + \\text{कार्बन डाइऑक्साइड} \\xrightarrow{\\text{सूर्य का प्रकाश}} \\text{ग्लूकोज} + \\text{ऑक्सीजन}$$`,
    fraction_response: `हूठ हूठ! 🦉 ऑनलाइन एआई वर्तमान में ऑफ़लाइन है, लेकिन आइए मिलकर **भिन्न (Fractions)** की समीक्षा करें! 🔢

भिन्न एक पूरे के हिस्से का प्रतिनिधित्व करता है। इसके दो मुख्य भाग होते हैं:
- **अंश (Numerator - ऊपर की संख्या)**: हमारे पास कितने भाग हैं।
- **हर (Denominator - नीचे की संख्या)**: पूरा हिस्सा कितने बराबर भागों में विभाजित है।

उदाहरण के लिए, यदि आप एक पिज्जा को 4 बराबर स्लाइस में काटते हैं और 1 स्लाइस खाते हैं, तो आपने पिज्जा का $\\frac{1}{4}$ हिस्सा खाया है!`,
    water_cycle_response: `हूठ हूठ! 🦉 ऑनलाइन एआई वर्तमान में ऑफ़लाइन है, लेकिन यहाँ **जल चक्र (Water Cycle)** के लिए एक त्वरित मार्गदर्शिका है! 💧

जल चक्र पृथ्वी की सतह पर, ऊपर और नीचे पानी का निरंतर संचलन है:
1. **वाष्पीकरण (Evaporation)**: सूर्य की गर्मी महासागरों, झीलों और नदियों में पानी को गर्म करती है, जिससे यह भाप में बदल जाता है जो ऊपर तैरती है।
2. **संघनन (Condensation)**: जैसे ही वाष्प ऊपर उठती है, यह ठंडी हो जाती है और वापस पानी की छोटी बूंदों में बदल जाती है, जिससे बादल बनते हैं।
3. **वर्षण (Precipitation)**: जब बादल भारी हो जाते हैं, तो पानी बारिश, बर्फ या ओलों के रूप में पृथ्वी पर वापस गिरता है।
4. **संग्रह (Collection)**: पानी वापस नदियों, झीलों और महासागरों में बह जाता है, चक्र को फिर से शुरू करने के लिए तैयार!`,
    gravity_response: `हूठ हूठ! 🦉 ऑनलाइन एआई वर्तमान में ऑफ़लाइन है, लेकिन आइए **गुरुत्वाकर्षण (Gravity)** के बारे में बात करते हैं! 🌍

गुरुत्वाकर्षण एक अदृश्य खिंचाव बल है जो वस्तुओं को एक-दूसरे की ओर खींचता है।
- यही आपके पैरों को जमीन पर रखता है और सेब को पेड़ों से नीचे गिराता है।
- पृथ्वी में गुरुत्वाकर्षण है, जो सब कुछ अपने केंद्र की ओर खींचता है।
- गुरुत्वाकर्षण ही पृथ्वी को सूर्य के चारों ओर और चंद्रमा को पृथ्वी के चारों ओर चक्कर लगाने में मदद करता है!`,
    cell_response: `हूठ हूठ! 🦉 ऑनलाइन एआई वर्तमान में ऑफ़लाइन है, लेकिन आइए **कोशिका (Cell)** का पता लगाएं! 🔬

कोशिकाएं सभी जीवित चीजों की बुनियादी निर्माण इकाइयां हैं। उन्हें घर बनाने वाली छोटी ईंटों की तरह समझें:
- **एककोशिकीय (Unicellular)**: केवल एक कोशिका से बने जीव (जैसे बैक्टीरिया)।
- **बहुकोशिकीय (Multicellular)**: अरबों कोशिकाओं से बने जीव (जैसे पौधे, जानवर और मनुष्य!)।
- **मुख्य भाग**:
  - *कोशिका झिल्ली (Cell Membrane)*: बाहरी दीवार जो नियंत्रित करती है कि अंदर और बाहर क्या जाता है।
  - *नाभिक (Nucleus)*: डीएनए युक्त कोशिका का मस्तिष्क।
  - *कोशिका द्रव्य (Cytoplasm)*: सब कुछ एक साथ रखने वाला जेली जैसा तरल पदार्थ।`,
    noun_response: `हूठ हूठ! 🦉 ऑनलाइन एआई वर्तमान में ऑफ़लाइन है, लेकिन आइए **संज्ञा (Nouns)** की समीक्षा करें! 📝

संज्ञा एक नामकरण शब्द है। यह किसी व्यक्ति, स्थान, जानवर या वस्तु का नाम बताता है:
- **व्यक्ति**: *शिक्षक, एलेक्स, माँ*
- **स्थान**: *स्कूल, भारत, पार्क*
- **जानवर**: *उल्लू, शेर, कुत्ता*
- **वस्तु**: *किताब, पेंसिल, खिलौना*

उदाहरण के लिए: "**उल्लू** (संज्ञा) ने **स्कूल** (संज्ञा) में एक **किताब** (संज्ञा) पढ़ी।"`,
    zygote_response: `हूठ हूठ! 🦉 ऑनलाइन एआई वर्तमान में ऑफ़लाइन है, लेकिन स्टडी बडी यहाँ आपको **युग्मनज (Zygote)** के बारे में समझाने के लिए है! 🥚🌱

एक **युग्मनज (Zygote)** वह पहली कोशिका है जो तब बनती है जब एक नया जीव (जैसे एक पौधा, जानवर या मनुष्य) अपना जीवन शुरू करता है!

यहाँ बताया गया है कि यह सरल चरणों में कैसे काम करता है:
1. **कोशिकाओं का मिलना (निषेचन)**: एक मादा अंडाणु कोशिका (युग्मक) एक नर शुक्राणु कोशिका (युग्मक) के साथ जुड़ती है।
2. **युग्मनज**: इस मिलन से बनने वाली एकल कोशिका को **युग्मनज** कहा जाता है। यह दोनों माता-पिता की आनुवंशिक सामग्रियों का मिलन है!
3. **निर्देश पुस्तिका**: युग्मनज में जीव के निर्माण के लिए आवश्यक सभी डीएनए (निर्देश) होते हैं—जैसे आंखों का रंग, बालों का रंग, ऊंचाई और बाकी सब कुछ!
4. **विभाजन और विकास**: बहुत जल्दी, यह एकल कोशिका 2 कोशिकाओं में विभाजित होने लगती है, फिर 4, फिर 8, और इसी तरह। जल्द ही, यह कोशिकाओं का एक समूह बन जाता है जिसे **भ्रूण** कहा जाता है, जो एक बच्चे, एक पौधे या एक सुंदर जानवर के रूप में बढ़ता और विकसित होता है!

**सादृश्य**: एक युग्मनज को **स्टार्टर ब्लॉक** या **जादुई बीज** के रूप में सोचें! यह छोटा है, लेकिन इसमें एक विशाल पेड़ या एक खुशहाल इंसान बनने की पूरी योजना है! 🌳👶`,
    default_response: `हूठ हूठ! 🦉 ऑनलाइन एआई सर्वर वर्तमान में उच्च ट्रैफ़िक (या ऑफ़लाइन) का सामना कर रहे हैं।

चिंता न करें! मैं अभी भी आपकी समीक्षा करने में मदद कर सकता हूँ! यदि आप अभ्यास करना चाहते हैं, तो आप एक ऑफ़लाइन अभ्यास प्रश्नोत्तरी शुरू करने के लिए **"test me"** टाइप कर सकते हैं। आप अपनी उपलब्धियों को ट्रैक करने के लिए ऊपर दिए गए स्टडी प्लानर कैलेंडर या प्रोग्रेस रिपोर्ट डैशबोर्ड टैब भी देख सकते हैं!

आइए मिलकर सीखते रहें! 🚀`,
    explanation_planner: 'एआई प्लानर ऑफ़लाइन है। यहाँ आपके लिए एक अनुशंसित दैनिक चेकलिस्ट है!',
    planner_title: 'मानक दैनिक अध्ययन फोकस',
    planner_topic1: 'मूल अवधारणा समीक्षा',
    planner_topic2: 'शब्दावली अभ्यास',
    explanation_progress: 'यहाँ आपके स्थानीय डेटाबेस आँकड़ों से आपकी प्रगति का सारांश दिया गया है!',
    explanation_reminder: 'मैंने स्थानीय डेटाबेस से आपके सक्रिय अनुस्मारक लोड कर दिए हैं।',
    reminder_title: 'दैनिक अध्ययन अनुस्मारक',
    explanation_exam: 'यहाँ आपके ऑफ़लाइन स्टडी बडी द्वारा संकलित एक कस्टम परीक्षा तैयारी अध्ययन पत्रक है!'
  },
  'Telugu': {
    subjects: {
      'Mathematics': 'గణితం',
      'Science': 'విజ్ఞాన శాస్త్రం',
      'English': 'ఇంగ్లీష్',
      'Social Studies': 'సాంఘిక శాస్త్రం',
      'Telugu': 'తెలుగు',
      'Hindi': 'హిందీ',
      'default': 'సాధారణ'
    },
    quiz: {
      text: "AI ప్రస్తుతం అధిక డిమాండ్‌ను ఎదుర్కొంటోంది. చింతించకండి! నేను మీ కోసం శీఘ్ర స్థానిక ప్రాక్టీస్ క్విజ్‌ను రూపొందించాను. మీ నైపుణ్యాలను పరీక్షించుకుందాం!",
      title: "ప్రాక్టీస్ క్విజ్",
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
    photosynthesis_response: `హూట్ హూట్! 🦉 ఆన్‌లైన్ AI ప్రస్తుతం ఆఫ్‌లైన్‌లో ఉంది, కానీ స్టడీ బడ్డీకి **కిరణజన్య సంయోగక్రియ (Photosynthesis)** గురించి అంతా తెలుసు! 🌿

కిరణజన్య సంయోగక్రియ అనేది ఆకుపచ్చ మొక్కలు తమ స్వంత ఆహారాన్ని తయారు చేసుకోవడానికి ఉపయోగించే ప్రక్రియ:
1. **నీరు**: వేర్ల ద్వారా నేల నుండి గ్రహించబడుతుంది.
2. **కార్బన్ డయాక్సైడ్**: పత్రరంధ్రాలు (stomata) అని పిలిచే ఆకులపై ఉండే చిన్న రంధ్రాల ద్వారా గాలి నుండి పీల్చుకోబడుతుంది.
3. **సూర్యకాంతి**: **పత్రహరితం** (chlorophyll) అని పిలిచే ఆకుపచ్చ వర్ణద్రవ్యం ద్వారా గ్రహించబడుతుంది.

సూర్యకాంతి శక్తిని ఉపయోగించి, మొక్కలు నీరు మరియు కార్బన్ డయాక్సైడ్‌ను గ్లూకోజ్ (వాటి ఆహారం) గా మారుస్తాయి మరియు మనం శ్వాసించడానికి **ఆక్సిజన్‌**ను విడుదల చేస్తాయి!

$$\\text{నీరు} + \\text{కార్బన్ డయాక్సైడ్} \\xrightarrow{\\text{సూర్యకాంతి}} \\text{గ్లూకోజ్} + \\text{ఆక్సిజన్}$$`,
    fraction_response: `హూట్ హూట్! 🦉 ఆన్‌లైన్ AI ప్రస్తుతం ఆఫ్‌లైన్‌లో ఉంది, కానీ మనం కలిసి **భిన్నాల (Fractions)** గురించి తెలుసుకుందాం! 🔢

భిన్నం అనేది మొత్తంలో ఒక భాగం. దీనికి రెండు ప్రధాన భాగాలు ఉంటాయి:
- **లవము (Numerator - పై సంఖ్య)**: మన దగ్గర ఎన్ని భాగాలు ఉన్నాయో తెలియజేస్తుంది.
- **హారము (Denominator - కింది సంఖ్య)**: మొత్తం భాగం ఎన్ని సమాన భాగాలుగా విభజించబడిందో తెలియజేస్తుంది.

ఉదాహరణకు, మీరు ఒక పిజ్జాను 4 సమాన ముక్కలుగా కోసి, 1 ముక్కను తింటే, మీరు పిజ్జాలో $\\frac{1}{4}$ భాగం తిన్నట్లు అర్థం!`,
    water_cycle_response: `హూట్ హూట్! 🦉 ఆన్‌లైన్ AI ప్రస్తుతం ఆఫ్‌లైన్‌లో ఉంది, కానీ ఇక్కడ **జలచక్రం (Water Cycle)** గురించి శీఘ్ర గైడ్ ఉంది! 💧

జలచక్రం అనేది భూమిపై, పైన మరియు కింద నీటి నిరంతర చలనం:
1. **బాష్పీభవనం (Evaporation)**: సూర్యుడి నుండి వచ్చే వేడి సముద్రాలు, సరస్సులు మరియు నదులలోని నీటిని వేడి చేస్తుంది, ఇది ఆవిరిగా మారి పైకి లేస్తుంది.
2. **సాంద్రీకరణం (Condensation)**: ఆవిరి పైకి లేచే కొద్దీ చల్లబడి, తిరిగి చిన్న నీటి బిందువులుగా మారి మేఘాలుగా ఏర్పడుతుంది.
3. **వర్షపాతం (Precipitation)**: మేఘాలు బరువెక్కినప్పుడు, నీరు వర్షం, మంచు లేదా వడగండ్ల రూపంలో తిరిగి భూమిపైకి పడుతుంది.
4. **సేకరణ (Collection)**: నీరు తిరిగి నదులు, సరస్సులు మరియు సముద్రాలలోకి ప్రవహిస్తుంది, చక్రం మళ్లీ ప్రారంభించడానికి సిద్ధంగా ఉంటుంది!`,
    gravity_response: `హూట్ హూట్! 🦉 ఆన్‌లైన్ AI ప్రస్తుతం ఆఫ్‌లైన్‌లో ఉంది, కానీ మనం **గురుత్వాకర్షణ (Gravity)** గురించి మాట్లాడుకుందాం! 🌍

గురుత్వాకర్షణ అనేది వస్తువులను ఒకదానికొకటి ఆకర్షించే ఒక అదృశ్య శక్తి.
- ఇది మీ పాదాలను నేలపై ఉంచుతుంది మరియు ఆపిల్స్ చెట్ల నుండి కింద పడేలా చేస్తుంది.
- భూమికి గురుత్వాకర్షణ ఉంది, ఇది ప్రతిదానిని తన కేంద్రం వైపు లాగుతుంది.
- గురుత్వాకర్షణ భూమి సూర్యుని చుట్టూ తిరగడానికి మరియు చంద్రుడు భూమి చుట్టూ తిరగడానికి సహాయపడుతుంది!`,
    cell_response: `హూట్ హూట్! 🦉 ఆన్‌లైన్ AI ప్రస్తుతం ఆఫ్‌లైన్‌లో ఉంది, కానీ మనం **కణం (Cell)** గురించి తెలుసుకుందాం! 🔬

కణాలు అన్ని జీవుల ప్రాథమిక నిర్మాణ విభాగాలు. ఇల్లు కట్టడానికి ఉపయోగించే చిన్న ఇటుకల లాగా వీటిని భావించండి:
- **ఏకకణ జీవులు (Unicellular)**: కేవలం ఒకే ఒక కణంతో తయారైన జీవులు (బ్యాక్టీరియా వంటివి).
- **బహుకణ జీవులు (Multicellular)**: బిలియన్ల కణాలతో తయారైన జీవులు (మొక్కలు, జంతువులు మరియు మానవులు!).
- **ప్రధాన భాగాలు**:
  - *కణ త్వచం (Cell Membrane)*: లోపలికి మరియు వెలుపలికి వెళ్లే వాటిని నియంత్రించే వెలుపలి గోడ.
  - *కేంద్రకం (Nucleus)*: DNA ను కలిగి ఉండే కణం యొక్క మెదడు.
  - *కణద్రవ్యం (Cytoplasm)*: అన్నింటినీ కలిపి ఉంచే జెల్ లాంటి ద్రవం.`,
    noun_response: `హూట్ హూట్! 🦉 ఆన్‌లైన్ AI ప్రస్తుతం ఆఫ్‌లైన్‌లో ఉంది, కానీ మనం **నామవాచకాల (Nouns)** గురించి తెలుసుకుందాం! 📝

**నామవాచకం** అనేది ఒక పేరును సూచించే పదం. ఇది వ్యక్తి, స్థలం, జంతువు లేదా వస్తువు పేరును తెలియజేస్తుంది:
- **వ్యక్తి**: *ఉపాధ్యాయుడు, అలెక్స్, తల్లి*
- **స్థలం**: *పాఠశాల, భారతదేశం, పార్క్*
- **జంతువు**: *గుడ్లగూబ, సింహం, కుక్క*
- **వస్తువు**: *పుస్తకం, పెన్సిల్, బొమ్మ*

ఉదాహరణకు: "**గుడ్లగూబ** (నామవాచకం) **పాఠశాల** (నామవాచకం) లో **పుస్తకం** (నామవాచకం) చదివింది."`,
    zygote_response: `హూట్ హూట్! 🦉 ఆన్‌లైన్ AI ప్రస్తుతం ఆఫ్‌లైన్‌లో ఉంది, కానీ మీకు **యుగ్మనజం (Zygote)** గురించి వివరించడానికి స్టడీ బడ్డీ సిద్ధంగా ఉంది! 🥚🌱

ఒక కొత్త జీవి (మొక్క, జంతువు లేదా మానవుడు) తన జీవితాన్ని ప్రారంభించినప్పుడు ఏర్పడే మొట్టమొదటి కణం **యుగ్మనజం (Zygote)**!

ఇది సాధారణ దశల్లో ఎలా పనిచేస్తుందో ఇక్కడ ఉంది:
1. **కణాల కలయిక (ఫలదీకరణం)**: ఒక స్త్రీ అండ కణం (gamete) పురుష శుక్ర కణం (gamete) తో కలుస్తుంది.
2. **యుగ్మనజం**: ఈ కలయిక ద్వారా ఏర్పడే ఒకే ఒక కణాన్ని **యుగ్మనజం** అంటారు. ఇది తల్లిదండ్రుల ఇద్దరి జన్యు పదార్ధాల కలయిక!
3. **సూచనల పుస్తకం**: యుగ్మనజం కంటి రంగు, జుట్టు రంగు, ఎత్తు మరియు మిగిలిన ప్రతిదానిని నిర్మించడానికి అవసరమైన అన్ని DNA (సూచనలను) కలిగి ఉంటుంది!
4. **విభజన మరియు ఎదుగుదల**: చాలా త్వరగా, ఈ ఏకైక కణం 2 కణాలుగా, తర్వాత 4, తర్వాత 8 కణాలుగా విభజించబడుతుంది. త్వరలోనే, ఇది **భ్రూణం (embryo)** అని పిలిచే కణాల బంతిగా మారుతుంది, ఇది పెరిగి శిశువుగా, మొక్కగా లేదా అందమైన జంతువుగా అభివృద్ధి చెందుతుంది!

**పోలిక**: యుగ్మనజాన్ని **ప్రారంభ కణం** లేదా **మాయా విత్తనం**గా భావించండి! ఇది చాలా చిన్నది, కానీ ఇది ఒక పెద్ద వృక్షంగా లేదా సంతోషకరమైన మానవుడిగా ఎదగడానికి పూర్తి ప్రణాళికను కలిగి ఉంది! 🌳👶`,
    default_response: `హూట్ హూట్! 🦉 ఆన్‌లైన్ AI సర్వర్లు ప్రస్తుతం అధిక రద్దీని ఎదుర్కొంటున్నాయి (లేదా ఆఫ్‌లైన్‌లో ఉన్నాయి).

చింతించకండి! నేను ఇంకా మీకు సహాయం చేయగలను! మీరు ప్రాక్టీస్ చేయాలనుకుంటే, ఆఫ్‌లైన్ ప్రాక్టీస్ క్విజ్‌ను ప్రారంభించడానికి **"test me"** అని టైప్ చేయవచ్చు. మీరు మీ విజయాలను ట్రాక్ చేయడానికి పైన ఉన్న స్టడీ ప్లానర్ క్యాలెండర్ లేదా పురోగతి నివేదిక డాష్‌బోర్డ్ ట్యాబ్‌లను కూడా చూడవచ్చు!

కలిసి నేర్చుకుందాం! 🚀`,
    explanation_planner: 'AI ప్లానర్ ఆఫ్‌లైన్‌లో ఉంది. ఇక్కడ మీ కోసం సిఫార్సు చేయబడిన రోజువారీ చెక్‌లిస్ట్ ఉంది!',
    planner_title: 'ప్రామాణిక రోజువారీ అధ్యయన ఫోకస్',
    planner_topic1: 'కోర్ కాన్సెప్ట్ రివ్యూ',
    planner_topic2: 'పదజాలం సాధన',
    explanation_progress: 'మీ స్థానిక డేటాబేస్ గణాంకాల నుండి మీ పురోగతి సారాంశం ఇక్కడ ఉంది!',
    explanation_reminder: 'నేను స్థానిక డేటాబేస్ నుండి మీ యాక్టివ్ రిమైండర్‌లను లోడ్ చేసాను.',
    reminder_title: 'రోజువారీ అధ్యయన రిమైండర్',
    explanation_exam: 'ఆఫ్‌లైన్ స్టడీ బడ్డీ రూపొందించిన కస్టమ్ పరీక్ష తయారీ స్టడీ షీట్ ఇక్కడ ఉంది!'
  }
};

function runLocalModel(systemInstruction, promptText, jsonMode) {
  // Handle translation requests in offline fallback
  if (systemInstruction.includes("translator")) {
    const targetLangMatch = systemInstruction.match(/translating learning content for primary and high school students.\s*Translate the student's text into\s*(\w+)/i) || systemInstruction.match(/Translate the given text into\s*(\w+)/i);
    const targetLanguage = targetLangMatch ? targetLangMatch[1] : 'English';
    const isHindi = targetLanguage.toLowerCase() === 'hindi';
    const isTelugu = targetLanguage.toLowerCase() === 'telugu';
    const langKey = isHindi ? 'Hindi' : isTelugu ? 'Telugu' : 'English';
    
    if (langKey !== 'English') {
      const trans = localTranslations[langKey];
      if (trans) {
        const lowerText = promptText.toLowerCase();
        if (lowerText.includes("photosynthesis") || lowerText.includes("प्रकाश संश्लेषण") || lowerText.includes("కిరణజన్య సంయోగక్రియ")) return trans.photosynthesis_response;
        if (lowerText.includes("fraction") || lowerText.includes("भिन्न") || lowerText.includes("భిన్నాల")) return trans.fraction_response;
        if (lowerText.includes("water cycle") || lowerText.includes("जल चक्र") || lowerText.includes("జలచక్రం")) return trans.water_cycle_response;
        if (lowerText.includes("gravity") || lowerText.includes("गुरुत्वाकर्षण") || lowerText.includes("గురుత్వాకర్షణ")) return trans.gravity_response;
        if (lowerText.includes("cell") || lowerText.includes("कोशिका") || lowerText.includes("కణం")) return trans.cell_response;
        if (lowerText.includes("noun") || lowerText.includes("संज्ञा") || lowerText.includes("నామవాచకాల")) return trans.noun_response;
        if (lowerText.includes("zygote") || lowerText.includes("युग्मनज") || lowerText.includes("యుగ్మనజం")) return trans.zygote_response;
        if (lowerText.includes("hoot hoot") || lowerText.includes("high demand") || lowerText.includes("experiencing high demand") || lowerText.includes("online ai") || lowerText.includes("spikes are temporary")) return trans.default_response;
      }
      return promptText;
    } else {
      // Translate to English (from Telugu or Hindi)
      const lowerText = promptText.toLowerCase();
      if (lowerText.includes("प्रकाश संश्लेषण") || lowerText.includes("కిరణజన్య సంయోగక్రియ")) {
        return `Photosynthesis is the process green plants use to make their own food:
1. **Water**: Taken from the soil by the roots.
2. **Carbon Dioxide**: Absorbed from the air through tiny pores in leaves called stomata.
3. **Sunlight**: Captured by the green pigment called **chlorophyll**.

Using the energy of sunlight, plants convert water and carbon dioxide into glucose (their food) and release **oxygen** for us to breathe!

$$\\text{Water} + \\text{Carbon Dioxide} \\xrightarrow{\\text{Sunlight}} \\text{Glucose} + \\text{Oxygen}$$`;
      }
      if (lowerText.includes("भिन्न") || lowerText.includes("భిన్నాల")) {
        return `A fraction represents a part of a whole. It has two main parts:
- **Numerator (top number)**: How many parts we have.
- **Denominator (bottom number)**: How many equal parts the whole is divided into.

For example, if you slice a pizza into 4 equal slices and eat 1 slice, you have eaten $\\frac{1}{4}$ of the pizza!`;
      }
      return promptText;
    }
  }

  // Detect preferred language from systemInstruction
  const langMatch = systemInstruction.match(/- Preferred Language:\s*(\w+)/);
  const preferredLanguage = langMatch ? langMatch[1] : 'English';

  // Detect intent type from system instruction
  let type = 'SYLLABUS';
  if (systemInstruction.includes("Study Planner Agent")) type = 'PLANNER';
  else if (systemInstruction.includes("Quiz Agent")) type = 'QUIZ';
  else if (systemInstruction.includes("Progress Analysis Agent")) type = 'PROGRESS';
  else if (systemInstruction.includes("Reminder Agent")) type = 'REMINDER';
  else if (systemInstruction.includes("Exam Preparation Agent")) type = 'EXAM';
  else if (systemInstruction.includes("curriculum parsing assistant")) type = 'INGEST';

  // Detect subject
  let subject = 'default';
  if (/math/i.test(promptText) || /math/i.test(systemInstruction)) subject = 'Mathematics';
  else if (/sci/i.test(promptText) || /sci/i.test(systemInstruction)) subject = 'Science';
  else if (/english/i.test(promptText) || /english/i.test(systemInstruction)) subject = 'English';
  else if (/social/i.test(promptText) || /social/i.test(systemInstruction)) subject = 'Social Studies';
  else if (/hindi/i.test(promptText) || /hindi/i.test(systemInstruction)) subject = 'Hindi';
  else if (/telugu/i.test(promptText) || /telugu/i.test(systemInstruction)) subject = 'Telugu';

  console.log(`🤖 [LocalModel] Running offline fallback model for type: ${type}, subject: ${subject}, preferredLanguage: ${preferredLanguage}`);

  if (jsonMode) {
    if (type === 'INGEST') {
      let detectedClass = 6;
      const classMatch = promptText.match(/(?:class|grade|standard|std)\s*([0-9ivx]+)/i);
      if (classMatch) {
        const val = classMatch[1].toLowerCase();
        if (val === 'i' || val === '1') detectedClass = 1;
        else if (val === 'ii' || val === '2') detectedClass = 2;
        else if (val === 'iii' || val === '3') detectedClass = 3;
        else if (val === 'iv' || val === '4') detectedClass = 4;
        else if (val === 'v' || val === '5') detectedClass = 5;
        else if (val === 'vi' || val === '6') detectedClass = 6;
        else if (val === 'vii' || val === '7') detectedClass = 7;
        else if (val === 'viii' || val === '8') detectedClass = 8;
        else if (val === 'ix' || val === '9') detectedClass = 9;
        else if (val === 'x' || val === '10') detectedClass = 10;
        else {
          const num = parseInt(val);
          if (!isNaN(num) && num >= 1 && num <= 10) detectedClass = num;
        }
      }

      let detectedSubject = 'General';
      const subjects = ['Mathematics', 'Math', 'Science', 'English', 'Social Studies', 'Telugu', 'Hindi'];
      for (const sub of subjects) {
        if (new RegExp(sub, 'i').test(promptText)) {
          detectedSubject = sub === 'Math' ? 'Mathematics' : sub;
          break;
        }
      }

      return JSON.stringify({
        class: detectedClass,
        subject: detectedSubject,
        chapters: [
          {
            chapterName: `Offline Chapter 1: Core Concepts`,
            topics: [`Introduction to ${detectedSubject}`, "Key Terminology", "Review Exercises"]
          },
          {
            chapterName: `Offline Chapter 2: Practical Applications`,
            topics: ["Activity Session", "Knowledge Check", "Discussion Questions"]
          }
        ]
      });
    }

    if (type === 'QUIZ') {
      const isHindi = preferredLanguage === 'Hindi';
      const isTelugu = preferredLanguage === 'Telugu';
      const quizSource = isHindi ? LOCAL_QUIZZES_HI : isTelugu ? LOCAL_QUIZZES_TE : LOCAL_QUIZZES_EN;
      
      const quiz = quizSource[subject] || quizSource.default;
      const title = quiz.title;
      const questions = quiz.questions;
      
      let explanationText = `Hoot hoot! 🦉 The online AI is currently experiencing high demand. No worries, I have generated a local practice quiz for you to test your skills!`;
      if (subject === 'Hindi' || isHindi) {
        explanationText = "एआई वर्तमान में उच्च मांग का सामना कर रहा है। कोई चिंता नहीं! मैंने आपके लिए एक त्वरित स्थानीय अभ्यास प्रश्नोत्तरी तैयार की है। आइए आपके कौशल का परीक्षण करें!";
      } else if (subject === 'Telugu' || isTelugu) {
        explanationText = "AI ప్రస్తుతం అధిక డిమాండ్‌ను ఎదుర్కొంటోంది. చింతించకండి! నేను మీ కోసం శీఘ్ర స్థానిక ప్రాక్టీస్ క్విజ్‌ను రూపొందించాను. మీ నైపుణ్యాలను పరీక్షించుకుందాం!";
      }

      const chapterName = (subject === 'Hindi' || isHindi)
        ? 'ऑफ़लाइन अभ्यास'
        : ((subject === 'Telugu' || isTelugu) ? 'ఆఫ్‌లైన్ ప్రాక్టీస్' : 'Offline Practice');

      return JSON.stringify({
        explanation: explanationText,
        quizData: {
          quizId: 'local_quiz_' + Date.now(),
          title: title,
          subject: subject === 'default' ? 'General' : subject,
          chapterName: chapterName,
          questions: questions
        }
      });
    }

    if (type === 'PLANNER') {
      let explanation = "The AI Planner is offline. Here is a recommended daily checklist for you!";
      let title = "Standard Daily Study Focus";
      let topic1 = "Core Concept Review";
      let topic2 = "Vocabulary Practice";
      let subTrans = subject === 'default' ? 'Mathematics' : subject;
      let engTrans = "English";
      let duration1 = "20 mins";
      let duration2 = "15 mins";

      if (preferredLanguage === 'Hindi' || preferredLanguage === 'Telugu') {
        const trans = localTranslations[preferredLanguage];
        explanation = trans.explanation_planner;
        title = trans.planner_title;
        topic1 = trans.planner_topic1;
        topic2 = trans.planner_topic2;
        subTrans = trans.subjects[subject] || subject;
        engTrans = preferredLanguage === 'Hindi' ? 'अंग्रेजी' : 'ఇంగ్లీష్';
        duration1 = preferredLanguage === 'Hindi' ? '20 मिनट' : '20 నిమిషాలు';
        duration2 = preferredLanguage === 'Hindi' ? '15 मिनट' : '15 నిమిషాలు';
      }

      return JSON.stringify({
        explanation: explanation,
        planType: "daily",
        planData: {
          title: title,
          tasks: [
            { subject: subTrans, topic: topic1, duration: duration1, priority: "high" },
            { subject: engTrans, topic: topic2, duration: duration2, priority: "medium" }
          ]
        }
      });
    }

    if (type === 'PROGRESS') {
      let explanation = "Here is your progress summary from your local database statistics!";
      let subTrans = subject === 'default' ? 'Mathematics' : subject;
      let strongAreas = ["Science"];

      if (preferredLanguage === 'Hindi' || preferredLanguage === 'Telugu') {
        const trans = localTranslations[preferredLanguage];
        explanation = trans.explanation_progress;
        subTrans = trans.subjects[subject] || subject;
        strongAreas = trans.progress.strongAreas;
      }

      return JSON.stringify({
        explanation: explanation,
        progressData: {
          quizAverage: 78,
          totalStudyTimeMins: 45,
          weakAreas: [subTrans],
          strongAreas: strongAreas,
          achievementUnlocked: null
        }
      });
    }

    if (type === 'REMINDER') {
      let explanation = "I have loaded your active reminders from the local database.";
      let title = "Daily Study Reminder";

      if (preferredLanguage === 'Hindi' || preferredLanguage === 'Telugu') {
        const trans = localTranslations[preferredLanguage];
        explanation = trans.explanation_reminder;
        title = trans.reminder_title;
      }

      return JSON.stringify({
        explanation: explanation,
        reminderData: {
          action: "list",
          reminders: [
            { title: title, time: "18:00", active: true }
          ]
        }
      });
    }

    if (type === 'EXAM') {
      const exam = LOCAL_EXAMS[subject] || LOCAL_EXAMS.default;
      let explanation = `Here is a custom exam preparation study sheet compiled by your offline Study Buddy!`;
      let quickNotes = exam.quickNotes;
      let importantQuestions = exam.importantQuestions;
      let revisionPlan = exam.revisionPlan;
      let subTrans = subject === 'default' ? 'General' : subject;

      if (subject === 'Hindi') {
        explanation = "यहाँ आपके ऑफ़लाइन स्टडी बडी द्वारा संकलित एक कस्टम परीक्षा तैयारी अध्ययन पत्रक है!";
        quickNotes = exam.quickNotes;
        importantQuestions = exam.importantQuestions;
        revisionPlan = exam.revisionPlan;
        subTrans = "हिंदी";
      } else if (subject === 'Telugu') {
        explanation = "ఇక్కడ మీ ఆఫ్‌లైన్ స్టడీ బడ్డీ రూపొందించిన కస్టమ్ పరీక్ష తయారీ స్టడీ షీట్ ఉంది!";
        quickNotes = exam.quickNotes;
        importantQuestions = exam.importantQuestions;
        revisionPlan = exam.revisionPlan;
        subTrans = "తెలుగు";
      } else if (preferredLanguage === 'Hindi' || preferredLanguage === 'Telugu') {
        const trans = localTranslations[preferredLanguage];
        explanation = trans.explanation_exam;
        subTrans = trans.subjects[subject] || subject;
        
        if (subject === 'Mathematics') {
          quickNotes = preferredLanguage === 'Hindi' 
            ? ["भिन्न, दशमलव और बुनियादी प्रतिशत का अभ्यास करें।", "याद रखें: आयत के लिए क्षेत्रफल = लंबाई x चौड़ाई।"]
            : ["భిన్నాలు, దశాంశాలు మరియు ప్రాథమిక శాతాలను ప్రాక్టీస్ చేయండి.", "గుర్తుంచుకోండి: దీర్ఘచతురస్ర వైశాల్యం = పొడవు x వెడల్పు."];
          importantQuestions = preferredLanguage === 'Hindi'
            ? ["x का मान ज्ञात करें: 4x - 8 = 12.", "6 सेमी भुजा वाले वर्ग के परिमाप की गणना करें।"]
            : ["x విలువను కనుగొనండి: 4x - 8 = 12.", "6 సెం.మీ భుజం కలిగిన చతురస్రం చుట్టుకొలతను లెక్కించండి."];
          revisionPlan = preferredLanguage === 'Hindi'
            ? "गणित की पाठ्यपुस्तक की समस्याओं को हल करने में 25 मिनट बिताएं, और 5 मिनट का ब्रेक लें।"
            : "గణిత పాఠ్యపుస్తక సమస్యలను సాధించడానికి 25 నిమిషాలు కేటాయించండి మరియు 5 నిమిషాల విరామం తీసుకోండి.";
        } else if (subject === 'Science') {
          quickNotes = preferredLanguage === 'Hindi'
            ? ["प्रकाश संश्लेषण की प्रक्रिया की समीक्षा करें: पौधे सूर्य के प्रकाश का उपयोग करके भोजन बनाते हैं।", "पदार्थ की तीन अवस्थाओं को याद रखें: ठोस, तरल, गैस।"]
            : ["కిరణజన్య సంయోగక్రియ ప్రక్రియను సమీక్షించండి: మొక్కలు సూర్యకాంతిని ఉపయోగించి ఆహారాన్ని తయారు చేసుకుంటాయి.", "పదార్థం యొక్క మూడు స్థితులను గుర్తుంచుకోండి: ఘన, ద్రవ, వాయు రూపాలు."];
          importantQuestions = preferredLanguage === 'Hindi'
            ? ["एक पौधे की कोशिका के भागों का चित्र बनाएं और उन्हें अंकित करें।", "स्पष्ट करें कि वाष्पीकरण पानी को वाष्प में कैसे बदलता है।"]
            : ["మొక్క కణం యొక్క భాగాలను గీసి, వాటి పేర్లను గుర్తించండి.", "బాష్పీభవనం నీటిని ఆవిరిగా ఎలా మారుస్తుందో వివరించండి."];
          revisionPlan = preferredLanguage === 'Hindi'
            ? "अपने विज्ञान अध्याय के सारांश पढ़ने और चित्र बनाने में 20 मिनट बिताएं।"
            : "మీ సైన్స్ అధ్యాయం సారాంశాలను చదవడానికి మరియు రేఖాచిత్రాలను గీయడానికి 20 నిమిషాలు కేటాయించండి.";
        } else {
          quickNotes = preferredLanguage === 'Hindi'
            ? ["प्रत्येक अध्याय अनुभाग का अपने शब्दों में सारांश लिखें।", "कठिन विषयों पर पुनरीक्षण प्रश्नोत्तरी के लिए स्टडी बडी से पूछें।"]
            : ["ప్రతి అధ్యాయం విభాగాన్ని మీ స్వంత మాటల్లో సంగ్రహించండి.", "కష్టమైన అంశాలపై పునర్విమర్శ క్విజ్‌ల కోసం స్టడీ బడ్డీని అడగండి."];
          importantQuestions = preferredLanguage === 'Hindi'
            ? ["आपके आगामी पाठ्यक्रम में शामिल मुख्य अवधारणाएँ क्या हैं?", "अध्याय के अंत में दिए गए सारांश समीक्षा प्रश्नों को हल करें।"]
            : ["మీ రాబోయే సిలబస్‌లో ఉన్న ప్రధాన అంశాలు ఏమిటి?", "అध्याय చివరన ఉన్న సారాంశ సమీక్ష ప్రశ్నలను సాధించండి."];
          revisionPlan = preferredLanguage === 'Hindi'
            ? "30 मिनट का अध्ययन सत्र ब्लॉक बनाएं और अपनी नोटबुक के मुख्य अंशों की समीक्षा करें।"
            : "30 నిమిషాల అధ్యయన సమయాన్ని కేటాయించి, మీ నోట్‌బుక్ ముఖ్యాంశాలను సమీక్షించండి.";
        }
      }

      return JSON.stringify({
        explanation: explanation,
        examData: {
          subject: subTrans,
          quickNotes: quickNotes,
          importantQuestions: importantQuestions,
          revisionPlan: revisionPlan
        }
      });
    }
  }

  // default SYLLABUS tutor response
  if (type === 'SYLLABUS') {
    if (preferredLanguage === 'Hindi' || preferredLanguage === 'Telugu') {
      const trans = localTranslations[preferredLanguage];
      if (/photosynthesis/i.test(promptText)) {
        return trans.photosynthesis_response;
      }
      if (/fraction/i.test(promptText)) {
        return trans.fraction_response;
      }
      if (/water\s*cycle/i.test(promptText)) {
        return trans.water_cycle_response;
      }
      if (/gravity/i.test(promptText)) {
        return trans.gravity_response;
      }
      if (/cell/i.test(promptText)) {
        return trans.cell_response;
      }
      if (/noun/i.test(promptText)) {
        return trans.noun_response;
      }
      if (/zygote|fertiliz|gamete|embryo/i.test(promptText)) {
        return trans.zygote_response;
      }
      return trans.default_response;
    }

    if (/photosynthesis/i.test(promptText)) {
      return `Hoot hoot! 🦉 The online AI is currently offline, but Study Buddy knows all about **Photosynthesis**! 🌿

Photosynthesis is the process green plants use to make their own food:
1. **Water**: Taken from the soil by the roots.
2. **Carbon Dioxide**: Absorbed from the air through tiny pores in leaves called stomata.
3. **Sunlight**: Captured by the green pigment called **chlorophyll**.

Using the energy of sunlight, plants convert water and carbon dioxide into glucose (their food) and release **oxygen** for us to breathe! 

$$\\text{Water} + \\text{Carbon Dioxide} \\xrightarrow{\\text{Sunlight}} \\text{Glucose} + \\text{Oxygen}$$`;
    }

    if (/fraction/i.test(promptText)) {
      return `Hoot hoot! 🦉 The online AI is currently offline, but let's review **Fractions** together! 🔢

A fraction represents a part of a whole. It has two main parts:
- **Numerator (top number)**: How many parts we have.
- **Denominator (bottom number)**: How many equal parts the whole is divided into.

For example, if you slice a pizza into 4 equal slices and eat 1 slice, you have eaten $\\frac{1}{4}$ of the pizza!`;
    }

    if (/water\s*cycle/i.test(promptText)) {
      return `Hoot hoot! 🦉 The online AI is currently offline, but here is a quick guide to the **Water Cycle**! 💧

The water cycle is the continuous movement of water on, above, and below the surface of the Earth:
1. **Evaporation**: Heat from the Sun warms up water in oceans, lakes, and rivers, turning it into vapor that floats up.
2. **Condensation**: As vapor rises, it cools and turns back into tiny liquid water droplets, forming clouds.
3. **Precipitation**: When clouds get heavy, the water falls back to Earth as rain, snow, or hail.
4. **Collection**: The water flows back into rivers, lakes, and oceans, ready to start the cycle again!`;
    }

    if (/gravity/i.test(promptText)) {
      return `Hoot hoot! 🦉 The online AI is currently offline, but let's talk about **Gravity**! 🌍

Gravity is an invisible pull force that pulls objects toward each other. 
- It is what keeps your feet on the ground and causes apples to fall down from trees.
- The Earth has gravity, which pulls everything towards its center.
- Gravity also keeps the Earth orbiting around the Sun and the Moon orbiting around the Earth!`;
    }

    if (/cell/i.test(promptText)) {
      return `Hoot hoot! 🦉 The online AI is currently offline, but let's explore the **Cell**! 🔬

Cells are the basic building blocks of all living things. Think of them as tiny bricks that build a house:
- **Unicellular**: Organisms made of just one cell (like bacteria).
- **Multicellular**: Organisms made of billions of cells (like plants, animals, and humans!).
- **Key Parts**:
  - *Cell Membrane*: The outer wall controlling what goes in and out.
  - *Nucleus*: The brain of the cell containing DNA.
  - *Cytoplasm*: The jelly-like fluid holding everything together.`;
    }

    if (/noun/i.test(promptText)) {
      return `Hoot hoot! 🦉 The online AI is currently offline, but let's review **Nouns**! 📝

A **Noun** is a naming word. It names a person, place, animal, or thing:
- **Person**: *Teacher, Alex, Mother*
- **Place**: *School, India, Park*
- **Animal**: *Owl, Lion, Dog*
- **Thing**: *Book, Pencil, Toy*

For example: "The **owl** (noun) read a **book** (noun) in the **school** (noun)."`;
    }

    if (/zygote|fertiliz|gamete|embryo/i.test(promptText)) {
      return `Hoot hoot! 🦉 The online AI is currently offline, but Study Buddy is here to explain all about the **Zygote**! 🥚🌱

A **Zygote** is the very first cell that is formed when a new living thing (like a plant, animal, or human) starts its life! 

Here is how it works in simple steps:
1. **Meeting of Cells (Fertilization)**: A female egg cell (gamete) joins together with a male sperm cell (gamete).
2. **The Zygote**: The single cell formed by this union is called a **zygote**. It is the union of both parents' genetic materials!
3. **The Instruction Book**: The zygote contains all the DNA (instructions) needed to build the entire organism—like eye color, hair color, height, and everything else!
4. **Dividing and Growing**: Very quickly, this single cell starts dividing into 2 cells, then 4, then 8, and so on. Soon, it becomes a ball of cells called an **embryo**, which grows and develops into a baby, a plant, or a beautiful animal!

**Analogy**: Think of a zygote as the **ultimate starter block** or a **magic seed**! It is tiny, but it has the complete master plan to grow into a giant tree or a happy human! 🌳👶`;
    }
  }

  return `Hoot hoot! 🦉 The online AI servers are currently experiencing high traffic (or offline).

Don't worry! I can still help you review! If you want to practice, you can type **"test me"** to start an offline practice quiz. You can also view your Study Planner calendar or check your Progress report dashboard tabs above to track your achievements!

Let's keep learning together! 🚀`;
}

async function callOpenAI(systemInstruction, promptText, jsonMode = false) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const responseFetch = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: promptText }
      ],
      response_format: jsonMode ? { type: "json_object" } : undefined
    })
  });
  
  if (responseFetch.ok) {
    const responseData = await responseFetch.json();
    const text = responseData?.choices?.[0]?.message?.content;
    return text ? text.trim() : '';
  } else {
    const errText = await responseFetch.text();
    throw new Error(`OpenAI LLM error: ${responseFetch.status} - ${errText}`);
  }
}

async function fallbackToBackup(systemInstruction, promptText, jsonMode, useOpenAI, throwOnError = false) {
  if (useOpenAI) {
    try {
      console.log("🔄 [LLMService] Falling back to OpenAI chat completion...");
      return await callOpenAI(systemInstruction, promptText, jsonMode);
    } catch (openAiErr) {
      if (throwOnError) {
        throw new Error("Both Gemini and OpenAI failed: " + openAiErr.message);
      }
      console.error("⚠️ [LLMService] OpenAI fallback failed. Switching to Local Model...", openAiErr.message);
      return runLocalModel(systemInstruction, promptText, jsonMode);
    }
  } else {
    if (throwOnError) {
      throw new Error("Gemini failed and OpenAI is not configured.");
    }
    console.log("🔄 [LLMService] OpenAI not configured. Switching to Local Model...");
    return runLocalModel(systemInstruction, promptText, jsonMode);
  }
}
function cleanJsonResponse(text) {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  }
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    clean = clean.substring(start, end + 1);
  }
  return clean;
}

async function requestGemini(model, systemInstruction, promptText, jsonMode, apiKey) {
  const keyToUse = apiKey || GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyToUse}`;
  
  const makeRequest = async (useJson) => {
    const responseFetch = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          responseMimeType: useJson ? "application/json" : "text/plain"
        }
      })
    });

    if (!responseFetch.ok) {
      const errText = await responseFetch.text();
      throw { status: responseFetch.status, message: errText };
    }

    const responseData = await responseFetch.json();
    const text = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || !text.trim()) {
      throw new Error("empty text content");
    }
    return text.trim();
  };

  try {
    return await makeRequest(jsonMode);
  } catch (err) {
    if (jsonMode && (err.status === 400 || (err.message && err.message.includes('responseMimeType')))) {
      console.log(`⚠️ [LLMService] Model ${model} does not support native JSON mode. Retrying in text mode...`);
      return await makeRequest(false);
    }
    throw new Error(err.message || `status ${err.status}`);
  }
}

async function callLLM(systemInstruction, promptText, jsonMode = false, throwOnError = false) {
  const useGemini = GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here';
  const useOpenAI = OPENAI_API_KEY && OPENAI_API_KEY !== 'your_openai_api_key_here';

  let rawResult = '';
  let succeeded = false;

  // 1. Try Gemini with Model Failover & Key Failover
  if (useGemini) {
    const keys = GEMINI_API_KEY.split(',').map(k => k.trim()).filter(k => k);
    const models = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];

    for (const key of keys) {
      if (succeeded) break;
      for (const model of models) {
        try {
          console.log(`⚡ [LLMService] Requesting Gemini (${model}) using key starting with ${key.substring(0, 8)}...`);
          rawResult = await requestGemini(model, systemInstruction, promptText, jsonMode, key);
          succeeded = true;
          break;
        } catch (err) {
          console.warn(`⚠️ [LLMService] Gemini (${model}) failed:`, err.message);
          // If the error is a quota limit (429), break model loop to try the next key
          if (err.status === 429 || (err.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')))) {
            console.warn(`⚠️ [LLMService] Quota exceeded (429) for key. Trying next key if available.`);
            break;
          }
        }
      }
    }
  }

  // 2. Try OpenAI
  if (!succeeded && useOpenAI) {
    try {
      console.log("⚡ [LLMService] Gemini failed or not configured. Requesting OpenAI...");
      rawResult = await callOpenAI(systemInstruction, promptText, jsonMode);
      succeeded = true;
    } catch (err) {
      console.error("⚠️ [LLMService] OpenAI execution failed:", err.message);
    }
  }

  // 3. Fallback to Local Model
  if (!succeeded) {
    if (throwOnError) {
      throw new Error("Neither Gemini nor OpenAI configured/successful.");
    }
    console.log("🤖 [LLMService] Neither Gemini nor OpenAI successful. Using Local Model...");
    return runLocalModel(systemInstruction, promptText, jsonMode);
  }

  if (jsonMode && rawResult) {
    return cleanJsonResponse(rawResult);
  }
  return rawResult;
}

async function getEmbedding(text) {
  const useGemini = GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here';
  if (!useGemini) {
    console.log("🤖 [LLMService] No Gemini key configured. Returning dummy mock embedding vector...");
    const dummy = [];
    for (let i = 0; i < 768; i++) dummy.push(Math.random() - 0.5);
    return dummy;
  }

  const keys = GEMINI_API_KEY.split(',').map(k => k.trim()).filter(k => k);
  for (const key of keys) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${key}`;
    try {
      console.log(`⚡ [LLMService] Requesting Gemini Embedding (gemini-embedding-001) using key starting with ${key.substring(0, 8)}...`);
      const responseFetch = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: {
            parts: [{ text: text }]
          }
        })
      });

      if (!responseFetch.ok) {
        const errText = await responseFetch.text();
        throw new Error(errText);
      }

      const data = await responseFetch.json();
      if (data?.embedding?.values) {
        return data.embedding.values;
      }
    } catch (e) {
      console.warn("⚠️ [LLMService] Embedding fetch failed for key. Trying next key:", e.message);
    }
  }

  console.log("🤖 [LLMService] All Gemini keys failed. Returning dummy mock embedding vector...");
  const dummy = [];
  for (let i = 0; i < 768; i++) dummy.push(Math.random() - 0.5);
  return dummy;
}

module.exports = {
  callLLM,
  runLocalModel,
  getEmbedding
};
