import { useEffect, useState } from 'react';
import { Area, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getWeeklyReports, type WeeklyReport } from '../api/client';

type TrendPoint = { label: string; net: number };

const formatWeek = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(date));

export function WeeklyTrendChart() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);

  useEffect(() => {
    let mounted = true;
    void getWeeklyReports(8).then((weeklyReports) => { if (mounted) setReports(weeklyReports); }).catch(() => { if (mounted) setReports([]); });
    return () => { mounted = false; };
  }, []);

  const data: TrendPoint[] = [...reports].reverse().map((report) => ({ label: formatWeek(report.weekStart), net: report.net }));
  return <section className="panel trend-panel">
    <div className="section-heading"><div><span className="eyebrow">WEEKLY TREND</span><h2>Net position</h2></div><span className="section-total">8 weeks</span></div>
    {data.length < 2 ? <p className="muted">Not enough history yet — check back after your first weekly report.</p> : <div className="chart-frame trend-chart" style={{ height: 240 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
      <defs><linearGradient id="weekly-trend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.15} /><stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} /></linearGradient></defs>
      <CartesianGrid vertical={false} stroke="hsl(var(--border) / .45)" strokeDasharray="3 3" />
      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 'var(--text-sm)' }} />
      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 'var(--text-sm)' }} tickFormatter={(value: number) => `${value < 0 ? '-' : ''}$${Math.abs(value) >= 1000 ? `${(Math.abs(value) / 1000).toFixed(1)}k` : Math.abs(value).toFixed(0)}`} width={56} />
      <Tooltip formatter={(value: unknown) => { const amount = Number(value ?? 0); return [`${amount < 0 ? '-' : '+'}$${Math.abs(amount).toFixed(2)}`, 'Net']; }} labelStyle={{ color: 'hsl(var(--muted-foreground))' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'hsl(var(--card-foreground))' }} />
      <Area type="monotone" dataKey="net" stroke="none" fill="url(#weekly-trend-fill)" />
      <Line type="monotone" dataKey="net" stroke="hsl(var(--foreground))" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: 'hsl(var(--foreground))' }} />
    </LineChart></ResponsiveContainer></div>}
  </section>;
}
