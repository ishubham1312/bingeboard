
"use client";

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ContentCarousel } from '@/components/content/content-carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, History, ListChecks } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useListManagement } from '@/hooks/useListManagement';
import { getListedItems, type RecentlyAddedItem, type UserList as UserListType } from '@/services/watchedItemsService'; // Renamed UserList to UserListType to avoid conflict

const MAX_LISTS_PREVIEW = 5;
const MAX_RECENTLY_ADDED_PREVIEW = 10;

function ListsPreviewSkeleton() {
  return (
    <div className="my-6 sm:my-8 px-4">
      <Skeleton className="h-8 w-1/3 mb-4" />
      <div className="flex flex-wrap gap-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-9 w-32 mt-3 rounded-md" />
    </div>
  );
}

function RecentlyAddedSkeleton() {
    return (
      <div className="my-6 sm:my-8">
        <div className="mb-4 sm:mb-6 px-4">
           <div className="flex items-center">
             <History className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary/80" />
             <Skeleton className="h-8 w-1/2 md:w-1/3" />
           </div>
        </div>
        <div className="px-4">
          <div className="flex space-x-4 overflow-hidden pb-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-44 sm:w-52 md:w-60 flex-shrink-0">
                <Skeleton className="h-56 sm:h-64 md:h-80 w-full rounded-lg bg-muted/50" />
                <Skeleton className="h-6 w-3/4 mt-3 rounded-md bg-muted/50" />
                <Skeleton className="h-4 w-1/2 mt-2 rounded-md bg-muted/50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
}


export function UserSpecificSections() {
  const { user, loading: authLoading } = useAuth();
  const { lists: userListsFromHook, isLoading: isLoadingUserLists, refreshLists } = useListManagement();
  const [recentlyAddedItems, setRecentlyAddedItems] = useState<RecentlyAddedItem[]>([]);
  const [isLoadingRecentlyAdded, setIsLoadingRecentlyAdded] = useState(true);

  useEffect(() => {
    if (user) {
      refreshLists(); // Refresh lists when user context changes
      setIsLoadingRecentlyAdded(true);
      const allAddedItems = getListedItems();
      
      const uniqueRecentlyAddedMap = new Map<string, RecentlyAddedItem>();
      allAddedItems.forEach(item => {
        const key = `${item.id}-${item.media_type}`;
        if (!uniqueRecentlyAddedMap.has(key)) {
          uniqueRecentlyAddedMap.set(key, item);
        }
      });
      const uniqueRecentlyAdded = Array.from(uniqueRecentlyAddedMap.values());
      
      setRecentlyAddedItems(uniqueRecentlyAdded);
      setIsLoadingRecentlyAdded(false);
    } else {
      setRecentlyAddedItems([]);
      setIsLoadingRecentlyAdded(false); // Ensure loading state is cleared if no user
    }
  }, [user, refreshLists]); // refreshLists is stable, user is the main trigger

  const displayedUserLists = useMemo(() => {
    return userListsFromHook.filter(list => list.name !== "Interested").slice(0, MAX_LISTS_PREVIEW);
  }, [userListsFromHook]);

  const displayedRecentlyAdded = useMemo(() => {
    return recentlyAddedItems.slice(0, MAX_RECENTLY_ADDED_PREVIEW);
  }, [recentlyAddedItems]);

  if (authLoading) { // If auth is still loading, show minimal skeletons
    return (
        <>
            <RecentlyAddedSkeleton />
            <ListsPreviewSkeleton />
        </>
    );
  }

  if (!user) {
    return null; // Don't render these sections if user is not logged in
  }

  return (
    <>
      {/* Recently Added Section */}
      {isLoadingRecentlyAdded ? (
         <RecentlyAddedSkeleton />
      ) : displayedRecentlyAdded.length > 0 ? (
        <section className="my-8 sm:my-10">
          <div className="flex justify-between items-center mb-4 sm:mb-6 px-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary flex items-center">
              <History className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary/80" />
              Recently Added
            </h2>
            {recentlyAddedItems.length > MAX_RECENTLY_ADDED_PREVIEW && (
               <Link href="/me" passHref legacyBehavior>
                  <Button variant="link" className="text-primary hover:text-primary/80 px-0 text-sm sm:text-base">
                  View All in Lists <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
              </Link>
            )}
          </div>
          <ContentCarousel items={displayedRecentlyAdded} />
        </section>
      ) : (
        userListsFromHook.filter(l => l.name !== "Interested" && l.items.length > 0).length === 0 &&
          <div className="my-8 sm:my-10 px-4 text-center py-6 bg-card rounded-lg shadow">
            <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No items recently added to your lists (excluding "Interested").</p>
            <p className="text-xs text-muted-foreground">Start adding movies and shows to see them here!</p>
          </div>
      )}

      {/* Your Lists Preview Section */}
      {isLoadingUserLists ? (
        <ListsPreviewSkeleton />
      ) : displayedUserLists.length > 0 ? (
        <section className="my-6 sm:my-8 px-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary flex items-center">
              <ListChecks className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary/80" />
              Your Lists
            </h2>
            <Link href="/me" passHref legacyBehavior>
              <Button variant="link" className="text-primary hover:text-primary/80 px-0 text-sm sm:text-base">
                Show All Your Lists <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap gap-3">
            {displayedUserLists.map(list => (
              <Link key={list.id} href={`/me/list/${list.id}`} passHref legacyBehavior>
                <Button variant="outline" size="sm" className="bg-card hover:bg-muted/80 hover:border-primary/50 transition-colors">
                  {list.name} ({list.items.length})
                </Button>
              </Link>
            ))}
          </div>
        </section>
      ) : (
         <div className="my-6 sm:my-8 px-4 text-center py-6 bg-card rounded-lg shadow">
          <ListChecks className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-2">You haven't created any lists yet (excluding "Interested").</p>
          <Link href="/me" passHref legacyBehavior>
              <Button variant="default" size="sm">
                Create Your First List
              </Button>
          </Link>
        </div>
      )}
    </>
  );
}
