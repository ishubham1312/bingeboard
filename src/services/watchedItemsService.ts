
'use client';

import type { Recommendation } from '@/services/tmdb';
import { parseISO, isPast, isValid } from 'date-fns';

// Defines the structure for an item within a user's list
export interface ListItem extends Recommendation {
  addedAt: number; // Timestamp of when the item was added to this specific list
  watched_episodes?: Record<number, 'all' | number[]>; // For TV shows: season -> episodes watched or 'all'
  userRating?: number | null;
}

// Defines the structure for a user-created list
export interface UserList {
  id: string;
  name: string;
  items: ListItem[];
  createdAt: number; // Timestamp of when the list was created
  isPinned?: boolean; // Optional: for pinning functionality
}

// New type for items returned by getListedItems, including parent list info
export interface RecentlyAddedItem extends ListItem {
  listId: string;
  listName: string;
}

const USER_LISTS_STORAGE_KEY = 'bingeBoardUserLists_v2_multiList';
const OLD_SINGLE_LIST_KEY = 'myListItems'; // From very old system
const MIGRATION_V2_DONE_KEY = 'bingeBoardMigration_v2_done_rating'; // Updated migration key

export const INTERESTED_LIST_NAME = "Interested";


if (typeof window !== 'undefined' && localStorage.getItem(MIGRATION_V2_DONE_KEY) !== 'true') {
  console.log("[watchedItemsService] Performing one-time data migration for v2 multi-list system (with rating).");
  const oldSingleListStored = localStorage.getItem(OLD_SINGLE_LIST_KEY);
  if (oldSingleListStored) {
    try {
      const oldItems: Omit<ListItem, 'addedAt' | 'userRating'>[] = JSON.parse(oldSingleListStored);
      if (Array.isArray(oldItems) && oldItems.length > 0) {
        const now = Date.now();
        const migratedItems: ListItem[] = oldItems.map(item => ({
          ...item,
          id: item.id.toString(),
          genre_ids: item.genre_ids || [],
          original_language: item.original_language,
          release_date: item.release_date,
          first_air_date: item.first_air_date,
          addedAt: now,
          userRating: null, // Initialize rating for old items
        }));

        let currentLists = getListsInternal(false);
        const defaultListName = "My Watchlist (Migrated)";
        let defaultList = currentLists.find(list => list.name === defaultListName);

        if (!defaultList) {
          defaultList = {
            id: `list-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: defaultListName,
            items: migratedItems,
            createdAt: now,
            isPinned: true,
          };
          currentLists.unshift(defaultList);
        } else {
          const existingItemIds = new Set(defaultList.items.map(i => `${i.id}-${i.media_type}`));
          migratedItems.forEach(newItem => {
            if (!existingItemIds.has(`${newItem.id}-${newItem.media_type}`)) {
              defaultList!.items.unshift(newItem);
            }
          });
        }
        storeLists(currentLists);
        console.log(`[watchedItemsService] Migrated ${migratedItems.length} items from old single list to "${defaultListName}".`);
      }
      localStorage.removeItem(OLD_SINGLE_LIST_KEY);
    } catch (error) {
      console.error("[watchedItemsService] Error migrating old single list:", error);
      localStorage.removeItem(OLD_SINGLE_LIST_KEY); // Still remove old key on error
    }
  }
  
  // Ensure all existing items have userRating initialized if migration from a pre-rating state
  let allCurrentLists = getListsInternal(false);
  allCurrentLists.forEach(list => {
      list.items.forEach(item => {
          if (item.userRating === undefined) {
              item.userRating = null;
          }
      });
  });
  storeLists(allCurrentLists);

  localStorage.setItem(MIGRATION_V2_DONE_KEY, 'true');
  console.log("[watchedItemsService] One-time data migration for v2 (with rating) completed.");
}

function cleanInterestedList(lists: UserList[]): UserList[] {
  const interestedListIndex = lists.findIndex(list => list.name === INTERESTED_LIST_NAME);
  if (interestedListIndex > -1) {
    const interestedList = lists[interestedListIndex];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    interestedList.items = interestedList.items.filter(item => {
      if (!item.release_date) return true;
      try {
        const releaseDate = parseISO(item.release_date);
        return isValid(releaseDate) && releaseDate >= today;
      } catch (e) {
        return true;
      }
    });
    lists[interestedListIndex] = interestedList;
  }
  return lists;
}

function getListsInternal(applyCleanUp: boolean = true): UserList[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const storedLists = localStorage.getItem(USER_LISTS_STORAGE_KEY);
  try {
    let lists: UserList[] = storedLists ? JSON.parse(storedLists) : [];
    
    lists = lists.map((list: any) => ({
      id: list.id || `list-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: list.name || "Untitled List",
      items: Array.isArray(list.items) ? list.items.map((item: any) => ({
        ...item,
        id: item.id ? String(item.id) : undefined,
        addedAt: item.addedAt || Date.now(),
        userRating: item.userRating !== undefined ? item.userRating : null, // Ensure rating is present
      })).filter(item => item.id !== undefined) : [],
      isPinned: typeof list.isPinned === 'boolean' ? list.isPinned : false,
      createdAt: list.createdAt || Date.now(),
    }));

    if (applyCleanUp) {
        lists = cleanInterestedList(lists);
    }
    return lists;

  } catch (error) {
    console.error("[watchedItemsService] Error parsing user lists from localStorage:", error);
    return [];
  }
}


export function getLists(): UserList[] {
  let lists = getListsInternal();
  lists = cleanInterestedList(lists); 
  storeLists(lists); 

  return lists.sort((a, b) => {
    if (a.name === INTERESTED_LIST_NAME) return 1;
    if (b.name === INTERESTED_LIST_NAME) return -1;
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

function storeLists(lists: UserList[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(USER_LISTS_STORAGE_KEY, JSON.stringify(lists));
}

export function createList(name: string): UserList[] {
  const lists = getLists();
  const newList: UserList = {
    id: `list-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name: name.trim() || "Untitled List",
    items: [],
    createdAt: Date.now(),
    isPinned: false,
  };
  const updatedLists = [newList, ...lists].sort((a, b) => {
    if (a.name === INTERESTED_LIST_NAME) return 1;
    if (b.name === INTERESTED_LIST_NAME) return -1;
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
  storeLists(updatedLists);
  return updatedLists;
}

export function getListById(listId: string): UserList | null {
  if (!listId || typeof listId !== 'string') {
    console.warn("[watchedItemsService] getListById called with invalid listId:", listId);
    return null;
  }
  let lists = getLists();
  return lists.find(list => list.id === listId) || null;
}

export function addItemToList(
  listId: string,
  itemToAdd: Recommendation,
  tvWatchedDetails?: Record<number, 'all' | number[]>,
  userRating?: number | null // undefined means don't change, null means unrated
): UserList[] {
  let lists = getLists();
  const targetListIndex = lists.findIndex(list => list.id === listId);

  if (targetListIndex === -1) {
    console.error(`[watchedItemsService] List with ID ${listId} not found when trying to add item.`);
    return lists;
  }

  const targetList = lists[targetListIndex];
  const existingItemIndex = targetList.items.findIndex(
    item => item.id === itemToAdd.id.toString() && item.media_type === itemToAdd.media_type
  );

  // Base data from Recommendation, ensure ID is string
  const baseListItemData: Omit<ListItem, 'addedAt' | 'watched_episodes' | 'userRating'> = {
    ...itemToAdd,
    id: itemToAdd.id.toString(),
  };

  if (existingItemIndex > -1) { // Item exists, update it
    const currentItem = targetList.items[existingItemIndex];
    
    // Update core details from itemToAdd
    Object.assign(currentItem, baseListItemData);

    // Update specific fields: rating and watched_episodes
    if (userRating !== undefined) { // userRating can be null (Unrated) or a number
      currentItem.userRating = userRating;
    }
    if (itemToAdd.media_type === 'tv' && tvWatchedDetails !== undefined) {
      currentItem.watched_episodes = tvWatchedDetails;
    }
    // Treat rating or TV details update as a fresh interaction by updating addedAt
    if (userRating !== undefined || (itemToAdd.media_type === 'tv' && tvWatchedDetails !== undefined)) {
        currentItem.addedAt = Date.now();
    }

  } else { // Item is new to this list
    const newItem: ListItem = {
      ...(baseListItemData as Recommendation), // Spread Recommendation fields
      media_type: itemToAdd.media_type,      // Ensure media_type from itemToAdd is there
      addedAt: Date.now(),
      userRating: userRating !== undefined ? userRating : null, // Default to null if not provided
      watched_episodes: itemToAdd.media_type === 'tv' 
        ? (tvWatchedDetails !== undefined ? tvWatchedDetails : {}) 
        : undefined,
    };
    targetList.items.unshift(newItem);
  }

  lists[targetListIndex] = targetList;
  storeLists(lists);
  return lists;
}


export function removeItemFromList(listId: string, itemId: string, mediaType: 'movie' | 'tv'): UserList[] {
  let lists = getLists();
  const targetListIndex = lists.findIndex(list => list.id === listId);

  if (targetListIndex === -1) {
    return lists;
  }

  lists[targetListIndex].items = lists[targetListIndex].items.filter(
    item => !(item.id === itemId && item.media_type === mediaType)
  );
  storeLists(lists);
  return lists;
}

export function isItemInAnyList(itemId: string, mediaType: 'movie' | 'tv'): { inList: boolean, listName?: string, listId?: string, userRating?: number | null } {
  const lists = getLists();
  for (const list of lists) {
    if (list.name === INTERESTED_LIST_NAME) {
      continue;
    }
    const foundItem = list.items.find(item => item.id === itemId && item.media_type === mediaType);
    if (foundItem) {
      return { 
        inList: true, 
        listName: list.name, 
        listId: list.id, 
        userRating: foundItem.userRating !== undefined ? foundItem.userRating : null 
      };
    }
  }
  return { inList: false, userRating: null };
}


export function isItemInSpecificList(listId: string, itemId: string, mediaType: 'movie' | 'tv'): boolean {
  const list = getListById(listId);
  if (!list) return false;
  return list.items.some(item => item.id === itemId && item.media_type === mediaType);
}

export function getUserRatingForListItem(listId: string, itemId: string, mediaType: 'movie' | 'tv'): number | null {
    const list = getListById(listId);
    if (!list) return null;
    const item = list.items.find(i => i.id === itemId && i.media_type === mediaType);
    return item?.userRating !== undefined ? item.userRating : null;
}


export function isItemInInterestedList(itemId: string, mediaType: 'movie' | 'tv'): boolean {
  const lists = getLists();
  const interestedList = lists.find(list => list.name === INTERESTED_LIST_NAME);
  if (!interestedList) return false;
  return interestedList.items.some(item => item.id === itemId && item.media_type === mediaType);
}

export function getWatchedTvDataForList(listId: string, itemId: string): Record<number, 'all' | number[]> | undefined {
  const list = getListById(listId);
  if (!list) return undefined;
  const item = list.items.find(i => i.id === itemId && i.media_type === 'tv');
  return item?.watched_episodes;
}

export function renameList(listId: string, newName: string): UserList[] {
  const lists = getLists();
  const listIndex = lists.findIndex(list => list.id === listId);
  if (listIndex > -1) {
    lists[listIndex].name = newName.trim() || "Untitled List";
    storeLists(lists);
  }
  return lists;
}

export function deleteList(listId: string): UserList[] {
  let lists = getLists();
  lists = lists.filter(list => list.id !== listId);
  storeLists(lists);
  return lists;
}

export function togglePinList(listId: string): UserList[] {
  const lists = getLists();
  const listIndex = lists.findIndex(list => list.id === listId);
  if (listIndex > -1) {
    lists[listIndex].isPinned = !lists[listIndex].isPinned;
    const sortedLists = lists.sort((a, b) => {
      if (a.name === INTERESTED_LIST_NAME) return 1;
      if (b.name === INTERESTED_LIST_NAME) return -1;
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    storeLists(sortedLists);
    return sortedLists;
  }
  return lists;
}

export function getListedItems(): RecentlyAddedItem[] {
  const allLists = getLists();
  const allItems: RecentlyAddedItem[] = [];

  allLists.forEach(list => {
    if (list.name === INTERESTED_LIST_NAME) {
      return;
    }
    list.items.forEach(item => {
      allItems.push({
        ...item,
        listId: list.id,
        listName: list.name,
      });
    });
  });
  return allItems.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
}

export function getAllGenresFromList(): { id: string; name: string }[] {
  const allItems = getListedItems();
  const genreNames = new Set<string>();

  allItems.forEach(item => {
    if (item.genre && item.genre !== "N/A") {
      genreNames.add(item.genre);
    }
  });

  return Array.from(genreNames).sort().map(name => ({ id: name, name: name }));
}

export function exportListToJSON(listId: string): string | null {
  const list = getListById(listId);
  if (!list) return null;
  const listToExport: Omit<UserList, 'id' | 'createdAt' | 'isPinned'> = {
    name: list.name,
    items: list.items.map(item => {
        const { listId: listItemListId, listName, ...itemData } = item as RecentlyAddedItem;
        return itemData as ListItem;
    })
  };
  return JSON.stringify(listToExport, null, 2);
}

export function importListFromJSON(jsonString: string, newListName?: string): { list?: UserList; error?: string } {
  try {
    const parsedData = JSON.parse(jsonString);

    if (typeof parsedData.name !== 'string' || !Array.isArray(parsedData.items)) {
      return { error: "Invalid list format. Must contain 'name' (string) and 'items' (array)." };
    }
    
    const validItems = parsedData.items.every((item: any) =>
      item.id !== undefined && // ID can be number or string from TMDB
      typeof item.title === 'string' &&
      typeof item.media_type === 'string' && (item.media_type === 'movie' || item.media_type === 'tv') &&
      typeof item.posterUrl === 'string' &&
      typeof item.genre === 'string' &&
      Array.isArray(item.genre_ids) &&
      typeof item.addedAt === 'number' // addedAt is crucial
    );

    if (!validItems) {
      return { error: "Invalid item structure. Ensure items have id, title, media_type, posterUrl, genre, genre_ids, and addedAt." };
    }

    const nameForImport = newListName?.trim() || `Imported: ${parsedData.name}`.slice(0, 50);

    let lists = getLists();
    const newList: UserList = {
      id: `list-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: nameForImport,
      items: parsedData.items.map((item: any) => ({
          ...item,
          id: String(item.id), // Ensure ID is string
          userRating: item.userRating !== undefined ? item.userRating : null, // Preserve/initialize rating
          watched_episodes: item.watched_episodes,
      })) as ListItem[],
      createdAt: Date.now(),
      isPinned: false,
    };

    lists.unshift(newList);
    storeLists(lists);
    return { list: newList };

  } catch (e: any) {
    console.error("Error importing list from JSON:", e);
    if (e instanceof SyntaxError) {
        return { error: "Invalid JSON format. Please check the provided data." };
    }
    return { error: e.message || "Failed to import list due to an unknown error." };
  }
}
