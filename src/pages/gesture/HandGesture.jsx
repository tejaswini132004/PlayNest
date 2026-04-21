import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseSettings } from '../../hooks/useFirebaseSettings';
import './HandGesture.css';

// ─── FINGER COUNT FROM ml5 HANDPOSE LANDMARKS ────────
// ml5 handpose gives 21 landmark points per hand
// We check if each fingertip is above its middle joint → extended
function countFingers(landmarks) {
  if (!landmarks || landmarks.length < 21) return 0;
  const pts = landmarks;
  let count = 0;

  // Thumb: compare x (horizontal) — sideways finger
  const isLeft = pts[5][0] > pts[17][0];
  if (isLeft) { if (pts[4][0] > pts[2][0]) count++; }
  else         { if (pts[4][0] < pts[2][0]) count++; }

  // Index, Middle, Ring, Pinky: tip.y < pip.y → extended
  const tips = [8, 12, 16, 20];
  const pips = [6, 10, 14, 18];
  for (let i = 0; i < 4; i++) {
    if (pts[tips[i]][1] < pts[pips[i]][1]) count++;
  }
  return count;
}

const EMOJIS = ['✊','☝️','✌️','🤟','🖐','🖐'];

const DEFAULT_QUESTIONS = [
  { text: 'Show me the number', answer: 2 },
  { text: 'How many fingers?',  answer: 3 },
  { text: 'Hold up',            answer: 5 },
  { text: 'Show me',            answer: 1 },
  { text: 'Give me',            answer: 4 },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length-1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── SPEECH: speak any text using browser TTS ──
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel(); // stop any current speech
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate   = 0.85;  // slightly slower — easier for kids
  utter.pitch  = 1.1;   // slightly higher — friendly tone
  utter.volume = 1;
  window.speechSynthesis.speak(utter);
}

export default function HandGesture() {
  const navigate = useNavigate();

  // Load settings from Firestore (real-time!)
  const { data: fbSettings, loading: fbLoading } = useFirebaseSettings('handGesture');
  const questions = fbSettings?.questions || DEFAULT_QUESTIONS;
  const timeLimit = fbSettings?.timeLimit ?? 8;
  const holdTime  = fbSettings?.holdTime  ?? 1.5;
  const orderMode = fbSettings?.orderMode || 'shuffle';
  const childName = fbSettings?.childName || 'Arjun';

  // ── PLAY STATE ──
  const [gameQuestions, setGameQuestions] = useState([]);
  const [currentQIdx,   setCurrentQIdx]   = useState(0);
  const [scoreCorrect,  setScoreCorrect]  = useState(0);
  const [scoreWrong,    setScoreWrong]    = useState(0);
  const [streak,        setStreak]        = useState(0);
  const [bestStreak,    setBestStreak]    = useState(0);
  const [timeLeft,      setTimeLeft]      = useState(8);
  const [answered,      setAnswered]      = useState(false);
  const [resultState,   setResultState]   = useState(null); // null | 'correct' | 'wrong'
  const [resultMsg,     setResultMsg]     = useState('');
  const [showWin,       setShowWin]       = useState(false);
  const [gameStarted,   setGameStarted]   = useState(false);
  const [cameraMode,    setCameraMode]    = useState('start'); // 'start'|'loading'|'active'|'error'|'tap'
  const [cameraError,   setCameraError]   = useState('');
  const [detectedNum,   setDetectedNum]   = useState(null);
  const [confidence,    setConfidence]    = useState(0);

  // ── REFS ──
  const videoRef      = useRef();
  const canvasRef     = useRef();
  const timerRef      = useRef();
  const holdTimerRef  = useRef();
  const handposeRef      = useRef();
  const lastNumRef       = useRef(null);
  const answeredRef      = useRef(false);  // sync ref for async callbacks
  const gameQuestionsRef = useRef([]);     // FIX: always latest questions
  const currentQIdxRef   = useRef(0);      // FIX: always latest index
  const confettiRef      = useRef();

  // Keep all refs in sync with state
  useEffect(() => { answeredRef.current      = answered;      }, [answered]);
  useEffect(() => { gameQuestionsRef.current = gameQuestions; }, [gameQuestions]);
  useEffect(() => { currentQIdxRef.current   = currentQIdx;   }, [currentQIdx]);



  // ── GAME FLOW ──
  const startGame = useCallback(async () => {
    const qs = orderMode === 'shuffle' ? shuffle([...questions]) : [...questions];
    setGameQuestions(qs);
    setCurrentQIdx(0);
    setScoreCorrect(0); setScoreWrong(0);
    setStreak(0); setBestStreak(0);
    setShowWin(false);
    setAnswered(false); answeredRef.current = false;
    setResultState(null);
    setGameStarted(true);
    setCameraMode('loading');
    await startCamera();
  }, [questions, orderMode]);

  const startFallbackMode = () => {
    const qs = orderMode === 'shuffle' ? shuffle([...questions]) : [...questions];
    setGameQuestions(qs);
    setCurrentQIdx(0);
    setScoreCorrect(0); setScoreWrong(0);
    setStreak(0); setBestStreak(0);
    setShowWin(false);
    setAnswered(false); answeredRef.current = false;
    setResultState(null);
    setGameStarted(true);
    setCameraMode('tap');
  };

  // Start timer for current question
  useEffect(() => {
    if (!gameStarted || answered || !['active','tap'].includes(cameraMode)) return;
    if (timeLimit === 0) return;
    setTimeLeft(timeLimit);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!answeredRef.current) markWrong('Time up! Too slow!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentQIdx, gameStarted, cameraMode]);

  const markCorrect = useCallback(() => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setAnswered(true);
    clearInterval(timerRef.current);
    clearTimeout(holdTimerRef.current);
    setResultState('correct');
    setResultMsg('Correct! Great job! 🎉');
    setScoreCorrect(c => c + 1);
    setStreak(s => {
      const ns = s + 1;
      setBestStreak(b => Math.max(b, ns));
      return ns;
    });
    launchMiniConfetti();
    speak('Correct! Great job!');
    // Auto-go to next question after 2 seconds
    setTimeout(() => {
      const next = currentQIdxRef.current + 1;
      const total = gameQuestionsRef.current.length;
      if (next >= total) {
        setShowWin(true);
        launchConfetti();
      } else {
        setCurrentQIdx(next);
        setAnswered(false); answeredRef.current = false;
        setResultState(null);
        setDetectedNum(null);
        setConfidence(0);
        lastNumRef.current = null;
        clearTimeout(holdTimerRef.current);
        const nextQ = gameQuestionsRef.current[next];
        if (nextQ) setTimeout(() => speak(`${nextQ.text} ${nextQ.answer}`), 300);
      }
    }, 2000); // 2 second delay so child sees the ✅ celebration
  }, []);

  const markWrong = useCallback((msg = 'Wrong! Try again!') => {
    if (answeredRef.current) return;
    // DO NOT lock answeredRef — child can still correct their answer!
    clearTimeout(holdTimerRef.current);
    lastNumRef.current = null; // reset hold so next gesture is detected fresh
    setResultState('wrong');
    setResultMsg(msg);
    setScoreWrong(w => w + 1);
    setStreak(0);
    speak('Oops! Try again!');
    // Clear the wrong flash after 1.5s so child can try again cleanly
    setTimeout(() => {
      setResultState(null);
      setResultMsg('');
    }, 1500);
  }, []);

  const nextQuestion = () => {
    const next = currentQIdx + 1;
    if (next >= gameQuestions.length) {
      setShowWin(true);
      launchConfetti();
    } else {
      setCurrentQIdx(next);
      setAnswered(false); answeredRef.current = false;
      setResultState(null);
      setDetectedNum(null);
      setConfidence(0);
      lastNumRef.current = null;
      clearTimeout(holdTimerRef.current);
      // Speak the next question
      const nextQ = gameQuestionsRef.current[next];
      if (nextQ) {
        setTimeout(() => speak(`${nextQ.text} ${nextQ.answer}`), 300);
      }
    }
  };

  const playAgain = () => {
    setShowWin(false);
    if (confettiRef.current) confettiRef.current.innerHTML = '';
    startGame();
  };

  // ── TAP MODE ANSWER ──
  const tapAnswer = (num) => {
    if (answeredRef.current) return;
    setDetectedNum(num);
    setConfidence(90);
    setTimeout(() => {
      const q = gameQuestionsRef.current[currentQIdxRef.current];
      const correct = q?.answer;
      if (correct === undefined) return;
      if (num === correct) markCorrect();
      else markWrong('Wrong! Try the next one!');
    }, 400);
  };

  // Keyboard support for tap mode
  useEffect(() => {
    if (cameraMode !== 'tap') return;
    const handler = (e) => {
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 0 && num <= 5) tapAnswer(num);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cameraMode, currentQIdx, gameQuestions]);

  // ── CAMERA ──
  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('NotSupported');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise(r => { videoRef.current.onloadedmetadata = r; });
        if (canvasRef.current) {
          canvasRef.current.width  = videoRef.current.videoWidth  || 640;
          canvasRef.current.height = videoRef.current.videoHeight || 480;
        }
      }
      setCameraMode('loading');
      loadHandpose();
    } catch (err) {
      console.warn('Camera error:', err.name);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Allow camera or use Tap Mode.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found. Use Tap Mode below.');
      } else {
        setCameraError('Camera not available here. Use Tap Mode below.');
      }
      setCameraMode('error');
    }
  };

  const loadHandpose = () => {
    if (typeof window.ml5 === 'undefined') {
      setCameraError('ml5.js failed to load. Check internet connection.');
      setCameraMode('error');
      return;
    }
    try {
      handposeRef.current = window.ml5.handpose(
        videoRef.current,
        { flipHorizontal: true },
        () => {
          setCameraMode('active');
          handposeRef.current.on('predict', handlePredictions);
          // Speak first question
          const firstQ = gameQuestionsRef.current[0];
          if (firstQ) setTimeout(() => speak(`${firstQ.text} ${firstQ.answer}`), 500);
        }
      );
    } catch (e) {
      setCameraError('Hand model failed. Use Tap Mode.');
      setCameraMode('error');
    }
  };

  const handlePredictions = useCallback((predictions) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!predictions.length) {
      setDetectedNum(null);
      setConfidence(0);
      lastNumRef.current = null;
      clearTimeout(holdTimerRef.current);
      return;
    }

    const landmarks = predictions[0].landmarks;
    const num = countFingers(landmarks);
    setDetectedNum(num);
    setConfidence(85);
    drawSkeleton(ctx, landmarks);

    if (!answeredRef.current) {
      if (num !== lastNumRef.current) {
        lastNumRef.current = num;
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = setTimeout(() => {
          if (!answeredRef.current) {
            // Use refs so we always get the LATEST values (fixes stale closure bug)
            const q = gameQuestionsRef.current[currentQIdxRef.current];
            const correct = q?.answer;
            if (correct === undefined) return; // safety guard
            if (num === correct) markCorrect();
            else markWrong(`Wrong! Needed ${correct}, got ${num}`);
          }
        }, holdTime * 1000);
      }
    }
  }, [holdTime, markCorrect, markWrong]);  // removed gameQuestions/currentQIdx — using refs now

  const drawSkeleton = (ctx, landmarks) => {
    const connections = [
      [0,1],[1,2],[2,3],[3,4],
      [0,5],[5,6],[6,7],[7,8],
      [0,9],[9,10],[10,11],[11,12],
      [0,13],[13,14],[14,15],[15,16],
      [0,17],[17,18],[18,19],[19,20],
      [5,9],[9,13],[13,17],
    ];
    ctx.strokeStyle = 'rgba(124,58,237,0.7)';
    ctx.lineWidth = 2;
    connections.forEach(([a,b]) => {
      ctx.beginPath();
      ctx.moveTo(landmarks[a][0], landmarks[a][1]);
      ctx.lineTo(landmarks[b][0], landmarks[b][1]);
      ctx.stroke();
    });
    landmarks.forEach(([x,y], i) => {
      ctx.fillStyle = [4,8,12,16,20].includes(i) ? '#F472B6' : '#7C3AED';
      ctx.beginPath();
      ctx.arc(x, y, i===0 ? 6 : 4, 0, Math.PI*2);
      ctx.fill();
    });
  };

  // ── CONFETTI ──
  const launchConfetti = () => {
    const wrap = confettiRef.current; if (!wrap) return;
    wrap.innerHTML = '';
    const cols = ['#FBBF24','#F472B6','#7C3AED','#34D399','#38BDF8','#FB923C'];
    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div');
      el.className = 'hg-conf';
      el.style.cssText = `left:${Math.random()*100}%;background:${cols[~~(Math.random()*cols.length)]};width:${Math.random()*8+5}px;height:${Math.random()*12+7}px;border-radius:${Math.random()>.5?'50%':'3px'};--cf:${(Math.random()*2+2).toFixed(1)}s;--cd:${(Math.random()*1.5).toFixed(1)}s;`;
      wrap.appendChild(el);
    }
    setTimeout(() => { if(wrap) wrap.innerHTML=''; }, 5000);
  };
  const launchMiniConfetti = () => {
    const wrap = confettiRef.current; if (!wrap) return;
    const cols = ['#FBBF24','#F472B6','#34D399'];
    for (let i = 0; i < 20; i++) {
      const el = document.createElement('div');
      el.className = 'hg-conf';
      el.style.cssText = `left:${40+Math.random()*20}%;background:${cols[~~(Math.random()*cols.length)]};width:${Math.random()*6+4}px;height:${Math.random()*9+5}px;border-radius:50%;--cf:${(Math.random()*1.5+1).toFixed(1)}s;--cd:0s;`;
      wrap.appendChild(el);
    }
    setTimeout(() => { if(wrap) wrap.innerHTML = ''; }, 3000);
  };

  // ── COMPUTED ──
  const currentQ   = gameQuestions[currentQIdx];
  const totalQ     = gameQuestions.length;
  const timerPct   = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 100;
  const timerColor = timeLeft <= 3 ? '#EF4444' : timeLeft <= 5 ? '#FBBF24' : '#7C3AED';
  const scorePct   = totalQ > 0 ? ((currentQIdx + (answered?1:0)) / totalQ) * 100 : 0;

  // ── RENDER ──────────────────────────────────────────
  if (fbLoading) {
    return (
      <div className="hg-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'3rem',marginBottom:'16px'}}>✋</div>
          <div style={{fontFamily:'Fredoka One,cursive',fontSize:'1.3rem',color:'#059669'}}>Loading game...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="hg-page">

      {/* TOPBAR */}
      <div className="hg-topbar">
        <div className="hg-logo">✨ Play<span>Nest</span></div>
        <div className="hg-tb-title">✋ Hand Gesture MCQ</div>
        <button className="hg-tb-btn" onClick={() => navigate('/child/dashboard')}>🏠 My Games</button>
      </div>

      {/* CHILD PLAY */}
      <div className="hg-play-wrap">
          <div className="hg-play-layout">

            {/* LEFT: CAMERA */}
            <div className="hg-camera-area">
              <div className="hg-camera-title">📷 Show your fingers to the camera!</div>

              <div className="hg-cam-wrap">
                <video ref={videoRef} autoPlay playsInline muted className="hg-video"/>
                <canvas ref={canvasRef} className="hg-canvas"/>

                {/* STATUS BADGE */}
                <div className="hg-cam-status">
                  <div className={`hg-status-dot ${cameraMode==='active'?'':'loading'}`}/>
                  <span>{
                    cameraMode==='start'   ? 'Ready' :
                    cameraMode==='loading' ? 'Loading...' :
                    cameraMode==='active'  ? 'Hand tracking ON' :
                    cameraMode==='tap'     ? 'Tap Mode' :
                    cameraMode==='error'   ? 'Camera off' : ''
                  }</span>
                </div>

                {/* START SCREEN */}
                {!gameStarted && cameraMode === 'start' && (
                  <div className="hg-start-screen">
                    <div className="hg-start-hand">🤚</div>
                    <div className="hg-start-title">Ready to Play?</div>
                    <div className="hg-start-sub">Allow camera to use hand tracking,<br/>or tap the numbers instead!</div>
                    <button className="hg-start-btn" onClick={startGame}>📷 Allow Camera & Play!</button>
                    <button className="hg-start-btn hg-start-btn-ghost" onClick={startFallbackMode}>👆 No Camera? Tap Mode</button>
                  </div>
                )}

                {/* LOADING */}
                {cameraMode === 'loading' && (
                  <div className="hg-loading-overlay">
                    <div className="hg-spinner"/>
                    <div className="hg-loading-text">Starting camera...</div>
                  </div>
                )}

                {/* CAMERA ERROR */}
                {cameraMode === 'error' && (
                  <div className="hg-start-screen">
                    <div style={{fontSize:'2.5rem',marginBottom:8}}>😕</div>
                    <div className="hg-start-title" style={{fontSize:'1.2rem'}}>Camera Blocked</div>
                    <div className="hg-start-sub">{cameraError}</div>
                    <button className="hg-start-btn" onClick={startFallbackMode}>👆 Play in Tap Mode</button>
                    <button className="hg-start-btn hg-start-btn-ghost" onClick={startGame}>🔄 Retry Camera</button>
                  </div>
                )}

                {/* TAP MODE BUTTONS */}
                {cameraMode === 'tap' && (
                  <div className="hg-tap-overlay">
                    <div className="hg-tap-title">👆 Tap the correct number!</div>
                    <div className="hg-tap-grid">
                      {[0,1,2,3,4,5].map(n => (
                        <button key={n} className="hg-tap-btn"
                          onClick={() => tapAnswer(n)}
                          disabled={answered}>
                          {EMOJIS[n]}<br/>{n}
                        </button>
                      ))}
                    </div>
                    <div className="hg-tap-hint">Keyboard: press 0–5 also works!</div>
                  </div>
                )}
              </div>

              {/* DETECTED GESTURE */}
              <div className="hg-detected-wrap">
                <div className="hg-detected-label">I see:</div>
                <div className="hg-detected-hand">{detectedNum !== null ? EMOJIS[detectedNum] : '🤚'}</div>
                <div className="hg-detected-num">{detectedNum !== null ? detectedNum : '—'}</div>
                <div className="hg-conf-bar">
                  <div className="hg-conf-fill" style={{width: confidence+'%'}}/>
                </div>
              </div>

              {/* FINGER GUIDE */}
              <div className="hg-finger-guide" style={{marginTop:14}}>
                {[['✊','0'],['☝️','1'],['✌️','2'],['🤟','3'],['🖐','4'],['🖐','5']].map(([e,n]) => (
                  <div key={n} className={`hg-finger-item ${detectedNum===parseInt(n)?'active':''}`}>
                    <span className="hg-finger-emoji">{e}</span>
                    <span className="hg-finger-num">{n}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: SIDE PANEL */}
            <div className="hg-side">

              {/* QUESTION */}
              <div className="hg-side-card">
                <div className="hg-side-title">❓ Question</div>
                {currentQ ? (
                  <div className="hg-q-display">
                    <div className="hg-q-number">Question {currentQIdx+1} of {totalQ}</div>
                    <div className="hg-q-text-row">
                      <div className="hg-q-text">{currentQ.text}</div>
                      <button className="hg-speak-btn"
                        onClick={() => speak(`${currentQ.text} ${currentQ.answer}`)}
                        title="Speak question">
                        🔊
                      </button>
                    </div>
                    <div className="hg-q-target">{EMOJIS[currentQ.answer]} {currentQ.answer}</div>
                    <div className="hg-q-instruction">Hold fingers steady ✋</div>
                  </div>
                ) : (
                  <div className="hg-q-display">
                    <div className="hg-q-text">Press Start to play!</div>
                  </div>
                )}

                {resultState && (
                  <div className={`hg-result-flash ${resultState}`}>
                    <div className="hg-result-icon">{resultState==='correct' ? '🎉' : '😅'}</div>
                    <div className="hg-result-text">{resultMsg}</div>
                  </div>
                )}

                {/* Only show Next button for WRONG answers — correct auto-advances */}
                {answered && resultState === 'wrong' && (
                  <button className="hg-next-btn" onClick={nextQuestion}>
                    {currentQIdx+1 >= totalQ ? '🏆 See Results!' : 'Next Question →'}
                  </button>
                )}
              </div>

              {/* TIMER */}
              {timeLimit > 0 && gameStarted && (
                <div className="hg-side-card">
                  <div className="hg-side-title">⏱️ Time Left</div>
                  <div className="hg-timer-wrap">
                    <div className="hg-timer-circle"
                      style={{'--prog': timerPct+'%', '--tc': timerColor}}>
                      <div className="hg-timer-inner" style={{color: timerColor}}>{timeLeft}</div>
                    </div>
                    <div className="hg-timer-label">
                      {timeLeft === 1 ? 'second left!' : 'seconds left'}
                    </div>
                  </div>
                </div>
              )}

              {/* SCORE */}
              <div className="hg-side-card">
                <div className="hg-side-title">📊 Score</div>
                <div className="hg-score-row">
                  <div className="hg-score-item">
                    <div className="hg-score-num correct">{scoreCorrect}</div>
                    <div className="hg-score-label">✅ Correct</div>
                  </div>
                  <div className="hg-score-item">
                    <div className="hg-score-num wrong">{scoreWrong}</div>
                    <div className="hg-score-label">❌ Wrong</div>
                  </div>
                  <div className="hg-score-item">
                    <div className="hg-score-num streak">{streak}</div>
                    <div className="hg-score-label">🔥 Streak</div>
                  </div>
                </div>
                <div className="hg-prog-track">
                  <div className="hg-prog-fill" style={{width: scorePct+'%'}}/>
                </div>
                <div className="hg-prog-label">
                  {currentQIdx + (answered?1:0)} / {totalQ} answered
                </div>
              </div>

              <button className="hg-home-btn" onClick={() => navigate('/child/dashboard')}>
                🏠 Back to Games
              </button>
            </div>

          </div>
        </div>

      {/* WIN SCREEN */}
      {showWin && (
        <div className="hg-win-overlay">
          <div className="hg-win-card">
            <span className="hg-win-emoji">🏆</span>
            <div className="hg-win-title">Amazing <span>{childName}!</span></div>
            <div className="hg-win-sub">You finished all the questions! 🌟</div>
            <div className="hg-win-stats">
              <div className="hg-win-stat">
                <div className="hg-win-stat-num">{scoreCorrect}</div>
                <div className="hg-win-stat-label">✅ Correct</div>
              </div>
              <div className="hg-win-stat">
                <div className="hg-win-stat-num">{scoreWrong}</div>
                <div className="hg-win-stat-label">❌ Wrong</div>
              </div>
              <div className="hg-win-stat">
                <div className="hg-win-stat-num">{bestStreak}</div>
                <div className="hg-win-stat-label">🔥 Best Streak</div>
              </div>
            </div>
            <div className="hg-win-actions">
              <button className="hg-btn-again" onClick={playAgain}>🔄 Play Again!</button>
              <button className="hg-btn-home"  onClick={() => navigate('/child/dashboard')}>🏠 My Games</button>
            </div>
          </div>
        </div>
      )}

      <div className="hg-confetti" ref={confettiRef}/>
    </div>
  );
}
