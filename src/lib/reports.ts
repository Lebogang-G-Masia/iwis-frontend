export interface ReportLocation {
  lat: number;
  lng: number;
  area: string;
}

export interface CitizenReport {
  id: string;
  title: string;
  type: "field-worker" | "citizen-scientist" | "admin";
  submittedBy: string;
  description: string;
  photoUrl: string;
  submittedAt: string;
  location: ReportLocation;
}

// Added interface to match FastAPI's CitizenReportRead schema
interface BackendCitizenReport {
  id: number;
  created_at: string;
  description: string;
  photo_url: string | null;
  reporter_name: string | null;
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
  },
  {
    id: "rep-1002",
    title: "Algae Bloom at Northern Bank",
    type: "citizen-scientist",
    submittedBy: "Lerato K.",
    description: "Dark green algae mats observed drifting toward the boat launch area. Approximate spread: 80 to 120 meters.",
    photoUrl: "/report-photo.svg",
    submittedAt: "2026-03-08T14:10:00.000Z",
    location: { lat: -25.7219, lng: 27.8718, area: "Northern Bank" },
  },
];

// Translates FastAPI data to Next.js UI data
function mapBackendReportToFrontend(backendReport: BackendCitizenReport): CitizenReport {
  // Extract a short title from the description if it exists
  const extractedTitle = backendReport.description 
    ? backendReport.description.split('.')[0].slice(0, 40) + (backendReport.description.length > 40 ? "..." : "")
    : "Citizen Report";

  return {
    id: String(backendReport.id),
    title: extractedTitle,
    type: "citizen-scientist", // Defaulting as backend doesn't store this yet
    submittedBy: backendReport.reporter_name || "Anonymous",
    description: backendReport.description || "No description provided.",
    photoUrl: backendReport.photo_url || "/report-photo.svg",
    submittedAt: backendReport.created_at,
    location: {
      lat: backendReport.latitude,
      lng: backendReport.longitude,
      area: "Coordinates provided", 
    },
  };
}

async function fetchReportsFromBackend(): Promise<CitizenReport[] | null> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    return null;
  }

  // Updated endpoint to match main.py
  const endpoint = `${apiBaseUrl.replace(/\/$/, "")}/citizen-reports`;

  try {
    const response = await fetch(endpoint, { cache: "no-store" });
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
