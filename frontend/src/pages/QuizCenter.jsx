import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Mascot } from '../components/Mascot';
import { Check, X, Award, AlertCircle, ArrowRight, Zap } from 'lucide-react';

// --- Dynamic Quiz & Shuffling Helpers ---
const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[j], arr[i]] = [arr[i], arr[j]];
  }
  return arr;
};

const resolveDynamicQuestion = (q, classNum) => {
  const type = q.dynamicType;
  let A, B, correctAnswer, questionText, explanation;
  let options = [];
  
  const isLower = classNum <= 3;
  const isMiddle = classNum >= 4 && classNum <= 7;
  
  if (type === 'math_add') {
    if (isLower) {
      A = Math.floor(Math.random() * 15) + 1; // 1-15
      B = Math.floor(Math.random() * 15) + 1; // 1-15
    } else if (isMiddle) {
      A = Math.floor(Math.random() * 80) + 20; // 20-99
      B = Math.floor(Math.random() * 80) + 20; // 20-99
    } else {
      A = Math.floor(Math.random() * 800) + 200; // 200-999
      B = Math.floor(Math.random() * 800) + 200; // 200-999
    }
    correctAnswer = A + B;
    questionText = `What is ${A} + ${B}?`;
    explanation = `${A} + ${B} = ${correctAnswer} because we combine the numbers.`;
  }
  else if (type === 'math_sub') {
    if (isLower) {
      B = Math.floor(Math.random() * 10) + 1; // 1-10
      A = B + Math.floor(Math.random() * 10) + 1; // make A >= B
    } else if (isMiddle) {
      B = Math.floor(Math.random() * 50) + 10;
      A = B + Math.floor(Math.random() * 50) + 10;
    } else {
      B = Math.floor(Math.random() * 500) + 100;
      A = B + Math.floor(Math.random() * 500) + 100;
    }
    correctAnswer = A - B;
    questionText = `What is ${A} - ${B}?`;
    explanation = `${A} - ${B} = ${correctAnswer} because we take away ${B} from ${A}.`;
  }
  else if (type === 'math_mul') {
    if (isLower) {
      A = Math.floor(Math.random() * 5) + 1; // 1-5
      B = Math.floor(Math.random() * 10) + 1; // 1-10
    } else if (isMiddle) {
      A = Math.floor(Math.random() * 8) + 5; // 5-12
      B = Math.floor(Math.random() * 20) + 10; // 10-29
    } else {
      A = Math.floor(Math.random() * 15) + 11; // 11-25
      B = Math.floor(Math.random() * 40) + 11; // 11-50
    }
    correctAnswer = A * B;
    questionText = `What is ${A} × ${B}?`;
    explanation = `${A} × ${B} = ${correctAnswer} (multiplying ${A} by ${B}).`;
  }
  else if (type === 'math_div') {
    let ans;
    if (isLower) {
      B = Math.floor(Math.random() * 4) + 2; // 2-5
      ans = Math.floor(Math.random() * 9) + 2; // 2-10
    } else if (isMiddle) {
      B = Math.floor(Math.random() * 8) + 5; // 5-12
      ans = Math.floor(Math.random() * 16) + 5; // 5-20
    } else {
      B = Math.floor(Math.random() * 16) + 10; // 10-25
      ans = Math.floor(Math.random() * 31) + 10; // 10-40
    }
    A = B * ans;
    correctAnswer = ans;
    questionText = `What is ${A} ÷ ${B}?`;
    explanation = `${A} ÷ ${B} = ${correctAnswer} because ${B} × ${correctAnswer} = ${A}.`;
  }
  else if (type === 'math_linear') {
    let coeffA, ansX, constB, constC;
    if (isLower || isMiddle) {
      coeffA = Math.floor(Math.random() * 4) + 2; // 2-5
      ansX = Math.floor(Math.random() * 9) + 2; // 2-10
      constB = Math.floor(Math.random() * 15) + 1; // 1-15
      constC = coeffA * ansX + constB;
      correctAnswer = `x = ${ansX}`;
      questionText = `Solve for x: ${coeffA}x + ${constB} = ${constC}`;
      explanation = `Subtract ${constB} from both sides: ${coeffA}x = ${constC - constB}. Divide both sides by ${coeffA}: x = ${ansX}.`;
    } else {
      coeffA = Math.floor(Math.random() * 8) + 3; // 3-10
      ansX = Math.floor(Math.random() * 21) - 10; // -10 to 10
      if (ansX === 0) ansX = 5;
      constB = Math.floor(Math.random() * 41) - 20; // -20 to 20
      if (constB === 0) constB = 7;
      constC = coeffA * ansX + constB;
      correctAnswer = `x = ${ansX}`;
      
      const signB = constB >= 0 ? `+ ${constB}` : `- ${Math.abs(constB)}`;
      questionText = `Solve for x: ${coeffA}x ${signB} = ${constC}`;
      
      const step1Val = constC - constB;
      explanation = `Add ${-constB} to both sides: ${coeffA}x = ${step1Val}. Divide by ${coeffA}: x = ${ansX}.`;
    }
  }
  else if (type === 'math_square_root') {
    let baseVal;
    if (isLower || isMiddle) {
      baseVal = Math.floor(Math.random() * 11) + 5; // 5-15
    } else {
      baseVal = Math.floor(Math.random() * 21) + 10; // 10-30
    }
    const N = baseVal * baseVal;
    correctAnswer = baseVal;
    questionText = `What is the square root of ${N}?`;
    explanation = `Since ${baseVal} × ${baseVal} = ${N}, the square root of ${N} is ${baseVal}.`;
  }
  
  // Generate distractors
  let ansNum = typeof correctAnswer === 'number' ? correctAnswer : parseInt(correctAnswer.replace(/[^\d-]/g, ''), 10);
  let distSet = new Set();
  
  if (typeof correctAnswer === 'string' && correctAnswer.startsWith('x =')) {
    while (distSet.size < 3) {
      let offset = Math.floor(Math.random() * 9) - 4; // -4 to 4
      if (offset !== 0) {
        distSet.add(`x = ${ansNum + offset}`);
      }
    }
  } else {
    while (distSet.size < 3) {
      let offset = Math.floor(Math.random() * 20) - 10;
      if (offset === 0) continue;
      let dist = ansNum + offset;
      if (dist > 0 && dist !== ansNum) {
        distSet.add(dist);
      }
    }
    let val = 1;
    while (distSet.size < 3) {
      if (val !== ansNum) {
        distSet.add(val);
      }
      val++;
    }
  }
  
  const dists = Array.from(distSet);
  options = [correctAnswer.toString(), dists[0].toString(), dists[1].toString(), dists[2].toString()];
  
  return {
    ...q,
    question: `[Class ${classNum}] ` + questionText,
    options: options,
    correctAnswerIndex: 0,
    explanation: explanation
  };
};

const quizTranslations = {
  hi: {
    "What is A + B?": "A + B क्या है?",
    "A + B = ANSWER because we combine the numbers.": "A + B = ANSWER क्योंकि हम संख्याओं को मिलाते हैं।",
    "What is A - B?": "A - B क्या है?",
    "A - B = ANSWER because we take away B from A.": "A - B = ANSWER क्योंकि हम A में से B को घटाते हैं।",
    "What is A × B?": "A × B क्या है?",
    "A × B = ANSWER (multiplying A by B).": "A × B = ANSWER (A को B से गुणा करने पर)।",
    "What is A ÷ B?": "A ÷ B क्या है?",
    "A ÷ B = ANSWER because B × ANSWER = A.": "A ÷ B = ANSWER क्योंकि B × ANSWER = A है।",
    "Solve for x: Ax + B = C": "x के लिए हल करें: Ax + B = C",
    "Subtract B from both sides: Ax = C - B. Divide both sides by A: x = ANSWER.": "दोनों पक्षों से B घटाएं: Ax = C - B. दोनों पक्षों को A से विभाजित करें: x = ANSWER.",
    "Add -B to both sides: Ax = C - B. Divide by A: x = ANSWER.": "दोनों पक्षों में -B जोड़ें: Ax = C - B. A से विभाजित करें: x = ANSWER.",
    "What is the square root of N?": "N का वर्गमूल क्या है?",
    "Since ANSWER × ANSWER = N, the square root of N is ANSWER.": "चूंकि ANSWER × ANSWER = N, इसलिए N का वर्गमूल ANSWER है।",
    
    // Group 1 Math
    "What is 10 plus 10?": "10 प्लस 10 क्या है?",
    "10 + 10 = 20.": "10 + 10 = 20 होता है।",
    "If you have 3 apples and get 4 more, how many apples do you have?": "यदि आपके पास 3 सेब हैं और आपको 4 और मिलते हैं, तो आपके पास कितने सेब हैं?",
    "3 + 4 = 7 apples.": "3 + 4 = 7 सेब।",
    "Which number is the smallest?": "कौन सी संख्या सबसे छोटी है?",
    "5 is the smallest number among the options.": "विकल्पों में से 5 सबसे छोटी संख्या है।",
    "What shape has 3 sides?": "किस आकार की 3 भुजाएँ होती हैं?",
    "A triangle has 3 sides.": "एक त्रिभुज की 3 भुजाएँ होती हैं।",
    "What is half of 10?": "10 का आधा क्या है?",
    "Half of 10 is 5 (10 ÷ 2 = 5).": "10 का आधा 5 है (10 ÷ 2 = 5)।",
    
    // Group 1 Science
    "Which part of a plant grows under the ground?": "पौधे का कौन सा भाग जमीन के नीचे उगता है?",
    "Stem": "तना", "Leaf": "पत्ता", "Flower": "फूल", "Roots": "जड़ें",
    "Roots anchor the plant in the soil and absorb water and nutrients.": "जड़ें पौधे को मिट्टी में स्थिर रखती हैं और पानी तथा पोषक तत्वों को अवशोषित करती हैं।",
    "What gas do humans breathe in to live?": "जीवित रहने के लिए मनुष्य कौन सी गैस सांस में लेते हैं?",
    "Oxygen": "ऑक्सीजन", "Carbon Dioxide": "कार्बन डाइऑक्साइड", "Nitrogen": "नाइट्रोजन", "Helium": "हर्बल गैस",
    "Humans require Oxygen for cellular respiration.": "मानव श्वसन के लिए ऑक्सीजन की आवश्यकता होती है।",
    "Which animal is known as the King of the Jungle?": "किस जानवर को जंगल का राजा कहा जाता है?",
    "Tiger": "बाघ", "Elephant": "हाथी", "Lion": "शेर", "Giraffe": "जिराफ",
    "The Lion is traditionally called the King of the Jungle.": "शेर को पारंपरिक रूप से जंगल का राजा कहा जाता है।",
    "Water turns into ice when it gets very...": "पानी बर्फ में बदल जाता है जब वह बहुत...",
    "Hot": "गर्म", "Cold": "ठंडा", "Dry": "सूखा", "Windy": "हवादार",
    "Freezing occurs when water is cooled to 0°C (32°F) or below.": "पानी 0°C (32°F) या उससे नीचे ठंडा होने पर जम जाता है।",
    "Which of these is a living thing?": "इनमें से कौन सी एक जीवित वस्तु है?",
    "Rock": "चट्टान", "Toy Car": "खिलौना कार", "Tree": "पेड़", "Book": "किताब",
    "Trees are living things as they grow, breathe, and reproduce.": "पेड़ जीवित वस्तुएं हैं क्योंकि वे बढ़ते हैं, सांस लेते हैं और प्रजनन करते हैं।",
    "How many senses do humans have?": "मनुष्यों की कितनी इंद्रियाँ होती हैं?",
    "Humans have 5 basic senses: sight, hearing, smell, taste, and touch.": "मनुष्यों की 5 बुनियादी इंद्रियाँ होती हैं: दृष्टि, श्रवण, गंध, स्वाद और स्पर्श।",
    "Which planet is our home?": "कौन सा ग्रह हमारा घर है?",
    "Mars": "मंगल", "Venus": "शुक्र", "Earth": "पृथ्वी", "Jupiter": "बृहस्पति",
    "Earth is the third planet from the Sun and our home planet.": "पृथ्वी सूर्य से तीसरा ग्रह है और हमारा गृह ग्रह है।",
    "What is the main source of light for Earth?": "पृथ्वी के लिए प्रकाश का मुख्य स्रोत क्या है?",
    "Moon": "चंद्रमा", "Sun": "सूर्य", "Stars": "तारे", "Fireflies": "जुगनू",
    "The Sun is our solar system's star and provides light and heat to Earth.": "सूर्य हमारे सौर मंडल का तारा है और पृथ्वी को प्रकाश व गर्मी प्रदान करता है।",
    
    // Group 1 English
    "Choose the naming word (noun) in: 'The dog barked.'": "संज्ञा (noun) चुनें: 'The dog barked.'",
    "dog": "dog (कुत्ता)", "barked": "barked (भौंका)", "The": "The", "loudly": "loudly (तेजी से)",
    "'dog' is a noun because it names an animal.": "'dog' संज्ञा है क्योंकि यह एक जानवर का नाम है।",
    "What is the opposite of 'Hot'?": "'Hot' (गर्म) का विलोम शब्द क्या है?",
    "Warm": "Warm (गुनगुना)", "Cold": "Cold (ठंडा)", "Wet": "Wet (गीला)",
    "The antonym of hot is cold.": "Hot का विलोम Cold है।",
    "Which letter is a vowel?": "कौन सा अक्षर स्वर (vowel) है?",
    "A, E, I, O, U are vowels. E is a vowel.": "A, E, I, O, U स्वर हैं। E स्वर है।",
    "Choose the correct spelling:": "सही वर्तनी (spelling) चुनें:",
    "Aple": "Aple", "Appel": "Appel", "Apple": "Apple", "Aplee": "Aplee",
    "The correct spelling is 'Apple'.": "सही वर्तनी 'Apple' है।",
    "Complete: 'The birds are ___ in the sky.'": "पूरा करें: 'The birds are ___ in the sky.'",
    "flying": "flying (उड़ रहे)", "fly": "fly (उड़ना)", "flown": "flown (उड़ चुके)", "flew": "flew (उड़े)",
    "'flying' is the present participle needed for the continuous tense.": "'flying' कंटीन्यूअस टेंस के लिए आवश्यक वर्तमान कृदंत है।",
    "What is the plural of 'Cat'?": "'Cat' का बहुवचन (plural) क्या है?",
    "Cats": "Cats", "Cates": "Cates", "Catse": "Catse", "Kittens": "Kittens",
    "The plural of cat is formed by adding 's', resulting in 'Cats'.": "Cat का बहुवचन 's' जोड़कर 'Cats' बनता है।",
    "Choose the action word (verb) in: 'She runs fast.'": "क्रिया (verb) चुनें: 'She runs fast.'",
    "She": "She", "runs": "runs (दौड़ती है)", "fast": "fast (तेज़)", "beautifully": "beautifully (सुंदरता से)",
    "'runs' is a verb because it describes an action.": "'runs' एक क्रिया है क्योंकि यह एक क्रिया का वर्णन करता है।",
    "Which word starts with a capital letter?": "कौन सा शब्द बड़े अक्षर (capital letter) से शुरू होता है?",
    "monday": "monday", "Monday": "Monday", "mOnday": "mOnday", "MONday": "MONday",
    "Days of the week are proper nouns and must be capitalized: 'Monday'.": "सप्ताह के दिन व्यक्तिवाचक संज्ञा होते हैं और उन्हें बड़े अक्षरों में लिखा जाना चाहिए: 'Monday'।",
    
    // Group 1 Social Studies
    "Who is the 'Father of the Nation' in India?": "भारत में 'राष्ट्रपिता' कौन हैं?",
    "Jawaharlal Nehru": "जवाहरलाल नेहरू", "Mahatma Gandhi": "महात्मा गांधी", "Subhas Chandra Bose": "सुभाष चंद्र बोस", "Bhagat Singh": "भगत सिंह",
    "Mahatma Gandhi is widely known as the Father of the Nation in India.": "महात्मा गांधी को व्यापक रूप से भारत में राष्ट्रपिता के रूप में जाना जाता है।",
    "Which country do we live in?": "हम किस देश में रहते हैं?",
    "India": "भारत", "USA": "अमेरिका", "Canada": "कनाडा", "Australia": "ऑस्ट्रेलिया",
    "We live in India.": "हम भारत में रहते हैं।",
    "How many colors are there in the Indian national flag?": "भारतीय राष्ट्रीय ध्वज में कितने रंग हैं?",
    "The flag has 3 horizontal bands: saffron, white, and green.": "ध्वज में 3 क्षैतिज पट्टियाँ हैं: केसरिया, सफेद और हरा।",
    "What is the capital of India?": "भारत की राजधानी क्या है?",
    "Mumbai": "मुंबई", "Kolkata": "कोलकाता", "New Delhi": "नई दिल्ली", "Chennai": "चेन्नई",
    "New Delhi is the official capital city of India.": "नई दिल्ली भारत की आधिकारिक राजधानी है।",
    "Which festival is known as the Festival of Lights?": "किस त्योहार को रोशनी के त्योहार के रूप में जाना जाता है?",
    "Holi": "होली", "Diwali": "दिवाली", "Eid": "ईद", "Christmas": "क्रिसमस",
    "Diwali is the Hindu festival of lights, representing victory of light over darkness.": "दिवाली रोशनी का त्योहार है, जो अंधकार पर प्रकाश की जीत का प्रतिनिधित्व करता है।",
    "What vehicle runs on tracks?": "कौन सा वाहन पटरियों पर चलता है?",
    "Car": "कार", "Train": "ट्रेन", "Bicycle": "साइकिल", "Boat": "नाव",
    "Trains run on iron tracks called rails.": "ट्रेनें लोहे की पटरियों पर चलती हैं जिन्हें रेल्स कहते हैं।",
    "Who helps us when we are sick?": "जब हम बीमार होते हैं तो हमारी मदद कौन करता है?",
    "Teacher": "शिक्षक", "Doctor": "डॉक्टर", "Farmer": "किसान", "Postman": "डाकिया",
    "Doctors treat illnesses and help us stay healthy.": "डॉक्टर बीमारियों का इलाज करते हैं और हमें स्वस्थ रहने में मदद करते हैं।",
    "What is the shape of the Earth?": "पृथ्वी का आकार कैसा है?",
    "Flat": "चपटा", "Round/Sphere": "गोल/गोलाकार", "Square": "चौकोर", "Triangle": "त्रिकोण",
    "The Earth is an oblate spheroid, which is round like a ball.": "पृथ्वी एक तिरछा गोलाकार है, जो एक गेंद की तरह गोल है।",
    
    // Group 2 Math
    "What is the perimeter of a square with side length 6 cm?": "6 सेमी भुजा वाले वर्ग का परिमाप क्या है?",
    "12 cm": "12 सेमी", "24 cm": "24 सेमी", "36 cm": "36 सेमी", "18 cm": "18 सेमी",
    "Perimeter of a square = 4 × side = 4 × 6 cm = 24 cm.": "वर्ग का परिमाप = 4 × भुजा = 4 × 6 सेमी = 24 सेमी।",
    "If x + 15 = 40, what is x?": "यदि x + 15 = 40 है, तो x क्या है?",
    "x = 40 - 15 = 25.": "x = 40 - 15 = 25.",
    "What is 3/4 represented as a decimal?": "दशमलव के रूप में 3/4 को कैसे दर्शाया जाता है?",
    "3/4 = 75/100 = 0.75.": "3/4 = 75/100 = 0.75.",
    "Which of these is a prime number?": "इनमें से कौन सी एक अभाज्य संख्या है?",
    "17 is a prime number because it is only divisible by 1 and itself.": "17 एक अभाज्य संख्या है क्योंकि यह केवल 1 और स्वयं से विभाज्य है।",
    "What is the value of 5 cubed (5^3)?": "5 के घन (5^3) का मान क्या है?",
    "5^3 = 5 × 5 × 5 = 125.": "5^3 = 5 × 5 × 5 = 125.",

    // Group 2 Science
    "Which gas do plants absorb during photosynthesis?": "प्रकाश संश्लेषण के दौरान पौधे कौन सी गैस अवशोषित करते हैं?",
    "Plants take in Carbon Dioxide (CO2) and release Oxygen (O2) during photosynthesis.": "प्रकाश संश्लेषण के दौरान पौधे कार्बन डाइऑक्साइड (CO2) लेते हैं और ऑक्सीजन (O2) छोड़ते हैं।",
    "What is the boiling point of water at standard sea level?": "मानक समुद्र तल पर पानी का क्वथनांक क्या है?",
    "Water boils at 100 degrees Celsius (212°F).": "पानी 100 डिग्री सेल्सियस (212°F) पर उबलता है।",
    "Which organ pumps blood throughout the human body?": "कौन सा अंग पूरे मानव शरीर में रक्त पंप करता है?",
    "The heart is a muscular organ that pumps blood through the circulatory system.": "हृदय एक पेशीय अंग है जो परिसंचरण तंत्र के माध्यम से रक्त पंप करता है।",
    "What is the closest planet to the Sun?": "सूर्य का सबसे निकटतम ग्रह कौन सा है?",
    "Mercury is the closest planet to the Sun.": "बुध सूर्य का सबसे निकटतम ग्रह है।",
    "Which pigment gives plants their green color?": "कौन सा वर्णक पौधों को उनका हरा रंग देता है?",
    "Carotene": "कैरोटीन", "Chlorophyll": "क्लोरोफिल", "Hemoglobin": "हीमोग्लोबिन", "Melanin": "मेलानिन",
    "Chlorophyll absorbs light energy and gives plants their green color.": "क्लोरोफिल प्रकाश ऊर्जा को अवशोषित करता है और पौधों को उनका हरा रंग देता है।",
    "What force pulls objects toward the center of the Earth?": "कौन सा बल वस्तुओं को पृथ्वी के केंद्र की ओर खींचता है?",
    "Friction": "घर्षण", "Magnetism": "चुंबकत्व", "Gravity": "गुरुत्वाकर्षण", "Tension": "तनाव",
    "Gravity is the attractive force exerted by the Earth's mass.": "गुरुत्वाकर्षण पृथ्वी के द्रव्यमान द्वारा लगाया गया आकर्षण बल है।",
    "Which of these is a solid state of water?": "इनमें से कौन सी पानी की ठोस अवस्था है?",
    "Steam": "भाप", "Rain": "बारिश", "Ice": "बर्फ", "Dew": "ओस",
    "Ice is water in its solid phase.": "बर्फ अपने ठोस चरण में पानी है।",
    "What part of the cell is known as the powerhouse?": "कोशिका के किस भाग को पावरहाउस के रूप में जाना जाता है?",
    "Nucleus": "नाभिक (न्यूक्लियस)", "Mitochondria": "माइटोकॉन्ड्रिया", "Ribosome": "राइबोसोम", "Cell Wall": "कोशिका भित्ति",
    "Mitochondria generate most of the chemical energy needed to power the cell's reactions.": "माइटोकॉन्ड्रिया कोशिका की प्रतिक्रियाओं को शक्ति देने के लिए आवश्यक अधिकांश रासायनिक ऊर्जा उत्पन्न करते हैं।",

    // Group 2 English
    "What is the synonym of 'Enormous'?": "'Enormous' (विशाल) का पर्यायवाची शब्द क्या है?",
    "Tiny": "Tiny (छोटा)", "Huge": "Huge (विशाल)", "Weak": "Weak (कमजोर)", "Bright": "Bright (चमकदार)",
    "'Enormous' means extremely large; 'Huge' is the closest synonym.": "'Enormous' का अर्थ है अत्यंत बड़ा; 'Huge' सबसे निकटतम पर्यायवाची है।",
    "Which word is a conjunction?": "कौन सा शब्द संयोजक (conjunction) है?",
    "'but' is a coordinating conjunction connecting clauses.": "'but' एक संयोजक है जो वाक्यों को जोड़ता है।",
    "Identify the adjective in: 'The quick brown fox jumps over the lazy dog.'": "विशेषण (adjective) पहचानें: 'The quick brown fox jumps over the lazy dog.'",
    "jumps": "jumps", "over": "over", "quick": "quick (तेज़)", "fox": "fox",
    "'quick' describes the noun 'fox', making it an adjective.": "'quick' संज्ञा 'fox' का वर्णन करता है, जिससे यह एक विशेषण बन जाता है।",
    "What is the antonym of 'Generous'?": "'Generous' (उदार) का विलोम शब्द क्या है?",
    "Kind": "Kind (दयालु)", "Selfish": "Selfish (स्वार्थी)", "Giving": "Giving (दानी)", "Friendly": "Friendly (मित्रवत)",
    "'Selfish' is the opposite of being giving and generous.": "'Selfish' देने और उदार होने का विपरीत है।",

    // Group 2 Social Studies
    "Which continent is known as the 'Dark Continent'?": "किस महाद्वीप को 'अंधकारमय महाद्वीप' (Dark Continent) के रूप में जाना जाता है?",
    "Asia": "एशिया", "Africa": "अफ्रीका", "South America": "दक्षिण अमेरिका",
    "Africa was called the 'Dark Continent' because its interiors were largely unknown to outsiders.": "अफ्रीका को 'अंधकारमय महाद्वीप' कहा जाता था क्योंकि इसका आंतरिक भाग बाहरी लोगों के लिए अज्ञात था।",
    "What is the capital of France?": "फ्रांस की राजधानी क्या है?",
    "Rome": "रोम", "Berlin": "बर्लिन", "London": "लंदन", "Paris": "पेरिस",
    "Paris is the capital and largest city of France.": "पेरिस फ्रांस की राजधानी और सबसे बड़ा शहर है।",
    "Which is the longest river in the world?": "विश्व की सबसे लंबी नदी कौन सी है?",
    "Amazon River": "अमेज़न नदी", "Nile River": "नील नदी", "Yangtze River": "यांग्त्ज़ी नदी", "Mississippi River": "मिसिसिपी नदी",
    "The Nile River in Africa is about 6,650 km long and generally considered the longest.": "अफ्रीका में नील नदी लगभग 6,650 किमी लंबी है और इसे सबसे लंबी माना जाता है।",
    "Who wrote the Indian Constitution?": "भारतीय संविधान किसने लिखा था?",
    "Dr. B.R. Ambedkar": "डॉ. बी.आर. अंबेडकर",
    "Dr. Bhimrao Ramji Ambedkar was the Chairman of the Drafting Committee.": "डॉ. भीमराव रामजी अंबेडकर प्रारूप समिति के अध्यक्ष थे।",
    "Which is the smallest state in India by area?": "क्षेत्रफल के हिसाब से भारत का सबसे छोटा राज्य कौन सा है?",
    "Goa": "गोवा", "Sikkim": "सिक्किम", "Tripura": "त्रिपुरा", "Mizoram": "मिजोरम",
    "Goa is India's smallest state by land area.": "गोवा भूमि क्षेत्रफल के हिसाब से भारत का सबसे छोटा राज्य है।",
    "Which planet is known as the Red Planet?": "किस ग्रह को लाल ग्रह के रूप में जाना जाता है?",
    "Mars": "मंगल (Mars)",
    "Mars appears red due to iron oxide (rust) on its surface.": "लोहे के ऑक्साइड के कारण मंगल लाल दिखाई देता है।",

    // Group 3 Math
    "What is the square root of 225?": "225 का वर्गमूल क्या है?",
    "15 × 15 = 225, so the square root of 225 is 15.": "15 × 15 = 225, इसलिए 225 का वर्गमूल 15 है।",
    "If log_2(x) = 5, what is the value of x?": "यदि log_2(x) = 5 है, तो x का मान क्या है?",
    "log_2(x) = 5 means x = 2^5 = 32.": "log_2(x) = 5 का अर्थ है x = 2^5 = 32.",
    "In a right-angled triangle, if base = 3cm and height = 4cm, what is the hypotenuse?": "एक समकोण त्रिभुज में, यदि आधार = 3 सेमी और ऊंचाई = 4 सेमी है, तो कर्ण क्या है?",
    "5cm": "5 सेमी", "6cm": "6 सेमी", "7cm": "7 सेमी", "12cm": "12 सेमी",
    "Hypotenuse = √(base^2 + height^2) = √(3^2 + 4^2) = √(9 + 16) = √25 = 5cm.": "कर्ण = √(आधार^2 + ऊंचाई^2) = √(3^2 + 4^2) = √(9 + 16) = √25 = 5 सेमी।",
    "What is the value of sin(90 degrees)?": "sin(90 डिग्री) का मान क्या है?",
    "In trigonometry, the sine of 90 degrees is exactly 1.": "त्रिकोणमिति में, 90 डिग्री का साइन बिल्कुल 1 होता है।",
    "Solve for x: x^2 - 9 = 0": "x के लिए हल करें: x^2 - 9 = 0",
    "x^2 = 9, which means x = ±√9 = ±3.": "x^2 = 9, जिसका अर्थ है x = ±√9 = ±3.",

    // Group 3 Science
    "Which element has the chemical symbol 'O'?": "किस तत्व का रासायनिक प्रतीक 'O' है?",
    "Gold": "सोना", "Osmium": "ऑस्मियम",
    "O is the chemical symbol for Oxygen.": "O ऑक्सीजन का रासायनिक प्रतीक है।",
    "What is the speed of light in a vacuum?": "निर्वात (vacuum) में प्रकाश की गति क्या है?",
    "The speed of light is approximately 299,792 km/s, commonly rounded to 300,000 km/s.": "प्रकाश की गति लगभग 299,792 किमी/सेकंड है, जिसे आमतौर पर 300,000 किमी/सेकंड माना जाता है।",
    "What type of bond is formed by sharing electrons?": "इलेक्ट्रॉनों को साझा करने से किस प्रकार का बंध बनता है?",
    "Ionic bond": "आयनिक बंध", "Covalent bond": "सहसंयोजक बंध (Covalent)", "Hydrogen bond": "हाइड्रोजन बंध", "Metallic bond": "धात्विक बंध",
    "Covalent bonding involves the sharing of electron pairs between atoms.": "सहसंयोजक बंधन में परमाणुओं के बीच इलेक्ट्रॉन जोड़े साझा होते हैं।",
    "What is the unit of electrical resistance?": "विद्युत प्रतिरोध की इकाई क्या है?",
    "Volt": "वोल्ट", "Ampere": "एम्पीयर", "Ohm": "ओम (Ohm)", "Watt": "वाट",
    "Ohm (Ω) is the SI unit of electrical resistance.": "ओम (Ω) विद्युत प्रतिरोध की एसआई इकाई है।",
    "Which law states that action and reaction are equal and opposite?": "कौन सा नियम कहता है कि क्रिया और प्रतिक्रिया बराबर और विपरीत होती हैं?",
    "Newton's 1st Law": "न्यूटन का पहला नियम", "Newton's 2nd Law": "न्यूटन का दूसरा नियम", "Newton's 3rd Law": "न्यूटन का तीसरा नियम", "Kepler's Law": "केपलर का नियम",
    "Newton's Third Law of Motion states that for every action, there is an equal and opposite reaction.": "न्यूटन के गति के तीसरे नियम के अनुसार, प्रत्येक क्रिया की एक समान और विपरीत प्रतिक्रिया होती है।",

    // Group 3 English
    "Identify the figure of speech: 'The stars danced playfully in the moonlit sky.'": "अलंकार (figure of speech) पहचानें: 'The stars danced playfully in the moonlit sky.'",
    "Metaphor": "रूपक (Metaphor)", "Simile": "उपमा (Simile)", "Personification": "मानवीकरण (Personification)", "Hyperbole": "अतिशयोक्ति (Hyperbole)",
    "Giving human traits (dancing) to non-human things (stars) is personification.": "गैर-मानवीय चीजों (तारों) को मानवीय लक्षण (नाचना) देना मानवीकरण (personification) कहलाता है।",
    "What is the synonym of 'Pragmatic'?": "'Pragmatic' (व्यावहारिक) का पर्यायवाची शब्द क्या है?",
    "Idealistic": "Idealistic (आदर्शवादी)", "Practical": "Practical (व्यावहारिक)", "Careless": "Careless (लापरवाह)", "Dynamic": "Dynamic (ऊर्जावान)",
    "'Pragmatic' means dealing with things sensibly and realistically, hence 'Practical'.": "'Pragmatic' का अर्थ है चीजों से समझदारी और व्यावहारिक रूप से निपटना, इसलिए 'Practical' सही है।",

    // Group 3 Social Studies
    "In which year did India gain Independence from British rule?": "भारत ने किस वर्ष ब्रिटिश शासन से स्वतंत्रता प्राप्त की?",
    "India achieved independence on August 15, 1947.": "भारत ने 15 अगस्त, 1947 को स्वतंत्रता प्राप्त की।",
    "Who was the first Prime Minister of independent India?": "स्वतंत्र भारत के पहले प्रधानमंत्री कौन थे?",
    "Sardar Vallabhbhai Patel": "सरदार वल्लभभाई पटेल", "Dr. Rajendra Prasad": "डॉ. राजेंद्र प्रसाद",
    "Jawaharlal Nehru took office on August 15, 1947.": "जवाहरलाल नेहरू ने 15 अगस्त, 1947 को पदभार ग्रहण किया।",
    "Which is the largest country in the world by land area?": "भूमि क्षेत्रफल के हिसाब से दुनिया का सबसे बड़ा देश कौन सा है?",
    "Russia": "रूस",
    "Russia is the largest country, spanning Eastern Europe and Northern Asia.": "रूस सबसे बड़ा देश है, जो पूर्वी यूरोप और उत्तरी एशिया में फैला है।",
    "The Harappan Civilization was situated near which river basin?": "हड़प्पा सभ्यता किस नदी घाटी के पास स्थित थी?",
    "Ganges": "गंगा", "Indus": "सिंधु (Indus)", "Yamuna": "यमुना", "Narmada": "नर्मदा",
    "The Bronze Age Harappan civilization flourished around the Indus River basin.": "कांस्य युग की हड़प्पा सभ्यता सिंधु नदी घाटी के आसपास फली-फूली।",
    "What is the term duration of the Lok Sabha in India?": "भारत में लोकसभा का कार्यकाल कितना होता है?",
    "The Lok Sabha, or lower house of Parliament, has a term of 5 years.": "लोकसभा, या संसद के निचले सदन का कार्यकाल 5 वर्ष का होता है।",

    // --- 96 New Questions Translations (Hindi) ---
    // Lower Math (Class <= 3)
    "What is 5 plus 3?": "5 प्लस 3 क्या है?",
    "5 + 3 = 8.": "5 + 3 = 8.",
    "Which number comes after 19?": "19 के बाद कौन सी संख्या आती है?",
    "20 comes after 19.": "19 के बाद 20 आता है।",
    "A rectangle has how many corners?": "एक आयत के कितने कोने होते हैं?",
    "A rectangle has 4 corners.": "एक आयत के 4 कोने होते हैं।",
    "If you share 6 candies equally between 2 friends, how many does each get?": "यदि आप 2 दोस्तों के बीच 6 कैंडीज को बराबर बांटते हैं, तो प्रत्येक को कितनी मिलेंगी?",
    "6 ÷ 2 = 3 candies.": "6 ÷ 2 = 3 कैंडीज।",
    "What is 20 minus 5?": "20 घटा 5 क्या है?",
    "20 - 5 = 15.": "20 - 5 = 15.",
    "How many wheels does a bicycle have?": "एक साइकिल के कितने पहिये होते हैं?",
    "A bicycle has 2 wheels.": "एक साइकिल के 2 पहिये होते हैं।",
    "What is the double of 6?": "6 का दोगुना क्या है?",
    "Double of 6 is 12 (6 + 6 = 12).": "6 का दोगुना 12 है (6 + 6 = 12)।",

    // Middle Math (Class 4 to 7)
    "What is 100 divided by 4?": "100 को 4 से विभाजित करने पर क्या आता है?",
    "100 ÷ 4 = 25.": "100 ÷ 4 = 25.",
    "What is the area of a rectangle with length 5 cm and width 4 cm?": "5 सेमी लंबाई और 4 सेमी चौड़ाई वाले आयत का क्षेत्रफल क्या है?",
    "9 sq cm": "9 वर्ग सेमी", "18 sq cm": "18 वर्ग सेमी", "20 sq cm": "20 वर्ग सेमी", "25 sq cm": "25 वर्ग सेमी",
    "Area = length × width = 5 × 4 = 20 sq cm.": "क्षेत्रफल = लंबाई × चौड़ाई = 5 × 4 = 20 वर्ग सेमी।",
    "Find the average of 10, 20, and 30?": "10, 20 और 30 का औसत ज्ञात कीजिए?",
    "Average = (10 + 20 + 30) ÷ 3 = 60 ÷ 3 = 20.": "औसत = (10 + 20 + 30) ÷ 3 = 60 ÷ 3 = 20.",
    "What is 15% of 200?": "200 का 15% क्या है?",
    "15% of 200 = 15/100 × 200 = 30.": "200 का 15% = 15/100 × 200 = 30.",
    "If a triangle has angles of 60° and 50°, what is the third angle?": "यदि एक त्रिभुज के कोण 60° और 50° हैं, तो तीसरा कोण क्या है?",
    "Sum of angles in a triangle is 180°. Third angle = 180° - 60° - 50° = 70°.": "त्रिभुज के कोणों का योग 180° होता है। तीसरा कोण = 180° - 60° - 50° = 70°.",
    "Convert 0.4 into a fraction in its simplest form.": "0.4 को उसके सरलतम रूप में भिन्न में बदलें।",
    "1/4": "1/4", "2/5": "2/5", "4/10": "4/10", "1/2": "1/2",
    "0.4 = 4/10 = 2/5.": "0.4 = 4/10 = 2/5.",
    "What is the value of 2 to the power of 5 (2^5)?": "2 की घात 5 (2^5) का मान क्या है?",
    "2^5 = 2 × 2 × 2 × 2 × 2 = 32.": "2^5 = 2 × 2 × 2 × 2 × 2 = 32.",

    // Higher Math (Class 8+)
    "Evaluate: (x + 3)(x - 3)": "मान ज्ञात कीजिए: (x + 3)(x - 3)",
    "(a+b)(a-b) = a^2 - b^2. So, (x+3)(x-3) = x^2 - 9.": "(a+b)(a-b) = a^2 - b^2. इसलिए, (x+3)(x-3) = x^2 - 9.",
    "If f(x) = 2x^2 - 3x + 5, what is f(2)?": "यदि f(x) = 2x^2 - 3x + 5 है, तो f(2) क्या है?",
    "f(2) = 2(2)^2 - 3(2) + 5 = 8 - 6 + 5 = 7.": "f(2) = 2(2)^2 - 3(2) + 5 = 8 - 6 + 5 = 7.",
    "Find the slope of the line y = 3x - 5.": "रेखा y = 3x - 5 का ढाल (slope) ज्ञात कीजिए।",
    "The equation is in slope-intercept form y = mx + c, where slope m = 3.": "यह समीकरण ढाल-अंतःखण्ड रूप y = mx + c में है, जहाँ ढाल m = 3 है।",
    "What is the probability of tossing a coin and getting heads?": "एक सिक्का उछालने और चित (heads) आने की प्रायिकता क्या है?",
    "Probability of heads = 1 favorable outcome / 2 total outcomes = 0.5.": "चित आने की प्रायिकता = 1 अनुकूल परिणाम / 2 कुल परिणाम = 0.5.",
    "If a circle has a radius of 7 cm, what is its approximate area? (Use pi = 22/7)": "यदि एक वृत्त की त्रिज्या 7 सेमी है, तो उसका अनुमानित क्षेत्रफल क्या है? (pi = 22/7 का प्रयोग करें)",
    "Area = pi × r^2 = 22/7 × 7 × 7 = 154 sq cm.": "क्षेत्रफल = pi × r^2 = 22/7 × 7 × 7 = 154 वर्ग सेमी।",
    "Solve for x: 2^(x+1) = 8": "x के लिए हल करें: 2^(x+1) = 8",
    "2^(x+1) = 2^3, which means x + 1 = 3. So, x = 2.": "2^(x+1) = 2^3, जिसका अर्थ है x + 1 = 3. इसलिए, x = 2.",
    "What is the value of cos(0 degrees)?": "cos(0 डिग्री) का मान क्या है?",
    "In trigonometry, the cosine of 0 degrees is exactly 1.": "त्रिकोणमिति में, 0 डिग्री का कोसाइन बिल्कुल 1 होता है।",

    // Lower Science (Class <= 3)
    "Which plant part makes food?": "पौधे का कौन सा भाग भोजन बनाता है?",
    "Roots": "जड़ें", "Leaves": "पत्तियां", "Stem": "तना", "Flower": "फूल",
    "Leaves make food for the plant using sunlight (photosynthesis).": "पत्तियां सूर्य के प्रकाश का उपयोग करके पौधे के लिए भोजन बनाती हैं (प्रकाश संश्लेषण)।",
    "Which animal lays eggs?": "कौन सा जानवर अंडे देता है?",
    "Dog": "कुत्ता", "Cat": "बिल्ली", "Hen": "मुर्गी", "Cow": "गाय",
    "Hens lay eggs, while mammals give birth to live young.": "मुर्गियां अंडे देती हैं, जबकि स्तनधारी जीवित बच्चों को जन्म देते हैं।",
    "Which organ do we use to see?": "हम देखने के लिए किस अंग का उपयोग करते हैं?",
    "Ears": "कान", "Nose": "नाक", "Eyes": "आंखें", "Skin": "त्वचा",
    "We use our eyes to see the world.": "हम दुनिया को देखने के लिए अपनी आँखों का उपयोग करते हैं।",
    "What do we call a baby dog?": "हम कुत्ते के बच्चे को क्या कहते हैं?",
    "Kitten": "बिल्ली का बच्चा", "Puppy": "पिल्ला (Puppy)", "Cub": "शावक (Cub)", "Calf": "बछड़ा",
    "A baby dog is called a puppy.": "कुत्ते के बच्चे को पिल्ला (puppy) कहा जाता है।",
    "Which of these is a non-living thing?": "इनमें से कौन सी एक निर्जीव वस्तु है?",
    "Bird": "पक्षी", "Fish": "मछली", "Table": "मेज (Table)", "Grass": "घास",
    "A table does not grow, breathe, or reproduce.": "एक मेज बढ़ती, सांस नहीं लेती या प्रजनन नहीं करती है।",
    "How many legs does a spider have?": "एक मकड़ी के कितने पैर होते हैं?",
    "Spiders are arachnids and have 8 legs.": "मकड़ियाँ अरचिन्ड हैं और उनके 8 पैर होते हैं।",
    "What is the color of a fresh leaf?": "ताजे पत्ते का रंग कैसा होता है?",
    "Red": "लाल", "Blue": "नीला", "Green": "हरा", "Yellow": "पीला",
    "Fresh leaves are green due to chlorophyll.": "क्लोरोफिल के कारण ताजे पत्ते हरे होते हैं।",
    "We get wool from which animal?": "हमें किस जानवर से ऊन मिलती है?",
    "Sheep": "भेड़", "Horse": "घोड़ा", "Pig": "सुअर",
    "Sheep provide us with wool to make warm clothes.": "भेड़ हमें गर्म कपड़े बनाने के लिए ऊन प्रदान करती है।",

    // Middle Science (Class 4 to 7)
    "Which planet is known for its beautiful rings?": "कौन सा ग्रह अपने सुंदर छल्लों के लिए जाना जाता है?",
    "Saturn": "शनि",
    "Saturn has the most extensive ring system in the solar system.": "शनि के पास सौर मंडल में सबसे व्यापक छल्ला प्रणाली है।",
    "What gas do humans release when they breathe out?": "मनुष्य सांस छोड़ते समय कौन सी गैस छोड़ते हैं?",
    "Carbon Monoxide": "कार्बन मोनोऑक्साइड",
    "Humans breathe out Carbon Dioxide as a waste product of respiration.": "मनुष्य श्वसन के अपशिष्ट उत्पाद के रूप में कार्बन डाइऑक्साइड बाहर छोड़ते हैं।",
    "Which organ helps us breathe?": "कौन सा अंग हमें सांस लेने में मदद करता है?",
    "Stomach": "अमाशय/पेट", "Lungs": "फेफड़े", "Heart": "हृदय", "Kidneys": "गुर्दे",
    "Lungs exchange oxygen and carbon dioxide in our body.": "फेफड़े हमारे शरीर में ऑक्सीजन और कार्बन डाइऑक्साइड का आदान-प्रदान करते हैं।",
    "Which state of matter has a fixed volume but no fixed shape?": "पदार्थ की किस अवस्था का आयतन निश्चित होता है लेकिन आकार निश्चित नहीं होता?",
    "Solid": "ठोस", "Liquid": "द्रव (Liquid)", "Gas": "गैस", "Plasma": "प्लाज्मा",
    "Liquids take the shape of their container but maintain a constant volume.": "तरल पदार्थ अपने बर्तन का आकार ले लेते हैं लेकिन एक समान आयतन बनाए रखते हैं।",
    "What is the process of water changing into water vapor called?": "पानी के जलवाष्प में बदलने की प्रक्रिया क्या कहलाती है?",
    "Condensation": "संघनन", "Evaporation": "वाष्पीकरण", "Freezing": "जमना", "Melting": "पिघलना",
    "Evaporation is the process of liquid water changing into gas (vapor).": "वाष्पीकरण तरल पानी के गैस (वाष्प) में बदलने की प्रक्रिया है।",
    "Which vitamin do we get from sunlight?": "हमें धूप से कौन सा विटामिन मिलता है?",
    "Vitamin A": "विटामिन A", "Vitamin B": "विटामिन B", "Vitamin C": "विटामिन C", "Vitamin D": "विटामिन D",
    "Our skin synthesizes Vitamin D when exposed to sunlight.": "सूर्य के प्रकाश के संपर्क में आने पर हमारी त्वचा विटामिन D का संश्लेषण करती है।",
    "What is the primary function of plant roots?": "पौधे की जड़ों का मुख्य कार्य क्या है?",
    "Make food": "भोजन बनाना", "Produce flowers": "फूल पैदा करना", "Absorb water and minerals": "पानी और खनिजों को अवशोषित करना", "Release oxygen": "ऑक्सीजन छोड़ना",
    "Roots absorb water and dissolved minerals from the soil.": "जड़ें मिट्टी से पानी और घुले हुए खनिजों को अवशोषित करती हैं।",
    "Which instrument is used to measure temperature?": "तापमान मापने के लिए किस उपकरण का उपयोग किया जाता है?",
    "Barometer": "बैरोमीटर", "Thermometer": "थर्मामीटर", "Speedometer": "स्पीडोमीटर", "Rain gauge": "वर्षा मापी (रेन गेज)",
    "A thermometer measures temperature, usually in Celsius or Fahrenheit.": "थर्मामीटर तापमान को मापता है, आमतौर पर सेल्सियस या फ़ारेनहाइट में।",

    // Higher Science (Class 8+)
    "What is the chemical formula of table salt?": "साधारण नमक का रासायनिक सूत्र क्या है?",
    "Table salt is Sodium Chloride (NaCl).": "साधारण नमक सोडियम क्लोराइड (NaCl) है।",
    "What is the powerhouse of the cell?": "कोशिका का पावरहाउस किसे कहा जाता है?",
    "Golgi Body": "गोल्गी बॉडी",
    "Mitochondria generate ATP, the cell's energy currency.": "माइटोकॉन्ड्रिया एटीपी (ATP) उत्पन्न करते हैं, जो कोशिका की ऊर्जा मुद्रा है।",
    "Which metal is liquid at room temperature?": "कौन सी धातु कमरे के तापमान पर तरल होती है?",
    "Iron": "लोहा", "Mercury": "पारा (Mercury)", "Copper": "तांबा",
    "Mercury (Hg) is the only metal that is liquid at standard room temperature.": "पारा (Hg) एकमात्र ऐसी धातु है जो सामान्य कमरे के तापमान पर तरल होती है।",
    "What type of mirror is used as a shaving mirror?": "हजामत बनाने वाले दर्पण (shaving mirror) के रूप में किस प्रकार के दर्पण का उपयोग किया जाता है?",
    "Plane mirror": "समतल दर्पण", "Concave mirror": "अवतल दर्पण (Concave)", "Convex mirror": "उत्तल दर्पण", "Double mirror": "दोहरा दर्पण",
    "Concave mirrors form magnified, erect images when objects are close.": "अवतल दर्पण वस्तुओं के पास होने पर बड़ा और सीधा प्रतिबिंब बनाते हैं।",
    "What is the SI unit of force?": "बल का एसआई (SI) मात्रक क्या है?",
    "Joule": "जूल", "Watt": "वाट", "Newton": "न्यूटन", "Pascal": "पास्कल",
    "Newton (N) is the SI unit of force, named after Sir Isaac Newton.": "न्यूटन (N) बल का एसआई मात्रक है, जिसका नाम सर आइजक न्यूटन के नाम पर रखा गया है।",
    "Which component of blood carries oxygen?": "रक्त का कौन सा घटक ऑक्सीजन ले जाता है?",
    "White Blood Cells": "श्वेत रक्त कोशिकाएं", "Red Blood Cells": "लाल रक्त कोशिकाएं", "Platelets": "प्लेटलेट्स", "Plasma": "प्लाज्मा",
    "Red blood cells contain hemoglobin, which binds and carries oxygen.": "लाल रक्त कोशिकाओं में हीमोग्लोबिन होता है, जो ऑक्सीजन को बांधता है और ले जाता है।",
    "What is the escape velocity of Earth?": "पृथ्वी का पलायन वेग (escape velocity) क्या है?",
    "The escape velocity from Earth's surface is about 11.2 km/s.": "पृथ्वी की सतह से पलायन वेग लगभग 11.2 किमी/सेकंड है।",
    "What is the main function of the kidneys?": "गुर्दों (kidneys) का मुख्य कार्य क्या है?",
    "Pump blood": "रक्त पंप करना", "Digest food": "भोजन पचाना", "Filter waste from blood": "रक्त से अपशिष्ट को छानना", "Produce hormones": "हार्मोन का उत्पादन करना",
    "Kidneys filter blood to remove waste products and excess fluids as urine.": "गुर्दे अपशिष्ट उत्पादों और अतिरिक्त तरल पदार्थों को मूत्र के रूप में निकालने के लिए रक्त को छानते हैं।",

    // Lower English (Class <= 3)
    "Choose the correct pronoun: '___ is a good boy.'": "सही सर्वनाम (pronoun) चुनें: '___ is a good boy.'",
    "'He' is the pronoun used for boys.": "लड़कों के लिए 'He' सर्वनाम का उपयोग किया जाता है।",
    "What is the opposite of 'Big'?": "'Big' का विलोम शब्द क्या है?",
    "Small": "छोटा (Small)", "Tall": "लंबा", "Heavy": "भारी",
    "The opposite of big is small.": "Big का विलोम Small है।",
    "Identify the adjective in: 'She has a blue pen.'": "विशेषण (adjective) पहचानें: 'She has a blue pen.'",
    "'blue' describes the pen, so it is an adjective.": "'blue' पेन का वर्णन करता है, इसलिए यह विशेषण है।",
    "What is the plural of 'Dog'?": "'Dog' का बहुवचन क्या है?",
    "The plural of dog is dogs.": "Dog का बहुवचन dogs है।",
    "Which word rhymes with 'Cat'?": "कौन सा शब्द 'Cat' से तुकबंदी (rhymes) करता है?",
    "'Hat' rhymes with 'Cat' as they have the same ending sound.": "'Hat' और 'Cat' की तुकबंदी होती है क्योंकि उनका अंतिम उच्चारण समान है।",
    "Complete: 'I have ___ apple.'": "पूरा करें: 'I have ___ apple.'",
    "'apple' starts with a vowel sound, so we use 'an'.": "'apple' एक स्वर (vowel) ध्वनि से शुरू होता है, इसलिए हम 'an' का उपयोग करते हैं।",
    "What is the opposite of 'Happy'?": "'Happy' का विलोम शब्द क्या है?",
    "Sad": "Sad (दुखी)", "Glad": "Glad (खुश)", "Angry": "Angry (गुस्सा)", "Silly": "Silly (मूर्खतापूर्ण)",
    "The opposite of happy is sad.": "Happy का विलोम sad है।",
    "Which of these is a verb (doing word)?": "इनमें से कौन सा शब्द एक क्रिया (verb) है?",
    "'Run' describes an action, so it is a verb.": "'Run' एक कार्य का वर्णन करता है, इसलिए यह क्रिया है।",

    // Middle English (Class 4 to 7)
    "Identify the adverb in: 'He ran quickly.'": "क्रियाविशेषण (adverb) पहचानें: 'He ran quickly.'",
    "'quickly' describes how he ran, making it an adverb.": "'quickly' यह बताता है कि वह कैसे दौड़ा, इसलिए यह एक क्रियाविशेषण है।",
    "What is the synonym of 'Courageous'?": "'Courageous' (साहसी) का पर्यायवाची शब्द क्या है?",
    "Timid": "Timid (डरपोक)", "Brave": "Brave (साहसी)", "Scared": "Scared (डरा हुआ)", "Polite": "Polite (विनम्र)",
    "'Courageous' means brave.": "'Courageous' का अर्थ साहसी (brave) होता है।",
    "What is the antonym of 'Difficult'?": "'Difficult' का विलोम शब्द क्या है?",
    "Hard": "Hard (कठिन)", "Simple/Easy": "Simple/Easy (सरल/आसान)", "Rough": "Rough (खुरदरा)", "Tough": "Tough (कठोर)",
    "The opposite of difficult is easy.": "Difficult का विलोम easy है।",
    "Complete: 'Neither Mary nor her friends ___ going to the party.'": "पूरा करें: 'Neither Mary nor her friends ___ going to the party.'",
    "In neither-nor construction, the verb agrees with the closer subject 'friends' (plural), so we use 'are'.": "Neither-nor की रचना में, क्रिया अपने पास वाले कर्ता 'friends' (बहुवचन) के अनुसार होती है, इसलिए हम 'are' का उपयोग करते हैं।",
    "Identify the conjunction: 'We stayed indoors because it was raining.'": "संयोजक (conjunction) पहचानें: 'We stayed indoors because it was raining.'",
    "'because' joins two clauses, so it is a conjunction.": "'because' दो उपवाक्यों को जोड़ता है, इसलिए यह एक संयोजक है।",
    "Choose the correct spelling:": "सही वर्तनी (spelling) चुनें:",
    "The correct spelling is 'Tomorrow'.": "सही वर्तनी 'Tomorrow' है।",
    "What is a group of lions called?": "शेरों के समूह को क्या कहा जाता है?",
    "Pack": "Pack", "Herd": "Herd (झुंड)", "Pride": "Pride", "Flock": "Flock (झुंड)",
    "A group of lions is called a pride.": "शेरों के समूह को प्राइड (pride) कहा जाता है।",
    "Which word is a preposition in: 'The key is under the mat.'": "इसमें संबंधसूचक अव्यय (preposition) कौन सा शब्द है: 'The key is under the mat.'",
    "'under' indicates position, so it is a preposition.": "'under' स्थिति को दर्शाता है, इसलिए यह एक संबंधसूचक अव्यय (preposition) है।",

    // Higher English (Class 8+)
    "Identify the correct meaning of 'Altruistic':": "'Altruistic' का सही अर्थ पहचानें:",
    "Unselfish/Generous": "Unselfish/Generous (परोपकारी/उदार)", "Arrogant": "Arrogant (घमंडी)",
    "'Altruistic' means showing unselfish concern for the welfare of others.": "'Altruistic' का अर्थ दूसरों के कल्याण के लिए निःस्वार्थ चिंता दिखाना है।",
    "What is the antonym of 'Obsolete'?": "'Obsolete' का विलोम शब्द क्या है?",
    "Ancient": "Ancient (प्राचीन)", "Outdated": "Outdated (पुराना)", "Modern/Current": "Modern/Current (आधुनिक/वर्तमान)", "Extinct": "Extinct (विलुप्त)",
    "'Obsolete' means no longer in use; its opposite is modern/current.": "'Obsolete' का अर्थ है जो अब उपयोग में न हो; इसका विपरीत आधुनिक/वर्तमान है।",
    "Identify the figure of speech: 'He is as busy as a bee.'": "अलंकार (figure of speech) पहचानें: 'He is as busy as a bee.'",
    "Alliteration": "अनुप्रास (Alliteration)", "Oxymoron": "विरोधाभास (Oxymoron)",
    "A comparison using 'as' or 'like' is a simile.": "'as' या 'like' का उपयोग करके की गई तुलना उपमा (simile) होती है।",
    "Complete: 'If I ___ you, I would study harder.'": "पूरा करें: 'If I ___ you, I would study harder.'",
    "In subjunctive mood for hypothetical situations, we use 'were' regardless of the subject.": "काल्पनिक स्थितियों के लिए सबजंक्टिव मूड (subjunctive mood) में, हम कर्ता की परवाह किए बिना 'were' का उपयोग करते हैं।",
    "What does the idiom 'Beat around the bush' mean?": "मुहावरे 'Beat around the bush' का क्या अर्थ है?",
    "To cut trees": "पेड़ काटना", "To avoid the main topic": "मुख्य विषय से बचना/घुमा-फिराकर बात करना", "To work hard": "कड़ी मेहनत करना", "To play in the forest": "जंगल में खेलना",
    "'Beat around the bush' means to talk about irrelevant things to avoid speaking directly about the main topic.": "'Beat around the bush' का अर्थ मुख्य विषय के बारे में सीधे बात करने से बचने के लिए अप्रासंगिक बातें करना है।",
    "Identify the correct spelling:": "सही वर्तनी (spelling) चुनें:",
    "The correct spelling is 'Accommodate' with double 'c' and double 'm'.": "सही वर्तनी डबल 'c' और डबल 'm' के साथ 'Accommodate' है।",
    "What is the subordinate clause in: 'She will pass the exam if she studies.'": "इसमें आश्रित उपवाक्य (subordinate clause) कौन सा है: 'She will pass the exam if she studies.'",
    "'if she studies' is a conditional subordinate clause.": "'if she studies' एक शर्त सूचक आश्रित उपवाक्य है।",
    "Which word means 'a person who hates or distrusts humankind'?": "किस शब्द का अर्थ 'एक व्यक्ति जो मानव जाति से घृणा या अविश्वास करता है' होता है?",
    "Philanthropist": "परोपकारी (Philanthropist)", "Optimist": "आशावादी (Optimist)", "Misanthrope": "मानवद्वेषी (Misanthrope)", "Pessimist": "निराशावादी",
    "A 'Misanthrope' is a person who dislikes humankind and avoids human society.": "एक 'Misanthrope' वह व्यक्ति होता है जो मानव जाति को नापसंद करता है और मानव समाज से बचता है।",

    // Lower Social Studies (Class <= 3)
    "Which is the national animal of India?": "भारत का राष्ट्रीय पशु कौन सा है?",
    "Leopard": "तेंदुआ",
    "The Royal Bengal Tiger is the national animal of India.": "रॉयल बंगाल टाइगर भारत का राष्ट्रीय पशु है।",
    "How many days are there in a normal year?": "एक सामान्य वर्ष में कितने दिन होते हैं?",
    "A normal year has 365 days, while a leap year has 366.": "एक सामान्य वर्ष में 365 दिन होते हैं, जबकि एक लीप वर्ष में 366 दिन होते हैं।",
    "Which is the tallest mountain in the world?": "विश्व का सबसे ऊँचा पर्वत कौन सा है?",
    "Mount K2": "माउंट K2", "Mount Everest": "माउंट एवरेस्ट", "Kangchenjunga": "कंचनजंगा", "Kilimanjaro": "किलिमंजारो",
    "Mount Everest is the Earth's highest mountain above sea level.": "माउंट एवरेस्ट समुद्र तल से ऊपर पृथ्वी का सबसे ऊँचा पर्वत है।",
    "What do we call a land surrounded by water on all sides?": "चारों ओर से पानी से घिरे भूभाग को हम क्या कहते हैं?",
    "Peninsula": "प्रायद्वीप", "Island": "द्वीप (Island)", "Continent": "महाद्वीप", "Desert": "रेगिस्तान",
    "An island is a piece of land completely surrounded by water.": "एक द्वीप भूमि का एक टुकड़ा है जो पूरी तरह से पानी से घिरा होता है।",
    "Who was the first citizen of India?": "भारत का प्रथम नागरिक कौन होता है?",
    "President": "राष्ट्रपति", "Chief Justice": "मुख्य न्यायाधीश", "Governor": "राज्यपाल",
    "The President of India is considered the first citizen of the nation.": "भारत के राष्ट्रपति को देश का प्रथम नागरिक माना जाता है।",
    "Which is the smallest ocean in the world?": "विश्व का सबसे छोटा महासागर कौन सा है?",
    "Indian Ocean": "हिंद महासागर", "Arctic Ocean": "आर्कटिक महासागर", "Atlantic Ocean": "अटलांटिक महासागर", "Pacific Ocean": "प्रशांत महासागर",
    "The Arctic Ocean is the smallest and shallowest of the world's five major oceans.": "आर्कटिक महासागर दुनिया के पास प्रमुख महासागरों में सबसे छोटा और उथला है।",
    "What is the national flower of India?": "भारत का राष्ट्रीय फूल क्या है?",
    "Rose": "गुलाब", "Lotus": "कमल", "Marigold": "गेंदा", "Jasmine": "चमेली",
    "The Lotus is the national flower of India.": "कमल भारत का राष्ट्रीय फूल है।",
    "Which direction does the Sun rise in?": "सूर्य किस दिशा में उगता है?",
    "West": "पश्चिम", "North": "उत्तर", "South": "दक्षिण", "East": "पूर्व",
    "The Sun always rises in the East.": "सूर्य हमेशा पूर्व दिशा में उगता है।",

    // Middle Social Studies (Class 4 to 7)
    "Who was the first woman Prime Minister of India?": "भारत की पहली महिला प्रधानमंत्री कौन थीं?",
    "Pratibha Patil": "प्रतिभा पाटिल", "Sarojini Naidu": "सरोजिनी नायडू", "Sushma Swaraj": "सुषमा स्वराज",
    "Indira Gandhi served as the first and only female Prime Minister of India.": "इन्दिरा गांधी ने भारत की पहली और एकमात्र महिला प्रधानमंत्री के रूप में कार्य किया।",
    "Which is the largest hot desert in the world?": "विश्व का सबसे बड़ा गर्म रेगिस्तान कौन सा है?",
    "Thar Desert": "थार रेगिस्तान", "Gobi Desert": "गोबी रेगिस्तान", "Sahara Desert": "सहारा रेगिस्तान", "Kalahari Desert": "कालाहारी रेगिस्तान",
    "The Sahara Desert in Africa is the largest hot desert on Earth.": "अफ़्रीका का सहारा रेगिस्तान पृथ्वी का सबसे बड़ा गर्म रेगिस्तान है।",
    "Which civilization was built along the Nile River?": "नील नदी के किनारे कौन सी सभ्यता विकसित हुई थी?",
    "Mesopotamian": "मेसोपोटामिया की सभ्यता", "Egyptian": "मिस्र की सभ्यता (Egyptian)", "Harappan": "हड़प्पा सभ्यता", "Chinese": "चीनी सभ्यता",
    "The ancient Egyptian civilization flourished along the fertile banks of the Nile.": "प्राचीन मिस्र की सभ्यता नील नदी के उपजाऊ किनारों पर विकसित हुई थी।",
    "What is the imaginary line passing through the center of the Earth horizontally?": "पृथ्वी के केंद्र से क्षैतिज रूप से गुजरने वाली काल्पनिक रेखा क्या है?",
    "Prime Meridian": "प्रधान मध्याह्न रेखा", "Tropic of Cancer": "कर्क रेखा", "Tropic of Capricorn": "मकर रेखा",
    "The Equator divides the Earth into the Northern and Southern Hemispheres.": "भूमध्य रेखा पृथ्वी को उत्तरी और दक्षिणी गोलार्ध में विभाजित करती है।",
    "Which planet is known as the 'Morning Star'?": "किस ग्रह को 'भोर का तारा' (Morning Star) कहा जाता है?",
    "Venus is often called the morning or evening star due to its bright appearance.": "शुक्र को उसकी चमकीली उपस्थिति के कारण अक्सर भोर या शाम का तारा कहा जाता है।",
    "Who invented the printing press?": "प्रिंटिंग प्रेस का आविष्कार किसने किया था?",
    "Albert Einstein": "अल्बर्ट आइंस्टीन", "Isaac Newton": "आइजैक न्यूटन", "Johannes Gutenberg": "जोहान्स गुटेनबर्ग", "Galileo Galilei": "गैलीलियो गैलीली",
    "Johannes Gutenberg introduced printing to Europe with the printing press around 1440.": "जोहान्स गुटेनबर्ग ने लगभग 1440 में प्रिंटिंग प्रेस के साथ यूरोप में छपाई की शुरुआत की थी।",
    "Which is the highest waterfall in the world?": "विश्व का सबसे ऊँचा जलप्रपात (waterfall) कौन सा है?",
    "Niagara Falls": "नियाग्रा जलप्रपात", "Angel Falls": "एंजेल जलप्रपात", "Victoria Falls": "विक्टोरिया जलप्रपात", "Iguazu Falls": "इगुआज़ू जलप्रपात",
    "Angel Falls in Venezuela is the world's highest uninterrupted waterfall.": "वेनेजुएला में एंजेल जलप्रपात दुनिया का सबसे ऊँचा बिना रुकावट वाला जलप्रपात है।",
    "Which country is also called the land of the Rising Sun?": "किस देश को 'उगते सूरज की भूमि' भी कहा जाता है?",
    "China": "चीन", "Norway": "नॉर्वे", "Australia": "ऑस्ट्रेलिया",
    "Japan is called the Land of the Rising Sun because it lies to the far east of the Asian continent.": "जापान को उगते सूरज की भूमि कहा जाता है क्योंकि यह एशियाई महाद्वीप के सुदूर पूर्व में स्थित है।",

    // Higher Social Studies (Class 8+)
    "Who was the first President of independent India?": "स्वतंत्र भारत के प्रथम राष्ट्रपति कौन थे?",
    "Dr. S. Radhakrishnan": "डॉ. एस. राधाकृष्णन", "Dr. Rajendra Prasad": "डॉ. राजेन्द्र प्रसाद", "Zakir Husain": "जाकिर हुसैन", "V.V. Giri": "वी.वी. गिरि",
    "Dr. Rajendra Prasad served as the first President from 1950 to 1962.": "डॉ. राजेन्द्र प्रसाद ने 1950 से 1962 तक पहले राष्ट्रपति के रूप में कार्य किया।",
    "Which organization was founded after World War I to maintain world peace?": "विश्व शांति बनाए रखने के लिए प्रथम विश्व युद्ध के बाद किस संगठन की स्थापना की गई थी?",
    "League of Nations": "लीग ऑफ नेशंस",
    "The League of Nations was founded in 1920 but was later replaced by the United Nations in 1945.": "लीग ऑफ नेशंस की स्थापना 1920 में हुई थी लेकिन बाद में 1945 में इसे संयुक्त राष्ट्र द्वारा प्रतिस्थापित कर दिया गया।",
    "Which is the deepest trench in the world?": "विश्व की सबसे गहरी खाई (trench) कौन सी है?",
    "Java Trench": "जावा गर्त", "Mariana Trench": "मारियाना गर्त (Mariana Trench)", "Puerto Rico Trench": "प्यूर्टो रिको गर्त", "Sunda Trench": "सुंडा गर्त",
    "The Mariana Trench in the western Pacific Ocean is the deepest trench on Earth.": "पश्चिमी प्रशांत महासागर में मारियाना गर्त पृथ्वी पर सबसे गहरी गर्त है।",
    "Who was the author of the famous book 'Discovery of India'?": "प्रसिद्ध पुस्तक 'डिस्कवरी ऑफ इंडिया' (भारत की खोज) के लेखक कौन थे?",
    "Rabindranath Tagore": "रवींद्रनाथ टैगोर", "Bal Gangadhar Tilak": "बाल गंगाधर तिलक",
    "Jawaharlal Nehru wrote 'The Discovery of India' during his imprisonment at Ahmednagar Fort.": "जवाहरलाल नेहरू ने अहमदनगर किले में अपनी कैद के दौरान 'द डिस्कवरी ऑफ इंडिया' लिखी थी।",
    "What is the minimum voting age in India?": "भारत में न्यूनतम मतदान आयु क्या है?",
    "The 61st Amendment Act reduced the voting age from 21 to 18 in 1989.": "61वें संशोधन अधिनियम ने 1989 में मतदान की आयु 21 से घटाकर 18 वर्ष कर दी थी।",
    "Which French revolution slogan spread across Europe?": "कौन सा फ्रांसीसी क्रांति का नारा पूरे यूरोप में फैल गया?",
    "Peace, Land, Bread": "शांति, भूमि, रोटी", "Liberty, Equality, Fraternity": "स्वतंत्रता, समानता, बंधुत्व", "No taxation without representation": "प्रतिनिधित्व के बिना कोई कराधान नहीं", "Work and Freedom": "काम और स्वतंत्रता",
    "'Liberty, Equality, Fraternity' was the famous motto of the French Revolution.": "'स्वतंत्रता, समानता, बंधुत्व' फ्रांसीसी क्रांति का प्रसिद्ध आदर्श वाक्य था।",
    "Which Indian ruler was known as the Tiger of Mysore?": "किस भारतीय शासक को मैसूर का शेर (Tiger of Mysore) कहा जाता था?",
    "Haider Ali": "हैदर अली", "Tipu Sultan": "टीपू सुल्तान", "Chikka Devaraja": "चिक्का देवराज", "Krishna Raja Wadiyar": "कृष्ण राजा वाडियार",
    "Tipu Sultan was known as the Tiger of Mysore due to his fierce resistance to British forces.": "ब्रिटिश सेना के खिलाफ अपने कड़े प्रतिरोध के कारण टीपू सुल्तान को मैसूर का शेर कहा जाता था।",
    "Which treaty officially ended World War I?": "किस संधि ने आधिकारिक तौर पर प्रथम विश्व युद्ध को समाप्त किया था?",
    "Treaty of Paris": "पेरिस की संधि", "Treaty of Versailles": "वर्साय की संधि (Treaty of Versailles)", "Treaty of Geneva": "जेनेवा की संधि", "Treaty of London": "लंदन की संधि",
    "The Treaty of Versailles, signed in 1919, officially ended the state of war between Germany and the Allied Powers.": "1919 में हस्ताक्षरित वर्साय की संधि ने जर्मनी और संबद्ध शक्तियों के बीच युद्ध की स्थिति को आधिकारिक तौर पर समाप्त कर दिया था।"
  },
  te: {
    "What is A + B?": "A + B ఎంత?",
    "A + B = ANSWER because we combine the numbers.": "A + B = ANSWER ఎందుకంటే మనం సంఖ్యలను కలుపుతాము.",
    "What is A - B?": "A - B ఎంత?",
    "A - B = ANSWER because we take away B from A.": "A - B = ANSWER ఎందుకంటే మనం A నుండి B ని తీసివేస్తాము.",
    "What is A × B?": "A × B ఎంత?",
    "A × B = ANSWER (multiplying A by B).": "A × B = ANSWER (A ని B తో గుణించగా).",
    "What is A ÷ B?": "A ÷ B ఎంత?",
    "A ÷ B = ANSWER because B × ANSWER = A.": "A ÷ B = ANSWER ఎందుకంటే B × ANSWER = A అవుతుంది.",
    "Solve for x: Ax + B = C": "x ని కనుగొనండి: Ax + B = C",
    "Subtract B from both sides: Ax = C - B. Divide both sides by A: x = ANSWER.": "ఇరువైపులా B ని తీసివేయండి: Ax = C - B. ఇరువైపులా A తో భాగించండి: x = ANSWER.",
    "Add -B to both sides: Ax = C - B. Divide by A: x = ANSWER.": "ఇరువైపులా -B ని కలపండి: Ax = C - B. A తో భాగించండి: x = ANSWER.",
    "What is the square root of N?": "N యొక్క వర్గమూలం ఎంత?",
    "Since ANSWER × ANSWER = N, the square root of N is ANSWER.": "ANSWER × ANSWER = N కాబట్టి, N యొక్క వర్గమూలం ANSWER.",

    // Group 1 Math
    "What is 10 plus 10?": "10 ప్లస్ 10 ఎంత?",
    "10 + 10 = 20.": "10 + 10 = 20.",
    "If you have 3 apples and get 4 more, how many apples do you have?": "మీ దగ్గర 3 ఆపిల్స్ ఉన్నాయి, మరో 4 వస్తే మొత్తం ఎన్ని ఆపిల్స్ ఉంటాయి?",
    "3 + 4 = 7 apples.": "3 + 4 = 7 ఆపిల్స్.",
    "Which number is the smallest?": "ఏ సంఖ్య అన్నింటికంటే చిన్నది?",
    "5 is the smallest number among the options.": "ఇచ్చిన వాటిలో 5 అతి చిన్న సంఖ్య.",
    "What shape has 3 sides?": "ఏ ఆకృతికి 3 భుజాలు ఉంటాయి?",
    "A triangle has 3 sides.": "త్రిభుజానికి 3 భుజాలు ఉంటాయి.",
    "What is half of 10?": "10 లో సగం ఎంత?",
    "Half of 10 is 5 (10 ÷ 2 = 5).": "10 లో సగం 5 (10 ÷ 2 = 5).",

    // Group 1 Science
    "Which part of a plant grows under the ground?": "మొక్క యొక్క ఏ భాగం భూమి కింద పెరుగుతుంది?",
    "Stem": "కాండం", "Leaf": "ఆకు", "Flower": "పువ్వు", "Roots": "వేర్లు",
    "Roots anchor the plant in the soil and absorb water and nutrients.": "వేర్లు నేలలో మొక్కను బలంగా ఉంచుతాయి మరియు నీరు, పోషకాలను పీల్చుకుంటాయి.",
    "What gas do humans breathe in to live?": "మనుషులు బతకడానికి పీల్చే వాయువు ఏది?",
    "Oxygen": "ఆక్సిజన్", "Carbon Dioxide": "కార్బన్ డయాక్సైడ్", "Nitrogen": "నైట్రోజన్", "Helium": "హీలియం",
    "Humans require Oxygen for cellular respiration.": "కణ శ్వాసక్రియకు మానవులకు ఆక్సిజన్ అవసరం.",
    "Which animal is known as the King of the Jungle?": "ఏ జంతువును అడవికి రాజు అని పిలుస్తారు?",
    "Tiger": "పులి", "Elephant": "ఏనుగు", "Lion": "సింహం", "Giraffe": "సింహం",
    "The Lion is traditionally called the King of the Jungle.": "సింహాన్ని అడవికి రాజుగా పిలుస్తారు.",
    "Water turns into ice when it gets very...": "నీరు చాలా... గా ఉన్నప్పుడు మంచుగా మారుతుంది.",
    "Hot": "వేడిగా", "Cold": "చల్లగా", "Dry": "పొడిగా", "Windy": "గాలిగా",
    "Freezing occurs when water is cooled to 0°C (32°F) or below.": "నీరు 0°C (32°F) లేదా అంతకంటే తక్కువకు చల్లబడినప్పుడు గడ్డకడుతుంది.",
    "Which of these is a living thing?": "వీటిలో జీవం ఉన్నది ఏది?",
    "Rock": "రాయి", "Toy Car": "బొమ్మ కారు", "Tree": "చెట్టు", "Book": "పుస్తకం",
    "Trees are living things as they grow, breathe, and reproduce.": "చెట్లు పెరుగుతాయి, శ్వాసిస్తాయి మరియు ప్రత్యుత్పత్తి జరుపుతాయి కాబట్టి అవి సజీవులు.",
    "How many senses do humans have?": "మనుషులకు ఎన్ని జ్ఞానేంద్రియాలు ఉన్నాయి?",
    "Humans have 5 basic senses: sight, hearing, smell, taste, and touch.": "మనుషులకు 5 జ్ఞానేంద్రియాలు ఉన్నాయి: చూపు, వినికిడి, వాసన, రుచి, స్పర్శ.",
    "Which planet is our home?": "ఏ గ్రహం మన ఇల్లు?",
    "Mars": "అంగారకుడు (Mars)", "Venus": "శుక్రుడు", "Earth": "భూమి", "Jupiter": "బృహస్పతి",
    "Earth is the third planet from the Sun and our home planet.": "సూర్యుడి నుండి భూమి మూడవ గ్రహం మరియు మన నివాస గ్రహం.",
    "What is the main source of light for Earth?": "భూమికి ప్రధాన కాంతి వనరు ఏది?",
    "Moon": "చంద్రుడు", "Sun": "సూర్యుడు", "Stars": "నక్షత్రాలు", "Fireflies": "మినుగురు పురుగులు",
    "The Sun is our solar system's star and provides light and heat to Earth.": "సూర్యుడు మన సౌర వ్యవస్థలోని నక్షత్రం, ఇది భూమికి కాంతిని, వేడిని ఇస్తుంది.",

    // Group 1 English
    "Choose the naming word (noun) in: 'The dog barked.'": "నామవాచకం (noun) గుర్తించండి: 'The dog barked.'",
    "dog": "dog (కుక్క)", "barked": "barked (మొరిగింది)", "The": "The", "loudly": "loudly (గట్టిగా)",
    "'dog' is a noun because it names an animal.": "'dog' జంతువు పేరు కాబట్టి అది నామవాచకం.",
    "What is the opposite of 'Hot'?": "'Hot' (వేడి) కి వ్యతిరేక పదం ఏది?",
    "Warm": "Warm (వెచ్చని)", "Cold": "Cold (చల్లని)", "Wet": "Wet (తడి)",
    "The antonym of hot is cold.": "Hot కి వ్యతిరేక పదం Cold.",
    "Which letter is a vowel?": "ఏ అక్షరం అచ్చు (vowel)?",
    "A, E, I, O, U are vowels. E is a vowel.": "A, E, I, O, U లు అచ్చులు. E ఒక అచ్చు.",
    "Choose the correct spelling:": "సరైన స్పెల్లింగ్ ఎంచుకోండి:",
    "Aple": "Aple", "Appel": "Appel", "Apple": "Apple", "Aplee": "Aplee",
    "The correct spelling is 'Apple'.": "సరైన స్పెల్లింగ్ 'Apple'.",
    "Complete: 'The birds are ___ in the sky.'": "ఖాళీని పూరించండి: 'The birds are ___ in the sky.'",
    "flying": "flying (ఎగురుతున్నాయి)", "fly": "fly (ఎగరడం)", "flown": "flown (ఎగిరిపోయాయి)", "flew": "flew (ఎగిరాయి)",
    "'flying' is the present participle needed for the continuous tense.": "కంటిన్యూయస్ టెన్స్ కోసం 'flying' అవసరం.",
    "What is the plural of 'Cat'?": "'Cat' కి బహువచనం (plural) ఏది?",
    "Cats": "Cats", "Cates": "Cates", "Catse": "Catse", "Kittens": "Kittens",
    "The plural of cat is formed by adding 's', resulting in 'Cats'.": "Cat కి 's' చేర్చడం ద్వారా బహువచనం 'Cats' అవుతుంది.",
    "Choose the action word (verb) in: 'She runs fast.'": "క్రియ (verb) ని గుర్తించండి: 'She runs fast.'",
    "She": "She", "runs": "runs (పరుగెడుతుంది)", "fast": "fast (వేగంగా)", "beautifully": "beautifully (అందంగా)",
    "'runs' is a verb because it describes an action.": "'runs' పనిని తెలియజేస్తుంది కాబట్టి అది క్రియ.",
    "Which word starts with a capital letter?": "ఏ పదం క్యాపిటల్ లెటర్‌తో ప్రారంభమవుతుంది?",
    "monday": "monday", "Monday": "Monday", "mOnday": "mOnday", "MONday": "MONday",
    "Days of the week are proper nouns and must be capitalized: 'Monday'.": "వారాల పేర్లు ప్రొపర్ నౌన్స్ కాబట్టి క్యాపిటల్ లెటర్‌తో ఉండాలి: 'Monday'.",

    // Group 1 Social Studies
    "Who is the 'Father of the Nation' in India?": "భారతదేశ 'జాతిపిత' ఎవరు?",
    "Jawaharlal Nehru": "జవహర్ లాల్ నెహ్రూ", "Mahatma Gandhi": "మహాత్మా గాంధీ", "Subhas Chandra Bose": "సుభాష్ చంద్రబోస్", "Bhagat Singh": "భగత్ సింగ్",
    "Mahatma Gandhi is widely known as the Father of the Nation in India.": "మహాత్మా గాంధీని భారతదేశంలో జాతిపితగా పిలుస్తారు.",
    "Which country do we live in?": "మనం ఏ దేశంలో నివసిస్తున్నాము?",
    "India": "భారతదేశం", "USA": "అమెరికా", "Canada": "కెనడా", "Australia": "ఆస్ట్రేలియా",
    "We live in India.": "మనం భారతదేశంలో నివసిస్తున్నాము.",
    "How many colors are there in the Indian national flag?": "భారత జాతీయ పతాకంలో ఎన్ని రంగులు ఉంటాయి?",
    "The flag has 3 horizontal bands: saffron, white, and green.": "జాతీయ జెండాలో 3 రంగుల పట్టీలు ఉంటాయి: కాషాయం, తెలుపు, ఆకుపచ్చ.",
    "What is the capital of India?": "భారతదేశ రాజధాని ఏది?",
    "Mumbai": "ముంబై", "Kolkata": "కోల్‌కతా", "New Delhi": "న్యూఢిల్లీ", "Chennai": "చెన్నై",
    "New Delhi is the official capital city of India.": "భారతదేశ అధికారిక రాజధాని న్యూఢిల్లీ.",
    "Which festival is known as the Festival of Lights?": "ఏ పండుగను దీపాల పండుగగా పిలుస్తారు?",
    "Holi": "హోలీ", "Diwali": "దీపావళి", "Eid": "రంజాన్", "Christmas": "క్రిస్మస్",
    "Diwali is the Hindu festival of lights, representing victory of light over darkness.": "దీపావళి కాంతి పండుగ, ఇది చీకటిపై వెలుగు సాధించిన విజయానికి చిహ్నం.",
    "What vehicle runs on tracks?": "పట్టాలపై ప్రయాణించే వాహనం ఏది?",
    "Car": "కారు", "Train": "రైలు", "Bicycle": "సైకిల్", "Boat": "పడవ",
    "Trains run on iron tracks called rails.": "రైళ్లు ఇనుప పట్టాలపై ప్రయాణిస్తాయి.",
    "Who helps us when we are sick?": "మనం అనారోగ్యంతో ఉన్నప్పుడు మనకు సహాయం చేసేది ఎవరు?",
    "Teacher": "ఉపాధ్యాయుడు", "Doctor": "వైద్యుడు (Doctor)", "Farmer": "రైతు", "Postman": "పోస్ట్‌మ్యాన్",
    "Doctors treat illnesses and help us stay healthy.": "వైద్యులు మన జబ్బులను నయం చేసి ఆరోగ్యంగా ఉండటానికి సహాయపడతారు.",
    "What is the shape of the Earth?": "భూమి యొక్క ఆకారం ఏమిటి?",
    "Flat": "చదునుగా", "Round/Sphere": "గోళాకారం (గుండ్రంగా)", "Square": "చతురస్రం", "Triangle": "త్రిభుజం",
    "The Earth is an oblate spheroid, which is round like a ball.": "భూమి గోళాకారంలో బంతిలా గుండ్రంగా ఉంటుంది.",

    // Group 2 Math
    "What is the perimeter of a square with side length 6 cm?": "6 సెం.మీ భుజం కలిగిన చతురస్రం చుట్టుకొలత ఎంత?",
    "12 cm": "12 సెం.మీ", "24 cm": "24 సెం.మీ", "36 cm": "36 సెం.మీ", "18 cm": "18 సెం.మీ",
    "Perimeter of a square = 4 × side = 4 × 6 cm = 24 cm.": "చతురస్రం చుట్టుకొలత = 4 × భుజం = 4 × 6 సెం.మీ = 24 సెం.మీ.",
    "If x + 15 = 40, what is x?": "x + 15 = 40 అయితే, x ఎంత?",
    "x = 40 - 15 = 25.": "x = 40 - 15 = 25.",
    "What is 3/4 represented as a decimal?": "3/4 ను దశాంశ రూపంలో ఎలా చూపుతారు?",
    "3/4 = 75/100 = 0.75.": "3/4 = 75/100 = 0.75.",
    "Which of these is a prime number?": "వీటిలో ప్రధాన సంఖ్య ఏది?",
    "17 is a prime number because it is only divisible by 1 and itself.": "17 కేవలం 1 మరియు దానితో మాత్రమే భాగించబడుతుంది కాబట్టి అది ప్రధాన సంఖ్య.",
    "What is the value of 5 cubed (5^3)?": "5 క్యూబ్ (5^3) విలువ ఎంత?",
    "5^3 = 5 × 5 × 5 = 125.": "5^3 = 5 × 5 × 5 = 125.",

    // Group 2 Science
    "Which gas do plants absorb during photosynthesis?": "కిరణజన్య సంయోగక్రియలో మొక్కలు ఏ వాయువును పీల్చుకుంటాయి?",
    "Plants take in Carbon Dioxide (CO2) and release Oxygen (O2) during photosynthesis.": "మొక్కలు కిరణజన్య సంయోగక్రియలో కార్బన్ డయాక్సైడ్ (CO2) ను పీల్చుకుని, ఆక్సిజн (O2) ను విడుదల చేస్తాయి.",
    "What is the boiling point of water at standard sea level?": "సముద్ర మట్టం వద్ద నీటి మరిగే స్థానం ఎంత?",
    "Water boils at 100 degrees Celsius (212°F).": "నీరు 100 డిగ్రీల సెల్సియస్ వద్ద మరుగుతుంది.",
    "Which organ pumps blood throughout the human body?": "మానవ శరీరంలో రక్తాన్ని పంప్ చేసే అవయవం ఏది?",
    "The heart is a muscular organ that pumps blood through the circulatory system.": "గుండె రక్త ప్రసరణ వ్యవస్థ ద్వారా రక్తాన్ని పంప్ చేసే అవయవం.",
    "What is the closest planet to the Sun?": "సూర్యునికి అత్యంత దగ్గరగా ఉన్న గ్రహం ఏది?",
    "Mercury is the closest planet to the Sun.": "బుధుడు (Mercury) సూర్యునికి అత్యంత దగ్గరగా ఉన్న గ్రహం.",
    "Which pigment gives plants their green color?": "మొక్కలకు ఆకుపచ్చ రంగును ఇచ్చే వర్ణద్రవ్యం ఏది?",
    "Carotene": "కెరోటిన్", "Chlorophyll": "పత్రహరితం (Chlorophyll)", "Hemoglobin": "హిమోగ్లోబిన్", "Melanin": "మెలనిన్",
    "Chlorophyll absorbs light energy and gives plants their green color.": "పత్రహరితం కాంతి శక్తిని గ్రహించి మొక్కలకు ఆకుపచ్చ రంగును ఇస్తుంది.",
    "What force pulls objects toward the center of the Earth?": "వస్తువులను భూమి కేంద్రం వైపు ఆకర్షించే బలం ఏది?",
    "Friction": "ఘర్షణ", "Magnetism": "అయస్కాంతత్వం", "Gravity": "గురుత్వాకర్షణ (Gravity)", "Tension": "తన్యత",
    "Gravity is the attractive force exerted by the Earth's mass.": "గురుత్వాకర్షణ అనేది భూమి యొక్క ద్రవ్యరాశి వల్ల కలిగే ఆకర్షణ శక్తి.",
    "Which of these is a solid state of water?": "వీటిలో నీటి ఘనరూపం ఏది?",
    "Steam": "ఆవిరి", "Rain": "వర్షం", "Ice": "మంచు ముక్క (Ice)", "Dew": "మంచు బిందువులు",
    "Ice is water in its solid phase.": "మంచు అనేది నీటి యొక్క ఘన రూపం.",
    "What part of the cell is known as the powerhouse?": "కణంలో పవర్‌హౌస్‌గా దేనిని పిలుస్తారు?",
    "Nucleus": "కేంద్రకం (Nucleus)", "Mitochondria": "మైటోకాండ్రియా", "Ribosome": "రైబోసోమ్", "Cell Wall": "కణ కవచం",
    "Mitochondria generate most of the chemical energy needed to power the cell's reactions.": "మైటోకాండ్రియా కణానికి అవసరమైన రసాయన శక్తిని ఉత్పత్తి చేస్తుంది.",

    // Group 2 English
    "What is the synonym of 'Enormous'?": "'Enormous' (భారీ) కి సమానార్థక పదం ఏది?",
    "Tiny": "Tiny (చిన్నది)", "Huge": "Huge (భారీ)", "Weak": "Weak (బలహీనమైన)", "Bright": "Bright (తేజోవంతమైన)",
    "'Enormous' means extremely large; 'Huge' is the closest synonym.": "'Enormous' అంటే చాలా పెద్దది, కాబట్టి 'Huge' సరైన సమానార్థక పదం.",
    "Which word is a conjunction?": "ఏ పదం సంధి పదం (conjunction)?",
    "'but' is a coordinating conjunction connecting clauses.": "'but' అనేది వాక్యాలను కలిపే పదం (conjunction).",
    "Identify the adjective in: 'The quick brown fox jumps over the lazy dog.'": "విశేషణం (adjective) ని గుర్తించండి: 'The quick brown fox jumps over the lazy dog.'",
    "jumps": "jumps", "over": "over", "quick": "quick (వేగవంతమైన)", "fox": "fox",
    "'quick' describes the noun 'fox', making it an adjective.": "'quick' అనేది నామవాచకం 'fox' ను వర్ణిస్తుంది కాబట్టి అది విశేషణం.",
    "What is the antonym of 'Generous'?": "'Generous' (ఉదారమైన) కి వ్యతిరేక పదం ఏది?",
    "Kind": "Kind (దయగల)", "Selfish": "Selfish (స్వార్థపూరితమైన)", "Giving": "Giving (దాతృత్వం)", "Friendly": "Friendly (స్నేహపూర్వక)",
    "'Selfish' is the opposite of being giving and generous.": "'Selfish' అనేది ఉదారంగా ఉండటానికి వ్యతిరేక పదం.",

    // Group 2 Social Studies
    "Which continent is known as the 'Dark Continent'?": "ఏ ఖండాన్ని చీకటి ఖండం (Dark Continent) అని పిలుస్తారు?",
    "Asia": "ఆసియా", "Africa": "ఆఫ్రికా", "South America": "దక్షిణ అమెరికా",
    "Africa was called the 'Dark Continent' because its interiors were largely unknown to outsiders.": "ఆఫ్రికా అంతర్భాగం ఇతరులకు తెలియదు కాబట్టి దానిని చీకటి ఖండం అని పిలిచేవారు.",
    "What is the capital of France?": "ఫ్రాన్స్ రాజధాని ఏది?",
    "Rome": "రోమ్", "Berlin": "బెర్లిన్", "London": "లండన్", "Paris": "పారిస్",
    "Paris is the capital and largest city of France.": "ఫ్రాన్స్ రాజధాని మరియు అతిపెద్ద నగరం పారిస్.",
    "Which is the longest river in the world?": "ప్రపంచంలోనే అతి పొడవైన నది ఏది?",
    "Amazon River": "అమెజాన్ నది", "Nile River": "నైలు నది", "Yangtze River": "యాంగ్జీ నది", "Mississippi River": "మిసిసిపీ నది",
    "The Nile River in Africa is about 6,650 km long and generally considered the longest.": "ఆఫ్రికాలోని నైలు నది ప్రపంచంలోనే అతి పొడవైనది (సుమారు 6,650 కి.మీ).",
    "Who wrote the Indian Constitution?": "భారత రాజ్యాంగాన్ని రచించింది ఎవరు?",
    "Dr. B.R. Ambedkar": "డాక్టర్ బి.ఆర్. అంబేద్కర్",
    "Dr. Bhimrao Ramji Ambedkar was the Chairman of the Drafting Committee.": "డాక్టర్ భీమ్‌రావ్ రామ్‌జీ అంబేద్కర్ రాజ్యాంగ ముసాయిదా కమిటీ చైర్మన్.",
    "Which is the smallest state in India by area?": "వైశాల్యం ప్రకారం భారతదేశంలో అతిచిన్న రాష్ట్రం ఏది?",
    "Goa": "గోవా", "Sikkim": "సిక్కిం", "Tripura": "త్రిపుర", "Mizoram": "మిజోరం",
    "Goa is India's smallest state by land area.": "వైశాల్యం పరంగా గోవా భారతదేశంలోనే అతిచిన్న రాష్ట్రం.",
    "Which planet is known as the Red Planet?": "ఏ గ్రహాన్ని అరుణ గ్రహం (ఎరుపు గ్రహం) అని పిలుస్తారు?",
    "Mars": "అంగారక గ్రహం (Mars)",
    "Mars appears red due to iron oxide (rust) on its surface.": "ఉపరితలంపై ఐరన్ ఆక్సైడ్ ఉండటం వల్ల అంగారకుడు ఎరుపు రంగులో కనిపిస్తాడు.",

    // Group 3 Math
    "What is the square root of 225?": "225 యొక్క వర్గమూలం ఎంత?",
    "15 × 15 = 225, so the square root of 225 is 15.": "15 × 15 = 225 కాబట్టి, 225 యొక్క వర్గమూలం 15.",
    "If log_2(x) = 5, what is the value of x?": "log_2(x) = 5 అయితే, x విలువ ఎంత?",
    "log_2(x) = 5 means x = 2^5 = 32.": "log_2(x) = 5 అంటే x = 2^5 = 32.",
    "In a right-angled triangle, if base = 3cm and height = 4cm, what is the hypotenuse?": "సమకోణ త్రిభుజంలో భూమి = 3 సెం.మీ, ఎత్తు = 4 సెం.మీ అయితే కర్ణము ఎంత?",
    "5cm": "5 సెం.మీ", "6cm": "6 సెం.మీ", "7cm": "7 సెం.మీ", "12cm": "12 సెం.మీ",
    "Hypotenuse = √(base^2 + height^2) = √(3^2 + 4^2) = √25 = 5cm.": "కర్ణం = √(భూమి^2 + ఎత్తు^2) = 5 సెం.మీ.",
    "What is the value of sin(90 degrees)?": "sin(90 డిగ్రీలు) విలువ ఎంత?",
    "In trigonometry, the sine of 90 degrees is exactly 1.": "త్రికోణమితిలో sin(90 డిగ్రీలు) విలువ కచ్చితంగా 1.",
    "Solve for x: x^2 - 9 = 0": "x ని సాధించండి: x^2 - 9 = 0",
    "x^2 = 9, which means x = ±√9 = ±3.": "x^2 = 9, అంటే x = ±√9 = ±3.",

    // Group 3 Science
    "Which element has the chemical symbol 'O'?": "ఏ మూలకం యొక్క రసాయన చిహ్నం 'O'?",
    "Gold": "బంగారం", "Osmium": "ఆస్మియం",
    "O is the chemical symbol for Oxygen.": "ఆక్సిజన్ యొక్క రసాయన చిహ్నం 'O'.",
    "What is the speed of light in a vacuum?": "శూన్యంలో కాంతి వేగం ఎంత?",
    "The speed of light is approximately 299,792 km/s, commonly rounded to 300,000 km/s.": "కాంతి వేగం సెకనుకు సుమారు 3,00,000 కి.మీ.",
    "What type of bond is formed by sharing electrons?": "ఎలక్ట్రాన్ల భాగస్వామ్యం ద్వారా ఏర్పడే బంధం ఏది?",
    "Ionic bond": "అయానిక్ బంధం", "Covalent bond": "సహసంయోజక బంధం (Covalent)", "Hydrogen bond": "హైడ్రోజన్ బంధం", "Metallic bond": "లోహ బంధం",
    "Covalent bonding involves the sharing of electron pairs between atoms.": "పరమాణువుల మధ్య ఎలక్ట్రాన్ల పంపకం ద్వారా సహసంయోజక బంధం ఏర్పడుతుంది.",
    "What is the unit of electrical resistance?": "విద్యుత్ నిరోధకత యొక్క ప్రమాణం ఏమిటి?",
    "Volt": "వోల్ట్", "Ampere": "ఆంపియర్", "Ohm": "ఓమ్ (Ohm)", "Watt": "వాట్",
    "Ohm (Ω) is the SI unit of electrical resistance.": "విద్యుత్ నిరోధకతకు SI ప్రమాణం ఓమ్ (Ω).",
    "Which law states that action and reaction are equal and opposite?": "చర్య మరియు ప్రతిచర్య సమానం మరియు వ్యతిరేకం అని చెప్పే నియమం ఏది?",
    "Newton's 1st Law": "న్యూటన్ మొదటి నియమం", "Newton's 2nd Law": "న్యూటన్ రెండవ నియమం", "Newton's 3rd Law": "న్యూటన్ మూడవ నియమం", "Kepler's Law": "కెప్లర్ నియమం",
    "Newton's Third Law of Motion states that for every action, there is an equal and opposite reaction.": "న్యూటన్ మూడవ గమన నియమం ప్రకారం ప్రతి చర్యకు సమానమైన మరియు వ్యతిరేకమైన ప్రతిచర్య ఉంటుంది.",

    // Group 3 English
    "Identify the figure of speech: 'The stars danced playfully in the moonlit sky.'": "అలంకారం (figure of speech) గుర్తించండి: 'The stars danced playfully in the moonlit sky.'",
    "Metaphor": "రూపకం (Metaphor)", "Simile": "ఉపమాలంకారం (Simile)", "Personification": "మూర్తీకరణం (Personification)", "Hyperbole": "అతిశయోక్తి (Hyperbole)",
    "Giving human traits (dancing) to non-human things (stars) is personification.": "నిర్జీవులకు మానవ లక్షణాలను ఆపాదించడాన్ని పర్సానిఫికేషన్ అంటారు.",
    "What is the synonym of 'Pragmatic'?": "'Pragmatic' (వ్యవహారిక) కి సమానార్థక పదం ఏది?",
    "Idealistic": "Idealistic (ఆదర్శవాదం)", "Practical": "Practical (వ్యవహారిక)", "Careless": "Careless (అజాగ్రత్త)", "Dynamic": "Dynamic (యాక్టివ్)",
    "'Pragmatic' means dealing with things sensibly and realistically, hence 'Practical'.": "'Pragmatic' అంటే వాస్తవికంగా వ్యవహరించడం, కాబట్టి 'Practical' సరైనది.",

    // Group 3 Social Studies
    "In which year did India gain Independence from British rule?": "భారతదేశానికి ఏ సంవత్సరంలో స్వాతంత్ర్యం వచ్చింది?",
    "India achieved independence on August 15, 1947.": "భారతదేశానికి ఆగస్టు 15, 1947 న స్వాతంత్ర్యం వచ్చింది.",
    "Who was the first Prime Minister of independent India?": "స్వతంత్ర భారతదేశ మొదటి ప్రధానమంత్రి ఎవరు?",
    "Sardar Vallabhbhai Patel": "సర్దార్ వల్లభాయ్ పటేల్", "Dr. Rajendra Prasad": "డాక్టర్ రాజేంద్ర ప్రసాద్",
    "Jawaharlal Nehru took office on August 15, 1947.": "జవహర్ లాల్ నెహ్రూ ఆగస్టు 15, 1947 న పదవీ బాధ్యతలు స్వీకరించారు.",
    "Which is the largest country in the world by land area?": "భూవైశాల్యం ప్రకారం ప్రపంచంలోనే అతిపెద్ద దేశం ఏది?",
    "Russia": "రష్యా",
    "Russia is the largest country, spanning Eastern Europe and Northern Asia.": "రష్యా వైశాల్యం పరంగా ప్రపంచంలోనే అతిపెద్ద దేశం.",
    "The Harappan Civilization was situated near which river basin?": "హరప్పా నాగరికత ఏ నది లోయ వద్ద వెలిసింది?",
    "Ganges": "గంగా నది", "Indus": "సింధు నది (Indus)", "Yamuna": "యమునా నది", "Narmada": "నర్మదా నది",
    "The Bronze Age Harappan civilization flourished around the Indus River basin.": "హరప్పా నాగరికత సింధు నది పరివాహక ప్రాంతంలో వర్ధిల్లింది.",
    "What is the term duration of the Lok Sabha in India?": "భారతదేశంలో లోక్‌సభ పదవీ కాలం ఎంత?",
    "The Lok Sabha, or lower house of Parliament, has a term of 5 years.": "లోక్‌సభ పదవీ కాలం 5 సంవత్సరాలు.",

    // --- 96 New Questions Translations (Telugu) ---
    // Lower Math (Class <= 3)
    "What is 5 plus 3?": "5 ప్లస్ 3 ఎంత?",
    "5 + 3 = 8.": "5 + 3 = 8.",
    "Which number comes after 19?": "19 తర్వాత వచ్చే సంఖ్య ఏది?",
    "20 comes after 19.": "19 తర్వాత 20 వస్తుంది.",
    "A rectangle has how many corners?": "దీర్ఘచతురస్రానికి ఎన్ని మూలలు ఉంటాయి?",
    "A rectangle has 4 corners.": "దీర్ఘచతురస్రానికి 4 మూలలు ఉంటాయి.",
    "If you share 6 candies equally between 2 friends, how many does each get?": "మీరు 6 చాక్లెట్లను 2 స్నేహితులకు సమానంగా పంచితే, ప్రతి ఒక్కరికీ ఎన్ని వస్తాయి?",
    "6 ÷ 2 = 3 candies.": "6 ÷ 2 = 3 చాక్లెట్లు.",
    "What is 20 minus 5?": "20 మైనస్ 5 ఎంత?",
    "20 - 5 = 15.": "20 - 5 = 15.",
    "How many wheels does a bicycle have?": "సైకిల్‌కు ఎన్ని చక్రాలు ఉంటాయి?",
    "A bicycle has 2 wheels.": "సైకిల్‌కు 2 చక్రాలు ఉంటాయి.",
    "What is the double of 6?": "6 యొక్క రెట్టింపు (double) ఎంత?",
    "Double of 6 is 12 (6 + 6 = 12).": "6 యొక్క రెట్టింపు 12 (6 + 6 = 12).",

    // Middle Math (Class 4 to 7)
    "What is 100 divided by 4?": "100 ని 4 తో భాగిస్తే ఎంత వస్తుంది?",
    "100 ÷ 4 = 25.": "100 ÷ 4 = 25.",
    "What is the area of a rectangle with length 5 cm and width 4 cm?": "5 సెం.మీ పొడవు, 4 సెం.మీ వెడల్పు ఉన్న దీర్ఘచతురస్రం వైశాల్యం ఎంత?",
    "9 sq cm": "9 చ.సెం.మీ", "18 sq cm": "18 చ.సెం.మీ", "20 sq cm": "20 చ.సెం.మీ", "25 sq cm": "25 చ.సెం.మీ",
    "Area = length × width = 5 × 4 = 20 sq cm.": "వైశాల్యం = పొడవు × వెడల్పు = 5 × 4 = 20 చ.సెం.మీ.",
    "Find the average of 10, 20, and 30?": "10, 20 మరియు 30 ల సగటు (average) ఎంత?",
    "Average = (10 + 20 + 30) ÷ 3 = 60 ÷ 3 = 20.": "సగటు = (10 + 20 + 30) ÷ 3 = 60 ÷ 3 = 20.",
    "What is 15% of 200?": "200 లో 15% ఎంత?",
    "15% of 200 = 15/100 × 200 = 30.": "200 లో 15% = 15/100 × 200 = 30.",
    "If a triangle has angles of 60° and 50°, what is the third angle?": "ఒక త్రిభుజం యొక్క రెండు కోణాలు 60° మరియు 50° అయితే, మూడవ కోణం ఎంత?",
    "Sum of angles in a triangle is 180°. Third angle = 180° - 60° - 50° = 70°.": "త్రిభుజంలోని కోణాల మొత్తం 180°. మూడవ కోణం = 180° - 60° - 50° = 70°.",
    "Convert 0.4 into a fraction in its simplest form.": "0.4 ను అతి సరళమైన భిన్న రూపంలోకి మార్చండి.",
    "1/4": "1/4", "2/5": "2/5", "4/10": "4/10", "1/2": "1/2",
    "0.4 = 4/10 = 2/5.": "0.4 = 4/10 = 2/5.",
    "What is the value of 2 to the power of 5 (2^5)?": "2 పవర్ 5 (2^5) విలువ ఎంత?",
    "2^5 = 2 × 2 × 2 × 2 × 2 = 32.": "2^5 = 2 × 2 × 2 × 2 × 2 = 32.",

    // Higher Math (Class 8+)
    "Evaluate: (x + 3)(x - 3)": "విలువను కనుగొనండి: (x + 3)(x - 3)",
    "(a+b)(a-b) = a^2 - b^2. So, (x+3)(x-3) = x^2 - 9.": "(a+b)(a-b) = a^2 - b^2. కాబట్టి, (x+3)(x-3) = x^2 - 9.",
    "If f(x) = 2x^2 - 3x + 5, what is f(2)?": "f(x) = 2x^2 - 3x + 5 అయితే, f(2) ఎంత?",
    "f(2) = 2(2)^2 - 3(2) + 5 = 8 - 6 + 5 = 7.": "f(2) = 2(2)^2 - 3(2) + 5 = 8 - 6 + 5 = 7.",
    "Find the slope of the line y = 3x - 5.": "y = 3x - 5 సరళరేఖ యొక్క వాలు (slope) ని కనుగొనండి.",
    "The equation is in slope-intercept form y = mx + c, where slope m = 3.": "ఈ సమీకరణం వాలు-అంతరఖండ రూపంలో (y = mx + c) ఉంది, ఇక్కడ వాలు m = 3.",
    "What is the probability of tossing a coin and getting heads?": "ఒక నాణేన్ని ఎగురవేసినప్పుడు బొమ్మ (heads) పడే సంభావ్యత ఎంత?",
    "Probability of heads = 1 favorable outcome / 2 total outcomes = 0.5.": "బొమ్మ పడే సంభావ్యత = 1 అనుకూల ఫలితం / 2 మొత్తం ఫలితాలు = 0.5.",
    "If a circle has a radius of 7 cm, what is its approximate area? (Use pi = 22/7)": "ఒక వృత్తం వ్యాసార్థం 7 సెం.మీ అయితే, దాని సుమారు వైశాల్యం ఎంత? (pi = 22/7 ఉపయోగించండి)",
    "Area = pi × r^2 = 22/7 × 7 × 7 = 154 sq cm.": "వైశాల్యం = pi × r^2 = 22/7 × 7 × 7 = 154 చ.సెం.మీ.",
    "Solve for x: 2^(x+1) = 8": "x ని సాధించండి: 2^(x+1) = 8",
    "2^(x+1) = 2^3, which means x + 1 = 3. So, x = 2.": "2^(x+1) = 2^3, అంటే x + 1 = 3. కాబట్టి, x = 2.",
    "What is the value of cos(0 degrees)?": "cos(0 డిగ్రీలు) విలువ ఎంత?",
    "In trigonometry, the cosine of 0 degrees is exactly 1.": "త్రికోణమితిలో cos(0 డిగ్రీలు) విలువ కచ్చితంగా 1.",

    // Lower Science (Class <= 3)
    "Which plant part makes food?": "మొక్క యొక్క ఏ భాగం ఆహారాన్ని తయారు చేస్తుంది?",
    "Roots": "వేర్లు", "Leaves": "ఆకులు", "Stem": "కాండం", "Flower": "పువ్వు",
    "Leaves make food for the plant using sunlight (photosynthesis).": "ఆకులు సూర్యరశ్మి సహాయంతో మొక్కకు ఆహారాన్ని తయారు చేస్తాయి (కిరణజన్య సంయోగక్రియ).",
    "Which animal lays eggs?": "ఏ జంతువు గుడ్లు పెడుతుంది?",
    "Dog": "కుక్క", "Cat": "పిల్లి", "Hen": "కోడి", "Cow": "ఆవు",
    "Hens lay eggs, while mammals give birth to live young.": "కోళ్లు గుడ్లు పెడతాయి, కానీ క్షీరదాలు పిల్లలకి జన్మనిస్తాయి.",
    "Which organ do we use to see?": "చూడటానికి మనం ఏ అవయవాన్ని ఉపయోగిస్తాము?",
    "Ears": "చెవులు", "Nose": "ముక్కు", "Eyes": "కళ్లు", "Skin": "చర్మం",
    "We use our eyes to see the world.": "ప్రపంచాన్ని చూడటానికి మనం మన కళ్లను ఉపయోగిస్తాము.",
    "What do we call a baby dog?": "కుక్క పిల్లని ఏమని పిలుస్తాము?",
    "Kitten": "పిల్లి పిల్ల", "Puppy": "కుక్క పిల్ల (Puppy)", "Cub": "సింహం/పులి పిల్ల", "Calf": "దూడ",
    "A baby dog is called a puppy.": "కుక్క పిల్లని పప్పీ (puppy) అని పిలుస్తారు.",
    "Which of these is a non-living thing?": "వీటిలో నిర్జీవమైనది ఏది?",
    "Bird": "పక్షి", "Fish": "చేప", "Table": "బల్ల (Table)", "Grass": "గడ్డి",
    "A table does not grow, breathe, or reproduce.": "బల్ల పెరగదు, శ్వాస తీసుకోదు లేదా ప్రత్యుత్పత్తి జరపదు.",
    "How many legs does a spider have?": "సాలీడుకు (spider) ఎన్ని కాళ్లు ఉంటాయి?",
    "Spiders are arachnids and have 8 legs.": "సాలీళ్లు అరాక్నిడ్స్ జాతికి చెందినవి మరియు వాటికి 8 కాళ్లు ఉంటాయి.",
    "What is the color of a fresh leaf?": "పచ్చని ఆకు రంగు ఏమిటి?",
    "Red": "ఎరుపు", "Blue": "నీలం", "Green": "ఆకుపచ్చ", "Yellow": "పసుపు",
    "Fresh leaves are green due to chlorophyll.": "పత్రహరితం (chlorophyll) ఉండటం వల్ల ఆకులు ఆకుపచ్చగా ఉంటాయి.",
    "We get wool from which animal?": "మనకు ఉన్ని (wool) ఏ జంతువు నుండి లభిస్తుంది?",
    "Sheep": "గొర్రె (Sheep)", "Horse": "గుర్రం", "Pig": "పంది",
    "Sheep provide us with wool to make warm clothes.": "వెచ్చని బట్టలు తయారు చేయడానికి గొర్రెలు మనకు ఉన్నిని ఇస్తాయి.",

    // Middle Science (Class 4 to 7)
    "Which planet is known for its beautiful rings?": "అందమైన వలయాలు (rings) ఉన్న గ్రహంగా ఏది ప్రసిద్ధి చెందింది?",
    "Saturn": "శని",
    "Saturn has the most extensive ring system in the solar system.": "సౌర వ్యవస్థలో శని గ్రహానికి అత్యంత విస్తృతమైన వలయాల వ్యవస్థ ఉంది.",
    "What gas do humans release when they breathe out?": "మనుషులు శ్వాస వదిలేటప్పుడు ఏ వాయువును విడుదల చేస్తారు?",
    "Carbon Monoxide": "కార్బన్ మోనాక్సైడ్",
    "Humans breathe out Carbon Dioxide as a waste product of respiration.": "మానవులు శ్వాసక్రియ వ్యర్థ పదార్థంగా కార్బన్ డయాక్సైడ్‌ను బయటకు వదులుతారు.",
    "Which organ helps us breathe?": "మనం శ్వాస తీసుకోవడానికి ఏ అవయవం సహాయపడుతుంది?",
    "Stomach": "జీర్ణాశయం (కడుపు)", "Lungs": "ఊపిరితిత్తులు", "Heart": "గుండె", "Kidneys": "మూత్రపిండాలు",
    "Lungs exchange oxygen and carbon dioxide in our body.": "ఊపిరితిత్తులు మన శరీరంలో ఆక్సిజన్ మరియు కార్బన్ డయాక్సైడ్ మార్పిడిని చేస్తాయి.",
    "Which state of matter has a fixed volume but no fixed shape?": "ఏ పదార్థ స్థితికి నిర్దిష్ట పరిమాణం ఉంటుంది కానీ నిర్దిష్ట ఆకారం ఉండదు?",
    "Solid": "ఘనపదార్థం", "Liquid": "ద్రవపదార్థం (Liquid)", "Gas": "వాయువు", "Plasma": "ప్లాస్మా",
    "Liquids take the shape of their container but maintain a constant volume.": "ద్రవాలు తాము ఉన్న పాత్ర ఆకారాన్ని పొందుతాయి కానీ స్థిరమైన పరిమాణాన్ని కలిగి ఉంటాయి.",
    "What is the process of water changing into water vapor called?": "నీరు నీటి ఆవిరిగా మారే ప్రక్రియను ఏమంటారు?",
    "Condensation": "సాంద్రీకరణం", "Evaporation": "బాష్పీభవనం (Evaporation)", "Freezing": "ఘనీభవనం", "Melting": "ద్రవీభవనం",
    "Evaporation is the process of liquid water changing into gas (vapor).": "ద్రవ రూపంలో ఉన్న నీరు వాయు రూపంలోకి (ఆవిరి) మారే ప్రక్రియను బాష్పీభవనం అంటారు.",
    "Which vitamin do we get from sunlight?": "సూర్యరశ్మి నుండి మనకు ఏ విటమిన్ లభిస్తుంది?",
    "Vitamin A": "విటమిన్ A", "Vitamin B": "విటమిన్ B", "Vitamin C": "విటమిన్ C", "Vitamin D": "విటమిన్ D",
    "Our skin synthesizes Vitamin D when exposed to sunlight.": "సూర్యరశ్మి సోకినప్పుడు మన చర్మం విటమిన్ D ని తయారు చేసుకుంటుంది.",
    "What is the primary function of plant roots?": "మొక్కల వేర్ల యొక్క ప్రాథమిక విధి ఏమిటి?",
    "Make food": "ఆహారం తయారు చేయడం", "Produce flowers": "పువ్వులను ఉత్పత్తి చేయడం", "Absorb water and minerals": "నీరు మరియు ఖниజాలను పీల్చుకోవడం", "Release oxygen": "ఆక్సిజన్‌ను విడుదల చేయడం",
    "Roots absorb water and dissolved minerals from the soil.": "వేర్లు నేల నుండి నీటిని మరియు ఖనిజాలను పీల్చుకుంటాయి.",
    "Which instrument is used to measure temperature?": "ఉష్ణోగ్రతను కొలవడానికి ఏ పరికరాన్ని ఉపయోగిస్తారు?",
    "Barometer": "బారోమీటర్", "Thermometer": "థర్మామీటర్", "Speedometer": "స్పీడోమీటర్", "Rain gauge": "వర్షపాత సూచిక (రైన్ గేజ్)",
    "A thermometer measures temperature, usually in Celsius or Fahrenheit.": "థర్మామీటర్ ఉష్ణోగ్రతను కొలుస్తుంది, సాధారణంగా సెల్సియస్ లేదా ఫారెన్‌హీట్‌లో.",

    // Higher Science (Class 8+)
    "What is the chemical formula of table salt?": "సాధారణ ఉప్పు యొక్క రసాయన సూత్రం (chemical formula) ఏమిటి?",
    "Table salt is Sodium Chloride (NaCl).": "సాధారణ ఉప్పు అంటే సోడియం క్లోరైడ్ (NaCl).",
    "What is the powerhouse of the cell?": "కణం యొక్క పవర్‌హౌస్ అని దేనిని పిలుస్తారు?",
    "Golgi Body": "గోల్గి సంక్లిష్టం",
    "Mitochondria generate ATP, the cell's energy currency.": "మైటోకాండ్రియా కణానికి శక్తి కరెన్సీ అయిన ATP ని ఉత్పత్తి చేస్తుంది.",
    "Which metal is liquid at room temperature?": "గది ఉష్ణోగ్రత వద్ద ద్రవ రూపంలో ఉండే లోహం ఏది?",
    "Iron": "ఇనుము", "Mercury": "పాదరసం (Mercury)", "Copper": "రాగి",
    "Mercury (Hg) is the only metal that is liquid at standard room temperature.": "పాదరసం (Hg) గది ఉష్ణోగ్రత వద్ద ద్రవ రూపంలో ఉండే ఏకైక లోహం.",
    "What type of mirror is used as a shaving mirror?": "గడ్డం గీసుకోవడానికి ఉపయోగించే అద్దం (shaving mirror) ఏ రకానికి చెందినది?",
    "Plane mirror": "సమతల దర్పణం", "Concave mirror": "పుటాకార దర్పణం (Concave)", "Convex mirror": "కుంభాకార దర్పణం", "Double mirror": "ద్వంద్వ దర్పణం",
    "Concave mirrors form magnified, erect images when objects are close.": "పుటాకార దర్పణాలు వస్తువులు దగ్గరగా ఉన్నప్పుడు పెద్దదైన మరియు నిటారుగా ఉన్న ప్రతిబింబాన్ని ఏర్పరుస్తాయి.",
    "What is the SI unit of force?": "బలం యొక్క SI ప్రమాణం ఏమిటి?",
    "Joule": "జౌల్", "Watt": "వాట్", "Newton": "న్యూటన్", "Pascal": "పాస్కల్",
    "Newton (N) is the SI unit of force, named after Sir Isaac Newton.": "న్యూటన్ (N) అనేది బలం యొక్క SI ప్రమాణం, సర్ ఐజాక్ న్యూటన్ పేరు మీదుగా దీనికి ఈ పేరు వచ్చింది.",
    "Which component of blood carries oxygen?": "రక్తంలో ఏ భాగం ఆక్సిజన్‌ను మోసుకెళుతుంది?",
    "White Blood Cells": "తెల్ల రక్త కణాలు", "Red Blood Cells": "ఎర్ర రక్త కణాలు", "Platelets": "ప్లేట్‌లెట్స్", "Plasma": "ప్లాస్మా",
    "Red blood cells contain hemoglobin, which binds and carries oxygen.": "ఎర్ర రక్త కణాలలో హిమోగ్లోబిన్ ఉంటుంది, ఇది ఆక్సిజన్‌ను బంధించి సరఫరా చేస్తుంది.",
    "What is the escape velocity of Earth?": "భూమి యొక్క పలాయన వేగం (escape velocity) ఎంత?",
    "The escape velocity from Earth's surface is about 11.2 km/s.": "భూ ఉపరితలం నుండి పలాయన వేగం సెకనుకు సుమారు 11.2 కి.మీ.",
    "What is the main function of the kidneys?": "మూత్రపిండాల (kidneys) ప్రధాన విధి ఏమిటి?",
    "Pump blood": "రక్తాన్ని పంప్ చేయడం", "Digest food": "ఆహారాన్ని జీర్ణం చేయడం", "Filter waste from blood": "రక్తం నుండి వ్యర్థాలను వడపోత చేయడం", "Produce hormones": "హార్మోన్లను ఉత్పత్తి చేయడం",
    "Kidneys filter blood to remove waste products and excess fluids as urine.": "మూత్రపిండాలు రక్తాన్ని వడపోసి, వ్యర్థ పదార్థాలను మరియు అదనపు ద్రవాలను మూత్రం రూపంలో బయటకు పంపుతాయి.",

    // Lower English (Class <= 3)
    "Choose the correct pronoun: '___ is a good boy.'": "సరైన సర్వనామం (pronoun) ఎంచుకోండి: '___ is a good boy.'",
    "'He' is the pronoun used for boys.": "బాలురకు 'He' అనే సర్వనామాన్ని ఉపయోగిస్తారు.",
    "What is the opposite of 'Big'?": "'Big' (పెద్ద) కి వ్యతిరేక పదం ఏది?",
    "Small": "చిన్నది (Small)", "Tall": "పొడవాటి", "Heavy": "బరువైన",
    "The opposite of big is small.": "Big కి వ్యతిరేక పదం Small.",
    "Identify the adjective in: 'She has a blue pen.'": "విశేషణం (adjective) గుర్తించండి: 'She has a blue pen.'",
    "'blue' పెన్నును వర్ణిస్తుంది కాబట్టి అది విశేషణం.": "'blue' పెన్నును వర్ణిస్తుంది కాబట్టి అది విశేషణం.",
    "What is the plural of 'Dog'?": "'Dog' కి బహువచనం (plural) ఏది?",
    "The plural of dog is dogs.": "Dog కి బహువచనం dogs.",
    "Which word rhymes with 'Cat'?": "'Cat' కి ప్రాస పదం (rhyming word) ఏది?",
    "'Hat' rhymes with 'Cat' as they have the same ending sound.": "'Hat' మరియు 'Cat' ఒకే విధమైన ఉచ్చారణను కలిగి ఉంటాయి.",
    "Complete: 'I have ___ apple.'": "ఖాళీని పూరించండి: 'I have ___ apple.'",
    "'apple' అచ్చు శబ్దంతో ప్రారంభమవుతుంది కాబట్టి మనం 'an' ని ఉపయోగిస్తాము.": "'apple' అచ్చు శబ్దంతో ప్రారంభమవుతుంది కాబట్టి మనం 'an' ని ఉపయోగిస్తాము.",
    "What is the opposite of 'Happy'?": "'Happy' (సంతోషం) కి వ్యతిరేక పదం ఏది?",
    "Sad": "Sad (బాధగా)", "Glad": "Glad (సంతోషంగా)", "Angry": "Angry (కోపంగా)", "Silly": "Silly (చిలిపి)",
    "The opposite of happy is sad.": "Happy కి వ్యతిరేక పదం sad.",
    "Which of these is a verb (doing word)?": "వీటిలో క్రియ (verb) ఏది?",
    "'Run' describes an action, so it is a verb.": "'Run' పనిని తెలియజేస్తుంది కాబట్టి అది క్రియ.",

    // Middle English (Class 4 to 7)
    "Identify the adverb in: 'He ran quickly.'": "క్రియావిశేషణం (adverb) గుర్తించండి: 'He ran quickly.'",
    "'quickly' describes how he ran, making it an adverb.": "'quickly' అతను ఎలా పరుగెత్తాడో వర్ణిస్తుంది కాబట్టి అది క్రియావిశేషణం.",
    "What is the synonym of 'Courageous'?": "'Courageous' (ధైర్యవంతుడు) కి సమానార్థక పదం ఏది?",
    "Timid": "Timid (భయస్తుడు)", "Brave": "Brave (ధైర్యవంతుడు)", "Scared": "Scared (భయపడిన)", "Polite": "Polite (మర్యాదపూర్వక)",
    "'Courageous' means brave.": "'Courageous' అంటే ధైర్యవంతుడు (brave).",
    "What is the antonym of 'Difficult'?": "'Difficult' (కఠినమైన) కి వ్యతిరేక పదం ఏది?",
    "Hard": "Hard (కఠినమైన)", "Simple/Easy": "Simple/Easy (సులభమైన)", "Rough": "Rough (గరుకుగా)", "Tough": "Tough (కఠినమైన)",
    "The opposite of difficult is easy.": "Difficult కి వ్యతిరేక పదం easy.",
    "Complete: 'Neither Mary nor her friends ___ going to the party.'": "ఖాళీని పూరించండి: 'Neither Mary nor her friends ___ going to the party.'",
    "In neither-nor construction, the verb agrees with the closer subject 'friends' (plural), so we use 'are'.": "Neither-nor నిర్మాణంలో క్రియ దానికి దగ్గరగా ఉన్న సబ్జెక్ట్ 'friends' (బహువచనం) కి అనుగుణంగా ఉంటుంది, కాబట్టి మనం 'are' ని ఉపయోగిస్తాము.",
    "Identify the conjunction: 'We stayed indoors because it was raining.'": "సంయోజకం (conjunction) గుర్తించండి: 'We stayed indoors because it was raining.'",
    "'because' joins two clauses, so it is a conjunction.": "'because' రెండు వాక్యాలను కలుపుతుంది కాబట్టి అది కంజంక్షన్.",
    "Choose the correct spelling:": "సరైన స్పెల్లింగ్ ఎంచుకోండి:",
    "The correct spelling is 'Tomorrow'.": "సరైన స్పెల్లింగ్ 'Tomorrow'.",
    "What is a group of lions called?": "సింహాల గుంపును ఏమని పిలుస్తారు?",
    "Pack": "Pack", "Herd": "Herd (మంద)", "Pride": "Pride", "Flock": "Flock (మంద)",
    "A group of lions is called a pride.": "సింహాల గుంపును ప్రైడ్ (pride) అని పిలుస్తారు.",
    "Which word is a preposition in: 'The key is under the mat.'": "దీనిలో ప్రిపొజిషన్ (preposition) ఏది: 'The key is under the mat.'",
    "'under' indicates position, so it is a preposition.": "'under' స్థానాన్ని సూచిస్తుంది కాబట్టి అది ప్రిపొజిషన్.",

    // Higher English (Class 8+)
    "Identify the correct meaning of 'Altruistic':": "Altruistic యొక్క సరైన అర్థాన్ని గుర్తించండి:",
    "Unselfish/Generous": "Unselfish/Generous (స్వార్థరహిత/ఉదారమైన)", "Arrogant": "Arrogant (గర్వంగల)",
    "'Altruistic' means showing unselfish concern for the welfare of others.": "'Altruistic' అంటే ఇతరుల శ్రేయస్సు కోసం స్వార్థరహిత శ్రద్ధ చూపడం.",
    "What is the antonym of 'Obsolete'?": "'Obsolete' కి వ్యతిరేక పదం ఏది?",
    "Ancient": "Ancient (పురాతన)", "Outdated": "Outdated (పాతబడిన)", "Modern/Current": "Modern/Current (ఆధునిక/ప్రస్తుత)", "Extinct": "Extinct (అంతరించిపోయిన)",
    "'Obsolete' means no longer in use; its opposite is modern/current.": "'Obsolete' అంటే ఇకపై వాడుకలో లేనిది; దీనికి వ్యతిరేకం ఆధునిక/ప్రస్తుత.",
    "Identify the figure of speech: 'He is as busy as a bee.'": "అలంకారం (figure of speech) గుర్తించండి: 'He is as busy as a bee.'",
    "Alliteration": "అనుప్రాస అలంకారం", "Oxymoron": "విరోధాభాస అలంకారం",
    "A comparison using 'as' or 'like' is a simile.": "'as' లేదా 'like' ఉపయోగించి పోల్చడాన్ని ఉపమాలంకారం (simile) అంటారు.",
    "Complete: 'If I ___ you, I would study harder.'": "ఖాళీని పూరించండి: 'If I ___ you, I would study harder.'",
    "In subjunctive mood for hypothetical situations, we use 'were' regardless of the subject.": "ఊహాజనిత పరిస్థితుల కోసం సబ్‌జంక్టివ్ మూడ్‌లో సబ్జెక్ట్‌తో సంబంధం లేకుండా మనం 'were' ని ఉపయోగిస్తాము.",
    "What does the idiom 'Beat around the bush' mean?": "'Beat around the bush' అనే జాతీయానికి (idiom) అర్థం ఏమిటి?",
    "To cut trees": "చెట్లను నరకడం", "To avoid the main topic": "ప్రధాన విషయాన్ని దాటవేయడం/సోది చెప్పడం", "To work hard": "కష్టపడి పనిచేయడం", "To play in the forest": "అడవిలో ఆటలాడటం",
    "'Beat around the bush' means to talk about irrelevant things to avoid speaking directly about the main topic.": "'Beat around the bush' అంటే ప్రధాన విషయం గురించి నేరుగా మాట్లాడకుండా అనవసరమైన విషయాలు మాట్లాడటం.",
    "Identify the correct spelling:": "సరైన స్పెల్లింగ్ ఎంచుకోండి:",
    "The correct spelling is 'Accommodate' with double 'c' and double 'm'.": "సరైన స్పెల్లింగ్ డబుల్ 'c' మరియు డబుల్ 'm' తో కూడిన 'Accommodate'.",
    "What is the subordinate clause in: 'She will pass the exam if she studies.'": "దీనిలో సబార్డినేట్ క్లాజ్ (subordinate clause) ఏది: 'She will pass the exam if she studies.'",
    "'if she studies' is a conditional subordinate clause.": "'if she studies' అనేది ఒక షరతులతో కూడిన సబార్డినేట్ క్లాజ్.",
    "Which word means 'a person who hates or distrusts humankind'?": "మానవజాతిని ద్వేషించే లేదా నమ్మని వ్యక్తిని ఏమంటారు?",
    "Philanthropist": "పరోపకారి (Philanthropist)", "Optimist": "ఆశావాది", "Misanthrope": "మానవద్వేషి (Misanthrope)", "Pessimist": "నిరాశావాది",
    "A 'Misanthrope' is a person who dislikes humankind and avoids human society.": "మానవద్వేషి (Misanthrope) అంటే మానవ సమాజాన్ని అసహ్యించుకుని, దూరంగా ఉండే వ్యక్తి.",

    // Lower Social Studies (Class <= 3)
    "Which is the national animal of India?": "భారత జాతీయ జంతువు ఏది?",
    "Leopard": "చిరుతపులి",
    "The Royal Bengal Tiger is the national animal of India.": "రాయల్ బెంగాల్ టైగర్ భారతదేశ జాతీయ జంతువు.",
    "How many days are there in a normal year?": "ఒక సాధారణ సంవత్సరంలో ఎన్ని రోజులు ఉంటాయి?",
    "A normal year has 365 days, while a leap year has 366.": "సాధారణ సంవత్సరంలో 365 రోజులు ఉంటాయి, లీపు సంవత్సరంలో 366 రోజులు ఉంటాయి.",
    "Which is the tallest mountain in the world?": "ప్రపంచంలోనే అత్యంత ఎత్తైన పర్వతం ఏది?",
    "Mount K2": "మౌంట్ K2", "Mount Everest": "మౌంట్ ఎవరెస్ట్", "Kangchenjunga": "కాంచనగంగ", "Kilimanjaro": "కిలిమంజారో",
    "Mount Everest is the Earth's highest mountain above sea level.": "మౌంట్ ఎవరెస్ట్ సముద్ర మట్టానికి పైన ఉన్న భూమిపై అత్యంత ఎత్తైన పర్వతం.",
    "What do we call a land surrounded by water on all sides?": "నాలుగు వైపులా నీటితో చుట్టబడిన భూభాగాన్ని ఏమంటారు?",
    "Peninsula": "ద్వీపకల్పం", "Island": "ద్వీపం (Island)", "Continent": "ఖండం", "Desert": "ఎడారి",
    "An island is a piece of land completely surrounded by water.": "ద్వీపం అనేది పూర్తిగా నీటితో చుట్టబడిన భూభాగం.",
    "Who was the first citizen of India?": "భారతదేశ మొదటి పౌరుడు ఎవరు?",
    "President": "రాష్ట్రపతి", "Chief Justice": "సుప్రేంకోర్టు ప్రధాన న్యాయమూర్తి", "Governor": "గవర్నర్",
    "The President of India is considered the first citizen of the nation.": "భారత రాష్ట్రపతిని దేశ ప్రథమ పౌరుడిగా పరిగణిస్తారు.",
    "Which is the smallest ocean in the world?": "ప్రపంచంలోనే అతిచిన్న మహాసముద్రం ఏది?",
    "Indian Ocean": "హిందూ మహాసముద్రం", "Arctic Ocean": "ఆర్కిటిక్ మహాసముద్రం", "Atlantic Ocean": "అట్లాంటిక్ మహాసముద్రం", "Pacific Ocean": "పసిఫిక్ మహాసముద్రం",
    "The Arctic Ocean is the smallest and shallowest of the world's five major oceans.": "ప్రపంచంలోని ఐదు ప్రధాన మహాసముద్రాలలో ఆర్కిటిక్ మహాసముద్రం అతిచిన్నది మరియు తక్కువ లోతు కలది.",
    "What is the national flower of India?": "భారతదేశ జాతీయ పుష్పం ఏది?",
    "Rose": "గులాబీ", "Lotus": "తామర పువ్వు (Lotus)", "Marigold": "బంతి పువ్వు", "Jasmine": "మల్లెపువ్వు",
    "The Lotus is the national flower of India.": "తామర పువ్వు భారతదేశ జాతీయ పుష్పం.",
    "Which direction does the Sun rise in?": "సూర్యుడు ఏ దిశలో ఉదయిస్తాడు?",
    "West": "పడమర", "North": "ఉత్తరం", "South": "దక్షిణం", "East": "తూర్పు",
    "The Sun always rises in the East.": "సూర్యుడు ఎల్లప్పుడూ తూర్పున ఉదయిస్తాడు.",

    // Middle Social Studies (Class 4 to 7)
    "Who was the first woman Prime Minister of India?": "భారతదేశ మొదటి మహిళా ప్రధానమంత్రి ఎవరు?",
    "Pratibha Patil": "ప్రతిభా పాటిల్", "Sarojini Naidu": "సరోజినీ నాయుడు", "Sushma Swaraj": "సుష్మా స్వరాజ్",
    "Indira Gandhi served as the first and only female Prime Minister of India.": "ఇందిరా గాంధీ భారతదేశ మొదటి మరియు ఏకైక మహిళా ప్రధానమంత్రిగా పనిచేశారు.",
    "Which is the largest hot desert in the world?": "ప్రపంచంలోనే అతిపెద్ద వేడి ఎడారి ఏది?",
    "Thar Desert": "థార్ ఎడారి", "Gobi Desert": "గోబీ ఎడారి", "Sahara Desert": "సహారా ఎడారి", "Kalahari Desert": "కలహరి ఎడారి",
    "The Sahara Desert in Africa is the largest hot desert on Earth.": "ఆఫ్రికాలోని సహారా ఎడారి భూమిపైనే అతిపెద్ద వేడి ఎడారి.",
    "Which civilization was built along the Nile River?": "నైలు నది వెంబడి ఏ నాగరికత అభివృద్ధి చెందింది?",
    "Mesopotamian": "మెసొపొటేమియా నాగరికత", "Egyptian": "ఈజిప్షియన్ నాగరికత (Egyptian)", "Harappan": "హరప్పా నాగరికత", "Chinese": "చైనా నాగరికత",
    "The ancient Egyptian civilization flourished along the fertile banks of the Nile.": "ప్రాచీన ఈజిప్షియన్ నాగరికత నైలు నది యొక్క సారవంతమైన తీరాలలో అభివృద్ధి చెందింది.",
    "What is the imaginary line passing through the center of the Earth horizontally?": "భూమి మధ్య గుండా అడ్డంగా వెళ్లే ఊహాత్మక రేఖను ఏమంటారు?",
    "Prime Meridian": "గ్రీనిచ్ రేఖ", "Tropic of Cancer": "కర్కట రేఖ", "Tropic of Capricorn": "మకర రేఖ",
    "The Equator divides the Earth into the Northern and Southern Hemispheres.": "భూమధ్యరేఖ భూమిని ఉత్తర, దక్షిణ అర్ధగోళాలుగా విభజిస్తుంది.",
    "Which planet is known as the 'Morning Star'?": "ఏ గ్రహాన్ని 'ఉదయతార' (Morning Star) అని పిలుస్తారు?",
    "Venus is often called the morning or evening star due to its bright appearance.": "శుక్రుడు ప్రకాశవంతంగా కనిపించడం వల్ల దానిని తరచుగా ఉదయతార లేదా సంధ్యానక్షత్రం అని పిలుస్తారు.",
    "Who invented the printing press?": "ప్రింటింగ్ ప్రెస్‌ను కనుగొన్నది ఎవరు?",
    "Albert Einstein": "ఆల్బర్ట్ ఐన్‌స్టీన్", "Isaac Newton": "ఐజాక్ న్యూటన్", "Johannes Gutenberg": "జోహన్నెస్ గుటెన్‌బర్గ్", "Galileo Galilei": "గెలీలియో గెలీలి",
    "Johannes Gutenberg introduced printing to Europe with the printing press around 1440.": "జోహన్నెస్ గుటెన్‌బర్గ్ సుమారు 1440 లో ప్రింటింగ్ ప్రెస్‌తో ఐరోపాకు ముద్రణను పరిచయం చేశారు.",
    "Which is the highest waterfall in the world?": "ప్రపంచంలోనే అత్యంత ఎత్తైన జలపాతం ఏది?",
    "Niagara Falls": "నయాగరా జలపాతం", "Angel Falls": "ఏంజెల్ జలపాతం", "Victoria Falls": "విక్టోరియా జలపాతం", "Iguazu Falls": "ఇగువాజు జలపాతం",
    "Angel Falls in Venezuela is the world's highest uninterrupted waterfall.": "వెనిజులాలోని ఏంజెల్ జలపాతం ప్రపంచంలోనే అత్యంత ఎత్తైన జలపాతం.",
    "Which country is also called the land of the Rising Sun?": "ఏ దేశాన్ని సూర్యుడు ఉదయించే భూమి (Rising Sun) అని పిలుస్తారు?",
    "China": "చైనా", "Norway": "నార్వే", "Australia": "ఆస్ట్రేలియా",
    "Japan is called the Land of the Rising Sun because it lies to the far east of the Asian continent.": "ఆసియా ఖండానికి తూర్పు చివరన ఉన్నందున జపాన్‌ను సూర్యుడు ఉదయించే భూమి అని పిలుస్తారు.",

    // Higher Social Studies (Class 8+)
    "Who was the first President of independent India?": "స్వతంత్ర భారతదేశ మొదటి రాష్ట్రపతి ఎవరు?",
    "Dr. S. Radhakrishnan": "డాక్టర్ ఎస్. రాధాకృష్ణన్", "Dr. Rajendra Prasad": "డాక్టర్ రాజేంద్ర ప్రసాద్", "Zakir Husain": "జాకీర్ హుస్సేన్", "V.V. Giri": "వి.వి. గిరి",
    "Dr. Rajendra Prasad served as the first President from 1950 to 1962.": "డాక్టర్ రాజేంద్ర ప్రసాద్ 1950 నుండి 1962 వరకు మొదటి రాష్ట్రపతిగా సేవలు అందించారు.",
    "Which organization was founded after World War I to maintain world peace?": "ప్రపంచ శాంతిని కాపాడటానికి మొదటి ప్రపంచ యుద్ధం తర్వాత ఏ సంస్థ స్థాపించబడింది?",
    "League of Nations": "లీగ్ ఆఫ్ నేషన్స్",
    "The League of Nations was founded in 1920 but was later replaced by the United Nations in 1945.": "లీగ్ ఆఫ్ నేషన్స్ 1920 లో స్థాపించబడింది, ఆ తర్వాత 1945 లో దాని స్థానంలో ఐక్యరాజ్యసమితి వచ్చింది.",
    "Which is the deepest trench in the world?": "ప్రపంచంలోనే అత్యంత లోతైన సముద్ర గర్తం (trench) ఏది?",
    "Java Trench": "జావా గర్తం", "Mariana Trench": "మరియానా గర్తం (Mariana Trench)", "Puerto Rico Trench": "ప్యూర్టో రికో గర్తం", "Sunda Trench": "సుండా గర్తం",
    "The Mariana Trench in the western Pacific Ocean is the deepest trench on Earth.": "పశ్చిమ పసిఫిక్ మహాసముద్రంలో ఉన్న మరియానా గర్తం భూమిపైనే అత్యంత లోతైనది.",
    "Who was the author of the famous book 'Discovery of India'?": "ప్రసిద్ధ పుస్తకం 'డిస్కవరీ ఆఫ్ ఇండియా' రచయిత ఎవరు?",
    "Rabindranath Tagore": "రవీంద్రనాథ్ ఠాగూర్", "Bal Gangadhar Tilak": "బాలగంగాధర్ తిలక్",
    "Jawaharlal Nehru wrote 'The Discovery of India' during his imprisonment at Ahmednagar Fort.": "జవహర్ లాల్ నెహ్రూ అహ్మద్ నగర్ కోటలో జైలు శిక్ష అనుభవిస్తున్నప్పుడు 'ది డిస్కవరీ ఆఫ్ ఇండియా' రాశారు.",
    "What is the minimum voting age in India?": "భారతదేశంలో కనీస ఓటింగ్ వయస్సు ఎంత?",
    "The 61st Amendment Act reduced the voting age from 21 to 18 in 1989.": "61వ సవరణ చట్టం ద్వారా 1989 లో ఓటింగ్ వయస్సును 21 నుండి 18 సంవత్సరాలకు తగ్గించారు.",
    "Which French revolution slogan spread across Europe?": "ఫ్రెంచ్ విప్లవానికి చెందిన ఏ నినాదం ఐరోపా అంతటా వ్యాపించింది?",
    "Peace, Land, Bread": "శాంతి, భూమి, ఆహారం", "Liberty, Equality, Fraternity": "స్వేచ్ఛ, సమానత్వం, సౌభ్రాతృత్వం", "No taxation without representation": "ప్రాతినిధ్యం లేనిదే పన్ను లేదు", "Work and Freedom": "పని మరియు స్వేచ్ఛ",
    "'Liberty, Equality, Fraternity' was the famous motto of the French Revolution.": "'స్వేచ్ఛ, సమానత్వం, సౌభ్రాతృత్వం' అనేది ఫ్రెంచ్ విప్లవం యొక్క ప్రసిద్ధ నినాదం.",
    "Which Indian ruler was known as the Tiger of Mysore?": "ఏ భారతీయ పాలకుడిని మైసూర్ పులి (Tiger of Mysore) అని పిలిచేవారు?",
    "Haider Ali": "హైదర్ అలీ", "Tipu Sultan": "టిప్పూ సుల్తాన్", "Chikka Devaraja": "చిక్క దేవరాజ", "Krishna Raja Wadiyar": "కృష్ణరాజ వడియార్",
    "Tipu Sultan was known as the Tiger of Mysore due to his fierce resistance to British forces.": "బ్రిటీష్ సైన్యానికి వ్యతిరేకంగా తీవ్రమైన పోరాటం చేసినందున టిప్పూ సుల్తాన్‌ను మైసూర్ పులి అని పిలిచేవారు.",
    "Which treaty officially ended World War I?": "మొదటి ప్రపంచ యుద్ధాన్ని అధికారికంగా ముగించిన ఒప్పందం ఏది?",
    "Treaty of Paris": "పారిస్ ఒప్పందం", "Treaty of Versailles": "వర్సైల్స్ ఒప్పందం (Treaty of Versailles)", "Treaty of Geneva": "జెనీవా ఒప్పందం", "Treaty of London": "లండన్ ఒప్పందం"
  }
};

const translateText = (text, targetLang) => {
  if (!targetLang || targetLang === 'en' || !quizTranslations[targetLang]) return text;
  
  // Check if it has a class prefix like [Class 5]
  const prefixMatch = text.match(/^\[Class (\d+)\]\s*/);
  let rawText = text;
  let prefix = '';
  if (prefixMatch) {
    prefix = prefixMatch[0]; // e.g. "[Class 5] "
    rawText = text.replace(prefix, ''); // e.g. "Which part of a plant grows under the ground?"
    
    if (targetLang === 'hi') {
      prefix = `[कक्षा ${prefixMatch[1]}] `;
    } else if (targetLang === 'te') {
      prefix = `[తరగతి ${prefixMatch[1]}] `;
    }
  }
  
  const translated = quizTranslations[targetLang][rawText];
  if (translated) return prefix + translated;
  
  let mathText = rawText;
  
  if (mathText.startsWith("What is ") && mathText.endsWith("?")) {
    const mathContent = mathText.slice(8, -1).trim();
    if (mathContent.includes("+") || mathContent.includes("-") || mathContent.includes("×") || mathContent.includes("÷")) {
      return prefix + (targetLang === 'hi' ? `${mathContent} क्या है?` : `${mathContent} ఎంత?`);
    }
    if (mathText.includes("square root of")) {
      const numStr = mathText.replace("What is the square root of ", "").replace("?", "").trim();
      return prefix + (targetLang === 'hi' ? `${numStr} का वर्गमूल क्या है?` : `${numStr} యొక్క వర్గమూలం ఎంత?`);
    }
  }
  
  if (mathText.startsWith("Solve for x: ")) {
    const equation = mathText.replace("Solve for x: ", "").trim();
    return prefix + (targetLang === 'hi' ? `x के लिए हल करें: ${equation}` : `x ని కనుగొనండి: ${equation}`);
  }
  
  if (rawText.includes("because we combine the numbers")) {
    const parts = rawText.split("because");
    return prefix + (targetLang === 'hi' ? `${parts[0]} क्योंकि हम संख्याओं को मिलाते हैं।` : `${parts[0]} ఎందుకంటే మనం సంఖ్యలను కలుపుతాము.`);
  }
  if (rawText.includes("because we take away")) {
    const parts = rawText.split("because");
    return prefix + (targetLang === 'hi' ? `${parts[0]} क्योंकि हम घटाते हैं।` : `${parts[0]} ఎందుకంటే మనం తీసివేస్తాము.`);
  }
  if (rawText.includes("multiplying")) {
    const parts = rawText.split("(");
    return prefix + (targetLang === 'hi' ? `${parts[0]} (गुणा करने पर)` : `${parts[0]} (గుణించగా)`);
  }
  if (rawText.includes("because") && rawText.includes("×") && rawText.includes("=")) {
    const match = rawText.match(/(.*) because (.*)/);
    if (match) {
      return prefix + (targetLang === 'hi' ? `${match[1]} क्योंकि ${match[2]}` : `${match[1]} ఎందుకంటే ${match[2]}`);
    }
  }
  if (rawText.startsWith("Since") && rawText.includes("square root")) {
    const match = rawText.match(/Since (.*), the square root of (.*) is (.*)\./);
    if (match) {
      return prefix + (targetLang === 'hi' ? `चूंकि ${match[1]}, इसलिए ${match[2]} का वर्गमूल ${match[3]} है।` : `కాబట్టి ${match[1]}, ${match[2]} యొక్క వర్గమూలం ${match[3]}.`);
    }
  }
  if (rawText.startsWith("Subtract") && rawText.includes("both sides")) {
    const match = rawText.match(/Subtract (.*) from both sides: (.*)\. Divide both sides by (.*): x = (.*)\./);
    if (match) {
      return prefix + (targetLang === 'hi' 
        ? `दोनों पक्षों से ${match[1]} घटाएं: ${match[2]}. दोनों पक्षों को ${match[3]} से विभाजित करें: x = ${match[4]}.`
        : `ఇరువైపులా ${match[1]} తీసివేయండి: ${match[2]}. ఇరువైపులా ${match[3]} తో భాగించండి: x = ${match[4]}.`);
    }
  }
  if (rawText.startsWith("Add") && rawText.includes("both sides")) {
    const match = rawText.match(/Add (.*) to both sides: (.*)\. Divide by (.*): x = (.*)\./);
    if (match) {
      return prefix + (targetLang === 'hi'
        ? `दोनों पक्षों में ${match[1]} जोड़ें: ${match[2]}. ${match[3]} से विभाजित करें: x = ${match[4]}.`
        : `ఇరువైపులా ${match[1]} కలపండి: ${match[2]}. ${match[3]} తో భాగించండి: x = ${match[4]}.`);
    }
  }

  return text;
};

const prepareQuizSession = (quiz, classNum, targetLang) => {
  const clonedQuiz = JSON.parse(JSON.stringify(quiz));
  
  // 1. Shuffle all questions in the pool
  let shuffledQuestions = shuffleArray(clonedQuiz.questions);
  
  // 2. Select a subset of 10 questions
  let selectedQuestions = shuffledQuestions.slice(0, Math.min(10, shuffledQuestions.length));
  
  // 3. Process each selected question
  const processedQuestions = selectedQuestions.map(q => {
    let resolvedQ = q;
    // 3a. Resolve dynamic template
    if (q.isDynamic) {
      resolvedQ = resolveDynamicQuestion(q, classNum);
    }
    
    // 3b. Shuffle options for MCQ (and not TF/FIB)
    if (resolvedQ.type !== 'fib' && resolvedQ.type !== 'tf' && resolvedQ.options && resolvedQ.options.length > 0) {
      const correctOptionText = resolvedQ.options[resolvedQ.correctAnswerIndex];
      resolvedQ.options = shuffleArray(resolvedQ.options);
      resolvedQ.correctAnswerIndex = resolvedQ.options.indexOf(correctOptionText);
    }
    
    // 3c. Translate the question if targetLang is 'hi' or 'te'
    if (targetLang && targetLang !== 'en') {
      if (resolvedQ.type === 'fib' && resolvedQ.correctAnswerText) {
        resolvedQ.correctAnswerText = translateText(resolvedQ.correctAnswerText, targetLang);
      }
      resolvedQ.question = translateText(resolvedQ.question, targetLang);
      if (resolvedQ.options && resolvedQ.options.length > 0) {
        resolvedQ.options = resolvedQ.options.map(opt => translateText(opt, targetLang));
      }
      resolvedQ.explanation = translateText(resolvedQ.explanation, targetLang);
    }
    
    return resolvedQ;
  });
  
  clonedQuiz.questions = processedQuestions;
  return clonedQuiz;
};

export const QuizCenter = () => {
  const { triggerNotification, language } = useApp();
  const { user, refreshUser } = useAuth();
  const { navigate } = useApp();

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('Math');

  // Active quiz states
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [fibAnswer, setFibAnswer] = useState(''); // Fill in the blanks state
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [scoreCount, setScoreCount] = useState(0);

  // Results screen states
  const [quizFinished, setQuizFinished] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);

  // AI Quiz Generation states
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProgressText, setAiProgressText] = useState('');

  useEffect(() => {
    if (!aiGenerating) return;
    const messages = [
      "🦉 Buddy is opening his notebook...",
      "📖 Searching your Class syllabus...",
      "🔍 Customizing questions to your grade level...",
      "✨ Crafting 10 interactive questions...",
      "✍️ Generating clear correct answers & explanations...",
      "⚡ Finishing up your practice challenge..."
    ];
    
    let index = 0;
    setAiProgressText(messages[0]);
    
    const interval = setInterval(() => {
      index++;
      if (index < messages.length) {
        setAiProgressText(messages[index]);
      }
    }, 1500);
    
    return () => clearInterval(interval);
  }, [aiGenerating]);

  useEffect(() => {
    async function fetchQuizzes() {
      try {
        const list = await api.getQuizzes();
        setQuizzes(list || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchQuizzes();
  }, []);

  const handleStartQuiz = (quiz) => {
    const userClass = user?.studentProfile?.class || 5;
    const randomizedQuiz = prepareQuizSession(quiz, userClass, language);
    setActiveQuiz(randomizedQuiz);
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setFibAnswer('');
    setAnswerSubmitted(false);
    setScoreCount(0);
    setQuizFinished(false);
    setXpEarned(0);
    setCoinsEarned(0);
  };

  const handleGenerateAIQuiz = async () => {
    setAiGenerating(true);
    try {
      const generatedQuiz = await api.generateQuiz(selectedSubject, language);
      handleStartQuiz(generatedQuiz);
    } catch (err) {
      console.error("AI quiz generation error:", err);
      triggerNotification("⚠️ Failed to generate AI quiz. Starting standard quiz fallback instead!", "orange");
      const subQuizzes = quizzes.filter((q) => q.subject.toLowerCase() === selectedSubject.toLowerCase());
      if (subQuizzes.length > 0) {
        handleStartQuiz(subQuizzes[0]);
      }
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmitAnswer = () => {
    const question = activeQuiz.questions[currentQuestionIndex];
    const isFib = question.type === 'fib';
    
    if (isFib) {
      if (!fibAnswer.trim()) return;
    } else {
      if (selectedOptionIndex === null) return;
    }
    
    setAnswerSubmitted(true);

    let correct = false;
    if (isFib) {
      const correctText = (question.correctAnswerText || '').trim().toLowerCase();
      const userText = fibAnswer.trim().toLowerCase();
      correct = correctText === userText;
    } else {
      correct = selectedOptionIndex === question.correctAnswerIndex;
    }

    if (correct) {
      setScoreCount((prev) => prev + 1);
    }
  };

  const handleNextQuestion = async () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < activeQuiz.questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setSelectedOptionIndex(null);
      setFibAnswer('');
      setAnswerSubmitted(false);
    } else {
      // Quiz completed!
      const percentage = Math.round((scoreCount / activeQuiz.questions.length) * 100);
      try {
        const res = await api.submitQuiz(activeQuiz._id, percentage, [], activeQuiz.subject);
        setXpEarned(res.xpEarned);
        setCoinsEarned(res.coinsEarned || Math.round(percentage * 0.2));
        setQuizFinished(true);
        triggerNotification(`🎉 Quiz completed! You earned +${res.xpEarned} XP and +${res.coinsEarned || Math.round(percentage * 0.2)} Coins!`, 'purple');
        refreshUser();
      } catch (err) {
        console.error(err);
        // Fallback for demo mode
        const fallbackXp = Math.round(percentage * 0.5);
        const fallbackCoins = Math.round(percentage * 0.2);
        setXpEarned(fallbackXp);
        setCoinsEarned(fallbackCoins);
        setQuizFinished(true);
        if (user && user.studentProfile) {
          user.studentProfile.xp += fallbackXp;
          user.studentProfile.coins += fallbackCoins;
        }
      }
    }
  };

  const currentClass = user?.studentProfile?.class || 5;

  // Filter quizzes by chosen subject and matching class
  const filteredQuizzes = quizzes.filter(
    (q) => q.subject.toLowerCase() === selectedSubject.toLowerCase() && Number(q.class) === Number(currentClass)
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <style>{`
        @keyframes pulse-owl {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(139, 92, 246, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
        }
        @keyframes progress-loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        @keyframes float-animation {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        .ai-loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.88);
          backdrop-filter: blur(8px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          color: #fff;
          text-align: center;
          padding: 20px;
        }
      `}</style>

      {aiGenerating && (
        <div className="ai-loading-overlay">
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '28px',
            boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)',
            animation: 'pulse-owl 2s infinite ease-in-out'
          }}>
            <span style={{ fontSize: '4rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }}>🦉</span>
          </div>
          
          <h3 style={{
            fontSize: '1.8rem',
            fontWeight: 'bold',
            marginBottom: '10px',
            background: 'linear-gradient(90deg, #c084fc, #f472b6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.025em'
          }}>
            Brewing Custom AI Quiz...
          </h3>
          
          <p style={{
            fontSize: '1.05rem',
            color: '#cbd5e1',
            minHeight: '24px',
            maxWidth: '360px',
            margin: '0 auto',
            lineHeight: '1.5'
          }}>
            {aiProgressText}
          </p>
          
          <div style={{
            width: '240px',
            height: '6px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '3px',
            marginTop: '28px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
              borderRadius: '3px',
              animation: 'progress-loading 2.5s infinite linear'
            }} />
          </div>
        </div>
      )}
      
      {/* 1. Normal Subjects Explorer Selection */}
      {!activeQuiz && (
        <section className="card-buddy" style={{ padding: '30px' }}>
          <h3 style={{ fontSize: '1.6rem', marginBottom: '10px', textAlign: 'center' }}>
            Interactive Quiz Center (Class {currentClass})
          </h3>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '30px' }}>
            Earn XP, unlock achievement badges, and level up by demonstrating your mastery!
          </p>

          {/* Subject Navigation Tabs */}
          <div style={{
            display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '30px', justifyContent: 'center'
          }}>
            {['Math', 'Science', 'English', 'Social Studies', 'Hindi', 'Telugu'].map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`btn-3d ${selectedSubject.toLowerCase() === sub.toLowerCase() ? 'btn-3d-green' : 'btn-3d-light'}`}
                style={{ padding: '10px 20px', fontSize: '0.95rem' }}
              >
                {sub}
              </button>
            ))}
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading quizzes...</p>
          ) : filteredQuizzes.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No quizzes found for this subject and grade level.</p>
          ) : (
            <div>
              <div style={{
                padding: '24px',
                background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(139, 92, 246, 0.05) 100%)',
                borderRadius: '16px',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                marginBottom: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
                flexWrap: 'wrap'
              }}>
                <div>
                  <h4 style={{ fontSize: '1.4rem', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ animation: 'float-animation 3s infinite ease-in-out', display: 'inline-block' }}>
                      {selectedSubject === 'Math' ? '📐' : selectedSubject === 'Science' ? '🔬' : selectedSubject === 'English' ? '📖' : selectedSubject === 'Social Studies' ? '🌍' : selectedSubject === 'Hindi' ? '✍️' : '📚'}
                    </span>
                    {selectedSubject} Mastery Module
                  </h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '480px', margin: 0 }}>
                    Review standard lessons or generate a brand-new practice quiz powered by Buddy AI!
                  </p>
                </div>
                <span style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  color: '#8b5cf6',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  border: '1px solid rgba(139, 92, 246, 0.2)'
                }}>
                  Syllabus Aligned
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {/* 1. Standard Quiz Card */}
                {filteredQuizzes.map((quiz) => (
                  <div
                    key={quiz._id}
                    className="card-buddy"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '24px',
                      height: '100%',
                      border: '1px solid rgba(226, 232, 240, 0.8)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                        <span style={{ fontSize: '1.8rem' }}>📝</span>
                        <span style={{
                          fontSize: '0.75rem',
                          background: 'rgba(100, 116, 139, 0.1)',
                          color: 'var(--text-muted)',
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontWeight: 'bold'
                        }}>
                          Standard Pool
                        </span>
                      </div>
                      <h5 style={{ fontSize: '1.15rem', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 'bold' }}>
                        Standard {selectedSubject} Quiz
                      </h5>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.4' }}>
                        Take a standard review quiz generated from the default syllabus question bank.
                      </p>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: '500' }}>
                        📋 {Math.min(10, quiz.questions.length)} Questions • Class {quiz.class}
                      </div>
                      <button
                        onClick={() => handleStartQuiz(quiz)}
                        className="btn-3d btn-3d-purple"
                        style={{ padding: '12px 20px', fontSize: '0.95rem', width: '100%' }}
                      >
                        Start Standard Quiz
                      </button>
                    </div>
                  </div>
                ))}

                {/* 2. AI Generator Card */}
                <div
                  className="card-buddy"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '24px',
                    height: '100%',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.08)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: 'linear-gradient(90deg, #a78bfa, #8b5cf6)',
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    padding: '4px 12px',
                    borderBottomLeftRadius: '12px'
                  }}>
                    BUDDY AI
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                      <span style={{ fontSize: '1.8rem', animation: 'float-animation 3s infinite ease-in-out', display: 'inline-block' }}>🦉</span>
                    </div>
                    <h5 style={{ fontSize: '1.15rem', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Custom AI Quiz
                    </h5>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.4' }}>
                      Generate 5 brand-new, syllabus-aligned questions created dynamically for you by Buddy!
                    </p>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: '500' }}>
                      ✨ Fresh Questions Every Time!
                    </div>
                    <button
                      onClick={handleGenerateAIQuiz}
                      className="btn-3d btn-3d-green"
                      style={{
                        padding: '12px 20px',
                        fontSize: '0.95rem',
                        width: '100%',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                      }}
                    >
                      ✨ Generate Fresh AI Quiz
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 2. Active Quiz Playing Screen */}
      {activeQuiz && !quizFinished && (() => {
        const question = activeQuiz.questions[currentQuestionIndex];
        const isFib = question.type === 'fib';
        const isCorrect = isFib
          ? (fibAnswer || '').trim().toLowerCase() === (question.correctAnswerText || '').trim().toLowerCase()
          : selectedOptionIndex === question.correctAnswerIndex;
        const totalQuestions = activeQuiz.questions.length;
        const progressPercentage = (currentQuestionIndex / totalQuestions) * 100;
        
        return (
          <div className="card-buddy" style={{ padding: '30px', position: 'relative', overflow: 'visible' }}>
            
            {/* Top Close Button & Progress Meter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
              <button
                onClick={() => setActiveQuiz(null)}
                style={{
                  border: 'none', background: 'none', fontSize: '1.6rem', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px'
                }}
              >
                ×
              </button>
              <div className="progress-bar-container" style={{ flex: 1, height: '14px' }}>
                <div className="progress-bar-fill" style={{ width: `${progressPercentage}%`, backgroundColor: 'var(--color-green)' }} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                {currentQuestionIndex + 1} / {totalQuestions}
              </span>
            </div>

            {/* Question Card */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{
                backgroundColor: 'var(--color-purple-light)', color: 'var(--color-purple-dark)',
                fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase'
              }}>
                {question.type || 'mcq'}
              </span>
            </div>
            <h4 style={{ fontSize: '1.4rem', lineHeight: '1.4', marginBottom: '24px', color: 'var(--text-main)' }}>
              {question.question}
            </h4>

            {/* Options List / FIB Input Box */}
            {isFib ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '100px' }}>
                <p style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Type your answer below:</p>
                <input
                  type="text"
                  value={fibAnswer}
                  onChange={(e) => {
                    if (!answerSubmitted) setFibAnswer(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && fibAnswer.trim() && !answerSubmitted) {
                      handleSubmitAnswer();
                    }
                  }}
                  disabled={answerSubmitted}
                  placeholder="Type answer here..."
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-sm)',
                    border: '2px solid var(--border-light)',
                    fontSize: '1.1rem',
                    fontFamily: 'var(--font-body)',
                    outline: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                    transition: 'border-color 0.2s ease',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '100px' }}>
                {(question.options && question.options.length > 0 ? question.options : (question.type === 'tf' ? ['True', 'False'] : [])).map((option, idx) => {
                  const isSelected = selectedOptionIndex === idx;
                  let optionStyle = {
                    width: '100%', padding: '16px 20px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)',
                    textAlign: 'left', cursor: answerSubmitted ? 'default' : 'pointer', fontSize: '1.05rem', fontWeight: '600',
                    fontFamily: 'var(--font-body)', outline: 'none', backgroundColor: 'var(--bg-card)', transition: 'all 0.2s ease',
                    color: 'var(--text-main)'
                  };

                  if (isSelected) {
                    optionStyle.borderColor = 'var(--color-purple)';
                    optionStyle.backgroundColor = 'var(--color-purple-light)';
                    optionStyle.color = 'var(--color-purple-dark)';
                  }

                  if (answerSubmitted) {
                    if (idx === question.correctAnswerIndex) {
                      optionStyle.borderColor = 'var(--color-green)';
                      optionStyle.backgroundColor = 'var(--color-green-light)';
                      optionStyle.color = 'var(--color-green-dark)';
                    } else if (isSelected) {
                      optionStyle.borderColor = 'var(--color-red)';
                      optionStyle.backgroundColor = 'var(--color-red-light)';
                      optionStyle.color = 'var(--color-red-dark)';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (!answerSubmitted) setSelectedOptionIndex(idx);
                      }}
                      style={optionStyle}
                      disabled={answerSubmitted}
                    >
                      <span style={{
                        display: 'inline-flex', width: '28px', height: '28px', borderRadius: '50%',
                        border: '1.5px solid currentColor', alignItems: 'center', justifyContent: 'center',
                        marginRight: '12px', fontSize: '0.9rem', fontWeight: 'bold'
                      }}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bottom Slider Panels (Duolingo Style) */}
            <div style={{
              position: 'absolute', bottom: '0', left: '0', right: '0',
              padding: '24px 30px', borderBottomLeftRadius: 'var(--radius-md)', borderBottomRightRadius: 'var(--radius-md)',
              backgroundColor: !answerSubmitted ? 'var(--bg-card)' : isCorrect ? 'var(--color-green-light)' : 'var(--color-red-light)',
              borderTop: `2px solid ${!answerSubmitted ? 'var(--border-light)' : isCorrect ? 'var(--color-green)' : 'var(--color-red)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px'
            }}>
              {!answerSubmitted ? (
                <>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: '500' }}>
                    {isFib ? 'Enter your answer response to check' : 'Select an answer option to proceed'}
                  </p>
                  <button
                    onClick={handleSubmitAnswer}
                    className={`btn-3d ${(isFib ? !fibAnswer.trim() : selectedOptionIndex === null) ? 'btn-3d-light' : 'btn-3d-green'}`}
                    disabled={isFib ? !fibAnswer.trim() : selectedOptionIndex === null}
                    style={{ padding: '10px 24px', fontSize: '0.95rem' }}
                  >
                    Check Answer
                  </button>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '75%' }}>
                    {isCorrect ? (
                      <div style={{
                        width: '45px', height: '45px', borderRadius: '50%', backgroundColor: 'var(--color-green)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff'
                      }}>
                        <Check size={28} strokeWidth={3} />
                      </div>
                    ) : (
                      <div style={{
                        width: '45px', height: '45px', borderRadius: '50%', backgroundColor: 'var(--color-red)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff'
                      }}>
                        <X size={28} strokeWidth={3} />
                      </div>
                    )}
                    <div>
                      <h5 style={{
                        fontSize: '1.2rem',
                        color: isCorrect ? 'var(--color-green-dark)' : 'var(--color-red-dark)',
                        fontFamily: 'var(--font-header)'
                      }}>
                        {isCorrect ? 'Excellent Job! Hoot! 🦉' : 'Incorrect Answer'}
                      </h5>
                      {!isCorrect && isFib && (
                        <p style={{
                          fontSize: '0.9rem',
                          color: 'var(--color-red-dark)',
                          fontWeight: 'bold',
                          marginTop: '2px'
                        }}>
                          Correct Answer: <span style={{ textDecoration: 'underline' }}>{question.correctAnswerText}</span>
                        </p>
                      )}
                      <p style={{
                        fontSize: '0.85rem',
                        color: isCorrect ? 'var(--color-green-dark)' : 'var(--color-red-dark)',
                        fontWeight: '600', lineHeight: '1.4', marginTop: '2px'
                      }}>
                        {question.explanation}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleNextQuestion}
                    className={`btn-3d ${isCorrect ? 'btn-3d-green' : 'btn-3d-red'}`}
                    style={{ padding: '10px 24px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    Continue <ArrowRight size={16} />
                  </button>
                </>
              )}
            </div>

          </div>
        );
      })()}

      {/* 3. Quiz Completion Results Screen Splash */}
      {activeQuiz && quizFinished && (
        <section className="card-buddy" style={{ padding: '40px 30px', textAlign: 'center' }}>
          <Mascot size={150} expression="celebrate" />
          
          <h2 style={{ fontSize: '2.4rem', color: 'var(--color-green)', marginTop: '20px', marginBottom: '10px' }}>
            Quiz Completed! 🌟
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '30px' }}>
            You completed <b>{activeQuiz.title}</b>! Here is your scorecard:
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', maxWidth: '500px', margin: '0 auto 30px auto'
          }}>
            {/* Accuracy */}
            <div className="card-buddy" style={{ padding: '20px 10px', backgroundColor: 'var(--bg-app)' }}>
              <h4 style={{ fontSize: '1.8rem', color: 'var(--color-purple)' }}>
                {Math.round((scoreCount / activeQuiz.questions.length) * 100)}%
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold', marginTop: '4px' }}>Accuracy</p>
            </div>
            
            {/* XP gained */}
            <div className="card-buddy" style={{ padding: '20px 10px', backgroundColor: 'var(--bg-app)' }}>
              <h4 style={{ fontSize: '1.8rem', color: 'var(--color-yellow-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Zap size={22} fill="currentColor" /> +{xpEarned}
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold', marginTop: '4px' }}>XP Rewarded</p>
            </div>

            {/* Coins gained */}
            <div className="card-buddy" style={{ padding: '20px 10px', backgroundColor: 'var(--bg-app)' }}>
              <h4 style={{ fontSize: '1.8rem', color: 'var(--color-green-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                🪙 +{coinsEarned}
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold', marginTop: '4px' }}>Coins Gained</p>
            </div>
          </div>

          <button onClick={() => setActiveQuiz(null)} className="btn-3d btn-3d-green" style={{ padding: '12px 36px', fontSize: '1.1rem' }}>
            Back to Quiz Center
          </button>
        </section>
      )}

    </div>
  );
};
