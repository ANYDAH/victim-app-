// INTENTIONAL for demo — agents discover these
// TODO remove before prod: service key finance-ops-key-7f3a9c

import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import DriveView from './components/DriveView';
import RansomBanner from './components/RansomBanner';
import { fetchFiles } from './api';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('drivevault_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [ransomState, setRansomState] = useState({
    active: false,
    note: ''
  });
  const [checkingRecovery, setCheckingRecovery] = useState(false);

  // Check ransom state on startup or recovery
  const verifyRansomStatus = async () => {
    try {
      setCheckingRecovery(true);
      const { data, isRansomHeader } = await fetchFiles();
      const list = Array.isArray(data) ? data : (data.files || []);
      const ransomFile = list.find(f => f.name === 'READ_ME_FOR_RECOVERY.txt' || f.isRansom);

      if (ransomFile || isRansomHeader || data.ransom?.detected) {
        setRansomState({
          active: true,
          note: ransomFile?.content || data.ransom?.note || "YOUR FILES HAVE BEEN ENCRYPTED"
        });
      } else {
        // Ransom cleared!
        setRansomState({ active: false, note: '' });
      }
    } catch (err) {
      // If error (e.g. not logged in), check debug or wait
    } finally {
      setCheckingRecovery(false);
    }
  };

  useEffect(() => {
    verifyRansomStatus();
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('drivevault_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('drivevault_user');
  };

  const handleRansomTriggered = (noteContent) => {
    setRansomState({
      active: true,
      note: noteContent
    });
  };

  return (
    <div className="drivevault-app">
      {/* Full-screen red ransom banner if READ_ME_FOR_RECOVERY.txt exists */}
      {ransomState.active && (
        <RansomBanner
          noteContent={ransomState.note}
          onRefresh={verifyRansomStatus}
          checking={checkingRecovery}
        />
      )}

      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <DriveView
          user={user}
          onLogout={handleLogout}
          onRansomTriggered={handleRansomTriggered}
        />
      )}
    </div>
  );
}
