const {
  airTemperature,
  relativeHumidity,
  pm25Region,
  rainfallWithLastHour,
  wind,
} = require('../../utils/dataGov.js'); 

/** --------- helpers --------- */
const createRes = (json) => ({ ok: true, status: 200, json: async () => json });
const createErr = (status = 500) => ({ ok: false, status, json: async () => ({}) });

describe('utils/dataGov unit', () => {
  const realFetch = global.fetch;
  let warnSpy;

  beforeAll(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    warnSpy && warnSpy.mockRestore();
    global.fetch = realFetch;
  });

  test('airTemperature: v2 success -> pick nearest station', async () => {
    const userLoc = { latitude: 1.30, longitude: 103.80 }; 
    const v2Json = {
      data: {
        metadata: {
          stations: [
            { id: 'S1', name: 'A', location: { latitude: 1.00, longitude: 103.00 } },
            { id: 'S2', name: 'B', location: { latitude: 1.305, longitude: 103.805 } },
          ],
        },
        readings: [
          { stationId: 'S1', value: 27.8 },
          { stationId: 'S2', value: 30.1 },
        ],
        timestamp: '2025-02-20T11:58:00Z',
      },
    };

    global.fetch = jest.fn(async (url) => {
      const s = String(url);
      if (s.includes('api-open.data.gov.sg/v2/real-time/api/air-temperature')) {
        return createRes(v2Json);
      }
      if (s.includes('api.data.gov.sg/v1/environment/air-temperature')) {
        return createRes({ items: [{ readings: [] }], metadata: { stations: [] } });
      }
      return createErr();
    });

    const out = await airTemperature(userLoc);
    expect(out).toBeDefined();
    expect(out.value).toBe(30.1);
    expect(out.timestamp).toBe('2025-02-20T11:58:00Z');
  });

  test('airTemperature: v2 fails -> fallback v1', async () => {
    const userLoc = { latitude: 1.35, longitude: 103.90 };
    const v1Json = {
      metadata: {
        stations: [
          { id: 'S1', name: 'A', location: { latitude: 1.00, longitude: 103.00 } },
          { id: 'S2', name: 'B', location: { latitude: 1.349, longitude: 103.901 } },
        ],
      },
      items: [{
        timestamp: '2025-02-20T10:00:00Z',
        readings: [
          { station_id: 'S1', value: 26.0 },
          { station_id: 'S2', value: 29.5 },
        ],
      }],
    };

    global.fetch = jest.fn(async (url) => {
      const s = String(url);
      if (s.includes('api-open.data.gov.sg/v2/real-time/api/air-temperature')) {
        throw new Error('v2 down');
      }
      if (s.includes('api.data.gov.sg/v1/environment/air-temperature')) {
        return createRes(v1Json);
      }
      return createErr();
    });

    const out = await airTemperature(userLoc);
    expect(out.value).toBe(29.5);
    expect(out.timestamp).toBe('2025-02-20T10:00:00Z');
  });

  test('relativeHumidity: v2 stations + readings -> overlays + nearest value', async () => {
    const userLoc = { latitude: 1.31, longitude: 103.81 }; 
    const v2Json = {
      data: {
        stations: [
          { id: 'S1', name: 'A', location: { latitude: 1.0, longitude: 103.0 } },
          { id: 'S2', name: 'B', location: { latitude: 1.312, longitude: 103.812 } },
        ],
        readings: [
          { timestamp: '2025-02-20T11:58:00Z', data: [
            { stationId: 'S1', value: 70 },
            { stationId: 'S2', value: 84 },
          ]},
        ],
      },
    };

    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('api-open.data.gov.sg/v2/real-time/api/relative-humidity')) {
        return createRes(v2Json);
      }
      return createErr();
    });

    const out = await relativeHumidity(userLoc);
    expect(out.value).toBe(84);
    expect(out.timestamp).toBe('2025-02-20T11:58:00Z');
    expect(Array.isArray(out.overlays)).toBe(true);
    expect(out.overlays.length).toBe(2);
    const o = out.overlays.find(x => x.id === 'S2');
    expect(o).toMatchObject({
      id: 'S2',
      name: 'B',
      value: 84,
      location: { latitude: 1.312, longitude: 103.812 },
    });
  });

  test('relativeHumidity: v2 fails -> fallback v1', async () => {
    const userLoc = { latitude: 1.0, longitude: 103.0 }; 
    const v1Json = {
      metadata: {
        stations: [
          { id: 'S1', name: 'A', location: { latitude: 1.0, longitude: 103.0 } },
          { id: 'S2', name: 'B', location: { latitude: 2.0, longitude: 104.0 } },
        ],
      },
      items: [{
        timestamp: '2025-02-20T11:00:00Z',
        readings: [
          { station_id: 'S1', value: 65 },
          { station_id: 'S2', value: 90 },
        ],
      }],
    };

    global.fetch = jest.fn(async (url) => {
      const s = String(url);
      if (s.includes('api-open.data.gov.sg/v2/real-time/api/relative-humidity')) {
        throw new Error('v2 down');
      }
      if (s.includes('api.data.gov.sg/v1/environment/relative-humidity')) {
        return createRes(v1Json);
      }
      return createErr();
    });

    const out = await relativeHumidity(userLoc);
    expect(out.value).toBe(65);
    expect(out.timestamp).toBe('2025-02-20T11:00:00Z');
    expect(out.overlays.length).toBe(2);
  });

  test('wind: v2 readings -> choose nearest speed', async () => {
    const userLoc = { latitude: 1.3, longitude: 103.8 }; 
    const v2Json = {
      data: {
        metadata: {
          stations: [
            { id: 'S1', name: 'A', location: { latitude: 1.0, longitude: 103.0 } },
            { id: 'S2', name: 'B', location: { latitude: 1.301, longitude: 103.801 } },
          ],
        },
        readings: [{
          timestamp: '2025-02-20T11:58:00Z',
          data: [
            { stationId: 'S1', value: 1.3 },
            { stationId: 'S2', value: 4.8 },
          ],
        }],
      },
    };

    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('api-open.data.gov.sg/v2/real-time/api/wind-speed')) {
        return createRes(v2Json);
      }
      return createErr();
    });

    const out = await wind(userLoc);
    expect(out.speed).toBe(4.8);
    expect(out.timestamp).toBe('2025-02-20T11:58:00Z');
  });

  test('wind: v2 fails -> fallback v1', async () => {
    const userLoc = { latitude: 1.0, longitude: 103.0 }; 
    const v1Json = {
      metadata: {
        stations: [
          { id: 'S1', name: 'A', location: { latitude: 1.0, longitude: 103.0 } },
          { id: 'S2', name: 'B', location: { latitude: 2.0, longitude: 104.0 } },
        ],
      },
      items: [{
        timestamp: '2025-02-20T09:00:00Z',
        readings: [
          { station_id: 'S1', value: 2.2 },
          { station_id: 'S2', value: 5.5 },
        ],
      }],
    };

    global.fetch = jest.fn(async (url) => {
      const s = String(url);
      if (s.includes('api-open.data.gov.sg/v2/real-time/api/wind-speed')) {
        throw new Error('v2 down');
      }
      if (s.includes('api.data.gov.sg/v1/environment/wind-speed')) {
        return createRes(v1Json);
      }
      return createErr();
    });

    const out = await wind(userLoc);
    expect(out.speed).toBe(2.2);
    expect(out.timestamp).toBe('2025-02-20T09:00:00Z');
  });

  test('pm25Region: with userLoc -> use nearest region value', async () => {
    const userLoc = { latitude: 1.30, longitude: 103.80 }; 
    const json = {
      region_metadata: [
        { name: 'west',  label_location: { latitude: 1.0, longitude: 103.0 } },
        { name: 'central', label_location: { latitude: 1.301, longitude: 103.801 } },
      ],
      items: [{
        timestamp: '2025-02-20T12:00:00Z',
        readings: { pm25_one_hourly: { west: 30, central: 55 } },
      }],
    };

    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('api.data.gov.sg/v1/environment/pm25')) {
        return createRes(json);
      }
      return createErr();
    });

    const out = await pm25Region(userLoc);
    expect(out.value).toBe(55);
    expect(out.timestamp).toBe('2025-02-20T12:00:00Z');
    expect(out.overlays.length).toBe(2);
  });

  test('pm25Region: no userLoc -> use rounded average of regions', async () => {
    const json = {
      region_metadata: [
        { name: 'west',  label_location: { latitude: 1.0, longitude: 103.0 } },
        { name: 'central', label_location: { latitude: 1.301, longitude: 103.801 } },
        { name: 'east',  label_location: { latitude: 1.5, longitude: 104.0 } },
      ],
      items: [{
        timestamp: '2025-02-20T12:00:00Z',
        readings: { pm25_one_hourly: { west: 30, central: 55, east: 50 } },
      }],
    };

    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('api.data.gov.sg/v1/environment/pm25')) {
        return createRes(json);
      }
      return createErr();
    });

    const out = await pm25Region(null);
    expect(out.value).toBe(45); // (30+55+50)/3 => 45
    expect(out.overlays.length).toBe(3);
  });

  test('rainfallWithLastHour: v2 latest + v1 history -> overlays include lastHour sum', async () => {
    const fixedNow = new Date('2025-02-20T12:00:00Z').getTime();
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const v2Json = {
      data: {
        metadata: {
          stations: [
            { id: 'S1', name: 'A', location: { latitude: 1.0, longitude: 103.0 } },
            { id: 'S2', name: 'B', location: { latitude: 1.31, longitude: 103.81 } },
          ],
        },
        readings: [
          { stationId: 'S1', value: 0.4 },
          { stationId: 'S2', value: 0.9 },
        ],
        timestamp: '2025-02-20T11:58:00Z',
      },
    };

    const v1Hist = {
      items: [
        {
          timestamp: '2025-02-20T11:30:00Z',
          readings: [
            { station_id: 'S1', value: 0.2 },
            { station_id: 'S2', value: 0.1 },
          ],
        },
        {
          timestamp: '2025-02-20T11:45:00Z',
          readings: [
            { station_id: 'S1', value: 0.3 },
            { station_id: 'S2', value: 0.5 },
          ],
        },
        {
          timestamp: '2025-02-20T10:00:00Z',
          readings: [
            { station_id: 'S1', value: 9.9 },
            { station_id: 'S2', value: 9.9 },
          ],
        },
      ],
    };

    global.fetch = jest.fn(async (url) => {
      const s = String(url);
      if (s.includes('api-open.data.gov.sg/v2/real-time/api/rainfall')) {
        return createRes(v2Json);
      }
      if (s.includes('api.data.gov.sg/v1/environment/rainfall?date=')) {
        return createRes(v1Hist);
      }
      return createErr();
    });

    const userLoc = { latitude: 1.305, longitude: 103.805 };
    const out = await rainfallWithLastHour(userLoc);
    expect(out.timestamp).toBe('2025-02-20T11:58:00Z');
    expect(Array.isArray(out.overlays)).toBe(true);
    expect(out.overlays.length).toBe(2);

    const s1 = out.overlays.find((x) => x.id === 'S1');
    const s2 = out.overlays.find((x) => x.id === 'S2');

    expect(s1.latest).toBe(0.4);
    expect(s2.latest).toBe(0.9);
    expect(s1.lastHour).toBeCloseTo(0.5, 6);
    expect(s2.lastHour).toBeCloseTo(0.6, 6);

    nowSpy.mockRestore();
  });
});
