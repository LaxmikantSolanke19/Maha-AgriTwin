const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const { spawn } = require("child_process");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const SENTINEL_STAC =
    "https://stac.dataspace.copernicus.eu/v1/search";

const TOKEN_URL =
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

const DOWNLOAD_DIR =
    path.join(__dirname, "downloads");

if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}
app.use(
    "/downloads",
    express.static(DOWNLOAD_DIR)
);

/* DATE RANGE */

function getDateRange(days) {
    const endDate = new Date();

    const startDate = new Date(
        endDate.getTime() -
        days * 24 * 60 * 60 * 1000
    );

    return {
        start: startDate.toISOString(),
        end: endDate.toISOString()
    };
}

/* SENTINEL FILTER */

function createFilter(latitude, longitude, maxCloud) {
    return {
        op: "and",
        args: [
            {
                op: "lte",
                args: [
                    {
                        property: "eo:cloud_cover"
                    },
                    maxCloud
                ]
            },
            {
                op: "s_intersects",
                args: [
                    {
                        property: "geometry"
                    },
                    {
                        type: "Point",
                        coordinates: [
                            longitude,
                            latitude
                        ]
                    }
                ]
            }
        ]
    };
}

/* SEARCH SENTINEL */

async function searchSentinel(
    latitude,
    longitude,
    days,
    maxCloud,
    limit = 1
) {
    const range = getDateRange(days);

    const params = new URLSearchParams();

    params.set(
        "collections",
        "sentinel-2-l2a"
    );

    params.set(
        "datetime",
        range.start + "/" + range.end
    );

    params.set(
        "filter-lang",
        "cql2-json"
    );

    params.set(
        "filter",
        JSON.stringify(
            createFilter(
                latitude,
                longitude,
                maxCloud
            )
        )
    );

    params.set(
        "limit",
        String(limit)
    );

    params.set(
        "sortby",
        "-properties.datetime"
    );

    const url =
        SENTINEL_STAC +
        "?" +
        params.toString();

    const response =
        await fetch(url);

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            JSON.stringify(data)
        );
    }

    return data.features || [];
}

/* GET SENTINEL TOKEN */

async function getSentinelToken() {
    const clientId =
        process.env.SENTINEL_CLIENT_ID;

    const clientSecret =
        process.env.SENTINEL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error(
            "Sentinel credentials missing in .env"
        );
    }

    const body =
        new URLSearchParams();

    body.append(
        "grant_type",
        "client_credentials"
    );

    body.append(
        "client_id",
        clientId
    );

    body.append(
        "client_secret",
        clientSecret
    );

    const response =
        await fetch(
            TOKEN_URL,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },
                body:
                    body.toString()
            }
        );

    const data =
        await response.json();

    if (
        !response.ok ||
        !data.access_token
    ) {
        throw new Error(
            "Sentinel authentication failed: " +
            JSON.stringify(data)
        );
    }

    return data.access_token;
}

/* GET HTTPS ASSET URL */

function getHttpsUrl(asset) {
    if (!asset) {
        return null;
    }

    if (
        asset.alternate &&
        asset.alternate.https
    ) {
        if (
            typeof asset.alternate.https ===
            "string"
        ) {
            return asset.alternate.https;
        }

        if (
            asset.alternate.https.href
        ) {
            return asset.alternate.https.href;
        }
    }

    return null;
}

/* DOWNLOAD BAND */

async function downloadBand(
    url,
    token,
    outputPath
) {
    if (!url) {
        throw new Error(
            "Band download URL is missing"
        );
    }

    console.log(
        "Downloading:",
        path.basename(outputPath)
    );

    const response =
        await fetch(
            url,
            {
                headers: {
                    Authorization:
                        "Bearer " + token
                }
            }
        );

    if (!response.ok) {
        const errorText =
            await response.text();

        throw new Error(
            "Band download failed: " +
            response.status +
            " " +
            errorText.substring(0, 500)
        );
    }

    if (!response.body) {
        throw new Error(
            "Empty response received while downloading band"
        );
    }

    const fileStream =
        fs.createWriteStream(
            outputPath
        );

    await pipeline(
        Readable.fromWeb(
            response.body
        ),
        fileStream
    );

    console.log(
        "Downloaded:",
        path.basename(outputPath)
    );
}


/* RUN PYTHON NDVI PROCESSOR */


function runNDVIProcessor(
    redPath,
    nirPath,
    farmBoundary,
    outputTif
) {
    return new Promise((resolve, reject) => {
        const args = [
            "ndvi_processor.py",
            redPath,
            nirPath,
            JSON.stringify(farmBoundary),
            outputTif
        ];

        console.log("========== NDVI DEBUG ==========");
        console.log("Python arguments count:", args.length);
        console.log("Red path:", redPath);
        console.log("NIR path:", nirPath);
        console.log("Farm boundary:", JSON.stringify(farmBoundary));
        console.log("Output path:", outputTif);
        console.log("================================");
        console.log("PYTHON SCRIPT:", require("path").resolve(__dirname, args[0]));
        console.log("ARGUMENTS SENT:", args);

        const python = spawn("python", args, {
            cwd: __dirname
        });

        let stdout = "";
        let stderr = "";

        python.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        python.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        python.on("error", (error) => {
            reject(error);
        });

        python.on("close", (code) => {
            console.log("Python exit code:", code);
            if (stderr) console.error("Python stderr:", stderr);
            if (stdout) console.log("Python stdout:", stdout);

            if (code !== 0) {
                return reject(
                    new Error(stderr || stdout || "NDVI processor failed")
                );
            }

            try {
                resolve(JSON.parse(stdout.trim()));
            } catch (error) {
                reject(
                    new Error("Invalid NDVI processor output: " + stdout)
                );
            }
        });
    });
}


/* HOME */

app.get(
    "/",
    function (req, res) {
        res.json({
            success: true,
            message:
                "Maha-AgriTwin backend is running"
        });
    }
);

/* SENTINEL AUTH TEST */

app.get(
    "/api/sentinel/test",
    async function (req, res) {
        try {
            const token =
                await getSentinelToken();

            res.json({
                success: true,
                message:
                    "Sentinel-2 authentication successful",
                tokenReceived:
                    Boolean(token)
            });

        } catch (error) {
            console.error(
                "Authentication error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Sentinel authentication failed",
                error:
                    error.message
            });
        }
    }
);
function getFarmCenter(farmBoundary) {
    if (
        !Array.isArray(farmBoundary) ||
        farmBoundary.length < 3
    ) {
        return null;
    }

    const points = farmBoundary.filter(
        (point) =>
            Array.isArray(point) &&
            point.length >= 2 &&
            Number.isFinite(Number(point[0])) &&
            Number.isFinite(Number(point[1])) &&
            Math.abs(Number(point[0])) <= 90 &&
            Math.abs(Number(point[1])) <= 180
    );

    if (points.length < 3) {
        return null;
    }

    return {
        latitude:
            points.reduce(
                (sum, point) => sum + Number(point[0]),
                0
            ) / points.length,

        longitude:
            points.reduce(
                (sum, point) => sum + Number(point[1]),
                0
            ) / points.length
    };
}
function getFarmCenter(farmBoundary) {
    if (!Array.isArray(farmBoundary) || farmBoundary.length < 3) {
        return null;
    }

    const points = farmBoundary.filter(
        (point) =>
            Array.isArray(point) &&
            point.length >= 2 &&
            Number.isFinite(Number(point[0])) &&
            Number.isFinite(Number(point[1])) &&
            Math.abs(Number(point[0])) <= 90 &&
            Math.abs(Number(point[1])) <= 180
    );

    if (points.length < 3) {
        return null;
    }

    return {
        latitude:
            points.reduce((sum, point) => sum + Number(point[0]), 0) /
            points.length,

        longitude:
            points.reduce((sum, point) => sum + Number(point[1]), 0) /
            points.length
    };
}

/* SENTINEL SEARCH */


/* ACTUAL NDVI */

app.post(
    "/api/sentinel/ndvi-real",
    async function (req, res) {
        try {
            const latitude =
                Number(req.body.latitude);

            const longitude =
                Number(req.body.longitude);

            const farmBoundary =
                req.body.farmBoundary || [];

            const farmCenter =
                getFarmCenter(farmBoundary);

            if (!farmCenter) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please draw a valid farm boundary first."
                });
            }

            const days =
                Number(req.body.days || 30);

            const maxCloud =
                Number(req.body.maxCloud || 30);

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Valid latitude and longitude are required"
                });
            }

            if (
                !Array.isArray(farmBoundary) ||
                farmBoundary.length < 3
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "At least 3 farm boundary points are required"
                });
            }

            console.log("");
            console.log("=================================");
            console.log("MAHA-AGRITWIN NDVI PROCESSING");
            console.log("Location:", latitude, longitude);
            console.log("=================================");

            /* 1. GET TOKEN */

            console.log(
                "1. Authenticating Sentinel..."
            );

            const token =
                await getSentinelToken();

            console.log(
                "Authentication successful."
            );

            /* 2. SEARCH IMAGE */

            console.log(
                "2. Searching latest Sentinel-2 image..."
            );

            const features =
                await searchSentinel(
                    farmCenter.latitude,
                    farmCenter.longitude,
                    days,
                    maxCloud,
                    1
                );

            if (features.length === 0) {
                return res.json({
                    success: true,
                    message:
                        "No suitable Sentinel-2 image found",

                    location: {
                        latitude,
                        longitude
                    },

                    ndvi: null,
                    cropHealth: null,
                    image: null,
                    ndviRaster: null
                });
            }

            const image = features[0];

            console.log(
                "Image selected:",
                image.id
            );

            console.log(
                "Cloud cover:",
                image.properties?.[
                "eo:cloud_cover"
                ]
            );

            /* 3. GET BANDS */

            const b04 =
                image.assets?.B04_10m;

            const b08 =
                image.assets?.B08_10m;

            if (!b04 || !b08) {
                throw new Error(
                    "B04 or B08 asset not available"
                );
            }

            const b04Url =
                getHttpsUrl(b04);

            const b08Url =
                getHttpsUrl(b08);

            if (!b04Url || !b08Url) {
                throw new Error(
                    "HTTPS download URL for B04/B08 is missing"
                );
            }

            /* 4. FILE PATHS */

            const imageId =
                image.id.replace(
                    /[^a-zA-Z0-9_-]/g,
                    "_"
                );

            const redPath =
                path.join(
                    DOWNLOAD_DIR,
                    imageId + "_B04.jp2"
                );

            const nirPath =
                path.join(
                    DOWNLOAD_DIR,
                    imageId + "_B08.jp2"
                );

            const ndviPath =
                path.join(
                    DOWNLOAD_DIR,
                    imageId + "_NDVI.tif"
                );

            /* 5. DOWNLOAD B04 */

            console.log(
                "3. Downloading B04 Red band..."
            );

            await downloadBand(
                b04Url,
                token,
                redPath
            );

            /* 6. DOWNLOAD B08 */

            console.log(
                "4. Downloading B08 NIR band..."
            );

            await downloadBand(
                b08Url,
                token,
                nirPath
            );

            /* 7. RUN PYTHON NDVI PROCESSOR */

            console.log(
                "5. Calculating actual NDVI..."
            );

            console.log(
                "Farm boundary points:",
                farmBoundary
            );

            const ndviResult =
                await runNDVIProcessor(
                    redPath,
                    nirPath,
                    farmBoundary,
                    ndviPath
                );

            console.log(
                "NDVI result:",
                ndviResult
            );

            /* 8. RESPONSE */

            res.json({
                success:
                    ndviResult.success,

                message:
                    "Actual Sentinel-2 NDVI calculated successfully",

                location: {
                    latitude,
                    longitude
                },

                image: {
                    id: image.id,

                    date:
                        image.properties?.datetime ||
                        null,

                    cloudCover:
                        image.properties?.[
                        "eo:cloud_cover"
                        ] ?? null,

                    collection:
                        image.collection ||
                        "sentinel-2-l2a"
                },

                ndvi:
                    ndviResult.ndvi ?? null,

                min:
                    ndviResult.min ?? null,

                max:
                    ndviResult.max ?? null,

                pixels:
                    ndviResult.pixels ?? null,

                cropHealth:
                    ndviResult.cropHealth ?? null,

                ndviRaster:
                    ndviResult.success
                        ? "/downloads/" +
                        path.basename(ndviPath)
                        : null,

                status:
                    ndviResult.success
                        ? "NDVI_CALCULATED"
                        : "NDVI_FAILED"
            });

        } catch (error) {
            console.error(
                "NDVI processing error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Actual NDVI processing failed",
                error: error.message
            });
        }
    }
);

/* SERVER START */

app.listen(
    PORT,
    function () {
        console.log(
            "Maha-AgriTwin backend running on http://localhost:" +
            PORT
        );
    }
);