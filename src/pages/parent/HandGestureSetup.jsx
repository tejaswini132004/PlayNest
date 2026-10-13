import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import './HandGestureSetup.css';

const EMOJIS = ['✊','☝️','✌️','🤟','🖐','🖐'];

const DEFAULT_QUESTIONS = [
  { text: 'Show me the number', answer: 2 },
  { text: 'How many fingers?',  answer: 3 },
  { text: 'Hold up',            answer: 5 },
  { text: 'Show me',            answer: 1 },
  { text: 'Give me',            answer: 4 },
];

export default function HandGestureSetup() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [qText,     setQText]     = useState('');
  const [qAnswer,   setQAnswer]   = useState(2);
  const [timeLimit, setTimeLimit] = useState(8);
  const [holdTime,  setHoldTime]  = useState(1.5);
  const [orderMode, setOrderMode] = useState('shuffle');
  const [childName, setChildName] = useState('Arjun');
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [loading,   setLoading]   = useState(true);

  // Load from Firestore on mount
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'gameSettings', 'handGesture'));
        if (snap.exists()) {
          const d = snap.data();
          if (d.questions) setQuestions(d.questions);
          if (d.timeLimit) setTimeLimit(d.timeLimit);
          if (d.holdTime)  setHoldTime(d.holdTime);
          if (d.orderMode) setOrderMode(d.orderMode);
          if (d.childName) setChildName(d.childName);
        }
      } catch (err) {
        console.error('Load failed:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const addQuestion = () => {
    if (!qText.trim()) return;
    setQuestions(prev => [...prev, { text: qText.trim(), answer: qAnswer }]);
    setQText('');
  };

  const deleteQuestion = i => setQuestions(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (questions.length === 0) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'gameSettings', 'handGesture'), {
        questions, timeLimit, holdTime, orderMode, childName,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setSaving(false);
        navigate('/parent/dashboard');
      }, 1200);
    } catch (err) {
      console.error('Save failed:', err);
      setSaving(false);
      alert('Save failed! Check your internet connection.');
    }
  };

  if (loading) {
    return (
      <div className="hgs-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'3rem',marginBottom:'16px'}}>⏳</div>
          <div style={{fontFamily:'Fredoka One,cursive',fontSize:'1.3rem',color:'#059669'}}>Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="hgs-page">

      <div className="hgs-topbar">
        <div className="hgs-logo">✨ Play<span>Nest</span></div>
        <div className="hgs-tb-title">✋ Hand Gesture Setup</div>
        <button className="hgs-back-btn" onClick={() => navigate('/parent/dashboard')}>← Dashboard</button>
      </div>

      <div className="hgs-content">

        {/* STEP 1 — QUESTIONS */}
        <div className="hgs-card">
          <div className="hgs-step-header">
            <div className="hgs-step-num">1</div>
            <div>
              <div className="hgs-step-title">Build Your Questions ✏️</div>
              <div className="hgs-step-sub">Child answers by showing fingers on camera!</div>
            </div>
          </div>
          <div className="hgs-question-list">
            {questions.length === 0 && (
              <div className="hgs-empty">No questions yet — add one below! 👆</div>
            )}
            {questions.map((q, i) => (
              <div key={i} className="hgs-question-row" style={{animationDelay: i*0.05+'s'}}>
                <div className="hgs-q-num">{i+1}.</div>
                <div className="hgs-q-label">"{q.text}" → {q.answer}</div>
                <div className="hgs-q-badge">{EMOJIS[q.answer]} {q.answer} finger{q.answer!==1?'s':''}</div>
                <button className="hgs-q-del" onClick={() => deleteQuestion(i)}>🗑️</button>
              </div>
            ))}
          </div>
          <div className="hgs-add-form">
            <div className="hgs-form-group" style={{flex:2}}>
              <label className="hgs-form-label">Question Text</label>
              <input className="hgs-form-input" value={qText}
                onChange={e => setQText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addQuestion()}
                placeholder="e.g. Show me the number..." maxLength={60}/>
            </div>
            <div className="hgs-form-group">
              <label className="hgs-form-label">Answer (fingers)</label>
              <select className="hgs-form-select" value={qAnswer}
                onChange={e => setQAnswer(parseInt(e.target.value))}>
                {[0,1,2,3,4,5].map(n => (
                  <option key={n} value={n}>{EMOJIS[n]} {n} finger{n!==1?'s':''}</option>
                ))}
              </select>
            </div>
            <button className="hgs-add-btn" onClick={addQuestion}>➕ Add</button>
          </div>
        </div>

        {/* STEP 2 — SETTINGS */}
        <div className="hgs-card">
          <div className="hgs-step-header">
            <div className="hgs-step-num">2</div>
            <div>
              <div className="hgs-step-title">Game Settings ⚙️</div>
              <div className="hgs-step-sub">Customize how the game plays</div>
            </div>
          </div>
          <div className="hgs-settings-grid">
            <div className="hgs-setting-item">
              <div className="hgs-setting-label">⏱️ Time per question</div>
              <select className="hgs-setting-select" value={timeLimit}
                onChange={e => setTimeLimit(parseInt(e.target.value))}>
                <option value={5}>5 seconds</option>
                <option value={8}>8 seconds</option>
                <option value={12}>12 seconds</option>
                <option value={0}>No limit</option>
              </select>
            </div>
            <div className="hgs-setting-item">
              <div className="hgs-setting-label">🔄 Question order</div>
              <select className="hgs-setting-select" value={orderMode}
                onChange={e => setOrderMode(e.target.value)}>
                <option value="shuffle">Shuffle randomly</option>
                <option value="order">In order</option>
              </select>
            </div>
            <div className="hgs-setting-item">
              <div className="hgs-setting-label">✅ Hold to confirm</div>
              <select className="hgs-setting-select" value={holdTime}
                onChange={e => setHoldTime(parseFloat(e.target.value))}>
                <option value={1}>1 second</option>
                <option value={1.5}>1.5 seconds</option>
                <option value={2}>2 seconds</option>
              </select>
            </div>
            <div className="hgs-setting-item">
              <div className="hgs-setting-label">👦 Child name</div>
              <input className="hgs-setting-input" value={childName}
                onChange={e => setChildName(e.target.value)} placeholder="Arjun"/>
            </div>
          </div>
        </div>

        {/* STEP 3 — FINGER GUIDE */}
        <div className="hgs-card">
          <div className="hgs-step-header">
            <div className="hgs-step-num">3</div>
            <div>
              <div className="hgs-step-title">Finger Count Reference 🖐️</div>
              <div className="hgs-step-sub">How ml5.js counts fingers</div>
            </div>
          </div>
          <div className="hgs-finger-guide">
            {[['✊','0'],['☝️','1'],['✌️','2'],['🤟','3'],['🖐','4'],['🖐','5']].map(([e,n]) => (
              <div key={n} className="hgs-finger-item">
                <span className="hgs-finger-emoji">{e}</span>
                <span className="hgs-finger-num">{n}</span>
              </div>
            ))}
          </div>
        </div>

        {/* STEP 4 — SAVE */}
        <div className="hgs-card">
          <div className="hgs-step-header">
            <div className="hgs-step-num">4</div>
            <div>
              <div className="hgs-step-title">Save & Publish 🚀</div>
              <div className="hgs-step-sub">Saves to Firebase — {childName} sees it instantly!</div>
            </div>
          </div>
          <button className="hgs-save-btn" onClick={handleSave}
            disabled={saving || saved || questions.length === 0}>
            {saved  ? '✅ Saved to Firebase!' :
             saving ? '⏳ Saving...' :
             '🎉 Save & Publish Game!'}
          </button>
        </div>

      </div>
    </div>
  );
}
