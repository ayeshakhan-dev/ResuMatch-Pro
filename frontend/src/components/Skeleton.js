import React from 'react';
import './Skeleton.css';

export function SkeletonText({ lines = 1, type = 'normal' }) {
  return (
    <div className="skeleton-container" style={{ gap: '0.5rem' }}>
      {Array(lines).fill(0).map((_, i) => (
        <div key={i} className={`skeleton skeleton-text ${type} ${i === lines - 1 && lines > 1 ? 'short' : ''}`} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <SkeletonText type="title" />
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="skeleton-table-row" style={{ background: '#f8fafc' }}>
        {Array(columns).fill(0).map((_, j) => (
          <div key={j} className="skeleton skeleton-table-cell" style={{ height: '1rem', background: '#e2e8f0' }} />
        ))}
      </div>
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="skeleton-table-row">
          {Array(columns).fill(0).map((_, j) => (
            <div key={j} className="skeleton skeleton-table-cell" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
      {Array(count).fill(0).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
