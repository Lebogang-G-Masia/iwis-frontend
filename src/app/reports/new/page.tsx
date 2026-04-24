"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { type FormEvent, useState, useMemo } from "react";

const CreateReportMap = dynamic(
  () => import("@/components/CreateReportMap"),
  {
    ssr: false,
    loading: () => <div className="create-report-map__canvas create-report-map__loading">Loading map…</div>,
  },
);

type ReporterRole = "citizen" | "ground-worker" | "official";
type Severity = "low" | "medium" | "high" | "critical";

interface PinCoords {
  lat: number;
  lng: number;
}

export default function NewReportPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reporterRole, setReporterRole] = useState<ReporterRole>("citizen");
  const [category, setCategory] = useState("pollution");
  const [severity, setSeverity] = useState<Severity>("low");
  const [photoName, setPhotoName] = useState("");
  const [pinned, setPinned] = useState<PinCoords | null>(null);
  
  // Role-specific fields
  const [odourIntensity, setOdourIntensity] = useState("none");
  const [waterColour, setWaterColour] = useState("clear");
  const [affectedWildlife, setAffectedWildlife] = useState("");
  const [infrastructureStatus, setInfrastructureStatus] = useState("operational");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { id: "pollution", label: "Water Pollution" },
    { id: "wildlife", label: "Wildlife \u0026 Ecology" },
    { id: "infrastructure", label: "Infrastructure Issue" },
    { id: "hyacinth", label: "Hyacinth Overgrowth" },
    { id: "other", label: "Other" },
  ];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!pinned) {
      setError("Please pin a location on the map before submitting.");
      setIsSubmitting(false);
      return;
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
    
    // Constructing role-specific data
    const roleSpecificData: Record<string, any> = {};
    if (reporterRole === "ground-worker") {
      roleSpecificData.odour_intensity = odourIntensity;
      roleSpecificData.water_colour = waterColour;
    }
    if (category === "wildlife") {
      roleSpecificData.affected_wildlife = affectedWildlife;
    }
    if (category === "infrastructure") {
      roleSpecificData.infrastructure_status = infrastructureStatus;
    }

    const payload = {
      title,
      description,
      reporter_name: "Anonymous User", // Could be expanded to a name field
      reporter_role: reporterRole,
      report_type: category === "pollution" ? "incident" : "observation",
      severity,
      category,
      latitude: pinned.lat,
      longitude: pinned.lng,
      photo_url: photoName ? `/uploads/${photoName}` : null,
      role_specific_data: roleSpecificData,
    };

    try {
      const response = await fetch(`${apiBaseUrl}/citizen-reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save report to database.");
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the backend. Is FastAPI running?");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page-content create-report-page">
      <header className="create-report-page__header">
        <div>
          <h2 className="page-title">Submit Environmental Report</h2>
          <p className="page-description">
            Capture field observations to help monitor Hartbeespoort Dam.
          </p>
        </div>

        <div className="create-report-page__actions">
          <Link className="reports-page__dashboard-link" href="/reports">
            Back to Reports
          </Link>
        </div>
      </header>

      <form className="create-report-form" onSubmit={onSubmit}>
        <div className="create-report-grid">
          <article className="create-report-map-panel">
            <p className="create-report-map-hint">1. Select sighting location on the map</p>
            <CreateReportMap pinned={pinned} onPin={setPinned} />
            {pinned && (
              <p className="create-report-map-coords">
                📍 {pinned.lat.toFixed(5)}, {pinned.lng.toFixed(5)}
              </p>
            )}

            <div style={{ marginTop: '1.5rem' }}>
              <label className="create-report-upload-box" htmlFor="camera-upload">
                <span aria-hidden="true">📷</span>
                <span>Attach Photo Evidence</span>
              </label>
              <input
                id="camera-upload"
                type="file"
                accept="image/*"
                className="create-report-file-input"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setPhotoName(file?.name ?? "");
                }}
              />
              {photoName && <p className="create-report-file-name">{photoName}</p>}
            </div>
          </article>

          <article className="create-report-fields">
            {error && <p className="create-report-error" style={{color: 'red', marginBottom: '1rem'}}>{error}</p>}
            
            <div className="form-section">
              <label className="create-report-label">I am a...</label>
              <div className="role-selector" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {(["citizen", "ground-worker", "official"] as ReporterRole[]).map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setReporterRole(role)}
                    className={`role-btn ${reporterRole === role ? 'is-active' : ''}`}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      background: reporterRole === role ? '#2b6cb0' : 'white',
                      color: reporterRole === role ? 'white' : 'black',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    {role.replace('-', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <label className="create-report-label" htmlFor="report-title">Report Title</label>
            <input
              id="report-title"
              className="create-report-input"
              placeholder="e.g., Algal bloom near West shore"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              disabled={isSubmitting || submitted}
            />

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="create-report-label" htmlFor="report-category">Category</label>
                <select
                  id="report-category"
                  className="create-report-input"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  disabled={isSubmitting || submitted}
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="create-report-label" htmlFor="report-severity">Severity</label>
                <select
                  id="report-severity"
                  className="create-report-input"
                  value={severity}
                  onChange={(event) => setSeverity(event.target.value as Severity)}
                  disabled={isSubmitting || submitted}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Dynamic Fields for Ground Workers */}
            {reporterRole === "ground-worker" && (
              <div className="role-specific-fields" style={{ background: '#f7fafc', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', borderLeft: '4px solid #2b6cb0' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Field Technician Assessment</h4>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label className="create-report-label" style={{ fontSize: '0.75rem' }}>Odour Intensity</label>
                    <select className="create-report-input" value={odourIntensity} onChange={e => setOdourIntensity(e.target.value)}>
                      <option value="none">None</option>
                      <option value="mild">Mild</option>
                      <option value="strong">Strong</option>
                      <option value="overwhelming">Overwhelming</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="create-report-label" style={{ fontSize: '0.75rem' }}>Water Colour</label>
                    <select className="create-report-input" value={waterColour} onChange={e => setWaterColour(e.target.value)}>
                      <option value="clear">Clear</option>
                      <option value="green">Green (Algae)</option>
                      <option value="brown">Brown (Silt)</option>
                      <option value="grey">Grey (Sewage?)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Category Specific Fields */}
            {category === "wildlife" && (
              <div style={{ marginBottom: '1rem' }}>
                <label className="create-report-label">Affected Wildlife</label>
                <input 
                  className="create-report-input" 
                  placeholder="e.g., Fish species, number of birds..." 
                  value={affectedWildlife}
                  onChange={e => setAffectedWildlife(e.target.value)}
                />
              </div>
            )}

            <label className="create-report-label" htmlFor="report-description">Detailed Observations</label>
            <textarea
              id="report-description"
              className="create-report-input create-report-textarea"
              placeholder="Provide more context about what you've found..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              disabled={isSubmitting || submitted}
            />

            <button type="submit" className="create-report-submit-btn" disabled={isSubmitting || submitted}>
              {isSubmitting ? "Submitting..." : submitted ? "Report Submitted ✓" : "Submit Report"}
            </button>
          </article>
        </div>

        {submitted && (
          <div className="create-report-success" style={{marginTop: '2rem', padding: '1rem', background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '4px', color: '#22543d'}}>
            <strong>Success!</strong> Your report has been securely saved to the database. Ground workers will be notified if the severity is high.
          </div>
        )}
      </form>
    </section>
  );
}
