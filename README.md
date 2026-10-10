# 🌾 Maha-AgriTwin
### GIS-Based Agricultural Intelligence & Satellite Crop Monitoring Platform

**Smarter Farming. Faster Assessments. Evidence-Based Decisions.**

Maha-AgriTwin is a GIS-based agricultural intelligence platform designed to help monitor crop conditions, identify potential crop damage, and support faster, more transparent agricultural assessments across Maharashtra.

The platform aims to combine Sentinel-1/2 satellite imagery, GIS mapping, weather and soil information, farmer-submitted evidence, and AI-based analysis to generate evidence-based agricultural reports and support government and insurance assessments.

> **Current status:** Working prototype in development. GIS farm mapping and Sentinel-2 NDVI processing and visualization have been implemented. Additional analysis and decision-support modules are planned.

## 🎯 Problem Statement

Farmers in Maharashtra may face delays in crop damage assessment, drought verification, and insurance claims because of manual field inspections, fragmented records, and inconsistent evidence collection.

Maha-AgriTwin aims to reduce unnecessary field visits and provide a transparent, data-driven approach to agricultural monitoring and assessment.

## 💡 Proposed Solution

Maha-AgriTwin is being developed around the following workflow:

1. **Farm Mapping:** Create and visualize farm boundaries using GIS.
2. **Satellite Monitoring:** Retrieve Sentinel-2 satellite data for the selected farm area.
3. **Vegetation Analysis:** Calculate NDVI using satellite bands to assess vegetation conditions.
4. **Multi-Source Data Integration:** Incorporate weather data, soil information, and farmer-submitted photographs.
5. **AI-Based Analysis:** Develop crop detection, crop-health monitoring, and potential damage assessment.
6. **Causal AI & Geospatial Knowledge Graph:** Investigate probable causes of crop stress by connecting satellite observations with weather, soil, and farm data.
7. **Evidence-Based Reports:** Generate structured reports combining available satellite observations, analysis, and supporting evidence.
8. **Scheme & Insurance Guidance:** Recommend relevant government schemes and insurance information.
9. **Targeted Field Verification:** Flag uncertain or high-risk cases for additional verification by agricultural officers or drone surveys where appropriate.

*The complete workflow is the project vision; individual modules will be implemented and validated incrementally.*

## ✅ What Has Been Implemented So Far

- React and Vite-based web application.
- Interactive GIS map using Leaflet.
- Farm boundary drawing and visualization.
- Satellite basemap visualization.
- Sentinel-2 B04 (Red) and B08 (NIR) data processing workflow.
- Python-based NDVI calculation using Rasterio.
- NDVI GeoTIFF generation and backend file serving.
- NDVI raster visualization on the map using GeoRaster and Leaflet.
- Express backend for satellite-analysis operations.

**Current milestone:** Displaying processed Sentinel-2 NDVI raster data on the farm map.

## 🚧 Planned Features & Development Roadmap

### Phase 1 — GIS & Satellite Monitoring
- Improve farm boundary and satellite-data coverage validation.
- Add Sentinel-1 SAR data integration where useful.
- Improve NDVI visualization, legends, and interpretation.
- Develop crop-health indicators and temporal comparisons.

### Phase 2 — Agricultural Intelligence
- Develop crop-type detection and crop-health analysis.
- Add potential crop-damage and vegetation-stress detection.
- Integrate weather and soil information.
- Validate outputs against ground observations.

### Phase 3 — Causal AI & Geospatial Knowledge Graph
- Connect crop observations with weather, soil, and environmental factors.
- Investigate probable causes of crop stress and damage.
- Represent relationships between farms, crops, environmental conditions, and observations.

### Phase 4 — Evidence-Based Assessment
- Build a report-generation module.
- Combine satellite analysis, farm records, weather information, and farmer-submitted photographs.
- Include evidence sources, analysis results, confidence indicators, and verification status.
- Support agricultural assessment and insurance-claim review workflows.

### Phase 5 — Decision Support & Verification
- Add relevant government scheme and insurance guidance.
- Flag uncertain cases for targeted field verification.
- Explore drone-based verification for selected cases.
- Develop role-based workflows for farmers and agricultural officers.

### Phase 6 — Validation & Deployment
- Test on selected farms using ground-level observations.
- Evaluate accuracy and limitations of crop and damage assessments.
- Improve performance, reliability, and scalability.
- Deploy the application for controlled pilot testing.

## 🔄 System Workflow

**Farm Boundary → Sentinel-1/2 Satellite Data → Weather + Soil + Farmer Evidence → GIS Preprocessing → AI Crop & Damage Analysis → Causal AI + Geospatial Knowledge Graph → Evidence-Based Report → Scheme Recommendations + Targeted Verification**

## 👥 Target Users

- **Farmers:** Crop monitoring, assessment reports, and scheme/insurance guidance.
- **Government Departments:** Data-supported agricultural and drought assessments.
- **Insurance Companies:** Structured evidence to support claim reviews.
- **Agricultural Officers:** Identification of uncertain cases requiring field verification.
- **Policymakers:** Geospatial insights for agricultural planning.

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, JavaScript |
| GIS Mapping | Leaflet, React-Leaflet |
| Satellite Data | Sentinel-2; Sentinel-1 planned |
| Vegetation Analysis | NDVI |
| Geospatial Processing | Python, Rasterio |
| Backend | Node.js, Express |
| Raster Visualization | GeoRaster, GeoRaster Layer for Leaflet |
| Future Intelligence | AI/ML, Causal AI, Geospatial Knowledge Graph |

## 🌍 Expected Impact

- Faster agricultural assessment workflows.
- Reduced dependence on unnecessary manual field inspections.
- More transparent, evidence-based crop damage assessments.
- Better prioritization of uncertain or high-risk cases.
- Improved access to relevant scheme and insurance information.
- More efficient use of field-verification resources.

These are intended outcomes and will be evaluated through testing and pilot deployments.

## ▶️ Running the Prototype Locally

**Prerequisites:** Node.js, npm, and Python with the required geospatial dependencies.

1. Clone the repository:

   ```bash
   git clone https://github.com/LaxmikantSolanke19/Maha-AgriTwin.git
   cd Maha-AgriTwin
   ```

2. Install frontend dependencies:

   ```bash
   npm install
   ```

3. Install the Python dependencies required by `ndvi_processor.py` and configure any required environment variables according to the project setup.

4. Start the frontend using the available npm script:

   ```bash
   npm run dev
   ```

5. Start the Express backend using the project's configured entry point, `server.cjs`, in a separate terminal.

   ```bash
   node server.cjs
   ```

The frontend and backend must both be running for the satellite-analysis workflow to work. Configure the required satellite-data credentials locally; never commit API keys or `.env` files.

*Setup instructions may need adjustment as the prototype evolves.*

## 🔐 Data & Validation

Satellite-derived indicators such as NDVI are useful for monitoring vegetation, but they do not independently prove crop type, crop damage, soil nutrient levels, or the cause of crop failure. These outputs require appropriate validation and, where necessary, additional data sources.

Maha-AgriTwin aims to clearly distinguish satellite observations, AI-generated assessments, supporting evidence, and cases requiring human verification.

## 🚀 Project Vision

Maha-AgriTwin aims to evolve from a GIS and satellite-monitoring prototype into a multi-source agricultural intelligence platform supporting transparent, evidence-based decisions for farmers, government departments, and insurance stakeholders.

**Built for smarter farming and stronger agricultural decision-making in Maharashtra.**
