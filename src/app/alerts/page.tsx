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
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#1a202c', fontFamily: 'monospace', backgroundColor: '#ffffff' }}>
      
      {/* Tabular Header Section */}
      <header style={{ borderBottom: '2px solid #2d3748', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>
            SYSTEM_INCIDENT_LOG
          </h2>
          <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#4a5568' }}>
            ACTIVE_INCIDENTS: {activeCount} | TELEMETRY: CONNECTED
          </div>
        </div>

        <button 
          onClick={triggerSimulation}
          disabled={isSimulating}
          style={{ 
            padding: '6px 12px', 
            background: 'none',
            border: '1px solid #cbd5e0',
            cursor: 'pointer',
            fontSize: '0.75rem',
            color: '#4a5568',
            fontFamily: 'monospace'
          }}
        >
          {isSimulating ? ">> EXECUTING..." : ">> TRIGGER_TEST_SIM"}
        </button>
      </header>

      {/* High Density Data Table */}
      <div style={{ width: '100%' }}>
        {isLoading ? (
          <div style={{ padding: '2rem 0' }}>INITIALIZING_DATABASE_LINK...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2d3748', color: '#2d3748' }}>
                <th style={{ padding: '10px 8px', fontWeight: 'bold' }}>ID</th>
                <th style={{ padding: '10px 8px', fontWeight: 'bold' }}>PRIORITY</th>
                <th style={{ padding: '10px 8px', fontWeight: 'bold' }}>INCIDENT_TYPE</th>
                <th style={{ padding: '10px 8px', fontWeight: 'bold' }}>VALUE</th>
                <th style={{ padding: '10px 8px', fontWeight: 'bold' }}>TIMESTAMP</th>
                <th style={{ padding: '10px 8px', fontWeight: 'bold' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '4rem 0', textAlign: 'center', color: '#a0aec0' }}>
                    -- NO_RECORDS_TO_DISPLAY --
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr 
                    key={alert.id} 
                    style={{ 
                      borderBottom: '1px solid #e2e8f0',
                      color: alert.resolved ? '#a0aec0' : '#1a202c',
                      backgroundColor: !alert.resolved && alert.severity === 'high' ? '#fff5f5' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '12px 8px' }}>#{alert.id.toString().padStart(4, '0')}</td>
                    <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>
                      <span style={{ color: alert.resolved ? '#a0aec0' : (alert.severity === 'high' ? '#e53e3e' : '#d69e2e') }}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>{alert.alert_type.toUpperCase()}</td>
                    <td style={{ padding: '12px 8px' }}>
                       {alert.threshold_val.toFixed(2)} MG/L
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                       {new Date(alert.created_at).toISOString().replace('T', ' ').split('.')[0]}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      {!alert.resolved ? (
                        <button 
                          onClick={() => resolveAlert(alert.id)}
                          style={{ 
                            padding: '2px 8px', 
                            background: '#2d3748', 
                            color: 'white', 
                            border: 'none', 
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                            fontFamily: 'monospace'
                          }}
                        >
                          ACK_RESOLVE
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.7rem' }}>[ RESOLVED ]</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <footer style={{ marginTop: '4rem', fontSize: '0.7rem', color: '#a0aec0', borderTop: '1px dashed #cbd5e0', paddingTop: '1rem' }}>
        SYSTEM_ORIGIN: LIVE_TELEMETRY_PORT_8000 // STATION: HARTBEESPOORT_01
      </footer>
    </div>
  );
}
