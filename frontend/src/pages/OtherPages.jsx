// â”€â”€ HORARIO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clasesAPI, reservasAPI, pagosAPI, sociosAPI, membresiasAPI, notificacionesAPI, configAPI, qrAPI, accesosAPI } from '../services/api';
import { Card, Btn, Badge, Modal, Input, Select, FormRow, Spinner, Table, SearchBox, Pagination, MetricCard, Tabs, StatMini, Textarea } from '../components/ui/index.jsx';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useAuth } from '../App';

export function Horario() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [modal, setModal] = useState(null);
  const [clasesel, setClaseSel] = useState(null);

  const lunes = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), semanaOffset * 7);
  const domingo = addDays(lunes, 6);

  const { data: clases = [], isLoading } = useQuery({
    queryKey: ['clases', lunes.toISOString(), semanaOffset],
    queryFn: () => clasesAPI.listar({ desde: format(lunes,'yyyy-MM-dd'), hasta: format(domingo,'yyyy-MM-dd') }),
    staleTime: 30000,
  });

  const { data: salas = [] } = useQuery({ queryKey:['salas'], queryFn: clasesAPI.salas });
  const { data: actividades = [] } = useQuery({ queryKey:['actividades'], queryFn: clasesAPI.actividades });

  const reservarMutation = useMutation({
    mutationFn: reservasAPI.crear,
    onSuccess: () => { qc.invalidateQueries(['clases']); toast.success('Reserva confirmada'); setModal(null); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error al reservar'),
  });

  const crearMutation = useMutation({
    mutationFn: clasesAPI.crear,
    onSuccess: () => { qc.invalidateQueries(['clases']); setModal(null); toast.success('Clase creada'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const dias = Array.from({length:7}, (_,i) => addDays(lunes, i));

  return (
    <div>
      <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:6, flex:1, flexWrap:'wrap' }}>
          <Badge color="blue">Todas las salas</Badge>
          {salas.map(s=><span key={s.id} style={{ fontSize:12, padding:'3px 9px', borderRadius:20, background:s.color+'22', color:s.color, border:`1px solid ${s.color}44`, cursor:'pointer' }}>{s.nombre}</span>)}
        </div>
        <Btn onClick={() => setSemanaOffset(o => o-1)}>â† Anterior</Btn>
        <Btn onClick={() => setSemanaOffset(0)}>Hoy</Btn>
        <Btn onClick={() => setSemanaOffset(o => o+1)}>Siguiente â†’</Btn>
        {isAdmin && <Btn variant="primary" onClick={() => setModal('nueva')}>ï¼‹ Nueva clase</Btn>}
      </div>

      {isLoading ? <div style={{display:'flex',justifyContent:'center',paddingTop:40}}><Spinner size={28}/></div> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8 }}>
          {dias.map(dia => {
            const clasesDelDia = clases.filter(cl => isSameDay(new Date(cl.fecha_inicio), dia));
            const esHoy = isSameDay(dia, new Date());
            return (
              <div key={dia.toISOString()} style={{ background:'var(--bg2)', border:`1px solid ${esHoy ? 'var(--accent)' : 'var(--border)'}`, borderRadius:'var(--rl)', overflow:'hidden', minHeight:80 }}>
                <div style={{ background: esHoy ? 'rgba(249,115,22,.12)' : 'var(--bg3)', padding:'8px', textAlign:'center', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ fontSize:10, fontWeight:600, color: esHoy ? 'var(--accent)' : 'var(--text3)', textTransform:'uppercase', letterSpacing:'.08em' }}>
                    {format(dia,'EEE',{locale:es})}
                  </div>
                  <div style={{ fontSize:17, fontWeight:600, color: esHoy ? 'var(--accent)' : 'var(--text)' }}>{format(dia,'d')}</div>
                </div>
                <div style={{ padding:4 }}>
                  {clasesDelDia.map(cl => {
                    const ll = parseInt(cl.reservas) >= cl.aforo_maximo;
                    return (
                      <div key={cl.id}
                        onClick={() => { setClaseSel(cl); setModal('ver-clase'); }}
                        style={{ margin:'4px 0', padding:'7px 8px', borderLeft:`3px solid ${cl.actividad_color || cl.sala_color || '#888'}`, background:`${cl.actividad_color || '#888'}18`, borderRadius:`0 6px 6px 0`, cursor:'pointer', transition:'opacity .15s' }}
                        onMouseEnter={e=>e.currentTarget.style.opacity='.75'}
                        onMouseLeave={e=>e.currentTarget.style.opacity='1'}
                      >
                        <div style={{ fontSize:11, fontWeight:600, color:'var(--text)' }}>{cl.actividad}</div>
                        <div style={{ fontSize:10, color:'var(--text2)', marginTop:1 }}>{cl.fecha_inicio ? format(new Date(cl.fecha_inicio),'HH:mm') : '?'}h</div>
                        <div style={{ fontSize:10, color: ll ? 'var(--red)' : 'var(--text3)' }}>
                          {cl.reservas}/{cl.aforo_maximo}{ll ? ' LLENO' : ''}
                        </div>
                        {cl.yo_reservado && <div style={{ fontSize:9, color:'var(--green)', fontWeight:600, marginTop:1 }}>âœ“ Reservado</div>}
                      </div>
                    );
                  })}
                  {clasesDelDia.length === 0 && (
                    <div style={{ padding:'10px 6px', textAlign:'center', fontSize:11, color:'var(--text3)' }}>Sin clases</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ver clase */}
      {modal === 'ver-clase' && clasesel && (
        <Modal open onClose={() => setModal(null)} title={clasesel.actividad}
          footer={<>
            <Btn onClick={() => setModal(null)}>Cerrar</Btn>
            {!clasesel.yo_reservado && parseInt(clasesel.reservas) < clasesel.aforo_maximo && (
              <Btn variant="primary" loading={reservarMutation.isPending} onClick={() => reservarMutation.mutate(clasesel.id)}>Reservar plaza</Btn>
            )}
          </>}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
            {[
              ['Sala', clasesel.sala],
              ['Horario', `${format(new Date(clasesel.fecha_inicio),'HH:mm')} â€” ${format(new Date(clasesel.fecha_fin),'HH:mm')}`],
              ['Entrenador', clasesel.entrenador || 'â€”'],
              ['Plazas', `${clasesel.reservas}/${clasesel.aforo_maximo} ocupadas`],
            ].map(([k,v]) => (
              <div key={k} style={{ background:'var(--bg3)', borderRadius:'var(--r)', padding:'9px 11px' }}>
                <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>{k}</div>
                <div style={{ fontSize:13 }}>{v}</div>
              </div>
            ))}
          </div>
          {clasesel.yo_reservado && <div style={{ padding:10, background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.2)', borderRadius:'var(--r)', fontSize:13, color:'var(--green)' }}>âœ“ Ya tienes una plaza reservada</div>}
          {parseInt(clasesel.reservas) >= clasesel.aforo_maximo && !clasesel.yo_reservado && <div style={{ padding:10, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', borderRadius:'var(--r)', fontSize:13, color:'var(--red)' }}>Clase llena â€” puedes unirte a la lista de espera</div>}
        </Modal>
      )}

      {/* Nueva clase */}
      {modal === 'nueva' && (
        <ModalNuevaClase salas={salas} actividades={actividades} onClose={() => setModal(null)} onSave={crearMutation.mutate} loading={crearMutation.isPending} />
      )}
    </div>
  );
}

function ModalNuevaClase({ salas, actividades, onClose, onSave, loading }) {
  const [form, setForm] = useState({ sala_id:'', tipo_actividad_id:'', fecha_inicio:'', fecha_fin:'', aforo_maximo:8, recurrente:false, recurrencia_dias:[], recurrencia_fin:'' });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const diasSemana = ['Lun','Mar','MiÃ©','Jue','Vie','SÃ¡b','Dom'];

  const handleSave = () => {
    if (!form.sala_id || !form.tipo_actividad_id || !form.fecha_inicio) return toast.error('Sala, actividad y fecha son obligatorios');
    const fi = new Date(form.fecha_inicio);
    const ff = form.fecha_fin ? new Date(form.fecha_fin) : new Date(fi.getTime() + 3600000);
    onSave({ ...form, sala_id:parseInt(form.sala_id), tipo_actividad_id:parseInt(form.tipo_actividad_id), fecha_inicio:fi.toISOString(), fecha_fin:ff.toISOString(), aforo_maximo:parseInt(form.aforo_maximo) });
  };

  return (
    <Modal open onClose={onClose} title="Nueva clase" size="md"
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={handleSave} loading={loading}>âœ“ Crear clase</Btn></>}>
      <Select label="Actividad *" value={form.tipo_actividad_id} onChange={v=>set('tipo_actividad_id',v)} placeholder="Selecciona..." options={actividades.map(a=>({value:String(a.id),label:a.nombre}))} />
      <Select label="Sala *" value={form.sala_id} onChange={v=>set('sala_id',v)} placeholder="Selecciona..." options={salas.map(s=>({value:String(s.id),label:s.nombre}))} />
      <FormRow>
        <Input label="Inicio *" type="datetime-local" value={form.fecha_inicio} onChange={v=>set('fecha_inicio',v)} />
        <Input label="Fin" type="datetime-local" value={form.fecha_fin} onChange={v=>set('fecha_fin',v)} />
      </FormRow>
      <Input label="Aforo mÃ¡ximo" type="number" value={form.aforo_maximo} onChange={v=>set('aforo_maximo',v)} min={1} />
      <div style={{ marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
        <input type="checkbox" id="rec" checked={form.recurrente} onChange={e=>set('recurrente',e.target.checked)} style={{ width:16, height:16, accentColor:'var(--accent)', cursor:'pointer' }} />
        <label htmlFor="rec" style={{ cursor:'pointer', fontSize:13 }}>Clase recurrente semanal</label>
      </div>
      {form.recurrente && (
        <>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>DÃ­as de la semana</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {diasSemana.map((d,i) => {
                const dow = i === 6 ? 0 : i + 1;
                const selected = form.recurrencia_dias.includes(dow);
                return (
                  <button key={i} type="button" onClick={() => set('recurrencia_dias', selected ? form.recurrencia_dias.filter(x=>x!==dow) : [...form.recurrencia_dias, dow])}
                    style={{ padding:'6px 12px', borderRadius:'var(--r)', border:'1px solid var(--border)', background: selected ? 'var(--accent-bg)' : 'transparent', color: selected ? 'var(--accent)' : 'var(--text2)', cursor:'pointer', fontSize:12 }}>{d}</button>
                );
              })}
            </div>
          </div>
          <Input label="Repetir hasta" type="date" value={form.recurrencia_fin} onChange={v=>set('recurrencia_fin',v)} />
        </>
      )}
    </Modal>
  );
}

// â”€â”€ ACCESO QR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function AccesoQR() {
  const qc = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [qrSocio, setQrSocio] = useState(null);
  const [qrBuscar, setQrBuscar] = useState('');

  const { data: datosDia } = useQuery({
    queryKey: ['accesos-hoy'], queryFn: () => import('../services/api').then(m => m.accesosAPI.hoy()),
    refetchInterval: 10000,
  });

  const simularScan = () => {
    setScanning(true);
    setTimeout(() => {
      setLastResult({ ok: true, socio: 'MarÃ­a GarcÃ­a (simulaciÃ³n)', mensaje: 'Acceso permitido' });
      setScanning(false);
    }, 1500);
  };

  const { data: todosAccesos = [] } = useQuery({
    queryKey: ['accesos-lista-hoy'],
    queryFn: async () => { const m = await import('../services/api'); return m.accesosAPI.listar({ fecha: format(new Date(),'yyyy-MM-dd'), limite:30 }); },
    refetchInterval: 10000,
  });

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--rl)', padding:12, textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:600, color:'var(--green)' }}>{datosDia?.stats?.entradas_ok || 0}</div>
          <div style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>Entradas hoy</div>
        </div>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--rl)', padding:12, textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:600, color:'var(--red)' }}>{datosDia?.stats?.denegados || 0}</div>
          <div style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>Denegados</div>
        </div>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--rl)', padding:12, textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:600, color:'var(--blue)' }}>{datosDia?.stats?.socios_unicos || 0}</div>
          <div style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>Socios Ãºnicos</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:14 }}>
        {/* QR del socio */}
        <Card title="QR del socio" style={{ textAlign:'center' }}>
          <div style={{ width:120, height:120, background:'white', borderRadius:'var(--r)', margin:'0 auto 12px', display:'flex', alignItems:'center', justifyContent:'center', padding:8 }}>
            <svg width="104" height="104" viewBox="0 0 21 21">
              <rect x="0" y="0" width="7" height="7" fill="none" stroke="#111" strokeWidth=".7"/>
              <rect x="2" y="2" width="3" height="3" fill="#111"/>
              <rect x="14" y="0" width="7" height="7" fill="none" stroke="#111" strokeWidth=".7"/>
              <rect x="16" y="2" width="3" height="3" fill="#111"/>
              <rect x="0" y="14" width="7" height="7" fill="none" stroke="#111" strokeWidth=".7"/>
              <rect x="2" y="16" width="3" height="3" fill="#111"/>
            </svg>
          </div>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:4 }}>Terminal Entrada</div>
          <Badge color="green">â— Activo</Badge>
        </Card>

        {/* EscÃ¡ner */}
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.08em' }}>EscÃ¡ner de acceso</div>
            <Badge color="green">â— En vivo</Badge>
          </div>

          <div
            onClick={simularScan}
            style={{
              width:'100%', height:120, border:`2px dashed ${scanning ? 'var(--accent)' : 'var(--border2)'}`,
              borderRadius:'var(--rl)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              gap:8, cursor:'pointer', marginBottom:12, transition:'all .2s',
              background: scanning ? 'rgba(249,115,22,.05)' : lastResult?.ok ? 'rgba(34,197,94,.05)' : 'transparent'
            }}
          >
            {scanning ? (
              <><Spinner size={28} /><div style={{ fontSize:13, color:'var(--accent)' }}>Verificando QR...</div></>
            ) : lastResult ? (
              <>
                <div style={{ fontSize:34, color: lastResult.ok ? 'var(--green)' : 'var(--red)' }}>{lastResult.ok ? 'âœ“' : 'âœ—'}</div>
                <div style={{ fontSize:14, fontWeight:600, color: lastResult.ok ? 'var(--green)' : 'var(--red)' }}>{lastResult.socio}</div>
                <div style={{ fontSize:12, color:'var(--text2)' }}>{lastResult.mensaje}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize:36, color:'var(--text3)' }}>â¬›</div>
                <div style={{ fontSize:13, color:'var(--text2)' }}>Pulsa para simular escaneo</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>El hardware iMCÂ² envÃ­a QRs a POST /api/accesos/validar</div>
              </>
            )}
          </div>

          {/* Log de accesos */}
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>Ãšltimas entradas</div>
          {todosAccesos.length === 0 ? <div style={{ color:'var(--text3)', fontSize:13, padding:'10px 0' }}>Sin accesos hoy</div> :
            todosAccesos.slice(0,8).map((a,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background: a.resultado==='ok'?'var(--green)':a.resultado==='sin_creditos'?'var(--yellow)':'var(--red)', flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{a.socio_nombre || 'Desconocido'}</div>
                  <div style={{ fontSize:11, color:'var(--text2)' }}>{a.credito_tipo || 'â€”'}</div>
                </div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>{a.timestamp ? format(new Date(a.timestamp),'HH:mm') : ''}</div>
                <Badge color={a.resultado==='ok'?'green':a.resultado==='sin_creditos'?'yellow':'red'}>
                  {a.resultado==='ok'?'âœ“ OK':a.resultado==='sin_creditos'?'Sin crÃ©d.':'Denegado'}
                </Badge>
              </div>
            ))
          }
        </Card>
      </div>
    </div>
  );
}

// â”€â”€ PAGOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function Pagos() {
  const qc = useQueryClient();
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('');
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
    
  const { data, isLoading } = useQuery({
    queryKey: ['pagos', buscar, estado, pagina],
    queryFn: () => pagosAPI.listar({ pagina, limite: 20 }),
    keepPreviousData: true,
  });

  const { data: resumen } = useQuery({ queryKey:['pagos-resumen'], queryFn: pagosAPI.resumen });

  const crearMutation = useMutation({
    mutationFn: pagosAPI.crear,
    onSuccess: () => { qc.invalidateQueries(['pagos']); qc.invalidateQueries(['pagos-resumen']); setModal(null); toast.success('Pago registrado'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const { data: socios = [] } = useQuery({ queryKey:['socios-select'], queryFn:() => sociosAPI.listar({limite:200}) });
  const { data: membs = [] } = useQuery({ queryKey:['membresias-select'], queryFn:() => membresiasAPI.listar({}) });

  const pagos = (data?.pagos || []).filter(p =>
    (!buscar || `${p.socio_nombre} ${p.concepto} ${p.numero_factura}`.toLowerCase().includes(buscar.toLowerCase())) &&
    (!estado || p.estado === estado)
  );

  const columnas = [
    { key:'socio_nombre', label:'Socio', width:'20%' },
    { key:'concepto', label:'Concepto', width:'28%', nowrap:false, render:v=><span style={{fontSize:12,color:'var(--text2)'}}>{v}</span> },
    { key:'importe_total', label:'Total', width:'9%', render:v=><span style={{fontWeight:700,color:'var(--accent)'}}>{parseFloat(v||0).toFixed(2)}â‚¬</span> },
    { key:'metodo_pago', label:'MÃ©todo', width:'10%', render:v=><Badge color="gray">{v||'â€”'}</Badge> },
    { key:'estado', label:'Estado', width:'11%', render:v=><Badge color={v==='pagado'?'green':v==='pendiente'?'yellow':'red'}>{v==='pagado'?'âœ“ Cobrado':v==='pendiente'?'Pendiente':'Impago'}</Badge> },
    { key:'fecha_emision', label:'Fecha', width:'10%', render:v=>v?new Date(v).toLocaleDateString('es-ES'):'â€”' },
    { key:'numero_factura', label:'Factura', width:'12%', render:v=><span style={{fontFamily:'monospace',fontSize:11,color:'var(--text3)'}}>{v||'â€”'}</span> },
  ];

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        <MetricCard icon="âœ…" label="Cobrado mes" value={`${parseFloat(resumen?.cobrado_mes||0).toLocaleString('es-ES')}â‚¬`} accentColor="var(--green)" />
        <MetricCard icon="â³" label="Pendiente" value={`${parseFloat(resumen?.pendiente||0).toFixed(0)}â‚¬`} accentColor="var(--yellow)" />
        <MetricCard icon="âŒ" label="Impagos" value={resumen?.facturas_pendientes||0} accentColor="var(--red)" />
        <MetricCard icon="ðŸ§¾" label="Facturas mes" value={resumen?.facturas_mes||0} accentColor="var(--blue)" />
      </div>
      <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center' }}>
        <SearchBox value={buscar} onChange={v=>{setBuscar(v);setPagina(1);}} placeholder="Buscar socio, concepto, factura..." />
        <select value={estado} onChange={e=>{setEstado(e.target.value);setPagina(1);}}
          style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'8px 12px', color:'var(--text)', outline:'none', cursor:'pointer' }}>
          <option value="">Todos los estados</option>
          <option value="pagado">Pagados</option>
          <option value="pendiente">Pendientes</option>
          <option value="impago">Impagos</option>
        </select>
        <Btn onClick={()=>toast('Exportando CSV...')}>â†“ Exportar CSV</Btn>
        <Btn variant="primary" onClick={()=>setModal('nuevo')}>ï¼‹ Registrar pago</Btn>
      </div>
      <Table columns={columnas} rows={pagos} loading={isLoading} />
      <Pagination page={pagina} total={data?.total||0} limit={20} onChange={setPagina} />

      {modal === 'nuevo' && (
        <ModalNuevoPago onClose={()=>setModal(null)} onSave={crearMutation.mutate} loading={crearMutation.isPending} socios={socios?.socios||[]} membs={membs} />
      )}
    </div>
  );
}

function ModalNuevoPago({ onClose, onSave, loading, socios, membs }) {
  const [form, setForm] = useState({ usuario_id:'', concepto:'', importe_base:'', metodo_pago:'efectivo', notas:'' });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const iva = parseFloat(form.importe_base||0) * 0.21;
  const total = parseFloat(form.importe_base||0) + iva;

  return (
    <Modal open onClose={onClose} title="Registrar pago" size="md"
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={()=>{if(!form.usuario_id||!form.concepto||!form.importe_base)return toast.error('Rellena los campos obligatorios');onSave({...form,importe_base:parseFloat(form.importe_base)});}} loading={loading}>âœ“ Registrar</Btn></>}>
      <Select label="Socio *" value={form.usuario_id} onChange={v=>set('usuario_id',v)} placeholder="Selecciona socio..." options={socios.map(s=>({value:s.id,label:`${s.nombre} ${s.apellidos||''}`}))} />
      <Select label="Concepto *" value={form.concepto} onChange={v=>{set('concepto',v);const m=membs.find(mm=>mm.nombre===v);if(m)set('importe_base',String(m.precio));}} placeholder="Selecciona o escribe..." options={membs.map(m=>({value:m.nombre,label:`${m.nombre} â€” ${m.precio}â‚¬`}))} />
      <Input label="Importe base (â‚¬) *" type="number" value={form.importe_base} onChange={v=>set('importe_base',v)} step="0.01" placeholder="0.00" />
      <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:12, marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:13 }}>
          <span style={{ color:'var(--text2)' }}>Base</span><span>{parseFloat(form.importe_base||0).toFixed(2)} â‚¬</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:13 }}>
          <span style={{ color:'var(--text2)' }}>IVA (21%)</span><span>{iva.toFixed(2)} â‚¬</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid var(--border)', paddingTop:8, fontWeight:600 }}>
          <span>Total</span><span style={{ color:'var(--accent)' }}>{total.toFixed(2)} â‚¬</span>
        </div>
      </div>
      <Select label="MÃ©todo de pago" value={form.metodo_pago} onChange={v=>set('metodo_pago',v)} options={[{value:'efectivo',label:'Efectivo'},{value:'tarjeta',label:'Tarjeta/Stripe'},{value:'transferencia',label:'Transferencia'},{value:'domiciliacion',label:'DomiciliaciÃ³n'}]} />
      <Textarea label="Notas" value={form.notas} onChange={v=>set('notas',v)} rows={2} />
    </Modal>
  );
}

// â”€â”€ NOTIFICACIONES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function Notificaciones() {
  const qc = useQueryClient();
  const [canal, setCanal] = useState('push');
  const [form, setForm] = useState({ titulo:'', mensaje:'', destinatarios_tipo:'todos' });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const { data: hist = [] } = useQuery({ queryKey:['notificaciones'], queryFn:async()=>{const m=await import('../services/api');return m.notificacionesAPI.listar();} });

  const enviarMutation = useMutation({
    mutationFn: async(data)=>{const m=await import('../services/api');return m.notificacionesAPI.enviar(data);},
    onSuccess: () => { qc.invalidateQueries(['notificaciones']); setForm({titulo:'',mensaje:'',destinatarios_tipo:'todos'}); toast.success('NotificaciÃ³n enviada'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      <Card title="Nueva campaÃ±a">
        <Select label="Destinatarios" value={form.destinatarios_tipo} onChange={v=>set('destinatarios_tipo',v)}
          options={[{value:'todos',label:'Todos los socios'},{value:'activos',label:'Solo activos'},{value:'clases',label:'Plan Clases Grupales'},{value:'gym',label:'Plan GYM'},{value:'deuda',label:'Con deuda'}]} />
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>Canal</div>
          <div style={{ display:'flex', gap:8 }}>
            {['push','email','sms'].map(c => (
              <button key={c} onClick={()=>setCanal(c)} style={{ flex:1, padding:'7px 0', borderRadius:'var(--r)', border:'1px solid var(--border)', background: canal===c ? 'var(--accent)' : 'transparent', color: canal===c ? '#fff' : 'var(--text2)', cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:500 }}>
                {c==='push'?'ðŸ”” Push':c==='email'?'ðŸ“§ Email':'ðŸ’¬ SMS'}
              </button>
            ))}
          </div>
        </div>
        <Input label="TÃ­tulo *" value={form.titulo} onChange={v=>set('titulo',v)} placeholder="Asunto del mensaje..." />
        <Textarea label="Mensaje *" value={form.mensaje} onChange={v=>set('mensaje',v)} placeholder="Escribe el mensaje aquÃ­..." rows={4} />
        <Btn variant="primary" style={{ width:'100%' }} loading={enviarMutation.isPending}
          onClick={() => { if(!form.titulo||!form.mensaje)return toast.error('TÃ­tulo y mensaje son obligatorios'); enviarMutation.mutate({...form, tipo:canal}); }}>
          ðŸ“¤ Enviar ahora
        </Btn>
      </Card>

      <Card title="Historial de envÃ­os">
        {hist.length === 0 ? <div style={{ color:'var(--text3)', textAlign:'center', padding:20 }}>Sin envÃ­os realizados</div> :
          hist.slice(0,8).map((n,i) => (
            <div key={i} style={{ background:'var(--bg3)', borderRadius:'var(--r)', padding:12, marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{n.titulo}</div>
                <Badge color="blue" style={{ marginLeft:8, flexShrink:0 }}>{n.tipo}</Badge>
              </div>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>
                {n.fecha_envio ? format(new Date(n.fecha_envio),'dd/MM/yyyy HH:mm') : 'Programada'} Â· {n.destinatarios_tipo}
              </div>
              {n.total_enviados > 0 && (
                <div style={{ display:'flex', gap:12 }}>
                  <span style={{ fontSize:11, color:'var(--text2)' }}>â†‘ {n.total_enviados} enviados</span>
                  {n.total_abiertos > 0 && <span style={{ fontSize:11, color:'var(--green)' }}>âœ“ {n.total_abiertos} ({Math.round(n.total_abiertos/n.total_enviados*100)}%)</span>}
                </div>
              )}
            </div>
          ))
        }
      </Card>
    </div>
  );
}

// â”€â”€ CONFIGURACIÃ“N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function Configuracion() {
  const qc = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: async () => { const m = await import('../services/api'); return m.configAPI.obtener(); }
  });
  const [form, setForm] = useState({});
  const [tab, setTab] = useState('negocio');
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  React.useEffect(() => {
    if (config?.negocio) setForm(config.negocio);
  }, [config]);

  const guardarMutation = useMutation({
    mutationFn: async(data) => { const m = await import('../services/api'); return m.configAPI.actualizar(data); },
    onSuccess: () => { qc.invalidateQueries(['config']); toast.success('ConfiguraciÃ³n guardada'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const stripeM = useMutation({
    mutationFn: async(data) => { const m = await import('../services/api'); return m.configAPI.stripe(data); },
    onSuccess: () => toast.success('Stripe guardado'),
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const imc2M = useMutation({
    mutationFn: async(data) => { const m = await import('../services/api'); return m.configAPI.imc2(data); },
    onSuccess: () => toast.success('iMCÂ² guardado'),
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  if (isLoading) return <div style={{display:'flex',justifyContent:'center',paddingTop:40}}><Spinner size={28}/></div>;

  return (
    <div>
      <Tabs tabs={[{id:'negocio',label:'Negocio'},{id:'integraciones',label:'iMCÂ² + Stripe'},{id:'horario',label:'Horario apertura'},{id:'salas',label:'Salas y actividades'}]} active={tab} onChange={setTab} />

      {tab === 'negocio' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <Card title="InformaciÃ³n del negocio">
            <Input label="Nombre empresa" value={form.nombre||''} onChange={v=>set('nombre',v)} />
            <Input label="Nombre legal" value={form.nombre_legal||''} onChange={v=>set('nombre_legal',v)} />
            <Input label="DescripciÃ³n" value={form.descripcion||''} onChange={v=>set('descripcion',v)} />
            <FormRow>
              <Input label="DirecciÃ³n" value={form.calle||''} onChange={v=>set('calle',v)} />
              <Input label="CÃ³digo postal" value={form.codigo_postal||''} onChange={v=>set('codigo_postal',v)} />
            </FormRow>
            <FormRow>
              <Input label="TelÃ©fono" value={form.telefono||''} onChange={v=>set('telefono',v)} />
              <Input label="IVA (%)" type="number" value={form.iva_defecto||21} onChange={v=>set('iva_defecto',parseFloat(v))} />
            </FormRow>
            <Input label="Email" type="email" value={form.email||''} onChange={v=>set('email',v)} />
            <Btn variant="primary" style={{ width:'100%' }} loading={guardarMutation.isPending} onClick={()=>guardarMutation.mutate(form)}>ðŸ’¾ Guardar cambios</Btn>
          </Card>
          <Card title="Datos bancarios">
            <Input label="Titular cuenta" value={form.titular_cuenta||''} onChange={v=>set('titular_cuenta',v)} readOnly />
            <Input label="IBAN" value={form.iban||''} onChange={v=>set('iban',v)} readOnly />
            <Input label="BIC" value={form.bic||''} onChange={v=>set('bic',v)} readOnly />
            <div style={{ background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.2)', borderRadius:'var(--r)', padding:12, fontSize:12, color:'var(--yellow)' }}>
              Los datos bancarios se usan para domiciliaciones SEPA. ModifÃ­calos con cuidado.
            </div>
          </Card>
        </div>
      )}

      {tab === 'integraciones' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <Card title="iMCÂ² TSimplifica (Control de acceso)">
            <div style={{ background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)', borderRadius:'var(--r)', padding:10, marginBottom:12, fontSize:12, color:'var(--green)' }}>
              â— Terminal "Entrada" â€” {config?.negocio?.imc2_api_key ? 'API Key configurada' : 'Sin configurar'}
            </div>
            <Input label="API Key iMCÂ²" type="password" value={form.imc2_api_key||''} onChange={v=>set('imc2_api_key',v)} placeholder="Tu API key de iMCÂ²..." />
            <Input label="URL Base API" value={form.imc2_base_url||'https://api.imc2simplifica.com'} onChange={v=>set('imc2_base_url',v)} />
            <Input label="Device ID terminal" value={form.imc2_device_id||''} onChange={v=>set('imc2_device_id',v)} placeholder="ID del terminal de entrada..." />
            <Btn variant="primary" style={{ width:'100%' }} loading={imc2M.isPending} onClick={()=>imc2M.mutate({imc2_api_key:form.imc2_api_key,imc2_base_url:form.imc2_base_url,imc2_device_id:form.imc2_device_id})}>Guardar integraciÃ³n iMCÂ²</Btn>
          </Card>
          <Card title="Stripe (Pagos online)">
            <Input label="Stripe Secret Key" type="password" value={form.stripe_secret_key||''} onChange={v=>set('stripe_secret_key',v)} placeholder="sk_live_..." />
            <Input label="Stripe Publishable Key" value={form.stripe_publishable_key||''} onChange={v=>set('stripe_publishable_key',v)} placeholder="pk_live_..." />
            <Input label="Stripe Webhook Secret" type="password" value={form.stripe_webhook_secret||''} onChange={v=>set('stripe_webhook_secret',v)} placeholder="whsec_..." />
            <Btn variant="primary" style={{ width:'100%' }} loading={stripeM.isPending} onClick={()=>stripeM.mutate({stripe_secret_key:form.stripe_secret_key,stripe_publishable_key:form.stripe_publishable_key,stripe_webhook_secret:form.stripe_webhook_secret})}>Guardar configuraciÃ³n Stripe</Btn>
          </Card>
        </div>
      )}

      {tab === 'horario' && (
        <Card title="Horario de apertura">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8 }}>
            {['Lunes','Martes','MiÃ©rcoles','Jueves','Viernes','SÃ¡bado','Domingo'].map((d,i) => (
              <div key={i} style={{ background:'var(--bg3)', borderRadius:'var(--r)', padding:'10px 8px', textAlign:'center' }}>
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>{d.slice(0,3)}</div>
                <Badge color="green">24h</Badge>
              </div>
            ))}
          </div>
          <div style={{ marginTop:12, fontSize:12, color:'var(--text3)' }}>FLY NC estÃ¡ abierto 24h todos los dÃ­as gracias al sistema iMCÂ².</div>
        </Card>
      )}

      {tab === 'salas' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <Card title="Salas configuradas">
            {(config?.salas||[]).map(s => (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:s.color, flexShrink:0 }} />
                <div style={{ flex:1, fontSize:13 }}>{s.nombre}</div>
                <span style={{ fontSize:12, color:'var(--text3)' }}>aforo: {s.aforo_maximo}</span>
                <Btn size="sm" onClick={()=>toast('EdiciÃ³n prÃ³ximamente')}>âœï¸</Btn>
              </div>
            ))}
          </Card>
          <Card title="Tipos de actividad">
            <div style={{ maxHeight:300, overflowY:'auto' }}>
              {(config?.tipos_actividad||[]).map(a => (
                <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:a.color||'#888', flexShrink:0 }} />
                  <div style={{ flex:1, fontSize:13 }}>{a.nombre}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// â”€â”€ MI QR (vista socio) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function MiQR() {
  const { user } = useAuth();
  const [qrData, setQrData] = useState(null);
  const [segundos, setSegundos] = useState(90);
  const [loading, setLoading] = useState(false);

  const generarQR = async () => {
    setLoading(true);
    try {
      const { qrAPI } = await import('../services/api');
      const data = await qrAPI.generar();
      setQrData(data);
      setSegundos(90);
    } catch (e) {
      toast.error('Error generando QR');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { generarQR(); }, []);

  React.useEffect(() => {
    if (!qrData) return;
    const t = setInterval(() => {
      setSegundos(s => {
        if (s <= 1) { generarQR(); return 90; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [qrData]);

  return (
    <div style={{ maxWidth:380, margin:'0 auto', textAlign:'center' }}>
      <Card>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:18, fontWeight:600, marginBottom:4 }}>Tu cÃ³digo QR de acceso</div>
          <div style={{ fontSize:13, color:'var(--text2)' }}>MuÃ©stralo en la entrada del gimnasio</div>
        </div>

        <div style={{ width:240, height:240, background:'white', borderRadius:'var(--rl)', margin:'0 auto 16px', display:'flex', alignItems:'center', justifyContent:'center', padding:12 }}>
          {loading ? <Spinner size={40} /> :
            qrData?.qr_image ? <img src={qrData.qr_image} alt="QR" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
            : <div style={{ color:'#888' }}>Generando QR...</div>
          }
        </div>

        <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>{user?.nombre} {user?.apellidos}</div>
        <div style={{ fontSize:12, color:'var(--text3)', marginBottom:12, fontFamily:'monospace' }}>ID: {user?.id?.slice(0,8)}...</div>

        {/* Barra de expiraciÃ³n */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontSize:11, color:'var(--text3)' }}>VÃ¡lido por</span>
            <span style={{ fontSize:11, color: segundos < 20 ? 'var(--red)' : 'var(--green)', fontWeight:600 }}>{segundos}s</span>
          </div>
          <div style={{ height:4, background:'var(--bg3)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${(segundos/90)*100}%`, background: segundos < 20 ? 'var(--red)' : 'var(--green)', borderRadius:2, transition:'width 1s linear' }} />
          </div>
        </div>

        <Btn variant="primary" style={{ width:'100%' }} onClick={generarQR} loading={loading}>â†» Generar nuevo QR</Btn>
        <div style={{ marginTop:12, fontSize:11, color:'var(--text3)' }}>El QR se renueva automÃ¡ticamente cada 90 segundos por seguridad</div>
      </Card>
    </div>
  );
}

// â”€â”€ MIS RESERVAS (vista socio) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function MisReservas() {
  const qc = useQueryClient();
  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ['mis-reservas'],
    queryFn: async () => { const m = await import('../services/api'); return m.reservasAPI.misReservas(); }
  });

  const cancelarMutation = useMutation({
    mutationFn: async(id) => { const m = await import('../services/api'); return m.reservasAPI.cancelar(id); },
    onSuccess: () => { qc.invalidateQueries(['mis-reservas']); toast.success('Reserva cancelada'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  return (
    <div>
      {isLoading ? <div style={{display:'flex',justifyContent:'center',paddingTop:40}}><Spinner size={28}/></div> :
        reservas.length === 0 ? (
          <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>ðŸ“‹</div>
            <div style={{ fontSize:16, marginBottom:6 }}>No tienes reservas prÃ³ximas</div>
            <div style={{ fontSize:13 }}>Ve al horario para reservar una clase</div>
          </div>
        ) : reservas.map(r => (
          <div key={r.id} style={{ background:'var(--bg2)', border:`1px solid ${r.color||'var(--border)'}44`, borderLeft:`3px solid ${r.color||'var(--accent)'}`, borderRadius:'var(--r)', padding:14, marginBottom:8, display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600 }}>{r.actividad}</div>
              <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>
                {r.sala} Â· {r.fecha_inicio ? format(new Date(r.fecha_inicio),'EEEE d MMM Â· HH:mm',{locale:es}) : '?'}
                {r.entrenador ? ` Â· ${r.entrenador}` : ''}
              </div>
            </div>
            <Badge color="green">Confirmada</Badge>
            <Btn size="sm" variant="danger" onClick={() => { if(window.confirm('Â¿Cancelar reserva?')) cancelarMutation.mutate(r.id); }}>Cancelar</Btn>
          </div>
        ))
      }
    </div>
  );
}

