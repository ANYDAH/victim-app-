import React, { useState } from 'react';
import { X, UploadCloud, File, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import { uploadFile } from '../api';

export default function UploadModal({ onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('invoices');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      await uploadFile(file, category);
      onUploaded();
      onClose();
    } catch (err) {
      setError(err.message || 'Upload failed');
      setUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10000,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
              Upload File to DriveVault
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b' }}>
              Saves to <code>./data/vault/</code> with SHA-256 versioning
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '13px',
              marginBottom: '18px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Category selection */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Vault Target Directory
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                outline: 'none'
              }}
            >
              <option value="invoices">invoices/ (Financial CSVs)</option>
              <option value="contracts">contracts/ (Legal TXT)</option>
              <option value="scans">scans/ (Document SVGs & Images)</option>
              <option value="hr">hr/ (Personnel JSON)</option>
              <option value="">root/ (Vault Root)</option>
            </select>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '32px 20px',
              textAlign: 'center',
              backgroundColor: file ? '#f0fdf4' : '#f8fafc',
              cursor: 'pointer',
              marginBottom: '20px',
              transition: 'background-color 0.15s ease'
            }}
            onClick={() => document.getElementById('vault-file-input').click()}
          >
            <input
              id="vault-file-input"
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: file ? '#dcfce7' : '#eef2ff',
              color: file ? '#16a34a' : '#4f46e5',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}>
              {file ? <CheckCircle2 size={24} /> : <UploadCloud size={24} />}
            </div>

            {file ? (
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#166534' }}>
                  {file.name}
                </p>
                <p style={{ fontSize: '12px', color: '#65a30d' }}>
                  {(file.size / 1024).toFixed(1)} KB — Ready to upload
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                  Click to browse or drop file here
                </p>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Supports CSV, TXT, SVG, JSON, and common document types
                </p>
              </div>
            )}
          </div>

          {/* Versioning guarantee hint */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            backgroundColor: '#f1f5f9',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#475569',
            marginBottom: '24px'
          }}>
            <Layers size={16} color="#6366f1" />
            <span>Overwriting an existing file safely creates a backup in <code>.versions/</code></span>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475569',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#ffffff',
                backgroundColor: '#4f46e5',
                border: 'none',
                borderRadius: '8px',
                cursor: (!file || uploading) ? 'not-allowed' : 'pointer',
                opacity: (!file || uploading) ? 0.6 : 1,
                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.25)'
              }}
            >
              {uploading ? 'Archiving & Storing...' : 'Upload File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
