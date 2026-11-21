import React, { useState, useEffect } from 'react';
import { X, Download, Copy, Check, Hash, Layers, FileText, Table } from 'lucide-react';
import { fetchFileContent, getDownloadUrl, getApiKey } from '../api';

export default function FilePreviewModal({ file, onClose }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const apiKey = getApiKey();
  const isImage = file.name.endsWith('.svg') || file.name.endsWith('.png') || file.name.endsWith('.jpg');

  useEffect(() => {
    if (!isImage) {
      setLoading(true);
      fetchFileContent(file.id)
        .then((text) => {
          setContent(text);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [file.id, isImage]);

  const copyHash = () => {
    if (file.sha256) {
      navigator.clipboard.writeText(file.sha256);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Render CSV as an interactive HTML table
  function renderCsvTable(rawCsv) {
    const lines = rawCsv.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return <div>Empty CSV</div>;

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));

    return (
      <div style={{ overflowX: 'auto', maxHeight: '450px' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12px',
          fontFamily: 'var(--font-sans)',
          textAlign: 'left'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              {headers.map((h, i) => (
                <th key={i} style={{ padding: '10px 14px', fontWeight: 700, color: '#334155' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx} style={{
                borderBottom: '1px solid #f1f5f9',
                backgroundColor: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc'
              }}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} style={{ padding: '8px 14px', color: '#1e293b' }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10000,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
        maxWidth: '900px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                {file.name}
              </h3>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: '#eef2ff',
                color: '#4f46e5',
                padding: '2px 8px',
                borderRadius: '999px',
                border: '1px solid #c7d2fe'
              }}>
                Version {file.version || 1}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Path: <code>./data/vault/{file.path || file.name}</code>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href={getDownloadUrl(file.id)}
              download={file.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#4f46e5',
                backgroundColor: '#ffffff',
                border: '1px solid #c7d2fe',
                borderRadius: '8px',
                textDecoration: 'none'
              }}
            >
              <Download size={15} />
              <span>Download</span>
            </a>

            <button
              onClick={onClose}
              style={{
                padding: '8px',
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
        </div>

        {/* Technical Metadata Strip */}
        <div style={{
          padding: '10px 24px',
          backgroundColor: '#f1f5f9',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '12px',
          fontFamily: 'var(--font-mono)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
            <Hash size={14} color="#64748b" />
            <span>SHA-256:</span>
            <span style={{ color: '#0f172a', fontWeight: 600 }}>
              {file.sha256 ? `${file.sha256.substring(0, 16)}...${file.sha256.substring(file.sha256.length - 8)}` : 'Recorded on Disk'}
            </span>
            {file.sha256 && (
              <button
                onClick={copyHash}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: copied ? '#16a34a' : '#64748b',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Copy full SHA-256 hash"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}
          </div>

          <div style={{ color: '#64748b' }}>
            Rollback Archive: <code>.versions/{file.id}/</code>
          </div>
        </div>

        {/* Preview Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, maxHeight: '60vh' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Loading file preview...
            </div>
          ) : error ? (
            <div style={{ color: '#dc2626', padding: '20px', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
              Error loading preview: {error}
            </div>
          ) : isImage ? (
            <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
              <img
                src={`/api/files/${file.id}?key=${encodeURIComponent(apiKey)}`}
                alt={file.name}
                style={{ maxWidth: '100%', maxHeight: '450px', objectFit: 'contain' }}
              />
            </div>
          ) : file.name.endsWith('.csv') ? (
            renderCsvTable(content)
          ) : file.name.endsWith('.json') ? (
            <pre style={{
              backgroundColor: '#0f172a',
              color: '#38bdf8',
              padding: '18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
              overflowX: 'auto',
              lineHeight: '1.5'
            }}>
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(content), null, 2);
                } catch {
                  return content;
                }
              })()}
            </pre>
          ) : (
            <pre style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6',
              color: '#1e293b'
            }}>
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
