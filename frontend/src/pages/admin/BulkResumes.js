import React, { useState, useEffect } from 'react';
import axios from 'axios';

import API from '../../config/api';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import { SkeletonTable } from '../../components/Skeleton';

function BulkResumes({ user }) {
  const [resumes, setResumes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [filterDept, setFilterDept] = useState('');
  const [filterJob, setFilterJob] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedResume, setSelectedResume] = useState(null);
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    axios.get(`${API}/departments`).then(r => setDepartments(r.data));
    axios.get(`${API}/admin/jobs`).then(r => setJobs(r.data));
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [filterDept, filterJob, filterStatus]);

  const fetchResumes = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterDept) params.append('department', filterDept);
    if (filterJob) params.append('jobId', filterJob);
    if (filterStatus) params.append('status', filterStatus);
    const res = await axios.get(`${API}/admin/admin-resumes?${params}`);
    setResumes(res.data);
    setLoading(false);
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`${API}/admin/admin-resume/${id}/status`, { status: newStatus });
      fetchResumes();
    } catch (err) {
      showToast({ type: 'error', message: 'Failed to update status' });
    }
  };

  const deleteResume = async (id) => {
    const ok = await confirm('Delete this resume?');
    if (ok) {
      try {
        await axios.delete(`${API}/admin/admin-resume/${id}`);
        fetchResumes();
      } catch (err) {
        showToast({ type: 'error', message: 'Failed to delete resume' });
      }
    }
  };

  const downloadReport = () => {
    const params = new URLSearchParams();
    if (filterDept) params.append('department', filterDept);
    if (filterJob) params.append('jobId', filterJob);
    if (filterStatus) params.append('status', filterStatus);
    window.open(`${API}/admin/download-admin-report?${params}`, '_blank');
  };

  const downloadExcel = () => {
    const params = new URLSearchParams();
    if (filterDept) params.append('department', filterDept);
    if (filterJob) params.append('jobId', filterJob);
    if (filterStatus) params.append('status', filterStatus);
    window.open(`${API}/admin/export-admin-excel?${params}`, '_blank');
  };

  const columns = [
    { key: '_index', label: 'Rank', sortable: false, render: (row, i) => i + 1 },
    { key: 'name', label: 'Name' },
    { key: 'jobTitle', label: 'Position' },
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
        <>
          <button className="btn btn-sm btn-primary" onClick={() => setSelectedResume(row)}>👁️ View</button>
          <button className="btn btn-sm btn-danger" onClick={() => deleteResume(row._id)}>🗑️</button>
        </>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h2>📤 Bulk Uploaded Resumes</h2>
        <p>Resumes uploaded by admins for screening</p>
      </div>

      <div className="filters">
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
        </select>

        <select value={filterJob} onChange={e => setFilterJob(e.target.value)}>
          <option value="">All Positions</option>
          {jobs.filter(j => !filterDept || j.department === filterDept).map(j => (
            <option key={j._id} value={j._id}>{j.title}</option>
          ))}
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="Shortlisted">Shortlisted</option>
          <option value="Review">Review</option>
          <option value="Rejected">Rejected</option>
        </select>

        {(filterDept || filterJob || filterStatus) && (
          <button className="btn btn-secondary" onClick={() => { setFilterDept(''); setFilterJob(''); setFilterStatus(''); }}>
            ✕ Clear
          </button>
        )}

        <button className="btn btn-accent ml-auto" onClick={downloadReport}>📥 PDF Report</button>
        <button className="btn btn-success" onClick={downloadExcel}>📊 Excel</button>
      </div>

      {loading ? (
        <SkeletonTable columns={8} />
      ) : resumes.length === 0 ? (
        <div className="card"><p>No bulk uploaded resumes found.</p></div>
      ) : (
        <div className="card">
          <DataTable
            data={resumes}
            columns={columns}
            searchKeys={['name', 'jobTitle', 'status']}
            pageSize={10}
          />
        </div>
      )}

      {selectedResume && (
        <div className="modal-overlay" onClick={() => setSelectedResume(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Resume Details</h3>
            <div style={{ marginTop: '1rem' }}>
              <p><strong>Name:</strong> {selectedResume.name}</p>
              <p><strong>Email:</strong> {selectedResume.email || 'Not found'}</p>
              <p><strong>Phone:</strong> {selectedResume.phone || 'Not found'}</p>
              <p><strong>Position:</strong> {selectedResume.jobTitle}</p>
              <p><strong>Score:</strong> {selectedResume.score}/100</p>
              <p><strong>Batch ID:</strong> {selectedResume.batchId}</p>
              <p><strong>Status:</strong> 
                <select value={selectedResume.status} onChange={e => updateStatus(selectedResume._id, e.target.value)} style={{ marginLeft: '0.5rem' }}>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Review">Review</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </p>
              <p><strong>Skills Matched:</strong> {selectedResume.matchedSkills.join(', ') || 'None'}</p>
              <p><strong>Skills Missing:</strong> {selectedResume.missingSkills.join(', ') || 'None'}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedResume(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BulkResumes;