import React from 'react';
import { 
  FileText, 
  Table, 
  Image as ImageIcon, 
  FileCode, 
  Download, 
  Trash2, 
  Eye, 
  Calendar,
  Layers,
  HardDrive
} from 'lucide-react';
import { getApiKey } from '../api';

export default function FileGrid({ files, onPreview, onDownload, onDelete }) {
  const apiKey = getApiKey();

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDate(isoString) {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recent';
    }
  }

  function getFileCategory(file) {
    const p = (file.path || file.name || '').toLowerCase();
    if (p.includes('invoice') || p.endsWith('.csv')) return { label: 'Invoice', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
    if (p.includes('contract') || p.endsWith('.txt')) return { label: 'Contract', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' };
    if (p.includes('scan') || p.endsWith('.svg') || p.endsWith('.png') || p.endsWith('.jpg')) return { label: 'Scan', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' };
    if (p.includes('hr') || p.endsWith('.json')) return { label: 'HR / Payroll', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
    return { label: 'Document', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' };
  }

  function renderThumbnail(file) {
    const name = (file.name || '').toLowerCase();
    const isImage = name.endsWith('.svg') || name.endsWith('.png') || name.endsWith('.jpg');

    if (isImage) {
      // Direct render of image/SVG!
      return (
        <div style={{
          height: '130px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '12px',
          position: 'relative'
        }}>
          <img
            src={`/api/files/${file.id}?key=${encodeURIComponent(apiKey)}`}
            alt={file.name}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '4px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
            loading="lazy"
            onError={(e) => {
              // fallback to icon if image fails to render
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement.innerHTML = '<div style="display:flex;align-items:center;gap:6px;color:#059669;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span>Scan Document</span></div>';
            }}
          />
        </div>
      );
    }

    if (name.endsWith('.csv')) {
      return (
        <div style={{
          height: '130px',
          backgroundColor: '#f0fdf4',
          borderBottom: '1px solid #dcfce7',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: '#16a34a'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            backgroundColor: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(22, 163, 74, 0.15)'
          }}>
            <Table size={24} strokeWidth={2.2} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#15803d', letterSpacing: '0.05em' }}>
            SPREADSHEET CSV
          </span>
        </div>
      );
    }

    if (name.endsWith('.json')) {
      return (
        <div style={{
          height: '130px',
          backgroundColor: '#fffbeb',
          borderBottom: '1px solid #fef3c7',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: '#d97706'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            backgroundColor: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(217, 119, 6, 0.15)'
          }}>
            <FileCode size={24} strokeWidth={2.2} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#b45309', letterSpacing: '0.05em' }}>
            STRUCTURED DATA JSON
          </span>
        </div>
      );
    }

    // Default: text / contract
    return (
      <div style={{
        height: '130px',
        backgroundColor: '#f5f3ff',
        borderBottom: '1px solid #ede9fe',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        color: '#7c3aed'
      }}>
        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '10px',
          backgroundColor: '#ede9fe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(124, 58, 237, 0.15)'
        }}>
          <FileText size={24} strokeWidth={2.2} />
        </div>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#6d28d9', letterSpacing: '0.05em' }}>
          LEGAL AGREEMENT TXT
        </span>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px dashed #cbd5e1'
      }}>
        <HardDrive size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
          No files in this view
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          Upload a file or reset using <code>bun run seed</code>.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '20px'
    }}>
      {files.map((file) => {
        const cat = getFileCategory(file);
        return (
          <div
            key={file.id}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.08)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
            }}
          >
            {/* Visual Thumbnail or Icon Preview */}
            {renderThumbnail(file)}

            {/* Card Content */}
            <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: cat.bg,
                  color: cat.color,
                  border: `1px solid ${cat.border}`
                }}>
                  {cat.label}
                </span>

                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#64748b',
                  backgroundColor: '#f1f5f9',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  <Layers size={11} />
                  <span>v{file.version || 1}</span>
                </span>
              </div>

              <h4 style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#0f172a',
                marginBottom: '6px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }} title={file.name}>
                {file.name}
              </h4>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#64748b',
                marginTop: 'auto',
                paddingTop: '10px'
              }}>
                <span>{formatBytes(file.size)}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} />
                  <span>{formatDate(file.updatedAt || file.createdAt)}</span>
                </span>
              </div>
            </div>

            {/* Card Actions Footer */}
            <div style={{
              display: 'flex',
              borderTop: '1px solid #f1f5f9',
              backgroundColor: '#fafafa',
              padding: '8px 12px',
              gap: '6px'
            }}>
              <button
                onClick={() => onPreview(file)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                title="Preview file contents"
              >
                <Eye size={14} color="#6366f1" />
                <span>Preview</span>
              </button>

              <button
                onClick={() => onDownload(file)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 10px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#334155'
                }}
                title="Download file"
              >
                <Download size={14} />
              </button>

              <button
                onClick={() => onDelete(file)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 10px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#dc2626'
                }}
                title="Delete file (stores version in .versions)"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
