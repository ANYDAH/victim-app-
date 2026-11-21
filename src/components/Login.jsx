import React, { useState } from 'react';
import { Shield, Lock, ArrowRight, HardDrive, Key, CheckCircle2 } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('admin.secops@drivevault.internal');
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      onLogin({
        email: email || 'alex.chen@drivevault.internal',
        name: email ? email.split('@')[0].replace('.', ' ') : 'Alex Chen',
        role: 'Corporate Admin',
      });
      setLoading(false);
    }, 400);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background geometric accents */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-5%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, rgba(248, 250, 252, 0) 70%)',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '-5%',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79, 70, 229, 0.06) 0%, rgba(248, 250, 252, 0) 70%)',
        zIndex: 0
      }} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02), 0 0 0 1px rgba(226, 232, 240, 0.8)',
        padding: '40px',
      }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            backgroundColor: '#eef2ff',
            color: '#4f46e5',
            marginBottom: '16px',
            boxShadow: '0 0 0 1px #c7d2fe'
          }}>
            <HardDrive size={30} strokeWidth={2.2} />
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            color: '#0f172a',
            marginBottom: '6px'
          }}>
            DriveVault
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Enterprise Protected Storage & Vault System
          </p>
        </div>

        {/* Security badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '12px',
          color: '#166534'
        }}>
          <Shield size={16} color="#16a34a" />
          <span><strong>Vault Protection:</strong> Encrypted AES-256 Storage Node</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#334155',
              marginBottom: '6px'
            }}>
              Corporate Email / Principal
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. finance.ops@drivevault.internal"
              style={{
                width: '100%',
                padding: '11px 14px',
                fontSize: '14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                outline: 'none',
                transition: 'border-color 0.15s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                Access Token / Password
              </label>
              <span style={{ fontSize: '12px', color: '#6366f1', cursor: 'pointer' }}>
                Any credentials work (Mock)
              </span>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              style={{
                width: '100%',
                padding: '11px 14px',
                fontSize: '14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                outline: 'none',
              }}
              onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 18px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
              boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#4338ca')}
            onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = '#4f46e5')}
          >
            {loading ? 'Authenticating...' : (
              <>
                <span>Enter DriveVault</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '12px',
          color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} color="#10b981" />
            <span>Target Node: <code>./victim-app</code> (Port 4000)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Key size={14} color="#6366f1" />
            <span>Default Client API Key: <code>finance-ops-key</code></span>
          </div>
        </div>
      </div>
    </div>
  );
}
