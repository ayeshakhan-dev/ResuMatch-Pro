// FILE: frontend/src/pages/user/UserUpload.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import API from '../../config/api';

function UserUpload({ user }) {
  const [departments, setDepartments] = useState([]);
  const [jobs,        setJobs]        = useState([]);
  const [selDept,     setSelDept]     = useState('');
  const [selJob,      setSelJob]      = useState('');
  const [file,        setFile]        = useState(null);
  const [uploading,   setUploading]   = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/departments`).then(r => setDepartments(r.data));
  }, []);

  useEffect(() => {
    const url = selDept ? `${API}/jobs?department=${selDept}` : `${API}/jobs`;
    axios.get(url).then(r => { setJobs(r.data); setSelJob(''); });
  }, [selDept]);

  const pickFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (['pdf','docx','doc'].includes(ext)) { setFile(f); setError(''); }
    else setError('Only PDF or DOCX files are allowed');
  };

  const handleUpload = async () => {
    if (!file)   return setError('Please select a resume file');
    if (!selJob) return setError('Please select a job position');
    setUploading(true); setError(''); setResult(null);
    const fd = new FormData();
    fd.append('resume', file);
    fd.append('jobId',  selJob);
    fd.append('userId', user.id);
    try {
      const res = await axios.post(`${API}/user/upload`, fd, { headers: {'Content-Type':'multipart/form-data'} });
      setResult(res.data.resume);
      setFile(null); setSelJob('');
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Upload Resume</h2>
        <p>Get instant scoring and personalized AI improvement tips</p>
      </div>

      <div className="card">
        {error  && <div className="error-msg">{error}</div>}
        {result && (
          <div className="success-msg">
            <h4>✅ Resume Analyzed Successfully!</h4>
            <p>Score: <strong>{result.score}/100</strong> · Status: <strong>{result.status}</strong></p>
            <div style={{ marginTop:'0.75rem', display:'flex', gap:'0.75rem' }}>
              <button className="btn btn-primary" onClick={() => navigate('/my-resumes')}>View Full Analysis & Tips</button>
              <button className="btn btn-secondary" onClick={() => setResult(null)}>Upload Another</button>
            </div>
          </div>
        )}

        {!result && (
          <>
            {/* Department filter */}
            <div className="form-group">
              <label>Filter by Department (Optional)</label>
              <select value={selDept} onChange={e => setSelDept(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
              </select>
            </div>

            {/* Job selection */}
            <div className="form-group">
              <label>Select Job Position *</label>
              <select value={selJob} onChange={e => setSelJob(e.target.value)}>
                <option value="">Choose a position...</option>
                {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
              </select>
              {jobs.length === 0 && <p style={{ fontSize:'0.82rem', color:'var(--danger)', marginTop:'0.3rem' }}>No jobs in this department yet.</p>}
            </div>

            {/* File upload zone */}
            <div
              className={`upload-zone ${file ? 'has-file' : ''}`}
              onClick={() => document.getElementById('resume-input').click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); pickFile(e.dataTransfer.files[0]); }}
            >
              <div className="upload-icon">{file ? '✅' : '📄'}</div>
              <h3>{file ? file.name : 'Drop your resume here'}</h3>
              <p>{file ? `${(file.size/1024).toFixed(0)} KB · Ready to upload` : 'or click to browse — PDF, DOCX accepted'}</p>
              <input id="resume-input" type="file" accept=".pdf,.docx,.doc"
                onChange={e => pickFile(e.target.files[0])} style={{ display:'none' }} />
            </div>

            <div style={{ marginTop:'1.5rem', textAlign:'center' }}>
              <button className="btn btn-primary btn-block" onClick={handleUpload}
                disabled={!file || !selJob || uploading} style={{ maxWidth:'300px' }}>
                {uploading ? '⏳ Analyzing Resume...' : '🚀 Upload & Analyze'}
              </button>
            </div>

            {/* What happens next */}
            <div style={{ marginTop:'2rem', padding:'1rem', background:'#f8fafc', borderRadius:'10px' }}>
              <strong style={{ fontSize:'0.9rem' }}>📋 What happens next?</strong>
              <ul style={{ marginTop:'0.5rem', marginLeft:'1.25rem', fontSize:'0.85rem', color:'var(--muted)' }}>
                <li>Your resume text is extracted automatically</li>
                <li>Skills, experience & education are matched to the job</li>
                <li>You get a score out of 100 instantly</li>
                <li>Personalized tips show you exactly how to improve</li>
                <li>Download a PDF report of your analysis</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default UserUpload;