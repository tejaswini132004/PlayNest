import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseSettings } from '../../hooks/useFirebaseSettings';
import './SoundMatchGame.css';

// ── DEFAULT ITEMS (shown if parent hasn't set any) ──
const DEFAULT_ITEMS = [
  { id: 's1', emoji: '🐄', label: 'Cow',   sound: 'Moo!' },
  { id: 's2', emoji: '🐶', label: 'Dog',   sound: 'Woof!' },
  { id: 's3', emoji: '🐱', label: 'Cat',   sound: 'Meow!' },
  { id: 's4', emoji: '🦆', label: 'Duck',  sound: 'Quack!' },
  { id: 's5', emoji: '🚗', label: 'Car',   sound: 'Vroom!' },
  { id: 's6', emoji: '🚂', label: 'Train', sound: 'Choo choo!' },
  { id: 's7', emoji: '🔔', label: 'Bell',  sound: 'Ding ding!' },
  { id: 's8', emoji: '🥁', label: 'Drum',  sound: 'Boom boom!' },
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

// ── SPEAK (text-to-speech — same pattern as VoiceGame / HandGesture) ──
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate   = 0.85;
  utter.pitch  = 1.15;
  utter.volume = 1;
  window.speechSynthesis.speak(utter);
}

// ── BUILD OPTIONS — correct item + random distractors, then shuffled ──
function buildOptions(correctItem, allItems, numOptions) {
  const others = allItems.filter(it => it.id !== correctItem.id);
  const distractors = shuffle(others).slice(0, Math.max(0, numOptions - 1));
  return shuffle([correctItem, ...distractors]);
}

export default function SoundMatchGame() {
  const navigate = useNavigate();

  // ── LOAD SETTINGS FROM FIREBASE ──
  const { data: fbSettings, loading: fbLoading } = useFirebaseSettings('soundMatch');
  const items      = (fbSettings?.items && fbSettings.items.length >= 2) ? fbSettings.items : DEFAULT_ITEMS;
  const numOptions = Math.min(fbSettings?.numOptions || 4, items.length);
  const timeLimit  = fbSettings?.timeLimit ?? 10;
  const orderMode  = fbSettings?.orderMode || 'shuffle';
  const childName  = fbSettings?.childName || 'Friend';

  // ── GAME STATE ──
  const [roundItems,   setRoundItems]   = useState([]);
  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [options,      setOptions]      = useState([]);
  const [scoreCorrect, setScoreCorrect] = useState(0);
  const [scoreWrong,   setScoreWrong]   = useState(0);
  const [streak,       setStreak]       = useState(0);
  const [bestStreak,   setBestStreak]   = useState(0);
  const [gameStarted,  setGameStarted]  = useState(false);
  const [showWin,      setShowWin]      = useState(false);
  const [answered,     setAnswered]     = useState(false);
  const [pickedId,     setPickedId]     = useState(null);
  const [resultState,  setResultState]  = useState(null); // null | 'correct' | 'wrong'
  const [timeLeft,     setTimeLeft]     = useState(10);

  // ── REFS (avoid stale closures inside timers) ──
  const roundItemsRef = useRef([]);
  const currentIdxRef = useRef(0);
  const answeredRef   = useRef(false);
  const timerRef      = useRef(null);
  const confettiRef   = useRef(null);

  useEffect(() => { roundItemsRef.current = roundItems; }, [roundItems]);
  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);

  // ── TIMER ──
  useEffect(() => {
    if (!gameStarted || answered || showWin || timeLimit === 0) return;
    setTimeLeft(timeLimit);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!answeredRef.current) markResult(null, false, "Time's up!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, gameStarted]);

  // ── MARK ANSWER (correct or wrong) ──
  const markResult = useCallback((chosenId, isCorrect, spokenMsg) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setAnswered(true);
    setPickedId(chosenId);
    clearInterval(timerRef.current);

    if (isCorrect) {
      setResultState('correct');
      setScoreCorrect(c => c + 1);
      setStreak(s => { const ns = s + 1; setBestStreak(b => Math.max(b, ns)); return ns; });
      launchMiniConfetti();
      speak(spokenMsg || 'Correct! Amazing!');
    } else {
      setResultState('wrong');
      setScoreWrong(w => w + 1);
      setStreak(0);
      speak(spokenMsg || 'Oops! Not quite!');
    }

    // Auto-advance after a short pause — same UX rhythm as VoiceGame
    setTimeout(() => {
      const next  = currentIdxRef.current + 1;
      const total = roundItemsRef.current.length;
      if (next >= total) {
        setShowWin(true);
        launchConfetti();
      } else {
        setCurrentIdx(next);
        setAnswered(false); answeredRef.current = false;
        setPickedId(null);
        setResultState(null);
        const nextItem = roundItemsRef.current[next];
        setOptions(buildOptions(nextItem, items, numOptions));
        setTimeout(() => playCurrentSound(nextItem), 500);
      }
    }, 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, numOptions]);

  // ── PLAY THE SOUND FOR AN ITEM ──
  const playCurrentSound = (item) => {
    if (!item) return;
    speak(item.sound);
  };

  // ── HANDLE OPTION TAP ──
  const handlePick = (option) => {
    if (answered) return;
    const current = roundItemsRef.current[currentIdxRef.current];
    const isCorrect = option.id === current.id;
    markResult(option.id, isCorrect, isCorrect ? 'Correct! Amazing!' : `Oops! That's the ${option.label}!`);
  };

  // ── START GAME ──
  const startGame = () => {
    const qs = orderMode === 'shuffle' ? shuffle([...items]) : [...items];
    setRoundItems(qs);
    roundItemsRef.current = qs;
    setCurrentIdx(0); currentIdxRef.current = 0;
    setScoreCorrect(0); setScoreWrong(0);
    setStreak(0); setBestStreak(0);
    setShowWin(false);
    setAnswered(false); answeredRef.current = false;
    setPickedId(null);
    setResultState(null);
    setOptions(buildOptions(qs[0], items, numOptions));
    setGameStarted(true);
    setTimeout(() => playCurrentSound(qs[0]), 600);
  };

  // ── PLAY AGAIN ──
  const playAgain = () => {
    setShowWin(false);
    if (confettiRef.current) confettiRef.current.innerHTML = '';
    startGame();
  };

  // ── CONFETTI ──
  const launchMiniConfetti = () => {
    const wrap = confettiRef.current; if (!wrap) return;
    const cols = ['#F59E0B','#38BDF8','#34D399','#F472B6','#7C3AED'];
    for (let i = 0; i < 30; i++) {
      const el = document.createElement('div');
      el.className = 'smg-mini-conf';
      el.style.cssText = `left:${Math.random()*100}%;background:${cols[Math.floor(Math.random()*cols.length)]};width:${Math.random()*7+4}px;height:${Math.random()*10+6}px;border-radius:${Math.random()>0.5?'50%':'3px'};--cf:${(Math.random()*1.5+1).toFixed(1)}s;--cd:${(Math.random()*0.5).toFixed(1)}s;`;
      wrap.appendChild(el);
    }
    setTimeout(() => { if (wrap) wrap.innerHTML = ''; }, 3000);
  };

  const launchConfetti = () => {
    const wrap = confettiRef.current; if (!wrap) return;
    wrap.innerHTML = '';
    const cols = ['#F59E0B','#F472B6','#7C3AED','#34D399','#38BDF8','#FB923C'];
    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div');
      el.className = 'smg-conf';
      el.style.cssText = `left:${Math.random()*100}%;background:${cols[Math.floor(Math.random()*cols.length)]};width:${Math.random()*8+5}px;height:${Math.random()*12+7}px;border-radius:${Math.random()>0.5?'50%':'3px'};--cf:${(Math.random()*2+2).toFixed(1)}s;--cd:${(Math.random()*1.5).toFixed(1)}s;`;
      wrap.appendChild(el);
    }
    setTimeout(() => { if (wrap) wrap.innerHTML = ''; }, 5000);
  };

  const currentItem = roundItems[currentIdx];
  const totalItems  = roundItems.length;
  const timerPct    = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 100;
  const timerColor  = timeLeft <= 3 ? '#EF4444' : timeLeft <= 5 ? '#FBBF24' : '#D97706';
  const scorePct    = totalItems > 0 ? ((currentIdx + (answered ? 1 : 0)) / totalItems) * 100 : 0;

  // ── LOADING ──
  if (fbLoading) {
    return (
      <div className="smg-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'3rem',marginBottom:'16px'}}>🔊</div>
          <div style={{fontFamily:'Fredoka One,cursive',fontSize:'1.3rem',color:'#D97706'}}>Loading game...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="smg-page">

      {/* TOPBAR */}
      <div className="smg-topbar">
        <div className="smg-logo">✨ Play<span>Nest</span></div>
        <div className="smg-tb-title">🔊 Sound Match</div>
        <button className="smg-tb-btn" onClick={() => navigate('/child/dashboard')}>🏠 My Games</button>
      </div>

      <div className="smg-play-wrap">
        <div className="smg-play-layout">

          {/* ── LEFT: SOUND + OPTIONS AREA ── */}
          <div className="smg-main-area">
            <div className="smg-main-title">🔊 What made that sound?</div>

            {/* START SCREEN */}
            {!gameStarted && (
              <div className="smg-start-screen">
                <div className="smg-start-emoji">🔊</div>
                <div className="smg-start-title">Ready to Play?</div>
                <div className="smg-start-sub">
                  Listen carefully to the sound, then tap the picture that made it!
                </div>
                <button className="smg-start-btn" onClick={startGame}>🔊 Start Game!</button>
              </div>
            )}

            {/* GAME ACTIVE */}
            {gameStarted && !showWin && (
              <>
                {/* BIG PLAY-SOUND BUTTON */}
                <button
                  className="smg-play-sound-btn"
                  onClick={() => playCurrentSound(currentItem)}
                >
                  <div className="smg-play-sound-icon">🔊</div>
                  <div className="smg-play-sound-label">Tap to hear again</div>
                </button>

                {/* OPTIONS GRID */}
                <div className={`smg-options-grid opts-${options.length}`}>
                  {options.map(opt => {
                    let stateClass = '';
                    if (answered) {
                      if (opt.id === currentItem.id) stateClass = 'correct';
                      else if (opt.id === pickedId) stateClass = 'wrong';
                      else stateClass = 'dim';
                    }
                    return (
                      <button
                        key={opt.id}
                        className={`smg-option-card ${stateClass}`}
                        onClick={() => handlePick(opt)}
                        disabled={answered}
                      >
                        <div className="smg-option-emoji">{opt.emoji}</div>
                        <div className="smg-option-label">{opt.label}</div>
                        {answered && opt.id === currentItem.id && <div className="smg-option-badge">✅</div>}
                        {answered && opt.id === pickedId && opt.id !== currentItem.id && <div className="smg-option-badge">❌</div>}
                      </button>
                    );
                  })}
                </div>

                {/* RESULT FLASH */}
                {resultState && (
                  <div className={`smg-result-flash ${resultState}`}>
                    <div className="smg-result-icon">{resultState === 'correct' ? '🎉' : '😅'}</div>
                    <div className="smg-result-text">
                      {resultState === 'correct' ? 'Correct! Amazing!' : `That was the ${currentItem?.label}!`}
                    </div>
                    {resultState === 'correct' && <div className="smg-countdown-bar"/>}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── RIGHT: SIDE PANEL ── */}
          <div className="smg-side">

            <div className="smg-side-card">
              <div className="smg-side-title">🎵 Round</div>
              {currentItem ? (
                <div className="smg-round-display">
                  <div className="smg-round-number">Sound {currentIdx + 1} of {totalItems}</div>
                  <div className="smg-round-instruction">🔊 Tap the matching picture!</div>
                </div>
              ) : (
                <div className="smg-round-display">
                  <div className="smg-round-instruction">Press Start to play!</div>
                </div>
              )}
            </div>

            {timeLimit > 0 && gameStarted && (
              <div className="smg-side-card">
                <div className="smg-side-title">⏱️ Time Left</div>
                <div className="smg-timer-wrap">
                  <div className="smg-timer-circle" style={{'--prog': timerPct + '%', '--tc': timerColor}}>
                    <div className="smg-timer-inner" style={{color: timerColor}}>{timeLeft}</div>
                  </div>
                  <div className="smg-timer-label">{timeLeft === 1 ? 'second left!' : 'seconds left'}</div>
                </div>
              </div>
            )}

            <div className="smg-side-card">
              <div className="smg-side-title">📊 Score</div>
              <div className="smg-score-row">
                <div className="smg-score-item">
                  <div className="smg-score-num correct">{scoreCorrect}</div>
                  <div className="smg-score-label">✅ Correct</div>
                </div>
                <div className="smg-score-item">
                  <div className="smg-score-num wrong">{scoreWrong}</div>
                  <div className="smg-score-label">❌ Wrong</div>
                </div>
                <div className="smg-score-item">
                  <div className="smg-score-num streak">{streak}</div>
                  <div className="smg-score-label">🔥 Streak</div>
                </div>
              </div>
              <div className="smg-prog-track">
                <div className="smg-prog-fill" style={{width: scorePct + '%'}}/>
              </div>
              <div className="smg-prog-label">{currentIdx + (answered ? 1 : 0)} / {totalItems} answered</div>
            </div>

            <button className="smg-home-btn" onClick={() => navigate('/child/dashboard')}>🏠 Back to Games</button>
          </div>
        </div>
      </div>

      {/* WIN SCREEN */}
      {showWin && (
        <div className="smg-win-overlay">
          <div className="smg-win-card">
            <div className="smg-win-emoji">🏆</div>
            <div className="smg-win-title">Amazing <span>{childName}!</span></div>
            <div className="smg-win-sub">You matched all the sounds! You're a star! 🌟</div>
            <div className="smg-win-stats">
              <div className="smg-win-stat">
                <div className="smg-win-stat-num">{scoreCorrect}</div>
                <div className="smg-win-stat-label">Correct</div>
              </div>
              <div className="smg-win-stat">
                <div className="smg-win-stat-num">{bestStreak}</div>
                <div className="smg-win-stat-label">Best Streak</div>
              </div>
              <div className="smg-win-stat">
                <div className="smg-win-stat-num">{totalItems}</div>
                <div className="smg-win-stat-label">Total</div>
              </div>
            </div>
            <div className="smg-win-stars">
              {['⭐','⭐','⭐'].map((s,i) => (
                <span key={i} style={{animationDelay:`${0.3+i*0.2}s`}}>{s}</span>
              ))}
            </div>
            <div className="smg-win-actions">
              <button className="smg-btn-again" onClick={playAgain}>🔄 Play Again!</button>
              <button className="smg-btn-home" onClick={() => navigate('/child/dashboard')}>🏠 My Games</button>
            </div>
          </div>
        </div>
      )}

      <div className="smg-confetti" ref={confettiRef}/>
    </div>
  );
}
