
"use client";

import { useState, useEffect, type MouseEvent, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { BookmarkPlus, CheckCircle, Settings2, CircleEllipsis } from 'lucide-react';
import { SeasonEpisodeSelectorDialog } from '@/components/content/season-episode-selector-dialog';
import {
    addItemToList,
    removeItemFromList,
    isItemInAnyList,
    isItemInSpecificList,
    getWatchedTvDataForList,
    type UserList,
    type ListItem,
    INTERESTED_LIST_NAME
} from '@/services/watchedItemsService';
import type { MediaDetails } from '@/services/tmdb';
import type { Recommendation } from '@/services/tmdb';
import { useListManagement } from '@/hooks/useListManagement';
import { SelectListDialog } from '@/components/list/SelectListDialog';
import { CreateListDialog } from '@/components/list/CreateListDialog';
import { useToast } from '@/hooks/use-toast';


interface MediaDetailInteractionProps {
  details: MediaDetails;
  mediaType: 'movie' | 'tv';
  id: string;
}

export function MediaDetailInteraction({ details, mediaType, id }: MediaDetailInteractionProps) {
  const [itemPresence, setItemPresence] = useState<{ inList: boolean; listName?: string; listId?: string, userRating?: number | null }>({ inList: false });
  const [isSeasonSelectorOpen, setIsSeasonSelectorOpen] = useState(false);
  const [isSelectListDialogOpen, setIsSelectListDialogOpen] = useState(false);
  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);
  
  const [pendingTvWatchedData, setPendingTvWatchedData] = useState<Record<number, 'all' | number[]> | null>(null);
  const [pendingRating, setPendingRating] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const { lists, refreshLists } = useListManagement();
  const { toast } = useToast();

  const itemForDialogs: Recommendation = useMemo(() => ({
    id: id,
    title: details.title || details.name || "Untitled",
    posterUrl: details.posterUrl,
    genre: details.genres?.[0]?.name || "N/A",
    genre_ids: details.genres?.map(g => g.id) || [],
    media_type: mediaType,
    original_language: details.original_language,
    popularity: details.popularity,
    release_date: details.release_date,
    first_air_date: details.first_air_date,
    overview: details.overview || '',
    backdropUrl: details.backdropUrl || '',
  }), [id, details, mediaType]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      const presenceInfo = isItemInAnyList(id, mediaType);
      setItemPresence(presenceInfo);
      if (presenceInfo.inList && presenceInfo.userRating !== undefined) {
        setPendingRating(presenceInfo.userRating);
      } else {
        setPendingRating(null);
      }
    }
  }, [id, mediaType, lists, isMounted]); // refreshLists removed as 'lists' implies its effect

  const initialTvInteractionData = useMemo(() => {
    if (mediaType === 'tv' && itemPresence.inList && itemPresence.listId) {
      return {
        watchedEpisodes: getWatchedTvDataForList(itemPresence.listId, id) || {},
        rating: itemPresence.userRating !== undefined ? itemPresence.userRating : null,
      };
    }
    return { watchedEpisodes: {}, rating: null };
  }, [mediaType, itemPresence, id, lists]);


  const handleToggleInMyList = (e?: MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();
    e?.preventDefault();

    if (mediaType === 'tv') {
      // For TV shows, always open season selector first. It now handles overall rating.
      // initialTvInteractionData is used by the dialog directly.
      setIsSeasonSelectorOpen(true);
    } else {
      // For movies, directly open the list management/selection dialog.
      // pendingRating is already initialized from itemPresence.
      openFinalListSelectionDialog(undefined, pendingRating);
    }
  };
  
  const openFinalListSelectionDialog = (tvData?: Record<number, 'all' | number[]>, tvShowRating?: number | null) => {
    setPendingTvWatchedData(tvData || null);
    if (mediaType === 'tv') { // For TV, the rating comes from Season Dialog
        setPendingRating(tvShowRating !== undefined ? tvShowRating : null);
    }
    // For movies, pendingRating is already set from itemPresence in useEffect
    // and will be picked up by SelectListDialog itself.

    const userEditableLists = lists.filter(l => l.name !== INTERESTED_LIST_NAME);
    if (userEditableLists.length === 0) {
      setIsCreateListDialogOpen(true); 
    } else {
      setIsSelectListDialogOpen(true);
    }
  };


  const handleSeasonDialogSave = (data: { watchedEpisodes: Record<number, 'all' | number[]>; rating: number | null }) => {
    setIsSeasonSelectorOpen(false);
    // Pass TV watched data and its new overall rating to the list selection process
    openFinalListSelectionDialog(data.watchedEpisodes, data.rating);
  };
  
  const handleSeasonDialogClose = () => {
    setIsSeasonSelectorOpen(false);
    // No need to reset pendingTvWatchedData or pendingRating here as they might be needed if SelectListDialog is opened next
    if (isMounted) setItemPresence(isItemInAnyList(id, mediaType)); // Re-check presence
  };
  
  const handleRemoveFromListViaSeasonDialog = () => {
    if (itemPresence.listId) { // Only if it was in a list to begin with
      removeItemFromList(itemPresence.listId, id, mediaType);
      toast({ title: "Removed from list", description: `"${itemForDialogs.title}" removed from "${itemPresence.listName}".` });
      refreshLists(); // This will trigger useEffect to update itemPresence and pendingRating
    }
    setIsSeasonSelectorOpen(false);
    setPendingTvWatchedData(null); // Clear pending TV data
    setPendingRating(null); // Clear pending rating as it's removed
  };

  const handleSelectListDialogConfirm = (selection: { listIds: string[], rating?: number | null }) => {
    let itemAddedOrUpdated = false;
    let itemRemoved = false;
    
    const finalRating = mediaType === 'movie' ? selection.rating : pendingRating;

    for (const list of lists) {
      if (list.name === INTERESTED_LIST_NAME) continue;

      const isCurrentlyInThisList = isItemInSpecificList(list.id, itemForDialogs.id.toString(), itemForDialogs.media_type);
      const shouldBeInThisList = selection.listIds.includes(list.id);

      if (shouldBeInThisList && !isCurrentlyInThisList) {
        addItemToList(list.id, itemForDialogs, pendingTvWatchedData, finalRating);
        itemAddedOrUpdated = true;
      } else if (!shouldBeInThisList && isCurrentlyInThisList) {
        removeItemFromList(list.id, itemForDialogs.id.toString(), itemForDialogs.media_type);
        itemRemoved = true;
      } else if (shouldBeInThisList && isCurrentlyInThisList) { // Item stays in list, update details
        addItemToList(list.id, itemForDialogs, pendingTvWatchedData, finalRating);
        itemAddedOrUpdated = true;
      }
    }
    
    if (itemAddedOrUpdated && !itemRemoved) {
      toast({ title: "List(s) Updated", description: `"${itemForDialogs.title}" has been updated in your lists.` });
    } else if (itemRemoved && !itemAddedOrUpdated) {
       toast({ title: "Removed from List(s)", description: `"${itemForDialogs.title}" has been removed from selected lists.` });
    } else if (itemAddedOrUpdated && itemRemoved) {
      toast({ title: "Lists Updated", description: `Membership for "${itemForDialogs.title}" has been updated.` });
    } else if (!itemAddedOrUpdated && !itemRemoved && selection.listIds.length > 0 && finalRating !== itemPresence.userRating) {
        // Case: Item was already in the selected lists, only rating changed (for movies)
        // or TV details changed, but already handled by addItemToList update logic.
        // This toast might be redundant if addItemToList for updates also toasts.
        // For now, we assume the toasts from add/remove cover most cases.
        // If only rating changed for a movie already in lists, this might be missed.
        // The `addItemToList` should ideally handle "update" toast if only rating changes.
        // Let's rely on itemPresence updating and the component re-rendering.
    }


    setIsSelectListDialogOpen(false);
    setPendingTvWatchedData(null); // Clear after list operations
    // pendingRating is managed by itemPresence useEffect
    refreshLists();
  };

  const handleListCreatedAndAddItem = (newList: UserList) => {
    const finalRating = mediaType === 'movie' ? pendingRating : pendingRating; // pendingRating should be set by movie or TV flow
    addItemToList(newList.id, itemForDialogs, pendingTvWatchedData, finalRating);
    toast({ title: "List Created & Item Added!", description: `"${itemForDialogs.title}" added to new list "${newList.name}".` });
    setIsCreateListDialogOpen(false);
    setPendingTvWatchedData(null);
    // pendingRating will refresh via itemPresence
    refreshLists();
  };


  if (!isMounted) {
    return <Button variant="outline" className="w-full md:w-auto mt-4" disabled>Loading...</Button>;
  }

  const isInMyList = itemPresence.inList;
  const buttonIcon = isInMyList 
    ? <CircleEllipsis className="mr-2 h-4 w-4" />
    : <BookmarkPlus className="mr-2 h-4 w-4" />;
  const buttonText = isInMyList 
    ? 'Manage in Lists' 
    : 'Add to My List';

  return (
    <>
      <Button
        variant={isInMyList ? "default" : "outline"}
        onClick={handleToggleInMyList}
        className="w-full md:w-auto mt-4 py-3 px-6 text-base"
        aria-pressed={isInMyList}
      >
        {buttonIcon}
        {buttonText}
      </Button>

      {mediaType === 'tv' && (
        <SeasonEpisodeSelectorDialog
          isOpen={isSeasonSelectorOpen}
          onClose={handleSeasonDialogClose}
          onSave={handleSeasonDialogSave}
          showId={id}
          showTitle={itemForDialogs.title}
          initialInteractionData={initialTvInteractionData}
          onRemoveShow={itemPresence.inList && itemPresence.listId ? handleRemoveFromListViaSeasonDialog : undefined}
        />
      )}
       <SelectListDialog
        isOpen={isSelectListDialogOpen}
        onClose={() => {
          setIsSelectListDialogOpen(false);
          // Don't clear pendingTvWatchedData or pendingRating here,
          // as they are managed by the main component state based on itemPresence
        }}
        itemToManage={itemForDialogs}
        onConfirmSelection={handleSelectListDialogConfirm}
        onCreateNewList={() => {
          setIsSelectListDialogOpen(false);
          setIsCreateListDialogOpen(true);
        }}
      />

      <CreateListDialog
        isOpen={isCreateListDialogOpen}
        onClose={() => {
          setIsCreateListDialogOpen(false);
          // Don't clear pendingTvWatchedData or pendingRating here
        }}
        onListCreated={handleListCreatedAndAddItem}
      />
    </>
  );
}
