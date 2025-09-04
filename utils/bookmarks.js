// utils/bookmarks.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'bookmarks';

/** 读取所有书签（数组） */
export async function getBookmarks() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

/** 按 id 判断是否已收藏 */
export async function isBookmarked(id) {
  const list = await getBookmarks();
  return list.some(b => b.id === id);
}

/** 添加或更新书签 */
export async function addBookmark(item) {
  if (!item?.id) return false;
  const list = await getBookmarks();
  const idx = list.findIndex(b => b.id === item.id);
  const now = Date.now();
  const normalized = {
    id: item.id,
    title: item.title || 'Untitled',
    subtitle: item.subtitle || '',
    provider: item.provider || 'StaySafe360',
    url: item.url || null,
    tags: Array.isArray(item.tags) ? item.tags : [],
    icon: item.icon || '📄',
    createdAt: item.createdAt || now,
    updatedAt: now,
  };
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...normalized, updatedAt: now };
  } else {
    list.unshift(normalized); // 新增放前面
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return true;
}

/** 按 id 移除 */
export async function removeBookmark(id) {
  const list = await getBookmarks();
  const next = list.filter(b => b.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next.length !== list.length;
}

/** 切换收藏状态；返回最新状态（true=已收藏） */
export async function toggleBookmark(item) {
  const saved = await isBookmarked(item.id);
  if (saved) {
    await removeBookmark(item.id);
    return false;
  }
  await addBookmark(item);
  return true;
}
