"use client";

import { useEffect, useRef } from "react";
import type { MapPoint, PollutionHotspot } from "@/lib/dashboard";

interface GoogleHartbeespoortMapProps {
  title?: string;
  mapPoints: MapPoint[];
  pollutionHotspots: PollutionHotspot[];
  onReportMarkerClick?: (reportId: string) => void;
}

const MAP_CENTER: [number, number] = [-25.7343, 27.8587];

const hotspotStyles: Record<
  PollutionHotspot["intensity"],
  { stroke: string; fill: string }
> = {
  low: {
    stroke: "#2f855a",
    fill: "#8fd8a8",
  },
  medium: {
    stroke: "#b7791f",
    fill: "#f6cf6a",
  },
  high: {
    stroke: "#c53030",
    fill: "#f79aa0",
  },
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildSensorPopup(point: Extract<MapPoint, { type: "sensor" }>): string {
  return `
    <div class="map-popup">
      <h4>${escapeHtml(point.label)}</h4>
      <p><strong>pH:</strong> ${point.latestReadings.ph}</p>
      <p><strong>Nitrate:</strong> ${point.latestReadings.nitrate} mg/L</p>
      <p><strong>Temperature:</strong> ${point.latestReadings.temperature} °C</p>
      <p><strong>Dissolved O2:</strong> ${point.latestReadings.dissolvedOxygen} mg/L</p>
    </div>
  `;
}

function buildReportPopup(point: Extract<MapPoint, { type: "report" }>): string {
  const reportedAtDate = new Date(point.reportedAt);
  const reportedAt = Number.isNaN(reportedAtDate.getTime())
    ? point.reportedAt
    : reportedAtDate.toLocaleString();

  return `
    <div class="map-popup">
      <h4>${escapeHtml(point.label)}</h4>
      <p>${escapeHtml(point.reportSummary)}</p>
      <p><strong>Reported:</strong> ${escapeHtml(reportedAt)}</p>
    </div>
  `;
}

export default function GoogleHartbeespoortMap({
  title = "Hartbeespoort Dam map",
  mapPoints,
  pollutionHotspots,
  onReportMarkerClick,
}: GoogleHartbeespoortMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const layersRef = useRef<import("leaflet").LayerGroup | null>(null);

  useEffect(() => {
    let isDisposed = false;

    async function initializeMap() {
      const L = await import("leaflet");

      if (!mapRef.current || isDisposed) return;

      // Ensure we don't initialize twice
      if (mapInstanceRef.current) return;

      const map = L.map(mapRef.current, {
        center: MAP_CENTER,
        zoom: 12,
        minZoom: 10,
        maxZoom: 17,
        zoomControl: true,
      });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      layersRef.current = L.layerGroup().addTo(map);
      
      // Force an initial update
      updateLayers();
    }

    initializeMap();

    return () => {
      isDisposed = true;
      if (mapInstanceRef.current) {
        // Attempt to stop animations before removing
        const map = mapInstanceRef.current;
        // @ts-ignore - accessing private or less common properties to ensure safety
        if (map._mapPane) {
            map.remove();
        }
        mapInstanceRef.current = null;
        layersRef.current = null;
      }
    };
  }, []);

  // Update layers when props change
  useEffect(() => {
    updateLayers();
  }, [mapPoints, pollutionHotspots, onReportMarkerClick]);

  async function updateLayers() {
    const L = await import("leaflet");
    const map = mapInstanceRef.current;
    const layerGroup = layersRef.current;

    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    pollutionHotspots.forEach((hotspot) => {
      const style = hotspotStyles[hotspot.intensity];
      L.circle([hotspot.lat, hotspot.lng], {
        radius: hotspot.radiusMeters,
        color: style.stroke,
        fillColor: style.fill,
        fillOpacity: 0.36,
        weight: 1.2,
      })
        .addTo(layerGroup)
        .bindTooltip(`Pollution hotspot (${hotspot.intensity})`);
    });

    mapPoints.forEach((point) => {
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 8,
        color: "#ffffff",
        weight: 2,
        fillColor: point.type === "sensor" ? "#1f8a47" : "#2b6cb0",
        fillOpacity: 0.95,
      }).addTo(layerGroup);

      marker.bindTooltip(point.type === "sensor" ? "Sensor" : "Report", {
        direction: "top",
        offset: [0, -8],
      });

      if (point.type === "report" && onReportMarkerClick) {
        marker.on("click", () => {
          onReportMarkerClick(point.id);
        });
      }

      marker.bindPopup(
        point.type === "sensor"
          ? buildSensorPopup(point)
          : buildReportPopup(point),
        { maxWidth: 260 },
      );
    });

    const allLocations = [
      ...mapPoints.map((point) => [point.lat, point.lng] as [number, number]),
      ...pollutionHotspots.map((spot) => [spot.lat, spot.lng] as [number, number]),
      MAP_CENTER,
    ];

    if (allLocations.length > 0) {
        map.fitBounds(L.latLngBounds(allLocations).pad(0.12));
    }
  }

  return (
    <div className="google-map-wrap" role="region" aria-label={title}>
      <div ref={mapRef} className="google-map-frame" />
    </div>
  );
}
