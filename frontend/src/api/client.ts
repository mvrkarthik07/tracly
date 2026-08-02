import type { Category } from '../constants/categories';

export type TxType = 'INCOME' | 'EXPENSE';
export type Transaction = { id: string; amount: string; type: TxType; category: string; note: string | null; occurredAt: string; createdAt: string; updatedAt: string; clientId: string | null };
export type NewTransaction = { amount: number; type: TxType; category: string; note?: string; occurredAt?: string; clientId: string };
export type AnalyticsSummary = { totalIncome: number; totalExpense: number; net: number; byCategory: { category: string; amount: number }[]; dailySeries: { date: string; income: number; expense: number }[] };
export type WeeklyReport = { id: string; weekStart: string; weekEnd: string; totalIncome: number; totalExpense: number; net: number; byCategory: { category: string; amount: number }[]; topCategory: string | null; generatedAt: string };
export type RecurringTransaction = { id: string; amount: string; type: TxType; category: Category; note: string | null; frequency: 'MONTHLY'; dayOfMonth: number; startDate: string; endDate: string | null; active: boolean; createdAt: string; updatedAt: string };
export type NewRecurringTransaction = { amount: number; type: TxType; category: Category; note?: string; frequency?: 'MONTHLY'; dayOfMonth: number; startDate: string; endDate?: string | null; active?: boolean };

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = 'ApiError'; }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const relativePath = path.startsWith('/api/') ? path.slice(4) : path;
  const response = await fetch(`${API_BASE}${relativePath}`, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new ApiError(body.error || `Request failed (${response.status})`, response.status);
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
};

export const login = (password: string) => request<{ ok: true }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) });
export const logout = () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' });
export const getTransactions = () => request<Transaction[]>('/api/transactions');
export const createTransaction = (data: NewTransaction) => request<Transaction>('/api/transactions', { method: 'POST', body: JSON.stringify(data) });
export const updateTransaction = (id: string, data: Partial<NewTransaction>) => request<Transaction>(`/api/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteTransaction = (id: string) => request<void>(`/api/transactions/${id}`, { method: 'DELETE' });
export const getSummary = (range: 'week' | 'month' | 'ytd' = 'month') => request<AnalyticsSummary>(`/api/analytics/summary?range=${range}`);
export const getWeeklyReports = (limit = 8) => request<WeeklyReport[]>(`/api/reports/weekly?limit=${limit}`);
export const getLatestReport = () => request<WeeklyReport>('/api/reports/weekly/latest');
export const getRecurring = () => request<RecurringTransaction[]>('/api/recurring');
export const createRecurring = (data: NewRecurringTransaction) => request<RecurringTransaction>('/api/recurring', { method: 'POST', body: JSON.stringify(data) });
export const updateRecurring = (id: string, data: Partial<NewRecurringTransaction>) => request<RecurringTransaction>(`/api/recurring/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteRecurring = (id: string) => request<void>(`/api/recurring/${id}`, { method: 'DELETE' });
