import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import toast from 'react-hot-toast';

const NAV = [
  { id:'dashboard', icon:'⊞', label:'Dashboard', path:'/app/dashboard', roles:['all'] },
  { id:'socios', icon:'👥', label:'Socios', path:'/app/socios', roles:['admin'], badge:'socios' },
  { id:'horario', icon:'📅', label:'Horario', path:'/app/horario', roles:['all'] },
  { id:'acceso', icon:'🔲', label:'Acceso QR', path:'/app/acceso', roles:['admin'] },
  { id:'membresias', icon:'🏷', label:'Membresías', path:'/app/membresias', roles:['admin'] },
  { id:'pagos', icon:'💳', label:'Pagos', path:'/app/pagos', roles:['admin'] },
  { id:'notificaciones', icon:'🔔', label:'Notificaciones', path:'/app/notificaciones', roles:['admin'] },
  { id:'config', icon:'⚙️', label:'Configuración', path:'/app/config', roles:['admin'] },
];

const SOCIO_NAV = [
  { id:'horario', icon:'📅', label:'Horario', path:'/app/horario' },
  { id:'mis-reservas', icon:'📋', label:'Mis reservas', path:'/app/mis-reservas' },
  { id:'mi-qr', icon:'🔲', label:'Mi QR', path:'/app/mi-qr' },
];

const PAGE_TITLES = {
  dashboard:'Dashboard general', socios:'Gestión de socios', horario:'Horario de clases',
  acceso:'Control de acceso QR', membresias:'Membresías y créditos', pagos:'Pagos y facturación',
  notificaciones:'Notificaciones', config:'Configuración del sistema',
  'mi-qr':'Mi código QR', 'mis-reservas':'Mis reservas'
};

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPage = location.pathname.split('/app/')[1]?.split('/')[0] || 'dashboard';
  const navItems = isAdmin ? NAV.filter(n => n.roles.includes('all') || n.roles.includes('admin')) : SOCIO_NAV;

  const handleLogout = async () => {
    try { await logout(); navigate('/login'); }
    catch { localStorage.clear(); navigate('/login'); }
  };

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>

      {/* SIDEBAR */}
      <div style={{
        width:220, minWidth:220, background:'var(--bg2)',
        borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column',
        overflow:'hidden'
      }}>
        {/* Logo */}
        <div style={{ padding:'16px 16px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, background:'var(--accent)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🔥</div>
          <div>
            <div style={{ fontSize:16, fontWeight:600, color:'var(--text)' }}>FLY NC</div>
            <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.07em' }}>
              {isAdmin ? 'Administración' : 'Portal Socio'}
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          <div style={{ fontSize:10, fontWeight:600, color:'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase', padding:'6px 16px 3px' }}>
            {isAdmin ? 'Principal' : 'Mi Cuenta'}
          </div>
          {navItems.map(item => {
            const active = currentPage === item.id;
            return (
              <div
                key={item.id}
                onClick={() => navigate(item.path)}
                style={{
                  display:'flex', alignItems:'center', gap:10, padding:'9px 16px',
                  cursor:'pointer', fontSize:13.5, transition:'all .12s',
                  borderLeft:`2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  color: active ? 'var(--accent)' : 'var(--text2)',
                  background: active ? 'rgba(249,115,22,.08)' : 'transparent',
                  fontWeight: active ? 500 : 400,
                  userSelect:'none'
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text)'; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; }}}
              >
                <span style={{ fontSize:17, width:20, textAlign:'center', flexShrink:0 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(249,115,22,.15)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, flexShrink:0 }}>
            {(user?.nombre?.[0] || '') + (user?.apellidos?.[0] || '')}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.nombre}</div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>{user?.rol}</div>
          </div>
          <div style={{ width:7, height:7, background:'var(--green)', borderRadius:'50%', flexShrink:0, animation:'pulse 2s infinite' }} />
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* Topbar */}
        <div style={{
          height:52, minHeight:52, background:'var(--bg2)', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', padding:'0 20px', gap:12
        }}>
          <div style={{ fontSize:16, fontWeight:600, color:'var(--text)' }}>
            {PAGE_TITLES[currentPage] || 'FLY NC'}
          </div>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ background:'rgba(34,197,94,.12)', color:'var(--green)', fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:600, border:'1px solid rgba(34,197,94,.2)' }}>
              ● En vivo
            </span>
            <button
              onClick={handleLogout}
              style={{ background:'transparent', border:'1px solid var(--border)', borderRadius:'var(--r)', color:'var(--text2)', padding:'6px 12px', cursor:'pointer', fontSize:12, transition:'all .15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
            >
              Salir
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:'auto', padding:20, background:'var(--bg)' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
