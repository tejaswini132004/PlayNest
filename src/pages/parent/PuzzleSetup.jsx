import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import './PuzzleSetup.css';

const DIFFICULTIES = [
  { size:2, label:'Easy',   desc:'2×2 · 4 pieces',  emoji:'😊', color:'#34D399', light:'#F0FDF4' },
  { size:3, label:'Medium', desc:'3×3 · 9 pieces',  emoji:'🤔', color:'#FBBF24', light:'#FFFBEB' },
  { size:4, label:'Hard',   desc:'4×4 · 16 pieces', emoji:'🤯', color:'#F472B6', light:'#FDF2F8' },
];

// Compress image before saving to Firestore (keeps it under 1MB)
function compressImage(base64, maxWidth = 800) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
      canvas.width  = img.width  * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7)); // 70% quality JPEG
    };
    img.src = base64;
  });
}

export default function PuzzleSetup() {
  const navigate = useNavigate();
  const [uploadedImage, setUploadedImage] = useState(null);
  const [gridSize,      setGridSize]      = useState(2);
  const [dragOver,      setDragOver]      = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [photos,        setPhotos]        = useState([]); // all saved photos
  const fileRef = useRef();

  // Load existing settings from Firestore on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const docRef = doc(db, 'gameSettings', 'puzzleGame');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.photos) setPhotos(data.photos); // [{image, gridSize}]
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setUploadedImage(e.target.result);
    reader.readAsDataURL(file);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let updatedPhotos = [...photos];

      // If new photo added, compress it and save with its OWN gridSize
      if (uploadedImage) {
        const compressed = await compressImage(uploadedImage);
        updatedPhotos = [...updatedPhotos, { image: compressed, gridSize: gridSize }];
        setPhotos(updatedPhotos);
        setUploadedImage(null);
      }

      // Save to Firestore — each photo has its own gridSize
      await setDoc(doc(db, 'gameSettings', 'puzzleGame'), {
        photos:    updatedPhotos,
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
      <div className="ps-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'3rem',marginBottom:'16px',animation:'spin 1s linear infinite'}}>⏳</div>
          <div style={{fontFamily:'Fredoka One,cursive',fontSize:'1.3rem',color:'#7C3AED'}}>Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ps-page">

      {/* TOP BAR */}
      <div className="ps-topbar">
        <div className="ps-logo">✨ Play<span>Nest</span></div>
        <div className="ps-tb-title">🧩 Puzzle Setup</div>
        <button className="ps-back-btn" onClick={() => navigate('/parent/dashboard')}>← Dashboard</button>
      </div>

      <div className="ps-content">

        {/* STEP 1 — SAVED PHOTOS */}
        {photos.length > 0 && (
          <div className="ps-card">
            <div className="ps-step-header">
              <div className="ps-step-num">📸</div>
              <div>
                <div className="ps-step-title">Saved Photos ({photos.length})</div>
                <div className="ps-step-sub">These photos are saved — child can play any of them!</div>
              </div>
            </div>
            <div className="ps-photos-grid">
              {photos.map((photo, i) => (
                <div key={i} className="ps-saved-photo">
                  <img src={photo.image || photo} alt={`Photo ${i+1}`} className="ps-saved-thumb"/>
                  <button className="ps-del-photo" onClick={() => removePhoto(i)} title="Remove">🗑️</button>
                  <div className="ps-photo-label">
                    Photo {i+1} · {photo.gridSize ? `${photo.gridSize}×${photo.gridSize}` : '2×2'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — UPLOAD NEW PHOTO */}
        <div className="ps-card">
          <div className="ps-step-header">
            <div className="ps-step-num">1</div>
            <div>
              <div className="ps-step-title">Add a Photo 📸</div>
              <div className="ps-step-sub">
                {photos.length === 0
                  ? 'Upload your first photo — or skip for built-in scenes!'
                  : `You have ${photos.length} photo(s). Add more or skip!`}
              </div>
            </div>
          </div>

          {!uploadedImage ? (
            <div
              className={`ps-upload-zone ${dragOver ? 'drag-over' : ''}`}
              onClick={() => fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            >
              <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}}
                onChange={e => handleFile(e.target.files[0])} />
              <div className="ps-upload-icon">📸</div>
              <div className="ps-upload-title">Drag & Drop or Click to Upload</div>
              <div className="ps-upload-sub">JPG, PNG • Auto-compressed before saving</div>
            </div>
          ) : (
            <div className="ps-preview">
              <img src={uploadedImage} alt="Preview" className="ps-preview-img" />
              <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
                <button className="ps-change-btn" onClick={() => setUploadedImage(null)}>❌ Remove</button>
              </div>
            </div>
          )}
        </div>

        {/* STEP 3 — DIFFICULTY */}
        <div className="ps-card">
          <div className="ps-step-header">
            <div className="ps-step-num">2</div>
            <div>
              <div className="ps-step-title">Choose Difficulty 🎯</div>
              <div className="ps-step-sub">How many pieces for the puzzle?</div>
            </div>
          </div>
          <div className="ps-diff-grid">
            {DIFFICULTIES.map(d => (
              <div key={d.size}
                className={`ps-diff-card ${gridSize === d.size ? 'selected' : ''}`}
                style={{'--dc': d.color, '--dl': d.light}}
                onClick={() => setGridSize(d.size)}
              >
                {gridSize === d.size && <div className="ps-diff-check">✓</div>}
                <div className="ps-diff-emoji">{d.emoji}</div>
                <div className="ps-diff-label">{d.label}</div>
                <div className="ps-diff-desc">{d.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* STEP 4 — SAVE */}
        <div className="ps-card">
          <div className="ps-step-header">
            <div className="ps-step-num">3</div>
            <div>
              <div className="ps-step-title">Save & Publish 🚀</div>
              <div className="ps-step-sub">Saves to Firebase — child sees it instantly!</div>
            </div>
          </div>
          <button className="ps-save-btn" onClick={handleSave} disabled={saving || saved}>
            {saved   ? '✅ Saved to Firebase!' :
             saving  ? '⏳ Saving...' :
             '🎉 Save & Publish Game!'}
          </button>
        </div>

      </div>
    </div>
  );
}
