import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PlatformPage from './pages/PlatformPage';
import LoginPage from './pages/LoginPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login/:platformId" element={<LoginPage />} />
        <Route path="/:platformId" element={<PlatformPage />} />
      </Routes>
    </Router>
  );
}
