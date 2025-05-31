
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
// Removed: import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InteractiveStarRating } from '@/components/ui/InteractiveStarRating'; // Added
import {
    isItemInSpecificList,
    type UserList,
    INTERESTED_LIST_NAME,
    getLists as getAllListsFromService
} from '@/services/watchedItemsService';
import type { Recommendation } from '@/services/tmdb';
import { PlusCircle, Loader2, Star } from 'lucide-react';

interface SelectListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemToManage: Recommendation;
  onConfirmSelection: (selection: { listIds: string[], rating?: number | null }) => void;
  onCreateNewList: () => void;
}

// Removed ratingOptions as it's handled by InteractiveStarRating

export function SelectListDialog({
  isOpen,
  onClose,
  itemToManage,
  onConfirmSelection,
  onCreateNewList
}: SelectListDialogProps) {
  const [dialogLists, setDialogLists] = useState<UserList[]>([]);
  const [isLoadingDialogLists, setIsLoadingDialogLists] = useState(true);
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());
  const [currentRating, setCurrentRating] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const itemKey = `${itemToManage.id}-${itemToManage.media_type}`;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && isMounted && itemToManage) {
      setIsLoadingDialogLists(true);
      const currentLists = getAllListsFromService();
      setDialogLists(currentLists);

      const initialSelections = new Set<string>();
      let initialRating: number | null = null;

      currentLists.forEach(list => {
        if (list.name !== INTERESTED_LIST_NAME) {
          const itemInList = list.items.find(i => i.id === itemToManage.id.toString() && i.media_type === itemToManage.media_type);
          if (itemInList) {
            initialSelections.add(list.id);
            if (itemInList.userRating !== undefined && initialRating === null) { 
              initialRating = itemInList.userRating;
            }
          }
        }
      });
      setSelectedListIds(initialSelections);
      setCurrentRating(initialRating);
      setIsLoadingDialogLists(false);
    }
  }, [isOpen, isMounted, itemToManage]);

  const handleToggleListSelection = (listId: string) => {
    setSelectedListIds(prev => {
      const newSelections = new Set(prev);
      if (newSelections.has(listId)) {
        newSelections.delete(listId);
      } else {
        newSelections.add(listId);
      }
      return newSelections;
    });
  };

  const handleSave = () => {
    const ratingToSave = itemToManage.media_type === 'movie' ? currentRating : undefined;
    onConfirmSelection({ listIds: Array.from(selectedListIds), rating: ratingToSave });
    onClose();
  };

  const displayableLists = dialogLists.filter(list => list.name !== INTERESTED_LIST_NAME);

  if (!isOpen || !isMounted) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage "{itemToManage.title}" in Lists</DialogTitle>
        </DialogHeader>

        {isLoadingDialogLists ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading lists...</p>
          </div>
        ) : (
          <div className="my-4 space-y-4">
            {itemToManage.media_type === 'movie' && (
              <div>
                <Label htmlFor="movie-rating-interactive" className="text-sm font-medium mb-1 block">Your Rating</Label>
                <InteractiveStarRating
                  currentRating={currentRating}
                  onRatingChange={setCurrentRating}
                  starSize="h-6 w-6" // Consistent size
                />
              </div>
            )}

            {displayableLists.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-muted-foreground mb-4">You don't have any lists yet (other than "Interested").</p>
                <Button onClick={() => {
                  onClose();
                  onCreateNewList();
                }}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Your First List
                </Button>
              </div>
            ) : (
              <div>
                <Label className="text-sm font-medium">Select Lists</Label>
                <ScrollArea className="max-h-48 mt-1 border rounded-md">
                  <div className="space-y-1 p-2">
                    {displayableLists.map((list) => (
                      <div key={list.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md">
                        <Checkbox
                          id={`list-checkbox-${list.id}-${itemKey}`}
                          checked={selectedListIds.has(list.id)}
                          onCheckedChange={() => handleToggleListSelection(list.id)}
                        />
                        <Label htmlFor={`list-checkbox-${list.id}-${itemKey}`} className="text-sm font-normal flex-grow cursor-pointer">
                          {list.name} <span className="text-xs text-muted-foreground">({list.items.length} items)</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-2">
          <div className="flex w-full justify-between items-center">
            <Button onClick={() => {
                onClose();
                onCreateNewList();
              }} variant="ghost" className="text-sm">
                 <PlusCircle className="mr-2 h-4 w-4" /> Create New
            </Button>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              {!isLoadingDialogLists && (itemToManage.media_type === 'movie' || displayableLists.length > 0) && (
                <Button type="button" onClick={handleSave}>Save</Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
