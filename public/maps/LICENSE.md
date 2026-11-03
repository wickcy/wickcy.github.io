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

For this site's country grouping, the Taiwan polygon is included in the China
MultiPolygon under `CHN`, named `中国`; there is no separate `TWN` feature.

This small-scale dataset is used for a travel overview. Some microstates and
small islands have no visible polygon at this scale; city points and city lists
remain the navigation entry for records in those locations.

## China province map

File: `china-provinces.json`.

Source: geoBoundaries gbOpen, China ADM1, boundary ID
`CHN-ADM1-43563684`, representing 2019 boundaries. The source metadata identifies
the underlying data as public domain (geoBoundaries / Wikimedia Commons).

- Metadata: https://www.geoboundaries.org/api/current/gbOpen/CHN/ADM1/
- Source snapshot: https://github.com/wmgeolab/geoBoundaries/tree/9469f09/releaseData/gbOpen/CHN/ADM1
- Geometry: https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/CHN/ADM1/geoBoundaries-CHN-ADM1_simplified.geojson
- geoBoundaries usage: https://www.geoboundaries.org/api.html

The local file retains all 34 province-level features, including Taiwan, Hong
Kong and Macao under China. English source labels were replaced with Chinese
labels, matched to the OCHA gazetteer below. Source spelling errors for Guangdong,
Ningxia, Xinjiang and Macao were normalized by their explicit province names.
Unused properties were removed, coordinates rounded to four decimal places,
and label positions computed from the largest polygon's area centroid.

## China city maps

Files: `china-cities/*.json`.

Attribution: United Nations Office for the Coordination of Humanitarian Affairs
(OCHA), China administrative boundaries, 2020 release, via the Humanitarian Data
Exchange (HDX). The source lists publicly available online sources as the
underlying provider. Licensed under Creative Commons Attribution 3.0 IGO.

- Dataset and license metadata: https://data.humdata.org/dataset/cod-ab-chn
- Machine-readable metadata: https://data.humdata.org/api/3/action/package_show?id=cod-ab-chn
- Original archive: https://data.humdata.org/dataset/17a2aaa2-dea9-4a2e-8b3f-92d1bdfb850c/resource/9e67ddf9-ce26-4b7a-82b1-51e5ca0714c8/download/chn_adm_ocha_2020_shp.zip
- License: https://creativecommons.org/licenses/by/3.0/igo/
- Independent license/coverage record for the same OCHA source: https://www.geoboundaries.org/api/current/gbHumanitarian/CHN/ADM2/

Modifications: the source Shapefile was converted to GeoJSON, split by province,
and reduced to Chinese names, administrative codes, label positions and original
source identifiers. Polygon parts, islands and holes were retained. Coordinates
were rounded to four decimal places, with higher precision retained where needed
to avoid collapsing small islands. Label positions use the largest polygon's
area centroid. The local files contain 360 features derived from 361 source
features: the former Laiwu feature was merged into Jinan, removing their shared
boundary. This follows the documented administrative change:
https://jntzcjj.jinan.gov.cn/col/col88564/

City codes were matched by exact province and Chinese city names to the public
administrative-code crosswalk at:
https://github.com/modood/Administrative-divisions-of-China/blob/master/dist/pc-code.json
(MIT-licensed repository). OCHA identifiers are preserved as `sourceId`; these
identifiers are not Chinese administrative codes. Source footnote markers were
removed; the source labels for Zhuzhou and Haixi were corrected, and Nagqu's
former prefecture name was updated to its city name. Nagqu change reference:
https://www.xizang.gov.cn/xwzx_406/dsdt/201812/t20181217_25234.html

The four municipalities use their province-level code and geometry. The source
does not provide subdivisions within Taiwan, Hong Kong or Macao, so those three
files retain a single region feature and declare `detailLevel: "region"`.

These are historical, generalized travel-overview boundaries, not a live
administrative register. Other changes since the source release are not inferred.
No endorsement by OCHA, the United Nations or geoBoundaries is implied.

All China map coordinates use WGS84 / CRS84, in longitude, latitude order. No
GCJ-02 coordinates or online map tiles are mixed into these assets. Retrieved and
adapted: 2026-11-03. Maps load from local static files and require no API key.
