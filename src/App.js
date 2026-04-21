import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Auth
import Auth           from './pages/Auth';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Landing        from './pages/Landing';
import HomePage       from './pages/HomePage';
import ParentDashboard from './pages/parent/ParentDashboard';
import PuzzleSetup    from './pages/parent/PuzzleSetup';
import HandGestureSetup from './pages/parent/HandGestureSetup';
import ChildDashboard from './pages/child/ChildDashboard';
import PuzzleGame     from './pages/puzzle/PuzzleGame';
import HandGesture    from './pages/gesture/HandGesture';
import NotFound       from './pages/NotFound';
import VoiceSetup from './pages/parent/VoiceSetup'
import VoiceGame  from './pages/voice/VoiceGame'
import ShadowSetup from './pages/parent/ShadowSetup'
import ShadowGame  from './pages/shadow/ShadowGame'
import PhotoMysterySetup from './pages/parent/PhotoMysterySetup'
import PhotoMysteryGame  from './pages/mystery/PhotoMysteryGame'


function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC */}
        {/* Landing page first! */}
        <Route path="/"       element={<Landing />} />
        <Route path="/auth"   element={<Auth />} />

        {/* PROTECTED */}
        <Route path="/home" element={
          <ProtectedRoute><HomePage /></ProtectedRoute>
        }/>
        <Route path="/parent/dashboard" element={
          <ProtectedRoute><ParentDashboard /></ProtectedRoute>
        }/>
        <Route path="/parent/setup/puzzle" element={
          <ProtectedRoute><PuzzleSetup /></ProtectedRoute>
        }/>
        <Route path="/parent/setup/gesture" element={
          <ProtectedRoute><HandGestureSetup /></ProtectedRoute>
        }/>
        <Route path="/child/dashboard" element={
          <ProtectedRoute><ChildDashboard /></ProtectedRoute>
        }/>
        <Route path="/child/play/puzzle" element={
          <ProtectedRoute><PuzzleGame /></ProtectedRoute>
        }/>
        <Route path="/child/play/gesture" element={
          <ProtectedRoute><HandGesture /></ProtectedRoute>
        }/>
        <Route path="/parent/setup/voice"  element={<ProtectedRoute><VoiceSetup /></ProtectedRoute>} />
<Route path="/child/play/voice"    element={<ProtectedRoute><VoiceGame  /></ProtectedRoute>} />
<Route path="/parent/setup/shadow" element={<ProtectedRoute><ShadowSetup /></ProtectedRoute>} />
<Route path="/child/play/shadow"   element={<ProtectedRoute><ShadowGame  /></ProtectedRoute>} />
<Route path="/parent/setup/mystery" element={<ProtectedRoute><PhotoMysterySetup /></ProtectedRoute>} />
<Route path="/child/play/mystery"   element={<ProtectedRoute><PhotoMysteryGame  /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
