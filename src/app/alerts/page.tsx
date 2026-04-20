"use client";

import { useEffect, useRef, useState } from "react";
import { fetchDashboardData, type SensorMapPoint } from "@/lib/dashboard";

type ParameterKey = "ph" | "temperature" | "nitrate" | "dissolvedOxygen";
type AlertStatus = "active" | "resolved" | "dismissed";
type SensorReading = {
  id: string;
  location: string;
  values: Record<ParameterKey, number>;
};

type AlertItem = {
  id: string;
  parameter: ParameterKey;
  location: string;
  value: number;
  threshold: number;
  timestamp: number;
  status: AlertStatus;
};

type NotificationState = {
  visible: boolean;
  alertId: string | null;
  message: string;
};

const PARAMETER_META: Record<
  ParameterKey,
  { label: string; unit: string; threshold: number; min: number; max: number }
> = {
  ph: { label: "PH", unit: "pH", threshold: 8.5, min: 6.0, max: 10.0 },
  temperature: { label: "Temperature", unit: "C", threshold: 25.0, min: 15, max: 30 },
  nitrate: { label: "Nitrate", unit: "mg/L", threshold: 5.0, min: 0.5, max: 15 },
  dissolvedOxygen: { label: "Dissolved Oxygen", unit: "mg/L", threshold: 12.0, min: 4.0, max: 14.5 },
};

function formatTimestamp(timestamp: number | string) {
  return new Date(timestamp).toLocaleString("en-ZA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ---------------------------------------------------------
// BACKEND INTERFACES
// ---------------------------------------------------------
interface BackendAlert {
  id: number;
  reading_id: number;
  alert_type: string;
  severity: string;
  threshold_val: number;
  created_at: string;
  resolved: boolean;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [isSensorLoading, setIsSensorLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationState>({
    visible: false,
    alertId: null,
    message: "",
  });
  const [highlightedAlertId, setHighlightedAlertId] = useState<string | null>(null);
  const [monitoring, setMonitoring] = useState(true);

  const panelRef = useRef<HTMLDivElement>(null);
  
  const [resolvedCount, setResolvedCount] = useState(0);
  const [dismissedCount, setDismissedCount] = useState(0);

  // Initial load of alerts from backend
  useEffect(() => {
    async function loadAlerts() {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      try {
        const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/alerts`, { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as BackendAlert[];
          const mappedAlerts: AlertItem[] = data.map((a: BackendAlert) => ({
            id: String(a.id),
            parameter: "nitrate", // Assuming only nitrate alerts for now
            location: "Sensor " + a.reading_id, // We'd need to resolve sensor location properly in production
            value: a.threshold_val, // Assuming value is approx threshold for demo
            threshold: a.threshold_val,
            timestamp: new Date(a.created_at).getTime(),
            status: a.resolved ? "resolved" : "active",
          }));
          setAlerts(mappedAlerts);
        }
      } catch (err) {
        console.error("Failed to load initial alerts", err);
      }
    }
    loadAlerts();
  }, []);

  // Initial load of sensors
  useEffect(() => {
    fetchDashboardData()
      .then((data) => {
        const sensors = data.mapPoints
          .filter((point): point is SensorMapPoint => point.type === "sensor")
          .map((point) => ({
            id: point.id,
            location: point.label,
            values: {
              ph: point.latestReadings.ph,
              nitrate: point.latestReadings.nitrate,
              temperature: point.latestReadings.temperature,
              dissolvedOxygen: point.latestReadings.dissolvedOxygen,
            },
          }));
        setSensorReadings(sensors);
        setIsSensorLoading(false);
      })
      .catch(() => {
        setIsSensorLoading(false);
      });
  }, []);

  // WebSocket Connection
  useEffect(() => {
    if (!monitoring) return;

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const wsUrl = apiBaseUrl.replace(/^http/, "ws") + "/ws/live";
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "new_reading") {
          const reading = payload.data;
          setSensorReadings((current) => {
            const updated = [...current];
            const idx = updated.findIndex((s) => s.id === `sensor-${reading.sensor_id}`);
            if (idx >= 0) {
              updated[idx].values = {
                ph: reading.ph,
                nitrate: reading.nitrates_mg_l,
                temperature: reading.temperature_c,
                dissolvedOxygen: reading.dissolved_oxygen_mg_l,
              };
            }
            return updated;
          });
        } else if (payload.type === "new_alert") {
          const alertData = payload.data;
          const newAlert: AlertItem = {
            id: String(alertData.id),
            parameter: "nitrate",
            location: "Sensor " + alertData.reading_id,
            value: alertData.threshold_val + 0.5, // Just for display
            threshold: alertData.threshold_val,
            timestamp: new Date(alertData.created_at).getTime(),
            status: "active",
          };
          setAlerts((current) => [newAlert, ...current]);
          setNotification({
            visible: true,
            alertId: newAlert.id,
            message: `High nitrate detected`,
          });
        } else if (payload.type === "update_alert") {
          const alertData = payload.data;
          setAlerts((current) => 
            current.map((a) => a.id === String(alertData.id) ? { ...a, status: alertData.resolved ? "resolved" : "active" } : a)
          );
        }
      } catch (err) {
        console.error("Error processing websocket message", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [monitoring]);

  useEffect(() => {
    if (!notification.visible) {
      return;
    }

    const timeout = setTimeout(() => {
      setNotification((current) => ({ ...current, visible: false }));
    }, 8000);

    return () => clearTimeout(timeout);
  }, [notification.visible]);

  const activeCount = alerts.filter(a => a.status === 'active').length;

  const handlePopupClick = () => {
    if (!notification.alertId) {
      return;
    }

    setHighlightedAlertId(notification.alertId);
    setNotification((current) => ({ ...current, visible: false }));
    const alertElement = document.getElementById(notification.alertId);
    alertElement?.scrollIntoView({ behavior: "smooth", block: "center" });
    panelRef.current?.focus();
  };

  const updateAlertStatus = async (id: string, status: Exclude<AlertStatus, "active">) => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    try {
      const resolved = status === "resolved";
      await fetch(`${apiBaseUrl.replace(/\/$/, "")}/alerts/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resolved })
      });
      // The websocket will broadcast the update and update our state
      if (status === "resolved") {
        setResolvedCount((current) => current + 1);
      } else {
        setDismissedCount((current) => current + 1);
      }
    } catch (err) {
      console.error("Failed to update alert status", err);
    }
  };

  return (
    <section className="page-content alerts-page">
      <div className="alerts-header-row">
        <div>
          <h2 className="page-title">Alerts</h2>
          <p className="page-description alerts-description">
            Monitor threshold breaches in real time and respond quickly to high-risk parameters.
          </p>
        </div>
        <button
          type="button"
          className={`alerts-monitor-btn ${monitoring ? "is-active" : ""}`}
          onClick={() => setMonitoring((current) => !current)}
        >
          {monitoring ? "Monitoring On" : "Monitoring Paused"}
        </button>
      </div>

      <div className="alerts-summary-row">
        <article className="alerts-summary-card">
          <span>Active</span>
          <strong>{activeCount}</strong>
        </article>
        <article className="alerts-summary-card">
          <span>Resolved</span>
          <strong>{resolvedCount}</strong>
        </article>
        <article className="alerts-summary-card">
          <span>Dismissed</span>
          <strong>{dismissedCount}</strong>
        </article>
      </div>

      <div className="alerts-layout">
        <div className="alerts-main-panel">
          <div className="alerts-card">
            <h3>Live Sensor Data</h3>
            <p>Alerts are generated from these live readings whenever values cross thresholds.</p>
            {isSensorLoading ? (
              <p className="alerts-empty">Loading sensor data...</p>
            ) : (
              <table className="alerts-threshold-table">
                <thead>
                  <tr>
                    <th scope="col">Location</th>
                    <th scope="col">pH</th>
                    <th scope="col">Nitrate</th>
                    <th scope="col">Temp (C)</th>
                    <th scope="col">DO (mg/L)</th>
                  </tr>
                </thead>
                <tbody>
                  {sensorReadings.map((sensor) => (
                    <tr key={sensor.id}>
                      <td>{sensor.location}</td>
                      <td>{sensor.values.ph}</td>
                      <td>{sensor.values.nitrate}</td>
                      <td>{sensor.values.temperature}</td>
                      <td>{sensor.values.dissolvedOxygen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="alerts-card">
            <h3>Threshold Configuration</h3>
            <p>
              Alerts trigger automatically when a parameter value exceeds its configured threshold.
            </p>
            <table className="alerts-threshold-table">
              <thead>
                <tr>
                  <th scope="col">Parameter</th>
                  <th scope="col">Threshold</th>
                  <th scope="col">Unit</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(PARAMETER_META) as ParameterKey[]).map((key) => (
                  <tr key={key}>
                    <td>{PARAMETER_META[key].label}</td>
                    <td>{PARAMETER_META[key].threshold}</td>
                    <td>{PARAMETER_META[key].unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="alerts-panel" ref={panelRef} tabIndex={-1}>
          <div className="alerts-panel__header">
            <h3>Alert Panel</h3>
            <span>{activeCount} active</span>
          </div>

          {alerts.length === 0 ? (
            <p className="alerts-empty">No alerts triggered yet.</p>
          ) : (
            <ul className="alerts-feed" aria-live="polite">
              {alerts.map((alert) => {
                const meta = PARAMETER_META[alert.parameter];
                const isHighlighted = highlightedAlertId === alert.id;
                return (
                  <li
                    key={alert.id}
                    id={alert.id}
                    className={`alerts-feed-item status-${alert.status} ${isHighlighted ? "is-highlighted" : ""}`}
                  >
                    <div className="alerts-feed-item__top">
                      <strong>{meta.label}</strong>
                      <span className={`alerts-status-chip status-${alert.status}`}>{alert.status}</span>
                    </div>
                    <p>
                      <span>Location:</span> {alert.location}
                    </p>
                    <p>
                      <span>Value:</span> {alert.value} {meta.unit} (threshold {alert.threshold} {meta.unit})
                    </p>
                    <p>
                      <span>Timestamp:</span> {formatTimestamp(alert.timestamp)}
                    </p>

                    {alert.status === "active" ? (
                      <div className="alerts-actions">
                        <button type="button" onClick={() => updateAlertStatus(alert.id, "resolved")}>
                          Resolve
                        </button>
                        <button type="button" onClick={() => updateAlertStatus(alert.id, "dismissed")}>
                          Dismiss
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      {notification.visible ? (
        <button type="button" className="alerts-toast" onClick={handlePopupClick}>
          <strong>New Alert Triggered</strong>
          <span>{notification.message}</span>
          <small>Click to open and highlight in the alert panel.</small>
        </button>
      ) : null}
    </section>
  );
}
