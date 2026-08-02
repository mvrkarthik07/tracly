import { FormEvent, useEffect, useState } from 'react';
import { createRecurring, deleteRecurring, getRecurring, updateRecurring, type NewRecurringTransaction, type RecurringTransaction, type TxType } from '../api/client';
import { CATEGORIES, type Category } from '../constants/categories';
import { CategoryChips } from './CategoryChips';

type FormState = { amount: string; type: TxType; category: Category; note: string; dayOfMonth: string; startDate: string; endDate: string };
const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = (): FormState => ({ amount: '', type: 'EXPENSE', category: 'OTHER', note: '', dayOfMonth: '1', startDate: today(), endDate: '' });
const toForm = (rule: RecurringTransaction): FormState => ({ amount: rule.amount, type: rule.type, category: rule.category, note: rule.note ?? '', dayOfMonth: String(rule.dayOfMonth), startDate: rule.startDate.slice(0, 10), endDate: rule.endDate?.slice(0, 10) ?? '' });
const categoryIcon: Record<Category, string> = { FOOD: '●', TRANSPORT: '↗', BILLS: '▤', SHOPPING: '□', ENTERTAINMENT: '◆', HEALTH: '+', INCOME: '↘', OTHER: '•' };

const nextCharge = (rule: RecurringTransaction) => {
  const now = new Date();
  const makeDate = (year: number, month: number) => new Date(year, month, Math.min(rule.dayOfMonth, new Date(year, month + 1, 0).getDate()));
  let charge = makeDate(now.getFullYear(), now.getMonth());
  if (charge <= now) charge = makeDate(now.getFullYear(), now.getMonth() + 1);
  if (new Date(rule.startDate) > charge || (rule.endDate && new Date(rule.endDate) < charge)) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(charge);
};

export function RecurringPanel() {
  const [rules, setRules] = useState<RecurringTransaction[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try { setRules(await getRecurring()); } catch { setError('Could not load subscriptions.'); }
  };
  useEffect(() => { void load(); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(form?.amount);
    const dayOfMonth = Number(form?.dayOfMonth);
    if (!form || !Number.isFinite(amount) || amount <= 0 || !Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31 || !form.startDate) { setError('Enter a valid amount, start date, and day from 1 to 31.'); return; }
    const payload: NewRecurringTransaction = { amount, type: form.type, category: form.category, note: form.note.trim() || undefined, dayOfMonth, startDate: form.startDate, endDate: form.endDate || null };
    try {
      const saved = editingId ? await updateRecurring(editingId, payload) : await createRecurring(payload);
      setRules((current) => editingId ? current.map((rule) => rule.id === editingId ? saved : rule) : [...current, saved].sort((left, right) => left.dayOfMonth - right.dayOfMonth));
      setForm(null); setEditingId(null); setError('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save subscription.'); }
  };

  const toggle = async (rule: RecurringTransaction) => {
    try { const updated = await updateRecurring(rule.id, { active: !rule.active }); setRules((current) => current.map((item) => item.id === rule.id ? updated : item)); }
    catch { setError('Could not update subscription.'); }
  };
  const remove = async (rule: RecurringTransaction) => {
    if (!window.confirm('Delete this recurring rule? Existing transactions will remain.')) return;
    try { await deleteRecurring(rule.id); setRules((current) => current.filter((item) => item.id !== rule.id)); }
    catch { setError('Could not delete subscription.'); }
  };

  return <section className="panel recurring-panel">
    <div className="section-heading"><div><span className="eyebrow">RECURRING</span><h2>Subscriptions</h2></div><button className="text-button" type="button" onClick={() => { setForm(emptyForm()); setEditingId(null); setError(''); }}>+ Add recurring</button></div>
    {error && <p className="inline-error">{error}</p>}
    {rules.length === 0 ? <p className="muted">No recurring transactions yet.</p> : <div className="recurring-list">{rules.map((rule) => <div className={`recurring-row${rule.active ? '' : ' paused'}`} key={rule.id}><span className="tx-icon">{categoryIcon[rule.category]}</span><span className="tx-main"><strong>{rule.note || rule.category}</strong><small>{rule.active ? `Next charge: ${nextCharge(rule)}` : 'Paused'}</small></span><span className={rule.type === 'INCOME' ? 'positive mono' : 'negative mono'}>{rule.type === 'INCOME' ? '+' : '-'}${Number(rule.amount).toFixed(2)}</span><button type="button" className="recurring-action" aria-label={rule.active ? 'Pause subscription' : 'Resume subscription'} onClick={() => void toggle(rule)}>{rule.active ? 'Ⅱ' : '▶'}</button><button type="button" className="recurring-action" aria-label="Edit subscription" onClick={() => { setForm(toForm(rule)); setEditingId(rule.id); setError(''); }}>✎</button><button type="button" className="recurring-action" aria-label="Delete subscription" onClick={() => void remove(rule)}>×</button></div>)}</div>}
    {form && <form className="recurring-form" onSubmit={submit}><div className="recurring-form-heading"><strong>{editingId ? 'Edit subscription' : 'Add recurring'}</strong><button type="button" className="recurring-close" aria-label="Close form" onClick={() => setForm(null)}>×</button></div><div className="recurring-fields"><label>Amount<input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><label>Type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as TxType })}><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select></label><label>Day of month<input type="number" min="1" max="31" value={form.dayOfMonth} onChange={(event) => setForm({ ...form, dayOfMonth: event.target.value })} /></label><label>Start date<input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label><label>End date (optional)<input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label><label className="recurring-note">Label / note<input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label></div><CategoryChips categories={CATEGORIES} selectedCategory={form.category} onSelect={(category) => setForm({ ...form, category })} /><div className="recurring-form-actions"><button type="button" className="small-button muted-button" onClick={() => setForm(null)}>Cancel</button><button type="submit" className="small-button">Save</button></div></form>}
  </section>;
}
