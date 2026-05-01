import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, ResponsiveContainer } from 'recharts';

import API from '../../config/api';
import { SkeletonGrid } from '../../components/Skeleton';

function AdminDashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [detailedStats, setDetailedStats] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, detailedRes, resumesRes] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/admin/stats-detailed`),
        axios.get(`${API}/admin/user-resumes`)
      ]);
      
      setStats(statsRes.data);
      setDetailedStats(detailedRes.data);
      setResumes(resumesRes.data);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><h2>📊 Dashboard</h2><p>Loading overview...</p></div>
        <SkeletonGrid count={4} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card">
        <p>Failed to load statistics.</p>
        <button className="btn btn-primary" onClick={fetchDashboardData}>Retry</button>
      </div>
    );
  }

  // Chart data
  const statusData = [
    { name: 'Shortlisted', value: stats.shortlisted || 0 },
    { name: 'Review', value: stats.review || 0 },
    { name: 'Rejected', value: stats.rejected || 0 },
  ].filter(d => d.value > 0);

  const STATUS_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  const deptData = stats.byDepartment
    ? Object.keys(stats.byDepartment).map(deptId => ({
        name: stats.byDepartment[deptId].name?.substring(0, 15) || deptId,
        total: stats.byDepartment[deptId].total,
        shortlisted: stats.byDepartment[deptId].shortlisted,
      }))
    : [];

  // Application trends: group resumes by date
  const trendMap = {};
  resumes.forEach(r => {
    const day = new Date(r.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    trendMap[day] = (trendMap[day] || 0) + 1;
  });
  const trendData = Object.entries(trendMap)
    .slice(-14)
    .map(([date, count]) => ({ date, applications: count }));

  const recentResumes = resumes.slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <h2>📊 Admin Dashboard</h2>
        <p>Welcome back, {user.name}!</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.total || 0}</h3>
          <p>Total Applications</p>
        </div>
        <div className="stat-card stat-success">
          <h3>{stats.shortlisted || 0}</h3>
          <p>Shortlisted</p>
        </div>
        <div className="stat-card stat-warning">
          <h3>{stats.review || 0}</h3>
          <p>Under Review</p>
        </div>
        <div className="stat-card stat-danger">
          <h3>{stats.rejected || 0}</h3>
          <p>Rejected</p>
        </div>
        <div className="stat-card stat-info">
          <h3>{stats.newApplications || 0}</h3>
          <p>New (Unviewed)</p>
        </div>
        <div className="stat-card">
          <h3>{stats.averageScore || 0}/100</h3>
          <p>Average Score</p>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Pie Chart - Status Breakdown */}
        {statusData.length > 0 && (
          <div className="card">
            <h3>📊 Status Breakdown</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Area Chart - Application Trends */}
        {trendData.length > 1 && (
          <div className="card">
            <h3>📈 Application Trends</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e94560" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#e94560" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="applications" stroke="#e94560" fillOpacity={1} fill="url(#colorApps)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bar Chart - Department Stats */}
      {deptData.length > 0 && (
        <div className="card">
          <h3>📈 Department-wise Stats</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deptData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#1a1a2e" name="Total" radius={[4, 4, 0, 0]} />
              <Bar dataKey="shortlisted" fill="#10b981" name="Shortlisted" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Keep table below */}
          <div className="table-wrap" style={{ marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Total Applications</th>
                  <th>Shortlisted</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(stats.byDepartment).map(deptId => (
                  <tr key={deptId}>
                    <td>{stats.byDepartment[deptId].name}</td>
                    <td>{stats.byDepartment[deptId].total}</td>
                    <td>{stats.byDepartment[deptId].shortlisted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailedStats && (
        <div className="card">
          <h3>📊 Upload Source Breakdown</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ padding: '1rem', background: '#f0f4ff', borderRadius: '10px' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>👤 User Applications</h4>
              <p>Total: <strong>{detailedStats.userUploaded?.total || 0}</strong></p>
              <p>Shortlisted: <strong>{detailedStats.userUploaded?.shortlisted || 0}</strong></p>
              <p>Avg Score: <strong>{detailedStats.userUploaded?.avgScore || 0}/100</strong></p>
            </div>
            <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '10px' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>📤 Bulk Uploads (Admin)</h4>
              <p>Total: <strong>{detailedStats.adminUploaded?.total || 0}</strong></p>
              <p>Shortlisted: <strong>{detailedStats.adminUploaded?.shortlisted || 0}</strong></p>
              <p>Avg Score: <strong>{detailedStats.adminUploaded?.avgScore || 0}/100</strong></p>
            </div>
          </div>
        </div>
      )}

      {recentResumes.length > 0 && (
        <div className="card">
          <h3>🔥 Recent Applications (Top 5)</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentResumes.map(r => (
                  <tr key={r._id}>
                    <td>{r.name}</td>
                    <td>{r.jobTitle}</td>
                    <td><strong>{r.score}/100</strong></td>
                    <td>
                      <span className={`badge ${
                        r.status === 'Shortlisted' ? 'badge-success' :
                        r.status === 'Review' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td>{new Date(r.uploadDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;