import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SuperAdmin.css';

import API from '../../config/api';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';
import { SkeletonGrid } from '../../components/Skeleton';

function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({ id: '', name: '', icon: '' });
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => { fetchDepartments(); }, []);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API}/departments`);
      setDepartments(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/superadmin/departments`, formData);
      showToast({ type: 'success', message: 'Department added!' });
      setShowAddForm(false);
      setFormData({ id: '', name: '', icon: '' });
      fetchDepartments();
    } catch (error) {
      showToast({ type: 'error', message: error.response?.data?.error || 'Failed to add department' });
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/superadmin/departments/${editingDept.id}`, {
        name: formData.name,
        icon: formData.icon
      });
      showToast({ type: 'success', message: 'Department updated!' });
      setEditingDept(null);
      setFormData({ id: '', name: '', icon: '' });
      fetchDepartments();
    } catch (error) {
      showToast({ type: 'error', message: 'Failed to update department' });
    }
  };

  const handleDelete = async (deptId, deptName) => {
    const ok = await confirm(`Delete department "${deptName}"? This may affect existing jobs!`);
    if (!ok) return;
    try {
      await axios.delete(`${API}/superadmin/departments/${deptId}`);
      showToast({ type: 'success', message: 'Department deleted!' });
      fetchDepartments();
    } catch (error) {
      showToast({ type: 'error', message: 'Failed to delete department' });
    }
  };

  const startEdit = (dept) => {
    setEditingDept(dept);
    setFormData({ id: dept.id, name: dept.name, icon: dept.icon });
    setShowAddForm(false);
  };

  if (loading) return (
    <div>
      <div className="page-header"><h2>🏢 Department Management</h2><p>Loading departments...</p></div>
      <SkeletonGrid count={4} />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h2>🏢 Department Management</h2>
        <button className="btn btn-primary" onClick={() => { setShowAddForm(!showAddForm); setEditingDept(null); }}>
          + Add Department
        </button>
      </div>

      {showAddForm && (
        <div className="card">
          <h3>Add New Department</h3>
          <form onSubmit={handleAdd} className="admin-form">
            <div className="form-row">
              <div className="form-group">
                <label>Department ID * <small>(e.g. "it", "hr", "legal")</small></label>
                <input
                  type="text"
                  required
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                  placeholder="it"
                />
              </div>
              <div className="form-group">
                <label>Icon (Emoji) *</label>
                <input
                  type="text"
                  required
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="💻"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Department Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Information Technology"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Add Department</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {editingDept && (
        <div className="card">
          <h3>Edit Department: {editingDept.name}</h3>
          <form onSubmit={handleEdit} className="admin-form">
            <div className="form-row">
              <div className="form-group">
                <label>Icon (Emoji)</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Department Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Save Changes</button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditingDept(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="departments-grid">
        {departments.map(dept => (
          <div key={dept._id} className="dept-card">
            <div className="dept-icon">{dept.icon}</div>
            <h3>{dept.name}</h3>
            <p className="dept-id">ID: <code>{dept.id}</code></p>
            <div className="dept-actions">
              <button className="btn btn-sm btn-warning" onClick={() => startEdit(dept)}>Edit</button>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(dept.id, dept.name)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DepartmentManagement;
