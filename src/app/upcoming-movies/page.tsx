
"use client";

import { useEffect, useState, useMemo } from 'react';
import { getUpcomingMovies, type Recommendation } from '@/services/tmdb';
import { ContentCard } from '@/components/content/content-card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CalendarDays, Filter, ArrowLeft } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns'; 
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';

interface GroupedMovies {
  [monthYearKey: string]: Recommendation[]; 
}

const ALL_YEARS_FILTER = "_all_years_";
const ALL_MONTHS_FILTER = "_all_months_";


function UpcomingMoviesPageSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Skeleton className="h-8 w-24 mb-6" /> 
      <div className="flex flex-col sm:flex-row justify-between items-start mb-6 sm:mb-8 gap-4">
        <Skeleton className="h-10 w-3/4 sm:w-1/2 md:w-1/3" /> 
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-4 sm:min-w-[300px] md:min-w-[400px]">
            <Skeleton className="h-10 w-full sm:flex-1" /> {/* Year Filter Skeleton */}
            <Skeleton className="h-10 w-full sm:flex-1" /> {/* Month Filter Skeleton */}
        </div>
      </div>
      {[...Array(2)].map((_, sectionIdx) => (
        <div key={sectionIdx} className="mb-10">
          <Skeleton className="h-8 w-40 mb-6" /> 
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


export default function UpcomingMoviesPage() {
  const [allMovies, setAllMovies] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [selectedYear, setSelectedYear] = useState<string>(ALL_YEARS_FILTER);
  const [selectedMonth, setSelectedMonth] = useState<string>(ALL_MONTHS_FILTER);


  useEffect(() => {
    async function fetchMovies() {
      setIsLoading(true);
      setError(null);
      try {
        const movies = await getUpcomingMovies({ monthsOut: 12 }); // Fetch for a wider range initially
        setAllMovies(movies);
      } catch (err: any) {
        console.error("Failed to load upcoming movies:", err);
        setError("Could not load upcoming movies. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchMovies();
  }, []);

  const moviesByMonth = useMemo(() => {
    if (allMovies.length === 0) return {};
    const grouped: GroupedMovies = {};
    allMovies.forEach(movie => {
      if (movie.release_date) { 
        try {
          const releaseDateObj = parseISO(movie.release_date);
          if (!isValid(releaseDateObj)) return; 
          const monthYearKey = format(releaseDateObj, 'yyyy-MM'); 
          if (!grouped[monthYearKey]) grouped[monthYearKey] = [];
          grouped[monthYearKey].push(movie);
        } catch (e) { /* ignore parse error */ }
      }
    });
    return grouped;
  }, [allMovies]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    allMovies.forEach(movie => {
      if (movie.release_date) {
        try {
          const year = format(parseISO(movie.release_date), 'yyyy');
          years.add(year);
        } catch {}
      }
    });
    return Array.from(years).sort((a, b) => parseInt(a) - parseInt(b));
  }, [allMovies]);

  const availableMonthsForSelectedYear = useMemo(() => {
    if (selectedYear === ALL_YEARS_FILTER || allMovies.length === 0) {
      return []; // No specific months if "All Years" is selected or no movies
    }
    const months = new Map<string, string>(); // "MM" -> "MMMM"
    allMovies.forEach(movie => {
      if (movie.release_date) {
        try {
          const releaseDateObj = parseISO(movie.release_date);
          if (isValid(releaseDateObj) && format(releaseDateObj, 'yyyy') === selectedYear) {
            const monthNum = format(releaseDateObj, 'MM');
            const monthName = format(releaseDateObj, 'MMMM');
            if (!months.has(monthNum)) {
              months.set(monthNum, monthName);
            }
          }
        } catch {}
      }
    });
    return Array.from(months.entries())
      .map(([value, display]) => ({ value, display }))
      .sort((a, b) => parseInt(a.value) - parseInt(b.value));
  }, [allMovies, selectedYear]);
  
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


  const displayedMonthKeys = useMemo(() => {
    const allSortedKeys = Object.keys(moviesByMonth).sort(); 
    
    if (selectedYear === ALL_YEARS_FILTER && selectedMonth === ALL_MONTHS_FILTER) {
      return allSortedKeys;
    }

    return allSortedKeys.filter(monthKey_yyyyMM => {
      const [yearPart, monthPart] = monthKey_yyyyMM.split('-');
      
      const yearMatches = selectedYear === ALL_YEARS_FILTER || yearPart === selectedYear;
      const monthMatches = selectedMonth === ALL_MONTHS_FILTER || monthPart === selectedMonth;
      
      return yearMatches && monthMatches;
    });
  }, [moviesByMonth, selectedYear, selectedMonth]);


  if (isLoading) {
    return <UpcomingMoviesPageSkeleton />;
  }

  if (error) {
    return (
      <main className="container mx-auto py-10 sm:py-12 px-4 text-center">
        <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl sm:text-3xl font-bold text-destructive mb-2">Error Loading Movies</h1>
        <p className="text-muted-foreground text-base sm:text-lg">{error}</p>
        <Button onClick={() => router.push('/')} className="mt-6">Back to Home</Button>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-6 sm:py-8 px-4">
      <Button variant="outline" size="sm" onClick={() => router.push('/')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Button>

      <div className="flex flex-col sm:flex-row justify-between items-start mb-6 sm:mb-8 gap-4">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-left">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
            Upcoming Movies (India)
          </span>
        </h1>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-4 sm:min-w-[300px] md:min-w-[400px]">
            {/* Year Filter */}
            <div className="flex-1">
                <Label htmlFor="year-filter-upcoming" className="text-sm font-medium">Filter by Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year-filter-upcoming" className="w-full mt-1 bg-card border-border hover:border-primary/50 focus:border-primary focus:ring-primary">
                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
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

            {/* Month Filter */}
            <div className="flex-1">
                <Label htmlFor="month-filter-upcoming" className="text-sm font-medium">Filter by Month</Label>
                <Select 
                    value={selectedMonth} 
                    onValueChange={setSelectedMonth}
                    disabled={selectedYear === ALL_YEARS_FILTER && availableMonthsForSelectedYear.length === 0}
                >
                <SelectTrigger id="month-filter-upcoming" className="w-full mt-1 bg-card border-border hover:border-primary/50 focus:border-primary focus:ring-primary">
                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
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
      </div>
      
      {displayedMonthKeys.length === 0 && !isLoading && (
        <div className="text-center py-10">
          <CalendarDays className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">
             No upcoming movies found for India matching your filter criteria.
          </p>
          <p className="text-muted-foreground text-sm">This list shows movies for the next 12 months based on the hardcoded data. Ensure your TMDB API key is valid for dynamic fetching if that's re-enabled.</p>
        </div>
      )}

      {displayedMonthKeys.map(monthKey_yyyyMM => {
        let monthNameDisplay = 'Unknown Month';
        try {
            monthNameDisplay = format(parseISO(monthKey_yyyyMM + '-01'), 'MMMM yyyy');
        } catch {}

        return (
        <section key={monthKey_yyyyMM} className="mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-primary/90 border-b pb-2">
            {monthNameDisplay} 
          </h2>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {moviesByMonth[monthKey_yyyyMM]?.map(movie => (
              <ContentCard key={movie.id} item={movie} isUpcomingSection={true} />
            ))}
          </div>
        </section>
        );
      })}
    </main>
  );
}

    