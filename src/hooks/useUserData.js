// src/hooks/useUserData.js
// Gets the logged-in user's child name and parent name from Firestore
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export function useUserData() {
  const [userData, setUserData] = useState({ childName: '', parentName: '', loading: true });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // First: try localStorage cache (instant, no network needed)
        const cachedChild  = localStorage.getItem('pn_childName');
        const cachedParent = localStorage.getItem('pn_parentName');

        if (cachedChild) {
          setUserData({
            childName:  cachedChild,
            parentName: cachedParent || 'Parent',
            loading: false,
          });
        }

        // Then: fetch from Firestore and update (may override cache)
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const d = snap.data();
            const childName  = d.childName  || cachedChild  || 'Friend';
            const parentName = d.parentName || cachedParent || 'Parent';
            // Update cache
            localStorage.setItem('pn_childName',  childName);
            localStorage.setItem('pn_parentName', parentName);
            setUserData({ childName, parentName, loading: false });
          } else if (!cachedChild) {
            setUserData({ childName: 'Friend', parentName: 'Parent', loading: false });
          }
        } catch {
          // Firestore failed - use cache or fallback
          setUserData({
            childName:  cachedChild  || 'Friend',
            parentName: cachedParent || 'Parent',
            loading: false,
          });
        }
      } else {
        setUserData({ childName: '', parentName: '', loading: false });
      }
    });
    return () => unsub();
  }, []);

  return userData;
}
