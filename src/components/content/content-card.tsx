
"use client";

import React, { useState, useEffect, type MouseEvent, memo } from 'react'; // Changed to explicitly import memo
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookmarkPlus, CheckCircle, CircleEllipsis, Trash2, Heart, CalendarDays, CalendarPlus, Info, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Recommendation } from '@/services/tmdb';
import {
  addItemToList,
  removeItemFromList,
  isItemInAnyList,
  isItemInSpecificList,
  isItemInInterestedList,
  getWatchedTvDataForList,
  type UserList,
  type ListItem,
  type RecentlyAddedItem,
  INTERESTED_LIST_NAME,
  createList as createNewListService
} from '@/services/watchedItemsService';
import { SeasonEpisodeSelectorDialog } from './season-episode-selector-dialog';
import { SelectListDialog } from '@/components/list/SelectListDialog';
import { CreateListDialog } from '@/components/list/CreateListDialog';
import { useListManagement } from '@/hooks/useListManagement';
import { format, parseISO, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ContentCardProps {
  item: ListItem | Recommendation | RecentlyAddedItem;
  currentListId?: string;
  onItemStatusChange?: () => void;
  isUpcomingSection?: boolean;
  variant?: 'default' | 'searchResult';
}

export const ContentCard = memo(function ContentCard({ // Changed to use memo directly
  item,
  currentListId,
  onItemStatusChange,
  isUpcomingSection = false,
  variant = 'default'
}: ContentCardProps) {
  const [itemPresence, setItemPresence] = useState<{ inList: boolean, listName?: string, listId?: string }>({ inList: false });
  const [isInInterested, setIsInInterested] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [isSeasonEpisodeDialogOpen, setIsSeasonEpisodeDialogOpen] = useState(false);
  const [isSelectListDialogOpen, setIsSelectListDialogOpen] = useState(false);
  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);

  const [pendingTvWatchedData, setPendingTvWatchedData] = useState<Record<number, 'all' | number[]> | null>(null);
  const [currentTvShowRating, setCurrentTvShowRating] = useState<number | null>(null);
  const [itemToManageInDialog, setItemToManageInDialog] = useState<Recommendation | null>(null);

  const router = useRouter();
  const { lists, refreshLists, isLoading: isLoadingLists } = useListManagement();
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && item && item.id && item.media_type) {
      if (isUpcomingSection) {
        setIsInInterested(isItemInInterestedList(item.id.toString(), item.media_type));
      } else {
        setItemPresence(isItemInAnyList(item.id.toString(), item.media_type));
      }
    }
  }, [item, lists, isMounted, currentListId, isUpcomingSection, refreshLists]);


  const handleToggleInterest = () => {
    if (!item || !item.id || !item.media_type) return;

    let interestedList = lists.find(l => l.name === INTERESTED_LIST_NAME);
    if (!interestedList) {
      const updatedLists = createNewListService(INTERESTED_LIST_NAME);
      interestedList = updatedLists.find(l => l.name === INTERESTED_LIST_NAME);
      if (!interestedList) {
        toast({ title: "Error", description: "Could not create 'Interested' list.", variant: "destructive" });
        return;
      }
    }

    if (isInInterested) {
      removeItemFromList(interestedList.id, item.id.toString(), item.media_type);
      toast({ title: "Removed from Interested", description: `"${item.title}" removed from your Interested list.` });
    } else {
      addItemToList(interestedList.id, item as Recommendation);
      toast({ title: "Added to Interested!", description: `"${item.title}" added to your Interested list.` });
    }
    refreshLists();
    onItemStatusChange?.();
  };

  const handleManageOrAddToList = (e?: MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();
    e?.preventDefault();

    if (isUpcomingSection) {
      handleToggleInterest();
      return;
    }

    if (!item || !item.id || !item.media_type) return;

    const itemAsRecommendation = item as Recommendation;
    setItemToManageInDialog(itemAsRecommendation);

    if (item.media_type === 'tv') {
      const presence = isItemInAnyList(item.id.toString(), item.media_type);
      let initialTvData = {};
      let initialRating: number | null = null;
      if (presence.inList && presence.listId) {
        initialTvData = getWatchedTvDataForList(presence.listId, item.id.toString()) || {};
        initialRating = presence.userRating !== undefined ? presence.userRating : null;
      }
      setPendingTvWatchedData(initialTvData);
      setCurrentTvShowRating(initialRating);
      setIsSeasonEpisodeDialogOpen(true);
    } else {
      openFinalListSelectionDialog(itemAsRecommendation, undefined);
    }
  };

  const openFinalListSelectionDialog = (itemForDialog: Recommendation, tvData?: Record<number, 'all' | number[]>) => {
    setPendingTvWatchedData(tvData || null);
    const userEditableLists = lists.filter(l => l.name !== INTERESTED_LIST_NAME);
    if (userEditableLists.length === 0) {
      setIsCreateListDialogOpen(true);
    } else {
      setIsSelectListDialogOpen(true);
    }
  };

  const handleSeasonEpisodeDialogSave = (data: { watchedEpisodes: Record<number, 'all' | number[]>, rating: number | null }) => {
    setIsSeasonEpisodeDialogOpen(false);
    if (!itemToManageInDialog) return;
    setPendingTvWatchedData(data.watchedEpisodes);
    setCurrentTvShowRating(data.rating);
    openFinalListSelectionDialog(itemToManageInDialog, data.watchedEpisodes);
  };

  const handleSeasonEpisodeDialogClose = () => {
    setIsSeasonEpisodeDialogOpen(false);
    setPendingTvWatchedData(null);
    setCurrentTvShowRating(null);
    setItemToManageInDialog(null);
    if (isMounted && item && item.id && item.media_type && !isUpcomingSection) {
      setItemPresence(isItemInAnyList(item.id.toString(), item.media_type));
    }
  };

  const handleRemoveFromListInSeasonDialog = () => {
    if (!itemToManageInDialog || !itemToManageInDialog.id || !itemToManageInDialog.media_type) return;

    const listIdToRemoveFrom = currentListId || itemPresence.listId;
    if (!listIdToRemoveFrom) {
      toast({ title: "Error", description: "Could not determine which list to remove item from.", variant: "destructive" });
      return;
    }
    removeItemFromList(listIdToRemoveFrom, itemToManageInDialog.id.toString(), itemToManageInDialog.media_type);
    toast({ title: "Removed from list", description: `"${itemToManageInDialog.title}" has been removed.` });

    setIsSeasonEpisodeDialogOpen(false);
    setItemToManageInDialog(null);
    setPendingTvWatchedData(null);
    setCurrentTvShowRating(null);
    refreshLists();
    onItemStatusChange?.();
  };

  const handleSelectListDialogConfirm = (selection: { listIds: string[], rating?: number | null }) => {
    if (!itemToManageInDialog) return;

    const finalSelectedListIds = selection.listIds;
    const ratingForOperation = itemToManageInDialog.media_type === 'tv' ? currentTvShowRating : selection.rating;


    let itemAddedOrUpdated = false;
    let itemRemoved = false;

    allUserListsLoop: for (const list of lists) {
      if (list.name === INTERESTED_LIST_NAME) continue;

      const isCurrentlyInThisList = isItemInSpecificList(list.id, itemToManageInDialog.id.toString(), itemToManageInDialog.media_type);
      const shouldBeInThisList = finalSelectedListIds.includes(list.id);

      if (shouldBeInThisList && !isCurrentlyInThisList) {
        addItemToList(list.id, itemToManageInDialog, itemToManageInDialog.media_type === 'tv' ? (pendingTvWatchedData || {}) : undefined, ratingForOperation);
        itemAddedOrUpdated = true;
      } else if (!shouldBeInThisList && isCurrentlyInThisList) {
        removeItemFromList(list.id, itemToManageInDialog.id.toString(), itemToManageInDialog.media_type);
        itemRemoved = true;
      } else if (shouldBeInThisList && isCurrentlyInThisList) {
        addItemToList(list.id, itemToManageInDialog, itemToManageInDialog.media_type === 'tv' ? (pendingTvWatchedData || {}) : undefined, ratingForOperation);
        itemAddedOrUpdated = true;
      }
    }

    if (itemAddedOrUpdated && !itemRemoved) {
      toast({ title: "List(s) Updated", description: `"${itemToManageInDialog.title}" has been updated in your lists.` });
    } else if (itemRemoved && !itemAddedOrUpdated) {
       toast({ title: "Removed from List(s)", description: `"${itemToManageInDialog.title}" has been removed from selected lists.` });
    } else if (itemAddedOrUpdated && itemRemoved) {
      toast({ title: "Lists Updated", description: `Membership for "${itemToManageInDialog.title}" has been updated.` });
    }

    setIsSelectListDialogOpen(false);
    setItemToManageInDialog(null);
    setPendingTvWatchedData(null);
    setCurrentTvShowRating(null);
    refreshLists();
    onItemStatusChange?.();
  };

  const handleListCreatedAndAddItem = (newList: UserList) => {
    if (!itemToManageInDialog) return;

    const ratingForNewItem = itemToManageInDialog.media_type === 'tv' ? currentTvShowRating : null;

    addItemToList(newList.id, itemToManageInDialog, itemToManageInDialog.media_type === 'tv' ? (pendingTvWatchedData || {}) : undefined, ratingForNewItem);
    toast({ title: "List Created & Item Added!", description: `"${itemToManageInDialog.title}" added to new list "${newList.name}".` });

    setIsCreateListDialogOpen(false);
    setItemToManageInDialog(null);
    setPendingTvWatchedData(null);
    setCurrentTvShowRating(null);
    refreshLists();
    onItemStatusChange?.();
  };


  if (!isMounted || !item || !item.id) {
    const cardClasses = variant === 'searchResult'
      ? "w-full overflow-hidden shadow-lg bg-card border-border flex flex-col justify-between"
      : "w-44 sm:w-52 md:w-60 flex-shrink-0 overflow-hidden shadow-lg bg-card border-border flex flex-col justify-between";
    const imageSkeletonHeight = variant === 'searchResult' ? "h-48 sm:h-56" : "h-56 sm:h-64 md:h-80";
    const titleSkeletonClasses = variant === 'searchResult' ? "h-4 w-3/4" : "h-5 w-3/4";
    const contentPadding = variant === 'searchResult' ? "p-2" : "p-3";
    const footerPadding = variant === 'searchResult' ? "p-2 pt-1" : "p-3 pt-0";


    return (
      <Card className={cardClasses}>
        <CardHeader className="p-0 relative">
          <Skeleton className={`${imageSkeletonHeight} w-full`} />
        </CardHeader>
        <CardContent className={`${contentPadding} space-y-1 flex-grow`}>
          <Skeleton className={titleSkeletonClasses} />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
        <CardFooter className={footerPadding}>
          <Skeleton className="h-9 w-full" />
        </CardFooter>
      </Card>
    );
  }

  const { title, posterUrl, genre, media_type, id } = item;
  const itemIsListItem = 'addedAt' in item;
  const addedAtTimestamp = itemIsListItem ? (item as ListItem).addedAt : null;
  const parentListId = 'listId' in item ? (item as RecentlyAddedItem).listId : undefined;
  const parentListName = 'listName' in item ? (item as RecentlyAddedItem).listName : undefined;

  const itemReleaseDate = 'release_date' in item ? item.release_date : undefined;
  const itemFirstAirDate = 'first_air_date' in item ? item.first_air_date : undefined;

  const displayPosterUrl = (posterUrl && posterUrl.startsWith('http')) ? posterUrl : `https://placehold.co/${variant === 'searchResult' ? '240x320' : '240x320'}.png?text=${encodeURIComponent(title || "No Poster")}`;
  const detailUrl = `/media/${media_type}/${id}`;

  let buttonIcon, buttonText, buttonVariant: "default" | "outline" | "secondary" | "destructive" | "ghost";

  if (isUpcomingSection) {
    buttonIcon = <Heart className={`mr-2 h-4 w-4 ${isInInterested ? 'fill-accent stroke-accent' : ''}`} />;
    buttonText = isInInterested ? 'Interested!' : 'Add to Interested';
    buttonVariant = isInInterested ? "default" : "outline";
  } else {
    if (itemPresence.inList) {
      buttonIcon = <CircleEllipsis className="mr-2 h-4 w-4" />;
      buttonText = 'Manage in Lists';
      buttonVariant = "default";
    } else {
      buttonIcon = <BookmarkPlus className="mr-2 h-4 w-4" />;
      buttonText = 'Add to My List';
      buttonVariant = "outline";
    }
    if (currentListId) {
      const isInThisSpecificList = isItemInSpecificList(currentListId, id.toString(), media_type);
      if (isInThisSpecificList) {
        buttonIcon = item.media_type === 'tv' ? <Settings2 className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />;
        buttonText = item.media_type === 'tv' ? 'Manage Series' : 'Remove';
        buttonVariant = item.media_type === 'tv' ? "default" : "destructive";
      } else {
        buttonIcon = <BookmarkPlus className="mr-2 h-4 w-4" />;
        buttonText = 'Add to This List';
        buttonVariant = "outline";
      }
    }
  }

  const dateToDisplay = media_type === 'movie' ? itemReleaseDate : itemFirstAirDate;
  let formattedReleaseOrAirDate = null;
  if (dateToDisplay) {
    try {
      const parsed = parseISO(dateToDisplay);
      if (isValid(parsed)) {
        formattedReleaseOrAirDate = format(parsed, 'MMM d, yyyy');
      }
    } catch (e) { /* ignore */ }
  }

  let formattedAddedDate = null;
  if (itemIsListItem && addedAtTimestamp && isValid(new Date(addedAtTimestamp))) {
    try {
      formattedAddedDate = format(new Date(addedAtTimestamp), 'MMM d, yyyy');
    } catch (e) { /* ignore */ }
  }

  const overlayButtonIcon = isUpcomingSection
    ? <Heart className={`h-5 w-5 ${isInInterested ? 'fill-accent stroke-accent text-accent-foreground' : 'text-white' }`} />
    : (itemPresence.inList ? <CircleEllipsis className="h-5 w-5 text-accent" /> : <BookmarkPlus className="h-5 w-5 text-white" />);

  const overlayButtonAriaLabel = isUpcomingSection
    ? (isInInterested ? "Remove from Interested" : "Mark as Interested")
    : (itemPresence.inList ? "Manage item in lists" : "Add to My List");

  const showFooterButton = !(parentListName && !currentListId);

  const handleMainButtonClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();

    if (isUpcomingSection) {
      handleToggleInterest();
      return;
    }

    if (!item || !item.id || !item.media_type) return;

    const itemAsRecommendation = item as Recommendation;
    setItemToManageInDialog(itemAsRecommendation);

    if (currentListId) {
        const isInThisSpecificList = isItemInSpecificList(currentListId, id.toString(), media_type);
        if (isInThisSpecificList) {
            if (item.media_type === 'tv') {
                const initialData = getWatchedTvDataForList(currentListId, id.toString()) || {};
                const initialRating = isItemInAnyList(id.toString(), media_type).userRating;
                setPendingTvWatchedData(initialData);
                setCurrentTvShowRating(initialRating !== undefined ? initialRating : null);
                setIsSeasonEpisodeDialogOpen(true);
            } else {
                removeItemFromList(currentListId, id.toString(), media_type);
                toast({ title: "Removed from list", description: `"${title}" has been removed from this list.` });
                refreshLists();
                onItemStatusChange?.();
            }
        } else {
            if (item.media_type === 'tv') {
                setPendingTvWatchedData({});
                setCurrentTvShowRating(null);
                setIsSeasonEpisodeDialogOpen(true);
            } else {
                // Movie being added to a specific list for the first time
                setIsSelectListDialogOpen(true);
            }
        }
    } else {
        if (item.media_type === 'tv') {
            const presence = isItemInAnyList(id.toString(), item.media_type);
            let initialTvData = {};
            let initialRating: number | null = null;
            if (presence.inList && presence.listId) {
                initialTvData = getWatchedTvDataForList(presence.listId, id.toString()) || {};
                initialRating = presence.userRating !== undefined ? presence.userRating : null;
            }
            setPendingTvWatchedData(initialTvData);
            setCurrentTvShowRating(initialRating);
            setIsSeasonEpisodeDialogOpen(true);
        } else {
            openFinalListSelectionDialog(itemAsRecommendation, undefined);
        }
    }
  };

  const cardClasses = variant === 'searchResult'
    ? "w-full overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-primary/30 bg-card border-border group flex flex-col justify-between"
    : "w-44 sm:w-52 md:w-60 flex-shrink-0 overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-primary/30 bg-card border-border group flex flex-col justify-between";

  const imageClasses = variant === 'searchResult'
    ? "object-cover w-full h-48 sm:h-56 rounded-lg"
    : "object-cover w-full h-56 sm:h-64 md:h-80 rounded-lg";

  const titleClasses = variant === 'searchResult'
    ? "text-sm font-semibold truncate text-foreground"
    : "text-md font-semibold truncate text-foreground";

  const contentPadding = variant === 'searchResult' ? "p-2" : "p-3";
  const footerPadding = variant === 'searchResult' ? "p-2 pt-1" : "p-3 pt-2";

  return (
    <>
      <Card className={cardClasses}>
        <Link href={detailUrl} passHref legacyBehavior>
          <a className="block outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-lg flex-grow">
            <CardHeader className="p-0 relative">
              <Image
                src={displayPosterUrl}
                alt={title || "Content Poster"}
                width={240}
                height={variant === 'searchResult' ? 224 : 320}
                className={imageClasses}
                data-ai-hint={media_type === 'movie' ? "movie poster" : "tv series poster"}
                onError={(e) => {
                  e.currentTarget.src = `https://placehold.co/${variant === 'searchResult' ? '240x320' : '240x320'}.png?text=${encodeURIComponent(title || "Error")}`;
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className={`absolute top-2 right-2 bg-black/60 hover:bg-black/80 ${isUpcomingSection && isInInterested ? 'text-accent-foreground hover:text-accent-foreground/90' : 'text-white hover:text-primary'} rounded-full h-9 w-9 transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 z-10`}
                aria-label={overlayButtonAriaLabel}
                onClick={handleManageOrAddToList}
              >
                {overlayButtonIcon}
              </Button>
            </CardHeader>
            <CardContent className={`${contentPadding} space-y-1`}>
              <CardTitle className={titleClasses} title={title}>
                {title || "Untitled Content"}
              </CardTitle>
              <Badge variant="secondary" className="mt-1 text-xs">
                {genre || "N/A"} {media_type === 'tv' && !isUpcomingSection && item.media_type !== 'movie' ? '(Series)' : ''}
              </Badge>
              {formattedReleaseOrAirDate && (
                <div className="flex items-center text-xs text-muted-foreground pt-1">
                  <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-blue-400" />
                  <span>{formattedReleaseOrAirDate}</span>
                </div>
              )}
              {formattedAddedDate && (
                <div className="flex items-center text-xs text-muted-foreground pt-1">
                  <CalendarPlus className="mr-1.5 h-3.5 w-3.5 text-green-400" />
                  <span>Added: {formattedAddedDate}</span>
                </div>
              )}
              {parentListName && parentListId && (
                 <p className="text-xs text-muted-foreground mt-1 truncate">
                  <Info className="inline-block mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                  In: <span
                        className="text-primary hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          router.push(`/me/list/${parentListId}`);
                        }}
                      >
                        {parentListName}
                      </span>
                </p>
              )}
            </CardContent>
          </a>
        </Link>
        {showFooterButton && (
          <CardFooter className={`${footerPadding} mt-auto`}>
            <Button
              variant={buttonVariant as "default" | "outline" | "secondary" | "destructive" | "ghost" | null | undefined}
              size="sm"
              onClick={handleMainButtonClick}
              className="w-full transition-all duration-200 ease-in-out"
              aria-pressed={isUpcomingSection ? isInInterested : (currentListId ? isItemInSpecificList(currentListId, id.toString(), media_type) : itemPresence.inList)}
            >
              {buttonIcon}
              {buttonText}
            </Button>
          </CardFooter>
        )}
      </Card>

      {isMounted && itemToManageInDialog && itemToManageInDialog.media_type === 'tv' && !isUpcomingSection && (
        <SeasonEpisodeSelectorDialog
          isOpen={isSeasonEpisodeDialogOpen}
          onClose={handleSeasonEpisodeDialogClose}
          onSave={handleSeasonEpisodeDialogSave}
          showId={itemToManageInDialog.id.toString()}
          showTitle={itemToManageInDialog.title || "Unknown Title"}
          initialInteractionData={{
            watchedEpisodes: pendingTvWatchedData || {},
            rating: currentTvShowRating
          }}
          onRemoveShow={
             (currentListId || itemPresence.listId) && itemPresence.listName !== INTERESTED_LIST_NAME && isItemInSpecificList(currentListId || itemPresence.listId!, itemToManageInDialog.id.toString(), itemToManageInDialog.media_type)
              ? handleRemoveFromListInSeasonDialog
              : undefined
          }
        />
      )}

      {isMounted && itemToManageInDialog && !isUpcomingSection && (
        <>
          <SelectListDialog
            isOpen={isSelectListDialogOpen}
            onClose={() => {
              setIsSelectListDialogOpen(false);
              setItemToManageInDialog(null);
              setPendingTvWatchedData(null);
              setCurrentTvShowRating(null);
            }}
            itemToManage={itemToManageInDialog}
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
              setItemToManageInDialog(null);
              setPendingTvWatchedData(null);
              setCurrentTvShowRating(null);
            }}
            onListCreated={handleListCreatedAndAddItem}
          />
        </>
      )}
    </>
  );
});

ContentCard.displayName = 'ContentCard';
    
    