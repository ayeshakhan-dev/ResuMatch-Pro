import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SuperAdmin.css';

import API from '../../config/api';
import { SkeletonTable } from '../../components/Skeleton';

const LOG_ICONS = {
  user_signup: '👤',
  admin_signup: '👔',
  resume_upload: '📄',
};

const LOG_LABELS = {
  user_signup: 'User Signed Up',
  admin_signup: 'Admin Signed Up',
  resume_upload: 'Resume Uploaded',
};

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API}/superadmin/logs`);
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(log => log.type === filter);

  if (loading) return (
    <div>
      <div className="page-header"><h2>🔍 Audit Logs</h2><p>Loading...</p></div>
      <SkeletonTable columns={4} />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h2>🔍 Audit Logs</h2>
        <button className="btn btn-secondary" onClick={fetchLogs}>🔄 Refresh</button>
      </div>

      <div className="card">
        <div className="log-filters">
          {['all', 'user_signup', 'admin_signup', 'resume_upload'].map(type => (
            <button
              key={type}
              className={`filter-btn ${filter === type ? 'active' : ''}`}
              onClick={() => setFilter(type)}
            >
              {type === 'all' ? '📋 All' : `${LOG_ICONS[type]} ${LOG_LABELS[type]}`}
            </button>
          ))}
          <span className="log-count">{filteredLogs.length} entries</span>
        </div>
      </div>

      <div className="logs-list">
        {filteredLogs.length === 0 && (
          <div className="card empty-state"><p>No logs found</p></div>
        )}
        {filteredLogs.map((log, index) => (
          <div key={index} className={`log-entry log-${log.type}`}>
            <div className="log-icon">{LOG_ICONS[log.type] || '📌'}</div>
            <div className="log-content">
              <div className="log-title">
                <strong>{LOG_LABELS[log.type] || log.type}</strong>
                {log.type === 'resume_upload' && log.job && (
                  <span className="log-badge">for: {log.job}</span>
                )}
              </div>
              <div className="log-meta">
                {log.user && <span>👤 {log.user}</span>}
                {log.email && <span>📧 {log.email}</span>}
              </div>
            </div>
            <div className="log-time">
              {log.timestamp ? (
                <>
                  <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                  <div className="log-time-small">{new Date(log.timestamp).toLocaleTimeString()}</div>
                </>
              ) : 'N/A'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AuditLogs;
