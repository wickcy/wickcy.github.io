# World map data

Source: Natural Earth, 1:110m Admin 0 countries.

Original dataset:
https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson

Terms of use:
https://www.naturalearthdata.com/about/terms-of-use/

Natural Earth raster and vector map data are in the public domain.
No permission is needed to use or adapt the data.

Retrieved: 2026-11-03.

The local world-110m.json retains country geometries, ISO_A3_EH country codes
(falling back to ADM0_A3 where needed) and Chinese country names. Other attributes
were removed and coordinates were rounded to three decimal places to reduce size.
Coordinates use longitude, latitude in WGS84 / CRS84.

This small-scale dataset is used for a travel overview. Some microstates and
small islands have no visible polygon at this scale; city points and city lists
remain the navigation entry for records in those locations.
