import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 5000;

/* =========================================
   COPERNICUS ACCESS TOKEN
========================================= */

async function getAccessToken() {
  const response = await axios.post(
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.COPERNICUS_CLIENT_ID,
      client_secret: process.env.COPERNICUS_CLIENT_SECRET,
    }),
    {
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data.access_token;
}

/* =========================================
   HOME
========================================= */

app.get("/", (req, res) => {
  res.json({
    message: "Maha-AgriTwin Backend is running",
  });
});

/* =========================================
   COPERNICUS TEST
========================================= */

app.get("/api/test", async (req, res) => {
  try {
    const token = await getAccessToken();

    res.json({
      success: true,
      message:
        "Copernicus authentication successful",
      tokenReceived: !!token,
    });
  } catch (error) {
    console.error(
      error.response?.data ||
        error.message
    );

    res.status(500).json({
      success: false,
      message:
        "Copernicus authentication failed",
    });
  }
});

/* =========================================
   SENTINEL-2 SEARCH
========================================= */

app.post(
  "/api/sentinel/search",
  async (req, res) => {
    try {
      const {
        bbox,
        from,
        to,
        maxCloudCoverage = 30,
      } = req.body;

      /* -------------------------------
         VALIDATION
      -------------------------------- */

      if (
        !bbox ||
        !Array.isArray(bbox) ||
        bbox.length !== 4
      ) {
        return res.status(400).json({
          success: false,
          message:
            "bbox must contain [minLon, minLat, maxLon, maxLat].",
        });
      }

      if (!from || !to) {
        return res.status(400).json({
          success: false,
          message:
            "from and to dates are required.",
        });
      }

      /* -------------------------------
         GET TOKEN
      -------------------------------- */

      const token =
        await getAccessToken();

      /* -------------------------------
         SENTINEL-2 CATALOG SEARCH
      -------------------------------- */

      const response =
        await axios.post(
          "https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search",
          {
            bbox,

            datetime:
              `${from}T00:00:00Z/` +
              `${to}T23:59:59Z`,

            collections: [
              "sentinel-2-l2a",
            ],

            limit: 20,

            filter:
              `eo:cloud_cover <= ${Number(
                maxCloudCoverage
              )}`,
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },
          }
        );

      /* -------------------------------
         FORMAT RESULTS
      -------------------------------- */

      const features =
        response.data?.features || [];

      const results =
        features.map((item) => ({
          id: item.id,

          date:
            item.properties?.datetime ||
            item.properties
              ?.start_datetime ||
            null,

          cloudCover:
            item.properties?.[
              "eo:cloud_cover"
            ] ?? null,

          collection:
            item.collection || null,

          geometry:
            item.geometry || null,

          bbox:
            item.bbox || null,

          properties:
            item.properties || {},
        }));

      /* -------------------------------
         RESPONSE
      -------------------------------- */

      res.json({
        success: true,

        search: {
          bbox,
          from,
          to,
          maxCloudCoverage,
        },

        count: results.length,

        results,
      });
    } catch (error) {
      console.error(
        "Sentinel search error:"
      );

      console.error(
        error.response?.data ||
          error.message
      );

      res.status(500).json({
        success: false,

        message:
          "Sentinel-2 search failed.",

        error:
          error.response?.data ||
          error.message,
      });
    }
  }
);

/* =========================================
   SERVER
========================================= */

app.listen(PORT, () => {
  console.log(
    `Maha-AgriTwin server running on port ${PORT}`
  );
});