import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import './PhotoMysterySetup.css';

// compress image before saving to Firestore
function compressImage(base64, maxWidth = 800) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio  = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
      canvas.width  = img.width  * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = base64;
  });
}

const DEFAULT_MYSTERIES = [
  { image: null, hint: 'I have four legs and say woof!',   answer: 'dog',      emoji: '🐶' },
  { image: null, hint: 'I am yellow and you peel me!',     answer: 'banana',   emoji: '🍌' },
  { image: null, hint: 'I am red and grow on trees!',      answer: 'apple',    emoji: '🍎' },
];

export default function PhotoMysterySetup() {
  const navigate = useNavigate();

  const [mysteries,   setMysteries]   = useState(DEFAULT_MYSTERIES);
  const [childName,   setChildName]   = useState('Arjun');
  const [blurLevels,  setBlurLevels]  = useState(5); // how many reveal steps
  const [timePerStep, setTimePerStep] = useState(3); // seconds between blur reductions
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [loading,     setLoading]     = useState(true);

  // Add mystery form
  const [newHint,     setNewHint]     = useState('');
  const [newAnswer,   setNewAnswer]   = useState('');
  const [newEmoji,    setNewEmoji]    = useState('🎁');
  const [newImage,    setNewImage]    = useState(null);
  const [dragOver,    setDragOver]    = useState(false);
  const fileRef = useRef();

  // ── Load from Firestore ──
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'gameSettings', 'photoMystery'));
        if (snap.exists()) {
          const d = snap.data();
          if (d.mysteries)   setMysteries(d.mysteries);
          if (d.childName)   setChildName(d.childName);
          if (d.blurLevels)  setBlurLevels(d.blurLevels);
          if (d.timePerStep) setTimePerStep(d.timePerStep);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setNewImage(e.target.result);
    reader.readAsDataURL(file);
  };

  const addMystery = async () => {
    if (!newHint.trim() || !newAnswer.trim()) return;
    let img = newImage;
    if (img) img = await compressImage(img);
    setMysteries(prev => [...prev, {
      image:  img,
      hint:   newHint.trim(),
      answer: newAnswer.trim().toLowerCase(),
      emoji:  newEmoji,
    }]);
    setNewHint(''); setNewAnswer(''); setNewImage(null); setNewEmoji('🎁');
  };

  const deleteMystery = (i) => setMysteries(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (mysteries.length === 0) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'gameSettings', 'photoMystery'), {
        mysteries, childName, blurLevels, timePerStep,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); setSaving(false); navigate('/parent/dashboard'); }, 1200);
    } catch (err) {
      const errMsg = err?.code || err?.message || 'Unknown error';
      if (errMsg.includes('permission-denied')) {
        alert('❌ Firebase Permission Denied!\n\nGo to Firebase Console → Firestore → Rules → update the date to 2027 and click Publish.');
      } else {
        alert('❌ Save failed: ' + errMsg);
      }
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="pm-setup-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'3rem',marginBottom:'16px'}}>⏳</div>
        <div style={{fontFamily:'Fredoka One,cursive',fontSize:'1.3rem',color:'#EC4899'}}>Loading...</div>
      </div>
    </div>
  );

  return (
    <div className="pm-setup-page">
      <div className="pm-setup-topbar">
        <div className="pm-setup-logo">✨ Play<span>Nest</span></div>
        <div className="pm-setup-title">🕵️ Photo Mystery Setup</div>
        <button className="pm-setup-back" onClick={() => navigate('/parent/dashboard')}>← Dashboard</button>
      </div>

      <div className="pm-setup-content">

        {/* INFO BANNER */}
        <div className="pm-setup-banner">
          <div className="pm-setup-banner-icon">💡</div>
          <div>
            <div className="pm-setup-banner-title">How Photo Mystery works</div>
            <div className="pm-setup-banner-sub">
              The child sees a super-blurry photo that slowly becomes clearer step by step.
              A hint is shown below. They type or tap their guess before the photo fully reveals!
              Upload your own photos or use emoji-only mysteries.
            </div>
          </div>
        </div>

        {/* STEP 1 — ADD MYSTERY */}
        <div className="pm-setup-card">
          <div className="pm-setup-step-header">
            <div className="pm-setup-step-num">1</div>
            <div>
              <div className="pm-setup-step-title">Add a Mystery 🔍</div>
              <div className="pm-setup-step-sub">Upload a photo (optional) + write a hint + set the answer</div>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="pm-setup-upload-label">📸 Photo (optional — leave blank for emoji only)</div>
          {!newImage ? (
            <div
              className={`pm-setup-dropzone ${dragOver ? 'drag-over' : ''}`}
              onClick={() => fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            >
              <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}}
                onChange={e => handleFile(e.target.files[0])} />
              <div className="pm-setup-drop-icon">📸</div>
              <div className="pm-setup-drop-text">Drag & Drop or Click to Upload</div>
              <div className="pm-setup-drop-sub">JPG, PNG • auto-compressed</div>
            </div>
          ) : (
            <div className="pm-setup-preview-wrap">
              <img src={newImage} alt="preview" className="pm-setup-preview-img"/>
              <button className="pm-setup-remove-img" onClick={() => setNewImage(null)}>❌ Remove</button>
            </div>
          )}

          {/* Form fields */}
          <div className="pm-setup-form-row">
            <div className="pm-setup-form-group" style={{flex:2}}>
              <label className="pm-setup-label">Hint (shown to child)</label>
              <input className="pm-setup-input"
                value={newHint}
                onChange={e => setNewHint(e.target.value)}
                placeholder="e.g. I have four legs and say woof!"
                maxLength={100}
              />
            </div>
            <div className="pm-setup-form-group">
              <label className="pm-setup-label">Answer (1-2 words)</label>
              <input className="pm-setup-input"
                value={newAnswer}
                onChange={e => setNewAnswer(e.target.value)}
                placeholder="e.g. dog"
                maxLength={30}
              />
            </div>
            <div className="pm-setup-form-group" style={{maxWidth:'90px'}}>
              <label className="pm-setup-label">Emoji</label>
              <input className="pm-setup-input pm-setup-emoji-input"
                value={newEmoji}
                onChange={e => setNewEmoji(e.target.value)}
                maxLength={4}
              />
            </div>
          </div>

          <button className="pm-setup-add-btn"
            onClick={addMystery}
            disabled={!newHint.trim() || !newAnswer.trim()}>
            ➕ Add Mystery
          </button>
        </div>

        {/* STEP 2 — MANAGE */}
        <div className="pm-setup-card">
          <div className="pm-setup-step-header">
            <div className="pm-setup-step-num">2</div>
            <div>
              <div className="pm-setup-step-title">Your Mysteries 🎭 ({mysteries.length})</div>
              <div className="pm-setup-step-sub">Tap 🗑️ to delete any mystery</div>
            </div>
          </div>

          {mysteries.length === 0 && (
            <div className="pm-setup-empty">No mysteries yet — add one above! 👆</div>
          )}

          <div className="pm-setup-mystery-list">
            {mysteries.map((m, i) => (
              <div key={i} className="pm-setup-mystery-row" style={{animationDelay: i*0.05+'s'}}>
                {m.image ? (
                  <img src={m.image} alt="mystery" className="pm-setup-mystery-thumb"/>
                ) : (
                  <div className="pm-setup-mystery-emoji">{m.emoji}</div>
                )}
                <div className="pm-setup-mystery-info">
                  <div className="pm-setup-mystery-hint">💬 "{m.hint}"</div>
                  <div className="pm-setup-mystery-answer">🔑 Answer: <strong>{m.answer}</strong></div>
                </div>
                <button className="pm-setup-del-btn" onClick={() => deleteMystery(i)}>🗑️</button>
              </div>
            ))}
          </div>
        </div>

        {/* STEP 3 — SETTINGS */}
        <div className="pm-setup-card">
          <div className="pm-setup-step-header">
            <div className="pm-setup-step-num">3</div>
            <div>
              <div className="pm-setup-step-title">Game Settings ⚙️</div>
              <div className="pm-setup-step-sub">Control how fast the photo reveals</div>
            </div>
          </div>
          <div className="pm-setup-settings-grid">
            <div className="pm-setup-setting">
              <div className="pm-setup-setting-label">🌫️ Reveal steps</div>
              <select className="pm-setup-select" value={blurLevels}
                onChange={e => setBlurLevels(parseInt(e.target.value))}>
                <option value={3}>3 steps (Fast)</option>
                <option value={5}>5 steps (Normal)</option>
                <option value={7}>7 steps (Slow)</option>
              </select>
            </div>
            <div className="pm-setup-setting">
              <div className="pm-setup-setting-label">⏱️ Seconds per step</div>
              <select className="pm-setup-select" value={timePerStep}
                onChange={e => setTimePerStep(parseInt(e.target.value))}>
                <option value={2}>2 seconds</option>
                <option value={3}>3 seconds</option>
                <option value={5}>5 seconds</option>
              </select>
            </div>
            <div className="pm-setup-setting" style={{gridColumn:'1 / -1'}}>
              <div className="pm-setup-setting-label">👦 Child name</div>
              <input className="pm-setup-input" value={childName}
                onChange={e => setChildName(e.target.value)} placeholder="Arjun"/>
            </div>
          </div>
        </div>

        {/* STEP 4 — SAVE */}
        <div className="pm-setup-card">
          <div className="pm-setup-step-header">
            <div className="pm-setup-step-num">4</div>
            <div>
              <div className="pm-setup-step-title">Save & Publish 🚀</div>
              <div className="pm-setup-step-sub">{childName} can play {mysteries.length} mystery{mysteries.length !== 1 ? 'ies' : ''} instantly!</div>
            </div>
          </div>
          <button className="pm-setup-save-btn" onClick={handleSave}
            disabled={saving || saved || mysteries.length === 0}>
            {saved  ? '✅ Saved! Going back...' :
             saving ? '⏳ Saving...' :
             '🎉 Save & Publish Game!'}
          </button>
        </div>

      </div>
    </div>
  );
}
