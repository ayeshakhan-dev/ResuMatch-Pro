import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SuperAdmin.css';

import API from '../../config/api';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import { SkeletonTable } from '../../components/Skeleton';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/superadmin/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast({ type: 'error', message: 'Failed to fetch users' });
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId, currentStatus) => {
    const ok = await confirm(`Are you sure you want to ${currentStatus ? 'unblock' : 'block'} this user?`);
    if (!ok) return;
    
    try {
      await axios.put(`${API}/superadmin/users/${userId}/block`, { isBlocked: !currentStatus });
      showToast({ type: 'success', message: 'User status updated!' });
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      showToast({ type: 'error', message: 'Failed to update user' });
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    const ok = await confirm(`Are you sure you want to DELETE ${userName}? This will also delete all their resumes!`);
    if (!ok) return;
    
    try {
      await axios.delete(`${API}/superadmin/users/${userId}`);
      showToast({ type: 'success', message: 'User deleted successfully!' });
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast({ type: 'error', message: 'Failed to delete user' });
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div>
      <div className="page-header"><h2>👥 User Management</h2><p>Loading...</p></div>
      <SkeletonTable columns={5} />
    </div>
  );

  const columns = [
    {
      key: 'name', label: 'Name',
      render: (row) => (
        <div className="user-cell">
          <div className="user-avatar">👤</div>
          <span>{row.name}</span>
        </div>
      )
    },
    { key: 'email', label: 'Email' },
    { key: 'createdAt', label: 'Joined', render: (row) => new Date(row.createdAt).toLocaleDateString() },
    {
      key: 'status', label: 'Status', sortable: false,
      render: (row) => (
        <span className={`badge ${row.isBlocked ? 'badge-danger' : 'badge-success'}`}>
          {row.isBlocked ? 'Blocked' : 'Active'}
        </span>
      )
    },
    {
      key: 'actions', label: 'Actions', sortable: false,
      render: (row) => (
        <div className="action-buttons">
          <button
            className={`btn btn-sm ${row.isBlocked ? 'btn-success' : 'btn-warning'}`}
            onClick={() => handleBlockUser(row._id, row.isBlocked)}
          >
            {row.isBlocked ? 'Unblock' : 'Block'}
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => handleDeleteUser(row._id, row.name)}
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h2>👥 User Management</h2>
        <p>Manage all registered users</p>
      </div>

      <div className="card">
        <DataTable
          data={users}
          columns={columns}
          searchKeys={['name', 'email']}
          pageSize={10}
        />
      </div>
    </div>
  );
}

export default UserManagement;