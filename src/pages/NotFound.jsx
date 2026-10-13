import React from 'react';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'Fredoka One, cursive',background:'#FFF6E9',textAlign:'center',padding:'20px'}}>
      <div style={{fontSize:'6rem'}}>🙈</div>
      <h1 style={{fontSize:'4rem',color:'#7C3AED',margin:'20px 0 10px'}}>Oops! 404</h1>
      <p style={{fontSize:'1.3rem',color:'#F472B6',marginBottom:'8px'}}>Wrong turn, little explorer!</p>
      <p style={{fontSize:'1rem',color:'#888',fontFamily:'Nunito,sans-serif',fontWeight:700,marginBottom:'30px'}}>The page you're looking for has run away to play hide and seek.</p>
      <Link to="/" style={{padding:'14px 40px',background:'linear-gradient(135deg,#7C3AED,#F472B6)',color:'white',borderRadius:'50px',textDecoration:'none',fontSize:'1.2rem'}}>
        🏠 Take Me Home!
      </Link>
    </div>
  );
}
export default NotFound;