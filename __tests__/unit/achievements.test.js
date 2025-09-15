jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// mock getHistory: 让 computeAchievementProgressMap
jest.mock('../../utils/quizStorage', () => ({
  getHistory: jest.fn(async () => []),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getHistory } from '../../utils/quizStorage';

import {
  markArticleRead,
  logShareOnce,
  markDisaster10SublevelComplete,
  markEverydaySublevelComplete,
  recordLocalAttempt,
  computeAchievementProgressMap,
} from '../../utils/achievements';

describe('achievements core writes', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    getHistory.mockResolvedValue([]);
  });

  test('markArticleRead writes id once and contributes to knowledge counters', async () => {
    await markArticleRead('everyday:burns');
    await markArticleRead('everyday:burns'); // duplicate ignored
    const map = await computeAchievementProgressMap({ ignoreServer: true });

    expect(map.kn1).toBe(100);
    // 1/5 ≈ 20%
    expect(map.kn5).toBeGreaterThanOrEqual(20);
  });

  test('logShareOnce increments share-based achievement', async () => {
    const before = await computeAchievementProgressMap({ ignoreServer: true });
    expect(before.share1).toBe(0);

    await logShareOnce();
    const after = await computeAchievementProgressMap({ ignoreServer: true });
    expect(after.share1).toBe(100);
  });

  test('markDisaster10SublevelComplete + markEverydaySublevelComplete affect category/sub counts', async () => {
    // Disaster: Flood Ⅰ, Ⅱ；Lightning Ⅰ
    await markDisaster10SublevelComplete('Flood', 'Ⅰ');
    await markDisaster10SublevelComplete('Flood', 'Ⅱ');
    await markDisaster10SublevelComplete('Lightning', 'Ⅰ');

    // Everyday FA: cpr_basics Ⅰ, Ⅱ
    await markEverydaySublevelComplete('cpr_basics', 'Ⅰ');
    await markEverydaySublevelComplete('cpr_basics', 'Ⅱ');

    const map = await computeAchievementProgressMap({ ignoreServer: true });

    expect(map.dz_cat_1).toBe(100);

    expect(map.dz_sub_10).toBe(Math.round((3 / 10) * 100));

    expect(map.fa_sub_10).toBe(20);

    expect(map.ks5).toBe(100);

    expect(map.ks10).toBe(50);
  });

  test('recordLocalAttempt reflected in map (fast1 via time <= 20s)', async () => {
    await recordLocalAttempt({
      domain: 'disaster',
      categoryId: 'Flood',
      sublevelId: 'Ⅰ',
      score: 10,
      total: 10,
      timeMs: 15000,
    });

    const map = await computeAchievementProgressMap({ ignoreServer: true });
    // time <= 20s -> fast1 unlocked
    expect(map.fast1).toBe(100);
  });

  test('duplicate everyday/disaster completion does not over-count', async () => {
    await markDisaster10SublevelComplete('Flood', 'Ⅰ');
    await markDisaster10SublevelComplete('Flood', 'Ⅰ'); // duplicate
    await markEverydaySublevelComplete('cpr_basics', 'Ⅰ');
    await markEverydaySublevelComplete('cpr_basics', 'Ⅰ'); // duplicate

    const map = await computeAchievementProgressMap({ ignoreServer: true });

    expect(map.ks5).toBe(Math.round((2 / 5) * 100)); 
  });
});
