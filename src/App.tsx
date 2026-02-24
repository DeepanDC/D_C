import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PlatformPage from './pages/PlatformPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:platformId" element={<PlatformPage />} />
      </Routes>
    </Router>
  );
}
