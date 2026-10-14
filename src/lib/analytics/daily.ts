/** Fila cruda de analytics_daily (el timestamp puede ser por publicación). */
export interface AnalyticsDailyRow {
  date: number | string;
  platform: string;
  impressions?: number | null;
  reach?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  clicks?: number | null;
  views?: number | null;
}

export interface DailyAggregate {
  date: string;
  platform: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  views: number;
  engagement: number;
}

/**
 * analytics_daily ahora guarda una fila por publicacion (con su hora exacta,
 * que es lo que lee el smart scheduler para aprender el mejor horario). El
 * dashboard grafica una entrada por dia, asi que esta funcion agrega los
 * totales por (dia, plataforma) manteniendo la forma de respuesta que ya
 * consumen los consumidores existentes.
 */
export function aggregateDaily(rows: AnalyticsDailyRow[]): DailyAggregate[] {
  const byKey = new Map<string, DailyAggregate>();

  for (const row of rows) {
    const day = new Date(row.date).toISOString().split("T")[0];
    const key = `${day}|${row.platform}`;
    const cur: DailyAggregate = byKey.get(key) || {
      date: day,
      platform: row.platform,
      impressions: 0,
      reach: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      clicks: 0,
      views: 0,
      engagement: 0,
    };

    cur.impressions += row.impressions || 0;
    cur.reach += row.reach || 0;
    cur.likes += row.likes || 0;
    cur.comments += row.comments || 0;
    cur.shares += row.shares || 0;
    cur.saves += row.saves || 0;
    cur.clicks += row.clicks || 0;
    cur.views += row.views || 0;
    cur.engagement = cur.likes + cur.comments + cur.shares;

    byKey.set(key, cur);
  }

  return [...byKey.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.platform.localeCompare(b.platform)
  );
}
