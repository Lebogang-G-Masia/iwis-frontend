"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { type CitizenReport, fetchReports } from "@/lib/reports";
import { useLiveUpdates } from "@/lib/useLiveUpdates";

const ReportsLocationMap = dynamic(
  () => import("@/components/ReportsLocationMap"),
  {
    ssr: false,
    loading: () => <p className="state-text">Loading map...</p>,
  },
);

function formatReportDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function previewDescription(value: string): string {
  if (value.length <= 96) {
    return value;
  }

  return `${value.slice(0, 96).trim()}...`;
}

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const requestedReportId = searchParams.get("reportId");
  const liveUpdate = useLiveUpdates();

  const loadReports = useCallback(async () => {
    try {
      const data = await fetchReports();
      setReports(data);
      setLoadError(null);
    } catch {
      setLoadError("Reports could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // WebSocket live updates
  useEffect(() => {
    if (liveUpdate) {
      loadReports();
    }
  }, [liveUpdate, loadReports]);

  useEffect(() => {
    if (reports.length === 0) {
      setSelectedReportId(null);
      return;
    }

    if (requestedReportId && reports.some((report) => report.id === requestedReportId)) {
      setSelectedReportId(requestedReportId);
      return;
    }

    setSelectedReportId((current) => {
      if (current && reports.some((report) => report.id === current)) {
        return current;
      }

      return reports[0]?.id ?? null;
    });
  }, [reports, requestedReportId]);

  function handleSelectReport(reportId: string) {
    setSelectedReportId(reportId);

    const params = new URLSearchParams(searchParams.toString());
    params.set("reportId", reportId);
    router.replace(`/reports?${params.toString()}`, { scroll: false });
  }

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? null,
    [reports, selectedReportId],
  );

  return (
    <section className="page-content reports-page">
      <header className="reports-page__header">
        <div>
          <h2 className="page-title">Reports</h2>
          <p className="page-description">
            View all submitted reports on the map and select any marker or list item
            to read the full report details.
          </p>
        </div>
        <div className="reports-page__actions">
          <Link className="reports-page__create-link" href="/reports/new">
            Create Report
          </Link>
          <Link className="reports-page__dashboard-link" href="/">
            Back to Dashboard
          </Link>
        </div>
      </header>

      {isLoading && <p className="state-text">Loading reports...</p>}
      {!isLoading && loadError && <p className="state-text is-error">{loadError}</p>}

      {!isLoading && !loadError && (
        <div className="reports-layout">
          <article className="reports-card reports-map-card">
            <div className="reports-card__title-row">
              <h3>Map of Report Locations</h3>
              <span>{reports.length} reports total</span>
            </div>

            <div className="reports-map" role="region" aria-label="Reports map with markers">
              <ReportsLocationMap
                reports={reports}
                selectedReportId={selectedReportId}
                onSelectReport={handleSelectReport}
              />
            </div>
          </article>

          <article className="reports-card reports-detail-card" style={{ maxHeight: '800px', overflowY: 'auto' }}>
            <h3>Full Report Details</h3>
            {selectedReport ? (
              <div className="report-detail">
                <Image
                  src={selectedReport.photoUrl}
                  alt={selectedReport.title}
                  width={800}
                  height={450}
                  style={{ borderRadius: '8px', marginBottom: '1rem' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '1.25rem' }}>{selectedReport.title}</h4>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      background: selectedReport.severity === 'high' ? '#fed7d7' : '#feebc8',
                      color: selectedReport.severity === 'high' ? '#9b2c2c' : '#9c4221',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}>
                      {selectedReport.severity} Priority
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                    <div>
                      <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Reporter</p>
                      <p style={{ margin: 0, fontWeight: 600 }}>{selectedReport.submittedBy}</p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#718096' }}>{selectedReport.type.toUpperCase()}</p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Category</p>
                      <p style={{ margin: 0, fontWeight: 600 }}>{selectedReport.category.toUpperCase()}</p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#718096' }}>{selectedReport.location.area}</p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Timestamp</p>
                      <p style={{ margin: 0, fontWeight: 600 }}>{formatReportDate(selectedReport.submittedAt)}</p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Geodata</p>
                      <p style={{ margin: 0, fontWeight: 600, fontFamily: 'monospace' }}>
                        {selectedReport.location.lat.toFixed(5)}, {selectedReport.location.lng.toFixed(5)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Observation</p>
                    <p style={{ margin: 0, lineHeight: 1.6, color: '#1e293b' }}>{selectedReport.description}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="state-text">Select a marker or report to view details.</p>
            )}
          </article>

          <article className="reports-card reports-list-card">
            <h3>All Submitted Reports</h3>
            <ul className="reports-list">
              {reports.map((report) => {
                const isSelected = report.id === selectedReportId;

                return (
                  <li key={report.id}>
                    <button
                      type="button"
                      className={`reports-list__item ${isSelected ? "is-selected" : ""}`}
                      onClick={() => handleSelectReport(report.id)}
                      style={{ padding: '1rem' }}
                    >
                      <div className="reports-list__meta" style={{ marginBottom: '0.5rem' }}>
                        <strong style={{ fontSize: '1rem' }}>{report.title}</strong>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{formatReportDate(report.submittedAt)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '3px', background: '#e2e8f0', color: '#475569', fontWeight: 'bold', textTransform: 'uppercase' }}>
                          {report.category}
                        </span>
                        <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '3px', background: report.severity === 'high' ? '#fed7d7' : '#edf2f7', color: report.severity === 'high' ? '#9b2c2c' : '#475569', fontWeight: 'bold', textTransform: 'uppercase' }}>
                          {report.severity} Priority
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.4 }}>{previewDescription(report.description)}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </article>
        </div>
      )}
    </section>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<p className="state-text">Loading page content...</p>}>
      <ReportsContent />
    </Suspense>
  );
}
