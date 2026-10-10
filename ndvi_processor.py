import sys
import json
import os
import warnings

import numpy as np
import rasterio

from rasterio.mask import mask
from shapely.geometry import Polygon, mapping
from pyproj import Transformer

warnings.filterwarnings(
    "ignore",
    message=".*shapely.ops.transform.*",
    category=DeprecationWarning
)


def output_result(result, exit_code=0):
    print(json.dumps(result), flush=True)
    sys.exit(exit_code)


try:
    # =========================================
    # 1. VALIDATE COMMAND-LINE ARGUMENTS
    # =========================================

    if len(sys.argv) != 5:
        raise ValueError(
            f"Expected 4 arguments after script name, "
            f"but received {len(sys.argv) - 1}. "
            f"Usage: python ndvi_processor.py "
            f"<B04_file> <B08_file> "
            f"<farm_boundary_json> <output_tif>"
        )

    red_path = sys.argv[1]
    nir_path = sys.argv[2]
    farm_boundary = json.loads(sys.argv[3])
    output_tif = sys.argv[4]

    if not os.path.isfile(red_path):
        raise FileNotFoundError(
            f"Red band file not found: {red_path}"
        )

    if not os.path.isfile(nir_path):
        raise FileNotFoundError(
            f"NIR band file not found: {nir_path}"
        )

    if not isinstance(farm_boundary, list):
        raise ValueError(
            "Farm boundary must be a JSON list"
        )

    if len(farm_boundary) < 3:
        raise ValueError(
            "At least 3 farm boundary points are required"
        )

    # =========================================
    # 2. VALIDATE FARM BOUNDARY
    # =========================================

    polygon_coordinates = []

    for point in farm_boundary:
        if (
            not isinstance(point, (list, tuple))
            or len(point) < 2
        ):
            raise ValueError(
                "Invalid farm boundary point"
            )

        latitude = float(point[0])
        longitude = float(point[1])

        if not (
            np.isfinite(latitude)
            and np.isfinite(longitude)
            and -90 <= latitude <= 90
            and -180 <= longitude <= 180
        ):
            raise ValueError(
                "Invalid latitude or longitude"
            )

        # Leaflet [latitude, longitude]
        # -> Shapely [longitude, latitude]
        polygon_coordinates.append(
            [longitude, latitude]
        )

    if polygon_coordinates[0] != polygon_coordinates[-1]:
        polygon_coordinates.append(
            polygon_coordinates[0]
        )

    polygon = Polygon(polygon_coordinates)

    if not polygon.is_valid:
        polygon = polygon.buffer(0)

    if polygon.is_empty or polygon.area == 0:
        raise ValueError(
            "Farm boundary polygon is invalid or empty"
        )

    # =========================================
    # 3. OPEN SENTINEL-2 BANDS
    # =========================================

    with rasterio.open(red_path) as red_src, \
            rasterio.open(nir_path) as nir_src:

        if red_src.crs is None or nir_src.crs is None:
            raise ValueError(
                "Satellite raster CRS is missing"
            )

        if red_src.crs != nir_src.crs:
            raise ValueError(
                "B04 and B08 coordinate systems do not match"
            )

        if (
            red_src.width != nir_src.width
            or red_src.height != nir_src.height
            or red_src.transform != nir_src.transform
        ):
            raise ValueError(
                "B04 and B08 grids do not align"
            )

        # =========================================
        # 4. PROJECT FARM BOUNDARY
        # =========================================

        transformer = Transformer.from_crs(
            "EPSG:4326",
            red_src.crs,
            always_xy=True
        )

        projected_coordinates = [
            list(transformer.transform(x, y))
            for x, y in polygon.exterior.coords
        ]

        polygon_projected = Polygon(
            projected_coordinates
        )

        if not polygon_projected.is_valid:
            polygon_projected = polygon_projected.buffer(0)

        if polygon_projected.is_empty:
            raise ValueError(
                "Projected farm boundary is invalid"
            )

        # =========================================
        # 5. CHECK RASTER OVERLAP
        # =========================================

        raster_bounds = red_src.bounds
        farm_bounds = polygon_projected.bounds

        overlaps = not (
            farm_bounds[2] < raster_bounds.left
            or farm_bounds[0] > raster_bounds.right
            or farm_bounds[3] < raster_bounds.bottom
            or farm_bounds[1] > raster_bounds.top
        )

        if not overlaps:
            raise ValueError(
                "Farm boundary does not overlap the selected "
                "Sentinel image. Check the farm location."
            )

        geometry = [
            mapping(polygon_projected)
        ]

        # =========================================
        # 6. CLIP B04 AND B08 TO FARM
        # =========================================

        red_data, out_transform = mask(
            red_src,
            geometry,
            crop=True,
            filled=False
        )

        nir_data, _ = mask(
            nir_src,
            geometry,
            crop=True,
            filled=False
        )

        if red_data.shape != nir_data.shape:
            raise ValueError(
                "Masked B04 and B08 shapes do not match"
            )

        red = np.ma.asarray(
            red_data[0],
            dtype=np.float32
        )

        nir = np.ma.asarray(
            nir_data[0],
            dtype=np.float32
        )

        # =========================================
        # 7. CONVERT TO REFLECTANCE
        # =========================================

        red_scale = (
            red_src.scales[0]
            if red_src.scales
            and red_src.scales[0] is not None
            else 0.0001
        )

        nir_scale = (
            nir_src.scales[0]
            if nir_src.scales
            and nir_src.scales[0] is not None
            else 0.0001
        )

        red_offset = (
            red_src.offsets[0]
            if red_src.offsets
            and red_src.offsets[0] is not None
            else 0.0
        )

        nir_offset = (
            nir_src.offsets[0]
            if nir_src.offsets
            and nir_src.offsets[0] is not None
            else 0.0
        )

        red_reflectance = (
            red * red_scale + red_offset
        )

        nir_reflectance = (
            nir * nir_scale + nir_offset
        )

        # =========================================
        # 8. CALCULATE NDVI
        # NDVI = (NIR - RED) / (NIR + RED)
        # =========================================

        denominator = (
            nir_reflectance + red_reflectance
        )

        red_values = np.ma.filled(
            red_reflectance,
            np.nan
        )

        nir_values = np.ma.filled(
            nir_reflectance,
            np.nan
        )

        denominator_values = np.ma.filled(
            denominator,
            np.nan
        )

        valid_pixels = (
            ~np.ma.getmaskarray(red_reflectance)
            & ~np.ma.getmaskarray(nir_reflectance)
            & np.isfinite(red_values)
            & np.isfinite(nir_values)
            & np.isfinite(denominator_values)
            & (np.abs(denominator_values) > 1e-10)
        )

        ndvi = np.full(
            denominator.shape,
            np.nan,
            dtype=np.float32
        )

        ndvi[valid_pixels] = (
            (
                nir_values[valid_pixels]
                - red_values[valid_pixels]
            )
            / denominator_values[valid_pixels]
        )

        valid = ndvi[
            np.isfinite(ndvi)
            & (ndvi >= -1)
            & (ndvi <= 1)
        ]

        if valid.size == 0:
            raise ValueError(
                "No valid NDVI pixels found inside farm boundary"
            )

        # =========================================
        # 9. NDVI STATISTICS
        # =========================================

        mean_ndvi = float(np.mean(valid))
        min_ndvi = float(np.min(valid))
        max_ndvi = float(np.max(valid))

        # =========================================
        # 10. SAVE NDVI GEOTIFF
        # =========================================

        nodata_value = -9999.0

        ndvi_output = np.where(
            np.isfinite(ndvi)
            & (ndvi >= -1)
            & (ndvi <= 1),
            ndvi,
            nodata_value
        ).astype(np.float32)

        profile = red_src.profile.copy()

        profile.update(
            driver="GTiff",
            height=ndvi_output.shape[0],
            width=ndvi_output.shape[1],
            count=1,
            dtype="float32",
            transform=out_transform,
            nodata=nodata_value,
            compress="deflate"
        )

        output_directory = os.path.dirname(
            os.path.abspath(output_tif)
        )

        os.makedirs(
            output_directory,
            exist_ok=True
        )

        with rasterio.open(
            output_tif,
            "w",
            **profile
        ) as dst:
            dst.write(ndvi_output, 1)

        # =========================================
        # 11. VEGETATION CONDITION
        # =========================================

        if mean_ndvi < 0:
            health = "Water / Non-vegetation"
        elif mean_ndvi < 0.2:
            health = "Bare soil / Very low vegetation"
        elif mean_ndvi < 0.4:
            health = "Moderate vegetation"
        elif mean_ndvi < 0.6:
            health = "Good vegetation"
        else:
            health = "Healthy vegetation"

        # =========================================
        # 12. RETURN RESULTS
        # =========================================

        output_result({
            "success": True,
            "ndvi": round(mean_ndvi, 4),
            "min": round(min_ndvi, 4),
            "max": round(max_ndvi, 4),
            "pixels": int(valid.size),
            "cropHealth": health,
            "rasterPath": output_tif
        })


except SystemExit:
    raise

except Exception as error:
    print(
        json.dumps({
            "success": False,
            "message": "NDVI processing failed",
            "error": str(error)
        }),
        flush=True
    )
    sys.exit(1)
