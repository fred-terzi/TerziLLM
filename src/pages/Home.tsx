import React from 'react';
import './Home.css';

const Home: React.FC = () => {
  return (
    <div className="home-page">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="logo-text">TerziLLM</h1>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h2>Welcome to TerziLLM</h2>
          <p>Experience the power of advanced AI conversation at your fingertips</p>
          <button className="cta-button">Start Chatting</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
      </footer>
    </div>
  );
};

export default Home;
