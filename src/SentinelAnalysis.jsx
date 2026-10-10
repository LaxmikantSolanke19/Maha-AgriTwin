
import { useState } from "react";

function SentinelAnalysis({
  farmBoundary = [],
  liveLocation,
  onResult,
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Use the drawn farm boundary first.
  // Leaflet coordinates are [latitude, longitude].
  const getFarmCenter = () => {
    if (
      Array.isArray(farmBoundary) &&
      farmBoundary.length >= 3
    ) {
      const validPoints = farmBoundary.filter(
        (point) =>
          Array.isArray(point) &&
          point.length >= 2 &&
          Number.isFinite(Number(point[0])) &&
          Number.isFinite(Number(point[1]))
      );

      if (validPoints.length >= 3) {
        const latitude =
          validPoints.reduce(
            (sum, point) => sum + Number(point[0]),
            0
          ) / validPoints.length;

        const longitude =
          validPoints.reduce(
            (sum, point) => sum + Number(point[1]),
            0
          ) / validPoints.length;

        return { latitude, longitude };
      }
    }

    if (
      liveLocation &&
      Number.isFinite(Number(liveLocation.latitude)) &&
      Number.isFinite(Number(liveLocation.longitude))
    ) {
      return {
        latitude: Number(liveLocation.latitude),
        longitude: Number(liveLocation.longitude),
      };
    }

    return null;
  };

  const analyzeFarm = async () => {
    const center = getFarmCenter();

    if (!center) {
      setError(
        "Please draw a farm boundary with at least 3 points or select a location."
      );
      return;
    }

    setAnalyzing(true);
    setResult(null);
    setError("");

    try {
      const body = {
        latitude: center.latitude,
        longitude: center.longitude,
        farmBoundary,
        days: 30,
        maxCloud: 30,
      };

      console.log(
        "Sentinel search center:",
        center.latitude,
        center.longitude
      );

      console.log(
        "Farm boundary:",
        farmBoundary
      );

      const response = await fetch(
        "http://localhost:5000/api/sentinel/ndvi-real",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
          data.message ||
          "NDVI analysis failed"
        );
      }

      if (
        data.message ===
        "No suitable Sentinel-2 image found"
      ) {
        throw new Error(
          "No suitable Sentinel-2 image found near this farm in the selected date range. Try increasing the date range or cloud-cover limit."
        );
      }

      setResult(data);

      if (onResult) {
        onResult(data);
      }
    } catch (err) {
      console.error("NDVI analysis error:", err);
      setError(
        err.message ||
        "Unable to analyze Sentinel-2 data."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const getHealthClass = (health) => {
    if (!health) return "";

    if (health.includes("Healthy")) return "healthy";
    if (health.includes("Good")) return "good";
    if (health.includes("Moderate")) return "moderate";
    if (health.includes("Very low")) return "poor";

    return "poor";
  };

  const farmCenter = getFarmCenter();
  const canAnalyze = Boolean(farmCenter);

  return (
    <div className="sentinel-analysis">
      <div className="sentinel-header">
        <div>
          <h3>🛰️ Sentinel-2 Farm Analysis</h3>
          <p>
            Analyze the selected farm using actual
            Sentinel-2 satellite data.
          </p>
        </div>

        <span className="sentinel-badge">
          Sentinel-2
        </span>
      </div>

      <div className="sentinel-info-grid">
        <div className="sentinel-info-card">
          <span>🌾</span>
          <div>
            <small>Farm Boundary</small>
            <strong>
              {farmBoundary.length >= 3
                ? "Selected"
                : "Location Based"}
            </strong>
          </div>
        </div>

        <div className="sentinel-info-card">
          <span>🛰️</span>
          <div>
            <small>Satellite</small>
            <strong>Sentinel-2</strong>
          </div>
        </div>

        <div className="sentinel-info-card">
          <span>☁️</span>
          <div>
            <small>Cloud Filter</small>
            <strong>≤ 30%</strong>
          </div>
        </div>

        <div className="sentinel-info-card">
          <span>📡</span>
          <div>
            <small>Search Coordinates</small>
            <strong>
              {farmBoundary.length >= 3
                ? "Farm Center"
                : liveLocation
                  ? "Selected Location"
                  : "Not Available"}
            </strong>
          </div>
        </div>
      </div>

      {farmCenter && (
        <p>
          <small>
            Search center: {farmCenter.latitude.toFixed(6)},
            {" "}{farmCenter.longitude.toFixed(6)}
          </small>
        </p>
      )}

      <button
        className="sentinel-analyze-button"
        onClick={analyzeFarm}
        disabled={analyzing || !canAnalyze}
      >
        {analyzing
          ? "⏳ Analyzing Sentinel-2 Data..."
          : "🔍 Analyze Farm with Sentinel-2"}
      </button>

      {error && (
        <div className="sentinel-message">
          <strong>⚠️ Analysis Error</strong>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="sentinel-result">
          <div className="sentinel-result-header">
            <div>
              <h4>📊 Actual Sentinel-2 Analysis</h4>
              <span>
                Observation:{" "}
                {result.image?.date
                  ? new Date(
                      result.image.date
                    ).toLocaleDateString("en-IN")
                  : "N/A"}
              </span>
            </div>

            <span
              className={`health-result-badge ${getHealthClass(
                result.cropHealth
              )}`}
            >
              ● {result.cropHealth}
            </span>
          </div>

          <div className="sentinel-result-grid">
            <div>
              <small>NDVI</small>
              <strong className="ndvi-value">
                {result.ndvi}
              </strong>
            </div>

            <div>
              <small>Vegetation Health</small>
              <strong className="health-text">
                {result.cropHealth || "Not analyzed"}
              </strong>
            </div>

            <div>
              <small>Cloud Cover</small>
              <strong>
                {result.image?.cloudCover ?? "N/A"}%
              </strong>
            </div>

            <div>
              <small>Valid Pixels</small>
              <strong>
                {result.pixels?.toLocaleString("en-IN") ||
                  "N/A"}
              </strong>
            </div>
          </div>

          <div className="sentinel-message">
            <strong>🌱 Farm Health Assessment</strong>

            <p>
              The vegetation condition is{" "}
              <strong>{result.cropHealth}</strong>{" "}
              based on the calculated Sentinel-2 NDVI.
            </p>

            <p>
              NDVI range:{" "}
              <strong>
                {result.min} to {result.max}
              </strong>
            </p>
          </div>

          <div className="sentinel-next-step">
            <span>Next step</span>
            <strong>
              AI Crop Verification → Evidence Report
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}

export default SentinelAnalysis;
