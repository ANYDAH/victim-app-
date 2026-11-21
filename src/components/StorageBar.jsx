import React from 'react';
import { HardDrive, PieChart, Sparkles } from 'lucide-react';

export default function StorageBar({ files = [], maxStorageBytes = 100 * 1024 * 1024 }) {
  // Calculate total storage and category breakdowns
  let totalBytes = 0;
  const breakdown = {
    invoices: 0,
    contracts: 0,
    scans: 0,
    hr: 0,
    other: 0,
  };

  files.forEach((file) => {
    const size = Number(file.size) || 0;
    totalBytes += size;
    const path = (file.path || file.name || '').toLowerCase();
    if (path.includes('invoice') || path.endsWith('.csv')) {
      breakdown.invoices += size;
    } else if (path.includes('contract') || path.endsWith('.txt')) {
      breakdown.contracts += size;
    } else if (path.includes('scan') || path.endsWith('.svg') || path.endsWith('.png') || path.endsWith('.jpg')) {
      breakdown.scans += size;
    } else if (path.includes('hr') || path.endsWith('.json')) {
      breakdown.hr += size;
    } else {
      breakdown.other += size;
    }
  });

  const usedPercentage = Math.min(100, Math.max(1, (totalBytes / maxStorageBytes) * 100));

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  const pInvoices = totalBytes > 0 ? (breakdown.invoices / totalBytes) * usedPercentage : 0;
  const pContracts = totalBytes > 0 ? (breakdown.contracts / totalBytes) * usedPercentage : 0;
  const pScans = totalBytes > 0 ? (breakdown.scans / totalBytes) * usedPercentage : 0;
  const pHr = totalBytes > 0 ? (breakdown.hr / totalBytes) * usedPercentage : 0;
  const pOther = totalBytes > 0 ? (breakdown.other / totalBytes) * usedPercentage : 0;

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '16px 20px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      marginBottom: '24px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HardDrive size={18} color="#4f46e5" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
            Vault Storage Allocation
          </span>
        </div>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
          <strong>{formatBytes(totalBytes)}</strong> of {formatBytes(maxStorageBytes)} ({usedPercentage.toFixed(1)}% used)
        </span>
      </div>

      {/* Segmented Multi-Color Progress Bar */}
      <div style={{
        height: '8px',
        width: '100%',
        backgroundColor: '#f1f5f9',
        borderRadius: '999px',
        overflow: 'hidden',
        display: 'flex',
        marginBottom: '12px'
      }}>
        <div style={{ width: `${pInvoices}%`, backgroundColor: '#3b82f6', transition: 'width 0.3s ease' }} title={`Invoices: ${formatBytes(breakdown.invoices)}`} />
        <div style={{ width: `${pContracts}%`, backgroundColor: '#8b5cf6', transition: 'width 0.3s ease' }} title={`Contracts: ${formatBytes(breakdown.contracts)}`} />
        <div style={{ width: `${pScans}%`, backgroundColor: '#10b981', transition: 'width 0.3s ease' }} title={`Scans: ${formatBytes(breakdown.scans)}`} />
        <div style={{ width: `${pHr}%`, backgroundColor: '#f59e0b', transition: 'width 0.3s ease' }} title={`HR: ${formatBytes(breakdown.hr)}`} />
        <div style={{ width: `${pOther}%`, backgroundColor: '#94a3b8', transition: 'width 0.3s ease' }} title={`Other: ${formatBytes(breakdown.other)}`} />
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        fontSize: '11px',
        color: '#64748b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
          <span>Invoices ({formatBytes(breakdown.invoices)})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8b5cf6' }} />
          <span>Contracts ({formatBytes(breakdown.contracts)})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          <span>Scans & Images ({formatBytes(breakdown.scans)})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          <span>HR Records ({formatBytes(breakdown.hr)})</span>
        </div>
      </div>
    </div>
  );
}
