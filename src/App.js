import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';
import HomePage from './pages/HomePage'
import ChildDashboard from './pages/child/ChildDashboard'
import PuzzleGame from './pages/puzzle/PuzzleGame'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"     element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="*"     element={<NotFound />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/child/dashboard" element={<ChildDashboard />} />
        <Route path="/child/play/puzzle" element={<PuzzleGame />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;