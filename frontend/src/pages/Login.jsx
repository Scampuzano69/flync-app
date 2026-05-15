import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('admin@flync.es');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Introduce email y contraseña');
    setLoading(true);
    try {
      await login(email, password);
      toast.success('¡Bienvenido!');
      navigate('/app/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg)', padding:20
    }}>
      <div style={{
        width:'100%', maxWidth:380,
        background:'var(--bg2)', border:'1px solid var(--border2)',
        borderRadius:16, overflow:'hidden',
        boxShadow:'0 24px 80px rgba(0,0,0,.5)'
      }}>
        {/* Header */}
        <div style={{
          background:'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
          padding:'30px 0', textAlign:'center'
        }}>
          <div style={{ fontSize:52, marginBottom:8 }}>🔥</div>
          <div style={{ fontSize:26, fontWeight:700, color:'white', letterSpacing:'.04em' }}>FLY NC</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.75)', textTransform:'uppercase', letterSpacing:'.1em', marginTop:3 }}>Centro de Alto Rendimiento</div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding:28 }}>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@flync.es" autoFocus
              style={{
                width:'100%', background:'var(--bg3)', border:'1px solid var(--border)',
                borderRadius:8, padding:'10px 12px', color:'var(--text)', fontSize:14, outline:'none',
                transition:'border-color .15s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Contraseña</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width:'100%', background:'var(--bg3)', border:'1px solid var(--border)',
                borderRadius:8, padding:'10px 12px', color:'var(--text)', fontSize:14, outline:'none',
                transition:'border-color .15s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <button
            type="submit" disabled={loading}
            style={{
              width:'100%', background: loading ? 'var(--accent2)' : 'var(--accent)',
              border:'none', borderRadius:8, padding:'11px 0',
              color:'white', fontSize:15, fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer',
              transition:'background .15s', display:'flex', alignItems:'center', justifyContent:'center', gap:8
            }}
          >
            {loading ? '⟳ Entrando...' : 'Entrar →'}
          </button>

          <div style={{ marginTop:16, padding:12, background:'var(--bg3)', borderRadius:8, fontSize:11, color:'var(--text3)' }}>
            <strong style={{ color:'var(--text2)' }}>Demo:</strong> admin@flync.es / Admin2024!
          </div>
        </form>
      </div>
    </div>
  );
}
