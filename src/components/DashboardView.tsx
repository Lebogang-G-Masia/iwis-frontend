"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useLiveUpdates } from "@/lib/useLiveUpdates";
import type { MapPoint, PollutionHotspot, DashboardStats } from "@/lib/dashboard";

const GoogleHartbeespoortMap = dynamic(
  () => import("./GoogleHartbeespoortMap"),
  { 
    ssr: false,
    loading: () => <div className="google-map-frame loading-state">Initializing geospatial telemetry...</div>
  }
);

export default function DashboardView() {
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [hotspots, setHotspots] = useState<PollutionHotspot[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  
  const liveUpdate = useLiveUpdates();

  const fetchDashboardData = useCallback(async () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
    
    try {
      const [sensorsRes, reportsRes, hotspotsRes, wqiRes] = await Promise.all([
        fetch(`${apiBaseUrl}/map/sensors`),
        fetch(`${apiBaseUrl}/map/citizen-reports`),
        fetch(`${apiBaseUrl}/analysis/hotspots`),
        fetch(`${apiBaseUrl}/analysis/wqi-summary`)
      ]);

      const sensorsData = await sensorsRes.json();
      const reportsData = await reportsRes.json();
      const hotspotsData = await hotspotsRes.json();
      const wqiData = await wqiRes.json();

      const sensorPoints: MapPoint[] = sensorsData.features.map((f: any) => ({
        id: `sensor-${f.id}`,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        type: "sensor",
        label: f.properties.name,
        latestReadings: f.properties.latest_readings || { ph: 7, nitrate: 0, temperature: 20, dissolvedOxygen: 8 }
      }));

      const reportPoints: MapPoint[] = reportsData.features.map((f: any) => ({
        id: `report-${f.id}`,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        type: "report",
        label: f.properties.title || "Report",
        reportSummary: f.properties.description,
        reportedAt: f.properties.created_at
      }));

      setMapPoints([...sensorPoints, ...reportPoints]);
      setHotspots(hotspotsData);
      setStats({
        currentWqi: wqiData.current_wqi,
        wqiStatus: wqiData.status,
        activeAlerts: 0,
        recentReportsCount: reportPoints.length
      });
      setLastSync(new Date());
    } catch (err) {
      console.error("Dashboard sync error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (liveUpdate) fetchDashboardData();
  }, [liveUpdate, fetchDashboardData]);

  const latestReadings = mapPoints.filter(p => p.type === 'sensor')[0]?.latestReadings;

  if (isLoading) return (
    <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
       <div className="pulse-loader" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#2b6cb0', animation: 'pulse 1.5s infinite' }}></div>
       <p style={{ color: '#4a5568', fontWeight: 500 }}>Establishing secure link to dam sensors...</p>
    </div>
  );

  return (
    <div className="pro-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Status Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a202c', padding: '0.75rem 1.5rem', borderRadius: '8px', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#48bb78', boxShadow: '0 0 8px #48bb78' }}></span>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Online</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>
            Last Telemetry: {lastSync.toLocaleTimeString()}
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#63b3ed' }}>
          HARTBEESPOORT MONITORING STATION v2.1
        </div>
      </div>

      {/* Main Command Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        
        {/* KPI Card 1: WQI */}
        <article style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', borderTop: '4px solid #3182ce' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
             <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>Water Quality Index</span>
             <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#ebf8ff', color: '#2b6cb0' }}>LIVE</span>
          </header>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <strong style={{ fontSize: '2.5rem', color: '#1a202c' }}>{stats?.currentWqi}</strong>
            <span style={{ fontSize: '0.875rem', color: '#718096', fontWeight: 600 }}>/ 100</span>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: stats?.wqiStatus === 'Excellent' ? '#2f855a' : '#b7791f' }}>
             Condition: {stats?.wqiStatus}
          </div>
        </article>

        {/* KPI Card 2: Nitrate */}
        <article style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', borderTop: '4px solid #805ad5' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
             <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>Nitrate (NO3)</span>
             <span style={{ fontSize: '1.2rem' }}>🧪</span>
          </header>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <strong style={{ fontSize: '2.5rem', color: '#1a202c' }}>{latestReadings?.nitrate?.toFixed(2) || "0.00"}</strong>
            <span style={{ fontSize: '0.875rem', color: '#718096' }}>mg/L</span>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: (latestReadings?.nitrate || 0) > 5 ? '#e53e3e' : '#718096' }}>
             {(latestReadings?.nitrate || 0) > 5 ? "⚠️ THRESHOLD BREACH" : "✓ Within safety limits"}
          </div>
        </article>

        {/* KPI Card 3: pH Levels */}
        <article style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', borderTop: '4px solid #38b2ac' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
             <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>Alkalinity (pH)</span>
             <span style={{ fontSize: '1.2rem' }}>💧</span>
          </header>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <strong style={{ fontSize: '2.5rem', color: '#1a202c' }}>{latestReadings?.ph?.toFixed(1) || "7.0"}</strong>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#718096' }}>
             Current state: Neutral
          </div>
        </article>

        {/* KPI Card 4: Reports */}
        <article style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', borderTop: '4px solid #f6ad55' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
             <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>Sighting Reports</span>
             <span style={{ fontSize: '1.2rem' }}>📢</span>
          </header>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <strong style={{ fontSize: '2.5rem', color: '#1a202c' }}>{stats?.recentReportsCount}</strong>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#718096' }}>
             In past 30 days
          </div>
        </article>
      </div>

      {/* Map & List Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) 1fr', gap: '1.5rem' }}>
        
        {/* Interactive Map */}
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #edf2f7' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 'bold', color: '#2d3748' }}>Geospatial Analysis: Hartbeespoort Basin</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#718096', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i style={{ width: '8px', height: '8px', background: '#48bb78', borderRadius: '50%', display: 'inline-block' }}></i> Sensors
              </span>
              <span style={{ fontSize: '0.7rem', color: '#718096', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i style={{ width: '8px', height: '8px', background: '#3182ce', borderRadius: '50%', display: 'inline-block' }}></i> Reports
              </span>
            </div>
          </div>
          <GoogleHartbeespoortMap 
            mapPoints={mapPoints} 
            pollutionHotspots={hotspots} 
          />
        </div>

        {/* Observation Feed */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#2d3748', color: 'white', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔔 Intelligence Feed
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
              {mapPoints.filter(p => p.type === 'report').slice(0, 6).map(report => (
                <div key={report.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '3px solid #63b3ed' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{report.label}</div>
                  <div style={{ fontSize: '0.7rem', color: '#a0aec0', marginTop: '0.25rem' }}>
                    {new Date(report.reportedAt!).toLocaleDateString()} • {new Date(report.reportedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              {mapPoints.filter(p => p.type === 'report').length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#718096', fontSize: '0.875rem' }}>
                  No recent sightings logged.
                </div>
              )}
            </div>
          </div>

          <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #edf2f7' }}>
             <h4 style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Environmental Alerts</h4>
             <div style={{ padding: '0.75rem', borderRadius: '8px', background: (latestReadings?.nitrate || 0) > 5 ? '#fff5f5' : '#f0fff4', color: (latestReadings?.nitrate || 0) > 5 ? '#c53030' : '#2f855a', fontSize: '0.8rem', fontWeight: 'bold' }}>
                {(latestReadings?.nitrate || 0) > 5 ? "🔴 CRITICAL BREACH" : "🟢 ALL SYSTEMS CLEAR"}
             </div>
          </div>
        </aside>

      </div>

      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 0.4; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        .pro-dashboard {
          font-family: 'Inter', system-ui, sans-serif;
        }
      `}</style>
    </div>
  );
}
