export interface ReportLocation {
  lat: number;
  lng: number;
  area: string;
}

export interface CitizenReport {
  id: string;
  title: string;
  type: string;
  submittedBy: string;
  description: string;
  photoUrl: string;
  submittedAt: string;
  location: ReportLocation;
  category: string;
  severity: string;
}

// Updated interface to match FastAPI's new CitizenReportRead schema
interface BackendCitizenReport {
  id: number;
  created_at: string;
  title: string | null;
  description: string;
  photo_url: string | null;
  reporter_name: string | null;
  reporter_role: string | null;
  report_type: string | null;
  severity: string | null;
  category: string | null;
  status: string;
  latitude: number;
  longitude: number;
}

const MOCK_REPORTS: CitizenReport[] = [
  {
    id: "rep-1001",
    title: "Foam Build-Up Near South Pier",
    type: "field-worker",
    submittedBy: "Thabo M.",
    description: "Visible white foam concentrated near the south pier for roughly 40 meters. Water odor is stronger than normal.",
    photoUrl: "/report-photo.svg",
    submittedAt: "2026-03-08T10:22:00.000Z",
    location: { lat: -25.7468, lng: 27.8438, area: "South Pier" },
    category: "pollution",
    severity: "medium"
  },
];

// Translates FastAPI data to Next.js UI data
function mapBackendReportToFrontend(backendReport: BackendCitizenReport): CitizenReport {
  return {
    id: String(backendReport.id),
    title: backendReport.title || "Environmental Sighting",
    type: backendReport.reporter_role || "citizen",
    submittedBy: backendReport.reporter_name || "Anonymous",
    description: backendReport.description || "No description provided.",
    photoUrl: backendReport.photo_url || "/report-photo.svg",
    submittedAt: backendReport.created_at,
    category: backendReport.category || "other",
    severity: backendReport.severity || "low",
    location: {
      lat: backendReport.latitude,
      lng: backendReport.longitude,
      area: backendReport.category ? backendReport.category.charAt(0).toUpperCase() + backendReport.category.slice(1) : "General Area", 
    },
  };
}

async function fetchReportsFromBackend(): Promise<CitizenReport[] | null> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
  const baseUrl = apiBaseUrl.replace(/\/$/, "");
  
  try {
    const response = await fetch(`${baseUrl}/citizen-reports`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Reports request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as BackendCitizenReport[];
    if (!Array.isArray(payload)) {
      return null;
    }

    return payload.map(mapBackendReportToFrontend);
  } catch (error) {
    console.warn("Falling back to mock reports data", error);
    return null;
  }
}

export async function fetchReports(): Promise<CitizenReport[]> {
  const backendData = await fetchReportsFromBackend();
  const reports = backendData && backendData.length > 0 ? backendData : MOCK_REPORTS;

  return [...reports].sort((a, b) => {
    const left = Date.parse(a.submittedAt);
    const right = Date.parse(b.submittedAt);
    return right - left;
  });
}
