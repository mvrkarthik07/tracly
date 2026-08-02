type Props = { categories: { category: string; amount: number }[] };

export function CategoryBreakdown({ categories }: Props) {
  const total = categories.reduce((sum, item) => sum + item.amount, 0);
  return <section className="panel breakdown-panel">
    <div className="section-heading"><div><span className="eyebrow">THIS MONTH</span><h2>Where it goes</h2></div><span className="section-total">${total.toFixed(2)}</span></div>
    {categories.length === 0 ? <p className="muted">No expenses logged this month.</p> : <div className="bars">{categories.slice(0, 6).map((item) => <div className="bar-row" key={item.category}><div className="bar-meta"><span>{item.category}</span><span className="mono">${item.amount.toFixed(2)}</span></div><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(4, (item.amount / categories[0].amount) * 100)}%` }} /></div></div>)}</div>}
  </section>;
}
