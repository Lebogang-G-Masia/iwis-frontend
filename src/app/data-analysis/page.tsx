"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiveUpdates } from "@/lib/useLiveUpdates";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
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
      const end = new Date();
      const start = new Date();
      if (timeRange === "7d") start.setDate(start.getDate() - 7);
      if (timeRange === "30d") start.setDate(start.getDate() - 30);
      params.append("start_date", start.toISOString());
      params.append("end_date", end.toISOString());
    }
    if (params.toString()) corrUrl += `?${params.toString()}`;

    // Fetch trends
    const trendUrl = `${apiBaseUrl.replace(/\/$/, "")}/analysis/trends?days=${timeRange === '7d' ? 7 : 30}`;

    try {
      const [corrRes, trendRes] = await Promise.all([
        fetch(corrUrl),
        fetch(trendUrl)
      ]);

      if (corrRes.ok) setData(await corrRes.json());
      if (trendRes.ok) setTrends(await trendRes.json());
      
    } catch (error) {
      console.error("Failed to fetch analysis", error);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    setIsLoading(true);
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
          <button 
            onClick={() => fetchAnalysis()}
            style={{ padding: '0.5rem 1rem', background: '#2b6cb0', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
          >
            Refresh Data
          </button>
        </div>
      </div>

      {isLoading ? (
         <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div className="loading-spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 2s linear infinite', margin: '0 auto' }}></div>
            <p style={{ marginTop: '1rem' }}>Syncing with remote sensors...</p>
         </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Trend Chart Row */}
          <article className="analysis-block" style={{ padding: '1.5rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📈 Water Quality Index (WQI) Trend
            </h3>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f7" />
                  <XAxis dataKey="date" stroke="#718096" fontSize={12} tickFormatter={(str) => str.split('-').slice(1).join('/')} />
                  <YAxis domain={[0, 100]} stroke="#718096" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="wqi" 
                    stroke="#3182ce" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#3182ce' }}
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#718096', marginTop: '1rem', textAlign: 'center' }}>
              WQI represents overall water health. 0 = Critical, 100 = Pristine.
            </p>
          </article>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
            {/* Correlation Matrix */}
            <article className="analysis-block" style={{ padding: '1.5rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Correlation Matrix</h3>
              {data ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '0.5rem', borderBottom: '1px solid #edf2f7' }}></th>
                        {Object.keys(data.correlations).map(v => (
                          <th key={v} style={{ padding: '0.5rem', borderBottom: '1px solid #edf2f7', textTransform: 'capitalize', color: '#4a5568' }}>
                            {v.split('_')[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(data.correlations).map(rowVar => (
                        <tr key={rowVar}>
                          <td style={{ padding: '0.5rem', fontWeight: 'bold', color: '#2d3748', textTransform: 'capitalize' }}>
                            {rowVar.split('_')[0]}
                          </td>
                          {Object.keys(data.correlations).map(colVar => {
                            const val = data.correlations[rowVar][colVar];
                            return (
                              <td key={colVar} className={getCorrelationColor(val)} style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #edf2f7' }}>
                                {val.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p>No correlation data available.</p>}
            </article>

            {/* Basic Statistics */}
            <article className="analysis-block" style={{ padding: '1.5rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Baseline Statistics</h3>
              {data ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {Object.entries(data.statistics).slice(0, 4).map(([metric, stats]) => (
                    <div key={metric} style={{ padding: '1rem', border: '1px solid #edf2f7', borderRadius: '8px' }}>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        {metric.replace('_', ' ')}
                      </h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{stats.mean.toFixed(1)}</span>
                        <span style={{ fontSize: '0.75rem', color: '#a0aec0' }}>avg</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '0.25rem' }}>
                        Range: {stats.min.toFixed(1)} - {stats.max.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p>No statistics available.</p>}
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#ebf8ff', borderRadius: '8px', fontSize: '0.875rem' }}>
                <strong>Data Health:</strong> Analysis based on {data?.sample_size || 0} recent observations.
              </div>
            </article>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}
