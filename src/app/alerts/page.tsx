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

  const activeCount = useMemo(() => alerts.filter(a => !a.resolved).length, [alerts]);

  return (
    <div className="alerts-management-system" style={{ padding: '2.5rem', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Refined Header without Cards */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
             <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>Incident Response</h2>
             {activeCount > 0 && (
               <span style={{ padding: '4px 12px', background: '#ef4444', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, color: 'white' }}>
                 {activeCount} ACTIVE
               </span>
             )}
          </div>
          <p style={{ color: '#64748b', fontSize: '1rem' }}>Monitoring system telemetry and automated safety thresholds.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
           <button 
             onClick={triggerSimulation}
             disabled={isSimulating}
             style={{ 
               padding: '10px 18px', 
               background: isSimulating ? '#f1f5f9' : 'white', 
               color: isSimulating ? '#94a3b8' : '#0f172a', 
               borderRadius: '10px', 
               border: '1px solid #e2e8f0', 
               cursor: isSimulating ? 'not-allowed' : 'pointer',
               fontWeight: 600,
               fontSize: '0.875rem',
               boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
             }}
           >
             {isSimulating ? "Transmitting..." : "Manual Test Breach"}
           </button>
        </div>
      </header>

      {/* Primary Incident Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '8rem', color: '#94a3b8' }}>Establishing telemetry link...</div>
        ) : alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '8rem', background: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🛡️</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>System Healthy</h3>
            <p style={{ color: '#64748b' }}>No active incidents or threshold breaches reported.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <article 
              key={alert.id} 
              style={{ 
                padding: '2rem', 
                background: alert.resolved ? '#fdfdfd' : 'white', 
                borderRadius: '16px', 
                boxShadow: alert.resolved ? 'none' : '0 10px 15px -3px rgba(0,0,0,0.04)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid #f1f5f9',
                borderLeft: `6px solid ${alert.resolved ? '#cbd5e1' : (alert.severity === 'high' ? '#ef4444' : '#f59e0b')}`,
                opacity: alert.resolved ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <span style={{ 
                    fontSize: '0.65rem', 
                    fontWeight: 800, 
                    textTransform: 'uppercase',
                    padding: '2px 10px',
                    borderRadius: '4px',
                    background: alert.resolved ? '#f1f5f9' : (alert.severity === 'high' ? '#fee2e2' : '#fef3c7'),
                    color: alert.resolved ? '#64748b' : (alert.severity === 'high' ? '#991b1b' : '#92400e'),
                    letterSpacing: '0.025em'
                  }}>
                    {alert.severity} PRIORITY
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>
                    INCIDENT #{alert.id}
                  </span>
                </div>
                
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                   {alert.alert_type}
                </h3>
                
                <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
                   <div style={{ color: '#475569', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#94a3b8' }}>Detection:</span> <strong>{alert.threshold_val.toFixed(2)} mg/L</strong>
                   </div>
                   <div style={{ color: '#475569', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#94a3b8' }}>Timestamp:</span> <span>{new Date(alert.created_at).toLocaleString()}</span>
                   </div>
                </div>
              </div>

              <div style={{ marginLeft: '2rem' }}>
                {!alert.resolved ? (
                  <button 
                    onClick={() => resolveAlert(alert.id)}
                    style={{ 
                      padding: '12px 24px', 
                      background: '#0f172a', 
                      color: 'white', 
                      borderRadius: '10px', 
                      border: 'none', 
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                    }}
                  >
                    Resolve Incident
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 700, fontSize: '0.875rem' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
                    RESOLVED
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      <style jsx global>{`
        button:hover { filter: brightness(1.1); }
        button:active { transform: scale(0.98); }
      `}</style>
    </div>
  );
}
