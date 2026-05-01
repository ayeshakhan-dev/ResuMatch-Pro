// FILE 14: frontend/src/pages/admin/AdminResumes.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

import API from '../../config/api';
import { useConfirm } from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import { SkeletonTable, SkeletonCard } from '../../components/Skeleton';

function AdminResumes({ user }) {
  const [resumes,     setResumes]     = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jobs,        setJobs]        = useState([]);
  const [filterDept,  setFilterDept]  = useState('');
  const [filterJob,   setFilterJob]   = useState('');
  const [filterStatus,setFilterStatus]= useState('');
  const [selected,    setSelected]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const { confirm } = useConfirm();

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/departments`),
      axios.get(`${API}/admin/jobs`)
    ]).then(([d, j]) => { setDepartments(d.data); setJobs(j.data); });
  }, []);

  useEffect(() => {
  const fetchResumes = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterDept)   params.append('department', filterDept);
    if (filterJob)    params.append('jobId', filterJob);
    if (filterStatus) params.append('status', filterStatus);
    const res = await axios.get(`${API}/admin/resumes?${params}`);
    setResumes(res.data);
    setLoading(false);
  };
  
  fetchResumes();
}, [filterDept, filterJob, filterStatus]);
  const handleDelete = async (id) => {
    const ok = await confirm('Delete this resume?');
    if (!ok) return;
    await axios.delete(`${API}/admin/resume/${id}`);
    setResumes(r => r.filter(x => x._id !== id));
    if (selected?._id === id) setSelected(null);
  };

  const handleStatusChange = async (id, status) => {
    await axios.put(`${API}/admin/resume/${id}/status`, { status });
    setResumes(r => r.map(x => x._id === id ? { ...x, status } : x));
    if (selected?._id === id) setSelected(s => ({ ...s, status }));
  };

  const downloadReport = () => {
    const params = new URLSearchParams();
    if (filterDept)   params.append('department', filterDept);
    if (filterJob)    params.append('jobId', filterJob);
    if (filterStatus) params.append('status', filterStatus);
    window.open(`${API}/admin/download-report?${params}`, '_blank');
  };

  const clearFilters = () => { setFilterDept(''); setFilterJob(''); setFilterStatus(''); };

  const badge = (s) => s === 'Shortlisted' ? 'badge-success' : s === 'Review' ? 'badge-warning' : 'badge-danger';

  const columns = [
    { key: '_index', label: 'Rank', sortable: false, render: (row, i) => <strong>#{i+1}</strong> },
    { 
      key: 'name', label: 'Name', 
      render: (row) => (
        <div>
          <strong>{row.name}</strong>
          <div style={{ fontSize:'0.78rem', color:'var(--muted)' }}>{row.email}</div>
        </div>
      )
    },
    { 
      key: 'jobTitle', label: 'Position',
      render: (row) => (
        <div>
          {row.jobTitle}
          <div style={{ fontSize:'0.78rem', color:'var(--muted)' }}>{row.experience} yrs exp</div>
        </div>
      )
    },
    { key: 'score', label: 'Score', render: (row) => <span className="score-badge">{row.score}/100</span> },
    {
      key: 'status', label: 'Status',
      render: (row) => (
        <select value={row.status} onChange={e => handleStatusChange(row._id, e.target.value)}
          style={{ padding:'0.25rem 0.5rem', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'0.82rem', cursor:'pointer' }}>
          <option>Shortlisted</option>
          <option>Review</option>
          <option>Rejected</option>
        </select>
      )
    },
    {
      key: 'actions', label: 'Actions', sortable: false,
      render: (row) => (
        <div style={{ display:'flex', gap:'0.35rem' }}>
          <button className="btn btn-secondary" style={{ padding:'0.3rem 0.6rem', fontSize:'0.78rem' }}
            onClick={() => setSelected(selected?._id===row._id ? null : row)}>
            {selected?._id===row._id ? 'Close' : 'View'}
          </button>
          <button className="btn btn-danger" style={{ padding:'0.3rem 0.6rem', fontSize:'0.78rem' }}
            onClick={() => handleDelete(row._id)}>Del</button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h2>All Resumes</h2>
        <p>Review, filter and manage candidate applications</p>
      </div>

      {/* Filters */}
      <div className="filters">
        <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setFilterJob(''); }}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
        </select>

        <select value={filterJob} onChange={e => setFilterJob(e.target.value)}>
          <option value="">All Positions</option>
          {jobs.filter(j => !filterDept || j.department === filterDept).map(j => (
            <option key={j.id} value={j.id}>{j.title}</option>
          ))}
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="Shortlisted">Shortlisted</option>
          <option value="Review">Review</option>
          <option value="Rejected">Rejected</option>
        </select>

        {(filterDept || filterJob || filterStatus) && (
          <button className="btn btn-secondary" onClick={clearFilters}>✕ Clear</button>
        )}

        <button className="btn btn-accent ml-auto" onClick={downloadReport}>📥 Download Report</button>
      </div>

      {/* Table */}
      <div className="card">
        <h3>
          {resumes.length} Candidate{resumes.length !== 1 ? 's' : ''}
          {filterStatus ? ` — ${filterStatus}` : ''}
        </h3>

        {loading ? (
          <SkeletonTable columns={6} />
        ) : resumes.length === 0 ? (
          <div className="empty-state" style={{ padding:'2rem' }}>
            <p>No resumes found with current filters.</p>
            <button className="btn btn-secondary" onClick={clearFilters}>Clear Filters</button>
          </div>
        ) : (
          <DataTable
            data={resumes}
            columns={columns}
            searchKeys={['name', 'email', 'jobTitle']}
            pageSize={10}
          />
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:'1.5rem' }}>
            <div>
              <h3>{selected.name}</h3>
              <p style={{ color:'var(--muted)', fontSize:'0.88rem' }}>
                {selected.jobTitle} · Score: <strong>{selected.score}/100</strong> · {selected.email} · {selected.phone}
              </p>
            </div>
            <span className={`badge ${badge(selected.status)}`} style={{ fontSize:'0.9rem', padding:'0.4rem 1rem' }}>
              {selected.status}
            </span>
          </div>

          {/* Score breakdown */}
          {[{l:'Skills',v:selected.breakdown.skillsScore,m:40},{l:'Experience',v:selected.breakdown.experienceScore,m:30},{l:'Education',v:selected.breakdown.educationScore,m:30}].map(b => (
            <div key={b.l} className="progress-wrap">
              <div className="progress-label"><span>{b.l}</span><strong>{b.v}/{b.m}</strong></div>
              <div className="progress-track"><div className="progress-fill" style={{width:`${b.m>0?(b.v/b.m)*100:0}%`}} /></div>
            </div>
          ))}

          {/* Skills */}
          <div style={{ marginTop:'1rem', display:'flex', gap:'1.5rem', flexWrap:'wrap' }}>
            {selected.matchedSkills?.length > 0 && (
              <div>
                <strong style={{ fontSize:'0.85rem' }}>✅ Found:</strong>
                <div className="skill-tags" style={{ marginTop:'0.3rem' }}>
                  {selected.matchedSkills.map((s,i) => <span key={i} className="skill-tag skill-found">✓ {s}</span>)}
                </div>
              </div>
            )}
            {selected.missingSkills?.length > 0 && (
              <div>
                <strong style={{ fontSize:'0.85rem' }}>❌ Missing:</strong>
                <div className="skill-tags" style={{ marginTop:'0.3rem' }}>
                  {selected.missingSkills.map((s,i) => <span key={i} className="skill-tag skill-missing">✗ {s}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminResumes;
