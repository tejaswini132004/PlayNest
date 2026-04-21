import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './Auth.css';

export default function Auth() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('login'); // 'login' | 'signup'

  // ── LOGIN STATE ──
  const [loginEmail,    setLoginEmail]    = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError,    setLoginError]    = useState('');
  const [loginLoading,  setLoginLoading]  = useState(false);

  // ── SIGNUP STATE ──
  const [signupName,     setSignupName]     = useState('');
  const [signupChild,    setSignupChild]    = useState('');
  const [signupEmail,    setSignupEmail]    = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm,  setSignupConfirm]  = useState('');
  const [signupError,    setSignupError]    = useState('');
  const [signupLoading,  setSignupLoading]  = useState(false);

  // ── FRIENDLY ERROR MESSAGES ──
  const friendlyError = (code) => {
    switch(code) {
      case 'auth/user-not-found':        return '❌ No account found with this email.';
      case 'auth/wrong-password':        return '❌ Wrong password. Try again!';
      case 'auth/invalid-credential':    return '❌ Wrong email or password. Try again!';
      case 'auth/email-already-in-use':  return '❌ This email is already registered. Try logging in!';
      case 'auth/weak-password':         return '❌ Password must be at least 6 characters.';
      case 'auth/invalid-email':         return '❌ Please enter a valid email address.';
      case 'auth/too-many-requests':     return '❌ Too many attempts. Please wait a moment.';
      default:                           return '❌ Something went wrong. Please try again.';
    }
  };

  // ── HANDLE LOGIN ──
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError('❌ Please fill in both fields.');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const userCred = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      // Fetch child name from Firestore and cache locally
      try {
        const snap = await getDoc(doc(db, 'users', userCred.user.uid));
        if (snap.exists()) {
          localStorage.setItem('pn_childName',  snap.data().childName  || '');
          localStorage.setItem('pn_parentName', snap.data().parentName || '');
        }
      } catch(e) { /* silent fail */ }
      // Login success → go to home page
      navigate('/home');
    } catch (err) {
      setLoginError(friendlyError(err.code));
      setLoginLoading(false);
    }
  };

  // ── HANDLE SIGNUP ──
  const handleSignup = async (e) => {
    e.preventDefault();
    if (!signupName || !signupChild || !signupEmail || !signupPassword || !signupConfirm) {
      setSignupError('❌ Please fill in all fields.');
      return;
    }
    if (signupPassword !== signupConfirm) {
      setSignupError('❌ Passwords do not match!');
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError('❌ Password must be at least 6 characters.');
      return;
    }
    setSignupLoading(true);
    setSignupError('');
    try {
      // 1. Create the user in Firebase Auth
      const userCred = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);

      // 2. Save display name to Firebase Auth profile
      await updateProfile(userCred.user, { displayName: signupName });

      // 3. Save to Firestore
      await setDoc(doc(db, 'users', userCred.user.uid), {
        parentName: signupName,
        childName:  signupChild,
        email:      signupEmail,
        createdAt:  new Date().toISOString(),
      });

      // 4. Also save to localStorage as backup
      localStorage.setItem('pn_childName',  signupChild);
      localStorage.setItem('pn_parentName', signupName);

      // 5. Signup success → go to home page
      navigate('/home');
    } catch (err) {
      setSignupError(friendlyError(err.code));
      setSignupLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* BACKGROUND */}
      <div className="auth-bg">
        {['🧩','✋','🎤','🌑','🕵️'].map((e, i) => (
          <div key={i} className="auth-bubble" style={{
            '--bf': `${4 + i}s`,
            fontSize: '2rem',
            top:  `${10 + i * 18}%`,
            left: i % 2 === 0 ? `${5 + i * 3}%` : undefined,
            right: i % 2 !== 0 ? `${5 + i * 2}%` : undefined,
          }}>{e}</div>
        ))}
      </div>

      <div className="auth-container">

        {/* LEFT PANEL */}
        <div className="auth-left">
          <div className="auth-logo">✨ PlayNest</div>
          <div className="auth-tagline">
            {tab === 'login'
              ? <>Welcome back! 🎉<br/>Ready to learn and play?</>
              : <>Join PlayNest! 🚀<br/>Create your family account</>}
          </div>
          <div className="auth-features">
            {['🧩 Picture Puzzle', '✋ Hand Gesture MCQ', '🌑 Shadow Match', '🕵️ Photo Mystery', '🎤 Voice Recognition'].map(f => (
              <div key={f} className="auth-feature-item">{f}</div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="auth-right">

          {/* TABS */}
          <div className="auth-tabs">
            <button className={`auth-tab ${tab==='login'?'active':''}`} onClick={() => {setTab('login'); setLoginError('');}}>
              🔑 Login
            </button>
            <button className={`auth-tab ${tab==='signup'?'active':''}`} onClick={() => {setTab('signup'); setSignupError('');}}>
              ✨ Sign Up
            </button>
          </div>

          {/* ── LOGIN FORM ── */}
          {tab === 'login' && (
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="auth-form-title">Welcome back! 👋</div>
              <div className="auth-form-sub">Login to your PlayNest account</div>

              <div className="auth-field">
                <label>📧 Email</label>
                <input type="email" placeholder="your@email.com"
                  value={loginEmail} onChange={e => setLoginEmail(e.target.value)}/>
              </div>
              <div className="auth-field">
                <label>🔒 Password</label>
                <input type="password" placeholder="Enter your password"
                  value={loginPassword} onChange={e => setLoginPassword(e.target.value)}/>
              </div>

              {loginError && <div className="auth-error">{loginError}</div>}

              <button type="submit" className="auth-submit" disabled={loginLoading}>
                {loginLoading ? '⏳ Logging in...' : '🚀 Login'}
              </button>

              <div className="auth-switch">
                Don't have an account?{' '}
                <button type="button" onClick={() => setTab('signup')}>Sign Up</button>
              </div>
            </form>
          )}

          {/* ── SIGNUP FORM ── */}
          {tab === 'signup' && (
            <form className="auth-form" onSubmit={handleSignup}>
              <div className="auth-form-title">Create Account 🎉</div>
              <div className="auth-form-sub">Join PlayNest for free!</div>

              <div className="auth-field">
                <label>👨‍👩‍👦 Your Name (Parent)</label>
                <input type="text" placeholder="e.g. Priya"
                  value={signupName} onChange={e => setSignupName(e.target.value)}/>
              </div>
              <div className="auth-field">
                <label>🧒 Child's Name</label>
                <input type="text" placeholder="e.g. Arjun"
                  value={signupChild} onChange={e => setSignupChild(e.target.value)}/>
              </div>
              <div className="auth-field">
                <label>📧 Email</label>
                <input type="email" placeholder="your@email.com"
                  value={signupEmail} onChange={e => setSignupEmail(e.target.value)}/>
              </div>
              <div className="auth-field">
                <label>🔒 Password</label>
                <input type="password" placeholder="Min. 6 characters"
                  value={signupPassword} onChange={e => setSignupPassword(e.target.value)}/>
              </div>
              <div className="auth-field">
                <label>🔒 Confirm Password</label>
                <input type="password" placeholder="Repeat password"
                  value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)}/>
              </div>

              {signupError && <div className="auth-error">{signupError}</div>}

              <button type="submit" className="auth-submit" disabled={signupLoading}>
                {signupLoading ? '⏳ Creating account...' : '✨ Create Account'}
              </button>

              <div className="auth-switch">
                Already have an account?{' '}
                <button type="button" onClick={() => setTab('login')}>Login</button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
