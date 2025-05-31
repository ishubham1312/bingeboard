
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { renameList as renameListService, type UserList } from '@/services/watchedItemsService'; // Renamed import

interface RenameListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  list: UserList; // The list to rename
  onListRenamed: (renamedList: UserList) => void;
}

// Dialog for renaming an existing user list
export function RenameListDialog({ isOpen, onClose, list, onListRenamed }: RenameListDialogProps) {
  const [newListName, setNewListName] = useState(list.name);
  const [error, setError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setNewListName(list.name); // Reset to current list name when dialog opens/list changes
      setError('');
    }
  }, [isOpen, list.name]);

  const handleRename = () => {
    if (!newListName.trim()) {
      setError('List name cannot be empty.');
      return;
    }
    if (newListName.trim() === list.name) {
      // No change, just close
      onClose();
      return;
    }
    setError('');
    try {
      renameListService(list.id, newListName.trim()); // Call the service function
      toast({ title: "List Renamed!", description: `List "${list.name}" has been renamed to "${newListName.trim()}".` });
      onListRenamed({ ...list, name: newListName.trim() }); // Pass the updated list to the callback
      onClose();
    } catch (e: any) {
        toast({ title: "Error", description: `Could not rename list: ${e.message}`, variant: "destructive" });
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            // setNewListName(list.name); // Reset on close if needed, but useEffect handles open
            onClose();
        }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename List: {list.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-list-name" className="text-right col-span-1">
              New Name
            </Label>
            <Input
              id="new-list-name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="col-span-3"
              placeholder="Enter new list name"
              aria-label="New list name"
            />
          </div>
          {error && <p className="col-span-4 text-sm text-destructive text-center">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleRename}>Save Name</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
