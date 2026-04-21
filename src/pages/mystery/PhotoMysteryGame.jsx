import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseSettings } from '../../hooks/useFirebaseSettings';
import './PhotoMysteryGame.css';

const DEFAULT_MYSTERIES = [
  { image: null, hint: 'I have four legs and say woof!',   answer: 'dog',    emoji: '🐶' },
  { image: null, hint: 'I am yellow and you peel me!',     answer: 'banana', emoji: '🍌' },
  { image: null, hint: 'I am red and grow on trees!',      answer: 'apple',  emoji: '🍎' },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length-1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.85; u.pitch = 1.1; u.volume = 1;
  window.speechSynthesis.speak(u);
}

// Check if child's guess matches answer (fuzzy)
function isCorrect(guess, answer) {
  const g = guess.toLowerCase().trim();
  const a = answer.toLowerCase().trim();
  return g === a || g.includes(a) || a.includes(g);
}

export default function PhotoMysteryGame() {
  const navigate = useNavigate();

  // ── FIREBASE ──
  const { data: fbSettings, loading: fbLoading } = useFirebaseSettings('photoMystery');
  const mysteries   = fbSettings?.mysteries   || DEFAULT_MYSTERIES;
  const childName   = fbSettings?.childName   || 'Friend';
  const blurLevels  = fbSettings?.blurLevels  || 5;
  const timePerStep = fbSettings?.timePerStep || 3;

  // ── GAME STATE ──
  const [queue,        setQueue]        = useState([]);    // shuffled mysteries
  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [blurStep,     setBlurStep]     = useState(0);     // 0 = most blurry
  const [guess,        setGuess]        = useState('');
  const [result,       setResult]       = useState(null);  // null | 'correct' | 'wrong' | 'revealed'
  const [resultMsg,    setResultMsg]    = useState('');
  const [score,        setScore]        = useState(0);
  const [wrong,        setWrong]        = useState(0);
  const [showWin,      setShowWin]      = useState(false);
  const [gameStarted,  setGameStarted]  = useState(false);
  const [revealed,     setRevealed]     = useState(false); // fully revealed

  const revealTimerRef   = useRef(null);
  const confettiRef      = useRef(null);
  const guessInputRef    = useRef(null);
  const initializedRef   = useRef(false);

  // ── BLUR: goes from blurLevels (most blurry) down to 0 (clear) ──
  // blurPx = blurStep 0 → 40px, blurStep max → 0px
  const maxBlur   = 40;
  const blurPx    = Math.max(0, maxBlur - (blurStep / blurLevels) * maxBlur);
  const progress  = Math.round((blurStep / blurLevels) * 100);

  // ── INIT ──
  const initGame = useCallback(() => {
    const q = shuffle([...mysteries]);
    setQueue(q);
    setCurrentIdx(0);
    setBlurStep(0);
    setGuess('');
    setResult(null);
    setScore(0);
    setWrong(0);
    setShowWin(false);
    setRevealed(false);
    setGameStarted(true);
    clearInterval(revealTimerRef.current);
    setTimeout(() => {
      speak(`Can you guess what this is? Here is your hint: ${q[0]?.hint}`);
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mysteries]);

  useEffect(() => {
    if (!fbLoading && !initializedRef.current) {
      initializedRef.current = true;
      initGame();
    }
  }, [fbLoading, initGame]);

  // ── AUTO REVEAL TIMER — reduces blur every N seconds ──
  useEffect(() => {
    if (!gameStarted || result || revealed) return;
    clearInterval(revealTimerRef.current);
    revealTimerRef.current = setInterval(() => {
      setBlurStep(prev => {
        if (prev >= blurLevels) {
          clearInterval(revealTimerRef.current);
          setRevealed(true);
          setResult('revealed');
          setResultMsg('Time is up! The answer was...');
          speak(`Time is up! The answer was ${queue[currentIdx]?.answer}`);
          return blurLevels;
        }
        return prev + 1;
      });
    }, timePerStep * 1000);
    return () => clearInterval(revealTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, gameStarted, result]);

  // ── SUBMIT GUESS ──
  const submitGuess = () => {
    if (!guess.trim() || result) return;
    const current = queue[currentIdx];
    if (isCorrect(guess, current.answer)) {
      clearInterval(revealTimerRef.current);
      setResult('correct');
      setResultMsg('🎉 Correct! Well done!');
      setScore(s => s + 1);
      launchMiniConfetti();
      speak('Correct! Well done!');
      setRevealed(true);
      setBlurStep(blurLevels); // fully reveal on correct
      // Auto next after 2.5 seconds
      setTimeout(goNext, 2500);
    } else {
      setResult('wrong');
      setResultMsg(`Not quite! Try again 😊`);
      setWrong(w => w + 1);
      speak('Try again!');
      setTimeout(() => {
        setResult(null);
        setResultMsg('');
        setGuess('');
        guessInputRef.current?.focus();
      }, 1200);
    }
  };

  // ── SKIP / NEXT ──
  const goNext = () => {
    clearInterval(revealTimerRef.current);
    const next = currentIdx + 1;
    if (next >= queue.length) {
      setShowWin(true);
      launchConfetti();
      speak(`Amazing ${childName}! You solved all the mysteries!`);
    } else {
      setCurrentIdx(next);
      setBlurStep(0);
      setGuess('');
      setResult(null);
      setResultMsg('');
      setRevealed(false);
      setTimeout(() => {
        speak(`Next mystery! Here is your hint: ${queue[next]?.hint}`);
        guessInputRef.current?.focus();
      }, 400);
    }
  };

  // ── REVEAL HINT (gives one more step) ──
  const revealMore = () => {
    if (revealed || result === 'correct') return;
    setBlurStep(prev => Math.min(prev + 1, blurLevels));
  };

  // ── CONFETTI ──
  const launchMiniConfetti = () => {
    const wrap = confettiRef.current; if (!wrap) return;
    const cols = ['#FBBF24','#F472B6','#EC4899','#A855F7'];
    for (let i = 0; i < 30; i++) {
      const el = document.createElement('div');
      el.className = 'pm-mini-conf';
      el.style.cssText = `left:${Math.random()*100}%;background:${cols[i%4]};width:${Math.random()*6+4}px;height:${Math.random()*9+5}px;border-radius:50%;--cf:${(Math.random()*1.2+0.8).toFixed(1)}s;--cd:0s;`;
      wrap.appendChild(el);
    }
    setTimeout(() => { if(wrap) wrap.innerHTML=''; }, 2500);
  };

  const launchConfetti = () => {
    const wrap = confettiRef.current; if (!wrap) return;
    wrap.innerHTML = '';
    const cols = ['#FBBF24','#F472B6','#EC4899','#A855F7','#38BDF8','#FB923C'];
    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div');
      el.className = 'pm-conf';
      el.style.cssText = `left:${Math.random()*100}%;background:${cols[i%6]};width:${Math.random()*8+5}px;height:${Math.random()*12+7}px;border-radius:${Math.random()>0.5?'50%':'3px'};--cf:${(Math.random()*2+2).toFixed(1)}s;--cd:${(Math.random()*1.5).toFixed(1)}s;`;
      wrap.appendChild(el);
    }
    setTimeout(() => { if(wrap) wrap.innerHTML=''; }, 5000);
  };

  const current = queue[currentIdx];

  // ── LOADING ──
  if (fbLoading) return (
    <div className="pm-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'3rem',marginBottom:'16px'}}>🕵️</div>
        <div style={{fontFamily:'Fredoka One,cursive',fontSize:'1.3rem',color:'#EC4899'}}>Loading mysteries...</div>
      </div>
    </div>
  );

  return (
    <div className="pm-page">

      {/* TOPBAR */}
      <div className="pm-topbar">
        <div className="pm-logo">✨ Play<span>Nest</span></div>
        <div className="pm-tb-title">🕵️ Photo Mystery</div>
        <button className="pm-tb-btn" onClick={() => navigate('/child/dashboard')}>🏠 My Games</button>
      </div>

      <div className="pm-wrap">
        <div className="pm-layout">

          {/* ── LEFT: MYSTERY IMAGE ── */}
          <div className="pm-image-side">

            {/* Progress bar showing how much revealed */}
            <div className="pm-reveal-bar-wrap">
              <span className="pm-reveal-label">🌫️ Revealing...</span>
              <div className="pm-reveal-track">
                <div className="pm-reveal-fill" style={{width: progress + '%'}}/>
              </div>
              <span className="pm-reveal-pct">{progress}%</span>
            </div>

            {/* THE MYSTERY IMAGE with CSS blur */}
            <div className="pm-image-wrap">
              {current?.image ? (
                <img
                  src={current.image}
                  alt="mystery"
                  className="pm-mystery-img"
                  style={{ filter: `blur(${blurPx}px)`, transition: 'filter 0.8s ease' }}
                />
              ) : (
                /* No image — show big emoji with blur */
                <div
                  className="pm-mystery-emoji-big"
                  style={{ filter: `blur(${blurPx}px)`, transition: 'filter 0.8s ease' }}
                >
                  {current?.emoji || '❓'}
                </div>
              )}
              {/* Overlay question mark when very blurry */}
              {blurStep === 0 && (
                <div className="pm-question-overlay">❓</div>
              )}
            </div>

            {/* Reveal more button */}
            {!revealed && result !== 'correct' && (
              <button className="pm-reveal-btn" onClick={revealMore}>
                👁️ Reveal more
              </button>
            )}

            {/* Mystery counter */}
            <div className="pm-counter">
              Mystery {currentIdx + 1} of {queue.length}
            </div>
          </div>

          {/* ── RIGHT: SIDE PANEL ── */}
          <div className="pm-side">

            {/* HINT CARD */}
            <div className="pm-side-card pm-hint-card">
              <div className="pm-side-title">💬 Hint</div>
              {current && (
                <>
                  <div className="pm-hint-text">{current.hint}</div>
                  <button className="pm-speak-btn"
                    onClick={() => speak(current.hint)}>
                    🔊 Hear hint
                  </button>
                </>
              )}
            </div>

            {/* GUESS INPUT */}
            <div className="pm-side-card">
              <div className="pm-side-title">🤔 Your Guess</div>
              <input
                ref={guessInputRef}
                className="pm-guess-input"
                value={guess}
                onChange={e => setGuess(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitGuess()}
                placeholder="Type your guess..."
                disabled={result === 'correct' || revealed}
              />
              <button
                className="pm-guess-btn"
                onClick={submitGuess}
                disabled={!guess.trim() || result === 'correct' || revealed}
              >
                ✅ Submit Guess!
              </button>

              {/* Result flash */}
              {result && (
                <div className={`pm-result-flash ${result}`}>
                  <div className="pm-result-icon">
                    {result === 'correct'  ? '🎉' :
                     result === 'wrong'    ? '😅' : '🔍'}
                  </div>
                  <div className="pm-result-text">{resultMsg}</div>
                  {result === 'revealed' && (
                    <div className="pm-revealed-answer">
                      Answer: <strong>{current?.answer}</strong> {current?.emoji}
                    </div>
                  )}
                  {result === 'correct' && <div className="pm-countdown-bar"/>}
                </div>
              )}

              {/* Next button — shown after wrong final or revealed */}
              {(result === 'revealed' || (result === 'correct' && revealed)) && (
                <button className="pm-next-btn" onClick={goNext}>
                  {currentIdx + 1 >= queue.length ? '🏆 See Results!' : 'Next Mystery →'}
                </button>
              )}
            </div>

            {/* SCORE */}
            <div className="pm-side-card">
              <div className="pm-side-title">📊 Score</div>
              <div className="pm-score-row">
                <div className="pm-score-item">
                  <div className="pm-score-num correct">{score}</div>
                  <div className="pm-score-label">✅ Correct</div>
                </div>
                <div className="pm-score-item">
                  <div className="pm-score-num wrong">{wrong}</div>
                  <div className="pm-score-label">❌ Wrong</div>
                </div>
                <div className="pm-score-item">
                  <div className="pm-score-num total">{queue.length}</div>
                  <div className="pm-score-label">🕵️ Total</div>
                </div>
              </div>
            </div>

            <button className="pm-home-btn" onClick={() => navigate('/child/dashboard')}>
              🏠 Back to Games
            </button>

          </div>
        </div>
      </div>

      {/* WIN SCREEN */}
      {showWin && (
        <div className="pm-win-overlay">
          <div className="pm-win-card">
            <div className="pm-win-emoji">🏆</div>
            <div className="pm-win-title">Amazing <span>{childName}!</span></div>
            <div className="pm-win-sub">You solved all the mysteries! 🕵️✨</div>
            <div className="pm-win-stats">
              <div className="pm-win-stat">
                <div className="pm-win-num">{score}</div>
                <div className="pm-win-stat-label">Correct</div>
              </div>
              <div className="pm-win-stat">
                <div className="pm-win-num">{wrong}</div>
                <div className="pm-win-stat-label">Wrong</div>
              </div>
              <div className="pm-win-stat">
                <div className="pm-win-num">{queue.length}</div>
                <div className="pm-win-stat-label">Mysteries</div>
              </div>
            </div>
            <div className="pm-win-stars">
              {['⭐','⭐','⭐'].map((s,i) => (
                <span key={i} style={{animationDelay:`${0.3+i*0.2}s`}}>{s}</span>
              ))}
            </div>
            <div className="pm-win-actions">
              <button className="pm-btn-again" onClick={initGame}>🔄 Play Again!</button>
              <button className="pm-btn-home"  onClick={() => navigate('/child/dashboard')}>🏠 My Games</button>
            </div>
          </div>
        </div>
      )}

      <div className="pm-confetti" ref={confettiRef}/>
    </div>
  );
}
