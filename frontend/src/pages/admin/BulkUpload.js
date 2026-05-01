import React, { useState, useEffect } from 'react';
import axios from 'axios';

import API from '../../config/api';
import { useToast } from '../../components/Toast';

function BulkUpload({ user }) {
  const [jobs, setJobs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selDept, setSelDept] = useState('');
  const [selJob, setSelJob] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  // ================= FETCH DATA =================
  useEffect(() => {
    axios.get(`${API}/departments`).then(res => setDepartments(res.data));
    axios.get(`${API}/admin/jobs`).then(res => setJobs(res.data));
  }, []);

  // ================= FILE SELECT =================
  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);

    if (selected.length > 50) {
      setError('Maximum 50 resumes allowed');
      return;
    }

    setFiles(selected);
    setError('');
  };

  // ================= BULK UPLOAD =================
  const handleUpload = async () => {
    if (!selJob) return setError('Please select a job');
    if (files.length === 0) return setError('Please select resumes');

    setUploading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    files.forEach(file => formData.append('resumes', file));
    formData.append('jobId', selJob);
    formData.append('adminId', user?.id || '');

    try {
      const res = await axios.post(
        `${API}/admin/bulk-upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      // ✅ STORE batchId + results
      setResult({
        ...res.data.results,
        batchId: res.data.batchId
      });

      setFiles([]);
      document.getElementById('bulk-file-input').value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Bulk upload failed');
    } finally {
      setUploading(false);
    }
  };

  const filteredJobs = selDept
    ? jobs.filter(j => j.department === selDept)
    : jobs;

  // ================= DOWNLOAD PDF =================
  const downloadPDF = () => {
    if (!result?.batchId) {
      showToast({ type: 'warning', message: 'Batch ID missing' });
      return;
    }

    window.open(
      `${API}/admin/bulk-report/pdf?batchId=${result.batchId}`,
      '_blank'
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2>📤 Bulk Resume Upload</h2>
        <p>Upload and analyze multiple resumes at once</p>
      </div>

      <div className="card">
        {error && <div className="error-msg">{error}</div>}

        {!result && (
          <>
            <div className="form-group">
              <label>Filter by Department</label>
              <select value={selDept} onChange={e => setSelDept(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.icon} {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Select Job *</label>
              <select value={selJob} onChange={e => setSelJob(e.target.value)}>
                <option value="">Choose job...</option>
                {filteredJobs.map(j => (
                  <option key={j._id} value={j._id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Select Resumes (Max 50)</label>
              <input
                id="bulk-file-input"
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
              />
              {files.length > 0 && (
                <p style={{ color: 'green' }}>
                  ✅ {files.length} file(s) selected
                </p>
              )}
            </div>

            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? '⏳ Processing...' : '🚀 Upload & Analyze'}
            </button>
          </>
        )}

        {result && (
          <div className="success-msg">
            <h3>✅ Bulk Upload Completed</h3>
            <p>
              Total: {result.total} |
              Success: {result.successful} |
              Failed: {result.failed}
            </p>

            <table style={{ width: '100%', marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Name</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {result.resumes.map((r, i) => (
                  <tr key={i}>
                    <td>{r.fileName}</td>
                    <td>{r.name || '-'}</td>
                    <td>{r.score ? `${r.score}/100` : '-'}</td>
                    <td>{r.resumeStatus || 'Failed'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '1rem' }}>
              <button
                className="btn btn-primary"
                onClick={downloadPDF}
              >
                📄 Download Bulk PDF Report
              </button>

              <button
                className="btn btn-secondary"
                style={{ marginLeft: '1rem' }}
                onClick={() => setResult(null)}
              >
                Upload More
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BulkUpload;