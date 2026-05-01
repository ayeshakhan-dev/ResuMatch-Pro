import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';

function Navbar({ user, onLogout, isSuperAdmin }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => {
    setShowDropdown(false);
    onLogout();
    navigate('/');
  };

  const handleDropdownToggle = (e) => {
    e.stopPropagation();
    setShowDropdown(prev => !prev);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">

        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <img
            src="/logo.png"
            alt="ResuMatch Pro"
            className="navbar-logo-img"
          />
          <span className="navbar-logo-text">ResuMatch Pro</span>
        </Link>

        {/* Navigation Menu */}
        <div className="navbar-menu">
          {!isAdmin ? (
            <>
              <Link
                to="/upload"
                className={location.pathname === '/upload' ? 'nav-link active' : 'nav-link'}
              >
                📤 Upload Resume
              </Link>
              <Link
                to="/my-resumes"
                className={location.pathname === '/my-resumes' ? 'nav-link active' : 'nav-link'}
              >
                📋 My Resumes
              </Link>
              <Link
                to="/templates"
                className={location.pathname === '/templates' ? 'nav-link active' : 'nav-link'}
              >
                📄 Templates
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/"
                className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}
              >
                📊 Dashboard
              </Link>
              <Link
                to="/jobs"
                className={location.pathname === '/jobs' ? 'nav-link active' : 'nav-link'}
              >
                💼 Jobs
              </Link>
              <Link
                to="/user-resumes"
                className={location.pathname === '/user-resumes' ? 'nav-link active' : 'nav-link'}
              >
                👤 Applications
              </Link>
              <Link
                to="/bulk-resumes"
                className={location.pathname === '/bulk-resumes' ? 'nav-link active' : 'nav-link'}
              >
                📤 Bulk Screening
              </Link>
              <Link
                to="/bulk-upload"
                className={location.pathname === '/bulk-upload' ? 'nav-link active' : 'nav-link'}
              >
                ⬆️ Upload Bulk
              </Link>

              {isSuperAdmin && (
                <Link
                  to="/superadmin"
                  className={
                    location.pathname.startsWith('/superadmin')
                      ? 'nav-link superadmin-link active'
                      : 'nav-link superadmin-link'
                  }
                >
                  🎛️ Super Admin
                </Link>
              )}
            </>
          )}
        </div>

        {/* User Dropdown */}
        <div className="navbar-user">
          <div className="user-profile-btn" onClick={handleDropdownToggle}>
            <div className="user-avatar">{isAdmin ? '👔' : '👤'}</div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role">
                {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'Candidate'}
              </span>
            </div>
            <span className="dropdown-arrow">{showDropdown ? '▲' : '▼'}</span>
          </div>

          {showDropdown && (
            <div className="user-dropdown">

              {/* Header */}
              <div className="dropdown-header">
                <div className="dropdown-avatar">{isAdmin ? '👔' : '👤'}</div>
                <div>
                  <div className="dropdown-name">{user.name}</div>
                  <div className="dropdown-email">{user.email}</div>
                  <div className={`dropdown-role-badge ${isSuperAdmin ? 'badge-superadmin' : ''}`}>
                    {isSuperAdmin ? '🎛️ Super Admin' : isAdmin ? 'Administrator' : 'Job Seeker'}
                  </div>
                </div>
              </div>

              <div className="dropdown-divider"></div>
              
              {/* Profile Link */}
              <Link
                to="/profile"
                className="dropdown-item dropdown-item-link"
                onClick={() => setShowDropdown(false)}
              >
                <span className="dropdown-icon">👤</span>
                <span>My Profile</span>
              </Link>

              {/* Super Admin shortcut */}
              {isSuperAdmin && (
                <>
                  <div className="dropdown-divider"></div>
                  <Link
                    to="/superadmin"
                    className="dropdown-item dropdown-item-link"
                    onClick={() => setShowDropdown(false)}
                  >
                    <span className="dropdown-icon">🎛️</span>
                    <span>Super Admin Panel</span>
                  </Link>
                </>
              )}

              <div className="dropdown-divider"></div>

              {/* Logout Button */}
              <button
                className="dropdown-item dropdown-item-logout"
                onClick={handleLogout}
              >
                <span className="dropdown-icon">🚪</span>
                <span>Logout</span>
              </button>

            </div>
          )}
        </div>
      </div>

      {/* Overlay to close dropdown when clicking outside */}
      {showDropdown && (
        <div
          className="dropdown-overlay"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </nav>
  );
}

export default Navbar;
