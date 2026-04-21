import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ParentDashboard.css';
import { useUserData } from '../../hooks/useUserData';

const GAMES = [
  {
    id: 1,
    emoji: '🧩',
    title: 'Picture Puzzle',
    desc: 'Upload a family photo — child solves it as a jigsaw puzzle!',
    color: '#7C3AED',
    light: '#F5F3FF',
    setupPath: '/parent/setup/puzzle',  // ← goes to PuzzleSetup page
    ready: true,
  },
  {
    id: 4,
    emoji: '✋',
    title: 'Hand Gesture MCQ',
    desc: 'Add questions — child answers by showing fingers on camera!',
    color: '#059669',
    light: '#F0FDF4',
    setupPath: '/parent/setup/gesture',
    ready: true,
  },
  {
    id: 2,
    emoji: '🌑',
    title: 'Shadow Match',
    desc: 'Match objects to their correct shadow shapes.',
    color: '#1E1B4B',
    light: '#EDE9FE',
    setupPath: '/parent/setup/shadow',
    ready: true,
  },
  {
    id: 3,
    emoji: '🕵️',
    title: 'Photo Mystery',
    desc: 'Show a blurry photo — can your child guess what it is?',
    color: '#EC4899',
    light: '#FDF2F8',
    setupPath: null,
    ready: false,
  },
  {
    id: 5,
    emoji: '🎤',
    title: 'Voice Recognition',
    desc: 'Speak the answer out loud — mic detects the response!',
    color: '#2563EB',
    light: '#EFF6FF',
    setupPath: '/parent/setup/voice',   // ← add this
  ready: true, 
  },
];

export default function ParentDashboard() {
  const { childName, parentName } = useUserData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab]   = useState('games');
  // Read saved puzzle settings from localStorage to show status
  const [puzzlePhoto,      setPuzzlePhoto]      = useState(null);
  const [puzzleGridSize,   setPuzzleGridSize]   = useState(2);

  useEffect(() => {
    const img  = localStorage.getItem('pg_uploadedImage');
    const size = localStorage.getItem('pg_gridSize');
    if (img)  setPuzzlePhoto(img);
    if (size) setPuzzleGridSize(parseInt(size));
  }, []);

  const diffLabel = { 2:'Easy (2×2)', 3:'Medium (3×3)', 4:'Hard (4×4)' };

  return (
    <div className="pd-page">

      {/* TOP BAR */}
      <div className="pd-topbar">
        <div className="pd-logo">✨ Play<span>Nest</span></div>
        <div className="pd-tb-center">🎨 Parent Dashboard</div>
        <button className="pd-tb-btn" onClick={() => navigate('/home')}>🏠 Home</button>
      </div>

      {/* WELCOME BANNER */}
      <div className="pd-banner">
        <div className="pd-banner-content">
          <div className="pd-banner-avatar">👨‍👩‍👦</div>
          <div>
            <div className="pd-banner-title">Welcome back! 👋</div>
            <div className="pd-banner-sub">Set up and manage games for <strong>${childName}</strong></div>
          </div>
        </div>
        <div className="pd-banner-stats">
          <div className="pd-stat"><span className="pd-stat-num">5</span><span className="pd-stat-label">Games</span></div>
          <div className="pd-stat"><span className="pd-stat-num">2</span><span className="pd-stat-label">Active</span></div>
          <div className="pd-stat"><span className="pd-stat-num">20</span><span className="pd-stat-label">Plays</span></div>
        </div>
      </div>

      {/* TABS */}
      <div className="pd-tabs-wrap">
        <div className="pd-tabs">
          <button className={`pd-tab ${activeTab==='games'?'active':''}`}    onClick={()=>setActiveTab('games')}>🎮 Manage Games</button>
          <button className={`pd-tab ${activeTab==='progress'?'active':''}`} onClick={()=>setActiveTab('progress')}>📊 Progress</button>
        </div>
      </div>

      <div className="pd-content">

        {/* ── GAMES TAB ── */}
        {activeTab === 'games' && (
          <div className="pd-games-grid">
            {GAMES.map((g, i) => (
              <div key={g.id} className="pd-game-card"
                style={{'--gc':g.color,'--gl':g.light, animationDelay:`${i*0.08}s`}}>

                <div className="pd-game-top">
                  <div className="pd-game-emoji">{g.emoji}</div>
                  <div className={`pd-game-badge ${g.ready?'ready':'coming'}`}>
                    {g.ready ? '✅ Active' : '🔜 Coming Soon'}
                  </div>
                </div>

                <div className="pd-game-title">{g.title}</div>
                <div className="pd-game-desc">{g.desc}</div>

                {/* ── PUZZLE PREVIEW — shows saved photo ── */}
                {g.id === 1 && (
                  <div className="pd-puzzle-preview">
                    {puzzlePhoto ? (
                      <div className="pd-puzzle-saved">
                        <img src={puzzlePhoto} alt="Saved puzzle" className="pd-puzzle-thumb"/>
                        <div className="pd-puzzle-info">
                          <div className="pd-puzzle-info-title">📸 Photo saved!</div>
                          <div className="pd-puzzle-info-sub">Difficulty: {diffLabel[puzzleGridSize]}</div>
                          <div className="pd-puzzle-info-sub" style={{color:'#059669',fontWeight:800}}>
                            ✅ ${childName} can play this now
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="pd-puzzle-empty">
                        📸 No photo uploaded yet — click Setup to add one!
                      </div>
                    )}
                  </div>
                )}

                <div className="pd-game-actions">
                  <button
                    className="pd-btn-edit"
                    onClick={() => g.setupPath && navigate(g.setupPath)}
                    disabled={!g.ready}
                  >
                    ✏️ Setup Game
                  </button>
                  <button
                    className="pd-btn-preview"
                    onClick={() => {
                      if (g.id === 1) navigate('/child/play/puzzle');
                      else if (g.setupPath) navigate(g.setupPath);
                    }}
                    disabled={!g.ready}
                  >
                    👁️ Preview
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PROGRESS TAB ── */}
        {activeTab === 'progress' && (
          <div className="pd-progress-section">
            <div className="pd-prog-card">
              <div className="pd-prog-card-title">📈 ${childName}'s Activity This Week</div>
              <div className="pd-prog-rows">
                {[
                  { emoji:'🧩', name:'Picture Puzzle',   plays:12, stars:4 },
                  { emoji:'✋', name:'Hand Gesture MCQ', plays:6,  stars:2 },
                  { emoji:'🌑', name:'Shadow Match',     plays:8,  stars:3 },
                  { emoji:'🕵️', name:'Photo Mystery',    plays:15, stars:5 },
                  { emoji:'🎤', name:'Voice Recognition',plays:20, stars:5 },
                ].map(g => (
                  <div key={g.name} className="pd-prog-row">
                    <div className="pd-prog-row-emoji">{g.emoji}</div>
                    <div className="pd-prog-row-name">{g.name}</div>
                    <div className="pd-prog-row-stars">{'⭐'.repeat(g.stars)}</div>
                    <div className="pd-prog-row-plays">{g.plays} plays</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pd-prog-card">
              <div className="pd-prog-card-title">🏆 Recent Achievements</div>
              <div className="pd-achievements">
                {[
                  { icon:'🔥', name:'7 Day Streak!',    desc:'Played 7 days in a row',   earned:true  },
                  { icon:'🧩', name:'Puzzle Master!',    desc:'Solved 10 puzzles',         earned:true  },
                  { icon:'🎤', name:'Voice Champion!',   desc:'10 correct voice answers',  earned:true  },
                  { icon:'🌟', name:'Super Star!',       desc:'Play all 5 games',          earned:false },
                ].map(a => (
                  <div key={a.name} className={`pd-ach-badge ${a.earned?'earned':'locked'}`}>
                    <div className="pd-ach-icon">{a.icon}</div>
                    <div className="pd-ach-name">{a.name}</div>
                    <div className="pd-ach-desc">{a.desc}</div>
                    <div className="pd-ach-status">{a.earned ? '✅ Earned' : '🔒 Locked'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
