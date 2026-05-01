import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

import API from '../../config/api';

function Signup({ onLogin }) {
  const [form, setForm]     = useState({ name:'', email:'', password:'', confirm:'', role:'user', company:'' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 6)       return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/signup`, {
        name: form.name, email: form.email, password: form.password,
        role: form.role, company: form.company
      });
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>ResuMatch Pro</h1>
          <p>Create your account</p>
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
            <label>Full Name</label>
            <input type="text" placeholder="John Doe" value={form.name}
              onChange={e => set('name', e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input type="email" placeholder="you@example.com" value={form.email}
              onChange={e => set('email', e.target.value)} required />
          </div>

          {form.role === 'admin' && (
            <div className="form-group">
              <label>Company Name</label>
              <input type="text" placeholder="Your company" value={form.company}
                onChange={e => set('company', e.target.value)} required />
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="Min 6 characters" value={form.password}
              onChange={e => set('password', e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" placeholder="Repeat password" value={form.confirm}
              onChange={e => set('confirm', e.target.value)} required />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
