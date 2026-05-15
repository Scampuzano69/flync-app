import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sociosAPI, contratosAPI, membresiasAPI, creditosAPI } from '../services/api';
import { Card, Btn, Badge, Modal, Input, Select, FormRow, Textarea, Avatar, Tabs, CredChip, Spinner } from '../components/ui/index.jsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function SocioDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('info');
  const [modal, setModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['socio', id],
    queryFn: () => sociosAPI.obtener(id),
  });

  const { data: membs } = useQuery({ queryKey:['membresias-lista'], queryFn:() => membresiasAPI.listar({activo:'true'}) });
  const { data: creditosTipos } = useQuery({ queryKey:['creditos-tipos'], queryFn: creditosAPI.tipos });

  const editarMutation = useMutation({
    mutationFn: (datos) => sociosAPI.actualizar(id, datos),
    onSuccess: () => { qc.invalidateQueries(['socio', id]); setModal(null); toast.success('Socio actualizado'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const bajaMutation = useMutation({
    mutationFn: () => sociosAPI.darBaja(id),
    onSuccess: () => { toast.success('Socio dado de baja'); navigate('/app/socios'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const creditosMutation = useMutation({
    mutationFn: (datos) => sociosAPI.añadirCreditos(id, datos),
    onSuccess: () => { qc.invalidateQueries(['socio', id]); setModal(null); toast.success('Créditos añadidos'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const contratarMutation = useMutation({
    mutationFn: (datos) => contratosAPI.crear(datos),
    onSuccess: () => { qc.invalidateQueries(['socio', id]); setModal(null); toast.success('Contrato creado'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:60 }}><Spinner size={32} /></div>;
  if (!data) return <div style={{ color:'var(--text3)', padding:40, textAlign:'center' }}>Socio no encontrado</div>;

  const { socio, contratos = [], creditos = [], accesos = [], reservas = [], pagos = [] } = data;
  const ini = `${socio.nombre?.[0] || ''}${socio.apellidos?.[0] || ''}`;
  const colores = ['#378ADD','#7F77DD','#1D9E75','#D85A30','#BA7517','#639922','#D4537E','#185FA5'];
  const color = colores[id.charCodeAt(0) % colores.length];

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
        <Btn onClick={() => navigate('/app/socios')}>← Volver</Btn>
        <div style={{ flex:1 }} />
        <Btn onClick={() => setModal('editar')}>✏️ Editar</Btn>
        <Btn onClick={() => setModal('creditos')} variant="success">+ Añadir créditos</Btn>
        <Btn onClick={() => setModal('contratar')} variant="primary">📋 Asignar membresía</Btn>
        {socio.activo && <Btn variant="danger" onClick={() => { if(window.confirm('¿Dar de baja al socio?')) bajaMutation.mutate(); }}>Dar de baja</Btn>}
      </div>

      {/* Perfil */}
      <Card style={{ marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16, paddingBottom:16, borderBottom:'1px solid var(--border)' }}>
          <Avatar name={`${socio.nombre} ${socio.apellidos || ''}`} color={color} size={52} src={socio.avatar_url} />
          <div>
            <div style={{ fontSize:18, fontWeight:600 }}>{socio.nombre} {socio.apellidos}</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>{socio.email} · {socio.telefono || 'Sin teléfono'}</div>
            <div style={{ marginTop:6 }}>
              {!socio.activo ? <Badge color="red">Baja</Badge> :
               contratos[0]?.estado === 'pausado' ? <Badge color="yellow">Pausado</Badge> :
               contratos[0]?.estado === 'activo' ? <Badge color="green">Activo</Badge> :
               <Badge color="gray">Sin membresía</Badge>}
              {socio.dni && <span style={{ marginLeft:8, fontSize:11, color:'var(--text3)' }}>DNI: {socio.dni}</span>}
            </div>
          </div>
          <div style={{ marginLeft:'auto', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, textAlign:'center' }}>
            <div><div style={{ fontSize:22, fontWeight:600, color:'var(--accent)' }}>{creditos.reduce((a,c) => a + (c.cantidad_disponible || 0), 0)}</div><div style={{ fontSize:11, color:'var(--text3)' }}>Créditos</div></div>
            <div><div style={{ fontSize:22, fontWeight:600 }}>{socio.total_visitas}</div><div style={{ fontSize:11, color:'var(--text3)' }}>Visitas</div></div>
            <div><div style={{ fontSize:22, fontWeight:600 }}>{contratos.length}</div><div style={{ fontSize:11, color:'var(--text3)' }}>Contratos</div></div>
          </div>
        </div>

        {/* Créditos disponibles */}
        {creditos.length > 0 && (
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>Créditos disponibles</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {creditos.map(c => (
                <div key={c.id} style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:c.color || '#888', flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:12, fontWeight:500 }}>{c.tipo_nombre}</div>
                    <div style={{ height:4, background:'var(--border)', borderRadius:2, width:80, marginTop:3 }}>
                      <div style={{ height:'100%', width:`${Math.min(100, (c.cantidad_disponible / c.cantidad_total) * 100)}%`, background:c.color, borderRadius:2 }} />
                    </div>
                  </div>
                  <div style={{ fontSize:18, fontWeight:700, color:c.color }}>{c.cantidad_disponible}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>/{c.cantidad_total}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Tabs */}
      <Tabs
        tabs={[{id:'info',label:'Información'},{id:'contratos',label:`Contratos (${contratos.length})`},{id:'accesos',label:`Accesos (${accesos.length})`},{id:'reservas',label:`Reservas (${reservas.length})`},{id:'pagos',label:`Pagos (${pagos.length})`}]}
        active={tab} onChange={setTab}
      />

      {tab === 'info' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[
            ['Email', socio.email], ['Teléfono', socio.telefono || '—'], ['DNI', socio.dni || '—'],
            ['Fecha nacimiento', socio.fecha_nacimiento ? new Date(socio.fecha_nacimiento).toLocaleDateString('es-ES') : '—'],
            ['Fecha alta', socio.fecha_alta ? new Date(socio.fecha_alta).toLocaleDateString('es-ES') : '—'],
            ['Última visita', socio.ultima_visita ? format(new Date(socio.ultima_visita), 'dd/MM/yyyy HH:mm') : '—'],
            ['Ciudad', socio.ciudad || '—'], ['Código postal', socio.codigo_postal || '—'],
            ['Género', socio.genero || '—']
          ].map(([k,v]) => (
            <div key={k} style={{ background:'var(--bg3)', borderRadius:'var(--r)', padding:'10px 12px' }}>
              <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>{k}</div>
              <div style={{ fontSize:13 }}>{v}</div>
            </div>
          ))}
          {socio.notas && (
            <div style={{ background:'var(--bg3)', borderRadius:'var(--r)', padding:'10px 12px', gridColumn:'1/-1' }}>
              <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>Notas</div>
              <div style={{ fontSize:13 }}>{socio.notas}</div>
            </div>
          )}
        </div>
      )}

      {tab === 'contratos' && (
        <div>
          {contratos.length === 0 ? <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>Sin contratos</div> :
            contratos.map(c => (
              <div key={c.id} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:14, marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:500 }}>{c.membresia_nombre}</div>
                    <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>
                      {c.fecha_inicio ? new Date(c.fecha_inicio).toLocaleDateString('es-ES') : '?'} — {c.fecha_fin ? new Date(c.fecha_fin).toLocaleDateString('es-ES') : 'Sin fecha'}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <Badge color={c.estado === 'activo' ? 'green' : c.estado === 'pausado' ? 'yellow' : 'red'}>{c.estado}</Badge>
                    <div style={{ fontSize:16, fontWeight:600, color:'var(--accent)' }}>{c.precio}€</div>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab === 'accesos' && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--rl)', overflow:'hidden' }}>
          {accesos.length === 0 ? <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>Sin accesos registrados</div> :
            accesos.map((a, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background: a.resultado === 'ok' ? 'var(--green)' : a.resultado === 'sin_creditos' ? 'var(--yellow)' : 'var(--red)', flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13 }}>{format(new Date(a.timestamp), 'dd/MM/yyyy HH:mm:ss')}</div>
                  <div style={{ fontSize:11, color:'var(--text2)' }}>{a.credito_tipo || 'Sin crédito'} · {a.metodo}</div>
                </div>
                <Badge color={a.resultado === 'ok' ? 'green' : a.resultado === 'sin_creditos' ? 'yellow' : 'red'}>
                  {a.resultado === 'ok' ? '✓ OK' : a.resultado === 'sin_creditos' ? 'Sin créditos' : 'Denegado'}
                </Badge>
              </div>
            ))
          }
        </div>
      )}

      {tab === 'reservas' && (
        <div>
          {reservas.length === 0 ? <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>Sin reservas</div> :
            reservas.map(r => (
              <div key={r.id} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:12, marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:500 }}>{r.actividad}</div>
                  <div style={{ fontSize:12, color:'var(--text2)', marginTop:1 }}>
                    {r.sala} · {r.fecha_inicio ? format(new Date(r.fecha_inicio), 'dd/MM HH:mm') : '?'}
                  </div>
                </div>
                <Badge color={r.estado === 'confirmada' ? 'green' : r.estado === 'lista_espera' ? 'yellow' : 'gray'}>{r.estado}</Badge>
              </div>
            ))
          }
        </div>
      )}

      {tab === 'pagos' && (
        <div>
          {pagos.length === 0 ? <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>Sin pagos registrados</div> :
            pagos.map(p => (
              <div key={p.id} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:12, marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{p.concepto}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>
                    {p.numero_factura} · {p.metodo_pago} · {p.fecha_emision ? new Date(p.fecha_emision).toLocaleDateString('es-ES') : '?'}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--accent)' }}>{p.importe_total}€</div>
                  <Badge color={p.estado === 'pagado' ? 'green' : p.estado === 'pendiente' ? 'yellow' : 'red'} style={{ marginTop:3 }}>{p.estado}</Badge>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Modal editar */}
      {modal === 'editar' && (
        <ModalEditar socio={socio} onClose={() => setModal(null)} onSave={editarMutation.mutate} loading={editarMutation.isPending} />
      )}

      {/* Modal créditos */}
      {modal === 'creditos' && (
        <ModalCreditos onClose={() => setModal(null)} onSave={creditosMutation.mutate} loading={creditosMutation.isPending} tipos={creditosTipos || []} />
      )}

      {/* Modal contratar */}
      {modal === 'contratar' && (
        <ModalContratar onClose={() => setModal(null)} onSave={(d) => contratarMutation.mutate({...d, usuario_id: id})} loading={contratarMutation.isPending} membs={membs || []} />
      )}
    </div>
  );
}

function ModalEditar({ socio, onClose, onSave, loading }) {
  const [form, setForm] = useState({ nombre:socio.nombre, apellidos:socio.apellidos || '', telefono:socio.telefono||'', dni:socio.dni||'', ciudad:socio.ciudad||'', notas:socio.notas||'' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <Modal open onClose={onClose} title="Editar socio" size="md"
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={() => onSave(form)} loading={loading}>✓ Guardar</Btn></>}>
      <FormRow><Input label="Nombre *" value={form.nombre} onChange={v=>set('nombre',v)} /><Input label="Apellidos *" value={form.apellidos} onChange={v=>set('apellidos',v)} /></FormRow>
      <FormRow><Input label="Teléfono" value={form.telefono} onChange={v=>set('telefono',v)} /><Input label="DNI" value={form.dni} onChange={v=>set('dni',v)} /></FormRow>
      <Input label="Ciudad" value={form.ciudad} onChange={v=>set('ciudad',v)} />
      <Textarea label="Notas" value={form.notas} onChange={v=>set('notas',v)} rows={2} />
    </Modal>
  );
}

function ModalCreditos({ onClose, onSave, loading, tipos }) {
  const [form, setForm] = useState({ tipo_credito_id:'', cantidad:8, motivo:'Añadido manualmente', fecha_caducidad:'' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <Modal open onClose={onClose} title="Añadir créditos" size="sm"
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="success" onClick={() => { if(!form.tipo_credito_id) return toast.error('Selecciona un tipo de crédito'); onSave({...form, tipo_credito_id:parseInt(form.tipo_credito_id), cantidad:parseInt(form.cantidad)}); }} loading={loading}>✓ Añadir</Btn></>}>
      <Select label="Tipo de crédito *" value={form.tipo_credito_id} onChange={v=>set('tipo_credito_id',v)} placeholder="Selecciona..." options={tipos.map(t=>({value:String(t.id),label:`${t.icono||'●'} ${t.nombre}`}))} />
      <FormRow><Input label="Cantidad" type="number" value={form.cantidad} onChange={v=>set('cantidad',v)} min={1} /><Input label="Caducidad (opcional)" type="date" value={form.fecha_caducidad} onChange={v=>set('fecha_caducidad',v)} /></FormRow>
      <Select label="Motivo" value={form.motivo} onChange={v=>set('motivo',v)} options={[{value:'Añadido manualmente',label:'Manual'},{value:'Compensación',label:'Compensación'},{value:'Regalo',label:'Regalo'},{value:'Error corrección',label:'Corrección error'}]} />
    </Modal>
  );
}

function ModalContratar({ onClose, onSave, loading, membs }) {
  const [form, setForm] = useState({ membresia_id:'', metodo_pago:'efectivo' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const memb = membs.find(m=>String(m.id)===form.membresia_id);
  return (
    <Modal open onClose={onClose} title="Asignar membresía" size="md"
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={() => { if(!form.membresia_id) return toast.error('Selecciona una membresía'); onSave({membresia_id:parseInt(form.membresia_id), metodo_pago:form.metodo_pago}); }} loading={loading}>✓ Asignar membresía</Btn></>}>
      <Select label="Membresía *" value={form.membresia_id} onChange={v=>set('membresia_id',v)} placeholder="Selecciona..." options={membs.map(m=>({value:String(m.id),label:`${m.nombre} — ${m.precio}€`}))} />
      {memb && (
        <div style={{ background:'var(--bg3)', borderRadius:'var(--r)', padding:12, marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:6 }}>Créditos que recibirá:</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
            {(memb.creditos || []).map((c,i)=><CredChip key={i} nombre={c.tipo_nombre} cantidad={c.cantidad} color={c.color} />)}
          </div>
          <div style={{ fontSize:13, color:'var(--accent)', fontWeight:600, marginTop:8 }}>Total: {memb.precio}€ / {memb.duracion_cantidad} {memb.duracion_unidad}</div>
        </div>
      )}
      <Select label="Método de pago" value={form.metodo_pago} onChange={v=>set('metodo_pago',v)} options={[{value:'efectivo',label:'Efectivo'},{value:'tarjeta',label:'Tarjeta'},{value:'transferencia',label:'Transferencia'},{value:'domiciliacion',label:'Domiciliación'}]} />
    </Modal>
  );
}
