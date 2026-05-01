import React, { useEffect, useState } from 'react';
import axios from 'axios';

import API from '../../config/api';
import DataTable from '../../components/DataTable';
import { SkeletonTable } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';

function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await axios.get(`${API}/admin/user-resumes`);
      setApplications(res.data);
    } catch (err) {
      console.error('Failed to load applications:', err);
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
      setApplications(prev => prev.filter(app => app._id !== appId));
    } catch (err) {
      showToast({ type: 'error', message: 'Failed to delete application' });
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><h2>📄 Applications</h2><p>Loading...</p></div>
        <SkeletonTable columns={8} />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="card">
        <h3>📄 Applications</h3>
        <p>No applications found.</p>
      </div>
    );
  }

  const columns = [
    { key: '_index', label: '#', sortable: false, render: (row, i) => i + 1 },
    { key: 'name', label: 'Applicant', render: (row) => row.name || 'N/A' },
    { key: 'jobTitle', label: 'Job Title' },
    { key: 'department', label: 'Department' },
    { key: 'score', label: 'Score', render: (row) => <strong>{row.score}/100</strong> },
    {
      key: 'status', label: 'Status',
      render: (row) => (
        <span className={`badge ${
          row.status === 'Shortlisted' ? 'badge-success' :
          row.status === 'Review' ? 'badge-warning' : 'badge-danger'
        }`}>
          {row.status}
        </span>
      )
    },
    { key: 'uploadDate', label: 'Date', render: (row) => new Date(row.uploadDate).toLocaleDateString() },
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
        <h2>📄 Applications</h2>
        <p>Total Applications: {applications.length}</p>
      </div>

      <div className="card">
        <DataTable
          data={applications}
          columns={columns}
          searchKeys={['name', 'jobTitle', 'department', 'status']}
          pageSize={10}
        />
      </div>
    </div>
  );
}

export default Applications;