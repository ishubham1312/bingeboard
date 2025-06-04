"use client";

import { useEffect, useState, useMemo, type MouseEvent } from 'react';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from '@/components/ui/skeleton';
import { ListX, PlusCircle, Pin, PinOff, Edit3, Trash2, Eye, UserX, Settings, Filter as FilterIcon, RefreshCw, Share2, FilePlus2, Edit } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  togglePinList,
  deleteList as deleteListFromService,
  type UserList,
  INTERESTED_LIST_NAME,
  getAllGenresFromList,
  exportListToJSON,
} from '@/services/watchedItemsService';
import { getBio, getEffectiveCoverArtUrl, PRESET_COVER_ART_OPTIONS } from '@/services/userProfileService';
import { CreateListDialog } from '@/components/list/CreateListDialog';
import { RenameListDialog } from '@/components/list/RenameListDialog';
import { DeleteListConfirmationDialog } from '@/components/list/DeleteListConfirmationDialog';
import { ExportListDialog } from '@/components/list/ExportListDialog';
import { ImportListDialog } from '@/components/list/ImportListDialog';
import { useToast, type ToastActionElement } from '@/hooks/use-toast';
import { useListManagement } from '@/hooks/useListManagement';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';

const getInitials = (name?: string | null, email?: string | null): string => {
  if (name) {
    const names = name.split(' ').filter(Boolean);
    if (names.length === 0) return email ? email[0].toUpperCase() : 'U';
    if (names.length === 1) return names[0][0]?.toUpperCase() || 'U';
    return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return 'U';
};

const ALL_GENRES_OPTION_VALUE = "_all_my_list_genres_";

function MyListPageSkeleton() {
  return (
    <div className="pb-8">
      {/* Cover Art Skeleton */}
      <Skeleton className="h-48 md:h-60 w-full" />

      {/* Main Content Container Skeleton */}
      <div className="container mx-auto px-4">
        <div className="bg-card p-4 sm:p-6 rounded-lg shadow-xl relative -mt-10 md:-mt-16 mx-auto max-w-4xl border border-border/30">
           {/* Settings Icon Skeleton (Top Right of Card) */}
          <Skeleton className="absolute top-4 right-4 h-8 w-8 rounded-full" />
          {/* Profile Info Skeleton */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
            <Skeleton className="h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-background shadow-md -mt-12 sm:-mt-16 flex-shrink-0" />
            <div className="flex-1 text-center sm:text-left pt-4 sm:pt-0">
              <Skeleton className="h-8 w-3/4 sm:w-1/2 mx-auto sm:mx-0" /> {/* Name Skeleton */}
              <Skeleton className="h-5 w-full sm:w-3/4 mt-2 mx-auto sm:mx-0" /> {/* Bio Skeleton */}
            </div>
          </div>

          {/* Lists Section Skeleton */}
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4">
              <Skeleton className="h-8 w-32" /> {/* "My Lists" Title Skeleton */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-md" /> {/* Refresh Icon Skeleton */}
                <Skeleton className="h-10 w-10 rounded-md" /> {/* Import Icon Skeleton */}
                <Skeleton className="h-10 w-36" /> {/* "Create New List" Button Skeleton */}
              </div>
            </div>
            <Skeleton className="h-10 w-full md:w-1/2 mb-6" /> {/* Genre Filter Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-1" />
                  </CardHeader>
                  <CardFooter className="flex justify-end gap-1 p-3">
                    <Skeleton className="h-8 w-8 rounded-md" /> {/* Export */}
                    <Skeleton className="h-8 w-8 rounded-md" /> {/* Pin */}
                    <Skeleton className="h-8 w-8 rounded-md" /> {/* Rename */}
                    <Skeleton className="h-8 w-8 rounded-md" /> {/* Delete */}
                    <Skeleton className="h-8 w-20 rounded-md" /> {/* View */}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


interface ToasterToast {
  id: string | number;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  duration?: number;
  variant?: "default" | "destructive";
  update?: (props: Partial<ToasterToast>) => void;
  dismiss?: () => void;
}

interface ListPendingDeletion {
  list: UserList;
  timeoutId: NodeJS.Timeout;
  intervalId?: NodeJS.Timeout;
  toast: ToasterToast;
}

export default function MyListsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast: showToast } = useToast();
  const { lists: userListsFromHook, setLists: setUserListsDirectly, refreshLists, isLoading: isLoadingListsHook } = useListManagement();

  const [isMounted, setIsMounted] = useState(false);
  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);
  const [isRenameListDialogOpen, setIsRenameListDialogOpen] = useState(false);
  const [listToRename, setListToRename] = useState<UserList | null>(null);
  const [listPendingDeletion, setListPendingDeletion] = useState<ListPendingDeletion | null>(null);
  const [listForConfirmation, setListForConfirmation] = useState<UserList | null>(null);
  const [coverArtUrl, setCoverArtUrl] = useState(PRESET_COVER_ART_OPTIONS.default_cover.url);
  const [userBio, setUserBio] = useState("");
  const [availableGenres, setAvailableGenres] = useState<{id: string, name: string}[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>(ALL_GENRES_OPTION_VALUE);

  const [isExportListDialogOpen, setIsExportListDialogOpen] = useState(false);
  const [listToExportData, setListToExportData] = useState<{ name: string; json: string } | null>(null);
  const [isImportListDialogOpen, setIsImportListDialogOpen] = useState(false);


  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (listPendingDeletion) {
        clearTimeout(listPendingDeletion.timeoutId);
        if (listPendingDeletion.intervalId) clearInterval(listPendingDeletion.intervalId);
      }
    };
  }, [listPendingDeletion]);

  useEffect(() => {
    if (!isMounted) return;
    if (!authLoading && !user) {
      router.push('/login?redirect=/me');
      return;
    }
    if (user && !isLoadingListsHook) {
      refreshLists();
      setAvailableGenres(getAllGenresFromList());
    }
    if (isMounted) {
      setUserBio(getBio());
      setCoverArtUrl(getEffectiveCoverArtUrl(PRESET_COVER_ART_OPTIONS.default_cover.url));
    }
  }, [user, authLoading, router, isMounted, refreshLists, isLoadingListsHook]);

  const filteredUserLists = useMemo(() => {
    if (selectedGenre === ALL_GENRES_OPTION_VALUE) {
      return userListsFromHook;
    }
    return userListsFromHook.filter(list =>
      list.items.some(item => item.genre === selectedGenre)
    );
  }, [userListsFromHook, selectedGenre]);

  const handleListCreated = (newList: UserList) => {
    refreshLists();
    setAvailableGenres(getAllGenresFromList());
    setIsCreateListDialogOpen(false);
  };

  const handleRenameList = (list: UserList) => {
    setListToRename(list);
    setIsRenameListDialogOpen(true);
  };

  const handleListRenamed = (renamedList: UserList) => {
    refreshLists();
    setAvailableGenres(getAllGenresFromList());
    setIsRenameListDialogOpen(false);
    setListToRename(null);
  };

  const commitPermanentDeletion = (listId: string, listName: string) => {
    deleteListFromService(listId);
    refreshLists();
    setAvailableGenres(getAllGenresFromList());
    showToast({
      title: "List Permanently Deleted",
      description: `"${listName}" has been permanently deleted.`,
    });
    setListPendingDeletion(null);
  };

  const initiateUndoableDeletion = (listToDelete: UserList) => {
    if (listPendingDeletion && listPendingDeletion.list.id !== listToDelete.id) {
      clearTimeout(listPendingDeletion.timeoutId);
      if (listPendingDeletion.intervalId) clearInterval(listPendingDeletion.intervalId);
      commitPermanentDeletion(listPendingDeletion.list.id, listPendingDeletion.list.name);
    } else if (listPendingDeletion && listPendingDeletion.list.id === listToDelete.id) {
      clearTimeout(listPendingDeletion.timeoutId);
      if (listPendingDeletion.intervalId) clearInterval(listPendingDeletion.intervalId);
      if (listPendingDeletion.toast.dismiss) listPendingDeletion.toast.dismiss();
    }

    setUserListsDirectly(prevLists => prevLists.filter(l => l.id !== listToDelete.id));

    let countdown = 10;
    const toastControls = showToast({
      title: `List "${listToDelete.name}" deleted.`,
      description: `You can undo this action for ${countdown} seconds.`,
      duration: 10000,
      action: (
        <Button
          variant="link"
          size="sm"
          onClick={() => handleUndoDelete(listToDelete)}
          className="text-accent-foreground hover:text-accent-foreground/80"
        >
          Undo
        </Button>
      ),
    }) as ToasterToast;

    const intervalIdVal = setInterval(() => {
      countdown--;
      if (toastControls.update) {
        toastControls.update({
          id: toastControls.id,
          description: `You can undo this action for ${countdown} seconds.`
        });
      }
      if (countdown <= 0) {
        clearInterval(intervalIdVal);
      }
    }, 1000);

    const timeoutId = setTimeout(() => {
      setListPendingDeletion(currentPending => {
        if (currentPending && currentPending.list.id === listToDelete.id) {
          commitPermanentDeletion(listToDelete.id, listToDelete.name);
          return null;
        }
        return currentPending;
      });
      if (intervalIdVal) clearInterval(intervalIdVal);
    }, 10000);

    setListPendingDeletion({ list: listToDelete, timeoutId, intervalId: intervalIdVal, toast: toastControls });
  };

  const handleUndoDelete = (listToRestore: UserList) => {
    if (listPendingDeletion && listPendingDeletion.list.id === listToRestore.id) {
      clearTimeout(listPendingDeletion.timeoutId);
      if (listPendingDeletion.intervalId) clearInterval(listPendingDeletion.intervalId);
      if (listPendingDeletion.toast.dismiss) listPendingDeletion.toast.dismiss();

      setUserListsDirectly(prevLists => {
        const restoredLists = [...prevLists, listToRestore];
        return restoredLists.sort((a, b) => {
            if (a.name === INTERESTED_LIST_NAME) return 1;
            if (b.name === INTERESTED_LIST_NAME) return -1;
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return (b.createdAt || 0) - (a.createdAt || 0); 
        });
      });

      showToast({
        title: "Deletion Reverted",
        description: `"${listToRestore.name}" has been restored.`,
      });
      setListPendingDeletion(null);
    }
  };

  const handleDeleteListClicked = (listToDelete: UserList) => {
    setListForConfirmation(listToDelete);
  };

  const confirmDeleteAndInitiate = () => {
    if (listForConfirmation) {
      initiateUndoableDeletion(listForConfirmation);
      setListForConfirmation(null);
    }
  };

  const handleTogglePin = (e: MouseEvent<HTMLButtonElement>, listId: string) => {
    e.stopPropagation();
    const updatedLists = togglePinList(listId);
    setUserListsDirectly(updatedLists); 
    const list = updatedLists.find(l => l.id === listId);
    if (list) {
      showToast({
        title: list.isPinned ? "List Pinned" : "List Unpinned",
        description: `"${list.name}" is now ${list.isPinned ? "pinned." : "unpinned."}`,
      });
    }
  };

  const handleEditProfile = () => {
    router.push('/me/edit-profile');
  };

  const handleExportList = (list: UserList) => {
    const jsonString = exportListToJSON(list.id);
    if (jsonString) {
      setListToExportData({ name: list.name, json: jsonString });
      setIsExportListDialogOpen(true);
    } else {
      showToast({ title: "Error", description: "Could not export list.", variant: "destructive" });
    }
  };

  const handleListImported = (importedList: UserList) => {
    refreshLists();
    setAvailableGenres(getAllGenresFromList());
    setIsImportListDialogOpen(false);
    showToast({ title: "List Imported!", description: `List "${importedList.name}" has been successfully imported.` });
  };


  if (!isMounted || authLoading || isLoadingListsHook) {
    return (
      <main className="pb-8">
        <MyListPageSkeleton />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="pb-8"> {/* Added pb-8 for consistency with skeleton */}
        <div className="h-48 md:h-60 w-full bg-muted/50" /> {/* Simplified cover for non-user */}
        <div className="container mx-auto px-4">
            <div className="bg-card p-4 sm:p-6 rounded-lg shadow-xl relative -mt-10 md:-mt-16 mx-auto max-w-4xl border border-border/30 text-center">
                <UserX className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl sm:text-3xl font-bold text-destructive mb-2">Access Denied</h1>
                <p className="text-muted-foreground text-base sm:text-lg mb-6">Please log in to view your lists.</p>
                <Button onClick={() => router.push('/login?redirect=/me')}>Go to Login</Button>
            </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-8">
      <div
        className="h-48 md:h-60 w-full bg-muted bg-cover bg-center relative"
        style={{ backgroundImage: `url(${coverArtUrl || PRESET_COVER_ART_OPTIONS.default_cover.url})` }}
        data-ai-hint="banner abstract"
      >
        <div className="absolute inset-0 bg-black/50"></div>
        <Button
          variant="outline"
          size="icon"
          className="absolute top-4 right-4 bg-background/70 hover:bg-background text-foreground z-10"
          onClick={handleEditProfile}
          title="Edit Profile (Cover, Avatar, Bio)"
        >
          <Edit className="h-5 w-5" />
        </Button>
      </div>

      {/* Unified Profile and Lists Container */}
      <div className="container mx-auto px-4">
        <div className="bg-card p-4 sm:p-6 rounded-lg shadow-xl relative -mt-10 md:-mt-16 mx-auto max-w-4xl border border-border/30">
           <Link href="/settings" passHref legacyBehavior>
            <Button variant="ghost" size="icon" className="absolute top-3 right-3 sm:top-4 sm:right-4 h-8 w-8 text-muted-foreground hover:text-primary z-20" title="Go to Settings">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
          {/* Profile Info Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-background shadow-md -mt-12 sm:-mt-16 flex-shrink-0">
              <AvatarImage 
                src={user.photoURL || undefined} 
                alt={user.displayName || user.email || "User Avatar"} 
                data-ai-hint="profile avatar"
                className="object-cover"
              />
              <AvatarFallback email={user.email}>
                {user.displayName ? getInitials(user.displayName, user.email) : null}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left pt-4 sm:pt-0">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-center sm:text-left">
                {user.displayName || user.email?.split('@')[0] || "User"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 break-words line-clamp-3 text-center sm:text-left">
                {userBio || "No bio yet. Click the edit icon on the cover to add one."}
              </p>
            </div>
          </div>

          {/* Lists Management Section */}
          <div className="mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-primary">
                My Lists
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => { refreshLists(); setAvailableGenres(getAllGenresFromList()); }}
                  title="Refresh lists"
                  className="h-10 w-10"
                >
                  <RefreshCw className="h-5 w-5" />
                </Button>
                <Button onClick={() => setIsImportListDialogOpen(true)} variant="outline" size="icon" title="Import List" className="h-10 w-10">
                    <FilePlus2 className="h-5 w-5" />
                </Button>
                {(userListsFromHook.filter(l => l.name !== INTERESTED_LIST_NAME).length > 0 || listPendingDeletion !== null || listForConfirmation !== null) && (
                  <Button onClick={() => setIsCreateListDialogOpen(true)} size="default" className="h-10">
                    <PlusCircle className="mr-2 h-5 w-5" /> Create New List
                  </Button>
                )}
              </div>
            </div>

            {userListsFromHook.filter(l => l.name !== INTERESTED_LIST_NAME).length > 0 && availableGenres.length > 0 && (
              <div className="mb-6">
                <Label htmlFor="genre-filter-my-list" className="text-sm font-medium">Filter by Genre (across all lists)</Label>
                <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                  <SelectTrigger id="genre-filter-my-list" className="w-full md:w-1/2 mt-1">
                    <FilterIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select a genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_GENRES_OPTION_VALUE}>All My List Genres</SelectItem>
                    {availableGenres.map(genre => (
                      <SelectItem key={genre.id} value={genre.id}>{genre.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filteredUserLists.filter(l => l.name !== INTERESTED_LIST_NAME).length === 0 && !listPendingDeletion && !listForConfirmation ? (
              <div className="text-center py-16 border-2 border-dashed border-muted rounded-lg">
                <ListX className="h-16 w-16 sm:h-20 sm:w-20 text-muted-foreground mx-auto mb-6" />
                {selectedGenre !== ALL_GENRES_OPTION_VALUE ? (
                  <>
                    <p className="text-muted-foreground text-xl sm:text-2xl font-medium mb-3">No lists contain items of the genre "{selectedGenre}".</p>
                    <p className="text-muted-foreground text-sm sm:text-base mb-8">Try selecting "All My List Genres" or a different genre.</p>
                    <Button onClick={() => setSelectedGenre(ALL_GENRES_OPTION_VALUE)} variant="outline">Clear Genre Filter</Button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground text-xl sm:text-2xl font-medium mb-3">You haven't created any lists yet.</p>
                    <p className="text-muted-foreground text-sm sm:text-base mb-8">Start organizing your favorite movies and shows!</p>
                    <Button onClick={() => setIsCreateListDialogOpen(true)} size="lg">
                      <PlusCircle className="mr-2 h-5 w-5" /> Create Your First List
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUserLists.map(list => (
                  <Card
                    key={list.id}
                    className={`flex flex-col justify-between bg-card/80 hover:shadow-primary/20 transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 ${list.isPinned ? 'border-2 border-primary/70 shadow-lg' : 'border-border'}`}
                  >
                    <CardHeader
                      className="cursor-pointer group hover:bg-muted/30 transition-colors p-4"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (!target.closest('button[data-action-button="true"]') && !target.closest('a[data-action-button="true"]')) {
                            router.push(`/me/list/${list.id}`);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <Link 
                          href={`/me/list/${list.id}`} 
                          passHref 
                          legacyBehavior
                          data-action-button="true" 
                        >
                          <a className="block flex-grow outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm min-w-0 group-hover:text-primary transition-colors"
                            onClick={(e) => e.stopPropagation()} 
                          >
                            <CardTitle className="text-lg sm:text-xl font-semibold break-words">
                              {list.name}
                            </CardTitle>
                            <CardDescription className="text-xs group-hover:text-primary/80 transition-colors mt-0.5">
                              {list.items.length} {list.items.length === 1 ? 'item' : 'items'}
                            </CardDescription>
                          </a>
                        </Link>
                        {list.name !== INTERESTED_LIST_NAME && (
                          <Button
                            data-action-button="true"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleTogglePin(e, list.id)}
                            className="text-muted-foreground hover:text-primary flex-shrink-0 ml-2 h-8 w-8"
                            title={list.isPinned ? 'Unpin list' : 'Pin list'}
                          >
                            {list.isPinned ? <PinOff className="h-4 w-4 text-primary" /> : <Pin className="h-4 w-4" />}
                            <span className="sr-only">{list.isPinned ? 'Unpin list' : 'Pin list'}</span>
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    {list.name !== INTERESTED_LIST_NAME && (
                      <CardFooter className="flex justify-end items-center gap-1 p-3 border-t border-border/50">
                        <Button data-action-button="true" variant="ghost" size="icon" onClick={() => handleExportList(list)} title="Export list" className="h-8 w-8">
                            <Share2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            <span className="sr-only">Export list</span>
                        </Button>
                        <Button data-action-button="true" variant="ghost" size="icon" onClick={() => handleRenameList(list)} title="Rename list" className="h-8 w-8">
                          <Edit3 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          <span className="sr-only">Rename list</span>
                        </Button>
                        <Button
                          data-action-button="true"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteListClicked(list)}
                          title="Delete list"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete list</span>
                        </Button>
                        <Button onClick={() => router.push(`/me/list/${list.id}`)} variant="outline" size="sm" className="h-8 px-2 text-xs">
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                        </Button>
                      </CardFooter>
                    )}
                    {list.name === INTERESTED_LIST_NAME && (
                      <CardFooter className="p-3 border-t border-border/50">
                        <Button onClick={() => router.push(`/me/list/${list.id}`)} variant="outline" size="sm" className="w-full h-8 text-xs">
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> View {list.name} List
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateListDialog
        isOpen={isCreateListDialogOpen}
        onClose={() => setIsCreateListDialogOpen(false)}
        onListCreated={handleListCreated}
      />
      {listToRename && (
        <RenameListDialog
          isOpen={isRenameListDialogOpen}
          onClose={() => { setIsRenameListDialogOpen(false); setListToRename(null); }}
          list={listToRename}
          onListRenamed={handleListRenamed}
        />
      )}
      {listForConfirmation && (
        <DeleteListConfirmationDialog
          isOpen={!!listForConfirmation}
          onClose={() => setListForConfirmation(null)}
          listName={listForConfirmation.name}
          onConfirm={confirmDeleteAndInitiate}
        />
      )}
      {listToExportData && (
        <ExportListDialog
          isOpen={isExportListDialogOpen}
          onClose={() => setIsExportListDialogOpen(false)}
          listName={listToExportData.name}
          listJSON={listToExportData.json}
        />
      )}
      <ImportListDialog
        isOpen={isImportListDialogOpen}
        onClose={() => setIsImportListDialogOpen(false)}
        onListImported={handleListImported}
      />
    </main>
  );
}

