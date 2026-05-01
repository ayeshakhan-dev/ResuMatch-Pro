import React, { useEffect, useState } from 'react';
import axios from 'axios';

import API from '../../config/api';
import DataTable from '../../components/DataTable';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';

function AdminUserResumes() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    try {
      const res = await axios.get(`${API}/admin/user-resumes`);
      setResumes(res.data);
    } catch (err) {
      console.error('Failed to load user resumes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (appId) => {
    const isConfirmed = await confirm('Delete this application? This action cannot be undone.');
    if (!isConfirmed) return;

    try {
      await axios.delete(`${API}/admin/user-resume/${appId}`);
      showToast({ type: 'success', message: 'Application deleted successfully' });
      setResumes(prev => prev.filter(app => app._id !== appId));
    } catch (err) {
      showToast({ type: 'error', message: 'Failed to delete application' });
    }
  };

  if (loading) {
    return <div className="card">Loading user resumes...</div>;
  }

  const columns = [
    { key: '_index', label: '#', sortable: false, render: (row, i) => i + 1 },
    { key: 'name', label: 'User Name' },
    { key: 'email', label: 'Email' },
    { key: 'jobTitle', label: 'Job Title' },
    { key: 'department', label: 'Department' },
    { key: 'score', label: 'Score', render: (row) => `${row.score}/100` },
    {
      key: 'status', label: 'Status',
      render: (row) => (
        <span className={`badge ${row.status === 'Shortlisted' ? 'badge-success' :
            row.status === 'Review' ? 'badge-warning' : 'badge-danger'
          }`}>
          {row.status}
        </span>
      )
    },
    { key: 'uploadDate', label: 'Uploaded', render: (row) => new Date(row.uploadDate).toLocaleDateString() },
    {
      key: 'actions', label: 'Actions', sortable: false,
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a className="btn btn-sm btn-success" href={`${API}/user/resume/${row._id}/download`} target="_blank" rel="noreferrer">
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
        <h2>👥 User Resumes</h2>
        <p>Total resumes: {resumes.length}</p>
      </div>

      <div className="card">
        {resumes.length === 0 ? (
          <p>No user resumes found.</p>
        ) : (
          <DataTable
            data={resumes}
            columns={columns}
            searchKeys={['name', 'email', 'jobTitle', 'department']}
            pageSize={10}
          />
        )}
      </div>
    </div>
  );
}

export default AdminUserResumes;