import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Props = { categories: { category: string; amount: number }[] };

export function CategoryBreakdown({ categories }: Props) {
  const total = categories.reduce((sum, item) => sum + item.amount, 0);
  const maxAmount = Math.max(...categories.map((item) => item.amount), 0);
  return <section className="panel breakdown-panel">
    <div className="section-heading"><div><span className="eyebrow">THIS MONTH</span><h2>Where it goes</h2></div><span className="section-total">${total.toFixed(2)}</span></div>
    {categories.length === 0 ? <p className="muted">No expenses logged this month.</p> : <div className="chart-frame category-chart" style={{ height: 240 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={categories} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
      <XAxis type="number" domain={[0, maxAmount || 1]} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 'var(--text-sm)' }} tickFormatter={(value: number) => `$${value}`} />
      <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} width={88} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 'var(--text-sm)' }} />
      <Tooltip cursor={{ fill: 'transparent' }} formatter={(value: unknown) => { const amount = Number(value ?? 0); return [`$${amount.toFixed(2)}`, 'Spent']; }} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'hsl(var(--card-foreground))' }} labelStyle={{ color: 'hsl(var(--muted-foreground))' }} />
      <Bar dataKey="amount" fill="hsl(var(--foreground))" stroke="hsl(var(--foreground))" strokeWidth={3} radius={[0, 6, 6, 0]} barSize={36}>
        <LabelList dataKey="amount" position="insideRight" formatter={(value: unknown) => `$${Number(value ?? 0).toFixed(2)}`} fill="hsl(var(--primary-foreground))" fontSize="var(--text-sm)" />
      </Bar>
    </BarChart></ResponsiveContainer></div>}
  </section>;
}
