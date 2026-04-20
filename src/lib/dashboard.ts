import { type CitizenReport, fetchReports } from "@/lib/reports";

export type TimeWindow = "24h" | "30d";
export type TrendMetric = "nitrate" | "phosphate" | "temperature";

export interface DashboardAlert {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
}

export interface CurrentReadings {
  ph: number;
  nitrate: number;
  temperature: number;
  dissolvedOxygen: number;
}

export type SensorSnapshot = CurrentReadings;

export interface TrendSeries {
  unit: string;
  points: number[];
}

export interface WeatherConditions {
  windSpeed: number;
  airTemp: number;
  windDirection: string | number;
}

export interface RecentReport {
  id: string;
  title: string;
  summary: string;
}

export interface SensorMapPoint {
  id: string;
  label: string;
  type: "sensor";
  lat: number;
  lng: number;
  latestReadings: SensorSnapshot; // No longer optional, map requires it
}

export interface ReportMapPoint {
  id: string;
  label: string;
  type: "report";
  lat: number;
  lng: number;
  reportSummary: string;
  reportedAt: string;
}

export type MapPoint = SensorMapPoint | ReportMapPoint;

export interface PollutionHotspot {
  id: string;
  lat: number;
  lng: number;
  intensity: "low" | "medium" | "high";
  radiusMeters: number;
}

export interface DashboardData {
  locationName: string;
  alerts: DashboardAlert[];
  currentReadings: CurrentReadings;
  trends: Record<TrendMetric, TrendSeries>;
  weather: WeatherConditions;
  recentReports: RecentReport[];
  mapPoints: MapPoint[];
  pollutionHotspots: PollutionHotspot[];
  indices: {
    correlation: number;
    pollutionHeatmap: number;
  };
}

const HARTBEESPOORT_DAM_COORDS = { lat: -25.7343, lng: 27.8587 };

// ---------------------------------------------------------
// BACKEND INTERFACES (Matches FastAPI schemas.py)
// ---------------------------------------------------------
interface BackendWaterReading {
  id: number;
  recorded_at: string;
  ph: number;
  temperature_c: number;
  nitrates_mg_l: number;
  phosphate_mg_l: number | null;
  turbidity_ntu: number;
  dissolved_oxygen_mg_l: number;
}

interface BackendWeatherReading {
  id: number;
  recorded_at: string;
  wind_speed_m_s: number;
  wind_direction_deg: number;
  air_temperature_c: number;
}

interface BackendSensorFeature {
  type: "Feature";
  id: number;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { 
    name: string; 
    sensor_type: string; 
    is_active: boolean;
    latest_readings?: {
      ph: number;
      nitrate: number;
      phosphate: number | null;
      temperature: number;
      dissolvedOxygen: number;
      turbidity: number;
    }
  };
}

// ---------------------------------------------------------
// FETCHING LOGIC
// ---------------------------------------------------------
async function fetchDashboardFromBackend(window: TimeWindow): Promise<Partial<DashboardData> | null> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) return null;

  const baseUrl = apiBaseUrl.replace(/\/$/, "");
  
  try {
    // Fetch live data from FastAPI in parallel
    const [waterRes, weatherRes, sensorsRes, alertsRes, hotspotsRes, wqiRes] = await Promise.all([
      fetch(`${baseUrl}/water-readings?limit=24`, { cache: "no-store" }),
      fetch(`${baseUrl}/weather-readings?limit=1`, { cache: "no-store" }),
      fetch(`${baseUrl}/map/sensors`, { cache: "no-store" }),
      fetch(`${baseUrl}/alerts`, { cache: "no-store" }),
      fetch(`${baseUrl}/analysis/hotspots`, { cache: "no-store" }),
      fetch(`${baseUrl}/analysis/wqi-summary`, { cache: "no-store" }),
    ]);

    if (!waterRes.ok || !weatherRes.ok || !sensorsRes.ok || !alertsRes.ok || !hotspotsRes.ok || !wqiRes.ok) {
      throw new Error("One or more backend requests failed.");
    }

    const waterData = (await waterRes.json()) as BackendWaterReading[];
    const weatherData = (await weatherRes.json()) as BackendWeatherReading[];
    const sensorsData = await sensorsRes.json();
    const hotspotsData = await hotspotsRes.json();
    const wqiData = await wqiRes.json();

    const partialDashboard: Partial<DashboardData> = {};

    // 1. Process Latest Water Readings
    if (waterData.length > 0) {
      const latestWater = waterData[0];
      partialDashboard.currentReadings = {
        ph: latestWater.ph,
        nitrate: latestWater.nitrates_mg_l,
        temperature: latestWater.temperature_c,
        dissolvedOxygen: latestWater.dissolved_oxygen_mg_l,
      };

      // Extract trend points (reverse so oldest is left, newest is right on chart)
      partialDashboard.trends = {
        nitrate: { unit: "mg/L", points: waterData.map(d => d.nitrates_mg_l).reverse() },
        temperature: { unit: "°C", points: waterData.map(d => d.temperature_c).reverse() },
        phosphate: { unit: "mg/L", points: waterData.map(d => d.phosphate_mg_l || 0).reverse() },
      };
    }

    // 2. Process Latest Weather Reading
    if (weatherData.length > 0) {
      const latestWeather = weatherData[0];
      partialDashboard.weather = {
        windSpeed: Math.round(latestWeather.wind_speed_m_s * 3.6), // convert m/s to km/h
        airTemp: latestWeather.air_temperature_c,
        windDirection: latestWeather.wind_direction_deg,
      };
    }

    // 3. Process Sensor Map Points with Real Readings from backend
    if (sensorsData && sensorsData.features) {
      partialDashboard.mapPoints = sensorsData.features.map((feature: BackendSensorFeature) => ({
        id: `sensor-${feature.id}`,
        label: feature.properties.name || "Unknown Sensor",
        type: "sensor",
        lng: feature.geometry.coordinates[0],
        lat: feature.geometry.coordinates[1],
        latestReadings: feature.properties.latest_readings || partialDashboard.currentReadings || {
          ph: 0,
          nitrate: 0,
          temperature: 0,
          dissolvedOxygen: 0
        }
      }));
    }

    // 4. Alerts
    const alertsData = await alertsRes.json();
    if (alertsData && alertsData.length > 0) {
      partialDashboard.alerts = alertsData.map((alert: any) => ({
        id: `alert-${alert.id}`,
        title: `${alert.alert_type} (${alert.severity.toUpperCase()})`,
        severity: alert.severity as "high" | "medium" | "low"
      }));
    }

    // 5. Hotspots and WQI
    partialDashboard.pollutionHotspots = hotspotsData;
    partialDashboard.indices = {
      correlation: 0.76, // We keep mock for now or could fetch from /analysis/correlations
      pollutionHeatmap: wqiData.current_wqi || 0
    };

    return partialDashboard;

  } catch (error) {
    console.warn("Falling back entirely to mock dashboard data", error);
    return null;
  }
}

// ---------------------------------------------------------
// DATA MERGING & MOCKS
// ---------------------------------------------------------
function getMockData(window: TimeWindow): DashboardData {
  return {
    locationName: "Hartbeespoort Dam",
    alerts: [{ id: "alert-1", title: "High nitrate levels detected", severity: "high" }],
    currentReadings: { ph: 7.2, nitrate: 8, temperature: 23, dissolvedOxygen: 5.6 },
    trends: {
      nitrate: { unit: "mg/L", points: [0.7, 1.2, 0.9, 2.8, 1.1, 0.8, 2.5] },
      phosphate: { unit: "mg/L", points: [0.2, 0.4, 0.6, 0.5, 0.7, 0.9] },
      temperature: { unit: "°C", points: [21, 22, 22, 23, 24, 23, 24] },
    },
    weather: { windSpeed: 12, airTemp: 24, windDirection: "NW" },
    recentReports: [],
    mapPoints: [],
    pollutionHotspots: [
      { id: "hotspot-central", lat: HARTBEESPOORT_DAM_COORDS.lat - 0.002, lng: HARTBEESPOORT_DAM_COORDS.lng + 0.004, intensity: "medium", radiusMeters: 520 },
    ],
    indices: { correlation: 0.76, pollutionHeatmap: 72 },
  };
}

export async function fetchDashboardData(window: TimeWindow): Promise<DashboardData> {
  // Get whatever live data we can from the backend
  const backendData = await fetchDashboardFromBackend(window);
  
  // Start with mock data, then overwrite it with any live data we successfully fetched
  const baseData = { ...getMockData(window), ...backendData };

  try {
    const reports = await fetchReports();
    return mergeReportsIntoDashboardData(baseData, reports as CitizenReport[]);
  } catch {
    return baseData;
  }
}

function getShortSummary(text: string, maxLength = 92): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function mapCitizenReportsToMapPoints(reports: CitizenReport[]): ReportMapPoint[] {
  return reports.map((report) => ({
    id: report.id,
    label: report.title,
    type: "report",
    lat: report.location.lat,
    lng: report.location.lng,
    reportSummary: report.description,
    reportedAt: report.submittedAt,
  }));
}

function mergeReportsIntoDashboardData(dashboardData: DashboardData, reports: CitizenReport[]): DashboardData {
  const sensorMapPoints = dashboardData.mapPoints.filter(point => point.type === "sensor");
  return {
    ...dashboardData,
    mapPoints: [...sensorMapPoints, ...mapCitizenReportsToMapPoints(reports)],
    recentReports: reports.slice(0, 3).map(report => ({
      id: report.id,
      title: report.title,
      summary: getShortSummary(report.description),
    })),
  };
}
