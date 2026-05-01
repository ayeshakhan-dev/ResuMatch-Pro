import React, { useState } from 'react';
import axios from 'axios';
import API from '../config/api';
import { useToast } from '../components/Toast';
import { SkeletonCard } from '../components/Skeleton';

function Profile({ user, onUpdateUser }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'password'
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [company, setCompany] = useState(user?.company || '');
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  
  const { showToast } = useToast();

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const endpoint = user.role === 'admin' ? `${API}/profile/admin/${user.id}` : `${API}/profile/user/${user.id}`;
      const payload = user.role === 'admin' ? { name, email, company } : { name, email };
      
      const res = await axios.put(endpoint, payload);
      showToast({ type: 'success', message: 'Profile updated successfully!' });
      
      // Update the user state in App.js
      if (onUpdateUser && res.data.user) {
        onUpdateUser({ ...user, ...res.data.user });
      }
    } catch (err) {
      showToast({ type: 'error', message: err.response?.data?.error || 'Failed to update profile' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return showToast({ type: 'error', message: 'New passwords do not match' });
    }
    setSavingPassword(true);
    try {
      const endpoint = user.role === 'admin' ? `${API}/profile/admin/${user.id}/password` : `${API}/profile/user/${user.id}/password`;
      await axios.put(endpoint, { currentPassword, newPassword });
      
      showToast({ type: 'success', message: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast({ type: 'error', message: err.response?.data?.error || 'Failed to update password' });
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) return <SkeletonCard />;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="page-header">
        <h2>👤 My Profile</h2>
        <p>Manage your account settings and preferences</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
          <button 
            style={{ flex: 1, padding: '1rem', border: 'none', background: activeTab === 'profile' ? 'white' : 'transparent', borderBottom: activeTab === 'profile' ? '2px solid var(--accent)' : '2px solid transparent', fontWeight: activeTab === 'profile' ? '600' : 'normal', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setActiveTab('profile')}
          >
            Profile Details
          </button>
          <button 
            style={{ flex: 1, padding: '1rem', border: 'none', background: activeTab === 'password' ? 'white' : 'transparent', borderBottom: activeTab === 'password' ? '2px solid var(--accent)' : '2px solid transparent', fontWeight: activeTab === 'password' ? '600' : 'normal', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setActiveTab('password')}
          >
            Change Password
          </button>
        </div>

        <div style={{ padding: '2rem' }}>
          {activeTab === 'profile' ? (
            <form onSubmit={handleProfileSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>
              
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>

              {user.role === 'admin' && (
                <div className="form-group">
                  <label>Company</label>
                  <input 
                    type="text" 
                    value={company} 
                    onChange={(e) => setCompany(e.target.value)} 
                    required 
                  />
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '1rem' }}
                disabled={savingProfile}
              >
                {savingProfile ? 'Saving...' : 'Update Profile'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label>Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword} 
                  onChange={(e) => setCurrentPassword(e.target.value)} 
                  required 
                />
              </div>
              
              <div className="form-group">
                <label>New Password</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                  minLength={6}
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Minimum 6 characters</p>
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                  minLength={6}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '1rem' }}
                disabled={savingPassword}
              >
                {savingPassword ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
