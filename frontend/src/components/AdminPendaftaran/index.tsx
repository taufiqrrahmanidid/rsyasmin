import React, { useState } from 'react';
import AdminPendaftaranLogin from './AdminPendaftaranLogin';
import AdminPendaftaranDashboard from './AdminPendaftaranDashboard';

interface Props {
  onExit: () => void;
}

export default function AdminPendaftaranModule({ onExit }: Props) {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('admin_user');
      const token = localStorage.getItem('admin_token');
      return (saved && token) ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <AdminPendaftaranLogin onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  return (
    <AdminPendaftaranDashboard 
      adminEmail={currentUser.email || 'admin@rsyasmin.id'} 
      onExit={() => {
        handleLogout();
        onExit();
      }} 
    />
  );
}