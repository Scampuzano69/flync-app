import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardAPI } from '../services/api';
import { MetricCard, Card, Spinner } from '../components/ui/index.jsx';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardAPI.obtener,
    refetchInterval: 30000, // refresh c/30s
  });

  if (isLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <Spinner size={32} />
    </div>
  );

  const d = data || {};
  const ingresos6m = (d.ingresos_6_meses || []).map(m => ({
    mes: m.mes || '',
    total: parseFloat(m.total || 0)
  }));

  const mesActual = parseFloat(d.ingresos?.cobrado_mes || 0);
  const mesAnterior = (ingresos6m[ingresos6m.length - 2]?.total) || 1;
  const variacion = mesAnterior ? (((mesActual - mesAnterior) / mesAnterior) * 100).toFixed(1) : 0;

  return (
    <div>
      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        <MetricCard icon="👥" label="Socios activos" value={d.socios?.activos || 0} trend={`+${d.socios?.nuevos_mes || 0} este mes`} trendUp accentColor="var(--blue)" />
        <MetricCard icon="💳" label="Ingresos mes" value={`${(mesActual).toLocaleString('es-ES')} €`} trend={`${variacion > 0 ? '+' : ''}${variacion}% vs anterior`} trendUp={variacion >= 0} accentColor="var(--green)" />
        <MetricCard icon="🚪" label="Accesos hoy" value={d.accesos_hoy?.entradas_ok || 0} trend={`${d.accesos_hoy?.socios_unicos || 0} socios únicos`} trendUp accentColor="var(--purple)" />
        <MetricCard icon="⚠️" label="Cuotas pendientes" value={d.ingresos?.facturas_pendientes || 0} trend={d.cuotas_pendientes > 0 ? 'Requieren atención' : 'Todo al día'} trendUp={!d.cuotas_pendientes} accentColor="var(--red)" />
      </div>

      {/* Gráfica + Actividad */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <Card title="Ingresos 6 meses">
          {ingresos6m.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={ingresos6m} margin={{ top:5, right:5, bottom:5, left:0 }}>
                <XAxis dataKey="mes" tick={{ fill:'var(--text3)', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text3)', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
                <Tooltip
                  contentStyle={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:12 }}
                  formatter={v => [`${v.toLocaleString('es-ES')} €`, 'Ingresos']}
                />
                <Bar dataKey="total" fill="var(--accent)" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)' }}>Sin datos de ingresos</div>}
        </Card>

        <Card title="Actividad reciente">
          <div>
            {(d.actividad_reciente || []).slice(0, 6).map((act, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{
                  width:28, height:28, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600,
                  background: act.tipo === 'acceso' ? 'rgba(34,197,94,.15)' : 'rgba(96,165,250,.15)',
                  color: act.tipo === 'acceso' ? 'var(--green)' : 'var(--blue)'
                }}>
                  {act.tipo === 'acceso' ? '🚪' : '📋'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{act.descripcion}</div>
                  <div style={{ fontSize:11, color:'var(--text2)' }}>{act.tipo === 'acceso' ? 'Acceso QR' : `Reserva → ${act.extra || ''}`}</div>
                </div>
                <div style={{ fontSize:10, color:'var(--text3)', flexShrink:0 }}>
                  {act.fecha ? format(new Date(act.fecha), 'HH:mm') : ''}
                </div>
              </div>
            ))}
            {(!d.actividad_reciente || d.actividad_reciente.length === 0) && (
              <div style={{ padding:'20px 0', textAlign:'center', color:'var(--text3)' }}>Sin actividad reciente</div>
            )}
          </div>
        </Card>
      </div>

      {/* Clases de hoy */}
      <Card title="Clases de hoy">
        {(!d.clases_hoy || d.clases_hoy.length === 0) ? (
          <div style={{ padding:'20px 0', textAlign:'center', color:'var(--text3)' }}>No hay clases programadas para hoy</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {d.clases_hoy.map((cl, i) => {
              const lleno = parseInt(cl.reservas) >= cl.aforo_maximo;
              return (
                <div key={i} style={{
                  borderLeft:`3px solid ${cl.color || '#888'}`,
                  background: (cl.color || '#888') + '18',
                  borderRadius:`0 var(--r) var(--r) 0`,
                  padding:'8px 10px', cursor:'pointer'
                }}>
                  <div style={{ fontSize:12, fontWeight:600 }}>{cl.actividad}</div>
                  <div style={{ fontSize:11, color:'var(--text2)', marginTop:1 }}>
                    {cl.fecha_inicio ? format(new Date(cl.fecha_inicio), 'HH:mm') : '?'} — {cl.sala}
                  </div>
                  <div style={{ fontSize:10, color: lleno ? 'var(--red)' : 'var(--text3)', marginTop:3 }}>
                    {cl.reservas}/{cl.aforo_maximo} plazas{lleno ? ' · LLENO' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
