"use client";

import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";

const HARTBEESPOORT_CENTER: [number, number] = [-25.7343, 27.8587];
const HARTBEESPOORT_BOUNDS: [[number, number], [number, number]] = [
  [-25.79, 27.79],
  [-25.68, 27.93],
];

interface PinCoords {
  lat: number;
  lng: number;
}

function ClickHandler({ onPin }: { onPin: (coords: PinCoords) => void }) {
  useMapEvents({
    click(e) {
      onPin({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

interface CreateReportMapProps {
  pinned: PinCoords | null;
  onPin: (coords: PinCoords) => void;
}

export default function CreateReportMap({ pinned, onPin }: CreateReportMapProps) {
  return (
    <MapContainer
      center={HARTBEESPOORT_CENTER}
      zoom={12}
      minZoom={11}
      maxZoom={16}
      maxBounds={HARTBEESPOORT_BOUNDS}
      maxBoundsViscosity={1}
      scrollWheelZoom
      className="create-report-map__canvas"
      style={{ height: "240px", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPin={onPin} />
      {pinned && (
        <CircleMarker
          center={[pinned.lat, pinned.lng]}
          radius={10}
          pathOptions={{
            color: "#1f5f96",
            fillColor: "#2a75b8",
            fillOpacity: 0.9,
            weight: 2,
          }}
        />
      )}
    </MapContainer>
  );
}
