import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StarsBg from '../components/StarsBg';
import '../styles/globals.css';
import './Landing.css';

const STEPS = [
  { icon:'👨‍👩‍👧', num:'1', title:'Parent Signs Up', color:'linear-gradient(90deg,#7C3AED,#38BDF8)', text:'Create one account for your whole family. Set up your child\'s profile in seconds.' },
  { icon:'🎨', num:'2', title:'Parent Creates Games', color:'linear-gradient(90deg,#F472B6,#FB923C)', text:'Upload photos, record your voice, write fun questions — make every game personal!' },
  { icon:'🕹️', num:'3', title:'Child Plays & Learns', color:'linear-gradient(90deg,#34D399,#38BDF8)', text:'Switch to child mode and let the magic begin! Games use familiar faces and voices.' },
  { icon:'📊', num:'4', title:'Track Progress', color:'linear-gradient(90deg,#FBBF24,#FB923C)', text:'See detailed reports on games played, scores, and areas needing more practice.' },
];

const GAMES = [
  { emoji:'🧩', title:'Picture Puzzle',    bg:'linear-gradient(135deg,#7C3AED,#A78BFA)', tag:'👆 Drag & Drop',      desc:'Parents upload any photo. Child drags and drops pieces to solve the puzzle.' },
  { emoji:'🌑', title:'Shadow Match',      bg:'linear-gradient(135deg,#F97316,#FBBF24)', tag:'🧠 Visual Thinking',  desc:'Upload any object — app auto-generates its shadow. Child matches it to the right image!' },
  { emoji:'🕵️', title:'Photo Mystery',     bg:'linear-gradient(135deg,#EC4899,#F472B6)', tag:'👨‍👩‍👧‍👦 Family Bonding', desc:'Upload family photos — child guesses who the mystery person is!' },
  { emoji:'✋', title:'Hand Gesture MCQ',  bg:'linear-gradient(135deg,#059669,#34D399)', tag:'🤖 AI Powered',       desc:'Parent writes custom questions. Child answers by holding up fingers!' },
  { emoji:'🎤', title:'Voice Recognition', bg:'linear-gradient(135deg,#0284C7,#38BDF8)', tag:'🎵 Audio Learning',   desc:'Parents record voice or animal sounds. Child listens and identifies!' },
];

const FEATURES = [
  { icon:'🤖', bg:'#EDE9FE', title:'AI Hand Gestures',     desc:'Powered by ml5.js — child answers by counting on fingers. No clicking needed!' },
  { icon:'🎙️', bg:'#FFF7ED', title:'Custom Voice Upload',  desc:'Record mum, dad or grandpa\'s voice. Child recognizes whose voice it is.' },
  { icon:'📸', bg:'#F0FDF4', title:'Family Photo Games',   desc:'Upload real photos of family and friends. Every game is 100% personalized!' },
  { icon:'🔒', bg:'#FDF2F8', title:'Safe Mode Switch',     desc:'PIN-protected parent mode keeps setup tools safe from little hands.' },
  { icon:'📊', bg:'#EFF6FF', title:'Progress Reports',     desc:'Detailed dashboards show scores, time played, and areas needing practice.' },
  { icon:'🎨', bg:'#FFFBEB', title:'No Tech Skills Needed',desc:'Any parent can create games in minutes with simple drag-and-drop setup!' },
];

function Landing() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) setTimeout(() => e.target.classList.add('visible'), i * 80);
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing">
      <StarsBg />
      <Navbar />

      {/* HERO */}
      <section className="hero" id="home">
        <div className="blob b1"/><div className="blob b2"/><div className="blob b3"/>
        <span className="fc" style={{'--fa':'3.5s',top:'15%',left:'5%'}}>🦁</span>
        <span className="fc" style={{'--fa':'4.5s',top:'20%',right:'6%'}}>🦋</span>
        <span className="fc" style={{'--fa':'5s',bottom:'22%',left:'8%'}}>🌈</span>
        <span className="fc" style={{'--fa':'3.8s',bottom:'25%',right:'5%'}}>🎈</span>
        <span className="fc" style={{'--fa':'4.2s',top:'60%',left:'2%'}}>⭐</span>
        <span className="fc" style={{'--fa':'5.5s',top:'10%',left:'40%'}}>🌟</span>
        <div className="hero-content">
          <div className="hero-badge">🎉 The Magical Learning Game Engine for Kids!</div>
          <h1 className="hero-title">
            Learning is More Fun<br/>
            When <span className="highlight">Family Plays <span className="wave-text">Together!</span></span>
          </h1>
          <p className="hero-sub">Parents create magical custom games using their own voice, photos &amp; stories. Children learn, laugh, and grow — together!</p>
          <div className="hero-buttons">
            <Link to="/auth" className="btn btn-primary">🚀 Start Playing Free</Link>
            <a href="#games" className="btn btn-secondary">🎮 See All Games</a>
          </div>
        </div>
      </section>

      <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" className="wave">
        <path fill="#EDE9FE" d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z"/>
      </svg>

      {/* HOW IT WORKS */}
      <section className="how-section" id="how">
        <div className="section-title reveal">✨ How Does It Work?</div>
        <p className="section-sub reveal">Simple magical steps to get started!</p>
        <div className="steps-grid">
          {STEPS.map(s => (
            <div className="step-card reveal" key={s.num} style={{'--c':s.color}}>
              <span className="step-icon">{s.icon}</span>
              <div className="step-num">{s.num}</div>
              <h3>{s.title}</h3><p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" className="wave" style={{background:'#EDE9FE'}}>
        <path fill="#FFF7ED" d="M0,30 C360,0 1080,60 1440,30 L1440,60 L0,60 Z"/>
      </svg>

      {/* GAMES */}
      <section className="games-section" id="games">
        <div className="section-title reveal">🎮 Our Magical Games</div>
        <p className="section-sub reveal">Five incredible personalized games for your little ones!</p>
        <div className="games-grid">
          {GAMES.map(g => (
            <div className="game-card reveal" key={g.title} style={{background:g.bg}}>
              <span className="game-emoji">{g.emoji}</span>
              <h3>{g.title}</h3><p>{g.desc}</p>
              <span className="tag">{g.tag}</span>
            </div>
          ))}
        </div>
      </section>

      <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" className="wave" style={{background:'#FFF7ED'}}>
        <path fill="#FFF6E9" d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z"/>
      </svg>

      {/* FEATURES */}
      <section className="features-section" id="features">
        <div className="section-title reveal">⚡ Why Parents Love PlayNest</div>
        <p className="section-sub reveal">Powerful features built to make learning personal and fun!</p>
        <div className="features-grid">
          {FEATURES.map(f => (
            <div className="feat-card reveal" key={f.title}>
              <div className="feat-icon-wrap" style={{background:f.bg}}>{f.icon}</div>
              <div><h3>{f.title}</h3><p>{f.desc}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" id="start">
        <div className="cta-box">
          <h2>🌟 Ready to Create Magic Together?</h2>
          <p>Join thousands of families turning everyday learning into extraordinary adventures — completely free!</p>
          <div className="cta-buttons">
            <Link to="/auth" className="btn btn-white">🚀 Create Free Account</Link>
            <Link to="/auth" className="btn btn-outline-white">🎮 Try Demo First</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-logo">✨ PlayNest</div>
        <p className="footer-tagline">Where Every Child's Learning is a Family Adventure</p>
        <ul className="footer-links">
          <li><a href="#">🏠 Home</a></li>
          <li><a href="#games">🎮 Games</a></li>
          <li><a href="#features">📊 Features</a></li>
          <li><a href="#">💬 Contact</a></li>
        </ul>
        <p className="footer-copy">© 2025 PlayNest. Made with ❤️ for families everywhere.</p>
      </footer>
    </div>
  );
}
export default Landing;