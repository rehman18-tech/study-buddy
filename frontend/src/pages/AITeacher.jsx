import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Mascot } from '../components/Mascot';
import { io } from 'socket.io-client';
import { Send, Sparkles, Mic, MicOff, Trophy, AlertTriangle, BookMarked, Award, Star, Flame, Zap, Calendar, ArrowRight, CheckCircle, Bell, BookOpen, Clock, ChevronRight } from 'lucide-react';

const renderMarkdown = (text) => {
  if (!text) return '';
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    // First, split by markdown links [text](url)
    const linkParts = line.split(/(\[.*?\]\(.*?\))/g);
    const renderedLine = linkParts.map((linkPart, linkPartIdx) => {
      if (linkPart.startsWith('[') && linkPart.includes('](') && linkPart.endsWith(')')) {
        const midIdx = linkPart.indexOf('](');
        const linkText = linkPart.slice(1, midIdx);
        const linkUrl = linkPart.slice(midIdx + 2, -1);
        return (
          <a 
            key={linkPartIdx} 
            href={linkUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: 'var(--color-purple)', textDecoration: 'underline', fontWeight: 'bold', wordBreak: 'break-all' }}
          >
            {linkText}
          </a>
        );
      }
      
      // Then, split by bold and italic within the non-link parts
      const parts = linkPart.split(/(\*\*.*?\*\*|\*.*?\*)/g);
      return parts.map((part, partIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={`${linkPartIdx}-${partIdx}`}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={`${linkPartIdx}-${partIdx}`}>{part.slice(1, -1)}</em>;
        }
        return part;
      });
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

const MCQQuizBlock = ({ q, qIdx, selectedAnswers, setSelectedAnswers }) => {
  const chosenIdx = selectedAnswers[qIdx];
  const isAnswered = chosenIdx !== undefined;
  const isCorrect = chosenIdx === q.correctAnswerIndex;

  return (
    <div>
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
          fontSize: '0.82rem', color: isCorrect ? 'var(--color-green-dark)' : 'var(--color-red-dark)',
          borderLeft: `3px solid ${isCorrect ? 'var(--color-green)' : 'var(--color-red)'}`,
          fontWeight: '600'
        }}>
          <b>{isCorrect ? '✅ Correct!' : '❌ Incorrect.'}</b> {q.solution || q.explanation || 'Good job trying!'}
        </div>
      )}
    </div>
  );
};

const CollapsibleTextQuestionBlock = ({ q }) => {
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        {q.hint && (
          <button
            onClick={() => setShowHint(prev => !prev)}
            style={{
              padding: '6px 12px', borderRadius: '8px', border: '1.5px solid var(--border-light)',
              fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer', outline: 'none',
              backgroundColor: showHint ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-card)',
              color: showHint ? '#d97706' : 'var(--text-muted)', transition: 'all 0.2s ease'
            }}
          >
            💡 {showHint ? 'Hide Hint' : 'Show Hint'}
          </button>
        )}
        {q.solution && (
          <button
            onClick={() => setShowSolution(prev => !prev)}
            style={{
              padding: '6px 12px', borderRadius: '8px', border: '1.5px solid var(--border-light)',
              fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer', outline: 'none',
              backgroundColor: showSolution ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-card)',
              color: showSolution ? 'var(--color-blue-dark)' : 'var(--text-muted)', transition: 'all 0.2s ease'
            }}
          >
            🔑 {showSolution ? 'Hide Solution' : 'Show Solution'}
          </button>
        )}
      </div>

      {showHint && q.hint && (
        <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.04)', borderLeft: '3px solid #d97706', fontSize: '0.8rem', color: 'var(--text-main)' }}>
          <strong>Hint:</strong> {q.hint}
        </div>
      )}

      {showSolution && q.solution && (
        <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.04)', borderLeft: '3px solid var(--color-blue)', fontSize: '0.8rem', color: 'var(--text-main)' }}>
          <strong>Solution:</strong> {q.solution}
        </div>
      )}
    </div>
  );
};

const InlineQuizBlock = ({ questions, subject, onQuizSubmit }) => {
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(0);

  const isAllAnswered = Object.keys(userAnswers).length === questions.length;

  const handleSubmit = async () => {
    if (submitted || submitting) return;
    setSubmitting(true);
    try {
      let correctCount = 0;
      questions.forEach((q, qIdx) => {
        const ans = userAnswers[qIdx];
        if (q.type === 'mcq' || q.type === 'tf') {
          if (ans === q.correctAnswerIndex) correctCount++;
        } else if (q.type === 'fib') {
          const userVal = (ans || '').trim().toLowerCase();
          const correctVal = (q.correctAnswerText || '').trim().toLowerCase();
          if (userVal === correctVal) correctCount++;
        }
      });

      const finalScore = Math.round((correctCount / questions.length) * 100);
      setScore(finalScore);

      await onQuizSubmit({
        quizId: 'mini_quiz_' + Date.now(),
        score: finalScore,
        answers: Object.entries(userAnswers).map(([qIdx, ansVal]) => ({
          questionIndex: Number(qIdx),
          answer: String(ansVal)
        })),
        subject: subject || 'General'
      });

      setSubmitted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      padding: '16px 20px', borderRadius: '16px', backgroundColor: 'rgba(59, 130, 246, 0.05)',
      border: '2.5px dashed var(--color-blue)', display: 'flex', flexDirection: 'column', gap: '15px'
    }}>
      <h5 style={{ margin: 0, color: 'var(--color-blue-dark)', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
        🧠 Topic Mini Quiz (5 Questions)
      </h5>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
        {questions.map((q, qIdx) => {
          const chosenVal = userAnswers[qIdx];
          const isAnswered = submitted;
          let isCorrect = false;
          if (submitted) {
            if (q.type === 'mcq' || q.type === 'tf') {
              isCorrect = chosenVal === q.correctAnswerIndex;
            } else {
              isCorrect = (chosenVal || '').trim().toLowerCase() === (q.correctAnswerText || '').trim().toLowerCase();
            }
          }

          return (
            <div key={qIdx} style={{ backgroundColor: 'var(--bg-card)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Question {qIdx + 1} of {questions.length}</span>
              <p style={{ margin: '4px 0 10px 0', fontSize: '0.86rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{q.question}</p>

              {q.type === 'mcq' || q.type === 'tf' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {q.options.map((opt, optIdx) => {
                    const isSelected = chosenVal === optIdx;
                    const isCorrectOpt = optIdx === q.correctAnswerIndex;

                    let btnStyle = {
                      width: '100%', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-light)',
                      fontSize: '0.8rem', fontWeight: '600', cursor: isAnswered ? 'default' : 'pointer',
                      textAlign: 'left', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none'
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
                        disabled={isAnswered}
                        onClick={() => setUserAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
                        style={btnStyle}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    disabled={isAnswered}
                    value={chosenVal || ''}
                    onChange={(e) => setUserAnswers(prev => ({ ...prev, [qIdx]: e.target.value }))}
                    placeholder="Type your answer here..."
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)',
                      fontSize: '0.8rem', outline: 'none', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)'
                    }}
                  />
                  {isAnswered && (
                    <div style={{ fontSize: '0.78rem', color: isCorrect ? 'var(--color-green-dark)' : 'var(--color-red-dark)' }}>
                      <b>Correct Answer:</b> {q.correctAnswerText}
                    </div>
                  )}
                </div>
              )}

              {isAnswered && (
                <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  ℹ️ {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={!isAllAnswered || submitting}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: '10px', border: 'none',
            backgroundColor: isAllAnswered ? 'var(--color-blue)' : 'var(--border-light)',
            color: isAllAnswered ? '#ffffff' : 'var(--text-muted)', fontSize: '0.85rem',
            fontWeight: 'bold', cursor: isAllAnswered ? 'pointer' : 'default', transition: 'all 0.2s ease'
          }}
        >
          {submitting ? 'Submitting...' : 'Submit Quiz'}
        </button>
      ) : (
        <div style={{
          padding: '12px', borderRadius: '10px', backgroundColor: 'var(--bg-card)',
          border: '1.5px solid var(--border-light)', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold'
        }}>
          🎯 Quiz Completed! Score: <span style={{ color: 'var(--color-blue-dark)' }}>{score}%</span>
        </div>
      )}
    </div>
  );
};

// Global Component for rendering Verification Badges
const VerificationBadge = ({ msg, onRequestTeacherHelp }) => {
  if (msg.agent !== 'SYLLABUS') return null;

  // Layer 3: Teacher Assisted
  if (msg.verificationStatus === 'approved' || msg.doubtStatus === 'resolved') {
    const verifiedBy = msg.verifiedBy || msg.resolvedBy || { name: 'Subject Teacher', qualification: 'Subject Expert', institution: 'StudyBuddy' };
    return (
      <div style={{
        display: 'flex', alignItems: 'start', gap: '10px', padding: '12px 14px',
        backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1.5px solid var(--color-yellow-dark)',
        borderRadius: '12px', color: 'var(--color-yellow-dark)', fontSize: '0.82rem', fontWeight: '600', marginBottom: '14px',
        boxSizing: 'border-box', width: '100%', textAlign: 'left'
      }}>
        <span style={{ fontSize: '1.2rem', marginTop: '-2px' }}>👨‍🏫</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
          <span style={{ fontWeight: '800', color: 'var(--color-yellow-dark)' }}>Teacher Assisted</span>
          <span style={{ display: 'block', fontSize: '0.74rem', color: '#b45309' }}>
            Resolved by: <strong>{verifiedBy.name}</strong> ({verifiedBy.qualification}) • {verifiedBy.institution}
          </span>
          {msg.teacherAnswer && (
            <div style={{
              marginTop: '8px', padding: '10px 12px', borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.05)', borderLeft: '3px solid var(--color-yellow-dark)',
              color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: 'normal', fontStyle: 'italic'
            }}>
              📢 <b>Teacher's Explanation:</b> {msg.teacherAnswer}
            </div>
          )}
          {msg.teacherComments && (
            <span style={{ display: 'block', fontSize: '0.74rem', color: '#92400e', fontStyle: 'italic', marginTop: '4px' }}>
              💡 Teacher's Note: {msg.teacherComments}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Layer 1: Textbook Verified
  if (msg.verificationLayer === 'textbook' || (Array.isArray(msg.sources) && msg.sources.some(s => s.type === 'textbook'))) {
    const tSource = Array.isArray(msg.sources) ? msg.sources.find(s => s.type === 'textbook') : null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', width: '100%', boxSizing: 'border-box', textAlign: 'left' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
          backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1.5px solid var(--color-blue)',
          borderRadius: '12px', color: 'var(--color-blue-dark)', fontSize: '0.82rem', fontWeight: '800',
          width: 'fit-content'
        }}>
          <span style={{ fontSize: '1.1rem' }}>📘</span>
          <span>Textbook Verified</span>
        </div>
        
        {tSource && (
          <div style={{
            padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)',
            backgroundColor: 'var(--bg-app)', fontSize: '0.75rem', color: 'var(--text-muted)', width: '100%', boxSizing: 'border-box'
          }}>
            🏫 <b>Source Details:</b> {tSource.board || 'AP Board'} • Class {tSource.class || msg.class} • {tSource.subject || msg.subject}
            <div style={{ marginTop: '4px' }}>
              📖 <b>Chapter:</b> {tSource.chapter} {tSource.topic && tSource.topic !== 'General' && `• Topic: ${tSource.topic}`}
              {tSource.pageNumber && <span style={{ marginLeft: '8px', display: 'inline-block', backgroundColor: 'var(--border-light)', padding: '1px 6px', borderRadius: '6px' }}>Page {tSource.pageNumber}</span>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Layer 2: Web Verified (with Reliability Score)
  if (msg.verificationLayer === 'web' || (Array.isArray(msg.sources) && msg.sources.some(s => s.type === 'web' || s.url)) || msg.reliabilityScore !== undefined) {
    const webSources = Array.isArray(msg.sources) ? msg.sources.filter(s => s.type === 'web' || s.url) : [];
    const hasScore = msg.reliabilityScore !== undefined && msg.reliabilityScore !== null;
    
    let levelLabel = '';
    let levelColor = '';
    let badgeBg = '';
    
    if (hasScore) {
      const score = msg.reliabilityScore;
      if (score >= 95) {
        levelLabel = 'Very High Reliability';
        levelColor = '#047857'; // emerald-700
        badgeBg = 'rgba(16, 185, 129, 0.1)';
      } else if (score >= 85) {
        levelLabel = 'High Reliability';
        levelColor = '#059669'; // emerald-600
        badgeBg = 'rgba(16, 185, 129, 0.08)';
      } else if (score >= 70) {
        levelLabel = 'Moderate Reliability';
        levelColor = '#d97706'; // amber-600
        badgeBg = 'rgba(245, 158, 11, 0.08)';
      } else {
        levelLabel = 'Low Reliability';
        levelColor = '#dc2626'; // red-600
        badgeBg = 'rgba(239, 68, 68, 0.08)';
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', width: '100%', boxSizing: 'border-box', textAlign: 'left' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', paddingRight: '50px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
            backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1.5px solid var(--color-green)',
            borderRadius: '12px', color: 'var(--color-green-dark)', fontSize: '0.82rem', fontWeight: '800',
            width: 'fit-content'
          }}>
            <span style={{ fontSize: '1.1rem' }}>🌐</span>
            <span>Web Verified</span>
          </div>

          {hasScore && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px',
              backgroundColor: badgeBg, border: `1.5px solid ${levelColor}`,
              borderRadius: '12px', color: levelColor, fontSize: '0.82rem', fontWeight: '800',
              width: 'fit-content'
            }}>
              <span>Reliability Score: {msg.reliabilityScore}/100 ({levelLabel})</span>
            </div>
          )}
        </div>

        {hasScore && msg.reliabilitySummary && (
          <div style={{
            padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)',
            backgroundColor: 'var(--bg-app)', fontSize: '0.8rem', color: 'var(--text-main)',
            display: 'flex', flexDirection: 'column', gap: '8px',
            width: '100%', boxSizing: 'border-box', overflowWrap: 'break-word', wordBreak: 'break-word'
          }}>
            <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem', display: 'block' }}>
              📊 Verification Summary
            </span>
            <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
              <li><b>Number of trusted sources used:</b> {msg.reliabilitySummary.sourceCount}</li>
              <li><b>Conflicting information found:</b> {msg.reliabilitySummary.conflictingFound ? '⚠️ Yes (contradictions detected)' : 'No (sources agree)'}</li>
              <li><b>AI consistency checks passed:</b> {msg.reliabilitySummary.consistencyPassed ? 'Yes' : '⚠️ No'}</li>
            </ul>
            {msg.reliabilitySummary.explanation && (
              <div style={{ marginTop: '4px', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                ℹ️ {msg.reliabilitySummary.explanation}
              </div>
            )}

            {/* Need Teacher Help Callout for score < 70 */}
            {msg.reliabilityScore < 70 && (
              <div style={{
                marginTop: '6px',
                padding: '10px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                border: '1.5px solid #dc2626',
                borderRadius: '8px',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1.1rem' }}>👨‍🏫</span>
                  <span style={{ fontWeight: 'bold', fontSize: '0.76rem' }}>Low reliability answer. Teacher help recommended!</span>
                </div>
                {!msg.doubtStatus && onRequestTeacherHelp && (
                  <button
                    type="button"
                    onClick={() => onRequestTeacherHelp(msg)}
                    style={{
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Ask Teacher
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {webSources.length > 0 && (
          <div style={{
            padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)',
            backgroundColor: 'var(--bg-app)', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block' }}>
              🔍 Verified Sources:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {webSources.slice(0, 3).map((src, i) => (
                <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" style={{
                  fontSize: '0.74rem', color: 'var(--color-purple)', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600'
                }}>
                  🔗 {src.title || src.url}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default Fallback
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
      backgroundColor: 'var(--border-light)', borderRadius: '10px',
      color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600', marginBottom: '14px',
      width: 'fit-content', textAlign: 'left'
    }}>
      🤖 AI Generated (Not Verified)
    </div>
  );
};

// Sub-component for structured buddy messages
const StructuredMessage = ({ msg, onQuizSubmit, onRequestTeacherHelp, onMaximize }) => {
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [qIdx]: optionIdx }
  const [showComprehension, setShowComprehension] = useState(null); // null = ask, true = show, false = skip
  const [viewMode, setViewMode] = useState('vertical'); // 'vertical' or 'mixed'

  const hasComprehension = !!(
    (msg.revisionNotes && msg.revisionNotes.length > 0) ||
    (msg.examples && msg.examples.length > 0) ||
    (msg.practiceQuestions && msg.practiceQuestions.length > 0) ||
    msg.revisionMaterial ||
    msg.learningCompanion ||
    (msg.miniQuiz && msg.miniQuiz.length > 0)
  );
  
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



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', textAlign: 'left' }}>


      {/* View Mode Toggle Header */}
      {hasComprehension && showComprehension === true && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px', borderRadius: '12px', backgroundColor: 'var(--bg-card)',
          border: '1.5px solid var(--border-light)', marginBottom: '4px', flexWrap: 'wrap', gap: '8px'
        }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
            🎒 Learning Companion Mode:
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setViewMode('vertical')}
              style={{
                padding: '6px 12px', borderRadius: '8px', border: viewMode === 'vertical' ? '1.5px solid var(--color-purple)' : '1.5px solid transparent',
                backgroundColor: viewMode === 'vertical' ? 'var(--color-purple-light)' : 'transparent',
                color: viewMode === 'vertical' ? 'var(--color-purple-dark)' : 'var(--text-muted)',
                fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              📝 Vertical View
            </button>
            <button
              onClick={() => setViewMode('mixed')}
              style={{
                padding: '6px 12px', borderRadius: '8px', border: viewMode === 'mixed' ? '1.5px solid var(--color-purple)' : '1.5px solid transparent',
                backgroundColor: viewMode === 'mixed' ? 'var(--color-purple-light)' : 'transparent',
                color: viewMode === 'mixed' ? 'var(--color-purple-dark)' : 'var(--text-muted)',
                fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              🔀 Mixed Split View
            </button>
          </div>
        </div>
      )}

      {viewMode === 'mixed' && showComprehension === true ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '16px',
          width: '100%',
          alignItems: 'start'
        }}>
          {/* Column 1: AI Explanation & Verification Badge */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {msg.explanation && (
              <div style={{
                padding: '16px 20px', borderRadius: '16px', backgroundColor: 'var(--bg-card)',
                border: '2px solid var(--border-light)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                position: 'relative'
              }}>
                <button
                  onClick={onMaximize}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--color-purple)',
                    border: '1.5px solid var(--border-light)',
                    borderRadius: '8px',
                    width: '38px',
                    height: '28px',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease',
                    zIndex: 10
                  }}
                  title="Maximize Focus Mode"
                >
                  Max
                </button>
                <VerificationBadge msg={msg} onRequestTeacherHelp={onRequestTeacherHelp} />
                {renderMarkdown(msg.explanation)}
              </div>
            )}
            
            {/* Why this answer? */}
            {(msg.isSyllabusRelated || msg.reliabilityScore !== undefined) && (
              <div style={{
                padding: '16px 20px', borderRadius: '16px', backgroundColor: 'var(--bg-app)',
                border: '1.5px solid var(--border-light)', boxShadow: '0 4px 6px rgba(0,0,0,0.01)'
              }}>
                <h5 style={{ margin: '0 0 10px 0', color: 'var(--text-muted)', fontSize: '0.86rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ❓ Why this answer?
                </h5>
                {msg.isSyllabusRelated ? (
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-main)' }}>
                    <span>Verified against the active <strong>AP School Board Syllabus</strong>:</span>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '3px', color: 'var(--text-muted)' }}>
                      <li><b>Board:</b> AP SSC (CBSE-based) CURRICULUM</li>
                      <li><b>Grade/Class:</b> Class {msg.class || 10}</li>
                      <li><b>Subject:</b> {msg.subject || 'Syllabus Subject'}</li>
                      <li><b>Chapter:</b> {msg.chapter || 'General'}</li>
                      <li><b>Semantic Similarity Score:</b> {msg.similarityScore ? `${msg.similarityScore}%` : '>= 85%'}</li>
                    </ul>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-main)' }}>
                    <span>Verified using real-time search across <strong>trusted academic sources</strong>:</span>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '3px', color: 'var(--text-muted)' }}>
                      <li><b>Verification Method:</b> Cross-referenced multi-source search (contradictions filtered)</li>
                      <li><b>Reliability Score:</b> {msg.reliabilityScore || 70}/100</li>
                      <li><b>Trusted Source Count:</b> {msg.reliabilitySummary?.sourceCount || (msg.sources ? msg.sources.length : 0)}</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Column 2: Companion Blocks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* Revision Notes */}
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

            {/* Examples */}
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

            {/* Revision Material */}
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

            {/* Learning Companion Card */}
            {msg.learningCompanion && (
              <div style={{
                padding: '18px 22px', borderRadius: '18px', backgroundColor: 'var(--bg-card)',
                border: '2px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '14px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <h5 style={{ margin: 0, color: 'var(--color-purple)', fontSize: '1.05rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🎒 Learning Companion
                  </h5>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ fontSize: '0.74rem', padding: '4px 8px', borderRadius: '8px', backgroundColor: 'var(--color-purple-light)', color: 'var(--color-purple)', fontWeight: 'bold' }}>
                      Level: {msg.learningCompanion.learningLevel || 'Intermediate'}
                    </span>
                    {msg.learningCompanion.estimatedLearningTime && (
                      <span style={{ fontSize: '0.74rem', padding: '4px 8px', borderRadius: '8px', backgroundColor: 'var(--border-light)', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                        ⏱️ {msg.learningCompanion.estimatedLearningTime}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.84rem' }}>
                  {msg.learningCompanion.prerequisites && msg.learningCompanion.prerequisites.length > 0 && (
                    <div>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>🔑 Prerequisites:</span>
                      <span style={{ color: 'var(--text-main)' }}>{msg.learningCompanion.prerequisites.join(', ')}</span>
                    </div>
                  )}
                  {msg.learningCompanion.relatedTopics && msg.learningCompanion.relatedTopics.length > 0 && (
                    <div>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>🔗 Related Topics:</span>
                      <span style={{ color: 'var(--text-main)' }}>{msg.learningCompanion.relatedTopics.join(', ')}</span>
                    </div>
                  )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: 0 }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.84rem', textAlign: 'left' }}>
                  {msg.learningCompanion.keyPoints && msg.learningCompanion.keyPoints.length > 0 && (
                    <div>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>📌 Key Points:</span>
                      <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--text-main)' }}>
                        {msg.learningCompanion.keyPoints.map((kp, idx) => <li key={idx}>{kp}</li>)}
                      </ul>
                    </div>
                  )}

                  {msg.learningCompanion.memoryTricks && msg.learningCompanion.memoryTricks.length > 0 && (
                    <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderLeft: '3px solid #d97706' }}>
                      <span style={{ fontWeight: 'bold', color: '#d97706', display: 'block', marginBottom: '2px' }}>🧠 Memory Tricks:</span>
                      <span style={{ color: 'var(--text-main)', fontStyle: 'italic' }}>{msg.learningCompanion.memoryTricks.join('; ')}</span>
                    </div>
                  )}

                  {msg.learningCompanion.realLifeExamples && msg.learningCompanion.realLifeExamples.length > 0 && (
                    <div>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>🌍 Real-Life Examples:</span>
                      <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--text-main)' }}>
                        {msg.learningCompanion.realLifeExamples.map((ex, idx) => <li key={idx}>{ex}</li>)}
                      </ul>
                    </div>
                  )}

                  {msg.learningCompanion.commonMistakes && msg.learningCompanion.commonMistakes.length > 0 && (
                    <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(220, 38, 38, 0.05)', borderLeft: '3px solid #dc2626' }}>
                      <span style={{ fontWeight: 'bold', color: '#dc2626', display: 'block', marginBottom: '4px' }}>⚠️ Common Mistakes:</span>
                      <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--text-main)' }}>
                        {msg.learningCompanion.commonMistakes.map((cm, idx) => <li key={idx}>{cm}</li>)}
                      </ul>
                    </div>
                  )}

                  {msg.learningCompanion.examTips && msg.learningCompanion.examTips.length > 0 && (
                    <div>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>🎯 Exam Tips:</span>
                      <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--text-main)' }}>
                        {msg.learningCompanion.examTips.map((tip, idx) => <li key={idx}>{tip}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Practice Questions */}
            {msg.practiceQuestions && msg.practiceQuestions.length > 0 && (
              <div style={{
                padding: '16px 20px', borderRadius: '16px', backgroundColor: 'var(--color-purple-light)',
                border: '2px solid var(--color-purple)', display: 'flex', flexDirection: 'column', gap: '15px'
              }}>
                <h5 style={{ margin: 0, color: 'var(--color-purple-dark)', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📝 Practice Questions
                </h5>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {msg.practiceQuestions.map((q, qIdx) => {
                    const isMCQ = q.type === 'mcq' || (q.options && q.options.length > 0);
                    
                    return (
                      <div key={qIdx} style={{ backgroundColor: 'var(--bg-card)', padding: '14px 18px', borderRadius: '12px', border: '1.5px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-purple-dark)', backgroundColor: 'var(--color-purple-light)', padding: '2px 6px', borderRadius: '6px' }}>
                            {q.type === 'mcq' ? 'MCQ' : q.type === 'short' ? 'Short Answer' : 'Long Answer'}
                          </span>
                        </div>

                        <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                          Q{qIdx + 1}: {q.question}
                        </p>

                        {isMCQ ? (
                          <MCQQuizBlock q={q} qIdx={qIdx} selectedAnswers={selectedAnswers} setSelectedAnswers={setSelectedAnswers} />
                        ) : (
                          <CollapsibleTextQuestionBlock q={q} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mini Quiz */}
            {msg.miniQuiz && msg.miniQuiz.length > 0 && (
              <InlineQuizBlock 
                questions={msg.miniQuiz} 
                subject={msg.subject} 
                onQuizSubmit={onQuizSubmit} 
              />
            )}

            {/* Hide button at the bottom of show state */}
            <button
              onClick={() => setShowComprehension(false)}
              style={{
                padding: '8px 14px', borderRadius: '10px', border: '1.5px solid var(--border-light)',
                backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)',
                fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', width: 'fit-content',
                display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'start', marginTop: '5px'
              }}
            >
              ✕ Hide Learning Companion & Quiz
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Explanation */}
          {msg.explanation && (
            <div style={{
              padding: '16px 20px', borderRadius: '16px', backgroundColor: 'var(--bg-card)',
              border: '2px solid var(--border-light)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
              position: 'relative'
            }}>
              <button
                onClick={onMaximize}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--color-purple)',
                  border: '1.5px solid var(--border-light)',
                  borderRadius: '8px',
                  width: '38px',
                  height: '28px',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease',
                  zIndex: 10
                }}
                title="Maximize Focus Mode"
              >
                Max
              </button>
              <VerificationBadge msg={msg} onRequestTeacherHelp={onRequestTeacherHelp} />
              {renderMarkdown(msg.explanation)}
            </div>
          )}

          {/* 6. Why this answer? (Verification explanation) */}
          {(msg.isSyllabusRelated || msg.reliabilityScore !== undefined) && (
            <div style={{
              padding: '16px 20px', borderRadius: '16px', backgroundColor: 'var(--bg-app)',
              border: '1.5px solid var(--border-light)', boxShadow: '0 4px 6px rgba(0,0,0,0.01)'
            }}>
              <h5 style={{ margin: '0 0 10px 0', color: 'var(--text-muted)', fontSize: '0.86rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ❓ Why this answer?
              </h5>
              {msg.isSyllabusRelated ? (
                <div style={{ fontSize: '0.84rem', color: 'var(--text-main)' }}>
                  <span>Verified against the active <strong>AP School Board Syllabus</strong>:</span>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '3px', color: 'var(--text-muted)' }}>
                    <li><b>Board:</b> AP SSC (CBSE-based) CURRICULUM</li>
                    <li><b>Grade/Class:</b> Class {msg.class || 10}</li>
                    <li><b>Subject:</b> {msg.subject || 'Syllabus Subject'}</li>
                    <li><b>Chapter:</b> {msg.chapter || 'General'}</li>
                    <li><b>Semantic Similarity Score:</b> {msg.similarityScore ? `${msg.similarityScore}%` : '>= 85%'}</li>
                  </ul>
                </div>
              ) : (
                <div style={{ fontSize: '0.84rem', color: 'var(--text-main)' }}>
                  <span>Verified using real-time search across <strong>trusted academic sources</strong>:</span>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '3px', color: 'var(--text-muted)' }}>
                    <li><b>Verification Method:</b> Cross-referenced multi-source search (contradictions filtered)</li>
                    <li><b>Reliability Score:</b> {msg.reliabilityScore || 70}/100</li>
                    <li><b>Trusted Source Count:</b> {msg.reliabilitySummary?.sourceCount || (msg.sources ? msg.sources.length : 0)}</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Learning Comprehension Option Card */}
          {hasComprehension && showComprehension === null && (
            <div style={{
              padding: '18px 20px', borderRadius: '16px', backgroundColor: 'var(--bg-card)',
              border: '1.5px solid var(--border-light)', boxShadow: '0 4px 8px rgba(0,0,0,0.02)',
              display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '5px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }}>🎒</span>
                <div>
                  <span style={{ fontWeight: '800', fontSize: '0.92rem', color: 'var(--text-main)', display: 'block' }}>
                    Practice & Learning Companion Ready!
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                    Would you like to view study notes, examples, practice questions, and quizzes for this topic?
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  onClick={() => setShowComprehension(true)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    backgroundColor: 'var(--color-purple)', color: '#ffffff',
                    fontSize: '0.82rem', fontWeight: 'bold', cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(124, 58, 237, 0.2)', transition: 'all 0.2s'
                  }}
                >
                  📝 Yes, Show Practice
                </button>
                <button
                  onClick={() => setShowComprehension(false)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1.5px solid var(--border-light)',
                    backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)',
                    fontSize: '0.82rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* Show Toggle when skipped */}
          {hasComprehension && showComprehension === false && (
            <button
              onClick={() => setShowComprehension(true)}
              style={{
                padding: '8px 14px', borderRadius: '10px', border: '1.5px solid var(--color-purple)',
                backgroundColor: 'var(--bg-card)', color: 'var(--color-purple-dark)',
                fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', width: 'fit-content',
                display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'start', marginTop: '5px'
              }}
            >
              🎒 Show Learning Companion & Quizzes
            </button>
          )}

          {/* Learning Comprehension Content Blocks - rendered only when showComprehension === true */}
          {hasComprehension && showComprehension === true && (
            <>
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

              {/* 7. Learning Companion Card */}
              {msg.learningCompanion && (
                <div style={{
                  padding: '18px 22px', borderRadius: '18px', backgroundColor: 'var(--bg-card)',
                  border: '2px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '14px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <h5 style={{ margin: 0, color: 'var(--color-purple)', fontSize: '1.05rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🎒 Learning Companion
                    </h5>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ fontSize: '0.74rem', padding: '4px 8px', borderRadius: '8px', backgroundColor: 'var(--color-purple-light)', color: 'var(--color-purple)', fontWeight: 'bold' }}>
                        Level: {msg.learningCompanion.learningLevel || 'Intermediate'}
                      </span>
                      {msg.learningCompanion.estimatedLearningTime && (
                        <span style={{ fontSize: '0.74rem', padding: '4px 8px', borderRadius: '8px', backgroundColor: 'var(--border-light)', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                          ⏱️ {msg.learningCompanion.estimatedLearningTime}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.84rem' }}>
                    {msg.learningCompanion.prerequisites && msg.learningCompanion.prerequisites.length > 0 && (
                      <div>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>🔑 Prerequisites:</span>
                        <span style={{ color: 'var(--text-main)' }}>{msg.learningCompanion.prerequisites.join(', ')}</span>
                      </div>
                    )}
                    {msg.learningCompanion.relatedTopics && msg.learningCompanion.relatedTopics.length > 0 && (
                      <div>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>🔗 Related Topics:</span>
                        <span style={{ color: 'var(--text-main)' }}>{msg.learningCompanion.relatedTopics.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: 0 }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.84rem', textAlign: 'left' }}>
                    {msg.learningCompanion.keyPoints && msg.learningCompanion.keyPoints.length > 0 && (
                      <div>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>📌 Key Points:</span>
                        <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--text-main)' }}>
                          {msg.learningCompanion.keyPoints.map((kp, idx) => <li key={idx}>{kp}</li>)}
                        </ul>
                      </div>
                    )}

                    {msg.learningCompanion.memoryTricks && msg.learningCompanion.memoryTricks.length > 0 && (
                      <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderLeft: '3px solid #d97706' }}>
                        <span style={{ fontWeight: 'bold', color: '#d97706', display: 'block', marginBottom: '2px' }}>🧠 Memory Tricks:</span>
                        <span style={{ color: 'var(--text-main)', fontStyle: 'italic' }}>{msg.learningCompanion.memoryTricks.join('; ')}</span>
                      </div>
                    )}

                    {msg.learningCompanion.realLifeExamples && msg.learningCompanion.realLifeExamples.length > 0 && (
                      <div>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>🌍 Real-Life Examples:</span>
                        <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--text-main)' }}>
                          {msg.learningCompanion.realLifeExamples.map((ex, idx) => <li key={idx}>{ex}</li>)}
                        </ul>
                      </div>
                    )}

                    {msg.learningCompanion.commonMistakes && msg.learningCompanion.commonMistakes.length > 0 && (
                      <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(220, 38, 38, 0.05)', borderLeft: '3px solid #dc2626' }}>
                        <span style={{ fontWeight: 'bold', color: '#dc2626', display: 'block', marginBottom: '4px' }}>⚠️ Common Mistakes:</span>
                        <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--text-main)' }}>
                          {msg.learningCompanion.commonMistakes.map((cm, idx) => <li key={idx}>{cm}</li>)}
                        </ul>
                      </div>
                    )}

                    {msg.learningCompanion.examTips && msg.learningCompanion.examTips.length > 0 && (
                      <div>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>🎯 Exam Tips:</span>
                        <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--text-main)' }}>
                          {msg.learningCompanion.examTips.map((tip, idx) => <li key={idx}>{tip}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 8. Practice Questions */}
              {msg.practiceQuestions && msg.practiceQuestions.length > 0 && (
                <div style={{
                  padding: '16px 20px', borderRadius: '16px', backgroundColor: 'var(--color-purple-light)',
                  border: '2px solid var(--color-purple)', display: 'flex', flexDirection: 'column', gap: '15px'
                }}>
                  <h5 style={{ margin: 0, color: 'var(--color-purple-dark)', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📝 Practice Questions
                  </h5>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {msg.practiceQuestions.map((q, qIdx) => {
                      const isMCQ = q.type === 'mcq' || (q.options && q.options.length > 0);
                      
                      return (
                        <div key={qIdx} style={{ backgroundColor: 'var(--bg-card)', padding: '14px 18px', borderRadius: '12px', border: '1.5px solid var(--border-light)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-purple-dark)', backgroundColor: 'var(--color-purple-light)', padding: '2px 6px', borderRadius: '6px' }}>
                              {q.type === 'mcq' ? 'MCQ' : q.type === 'short' ? 'Short Answer' : 'Long Answer'}
                            </span>
                          </div>

                          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            Q{qIdx + 1}: {q.question}
                          </p>

                          {isMCQ ? (
                            <MCQQuizBlock q={q} qIdx={qIdx} selectedAnswers={selectedAnswers} setSelectedAnswers={setSelectedAnswers} />
                          ) : (
                            <CollapsibleTextQuestionBlock q={q} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 9. Mini Quiz */}
              {msg.miniQuiz && msg.miniQuiz.length > 0 && (
                <InlineQuizBlock 
                  questions={msg.miniQuiz} 
                  subject={msg.subject} 
                  onQuizSubmit={onQuizSubmit} 
                />
              )}

              {/* Hide button at the bottom of show state */}
              <button
                onClick={() => setShowComprehension(false)}
                style={{
                  padding: '8px 14px', borderRadius: '10px', border: '1.5px solid var(--border-light)',
                  backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)',
                  fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', width: 'fit-content',
                  display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'start', marginTop: '5px'
                }}
              >
                ✕ Hide Learning Companion & Quiz
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
};

export const AITeacher = () => {
  const { user } = useAuth();
  const { triggerNotification } = useApp();
  const [supportModalMsg, setSupportModalMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'tickets'
  const [studentTickets, setStudentTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicketIds, setSelectedTicketIds] = useState([]);

  // Real-Time Smart Routing status states
  const [studentSocket, setStudentSocket] = useState(null);
  const [searchStatus, setSearchStatus] = useState(null); // { message: string, status: 'searching' | 'assigned' | 'offline' | 'error', teacherName?: string, institution?: string }

  // Socket Connection for Students
  useEffect(() => {
    const token = localStorage.getItem('studybuddy_token') || 'demo_student_token_bypass';
    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : (typeof window !== 'undefined' && (window.location.hostname !== 'localhost' || window.location.port === '5000')
          ? `${window.location.protocol}//${window.location.host}`
          : 'http://localhost:5000');
    
    const s = io(socketUrl, {
      query: { token }
    });

    s.on('connect', () => {
      console.log('Student socket connected to real-time notification gateway.');
    });

    s.on('doubt:searching', ({ message }) => {
      setSearchStatus({ status: 'searching', message });
    });

    s.on('doubt:assigned', ({ teacherName, qualification, institution, ticket }) => {
      setSearchStatus({
        status: 'assigned',
        message: `🎉 Verified Teacher ${teacherName} (${qualification}) from ${institution} has accepted your help request!`,
        teacherName,
        institution
      });
      triggerNotification(`🤝 Teacher ${teacherName} is now reviewing your query!`, 'success');
      
      // Update message list status to assigned!
      if (ticket) {
        setMessages(prev => prev.map(m => {
          if (m.ticketId === ticket._id) {
            return {
              ...m,
              ticketStatus: 'assigned',
              assignedTeacherName: teacherName
            };
          }
          return m;
        }));
      }
      fetchStudentTickets();
    });

    s.on('doubt:offline', ({ message }) => {
      setSearchStatus({ status: 'offline', message });
    });

    s.on('doubt:error', ({ message }) => {
      setSearchStatus({ status: 'error', message });
    });

    setStudentSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const fetchStudentTickets = async () => {
    setTicketsLoading(true);
    try {
      const tickets = await api.getStudentTickets();
      setStudentTickets(tickets || []);
      
      // Update the selected ticket with the latest data if it's currently open
      setSelectedTicket(prev => {
        if (prev) {
          const updated = tickets.find(t => t._id === prev._id);
          return updated || prev;
        }
        return prev;
      });
    } catch (err) {
      console.error("Failed to fetch student tickets:", err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm("Are you sure you want to delete this support ticket? This action cannot be undone.")) {
      return;
    }
    try {
      await api.deleteSupportTicket(ticketId);
      triggerNotification("Support ticket deleted successfully.", "success");
      setSelectedTicket(null);
      setSelectedTicketIds(prev => prev.filter(id => id !== ticketId));
      fetchStudentTickets();

      // Sync chat messages to strip deleted ticket reference
      setMessages(prev => prev.map(m => {
        if (m.ticketId === ticketId) {
          const { ticketId: _, ticketStatus: __, ticketType: ___, ...rest } = m;
          return rest;
        }
        return m;
      }));
    } catch (err) {
      console.error("Failed to delete support ticket:", err);
      triggerNotification("Failed to delete ticket: " + err.message, "red");
    }
  };

  const handleDeleteSelectedTickets = async () => {
    if (selectedTicketIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedTicketIds.length} selected support tickets? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteBulkSupportTickets(selectedTicketIds);
      triggerNotification(`${selectedTicketIds.length} support tickets deleted successfully.`, "success");
      
      const deletedIdsSet = new Set(selectedTicketIds);
      setMessages(prev => prev.map(m => {
        if (m.ticketId && deletedIdsSet.has(m.ticketId)) {
          const { ticketId: _, ticketStatus: __, ticketType: ___, ...rest } = m;
          return rest;
        }
        return m;
      }));

      setSelectedTicketIds([]);
      fetchStudentTickets();
    } catch (err) {
      console.error("Failed to bulk delete tickets:", err);
      triggerNotification("Failed to bulk delete tickets: " + err.message, "red");
    }
  };

  const handleDeleteAllTickets = async () => {
    if (studentTickets.length === 0) return;
    if (!window.confirm("Are you sure you want to delete ALL your support tickets? This action cannot be undone.")) {
      return;
    }
    try {
      await api.deleteBulkSupportTickets('all');
      triggerNotification("All support tickets deleted successfully.", "success");
      
      setMessages(prev => prev.map(m => {
        if (m.ticketId) {
          const { ticketId: _, ticketStatus: __, ticketType: ___, ...rest } = m;
          return rest;
        }
        return m;
      }));

      setSelectedTicketIds([]);
      fetchStudentTickets();
    } catch (err) {
      console.error("Failed to delete all tickets:", err);
      triggerNotification("Failed to delete all tickets: " + err.message, "red");
    }
  };

  const handleRequestTeacherHelp = (msg) => {
    setSupportModalMsg(msg);
  };

  const submitSupportRequest = async (supportType) => {
    const msg = supportModalMsg;
    if (!msg) return;
    setSupportModalMsg(null);

    try {
      const msgIndex = messages.findIndex(m => m.id === msg.id);
      const studentMsg = msgIndex > 0 ? messages[msgIndex - 1] : null;
      const questionText = studentMsg ? studentMsg.text : "General Question";

      // Format full AI answer including explanation, notes, examples, and questions
      let fullAIAnswer = msg.explanation || msg.text || "";
      
      if (msg.revisionNotes && msg.revisionNotes.length > 0) {
        fullAIAnswer += "\n\n### 📝 Study Notes & Key Takeaways\n" + msg.revisionNotes.map(n => `• ${n}`).join('\n');
      }
      if (msg.examples && msg.examples.length > 0) {
        fullAIAnswer += "\n\n### 💡 Real-Life Examples\n" + msg.examples.map(ex => `• ${ex}`).join('\n');
      }
      if (msg.practiceQuestions && msg.practiceQuestions.length > 0) {
        fullAIAnswer += "\n\n### ❓ Practice Questions\n" + msg.practiceQuestions.map((q, idx) => {
          let qText = `**Q${idx + 1}: ${q.question}**`;
          if (q.options && q.options.length > 0) {
            qText += '\n' + q.options.map((opt, oIdx) => `   ${oIdx === q.correctAnswerIndex ? '✓' : '•'} ${opt}`).join('\n');
          }
          if (q.explanation) {
            qText += `\n   *Explanation: ${q.explanation}*`;
          }
          return qText;
        }).join('\n\n');
      }

      const response = await api.createSupportTicket({
        classNum: user?.studentProfile?.class || 10,
        subject: selectedSubject || 'Science',
        question: questionText,
        aiAnswer: fullAIAnswer,
        supportType
      });
      
      if (response) {
        setSearchStatus({
          status: 'searching',
          message: 'Matching with verified subject teachers...'
        });
        setMessages(prev => prev.map(m => {
          if (m.id === msg.id) {
            return {
              ...m,
              ticketId: response._id,
              ticketStatus: 'pending',
              ticketType: supportType
            };
          }
          return m;
        }));
        triggerNotification(`🎉 Support ticket created! A teacher will respond via ${supportType} support soon.`, "success");
      }
    } catch (err) {
      console.error("Failed to request teacher support:", err);
      triggerNotification("Failed to send support ticket: " + err.message, "red");
    }
  };
  // Syllabus selection states
  const [syllabusList, setSyllabusList] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');

  // Persisted chat history
  const [messages, setMessages] = useState(() => {
    try {
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
    } catch (err) {
      console.error("Failed to parse chat history:", err);
      return [
        {
          id: 'buddy-initial',
          sender: 'buddy',
          text: "Hoot hoot! 🦉 Hello! I am StudyGuru AI, your personal Andhra Pradesh syllabus tutor! Pick a Subject, Chapter, and Topic above, then ask me anything you find difficult, and we'll learn it together!",
          expression: 'happy',
          defaultLang: 'English',
          currentLang: 'English'
        }
      ];
    }
  });

  const [inputText, setInputText] = useState('');
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [maximizedMessage, setMaximizedMessage] = useState(null); // lifts maximized focus message state to app root level
  const [maximizedViewMode, setMaximizedViewMode] = useState('vertical'); // focus modal layout viewMode
  const [maximizedSelectedAnswers, setMaximizedSelectedAnswers] = useState({}); // Focus modal interactive quiz answers
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
      const subSyllabus = syllabusList.find(s => s?.subject && s.subject.toLowerCase() === selectedSubject.toLowerCase());
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
      const subSyllabus = syllabusList.find(s => s?.subject && selectedSubject && s.subject.toLowerCase() === selectedSubject.toLowerCase());
      const chObj = subSyllabus?.chapters?.find(c => c?.name === selectedChapter);
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

  // ── Real-time answer verification & doubt polling ──────────────────────────
  useEffect(() => {
    let active = true;
    const pollStatus = async () => {
      const token = localStorage.getItem('studybuddy_token');
      if (!token) return;

      // 1. Poll pending AI Answers
      const pendingMsgs = messages.filter(
        m => m.sender === 'buddy' && m.answerId && m.verificationStatus === 'pending'
      );
      
      let changedAnswers = [];
      let notFoundAnswers = [];
      if (pendingMsgs.length > 0) {
        const updates = await Promise.allSettled(
          pendingMsgs.map(async (msg) => {
            try {
              const data = await api.getAnswerStatus(msg.answerId);
              return { msgId: msg.id, data };
            } catch (err) {
              if (err.status === 404) {
                return { msgId: msg.id, notFound: true };
              }
              return null;
            }
          })
        );
        const resolvedUpdates = updates
          .filter(r => r.status === 'fulfilled' && r.value)
          .map(r => r.value);
        changedAnswers = resolvedUpdates.filter(u => !u.notFound && u.data.verificationStatus !== 'pending');
        notFoundAnswers = resolvedUpdates.filter(u => u.notFound);
      }

      // 2. Poll pending Doubts
      const pendingDoubts = messages.filter(
        m => m.sender === 'buddy' && m.doubtId && m.doubtStatus === 'pending'
      );

      let resolvedDoubts = [];
      let notFoundDoubts = [];
      if (pendingDoubts.length > 0) {
        const doubtUpdates = await Promise.allSettled(
          pendingDoubts.map(async (msg) => {
            try {
              const data = await api.getDoubtStatus(msg.doubtId);
              return { msgId: msg.id, data };
            } catch (err) {
              if (err.status === 404) {
                return { msgId: msg.id, notFound: true };
              }
              return null;
            }
          })
        );
        const resolvedUpdates = doubtUpdates
          .filter(r => r.status === 'fulfilled' && r.value)
          .map(r => r.value);
        resolvedDoubts = resolvedUpdates.filter(u => !u.notFound && u.data.status === 'resolved');
        notFoundDoubts = resolvedUpdates.filter(u => u.notFound);
      }

      // 3. Poll pending Support Tickets
      const pendingTickets = messages.filter(
        m => m.sender === 'buddy' && m.ticketId && m.ticketStatus !== 'completed'
      );

      let updatedTickets = [];
      let notFoundTickets = [];
      if (pendingTickets.length > 0) {
        const ticketUpdates = await Promise.allSettled(
          pendingTickets.map(async (msg) => {
            try {
              const data = await api.getTicketStatus(msg.ticketId);
              return { msgId: msg.id, data };
            } catch (err) {
              if (err.status === 404) {
                return { msgId: msg.id, notFound: true };
              }
              return null;
            }
          })
        );
        const resolvedUpdates = ticketUpdates
          .filter(r => r.status === 'fulfilled' && r.value)
          .map(r => r.value);
        updatedTickets = resolvedUpdates.filter(u => !u.notFound && u.data.status !== 'pending');
        notFoundTickets = resolvedUpdates.filter(u => u.notFound);
      }

      if (!active) return;
      if (
        changedAnswers.length === 0 && 
        notFoundAnswers.length === 0 && 
        resolvedDoubts.length === 0 && 
        notFoundDoubts.length === 0 && 
        updatedTickets.length === 0 && 
        notFoundTickets.length === 0
      ) return;

      // Fire notifications
      changedAnswers.forEach(({ data }) => {
        if (data.isVerified) {
          triggerNotification('✅ A teacher just verified one of your answers! Check the chat below.', 'success');
        } else if (data.verificationStatus === 'rejected') {
          triggerNotification('⚠️ A teacher reviewed one of your answers. Check the chat for details.', 'red');
        }
      });

      resolvedDoubts.forEach(({ data }) => {
        triggerNotification(`👨‍🏫 A teacher has responded to your doubt: "${data.question.substring(0, 30)}..."`, 'success');
      });

      updatedTickets.forEach(({ msgId, data }) => {
        const localMsg = messages.find(m => m.id === msgId);
        const prevStatus = localMsg ? localMsg.ticketStatus : 'pending';

        if (data.status === 'assigned' && prevStatus === 'pending') {
          triggerNotification(`👨‍🏫 A teacher has accepted your support ticket!`, 'success');
          setSearchStatus({
            status: 'assigned',
            message: `🎉 Verified Teacher ${data.assignedTeacherName || 'Subject Teacher'} has accepted your help request!`,
            teacherName: data.assignedTeacherName,
            institution: data.assignedTeacherInstitution || 'StudyBuddy Partner'
          });
        } else if (data.status === 'completed' && prevStatus !== 'completed') {
          triggerNotification(`🎉 A teacher has resolved your support ticket! Check the chat or your tickets list.`, 'success');
          setSearchStatus(null);
          fetchStudentTickets(); // Refresh the tickets list
        }
        
        // Update selectedTicket if it matches the updated ticket
        setSelectedTicket(prev => {
          if (prev && prev._id === data._id) {
            return data;
          }
          return prev;
        });
      });

      // Update local messages state
      setMessages(prev =>
        prev.map(m => {
          const ansUpdate = changedAnswers.find(u => u.msgId === m.id);
          const ansNotFound = notFoundAnswers.find(u => u.msgId === m.id);
          const dbtUpdate = resolvedDoubts.find(u => u.msgId === m.id);
          const dbtNotFound = notFoundDoubts.find(u => u.msgId === m.id);
          const tktUpdate = updatedTickets.find(u => u.msgId === m.id);
          const tktNotFound = notFoundTickets.find(u => u.msgId === m.id);

          if (ansNotFound) {
            return {
              ...m,
              verificationStatus: 'not_found'
            };
          }

          if (dbtNotFound) {
            return {
              ...m,
              doubtStatus: 'not_found'
            };
          }

          if (tktNotFound) {
            return {
              ...m,
              ticketStatus: 'not_found'
            };
          }

          if (ansUpdate) {
            const d = ansUpdate.data;
            return {
              ...m,
              verificationStatus: d.verificationStatus,
              teacherAnswer: d.teacherAnswer,
              teacherComments: d.teacherComments,
              verifiedBy: d.verifiedBy
            };
          }

          if (dbtUpdate) {
            return {
              ...m,
              doubtStatus: dbtUpdate.data.status,
              teacherAnswer: dbtUpdate.data.teacherAnswer,
              resolvedBy: dbtUpdate.data.resolvedBy,
              resolvedAt: dbtUpdate.data.resolvedAt
            };
          }

          if (tktUpdate) {
            const d = tktUpdate.data;
            return {
              ...m,
              ticketStatus: d.status,
              assignedTeacherName: d.assignedTeacherName,
              teacherAnswer: d.teacherAnswer,
              whiteboardImage: d.whiteboardImage
            };
          }

          return m;
        })
      );
    };

    const pollInterval = setInterval(pollStatus, 8000);
    pollStatus(); // run immediately

    return () => {
      active = false;
      clearInterval(pollInterval);
    };
  }, [messages, triggerNotification]);
  // ──────────────────────────────────────────────────────────────────────────

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

    const currentLang = msg.currentLang || 'English';
    if (currentLang === targetLanguageName) return;

    // Helper to extract translatable fields
    const extractTranslatableFields = (m) => {
      const fields = {};
      const keys = ['text', 'explanation', 'revisionNotes', 'examples', 'practiceQuestions', 'revisionMaterial', 'planData', 'quizData', 'examData'];
      keys.forEach(k => {
        if (m[k] !== undefined) {
          fields[k] = m[k];
        }
      });
      return fields;
    };

    // Check cache
    if (msg.translations && msg.translations[targetLanguageName]) {
      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          const cachedTranslation = m.translations[targetLanguageName];
          // Clear out the fields we are about to overwrite to avoid mixing old and new fields
          const clearedFields = {};
          const keys = ['text', 'explanation', 'revisionNotes', 'examples', 'practiceQuestions', 'revisionMaterial', 'planData', 'quizData', 'examData'];
          keys.forEach(k => {
            clearedFields[k] = undefined;
          });
          return {
            ...m,
            ...clearedFields,
            ...cachedTranslation,
            currentLang: targetLanguageName
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
      const translatableFields = extractTranslatableFields(msg);
      
      // Helper to recursively get all strings and their paths
      const KEYS_TO_SKIP_TRANSLATION = [
        'type', 'id', '_id', 'quizId', 'expression', 'sender', 
        'defaultLang', 'currentLang', 'ticketId', 'ticketStatus', 'ticketType',
        'correctAnswerIndex', 'score', 'status', 'assignedTeacher', 'createdAt'
      ];

      const getStringsAndPaths = (obj, path = [], results = []) => {
        if (obj === null || obj === undefined) return results;
        
        if (typeof obj === 'string') {
          if (obj.trim().length > 0) {
            results.push({ path, text: obj });
          }
        } else if (Array.isArray(obj)) {
          obj.forEach((item, idx) => {
            getStringsAndPaths(item, [...path, idx], results);
          });
        } else if (typeof obj === 'object') {
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              if (KEYS_TO_SKIP_TRANSLATION.includes(key)) continue;
              getStringsAndPaths(obj[key], [...path, key], results);
            }
          }
        }
        return results;
      };

      const stringItems = getStringsAndPaths(translatableFields);

      if (stringItems.length === 0) {
        // Nothing to translate
        setMessages(prev => prev.map(m => {
          if (m.id === msgId) return { ...m, translating: false, currentLang: targetLanguageName };
          return m;
        }));
        return;
      }

      // Translate all strings in a single batch request
      let results = [];
      let isSuccess = false;
      try {
        const textsToTranslate = stringItems.map(item => item.text);
        const res = await api.translateText(textsToTranslate, targetLanguageName);
        const translatedTexts = res.translatedTexts || [];
        
        results = stringItems.map((item, idx) => ({
          path: item.path,
          translatedText: translatedTexts[idx] || item.text
        }));
        
        // Verify if we actually got a translated result (different from original)
        const anyTranslated = translatedTexts.some((txt, idx) => txt && txt !== textsToTranslate[idx]);
        isSuccess = anyTranslated || (translatedTexts.length > 0 && translatedTexts.join('') !== textsToTranslate.join(''));
      } catch (err) {
        console.error("Failed to translate batch:", err);
        results = stringItems.map(item => ({
          path: item.path,
          translatedText: item.text
        }));
      }

      if (!isSuccess) {
        triggerNotification("⚠️ Translation server is busy. Retrying soon...", "yellow");
      }

      // Reconstruct translated fields
      const translatedFields = JSON.parse(JSON.stringify(translatableFields));
      
      const setValueAtPath = (obj, path, value) => {
        let current = obj;
        for (let i = 0; i < path.length - 1; i++) {
          current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
      };

      results.forEach(res => {
        setValueAtPath(translatedFields, res.path, res.translatedText);
      });

      // Get the original fields in English (or the message's default language) to store in cache
      const originalFields = msg.translations?.[msg.defaultLang || 'English'] || translatableFields;

      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          const currentTranslations = {
            ...(m.translations || {}),
            ...(isSuccess ? { [targetLanguageName]: translatedFields } : {}),
            [m.defaultLang || 'English']: originalFields
          };
          
          // Clear out existing translatable fields to ensure clean overwrite
          const clearedFields = {};
          const keys = ['text', 'explanation', 'revisionNotes', 'examples', 'practiceQuestions', 'revisionMaterial', 'planData', 'quizData', 'examData'];
          keys.forEach(k => {
            clearedFields[k] = undefined;
          });

          return {
            ...m,
            ...clearedFields,
            ...translatedFields,
            translations: currentTranslations,
            currentLang: targetLanguageName,
            translating: false
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

  const handleSendMessage = async (textToSend, overrideChoice = null) => {
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
      const studentClass = user?.studentProfile?.class || 10;
      const historyToSend = messages.slice(-6);
      const res = await api.chatWithAI(text, selectedSubject, selectedChapter, selectedTopic, studentClass, historyToSend, overrideChoice);
      
      setIsTyping(false);

      if (res.subjectMismatch) {
        const mismatchMsg = {
          id: `buddy-${Date.now()}-${Math.random()}`,
          sender: 'buddy',
          type: 'subject_mismatch',
          text: res.text,
          selectedSubject: res.selectedSubject,
          suggestedSubject: res.suggestedSubject,
          confidence: res.confidence,
          allConfidences: res.allConfidences,
          originalQuery: text
        };
        setMessages((prev) => [...prev, mismatchMsg]);
        setMascotExpression('confused');
        return;
      }

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
        
        // Dynamic additions
        learningCompanion: res.learningCompanion || null,
        miniQuiz: res.miniQuiz || null,
        reliabilityScore: res.reliabilityScore,
        reliabilitySummary: res.reliabilitySummary,
        similarityScore: res.similarityScore,

        expression: res.expression || 'happy',
        
        // Language fields
        defaultLang: defaultLangName,
        currentLang: defaultLangName,

        // Verification metadata
        verificationStatus: res.verificationStatus || 'pending',
        confidenceScore: res.confidenceScore || 0,
        isVerified: res.isVerified || false,
        isSyllabusRelated: res.isSyllabusRelated !== false,
        verifiedBy: res.verifiedBy || null,
        verifiedAt: res.verifiedAt || null,
        teacherComments: res.teacherComments || '',
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
    s => s?.subject && selectedSubject && s.subject.toLowerCase() === selectedSubject.toLowerCase()
  );
  const activeChapters = currentSubSyllabus?.chapters || [];

  const currentChapterObj = activeChapters.find(
    c => c?.name && selectedChapter && c.name === selectedChapter
  );
  const activeTopics = currentChapterObj?.topics || [];

  const suggestedPrompts = [
    { text: `Explain "${selectedTopic || 'photosynthesis'}" 🌿`, color: 'var(--color-green)' },
    { text: `Give me revision notes on this topic 📐`, color: 'var(--color-blue)' },
    { text: `Create a practice quiz for ${selectedChapter || 'this'} ✍️`, color: 'var(--color-purple)' },
    { text: "Tell me a funny riddle! 🦉", color: 'var(--color-yellow-dark)' }
  ];

  return (
    <div className="ai-teacher-grid" style={sidebarHidden ? { gridTemplateColumns: '1fr' } : {}}>
      
      {/* Left Column: Mascot guide & prompt tips */}
      {!sidebarHidden && (
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
      )}

      <section className="card-buddy" style={{
        height: '100%', display: 'flex', flexDirection: 'column', padding: '0px', overflow: 'hidden'
      }}>
        {/* Chat Header with Tabs */}
        <div style={{
          padding: '16px 24px', borderBottom: '2px solid var(--border-light)', backgroundColor: 'var(--bg-card)',
          display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between', flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-green)' }} />
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-main)' }}>
              {activeTab === 'chat' ? 'Chat with StudyGuru AI' : 'My Support Tickets'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Tab Toggle buttons */}
            <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-app)', padding: '3px', borderRadius: '8px', border: '1.5px solid var(--border-light)', marginRight: '10px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                style={{
                  padding: '4px 12px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  backgroundColor: activeTab === 'chat' ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === 'chat' ? 'var(--color-purple-dark)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'chat' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                💬 Chat
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('tickets'); fetchStudentTickets(); }}
                style={{
                  padding: '4px 12px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  backgroundColor: activeTab === 'tickets' ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === 'tickets' ? 'var(--color-purple-dark)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'tickets' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                🎫 Tickets
                {studentTickets.filter(t => t.status !== 'completed').length > 0 && (
                  <span style={{ backgroundColor: 'var(--color-red)', color: '#ffffff', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '8px', fontWeight: 'bold' }}>
                    {studentTickets.filter(t => t.status !== 'completed').length}
                  </span>
                )}
              </button>
            </div>

            {activeTab === 'chat' ? (
              <>
                <button
                  onClick={() => setSidebarHidden(prev => !prev)}
                  style={{
                    border: '1.5px solid var(--border-light)',
                    borderRadius: '20px',
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    backgroundColor: sidebarHidden ? 'var(--color-purple-light)' : 'var(--bg-card)',
                    color: sidebarHidden ? 'var(--color-purple-dark)' : 'var(--text-muted)',
                    outline: 'none',
                    marginRight: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease'
                  }}
                  title={sidebarHidden ? "Show Mascot Sidebar" : "Hide Mascot Sidebar"}
                >
                  {sidebarHidden ? "🚪 Show Companion Sidebar" : "⛶ Maximize Chat View"}
                </button>
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
              </>
            ) : (
              <button
                onClick={fetchStudentTickets}
                className="btn-3d btn-3d-light btn-3d-xs"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              >
                🔄 Refresh
              </button>
            )}
          </div>
        </div>

        {activeTab === 'chat' ? (
          <>
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
                    padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)',
                    fontSize: '0.85rem', fontWeight: '700', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)',
                    outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)'
                  }}
                  className="buddy-filter-input-student"
                >
                  {syllabusList.map((item) => (
                    <option key={item.subject} value={item.subject}>{item.subject}</option>
                  ))}
                </select>
              </div>

              {/* Chapter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Chapter:</span>
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                  style={{
                    padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)',
                    fontSize: '0.85rem', fontWeight: '700', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)',
                    outline: 'none', cursor: 'pointer', maxWidth: '200px', fontFamily: 'var(--font-body)'
                  }}
                  className="buddy-filter-input-student"
                >
                  <option value="">-- Select Chapter --</option>
                  {activeChapters.map((ch) => (
                    <option key={ch.name} value={ch.name}>{ch.name}</option>
                  ))}
                </select>
              </div>

              {/* Topic */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Topic:</span>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  style={{
                    padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-light)',
                    fontSize: '0.85rem', fontWeight: '700', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)',
                    outline: 'none', cursor: 'pointer', maxWidth: '200px', fontFamily: 'var(--font-body)'
                  }}
                  className="buddy-filter-input-student"
                >
                  <option value="">-- Select Topic --</option>
                  {activeTopics.map((tName) => (
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
                const isMismatch = isBuddy && m.type === 'subject_mismatch';
                const hasStructuredContent = isBuddy && (m.explanation || m.agent || m.error) && !isMismatch;
                
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '85%', width: (hasStructuredContent || isMismatch) ? '100%' : 'auto' }}>
                      <div style={{
                        padding: (hasStructuredContent || isMismatch) ? '0' : '14px 18px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.98rem',
                        lineHeight: '1.5',
                        fontWeight: '600',
                        boxShadow: (hasStructuredContent || isMismatch) ? 'none' : '0 3px 6px rgba(0,0,0,0.02)',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                        backgroundColor: isBuddy ? ((hasStructuredContent || isMismatch) ? 'transparent' : 'var(--bg-card)') : 'var(--color-green)',
                        color: isBuddy ? 'var(--text-main)' : '#ffffff',
                        border: isBuddy && !(hasStructuredContent || isMismatch) ? '2px solid var(--border-light)' : 'none',
                        borderBottomLeftRadius: isBuddy ? '0px' : 'var(--radius-sm)',
                        borderBottomRightRadius: !isBuddy ? '0px' : 'var(--radius-sm)',
                        width: '100%'
                      }}>
                        {isMismatch ? (
                          <div style={{
                            padding: '20px', borderRadius: '16px', backgroundColor: 'var(--bg-card)',
                            border: '2.5px solid #d97706', boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
                            display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left', width: '100%'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                              <h4 style={{ margin: 0, color: '#d97706', fontSize: '1.05rem', fontWeight: '800' }}>
                                {m.text}
                              </h4>
                            </div>
                            <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                              <p style={{ margin: '0 0 6px 0' }}>
                                Selected Subject: <strong>{m.selectedSubject}</strong>
                              </p>
                              <p style={{ margin: '0 0 6px 0' }}>
                                Suggested Subject: <strong style={{ color: 'var(--color-purple)' }}>{m.suggestedSubject}</strong>
                              </p>
                              <p style={{ margin: 0 }}>
                                AI Subject Confidence: <strong style={{ color: 'var(--color-purple)' }}>{m.confidence}%</strong>
                              </p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                              <button
                                onClick={() => {
                                  setSelectedSubject(m.suggestedSubject);
                                  setMessages(prev => prev.filter(msg => msg.id !== m.id));
                                  handleSendMessage(m.originalQuery);
                                }}
                                style={{
                                  backgroundColor: 'var(--color-purple)', color: '#ffffff', border: 'none',
                                  borderRadius: '10px', padding: '10px 14px', fontSize: '0.85rem', fontWeight: 'bold',
                                  cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'center'
                                }}
                              >
                                🔄 Switch Subject to {m.suggestedSubject}
                              </button>

                              <button
                                onClick={() => {
                                  setMessages(prev => prev.filter(msg => msg.id !== m.id));
                                  handleSendMessage(m.originalQuery, 'general');
                                }}
                                style={{
                                  backgroundColor: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-green-dark)',
                                  border: '1.5px solid var(--color-green)', borderRadius: '10px', padding: '10px 14px',
                                  fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center'
                                }}
                              >
                                🌐 Continue as General Question
                              </button>

                              <button
                                onClick={() => {
                                  setMessages(prev => prev.filter(msg => msg.id !== m.id));
                                  handleSendMessage(m.originalQuery, 'stay');
                                }}
                                style={{
                                  backgroundColor: 'transparent', color: 'var(--text-muted)',
                                  border: '1.5px solid var(--border-light)', borderRadius: '10px', padding: '10px 14px',
                                  fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center'
                                }}
                              >
                                📚 Stay in {m.selectedSubject}
                              </button>
                            </div>
                          </div>
                        ) : hasStructuredContent ? (
                          <StructuredMessage 
                            msg={m} 
                            onQuizSubmit={handleQuizSubmit} 
                            onRequestTeacherHelp={handleRequestTeacherHelp} 
                            onMaximize={() => {
                              setMaximizedMessage(m);
                              setMaximizedViewMode('vertical');
                            }}
                          />
                        ) : (
                          renderMarkdown(m.text)
                        )}
                        
                        {m.ticketStatus === 'completed' && (
                          <div style={{
                            marginTop: '12px',
                            padding: '12px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--color-green-light)',
                            border: '1.5px dashed var(--color-green)',
                            color: 'var(--color-green-dark)',
                            fontSize: '0.88rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', marginBottom: '4px' }}>
                              <span>👨‍🏫 Teacher Explanation Added!</span>
                            </div>
                            <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', lineHeight: '1.4' }}>
                              {m.teacherAnswer}
                            </p>
                            {m.whiteboardImage && (
                              <div style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
                                <img src={m.whiteboardImage} alt="Teacher Whiteboard explanation" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }} />
                              </div>
                            )}
                          </div>
                        )}
                        {m.ticketStatus === 'assigned' && (
                          <div style={{
                            marginTop: '12px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--color-purple-light)',
                            border: '1.5px dashed var(--color-purple)',
                            color: 'var(--color-purple-dark)',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span>🤝 Teacher {m.assignedTeacherName || ''} is writing your explanation...</span>
                          </div>
                        )}
                        {m.ticketStatus === 'pending' && (
                          <div style={{
                            marginTop: '12px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--color-yellow-light)',
                            border: '1.5px dashed var(--color-yellow-dark)',
                            color: 'var(--color-yellow-dark)',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span>⏳ Support Ticket Pending ({m.ticketType || 'whiteboard'} support)</span>
                          </div>
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
                            Telugu
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
                            Hindi
                          </button>

                          {m.ticketStatus === 'completed' && (
                            <span style={{
                              fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-green-dark)',
                              backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px',
                              display: 'flex', alignItems: 'center', gap: '4px'
                            }}>
                              ✅ Solved by Teacher!
                            </span>
                          )}

                          {m.translating && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-purple)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span className="animate-pulse" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-purple)' }} />
                              Translating...
                            </span>
                          )}
                        </div>
                      )}

                      {isBuddy && !m.ticketStatus && !m.error && (!m.agent || m.agent === 'SYLLABUS') && (
                        <button
                          onClick={() => handleRequestTeacherHelp(m)}
                          className="btn-3d btn-3d-purple"
                          style={{
                            alignSelf: 'flex-start',
                            padding: '4px 10px',
                            fontSize: '0.72rem',
                            fontWeight: 'bold',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '2px'
                          }}
                        >
                          🙋 Need Teacher Help
                        </button>
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
          </>
        ) : (
          /* Render the Support Tickets Tracking View */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg-app)', minHeight: 0 }}>
            {selectedTicket ? (
              /* Ticket Detail Pane */
              <div style={{ 
                height: '100%', 
                overflowY: 'auto', 
                padding: '24px', 
                textAlign: 'left' 
              }}>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="btn-3d btn-3d-light btn-3d-sm"
                  style={{ width: 'fit-content', marginBottom: '20px' }}
                >
                  ← Back to Ticket List
                </button>

                <div className="card-buddy" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', border: '2.5px solid var(--border-light)', backgroundColor: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{
                        backgroundColor: selectedTicket.supportType === 'whiteboard' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        color: selectedTicket.supportType === 'whiteboard' ? '#047857' : '#1d4ed8',
                        fontSize: '0.7rem', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase',
                        border: '1.5px solid rgba(16, 185, 129, 0.2)'
                      }}>
                        {selectedTicket.supportType} Support
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                        {selectedTicket.subject} • Class {selectedTicket.classNum}
                      </span>
                    </div>
                    
                    {/* Status Badge */}
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px',
                      backgroundColor: selectedTicket.status === 'completed' ? 'var(--color-green-light)' : selectedTicket.status === 'assigned' ? 'var(--color-purple-light)' : 'var(--color-yellow-light)',
                      color: selectedTicket.status === 'completed' ? 'var(--color-green-dark)' : selectedTicket.status === 'assigned' ? 'var(--color-purple-dark)' : 'var(--color-yellow-dark)',
                      border: '1.5px solid',
                      borderColor: selectedTicket.status === 'completed' ? 'var(--color-green)' : selectedTicket.status === 'assigned' ? 'var(--color-purple)' : 'var(--color-yellow-dark)'
                    }}>
                      {selectedTicket.status === 'completed' ? '✅ Resolved' : selectedTicket.status === 'assigned' ? '🤝 In Progress' : '⏳ Pending'}
                    </span>
                  </div>

                  <div style={{ borderBottom: '1.5px solid var(--border-light)', paddingBottom: '12px' }}>
                    <h5 style={{ fontSize: '0.75rem', margin: '0 0 4px 0', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>My Question</h5>
                    <p style={{ fontSize: '0.92rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>
                      {selectedTicket.question}
                    </p>
                  </div>

                  <div style={{ borderBottom: '1.5px solid var(--border-light)', paddingBottom: '12px' }}>
                    <h5 style={{ fontSize: '0.75rem', margin: '0 0 4px 0', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Original AI Answer</h5>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                      {renderMarkdown(selectedTicket.aiAnswer)}
                    </div>
                  </div>

                  {selectedTicket.status === 'completed' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingTop: '5px' }}>
                      <div>
                        <h4 style={{ fontSize: '0.82rem', margin: '0 0 6px 0', color: 'var(--color-green-dark)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                          👨‍🏫 Teacher Explanation (by {selectedTicket.assignedTeacherName})
                        </h4>
                        <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', fontWeight: '600' }}>
                          {selectedTicket.teacherAnswer || '(No written text explanation provided)'}
                        </p>
                      </div>

                      {selectedTicket.whiteboardImage && (
                        <div>
                          <h4 style={{ fontSize: '0.82rem', margin: '0 0 6px 0', color: 'var(--color-green-dark)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                            🎨 Whiteboard Explanation Drawing
                          </h4>
                          <div style={{ backgroundColor: '#ffffff', border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '12px', display: 'flex', justifyContent: 'center' }}>
                            <img src={selectedTicket.whiteboardImage} alt="Teacher Whiteboard Drawing" style={{ maxWidth: '100%', maxHeight: '350px', borderRadius: '4px' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : selectedTicket.status === 'assigned' ? (
                    <div className="card-buddy" style={{ backgroundColor: 'var(--bg-app)', border: '1.5px dashed var(--color-purple)', padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <Mascot size={70} expression="smart" className="animate-mascot" />
                      <h4 style={{ fontSize: '1rem', color: 'var(--color-purple-dark)', margin: 0, fontWeight: 'bold' }}>Teacher is explaining! 🤝</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, maxWidth: '300px', lineHeight: 1.4 }}>
                        Verified educator <b>{selectedTicket.assignedTeacherName}</b> has accepted your ticket and is preparing a custom explanation for you. Check back soon!
                      </p>
                    </div>
                  ) : (
                    <div className="card-buddy" style={{ backgroundColor: 'var(--bg-app)', border: '1.5px dashed var(--color-yellow-dark)', padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <Mascot size={70} expression="thinking" className="animate-mascot" />
                      <h4 style={{ fontSize: '1rem', color: 'var(--color-yellow-dark)', margin: 0, fontWeight: 'bold' }}>Waiting for Teacher... ⏳</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, maxWidth: '300px', lineHeight: 1.4 }}>
                        Your ticket has been submitted to the verified teachers dashboard. As soon as a teacher accepts it, they will write/draw an explanation.
                      </p>
                      <button
                        onClick={() => handleDeleteTicket(selectedTicket._id)}
                        className="btn-3d btn-3d-red btn-3d-sm"
                        style={{ marginTop: '12px' }}
                      >
                        Delete Support Ticket
                      </button>
                    </div>
                  )}

                  {/* Delete Support Ticket Button (Universal bottom container for non-pending tickets) */}
                  {selectedTicket.status !== 'pending' && (
                    <div style={{ borderTop: '1.5px solid var(--border-light)', paddingTop: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleDeleteTicket(selectedTicket._id)}
                        className="btn-3d btn-3d-red btn-3d-sm"
                      >
                        Delete Support Ticket
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Ticket List Pane */
              <div style={{ 
                height: '100%', 
                overflowY: 'auto', 
                padding: '24px' 
              }}>
                {ticketsLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent" />
                    <p style={{ marginTop: '10px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>Loading your tickets...</p>
                  </div>
                ) : studentTickets.length === 0 ? (
                  <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                    <Mascot size={110} expression="happy" />
                    <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: 0 }}>No support tickets yet! 🦉</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, maxWidth: '280px', lineHeight: 1.4 }}>
                      If you ever get stuck or don't understand StudyGuru's explanation, click the <b>"Need Teacher Help"</b> button on the AI answer to ask a verified teacher!
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                    
                    {/* Control bar for bulk actions */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px',
                      backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-light)',
                      borderRadius: 'var(--radius-sm)', marginBottom: '10px', flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          id="select-all-tickets"
                          checked={studentTickets.length > 0 && selectedTicketIds.length === studentTickets.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTicketIds(studentTickets.map(t => t._id));
                            } else {
                              setSelectedTicketIds([]);
                            }
                          }}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        <label htmlFor="select-all-tickets" style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--text-main)', cursor: 'pointer' }}>
                          Select All ({studentTickets.length})
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                        {selectedTicketIds.length > 0 && (
                          <button
                            onClick={handleDeleteSelectedTickets}
                            className="btn-3d btn-3d-red btn-3d-xs"
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          >
                            🗑️ Delete Selected ({selectedTicketIds.length})
                          </button>
                        )}
                        <button
                          onClick={handleDeleteAllTickets}
                          className="btn-3d btn-3d-red btn-3d-xs"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          💥 Delete All
                        </button>
                      </div>
                    </div>

                    {studentTickets.map((t) => (
                      <div
                        key={t._id}
                        onClick={() => setSelectedTicket(t)}
                        className="card-buddy"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px', padding: '16px',
                          border: '2px solid var(--border-light)', cursor: 'pointer', transition: 'all 0.2s',
                          backgroundColor: 'var(--bg-card)'
                        }}
                      >
                        {/* Checkbox for selection */}
                        <div style={{ display: 'flex', alignItems: 'center', marginRight: '5px' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedTicketIds.includes(t._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTicketIds(prev => [...prev, t._id]);
                              } else {
                                setSelectedTicketIds(prev => prev.filter(id => id !== t._id));
                              }
                            }}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{
                              backgroundColor: t.supportType === 'whiteboard' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                              color: t.supportType === 'whiteboard' ? '#047857' : '#1d4ed8',
                              fontSize: '0.65rem', fontWeight: 'bold', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase'
                            }}>
                              {t.supportType}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                              {t.subject} • Class {t.classNum}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              • {new Date(t.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <h4 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 'bold', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Q: {t.question}
                          </h4>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Status badge */}
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px',
                            backgroundColor: t.status === 'completed' ? 'var(--color-green-light)' : t.status === 'assigned' ? 'var(--color-purple-light)' : 'var(--color-yellow-light)',
                            color: t.status === 'completed' ? 'var(--color-green-dark)' : t.status === 'assigned' ? 'var(--color-purple-dark)' : 'var(--color-yellow-dark)'
                          }}>
                            {t.status === 'completed' ? 'Resolved' : t.status === 'assigned' ? 'Assigned' : 'Pending'}
                          </span>
                          <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {supportModalMsg && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '3px solid var(--border-light)',
            borderRadius: 'var(--radius-sm)',
            padding: '24px',
            maxWidth: '450px',
            width: '100%',
            boxShadow: 'var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            textAlign: 'center'
          }}>
            <Mascot size={80} expression="thinking" style={{ margin: '0 auto' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>Request Teacher Support</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              Choose how you would like a verified teacher to review and explain this topic to you.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => submitSupportRequest('text')}
                className="btn-3d btn-3d-purple py-3 font-bold"
                style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                💬 Text Support (Written explanation)
              </button>
              <button
                onClick={() => submitSupportRequest('whiteboard')}
                className="btn-3d py-3 font-bold"
                style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#10b981', color: '#ffffff', border: 'none' }}
              >
                🎨 Whiteboard Support (Drawings & Formulas)
              </button>
              <button
                onClick={() => setSupportModalMsg(null)}
                style={{
                  padding: '8px',
                  fontSize: '0.9rem',
                  color: 'var(--text-muted)',
                  fontWeight: 'bold',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Real-time Doubt Match Overlay */}
      {searchStatus && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: `3px solid ${searchStatus.status === 'assigned' ? '#22c55e' : searchStatus.status === 'offline' ? '#eab308' : searchStatus.status === 'error' ? '#ef4444' : 'var(--color-purple)'}`,
            borderRadius: '24px',
            padding: '30px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            textAlign: 'center'
          }}>
            {searchStatus.status === 'searching' && (
              <>
                <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                  <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-purple-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid var(--color-purple)'
                  }}>
                    <Mascot size={70} expression="smart" className="animate-mascot" />
                  </div>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-main)', margin: 0, fontFamily: 'var(--font-header)' }}>
                  Searching for Available Teachers...
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  {searchStatus.message}
                </p>
                <div style={{ width: '100%', backgroundColor: 'var(--border-light)', height: '8px', borderRadius: '4px', overflow: 'hidden', marginTop: '10px' }}>
                  <div style={{ width: '60%', backgroundColor: 'var(--color-purple)', height: '100%', borderRadius: '4px' }} />
                </div>
              </>
            )}

            {searchStatus.status === 'assigned' && (
              <>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#dcfce7',
                  color: '#22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid #22c55e'
                }}>
                  <CheckCircle size={40} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#15803d', margin: 0, fontFamily: 'var(--font-header)' }}>
                  Teacher Connected!
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.5, fontWeight: 'bold' }}>
                  {searchStatus.message}
                </p>
                <button
                  type="button"
                  onClick={() => { setSearchStatus(null); setActiveTab('tickets'); }}
                  style={{
                    backgroundColor: '#22c55e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 24px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginTop: '10px',
                    width: '100%'
                  }}
                >
                  🚀 Open Ticket Workspace
                </button>
              </>
            )}

            {searchStatus.status === 'offline' && (
              <>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid #d97706'
                }}>
                  <Clock size={40} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#b45309', margin: 0, fontFamily: 'var(--font-header)' }}>
                  All Teachers Offline
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  {searchStatus.message}
                </p>
                <button
                  type="button"
                  onClick={() => setSearchStatus(null)}
                  style={{
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 24px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginTop: '10px',
                    width: '100%'
                  }}
                >
                  Got It
                </button>
              </>
            )}

            {searchStatus.status === 'error' && (
              <>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid #ef4444'
                }}>
                  <AlertTriangle size={40} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#b91c1c', margin: 0, fontFamily: 'var(--font-header)' }}>
                  Request Error
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  {searchStatus.message}
                </p>
                <button
                  type="button"
                  onClick={() => setSearchStatus(null)}
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 24px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginTop: '10px',
                    width: '100%'
                  }}
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {maximizedMessage && (() => {
        const msg = maximizedMessage;
        const hasComprehension = !!(
          (msg.revisionNotes && msg.revisionNotes.length > 0) ||
          (msg.examples && msg.examples.length > 0) ||
          (msg.practiceQuestions && msg.practiceQuestions.length > 0) ||
          msg.revisionMaterial ||
          msg.learningCompanion ||
          (msg.miniQuiz && msg.miniQuiz.length > 0)
        );
        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}>
            <div style={{
              backgroundColor: 'var(--bg-app)',
              borderRadius: '24px',
              width: '95vw',
              maxWidth: '1440px',
              height: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '2px solid var(--border-light)',
              overflow: 'hidden'
            }}>
              {/* Modal Header */}
              <div style={{
                padding: '20px 30px',
                borderBottom: '2.5px solid var(--border-light)',
                backgroundColor: 'var(--bg-card)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.6rem' }}>🎒</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: '800', textAlign: 'left' }}>
                      {msg.subject || 'Syllabus Topic'} &bull; {msg.chapter || 'General Study'}
                    </h3>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 'bold', textAlign: 'left' }}>
                      Focus Mode &bull; Interactive Study Guide
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {hasComprehension && (
                    <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-app)', padding: '4px', borderRadius: '10px', border: '1.5px solid var(--border-light)' }}>
                      <button
                        onClick={() => setMaximizedViewMode('vertical')}
                        style={{
                          padding: '6px 14px', fontSize: '0.76rem', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer',
                          backgroundColor: maximizedViewMode === 'vertical' ? 'var(--color-purple-light)' : 'transparent',
                          color: maximizedViewMode === 'vertical' ? 'var(--color-purple-dark)' : 'var(--text-muted)',
                          transition: 'all 0.2s'
                        }}
                      >
                        📝 Vertical View
                      </button>
                      <button
                        onClick={() => setMaximizedViewMode('mixed')}
                        style={{
                          padding: '6px 14px', fontSize: '0.76rem', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer',
                          backgroundColor: maximizedViewMode === 'mixed' ? 'var(--color-purple-light)' : 'transparent',
                          color: maximizedViewMode === 'mixed' ? 'var(--color-purple-dark)' : 'var(--text-muted)',
                          transition: 'all 0.2s'
                        }}
                      >
                        🔀 Split View
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setMaximizedMessage(null)}
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      color: '#dc2626',
                      border: '2.5px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '10px',
                      padding: '8px 16px',
                      fontSize: '0.82rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                  >
                    ✕ Exit Focus Mode
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '30px', backgroundColor: 'var(--bg-app)' }}>
                {maximizedViewMode === 'mixed' && hasComprehension ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '24px', alignItems: 'start' }}>
                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {msg.explanation && (
                        <div style={{
                          padding: '24px', borderRadius: '20px', backgroundColor: 'var(--bg-card)',
                          border: '2px solid var(--border-light)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                        }}>
                          <VerificationBadge msg={msg} onRequestTeacherHelp={handleRequestTeacherHelp} />
                          {renderMarkdown(msg.explanation)}
                        </div>
                      )}

                      {/* Why this answer */}
                      {(msg.isSyllabusRelated || msg.reliabilityScore !== undefined) && (
                        <div style={{
                          padding: '20px 24px', borderRadius: '20px', backgroundColor: 'var(--bg-card)',
                          border: '1.5px solid var(--border-light)'
                        }}>
                          <h5 style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '0.86rem', textTransform: 'uppercase', textAlign: 'left' }}>❓ Why this answer?</h5>
                          {msg.isSyllabusRelated ? (
                            <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', textAlign: 'left' }}>
                              Verified against the active <strong>AP SSC Syllabus</strong>:
                              <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <li><b>Board:</b> AP SSC Board</li>
                                <li><b>Class:</b> Class {msg.class || 10}</li>
                                <li><b>Subject:</b> {msg.subject}</li>
                                <li><b>Chapter:</b> {msg.chapter}</li>
                              </ul>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', textAlign: 'left' }}>
                              Verified using <strong>trusted academic sources</strong>:
                              <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <li><b>Reliability:</b> {msg.reliabilityScore}/100</li>
                                <li><b>Trusted Source Count:</b> {msg.sources ? msg.sources.length : 0}</li>
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Notes */}
                      {msg.revisionNotes && msg.revisionNotes.length > 0 && (
                        <div style={{ padding: '20px 24px', borderRadius: '20px', backgroundColor: 'var(--color-yellow-light)', border: '2px solid var(--color-yellow-dark)' }}>
                          <h5 style={{ margin: '0 0 10px 0', color: 'var(--color-yellow-dark)', fontSize: '1rem', fontWeight: 'bold', textAlign: 'left' }}>📝 Study Notes</h5>
                          <ul style={{ paddingLeft: '20px', color: 'var(--color-yellow-dark)', fontSize: '0.92rem', display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: '600', textAlign: 'left' }}>
                            {msg.revisionNotes.map((note, i) => <li key={i}>{note}</li>)}
                          </ul>
                        </div>
                      )}

                      {/* Examples */}
                      {msg.examples && msg.examples.length > 0 && (
                        <div style={{ padding: '20px 24px', borderRadius: '20px', backgroundColor: 'var(--color-blue-light)', border: '2px solid var(--color-blue)' }}>
                          <h5 style={{ margin: '0 0 10px 0', color: 'var(--color-blue-dark)', fontSize: '1rem', fontWeight: 'bold', textAlign: 'left' }}>💡 Real-Life Examples</h5>
                          <ul style={{ paddingLeft: '20px', color: 'var(--color-blue-dark)', fontSize: '0.92rem', display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: '600', textAlign: 'left' }}>
                            {msg.examples.map((ex, i) => <li key={i}>{ex}</li>)}
                          </ul>
                        </div>
                      )}

                      {/* Practice Questions */}
                      {msg.practiceQuestions && msg.practiceQuestions.length > 0 && (
                        <div style={{ padding: '20px 24px', borderRadius: '20px', backgroundColor: 'var(--color-purple-light)', border: '2px solid var(--color-purple)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          <h5 style={{ margin: 0, color: 'var(--color-purple-dark)', fontSize: '1rem', fontWeight: 'bold', textAlign: 'left' }}>📝 Practice Questions</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {msg.practiceQuestions.map((q, qIdx) => {
                              const isMCQ = q.type === 'mcq' || (q.options && q.options.length > 0);
                              return (
                                <div key={qIdx} style={{ backgroundColor: 'var(--bg-card)', padding: '16px 20px', borderRadius: '14px', border: '1.5px solid var(--border-light)' }}>
                                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '0.92rem', color: 'var(--text-main)', textAlign: 'left' }}>Q{qIdx + 1}: {q.question}</p>
                                  {isMCQ ? (
                                    <MCQQuizBlock q={q} qIdx={qIdx} selectedAnswers={maximizedSelectedAnswers} setSelectedAnswers={setMaximizedSelectedAnswers} />
                                  ) : (
                                    <CollapsibleTextQuestionBlock q={q} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Mini Quiz */}
                      {msg.miniQuiz && msg.miniQuiz.length > 0 && (
                        <InlineQuizBlock questions={msg.miniQuiz} subject={msg.subject} onQuizSubmit={handleQuizSubmit} />
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
                    {msg.explanation && (
                      <div style={{
                        padding: '24px 30px', borderRadius: '20px', backgroundColor: 'var(--bg-card)',
                        border: '2px solid var(--border-light)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                      }}>
                        <VerificationBadge msg={msg} onRequestTeacherHelp={handleRequestTeacherHelp} />
                        {renderMarkdown(msg.explanation)}
                      </div>
                    )}

                    {/* Why this answer */}
                    {(msg.isSyllabusRelated || msg.reliabilityScore !== undefined) && (
                      <div style={{ padding: '20px 24px', borderRadius: '20px', backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border-light)' }}>
                        <h5 style={{ margin: '0 0 10px 0', color: 'var(--text-muted)', textAlign: 'left' }}>❓ Why this answer?</h5>
                        {msg.isSyllabusRelated ? (
                          <div style={{ fontSize: '0.86rem', color: 'var(--text-main)', textAlign: 'left' }}>
                            Verified reference answer against Class {msg.class || 10} {msg.subject} Syllabus.
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.86rem', color: 'var(--text-main)', textAlign: 'left' }}>
                            Verified answer. Reliability Score: {msg.reliabilityScore}/100.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Revision Notes */}
                    {msg.revisionNotes && msg.revisionNotes.length > 0 && (
                      <div style={{ padding: '20px 24px', borderRadius: '20px', backgroundColor: 'var(--color-yellow-light)', border: '2px solid var(--color-yellow-dark)' }}>
                        <h5 style={{ margin: '0 0 10px 0', color: 'var(--color-yellow-dark)', fontSize: '1rem', fontWeight: 'bold', textAlign: 'left' }}>📝 Study Notes</h5>
                        <ul style={{ paddingLeft: '20px', color: 'var(--color-yellow-dark)', fontSize: '0.92rem', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                          {msg.revisionNotes.map((note, i) => <li key={i}>{note}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Examples */}
                    {msg.examples && msg.examples.length > 0 && (
                      <div style={{ padding: '20px 24px', borderRadius: '20px', backgroundColor: 'var(--color-blue-light)', border: '2px solid var(--color-blue)' }}>
                        <h5 style={{ margin: '0 0 10px 0', color: 'var(--color-blue-dark)', fontSize: '1rem', fontWeight: 'bold', textAlign: 'left' }}>💡 Real-Life Examples</h5>
                        <ul style={{ paddingLeft: '20px', color: 'var(--color-blue-dark)', fontSize: '0.92rem', display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: '600', textAlign: 'left' }}>
                          {msg.examples.map((ex, i) => <li key={i}>{ex}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Practice Questions */}
                    {msg.practiceQuestions && msg.practiceQuestions.length > 0 && (
                      <div style={{ padding: '20px 24px', borderRadius: '20px', backgroundColor: 'var(--color-purple-light)', border: '2px solid var(--color-purple)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <h5 style={{ margin: 0, color: 'var(--color-purple-dark)', fontSize: '1rem', fontWeight: 'bold', textAlign: 'left' }}>📝 Practice Questions</h5>
                        {msg.practiceQuestions.map((q, qIdx) => (
                          <div key={qIdx} style={{ backgroundColor: 'var(--bg-card)', padding: '16px 20px', borderRadius: '14px', border: '1.5px solid var(--border-light)' }}>
                            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', textAlign: 'left' }}>Q{qIdx + 1}: {q.question}</p>
                            {q.type === 'mcq' ? (
                              <MCQQuizBlock q={q} qIdx={qIdx} selectedAnswers={maximizedSelectedAnswers} setSelectedAnswers={setMaximizedSelectedAnswers} />
                            ) : (
                              <CollapsibleTextQuestionBlock q={q} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
