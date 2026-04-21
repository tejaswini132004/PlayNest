import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StarsBg from '../components/StarsBg';
import { useUserData } from '../hooks/useUserData';
import './HomePage.css';

const GAMES = [
  { emoji:'🧩', label:'Puzzle',  delay:'3.5s' },
  { emoji:'🌑', label:'Shadow',  delay:'4.5s' },
  { emoji:'🕵️', label:'Mystery', delay:'5s'   },
  { emoji:'✋', label:'MCQ',     delay:'3.8s' },
  { emoji:'🎤', label:'Voice',   delay:'4.2s' },
];

function HomePage() {
  const navigate = useNavigate();
  const { childName, parentName, loading } = useUserData();
  const [msgIdx,   setMsgIdx]   = useState(0);
  const [visible,  setVisible]  = useState(true);

  // Dynamic messages using real child name
  const MESSAGES = [
    <>{childName ? `Hey ${childName}!` : 'Hey!'} You have <span className="hi">5 games</span> waiting! 🎮</>,
    <>You're on a <span className="hi">7 day</span> learning streak! 🔥 Keep going!</>,
    <>Last played: <span className="hi">Picture Puzzle</span> — ready to beat your score? 🧩</>,
    <>New game alert! <span className="hi">Voice Recognition</span> is here! 🎤</>,
    <>You've played <span className="hi">20 times</span> this week — you're a star! ⭐</>,
    <>Shadow Match is waiting — can you find all shapes? 🌑</>,
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setMsgIdx(p => (p+1) % MESSAGES.length); setVisible(true); }, 350);
    }, 3500);
    return () => clearInterval(interval);
  }, [childName]);

  if (loading) {
    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(145deg,#0F0C2E,#1E1B4B)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'3rem',animation:'spin 1s linear infinite'}}>✨</div>
          <div style={{fontFamily:'Fredoka One,cursive',color:'white',fontSize:'1.3rem',marginTop:'16px'}}>Loading...</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    );
  }

  return (
    <div className="home-page">
      <StarsBg />

      {/* BG BUBBLES */}
      <div className="bubble" style={{'--bf':'5s',  width:'100px',height:'100px',top:'7%',   left:'3%',  fontSize:'2.8rem'}}>🧩</div>
      <div className="bubble" style={{'--bf':'7s',  width:'85px', height:'85px', top:'14%',  right:'4%', fontSize:'2.3rem'}}>🌑</div>
      <div className="bubble" style={{'--bf':'6s',  width:'110px',height:'110px',bottom:'16%',left:'2%', fontSize:'3rem'  }}>🕵️</div>
      <div className="bubble" style={{'--bf':'8s',  width:'88px', height:'88px', bottom:'10%',right:'3%',fontSize:'2.4rem'}}>✋</div>
      <div className="bubble" style={{'--bf':'5.5s',width:'78px', height:'78px', top:'46%',  left:'1%',  fontSize:'2rem'  }}>🎤</div>
      <div className="bubble" style={{'--bf':'9s',  width:'68px', height:'68px', top:'5%',   right:'20%',fontSize:'1.9rem'}}>🌟</div>
      <div className="bubble" style={{'--bf':'6.5s',width:'62px', height:'62px', bottom:'5%',left:'26%', fontSize:'1.7rem'}}>🎈</div>

      <div className="hp-page">

        <div className="hp-logo">
          <span className="hp-logo-star">✨</span>
          Play<span>Nest</span>
        </div>

        <div className="hp-card">

          <div className="hp-avatar-wrap">
            <div className="hp-avatar">🦁</div>
            <span className="sparkle" style={{'--ss':'5s', animationDelay:'0s'     }}>⭐</span>
            <span className="sparkle" style={{'--ss':'5s', animationDelay:'-1.25s' }}>✨</span>
            <span className="sparkle" style={{'--ss':'5s', animationDelay:'-2.5s'  }}>🌟</span>
            <span className="sparkle" style={{'--ss':'5s', animationDelay:'-3.75s' }}>💫</span>
          </div>

          <div className="hp-welcome-line">Welcome back</div>
          {/* ✅ REAL CHILD NAME from Firebase */}
          <div className="hp-child-name">{childName || 'Friend'}!</div>

          <div className={`hp-msg ${visible ? 'visible' : 'hidden'}`}>
            <span className="msg-dot"/>
            {MESSAGES[msgIdx]}
          </div>

          <div className="hp-chips">
            <div className="hp-chip">🔥 7 day streak!</div>
            <div className="hp-chip">🏆 20 plays this week</div>
            <div className="hp-chip">🎉 2 new games!</div>
          </div>

          <div className="hp-btn-group">
            {/* ✅ REAL CHILD NAME on button */}
            <button className="hp-btn-child" onClick={() => navigate('/child/dashboard')}>
              <div className="hp-btn-icon">🦁</div>
              I'm {childName || 'Friend'} — Let's Play!
              <span className="hp-btn-arrow">🚀</span>
            </button>

            <button className="hp-btn-parent" onClick={() => navigate('/parent/dashboard')}>
              🎨 &nbsp;Parent — Setup &amp; Manage Games
            </button>
          </div>
        </div>

        <div className="hp-games-strip">
          {GAMES.map(g => (
            <div className="hp-game-pill" key={g.label} style={{'--pf': g.delay}}>
              <span>{g.emoji}</span>{g.label}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default HomePage;
