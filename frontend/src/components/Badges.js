import React from 'react';

export function StatusBadge({ status }) {
  let className = 'badge-danger';
  if (status === 'Shortlisted') className = 'badge-success';
  else if (status === 'Review') className = 'badge-warning';

  return (
    <span className={`badge ${className}`}>
      {status}
    </span>
  );
}

export function ScoreBadge({ score }) {
  let color = '#ef4444'; // default red
  if (score >= 70) color = '#10b981'; // green
  else if (score >= 50) color = '#f59e0b'; // orange

  return (
    <strong style={{ color }}>
      {score}/100
    </strong>
  );
}
