import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar({ showBack = false }) {
  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">
        <span className="logo-star">✨</span>
        Play<span>Nest</span>
      </Link>
      {showBack ? (
        <Link to="/" className="nav-back">← Back to Home</Link>
      ) : (
        <ul className="nav-links">
          <li><a href="#how">How It Works</a></li>
          <li><a href="#games">Games</a></li>
          <li><a href="#features">Features</a></li>
          <li><Link to="/auth" className="nav-cta">🚀 Get Started Free</Link></li>
        </ul>
      )}
    </nav>
  );
}
export default Navbar;