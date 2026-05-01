import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { SkeletonGrid } from '../../components/Skeleton';

import API from '../../config/api';

function UserDashboard({ user }) {
  const [resumes, setResumes] = useState([]);
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/user/resumes/${user.id}`),
      axios.get(`${API}/jobs`)
    ]).then(([r, j]) => {
      setResumes(r.data);
      setJobs(j.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user.id]);

  if (loading) return (
    <div>
      <div className="page-header"><h2>Welcome back, {user.name}! 👋</h2><p>Loading your dashboard...</p></div>
      <SkeletonGrid count={3} />
    </div>
  );

  const latest = resumes[0];

  return (
    <div>
      <div className="page-header">
        <h2>Welcome back, {user.name}! 👋</h2>
        <p>Track your applications and get AI-powered improvement tips</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card"><h3>{resumes.length}</h3><p>Submitted</p></div>
        <div className="stat-card"><h3>{resumes.filter(r=>r.status==='Shortlisted').length}</h3><p>Shortlisted</p></div>
        <div className="stat-card"><h3>{latest ? latest.score : '-'}</h3><p>Latest Score</p></div>
        <div className="stat-card"><h3>{jobs.length}</h3><p>Open Jobs</p></div>
      </div>

      {resumes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h3>No resumes yet!</h3>
            <p>Upload your first resume to get instant scoring and AI tips</p>
            <Link to="/upload" className="btn btn-primary">Upload Resume</Link>
          </div>
        </div>
      ) : (
        <>
          {/* Latest score */}
          <div className="card">
            <h3>Latest Analysis — {latest.jobTitle}</h3>
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', marginBottom:'1.25rem' }}>
                <span>Score: <span className="score-badge">{latest.score}/100</span></span>
                <span>Status: <span className={`badge ${latest.status==='Shortlisted'?'badge-success':latest.status==='Review'?'badge-warning':'badge-danger'}`}>{latest.status}</span></span>
                <span style={{ color:'var(--muted)', fontSize:'0.88rem' }}>Submitted: {new Date(latest.uploadDate).toLocaleDateString()}</span>
              </div>

              {/* Breakdown */}
              {[{l:'Skills Match',v:latest.breakdown.skillsScore,m:40},{l:'Experience',v:latest.breakdown.experienceScore,m:30},{l:'Education',v:latest.breakdown.educationScore,m:30}].map(b => (
                <div key={b.l} className="progress-wrap">
                  <div className="progress-label"><span>{b.l}</span><strong>{b.v}/{b.m}</strong></div>
                  <div className="progress-track"><div className="progress-fill" style={{width:`${b.m>0?(b.v/b.m)*100:0}%`}} /></div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions preview */}
          {latest.suggestions?.length > 0 && (
            <div className="card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <h3>💡 Improvement Tips</h3>
                <Link to="/my-resumes" className="btn btn-secondary">View All Tips</Link>
              </div>
              <div className="suggestions" style={{ marginTop:'1rem' }}>
                {latest.suggestions.slice(0,2).map((s, i) => (
                  <div key={i} className={`suggestion-card priority-${s.priority.toLowerCase()}`}>
                    <div className="sug-header">
                      <span className={`priority-badge priority-${s.priority.toLowerCase()}`}>{s.priority}</span>
                      <span className="impact-chip">{s.impact}</span>
                    </div>
                    <div style={{ fontWeight:700, marginBottom:'0.3rem', fontSize:'0.9rem' }}>{s.category}</div>
                    <div className="sug-message">{s.message}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:'1.25rem', display:'flex', gap:'0.75rem' }}>
                <Link to="/my-resumes" className="btn btn-secondary">See All Tips</Link>
                <Link to="/upload" className="btn btn-primary">Upload Improved Resume</Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* Available jobs */}
      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3>Available Jobs ({jobs.length})</h3>
          <Link to="/upload" className="btn btn-accent">Apply Now</Link>
        </div>
        <div style={{ marginTop:'1rem' }}>
          {jobs.slice(0,5).map(job => (
  <div key={job._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.85rem', borderBottom:'1px solid var(--border)' }}>
              <div>
                <strong style={{ fontSize:'0.95rem' }}>{job.title}</strong>
                <div style={{ fontSize:'0.82rem', color:'var(--muted)', marginTop:'0.2rem' }}>
                  {job.experience}+ years · {job.skills.slice(0,3).join(', ')}
                </div>
              </div>
              <Link to="/upload" className="btn btn-secondary" style={{ fontSize:'0.82rem', padding:'0.4rem 0.8rem' }}>Apply</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;
