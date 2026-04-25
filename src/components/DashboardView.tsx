"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useLiveUpdates } from "@/lib/useLiveUpdates";
import type { MapPoint, PollutionHotspot, DashboardStats } from "@/lib/dashboard";

// Dynamic import for Leaflet map to avoid SSR issues
const GoogleHartbeespoortMap = dynamic(
  () => import("./GoogleHartbeespoortMap"),
  { 
    ssr: false,
    loading: () => <div className="google-map-frame loading-state">Loading satellite data...</div>
  }
);

export default function DashboardView() {
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [hotspots, setHotspots] = useState<PollutionHotspot[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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

      if (!sensorsRes.ok || !reportsRes.ok) throw new Error("Failed to fetch map data");

      const sensorsData = await sensorsRes.json();
      const reportsData = await reportsRes.json();
      const hotspotsData = await hotspotsRes.json();
      const wqiData = await wqiRes.json();

      // Transform GeoJSON to MapPoints
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
        label: f.properties.title || "Environmental Sighting",
        reportSummary: f.properties.description,
        reportedAt: f.properties.created_at
      }));

      setMapPoints([...sensorPoints, ...reportPoints]);
      setHotspots(hotspotsData);
      setStats({
        currentWqi: wqiData.current_wqi,
        wqiStatus: wqiData.status,
        activeAlerts: 0, // Would be fetched from /alerts
        recentReportsCount: reportPoints.length
      });
      setError(null);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Unable to sync with live sensors.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle live updates from WebSocket
  useEffect(() => {
    if (liveUpdate) {
      console.log("Live update received, refreshing dashboard...");
      fetchDashboardData();
    }
  }, [liveUpdate, fetchDashboardData]);

  if (isLoading) return <div className="p-8 text-center">Loading dashboard insights...</div>;

  return (
    <section className="dashboard-layout">
      <div className="dashboard-main-column">
        <article className="dashboard-card map-card">
          <header className="dashboard-card-header">
            <h2 className="dashboard-card-title">Hartbeespoort Dam Status</h2>
            {error && <span style={{ color: '#e53e3e', fontSize: '0.8rem' }}>⚠️ Offline Mode</span>}
          </header>
          
          <GoogleHartbeespoortMap 
            mapPoints={mapPoints} 
            pollutionHotspots={hotspots} 
          />

          <div className="map-footer-row">
            <div className="map-legend">
              <span className="legend-item"><span className="legend-swatch legend-low"></span>Low Risk</span>
              <span className="legend-item"><span className="legend-swatch legend-high"></span>High Risk</span>
            </div>
            <div className="map-tags">
              <span className="map-tag is-sensor">{mapPoints.filter(p => p.type === 'sensor').length} Sensors</span>
              <span className="map-tag is-report">{mapPoints.filter(p => p.type === 'report').length} Reports</span>
            </div>
          </div>
        </article>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
           <article className="dashboard-card">
              <h3 className="dashboard-card-title">Water Quality Index</h3>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#2b6cb0' }}>
                {stats?.currentWqi || "--"}
              </div>
              <p style={{ textTransform: 'uppercase', tracking: '0.1em', fontSize: '0.75rem', fontWeight: 'bold' }}>
                Status: <span style={{ color: stats?.wqiStatus === 'Excellent' ? 'green' : '#b7791f' }}>{stats?.wqiStatus || "Unknown"}</span>
              </p>
           </article>
           <article className="dashboard-card">
              <h3 className="dashboard-card-title">Community Activity</h3>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#2d3748' }}>
                {stats?.recentReportsCount || 0}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#718096' }}>Active reports in current area</p>
           </article>
        </div>
      </div>

      <aside className="dashboard-side-column">
        <article className="dashboard-card">
          <h3 className="dashboard-card-title">Latest Observations</h3>
          <ul className="recent-reports-list" style={{ listStyle: 'none', padding: 0 }}>
            {mapPoints.filter(p => p.type === 'report').slice(0, 5).map(report => (
              <li key={report.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #edf2f7' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{report.label}</div>
                <div style={{ fontSize: '0.75rem', color: '#718096' }}>{new Date(report.reportedAt!).toLocaleDateString()}</div>
              </li>
            ))}
          </ul>
        </article>
      </aside>
    </section>
  );
}
