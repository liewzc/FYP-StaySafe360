jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../supabaseClient', () => {
  const auth = {
    getUser: jest.fn(async () => {

      throw new Error('Not authenticated');
    }),
    getSession: jest.fn(async () => ({ data: { session: null } })),
  };
  const from = jest.fn(() => ({
    insert: jest.fn(async () => ({ error: new Error('offline') })),
    delete: jest.fn(async () => ({ error: new Error('offline') })),
    select: jest.fn(() => ({
      eq: () => ({ in: () => ({ order: () => ({ limit: () => ({ data: [], error: new Error('offline') }) }) }) })
    }))
  }));
  return { supabase: { auth, from } };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  logDisasterResult,
  logFirstAidResult,
  getHistory,
  clearHistory,
} from '../../utils/quizStorage';

describe('quizStorage fallback', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('logDisasterResult writes to local fallback when offline', async () => {
    const res = await logDisasterResult({
      disasterType: 'Flood',
      level: null,
      subLevel: 'Ⅰ',
      score: 5,
      timeSpentMs: 8000,
    });
    expect(res.fallback).toBe(true);

    const raw = await AsyncStorage.getItem('quiz_history_fallback_disaster');
    const list = raw ? JSON.parse(raw) : [];
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(
      expect.objectContaining({
        kind: 'disaster',
        disaster: 'Flood',
        sublevel: 'Ⅰ',
        score: 5,
      })
    );
  });

  test('logFirstAidResult also falls back and getHistory returns merged items', async () => {
    await logFirstAidResult({
      categoryTitle: 'CPR (Adult)',
      level: null,
      subLevel: 'Ⅰ',
      score: 10,
      timeSpentMs: 12000,
    });

    const rows = await getHistory('firstaid', 10);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toEqual(
      expect.objectContaining({ kind: 'firstaid', disaster: 'CPR (Adult)' })
    );
  });

  test('clearHistory clears local fallback buckets for kind group', async () => {

    await logFirstAidResult({
      categoryTitle: 'A',
      level: null,
      subLevel: 'Ⅰ',
      score: 1,
      timeSpentMs: 1000,
    });
    await logFirstAidResult({
      categoryTitle: 'B',
      level: null,
      subLevel: 'Ⅰ',
      score: 2,
      timeSpentMs: 1000,
    });

    await clearHistory('firstaid');

    const a = await AsyncStorage.getItem('quiz_history_fallback_firstaid');
    const b = await AsyncStorage.getItem('quiz_history_fallback_everydayfirstaid');
    expect(a).toBeNull();
    expect(b).toBeNull();
  });
});
