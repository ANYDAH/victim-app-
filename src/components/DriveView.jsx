import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  Folder, 
  FileText, 
  Table, 
  Image as ImageIcon, 
  FileCode, 
  Upload, 
  RefreshCw, 
  Search, 
  LogOut, 
  Key, 
  ShieldCheck, 
  AlertTriangle,
  ChevronRight,
  Filter
} from 'lucide-react';
import { fetchFiles, deleteFile, getDownloadUrl, getApiKey, setApiKey } from '../api';
import StorageBar from './StorageBar';
import FileGrid from './FileGrid';
import FilePreviewModal from './FilePreviewModal';
import UploadModal from './UploadModal';

export default function DriveView({ user, onLogout, onRansomTriggered }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentKey, setCurrentKey] = useState(getApiKey());
  const [previewFile, setPreviewFile] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  const loadFileList = async (showSpin = true) => {
    if (showSpin) setRefreshing(true);
    try {
      const { data, isRansomHeader } = await fetchFiles();
      const list = Array.isArray(data) ? data : (data.files || []);
      setFiles(list);

      // Check if READ_ME_FOR_RECOVERY.txt was returned in files or ransom detected!
      const ransomFile = list.find(f => f.name === 'READ_ME_FOR_RECOVERY.txt' || f.isRansom);
      if (ransomFile || isRansomHeader || data.ransom?.detected) {
        const note = ransomFile?.content || data.ransom?.note || "YOUR FILES HAVE BEEN ENCRYPTED";
        onRansomTriggered(note);
      }
    } catch (err) {
      console.error('Failed to load files:', err);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFileList();
    // Refresh periodically every 8 seconds so if an external attack script drops
    // READ_ME_FOR_RECOVERY.txt, the UI immediately locks into ransom state!
    const interval = setInterval(() => {
      loadFileList(false);
    }, 8000);
    return () => clearInterval(interval);
  }, [currentKey]);

  const showToast = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDownload = (file) => {
    const url = getDownloadUrl(file.id);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = async (file) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?\n(A rollback copy will be stored in .versions/${file.id})`)) {
      return;
    }
    try {
      await deleteFile(file.id);
      showToast(`Deleted ${file.name} (Archived to .versions/)`, 'success');
      loadFileList(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleKeyChange = (newKey) => {
    setApiKey(newKey);
    setCurrentKey(newKey);
    showToast(`Switched API Key to ${newKey.substring(0, 15)}...`, 'info');
  };

  // Filter files by category and search
  const filteredFiles = files.filter((file) => {
    const p = (file.path || file.name || '').toLowerCase();
    
    // Category match
    if (activeCategory === 'invoices' && !p.includes('invoice') && !p.endsWith('.csv')) return false;
    if (activeCategory === 'contracts' && !p.includes('contract') && !p.endsWith('.txt')) return false;
    if (activeCategory === 'scans' && !p.includes('scan') && !p.endsWith('.svg') && !p.endsWith('.png') && !p.endsWith('.jpg')) return false;
    if (activeCategory === 'hr' && !p.includes('hr') && !p.endsWith('.json')) return false;

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return file.name.toLowerCase().includes(q) || p.includes(q);
    }

    return true;
  });

  // Calculate counts for categories
  const counts = {
    all: files.length,
    invoices: files.filter(f => (f.path || f.name).toLowerCase().includes('invoice') || f.name.endsWith('.csv')).length,
    contracts: files.filter(f => (f.path || f.name).toLowerCase().includes('contract') || f.name.endsWith('.txt')).length,
    scans: files.filter(f => (f.path || f.name).toLowerCase().includes('scan') || f.name.endsWith('.svg') || f.name.endsWith('.png')).length,
    hr: files.filter(f => (f.path || f.name).toLowerCase().includes('hr') || f.name.endsWith('.json')).length,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          backgroundColor: notification.type === 'error' ? '#ef4444' : notification.type === 'success' ? '#10b981' : '#3b82f6',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside style={{
        width: '280px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        flexShrink: 0
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', paddingLeft: '8px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: '#eef2ff',
            color: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 1px #c7d2fe'
          }}>
            <HardDrive size={20} strokeWidth={2.4} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              DriveVault
            </h2>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
              SaaS Storage Node
            </span>
          </div>
        </div>

        {/* Primary Action: Upload Button */}
        <button
          onClick={() => setUploadOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '11px 16px',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.25)',
            marginBottom: '24px'
          }}
        >
          <Upload size={16} />
          <span>Upload File</span>
        </button>

        {/* Navigation Categories */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', paddingLeft: '8px', marginBottom: '8px' }}>
            Vault Folders
          </div>

          {[
            { id: 'all', label: 'All Files', icon: Folder, count: counts.all, color: '#4f46e5' },
            { id: 'invoices', label: 'Invoices', icon: Table, count: counts.invoices, color: '#2563eb' },
            { id: 'contracts', label: 'Contracts', icon: FileText, count: counts.contracts, color: '#7c3aed' },
            { id: 'scans', label: 'Scans & Images', icon: ImageIcon, count: counts.scans, color: '#059669' },
            { id: 'hr', label: 'HR & Payroll', icon: FileCode, count: counts.hr, color: '#d97706' },
          ].map((cat) => {
            const Icon = cat.icon;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  backgroundColor: active ? '#eef2ff' : 'transparent',
                  color: active ? '#4f46e5' : '#475569',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  marginBottom: '2px',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={16} color={active ? '#4f46e5' : cat.color} />
                  <span>{cat.label}</span>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: active ? '#c7d2fe' : '#f1f5f9',
                  color: active ? '#3730a3' : '#64748b',
                  padding: '1px 6px',
                  borderRadius: '999px'
                }}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Storage Bar in Sidebar */}
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', paddingLeft: '8px', marginBottom: '8px' }}>
            Storage Overview
          </div>
          <StorageBar files={files} />
        </div>

        {/* API Key Principal Selector */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '12px',
          marginTop: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Key size={12} color="#6366f1" />
              <span>Active Principal</span>
            </span>
            <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 600 }}>● Connected</span>
          </div>

          <select
            value={currentKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              outline: 'none'
            }}
          >
            <option value="finance-ops-key-7f3a9c">finance-ops-key (Frontend)</option>
            <option value="ci-cd-deployer-2b8e1d">ci-cd-deployer (CI/CD)</option>
            <option value="backup-service-4a91e8">backup-service (Backup)</option>
          </select>
        </div>

        {/* User logout */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #f1f5f9',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#e0e7ff',
              color: '#4338ca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '12px'
            }}>
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {user?.name || 'Alex Chen'}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>
                {user?.role || 'Corporate Admin'}
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px'
            }}
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Top Header */}
        <header style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
            <span>DriveVault</span>
            <ChevronRight size={14} />
            <span style={{ fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>
              {activeCategory === 'all' ? 'All Files' : activeCategory}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Search Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#f1f5f9',
              borderRadius: '8px',
              padding: '8px 14px',
              width: '280px'
            }}>
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search files, invoices, contracts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  outline: 'none',
                  fontSize: '13px',
                  color: '#0f172a',
                  width: '100%'
                }}
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => loadFileList(true)}
              disabled={refreshing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                cursor: refreshing ? 'not-allowed' : 'pointer'
              }}
              title="Refresh file list (auto-detects ransom notes)"
            >
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
              <span>{refreshing ? 'Scanning...' : 'Refresh'}</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div style={{ padding: '32px', flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                {activeCategory === 'all' ? 'All Files' : `${activeCategory.toUpperCase()} Directory`}
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b' }}>
                Showing {filteredFiles.length} of {files.length} active files recorded in vault
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              Loading files from vault...
            </div>
          ) : (
            <FileGrid
              files={filteredFiles}
              onPreview={(file) => setPreviewFile(file)}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            showToast('File uploaded and versioned successfully', 'success');
            loadFileList(false);
          }}
        />
      )}
    </div>
  );
}
