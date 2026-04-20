"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiveUpdates } from "@/lib/useLiveUpdates";

interface AnalysisData {
  correlations: Record<string, Record<string, number>>;
  statistics: Record<string, Record<string, number>>;
  sample_size: number;
}

type TimeRange = "7d" | "30d" | "all";

export default function DataAnalysisPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const liveUpdate = useLiveUpdates();

  const fetchAnalysis = useCallback(async () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    
    let url = `${apiBaseUrl.replace(/\/$/, "")}/analysis/correlations`;
    const params = new URLSearchParams();
    
    if (timeRange !== "all") {
      const end = new Date();
      const start = new Date();
      if (timeRange === "7d") start.setDate(start.getDate() - 7);
      if (timeRange === "30d") start.setDate(start.getDate() - 30);
      
      params.append("start_date", start.toISOString());
      params.append("end_date", end.toISOString());
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else if (response.status === 404) {
        setData(null);
      }
    } catch (error) {
      console.error("Failed to fetch analysis", error);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    setIsLoading(true);
    fetchAnalysis();
  }, [fetchAnalysis]);

  // Handle live updates
  useEffect(() => {
    if (liveUpdate) {
      fetchAnalysis();
    }
  }, [liveUpdate, fetchAnalysis]);

  const getCorrelationColor = (value: number) => {
    if (value === 1) return "bg-gray-200 text-gray-400"; // self-correlation
    if (value > 0.6) return "bg-red-200 text-red-900 font-bold"; // strong positive
    if (value < -0.6) return "bg-blue-200 text-blue-900 font-bold"; // strong negative
    if (Math.abs(value) > 0.3) return "bg-yellow-100 text-yellow-800"; // moderate
    return "bg-gray-50 text-gray-500"; // weak/none
  };

  return (
    <section className="page-content analysis-page" style={{ padding: '2rem' }}>
      <div className="analysis-top-row">
        <header>
          <h2 className="page-title" style={{ fontSize: '2rem', fontWeight: 'bold' }}>Exploratory Data Analysis</h2>
          <p className="page-description analysis-subtitle">
            Live statistical analysis based on sensor readings.
          </p>
        </header>

        <div className="analysis-inline-controls">
          <label>
            Time Range:
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as TimeRange)}>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </label>
        </div>
      </div>

      {isLoading ? (
         <div className="p-8">Loading analysis...</div>
      ) : !data ? (
         <div className="p-8">Not enough data to run analysis for this time range.</div>
      ) : (
        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr', marginTop: '2rem' }}>
          <article className="analysis-block" style={{ padding: '1.5rem', background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div className="analysis-block-header">
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Pearson Correlation Matrix</h3>
                <p style={{ color: '#666' }}>
                  Values closer to 1.0 indicate a strong positive relationship. Values closer to -1.0 indicate a strong negative relationship.
                </p>
              </div>
              <span>Sample size: {data.sample_size}</span>
            </div>
            
            <div className="analysis-matrix-wrap" style={{ overflowX: 'auto', marginTop: '1rem' }}>
              <table className="analysis-matrix" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.5rem', borderBottom: '2px solid #ddd' }}>Metric</th>
                    {Object.keys(data.correlations).map(v => (
                      <th key={v} style={{ padding: '0.5rem', borderBottom: '2px solid #ddd', textTransform: 'capitalize' }}>
                        {v.replace('_', ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(data.correlations).map(rowVar => (
                    <tr key={rowVar}>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #ddd', fontWeight: 'bold', textAlign: 'left', textTransform: 'capitalize' }}>
                        {rowVar.replace('_', ' ')}
                      </td>
                      {Object.keys(data.correlations).map(colVar => {
                        const val = data.correlations[rowVar][colVar];
                        return (
                          <td key={colVar} className={getCorrelationColor(val)} style={{ padding: '0.75rem', borderBottom: '1px solid #ddd', borderRight: '1px solid white' }}>
                            {val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}