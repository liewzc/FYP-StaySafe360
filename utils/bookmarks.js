// utils/bookmarks.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'bookmarks';

// Read all bookmarks
export async function getBookmarks() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

// Check whether a bookmark with the given id exists
export async function isBookmarked(id) {
  const list = await getBookmarks();
  return list.some(b => b.id === id);
}

// Add a new bookmark or update an existing one (by id)
export async function addBookmark(item) {
  if (!item?.id) return false;
  const list = await getBookmarks();
  const idx = list.findIndex(b => b.id === item.id);
  const now = Date.now();

  // Normalize shape and fill defaults
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
    // Update existing
    list[idx] = { ...list[idx], ...normalized, updatedAt: now };
  } else {
    // Insert new at the front
    list.unshift(normalized); 
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return true;
}

// Remove a bookmark by id
export async function removeBookmark(id) {
  const list = await getBookmarks();
  const next = list.filter(b => b.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next.length !== list.length;
}

// Toggle bookmark state for a given item
export async function toggleBookmark(item) {
  const saved = await isBookmarked(item.id);
  if (saved) {
    await removeBookmark(item.id);
    return false;
  }
  await addBookmark(item);
  return true;
}
