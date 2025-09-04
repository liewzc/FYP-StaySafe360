// api/dataGov.js
// 统一从 data.gov.sg 拉数据（优先 v2，缺失时回退 v1）。
// 所有函数返回 { value, timestamp, overlays? }，getAll() 汇总给 HomeScreen 使用。

const JSON_HEADERS = { Accept: "application/json" };

/* ----------------------------- helpers ----------------------------- */
function distanceKm(a, b) {
  if (!a || !b) return Infinity;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function pickNearestWithValue(userLoc, list, locKey = "location", valKey = "value") {
  const cands = list.filter(
    (s) => s?.[locKey]?.latitude && s?.[locKey]?.longitude && s[valKey] != null
  );
  if (!cands.length) return null;
  if (!userLoc) return cands[0];
  return cands.reduce((a, b) => {
    const da = distanceKm(userLoc, a[locKey]);
    const db = distanceKm(userLoc, b[locKey]);
    return da < db ? a : b;
  });
}

function safeGetReadingsV2(json) {
  return (
    json?.data?.readings ||
    json?.data?.items?.[0]?.readings ||
    json?.readings ||
    []
  );
}

function safeGetStationsV2(json) {
  return (
    json?.data?.stations ||
    json?.data?.metadata?.stations ||
    json?.stations ||
    []
  );
}

function safeGetTimestampV2(json) {
  return (
    json?.data?.timestamp ||
    json?.data?.items?.[0]?.timestamp ||
    json?.timestamp ||
    null
  );
}

/** 把 v2 相对湿度各种形态规整成 [{stationId, value}] */
function normalizeHumidityReadingsV2(json) {
  let rd =
    json?.data?.readings ||
    json?.data?.items?.[0]?.readings ||
    json?.readings ||
    null;

  // 另一种结构：data.items[0].stationsReadings => [{ stationId, readings/measurements:[{type, unit, value}] }]
  if (!rd) {
    const sr = json?.data?.items?.[0]?.stationsReadings || json?.stationsReadings;
    if (Array.isArray(sr)) {
      rd = sr.map((s) => {
        const mArr = s.readings || s.measurements || [];
        const match =
          mArr.find((m) => (m.type || "").toLowerCase().includes("humidity")) ||
          mArr.find((m) => (m.unit || "").includes("%")) ||
          mArr[0];
        const v = match?.value;
        const num = typeof v === "number" ? v : Number(v);
        return { stationId: s.stationId ?? s.station_id, value: num };
      });
    }
  }

  if (!Array.isArray(rd)) return [];
  return rd.map((r) => ({
    stationId: r.stationId ?? r.station_id ?? r.id,
    value: typeof r?.value === "number" ? r.value : Number(r?.value),
  }));
}

/* -------------------------- air temperature ------------------------- */
async function airTemperature(userLoc) {
  try {
    const res = await fetch(
      "https://api-open.data.gov.sg/v2/real-time/api/air-temperature",
      { headers: JSON_HEADERS }
    );
    const json = await res.json();
    const stations = safeGetStationsV2(json);
    const readings = safeGetReadingsV2(json);

    if (stations.length && readings.length) {
      const withLoc = stations.map((s) => {
        const r = readings.find((rr) => rr.stationId === s.id);
        return {
          id: s.id,
          name: s.name,
          location: s.location,
          value: typeof r?.value === "number" ? r.value : Number(r?.value),
        };
      });
      const chosen = pickNearestWithValue(userLoc, withLoc);
      if (chosen && Number.isFinite(chosen.value)) {
        return { value: chosen.value, timestamp: safeGetTimestampV2(json) };
      }
    }
  } catch (e) {
    console.warn("airTemperature v2 error:", e?.message || e);
  }

  // fallback v1
  try {
    const res = await fetch(
      "https://api.data.gov.sg/v1/environment/air-temperature",
      { headers: JSON_HEADERS }
    );
    const json = await res.json();
    const stations = json?.metadata?.stations || [];
    const readings = json?.items?.[0]?.readings || [];
    const withLoc = stations.map((s) => {
      const r = readings.find((rr) => rr.station_id === s.id);
      return {
        id: s.id,
        name: s.name,
        location: s.location,
        value: typeof r?.value === "number" ? r.value : Number(r?.value),
      };
    });
    const chosen = pickNearestWithValue(userLoc, withLoc);
    if (chosen && Number.isFinite(chosen.value)) {
      return { value: chosen.value, timestamp: json?.items?.[0]?.timestamp || null };
    }
  } catch (e) {
    console.warn("airTemperature v1 error:", e?.message || e);
  }

  return { value: null, timestamp: null };
}

/* ------------------------- relative humidity ------------------------ */
async function relativeHumidity(userLoc) {
  try {
    const res = await fetch(
      "https://api-open.data.gov.sg/v2/real-time/api/relative-humidity",
      { headers: JSON_HEADERS }
    );
    const json = await res.json();

    // stations with coords
    const stations = (json?.data?.stations || []).filter(
      (s) => s?.location?.latitude && s?.location?.longitude
    );

    // ✅ v2 shape: data.readings[0].data -> [{ stationId, value }]
    const bucket = json?.data?.readings?.[0]?.data || [];
    if (stations.length && bucket.length) {
      const withLoc = stations
        .map((s) => {
          const r = bucket.find((rr) => rr.stationId === s.id);
          const valNum = typeof r?.value === "number" ? r.value : Number(r?.value);
          return {
            id: s.id,
            name: s.name,
            location: s.location,
            value: Number.isFinite(valNum) ? valNum : null,
          };
        })
        .filter((x) => x.value != null);

      const chosen = pickNearestWithValue(userLoc, withLoc);
      const overlays = withLoc.map((s) => ({
        id: s.id,
        name: s.name,
        location: { latitude: s.location.latitude, longitude: s.location.longitude },
        value: s.value,
      }));

      if (chosen) {
        return {
          value: chosen.value,
          timestamp: json?.data?.readings?.[0]?.timestamp || safeGetTimestampV2(json),
          overlays,
        };
      }
    }
  } catch (e) {
    console.warn("relativeHumidity v2 error:", e?.message || e);
  }

  // 🔁 v1 fallback
  try {
    const r1 = await fetch("https://api.data.gov.sg/v1/environment/relative-humidity", {
      headers: JSON_HEADERS,
    });
    const j1 = await r1.json();

    const stations = (j1?.metadata?.stations || []).filter(
      (s) => s?.location?.latitude && s?.location?.longitude
    );
    const readings = j1?.items?.[0]?.readings || [];

    const withLoc = stations
      .map((s) => {
        const r = readings.find((rr) => rr.station_id === s.id);
        const valNum = typeof r?.value === "number" ? r.value : Number(r?.value);
        return {
          id: s.id,
          name: s.name,
          location: s.location,
          value: Number.isFinite(valNum) ? valNum : null,
        };
      })
      .filter((x) => x.value != null);

    const chosen = pickNearestWithValue(userLoc, withLoc);
    if (chosen) {
      return {
        value: chosen.value,
        timestamp: j1?.items?.[0]?.timestamp || null,
        overlays: withLoc,
      };
    }
  } catch (e) {
    console.warn("relativeHumidity v1 error:", e?.message || e);
  }

  return { value: null, timestamp: null, overlays: [] };
}

/* ------------------------- wind speed  -------------------------- */
async function wind(userLoc) {
  try {
    const resSpd = await fetch(
      "https://api-open.data.gov.sg/v2/real-time/api/wind-speed",
      { headers: JSON_HEADERS }
    );
    const jsonSpd = await resSpd.json();

    const stations = (safeGetStationsV2(jsonSpd) || []).filter(
      (s) => s?.location?.latitude && s?.location?.longitude
    );

    // v2 schema: readings is an array of { timestamp, data: [ { stationId, value } ] }
    const rawReadings = jsonSpd?.data?.readings?.[0]?.data || [];
    if (stations.length && rawReadings.length) {
      const withLoc = stations.map((s) => {
        const r = rawReadings.find((rr) => rr.stationId === s.id);
        const spNum = typeof r?.value === "number" ? r.value : Number(r?.value);
        return {
          id: s.id,
          name: s.name,
          location: s.location,
          speed: Number.isFinite(spNum) ? spNum : null,
        };
      }).filter((x) => x.speed != null);

      const chosen = pickNearestWithValue(userLoc, withLoc, "location", "speed");
      if (chosen) {
        return {
          speed: chosen.speed,
          timestamp: jsonSpd?.data?.readings?.[0]?.timestamp || safeGetTimestampV2(jsonSpd),
        };
      }
    }
  } catch (e) {
    console.warn("wind v2 error:", e?.message || e);
  }

  // 🔁 fallback to v1 if v2 fails
  try {
    const rSpd = await fetch("https://api.data.gov.sg/v1/environment/wind-speed", {
      headers: JSON_HEADERS,
    });
    const jSpd = await rSpd.json();

    const stations = (jSpd?.metadata?.stations || []).filter(
      (s) => s?.location?.latitude && s?.location?.longitude
    );
    const readings = jSpd?.items?.[0]?.readings || [];

    const withLoc = stations.map((s) => {
      const r = readings.find((rr) => rr.station_id === s.id);
      const spNum = typeof r?.value === "number" ? r.value : Number(r?.value);
      return {
        id: s.id,
        name: s.name,
        location: s.location,
        speed: Number.isFinite(spNum) ? spNum : null,
      };
    }).filter((x) => x.speed != null);

    const chosen = pickNearestWithValue(userLoc, withLoc, "location", "speed");
    if (chosen) {
      return {
        speed: chosen.speed,
        timestamp: jSpd?.items?.[0]?.timestamp || null,
      };
    }
  } catch (e) {
    console.warn("wind v1 error:", e?.message || e);
  }

  return { speed: null, timestamp: null };
}


/* --------------------------- PM2.5 region --------------------------- */
async function pm25Region(userLoc) {
  try {
    const res = await fetch("https://api.data.gov.sg/v1/environment/pm25", {
      headers: JSON_HEADERS,
    });
    const json = await res.json();
    const readings = json.items?.[0]?.readings?.pm25_one_hourly || {};
    const regions = json.region_metadata || [];

    const mapped = regions
      .filter((r) => r?.label_location?.latitude && r?.label_location?.longitude)
      .map((r) => ({
        name: r.name,
        location: r.label_location,
        value: readings[r.name] ?? null,
      }));

    let value = null;
    if (userLoc && mapped.length) {
      const nearest = mapped.reduce((a, b) =>
        distanceKm(userLoc, a.location) < distanceKm(userLoc, b.location) ? a : b
      );
      if (typeof nearest.value === "number") value = nearest.value;
    } else {
      const vals = mapped.map((m) => m.value).filter((v) => typeof v === "number");
      if (vals.length) value = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }

    return {
      value,
      timestamp: json?.items?.[0]?.timestamp || null,
      overlays: mapped,
    };
  } catch (e) {
    console.warn("pm25Region error:", e?.message || e);
    return { value: null, timestamp: null, overlays: [] };
  }
}

/* ---------------- Rainfall v2 + 最近1小时累计(v1) ------------------ */
async function rainfallWithLastHour(userLoc) {
  try {
    const res = await fetch("https://api-open.data.gov.sg/v2/real-time/api/rainfall", {
      headers: JSON_HEADERS,
    });
    const json = await res.json();

    const stations = safeGetStationsV2(json);
    const latestReadings = safeGetReadingsV2(json);
    const latestMap = new Map(
      latestReadings.map((r) => [r.stationId, typeof r.value === "number" ? r.value : Number(r.value)])
    );

    // 拉当天历史（v1）算最近 1 小时累积
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const resHist = await fetch(
      `https://api.data.gov.sg/v1/environment/rainfall?date=${yyyy}-${mm}-${dd}`,
      { headers: JSON_HEADERS }
    );
    const hist = await resHist.json();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const hourSum = new Map();

    for (const item of hist.items || []) {
      const t = new Date(item.timestamp).getTime();
      if (t >= oneHourAgo) {
        for (const r of item.readings || []) {
          const v = typeof r.value === "number" ? r.value : Number(r.value);
          hourSum.set(r.station_id, (hourSum.get(r.station_id) || 0) + (Number.isFinite(v) ? v : 0));
        }
      }
    }

    const overlays = stations
      .filter((st) => st?.location?.latitude && st?.location?.longitude)
      .map((st) => {
        const loc = { latitude: st.location.latitude, longitude: st.location.longitude };
        return {
          id: st.id,
          name: st.name,
          location: loc,
          latest: latestMap.get(st.id) ?? null,
          lastHour: hourSum.get(st.id) ?? null,
          distanceKm: userLoc ? distanceKm(userLoc, loc) : Infinity,
        };
      });

    return {
      value: null,
      timestamp: safeGetTimestampV2(json),
      overlays,
    };
  } catch (e) {
    console.warn("rainfallWithLastHour error:", e?.message || e);
    return { value: null, timestamp: null, overlays: [] };
  }
}

/* ---------------------- 2h forecast (timestamp only) ---------------- */
async function twoHourForecastTimestamp() {
  try {
    const res = await fetch("https://api.data.gov.sg/v1/environment/2-hour-weather-forecast", {
      headers: JSON_HEADERS,
    });
    const json = await res.json();
    return { timestamp: json?.items?.[0]?.update_timestamp || json?.items?.[0]?.timestamp || null };
  } catch (e) {
    console.warn("twoHourForecastTimestamp error:", e?.message || e);
    return { timestamp: null };
  }
}

/* ------------------------------- getAll ----------------------------- */
async function getAll(userLoc) {
  const [air, rh, windObj, pm, rain, forecast] = await Promise.all([
    airTemperature(userLoc),
    relativeHumidity(userLoc),
    wind(userLoc),
    pm25Region(userLoc),
    rainfallWithLastHour(userLoc),
    twoHourForecastTimestamp(),
  ]);
  return { air, rh, wind: windObj, pm, rain, forecast };
}

/* ------------------------------- exports ---------------------------- */
export {
  airTemperature,
  relativeHumidity,
  wind,
  pm25Region,
  rainfallWithLastHour,
  getAll,
};
export default {
  airTemperature,
  relativeHumidity,
  wind,
  pm25Region,
  rainfallWithLastHour,
  getAll,
};
