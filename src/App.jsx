import { useState, useEffect } from "react";
import Map from "./Map";
import SatelliteMap from "./SatelliteMap";
import SentinelAnalysis from "./SentinelAnalysis";
import "./App.css";
import translations from "./translations";

function App() {
  const [language, setLanguage] = useState("en");
  const t = translations[language];

  const [userRole, setUserRole] = useState(null);
  const [authStep, setAuthStep] = useState("role");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [activePage, setActivePage] = useState("Dashboard");

  const [farmArea, setFarmArea] = useState(null);
  const [sentinelResult, setSentinelResult] = useState(null);

  // SHARED FARM BOUNDARY
  // This is used by BOTH Farm Monitoring and Satellite Data
  const [farmBoundary, setFarmBoundary] = useState([]);

  // LIVE LOCATION
  const [liveLocation, setLiveLocation] = useState(null);
  // REAL SENTINEL-2 NDVI
  const [ndviData, setNdviData] = useState(null);
  const [ndviLoading, setNdviLoading] = useState(false);
  const [ndviError, setNdviError] = useState(null);

  const [locationStatus, setLocationStatus] = useState(
    "Location not detected"
  );

  // =========================================
  // LIVE DATE & TIME
  // =========================================

  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString(
      language === "en" ? "en-IN" : "mr-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString(
      language === "en" ? "en-IN" : "mr-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }
    );
  };

  // =========================================
  // GLOBAL LIVE LOCATION
  // Automatically starts when application is open
  // =========================================

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation not supported");
      return;
    }

    setLocationStatus("Detecting live location...");

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        setLiveLocation({
          latitude,
          longitude,
          accuracy,
        });

        setLocationStatus("Live location active");
      },
      (error) => {
        console.log("Location error:", error);

        if (error.code === 1) {
          setLocationStatus("Location permission denied");
        } else if (error.code === 2) {
          setLocationStatus("Location unavailable");
        } else if (error.code === 3) {
          setLocationStatus("Location request timed out");
        } else {
          setLocationStatus("Unable to detect location");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const getLocationText = () => {
    if (!liveLocation) {
      return language === "en"
        ? "Detecting location..."
        : "स्थान शोधत आहे...";
    }

    return `${liveLocation.latitude.toFixed(
      6
    )}, ${liveLocation.longitude.toFixed(6)}`;
  };
  const fetchRealNDVI = async () => {
    if (!liveLocation) {
      setNdviError("Live location not available");
      return;
    }

    setNdviLoading(true);
    setNdviError(null);

    try {
      const response = await fetch(
        "http://localhost:5000/api/sentinel/ndvi-real",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            latitude: liveLocation.latitude,
            longitude: liveLocation.longitude,
            days: 30,
            maxCloud: 30,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
          data.message ||
          "NDVI calculation failed"
        );
      }

      setNdviData(data);
    } catch (error) {
      console.error("Real NDVI error:", error);
      setNdviError(error.message);
    } finally {
      setNdviLoading(false);
    }
  };

  // =========================================
  // MENU
  // =========================================

  // =========================================
  // MENU
  // =========================================

  const menuItems = [
    "Dashboard",
    "Farm Monitoring",
    "Satellite Data",
    "AI Verification",
    "Evidence Reports",
    "Alerts",
  ];

  const pageTitles = {
    Dashboard: t.dashboard,
    "Farm Monitoring": t.farmMonitoring,
    "Satellite Data": t.satelliteData,
    "AI Verification": t.aiVerification,
    "Evidence Reports": t.evidenceReports,
    Alerts: t.alerts,
  };

  const pageDescriptions = {
    Dashboard: t.overview,
    "Farm Monitoring": t.monitor,
    "Satellite Data": t.satelliteDescription,
    "AI Verification": t.aiDescription,
    "Evidence Reports": t.evidenceDescription,
    Alerts: t.alertsDescription,
  };

  // =========================================
  // LOGIN
  // =========================================

  if (!isAuthenticated) {
    if (authStep === "role") {
      return (
        <div className="login-page">
          <div className="login-card">
            <div className="login-logo">🌾</div>

            <h1>Maha-AgriTwin</h1>

            <p className="login-subtitle">
              Smart Agriculture & Evidence Platform
            </p>

            <h3>
              {language === "en"
                ? "Select your role"
                : "तुमची भूमिका निवडा"}
            </h3>

            <div className="role-options">
              <button
                className="role-card"
                onClick={() => {
                  setUserRole("farmer");
                  setAuthStep("login");
                  setLoginError("");
                }}
              >
                <span className="role-icon">👨‍🌾</span>

                <div>
                  <strong>
                    {language === "en" ? "Farmer" : "शेतकरी"}
                  </strong>

                  <small>
                    {language === "en"
                      ? "Manage your farms & applications"
                      : "तुमची शेतजमीन व अर्ज व्यवस्थापित करा"}
                  </small>
                </div>
              </button>

              <button
                className="role-card"
                onClick={() => {
                  setUserRole("officer");
                  setAuthStep("login");
                  setLoginError("");
                }}
              >
                <span className="role-icon">👨‍💼</span>

                <div>
                  <strong>
                    {language === "en"
                      ? "Government Officer"
                      : "शासकीय अधिकारी"}
                  </strong>

                  <small>
                    {language === "en"
                      ? "Review & verify farm assessments"
                      : "शेताचे मूल्यांकन तपासा व पडताळा"}
                  </small>
                </div>
              </button>
            </div>

            <div className="login-language">
              <button
                className={language === "en" ? "active" : ""}
                onClick={() => setLanguage("en")}
              >
                English
              </button>

              <button
                className={language === "mr" ? "active" : ""}
                onClick={() => setLanguage("mr")}
              >
                मराठी
              </button>
            </div>
          </div>
        </div>
      );
    }

    const isFarmer = userRole === "farmer";

    const handleLogin = (event) => {
      event.preventDefault();

      const validId = isFarmer
        ? "FARMER001"
        : "OFFICER001";

      const validPassword = "1234";

      if (
        loginId.trim() === validId &&
        password === validPassword
      ) {
        setLoginError("");
        setIsAuthenticated(true);
        setActivePage("Dashboard");
      } else {
        setLoginError(
          language === "en"
            ? `Invalid credentials. Demo: ${validId} / 1234`
            : `चुकीची माहिती. Demo: ${validId} / 1234`
        );
      }
    };

    return (
      <div className="login-page">
        <div className="login-card auth-card">
          <button
            className="back-role-button"
            type="button"
            onClick={() => {
              setAuthStep("role");
              setLoginId("");
              setPassword("");
              setLoginError("");
            }}
          >
            ←{" "}
            {language === "en"
              ? "Change role"
              : "भूमिका बदला"}
          </button>

          <div className="login-logo">
            {isFarmer ? "👨‍🌾" : "👨‍💼"}
          </div>

          <h1>
            {isFarmer
              ? language === "en"
                ? "Farmer Login"
                : "शेतकरी लॉगिन"
              : language === "en"
                ? "Officer Login"
                : "अधिकारी लॉगिन"}
          </h1>

          <p className="login-subtitle">
            {isFarmer
              ? language === "en"
                ? "Access your farms and applications"
                : "तुमच्या शेतजमिनी व अर्जांचा प्रवेश मिळवा"
              : language === "en"
                ? "Review and verify agricultural cases"
                : "कृषी प्रकरणे तपासा व पडताळा"}
          </p>

          <form
            className="auth-form"
            onSubmit={handleLogin}
          >
            <label>
              {isFarmer
                ? language === "en"
                  ? "Farmer ID"
                  : "शेतकरी ID"
                : language === "en"
                  ? "Officer ID"
                  : "अधिकारी ID"}
            </label>

            <input
              type="text"
              value={loginId}
              onChange={(e) => {
                setLoginId(e.target.value);
                setLoginError("");
              }}
              placeholder={
                isFarmer
                  ? "FARMER001"
                  : "OFFICER001"
              }
              autoComplete="username"
            />

            <label>
              {language === "en"
                ? "Password"
                : "पासवर्ड"}
            </label>

            <div className="password-field">
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError("");
                }}
                placeholder="••••••••"
                autoComplete="current-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    (value) => !value
                  )
                }
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            {loginError && (
              <div className="login-error">
                {loginError}
              </div>
            )}

            <button
              className="login-submit"
              type="submit"
            >
              {language === "en"
                ? "Login"
                : "लॉगिन"}
            </button>
          </form>

          <div className="demo-hint">
            <strong>Demo Login</strong>

            <span>
              {isFarmer
                ? "FARMER001"
                : "OFFICER001"}
            </span>

            <span>Password: 1234</span>
          </div>

          <div className="login-language">
            <button
              className={
                language === "en"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setLanguage("en")
              }
            >
              English
            </button>

            <button
              className={
                language === "mr"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setLanguage("mr")
              }
            >
              मराठी
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================
  // MAIN APP
  // =========================================

  return (
    <div className="app">
      {/* SIDEBAR */}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            🌾
          </div>

          <div>
            <h2>Maha-AgriTwin</h2>

            <span>
              {t.smartAgriculture}
            </span>
          </div>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <button
              key={item}
              className={
                activePage === item
                  ? "menu-item active"
                  : "menu-item"
              }
              onClick={() =>
                setActivePage(item)
              }
            >
              <span>
                {item === "Dashboard" && "▦"}
                {item === "Farm Monitoring" && "🌾"}
                {item === "Satellite Data" && "🛰️"}
                {item === "AI Verification" && "🤖"}
                {item === "Evidence Reports" && "📄"}
                {item === "Alerts" && "🔔"}
              </span>

              {pageTitles[item]}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot"></span>
            {t.systemOnline}
          </div>

          <div className="version">
            Maha-AgriTwin v1.0
          </div>
        </div>
      </aside>

      {/* MAIN */}

      <main className="main-content">
        {/* HEADER */}

        <header className="top-header">
          <div>
            <h1>
              {pageTitles[activePage]}
            </h1>

            <p>
              {pageDescriptions[activePage]}
            </p>
          </div>

          <div className="language-switcher">
            <button
              className={
                language === "en"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setLanguage("en")
              }
            >
              English
            </button>

            <button
              className={
                language === "mr"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setLanguage("mr")
              }
            >
              मराठी
            </button>
          </div>

          <div className="header-date">
            <div>
              📅 {formatDate(currentDateTime)}
            </div>

            <div
              style={{
                marginTop: "3px",
                fontSize: "12px",
                color: "#16833d",
                fontWeight: "600",
              }}
            >
              🕐 {formatTime(currentDateTime)}
            </div>
          </div>
        </header>

        {/* =========================================
            DASHBOARD
        ========================================= */}

        {activePage === "Dashboard" && (
          <section className="page-content">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon green">
                  🌾
                </div>

                <div>
                  <span>{t.totalFarms}</span>
                  <strong>{liveLocation ? "1" : "0"}</strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon blue">
                  ✓
                </div>

                <div>
                  <span>{t.healthy}</span>
                  <strong>
                    {ndviData?.cropHealth?.includes("Healthy") ||
                      ndviData?.cropHealth?.includes("Good")
                      ? "1"
                      : "0"}
                  </strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">
                  ⚠
                </div>

                <div>
                  <span>{t.atRisk}</span>
                  <strong>
                    {ndviData?.cropHealth?.includes("Moderate")
                      ? "1"
                      : "0"}
                  </strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon red">
                  !
                </div>

                <div>
                  <span>{t.damaged}</span>
                  <strong>0</strong>
                </div>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="card farm-card">
                <div className="card-header">
                  <div>
                    <h3>{t.selectedFarm}</h3>

                    <span>
                      {t.currentMonitoring}
                    </span>
                  </div>

                  <span className="health-badge">
                    ● {ndviData ? ndviData.cropHealth : "Not analyzed"}
                  </span>
                </div>

                <div className="farm-info-grid">
                  <div>
                    <span>{t.crop}</span>
                    <strong>
                      {language === "en" ? "Pending Analysis" : "विश्लेषण बाकी"}
                    </strong>
                  </div>

                  <div>
                    <span>{t.area}</span>

                    <strong>
                      {farmArea
                        ? `${farmArea.acres.toFixed(2)} Acres`
                        : "Not calculated"}
                    </strong>
                  </div>

                  <div>
                    <span>{t.ndvi}</span>
                    <strong>
                      {ndviLoading
                        ? "..."
                        : ndviData
                          ? ndviData.ndvi.toFixed(4)
                          : "--"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      {t.lastObservation}
                    </span>

                    <strong>
                      {ndviData?.image?.date
                        ? new Date(ndviData.image.date).toLocaleDateString("en-IN")
                        : "Not analyzed"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div>
                    <h3>
                      {t.latestSatellite}
                    </h3>

                    <span>
                      {t.satelliteObservation}
                    </span>
                  </div>

                  <span className="analysis-badge">
                    {ndviData ? "Real Data" : "Not analyzed"}
                  </span>
                </div>

                <div className="analysis-content">
                  <div className="analysis-number">
                    {ndviLoading
                      ? "..."
                      : ndviData
                        ? ndviData.ndvi.toFixed(4)
                        : "--"}
                  </div>
                  <div>
                    <strong>
                      {t.vegetationHealth}
                    </strong>

                    <p>
                      {ndviData
                        ? language === "en"
                          ? `Current vegetation condition: ${ndviData.cropHealth}`
                          : `सध्याची वनस्पती स्थिती: ${ndviData.cropHealth}`
                        : language === "en"
                          ? "Analyze the farm to get the actual Sentinel-2 vegetation condition."
                          : "प्रत्यक्ष Sentinel-2 वनस्पती स्थिती पाहण्यासाठी शेताचे विश्लेषण करा."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3>
                      {t.evidenceReport}
                    </h3>

                    <span>
                      {t.latestReport}
                    </span>
                  </div>

                  <span className="report-icon">
                    📄
                  </span>
                </div>

                <div className="report-row">
                  <div>
                    <strong>
                      {language === "en"
                        ? "No Evidence Report Generated"
                        : "पुरावा अहवाल तयार केलेला नाही"}
                    </strong>

                    <span>
                      {ndviData
                        ? language === "en"
                          ? "Sentinel-2 analysis available. Evidence report can be generated after verification."
                          : "Sentinel-2 विश्लेषण उपलब्ध आहे. पडताळणीनंतर पुरावा अहवाल तयार करता येईल."
                        : language === "en"
                          ? "Analyze the farm first to generate verified evidence."
                          : "पडताळणी केलेला पुरावा तयार करण्यासाठी प्रथम शेताचे विश्लेषण करा."}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div>
                    <h3>
                      {t.recentAlerts}
                    </h3>

                    <span>
                      {t.monitoringNotifications}
                    </span>
                  </div>

                  <span className="alert-icon">
                    🔔
                  </span>
                </div>


                <div className="alert-row">
                  <span className="alert-dot green"></span>

                  <div>
                    <strong>
                      {ndviData
                        ? "Latest Sentinel-2 analysis available"
                        : "No recent alerts"}
                    </strong>

                    <span>
                      {ndviData
                        ? `NDVI ${ndviData.ndvi?.toFixed(4)} · Current farm`
                        : "No verified crop health or damage alert"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="open-monitoring">
              <div>
                <h3>{t.startMonitoring}</h3>

                <p>
                  {t.startMonitoringDescription}
                </p>
              </div>

              <button
                onClick={() =>
                  setActivePage(
                    "Farm Monitoring"
                  )
                }
              >
                {t.openMonitoring} →
              </button>
            </div>
          </section>
        )}

        {/* =========================================
            FARM MONITORING
        ========================================= */}

        {activePage === "Farm Monitoring" && (
          <section className="page-content">
            <div className="monitoring-intro">
              <div>
                <h2>
                  {t.farmLocationBoundary}
                </h2>

                <p>
                  {t.farmLocationDescription}
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
                <span
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#27a653",
                    marginRight: "7px",
                  }}
                ></span>

                {liveLocation
                  ? language === "en"
                    ? "LIVE LOCATION"
                    : "लाईव्ह लोकेशन"
                  : language === "en"
                    ? "LOCATING..."
                    : "स्थान शोधत आहे..."}
              </div>
            </div>

            <div className="card map-card">
              <Map
                onAreaCalculated={
                  setFarmArea
                }
                farmBoundary={farmBoundary}
                setFarmBoundary={
                  setFarmBoundary
                }
                liveLocation={liveLocation}
              />
            </div>

            <div
              className="selected-farm-section"
              style={{
                marginTop: "18px",
              }}
            >
              <div className="section-title">
                <div>
                  <h2>
                    {language === "en"
                      ? "Live Location"
                      : "लाईव्ह लोकेशन"}
                  </h2>

                  <p>
                    {language === "en"
                      ? "Current device location and monitoring time"
                      : "सध्याचे डिव्हाइस स्थान आणि निरीक्षण वेळ"}
                  </p>
                </div>
              </div>

              <div className="farm-details-grid">
                <div className="farm-detail-card">
                  <span className="detail-icon">
                    📍
                  </span>

                  <div>
                    <span>{t.location}</span>

                    <strong>
                      {getLocationText()}
                    </strong>

                    <small>
                      {locationStatus}
                    </small>
                  </div>
                </div>


                <div className="farm-detail-card">
                  <span className="detail-icon">
                    🌐
                  </span>

                  <div>
                    <span>
                      {language === "en"
                        ? "Latitude"
                        : "अक्षांश"}
                    </span>

                    <strong>
                      {liveLocation
                        ? liveLocation.latitude.toFixed(
                          6
                        )
                        : "Detecting..."}
                    </strong>

                    <small>
                      GPS coordinate
                    </small>
                  </div>
                </div>

                <div className="farm-detail-card">
                  <span className="detail-icon">
                    🧭
                  </span>

                  <div>
                    <span>
                      {language === "en"
                        ? "Longitude"
                        : "रेखांश"}
                    </span>

                    <strong>
                      {liveLocation
                        ? liveLocation.longitude.toFixed(
                          6
                        )
                        : "Detecting..."}
                    </strong>

                    <small>
                      GPS coordinate
                    </small>
                  </div>
                </div>

                <div className="farm-detail-card">
                  <span className="detail-icon">
                    🎯
                  </span>

                  <div>
                    <span>
                      {language === "en"
                        ? "GPS Accuracy"
                        : "GPS अचूकता"}
                    </span>

                    <strong>
                      {liveLocation
                        ? `±${Math.round(
                          liveLocation.accuracy
                        )} m`
                        : "Detecting..."}
                    </strong>

                    <small>
                      Current GPS accuracy
                    </small>
                  </div>
                </div>

                <div className="farm-detail-card">
                  <span className="detail-icon">
                    📅
                  </span>

                  <div>
                    <span>
                      {language === "en"
                        ? "Current Date"
                        : "आजची तारीख"}
                    </span>

                    <strong>
                      {formatDate(
                        currentDateTime
                      )}
                    </strong>

                    <small>
                      Live system date
                    </small>
                  </div>
                </div>

                <div className="farm-detail-card">
                  <span className="detail-icon">
                    🕐
                  </span>

                  <div>
                    <span>
                      {language === "en"
                        ? "Current Time"
                        : "सध्याची वेळ"}
                    </span>

                    <strong className="health-text">
                      {currentDateTime
                        ? currentDateTime.toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                        : "--"}
                    </strong>

                    <small>
                      Live system time
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <div className="selected-farm-section">
              <div className="section-title">
                <div>
                  <h2>{t.selectedFarm}</h2>

                  <p>
                    {t.currentFarmInformation}
                  </p>
                </div>
              </div>

              <div className="farm-details-grid">
                <div className="farm-detail-card">
                  <span className="detail-icon">
                    📍
                  </span>

                  <div>
                    <span>{t.location}</span>

                    <strong>
                      {liveLocation
                        ? "Live location selected"
                        : t.selectedOnMap}
                    </strong>

                    <small>
                      {liveLocation
                        ? getLocationText()
                        : "Select a location on map"}
                    </small>
                  </div>
                </div>

                <div className="farm-detail-card">
                  <span className="detail-icon">
                    🌾
                  </span>

                  <div>
                    <span>
                      {t.aiCropDetection}
                    </span>

                    <strong>
                      {t.pendingAnalysis}
                    </strong>

                    <small>
                      {language === "en"
                        ? "Satellite + AI analysis"
                        : "उपग्रह + AI विश्लेषण"}
                    </small>
                  </div>
                </div>

                <div className="farm-detail-card">
                  <span className="detail-icon">
                    📐
                  </span>

                  <div>
                    <span>{t.farmArea}</span>

                    <strong>
                      {farmArea
                        ? `${farmArea.acres.toFixed(
                          2
                        )} Acres`
                        : "Not calculated"}
                    </strong>

                    {farmArea && (
                      <small>
                        {farmArea.hectares.toFixed(
                          2
                        )}
                        {" ha · "}
                        {Math.round(
                          farmArea.squareMeters
                        ).toLocaleString()}
                        {" m²"}
                      </small>
                    )}
                  </div>
                </div>


              </div>
            </div>
          </section>
        )}

        {/* =========================================
            SATELLITE DATA
        ========================================= */}

        {activePage === "Satellite Data" && (
          <section className="page-content">
            <div className="monitoring-intro">
              <div>
                <h2>
                  {language === "en"
                    ? "Satellite Data Analysis"
                    : "उपग्रह डेटा विश्लेषण"}
                </h2>

                <p>
                  {language === "en"
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
                {language === "en"
                  ? "SATELLITE READY"
                  : "उपग्रह तयार"}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h3>
                    {language === "en"
                      ? "Satellite Map"
                      : "उपग्रह नकाशा"}
                  </h3>

                  <span>
                    {language === "en"
                      ? "Select farm location and inspect satellite imagery"
                      : "शेताचे स्थान निवडा आणि उपग्रह प्रतिमा तपासा"}
                  </span>
                </div>

                <span className="analysis-badge">
                  Sentinel-2
                </span>
              </div>

              <div
                style={{
                  height: "520px",
                  width: "100%",
                  borderRadius: "14px",
                  overflow: "hidden",
                }}
              >

                <SatelliteMap
                  farmBoundary={farmBoundary}
                  setFarmBoundary={setFarmBoundary}
                  liveLocation={liveLocation}
                  ndviRaster={ndviData?.ndviRaster || null}
                />

              </div>
              <div style={{ marginTop: "18px" }}>
                <SentinelAnalysis
                  farmBoundary={farmBoundary}
                  liveLocation={liveLocation}
                  onResult={setNdviData}
                />
              </div>

            </div>
          </section>
        )}

        {/* =========================================
            OTHER PAGES
        ========================================= */}

        {activePage !== "Dashboard" &&
          activePage !== "Farm Monitoring" &&
          activePage !== "Satellite Data" && (
            <section className="page-content">
              <div className="coming-soon-card">
                <div className="coming-icon">
                  🚧
                </div>

                <h2>
                  {pageTitles[activePage]}
                </h2>

                <p>
                  {language === "en"
                    ? "This module is under development."
                    : "हे मॉड्यूल सध्या विकसित केले जात आहे."}
                </p>

                <span>
                  {language === "en"
                    ? "We will connect this module with the farm monitoring system in the next step."
                    : "पुढील टप्प्यात हे मॉड्यूल शेत निरीक्षण प्रणालीशी जोडले जाईल."}
                </span>
              </div>
            </section>
          )}
      </main>
    </div>
  );
}

export default App;
