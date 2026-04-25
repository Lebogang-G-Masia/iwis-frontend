"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiveUpdates } from "@/lib/useLiveUpdates";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface AnalysisData {
  correlations: Record<string, Record<string, number>>;
  statistics: Record<string, Record<string, number>>;
  sample_size: number;
}

interface TrendData {
  date: string;
  wqi: number;
}

type TimeRange = "7d" | "30d" | "all";

export default function DataAnalysisPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const liveUpdate = useLiveUpdates();

  const fetchAnalysis = useCallback(async () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
    console.log(`[IWIS DEBUG] Connecting to Backend at: ${apiBaseUrl}`);
    
    // Fetch correlations
    let corrUrl = `${apiBaseUrl.replace(/\/$/, "")}/analysis/correlations`;
    const params = new URLSearchParams();
    if (timeRange !== "all") {
      const start = new Date();
      if (timeRange === "7d") start.setDate(start.getDate() - 7);
      if (timeRange === "30d") start.setDate(start.getDate() - 30);
      params.append("start_date", start.toISOString());
    }
    if (params.toString()) corrUrl += `?${params.toString()}`;

    // Fetch trends
    const trendUrl = `${apiBaseUrl.replace(/\/$/, "")}/analysis/trends`;

    try {
      const [corrRes, trendRes] = await Promise.all([
        fetch(corrUrl),
        fetch(trendUrl)
      ]);

      if (corrRes.ok) {
          const result = await corrRes.json();
          setData(result);
      }
      if (trendRes.ok) {
          const result = await trendRes.json();
          setTrends(result);
      }
      
    } catch (error) {
      console.error("Failed to fetch analysis", error);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  useEffect(() => {
    if (liveUpdate) fetchAnalysis();
  }, [liveUpdate, fetchAnalysis]);

  const getCorrelationColor = (value: number) => {
    if (value === 1) return "bg-gray-100 text-gray-400";
    if (value > 0.6) return "bg-red-100 text-red-800 font-bold";
    if (value < -0.6) return "bg-blue-100 text-blue-800 font-bold";
    return "bg-white text-gray-600";
  };

  // Helper to safely get keys
  const getSafeKeys = (obj: any) => obj ? Object.keys(obj) : [];

  return (
    <section className="page-content analysis-page" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="analysis-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <header>
          <h2 className="page-title" style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#1a202c' }}>Data Analysis Studio</h2>
          <p className="analysis-subtitle" style={{ color: '#718096', fontSize: '1.1rem' }}>
            Advanced ecological modeling and trend forecasting.
          </p>
        </header>

        <div className="analysis-controls" style={{ display: 'flex', gap: '1rem' }}>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e0' }}
          >
            <option value="7d">Past Week</option>
            <option value="30d">Past Month</option>
            <option value="all">Full History</option>
          </select>
        </div>
      </div>

      {isLoading ? (
         <div style={{ textAlign: 'center', padding: '4rem' }}>
            <p>Syncing with remote sensors...</p>
         </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Trend Chart Row */}
          <article className="analysis-block" style={{ padding: '1.5rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>📈 WQI Trend</h3>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(str) => str.split('-').slice(1).join('/')} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="wqi" stroke="#3182ce" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
            {/* Correlation Matrix with Safety Check */}
            <article className="analysis-block" style={{ padding: '1.5rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Correlation Matrix</h3>
              {data?.correlations ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr>
                        <th></th>
                        {getSafeKeys(data.correlations).map(v => (
                          <th key={v} style={{ padding: '0.5rem', textTransform: 'capitalize' }}>{v}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getSafeKeys(data.correlations).map(rowVar => (
                        <tr key={rowVar}>
                          <td style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{rowVar}</td>
                          {getSafeKeys(data.correlations).map(colVar => (
                            <td key={colVar} className={getCorrelationColor(data.correlations[rowVar][colVar])} style={{ padding: '0.5rem', textAlign: 'center' }}>
                              {data.correlations[rowVar][colVar].toFixed(2)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p>Loading correlation data...</p>}
            </article>

            {/* Statistics with Safety Check */}
            <article className="analysis-block" style={{ padding: '1.5rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Baseline Statistics</h3>
              {data?.statistics ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {getSafeKeys(data.statistics).slice(0, 4).map(metric => (
                    <div key={metric} style={{ padding: '1rem', border: '1px solid #edf2f7', borderRadius: '8px' }}>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>{metric}</h4>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{data.statistics[metric].mean?.toFixed(1) || "0.0"}</div>
                    </div>
                  ))}
                </div>
              ) : <p>Loading statistics...</p>}
            </article>
          </div>
        </div>
      )}
    </section>
  );
}
