import React, { createContext, useContext, useState, useCallback } from 'react';
import './ConfirmDialog.css';

const ConfirmContext = createContext();

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, message: '', resolve: null });

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setState({ open: true, message, resolve });
    });
  }, []);

  const handleResponse = (value) => {
    state.resolve?.(value);
    setState({ open: false, message: '', resolve: null });
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <div className="modal-overlay" onClick={() => handleResponse(false)}>
          <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">⚠️</div>
            <h3>Confirm Action</h3>
            <p className="confirm-message">{state.message}</p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => handleResponse(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleResponse(true)}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
