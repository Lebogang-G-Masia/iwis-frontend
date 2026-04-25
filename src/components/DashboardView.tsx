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
        activeAlerts: 0,
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

  // Filter and sort reports for the side menu (newest first)
  const recentReports = mapPoints
    .filter((p): p is Extract<MapPoint, { type: "report" }> => p.type === 'report')
    .sort((a, b) => new Date(b.reportedAt!).getTime() - new Date(a.reportedAt!).getTime())
    .slice(0, 6);

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
              <p style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem', fontWeight: 'bold' }}>
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
        <article className="dashboard-card" style={{ height: '100%', minHeight: '500px' }}>
          <h3 className="dashboard-card-title" style={{ borderBottom: '2px solid #edf2f7', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            Latest Observations
          </h3>
          <ul className="recent-reports-list" style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentReports.length > 0 ? (
              recentReports.map(report => (
                <li key={report.id} style={{ padding: '0.5rem 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#2d3748' }}>{report.label}</div>
                    <div style={{ fontSize: '0.7rem', color: '#a0aec0', whiteSpace: 'nowrap' }}>
                      {new Date(report.reportedAt!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#718096', marginTop: '0.25rem', lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {report.reportSummary}
                  </p>
                  <div style={{ borderBottom: '1px solid #f7fafc', marginTop: '0.75rem' }}></div>
                </li>
              ))
            ) : (
              <li style={{ textAlign: 'center', padding: '2rem', color: '#a0aec0', fontSize: '0.9rem' }}>
                No sightings reported yet.
              </li>
            )}
          </ul>
        </article>
      </aside>
    </section>
  );
}
