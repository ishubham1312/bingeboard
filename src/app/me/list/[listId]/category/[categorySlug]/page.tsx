
"use client";

import { useEffect, useState, useMemo, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getListById, type UserList, type ListItem } from '@/services/watchedItemsService';
import { ContentCard } from '@/components/content/content-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowLeft, ListX, Film, Tv, Brush, Clapperboard, CalendarDays, Filter as FilterIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { format, parseISO, isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';

const ITEMS_PER_PAGE_CATEGORY_DETAIL = 20; // Or adjust as needed
const ALL_YEARS_FILTER = "_all_years_cat_detail_";
const ALL_MONTHS_FILTER = "_all_months_cat_detail_";


interface CategoryPageParamsFromHook { // Renamed to avoid conflict if params prop is also used
  listId: string;
  categorySlug: string;
}

interface CategoryDetailPageProps {
  params?: any; // To accept params prop from Next.js router
}

const categoryConfig: Record<string, { title: string; icon: JSX.Element; filter: (item: ListItem) => boolean }> = {
  'series': {
    title: "Series",
    icon: <Tv className="mr-2 h-6 w-6 text-primary/90" />,
    filter: (item) => item.media_type === 'tv'
  },
  'animation-movies': {
    title: "Animation Movies",
    icon: <Brush className="mr-2 h-6 w-6 text-primary/90" />,
    filter: (item) => item.media_type === 'movie' && (item.genre_ids?.includes(16) ?? false)
  },
  'hollywood-movies': {
    title: "Hollywood Movies",
    icon: <Film className="mr-2 h-6 w-6 text-primary/90" />,
    filter: (item) => item.media_type === 'movie' && item.original_language === 'en' && !(item.genre_ids?.includes(16) ?? false)
  },
  'bollywood-movies': {
    title: "Bollywood Movies",
    icon: <Clapperboard className="mr-2 h-6 w-6 text-primary/90" />,
    filter: (item) => item.media_type === 'movie' && item.original_language === 'hi' && !(item.genre_ids?.includes(16) ?? false)
  },
  'other-movies': {
    title: "Other Movies",
    icon: <Film className="mr-2 h-6 w-6 text-primary/90" />,
    filter: (item) => item.media_type === 'movie' && !(item.genre_ids?.includes(16) ?? false) && item.original_language !== 'en' && item.original_language !== 'hi'
  },
};


function CategoryDetailPageSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Skeleton className="h-8 w-32 mb-6" /> {/* Back button */}
      <Skeleton className="h-10 w-1/2 md:w-1/3 mb-2" /> {/* Title */}
      <Skeleton className="h-6 w-1/4 md:w-1/6 mb-8" /> {/* Item count */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Skeleton className="h-10 w-full" /> {/* Year Filter Skeleton */}
        <Skeleton className="h-10 w-full" /> {/* Month Filter Skeleton */}
      </div>

      {[...Array(2)].map((_, sectionIdx) => ( // Simulate two month sections
        <div key={sectionIdx} className="mb-10">
          <Skeleton className="h-8 w-48 mb-6" /> {/* Month heading */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {[...Array(5)].map((_, i) => (
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

export default function CategoryDetailPage({ params: paramsFromProp }: CategoryDetailPageProps) {
  // The paramsFromProp is available if needed, but paramsFromHook is typically used in client components.
  
  const paramsFromHook = useParams() as CategoryPageParamsFromHook;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [listDetails, setListDetails] = useState<UserList | null>(null);
  const [allCategoryItems, setAllCategoryItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [selectedYear, setSelectedYear] = useState<string>(ALL_YEARS_FILTER);
  const [selectedMonth, setSelectedMonth] = useState<string>(ALL_MONTHS_FILTER);

  const { listId, categorySlug } = paramsFromHook;
  const currentCategoryInfo = categoryConfig[categorySlug];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || authLoading) {
      if (isMounted && !authLoading && !user) {
        router.push(`/login?redirect=/me/list/${listId}/category/${categorySlug}`);
      }
      return;
    }

    if (!user) {
      router.push(`/login?redirect=/me/list/${listId}/category/${categorySlug}`);
      return;
    }

    if (!listId || !categorySlug || !currentCategoryInfo) {
      setError("Invalid list or category specified.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const list = getListById(listId);

    if (!list) {
      setError("List not found.");
      setListDetails(null);
      setAllCategoryItems([]);
    } else {
      setListDetails(list);
      const itemsForCategory = list.items.filter(currentCategoryInfo.filter).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
      setAllCategoryItems(itemsForCategory);
    }
    setIsLoading(false);
  }, [isMounted, listId, categorySlug, user, authLoading, router, currentCategoryInfo]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    allCategoryItems.forEach(item => {
      if (item.addedAt && isValid(new Date(item.addedAt))) {
        try {
          const year = format(new Date(item.addedAt), 'yyyy');
          years.add(year);
        } catch { /* ignore date parsing errors */ }
      }
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a)); // Newest years first
  }, [allCategoryItems]);

  const availableMonthsForSelectedYear = useMemo(() => {
    if (selectedYear === ALL_YEARS_FILTER || allCategoryItems.length === 0) {
      return [];
    }
    const months = new Map<string, string>(); // "MM" -> "MMMM"
    allCategoryItems.forEach(item => {
      if (item.addedAt && isValid(new Date(item.addedAt))) {
        try {
          const addedDateObj = new Date(item.addedAt);
          if (format(addedDateObj, 'yyyy') === selectedYear) {
            const monthNum = format(addedDateObj, 'MM');
            const monthName = format(addedDateObj, 'MMMM');
            if (!months.has(monthNum)) {
              months.set(monthNum, monthName);
            }
          }
        } catch { /* ignore date parsing errors */ }
      }
    });
    return Array.from(months.entries())
      .map(([value, display]) => ({ value, display }))
      .sort((a, b) => parseInt(a.value) - parseInt(b.value)); // Chronological
  }, [allCategoryItems, selectedYear]);

  useEffect(() => {
    if (selectedYear === ALL_YEARS_FILTER) {
      setSelectedMonth(ALL_MONTHS_FILTER);
    } else {
      const monthStillValid = availableMonthsForSelectedYear.some(m => m.value === selectedMonth);
      if (selectedMonth !== ALL_MONTHS_FILTER && !monthStillValid) {
        setSelectedMonth(ALL_MONTHS_FILTER);
      }
    }
  }, [selectedYear, availableMonthsForSelectedYear, selectedMonth]);


  const filteredCategoryItems = useMemo(() => {
    if (selectedYear === ALL_YEARS_FILTER && selectedMonth === ALL_MONTHS_FILTER) {
      return allCategoryItems;
    }
    return allCategoryItems.filter(item => {
      if (!item.addedAt || !isValid(new Date(item.addedAt))) return false;
      const addedDate = new Date(item.addedAt);
      const yearMatches = selectedYear === ALL_YEARS_FILTER || format(addedDate, 'yyyy') === selectedYear;
      const monthMatches = selectedMonth === ALL_MONTHS_FILTER || format(addedDate, 'MM') === selectedMonth;
      return yearMatches && monthMatches;
    });
  }, [allCategoryItems, selectedYear, selectedMonth]);

  const itemsGroupedByMonth = useMemo(() => {
    if (filteredCategoryItems.length === 0) return {};

    const grouped: Record<string, ListItem[]> = {};
    filteredCategoryItems.forEach(item => {
      if (item.addedAt && isValid(new Date(item.addedAt))) {
        const monthYearKey = format(new Date(item.addedAt), 'yyyy-MM'); // Key for sorting
        if (!grouped[monthYearKey]) {
          grouped[monthYearKey] = [];
        }
        grouped[monthYearKey].push(item);
      } else {
        const unknownKey = 'unknown-date';
        if (!grouped[unknownKey]) {
          grouped[unknownKey] = [];
        }
        grouped[unknownKey].push(item);
      }
    });
    return grouped;
  }, [filteredCategoryItems]);

  const sortedMonthKeys = useMemo(() => {
    return Object.keys(itemsGroupedByMonth).sort((a, b) => {
      if (a === 'unknown-date') return 1;
      if (b === 'unknown-date') return -1;
      return b.localeCompare(a);
    });
  }, [itemsGroupedByMonth]);


  if (!isMounted || authLoading || isLoading) {
    return <CategoryDetailPageSkeleton />;
  }

  if (!user && !authLoading) {
    return (
      <main className="container mx-auto py-10 sm:py-12 px-4 text-center">
        <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl sm:text-3xl font-bold text-destructive mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-base sm:text-lg mb-6">Please log in to view this page.</p>
        <Button onClick={() => router.push(`/login?redirect=/me/list/${listId}/category/${categorySlug}`)}>Go to Login</Button>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto py-8 px-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-destructive mb-2">Error</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => router.push(listId ? `/me/list/${listId}` : '/me')} className="mt-6">
          Back to {listDetails ? listDetails.name : "List"}
        </Button>
      </main>
    );
  }

  if (!listDetails || !currentCategoryInfo) {
    return (
      <main className="container mx-auto py-8 px-4 text-center">
        <ListX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-muted-foreground mb-2">Information Unavailable</h1>
        <p className="text-muted-foreground">Could not load details for this category or list.</p>
        <Button onClick={() => router.push('/me')} className="mt-6">Back to My Lists</Button>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-6 sm:py-8 px-4">
      <Button variant="outline" size="sm" onClick={() => router.push(`/me/list/${listId}`)} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to {listDetails.name}
      </Button>

      <div className="mb-4">
        <h1 className="flex items-center text-3xl sm:text-4xl font-bold mb-1 text-primary">
          {currentCategoryInfo.icon}
          {currentCategoryInfo.title}
        </h1>
        <p className="text-muted-foreground">
          Showing {filteredCategoryItems.length} of {allCategoryItems.length} total {allCategoryItems.length === 1 ? 'item' : 'items'} from "{listDetails.name}"
        </p>
      </div>

      {/* Filter Controls */}
      {allCategoryItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 p-4 border rounded-lg bg-card shadow">
            <div>
                <Label htmlFor="year-filter-cat-detail" className="text-sm font-medium">Filter by Year Added</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year-filter-cat-detail" className="w-full mt-1 bg-card border-border hover:border-primary/50 focus:border-primary focus:ring-primary">
                    <FilterIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                    <SelectItem value={ALL_YEARS_FILTER}>All Years</SelectItem>
                    {availableYears.map((year) => (
                    <SelectItem key={year} value={year}>
                        {year}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="month-filter-cat-detail" className="text-sm font-medium">Filter by Month Added</Label>
                <Select
                    value={selectedMonth}
                    onValueChange={setSelectedMonth}
                    disabled={selectedYear === ALL_YEARS_FILTER && availableMonthsForSelectedYear.length === 0}
                >
                <SelectTrigger id="month-filter-cat-detail" className="w-full mt-1 bg-card border-border hover:border-primary/50 focus:border-primary focus:ring-primary">
                    <FilterIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                    <SelectItem value={ALL_MONTHS_FILTER}>All Months</SelectItem>
                    {availableMonthsForSelectedYear.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                        {month.display}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
        </div>
      )}


      {allCategoryItems.length === 0 ? (
        <div className="text-center py-10">
          <ListX className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">No items in this category for this list.</p>
        </div>
      ) : filteredCategoryItems.length === 0 && allCategoryItems.length > 0 ? (
        <div className="text-center py-10">
          <ListX className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">No items match your current year/month filters.</p>
          <p className="text-muted-foreground">Try adjusting your filter selection.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedMonthKeys.map(monthKey => {
            const itemsInMonth = itemsGroupedByMonth[monthKey];
            let monthDisplay = "Added at an Unknown Date";
            if (monthKey !== 'unknown-date' && isValid(parseISO(monthKey + "-01"))) {
              monthDisplay = `Added in ${format(parseISO(monthKey + "-01"), 'MMMM yyyy')}`;
            }

            return (
              <section key={monthKey}>
                <h2 className="flex items-center text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6 pb-2 border-b border-border/70 text-primary/80">
                  <CalendarDays className="mr-3 h-5 w-5 text-primary/80" />
                  {monthDisplay}
                  <span className="text-lg text-muted-foreground ml-2">({itemsInMonth.length})</span>
                </h2>
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                  {itemsInMonth.map(item => (
                    <ContentCard
                      key={`${item.id}-${item.media_type}-${listId}-${item.addedAt || 0}`}
                      item={item}
                      currentListId={listId}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

