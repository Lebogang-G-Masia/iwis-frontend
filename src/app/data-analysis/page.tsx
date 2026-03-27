"use client";

import { useEffect, useState } from "react";

interface AnalysisData {
  correlations: Record<string, Record<string, number>>;
  statistics: Record<string, Record<string, number>>;
  sample_size: number;
}

export default function DataAnalysisPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalysis() {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      try {
        const response = await fetch(`${apiBaseUrl}/analysis/correlations`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch analysis", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalysis();
    // Auto-refresh analysis every 5 minutes
    const interval = setInterval(fetchAnalysis, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) return <div className="p-8">Loading real-time analysis...</div>;
  if (!data) return <div className="p-8">Not enough data to run analysis.</div>;

  const variables = Object.keys(data.correlations);

  // Helper to color-code the correlation strength
  const getCorrelationColor = (value: number) => {
    if (value === 1) return "bg-gray-200 text-gray-400"; // self-correlation
    if (value > 0.6) return "bg-red-200 text-red-900 font-bold"; // strong positive
    if (value < -0.6) return "bg-blue-200 text-blue-900 font-bold"; // strong negative
    if (Math.abs(value) > 0.3) return "bg-yellow-100 text-yellow-800"; // moderate
    return "bg-gray-50 text-gray-500"; // weak/none
  };

  return (
    <section className="page-content" style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h2 className="page-title" style={{ fontSize: '2rem', fontWeight: 'bold' }}>Real-Time Exploratory Data Analysis</h2>
        <p className="page-description">
          Live statistical analysis based on the latest {data.sample_size} sensor readings.
        </p>
      </header>

      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr' }}>
        {/* Correlation Matrix */}
        <article className="dashboard-card" style={{ padding: '1.5rem', background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Pearson Correlation Matrix</h3>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Values closer to 1.0 indicate a strong positive relationship. Values closer to -1.0 indicate a strong negative relationship.
          </p>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.5rem', borderBottom: '2px solid #ddd' }}>Metric</th>
                  {variables.map(v => (
                    <th key={v} style={{ padding: '0.5rem', borderBottom: '2px solid #ddd', textTransform: 'capitalize' }}>
                      {v.replace('_', ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variables.map(rowVar => (
                  <tr key={rowVar}>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #ddd', fontWeight: 'bold', textAlign: 'left', textTransform: 'capitalize' }}>
                      {rowVar.replace('_', ' ')}
                    </td>
                    {variables.map(colVar => {
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
    </section>
  );
}
