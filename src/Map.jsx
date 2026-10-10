import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
  useMap,
  Polygon,
  CircleMarker,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";

/* =========================================
   LIVE LOCATION BUTTON
   GPS RECENTER ONLY ON BUTTON CLICK
========================================= */

function LocateButton({ setLocation, liveLocation }) {
  const map = useMap();

  const handleLocation = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (liveLocation) {
      const position = [
        liveLocation.latitude,
        liveLocation.longitude,
      ];

      map.flyTo(position, 18, { duration: 1.5 });

      setLocation({
        position,
        name: "Current Device Location",
        accuracy: liveLocation.accuracy,
      });

      return;
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPosition = [
          position.coords.latitude,
          position.coords.longitude,
        ];

        map.flyTo(newPosition, 18, { duration: 1.5 });

        setLocation({
          position: newPosition,
          name: "Current Device Location",
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to get your current location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
  };

  return (
    <button
      type="button"
      className="map-location-button"
      onClick={handleLocation}
      onMouseDown={(e) => e.stopPropagation()}
    >
      📍 Live Location
    </button>
  );
}

/* =========================================
   LOCATION SEARCH
========================================= */

function SearchBox({ setLocation }) {
  const map = useMap();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const searchLocation = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!search.trim() || loading) return;

    setLoading(true);

    try {
      const response = await fetch(
        "https://nominatim.openstreetmap.org/search" +
          "?format=json&q=" +
          encodeURIComponent(search.trim()) +
          "&limit=1"
      );

      if (!response.ok) {
        throw new Error("Location search request failed.");
      }

      const results = await response.json();

      if (!results.length) {
        alert("Location not found.");
        return;
      }

      const result = results[0];

      const newPosition = [
        Number(result.lat),
        Number(result.lon),
      ];

      map.flyTo(newPosition, 17, { duration: 1.5 });

      setLocation({
        position: newPosition,
        name: result.display_name,
      });
    } catch (error) {
      console.error("Location search error:", error);
      alert("Unable to search location. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="map-search"
      onSubmit={searchLocation}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search farm location..."
      />

      <button type="submit" disabled={loading}>
        {loading ? "..." : "🔍"}
      </button>
    </form>
  );
}

/* =========================================
   DRAW FARM BOUNDARY
========================================= */

function DrawFarm({ drawing, farmPoints, setFarmPoints }) {
  const map = useMap();

  useEffect(() => {
    if (!drawing) return;

    const handleMapClick = (e) => {
      const target = e.originalEvent.target;

      if (
        target.closest("button") ||
        target.closest("input") ||
        target.closest(".map-search") ||
        target.closest(".map-location-button") ||
        target.closest(".finish-farm-button") ||
        target.closest(".cancel-drawing-button") ||
        target.closest(".clear-farm-button") ||
        target.closest(".draw-farm-button") ||
        target.closest(".drawing-hint") ||
        target.closest(".leaflet-control")
      ) {
        return;
      }

      const newPoint = [e.latlng.lat, e.latlng.lng];

      setFarmPoints((previousPoints) => [
        ...previousPoints,
        newPoint,
      ]);
    };

    map.on("click", handleMapClick);

    return () => {
      map.off("click", handleMapClick);
    };
  }, [map, drawing, setFarmPoints]);

  return (
    <>
      {farmPoints.length >= 2 && (
        <Polygon
          positions={farmPoints}
          pathOptions={{
            color: "#16833d",
            weight: 3,
            opacity: 1,
            fillColor: "#2e9b58",
            fillOpacity: 0.25,
          }}
          interactive={false}
        />
      )}

      {farmPoints.map((point, index) => (
        <CircleMarker
          key={`drawing-point-${index}`}
          center={point}
          radius={6}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: "#16833d",
            fillOpacity: 1,
          }}
          interactive={false}
        />
      ))}
    </>
  );
}

/* =========================================
   FARM AREA CALCULATION
========================================= */

function calculateFarmArea(points) {
  if (!Array.isArray(points) || points.length < 3) {
    return null;
  }

  const earthRadius = 6371000;
  let area = 0;

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;

    const lat1 = points[i][0];
    const lon1 = points[i][1];
    const lat2 = points[j][0];
    const lon2 = points[j][1];

    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const lon1Rad = (lon1 * Math.PI) / 180;
    const lon2Rad = (lon2 * Math.PI) / 180;

    const x1 = lon1Rad * Math.cos(lat1Rad);
    const y1 = lat1Rad;
    const x2 = lon2Rad * Math.cos(lat2Rad);
    const y2 = lat2Rad;

    area += x1 * y2 - x2 * y1;
  }

  area = (Math.abs(area) * earthRadius * earthRadius) / 2;

  return {
    squareMeters: area,
    acres: area / 4046.8564224,
    hectares: area / 10000,
  };
}

/* =========================================
   MAIN FARM MONITORING MAP
========================================= */

function Map({
  onAreaCalculated,
  farmBoundary,
  setFarmBoundary,
  liveLocation,
}) {
  const [location, setLocation] = useState(null);
  const [drawing, setDrawing] = useState(false);

  /*
    IMPORTANT:
    No automatic map movement when liveLocation updates.
    Search and the Live Location button control map movement.
  */

  const mapLocation = location || {
    position: [19.076, 74.748],
    name: "Demo Farm Location",
  };

  /* START DRAWING */

  const startDrawing = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setFarmBoundary([]);
    onAreaCalculated(null);
    setDrawing(true);
  };

  /* FINISH DRAWING */

  const finishDrawing = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (farmBoundary.length < 3) {
      alert("Please select at least 3 points to create the farm boundary.");
      return;
    }

    const calculatedArea = calculateFarmArea(farmBoundary);

    onAreaCalculated(calculatedArea);
    setDrawing(false);
  };

  /* CANCEL DRAWING */

  const cancelDrawing = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setFarmBoundary([]);
    onAreaCalculated(null);
    setDrawing(false);
  };

  /* CLEAR FARM */

  const clearFarm = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setFarmBoundary([]);
    onAreaCalculated(null);
    setDrawing(false);
  };

  return (
    <div className="map-wrapper">
      <MapContainer
        center={mapLocation.position}
        zoom={15}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        {/* LOCATION SEARCH */}

        <SearchBox setLocation={setLocation} />

        {/* GPS MOVES MAP ONLY WHEN BUTTON IS CLICKED */}

        <LocateButton
          setLocation={setLocation}
          liveLocation={liveLocation}
        />

        {/* START DRAWING */}

        {!drawing && farmBoundary.length === 0 && (
          <button
            type="button"
            className="draw-farm-button"
            onClick={startDrawing}
            onMouseDown={(e) => e.stopPropagation()}
          >
            🌾 Draw Farm
          </button>
        )}

        {/* DRAWING CONTROLS */}

        {drawing && (
          <>
            <div className="drawing-hint">
              Click on farm corners to draw boundary
            </div>

            <button
              type="button"
              className="finish-farm-button"
              onClick={finishDrawing}
              onMouseDown={(e) => e.stopPropagation()}
            >
              ✓ Finish Farm
            </button>

            <button
              type="button"
              className="cancel-drawing-button"
              onClick={cancelDrawing}
              onMouseDown={(e) => e.stopPropagation()}
            >
              ✕ Cancel
            </button>
          </>
        )}

        {/* CLEAR BOUNDARY */}

        {!drawing && farmBoundary.length > 0 && (
          <button
            type="button"
            className="clear-farm-button"
            onClick={clearFarm}
            onMouseDown={(e) => e.stopPropagation()}
          >
            🗑 Clear Farm
          </button>
        )}

        {/* DRAWING POINTS AND POLYGON */}

        <DrawFarm
          drawing={drawing}
          farmPoints={farmBoundary}
          setFarmPoints={setFarmBoundary}
        />

        {/* MAP LAYERS */}

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="🗺️ Normal Map">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="🛰️ Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay checked name="🏷️ Place Labels">
            <TileLayer
              url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              attribution="Labels &copy; Esri"
              maxZoom={19}
            />
          </LayersControl.Overlay>
        </LayersControl>

        {/* SELECTED LOCATION MARKER */}

        <Marker position={mapLocation.position}>
          <Popup>
            <div className="location-popup">
              <h3>📍 Selected Location</h3>

              <p>
                <b>Location:</b>
                <br />
                {mapLocation.name}
              </p>

              <p>
                <b>Latitude:</b>{" "}
                {mapLocation.position[0].toFixed(6)}
              </p>

              <p>
                <b>Longitude:</b>{" "}
                {mapLocation.position[1].toFixed(6)}
              </p>

              {mapLocation.accuracy && (
                <p>
                  <b>GPS Accuracy:</b> ±
                  {Math.round(mapLocation.accuracy)} m
                </p>
              )}
            </div>
          </Popup>
        </Marker>

        {/* LIVE GPS INDICATOR — DOES NOT MOVE THE MAP */}

        {liveLocation && (
          <CircleMarker
            center={[
              liveLocation.latitude,
              liveLocation.longitude,
            ]}
            radius={10}
            pathOptions={{
              color: "#ffffff",
              weight: 3,
              fillColor: "#16833d",
              fillOpacity: 0.85,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

export default Map;