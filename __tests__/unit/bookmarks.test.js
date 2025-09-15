jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addBookmark,
  getBookmarks,
  toggleBookmark,
  removeBookmark,
  isBookmarked,
} from '../../utils/bookmarks';

describe('bookmarks utils', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('addBookmark normalizes fields and inserts to top', async () => {
    const itemA = { id: 'a', title: 'A', url: 'https://a.test', tags: ['t1'] };
    const itemB = { id: 'b', title: 'B', url: 'https://b.test', tags: ['t2'] };

    await addBookmark(itemA);
    await addBookmark(itemB);

    const list = await getBookmarks();
    expect(list).toHaveLength(2);

    expect(list[0].id).toBe('b');
    expect(list[1].id).toBe('a');

    expect(list[0]).toEqual(
      expect.objectContaining({
        id: 'b',
        title: 'B',
        provider: 'StaySafe360',
        icon: '📄',
        tags: ['t2'],
      })
    );
    expect(typeof list[0].createdAt).toBe('number');
    expect(typeof list[0].updatedAt).toBe('number');
  });

  test('addBookmark without id returns false and does not change storage', async () => {
    const ok = await addBookmark({ title: 'X' });
    expect(ok).toBe(false);
    expect(await getBookmarks()).toEqual([]);
  });

  test('toggleBookmark adds then removes', async () => {
    const item = { id: 'x', title: 'X' };
    const on1 = await toggleBookmark(item);
    expect(on1).toBe(true);
    expect(await isBookmarked('x')).toBe(true);

    const on2 = await toggleBookmark(item);
    expect(on2).toBe(false);
    expect(await isBookmarked('x')).toBe(false);
  });

  test('removeBookmark deletes only targeted id', async () => {
    await addBookmark({ id: 'a', title: 'A' });
    await addBookmark({ id: 'b', title: 'B' });

    await removeBookmark('a');
    const list = await getBookmarks();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('b');
  });

  test('updating an existing bookmark keeps position but updates fields', async () => {
    await addBookmark({ id: 'x', title: 'Old', subtitle: 's1' });
    await addBookmark({ id: 'y', title: 'Y' });

    await addBookmark({ id: 'x', title: 'New', subtitle: 's2', tags: ['t'] });

    const list = await getBookmarks();

    expect(list.map((i) => i.id)).toEqual(['y', 'x']);
    expect(list[1]).toEqual(
      expect.objectContaining({ title: 'New', subtitle: 's2', tags: ['t'] })
    );
  });
});
