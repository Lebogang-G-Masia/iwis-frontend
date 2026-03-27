"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { type FormEvent, useState } from "react";

const CreateReportMap = dynamic(
  () => import("@/components/CreateReportMap"),
  {
    ssr: false,
    loading: () => <div className="create-report-map__canvas create-report-map__loading">Loading map…</div>,
  },
);

type ReportType = "field-worker" | "citizen-scientist" | "admin";

interface PinCoords {
  lat: number;
  lng: number;
}

export default function NewReportPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reportType, setReportType] = useState<ReportType>("citizen-scientist");
  const [photoName, setPhotoName] = useState("");
  const [pinned, setPinned] = useState<PinCoords | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!pinned) {
      setError("Please pin a location on the map before submitting.");
      setIsSubmitting(false);
      return;
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    
    // Constructing payload to match FastAPI CitizenReportCreate schema
    const payload = {
      description: `${title} - ${description}`,
      reporter_name: reportType, 
      photo_url: photoName ? `/uploads/${photoName}` : null,
      latitude: pinned.lat,
      longitude: pinned.lng,
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
      // Optional: Clear form here if you want to allow multiple submissions
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
          <h2 className="page-title">Submit Citizen Sighting</h2>
          <p className="page-description">
            Capture a new report around Hartbeespoort Dam. This now saves directly to the backend.
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
            <p className="create-report-map-hint">Click on the map to pin the sighting location.</p>
            <CreateReportMap pinned={pinned} onPin={setPinned} />
            {pinned && (
              <p className="create-report-map-coords">
                📍 {pinned.lat.toFixed(5)}, {pinned.lng.toFixed(5)}
              </p>
            )}

            <label className="create-report-upload-box" htmlFor="camera-upload">
              <span aria-hidden="true">📷</span>
              <span>Attach Photo</span>
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
          </article>

          <article className="create-report-fields">
            {error && <p className="create-report-error" style={{color: 'red', marginBottom: '1rem'}}>{error}</p>}
            
            <label className="create-report-label" htmlFor="report-title">
              Report Title / Summary
            </label>
            <input
              id="report-title"
              className="create-report-input"
              placeholder="Concern Sighting"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              disabled={isSubmitting || submitted}
            />

            <label className="create-report-label" htmlFor="report-description">
              Description
            </label>
            <textarea
              id="report-description"
              className="create-report-input create-report-textarea"
              placeholder="Describe what you observed..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              disabled={isSubmitting || submitted}
            />

            <label className="create-report-label" htmlFor="report-type">
              Report Type
            </label>
            <select
              id="report-type"
              className="create-report-input"
              value={reportType}
              onChange={(event) => setReportType(event.target.value as ReportType)}
              disabled={isSubmitting || submitted}
            >
              <option value="field-worker">Field Worker</option>
              <option value="citizen-scientist">Citizen Scientist</option>
              <option value="admin">Admin</option>
            </select>

            <button type="submit" className="create-report-submit-btn" disabled={isSubmitting || submitted}>
              {isSubmitting ? "Submitting..." : submitted ? "Submitted!" : "Submit"}
            </button>
          </article>
        </div>

        {submitted && (
          <p className="create-report-success" style={{marginTop: '2rem', color: 'green', fontWeight: 'bold'}}>
            Report successfully saved to the database! You can view it on the Reports page.
          </p>
        )}
      </form>
    </section>
  );
}
