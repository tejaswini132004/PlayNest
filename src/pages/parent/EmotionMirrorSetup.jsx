import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import StarsBg from '../../components/StarsBg';
import { useFirebaseSettings } from '../../hooks/useFirebaseSettings';
import { useUserData } from '../../hooks/useUserData';
import './EmotionMirrorSetup.css';

// Default cast of faces offered to every parent. Extend freely.
const ALL_FACES = [
  { emotion: 'Happy',     emoji: '😄' },
  { emotion: 'Surprised', emoji: '😮' },
  { emotion: 'Sad',       emoji: '😢' },
  { emotion: 'Angry',     emoji: '😠' },
  { emotion: 'Sleepy',    emoji: '😴' },
  { emotion: 'Silly',     emoji: '😜' },
  { emotion: 'Scared',    emoji: '😱' },
  { emotion: 'Love',      emoji: '🥰' },
];

const DIFFICULTIES = [
  { level: 'Gentle',   label: '🌱 Gentle — any close try counts' },
  { level: 'Balanced', label: '⚖️ Balanced — recommended' },
  { level: 'Precise',  label: '🎯 Precise — for older kids' },
];

export default function EmotionMirrorSetup() {
  const navigate = useNavigate();
  const { user } = useUserData();

  // useFirebaseSettings is read-only: { data, loading } via a live onSnapshot
  // listener. There's no built-in save function, so we write to the same
  // Firestore doc directly with setDoc below.
  const { data: settings } = useFirebaseSettings('emotionMirror');

  const [selected, setSelected] = useState(
    () => new Set(settings?.selectedEmotions ?? ['Happy', 'Surprised'])
  );
  const [recordedClips, setRecordedClips] = useState(
    () => settings?.recordedClips ?? {}
  );
  const [activeEmotion, setActiveEmotion] = useState('Happy');
  const [difficulty, setDifficulty] = useState(settings?.difficulty ?? 'Balanced');
  const [recording, setRecording] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const toggleFace = (emotion) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(emotion) ? next.delete(emotion) : next.add(emotion);
      return next;
    });
    setActiveEmotion(emotion);
  };

  // Records a short clip for the active emotion. Swap this stub for real
  // MediaRecorder + Firebase Storage upload logic when you wire up recording.
  const handleRecord = useCallback(async () => {
    setRecording(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // simulated capture window — replace with real MediaRecorder timing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setRecordedClips((prev) => ({ ...prev, [activeEmotion]: true }));
    } catch (err) {
      console.error('Camera access failed:', err);
    } finally {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setRecording(false);
    }
  }, [activeEmotion]);

  const handleRetake = (emotion) => {
    setRecordedClips((prev) => {
      const next = { ...prev };
      delete next[emotion];
      return next;
    });
  };

  const handleSave = async () => {
    try {
      await setDoc(
        doc(db, 'gameSettings', 'emotionMirror'),
        {
          selectedEmotions: Array.from(selected),
          recordedClips,
          difficulty,
          updatedBy: user?.uid ?? null,
        },
        { merge: true }
      );
      navigate('/parent/dashboard');
    } catch (err) {
      console.error('Failed to save Emotion Mirror settings:', err);
    }
  };

  const selectedCount = selected.size;
  const recordedCount = Object.keys(recordedClips).length;

  return (
    <div className="em-setup-page">
      <StarsBg />

      <header className="em-header">
        <div className="em-logo"><span className="em-spin">⭐</span> PlayNest</div>
        <button className="em-back-link" onClick={() => navigate('/parent/dashboard')}>
          ← Back to Dashboard
        </button>
      </header>

      <main className="em-main">
        <div className="em-eyebrow">😊</div>
        <h1>Pick the faces your child will copy</h1>
        <p className="em-lede">
          Record yourself making a few expressions. During play, your child sees
          your face and mimics the emotion back at the camera — PlayNest checks the match.
        </p>

        <section className="em-card">
          <h2>Choose which faces to include</h2>
          <p className="em-sub">Tap to select. You'll record a short clip for each one you pick.</p>

          <div className="em-face-grid">
            {ALL_FACES.map((f) => {
              const isOn = selected.has(f.emotion);
              return (
                <div
                  key={f.emotion}
                  className={`em-face-tile ${isOn ? 'on' : ''}`}
                  onClick={() => toggleFace(f.emotion)}
                >
                  <span className="em-check">✓</span>
                  <span className="em-emoji">{f.emoji}</span>
                  <span className="em-label">{f.emotion}</span>
                </div>
              );
            })}
          </div>

          <div className="em-record-hint">
            <span className="em-icon">💡</span>
            <span>Pick 3–5 faces to start. You can always come back and add more later.</span>
          </div>

          <div className="em-record-panel">
            <h2>Record: {activeEmotion} {ALL_FACES.find((f) => f.emotion === activeEmotion)?.emoji}</h2>
            <div className="em-row">
              <div className={`em-cam-preview ${recording ? 'recording' : ''}`}>
                <div className="em-ring" />
                {recording
                  ? <video ref={videoRef} autoPlay playsInline muted className="em-video" />
                  : <span>📷</span>}
              </div>
              <div className="em-record-controls">
                <p>Look at the camera and hold the expression for 2 seconds.</p>
                <button className="em-btn em-btn-record" onClick={handleRecord} disabled={recording}>
                  {recording ? 'Recording…' : '● Record clip'}
                </button>
                {recordedClips[activeEmotion] && (
                  <button className="em-btn em-btn-secondary" onClick={() => handleRetake(activeEmotion)}>
                    Retake
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="em-card">
          <h2>How closely should we match it?</h2>
          <p className="em-sub">Sets how strict the emotion detection is for your child's age.</p>
          <div className="em-difficulty-row">
            {DIFFICULTIES.map((d) => (
              <div
                key={d.level}
                className={`em-diff-chip ${difficulty === d.level ? 'on' : ''}`}
                onClick={() => setDifficulty(d.level)}
              >
                {d.label}
              </div>
            ))}
          </div>
        </section>
      </main>

      <div className="em-bottom-bar">
        <span className="em-count-text">
          {selectedCount} of {ALL_FACES.length} faces selected · {recordedCount} recorded
        </span>
        <button
          className="em-btn em-btn-primary"
          disabled={selectedCount === 0}
          onClick={handleSave}
        >
          Save & Continue →
        </button>
      </div>
    </div>
  );
}
