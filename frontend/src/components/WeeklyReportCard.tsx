import type { WeeklyReport } from '../api/client';

export function WeeklyReportCard({ report }: { report: WeeklyReport | null }) {
  return <section className="panel report-card"><span className="eyebrow">LAST WEEK</span>{report ? <><div className="report-net"><span>Net position</span><strong className={report.net >= 0 ? 'positive' : 'negative'}>{report.net >= 0 ? '+' : '-'}${Math.abs(report.net).toFixed(2)}</strong></div><div className="report-foot"><span>Top category</span><span>{report.topCategory ?? '—'}</span></div></> : <p className="muted">Your first weekly report will appear here on Monday.</p>}</section>;
}
