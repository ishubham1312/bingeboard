
"use client";

import { useState, useEffect, useCallback } from 'react';
import { getLists as getAllListsFromService, type UserList } from '@/services/watchedItemsService';

export function useListManagement() {
  const [lists, setLists] = useState<UserList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const refreshLists = useCallback(() => {
    if (!isMounted) return []; // Return empty array if not mounted
    // console.log("[useListManagement] Refreshing lists...");
    setIsLoading(true);
    const currentLists = getAllListsFromService();
    setLists(currentLists);
    setIsLoading(false);
    return currentLists; // Return the refreshed lists
  }, [isMounted]);

  useEffect(() => {
    if (isMounted) {
      refreshLists();
    }
  }, [isMounted, refreshLists]);

  // Expose setLists for direct manipulation when visual undo is needed
  return { lists, setLists, isLoading, refreshLists };
}

