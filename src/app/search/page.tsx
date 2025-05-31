"use client"; // Make this a client component to handle potential client-side interactions or hooks if needed later

import { Suspense, useEffect, useState } from 'react'; // Added useEffect, useState for Suspense
import { useSearchParams } from 'next/navigation'; // Use hook for searchParams in Client Component
import { searchContent, type Recommendation } from '@/services/tmdb';
import { ContentCard } from '@/components/content/content-card'; // Assuming ContentCard is in components
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Search as SearchIconLucide } from 'lucide-react'; // Renamed Search to avoid conflict

interface SearchPageProps {
  // Props are no longer directly passed by Next.js for pages using hooks like useSearchParams
}

function SearchResultsSkeleton({ query }: { query: string }) {
  return (
    <div className="my-6 sm:my-8 px-4">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-primary">Searching for: "{query}"</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
        {[...Array(12)].map((_, i) => ( // Show more skeletons for a grid
          <div key={i} className="w-full"> {/* Card takes full width of cell */}
            <Skeleton className="h-48 sm:h-56 w-full rounded-lg bg-muted/50" />
            <Skeleton className="h-4 w-3/4 mt-2 rounded-md bg-muted/50" />
            <Skeleton className="h-3 w-1/2 mt-1 rounded-md bg-muted/50" />
             <Skeleton className="h-3 w-2/3 mt-1 rounded-md bg-muted/50" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface SearchResultsComponentProps {
  query: string;
}

function SearchResultsComponent({ query }: SearchResultsComponentProps) {
  const [results, setResults] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    searchContent(query)
      .then(data => {
        setResults(data);
        setError(null);
      })
      .catch(e => {
        console.error(`Failed to search for "${query}":`, e);
        setError(`Could not perform search for "${query}". Please try again later.`);
        setResults([]);
      })
      .finally(() => setIsLoading(false));
  }, [query]);

  if (isLoading) {
    return <SearchResultsSkeleton query={query} />;
  }

  if (!query && !isLoading) { // Check added for initial state or cleared search
    return (
      <div className="my-6 sm:my-8 px-4 text-center">
        <SearchIconLucide className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-base sm:text-lg">Please enter a search term to find content.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-6 sm:my-8 px-4">
        <h1 className="text-xl sm:text-2xl font-semibold mb-4 text-center">Search Results for "{query}"</h1>
        <div className="p-4 sm:p-6 rounded-lg bg-destructive/10 border border-destructive/50 max-w-md mx-auto text-center">
          <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-destructive mx-auto mb-3 sm:mb-4" />
          <p className="text-destructive-foreground font-medium text-sm sm:text-base">{error}</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="my-6 sm:my-8 px-4 text-center">
        <h1 className="text-xl sm:text-2xl font-semibold mb-4">Search Results for "{query}"</h1>
        <SearchIconLucide className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-base sm:text-lg">No results found for "{query}". Try a different search term.</p>
      </div>
    );
  }

  return (
    <div className="my-6 sm:my-8 px-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-primary">
            Search Results for "{query}" ({results.length})
        </h1>
        <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
        {results.map((item) => (
            <ContentCard key={`${item.id}-${item.media_type}`} item={item} variant="searchResult" />
        ))}
        </div>
    </div>
  );
}

// Main SearchPage component that will wrap the search functionality in Suspense
export default function SearchPage() {
  return (
    <Suspense fallback={<SearchResultsSkeleton query="" />}>
      <SearchContent />
    </Suspense>
  );
}

// Component that uses searchParams
function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
        <SearchIconLucide className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold text-center mb-2">Search for Movies, TV Shows, or People</h2>
        <p className="text-muted-foreground text-center">Enter a search term to find content</p>
      </div>
    );
  }

  return <SearchResultsComponent query={query} />;
}
