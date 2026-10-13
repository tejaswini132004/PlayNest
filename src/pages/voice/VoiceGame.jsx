import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseSettings } from '../../hooks/useFirebaseSettings';
import './VoiceGame.css';

// ── DEFAULT QUESTIONS (shown if parent hasn't set any) ──
const DEFAULT_QUESTIONS = [
  { text: 'What animal says moo?',         answer: 'cow'    },
  { text: 'What color is the sky?',         answer: 'blue'   },
  { text: 'What do you drink in the morning?', answer: 'milk' },
  { text: 'What fruit is yellow and long?', answer: 'banana' },
  { text: 'What sound does a dog make?',    answer: 'woof'   },
];

// ── SHUFFLE ──
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── SPEAK (text-to-speech — same as HandGesture game) ──
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate   = 0.85;
  utter.pitch  = 1.1;
  utter.volume = 1;
  window.speechSynthesis.speak(utter);
}

// ── FUZZY MATCH — checks if child's spoken answer contains the correct word ──
// e.g. child says "a cow" — contains "cow" → correct!
// e.g. child says "moo cow" — contains "cow" → correct!
function isAnswerCorrect(spoken, correct) {
  const s = spoken.toLowerCase().trim();
  const c = correct.toLowerCase().trim();
  // exact match OR spoken contains the correct word
  return s === c || s.includes(c) || c.includes(s);
}

export default function VoiceGame() {
  const navigate = useNavigate();

  // ── LOAD SETTINGS FROM FIREBASE ──
  const { data: fbSettings, loading: fbLoading } = useFirebaseSettings('voiceGame');
  const questions = fbSettings?.questions || DEFAULT_QUESTIONS;
  const timeLimit = fbSettings?.timeLimit ?? 10;
  const orderMode = fbSettings?.orderMode || 'shuffle';
  const childName = fbSettings?.childName || 'Friend';

  // ── GAME STATE ──
  const [gameQuestions,  setGameQuestions]  = useState([]);
  const [currentQIdx,    setCurrentQIdx]    = useState(0);
  const [scoreCorrect,   setScoreCorrect]   = useState(0);
  const [scoreWrong,     setScoreWrong]     = useState(0);
  const [streak,         setStreak]         = useState(0);
  const [bestStreak,     setBestStreak]     = useState(0);
  const [gameStarted,    setGameStarted]    = useState(false);
  const [showWin,        setShowWin]        = useState(false);
  const [resultState,    setResultState]    = useState(null);   // null | 'correct' | 'wrong'
  const [resultMsg,      setResultMsg]      = useState('');
  const [answered,       setAnswered]       = useState(false);
  const [timeLeft,       setTimeLeft]       = useState(10);

  // ── VOICE / MIC STATE ──
  const [micMode,        setMicMode]        = useState('idle');  // idle | listening | processing
  const [spokenText,     setSpokenText]     = useState('');      // what the child said
  const [micSupported,   setMicSupported]   = useState(true);

  // ── REFS (to avoid stale closure — same pattern as HandGesture) ──
  const gameQuestionsRef = useRef([]);
  const currentQIdxRef   = useRef(0);
  const answeredRef      = useRef(false);
  const timerRef         = useRef(null);
  const recognitionRef   = useRef(null);   // Web Speech Recognition instance
  const confettiRef      = useRef(null);

  // Keep refs in sync with state
  useEffect(() => { gameQuestionsRef.current = gameQuestions; }, [gameQuestions]);
  useEffect(() => { currentQIdxRef.current   = currentQIdx;   }, [currentQIdx]);

  // ── CHECK BROWSER SUPPORT ──
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) setMicSupported(false);
  }, []);

  // ── TIMER ──
  useEffect(() => {
    if (!gameStarted || answered || timeLimit === 0) return;
    setTimeLeft(timeLimit);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!answeredRef.current) markWrong('Time up! Try the next one!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQIdx, gameStarted]);

  // ── MARK CORRECT ──
  const markCorrect = useCallback(() => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setAnswered(true);
    clearInterval(timerRef.current);
    stopListening();
    setResultState('correct');
    setResultMsg('Correct! Amazing! 🎉');
    setScoreCorrect(c => c + 1);
    setStreak(s => {
      const ns = s + 1;
      setBestStreak(b => Math.max(b, ns));
      return ns;
    });
    launchMiniConfetti();
    speak('Correct! Amazing!');
    // Auto-next after 2 seconds — same as HandGesture game
    setTimeout(() => {
      const next  = currentQIdxRef.current + 1;
      const total = gameQuestionsRef.current.length;
      if (next >= total) {
        setShowWin(true);
        launchConfetti();
      } else {
        setCurrentQIdx(next);
        setAnswered(false); answeredRef.current = false;
        setResultState(null);
        setSpokenText('');
        setMicMode('idle');
        const nextQ = gameQuestionsRef.current[next];
        if (nextQ) setTimeout(() => speak(nextQ.text), 400);
      }
    }, 2000);
  }, []);

  // ── MARK WRONG ──
  const markWrong = useCallback((msg = 'Try again!') => {
    if (answeredRef.current) return;
    stopListening();
    setResultState('wrong');
    setResultMsg(msg);
    setScoreWrong(w => w + 1);
    setStreak(0);
    setMicMode('idle');
    speak('Oops! Try again!');
    // Clear flash after 1.5s so child can retry — same as HandGesture
    setTimeout(() => {
      setResultState(null);
      setResultMsg('');
      setSpokenText('');
    }, 1500);
  }, []);

  // ── NEXT QUESTION (manual — for wrong answers) ──
  const nextQuestion = () => {
    const next = currentQIdx + 1;
    if (next >= gameQuestions.length) {
      setShowWin(true);
      launchConfetti();
    } else {
      setCurrentQIdx(next);
      setAnswered(false); answeredRef.current = false;
      setResultState(null);
      setSpokenText('');
      setMicMode('idle');
      const nextQ = gameQuestionsRef.current[next];
      if (nextQ) setTimeout(() => speak(nextQ.text), 300);
    }
  };

  // ── START GAME ──
  const startGame = () => {
    const qs = orderMode === 'shuffle' ? shuffle([...questions]) : [...questions];
    setGameQuestions(qs);
    gameQuestionsRef.current = qs;
    setCurrentQIdx(0); currentQIdxRef.current = 0;
    setScoreCorrect(0); setScoreWrong(0);
    setStreak(0); setBestStreak(0);
    setShowWin(false);
    setAnswered(false); answeredRef.current = false;
    setResultState(null);
    setSpokenText('');
    setMicMode('idle');
    setGameStarted(true);
    setTimeout(() => speak(qs[0]?.text || ''), 600);
  };

  // ── PLAY AGAIN ──
  const playAgain = () => {
    setShowWin(false);
    if (confettiRef.current) confettiRef.current.innerHTML = '';
    startGame();
  };

  // ── WEB SPEECH RECOGNITION — START LISTENING ──
  const startListening = () => {
    if (!micSupported || answered || resultState === 'correct') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Stop any existing recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.lang         = 'en-US';
    recognition.continuous   = false;    // stop after one answer
    recognition.interimResults = true;   // show live text as child speaks

    recognition.onstart = () => {
      setMicMode('listening');
      setSpokenText('');
    };

    // Show live transcription as child speaks
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join('');
      setSpokenText(transcript);

      // If result is final — check the answer
      if (event.results[event.results.length - 1].isFinal) {
        setMicMode('processing');
        const finalAnswer = transcript.toLowerCase().trim();
        const correctAnswer = gameQuestionsRef.current[currentQIdxRef.current]?.answer || '';
        if (isAnswerCorrect(finalAnswer, correctAnswer)) {
          markCorrect();
        } else {
          markWrong(`You said "${transcript}" — try again!`);
        }
      }
    };

    recognition.onerror = (e) => {
      if (e.error === 'no-speech') {
        setMicMode('idle');
        setSpokenText('');
      } else if (e.error === 'not-allowed') {
        setMicMode('idle');
        alert('Microphone permission denied. Please allow microphone access and try again.');
      } else {
        setMicMode('idle');
      }
    };

    recognition.onend = () => {
      if (micMode === 'listening') setMicMode('idle');
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // ── STOP LISTENING ──
  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }
    setMicMode('idle');
  };

  // ── MIC BUTTON TOGGLE ──
  const handleMicBtn = () => {
    if (micMode === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  };

  // ── TYPE MODE SUBMIT (fallback when no mic) ──
  const [typeAnswer, setTypeAnswer] = useState('');
  const handleTypeSubmit = () => {
    if (!typeAnswer.trim() || answered) return;
    const correctAnswer = gameQuestionsRef.current[currentQIdxRef.current]?.answer || '';
    if (isAnswerCorrect(typeAnswer.trim(), correctAnswer)) {
      markCorrect();
    } else {
      markWrong(`You typed "${typeAnswer}" — try again!`);
    }
    setTypeAnswer('');
  };

  // ── CONFETTI ──
  const launchMiniConfetti = () => {
    const wrap = confettiRef.current; if (!wrap) return;
    const cols = ['#FBBF24','#38BDF8','#34D399','#F472B6','#7C3AED'];
    for (let i = 0; i < 30; i++) {
      const el = document.createElement('div');
      el.className = 'vg-mini-conf';
      el.style.cssText = `left:${Math.random()*100}%;background:${cols[Math.floor(Math.random()*cols.length)]};width:${Math.random()*7+4}px;height:${Math.random()*10+6}px;border-radius:${Math.random()>0.5?'50%':'3px'};--cf:${(Math.random()*1.5+1).toFixed(1)}s;--cd:${(Math.random()*0.5).toFixed(1)}s;`;
      wrap.appendChild(el);
    }
    setTimeout(() => { if(wrap) wrap.innerHTML = ''; }, 3000);
  };

  const launchConfetti = () => {
    const wrap = confettiRef.current; if (!wrap) return;
    wrap.innerHTML = '';
    const cols = ['#FBBF24','#F472B6','#7C3AED','#34D399','#38BDF8','#FB923C'];
    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div');
      el.className = 'vg-conf';
      el.style.cssText = `left:${Math.random()*100}%;background:${cols[Math.floor(Math.random()*cols.length)]};width:${Math.random()*8+5}px;height:${Math.random()*12+7}px;border-radius:${Math.random()>0.5?'50%':'3px'};--cf:${(Math.random()*2+2).toFixed(1)}s;--cd:${(Math.random()*1.5).toFixed(1)}s;`;
      wrap.appendChild(el);
    }
    setTimeout(() => { if(wrap) wrap.innerHTML = ''; }, 5000);
  };

  const currentQ  = gameQuestions[currentQIdx];
  const totalQ    = gameQuestions.length;
  const timerPct  = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 100;
  const timerColor = timeLeft <= 3 ? '#EF4444' : timeLeft <= 5 ? '#FBBF24' : '#2563EB';
  const scorePct  = totalQ > 0 ? ((currentQIdx + (answered ? 1 : 0)) / totalQ) * 100 : 0;

  // ── LOADING ──
  if (fbLoading) {
    return (
      <div className="vg-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'3rem',marginBottom:'16px'}}>🎤</div>
          <div style={{fontFamily:'Fredoka One,cursive',fontSize:'1.3rem',color:'#2563EB'}}>Loading game...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="vg-page">

      {/* TOPBAR */}
      <div className="vg-topbar">
        <div className="vg-logo">✨ Play<span>Nest</span></div>
        <div className="vg-tb-title">🎤 Voice Recognition</div>
        <button className="vg-tb-btn" onClick={() => navigate('/child/dashboard')}>🏠 My Games</button>
      </div>

      <div className="vg-play-wrap">
        <div className="vg-play-layout">

          {/* ── LEFT: MIC AREA ── */}
          <div className="vg-mic-area">
            <div className="vg-mic-title">🎤 Speak your answer!</div>

            {/* START SCREEN */}
            {!gameStarted && (
              <div className="vg-start-screen">
                <div className="vg-start-emoji">🎤</div>
                <div className="vg-start-title">Ready to Play?</div>
                <div className="vg-start-sub">
                  Listen to the question, then tap the mic and speak your answer!
                  {!micSupported && <><br/><span style={{color:'#EF4444'}}>Mic not supported — type mode will be used.</span></>}
                </div>
                <button className="vg-start-btn" onClick={startGame}>🎤 Start Game!</button>
                {!micSupported && (
                  <button className="vg-start-btn vg-start-btn-ghost" onClick={startGame}>
                    ⌨️ Type Mode
                  </button>
                )}
              </div>
            )}

            {/* GAME ACTIVE */}
            {gameStarted && !showWin && (
              <>
                {/* BIG MIC BUTTON */}
                <div
                  className={`vg-mic-btn ${micMode}`}
                  onClick={handleMicBtn}
                >
                  <div className="vg-mic-icon">
                    {micMode === 'listening'   ? '🔴' :
                     micMode === 'processing'  ? '⏳' : '🎤'}
                  </div>
                  <div className="vg-mic-label">
                    {micMode === 'listening'  ? 'Listening... tap to stop' :
                     micMode === 'processing' ? 'Processing...' :
                     'Tap to Speak!'}
                  </div>
                  {/* Pulse rings when listening */}
                  {micMode === 'listening' && (
                    <>
                      <div className="vg-pulse-ring vg-ring-1"/>
                      <div className="vg-pulse-ring vg-ring-2"/>
                      <div className="vg-pulse-ring vg-ring-3"/>
                    </>
                  )}
                </div>

                {/* LIVE TRANSCRIPT — shows what child is saying */}
                {spokenText && (
                  <div className="vg-transcript">
                    <span className="vg-transcript-label">I heard: </span>
                    <span className="vg-transcript-text">"{spokenText}"</span>
                  </div>
                )}

                {/* SPEAK QUESTION AGAIN BUTTON */}
                {currentQ && (
                  <button className="vg-repeat-btn"
                    onClick={() => speak(currentQ.text)}>
                    🔊 Hear question again
                  </button>
                )}

                {/* TYPE MODE FALLBACK */}
                {!micSupported && (
                  <div className="vg-type-mode">
                    <div className="vg-type-label">⌨️ Type your answer:</div>
                    <div className="vg-type-row">
                      <input className="vg-type-input"
                        value={typeAnswer}
                        onChange={e => setTypeAnswer(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleTypeSubmit()}
                        placeholder="Type answer here..."
                      />
                      <button className="vg-type-submit" onClick={handleTypeSubmit}>✅ Submit</button>
                    </div>
                  </div>
                )}

                {/* RESULT FLASH */}
                {resultState && (
                  <div className={`vg-result-flash ${resultState}`}>
                    <div className="vg-result-icon">{resultState === 'correct' ? '🎉' : '😅'}</div>
                    <div className="vg-result-text">{resultMsg}</div>
                    {/* Green countdown bar on correct — same as HandGesture */}
                    {resultState === 'correct' && <div className="vg-countdown-bar"/>}
                  </div>
                )}

                {/* NEXT BUTTON — only shown on wrong */}
                {answered && resultState === 'wrong' && (
                  <button className="vg-next-btn" onClick={nextQuestion}>
                    {currentQIdx + 1 >= totalQ ? '🏆 See Results!' : 'Next Question →'}
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── RIGHT: SIDE PANEL ── */}
          <div className="vg-side">

            {/* QUESTION */}
            <div className="vg-side-card">
              <div className="vg-side-title">❓ Question</div>
              {currentQ ? (
                <div className="vg-q-display">
                  <div className="vg-q-number">Question {currentQIdx + 1} of {totalQ}</div>
                  <div className="vg-q-text">{currentQ.text}</div>
                  <div className="vg-q-instruction">🎤 Tap the mic and speak!</div>
                  <button className="vg-speak-btn"
                    onClick={() => speak(currentQ.text)} title="Hear question">
                    🔊
                  </button>
                </div>
              ) : (
                <div className="vg-q-display">
                  <div className="vg-q-text">Press Start to play!</div>
                </div>
              )}
            </div>

            {/* TIMER */}
            {timeLimit > 0 && gameStarted && (
              <div className="vg-side-card">
                <div className="vg-side-title">⏱️ Time Left</div>
                <div className="vg-timer-wrap">
                  <div className="vg-timer-circle"
                    style={{'--prog': timerPct + '%', '--tc': timerColor}}>
                    <div className="vg-timer-inner" style={{color: timerColor}}>{timeLeft}</div>
                  </div>
                  <div className="vg-timer-label">
                    {timeLeft === 1 ? 'second left!' : 'seconds left'}
                  </div>
                </div>
              </div>
            )}

            {/* SCORE */}
            <div className="vg-side-card">
              <div className="vg-side-title">📊 Score</div>
              <div className="vg-score-row">
                <div className="vg-score-item">
                  <div className="vg-score-num correct">{scoreCorrect}</div>
                  <div className="vg-score-label">✅ Correct</div>
                </div>
                <div className="vg-score-item">
                  <div className="vg-score-num wrong">{scoreWrong}</div>
                  <div className="vg-score-label">❌ Wrong</div>
                </div>
                <div className="vg-score-item">
                  <div className="vg-score-num streak">{streak}</div>
                  <div className="vg-score-label">🔥 Streak</div>
                </div>
              </div>
              <div className="vg-prog-track">
                <div className="vg-prog-fill" style={{width: scorePct + '%'}}/>
              </div>
              <div className="vg-prog-label">
                {currentQIdx + (answered ? 1 : 0)} / {totalQ} answered
              </div>
            </div>

            <button className="vg-home-btn" onClick={() => navigate('/child/dashboard')}>
              🏠 Back to Games
            </button>

          </div>
        </div>
      </div>

      {/* WIN SCREEN */}
      {showWin && (
        <div className="vg-win-overlay">
          <div className="vg-win-card">
            <div className="vg-win-emoji">🏆</div>
            <div className="vg-win-title">Amazing <span>{childName}!</span></div>
            <div className="vg-win-sub">You answered all questions! You're a star! 🌟</div>
            <div className="vg-win-stats">
              <div className="vg-win-stat">
                <div className="vg-win-stat-num">{scoreCorrect}</div>
                <div className="vg-win-stat-label">Correct</div>
              </div>
              <div className="vg-win-stat">
                <div className="vg-win-stat-num">{bestStreak}</div>
                <div className="vg-win-stat-label">Best Streak</div>
              </div>
              <div className="vg-win-stat">
                <div className="vg-win-stat-num">{totalQ}</div>
                <div className="vg-win-stat-label">Total</div>
              </div>
            </div>
            <div className="vg-win-stars">
              {['⭐','⭐','⭐'].map((s,i) => (
                <span key={i} style={{animationDelay:`${0.3+i*0.2}s`}}>{s}</span>
              ))}
            </div>
            <div className="vg-win-actions">
              <button className="vg-btn-again" onClick={playAgain}>🔄 Play Again!</button>
              <button className="vg-btn-home"  onClick={() => navigate('/child/dashboard')}>🏠 My Games</button>
            </div>
          </div>
        </div>
      )}

      <div className="vg-confetti" ref={confettiRef}/>
    </div>
  );
}
