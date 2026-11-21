import React from 'react';
import { AlertOctagon, Skull, RefreshCw, ShieldAlert, FileText, Lock } from 'lucide-react';

export default function RansomBanner({ noteContent, onRefresh, checking }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99999,
      backgroundColor: 'rgba(15, 23, 42, 0.96)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      overflowY: 'auto',
    }}>
      <div className="ransom-alert" style={{
        maxWidth: '820px',
        width: '100%',
        backgroundColor: '#7f1d1d',
        backgroundImage: 'linear-gradient(135deg, #991b1b 0%, #450a0a 100%)',
        border: '3px solid #ef4444',
        borderRadius: '20px',
        padding: '36px',
        color: '#ffffff',
        boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.5), 0 0 100px rgba(239, 68, 68, 0.35)',
      }}>
        {/* Urgent Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid rgba(254, 202, 202, 0.3)',
          paddingBottom: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px #ef4444'
            }}>
              <Skull size={34} color="#ffffff" />
            </div>
            <div>
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#fecaca',
                marginBottom: '2px'
              }}>
                CRITICAL SECURITY BREACH DETECTED
              </div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
              }}>
                YOUR FILES HAVE BEEN ENCRYPTED
              </h1>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            fontSize: '13px',
            fontFamily: 'var(--font-mono)',
            color: '#fca5a5'
          }}>
            <Lock size={15} />
            <span>VAULT_LOCKED</span>
          </div>
        </div>

        {/* Warning Banner Text */}
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderLeft: '4px solid #ef4444',
          padding: '14px 18px',
          borderRadius: '6px',
          marginBottom: '24px',
          fontSize: '14px',
          color: '#fee2e2',
          lineHeight: '1.6'
        }}>
          <strong>Ransomware Incident Active:</strong> An unauthorized actor has accessed <code>./data/vault</code>,
          modified repository contents, and placed a ransom recovery notice in the vault root.
          File operations are currently suspended.
        </div>

        {/* Ransom Note Content Box */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#fecaca'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} />
              <span>Ransom Demand (from <code>READ_ME_FOR_RECOVERY.txt</code>):</span>
            </div>
            <span style={{ fontSize: '11px', opacity: 0.8 }}>ROOT_LEVEL_TRIGGER</span>
          </div>

          <pre style={{
            backgroundColor: '#050505',
            color: '#22c55e',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '10px',
            padding: '20px',
            fontSize: '13px',
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            maxHeight: '260px',
            overflowY: 'auto',
            boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.8)',
            lineHeight: '1.5'
          }}>
            {noteContent || "Attention: All your corporate databases and files have been encrypted using strong cryptographic algorithms.\n\nTo restore your data, visit the recovery portal or contact our negotiation agent.\nUnique Victim ID: DV-VAULT-TARGET-0941\nDo not attempt manual decryption or alter headers."}
          </pre>
        </div>

        {/* Actions & Recovery info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(254, 202, 202, 0.2)'
        }}>
          <div style={{ fontSize: '13px', color: '#fca5a5' }}>
            <span>BucketGuard Mitigation: Clean versions preserved in <code>./data/vault/.versions/</code></span>
          </div>

          <button
            onClick={onRefresh}
            disabled={checking}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              borderRadius: '10px',
              border: 'none',
              cursor: checking ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.5)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => !checking && (e.currentTarget.style.backgroundColor = '#dc2626')}
            onMouseOut={(e) => !checking && (e.currentTarget.style.backgroundColor = '#ef4444')}
          >
            <RefreshCw size={16} className={checking ? 'spin' : ''} />
            <span>{checking ? 'Checking Status...' : 'Check Recovery / Re-scan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
