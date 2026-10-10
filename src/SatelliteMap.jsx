import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
  useMap,
  CircleMarker,
  Polygon,
} from "react-leaflet";

import parseGeoraster from "georaster";
import GeoRasterLayer from "georaster-layer-for-leaflet";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
/* =========================================
   ZOOM TO FARM BOUNDARY
========================================= */

function RecenterMap({ farmBoundary = [] }) {
  const map = useMap();
  const lastBoundaryRef = useRef("");

  useEffect(() => {
    if (!Array.isArray(farmBoundary) || farmBoundary.length < 3) {
      lastBoundaryRef.current = "";
      return;
    }

    const validPoints = farmBoundary.filter(
      (point) =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1]))
    );

    if (validPoints.length < 3) return;

    const boundaryKey = JSON.stringify(validPoints);

    // Do not repeatedly zoom to the same boundary.
    if (lastBoundaryRef.current === boundaryKey) {
      return;
    }

    lastBoundaryRef.current = boundaryKey;

    const bounds = validPoints.map((point) => [
      Number(point[0]),
      Number(point[1]),
    ]);

    map.stop();

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 17,
      animate: false,
    });
  }, [farmBoundary, map]);

  return null;
}

/* =========================================
   LOCATION SEARCH
========================================= */

function SearchControl({ onLocationFound }) {
  const map = useMap();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const searchLocation = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!query.trim() || loading) return;

    setLoading(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query.trim()
        )}&limit=1`
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

      const position = [
        Number(result.lat),
        Number(result.lon),
      ];

      map.flyTo(position, 17, {
        duration: 1.5,
      });

      onLocationFound({
        position,
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
      className="satellite-search"
      onSubmit={searchLocation}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search farm / village / city..."
      />

      <button type="submit" disabled={loading}>
        {loading ? "..." : "🔍"}
      </button>
    </form>
  );
}

/* =========================================
   LIVE LOCATION BUTTON
   MAP MOVES ONLY WHEN CLICKED
========================================= */

function LiveLocationButton({
  onLocationFound,
  liveLocation,
}) {
  const map = useMap();

  const getLiveLocation = () => {
    if (liveLocation) {
      const newPosition = [
        liveLocation.latitude,
        liveLocation.longitude,
      ];

      map.flyTo(newPosition, 18, {
        duration: 1.5,
      });

      onLocationFound({
        position: newPosition,
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

        map.flyTo(newPosition, 18, {
          duration: 1.5,
        });

        onLocationFound({
          position: newPosition,
          name: "Current Device Location",
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        console.error("Geolocation error:", error);

        if (error.code === 1) {
          alert(
            "Location permission denied. Please allow location access."
          );
        } else {
          alert("Unable to get your current location.");
        }
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
      className="satellite-live-button"
      onClick={getLiveLocation}
      onMouseDown={(e) => e.stopPropagation()}
    >
      📍 Live Location
    </button>
  );
}


/* =========================================
   SENTINEL-2 NDVI RASTER OVERLAY
========================================= */

function NdviRasterOverlay({ ndviRaster }) {
  const map = useMap();

  useEffect(() => {
    if (!ndviRaster) return;

    let layer = null;
    let cancelled = false;

    async function loadRaster() {
      try {
        const url = ndviRaster.startsWith("http")
          ? ndviRaster
          : `http://localhost:5000${ndviRaster}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Raster request failed: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const georaster = await parseGeoraster(buffer);
        console.log("NDVI raster bounds:", georaster.xmin, georaster.ymin, georaster.xmax, georaster.ymax);
        console.log("NDVI raster CRS:", georaster.projection);
        console.log("NDVI raster dimensions:", georaster.width, georaster.height);
        console.log("NDVI raster values:", georaster.values);

        if (cancelled) return;

        layer = new GeoRasterLayer({
          georaster,
          opacity: 0.85,
          resolution: 512,
          pixelValuesToColorFn: (values) => {
            const value = values?.[0];

            if (
              !Number.isFinite(value) ||
              value <= -9999 ||
              value < -1 ||
              value > 1
            ) {
              return "rgba(0,0,0,0)";
            }

            if (value < 0.2) return "#d73027";
            if (value < 0.4) return "#fee08b";
            if (value < 0.6) return "#91cf60";
            return "#1a9850";
          },
        });
        console.log("NDVI layer bounds:", layer.getBounds().toBBoxString());
        console.log("Current map center:", map.getCenter());
        console.log("Current zoom:", map.getZoom());

        layer.addTo(map);
        layer.bringToFront();

        if (!cancelled) {
          layer.addTo(map);
          console.log("NDVI raster overlay loaded:", url);
        }
      } catch (error) {
        console.error("NDVI raster overlay error:", error);
      }
    }

    loadRaster();

    return () => {
      cancelled = true;

      if (layer && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    };
  }, [ndviRaster, map]);

  return null;
}


/* =========================================
   MAIN SATELLITE MAP
========================================= */

function SatelliteMap({
  farmBoundary = [],
  setFarmBoundary,
  liveLocation,
  ndviRaster = null,
}) {
  const [location, setLocation] = useState(null);

  /*
    GPS can update the marker, but it must not
    automatically move the map or overwrite search.
  */

  useEffect(() => {
    if (!liveLocation) return;

    setLocation((previousLocation) => {
      // Keep a manually searched or selected location.
      if (
        previousLocation &&
        previousLocation.name !== "Current Device Location"
      ) {
        return previousLocation;
      }

      return {
        position: [
          liveLocation.latitude,
          liveLocation.longitude,
        ],
        name: "Current Device Location",
        accuracy: liveLocation.accuracy,
      };
    });
  }, [liveLocation]);

  const mapLocation = location || {
    position: [19.076, 74.748],
    name: "Maharashtra Demo Location",
  };

  const handleLocationChange = (data) => {
    setLocation(data);
  };

  const clearBoundary = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof setFarmBoundary === "function") {
      setFarmBoundary([]);
    }
  };

  return (
    <div className="satellite-map-wrapper">
      <MapContainer
        center={mapLocation.position}
        zoom={15}
        scrollWheelZoom={true}
        style={{
          height: "100%",
          width: "100%",
        }}
      >
        {/* AUTOMATICALLY FIT THE SHARED FARM BOUNDARY */}

        <RecenterMap farmBoundary={farmBoundary} />
        <NdviRasterOverlay ndviRaster={ndviRaster} />

        {/* LOCATION SEARCH */}

        <SearchControl
          onLocationFound={handleLocationChange}
        />

        {/* GPS BUTTON */}

        <LiveLocationButton
          onLocationFound={handleLocationChange}
          liveLocation={liveLocation}
        />

        {/* MAP LAYERS */}

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="🛰️ Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="🗺️ Normal Map">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
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

        {/* SHARED FARM BOUNDARY */}

        {farmBoundary.length >= 3 && (
          <Polygon
            positions={farmBoundary}
            pathOptions={{
              color: "#16833d",
              weight: 3,
              opacity: 1,
              fillColor: "#2e9b58",
              fillOpacity: 0.25,
            }}
          />
        )}

        {/* FARM CORNER POINTS */}

        {farmBoundary.map((point, index) => (
          <CircleMarker
            key={`farm-point-${index}`}
            center={point}
            radius={5}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: "#16833d",
              fillOpacity: 1,
            }}
            interactive={false}
          />
        ))}

        {/* SELECTED LOCATION MARKER */}

        <Marker position={mapLocation.position}>
          <Popup>
            <div>
              <h3>📍 Selected Location</h3>

              <p>
                <strong>Location:</strong>
                <br />
                {mapLocation.name}
              </p>

              <p>
                <strong>Latitude:</strong>{" "}
                {mapLocation.position[0].toFixed(6)}
              </p>

              <p>
                <strong>Longitude:</strong>{" "}
                {mapLocation.position[1].toFixed(6)}
              </p>

              {mapLocation.accuracy && (
                <p>
                  <strong>GPS Accuracy:</strong>{" "}
                  ±{Math.round(mapLocation.accuracy)} m
                </p>
              )}
            </div>
          </Popup>
        </Marker>

        {/* LIVE GPS INDICATOR — NO AUTOMATIC RECENTER */}

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

        {/* CLEAR SHARED FARM BOUNDARY */}

        {farmBoundary.length > 0 && (
          <button
            type="button"
            className="satellite-clear-farm"
            onClick={clearBoundary}
            onMouseDown={(e) => e.stopPropagation()}
          >
            🗑 Clear Boundary
          </button>
        )}
      </MapContainer>
    </div>
  );
}

export default SatelliteMap;