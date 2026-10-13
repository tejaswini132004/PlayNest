import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseSettings } from '../../hooks/useFirebaseSettings';
import './DrawGame.css';

const DEFAULT_QUESTIONS = [
  { text: 'What sound does a cow make? Draw the cow!', emoji: '🐄' },
  { text: 'Draw the sun in the sky!',                   emoji: '☀️' },
  { text: 'Draw your favourite fruit!',                 emoji: '🍎' },
];

const BRUSH_COLORS = ['#7C3AED','#EF4444','#F97316','#FBBF24','#34D399','#38BDF8','#1E1B4B'];

// ── SPEECH: speak any text using browser TTS (same pattern as HandGesture.jsx) ──
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate   = 0.85;
  utter.pitch  = 1.1;
  utter.volume = 1;
  window.speechSynthesis.speak(utter);
}

// ── Check if the hand is "pointing" (only index finger extended) ──
// Reuses the same landmark logic as HandGesture.jsx's countFingers,
// but we only care whether the index finger alone is up — that's our "pen down" gesture.
function isPointingGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return false;
  const pts = landmarks;
  const tips = [8, 12, 16, 20];
  const pips = [6, 10, 14, 18];
  const extended = tips.map((t, i) => pts[t][1] < pts[pips[i]][1]);
  // Index up, middle/ring/pinky down = pointing (drawing) gesture
  return extended[0] && !extended[1] && !extended[2] && !extended[3];
}

export default function DrawGame() {
  const navigate = useNavigate();

  // Load questions from Firestore (real-time!)
  const { data: fbSettings, loading: fbLoading } = useFirebaseSettings('drawGame');
  const questions = fbSettings?.questions?.length ? fbSettings.questions : DEFAULT_QUESTIONS;
  const timeLimit = fbSettings?.timeLimit ?? 30;
  const childName = fbSettings?.childName || 'Arjun';

  // ── PLAY STATE ──
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [timeLeft,    setTimeLeft]    = useState(timeLimit);
  const [gameStarted, setGameStarted] = useState(false);
  const [showWin,     setShowWin]     = useState(false);
  const [brushColor,  setBrushColor]  = useState('#7C3AED');
  const [mode,         setMode]        = useState('touch'); // 'touch' | 'air' | 'loading' | 'error'
  const [cameraError,  setCameraError] = useState('');
  const [handDetected, setHandDetected] = useState(false);
  const [drawnCount,   setDrawnCount]   = useState(0);

  // ── REFS ──
  const drawCanvasRef = useRef();   // the actual drawing surface
  const overlayRef     = useRef();  // shows hand skeleton in air-draw mode
  const videoRef        = useRef();
  const timerRef         = useRef();
  const confettiRef      = useRef();
  const handposeRef      = useRef();
  const isDrawingRef     = useRef(false);
  const lastPointRef     = useRef(null);
  const brushColorRef    = useRef(brushColor);
  const mediaStreamRef   = useRef(null); // holds the active camera stream so we can stop it cleanly

  // Stop the camera whenever we leave air-draw mode, or when the page unmounts —
  // prevents a dangling camera session and lets "Retry Camera" work cleanly.
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (handposeRef.current) {
      handposeRef.current = null;
    }
  };
  useEffect(() => stopCamera, []); // stop camera on unmount

  useEffect(() => { brushColorRef.current = brushColor; }, [brushColor]);

  const totalQ    = questions.length;
  const currentQ  = questions[currentQIdx];

  // ── SETUP DRAWING CANVAS ──
  const setupCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width  = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
  };

  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, []);

  const clearCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setDrawnCount(0);
  };

  const drawLine = (x1, y1, x2, y2) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = brushColorRef.current;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    setDrawnCount(c => c + 1);
  };

  // ── MOUSE / TOUCH DRAWING (works everywhere, no camera needed) ──
  const getPos = (e) => {
    const canvas = drawCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    if (mode !== 'touch') return;
    isDrawingRef.current = true;
    lastPointRef.current = getPos(e);
  };
  const handlePointerMove = (e) => {
    if (mode !== 'touch' || !isDrawingRef.current) return;
    const pos = getPos(e);
    drawLine(lastPointRef.current.x, lastPointRef.current.y, pos.x, pos.y);
    lastPointRef.current = pos;
  };
  const handlePointerUp = () => { isDrawingRef.current = false; };

  // ── GAME FLOW ──
  const startGameWithMode = (chosenMode) => {
    setCurrentQIdx(0);
    setShowWin(false);
    clearCanvas();
    setGameStarted(true);
    if (chosenMode === 'air') {
      setMode('loading');
      startCamera();
    } else {
      setMode('touch');
      setTimeout(() => speak(`${questions[0].text}`), 300);
    }
  };

  // Timer per drawing
  useEffect(() => {
    if (!gameStarted || timeLimit === 0 || !['touch','air'].includes(mode)) return;
    setTimeLeft(timeLimit);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          finishDrawing();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentQIdx, gameStarted, mode]);

  const finishDrawing = () => {
    launchMiniConfetti();
    speak('Wonderful drawing! Great job!');
    setTimeout(() => {
      const next = currentQIdx + 1;
      if (next >= totalQ) {
        setShowWin(true);
        launchConfetti();
      } else {
        setCurrentQIdx(next);
        clearCanvas();
        const nextQ = questions[next];
        if (nextQ) setTimeout(() => speak(nextQ.text), 300);
      }
    }, 1500);
  };

  const playAgain = () => {
    setShowWin(false);
    if (confettiRef.current) confettiRef.current.innerHTML = '';
    startGameWithMode(mode === 'air' ? 'air' : 'touch');
  };

  // ── AIR-DRAW MODE (reuses ml5 HandPose pipeline, same pattern as HandGesture.jsx) ──
  const startCamera = async () => {
    stopCamera(); // release any previous stream first (e.g. on Retry Camera)
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('NotSupported');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      mediaStreamRef.current = stream; // keep a handle so we can stop it later
      if (!videoRef.current) {
        // Safety guard — should not happen now that <video> always renders
        // once gameStarted is true, but bail out cleanly if it ever does.
        stream.getTracks().forEach(t => t.stop());
        setCameraError('Camera view not ready. Please try again.');
        setMode('error');
        return;
      }
      videoRef.current.srcObject = stream;
      await new Promise(r => { videoRef.current.onloadedmetadata = r; });
      if (overlayRef.current) {
        overlayRef.current.width  = videoRef.current.videoWidth  || 640;
        overlayRef.current.height = videoRef.current.videoHeight || 480;
      }
      loadHandpose();
    } catch (err) {
      console.warn('Camera error:', err.name);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Try Touch Draw instead.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found. Try Touch Draw instead.');
      } else {
        setCameraError('Camera not available here. Try Touch Draw instead.');
      }
      setMode('error');
    }
  };

  const loadHandpose = () => {
    if (typeof window.ml5 === 'undefined') {
      setCameraError('ml5.js failed to load. Check internet connection.');
      setMode('error');
      return;
    }
    try {
      handposeRef.current = window.ml5.handpose(
        videoRef.current,
        { flipHorizontal: true },
        () => {
          setMode('air');
          handposeRef.current.on('predict', handlePredictions);
          const firstQ = questions[0];
          if (firstQ) setTimeout(() => speak(firstQ.text), 500);
        }
      );
    } catch (e) {
      setCameraError('Hand model failed. Try Touch Draw instead.');
      setMode('error');
    }
  };

  const handlePredictions = useCallback((predictions) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const scaleX = canvas.width  / (videoRef.current.videoWidth  || canvas.width);
    const scaleY = canvas.height / (videoRef.current.videoHeight || canvas.height);

    if (!predictions.length) {
      setHandDetected(false);
      isDrawingRef.current = false;
      lastPointRef.current = null;
      return;
    }

    setHandDetected(true);
    const landmarks = predictions[0].landmarks;
    const pointing = isPointingGesture(landmarks);
    const tip = landmarks[8]; // index fingertip landmark
    const x = tip[0] * scaleX;
    const y = tip[1] * scaleY;

    if (pointing) {
      if (isDrawingRef.current && lastPointRef.current) {
        drawLine(lastPointRef.current.x, lastPointRef.current.y, x, y);
      }
      isDrawingRef.current = true;
      lastPointRef.current = { x, y };
    } else {
      isDrawingRef.current = false;
      lastPointRef.current = null;
    }
  }, []);

  // ── CONFETTI (same pattern as PuzzleGame.jsx / HandGesture.jsx) ──
  const launchConfetti = () => {
    const wrap = confettiRef.current;
    if (!wrap) return;
    wrap.innerHTML = '';
    const cols = ['#FBBF24','#F472B6','#7C3AED','#34D399','#38BDF8','#FB923C'];
    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div');
      el.className = 'dg-conf';
      el.style.cssText = `
        left:${Math.random()*100}%;
        background:${cols[Math.floor(Math.random()*cols.length)]};
        width:${Math.random()*8+5}px; height:${Math.random()*12+7}px;
        border-radius:${Math.random()>0.5?'50%':'3px'};
        --cf:${(Math.random()*2+2).toFixed(1)}s;
        --cd:${(Math.random()*1.5).toFixed(1)}s;
      `;
      wrap.appendChild(el);
    }
    setTimeout(() => { if (wrap) wrap.innerHTML = ''; }, 5000);
  };

  const launchMiniConfetti = () => {
    const wrap = confettiRef.current;
    if (!wrap) return;
    const cols = ['#FBBF24','#F472B6','#34D399'];
    for (let i = 0; i < 20; i++) {
      const el = document.createElement('div');
      el.className = 'dg-conf';
      el.style.cssText = `
        left:${40+Math.random()*20}%;
        background:${cols[Math.floor(Math.random()*cols.length)]};
        width:6px; height:9px; border-radius:3px;
        --cf:1.5s; --cd:${(Math.random()*0.3).toFixed(1)}s;
      `;
      wrap.appendChild(el);
    }
    setTimeout(() => { if (wrap) wrap.innerHTML = ''; }, 2000);
  };

  const timerPct = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 100;
  const timerColor = timerPct > 50 ? '#34D399' : timerPct > 20 ? '#FBBF24' : '#EF4444';

  if (fbLoading) {
    return (
      <div className="dg-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'3rem',marginBottom:'16px',animation:'dg-spin 1s linear infinite'}}>🎨</div>
          <div style={{fontFamily:'Fredoka One,cursive',fontSize:'1.3rem',color:'#7C3AED'}}>Loading game...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dg-page">
      {/* TOP BAR */}
      <div className="dg-topbar">
        <div className="dg-logo">✨ Play<span>Nest</span></div>
        <div className="dg-title">🎨 Draw Your Answer</div>
        <button className="dg-back-btn" onClick={() => navigate('/child/dashboard')}>🏠 My Games</button>
      </div>

      <div className="dg-layout">

        {/* LEFT: CANVAS AREA */}
        <div className="dg-canvas-area">

          {!gameStarted && (
            <div className="dg-start-screen">
              <div className="dg-start-hand">🖍️</div>
              <div className="dg-start-title">Ready to Draw?</div>
              <div className="dg-start-sub">Draw with your finger in the air using the camera,<br/>or just draw on screen with your mouse/finger!</div>
              <button className="dg-start-btn" onClick={() => startGameWithMode('air')}>📷 Draw in the Air!</button>
              <button className="dg-start-btn dg-start-btn-ghost" onClick={() => startGameWithMode('touch')}>👆 Touch Draw Instead</button>
            </div>
          )}

          {mode === 'loading' && gameStarted && (
            <div className="dg-loading-overlay">
              <div className="dg-spinner"/>
              <div className="dg-loading-text">Starting camera...</div>
            </div>
          )}

          {mode === 'error' && gameStarted && (
            <div className="dg-start-screen">
              <div style={{fontSize:'2.5rem',marginBottom:8}}>😕</div>
              <div className="dg-start-title" style={{fontSize:'1.2rem'}}>Camera Blocked</div>
              <div className="dg-start-sub">{cameraError}</div>
              <button className="dg-start-btn" onClick={() => startGameWithMode('touch')}>👆 Touch Draw Instead</button>
              <button className="dg-start-btn dg-start-btn-ghost" onClick={() => startGameWithMode('air')}>🔄 Retry Camera</button>
            </div>
          )}

          {/* Video feed that drives ml5 hand tracking.
              MUST stay visible (not display:none) — many browsers stop
              decoding frames from a display:none <video>, which silently
              starves ml5 of any image data to detect a hand from.
              We show it as a small mirrored preview instead (same approach
              as the working HandGesture.jsx camera view). It still renders
              as soon as gameStarted is true so startCamera() always has a
              valid ref to attach the stream to. */}
          {gameStarted && (
            <video
              ref={videoRef}
              autoPlay playsInline muted
              className={`dg-video-preview ${mode === 'air' ? 'dg-video-visible' : ''}`}
            />
          )}

          {gameStarted && ['touch','air'].includes(mode) && (
            <>
              <div className="dg-canvas-wrap">
                <canvas
                  ref={drawCanvasRef}
                  className="dg-canvas"
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                />
                {mode === 'air' && (
                  <div className={`dg-hand-indicator ${handDetected ? 'active' : ''}`}>
                    {handDetected ? '☝️ Point to draw!' : '🤚 Show your hand'}
                  </div>
                )}
              </div>

              {/* BRUSH COLORS */}
              <div className="dg-brush-row">
                {BRUSH_COLORS.map(c => (
                  <button
                    key={c}
                    className={`dg-brush-dot ${brushColor === c ? 'selected' : ''}`}
                    style={{background: c}}
                    onClick={() => setBrushColor(c)}
                  />
                ))}
                <button className="dg-clear-btn" onClick={clearCanvas}>🧹 Clear</button>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: SIDE PANEL */}
        <div className="dg-side">

          <div className="dg-side-card">
            <div className="dg-side-title">❓ Question</div>
            {currentQ ? (
              <div className="dg-q-display">
                <div className="dg-q-number">Drawing {currentQIdx+1} of {totalQ}</div>
                <div className="dg-q-emoji-big">{currentQ.emoji}</div>
                <div className="dg-q-text-row">
                  <div className="dg-q-text">{currentQ.text}</div>
                  <button className="dg-speak-btn" onClick={() => speak(currentQ.text)} title="Speak question">🔊</button>
                </div>
              </div>
            ) : (
              <div className="dg-q-display">
                <div className="dg-q-text">Press Start to play!</div>
              </div>
            )}

            {gameStarted && ['touch','air'].includes(mode) && (
              <button className="dg-done-btn" onClick={finishDrawing}>
                ✅ I'm Done Drawing!
              </button>
            )}
          </div>

          {timeLimit > 0 && gameStarted && ['touch','air'].includes(mode) && (
            <div className="dg-side-card">
              <div className="dg-side-title">⏱️ Time Left</div>
              <div className="dg-timer-wrap">
                <div className="dg-timer-circle" style={{'--prog': timerPct+'%', '--tc': timerColor}}>
                  <div className="dg-timer-inner" style={{color: timerColor}}>{timeLeft}</div>
                </div>
                <div className="dg-timer-label">{timeLeft === 1 ? 'second left!' : 'seconds left'}</div>
              </div>
            </div>
          )}

          <button className="dg-home-btn" onClick={() => navigate('/child/dashboard')}>
            🏠 Back to Games
          </button>
        </div>
      </div>

      {/* WIN SCREEN */}
      {showWin && (
        <div className="dg-win-overlay">
          <div className="dg-win-card">
            <span className="dg-win-emoji">🏆</span>
            <div className="dg-win-title">Amazing <span>{childName}!</span></div>
            <div className="dg-win-sub">You drew {totalQ} wonderful pictures! 🌟</div>
            <div className="dg-win-actions">
              <button className="dg-btn-again" onClick={playAgain}>🔄 Draw Again!</button>
              <button className="dg-btn-home"  onClick={() => navigate('/child/dashboard')}>🏠 My Games</button>
            </div>
          </div>
        </div>
      )}

      <div className="dg-confetti" ref={confettiRef}/>
    </div>
  );
}
