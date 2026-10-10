import { useState } from "react";
import SatelliteMap from "./SatelliteMap";

function SatelliteData({ language = "en" }) {
  const [selectedLayer, setSelectedLayer] =
    useState("satellite");

  const [analysisStatus, setAnalysisStatus] =
    useState("ready");

  const isEnglish = language === "en";

  const runAnalysis = () => {
    setAnalysisStatus("analyzing");

    setTimeout(() => {
      setAnalysisStatus("complete");
    }, 1800);
  };

  return (
    <section className="page-content">

      {/* INTRO */}

      <div className="monitoring-intro">

        <div>
          <h2>
            {isEnglish
              ? "Satellite Data Analysis"
              : "उपग्रह डेटा विश्लेषण"}
          </h2>

          <p>
            {isEnglish
              ? "Monitor farm vegetation and crop health using satellite observations."
              : "उपग्रह निरीक्षणाच्या मदतीने शेतातील वनस्पती आणि पिकांच्या आरोग्यावर लक्ष ठेवा."}
          </p>
        </div>

        <div
          style={{
            background: "#e9f7ee",
            color: "#188346",
            padding: "8px 13px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          🛰️{" "}
          {isEnglish
            ? "SATELLITE READY"
            : "उपग्रह तयार"}
        </div>

      </div>


      {/* FARM SUMMARY */}

      <div className="stats-grid">

        <div className="stat-card">

          <div className="stat-icon green">
            🌾
          </div>

          <div>
            <span>
              {isEnglish
                ? "Selected Farm"
                : "निवडलेले शेत"}
            </span>

            <strong>
              Farm #01
            </strong>
          </div>

        </div>


        <div className="stat-card">

          <div className="stat-icon blue">
            📐
          </div>

          <div>
            <span>
              {isEnglish
                ? "Farm Area"
                : "शेताचे क्षेत्र"}
            </span>

            <strong>
              2.40 Acres
            </strong>
          </div>

        </div>


        <div className="stat-card">

          <div className="stat-icon green">
            🌱
          </div>

          <div>
            <span>
              NDVI
            </span>

            <strong>
              0.72
            </strong>
          </div>

        </div>


        <div className="stat-card">

          <div className="stat-icon orange">
            ☁️
          </div>

          <div>
            <span>
              {isEnglish
                ? "Cloud Cover"
                : "ढगांचे प्रमाण"}
            </span>

            <strong>
              8%
            </strong>
          </div>

        </div>

      </div>


      {/* ACTUAL SATELLITE MAP */}

      <div className="card">

        <div className="card-header">

          <div>
            <h3>
              {isEnglish
                ? "Satellite Observation"
                : "उपग्रह निरीक्षण"}
            </h3>

            <span>
              {isEnglish
                ? "Interactive satellite view of the selected farm"
                : "निवडलेल्या शेताचे इंटरॅक्टिव्ह उपग्रह दृश्य"}
            </span>
          </div>

          <span className="analysis-badge">
            Sentinel-2
          </span>

        </div>


        <SatelliteMap />


        {/* LAYER BUTTONS */}

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "15px",
            flexWrap: "wrap",
          }}
        >

          <button
            className={
              selectedLayer === "satellite"
                ? "login-submit"
                : "outline-button"
            }
            onClick={() =>
              setSelectedLayer("satellite")
            }
            style={{
              width: "auto",
            }}
          >
            🛰️ Satellite
          </button>


          <button
            className={
              selectedLayer === "ndvi"
                ? "login-submit"
                : "outline-button"
            }
            onClick={() =>
              setSelectedLayer("ndvi")
            }
            style={{
              width: "auto",
            }}
          >
            🌱 NDVI
          </button>


          <button
            className={
              selectedLayer === "health"
                ? "login-submit"
                : "outline-button"
            }
            onClick={() =>
              setSelectedLayer("health")
            }
            style={{
              width: "auto",
            }}
          >
            ❤️ Crop Health
          </button>

        </div>

      </div>


      {/* ANALYSIS */}

      <div className="dashboard-grid">

        <div className="card">

          <div className="card-header">

            <div>
              <h3>
                {isEnglish
                  ? "Vegetation Analysis"
                  : "वनस्पती विश्लेषण"}
              </h3>

              <span>
                {isEnglish
                  ? "NDVI-based observation"
                  : "NDVI आधारित निरीक्षण"}
              </span>
            </div>

            <span className="health-badge">
              ● Healthy
            </span>

          </div>


          <div className="analysis-content">

            <div className="analysis-number">
              0.72
            </div>

            <div>

              <strong>
                {isEnglish
                  ? "Good Vegetation Health"
                  : "चांगले वनस्पती आरोग्य"}
              </strong>

              <p>
                {isEnglish
                  ? "The observed vegetation index indicates healthy crop growth in the selected farm."
                  : "निरीक्षण केलेला वनस्पती निर्देशांक निवडलेल्या शेतामध्ये पिकाची वाढ चांगली असल्याचे दर्शवतो."}
              </p>

            </div>

          </div>

        </div>


        <div className="card">

          <div className="card-header">

            <div>
              <h3>
                {isEnglish
                  ? "Observation Details"
                  : "निरीक्षण माहिती"}
              </h3>

              <span>
                {isEnglish
                  ? "Satellite acquisition information"
                  : "उपग्रह निरीक्षण माहिती"}
              </span>
            </div>

          </div>


          <div className="farm-info-grid">

            <div>
              <span>
                {isEnglish
                  ? "Satellite"
                  : "उपग्रह"}
              </span>

              <strong>
                Sentinel-2
              </strong>
            </div>


            <div>
              <span>
                {isEnglish
                  ? "Index"
                  : "निर्देशांक"}
              </span>

              <strong>
                NDVI
              </strong>
            </div>


            <div>
              <span>
                {isEnglish
                  ? "Observation"
                  : "निरीक्षण"}
              </span>

              <strong>
                28 Sept 2026
              </strong>
            </div>


            <div>
              <span>
                {isEnglish
                  ? "Cloud Cover"
                  : "ढगांचे प्रमाण"}
              </span>

              <strong>
                8%
              </strong>
            </div>

          </div>

        </div>

      </div>


      {/* RUN ANALYSIS */}

      <div className="open-monitoring">

        <div>

          <h3>
            {isEnglish
              ? "Run Satellite Analysis"
              : "उपग्रह विश्लेषण सुरू करा"}
          </h3>

          <p>
            {isEnglish
              ? "Analyze the selected farm using satellite vegetation data."
              : "उपग्रह वनस्पती डेटाच्या मदतीने निवडलेल्या शेताचे विश्लेषण करा."}
          </p>

        </div>


        <button
          onClick={runAnalysis}
          disabled={
            analysisStatus === "analyzing"
          }
        >

          {analysisStatus === "ready" &&
            (isEnglish
              ? "Analyze Farm →"
              : "शेताचे विश्लेषण करा →")}

          {analysisStatus === "analyzing" &&
            (isEnglish
              ? "Analyzing..."
              : "विश्लेषण सुरू आहे...")}

          {analysisStatus === "complete" &&
            (isEnglish
              ? "✓ Analysis Complete"
              : "✓ विश्लेषण पूर्ण")}

        </button>

      </div>

    </section>
  );
}

export default SatelliteData;