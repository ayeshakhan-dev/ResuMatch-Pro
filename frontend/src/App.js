import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';

// Public pages
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';

// User pages
import Profile from './pages/Profile';
import Templates from './pages/user/Templates';
import UserUpload from './pages/user/UserUpload';
import UserResumes from './pages/user/UserResumes';
import UserDashboard from './pages/user/UserDashboard';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminJobs from './pages/admin/AdminJobs';
import AdminResumes from './pages/admin/AdminResumes';
import BulkUpload from './pages/admin/BulkUpload';
import AdminUserResumes from './pages/admin/UserResumes';
import AdminBulkResumes from './pages/admin/BulkResumes';
import Applications from './pages/admin/Applications';

// Super Admin pages
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import AdminManagement from './pages/admin/AdminManagement';
import DepartmentManagement from './pages/admin/DepartmentManagement';
import AuditLogs from './pages/admin/AuditLogs';

import './App.css';

// ✅ Define who is Super Admin (match with backend)
const SUPER_ADMIN_EMAILS = ['admin@resumatch.com', 'superadmin@resumatch.com'];

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Invalid user data, clearing storage');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const isAdmin = user?.role === 'admin';
  const isSuperAdmin = isAdmin && SUPER_ADMIN_EMAILS.includes(user?.email);

  return (
    <BrowserRouter>
      <ToastProvider>
      <ConfirmProvider>
      {user && <Navbar user={user} onLogout={handleLogout} isSuperAdmin={isSuperAdmin} />}

      <div className={user ? 'container' : ''}>
        <Routes>

          {/* ---------------- PUBLIC ---------------- */}
          {!user && (
            <>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="/signup" element={<Signup onLogin={handleLogin} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}

          {/* ---------------- USER ---------------- */}
          {user && !isAdmin && (
            <>
              <Route path="/" element={<UserDashboard user={user} />} />
              <Route path="/upload" element={<UserUpload user={user} />} />
              <Route path="/my-resumes" element={<UserResumes user={user} />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/profile" element={<Profile user={user} onUpdateUser={handleLogin} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}

          {/* ---------------- ADMIN ---------------- */}
          {user && isAdmin && (
            <>
              <Route path="/" element={<AdminDashboard user={user} />} />
              <Route path="/jobs" element={<AdminJobs user={user} />} />
              <Route path="/resumes" element={<AdminResumes />} />
              <Route path="/bulk-upload" element={<BulkUpload />} />
              <Route path="/user-resumes" element={<AdminUserResumes />} />
              <Route path="/bulk-resumes" element={<AdminBulkResumes />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/profile" element={<Profile user={user} onUpdateUser={handleLogin} />} />

              {/* ---- SUPER ADMIN ONLY ---- */}
              {isSuperAdmin && (
                <>
                  <Route path="/superadmin" element={<SuperAdminDashboard />} />
                  <Route path="/superadmin/users" element={<UserManagement />} />
                  <Route path="/superadmin/admins" element={<AdminManagement />} />
                  <Route path="/superadmin/departments" element={<DepartmentManagement />} />
                  <Route path="/superadmin/logs" element={<AuditLogs />} />
                </>
              )}

              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}

        </Routes>
      </div>

      {user && <Chatbot user={user} />}

      </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
