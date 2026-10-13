import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import './ShadowSetup.css';

// ── 30 BUILT-IN SHADOW PAIRS (emoji + label) ──
const BUILT_IN_PAIRS = [
  { id:'cat',      emoji:'🐱', label:'Cat'      },
  { id:'dog',      emoji:'🐶', label:'Dog'      },
  { id:'elephant', emoji:'🐘', label:'Elephant' },
  { id:'rabbit',   emoji:'🐰', label:'Rabbit'   },
  { id:'fish',     emoji:'🐟', label:'Fish'     },
  { id:'butterfly',emoji:'🦋', label:'Butterfly'},
  { id:'bird',     emoji:'🐦', label:'Bird'     },
  { id:'lion',     emoji:'🦁', label:'Lion'     },
  { id:'apple',    emoji:'🍎', label:'Apple'    },
  { id:'banana',   emoji:'🍌', label:'Banana'   },
  { id:'star',     emoji:'⭐', label:'Star'     },
  { id:'heart',    emoji:'❤️', label:'Heart'    },
  { id:'sun',      emoji:'☀️', label:'Sun'      },
  { id:'moon',     emoji:'🌙', label:'Moon'     },
  { id:'tree',     emoji:'🌳', label:'Tree'     },
  { id:'flower',   emoji:'🌸', label:'Flower'   },
  { id:'house',    emoji:'🏠', label:'House'    },
  { id:'car',      emoji:'🚗', label:'Car'      },
  { id:'plane',    emoji:'✈️', label:'Plane'    },
  { id:'ball',     emoji:'⚽', label:'Ball'     },
];

const DEFAULT_SELECTED = ['cat','dog','elephant','rabbit','apple','banana','star','sun'];

export default function ShadowSetup() {
  const navigate = useNavigate();

  const [selectedIds,  setSelectedIds]  = useState(DEFAULT_SELECTED);
  const [difficulty,   setDifficulty]   = useState('easy');   // easy=4, medium=6, hard=8
  const [childName,    setChildName]    = useState('Arjun');
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [loading,      setLoading]      = useState(true);

  const diffMap = { easy: 4, medium: 6, hard: 8 };

  // ── Load from Firestore ──
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'gameSettings', 'shadowMatch'));
        if (snap.exists()) {
          const d = snap.data();
          if (d.selectedIds) setSelectedIds(d.selectedIds);
          if (d.difficulty)  setDifficulty(d.difficulty);
          if (d.childName)   setChildName(d.childName);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const toggleItem = (id) => {
    const max = diffMap[difficulty];
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= max) {
        // remove first, add new
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  // Keep selection count in sync when difficulty changes
  useEffect(() => {
    const max = diffMap[difficulty];
    if (selectedIds.length > max) setSelectedIds(prev => prev.slice(0, max));
    if (selectedIds.length < max) {
      const available = BUILT_IN_PAIRS.filter(p => !selectedIds.includes(p.id));
      const needed = max - selectedIds.length;
      setSelectedIds(prev => [...prev, ...available.slice(0, needed).map(p => p.id)]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'gameSettings', 'shadowMatch'), {
        selectedIds, difficulty, childName,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); setSaving(false); navigate('/parent/dashboard'); }, 1200);
    } catch (err) {
      console.error(err);
      setSaving(false);
      alert('Save failed! Check your connection.');
    }
  };

  if (loading) return (
    <div className="ss-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'3rem',marginBottom:'16px'}}>⏳</div>
        <div style={{fontFamily:'Fredoka One,cursive',fontSize:'1.3rem',color:'#1E1B4B'}}>Loading...</div>
      </div>
    </div>
  );

  const max = diffMap[difficulty];

  return (
    <div className="ss-page">
      <div className="ss-topbar">
        <div className="ss-logo">✨ Play<span>Nest</span></div>
        <div className="ss-tb-title">🌑 Shadow Match Setup</div>
        <button className="ss-back-btn" onClick={() => navigate('/parent/dashboard')}>← Dashboard</button>
      </div>

      <div className="ss-content">

        {/* INFO BANNER */}
        <div className="ss-info-banner">
          <div className="ss-info-icon">💡</div>
          <div className="ss-info-text">
            <div className="ss-info-title">How Shadow Match works</div>
            <div className="ss-info-sub">
              The child sees a coloured object on the left and its black shadow on the right — but all shadows are shuffled!
              They drag each shadow to match its correct object. Pick which objects to include below.
            </div>
          </div>
        </div>

        {/* STEP 1 — DIFFICULTY */}
        <div className="ss-card">
          <div className="ss-step-header">
            <div className="ss-step-num">1</div>
            <div>
              <div className="ss-step-title">Choose Difficulty 🎯</div>
              <div className="ss-step-sub">This sets how many shadow pairs appear in one round</div>
            </div>
          </div>
          <div className="ss-diff-grid">
            {[
              { key:'easy',   label:'Easy',   desc:'4 pairs',  emoji:'😊', color:'#34D399', light:'#F0FDF4' },
              { key:'medium', label:'Medium', desc:'6 pairs',  emoji:'🤔', color:'#FBBF24', light:'#FFFBEB' },
              { key:'hard',   label:'Hard',   desc:'8 pairs',  emoji:'🤯', color:'#F472B6', light:'#FDF2F8' },
            ].map(d => (
              <div key={d.key}
                className={`ss-diff-card ${difficulty === d.key ? 'selected' : ''}`}
                style={{'--dc': d.color, '--dl': d.light}}
                onClick={() => setDifficulty(d.key)}
              >
                {difficulty === d.key && <div className="ss-diff-check">✓</div>}
                <div className="ss-diff-emoji">{d.emoji}</div>
                <div className="ss-diff-label">{d.label}</div>
                <div className="ss-diff-desc">{d.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* STEP 2 — PICK OBJECTS */}
        <div className="ss-card">
          <div className="ss-step-header">
            <div className="ss-step-num">2</div>
            <div>
              <div className="ss-step-title">Pick Objects 🐾</div>
              <div className="ss-step-sub">
                Select exactly {max} objects — {selectedIds.length}/{max} selected
              </div>
            </div>
          </div>
          <div className="ss-objects-grid">
            {BUILT_IN_PAIRS.map(pair => {
              const selected = selectedIds.includes(pair.id);
              return (
                <div key={pair.id}
                  className={`ss-obj-card ${selected ? 'selected' : ''}`}
                  onClick={() => toggleItem(pair.id)}
                >
                  {selected && <div className="ss-obj-check">✓</div>}
                  <div className="ss-obj-emoji">{pair.emoji}</div>
                  <div className="ss-obj-label">{pair.label}</div>
                </div>
              );
            })}
          </div>
          <div className="ss-selection-info">
            {selectedIds.length < max
              ? `Pick ${max - selectedIds.length} more object${max - selectedIds.length !== 1 ? 's' : ''}!`
              : `✅ Perfect! ${max} objects selected.`}
          </div>
        </div>

        {/* STEP 3 — SETTINGS */}
        <div className="ss-card">
          <div className="ss-step-header">
            <div className="ss-step-num">3</div>
            <div>
              <div className="ss-step-title">Settings ⚙️</div>
              <div className="ss-step-sub">Child name shown on win screen</div>
            </div>
          </div>
          <div className="ss-setting-item">
            <div className="ss-setting-label">👦 Child name</div>
            <input className="ss-setting-input" value={childName}
              onChange={e => setChildName(e.target.value)} placeholder="Arjun"/>
          </div>
        </div>

        {/* STEP 4 — SAVE */}
        <div className="ss-card">
          <div className="ss-step-header">
            <div className="ss-step-num">4</div>
            <div>
              <div className="ss-step-title">Save & Publish 🚀</div>
              <div className="ss-step-sub">{childName} can play instantly!</div>
            </div>
          </div>
          <button className="ss-save-btn" onClick={handleSave}
            disabled={saving || saved || selectedIds.length < max}>
            {saved  ? '✅ Saved! Going back...' :
             saving ? '⏳ Saving...' :
             '🎉 Save & Publish Game!'}
          </button>
        </div>

      </div>
    </div>
  );
}
