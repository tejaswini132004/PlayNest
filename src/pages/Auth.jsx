import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StarsBg from '../components/StarsBg';
import '../styles/globals.css';
import './Auth.css';

function Auth() {
  const [tab, setTab] = useState('login');
  const [loginData, setLoginData]   = useState({ email:'', password:'' });
  const [signupData, setSignupData] = useState({ firstName:'', lastName:'', email:'', password:'', childName:'', childAge:'' });
  const [showLoginPass,  setShowLoginPass]  = useState(false);
  const [showSignupPass, setShowSignupPass] = useState(false);
  const [toast, setToast] = useState({ show:false, msg:'' });
  const navigate = useNavigate();

  const showToast = (msg) => {
    setToast({ show:true, msg });
    setTimeout(() => setToast({ show:false, msg:'' }), 3000);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) { showToast('⚠️ Please fill in all fields!'); return; }
    showToast('🎉 Welcome back!');
    setTimeout(() => navigate('/home'), 1500);
  };

  const handleSignup = (e) => {
    e.preventDefault();
    if (!signupData.email || !signupData.password || !signupData.firstName || !signupData.childName) { showToast('⚠️ Please fill in all fields!'); return; }
    showToast('🌈 Account created! Welcome to PlayNest!');
    setTimeout(() => navigate('/home'), 1500);
  };

  const panel = tab === 'login'
    ? { emoji:'🎮', title:"Welcome Back to the Magic!", sub:"Login to continue your child's learning adventure." }
    : { emoji:'🌟', title:"Start the Family Adventure!", sub:"Create your family account and start building magical games!" };

  return (
    <div className="auth-page">
      <StarsBg />
      <div className="blob bl1"/><div className="blob bl2"/><div className="blob bl3"/>
      <Navbar showBack={true} />

      <div className="page-wrap">
        <div className="auth-container">

          {/* LEFT PANEL */}
          <div className="left-panel">
            <div className="fp-chars">
              <span className="fc" style={{'--fa':'3.5s',top:'8%',left:'6%'}}>🌟</span>
              <span className="fc" style={{'--fa':'4.5s',top:'15%',right:'8%'}}>🎈</span>
              <span className="fc" style={{'--fa':'5s',bottom:'18%',left:'4%'}}>🦋</span>
              <span className="fc" style={{'--fa':'3.8s',bottom:'12%',right:'6%'}}>🌈</span>
            </div>
            <span className="panel-emoji">{panel.emoji}</span>
            <h2 className="panel-title">{panel.title}</h2>
            <p className="panel-sub">{panel.sub}</p>
            <ul className="panel-features">
              <li>🧩 Personalized puzzle games</li>
              <li>✋ AI hand gesture quizzes</li>
              <li>🎤 Custom voice recognition</li>
              <li>📊 Track your child's progress</li>
            </ul>
          </div>

          {/* RIGHT PANEL */}
          <div className="right-panel">
            <div className="tab-switcher">
              <button className={`tab-btn ${tab==='login'?'active':''}`}  onClick={()=>setTab('login')}>🔑 Login</button>
              <button className={`tab-btn ${tab==='signup'?'active':''}`} onClick={()=>setTab('signup')}>🌟 Sign Up</button>
            </div>

            {tab === 'login' && (
              <form className="form-panel" onSubmit={handleLogin}>
                <div className="form-title">Hello Again! 👋</div>
                <div className="form-sub">We missed you! Jump back into the fun.</div>
                <div className="input-group">
                  <label>📧 Email Address</label>
                  <div className="input-wrap">
                    <span className="input-icon">📧</span>
                    <input type="email" placeholder="parent@example.com" value={loginData.email} onChange={e=>setLoginData({...loginData,email:e.target.value})}/>
                  </div>
                </div>
                <div className="input-group">
                  <label>🔒 Password</label>
                  <div className="input-wrap">
                    <span className="input-icon">🔒</span>
                    <input type={showLoginPass?'text':'password'} placeholder="Your secret password" value={loginData.password} onChange={e=>setLoginData({...loginData,password:e.target.value})}/>
                    <button type="button" className="pass-toggle" onClick={()=>setShowLoginPass(!showLoginPass)}>{showLoginPass?'🙈':'👁️'}</button>
                  </div>
                </div>
                <div className="forgot-link"><a href="#">Forgot password?</a></div>
                <button type="submit" className="submit-btn">🚀 Let's Play!</button>
                <div className="or-divider">or</div>
                <button type="button" className="google-btn">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="22" alt="Google"/> Continue with Google
                </button>
                <p className="switch-text">Don't have an account? <span onClick={()=>setTab('signup')}>Sign up free →</span></p>
              </form>
            )}

            {tab === 'signup' && (
              <form className="form-panel" onSubmit={handleSignup}>
                <div className="form-title">Join the Adventure! 🌟</div>
                <div className="form-sub">Create your family account in just a minute!</div>
                <div className="form-section-label">👨‍👩‍👧 Parent Details</div>
                <div className="two-col">
                  <div className="input-group">
                    <label>First Name</label>
                    <div className="input-wrap"><span className="input-icon">👤</span>
                      <input type="text" placeholder="e.g. Priya" value={signupData.firstName} onChange={e=>setSignupData({...signupData,firstName:e.target.value})}/>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Last Name</label>
                    <div className="input-wrap"><span className="input-icon">👤</span>
                      <input type="text" placeholder="e.g. Sharma" value={signupData.lastName} onChange={e=>setSignupData({...signupData,lastName:e.target.value})}/>
                    </div>
                  </div>
                </div>
                <div className="input-group">
                  <label>📧 Email Address</label>
                  <div className="input-wrap"><span className="input-icon">📧</span>
                    <input type="email" placeholder="parent@example.com" value={signupData.email} onChange={e=>setSignupData({...signupData,email:e.target.value})}/>
                  </div>
                </div>
                <div className="input-group">
                  <label>🔒 Password</label>
                  <div className="input-wrap"><span className="input-icon">🔒</span>
                    <input type={showSignupPass?'text':'password'} placeholder="Create a strong password" value={signupData.password} onChange={e=>setSignupData({...signupData,password:e.target.value})}/>
                    <button type="button" className="pass-toggle" onClick={()=>setShowSignupPass(!showSignupPass)}>{showSignupPass?'🙈':'👁️'}</button>
                  </div>
                </div>
                <div className="form-section-label">🧒 Child Details</div>
                <div className="two-col">
                  <div className="input-group">
                    <label>Child's Name</label>
                    <div className="input-wrap"><span className="input-icon">🧒</span>
                      <input type="text" placeholder="e.g. Arjun" value={signupData.childName} onChange={e=>setSignupData({...signupData,childName:e.target.value})}/>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Child's Age</label>
                    <div className="input-wrap"><span className="input-icon">🎂</span>
                      <select className="age-select" value={signupData.childAge} onChange={e=>setSignupData({...signupData,childAge:e.target.value})}>
                        <option value="">Select age</option>
                        {[2,3,4,5,6,7,8,9,10].map(a=><option key={a}>{a} years</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <button type="submit" className="submit-btn">🌈 Create My Family Account!</button>
                <div className="or-divider">or</div>
                <button type="button" className="google-btn">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="22" alt="Google"/> Sign up with Google
                </button>
                <p className="terms-text">By signing up you agree to our <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a></p>
              </form>
            )}
          </div>
        </div>
      </div>
      <div className={`toast ${toast.show?'show':''}`}>{toast.msg}</div>
    </div>
  );
}
export default Auth;