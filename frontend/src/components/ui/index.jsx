import React, { useState, useRef, useEffect } from 'react';

// ── Estilos base compartidos ──────────────────────────────────────
const s = {
  card: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--rl)', padding:'16px' },
  cardTitle: { fontSize:11, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12 },
  input: {
    width:'100%', background:'var(--bg3)', border:'1px solid var(--border)',
    borderRadius:'var(--r)', padding:'9px 12px', color:'var(--text)',
    fontSize:13.5, outline:'none', fontFamily:'inherit', transition:'border-color .15s',
  },
  label: { display:'block', fontSize:11, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 },
};

// ── Button ────────────────────────────────────────────────────────
export function Btn({ children, variant = 'default', size = 'md', onClick, disabled, type = 'button', style, loading }) {
  const variants = {
    default: { background:'transparent', border:'1px solid var(--border)', color:'var(--text2)' },
    primary: { background:'var(--accent)', border:'1px solid var(--accent2)', color:'#fff' },
    danger:  { background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.3)', color:'var(--red)' },
    success: { background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.3)', color:'var(--green)' },
    ghost:   { background:'transparent', border:'none', color:'var(--text2)' },
  };
  const sizes = {
    sm: { padding:'5px 10px', fontSize:12 },
    md: { padding:'8px 14px', fontSize:13 },
    lg: { padding:'10px 18px', fontSize:14 },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer',
        borderRadius:'var(--r)', fontFamily:'inherit', fontWeight:500,
        transition:'all .15s', whiteSpace:'nowrap',
        opacity: disabled ? .5 : 1,
        ...variants[variant], ...sizes[size], ...style
      }}
      onMouseEnter={e => { if(!disabled) e.currentTarget.style.opacity = '.8'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      {loading ? <Spinner size={14} /> : children}
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────
export function Badge({ children, color = 'gray' }) {
  const colors = {
    green:  { bg:'rgba(34,197,94,.1)',   text:'var(--green)',  border:'rgba(34,197,94,.2)' },
    red:    { bg:'rgba(239,68,68,.1)',   text:'var(--red)',    border:'rgba(239,68,68,.2)' },
    yellow: { bg:'rgba(245,158,11,.1)',  text:'var(--yellow)', border:'rgba(245,158,11,.2)' },
    blue:   { bg:'rgba(96,165,250,.1)',  text:'var(--blue)',   border:'rgba(96,165,250,.2)' },
    orange: { bg:'rgba(249,115,22,.1)',  text:'var(--accent)', border:'rgba(249,115,22,.2)' },
    purple: { bg:'rgba(167,139,250,.1)', text:'var(--purple)', border:'rgba(167,139,250,.2)' },
    gray:   { bg:'var(--bg4)',           text:'var(--text2)',  border:'var(--border)' },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:c.bg, color:c.text, border:`1px solid ${c.border}`, whiteSpace:'nowrap' }}>
      {children}
    </span>
  );
}

// ── Input ─────────────────────────────────────────────────────────
export function Input({ label, type = 'text', value, onChange, placeholder, required, error, style, readOnly, min, max, step, autoFocus }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={s.label}>{label}{required && <span style={{color:'var(--red)'}}>*</span>}</label>}
      <input
        type={type} value={value ?? ''} onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder} required={required} readOnly={readOnly}
        min={min} max={max} step={step} autoFocus={autoFocus}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ ...s.input, borderColor: error ? 'var(--red)' : focused ? 'var(--accent)' : 'var(--border)', ...style }}
      />
      {error && <div style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>{error}</div>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────
export function Select({ label, value, onChange, options = [], placeholder, required, error, style }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={s.label}>{label}{required && <span style={{color:'var(--red)'}}>*</span>}</label>}
      <select
        value={value ?? ''} onChange={e => onChange?.(e.target.value)} required={required}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ ...s.input, cursor:'pointer', borderColor: error ? 'var(--red)' : focused ? 'var(--accent)' : 'var(--border)', ...style }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value} style={{background:'var(--bg3)'}}>{o.label}</option>
        ))}
      </select>
      {error && <div style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>{error}</div>}
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────────
export function Textarea({ label, value, onChange, placeholder, rows = 3, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={s.label}>{label}</label>}
      <textarea
        value={value ?? ''} onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder} rows={rows}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ ...s.input, resize:'vertical', minHeight: rows * 24, borderColor: focused ? 'var(--accent)' : 'var(--border)' }}
      />
      {error && <div style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>{error}</div>}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────
export function Card({ children, title, action, style }) {
  return (
    <div style={{ ...s.card, ...style }}>
      {(title || action) && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          {title && <div style={s.cardTitle}>{title}</div>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 420, md: 520, lg: 680, xl: 860 };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:1000,
        display:'flex', alignItems:'center', justifyContent:'center', padding:20,
        animation:'fadeIn .15s ease'
      }}
    >
      <div style={{
        background:'var(--bg2)', border:'1px solid var(--border2)',
        borderRadius:'var(--rl)', width:'100%', maxWidth: sizes[size],
        maxHeight:'90vh', display:'flex', flexDirection:'column',
        boxShadow:'0 24px 80px rgba(0,0,0,.6)',
        animation:'slideUp .2s ease'
      }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ fontSize:17, fontWeight:600, color:'var(--text)' }}>{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text2)', fontSize:20, cursor:'pointer', padding:'0 4px', lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:20, overflowY:'auto', flex:1 }}>{children}</div>
        {footer && (
          <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:8, flexShrink:0 }}>
            {footer}
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(12px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────
export function Table({ columns, rows, onRowClick, loading, emptyText = 'Sin datos' }) {
  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--rl)', overflow:'hidden' }}>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={{
                  background:'var(--bg3)', padding:'9px 14px', textAlign:'left',
                  fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase',
                  letterSpacing:'.08em', borderBottom:'1px solid var(--border)',
                  whiteSpace:'nowrap', width: col.width
                }}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} style={{padding:40, textAlign:'center', color:'var(--text3)'}}>
                <Spinner /> Cargando...
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns.length} style={{padding:40, textAlign:'center', color:'var(--text3)'}}>
                {emptyText}
              </td></tr>
            ) : rows.map((row, i) => (
              <tr
                key={row.id || i}
                onClick={() => onRowClick?.(row)}
                style={{ cursor: onRowClick ? 'pointer' : 'default', transition:'background .1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {columns.map(col => (
                  <td key={col.key} style={{
                    padding:'10px 14px', borderBottom:'1px solid var(--border)',
                    fontSize:13, color:'var(--text)', verticalAlign:'middle',
                    maxWidth: col.maxWidth || 'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace: col.nowrap !== false ? 'nowrap' : 'normal'
                  }}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────
export function Pagination({ page, total, limit, onChange }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  const show = Array.from({ length: Math.min(7, pages) }, (_, i) => {
    if (pages <= 7) return i + 1;
    if (page <= 4) return i + 1;
    if (page >= pages - 3) return pages - 6 + i;
    return page - 3 + i;
  });
  return (
    <div style={{ display:'flex', justifyContent:'center', gap:5, marginTop:12 }}>
      <PgBtn disabled={page === 1} onClick={() => onChange(page - 1)}>←</PgBtn>
      {show.map(p => <PgBtn key={p} active={p === page} onClick={() => onChange(p)}>{p}</PgBtn>)}
      <PgBtn disabled={page === pages} onClick={() => onChange(page + 1)}>→</PgBtn>
    </div>
  );
}
function PgBtn({ children, active, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:30, height:30, borderRadius:'var(--r)', border:'1px solid var(--border)',
      background: active ? 'rgba(249,115,22,.15)' : 'transparent',
      color: active ? 'var(--accent)' : 'var(--text2)',
      cursor: disabled ? 'default' : 'pointer', fontSize:12,
      opacity: disabled ? .4 : 1,
      transition:'all .15s'
    }}>{children}</button>
  );
}

// ── Avatar ────────────────────────────────────────────────────────
export function Avatar({ name = '?', color, size = 28, src }) {
  const colors = ['#378ADD','#7F77DD','#1D9E75','#D85A30','#BA7517','#639922','#D4537E','#185FA5'];
  const bg = color || colors[(name.charCodeAt(0) || 0) % colors.length];
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  if (src) return <img src={src} alt={name} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />;
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', flexShrink:0,
      background: bg + '22', color: bg, border:`1px solid ${bg}44`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize: Math.floor(size * 0.38), fontWeight:600
    }}>{initials}</div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────
export function Spinner({ size = 20, color = 'var(--accent)' }) {
  return (
    <div style={{
      width:size, height:size, border:`2px solid ${color}30`,
      borderTopColor:color, borderRadius:'50%',
      animation:'spin .7s linear infinite', flexShrink:0
    }}>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}

// ── SearchBox ─────────────────────────────────────────────────────
export function SearchBox({ value, onChange, placeholder = 'Buscar...' }) {
  return (
    <div style={{
      flex:1, display:'flex', alignItems:'center', gap:8,
      background:'var(--bg2)', border:'1px solid var(--border)',
      borderRadius:'var(--r)', padding:'8px 12px'
    }}>
      <span style={{ color:'var(--text3)', fontSize:15 }}>🔍</span>
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ background:'transparent', border:'none', outline:'none', color:'var(--text)', width:'100%', fontSize:13.5 }}
      />
      {value && <button onClick={() => onChange('')} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:16, lineHeight:1 }}>×</button>}
    </div>
  );
}

// ── FormRow ───────────────────────────────────────────────────────
export function FormRow({ children, cols = 2 }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:12 }}>
      {children}
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────────
export function MetricCard({ icon, label, value, trend, trendUp, accentColor = 'var(--accent)', loading }) {
  return (
    <div style={{
      background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--rl)',
      padding:'14px 16px', position:'relative', overflow:'hidden'
    }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:accentColor }} />
      <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
      {loading ? <div style={{ height:28, background:'var(--bg3)', borderRadius:4, marginBottom:4 }} /> : (
        <div style={{ fontSize:26, fontWeight:600, color:'var(--text)', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{value}</div>
      )}
      <div style={{ fontSize:11, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.06em', marginTop:3 }}>{label}</div>
      {trend && <div style={{ fontSize:11, color: trendUp ? 'var(--green)' : 'var(--red)', marginTop:5 }}>{trendUp ? '↑' : '↓'} {trend}</div>}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:16 }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding:'9px 16px', fontSize:13, background:'none',
            border:'none', borderBottom: active === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
            color: active === tab.id ? 'var(--accent)' : 'var(--text2)',
            cursor:'pointer', fontWeight: active === tab.id ? 500 : 400,
            marginBottom:-1, transition:'all .15s', whiteSpace:'nowrap'
          }}
        >{tab.label}</button>
      ))}
    </div>
  );
}

// ── Stat mini ─────────────────────────────────────────────────────
export function StatMini({ value, label, color }) {
  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--rl)', padding:12, textAlign:'center' }}>
      <div style={{ fontSize:22, fontWeight:600, color: color || 'var(--text)' }}>{value}</div>
      <div style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>{label}</div>
    </div>
  );
}

// ── CredChip ──────────────────────────────────────────────────────
export function CredChip({ nombre, cantidad, color }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      background:'var(--bg4)', border:'1px solid var(--border)',
      borderRadius:20, padding:'2px 8px 2px 5px', fontSize:11, margin:2
    }}>
      <span style={{ width:8, height:8, borderRadius:'50%', background: color || '#888', display:'inline-block' }} />
      <strong style={{ color:'var(--text)' }}>{cantidad}</strong>
      <span style={{ color:'var(--text2)' }}>{nombre}</span>
    </span>
  );
}

// ── Toast manual (complementa react-hot-toast) ────────────────────
export { default as toast } from 'react-hot-toast';

export { s as baseStyles };
