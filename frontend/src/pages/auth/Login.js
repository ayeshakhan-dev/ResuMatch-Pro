import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

import API from '../../config/api';

function Login({ onLogin }) {
  const [form, setForm]     = useState({ email: '', password: '', role: 'user' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, form);
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    if (role === 'admin') setForm({ email: 'admin@resumatch.com',   password: 'admin123', role: 'admin' });
    else                  setForm({ email: 'candidate@example.com', password: 'user123',  role: 'user'  });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>ResuMatch Pro</h1>
          <p>Sign in to your account</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>I am a</label>
            <div className="role-selector">
              <button type="button" className={`role-btn ${form.role==='user'?'active':''}`} onClick={() => set('role','user')}>
                👤 Candidate
              </button>
              <button type="button" className={`role-btn ${form.role==='admin'?'active':''}`} onClick={() => set('role','admin')}>
                👨‍💼 Recruiter
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input type="email" placeholder="you@example.com" value={form.email}
              onChange={e => set('email', e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="Enter password" value={form.password}
              onChange={e => set('password', e.target.value)} required />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>No account? <Link to="/signup">Create one here</Link></p>
        </div>

        <div className="demo-box">
          <p>Quick demo login:</p>
          <div className="demo-btns">
            <button className="btn btn-secondary" onClick={() => fillDemo('user')}>Fill User</button>
            <button className="btn btn-secondary" onClick={() => fillDemo('admin')}>Fill Admin</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
