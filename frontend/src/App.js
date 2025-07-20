import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import ChatRoom from "./components/ChatRoom";
import "./components/landing.css"; // Import global styles

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page (Default) */}
        <Route path="/" element={<LandingPage />} />
        {/* Chat Page */}
        <Route path="/chat" element={<ChatRoom />} />
      </Routes>
    </Router>
  );
}

export default App;
