import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StarsBg from '../../components/StarsBg';
import './ChildDashboard.css';

const GAMES = [
  {
    id: 1,
    emoji: '🧩',
    title: 'Picture Puzzle',
    bg: 'linear-gradient(145deg,#7C3AED,#A78BFA)',
    stars: 4,
    plays: 12,
    isNew: false,
    path: '/child/play/puzzle',
    wide: false,
  },
  {
    id: 2,
    emoji: '🌑',
    title: 'Shadow Match',
    bg: 'linear-gradient(145deg,#F97316,#FBBF24)',
    stars: 3,
    plays: 8,
    isNew: true,
    path: '/child/play/shadow',
    wide: false,
  },
  {
    id: 3,
    emoji: '🕵️',
    title: 'Photo Mystery',
    bg: 'linear-gradient(145deg,#EC4899,#F472B6)',
    stars: 5,
    plays: 15,
    isNew: false,
    path: '/child/play/photo',
    wide: false,
  },
  {
    id: 4,
    emoji: '✋',
    title: 'Hand Gesture MCQ',
    bg: 'linear-gradient(145deg,#059669,#34D399)',
    stars: 2,
    plays: 6,
    isNew: true,
    path: '/child/play/mcq',
    wide: false,
  },
  {
    id: 5,
    emoji: '🎤',
    title: 'Voice Recognition',
    bg: 'linear-gradient(145deg,#0284C7,#38BDF8)',
    stars: 5,
    plays: 20,
    isNew: false,
    path: '/child/play/voice',
    wide: true, // spans full width
  },
];

const ACHIEVEMENTS = [
  { icon:'🔥', bg:'#FEF9C3', name:'Streak Star!',    desc:'7 days in a row',         earned: true  },
  { icon:'🧩', bg:'#EDE9FE', name:'Puzzle Master!',  desc:'Solved 10 puzzles',        earned: true  },
  { icon:'🎤', bg:'#DCFCE7', name:'Voice Champion!', desc:'10 correct voice answers', earned: true  },
  { icon:'🌟', bg:'#F3F4F6', name:'Super Star!',     desc:'Play all 5 games',         earned: false },
  { icon:'🏆', bg:'#F3F4F6', name:'Champion!',       desc:'Get 5 stars on all games', earned: false },
  { icon:'🕵️', bg:'#FFF0FB', name:'Detective!',      desc:'Guessed 5 photo mysteries',earned: true  },
];

// Render star rating
function StarRating({ count }) {
  return (
    <div className="cd-card-stars">
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ animationDelay:`${i*0.2}s` }}>
          {i <= count ? '⭐' : '☆'}
        </span>
      ))}
    </div>
  );
}

function ChildDashboard() {
  const navigate = useNavigate();

  return (
    <div className="cd-wrapper">
      <StarsBg />

      <div className="cd-page">

        {/* ── TOP BAR ── */}
        <div className="cd-topbar">
          <div className="cd-logo">
            <span className="cd-logo-star">✨</span>
            Play<span>Nest</span>
          </div>
          <button className="cd-back-btn" onClick={() => navigate('/home')}>
            🏠 Home
          </button>
        </div>

        {/* ── WELCOME BANNER ── */}
        <div className="cd-welcome">
          <div className="cd-welcome-left">
            <div className="cd-greeting">
              Hey, <span>Arjun!</span> 👋
            </div>
            <div className="cd-subgreeting">
              It's a great day to learn something new!
            </div>
            <div className="cd-streak-badge">
              🔥 7 Day Streak! Keep it up!
            </div>
          </div>
          <div className="cd-welcome-avatar">🦁</div>
        </div>

        {/* ── STARS COUNTER ── */}
        <div className="cd-stars-bar">
          <div className="cd-stars-icon">⭐</div>
          <div className="cd-stars-info">
            <div className="cd-stars-title">Your Stars — Keep collecting! ✨</div>
            <div className="cd-stars-track">
              <div className="cd-stars-fill" />
            </div>
          </div>
          <div className="cd-stars-count">68 / 100 ⭐</div>
        </div>

        {/* ── GAMES GRID ── */}
        <div className="cd-section-title">
          🎮 <span>My Games</span>
        </div>

        <div className="cd-games-grid">
          {GAMES.map((g, i) => (
            <div
              key={g.id}
              className={`cd-game-card ${g.wide ? 'wide' : ''}`}
              style={{
                background: g.bg,
                '--cd': `${0.1 + i * 0.08}s`,
              }}
              onClick={() => navigate(g.path)}
            >
              {g.isNew && <div className="cd-new-badge">NEW ✨</div>}

              {g.wide ? (
                /* Wide card layout (Voice Recognition) */
                <div className="cd-card-top wide-layout">
                  <div className="cd-card-emoji" style={{'--ef':'4.2s'}}>
                    {g.emoji}
                  </div>
                  <div className="cd-card-wide-info">
                    <div className="cd-card-title">{g.title}</div>
                    <StarRating count={g.stars} />
                    <div className="cd-card-best">
                      🏆 Your best game! {g.plays} plays
                    </div>
                  </div>
                  <button className="cd-play-btn large">▶️ Play Now!</button>
                </div>
              ) : (
                /* Normal card layout */
                <>
                  <div className="cd-card-top">
                    <div className="cd-card-emoji" style={{'--ef':`${3.5 + i * 0.3}s`}}>
                      {g.emoji}
                    </div>
                    <div className="cd-card-title">{g.title}</div>
                    <StarRating count={g.stars} />
                  </div>
                  <div className="cd-card-bottom">
                    <div className="cd-card-plays">🕹️ {g.plays} plays</div>
                    <button className="cd-play-btn">▶️ Play</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* ── ACHIEVEMENTS ── */}
        <div className="cd-section-title">
          🏆 <span>My Achievements</span>
        </div>

        <div className="cd-achievements-grid">
          {ACHIEVEMENTS.map((a, i) => (
            <div
              key={a.name}
              className={`cd-badge-card ${!a.earned ? 'locked' : ''}`}
              style={{'--bd': `${0.1 + i * 0.08}s`}}
            >
              <div className="cd-badge-icon" style={{background: a.bg}}>
                {a.icon}
              </div>
              <div>
                <div className="cd-badge-name">{a.name}</div>
                <div className="cd-badge-desc">{a.desc}</div>
              </div>
              {a.earned
                ? <div className="cd-badge-earned">✅ Earned</div>
                : <div className="cd-badge-locked">🔒</div>
              }
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default ChildDashboard;