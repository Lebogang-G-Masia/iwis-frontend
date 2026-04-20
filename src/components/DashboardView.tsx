"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import GoogleHartbeespoortMap from "@/components/GoogleHartbeespoortMap";
import {
  type DashboardData,
  fetchDashboardData,
  type TimeWindow,
  type TrendMetric,
} from "@/lib/dashboard";

import { useLiveUpdates } from "@/lib/useLiveUpdates";

const windowOptions: Array<{ value: TimeWindow; label: string }> = [
  { value: "24h", label: "Last 24 Hours" },
  { value: "30d", label: "Last 30 Days" },
];

const metricOptions: Array<{ value: TrendMetric; label: string }> = [
  { value: "nitrate", label: "Nitrate" },
  { value: "phosphate", label: "Phosphate" },
  { value: "temperature", label: "Temperature" },
];

function buildChartPoints(values: number[]): string {
  if (values.length < 2) {
    return "";
  }

  const max = Math.max(...values, 0.1);

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - (value / max) * 82;
      return `${x},${y}`;
    })
    .join(" ");
}

export default function DashboardView() {
  const router = useRouter();
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("24h");
  const [metric, setMetric] = useState<TrendMetric>("nitrate");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const liveUpdate = useLiveUpdates();

  const handleReportMarkerClick = useCallback(
    (reportId: string) => {
      router.push(`/reports?reportId=${encodeURIComponent(reportId)}`);
    },
    [router],
  );

  const loadDashboard = useCallback(async () => {
    try {
      const data = await fetchDashboardData();
      setDashboardData(data);
      setLoadError(null);
    } catch {
      setLoadError("Dashboard data could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Handle live updates
  useEffect(() => {
    if (!liveUpdate) return;

    if (liveUpdate.type === "new_reading" || liveUpdate.type === "new_alert" || liveUpdate.type === "update_alert") {
      // Re-fetch everything to ensure consistent state
      loadDashboard();
    }
  }, [liveUpdate, loadDashboard]);

  const selectedTrend = dashboardData?.trends[metric];
  const chartPoints = useMemo(
    () => buildChartPoints(selectedTrend?.points ?? []),
    [selectedTrend],
  );
  const [showSensors, setShowSensors] = useState(true);
  const [showReports, setShowReports] = useState(true);

  const filteredMapPoints = useMemo(() => {
    return (dashboardData?.mapPoints ?? []).filter((point) => {
      if (point.type === "sensor") return showSensors;
      if (point.type === "report") return showReports;
      return true;
    });
  }, [dashboardData, showSensors, showReports]);

  const sensorCount =
    dashboardData?.mapPoints.filter((point) => point.type === "sensor").length ??
    0;
  const reportCount =
    dashboardData?.mapPoints.filter((point) => point.type === "report").length ??
    0;

  return (
    <section className="dashboard-layout">
      <div className="dashboard-main-column">
        <article className="dashboard-card map-card">
          <header className="dashboard-card-header">
            <h2 className="dashboard-card-title">{dashboardData?.locationName ?? "Hartbeespoort Dam"}</h2>

            <div className="dashboard-toggle" role="tablist" aria-label="Time window">
              {windowOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`dashboard-toggle-btn ${timeWindow === option.value ? "is-active" : ""}`}
                  onClick={() => setTimeWindow(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </header>

          <GoogleHartbeespoortMap
            mapPoints={filteredMapPoints}
            pollutionHotspots={dashboardData?.pollutionHotspots ?? []}
            onReportMarkerClick={handleReportMarkerClick}
          />

          <div className="map-footer-row">
            <div className="map-legend" aria-label="Pollution heatmap legend">
              <span className="legend-item">
                <span className="legend-swatch legend-low" />
                Low
              </span>
              <span className="legend-item">
                <span className="legend-swatch legend-medium" />
                Medium
              </span>
              <span className="legend-item">
                <span className="legend-swatch legend-high" />
                High
              </span>
            </div>

            <div className="map-tags">
              <button
                type="button"
                className={`map-tag is-sensor ${!showSensors ? "is-muted" : ""}`}
                onClick={() => setShowSensors(!showSensors)}
                title={showSensors ? "Hide sensors" : "Show sensors"}
              >
                {sensorCount} Sensor markers
              </button>
              <button
                type="button"
                className={`map-tag is-report ${!showReports ? "is-muted" : ""}`}
                onClick={() => setShowReports(!showReports)}
                title={showReports ? "Hide reports" : "Show reports"}
              >
                {reportCount} Report markers
              </button>
            </div>
          </div>
        </article>

        <article className="dashboard-card trend-card">
          <header className="dashboard-card-header">
            <h3 className="dashboard-card-title">Water Quality Trends</h3>
            <span className="dashboard-unit">{selectedTrend?.unit ?? "mg/L"}</span>
          </header>

          <div className="dashboard-toggle" role="tablist" aria-label="Metric tabs">
            {metricOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`dashboard-toggle-btn ${metric === option.value ? "is-active" : ""}`}
                onClick={() => setMetric(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="trend-grid">
            <div className="trend-chart-wrap">
              {chartPoints ? (
                <svg className="trend-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <line x1="0" y1="25" x2="100" y2="25" className="trend-grid-line" />
                  <line x1="0" y1="50" x2="100" y2="50" className="trend-grid-line" />
                  <line x1="0" y1="75" x2="100" y2="75" className="trend-grid-line" />
                  <polyline points={chartPoints} className="trend-line" />
                </svg>
              ) : (
                <div className="state-text">No trend data</div>
              )}

              <div className="trend-axis">
                <span>0 {selectedTrend?.unit ?? ""}</span>
                <span>Time</span>
              </div>
            </div>

            <aside className="recent-reports-panel">
              <div className="recent-reports-panel__header">
                <h4 className="panel-title">Recent Reports</h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Link href="/reports/new" className="reports-page__create-link" style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '999px' }}>
                    Report Sighting
                  </Link>
                  <Link href="/reports" className="reports-link-btn">
                    View all
                  </Link>
                </div>
              </div>
              <ul className="recent-reports-list">
                {dashboardData?.recentReports.map((report) => (
                  <li key={report.id} className="recent-report-item">
                    <h5>
                      <Link href={`/reports?reportId=${encodeURIComponent(report.id)}`}>
                        {report.title}
                      </Link>
                    </h5>
                    <p>{report.summary}</p>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </article>

        <article className="dashboard-card analysis-strip">
          <div className="analysis-item">
            <span className="analysis-label">Correlation Analysis</span>
            <strong>{dashboardData ? Math.round(dashboardData.indices.correlation * 100) : 0}%</strong>
          </div>
          <div className="analysis-item">
            <span className="analysis-label">Pollution Heatmap</span>
            <strong>{dashboardData?.indices.pollutionHeatmap ?? 0}</strong>
          </div>
        </article>
      </div>

      <aside className="dashboard-side-column">
        <article className="dashboard-card">
          <h3 className="dashboard-card-title">Alerts</h3>
          <ul className="alerts-list">
            {dashboardData?.alerts.map((alert) => (
              <li key={alert.id} className={`alert-item severity-${alert.severity}`}>
                {alert.title}
              </li>
            ))}
          </ul>
        </article>

        <article className="dashboard-card">
          <h3 className="dashboard-card-title">Current Readings</h3>
          <div className="readings-grid">
            <div className="reading-box">
              <span>pH</span>
              <strong>{dashboardData?.currentReadings.ph ?? "--"}</strong>
            </div>
            <div className="reading-box">
              <span>Nitrate</span>
              <strong>{dashboardData?.currentReadings.nitrate ?? "--"} mg/L</strong>
            </div>
            <div className="reading-box">
              <span>Temperature</span>
              <strong>{dashboardData?.currentReadings.temperature ?? "--"} °C</strong>
            </div>
            <div className="reading-box">
              <span>Dissolved O2</span>
              <strong>{dashboardData?.currentReadings.dissolvedOxygen ?? "--"} mg/L</strong>
            </div>
          </div>
        </article>

        <article className="dashboard-card">
          <h3 className="dashboard-card-title">Weather Conditions</h3>
          <div className="weather-list">
            <div className="weather-row">
              <span>Wind Speed</span>
              <strong>{dashboardData?.weather.windSpeed ?? "--"} km/h</strong>
            </div>
            <div className="weather-row">
              <span>Air Temp</span>
              <strong>{dashboardData?.weather.airTemp ?? "--"} °C</strong>
            </div>
            <div className="weather-row">
              <span>Wind Direction</span>
              <strong>{dashboardData?.weather.windDirection ?? "--"}</strong>
            </div>
          </div>
        </article>

        <article className="dashboard-card state-card">
          {isLoading && <p className="state-text">Loading dashboard data...</p>}
          {!isLoading && loadError && <p className="state-text is-error">{loadError}</p>}
          {!isLoading && !loadError && (
            <p className="state-text">Connected. Showing latest readings.</p>
          )}
        </article>
      </aside>
    </section>
  );
}
