import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
     {/* Header */}
      <header className="landing-header">
        <div className="container">
          <Link to="/" className="logo">
            <img 
              src="/logo.png" 
              alt="ResuMatch Pro" 
              className="landing-logo-img"
            />
          </Link>
          
          <nav className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#about">About</a>
            <Link to="/login" className="btn-outline">Login</Link>
            <Link to="/signup" className="btn-primary">Get Started</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Get Your Dream Job with AI-Powered Resume Analysis</h1>
            <p>ResuMatch Pro uses advanced AI to analyze your resume, provide instant feedback, and match you with the perfect opportunities.</p>
            <div className="hero-buttons">
              <button className="btn-large btn-primary" onClick={() => navigate('/signup')}>
                Start Free Analysis
              </button>
              <button className="btn-large btn-outline" onClick={() => navigate('/login')}>
                I Have an Account
              </button>
            </div>
            <p className="hero-note">✨ No credit card required • Instant results</p>
          </div>
          <div className="hero-image">
            <div className="mockup-card">
              <div className="score-display">85/100</div>
              <p>Your resume score in seconds!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <h2>Why Choose ResuMatch Pro?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>AI-Powered Analysis</h3>
              <p>Advanced algorithms analyze your resume against job requirements and provide detailed feedback.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Instant Results</h3>
              <p>Get your resume score and personalized suggestions in under 10 seconds.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Detailed Reports</h3>
              <p>Download professional PDF reports with actionable insights to improve your resume.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Job Matching</h3>
              <p>Match your skills with available positions across 7 major departments.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>Score Breakdown</h3>
              <p>See exactly how you score on skills, experience, and education criteria.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💡</div>
              <h3>Smart Suggestions</h3>
              <p>Get personalized tips to boost your score from 50 to 70+ and land interviews.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <h2>How It Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Upload Your Resume</h3>
              <p>Upload your resume in PDF or DOCX format. We support all standard formats.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>AI Analysis</h3>
              <p>Our AI analyzes your resume against job requirements, checking skills, experience, and education.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Get Your Score</h3>
              <p>Receive an instant score out of 100 with detailed breakdown and personalized suggestions.</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Improve & Apply</h3>
              <p>Follow our suggestions to improve your resume and apply with confidence!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat">
              <h3>10,000+</h3>
              <p>Resumes Analyzed</p>
            </div>
            <div className="stat">
              <h3>95%</h3>
              <p>User Satisfaction</p>
            </div>
            <div className="stat">
              <h3>7</h3>
              <p>Industry Departments</p>
            </div>
            <div className="stat">
              <h3>24/7</h3>
              <p>Instant Analysis</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about">
        <div className="container">
          <h2>About ResuMatch Pro</h2>
          <p>ResuMatch Pro is an AI-powered resume analysis platform designed to help job seekers and recruiters make better hiring decisions. Our advanced algorithms analyze resumes against job requirements and provide instant, actionable feedback.</p>
          <div className="about-features">
            <div className="about-item">
              <h4>For Job Seekers</h4>
              <ul>
                <li>✓ Instant resume scoring</li>
                <li>✓ Personalized improvement tips</li>
                <li>✓ Job matching across departments</li>
                <li>✓ Professional PDF reports</li>
              </ul>
            </div>
            <div className="about-item">
              <h4>For Recruiters</h4>
              <ul>
                <li>✓ Bulk resume screening</li>
                <li>✓ Automated candidate ranking</li>
                <li>✓ Department-wise analytics</li>
                <li>✓ Excel export for easy sharing</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <h2>Ready to Boost Your Career?</h2>
          <p>Join thousands of job seekers who improved their resumes with ResuMatch Pro</p>
          <button className="btn-large btn-primary" onClick={() => navigate('/signup')}>
            Get Started Free →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>📄 ResuMatch Pro</h4>
              <p>AI-powered resume analysis for better hiring decisions.</p>
            </div>
            <div className="footer-section">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#about">About</a>
            </div>
            <div className="footer-section">
              <h4>Support</h4>
              <Link to="/login">Login</Link>
              <Link to="/signup">Sign Up</Link>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2026 ResuMatch Pro. All rights reserved.</p>
            {/* Hidden Admin Portal Link */}
            <Link to="/login" className="admin-portal-link">
              Admin Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;