"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createList, type UserList } from '@/services/watchedItemsService';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LogIn } from 'lucide-react';

interface CreateListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onListCreated: (newList: UserList) => void; // Callback with the new list
}

// Dialog for creating a new user list
export function CreateListDialog({ isOpen, onClose, onListCreated }: CreateListDialogProps) {
  const [listName, setListName] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();

  const handleCreate = () => {
    if (!user) {
      onClose();
      router.push('/login');
      toast({ 
        title: "Login Required", 
        description: "You need to be logged in to create lists.", 
        variant: "default"
      });
      return;
    }

    if (!listName.trim()) {
      setError('List name cannot be empty.');
      return;
    }
    
    setError('');
    try {
      // createList now returns the array of all lists, with the new one first.
      const allLists = createList(listName.trim());
      const createdList = allLists[0]; // The newly created list is at the beginning

      if (createdList) {
        toast({ title: "List Created!", description: `"${createdList.name}" has been created.` });
        onListCreated(createdList); // Pass the new list to the callback
        setListName(''); // Reset input
        onClose();
      } else {
        // This case should ideally not happen if createList is implemented correctly
        throw new Error("Failed to retrieve the newly created list.");
      }
    } catch (e: any) {
        toast({ title: "Error", description: `Could not create list: ${e.message}`, variant: "destructive" });
    }
  };

  if (!isOpen) return null;

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Login Required</DialogTitle>
            <DialogDescription>
              You need to be logged in to create and manage lists.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Button onClick={() => {
              onClose();
              router.push('/login');
            }}>
              <LogIn className="mr-2 h-4 w-4" />
              Go to Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            setListName(''); // Reset state on close
            setError('');
            onClose();
        }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New List</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="list-name" className="text-right col-span-1">
              Name
            </Label>
            <Input
              id="list-name"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., My Awesome Movies"
              aria-label="List name"
            />
          </div>
          {error && <p className="col-span-4 text-sm text-destructive text-center">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleCreate}>Create List</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
