import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SuperAdmin.css';

import API from '../../config/api';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import { SkeletonTable } from '../../components/Skeleton';

function AdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', company: '' });
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const response = await axios.get(`${API}/superadmin/admins`);
      setAdmins(response.data);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/superadmin/admins`, formData);
      showToast({ type: 'success', message: 'Admin added successfully!' });
      setShowAddForm(false);
      setFormData({ name: '', email: '', password: '', company: '' });
      fetchAdmins();
    } catch (error) {
      showToast({ type: 'error', message: error.response?.data?.error || 'Failed to add admin' });
    }
  };

  const handleDeleteAdmin = async (adminId, adminName) => {
    const ok = await confirm(`Delete admin ${adminName}?`);
    if (!ok) return;
    try {
      await axios.delete(`${API}/superadmin/admins/${adminId}`);
      showToast({ type: 'success', message: 'Admin deleted!' });
      fetchAdmins();
    } catch (error) {
      showToast({ type: 'error', message: 'Failed to delete admin' });
    }
  };

  if (loading) return (
    <div>
      <div className="page-header"><h2>👔 Admin Management</h2><p>Loading admins...</p></div>
      <SkeletonTable columns={5} />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h2>👔 Admin Management</h2>
        <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          + Add New Admin
        </button>
      </div>

      {showAddForm && (
        <div className="card">
          <h3>Add New Administrator</h3>
          <form onSubmit={handleAddAdmin} className="admin-form">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter admin name"
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="admin@resumatch.com"
              />
            </div>
            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                required
                minLength="6"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Min 6 characters"
              />
            </div>
            <div className="form-group">
              <label>Company *</label>
              <input
                type="text"
                required
                value={formData.company}
                onChange={(e) => setFormData({...formData, company: e.target.value})}
                placeholder="Company name"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Add Admin</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <DataTable
          data={admins}
          columns={[
            {
              key: 'name', label: 'Name',
              render: (row) => (
                <div className="user-cell">
                  <div className="user-avatar">👔</div>
                  <span>{row.name}</span>
                </div>
              )
            },
            { key: 'email', label: 'Email' },
            { key: 'company', label: 'Company', render: (row) => `🏢 ${row.company}` },
            { key: 'createdAt', label: 'Joined', render: (row) => new Date(row.createdAt).toLocaleDateString() },
            {
              key: 'actions', label: 'Actions', sortable: false,
              render: (row) => (
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDeleteAdmin(row._id, row.name)}
                >
                  Remove Admin
                </button>
              )
            }
          ]}
          searchKeys={['name', 'email', 'company']}
          pageSize={10}
        />
      </div>
    </div>
  );
}

export default AdminManagement;