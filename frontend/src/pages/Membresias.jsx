import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membresiasAPI, creditosAPI } from '../services/api';
import { Table, Btn, Badge, SearchBox, Modal, Input, Select, Textarea, FormRow, Tabs, Card, CredChip, Spinner } from '../components/ui/index.jsx';
import toast from 'react-hot-toast';

const CATS_DEFAULT = ['Membresia por defecto','Clases grupales','Clases Grupales + GYM','Entrenamientos personales','Grupo Iniciacion Calistenia','GYM','Tecnificacion'];

export default function Membresias() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('membresias');
  const [buscar, setBuscar] = useState('');
  const [catFiltro, setCatFiltro] = useState('');
  const [modal, setModal] = useState(null);
  const [seleccionada, setSeleccionada] = useState(null);

  const { data: membs = [], isLoading } = useQuery({ queryKey:['membresias'], queryFn:() => membresiasAPI.listar({}) });
  const { data: cats = [] } = useQuery({ queryKey:['categorias'], queryFn: membresiasAPI.categorias });
  const { data: tipos = [] } = useQuery({ queryKey:['creditos-tipos'], queryFn: creditosAPI.tipos });

  const crearMutation = useMutation({
    mutationFn: membresiasAPI.crear,
    onSuccess: () => { qc.invalidateQueries(['membresias']); setModal(null); toast.success('Membresía creada'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const editarMutation = useMutation({
    mutationFn: ({id, ...data}) => membresiasAPI.actualizar(id, data),
    onSuccess: () => { qc.invalidateQueries(['membresias']); setModal(null); toast.success('Membresía actualizada'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const eliminarMutation = useMutation({
    mutationFn: membresiasAPI.eliminar,
    onSuccess: () => { qc.invalidateQueries(['membresias']); setModal(null); toast.success('Membresía eliminada'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const crearCatMutation = useMutation({
    mutationFn: membresiasAPI.crearCategoria,
    onSuccess: () => { qc.invalidateQueries(['categorias']); setModal(null); toast.success('Categoría creada'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const crearTipoMutation = useMutation({
    mutationFn: creditosAPI.crearTipo,
    onSuccess: () => { qc.invalidateQueries(['creditos-tipos']); setModal(null); toast.success('Tipo de crédito creado'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const filtradas = membs.filter(m =>
    (!buscar || m.nombre.toLowerCase().includes(buscar.toLowerCase())) &&
    (!catFiltro || m.categoria_nombre === catFiltro)
  );

  const columnas = [
    { key:'nombre', label:'Nombre', width:'35%', nowrap:false },
    { key:'categoria_nombre', label:'Categoría', width:'18%', render:v => <Badge color="gray">{v || '—'}</Badge> },
    { key:'precio', label:'Precio', width:'8%', render:v => <span style={{ fontWeight:700, color:'var(--accent)' }}>{v}€</span> },
    { key:'creditos', label:'Créditos incluidos', width:'25%', render:(v) => (
      <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
        {(v || []).map((c,i) => <CredChip key={i} nombre={c.tipo_nombre} cantidad={c.cantidad} color={c.color} />)}
      </div>
    )},
    { key:'contratos_activos', label:'Activos', width:'8%', render:v => <span style={{ color:'var(--green)', fontWeight:600 }}>{v}</span> },
    { key:'id', label:'', width:'6%', render:(v,r) => (
      <div style={{ display:'flex', gap:4 }}>
        <Btn size="sm" onClick={e=>{e.stopPropagation();setSeleccionada(r);setModal('ver');}}>Ver</Btn>
      </div>
    )},
  ];

  return (
    <div>
      <Tabs
        tabs={[
          {id:'membresias', label:`Membresías (${membs.length})`},
          {id:'creditos', label:`Tipos de crédito (${tipos.length})`},
          {id:'categorias', label:`Categorías (${cats.length})`},
        ]}
        active={tab} onChange={setTab}
      />

      {tab === 'membresias' && (
        <>
          <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center' }}>
            <SearchBox value={buscar} onChange={setBuscar} placeholder="Buscar membresía..." />
            <select value={catFiltro} onChange={e=>setCatFiltro(e.target.value)}
              style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'8px 12px', color:'var(--text)', outline:'none', cursor:'pointer' }}>
              <option value="">Todas las categorías</option>
              {cats.map(c=><option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </select>
            <Btn variant="primary" onClick={() => { setSeleccionada(null); setModal('nueva'); }}>＋ Nueva membresía</Btn>
          </div>
          <Table columns={columnas} rows={filtradas} loading={isLoading} emptyText="No hay membresías" onRowClick={r=>{setSeleccionada(r);setModal('ver');}} />
        </>
      )}

      {tab === 'creditos' && (
        <>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <Btn variant="primary" onClick={()=>setModal('nuevo-tipo')}>＋ Nuevo tipo de crédito</Btn>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {tipos.map(tc => (
              <Card key={tc.id} style={{ borderTopColor:tc.color, borderTopWidth:2 }}>
                <div style={{ width:36, height:36, borderRadius:'var(--r)', background:tc.color+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, marginBottom:10 }}>
                  {tc.icono === 'basketball' ? '🏀' : tc.icono === 'users' ? '👥' : tc.icono === 'door-enter' ? '🚪' : tc.icono === 'boxing' ? '🥊' : tc.icono === 'star' ? '⭐' : tc.icono === 'barbell' ? '🏋️' : tc.icono === 'heart' ? '💚' : tc.icono === 'target' ? '🎯' : '🏷'}
                </div>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>{tc.nombre}</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:10 }}>
                  {membs.filter(m=>(m.creditos||[]).some(c=>c.tipo_credito_id===tc.id)).length} membresías lo incluyen
                </div>
                <Btn size="sm" style={{ width:'100%' }} onClick={()=>toast('Edición próximamente')}>✏️ Editar</Btn>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === 'categorias' && (
        <>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <Btn variant="primary" onClick={()=>setModal('nueva-cat')}>＋ Nueva categoría</Btn>
          </div>
          <Table
            columns={[
              {key:'nombre',label:'Nombre',width:'50%'},
              {key:'nombre',label:'Membresías',width:'25%',render:v=><span style={{color:'var(--text2)'}}>{membs.filter(m=>m.categoria_nombre===v).length}</span>},
              {key:'orden',label:'Orden',width:'15%',render:v=><Badge color="gray">{v}</Badge>},
              {key:'id',label:'',width:'10%',render:()=><Btn size="sm" onClick={()=>toast('Edición próximamente')}>✏️</Btn>},
            ]}
            rows={cats}
          />
        </>
      )}

      {/* Modal ver/editar membresía */}
      {(modal === 'ver' || modal === 'editar') && seleccionada && (
        <ModalVerMembresia
          memb={seleccionada} tipos={tipos} cats={cats}
          onClose={()=>setModal(null)}
          onEdit={(data) => editarMutation.mutate({id:seleccionada.id, ...data})}
          onDelete={() => { if(window.confirm('¿Eliminar esta membresía?')) eliminarMutation.mutate(seleccionada.id); }}
          loading={editarMutation.isPending || eliminarMutation.isPending}
        />
      )}

      {/* Modal nueva membresía */}
      {modal === 'nueva' && (
        <ModalNuevaMembresia tipos={tipos} cats={cats} onClose={()=>setModal(null)} onSave={crearMutation.mutate} loading={crearMutation.isPending} />
      )}

      {/* Modal nueva categoría */}
      {modal === 'nueva-cat' && (
        <Modal open onClose={()=>setModal(null)} title="Nueva categoría"
          footer={<><Btn onClick={()=>setModal(null)}>Cancelar</Btn><ModalCatBtn onSave={crearCatMutation.mutate} loading={crearCatMutation.isPending} /></>}>
          <ModalCatForm onSave={crearCatMutation.mutate} loading={crearCatMutation.isPending} onClose={()=>setModal(null)} />
        </Modal>
      )}

      {/* Modal nuevo tipo crédito */}
      {modal === 'nuevo-tipo' && (
        <ModalNuevoTipo onClose={()=>setModal(null)} onSave={crearTipoMutation.mutate} loading={crearTipoMutation.isPending} />
      )}
    </div>
  );
}

function ModalVerMembresia({ memb, tipos, cats, onClose, onEdit, onDelete, loading }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ nombre:memb.nombre, precio:memb.precio, duracion_cantidad:memb.duracion_cantidad, duracion_unidad:memb.duracion_unidad, descripcion:memb.descripcion||'' });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  return (
    <Modal open onClose={onClose} title={memb.nombre} size="lg"
      footer={
        <div style={{display:'flex',gap:8,width:'100%'}}>
          <Btn variant="danger" onClick={onDelete} style={{marginRight:'auto'}}>🗑 Eliminar</Btn>
          <Btn onClick={onClose}>Cerrar</Btn>
          {editando ? <Btn variant="primary" loading={loading} onClick={()=>onEdit(form)}>✓ Guardar cambios</Btn>
                    : <Btn onClick={()=>setEditando(true)}>✏️ Editar</Btn>}
        </div>
      }>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
        {[['Categoría',<Badge color="gray">{memb.categoria_nombre||'—'}</Badge>],
          ['Precio',<span style={{fontSize:20,fontWeight:700,color:'var(--accent)'}}>{memb.precio}€</span>],
          ['Socios activos',<span style={{color:'var(--green)',fontWeight:600,fontSize:18}}>{memb.contratos_activos}</span>],
          ['Duración',`${memb.duracion_cantidad} ${memb.duracion_unidad}`]
        ].map(([k,v])=>(
          <div key={k} style={{background:'var(--bg3)',borderRadius:'var(--r)',padding:'10px 12px'}}>
            <div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:3}}>{k}</div>
            <div>{v}</div>
          </div>
        ))}
      </div>

      {editando && (
        <div style={{background:'var(--bg3)',borderRadius:'var(--r)',padding:14,marginBottom:14}}>
          <Input label="Nombre" value={form.nombre} onChange={v=>set('nombre',v)} />
          <FormRow>
            <Input label="Precio (€)" type="number" value={form.precio} onChange={v=>set('precio',v)} step="0.01" />
            <Input label="Duración" type="number" value={form.duracion_cantidad} onChange={v=>set('duracion_cantidad',v)} />
          </FormRow>
          <Textarea label="Descripción" value={form.descripcion} onChange={v=>set('descripcion',v)} rows={2} />
        </div>
      )}

      <div style={{fontSize:11,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:8}}>Créditos incluidos</div>
      {(memb.creditos || []).map((c,i)=>{
        const tc = tipos.find(t=>t.id===c.tipo_credito_id);
        return (
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,background:'var(--bg3)',borderRadius:'var(--r)',padding:'10px 12px',marginBottom:6}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:c.color||tc?.color||'#888',flexShrink:0}}/>
            <div style={{flex:1,fontSize:13}}>{c.tipo_nombre||tc?.nombre}</div>
            <span style={{fontSize:18,fontWeight:700,color:c.color||tc?.color||'var(--text)'}}>{c.cantidad}</span>
            <span style={{fontSize:11,color:'var(--text3)'}}>crédito{c.cantidad!==1?'s':''} / {c.frecuencia}</span>
          </div>
        );
      })}
      {(!memb.creditos || memb.creditos.length === 0) && <div style={{color:'var(--text3)',fontSize:13}}>Sin créditos asignados</div>}
    </Modal>
  );
}

function ModalNuevaMembresia({ tipos, cats, onClose, onSave, loading }) {
  const [form, setForm] = useState({ nombre:'', categoria_id:'', precio:'', duracion_cantidad:1, duracion_unidad:'meses', descripcion:'', creditos:[] });
  const [credTipo, setCredTipo] = useState('');
  const [credCant, setCredCant] = useState(8);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const addCred = () => {
    if (!credTipo) return toast.error('Selecciona un tipo de crédito');
    const tc = tipos.find(t=>String(t.id)===credTipo);
    if (!tc) return;
    setForm(f=>({...f, creditos:[...f.creditos, {tipo_credito_id:tc.id,cantidad:parseInt(credCant),frecuencia:'mensual',tipo_nombre:tc.nombre,color:tc.color}]}));
    setCredTipo(''); setCredCant(8);
  };

  const handleSave = () => {
    if (!form.nombre || !form.precio) return toast.error('Nombre y precio son obligatorios');
    onSave({ ...form, precio:parseFloat(form.precio), categoria_id: form.categoria_id ? parseInt(form.categoria_id) : undefined, duracion_cantidad:parseInt(form.duracion_cantidad) });
  };

  return (
    <Modal open onClose={onClose} title="Nueva membresía" size="lg"
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={handleSave} loading={loading}>✓ Crear membresía</Btn></>}>
      <Input label="Nombre *" value={form.nombre} onChange={v=>set('nombre',v)} placeholder="Nombre de la membresía..." />
      <FormRow>
        <Select label="Categoría" value={form.categoria_id} onChange={v=>set('categoria_id',v)} placeholder="Sin categoría" options={cats.map(c=>({value:String(c.id),label:c.nombre}))} />
        <Input label="Precio (€) *" type="number" value={form.precio} onChange={v=>set('precio',v)} step="0.01" placeholder="0.00" />
      </FormRow>
      <FormRow>
        <Input label="Duración" type="number" value={form.duracion_cantidad} onChange={v=>set('duracion_cantidad',v)} min={1} />
        <Select label="Unidad" value={form.duracion_unidad} onChange={v=>set('duracion_unidad',v)} options={[{value:'dias',label:'Días'},{value:'semanas',label:'Semanas'},{value:'meses',label:'Meses'},{value:'anos',label:'Años'}]} />
      </FormRow>
      <Textarea label="Descripción (para el socio)" value={form.descripcion} onChange={v=>set('descripcion',v)} rows={2} placeholder="Qué incluye este plan..." />

      <div style={{fontSize:11,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:8}}>Créditos incluidos</div>
      <div style={{marginBottom:10}}>
        {form.creditos.map((c,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:8,background:'var(--bg3)',borderRadius:'var(--r)',padding:'8px 10px',marginBottom:5}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:c.color||'#888'}}/>
            <span style={{flex:1,fontSize:13}}>{c.tipo_nombre}</span>
            <strong style={{color:c.color||'var(--text)'}}>{c.cantidad}</strong>
            <span style={{fontSize:11,color:'var(--text3)'}}>/ mes</span>
            <Btn size="sm" onClick={()=>setForm(f=>({...f,creditos:f.creditos.filter((_,j)=>j!==i)}))}>×</Btn>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
        <div style={{flex:1}}>
          <Select label="Tipo de crédito" value={credTipo} onChange={setCredTipo} placeholder="Selecciona..." options={tipos.map(t=>({value:String(t.id),label:`${t.nombre}`}))} />
        </div>
        <div style={{width:90}}>
          <Input label="Cantidad" type="number" value={credCant} onChange={v=>setCredCant(parseInt(v)||1)} min={1} />
        </div>
        <Btn onClick={addCred} style={{height:38,marginBottom:14}}>＋ Añadir</Btn>
      </div>
    </Modal>
  );
}

function ModalCatForm({ onSave, loading, onClose }) {
  const [nombre, setNombre] = useState(''); const [orden, setOrden] = useState(1);
  return <><Input label="Nombre *" value={nombre} onChange={setNombre} placeholder="Nombre de la categoría..." /><Input label="Orden" type="number" value={orden} onChange={v=>setOrden(parseInt(v)||1)} /></>;
}
function ModalCatBtn({ onSave, loading }) { return null; } // integrado en el footer del modal padre

function ModalNuevoTipo({ onClose, onSave, loading }) {
  const [form, setForm] = useState({ nombre:'', color:'#1D9E75', icono:'star' });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <Modal open onClose={onClose} title="Nuevo tipo de crédito" size="sm"
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={()=>{if(!form.nombre)return toast.error('Nombre requerido');onSave(form);}} loading={loading}>✓ Crear</Btn></>}>
      <Input label="Nombre *" value={form.nombre} onChange={v=>set('nombre',v)} placeholder="Ej: Acceso Sauna..." />
      <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:14}}>
        <div><label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Color</label>
          <input type="color" value={form.color} onChange={e=>set('color',e.target.value)} style={{width:60,height:38,border:'1px solid var(--border)',borderRadius:'var(--r)',cursor:'pointer',background:'var(--bg3)',padding:2}} />
        </div>
        <Select label="Icono" value={form.icono} onChange={v=>set('icono',v)} options={[{value:'star',label:'⭐ Estrella'},{value:'door-enter',label:'🚪 Entrada'},{value:'barbell',label:'🏋️ Gym'},{value:'users',label:'👥 Grupo'},{value:'basketball',label:'🏀 Baloncesto'},{value:'boxing',label:'🥊 Boxeo'},{value:'heart',label:'💚 Salud'},{value:'target',label:'🎯 Objetivo'}]} style={{flex:1}} />
      </div>
    </Modal>
  );
}
