import React, { useState, useMemo } from 'react';
import './DataTable.css';

function DataTable({ data, columns, searchKeys = [], pageSize: defaultPageSize = 10 }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim() || searchKeys.length === 0) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      searchKeys.some(key => {
        const val = row[key];
        return val && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, searchKeys]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  return (
    <div className="datatable">
      {/* Toolbar */}
      <div className="datatable-toolbar">
        {searchKeys.length > 0 && (
          <input
            type="text"
            className="datatable-search"
            placeholder="🔍 Search..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        )}
        <div className="datatable-info">
          <span>{sorted.length} record{sorted.length !== 1 ? 's' : ''}</span>
          <select
            className="datatable-pagesize"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={col.sortable !== false ? 'datatable-sortable' : ''}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="datatable-sort-icon">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                  No data found
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr key={row._id || row.id || i}>
                  {columns.map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(row, (page - 1) * pageSize + i) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="datatable-pagination">
          <button
            className="btn btn-secondary datatable-page-btn"
            disabled={page === 1}
            onClick={() => setPage(1)}
          >
            «
          </button>
          <button
            className="btn btn-secondary datatable-page-btn"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            ‹
          </button>
          <span className="datatable-page-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary datatable-page-btn"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            ›
          </button>
          <button
            className="btn btn-secondary datatable-page-btn"
            disabled={page === totalPages}
            onClick={() => setPage(totalPages)}
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}

export default DataTable;
