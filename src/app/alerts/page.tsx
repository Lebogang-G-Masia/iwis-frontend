"use client";

import { useEffect, useState, useCallback } from "react";
import { useLiveUpdates } from "@/lib/useLiveUpdates";

interface Alert {
  id: number;
  reading_id: number;
  alert_type: string;
  severity: string;
  threshold_val: number;
  created_at: string;
  resolved: boolean;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const liveUpdate = useLiveUpdates();

  const fetchAlerts = useCallback(async () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/alerts`);
      if (response.ok) {
        setAlerts(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch alerts", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Handle live updates
  useEffect(() => {
    if (liveUpdate?.type === "new_alert" || liveUpdate?.type === "update_alert") {
      fetchAlerts();
    }
  }, [liveUpdate, fetchAlerts]);

  const resolveAlert = async (id: number) => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/alerts/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true })
      });
      if (response.ok) {
        // Optimistic update
        setAlerts(current => current.map(a => a.id === id ? { ...a, resolved: true } : a));
      }
    } catch (error) {
      console.error("Failed to resolve alert", error);
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return { borderLeft: '6px solid #c53030', background: '#fff5f5' };
      case 'medium': return { borderLeft: '6px solid #b7791f', background: '#fffaf0' };
      default: return { borderLeft: '6px solid #2f855a', background: '#f0fff4' };
    }
  };

  return (
    <section className="page-content alerts-page" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h2 className="page-title" style={{ fontSize: '2rem', fontWeight: 'bold' }}>Environmental Alerts</h2>
        <p style={{ color: '#718096' }}>Real-time monitoring of ecological threshold breaches.</p>
      </header>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>Synchronizing with sensors...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: '#f7fafc', borderRadius: '8px', color: '#718096' }}>
              ✅ All parameters within safe limits. No active alerts.
            </div>
          ) : (
            alerts.map((alert) => (
              <article 
                key={alert.id} 
                style={{ 
                  padding: '1.5rem', 
                  //background: 'white', 
                  borderRadius: '8px', 
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: alert.resolved ? 0.6 : 1,
                  ...getSeverityStyle(alert.severity)
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold', 
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: alert.severity === 'high' ? '#fed7d7' : '#feebc8',
                      color: alert.severity === 'high' ? '#9b2c2c' : '#9c4221'
                    }}>
                      {alert.severity} Severity
                    </span>
                    <span style={{ color: '#718096', fontSize: '0.875rem' }}>
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{alert.alert_type}</h3>
                  <p style={{ color: '#4a5568' }}>
                    Threshold exceeded: <strong>{alert.threshold_val} mg/L</strong>
                  </p>
                </div>

                {!alert.resolved ? (
                  <button 
                    onClick={() => resolveAlert(alert.id)}
                    style={{ 
                      padding: '8px 16px', 
                      background: '#2b6cb0', 
                      color: 'white', 
                      borderRadius: '6px', 
                      border: 'none', 
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Mark Resolved
                  </button>
                ) : (
                  <span style={{ color: '#2f855a', fontWeight: 'bold' }}>✓ Resolved</span>
                )}
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
