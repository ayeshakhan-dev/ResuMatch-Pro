import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SkeletonTable } from '../../components/Skeleton';

import API from '../../config/api';
import DataTable from '../../components/DataTable';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';

function UserResumes({ user }) {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { confirm } = useConfirm();

 useEffect(() => {
  loadResumes();
  // eslint-disable-next-line
}, []); // ← Make sure this is empty []

  const loadResumes = async () => {
    try {
      const response = await axios.get(`${API}/user/resumes/${user.id}`);
      console.log('✅ Loaded resumes:', response.data);
      setResumes(response.data);
    } catch (error) {
      console.error('Error loading resumes:', error);
    }
    setLoading(false);
  };

  const handleDelete = async (resumeId) => {
    const isConfirmed = await confirm('Are you sure you want to delete this resume?');
    if (!isConfirmed) return;

    try {
      await axios.delete(`${API}/user/resume/${resumeId}`);
      showToast({ type: 'success', message: 'Resume deleted successfully' });
      setResumes((prev) => prev.filter(r => r._id !== resumeId));
    } catch (error) {
      showToast({ type: 'error', message: 'Failed to delete resume' });
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><h2>📋 My Resumes</h2><p>Loading...</p></div>
        <div className="card"><SkeletonTable columns={7} /></div>
      </div>
    );
  }

  if (resumes.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h2>📋 My Resumes</h2>
          <p>View your uploaded resumes and their analysis</p>
        </div>
        <div className="card">
          <p>No resumes uploaded yet. Go to Upload page to submit your first resume!</p>
        </div>
      </div>
    );
  }

  const columns = [
    { key: '_index', label: '#', sortable: false, render: (row, i) => i + 1 },
    { key: 'jobTitle', label: 'Job Title' },
    { key: 'department', label: 'Department' },
    {
      key: 'score', label: 'Score',
      render: (row) => (
        <strong style={{ 
          color: row.score >= 70 ? '#10b981' : 
                 row.score >= 50 ? '#f59e0b' : '#ef4444' 
        }}>
          {row.score}/100
        </strong>
      )
    },
    {
      key: 'status', label: 'Status',
      render: (row) => (
        <span className={`badge ${
          row.status === 'Shortlisted' ? 'badge-success' :
          row.status === 'Review' ? 'badge-warning' : 
          'badge-danger'
        }`}>
          {row.status}
        </span>
      )
    },
    { key: 'uploadDate', label: 'Upload Date', render: (row) => new Date(row.uploadDate).toLocaleDateString() },
    {
      key: 'actions', label: 'Actions', sortable: false,
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a 
            href={`${API}/user/resume/${row._id}/download`}
            download
            className="btn btn-sm btn-success"
            style={{ textDecoration: 'none' }}
          >
            📥 PDF
          </a>
          <button 
            className="btn btn-sm btn-danger"
            onClick={() => handleDelete(row._id)}
          >
            🗑️ Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h2>📋 My Resumes</h2>
        <p>You have {resumes.length} resume(s) uploaded</p>
      </div>

      <div className="card">
        <DataTable
          data={resumes}
          columns={columns}
          searchKeys={['jobTitle', 'department', 'status']}
          pageSize={5}
        />
      </div>

      {resumes.map((resume) => (
        <div key={resume._id} className="card">
          <h3>📊 Analysis: {resume.jobTitle}</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <h4>Score Breakdown:</h4>
            <p>Skills: <strong>{resume.breakdown?.skillsScore || 0}/40</strong></p>
            <p>Experience: <strong>{resume.breakdown?.experienceScore || 0}/30</strong></p>
            <p>Education: <strong>{resume.breakdown?.educationScore || 0}/30</strong></p>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            {resume.matchedSkills?.length > 0 && (
              <div>
                <h4>✅ Skills Matched:</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {resume.matchedSkills.map((skill, i) => (
                    <span key={i} className="badge badge-success">{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            {resume.missingSkills?.length > 0 && (
              <div>
                <h4>❌ Skills to Add:</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {resume.missingSkills.map((skill, i) => (
                    <span key={i} className="badge badge-danger">{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <h4>💡 Suggestions:</h4>
            {resume.suggestions?.map((suggestion, i) => (
              <div 
                key={i} 
                style={{ 
                  marginBottom: '1rem', 
                  padding: '1rem', 
                  background: '#f8fafc', 
                  borderRadius: '8px',
                  borderLeft: `4px solid ${
                    suggestion.priority === 'Critical' || suggestion.priority === 'High' ? '#ef4444' :
                    suggestion.priority === 'Medium' ? '#f59e0b' : '#3b82f6'
                  }`
                }}
              >
                <h5>{i + 1}. {suggestion.category}</h5>
                <p><strong>{suggestion.message}</strong></p>
                <p style={{ fontSize: '0.85rem', color: '#667eea' }}>
                  Impact: {suggestion.impact}
                </p>
                {suggestion.actionItems?.length > 0 && (
                  <ul style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    {suggestion.actionItems.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <a 
            href={`${API}/user/resume/${resume._id}/download`}
            download
            className="btn btn-success btn-block"
            style={{ maxWidth: '300px', marginTop: '1rem', textDecoration: 'none', display: 'inline-block' }}
          >
            📥 Download Full PDF Report
          </a>
        </div>
      ))}
    </div>
  );
}

export default UserResumes;