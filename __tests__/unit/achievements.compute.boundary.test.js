jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../utils/quizStorage', () => ({ getHistory: jest.fn(async () => []) }));

const ASLib = require('@react-native-async-storage/async-storage');
const AsyncStorage = ASLib.default || ASLib;

const { computeAchievementProgressMap } = require('../../utils/achievements');

const K = {
  dz: 'progress.disaster.completed',
  fa: 'progress.everyday.completed',
  shares: 'progress.shares',
  streak: 'streak.count',
  readIds: 'knowledge.readIds',
};

describe('achievement map clamping', () => {
  const clearAll = AsyncStorage.clear || (async () => {
    const keys = await AsyncStorage.getAllKeys();
    if (keys && keys.length) await AsyncStorage.multiRemove(keys);
  });

  beforeEach(async () => {
    await clearAll();

    const fa = {}; 
    for (let c = 0; c < 20; c++) {
      const cat = `fa_${c}`;
      fa[cat] = {};
      for (const sub of ['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ']) {
        fa[cat][sub] = true; 
      }
    }
    const dz = {}; 
    for (let c = 0; c < 10; c++) {
      const cat = `dz_${c}`;
      dz[cat] = {};
      for (const sub of ['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ','Ⅷ','Ⅸ','Ⅹ','Ⅺ']) {
        dz[cat][sub] = true; 
      }
    }

    await AsyncStorage.setItem(K.fa, JSON.stringify(fa));
    await AsyncStorage.setItem(K.dz, JSON.stringify(dz));
    await AsyncStorage.setItem(K.shares, '9');
    await AsyncStorage.setItem(K.streak, '99');
    await AsyncStorage.setItem(
      K.readIds,
      JSON.stringify(Array.from({ length: 99 }, (_, i) => `a${i}`))
    );
  });

  test('all capped to 100%', async () => {
    const map = await computeAchievementProgressMap({ ignoreServer: true });

    expect(map.fa_sub_all).toBe(100);
    expect(map.fa_cat_all).toBe(100);
    expect(map.dz_sub_all).toBe(100);
    expect(map.dz_cat_all).toBe(100);

    expect(map.ks50).toBe(100);

    expect(map.kn15).toBe(100);

    expect(map.streak30).toBe(100);

    expect(map.share1).toBe(100);
  });
});
