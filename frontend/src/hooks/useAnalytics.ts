import { useCallback, useEffect, useState } from 'react';
import { getLatestReport, getSummary, type AnalyticsSummary, type WeeklyReport } from '../api/client';

export const useAnalytics = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [weekSummary, setWeekSummary] = useState<AnalyticsSummary | null>(null);
  const [latestReport, setLatestReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [month, week] = await Promise.all([getSummary('month'), getSummary('week')]);
      setSummary(month); setWeekSummary(week);
    } catch { setSummary(null); setWeekSummary(null); }
    try { setLatestReport(await getLatestReport()); } catch { setLatestReport(null); }
    setLoading(false);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { summary, weekSummary, latestReport, loading, refresh };
};
