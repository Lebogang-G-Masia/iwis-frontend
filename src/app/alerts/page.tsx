"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  const [isSimulating, setIsSimulating] = useState(false);
  const liveUpdate = useLiveUpdates();

  const fetchAlerts = useCallback(async () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const baseUrl = apiBaseUrl.replace(/\/$/, "");
    try {
      const response = await fetch(`${baseUrl}/alerts`);
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

  useEffect(() => {
    if (liveUpdate?.type === "new_alert" || liveUpdate?.type === "update_alert") {
      fetchAlerts();
    }
  }, [liveUpdate, fetchAlerts]);

  const resolveAlert = async (id: number) => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const baseUrl = apiBaseUrl.replace(/\/$/, "");
    try {
      await fetch(`${baseUrl}/alerts/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true })
      });
      // Optimistic update
      setAlerts(curr => curr.map(a => a.id === id ? { ...a, resolved: true } : a));
    } catch (error) {
      console.error("Failed to resolve alert", error);
    }
  };

  const triggerSimulation = async () => {
    setIsSimulating(true);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const baseUrl = apiBaseUrl.replace(/\/$/, "");
    try {
      await fetch(`${baseUrl}/water-readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensor_id: 1, ph: 7.4, temperature_c: 25.1,
          nitrates_mg_l: 14.2, turbidity_ntu: 6.0,
          dissolved_oxygen_mg_l: 5.5, latitude: -25.734, longitude: 27.858
        })
      });
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsSimulating(false), 1200);
    }
  };

  const stats = useMemo(() => ({
    active: alerts.filter(a => !a.resolved).length,
    resolved: alerts.filter(a => a.resolved).length,
    critical: alerts.filter(a => a.severity === 'high' && !a.resolved).length
  }), [alerts]);

  return (
    <div className="alerts-management-system" style={{ padding: '2.5rem', maxWidth: '1280px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Top Professional Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
             <span style={{ padding: '4px 10px', background: '#e2e8f0', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, color: '#475569' }}>v4.0 STABLE</span>
             <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>Incident Response</h2>
          </div>
          <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: 400 }}>Real-time telemetry monitoring and threshold breach management.</p>
        </div>

        {/* Simulation Control */}
        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
           <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>Diagnostics</div>
           <button 
             onClick={triggerSimulation}
             disabled={isSimulating}
             style={{ 
               padding: '10px 20px', 
               background: isSimulating ? '#cbd5e1' : '#3b82f6', 
               color: 'white', 
               borderRadius: '10px', 
               border: 'none', 
               cursor: isSimulating ? 'not-allowed' : 'pointer',
               fontWeight: 700,
               fontSize: '0.875rem',
               transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
             }}
           >
             {isSimulating ? "Transmitting..." : "🚀 Trigger Test Breach"}
           </button>
        </div>
      </header>

      {/* Analytics Snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
         <div style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '16px', color: 'white' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Active Incidents</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.active}</div>
         </div>
         <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Resolved (24h)</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>{stats.resolved}</div>
         </div>
         <div style={{ background: stats.critical > 0 ? '#fee2e2' : '#f0fdf4', padding: '1.5rem', borderRadius: '16px', border: stats.critical > 0 ? '1px solid #fecaca' : '1px solid #dcfce7' }}>
            <div style={{ color: stats.critical > 0 ? '#991b1b' : '#166534', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>System Status</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: stats.critical > 0 ? '#991b1b' : '#166534' }}>
               {stats.critical > 0 ? `⚠️ ${stats.critical} CRITICAL BREACHES` : "✓ NOMINAL OPERATION"}
            </div>
         </div>
      </div>

      {/* Main Alert Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '10rem', color: '#64748b' }}>Establishing secure WebSocket link...</div>
        ) : alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '10rem', background: '#f8fafc', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍃</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>All Clear</h3>
            <p style={{ color: '#64748b' }}>No ecological breaches detected across monitored basins.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <article 
              key={alert.id} 
              style={{ 
                padding: '1.75rem', 
                background: alert.resolved ? '#f8fafc' : 'white', 
                borderRadius: '20px', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: alert.resolved ? '1px solid #e2e8f0' : `1px solid ${alert.severity === 'high' ? '#fecaca' : '#fed7aa'}`,
                borderLeft: `8px solid ${alert.resolved ? '#94a3b8' : (alert.severity === 'high' ? '#ef4444' : '#f59e0b')}`,
                transition: 'transform 0.2s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                  <span style={{ 
                    fontSize: '0.65rem', 
                    fontWeight: 900, 
                    textTransform: 'uppercase',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    background: alert.resolved ? '#e2e8f0' : (alert.severity === 'high' ? '#ef4444' : '#f59e0b'),
                    color: alert.resolved ? '#475569' : 'white',
                    letterSpacing: '0.05em'
                  }}>
                    {alert.severity} Priority
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500 }}>
                    Log ID: #{alert.id} • Sensor Link: {alert.reading_id}
                  </span>
                </div>
                
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: alert.resolved ? '#64748b' : '#0f172a', marginBottom: '0.5rem' }}>
                   {alert.alert_type}
                </h3>
                
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                   <div style={{ color: '#475569', fontSize: '0.9rem' }}>
                      Detection Value: <strong style={{ color: alert.resolved ? '#64748b' : '#0f172a' }}>{alert.threshold_val.toFixed(2)} mg/L</strong>
                   </div>
                   <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                      Timestamp: {new Date(alert.created_at).toLocaleString()}
                   </div>
                </div>
              </div>

              <div style={{ marginLeft: '2rem' }}>
                {!alert.resolved ? (
                  <button 
                    onClick={() => resolveAlert(alert.id)}
                    style={{ 
                      padding: '12px 28px', 
                      background: 'white', 
                      color: '#0f172a', 
                      borderRadius: '12px', 
                      border: '2px solid #0f172a', 
                      cursor: 'pointer',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                       e.currentTarget.style.background = '#0f172a';
                       e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                       e.currentTarget.style.background = 'white';
                       e.currentTarget.style.color = '#0f172a';
                    }}
                  >
                    Acknowledge & Resolve
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 800 }}>
                    <span style={{ fontSize: '1.25rem' }}>✓</span> Case Closed
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      <style jsx global>{`
        .alerts-management-system button:active {
          transform: scale(0.96);
        }
      `}</style>
    </div>
  );
}
