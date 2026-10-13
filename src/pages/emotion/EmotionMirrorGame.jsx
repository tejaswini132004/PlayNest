import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as faceapi from 'face-api.js';
import StarsBg from '../../components/StarsBg';
import { useFirebaseSettings } from '../../hooks/useFirebaseSettings';
import './EmotionMirrorGame.css';

const CONFETTI_BITS = ['🎉', '⭐', '🎊', '💫', '✨'];
const RING_CIRCUMFERENCE = 640;
const MODEL_URL = '/models';
const DETECTION_INTERVAL_MS = 250;
const MANUAL_FALLBACK_DELAY_MS = 6000; // how long we let detection try before offering the manual button

// --- Landmark geometry helpers (dlib 68-point layout, same as face-api.js) ---
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Eye Aspect Ratio: low value = eyes mostly closed. Used for "Sleepy".
function eyeAspectRatio(eyePoints) {
  const [p1, p2, p3, p4, p5, p6] = eyePoints;
  return (dist(p2, p6) + dist(p3, p5)) / (2 * dist(p1, p4));
}
function computeEAR(positions) {
  const leftEye = [36, 37, 38, 39, 40, 41].map((i) => positions[i]);
  const rightEye = [42, 43, 44, 45, 46, 47].map((i) => positions[i]);
  return (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2;
}

// Mouth Aspect Ratio: high value = mouth wide open. Used for "Silly".
function computeMAR(positions) {
  const top = positions[51];
  const bottom = positions[57];
  const left = positions[48];
  const right = positions[54];
  return dist(top, bottom) / dist(left, right);
}

// Every selectable emotion maps to one of three detection strategies:
//  - "expression": read the confidence face-api's expression net already gives us
//  - "ear"/"mar":  geometric heuristics from the 68-point landmarks, for
//                   expressions the model doesn't natively classify
// "Love" has no real facial-expression equivalent, so it's approximated as a
// warm smile (same signal as Happy) — flagged clearly to the player as a proxy.
const EMOTION_CLASSIFIERS = {
  Happy:     { type: 'expression', key: 'happy' },
  Sad:       { type: 'expression', key: 'sad' },
  Angry:     { type: 'expression', key: 'angry' },
  Surprised: { type: 'expression', key: 'surprised' },
  Scared:    { type: 'expression', key: 'fearful' },
  Love:      { type: 'expression', key: 'happy', approx: true },
  Sleepy:    { type: 'ear', approx: true },
  Silly:     { type: 'mar', approx: true },
};

// Per-difficulty thresholds. expressionThreshold applies to the 0–1 model
// confidence; earMax / marMin apply to the geometric ratios above. Treat
// these as starting points — they may need tuning for different cameras/kids.
const DIFFICULTY_SETTINGS = {
  Gentle:   { expressionThreshold: 0.35, earMax: 0.24, marMin: 0.45, holdFrames: 3 },
  Balanced: { expressionThreshold: 0.55, earMax: 0.20, marMin: 0.55, holdFrames: 4 },
  Precise:  { expressionThreshold: 0.75, earMax: 0.17, marMin: 0.65, holdFrames: 6 },
};

const EMOJI_FOR = {
  Happy: '😄', Surprised: '😮', Sad: '😢', Angry: '😠',
  Sleepy: '😴', Silly: '😜', Scared: '😱', Love: '🥰',
};

export default function EmotionMirrorGame() {
  const navigate = useNavigate();

  // useFirebaseSettings is read-only: { data, loading } via a live listener —
  // it reflects whatever the parent last saved on the Setup page automatically.
  const { data: settings, loading } = useFirebaseSettings('emotionMirror');

  const faces = (settings?.selectedEmotions ?? ['Happy', 'Surprised', 'Silly']).map(
    (emotion) => ({ emotion, emoji: EMOJI_FOR[emotion] ?? '🙂' })
  );
  const difficulty = settings?.difficulty ?? 'Balanced';
  const difficultySettings = DIFFICULTY_SETTINGS[difficulty] ?? DIFFICULTY_SETTINGS.Balanced;

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [current, setCurrent] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [matchProgress, setMatchProgress] = useState(0);
  const [liveReading, setLiveReading] = useState(null); // { value, type } for on-screen feedback
  const [status, setStatus] = useState('Ready when you are!');
  const [matched, setMatched] = useState(false);
  const [showCelebrate, setShowCelebrate] = useState(false);
  const [complete, setComplete] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [showManualFallback, setShowManualFallback] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionTimerRef = useRef(null);
  const manualFallbackTimerRef = useRef(null);
  const consecutiveHitsRef = useRef(0);
  const detectingRef = useRef(false); // guards against overlapping async detections

  const face = faces[current];

  // Refs mirror the latest state/props so the persistent detection tick
  // always reads fresh values without ever needing to be recreated.
  const faceRef = useRef(face);
  const matchedRef = useRef(false);
  const settingsRef = useRef(difficultySettings);
  useEffect(() => { faceRef.current = face; }, [face]);
  useEffect(() => { settingsRef.current = difficultySettings; }, [difficultySettings]);

  // Load face-api.js models once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        ]);
        if (!cancelled) setModelsLoaded(true);
      } catch (err) {
        console.error('Failed to load face-api models:', err);
        if (!cancelled) setModelError(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const launchConfetti = useCallback(() => {
    const bits = Array.from({ length: 24 }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      char: CONFETTI_BITS[Math.floor(Math.random() * CONFETTI_BITS.length)],
      left: Math.random() * 100,
      duration: 1.6 + Math.random() * 1.2,
    }));
    setConfetti(bits);
    setTimeout(() => setConfetti([]), 3000);
  }, []);

  const onMatchSuccess = useCallback(() => {
    matchedRef.current = true;
    setMatched(true);
    setShowManualFallback(false);
    clearTimeout(manualFallbackTimerRef.current);
    setStatus('Matched! 🎉');
    launchConfetti();
    setTimeout(() => setShowCelebrate(true), 400);
  }, [launchConfetti]);

  // Real detection loop: samples the live video every 250ms and scores it
  // against whichever classifier the current face needs (expression model
  // confidence, or an eye/mouth geometry heuristic). Requires several
  // consecutive frames past threshold before counting a match, to avoid a
  // single noisy frame triggering success. This function is created ONCE —
  // a single persistent interval runs it for the whole game — so there's no
  // stale-closure risk when moving between faces.
  const runDetectionTick = useCallback(async () => {
    const currentFace = faceRef.current;
    if (detectingRef.current || !videoRef.current || matchedRef.current || !currentFace) return;
    const classifier = EMOTION_CLASSIFIERS[currentFace.emotion];
    if (!classifier) return;

    detectingRef.current = true;
    try {
      const result = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true) // tiny landmark model
        .withFaceExpressions();

      if (!result) {
        setLiveReading(null);
        setStatus('Move a little closer so I can see your face…');
        consecutiveHitsRef.current = 0;
        return;
      }

      const { expressionThreshold, earMax, marMin, holdFrames } = settingsRef.current;
      let isHit = false;
      let value = 0;

      if (classifier.type === 'expression') {
        value = result.expressions[classifier.key] ?? 0;
        isHit = value >= expressionThreshold;
      } else if (classifier.type === 'ear') {
        value = computeEAR(result.landmarks.positions);
        isHit = value <= earMax;
      } else if (classifier.type === 'mar') {
        value = computeMAR(result.landmarks.positions);
        isHit = value >= marMin;
      }

      setLiveReading({ value, type: classifier.type });

      if (isHit) {
        consecutiveHitsRef.current += 1;
        setStatus('Getting closer… hold it!');
      } else {
        consecutiveHitsRef.current = Math.max(0, consecutiveHitsRef.current - 1);
      }

      const progress = Math.min(100, (consecutiveHitsRef.current / holdFrames) * 100);
      setMatchProgress(progress);

      if (consecutiveHitsRef.current >= holdFrames) {
        setMatchProgress(100);
        onMatchSuccess();
      }
    } catch (err) {
      console.error('Detection error:', err);
    } finally {
      detectingRef.current = false;
    }
  }, [onMatchSuccess]);

  // Start the single persistent detection interval once camera + models are
  // ready. It keeps running for the whole game — advancing to the next face
  // never touches this interval, it just resets the refs/state below.
  useEffect(() => {
    if (!cameraOn || !modelsLoaded) return;
    detectionTimerRef.current = setInterval(runDetectionTick, DETECTION_INTERVAL_MS);
    return () => clearInterval(detectionTimerRef.current);
  }, [cameraOn, modelsLoaded, runDetectionTick]);

  // Reset progress whenever the active face changes, and arm the delayed
  // manual-fallback timer — it only appears if detection hasn't succeeded
  // within MANUAL_FALLBACK_DELAY_MS, for ANY emotion, as a safety net.
  useEffect(() => {
    setMatchProgress(0);
    matchedRef.current = false;
    setMatched(false);
    setLiveReading(null);
    setShowManualFallback(false);
    consecutiveHitsRef.current = 0;
    clearTimeout(manualFallbackTimerRef.current);

    if (cameraOn) {
      setStatus(`Hold the ${face.emotion.toLowerCase()} face for a moment…`);
      manualFallbackTimerRef.current = setTimeout(() => {
        setShowManualFallback(true);
      }, MANUAL_FALLBACK_DELAY_MS);
    }
    return () => clearTimeout(manualFallbackTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, cameraOn]);

  const startCamera = useCallback(async () => {
    setStatus('Turning on camera…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCameraOn(true); // mounts <video>; stream is attached in the effect below
    } catch (err) {
      setStatus("Couldn't access the camera — check permissions and try again.");
    }
  }, []);

  // Attach the stream once the <video> element exists in the DOM.
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOn]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => stopCamera, []); // cleanup on unmount

  const goToNextFace = () => {
    setShowCelebrate(false);
    const next = current + 1;
    if (next >= faces.length) {
      clearInterval(detectionTimerRef.current);
      clearTimeout(manualFallbackTimerRef.current);
      stopCamera();
      setComplete(true);
      launchConfetti();
      return;
    }
    setCurrent(next); // triggers the reset effect above; the detection interval keeps running
  };

  const skipFace = () => {
    matchedRef.current = false; // let the (still-running) interval move on cleanly
    goToNextFace();
  };

  const confirmManualMatch = () => {
    setMatchProgress(100);
    onMatchSuccess();
  };

  if (loading || (!modelsLoaded && !modelError)) {
    return (
      <div className="emg-page">
        <StarsBg />
        <p className="emg-loading">
          {modelError ? 'Could not load the face detector — check /public/models.' : 'Getting the camera ready…'}
        </p>
      </div>
    );
  }

  const ringOffset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * matchProgress) / 100;
  const classifier = EMOTION_CLASSIFIERS[face?.emotion];

  return (
    <div className="emg-page">
      <StarsBg />

      <header className="emg-header">
        <div className="emg-logo"><span className="emg-spin">⭐</span> PlayNest</div>
        <button className="emg-exit-link" onClick={() => navigate('/child/dashboard')}>
          ✕ Exit game
        </button>
      </header>

      {!complete && (
        <div className="emg-progress-dots">
          {faces.map((f, i) => (
            <div key={f.emotion} className={`emg-dot ${i === current ? 'current' : ''} ${i < current ? 'done' : ''}`}>
              {i < current ? '✓' : f.emoji}
            </div>
          ))}
        </div>
      )}

      <main className="emg-main">
        {!complete ? (
          <>
            <div className="emg-prompt-caption">Make the same face as me! 🪞</div>

            <div className="emg-mirror-stage">
              <div className="emg-face-column">
                <span className="emg-face-label">MOM/DAD'S FACE</span>
                <div className="emg-parent-face">{face.emoji}</div>
              </div>

              <div className="emg-vs-mark"><span className="emg-arrow">➜</span></div>

              <div className="emg-face-column">
                <span className="emg-face-label">YOUR FACE</span>
                <div className={`emg-camera-frame ${matched ? 'success' : matchProgress > 30 ? 'matching' : ''}`}>
                  {cameraOn ? (
                    <video ref={videoRef} autoPlay playsInline muted className="emg-video" />
                  ) : (
                    <div className="emg-camera-placeholder">
                      <span className="emg-icon">🎥</span>
                      <span>Tap start to<br />turn on camera</span>
                    </div>
                  )}
                  <div className={`emg-match-ring ${matched ? 'success' : ''}`}>
                    <svg viewBox="0 0 220 220">
                      <circle cx="110" cy="110" r="102" style={{ strokeDashoffset: ringOffset }} />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="emg-status-line">{status}</div>
            {liveReading && cameraOn && !matched && (
              <div className="emg-live-reading">
                {classifier?.type === 'expression'
                  ? `Reading: ${face.emoji} ${Math.round(liveReading.value * 100)}%`
                  : classifier?.type === 'ear'
                  ? `Eye openness: ${liveReading.value.toFixed(2)} (lower = more closed)`
                  : `Mouth openness: ${liveReading.value.toFixed(2)} (higher = more open)`}
                {classifier?.approx && <span className="emg-approx-tag"> · best-effort match</span>}
              </div>
            )}

            <div className="emg-action-row">
              {!cameraOn && (
                <button className="emg-btn emg-btn-camera" onClick={startCamera}>📷 Start Camera</button>
              )}
              {cameraOn && showManualFallback && !matched && (
                <button className="emg-btn emg-btn-camera" onClick={confirmManualMatch}>
                  ✅ I made it! (having trouble? tap here)
                </button>
              )}
              <button className="emg-btn emg-btn-skip" onClick={skipFace}>Skip this face</button>
            </div>
          </>
        ) : (
          <div className="emg-complete-screen">
            <div className="emg-trophy">🏆</div>
            <h1>You did it!</h1>
            <p>You matched every face. Your parent will love seeing your scores!</p>
            <div className="emg-stars-row">⭐⭐⭐</div>
            <button className="emg-btn emg-btn-camera" onClick={() => window.location.reload()}>
              Play Again
            </button>
          </div>
        )}
      </main>

      {showCelebrate && (
        <div className="emg-celebrate-overlay show">
          <div className="emg-celebrate-card">
            <div className="emg-big-emoji">{face.emoji}</div>
            <h2>Great match!</h2>
            <p>You copied {face.emotion} perfectly.</p>
            <button className="emg-btn emg-btn-camera" onClick={goToNextFace}>Next Face →</button>
          </div>
        </div>
      )}

      {confetti.map((c) => (
        <div
          key={c.id}
          className="emg-confetti"
          style={{ left: `${c.left}vw`, animationDuration: `${c.duration}s` }}
        >
          {c.char}
        </div>
      ))}
    </div>
  );
}
