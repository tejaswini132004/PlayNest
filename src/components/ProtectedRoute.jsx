// src/components/ProtectedRoute.jsx
// Wraps pages that require login — redirects to /auth if not logged in
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

export default function ProtectedRoute({ children }) {
  const [user,    setUser]    = useState(undefined); // undefined = still checking
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Still checking auth state — show nothing
  if (loading) {
    return (
      <div style={{
        minHeight:'100vh', display:'flex', alignItems:'center',
        justifyContent:'center',
        background:'linear-gradient(145deg,#0F0C2E,#1E1B4B)'
      }}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'3rem',marginBottom:'16px',animation:'spin 1s linear infinite'}}>✨</div>
          <div style={{fontFamily:'Fredoka One,cursive',fontSize:'1.3rem',color:'white'}}>Loading PlayNest...</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    );
  }

  // Not logged in → redirect to auth page
  if (!user) return <Navigate to="/auth" replace />;

  // Logged in → show the page
  return children;
}
