import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { sociosAPI, membresiasAPI } from '../services/api';
import { Table, Btn, Badge, SearchBox, Modal, Input, Select, Textarea, FormRow, StatMini, Pagination, Avatar, CredChip } from '../components/ui/index.jsx';
import toast from 'react-hot-toast';

function estadoBadge(s) {
  if (!s.activo) return <Badge color="red">Baja</Badge>;
  if (s.contrato_estado === 'pausado') return <Badge color="yellow">Pausado</Badge>;
  if (s.contrato_estado === 'activo') return <Badge color="green">Activo</Badge>;
  return <Badge color="gray">Sin plan</Badge>;
}

export default function Socios() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('');
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null); // 'nuevo' | 'csv'

  const { data, isLoading } = useQuery({
    queryKey: ['socios', buscar, estado, pagina],
    queryFn: () => sociosAPI.listar({ buscar, estado, pagina, limite: 20 }),
    keepPreviousData: true,
    staleTime: 10000,
  });

  const { data: stats } = useQuery({ queryKey: ['socios-stats'], queryFn: sociosAPI.stats });
  const { data: membs } = useQuery({ queryKey: ['membresias-lista'], queryFn: () => membresiasAPI.listar({ activo: 'true' }) });

  const crearMutation = useMutation({
    mutationFn: sociosAPI.crear,
    onSuccess: (data) => {
      qc.invalidateQueries(['socios']);
      qc.invalidateQueries(['socios-stats']);
      setModal(null);
      toast.success(`✓ Socio creado. Contraseña provisional: ${data.password_provisional}`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al crear socio'),
  });

  const columns = [
    { key:'nombre', label:'Socio', width:'28%', render:(v, r) => (
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        <Avatar name={`${r.nombre} ${r.apellidos || ''}`} size={28} />
        <div>
          <div style={{ fontWeight:500 }}>{r.nombre} {r.apellidos}</div>
          <div style={{ fontSize:11, color:'var(--text3)' }}>{r.email}</div>
        </div>
      </div>
    )},
    { key:'membresia', label:'Membresía', width:'26%', render:(v) => <span style={{ fontSize:12, color:'var(--text2)' }}>{v || '—'}</span> },
    { key:'contrato_estado', label:'Estado', width:'10%', render:(v, r) => estadoBadge(r) },
    { key:'creditos_disponibles', label:'Créd.', width:'8%', render:v => <span style={{ color:'var(--accent)', fontWeight:600 }}>{v}</span> },
    { key:'total_visitas', label:'Visitas', width:'8%', render:v => <span style={{ color:'var(--text2)' }}>{v}</span> },
    { key:'ultima_visita', label:'Última visita', width:'12%', render:v => <span style={{ fontSize:12, color:'var(--text3)' }}>{v ? new Date(v).toLocaleDateString('es-ES') : '—'}</span> },
    { key:'id', label:'', width:'8%', render:(v, r) => (
      <Btn size="sm" onClick={e => { e.stopPropagation(); navigate(`/app/socios/${r.id}`); }}>Ver</Btn>
    )},
  ];

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
        <StatMini value={stats?.activos || '—'} label="Activos" />
        <StatMini value={stats?.nuevos_mes || '—'} label="Nuevos este mes" color="var(--green)" />
        <StatMini value={stats?.bajas || '—'} label="Dados de baja" color="var(--red)" />
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center' }}>
        <SearchBox value={buscar} onChange={v => { setBuscar(v); setPagina(1); }} placeholder="Buscar nombre, email, teléfono, DNI..." />
        <select
          value={estado} onChange={e => { setEstado(e.target.value); setPagina(1); }}
          style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'8px 12px', color:'var(--text)', cursor:'pointer', outline:'none' }}
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="pausado">Pausados</option>
          <option value="baja">Dados de baja</option>
        </select>
        <Btn variant="default" onClick={() => setModal('csv')}>↑ Importar CSV</Btn>
        <Btn variant="primary" onClick={() => setModal('nuevo')}>＋ Nuevo socio</Btn>
      </div>

      {/* Tabla */}
      <Table
        columns={columns}
        rows={data?.socios || []}
        loading={isLoading}
        onRowClick={r => navigate(`/app/socios/${r.id}`)}
        emptyText="No se encontraron socios"
      />
      <Pagination page={pagina} total={data?.total || 0} limit={20} onChange={setPagina} />

      {/* Modal Nuevo Socio */}
      <ModalNuevoSocio
        open={modal === 'nuevo'}
        onClose={() => setModal(null)}
        membs={membs || []}
        onSave={crearMutation.mutate}
        loading={crearMutation.isPending}
      />

      {/* Modal CSV */}
      <ModalImportarCSV open={modal === 'csv'} onClose={() => setModal(null)} />
    </div>
  );
}

function ModalNuevoSocio({ open, onClose, membs, onSave, loading }) {
  const [form, setForm] = useState({ nombre:'', apellidos:'', email:'', telefono:'', fecha_nacimiento:'', dni:'', genero:'', notas:'', membresia_id:'' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.nombre || !form.apellidos || !form.email) return toast.error('Nombre, apellidos y email son obligatorios');
    onSave({ ...form, membresia_id: form.membresia_id ? parseInt(form.membresia_id) : undefined });
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo socio" size="md"
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={handleSave} loading={loading}>✓ Crear socio</Btn></>}
    >
      <FormRow><Input label="Nombre *" value={form.nombre} onChange={v => set('nombre',v)} placeholder="Nombre..." /></FormRow>
      <FormRow><Input label="Apellidos *" value={form.apellidos} onChange={v => set('apellidos',v)} placeholder="Apellidos..." /></FormRow>
      <Input label="Email *" type="email" value={form.email} onChange={v => set('email',v)} placeholder="correo@ejemplo.com" />
      <FormRow>
        <Input label="Teléfono" value={form.telefono} onChange={v => set('telefono',v)} placeholder="600000000" />
        <Input label="DNI" value={form.dni} onChange={v => set('dni',v)} placeholder="12345678A" />
      </FormRow>
      <FormRow>
        <Input label="Fecha nacimiento" type="date" value={form.fecha_nacimiento} onChange={v => set('fecha_nacimiento',v)} />
        <Select label="Género" value={form.genero} onChange={v => set('genero',v)} placeholder="No especificado"
          options={[{value:'masculino',label:'Masculino'},{value:'femenino',label:'Femenino'},{value:'otro',label:'Otro'}]} />
      </FormRow>
      <Select
        label="Membresía inicial" value={form.membresia_id} onChange={v => set('membresia_id',v)}
        placeholder="— Sin membresía —"
        options={membs.map(m => ({ value: String(m.id), label: `${m.nombre} — ${m.precio}€` }))}
      />
      <Textarea label="Notas internas" value={form.notas} onChange={v => set('notas',v)} placeholder="Observaciones, lesiones, preferencias..." rows={2} />
    </Modal>
  );
}

function ModalImportarCSV({ open, onClose }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g,''));
      const socios = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/"/g,''));
        return Object.fromEntries(headers.map((h, i) => [h, vals[i]]));
      }).filter(s => s.email || s.nombre);

      const res = await sociosAPI.importarCSV(socios);
      setResultado(res);
      qc.invalidateQueries(['socios']);
      qc.invalidateQueries(['socios-stats']);
    } catch (err) {
      toast.error('Error importando CSV: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Importar socios desde CSV de Virtuagym"
      footer={<Btn onClick={onClose}>Cerrar</Btn>}
    >
      {resultado ? (
        <div>
          <div style={{ background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.2)', borderRadius:8, padding:14, marginBottom:12 }}>
            <strong style={{ color:'var(--green)' }}>✓ Importación completada</strong>
            <div style={{ fontSize:13, color:'var(--text2)', marginTop:4 }}>{resultado.importados} socios importados, {resultado.errores} errores</div>
          </div>
          {resultado.detalle_errores?.length > 0 && (
            <div style={{ fontSize:12, color:'var(--text3)' }}>
              <strong>Errores:</strong>
              {resultado.detalle_errores.slice(0,5).map((e,i) => <div key={i}>• {e.email}: {e.error}</div>)}
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{ background:'var(--bg3)', border:'2px dashed var(--border2)', borderRadius:'var(--rl)', padding:30, textAlign:'center', marginBottom:14, cursor:'pointer' }}
            onClick={() => document.getElementById('csv-file').click()}>
            <div style={{ fontSize:36, marginBottom:8 }}>📄</div>
            <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>Arrastra el CSV o haz clic</div>
            <div style={{ fontSize:12, color:'var(--text3)' }}>Formato Virtuagym: nombre, apellidos, email, teléfono, fecha_alta</div>
            <input id="csv-file" type="file" accept=".csv" onChange={handleFile} style={{ display:'none' }} />
            {loading && <div style={{ marginTop:12, color:'var(--accent)' }}>⟳ Procesando...</div>}
          </div>
          <div style={{ background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)', borderRadius:8, padding:12, fontSize:12, color:'var(--green)' }}>
            <strong>¿Cómo exportar de Virtuagym?</strong><br/>
            Clientes → botón "Exportar" (arriba derecha) → formato CSV → descargar
          </div>
        </>
      )}
    </Modal>
  );
}
