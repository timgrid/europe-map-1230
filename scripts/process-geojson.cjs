const fs = require('fs');
const path = require('path');
const d3 = require('d3-geo');

const year = parseInt(process.argv[2]) || 1200;

// ─── Color palette ───────────────────────────────────────────────────────────
const colorMap = {
  'England': '#C41E3A',
  'English territory': '#C41E3A',
  'Angevin Empire': '#C41E3A',
  'England and Ireland': '#C41E3A',
  'Scotland': '#005EB8',
  'Ireland': '#169B62',
  'France': '#002395',
  'Denmark': '#C60C30',
  'Denmark-Norway': '#C60C30',
  'Norway': '#BA0C2F',
  'Sweden': '#006AA7',
  'Kalmar Union': '#C60C30',
  'Poland': '#DC143C',
  'Poland-Lithuania': '#DC143C',
  'Hungary': '#436F4D',
  'Imperial Hungary': '#436F4D',
  'Kingdom of Hungary': '#436F4D',
  'Portugal': '#006600',
  'Castile': '#8B0000',
  'Aragon': '#FFCC00',
  'Navarre': '#D4AF37',
  'Spain': '#8B0000',
  'Almohad Caliphate': '#2F4F4F',
  'Sicily': '#800000',
  'Byzantine Empire': '#8B008B',
  'Bulgaria': '#228B22',
  'Serbia': '#4169E1',
  'Kievan Rus': '#4682B4',
  'Rum': '#8B4513',
  'Georgia': '#DC143C',
  'Cilician Armenia': '#FF8C00',
  'Lithuania': '#556B2F',
  'Teutonic Order': '#8B8B8B',
  'Teutonic Knights': '#8B8B8B',
  'Prussia': '#556B2F',
  'Holy Roman Empire': '#DAA520',
  'Papal States': '#FFEB3B',
  'Venice': '#1E3A5F',
  'Genoa': '#DC143C',
  'Milan': '#A52A2A',
  'Florence': '#228B22',
  'Naples': '#8B0000',
  'Savoy': '#FF6347',
  'Cyprus': '#DAA520',
  'Jerusalem': '#FFD700',
  'Antioch': '#FF6347',
  'Tripoli': '#FF7F50',
  'Latin Empire': '#4169E1',
  'Achaea': '#9932CC',
  'Epirus': '#6A5ACD',
  'Cumania': '#D2691E',
  'Croatia': '#FF4500',
  'Bosnia': '#A0522D',
  'Bohemia': '#11457E',
  'Toulouse': '#FF6347',
  'Aquitaine': '#228B22',
  'Brittany': '#4682B4',
  'Burgundy': '#8B0000',
  'Normandy': '#6A5ACD',
  'Sardinia': '#228B22',
  'Corsica': '#4682B4',
  'Golden Horde': '#8B4513',
  'Khanate of the Golden Horde': '#8B4513',
  'Leon': '#B22222',
  'Celtic kingdoms': '#2E8B57',
  'Duchy of Benevento': '#8B4513',
  'Buwayhid Emirates': '#6B8E23',
  'Fatimid Caliphate': '#2F4F4F',
  'Berber Tribes': '#A0896B',
  'Ibadites': '#8B8378',
  'Tuareg': '#CD853F',
  'Volga Bulgaria': '#8B6914',
  'Cuman Khanates': '#D2691E',
  'Finno-Ugric tribes': '#6B8E23',
  'Armenia': '#FF8C00',
  'Sami': '#B8860B',
  'Granada': '#006400',
  'Abdelouadides': '#8B7355',
  'Hafsid Caliphate': '#5C4033',
  'Merinides': '#A0522D',
  'Morocco': '#2F4F4F',
  'Wattasid Caliphate': '#2F4F4F',
  'Mamluke Sultanate': '#800020',
  'Ilkhanate': '#B22222',
  'Seljuk Caliphate': '#CD853F',
  'Trebizond': '#9370DB',
  'Novgorod': '#5B8DB8',
  'Pskov': '#5B8DB8',
  'Novgorod-Seversky': '#5B8DB8',
  'Ryazan': '#6A8BA8',
  'Siberians': '#6B8E23',
  'Crimean Khanate': '#8B4513',
  'Khanate of Sibir': '#8B4513',
  'Kazan Khanate': '#8B4513',
  'Astrakhan Khanate': '#8B4513',
  'Nogai Horde': '#8B4513',
  'White Horde': '#8B4513',
  'Blue Horde': '#8B4513',
  'Ottoman Empire': '#B22222',
  'Grand Duchy of Moscow': '#8B0000',
  'Tsardom of Muscovy': '#8B0000',
  'Moldova': '#4169E1',
  'Principality of Wallachia': '#4169E1',
  'Beylik of Aydin': '#8B6914',
  'Bukara Khanate': '#D2691E',
  'Swiss Confederation': '#FF0000',
  'Republic of the Seven Zenden': '#FF0000',
  'Habsburg Netherlands': '#FF8C00',
  'Safavid Empire': '#2E8B57',
  'Mughal Empire': '#FF1493',
  'Sultanate of Delhi': '#FF8C00',
  'Chagatai Khanate': '#D2691E',
  'Timurid Empire': '#D2691E',
  'Timurid Emirates': '#D2691E',
  'Zayyanid Caliphate': '#2F4F4F',
  'Emirate of the White Sheep Turks': '#D2691E',
  'Songhai': '#DAA520',
  'Mali': '#DAA520',
  'Benin': '#A0522D',
  'Ghana': '#DAA520',
  'Song Empire': '#8B0000',
  'Ming Chinese Empire': '#8B0000',
  'Arabs': '#C19A6B',
  'Mongol Empire': '#8B4513',
  'Great Khanate': '#8B4513',
  'Mongol tribes': '#8B4513',
  'Tibet': '#8B7355',
  'Chagatai Khanate': '#D2691E',
  'Oirat Confederation': '#8B4513',
  'Tungusic Tribes': '#6B8E23',
  'Khiva Khanate': '#D2691E',
  'central Asian khanates': '#D2691E',
  'Khanate of Sibir': '#8B4513',
  'Quazaq Khanate': '#D2691E',
};
const defaultColor = '#888888';
function getColor(name) {
  return colorMap[name] || defaultColor;
}

// ─── Year-specific config ─────────────────────────────────────────────────────
// Aliases common to all years (spelling fixes)
const commonAliases = {
  'Castilla': 'Castile',
  'Castille': 'Castile',
  'Burgandy': 'Burgundy',
  'Britany': 'Brittany',
  'Aragón': 'Aragon',
  'Bulgar Khanate': 'Bulgaria',
  'Kingdom of France': 'France',
  'Comté de Toulouse': 'Toulouse',
  'León': 'Leon',
  'Dutchy of Benevento': 'Duchy of Benevento',
  'Sámi': 'Sami',
  'Samis': 'Sami',
  'Cuman Khanates': 'Cumania',
  'Volga Bulgars': 'Volga Bulgaria',
  'Finno-Ugric taiga hunter-gatherers': 'Finno-Ugric tribes',
  'Tuareg Nomadic Tribes': 'Tuareg',
  'Touareg': 'Tuareg',
  'Berber Tribes': 'Berber Tribes',
  'Ibadites': 'Ibadites',
  'Teutonic Knights': 'Teutonic Order',
  'Khanate of the Golden Horde': 'Golden Horde',
  'English territory': 'England',
  'England and Ireland': 'England',
  'Scottland': 'Scotland',
  'Raška': 'Serbia',
  'Watassid Morocco': 'Morocco',
  'Wattasid Caliphate': 'Morocco',
  'Granad': 'Granada',
  'Zayyanid Caliphate': 'Granada',
  'Poland-Llituania': 'Poland-Lithuania',
  'Bukara Khanate': 'Chagatai Khanate',
  'Caloosahatchee cultureure': 'Caloosahatchee culture',
  'Buyiids': 'Buwayhid Emirates',
  'England territory': 'England',
  'Aquitaine': 'France',
  'Khanate of the Golden Horde': 'Golden Horde',
  'Kingdom of Hungary': 'Hungary',
  'Imperial Hungary': 'Hungary',
  'Principality of Wallachia': 'Moldova',
  'Beylik of Aydin': 'Ottoman Empire',
  'Emirate of the White Sheep Turks': 'Ottoman Empire',
  'Republic of the Seven Zenden': 'Swiss Confederation',
  'Prussia': 'Teutonic Order',
  'Novgorod-Seversky': 'Novgorod',
  'Pskov': 'Novgorod',
  'Tsardom of Muscovy': 'Grand Duchy of Moscow',
  'Ghana': 'Mali',
};

const configs = {
  1200: {
    nameAliases: { ...commonAliases },
    mergeInto: {
      'Other Rus Principalities': 'Kievan Rus',
      'Principality of Galicia-Volhynia': 'Kievan Rus',
      'Principality of Kyiv': 'Kievan Rus',
      'Principality of Novgorod': 'Kievan Rus',
      'Principality of Vladimir-Suzdal': 'Kievan Rus',
      'Angevin Empire': 'England',
    },
  },
  1279: {
    nameAliases: { ...commonAliases },
    mergeInto: {},
  },
  1300: {
    nameAliases: { ...commonAliases },
    mergeInto: {},
  },
  1400: {
    nameAliases: { ...commonAliases },
    mergeInto: {},
  },
  1492: {
    nameAliases: { ...commonAliases },
    mergeInto: {},
  },
  1500: {
    nameAliases: { ...commonAliases },
    mergeInto: {},
  },
  1530: {
    nameAliases: { ...commonAliases },
    mergeInto: {
      'England and Ireland': 'England',
    },
  },
};
const cfg = configs[year] || configs[1200];

// ─── Unnamed feature routing ─────────────────────────────────────────────────
function routeUnnamed(centroidLon, centroidLat, vertCount, year) {
  if (vertCount < 10) return null;

  // Hebrides / Western Isles → Scotland
  if (centroidLon >= -7.6 && centroidLon <= -6.0 && centroidLat >= 55.0 && centroidLat <= 58.6) return 'Scotland';
  // Orkney → Scotland
  if (centroidLon >= -3.5 && centroidLon <= -2.3 && centroidLat >= 58.6 && centroidLat <= 59.5) return 'Scotland';
  // Shetland → Scotland
  if (centroidLon >= -1.8 && centroidLon <= -0.7 && centroidLat >= 59.8 && centroidLat <= 61.0) return 'Scotland';
  // Faroe → Norway
  if (centroidLon >= -7.5 && centroidLon <= -6.3 && centroidLat >= 61.3 && centroidLat <= 62.5) return 'Norway';
  // Isle of Man
  if (centroidLon >= -4.9 && centroidLon <= -4.2 && centroidLat >= 54.0 && centroidLat <= 54.5) return 'Scotland';
  // North Irish Sea islands
  if (centroidLon >= -6.1 && centroidLon <= -5.0 && centroidLat >= 54.3 && centroidLat <= 55.0) return 'Scotland';
  // Aegean islands → Byzantine Empire (both years)
  if (centroidLon >= 22.8 && centroidLon <= 26.3 && centroidLat >= 36.0 && centroidLat <= 39.2) return 'Byzantine Empire';
  if (centroidLon >= 20.0 && centroidLon <= 21.5 && centroidLat >= 38.0 && centroidLat <= 39.8) return 'Byzantine Empire';
  // Crimea micro
  if (centroidLon >= 29.5 && centroidLon <= 30.5 && centroidLat >= 45.5 && centroidLat <= 46.0) {
    return year === 1279 ? 'Golden Horde' : 'Kievan Rus';
  }
  // Bulgaria/Wallachia micro
  if (centroidLon >= 22.0 && centroidLon <= 30.0 && centroidLat >= 43.5 && centroidLat <= 46.7) return 'Bulgaria';
  // Baltic coast → HRE
  if (centroidLon >= 10.0 && centroidLon <= 29.0 && centroidLat >= 52.0 && centroidLat <= 59.6) return 'Holy Roman Empire';
  // Sardinia / Corsica micro islands
  if (centroidLon >= 8.0 && centroidLon <= 10.0 && centroidLat >= 40.5 && centroidLat <= 41.5) return 'Sardinia';
  // Middle East → Ilkhanate in 1279, Buwayhid in 1200
  if (centroidLon > 35.0 && centroidLat >= 15.0 && centroidLat <= 36.0) {
    return year === 1279 ? 'Ilkhanate' : 'Buwayhid Emirates';
  }
  return null;
}

// ─── Geo helpers ─────────────────────────────────────────────────────────────
const naturalEarth = d3.geoNaturalEarth1().scale(1).translate([0, 0]);
function project(lon, lat) {
  const [x, y] = naturalEarth([lon, lat]);
  return [x, -y];
}

function computeCentroid(geom) {
  let sumLon = 0, sumLat = 0, count = 0;
  function walk(arr) { if (Array.isArray(arr[0])) arr.forEach(walk); else { sumLon += arr[0]; sumLat += arr[1]; count++; } }
  walk(geom.coordinates);
  return count > 0 ? [sumLon / count, sumLat / count] : [0, 0];
}

function countVertices(geom) {
  let n = 0;
  function walk(arr) { if (Array.isArray(arr[0])) arr.forEach(walk); else n++; }
  walk(geom.coordinates);
  return n;
}

function isInEuropeCheck(geom) {
  let found = false;
  function walk(arr) {
    if (Array.isArray(arr[0])) arr.forEach(walk);
    else if (arr.length >= 2) {
      const lon = arr[0], lat = arr[1];
      if (lon >= -12 && lon <= 50 && lat >= 28 && lat <= 72) found = true;
    }
  }
  walk(geom.coordinates);
  return found;
}

function extractPolygons(geom) {
  const polygons = [];
  function extractRing(rings) {
    const outer = rings[0].map(([lon, lat]) => project(lon, lat));
    const holes = rings.slice(1).map(ring => ring.map(([lon, lat]) => project(lon, lat)));
    return { outer, holes };
  }
  if (geom.type === 'Polygon') {
    polygons.push(extractRing(geom.coordinates));
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates.forEach(r => polygons.push(extractRing(r)));
  }
  return polygons;
}

// ─── ID overrides ────────────────────────────────────────────────────────────
const idOverrides = {
  'bulgaria': 'bulgar_khanate',
  'burgundy': 'burgandy',
  'duchy_of_benevento': 'dutchy_of_benevento',
};

// ─── Main ────────────────────────────────────────────────────────────────────
function processGeoJSON() {
  const inputFile = path.join(__dirname, '..', 'public', `world_${year}.geojson`);
  const outputFile = path.join(__dirname, '..', 'public', 'data', 'processed', `europe_${year}.json`);

  if (!fs.existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`);
    process.exit(1);
  }

  const geojson = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const groups = new Map();

  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if (!geom) continue;
    if (!isInEuropeCheck(geom)) continue;

    let rawName = feature.properties?.NAME || null;
    const vertCount = countVertices(geom);

    if (!rawName) {
      const [clon, clat] = computeCentroid(geom);
      const route = routeUnnamed(clon, clat, vertCount, year);
      if (!route) continue;
      rawName = route;
    }

    if (cfg.mergeInto[rawName]) rawName = cfg.mergeInto[rawName];
    const canonical = cfg.nameAliases[rawName] || rawName;

    if (!groups.has(canonical)) groups.set(canonical, { name: canonical, polygons: [] });
    const entry = groups.get(canonical);
    const polys = extractPolygons(geom);
    entry.polygons.push(...polys);
  }

  const countries = [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  for (const [canonical, entry] of groups) {
    let sumX = 0, sumY = 0, count = 0;
    for (const poly of entry.polygons) {
      for (const [x, y] of poly.outer) {
        sumX += x; sumY += y; count++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (count === 0) continue;

    const autoId = canonical.replace(/[\s-]+/g, '_').toLowerCase();
    countries.push({
      id: idOverrides[autoId] || autoId,
      name: canonical,
      color: getColor(canonical),
      center: [sumX / count, sumY / count],
      polygons: entry.polygons,
    });
  }

  const mapWidth = maxX - minX;
  const scale = 300 / mapWidth;
  const offsetX = -(minX + maxX) / 2;
  const offsetY = -(minY + maxY) / 2;

  const output = {
    year,
    bounds: { minX, maxX, minY, maxY },
    scale, offsetX, offsetY,
    countries: countries.map(c => ({
      ...c,
      center: [+(c.center[0] + offsetX) * scale, +(c.center[1] + offsetY) * scale].map(v => +v.toFixed(2)),
      polygons: c.polygons.map(p => ({
        outer: p.outer.map(pt => [+((pt[0] + offsetX) * scale).toFixed(2), +((pt[1] + offsetY) * scale).toFixed(2)]),
        holes: p.holes.map(h => h.map(pt => [+((pt[0] + offsetX) * scale).toFixed(2), +((pt[1] + offsetY) * scale).toFixed(2)])),
      })),
    })),
  };

  fs.writeFileSync(outputFile, JSON.stringify(output));
  console.log(`[${year}] Processed ${countries.length} countries`);
  console.log(`[${year}] Bounds: X ${minX.toFixed(4)}..${maxX.toFixed(4)}, Y ${minY.toFixed(4)}..${maxY.toFixed(4)}`);
  console.log(`[${year}] Scale: ${scale.toFixed(2)}`);
  console.log(`[${year}] Saved to ${path.relative(path.join(__dirname, '..'), outputFile)}`);
  console.log(`[${year}]`);

  countries.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
    let v = 0; c.polygons.forEach(p => { v += p.outer.length; p.holes.forEach(h => v += h.length); });
    console.log(`  ${c.color === defaultColor ? '⚠' : '✓'} ${c.name.padEnd(30)} ${v} verts ${c.polygons.length > 1 ? '('+c.polygons.length+' polys)' : ''}`);
  });
}

processGeoJSON();
