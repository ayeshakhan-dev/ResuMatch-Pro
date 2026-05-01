// FILE 13: frontend/src/pages/admin/AdminJobs.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

import API from '../../config/api';
import { useConfirm } from '../../components/ConfirmDialog';
import { SkeletonGrid } from '../../components/Skeleton';

const BLANK = { title:'', department:'', description:'', skills:'', experience:'', education:'' };

function AdminJobs({ user }) {
  const [jobs,        setJobs]        = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showModal,   setShowModal]   = useState(false);
  const [form,        setForm]        = useState(BLANK);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [editId,      setEditId]      = useState(null);
  const { confirm } = useConfirm();

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/admin/jobs`),
      axios.get(`${API}/departments`)
    ]).then(([j, d]) => { setJobs(j.data); setDepartments(d.data); setLoading(false); });
  }, []);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const getDeptName = (id) => departments.find(d => d.id === id)?.name || id;
  const getDeptIcon = (id) => departments.find(d => d.id === id)?.icon || '💼';

  const handleSave = async () => {
    if (!form.title || !form.department || !form.skills || !form.experience) {
      return setError('Please fill in all required fields');
    }
    setSaving(true); setError('');
    try {
      if (editId) {
        const res = await axios.put(`${API}/admin/jobs/${editId}`, form);
        setJobs(j => j.map(job => job._id === editId ? res.data.job : job));
      } else {
        const res = await axios.post(`${API}/admin/jobs`, { ...form, adminId: user.id });
        setJobs(j => [...j, res.data.job]);
      }
      setShowModal(false); setForm(BLANK); setEditId(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save job');
    } finally { setSaving(false); }
  };

  const handleEditClick = (job) => {
    setEditId(job._id);
    setForm({
      title: job.title || '',
      department: job.department || '',
      description: job.description || '',
      skills: job.skills ? job.skills.join(', ') : '',
      experience: job.experience || '',
      education: job.education ? job.education.join(', ') : ''
    });
    setShowModal(true);
    setError('');
  };

  const handleDelete = async (id) => {
    const ok = await confirm('Delete this job posting?');
    if (!ok) return;
    await axios.delete(`${API}/admin/jobs/${id}`);
    setJobs(j => j.filter(job => job._id !== id));
  };

  if (loading) return (
    <div>
      <div className="page-header"><h2>Job Postings</h2><p>Loading jobs...</p></div>
      <SkeletonGrid count={4} />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h2>Job Postings</h2>
        <p>Create and manage your open positions</p>
      </div>

      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3>All Jobs ({jobs.length})</h3>
          <button className="btn btn-primary" onClick={() => { setEditId(null); setForm(BLANK); setShowModal(true); setError(''); }}>
            ➕ Create New Job
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="empty-state" style={{ padding:'2rem' }}>
            <div className="empty-icon">💼</div>
            <h3>No job postings yet</h3>
            <p>Create your first job posting to start receiving applications</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Job</button>
          </div>
        ) : (
          <div className="jobs-grid" style={{ marginTop:'1.25rem' }}>
           {jobs.map(job => (
  <div key={job._id} className="job-card">
                <div className="job-card-header">
                  <div>
                    <h4>{job.title}</h4>
                    <div className="job-dept">{getDeptIcon(job.department)} {getDeptName(job.department)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ padding:'0.3rem 0.7rem', fontSize:'0.8rem' }}
                      onClick={() => handleEditClick(job)}>Edit</button>
                    <button className="btn btn-danger" style={{ padding:'0.3rem 0.7rem', fontSize:'0.8rem' }}
                      onClick={() => handleDelete(job._id)}>Delete</button>
                  </div>
                </div>
                {job.description && <p style={{ fontSize:'0.85rem', color:'var(--muted)', marginBottom:'0.75rem' }}>{job.description}</p>}
                <div className="job-meta">
                  <span>⏱️ {job.experience}+ yrs</span>
                  <span>🎓 {job.education?.join(', ')}</span>
                </div>
                <div style={{ fontSize:'0.8rem', color:'var(--muted)' }}>
                  <strong>Skills:</strong> {job.skills?.join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Job Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target.className==='modal-overlay' && setShowModal(false)}>
          <div className="modal">
            <h3>{editId ? '✏️ Edit Job Posting' : '➕ Create Job Posting'}</h3>

            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label>Job Title *</label>
              <input placeholder="e.g. Software Developer" value={form.title} onChange={e => set('title', e.target.value)} />
            </div>

            <div className="form-group">
              <label>Department *</label>
              <select value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">Select department...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Job Description</label>
              <textarea placeholder="Brief description of the role..." value={form.description} onChange={e => set('description', e.target.value)} />
            </div>

            <div className="form-group">
              <label>Required Skills * (comma separated)</label>
              <input placeholder="javascript, react, node.js, mongodb" value={form.skills} onChange={e => set('skills', e.target.value)} />
              <p style={{ fontSize:'0.78rem', color:'var(--muted)', marginTop:'0.25rem' }}>These will be matched against candidate resumes</p>
            </div>

            <div className="form-group">
              <label>Minimum Experience (years) *</label>
              <input type="number" min="0" max="20" placeholder="2" value={form.experience} onChange={e => set('experience', e.target.value)} />
            </div>

            <div className="form-group">
              <label>Required Education (comma separated)</label>
              <input placeholder="bachelor, btech, msc, mba" value={form.education} onChange={e => set('education', e.target.value)} />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editId ? 'Save Changes' : 'Create Job')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminJobs;
