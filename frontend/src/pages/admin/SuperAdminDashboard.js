import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import './SuperAdmin.css';

import API from '../../config/api';
import { SkeletonGrid } from '../../components/Skeleton';

function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/superadmin/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div>
      <div className="page-header"><h2>🎛️ Super Admin Dashboard</h2><p>Loading overview...</p></div>
      <SkeletonGrid count={4} />
    </div>
  );

  const donutData = stats ? [
    { name: 'Users', value: stats.totalUsers || 0 },
    { name: 'Admins', value: stats.totalAdmins || 0 },
    { name: 'Resumes', value: stats.totalResumes || 0 },
    { name: 'Jobs', value: stats.totalJobs || 0 },
  ].filter(d => d.value > 0) : [];

  const DONUT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

  return (
    <div>
      <div className="page-header">
        <h2>🎛️ Super Admin Dashboard</h2>
        <p>System Overview & Management</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-blue">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalUsers}</div>
            <div className="stat-label">Total Users</div>
            <div className="stat-change">+{stats.recentUsers} this week</div>
          </div>
        </div>

        <div className="stat-card stat-purple">
          <div className="stat-icon">👔</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalAdmins}</div>
            <div className="stat-label">Total Admins</div>
            <div className="stat-change">+{stats.recentAdmins} this week</div>
          </div>
        </div>

        <div className="stat-card stat-green">
          <div className="stat-icon">📄</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalResumes}</div>
            <div className="stat-label">Total Resumes</div>
            <div className="stat-change">{stats.totalUserResumes} by users</div>
          </div>
        </div>

        <div className="stat-card stat-orange">
          <div className="stat-icon">💼</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalJobs}</div>
            <div className="stat-label">Active Jobs</div>
            <div className="stat-change">{stats.totalDepartments} departments</div>
          </div>
        </div>
      </div>

      {/* Donut Chart */}
      {donutData.length > 0 && (
        <div className="card">
          <h3>📊 System Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={4}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {donutData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="admin-sections">
        <Link to="/superadmin/users" className="admin-section-card">
          <div className="section-icon">👥</div>
          <h3>User Management</h3>
          <p>Manage all registered users</p>
        </Link>

        <Link to="/superadmin/admins" className="admin-section-card">
          <div className="section-icon">👔</div>
          <h3>Admin Management</h3>
          <p>Add and manage administrators</p>
        </Link>

        <Link to="/superadmin/departments" className="admin-section-card">
          <div className="section-icon">🏢</div>
          <h3>Department Management</h3>
          <p>Manage job departments</p>
        </Link>

        <Link to="/superadmin/logs" className="admin-section-card">
          <div className="section-icon">🔍</div>
          <h3>Audit Logs</h3>
          <p>View system activity logs</p>
        </Link>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;