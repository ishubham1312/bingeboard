
"use client";

import { useEffect, useState, useMemo, type MouseEvent, use } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getListById, type UserList, type ListItem } from '@/services/watchedItemsService';
import { ContentCard } from '@/components/content/content-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertTriangle, ArrowLeft, ListX, Film, Tv, Brush, Clapperboard, Search, CalendarDays, Filter as FilterIcon, XCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useListManagement } from '@/hooks/useListManagement';
import { format, parseISO, isValid, startOfDay, endOfDay } from 'date-fns';

const ALL_GENRES_FILTER_VALUE = "_all_genres_in_list_";
const ALL_RATINGS_FILTER_VALUE = "_all_ratings_in_list_";
const ITEMS_PER_CATEGORY_PREVIEW = 5;

function ListPageSkeleton({ listName }: { listName?: string }) {
  return (
    <div className="container mx-auto py-8 px-4">
      <Skeleton className="h-8 w-24 mb-6" />
      <Skeleton className="h-10 w-3/4 sm:w-1/2 md:w-1/3 mb-1" />
      <Skeleton className="h-6 w-1/2 sm:w-1/3 md:w-1/4 mb-8" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Skeleton className="h-10 w-full" /> 
        <Skeleton className="h-10 w-full" /> 
        <Skeleton className="h-10 w-full" /> 
      </div>

      {[...Array(2)].map((_, sectionIdx) => (
        <div key={sectionIdx} className="mb-10">
          <Skeleton className="h-8 w-40 mb-6" /> 
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {[...Array(ITEMS_PER_CATEGORY_PREVIEW)].map((_, i) => (
              <div key={i} className="w-44 sm:w-52 md:w-60 flex-shrink-0">
                <Skeleton className="h-56 sm:h-64 md:h-80 w-full rounded-lg bg-muted/50" />
                <Skeleton className="h-6 w-3/4 mt-3 rounded-md bg-muted/50" />
                <Skeleton className="h-4 w-1/2 mt-2 rounded-md bg-muted/50" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface CategorizedItems {
  series: ListItem[];
  animationMovies: ListItem[];
  hollywoodMovies: ListItem[];
  bollywoodMovies: ListItem[];
  otherMovies: ListItem[];
  totalFilteredItems: number;
}

interface CategorySection {
  id: string;
  title: string;
  items: ListItem[];
  icon: JSX.Element;
}

interface IndividualListPageProps {
  params?: any; // To accept params prop from Next.js router
}

export default function IndividualListPage({ params: paramsFromProp }: IndividualListPageProps) {
  // The paramsFromProp is available if needed, but paramsFromHook is typically used in client components.

  const paramsFromHook = useParams() as { listId: string };
  const listId = paramsFromHook.listId;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [listDetails, setListDetails] = useState<UserList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  const { lists: allListsGlobal, refreshLists } = useListManagement();

  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>(ALL_GENRES_FILTER_VALUE);
  const [selectedRating, setSelectedRating] = useState<string>(ALL_RATINGS_FILTER_VALUE);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({ from: undefined, to: undefined });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || authLoading) {
      if (isMounted && !authLoading && !user) { 
        router.push(`/login?redirect=/me/list/${listId}`);
      }
      return;
    }
    
    if (!user) {
        router.push(`/login?redirect=/me/list/${listId}`);
        return;
    }

    if (!listId || typeof listId !== 'string') {
      setError("List ID is missing or invalid.");
      setListDetails(null);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    const list = getListById(listId);

    if (!list) {
      setError("List not found. It might have been deleted or the ID is incorrect.");
      setListDetails(null); 
    } else {
      setListDetails(list);
    }
    setIsLoading(false);
  }, [isMounted, listId, user, authLoading, router, allListsGlobal, refreshLists]); 

  const handleItemUpdate = () => {
    if (listId && typeof listId === 'string') {
        const updatedList = getListById(listId);
        setListDetails(updatedList); 
    }
    refreshLists(); 
  };

  const availableGenres = useMemo(() => {
    if (!listDetails?.items) return [];
    const genres = new Set<string>();
    listDetails.items.forEach(item => {
      if (item.genre && item.genre !== "N/A") {
        genres.add(item.genre);
      }
    });
    return Array.from(genres).sort().map(genreName => ({ id: genreName, name: genreName }));
  }, [listDetails]);

  const availableRatings = useMemo(() => {
    if (!listDetails?.items) return [];
    const ratings = new Set<number>();
    listDetails.items.forEach(item => {
      if (item.userRating !== undefined && item.userRating !== null) {
        ratings.add(item.userRating);
      }
    });
    return Array.from(ratings).sort((a, b) => a - b)
        .map(ratingValue => ({ id: ratingValue.toString(), name: ratingValue.toFixed(1) }));
  }, [listDetails]);

  const filteredAndCategorizedItems = useMemo(() => {
    if (!listDetails?.items) {
      return { series: [], animationMovies: [], hollywoodMovies: [], bollywoodMovies: [], otherMovies: [], totalFilteredItems: 0 };
    }

    let filteredItems = listDetails.items;

    if (searchTerm) {
      filteredItems = filteredItems.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedGenre !== ALL_GENRES_FILTER_VALUE) {
      filteredItems = filteredItems.filter(item => item.genre === selectedGenre);
    }

    if (selectedRating !== ALL_RATINGS_FILTER_VALUE) {
        filteredItems = filteredItems.filter(item => item.userRating !== undefined && item.userRating !== null && item.userRating.toFixed(1) === parseFloat(selectedRating).toFixed(1));
    }

    if (dateRange.from && dateRange.to) {
      const fromTimestamp = startOfDay(dateRange.from).getTime();
      const toTimestamp = endOfDay(dateRange.to).getTime();
      filteredItems = filteredItems.filter(item => {
        const addedAt = item.addedAt || 0;
        return addedAt >= fromTimestamp && addedAt <= toTimestamp;
      });
    } else if (dateRange.from) {
      const fromTimestamp = startOfDay(dateRange.from).getTime();
      filteredItems = filteredItems.filter(item => {
        const addedAt = item.addedAt || 0;
        return addedAt >= fromTimestamp;
      });
    } else if (dateRange.to) {
      const toTimestamp = endOfDay(dateRange.to).getTime();
      filteredItems = filteredItems.filter(item => {
        const addedAt = item.addedAt || 0;
        return addedAt <= toTimestamp;
      });
    }

    filteredItems.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

    const totalFilteredItems = filteredItems.length;

    const series: ListItem[] = [];
    const animationMovies: ListItem[] = [];
    const hollywoodMovies: ListItem[] = [];
    const bollywoodMovies: ListItem[] = [];
    const otherMovies: ListItem[] = [];

    filteredItems.forEach(item => {
      const isAnimation = item.genre_ids?.includes(16);
      if (item.media_type === 'tv') {
        series.push(item);
      } else if (item.media_type === 'movie') {
        if (isAnimation) {
          animationMovies.push(item);
        } else if (item.original_language === 'en') {
          hollywoodMovies.push(item);
        } else if (item.original_language === 'hi') {
          bollywoodMovies.push(item);
        } else {
          otherMovies.push(item);
        }
      }
    });
    return { series, animationMovies, hollywoodMovies, bollywoodMovies, otherMovies, totalFilteredItems }; // Ensure totalFilteredItems is returned
  }, [listDetails, searchTerm, selectedGenre, selectedRating, dateRange]);


  const categorySections: CategorySection[] = [
    { id: 'series', title: "Series", items: filteredAndCategorizedItems.series, icon: <Tv className="mr-2 h-5 w-5 text-primary/90" /> },
    { id: 'animation-movies', title: "Animation Movies", items: filteredAndCategorizedItems.animationMovies, icon: <Brush className="mr-2 h-5 w-5 text-primary/90" /> },
    { id: 'hollywood-movies', title: "Hollywood Movies", items: filteredAndCategorizedItems.hollywoodMovies, icon: <Film className="mr-2 h-5 w-5 text-primary/90" /> },
    { id: 'bollywood-movies', title: "Bollywood Movies", items: filteredAndCategorizedItems.bollywoodMovies, icon: <Clapperboard className="mr-2 h-5 w-5 text-primary/90" /> },
    { id: 'other-movies', title: "Other Movies", items: filteredAndCategorizedItems.otherMovies, icon: <Film className="mr-2 h-5 w-5 text-primary/90" /> },
  ];
  
  const clearDateRange = () => {
    setDateRange({ from: undefined, to: undefined });
    setShowDatePicker(false);
  };

  if (!isMounted || authLoading || isLoading) {
    return <ListPageSkeleton listName={listDetails?.name || "List Details"} />;
  }

  if (!user && !authLoading) { 
    return (
        <main className="container mx-auto py-10 sm:py-12 px-4 text-center">
            <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold text-destructive mb-2">Access Denied</h1>
            <p className="text-muted-foreground text-base sm:text-lg mb-6">Please log in to view this list.</p>
            <Button onClick={() => router.push(`/login?redirect=/me/list/${listId}`)}>Go to Login</Button>
        </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto py-8 px-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-destructive mb-2">Error</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => router.push('/me')} className="mt-6">Back to My Lists</Button>
      </main>
    );
  }

  if (!listDetails) { 
    return (
      <main className="container mx-auto py-8 px-4 text-center">
        <ListX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-muted-foreground mb-2">List Not Found</h1>
        <p className="text-muted-foreground">The requested list could not be found. It might have been deleted.</p>
        <Button onClick={() => router.push('/me')} className="mt-6">Back to My Lists</Button>
      </main>
    );
  }

  const originalTotalItemsInList = listDetails.items.length;

  return (
    <main className="container mx-auto py-6 sm:py-8 px-4">
      <Button variant="outline" size="sm" onClick={() => router.push('/me')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to My Lists
      </Button>
      <div className="mb-4">
        <h1 className="text-3xl sm:text-4xl font-bold mb-1 text-primary">
          {listDetails?.name || 'Unnamed List'}
        </h1>
        <p className="text-muted-foreground">
          {originalTotalItemsInList} {originalTotalItemsInList === 1 ? 'item' : 'items'} originally
          { (searchTerm || selectedGenre !== ALL_GENRES_FILTER_VALUE || selectedRating !== ALL_RATINGS_FILTER_VALUE || dateRange.from || dateRange.to) && 
            ` (showing ${filteredAndCategorizedItems.totalFilteredItems} after filters)` 
 }
        </p>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 border rounded-lg bg-card shadow">
        <div>
          <Label htmlFor="search-in-list" className="text-sm font-medium">Search in this list</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-in-list"
              type="search"
              placeholder="Search by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="genre-filter-list-page" className="text-sm font-medium">Filter by Genre</Label>
          <Select value={selectedGenre} onValueChange={setSelectedGenre}>
            <SelectTrigger id="genre-filter-list-page" className="w-full mt-1">
              <FilterIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Select a genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_GENRES_FILTER_VALUE}>All Genres in List</SelectItem>
              {availableGenres.map(genre => (
                <SelectItem key={genre.id} value={genre.id}>{genre.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="rating-filter-list-page" className="text-sm font-medium">Filter by Rating</Label>
          <Select value={selectedRating} onValueChange={setSelectedRating}>
            <SelectTrigger id="rating-filter-list-page" className="w-full mt-1">
              <FilterIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Select a rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_RATINGS_FILTER_VALUE}>All Ratings in List</SelectItem>
              {availableRatings.map(rating => (
                <SelectItem key={rating.id} value={rating.id}>
                  {rating.name} {rating.name === "1.0" ? "Star" : "Stars"} & Up
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="date-range-filter" className="text-sm font-medium">Filter by Date Added</Label>
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button id="date-range-filter" variant="outline" className="w-full justify-start text-left font-normal mt-1 relative">
                <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
                 { (dateRange.from || dateRange.to) && (
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); clearDateRange(); }} className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 mt-0 opacity-70 hover:opacity-100">
                        <XCircle className="h-4 w-4 text-muted-foreground"/>
                        <span className="sr-only">Clear date range</span>
                    </Button>
                 )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
               <div className="p-2 border-t flex justify-end">
                  <Button size="sm" onClick={() => setShowDatePicker(false)}>Apply</Button>
                </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {filteredAndCategorizedItems.totalFilteredItems > 0 ? (
        <div className="space-y-10">
          {categorySections.map(section => {
            const itemsToShow = section.items.slice(0, ITEMS_PER_CATEGORY_PREVIEW);
            return (
              section.items.length > 0 && (
                <section key={section.id}>
                  <div className="flex justify-between items-center mb-4 sm:mb-6 pb-2 border-b border-border/70">
                    <h2 className="flex items-center text-2xl sm:text-3xl font-semibold text-primary/90">
                      {section.icon}
                      {section.title} 
                      <span className="text-lg text-muted-foreground ml-2">({section.items.length})</span>
                    </h2>
                    {section.items.length > ITEMS_PER_CATEGORY_PREVIEW && (
                      <Link href={`/me/list/${listDetails.id}/category/${section.id}`} passHref legacyBehavior>
                        <Button variant="link" className="text-primary hover:text-primary/80 px-0 text-sm sm:text-base">
                          Show All <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                    {itemsToShow.map((item) => (
                      <ContentCard 
                          key={`${item.id}-${item.media_type}-${listDetails.id}-${item.addedAt || 0}`} 
                          item={item} 
                          currentListId={listDetails.id} 
                          onItemStatusChange={handleItemUpdate} 
                      />
                    ))}
                  </div>
                </section>
              )
            )
          })}
        </div>
      ) : originalTotalItemsInList > 0 && filteredAndCategorizedItems.totalFilteredItems === 0 ? (
        <div className="text-center py-10">
          <ListX className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">No items match your current filters.</p>
          <p className="text-muted-foreground">Try adjusting your search, genre, or date range.</p>
        </div>
      ) : (
        <div className="text-center py-10">
          <ListX className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">This list is currently empty.</p>
          <p className="text-muted-foreground">Add some movies and shows to see them here!</p>
        </div>
      )}
    </main>
  );
}

