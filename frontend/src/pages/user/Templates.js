import React, { useState, useEffect } from 'react';
import axios from 'axios';

import API from '../../config/api';
import { useToast } from '../../components/Toast';
import { SkeletonGrid } from '../../components/Skeleton';

function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/templates`);
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async (templateId, title) => {
    try {
      const response = await axios.get(`${API}/templates/${templateId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${templateId}-resume-template.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
      showToast({ type: 'error', message: 'Failed to download template. Please try again.' });
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><h2>📄 Resume Templates</h2><p>Loading templates...</p></div>
        <SkeletonGrid count={3} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>📄 Resume Templates</h2>
        <p>Professional resume templates optimized for high scores</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <h3 style={{ marginTop: 0 }}>💡 How to Use Templates</h3>
        <ol style={{ lineHeight: '1.8', paddingLeft: '1.5rem' }}>
          <li>Choose a template that matches your field</li>
          <li>Download the template (TXT format)</li>
          <li>Replace the sample information with your own details</li>
          <li>Keep the structure and formatting</li>
          <li>Upload to test your score!</li>
        </ol>
        <p style={{ margin: '1rem 0 0 0', opacity: 0.9 }}>
          ✨ <strong>Pro Tip:</strong> These templates are pre-formatted with the right keywords and structure to score well!
        </p>
      </div>

      <div className="templates-grid">
        {templates.map((template) => (
          <div key={template.id} className="template-card">
            <div className="template-icon">{template.icon}</div>
            <h3>{template.title}</h3>
            <p className="template-description">{template.description}</p>
            <div className="template-preview">
              <p><strong>Includes:</strong></p>
              <p>{template.preview}</p>
            </div>
            <div className="template-meta">
              <span className="badge badge-info">
                {template.department === 'it' ? 'IT' : 
                 template.department === 'marketing' ? 'Marketing' : 
                 'Business'}
              </span>
              <span className="badge badge-success">Professional</span>
            </div>
            <button 
              className="btn btn-primary btn-block"
              onClick={() => downloadTemplate(template.id, template.title)}
            >
              📥 Download Template
            </button>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h3>🎯 Template Tips</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          <div>
            <h4 style={{ color: '#667eea', marginBottom: '0.5rem' }}>📝 Skills Section</h4>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              List all relevant technical and soft skills. Match job description keywords exactly!
            </p>
          </div>
          <div>
            <h4 style={{ color: '#10b981', marginBottom: '0.5rem' }}>💼 Experience</h4>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              Clearly state "X years of experience" to help the AI recognize your background.
            </p>
          </div>
          <div>
            <h4 style={{ color: '#f59e0b', marginBottom: '0.5rem' }}>📊 Numbers</h4>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              Quantify achievements with numbers, percentages, and measurable results.
            </p>
          </div>
          <div>
            <h4 style={{ color: '#e94560', marginBottom: '0.5rem' }}>🎓 Education</h4>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              Include degree, university, graduation year, and CGPA if above 7.0.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Templates;