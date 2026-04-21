import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseSettings } from '../../hooks/useFirebaseSettings';
import './ShadowGame.css';

// ── ALL PAIRS (same as setup) ──
const ALL_PAIRS = [
  { id:'cat',       emoji:'🐱', label:'Cat'       },
  { id:'dog',       emoji:'🐶', label:'Dog'       },
  { id:'elephant',  emoji:'🐘', label:'Elephant'  },
  { id:'rabbit',    emoji:'🐰', label:'Rabbit'    },
  { id:'fish',      emoji:'🐟', label:'Fish'      },
  { id:'butterfly', emoji:'🦋', label:'Butterfly' },
  { id:'bird',      emoji:'🐦', label:'Bird'      },
  { id:'lion',      emoji:'🦁', label:'Lion'      },
  { id:'apple',     emoji:'🍎', label:'Apple'     },
  { id:'banana',    emoji:'🍌', label:'Banana'    },
  { id:'star',      emoji:'⭐', label:'Star'      },
  { id:'heart',     emoji:'❤️', label:'Heart'     },
  { id:'sun',       emoji:'☀️', label:'Sun'       },
  { id:'moon',      emoji:'🌙', label:'Moon'      },
  { id:'tree',      emoji:'🌳', label:'Tree'      },
  { id:'flower',    emoji:'🌸', label:'Flower'    },
  { id:'house',     emoji:'🏠', label:'House'     },
  { id:'car',       emoji:'🚗', label:'Car'       },
  { id:'plane',     emoji:'✈️', label:'Plane'     },
  { id:'ball',      emoji:'⚽', label:'Ball'      },
];

const DEFAULT_IDS  = ['cat','dog','elephant','rabbit','apple','banana','star','sun'];

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
  u.rate = 0.9; u.pitch = 1.1; u.volume = 1;
  window.speechSynthesis.speak(u);
}

export default function ShadowGame() {
  const navigate = useNavigate();

  // ── FIREBASE ──
  const { data: fbSettings, loading: fbLoading } = useFirebaseSettings('shadowMatch');
  const selectedIds = fbSettings?.selectedIds || DEFAULT_IDS;
  const childName   = fbSettings?.childName   || 'Friend';

  // ── GAME STATE ──
  const [pairs,        setPairs]        = useState([]); // objects in order
  const [shadowOrder,  setShadowOrder]  = useState([]); // shuffled shadow ids
  const [matched,      setMatched]      = useState({}); // { objectId: true } when matched
  const [shakeShadow,  setShakeShadow]  = useState(null);
  const [shakeSlot,    setShakeSlot]    = useState(null);
  const [showWin,      setShowWin]      = useState(false);
  const [gameStarted,  setGameStarted]  = useState(false);
  const [score,        setScore]        = useState(0);
  const [wrong,        setWrong]        = useState(0);
  const [hint,         setHint]         = useState(null); // objectId being hinted
  const [hintUses,     setHintUses]     = useState(3);

  const dragIdRef    = useRef(null); // which shadow is being dragged
  const confettiRef  = useRef(null);
  const initializedRef = useRef(false);

  // ── INIT GAME ──
  const initGame = useCallback(() => {
    const activePairs = ALL_PAIRS.filter(p => selectedIds.includes(p.id));
    const shuffledPairs = shuffle(activePairs);
    setPairs(shuffledPairs);
    setShadowOrder(shuffle(shuffledPairs.map(p => p.id)));
    setMatched({});
    setScore(0);
    setWrong(0);
    setShakeShadow(null);
    setShakeSlot(null);
    setShowWin(false);
    setHint(null);
    setHintUses(3);
    setGameStarted(true);
    setTimeout(() => speak('Match each shadow to its object!'), 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds.join(',')]);

  useEffect(() => {
    if (!fbLoading && !initializedRef.current) {
      initializedRef.current = true;
      initGame();
    }
  }, [fbLoading, initGame]);

  // ── DRAG HANDLERS ──
  const onDragStart = (shadowId) => {
    dragIdRef.current = shadowId;
  };

  const onDrop = (targetId) => {
    const draggedId = dragIdRef.current;
    if (!draggedId) return;

    if (draggedId === targetId) {
      // ✅ CORRECT — shadow matches object
      setMatched(prev => ({ ...prev, [targetId]: true }));
      setShadowOrder(prev => prev.filter(id => id !== draggedId));
      setScore(s => s + 1);
      speak('Correct!');
      launchMiniConfetti();

      // Check if all matched
      const newMatched = Object.keys(matched).length + 1;
      if (newMatched >= pairs.length) {
        setTimeout(() => {
          setShowWin(true);
          launchConfetti();
          speak('Amazing! You matched all the shadows!');
        }, 600);
      }
    } else {
      // ❌ WRONG — shake both the shadow and the slot
      setShakeSlot(targetId);
      setShakeShadow(draggedId);
      setWrong(w => w + 1);
      speak('Try again!');
      setTimeout(() => { setShakeSlot(null); setShakeShadow(null); }, 600);
    }
    dragIdRef.current = null;
  };

  // ── HINT ──
  const showHint = () => {
    if (hintUses <= 0) return;
    // Find first unmatched pair and highlight it
    const unmatched = pairs.find(p => !matched[p.id]);
    if (unmatched) {
      setHintUses(h => h - 1);
      setHint(unmatched.id);
      speak(`Find the shadow for ${unmatched.label}!`);
      setTimeout(() => setHint(null), 2500);
    }
  };

  // ── CONFETTI ──
  const launchMiniConfetti = () => {
    const wrap = confettiRef.current; if (!wrap) return;
    const cols = ['#FBBF24','#34D399','#F472B6','#7C3AED'];
    for (let i = 0; i < 20; i++) {
      const el = document.createElement('div');
      el.className = 'sg-mini-conf';
      el.style.cssText = `left:${Math.random()*100}%;background:${cols[i%4]};width:${Math.random()*6+4}px;height:${Math.random()*9+5}px;border-radius:50%;--cf:${(Math.random()*1.2+0.8).toFixed(1)}s;--cd:0s;`;
      wrap.appendChild(el);
    }
    setTimeout(() => { if(wrap) wrap.innerHTML=''; }, 2500);
  };

  const launchConfetti = () => {
    const wrap = confettiRef.current; if (!wrap) return;
    wrap.innerHTML = '';
    const cols = ['#FBBF24','#F472B6','#7C3AED','#34D399','#38BDF8','#FB923C'];
    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div');
      el.className = 'sg-conf';
      el.style.cssText = `left:${Math.random()*100}%;background:${cols[i%6]};width:${Math.random()*8+5}px;height:${Math.random()*12+7}px;border-radius:${Math.random()>0.5?'50%':'3px'};--cf:${(Math.random()*2+2).toFixed(1)}s;--cd:${(Math.random()*1.5).toFixed(1)}s;`;
      wrap.appendChild(el);
    }
    setTimeout(() => { if(wrap) wrap.innerHTML = ''; }, 5000);
  };

  const progress = pairs.length > 0
    ? Math.round((Object.keys(matched).length / pairs.length) * 100)
    : 0;

  // ── LOADING ──
  if (fbLoading) return (
    <div className="sg-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'3rem',marginBottom:'16px'}}>🌑</div>
        <div style={{fontFamily:'Fredoka One,cursive',fontSize:'1.3rem',color:'#1E1B4B'}}>Loading game...</div>
      </div>
    </div>
  );

  return (
    <div className="sg-page">

      {/* TOPBAR */}
      <div className="sg-topbar">
        <div className="sg-logo">✨ Play<span>Nest</span></div>
        <div className="sg-tb-title">🌑 Shadow Match</div>
        <button className="sg-tb-btn" onClick={() => navigate('/child/dashboard')}>🏠 My Games</button>
      </div>

      <div className="sg-wrap">

        {/* ── INSTRUCTION BAR ── */}
        <div className="sg-instruction">
          <span className="sg-inst-emoji">🌑</span>
          Drag each <strong>shadow</strong> on the right and drop it onto the correct <strong>object</strong> on the left!
          <button className="sg-speak-btn" onClick={() => speak('Drag each shadow and drop it on the matching object!')}>🔊</button>
        </div>

        <div className="sg-main-layout">

          {/* ── LEFT: OBJECTS (drop targets) ── */}
          <div className="sg-objects-col">
            <div className="sg-col-label">🎨 Objects</div>
            {pairs.map(pair => {
              const isMatched = matched[pair.id];
              const isHinted  = hint === pair.id;
              const isShaking = shakeSlot === pair.id;
              return (
                <div
                  key={pair.id}
                  className={`sg-object-slot ${isMatched ? 'matched' : ''} ${isHinted ? 'hinted' : ''} ${isShaking ? 'shake' : ''}`}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => onDrop(pair.id)}
                >
                  <div className="sg-object-emoji">{pair.emoji}</div>
                  <div className="sg-object-label">{pair.label}</div>
                  {isMatched && <div className="sg-matched-badge">✅</div>}
                  {isHinted  && !isMatched && (
                    <div className="sg-hint-glow"/>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── MIDDLE: CONNECTOR LINES ── */}
          <div className="sg-middle">
            <div className="sg-col-label" style={{opacity:0}}>.</div>
            {pairs.map(pair => (
              <div key={pair.id} className={`sg-connector ${matched[pair.id] ? 'matched' : ''}`}>
                {matched[pair.id] ? '━━' : '···'}
              </div>
            ))}
          </div>

          {/* ── RIGHT: SHADOW POOL (draggables) ── */}
          <div className="sg-shadows-col">
            <div className="sg-col-label">🌑 Shadows</div>
            <div className="sg-shadow-pool">
              {shadowOrder.map(shadowId => {
                const pair = ALL_PAIRS.find(p => p.id === shadowId);
                if (!pair) return null;
                const isShaking = shakeShadow === shadowId;
                return (
                  <div
                    key={shadowId}
                    className={`sg-shadow-card ${isShaking ? 'shake' : ''}`}
                    draggable
                    onDragStart={() => onDragStart(shadowId)}
                  >
                    {/* Shadow = same emoji but black silhouette using CSS filter */}
                    <div className="sg-shadow-emoji">{pair.emoji}</div>
                    <div className="sg-shadow-label">?</div>
                  </div>
                );
              })}
              {shadowOrder.length === 0 && gameStarted && (
                <div className="sg-pool-empty">🎉 All matched!</div>
              )}
            </div>
          </div>

        </div>

        {/* ── BOTTOM: PROGRESS + HINTS ── */}
        <div className="sg-bottom-bar">
          <div className="sg-progress-wrap">
            <div className="sg-prog-label">
              ✅ {Object.keys(matched).length} / {pairs.length} matched
            </div>
            <div className="sg-prog-track">
              <div className="sg-prog-fill" style={{width: progress + '%'}}/>
            </div>
          </div>

          <div className="sg-bottom-actions">
            <button className="sg-hint-btn" onClick={showHint} disabled={hintUses <= 0 || !gameStarted}>
              💡 Hint <span className="sg-hint-left">{hintUses} left</span>
            </button>
            <div className="sg-score-chips">
              <span className="sg-chip correct">✅ {score}</span>
              <span className="sg-chip wrong">❌ {wrong}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── WIN SCREEN ── */}
      {showWin && (
        <div className="sg-win-overlay">
          <div className="sg-win-card">
            <div className="sg-win-emoji">🏆</div>
            <div className="sg-win-title">Amazing <span>{childName}!</span></div>
            <div className="sg-win-sub">You matched all the shadows! 🌑✨</div>
            <div className="sg-win-stats">
              <div className="sg-win-stat">
                <div className="sg-win-num">{score}</div>
                <div className="sg-win-stat-label">Correct</div>
              </div>
              <div className="sg-win-stat">
                <div className="sg-win-num">{wrong}</div>
                <div className="sg-win-stat-label">Wrong tries</div>
              </div>
              <div className="sg-win-stat">
                <div className="sg-win-num">{pairs.length}</div>
                <div className="sg-win-stat-label">Total</div>
              </div>
            </div>
            <div className="sg-win-stars">
              {['⭐','⭐','⭐'].map((s,i) => (
                <span key={i} style={{animationDelay:`${0.3+i*0.2}s`}}>{s}</span>
              ))}
            </div>
            <div className="sg-win-actions">
              <button className="sg-btn-again" onClick={initGame}>🔄 Play Again!</button>
              <button className="sg-btn-home"  onClick={() => navigate('/child/dashboard')}>🏠 My Games</button>
            </div>
          </div>
        </div>
      )}

      <div className="sg-confetti" ref={confettiRef}/>
    </div>
  );
}
