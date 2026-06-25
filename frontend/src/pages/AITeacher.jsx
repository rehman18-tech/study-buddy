import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Mascot } from '../components/Mascot';
import { Send, Sparkles, Mic, MicOff, Trophy, AlertTriangle, BookMarked, Award, Star, Flame, Zap, Calendar, ArrowRight, CheckCircle, Bell, BookOpen, Clock } from 'lucide-react';

const renderMarkdown = (text) => {
  if (!text) return '';
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    const renderedLine = parts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={partIdx}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
    return (
      <React.Fragment key={lineIdx}>
        {renderedLine}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
};

// Sub-widget for interactive quizzes from the Quiz Agent
const QuizWidget = ({ quizData, onQuizSubmit }) => {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState([]); // { questionIndex, answerIndex || answerText, isCorrect }
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [fibText, setFibText] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const questions = quizData?.questions || [];
  if (questions.length === 0) return <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>No quiz questions generated. Try another topic.</p>;

  const currentQ = questions[currentQuestionIdx];
  const isMcqOrTf = currentQ.type === 'mcq' || currentQ.type === 'tf';

  const handleAnswerSubmit = () => {
    if (currentQ.type === 'fib') {
      const isCorrect = fibText.trim().toLowerCase() === currentQ.correctAnswerText.trim().toLowerCase();
      setAnswers(prev => [...prev, { questionIndex: currentQuestionIdx, answerText: fibText, isCorrect }]);
      setIsAnswered(true);
    } else {
      const isCorrect = selectedOpt === currentQ.correctAnswerIndex;
      setAnswers(prev => [...prev, { questionIndex: currentQuestionIdx, answerIndex: selectedOpt, isCorrect }]);
      setIsAnswered(true);
    }
  };

  const handleNext = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOpt(null);
      setFibText('');
      setIsAnswered(false);
    } else {
      setQuizFinished(true);
    }
  };

  const handleQuizFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const correctAnswersCount = answers.filter(a => a.isCorrect).length;
      const scorePercentage = Math.round((correctAnswersCount / questions.length) * 100);
      
      const payload = {
        quizId: quizData.quizId || 'quiz_' + Date.now(),
        score: scorePercentage,
        subject: quizData.subject || 'General',
        chapterName: quizData.chapterName || '',
        totalQuestions: questions.length,
        correctAnswers: correctAnswersCount,
        answers: answers
      };

      const result = await onQuizSubmit(payload);
      setSubmitResult(result);
    } catch (err) {
      console.error("Quiz submission error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (quizFinished) {
    const correctCount = answers.filter(a => a.isCorrect).length;
    return (
      <div style={{ padding: '4px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ color: 'var(--color-purple)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1rem' }}>
          🏆 Quiz Completed!
        </h4>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', margin: 0 }}>
          Score: <b>{correctCount} / {questions.length}</b> correct answers!
        </p>

        {!submitResult ? (
          <button
            onClick={handleQuizFinalSubmit}
            disabled={submitting}
            style={{
              alignSelf: 'start', backgroundColor: 'var(--color-purple)', color: '#ffffff', border: 'none',
              padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem'
            }}
          >
            {submitting ? 'Saving Results...' : 'Save & Claim Rewards 🎁'}
          </button>
        ) : (
          <div style={{
            padding: '14px', borderRadius: '12px', backgroundColor: 'var(--color-green-light)',
            border: '1.5px solid var(--color-green)', display: 'flex', flexDirection: 'column', gap: '4px'
          }}>
            <h5 style={{ color: 'var(--color-green-dark)', fontWeight: 'bold', margin: '0 0 4px 0', fontSize: '0.9rem' }}>
              🎉 Performance Recorded!
            </h5>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.82rem', color: 'var(--color-green-dark)', display: 'flex', flexDirection: 'column', gap: '2px', fontWeight: '600' }}>
              <li>XP Points Earned: <b>+{submitResult.xpEarned} XP</b></li>
              <li>Study Coins Earned: <b>+{submitResult.coinsEarned} Coins</b></li>
              {submitResult.unlockedBadges && submitResult.unlockedBadges.length > 0 && (
                <li>Badges Unlocked: <b style={{ textTransform: 'uppercase' }}>{submitResult.unlockedBadges.join(', ')}</b></li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
        <span>Question {currentQuestionIdx + 1} of {questions.length}</span>
        <span style={{ textTransform: 'uppercase' }}>{currentQ.type} quiz</span>
      </div>

      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
        {currentQ.question}
      </p>

      {isMcqOrTf ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
          {currentQ.options.map((opt, oIdx) => {
            const isSelected = selectedOpt === oIdx;
            const isCorrectAnswer = oIdx === currentQ.correctAnswerIndex;
            
            let btnStyle = {
              padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--border-light)',
              cursor: isAnswered ? 'default' : 'pointer', fontSize: '0.85rem', fontWeight: '700',
              textAlign: 'left', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none',
              fontFamily: 'var(--font-body)', fontSize: '0.9rem', transition: 'all 0.2s ease'
            };

            if (isSelected) {
              if (isAnswered) {
                btnStyle.backgroundColor = isCorrectAnswer ? 'var(--color-green-light)' : 'var(--color-red-light)';
                btnStyle.borderColor = isCorrectAnswer ? 'var(--color-green)' : 'var(--color-red)';
                btnStyle.color = isCorrectAnswer ? 'var(--color-green-dark)' : 'var(--color-red-dark)';
              } else {
                btnStyle.backgroundColor = 'rgba(133, 77, 255, 0.1)';
                btnStyle.borderColor = 'var(--color-purple)';
                btnStyle.color = 'var(--color-purple)';
              }
            } else if (isAnswered && isCorrectAnswer) {
              btnStyle.backgroundColor = 'var(--color-green-light)';
              btnStyle.borderColor = 'var(--color-green)';
              btnStyle.color = 'var(--color-green-dark)';
            }

            return (
              <button
                key={oIdx}
                disabled={isAnswered}
                onClick={() => setSelectedOpt(oIdx)}
                style={btnStyle}
              >
                {opt}
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
          <input
            type="text"
            placeholder="Type your answers here..."
            value={fibText}
            onChange={(e) => setFibText(e.target.value)}
            disabled={isAnswered}
            style={{
              padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--border-light)',
              fontSize: '0.88rem', outline: 'none', width: '100%', boxSizing: 'border-box'
            }}
          />
        </div>
      )}

      {isAnswered && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px',
          backgroundColor: (isMcqOrTf ? selectedOpt === currentQ.correctAnswerIndex : fibText.trim().toLowerCase() === currentQ.correctAnswerText.trim().toLowerCase()) ? 'var(--color-green-light)' : 'var(--color-red-light)',
          borderLeft: `4px solid ${(isMcqOrTf ? selectedOpt === currentQ.correctAnswerIndex : fibText.trim().toLowerCase() === currentQ.correctAnswerText.trim().toLowerCase()) ? 'var(--color-green)' : 'var(--color-red)'}`,
          fontSize: '0.82rem', color: (isMcqOrTf ? selectedOpt === currentQ.correctAnswerIndex : fibText.trim().toLowerCase() === currentQ.correctAnswerText.trim().toLowerCase()) ? 'var(--color-green-dark)' : 'var(--color-red-dark)',
          fontWeight: '600', marginTop: '4px', lineHeight: '1.4'
        }}>
          <b>{(isMcqOrTf ? selectedOpt === currentQ.correctAnswerIndex : fibText.trim().toLowerCase() === currentQ.correctAnswerText.trim().toLowerCase()) ? '✅ Correct!' : '❌ Incorrect.'}</b> {currentQ.explanation}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
        {!isAnswered ? (
          <button
            onClick={handleAnswerSubmit}
            disabled={isMcqOrTf ? selectedOpt === null : !fibText.trim()}
            style={{
              backgroundColor: 'var(--color-purple)', color: '#ffffff', border: 'none',
              padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold',
              cursor: (isMcqOrTf ? selectedOpt === null : !fibText.trim()) ? 'not-allowed' : 'pointer',
              opacity: (isMcqOrTf ? selectedOpt === null : !fibText.trim()) ? 0.5 : 1
            }}
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            style={{
              backgroundColor: 'var(--color-green)', color: '#ffffff', border: 'none',
              padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {currentQuestionIdx < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </button>
        )}
      </div>
    </div>
  );
};

// Sub-component for structured buddy messages
const StructuredMessage = ({ msg, onQuizSubmit }) => {
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [qIdx]: optionIdx }
  
  if (msg.error) {
    return (
      <div style={{
        padding: '16px', borderRadius: '12px', backgroundColor: 'var(--color-red-light)',
        border: '1.5px solid var(--color-red)', color: 'var(--color-red-dark)',
        fontSize: '0.92rem', fontWeight: '600', width: '100%'
      }}>
        <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          ⚠️ <b>API Error:</b> {msg.error}
        </p>
      </div>
    );
  }

  // 1. Planner Agent Card
  if (msg.agent === 'PLANNER' && msg.planData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', textAlign: 'left' }}>
        {msg.text && (
          <div style={{ padding: '16px 20px', borderRadius: '16px', backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-light)' }}>
            {renderMarkdown(msg.text)}
          </div>
        )}
        <div style={{
          backgroundColor: 'var(--bg-card)', padding: '16px 20px', borderRadius: '16px', border: '2px solid var(--color-purple)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
        }}>
          <h4 style={{ color: 'var(--color-purple-dark)', fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 12px 0' }}>
            📅 AI Study Planner: {msg.planData.title || 'Personal Study Calendar'}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {msg.planData.tasks?.map((t, idx) => (
              <div key={idx} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-app)'
              }}>
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: '0.88rem', display: 'block', color: 'var(--text-main)' }}>
                    {t.subject}: {t.topic}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ⏱️ {t.duration} • Priority: <b style={{ color: t.priority === 'high' ? 'var(--color-red)' : t.priority === 'medium' ? 'var(--color-yellow-dark)' : 'var(--color-green)' }}>{t.priority}</b>
                  </span>
                </div>
                <input type="checkbox" style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. Quiz Agent Card
  if (msg.agent === 'QUIZ' && msg.quizData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', textAlign: 'left' }}>
        {msg.text && (
          <div style={{ padding: '16px 20px', borderRadius: '16px', backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-light)' }}>
            {renderMarkdown(msg.text)}
          </div>
        )}
        <div style={{
          backgroundColor: 'var(--bg-card)', padding: '16px 20px', borderRadius: '16px', border: '2px solid var(--color-purple)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
        }}>
          <h4 style={{ color: 'var(--color-purple-dark)', fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 12px 0' }}>
            📝 Practice Quiz: {msg.quizData.title || `${msg.quizData.subject} Chapter Quiz`}
          </h4>
          <QuizWidget quizData={msg.quizData} onQuizSubmit={onQuizSubmit} />
        </div>
      </div>
    );
  }

  // 3. Progress Analysis Agent Card
  if (msg.agent === 'PROGRESS' && msg.progressData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', textAlign: 'left' }}>
        {msg.text && (
          <div style={{ padding: '16px 20px', borderRadius: '16px', backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-light)' }}>
            {renderMarkdown(msg.text)}
          </div>
        )}
        <div style={{
          backgroundColor: 'var(--bg-card)', padding: '16px 20px', borderRadius: '16px', border: '2px solid var(--color-green)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          <h4 style={{ color: 'var(--color-green-dark)', fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            📈 Mini Progress Report Card
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ textAlign: 'center', padding: '10px', borderRadius: '8px', backgroundColor: 'var(--bg-app)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Average Accuracy</span>
              <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--color-green)' }}>{msg.progressData.quizAverage}%</span>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', borderRadius: '8px', backgroundColor: 'var(--bg-app)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Total Study Duration</span>
              <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--color-purple)' }}>{msg.progressData.totalStudyTimeMins} mins</span>
            </div>
          </div>
          {msg.progressData.achievementUnlocked && (
            <div style={{
              padding: '12px', borderRadius: '10px', border: '1.5px solid var(--color-yellow-dark)',
              backgroundColor: 'var(--color-yellow-light)', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <Trophy size={22} color="var(--color-yellow-dark)" fill="var(--color-yellow)" />
              <div>
                <h5 style={{ margin: 0, fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--color-yellow-dark)' }}>
                  Achievement Unlocked!
                </h5>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-yellow-dark)' }}>
                  You earned the <b>{msg.progressData.achievementUnlocked}</b> badge!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. Reminder Agent Card
  if (msg.agent === 'REMINDER' && msg.reminderData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', textAlign: 'left' }}>
        {msg.text && (
          <div style={{ padding: '16px 20px', borderRadius: '16px', backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-light)' }}>
            {renderMarkdown(msg.text)}
          </div>
        )}
        <div style={{
          backgroundColor: 'var(--bg-card)', padding: '16px 20px', borderRadius: '16px', border: '2px solid var(--color-purple)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '10px'
        }}>
          <h4 style={{ color: 'var(--color-purple-dark)', fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            🔔 Active Notifications & Study Reminders
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {msg.reminderData.reminders?.map((r, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-light)'
              }}>
                <Bell size={16} color="var(--color-purple)" />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-main)', display: 'block' }}>{r.title}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily reminder at <b>{r.time}</b></span>
                </div>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 'bold', color: r.active ? 'var(--color-green-dark)' : 'var(--text-muted)',
                  backgroundColor: r.active ? 'var(--color-green-light)' : 'var(--border-light)', padding: '2px 8px', borderRadius: '10px'
                }}>{r.active ? 'Active' : 'Disabled'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 5. Exam Preparation Agent Card
  if (msg.agent === 'EXAM' && msg.examData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', textAlign: 'left' }}>
        {msg.text && (
          <div style={{ padding: '16px 20px', borderRadius: '16px', backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-light)' }}>
            {renderMarkdown(msg.text)}
          </div>
        )}
        <div style={{
          backgroundColor: 'var(--bg-card)', padding: '16px 20px', borderRadius: '16px', border: '2px solid var(--color-purple)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          <h4 style={{ color: 'var(--color-purple-dark)', fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            📖 Exam Revision Notes: {msg.examData.subject} Guide
          </h4>
          
          {msg.examData.quickNotes && msg.examData.quickNotes.length > 0 && (
            <div style={{ padding: '12px', borderRadius: '10px', border: '1.5px solid var(--color-blue)', backgroundColor: 'var(--color-blue-light)' }}>
              <h5 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-blue-dark)' }}>📖 Quick Concept Summary</h5>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: 'var(--color-blue-dark)', display: 'flex', flexDirection: 'column', gap: '4px', fontWeight: '600' }}>
                {msg.examData.quickNotes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}

          {msg.examData.importantQuestions && msg.examData.importantQuestions.length > 0 && (
            <div style={{ padding: '12px', borderRadius: '10px', border: '1.5px solid var(--color-purple)', backgroundColor: 'var(--color-purple-light)' }}>
              <h5 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-purple-dark)' }}>❓ Key Practice Questions</h5>
              <ol style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: 'var(--color-purple-dark)', display: 'flex', flexDirection: 'column', gap: '4px', fontWeight: '600' }}>
                {msg.examData.importantQuestions.map((q, i) => <li key={i}>{q}</li>)}
              </ol>
            </div>
          )}

          {msg.examData.revisionPlan && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Action Roadmap</span>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.4', fontWeight: '600' }}>{msg.examData.revisionPlan}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Backwards compatibility/tutor explanations
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', textAlign: 'left' }}>
      {/* 1. Explanation */}
      {msg.explanation && (
        <div style={{
          padding: '16px 20px', borderRadius: '16px', backgroundColor: 'var(--bg-card)',
          border: '2px solid var(--border-light)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
        }}>
          {msg.agent === 'SYLLABUS' && (
            msg.isVerified || msg.verificationStatus === 'approved' || msg.verificationStatus === 'edited' ? (
              <div style={{
                display: 'flex',
                alignItems: 'start',
                gap: '10px',
                padding: '12px 14px',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1.5px solid var(--color-green)',
                borderRadius: '12px',
                color: 'var(--color-green-dark)',
                fontSize: '0.82rem',
                fontWeight: '600',
                marginBottom: '14px'
              }}>
                <span style={{ fontSize: '1.1rem', marginTop: '-2px' }}>✅</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: '800', color: 'var(--color-green-dark)' }}>Verified by Subject Teacher</span>
                  {msg.verifiedBy && (
                    <span style={{ display: 'block', fontSize: '0.74rem', color: '#15803d' }}>
                      Expert: <strong>{msg.verifiedBy.name}</strong> ({msg.verifiedBy.qualification}) • {msg.verifiedBy.institution}
                    </span>
                  )}
                  {msg.teacherComments && (
                    <span style={{ display: 'block', fontSize: '0.74rem', color: '#166534', fontStyle: 'italic', marginTop: '4px', borderTop: '1px dashed rgba(16, 185, 129, 0.3)', paddingTop: '4px' }}>
                      💡 Teacher's Note: {msg.teacherComments}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'start',
                gap: '10px',
                padding: '12px 14px',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1.5px solid #d97706',
                borderRadius: '12px',
                color: '#b45309',
                fontSize: '0.82rem',
                fontWeight: '600',
                marginBottom: '14px'
              }}>
                <span style={{ fontSize: '1.1rem', marginTop: '-2px' }}>🤖</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: '800', color: '#92400e' }}>AI Generated (Not Verified by Teacher)</span>
                  <span style={{ display: 'block', fontSize: '0.74rem', color: '#b45309' }}>
                    This answer is currently pending teacher verification. Confidence score: {msg.confidenceScore || 0}%
                  </span>
                </div>
              </div>
            )
          )}
          {renderMarkdown(msg.explanation)}
        </div>
      )}

      {/* 2. Revision Notes */}
      {msg.revisionNotes && msg.revisionNotes.length > 0 && (
        <div style={{
          padding: '16px 20px', borderRadius: '16px', backgroundColor: 'var(--color-yellow-light)',
          border: '2px solid var(--color-yellow-dark)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
        }}>
          <h5 style={{ margin: '0 0 10px 0', color: 'var(--color-yellow-dark)', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📝 Study Notes & Key Takeaways
          </h5>
          <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--color-yellow-dark)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: '600' }}>
            {msg.revisionNotes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Examples */}
      {msg.examples && msg.examples.length > 0 && (
        <div style={{
          padding: '16px 20px', borderRadius: '16px', backgroundColor: 'var(--color-blue-light)',
          border: '2px solid var(--color-blue)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
        }}>
          <h5 style={{ margin: '0 0 10px 0', color: 'var(--color-blue-dark)', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            💡 Real-Life Examples
          </h5>
          <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--color-blue-dark)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: '600' }}>
            {msg.examples.map((ex, i) => (
              <li key={i}>{ex}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. Practice Questions (Quiz) */}
      {msg.practiceQuestions && msg.practiceQuestions.length > 0 && (
        <div style={{
          padding: '16px 20px', borderRadius: '16px', backgroundColor: 'var(--color-purple-light)',
          border: '2px solid var(--color-purple)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
        }}>
          <h5 style={{ margin: '0 0 12px 0', color: 'var(--color-purple-dark)', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📝 Practice Questions
          </h5>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {msg.practiceQuestions.map((q, qIdx) => {
              const chosenIdx = selectedAnswers[qIdx];
              const isAnswered = chosenIdx !== undefined;
              const isCorrect = chosenIdx === q.correctAnswerIndex;

              return (
                <div key={qIdx} style={{ backgroundColor: 'var(--bg-card)', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid var(--border-light)' }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    Q{qIdx + 1}: {q.question}
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {q.options.map((option, optIdx) => {
                      const isSelected = chosenIdx === optIdx;
                      const isCorrectOpt = optIdx === q.correctAnswerIndex;
                      
                      let btnStyle = {
                        width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--border-light)',
                        fontSize: '0.85rem', fontWeight: '600', cursor: isAnswered ? 'default' : 'pointer',
                        textAlign: 'left', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', transition: 'all 0.2s ease',
                        outline: 'none'
                      };

                      if (isSelected) {
                        btnStyle.backgroundColor = isCorrect ? 'var(--color-green-light)' : 'var(--color-red-light)';
                        btnStyle.borderColor = isCorrect ? 'var(--color-green)' : 'var(--color-red)';
                        btnStyle.color = isCorrect ? 'var(--color-green-dark)' : 'var(--color-red-dark)';
                      } else if (isAnswered && isCorrectOpt) {
                        btnStyle.backgroundColor = 'var(--color-green-light)';
                        btnStyle.borderColor = 'var(--color-green)';
                        btnStyle.color = 'var(--color-green-dark)';
                      }

                      return (
                        <button
                          key={optIdx}
                          onClick={() => {
                            if (!isAnswered) {
                              setSelectedAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
                            }
                          }}
                          disabled={isAnswered}
                          style={btnStyle}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  {isAnswered && (
                    <div style={{
                      marginTop: '10px', padding: '8px 12px', borderRadius: '8px',
                      backgroundColor: isCorrect ? 'var(--color-green-light)' : 'var(--color-red-light)',
                      fontSize: '0.82rem', fontWeight: '600', color: isCorrect ? 'var(--color-green-dark)' : 'var(--color-red-dark)',
                      borderLeft: `3px solid ${isCorrect ? 'var(--color-green)' : 'var(--color-red)'}`
                    }}>
                      <p style={{ margin: 0 }}>
                        <b>{isCorrect ? '✅ Correct!' : '❌ Incorrect.'}</b> {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Revision Material */}
      {msg.revisionMaterial && (
        <div style={{
          padding: '16px 20px', borderRadius: '16px', backgroundColor: 'var(--color-green-light)',
          border: '2px solid var(--color-green)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
        }}>
          <h5 style={{ margin: '0 0 10px 0', color: 'var(--color-green-dark)', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📚 Revision Material & Vocabulary
          </h5>
          {msg.revisionMaterial.summary && (
            <p style={{ margin: '0 0 12px 0', fontSize: '0.88rem', color: 'var(--color-green-dark)', lineHeight: '1.4', fontWeight: '600' }}>
              {msg.revisionMaterial.summary}
            </p>
          )}
          {msg.revisionMaterial.keyTerms && msg.revisionMaterial.keyTerms.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {msg.revisionMaterial.keyTerms.map((item, idx) => (
                <div key={idx} style={{
                  backgroundColor: 'var(--bg-card)', padding: '10px 14px', borderRadius: '12px',
                  border: '1.5px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '2px'
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-green-dark)' }}>
                    {item.term}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '500' }}>
                    {item.definition}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const AITeacher = () => {
  const { triggerNotification } = useApp();
  const { user } = useAuth();

  
  // Syllabus selection states
  const [syllabusList, setSyllabusList] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');

  // Persisted chat history
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(`studybuddy_chat_history_${user?._id || 'guest'}`);
    return saved ? JSON.parse(saved) : [
      {
        id: 'buddy-initial',
        sender: 'buddy',
        text: "Hoot hoot! 🦉 Hello! I am StudyGuru AI, your personal Andhra Pradesh syllabus tutor! Pick a Subject, Chapter, and Topic above, then ask me anything you find difficult, and we'll learn it together!",
        expression: 'happy',
        defaultLang: 'English',
        currentLang: 'English'
      }
    ];
  });

  const [inputText, setInputText] = useState('');
  const [mascotExpression, setMascotExpression] = useState('happy');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const messagesEndRef = useRef(null);
  const timeoutRef = useRef(null);

  // Sync messages in localStorage
  useEffect(() => {
    localStorage.setItem(`studybuddy_chat_history_${user?._id || 'guest'}`, JSON.stringify(messages));
  }, [messages, user]);

  // Load syllabus and set default values
  useEffect(() => {
    async function loadSyllabus() {
      const studentClass = user?.studentProfile?.class || 5;
      try {
        const list = await api.getSyllabus(studentClass);
        setSyllabusList(list || []);
        if (list && list.length > 0) {
          setSelectedSubject(list[0].subject);
          if (list[0].chapters && list[0].chapters.length > 0) {
            setSelectedChapter(list[0].chapters[0].name);
            if (list[0].chapters[0].topics && list[0].chapters[0].topics.length > 0) {
              setSelectedTopic(list[0].chapters[0].topics[0]);
            }
          }
        }
      } catch (err) {
        console.error("Error loading syllabus for StudyGuru AI:", err);
      }
    }
    if (user) {
      loadSyllabus();
    }
  }, [user]);

  // Update selected chapter when selected subject changes
  useEffect(() => {
    if (selectedSubject) {
      const subSyllabus = syllabusList.find(s => s.subject.toLowerCase() === selectedSubject.toLowerCase());
      if (subSyllabus && subSyllabus.chapters && subSyllabus.chapters.length > 0) {
        setSelectedChapter(subSyllabus.chapters[0].name);
      } else {
        setSelectedChapter('');
      }
    }
  }, [selectedSubject, syllabusList]);

  // Update selected topic when chapter changes
  useEffect(() => {
    if (selectedChapter) {
      const subSyllabus = syllabusList.find(s => s.subject.toLowerCase() === selectedSubject.toLowerCase());
      const chObj = subSyllabus?.chapters.find(c => c.name === selectedChapter);
      if (chObj && chObj.topics && chObj.topics.length > 0) {
        setSelectedTopic(chObj.topics[0]);
      } else {
        setSelectedTopic('');
      }
    }
  }, [selectedChapter, selectedSubject, syllabusList]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN'; // Indian English optimizations

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
      };

      rec.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          triggerNotification("Microphone permission denied. Please allow microphone access in your browser settings.", "red");
        } else {
          triggerNotification("Speech recognition error: " + event.error, "red");
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [triggerNotification]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      triggerNotification("Speech recognition is not supported in this browser. Try Google Chrome or Microsoft Edge!", "red");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Speech start error:", err);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  const handleQuizSubmit = async (quizResultPayload) => {
    try {
      const res = await api.submitQuizResult(quizResultPayload);
      triggerNotification(`🎉 Quiz Saved! Earned +${res.xpEarned} XP and +${res.coinsEarned} Coins!`, 'success');
      return res;
    } catch (err) {
      console.error("Error submitting quiz result:", err);
      triggerNotification("Failed to save quiz results.", "error");
      throw err;
    }
  };

  const handleTranslateMessage = async (msgId, targetLanguageName) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    if ((msg.currentLang || 'Default') === targetLanguageName) return;

    // Check cache
    if (msg.translations && msg.translations[targetLanguageName]) {
      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          const translatedVal = m.translations[targetLanguageName];
          return {
            ...m,
            currentLang: targetLanguageName,
            text: (m.originalExplanation !== undefined || m.explanation !== undefined) ? undefined : translatedVal,
            explanation: (m.originalExplanation !== undefined || m.explanation !== undefined) ? translatedVal : undefined
          };
        }
        return m;
      }));
      return;
    }

    // Mark as translating
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) return { ...m, translating: true };
      return m;
    }));

    try {
      const sourceText = msg.originalText || msg.text || msg.originalExplanation || msg.explanation || '';
      if (!sourceText) return;

      const res = await api.translateText(sourceText, targetLanguageName);
      const translatedText = res.translatedText;

      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          const origText = m.originalText || m.text;
          const origExpl = m.originalExplanation || m.explanation;
          const currentTranslations = {
            ...(m.translations || {}),
            [targetLanguageName]: translatedText,
            [m.defaultLang || 'Default']: sourceText
          };
          return {
            ...m,
            originalText: origText,
            originalExplanation: origExpl,
            translations: currentTranslations,
            currentLang: targetLanguageName,
            translating: false,
            text: (origExpl !== undefined || m.explanation !== undefined) ? undefined : translatedText,
            explanation: (origExpl !== undefined || m.explanation !== undefined) ? translatedText : undefined
          };
        }
        return m;
      }));
    } catch (err) {
      console.error("Translation request failed:", err);
      triggerNotification("⚠️ Translation failed. Please try again.", "red");
      setMessages(prev => prev.map(m => {
        if (m.id === msgId) return { ...m, translating: false };
        return m;
      }));
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    // Add student query to list
    const userMsg = { id: `student-${Date.now()}-${Math.random()}`, sender: 'student', text: text };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');

    // Trigger typing thinking states
    setIsTyping(true);
    setMascotExpression('thinking');

    try {
      const studentClass = user?.studentProfile?.class || 5;
      const res = await api.chatWithAI(text, selectedSubject, selectedChapter, selectedTopic, studentClass);
      
      setIsTyping(false);
      const userPrefLang = user?.studentProfile?.preferredLanguage || 'English';
      const defaultLangName = userPrefLang === 'Hindi' ? 'Hindi' : userPrefLang === 'Telugu' ? 'Telugu' : 'English';
      
      const buddyMsg = {
        id: `buddy-${Date.now()}-${Math.random()}`,
        sender: 'buddy',
        agent: res.agent,
        text: res.text,
        planData: res.planData || null,
        quizData: res.quizData || null,
        progressData: res.progressData || null,
        reminderData: res.reminderData || null,
        examData: res.examData || null,

        // Backwards compatibility
        explanation: res.explanation || res.text,
        revisionNotes: res.revisionNotes || [],
        examples: res.examples || [],
        practiceQuestions: res.practiceQuestions || [],
        revisionMaterial: res.revisionMaterial || null,
        
        expression: res.expression || 'happy',
        
        // Language fields
        defaultLang: defaultLangName,
        currentLang: defaultLangName,

        // Verification metadata
        verificationStatus: res.verificationStatus || 'pending',
        confidenceScore: res.confidenceScore || 0,
        isVerified: res.isVerified || false,
        verifiedBy: res.verifiedBy || null,
        verifiedAt: res.verifiedAt || null,
        sources: res.sources || [],
        answerId: res.answerId || null
      };
      setMessages((prev) => [...prev, buddyMsg]);
      setMascotExpression(res.expression || 'happy');

    } catch (err) {
      console.error(err);
      setIsTyping(false);
      
      const errorMsg = {
        id: `buddy-error-${Date.now()}-${Math.random()}`,
        sender: 'buddy',
        error: err.message || "Failed to connect to StudyGuru AI. Please check that backend server is active."
      };
      setMessages((prev) => [...prev, errorMsg]);
      setMascotExpression('confused');
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your chat history?")) {
      const defaultInitial = [
        {
          id: 'buddy-initial',
          sender: 'buddy',
          text: "Hoot hoot! 🦉 Hello! I am StudyGuru AI, your personal Andhra Pradesh syllabus tutor! Pick a Subject, Chapter, and Topic above, then ask me anything you find difficult, and we'll learn it together!",
          expression: 'happy',
          defaultLang: 'English',
          currentLang: 'English'
        }
      ];
      setMessages(defaultInitial);
      setMascotExpression('happy');
      triggerNotification("🧹 Chat history cleared.");
    }
  };

  const handlePromptClick = (promptText) => {
    handleSendMessage(promptText);
  };

  const currentSubSyllabus = syllabusList.find(
    s => s.subject.toLowerCase() === selectedSubject.toLowerCase()
  );
  const activeChapters = currentSubSyllabus?.chapters || [];

  const currentChapterObj = activeChapters.find(
    c => c.name === selectedChapter
  );
  const activeTopics = currentChapterObj?.topics || [];

  const suggestedPrompts = [
    { text: `Explain "${selectedTopic || 'photosynthesis'}" 🌿`, color: 'var(--color-green)' },
    { text: `Give me revision notes on this topic 📐`, color: 'var(--color-blue)' },
    { text: `Create a practice quiz for ${selectedChapter || 'this'} ✍️`, color: 'var(--color-purple)' },
    { text: "Tell me a funny riddle! 🦉", color: 'var(--color-yellow-dark)' }
  ];

  return (
    <div className="ai-teacher-grid">
      
      {/* Left Column: Mascot guide & prompt tips */}
      <section className="card-buddy" style={{
        textAlign: 'center', padding: '40px 20px', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', gap: '20px'
      }}>
        <Mascot size={180} expression={mascotExpression} />
        
        <div>
          <h3 style={{ fontSize: '1.6rem', color: 'var(--color-purple)', marginBottom: '8px' }}>
            StudyGuru AI
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0 10px', lineHeight: '1.5' }}>
            StudyGuru AI uses your selected syllabus topic to generate lessons, real-life examples, and customized practice quizzes!
          </p>
        </div>

        {/* Suggestion prompt cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '10px' }}>
          <h5 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'left', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Suggested Prompts
          </h5>
          {suggestedPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handlePromptClick(p.text)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)',
                backgroundColor: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700',
                fontFamily: 'var(--font-body)', color: p.color, transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px'
              }}
              className="sidebar-link"
            >
              <Sparkles size={14} fill="currentColor" /> {p.text}
            </button>
          ))}
        </div>
      </section>

      {/* Right Column: Chat layout window */}
      <section className="card-buddy" style={{
        height: '100%', display: 'flex', flexDirection: 'column', padding: '0px', overflow: 'hidden'
      }}>
        {/* Chat Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '2px solid var(--border-light)', backgroundColor: 'var(--bg-card)',
          display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between', flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-green)' }} />
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-main)' }}>Chat with StudyGuru AI</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleClearHistory}
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem',
                fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', outline: 'none'
              }}
              title="Clear study chat history"
            >
              Clear Chat
            </button>
            <span style={{
              fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px',
              backgroundColor: 'var(--color-green-light)', color: 'var(--color-green-dark)',
              border: '1px solid var(--color-green)'
            }}>
              AP Syllabus Guide
            </span>
          </div>
        </div>

        {/* Syllabus Selector Bar (Subject, Chapter, Topic) */}
        <div style={{
          padding: '12px 24px', backgroundColor: 'var(--bg-app)', borderBottom: '2px solid var(--border-light)',
          display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap'
        }}>
          {/* Subject */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Subject:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{
                padding: '4px 8px', borderRadius: '4px', border: '1.5px solid var(--border-light)',
                fontWeight: 'bold', outline: 'none', color: 'var(--color-purple)', cursor: 'pointer', fontSize: '0.8rem'
              }}
            >
              {syllabusList.map(s => (
                <option key={s.subject} value={s.subject}>{s.subject}</option>
              ))}
              {syllabusList.length === 0 && (
                <>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="English">English</option>
                  <option value="Social Studies">Social Studies</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Hindi">Hindi</option>
                </>
              )}
            </select>
          </div>

          {/* Chapter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Chapter:</span>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              style={{
                padding: '4px 8px', borderRadius: '4px', border: '1.5px solid var(--border-light)',
                fontWeight: 'bold', outline: 'none', color: 'var(--color-purple)', cursor: 'pointer', fontSize: '0.8rem',
                maxWidth: '180px'
              }}
            >
              {activeChapters.map(ch => (
                <option key={ch.name} value={ch.name}>{ch.name}</option>
              ))}
              {activeChapters.length === 0 && (
                <option value="General Revision">General Revision</option>
              )}
            </select>
          </div>

          {/* Topic */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Topic:</span>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              style={{
                padding: '4px 8px', borderRadius: '4px', border: '1.5px solid var(--border-light)',
                fontWeight: 'bold', outline: 'none', color: 'var(--color-purple)', cursor: 'pointer', fontSize: '0.8rem',
                maxWidth: '220px'
              }}
            >
              {activeTopics.map(tName => (
                <option key={tName} value={tName}>{tName}</option>
              ))}
              {activeTopics.length === 0 && (
                <option value="General Practice">General Practice</option>
              )}
            </select>
          </div>
        </div>

        {/* Messages list */}
        <div style={{
          flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px',
          backgroundColor: 'var(--bg-app)'
        }}>
          {messages.map((m) => {
            const isBuddy = m.sender === 'buddy';
            const hasStructuredContent = isBuddy && (m.explanation || m.agent || m.error);
            
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: isBuddy ? 'flex-start' : 'flex-end',
                  alignItems: 'start',
                  gap: '12px'
                }}
              >
                {isBuddy && (
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-purple-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--color-purple)'
                  }}>
                    🦉
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '85%', width: hasStructuredContent ? '100%' : 'auto' }}>
                  <div style={{
                    padding: hasStructuredContent ? '0' : '14px 18px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.98rem',
                    lineHeight: '1.5',
                    fontWeight: '600',
                    boxShadow: hasStructuredContent ? 'none' : '0 3px 6px rgba(0,0,0,0.02)',
                    whiteSpace: 'pre-wrap',
                    backgroundColor: isBuddy ? (hasStructuredContent ? 'transparent' : 'var(--bg-card)') : 'var(--color-green)',
                    color: isBuddy ? 'var(--text-main)' : '#ffffff',
                    border: isBuddy && !hasStructuredContent ? '2px solid var(--border-light)' : 'none',
                    borderBottomLeftRadius: isBuddy ? '0px' : 'var(--radius-sm)',
                    borderBottomRightRadius: !isBuddy ? '0px' : 'var(--radius-sm)',
                    width: '100%'
                  }}>
                    {hasStructuredContent ? (
                      <StructuredMessage msg={m} onQuizSubmit={handleQuizSubmit} />
                    ) : (
                      renderMarkdown(m.text)
                    )}
                  </div>
                  
                  {/* On-the-fly Translation Bar */}
                  {isBuddy && !m.error && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      paddingLeft: '4px',
                      flexWrap: 'wrap'
                    }}>
                      <span>Translate:</span>
                      <button
                        type="button"
                        onClick={() => handleTranslateMessage(m.id, 'English')}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: (m.currentLang || 'Default') === 'English' ? 'bold' : 'normal',
                          color: (m.currentLang || 'Default') === 'English' ? 'var(--color-purple-dark)' : 'var(--text-muted)',
                          backgroundColor: (m.currentLang || 'Default') === 'English' ? 'var(--color-purple-light)' : 'transparent',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTranslateMessage(m.id, 'Telugu')}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: m.currentLang === 'Telugu' ? 'bold' : 'normal',
                          color: m.currentLang === 'Telugu' ? 'var(--color-purple-dark)' : 'var(--text-muted)',
                          backgroundColor: m.currentLang === 'Telugu' ? 'var(--color-purple-light)' : 'transparent',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                      >
                        తెలుగు
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTranslateMessage(m.id, 'Hindi')}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: m.currentLang === 'Hindi' ? 'bold' : 'normal',
                          color: m.currentLang === 'Hindi' ? 'var(--color-purple-dark)' : 'var(--text-muted)',
                          backgroundColor: m.currentLang === 'Hindi' ? 'var(--color-purple-light)' : 'transparent',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                      >
                        हिंदी
                      </button>
                      {m.translating && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-purple)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="animate-pulse" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-purple)' }} />
                          Translating...
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Typing Loading Indicator */}
          {isTyping && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-purple-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--color-purple)'
              }}>
                🦉
              </div>
              <div style={{
                padding: '12px 18px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-card)',
                border: '2px solid var(--border-light)', display: 'flex', gap: '5px'
              }}>
                <span className="animate-flame" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--text-muted)' }} />
                <span className="animate-flame" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--text-muted)', animationDelay: '0.2s' }} />
                <span className="animate-flame" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--text-muted)', animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Panel */}
        <div style={{ padding: '20px', borderTop: '2px solid var(--border-light)', backgroundColor: 'var(--bg-card)' }}>
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            style={{ display: 'flex', gap: '12px', alignItems: 'center' }}
          >
            <input
              type="text"
              placeholder={isListening ? "Listening... Speak now!" : `Ask StudyGuru AI about ${selectedTopic || 'this topic'}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)',
                fontSize: '1rem', fontFamily: 'var(--font-body)', outline: 'none',
                borderColor: isListening ? 'var(--color-red)' : 'var(--border-light)',
                boxShadow: isListening ? '0 0 12px var(--color-red-glow)' : 'none',
                transition: 'all 0.3s ease'
              }}
            />
            <button
              type="button"
              onClick={toggleListening}
              className={`btn-3d ${isListening ? 'btn-3d-red' : 'btn-3d-blue'}`}
              style={{ 
                padding: '12px 14px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                animation: isListening ? 'flame-pulse 1.5s infinite ease-in-out' : 'none'
              }}
              title={isListening ? "Stop listening" : "Talk to StudyGuru"}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <button
              type="submit"
              className="btn-3d btn-3d-green"
              style={{ padding: '12px 20px' }}
              disabled={isListening}
            >
              <Send size={18} />
            </button>
          </form>
        </div>

      </section>

    </div>
  );
};
