# 🦉 StudyBuddy: Full-Stack Gamified Educational Web App

StudyBuddy is a modern, responsive educational web application designed for students from Class 1 to Class 10 to develop powerful, consistent daily study habits. 

The application engages students using 3D button clicks, daily streak flame trackers, study quests, interactive multiple-choice quizzes, a secure Parents' portal, and **Buddy the Owl**—a responsive AI Tutor mascot!

---

## 🚀 Key Features

1. **Student Profiles**: Dynamic sign-up logging the student's Name, Class/Grade (1 to 10), Board (CBSE, ICSE, State Board), and School Type.
2. **Today's Quest Planner**: Dynamically generates difficulty-appropriate daily checklists customized to the student's grade level.
3. **Duolingo Course Path Map**: Visual, winding zig-zag course pathway nodes. Clicking an unlocked chapter lets students challenge standard quizzes!
4. **Motivational Streak Flames**: A daily streak counter showing an animated fire flame, celebrating consistent study habits.
5. **Tactile Study Timer**: Custom built-in focus clock rewarding students with **+50 XP** once they complete study sessions.
6. **AI Teacher Chat (Buddy)**: Interactive educational AI chatbot. Buddy floats on the screen, changing his animated visual expressions (`thinking`, `happy`, `celebrate`, `confused`) based on student questions!
7. **Vector Analytics Reports**: Beautiful custom lightweight SVG graphs tracking weekly study hours and average subject accuracies (eliminating heavy chart library dependencies).
8. **Weak Subject Analysis**: Scans quiz histories, identifies topics with accuracy $<70\%$, and offers target revision actions.
9. **Secure Parent Portal**: Access locked behind a parent PIN. Provides child performance monitoring and advanced controls:
   - **Daily Limit Screen Lock**: Instantly lock the child out to enforce a screen break (requires parent PIN to unlock).
   - **Custom Chore Quests**: Add parent-assigned tasks that feed directly into the student's checklist.
   - **XP Rewards Cabinet**: Parents register custom incentives (e.g. "30m of game console time") that students can claim by redeeming their earned study XP!
10. **Multi-language Translator**: Full localized dictionaries for **English**, **Hindi (हिंदी)**, and **Spanish (Español)** with instant swaps.
11. **Responsive Custom Theme Styles**: Visual selectors for **Light mode**, **Slate Dark**, and earthy **Forest Green**.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite-based), Vanilla HSL Hues CSS, Lucide Icons.
- **Backend**: Node.js, Express.js.
- **Database Layer**: MongoDB (Mongoose) with an **Automatic JSON Database Fallback** (`backend/data/db.json`).
- **Sessions**: JWT (JSON Web Tokens) with local storage sync.

---

## ⚡ Zero-Setup & Developer Conveniences

To provide the absolute best developer experience, StudyBuddy includes built-in fallbacks that allow it to run **flawlessly out-of-the-box**:
1. **DB Auto-Fallback**: The server automatically attempts to connect to a local MongoDB instance. If no instance is active, it seamlessly switches to a local file-based database (`backend/data/db.json`) and seeds default quizzes for all 10 grades automatically. **No database installation is required to test!**
2. **Bypass Demo Logins**: On the login page, you can bypass manual signups by clicking `Demo Student` or `Demo Parent` to immediately enter standard, populated student profiles!

---

*Built with ❤️ for gamified childhood education.*
