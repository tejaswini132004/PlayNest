// src/hooks/useFirebaseSettings.js
// Reusable hook to load game settings from Firestore
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

// Usage: const { data, loading } = useFirebaseSettings('puzzleGame');
export function useFirebaseSettings(docName) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onSnapshot = real-time listener
    // If parent updates settings, child sees it INSTANTLY without refresh!
    const unsub = onSnapshot(
      doc(db, 'gameSettings', docName),
      (snap) => {
        if (snap.exists()) setData(snap.data());
        setLoading(false);
      },
      (err) => {
        console.error('Firestore read error:', err);
        setLoading(false);
      }
    );
    return () => unsub(); // cleanup listener when component unmounts
  }, [docName]);

  return { data, loading };
}
