import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import './VoiceSetup.css';

// ── CATEGORY TAGS — parent can tag questions ──
const CATEGORIES = [
  { id: 'animals',  label: '🐾 Animals',  color: '#059669', bg: '#ECFDF5' },
  { id: 'colors',   label: '🎨 Colors',   color: '#7C3AED', bg: '#F5F3FF' },
  { id: 'numbers',  label: '🔢 Numbers',  color: '#2563EB', bg: '#EFF6FF' },
  { id: 'food',     label: '🍎 Food',     color: '#EA580C', bg: '#FFF7ED' },
  { id: 'nature',   label: '🌿 Nature',   color: '#15803D', bg: '#F0FDF4' },
  { id: 'general',  label: '💬 General',  color: '#6B7280', bg: '#F9FAFB' },
];

const DEFAULT_QUESTIONS = [
  { text: 'What animal says moo?',            answer: 'cow',    category: 'animals'  },
  { text: 'What color is the sky?',            answer: 'blue',   category: 'colors'   },
  { text: 'What do you drink in the morning?', answer: 'milk',   category: 'food'     },
  { text: 'What fruit is yellow and long?',    answer: 'banana', category: 'food'     },
//  { text: 'What sound does a dog make?',       answer: 'woof',   category: 'animals'  },
];

export default function VoiceSetup() {
  const navigate = useNavigate();

  // ── SAVED DATA ──
  const [questions,  setQuestions]  = useState(DEFAULT_QUESTIONS);
  const [timeLimit,  setTimeLimit]  = useState(10);
  const [orderMode,  setOrderMode]  = useState('shuffle');
  const [childName,  setChildName]  = useState('Arjun');
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [loading,    setLoading]    = useState(true);

  // ── NEW QUESTION FORM ──
  const [qText,      setQText]      = useState('');
  const [qAnswer,    setQAnswer]    = useState('');
  const [qCategory,  setQCategory]  = useState('general');

  // ── EDITING STATE — which question is being edited ──
  const [editingIdx, setEditingIdx] = useState(null);  // null = not editing
  const [editText,   setEditText]   = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editCat,    setEditCat]    = useState('general');

  // ── FILTER BY CATEGORY ──
  const [filterCat,  setFilterCat]  = useState('all');

  // ── Load from Firestore on mount ──
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'gameSettings', 'voiceGame'));
        if (snap.exists()) {
          const d = snap.data();
          if (d.questions && d.questions.length > 0) setQuestions(d.questions);
          if (d.timeLimit) setTimeLimit(d.timeLimit);
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

  // ── ADD NEW QUESTION ──
  const addQuestion = () => {
    if (!qText.trim() || !qAnswer.trim()) return;
    setQuestions(prev => [...prev, {
      text:     qText.trim(),
      answer:   qAnswer.trim().toLowerCase(),
      category: qCategory,
    }]);
    setQText('');
    setQAnswer('');
    setQCategory('general');
  };

  // ── DELETE QUESTION ──
  const deleteQuestion = (i) => {
    if (editingIdx === i) setEditingIdx(null);
    setQuestions(prev => prev.filter((_, idx) => idx !== i));
  };

  // ── START EDITING ──
  const startEdit = (i) => {
    setEditingIdx(i);
    setEditText(questions[i].text);
    setEditAnswer(questions[i].answer);
    setEditCat(questions[i].category || 'general');
  };

  // ── SAVE EDIT ──
  const saveEdit = () => {
    if (!editText.trim() || !editAnswer.trim()) return;
    setQuestions(prev => prev.map((q, i) =>
      i === editingIdx
        ? { text: editText.trim(), answer: editAnswer.trim().toLowerCase(), category: editCat }
        : q
    ));
    setEditingIdx(null);
  };

  // ── CANCEL EDIT ──
  const cancelEdit = () => setEditingIdx(null);

  // ── MOVE QUESTION UP/DOWN ──
  const moveUp   = (i) => {
    if (i === 0) return;
    setQuestions(prev => {
      const a = [...prev];
      [a[i-1], a[i]] = [a[i], a[i-1]];
      return a;
    });
  };
  const moveDown = (i) => {
    if (i === questions.length - 1) return;
    setQuestions(prev => {
      const a = [...prev];
      [a[i], a[i+1]] = [a[i+1], a[i]];
      return a;
    });
  };

  // ── CLEAR ALL ──
  const clearAll = () => {
    if (window.confirm('Delete all questions? This cannot be undone.')) {
      setQuestions([]);
    }
  };

  // ── RESET TO DEFAULTS ──
  const resetDefaults = () => {
    if (window.confirm('Reset to default questions?')) {
      setQuestions(DEFAULT_QUESTIONS);
    }
  };

  // ── SAVE TO FIREBASE ──
  const handleSave = async () => {
    if (questions.length === 0) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'gameSettings', 'voiceGame'), {
        questions, timeLimit, orderMode, childName,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); setSaving(false); navigate('/parent/dashboard'); }, 1200);
    } catch (err) {
      console.error('Save failed:', err);
      setSaving(false);
      alert('Save failed! Check your connection.');
    }
  };

  // ── FILTERED QUESTIONS ──
  const filteredQuestions = filterCat === 'all'
    ? questions
    : questions.filter(q => q.category === filterCat);

  const getCatStyle = (catId) => {
    const cat = CATEGORIES.find(c => c.id === catId) || CATEGORIES[5];
    return { color: cat.color, background: cat.bg };
  };

  if (loading) {
    return (
      <div className="vs-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'3rem',marginBottom:'16px'}}>⏳</div>
          <div style={{fontFamily:'Fredoka One,cursive',fontSize:'1.3rem',color:'#2563EB'}}>Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="vs-page">

      {/* TOP BAR */}
      <div className="vs-topbar">
        <div className="vs-logo">✨ Play<span>Nest</span></div>
        <div className="vs-tb-title">🎤 Voice Recognition Setup</div>
        <button className="vs-back-btn" onClick={() => navigate('/parent/dashboard')}>← Dashboard</button>
      </div>

      <div className="vs-content">

        {/* INFO BANNER */}
        <div className="vs-info-banner">
          <div className="vs-info-icon">💡</div>
          <div className="vs-info-text">
            <div className="vs-info-title">How this game works</div>
            <div className="vs-info-sub">
              Add a question and a one-word answer. The child hears the question spoken aloud,
              taps the mic, and says the answer. You can edit or reorder any question anytime!
            </div>
          </div>
        </div>

        {/* ─── STEP 1: ADD QUESTION ─── */}
        <div className="vs-card">
          <div className="vs-step-header">
            <div className="vs-step-num">1</div>
            <div>
              <div className="vs-step-title">Add a New Question ✏️</div>
              <div className="vs-step-sub">Keep answers short — 1 or 2 words work best!</div>
            </div>
          </div>

          <div className="vs-add-form">
            {/* Question input */}
            <div className="vs-form-group vs-form-wide">
              <label className="vs-form-label">Question</label>
              <input className="vs-form-input"
                value={qText}
                onChange={e => setQText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addQuestion()}
                placeholder="e.g. What animal says moo?"
                maxLength={100}
              />
            </div>

            {/* Answer input */}
            <div className="vs-form-group">
              <label className="vs-form-label">Answer</label>
              <input className="vs-form-input"
                value={qAnswer}
                onChange={e => setQAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addQuestion()}
                placeholder="e.g. cow"
                maxLength={40}
              />
            </div>

            {/* Category selector */}
            <div className="vs-form-group">
              <label className="vs-form-label">Category</label>
              <select className="vs-form-select" value={qCategory}
                onChange={e => setQCategory(e.target.value)}>
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Add button */}
            <button
              className="vs-add-btn"
              onClick={addQuestion}
              disabled={!qText.trim() || !qAnswer.trim()}
            >
              ➕ Add Question
            </button>
          </div>
        </div>

        {/* ─── STEP 2: MANAGE QUESTIONS ─── */}
        <div className="vs-card">
          <div className="vs-step-header">
            <div className="vs-step-num">2</div>
            <div>
              <div className="vs-step-title">Manage Questions 📋</div>
              <div className="vs-step-sub">{questions.length} question{questions.length !== 1 ? 's' : ''} saved — tap ✏️ to edit, 🗑️ to delete</div>
            </div>
          </div>

          {/* Category filter tabs */}
          <div className="vs-filter-tabs">
            <button
              className={`vs-filter-tab ${filterCat === 'all' ? 'active' : ''}`}
              onClick={() => setFilterCat('all')}
            >
              All ({questions.length})
            </button>
            {CATEGORIES.map(cat => {
              const count = questions.filter(q => q.category === cat.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat.id}
                  className={`vs-filter-tab ${filterCat === cat.id ? 'active' : ''}`}
                  style={filterCat === cat.id ? { background: cat.color, color: 'white', borderColor: cat.color } : {}}
                  onClick={() => setFilterCat(cat.id)}
                >
                  {cat.label.split(' ')[0]} {cat.label.split(' ')[1]} ({count})
                </button>
              );
            })}
          </div>

          {/* Question list */}
          <div className="vs-question-list">
            {filteredQuestions.length === 0 && (
              <div className="vs-empty">
                {questions.length === 0
                  ? 'No questions yet — add one above! 👆'
                  : 'No questions in this category.'}
              </div>
            )}

            {filteredQuestions.map((q, displayIdx) => {
              // Get real index for edit/delete/move operations
              const realIdx = questions.indexOf(q);
              const catStyle = getCatStyle(q.category);

              // ── EDITING THIS QUESTION ──
              if (editingIdx === realIdx) {
                return (
                  <div key={realIdx} className="vs-question-row vs-editing">
                    <div className="vs-edit-form">
                      <div className="vs-edit-row">
                        <div className="vs-form-group vs-form-wide">
                          <label className="vs-form-label">Question</label>
                          <input className="vs-form-input"
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            autoFocus
                            maxLength={100}
                          />
                        </div>
                        <div className="vs-form-group">
                          <label className="vs-form-label">Answer</label>
                          <input className="vs-form-input"
                            value={editAnswer}
                            onChange={e => setEditAnswer(e.target.value)}
                            maxLength={40}
                          />
                        </div>
                        <div className="vs-form-group">
                          <label className="vs-form-label">Category</label>
                          <select className="vs-form-select" value={editCat}
                            onChange={e => setEditCat(e.target.value)}>
                            {CATEGORIES.map(c => (
                              <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="vs-edit-actions">
                        <button className="vs-save-edit-btn" onClick={saveEdit}>✅ Save Changes</button>
                        <button className="vs-cancel-edit-btn" onClick={cancelEdit}>❌ Cancel</button>
                      </div>
                    </div>
                  </div>
                );
              }

              // ── NORMAL DISPLAY ──
              return (
                <div key={realIdx} className="vs-question-row" style={{animationDelay: displayIdx * 0.04 + 's'}}>

                  {/* Reorder arrows */}
                  <div className="vs-reorder">
                    <button className="vs-arrow-btn" onClick={() => moveUp(realIdx)}
                      disabled={realIdx === 0} title="Move up">▲</button>
                    <span className="vs-q-num">{realIdx + 1}</span>
                    <button className="vs-arrow-btn" onClick={() => moveDown(realIdx)}
                      disabled={realIdx === questions.length - 1} title="Move down">▼</button>
                  </div>

                  {/* Question content */}
                  <div className="vs-q-content">
                    <div className="vs-q-text">"{q.text}"</div>
                    <div className="vs-q-meta">
                      <span className="vs-q-answer">🎤 Answer: <strong>{q.answer}</strong></span>
                      <span className="vs-q-cat" style={catStyle}>
                        {CATEGORIES.find(c => c.id === q.category)?.label || '💬 General'}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="vs-q-actions">
                    <button className="vs-edit-btn" onClick={() => startEdit(realIdx)} title="Edit">✏️</button>
                    <button className="vs-del-btn"  onClick={() => deleteQuestion(realIdx)} title="Delete">🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom actions */}
          {questions.length > 0 && (
            <div className="vs-list-footer">
              <button className="vs-reset-btn" onClick={resetDefaults}>🔄 Reset to Defaults</button>
              <button className="vs-clear-btn" onClick={clearAll}>🗑️ Clear All</button>
            </div>
          )}
        </div>

        {/* ─── STEP 3: SETTINGS ─── */}
        <div className="vs-card">
          <div className="vs-step-header">
            <div className="vs-step-num">3</div>
            <div>
              <div className="vs-step-title">Game Settings ⚙️</div>
              <div className="vs-step-sub">Customize how the game plays</div>
            </div>
          </div>
          <div className="vs-settings-grid">
            <div className="vs-setting-item">
              <div className="vs-setting-label">⏱️ Time per question</div>
              <select className="vs-setting-select" value={timeLimit}
                onChange={e => setTimeLimit(parseInt(e.target.value))}>
                <option value={8}>8 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={15}>15 seconds</option>
                <option value={0}>No limit</option>
              </select>
            </div>
            <div className="vs-setting-item">
              <div className="vs-setting-label">🔄 Question order</div>
              <select className="vs-setting-select" value={orderMode}
                onChange={e => setOrderMode(e.target.value)}>
                <option value="shuffle">Shuffle randomly</option>
                <option value="order">In order</option>
              </select>
            </div>
            <div className="vs-setting-item" style={{gridColumn:'1 / -1'}}>
              <div className="vs-setting-label">👦 Child name</div>
              <input className="vs-setting-input" value={childName}
                onChange={e => setChildName(e.target.value)}
                placeholder="Arjun"/>
            </div>
          </div>
        </div>

        {/* ─── STEP 4: TIPS ─── */}
        <div className="vs-card">
          <div className="vs-step-header">
            <div className="vs-step-num">4</div>
            <div>
              <div className="vs-step-title">Tips for Good Questions 💡</div>
              <div className="vs-step-sub">Follow these to get the best speech recognition results</div>
            </div>
          </div>
          <div className="vs-tips-grid">
            {[
              ['✅', '#059669', '#F0FDF4', 'Keep answers to 1 word',          '"cow", "blue", "five"'],
              ['✅', '#059669', '#F0FDF4', 'Use simple words children know',   '"What does a cat say?" → meow'],
              ['✅', '#059669', '#F0FDF4', 'Clear pronunciation matters',      '"What is 2+2?" → four'],
              ['❌', '#DC2626', '#FFF1F2', 'Avoid multi-word answers',         '"red and blue" is harder to match'],
              ['❌', '#DC2626', '#FFF1F2', 'Avoid similar sounding words',     '"ship/chip" may confuse the mic'],
              ['❌', '#DC2626', '#FFF1F2', 'Avoid very long questions',        'Children lose focus after 10 words'],
            ].map(([icon, color, bg, tip, example], i) => (
              <div key={i} className="vs-tip-row" style={{background: bg, borderColor: color + '44'}}>
                <span style={{fontSize:'1.1rem'}}>{icon}</span>
                <span className="vs-tip-text" style={{color:'#1E1B4B'}}>{tip}</span>
                <span className="vs-tip-example">e.g. {example}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── STEP 5: SAVE ─── */}
        <div className="vs-card">
          <div className="vs-step-header">
            <div className="vs-step-num">5</div>
            <div>
              <div className="vs-step-title">Save & Publish 🚀</div>
              <div className="vs-step-sub">
                {childName} will see {questions.length} question{questions.length !== 1 ? 's' : ''} instantly!
              </div>
            </div>
          </div>
          <button className="vs-save-btn" onClick={handleSave}
            disabled={saving || saved || questions.length === 0}>
            {saved   ? '✅ Saved! Going back to Dashboard...' :
             saving  ? '⏳ Saving to Firebase...' :
             `🎉 Save & Publish ${questions.length} Question${questions.length !== 1 ? 's' : ''}!`}
          </button>
          {questions.length === 0 && (
            <div className="vs-save-warning">⚠️ Add at least one question before saving!</div>
          )}
        </div>

      </div>
    </div>
  );
}
