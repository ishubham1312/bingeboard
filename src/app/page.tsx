
"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Film, Tv, Brush, Wind, Video as VideoIcon, AlertTriangle as AlertTriangleIcon, Star, CalendarDays, ArrowRight, History, ListChecks } from 'lucide-react';
import { ContentCarousel } from '@/components/content/content-carousel';
import { HeroBanner, HeroBannerSkeleton } from '@/components/banner/HeroBanner';
import { UserSpecificSections } from '@/components/home/UserSpecificSections';
import {
  getHollywoodMovies,
  getBollywoodMovies,
  getAnimatedMovies,
  getAnimeSeries,
  getNowPlayingMovies,
  getTrendingTvShows, // Ensure this is imported
  type Recommendation,
  checkTmdbApiKeyStatus,
} from '@/services/tmdb';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from "@/components/ui/button";

interface CategoryData {
  id: string;
  title: string;
  icon: JSX.Element;
  items: Recommendation[];
  isLoading: boolean;
  error: string | null;
  fetcher: () => Promise<Recommendation[]>;
  mediaTypeContext?: 'movie' | 'tv';
}

const categoriesConfig: Omit<CategoryData, 'items' | 'isLoading' | 'error'>[] = [
  {
    id: 'hollywood',
    title: 'Hollywood Movies',
    icon: <Film className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary/80" />,
    fetcher: getHollywoodMovies,
    mediaTypeContext: 'movie',
  },
  {
    id: 'bollywood',
    title: 'Bollywood Movies',
    icon: <VideoIcon className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary/80" />,
    fetcher: getBollywoodMovies,
    mediaTypeContext: 'movie',
  },
  {
    id: 'webseries',
    title: 'Web Series',
    icon: <Tv className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary/80" />,
    fetcher: getTrendingTvShows, // Used for the Web Series section
    mediaTypeContext: 'tv',
  },
   {
    id: 'anime',
    title: 'Popular Anime Series',
    icon: <Wind className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary/80" />,
    fetcher: getAnimeSeries,
    mediaTypeContext: 'tv',
  },
  {
    id: 'animation',
    title: 'Animated Movies',
    icon: <Brush className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary/80" />,
    fetcher: getAnimatedMovies,
    mediaTypeContext: 'movie',
  },
];

function CarouselSectionSkeleton({ title, icon }: { title: string, icon: JSX.Element }) {
  return (
    <div className="my-6 sm:my-8">
      <div className="mb-4 sm:mb-6 px-4">
         <div className="flex items-center">
           {icon}
           <Skeleton className="h-8 w-1/2 md:w-1/3" />
         </div>
      </div>
      <div className="px-4">
        <div className="flex space-x-4 overflow-hidden pb-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-44 sm:w-52 md:w-60 flex-shrink-0">
              <Skeleton className="h-56 sm:h-64 md:h-80 w-full rounded-lg bg-muted/50" />
              <Skeleton className="h-6 w-3/4 mt-3 rounded-md bg-muted/50" />
              <Skeleton className="h-4 w-1/2 mt-2 rounded-md bg-muted/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [apiKeyStatus, setApiKeyStatus] = useState<{ isKeyMissing: boolean; isExampleKey: boolean; keyLength?: number } | null>(null);
  const [isLoadingApiKeyStatus, setIsLoadingApiKeyStatus] = useState(true);

  const [bannerMovies, setBannerMovies] = useState<Recommendation[]>([]);
  const [isLoadingBanner, setIsLoadingBanner] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryData[]>(
    categoriesConfig.map(config => ({ ...config, items: [], isLoading: true, error: null }))
  );

  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingApiKeyStatus(true);
      try {
        const status = await checkTmdbApiKeyStatus();
        setApiKeyStatus(status);
      } catch (e) {
        console.error("Failed to check API key status:", e);
        setApiKeyStatus({ isKeyMissing: true, isExampleKey: false }); // Assume problematic if check fails
      }
      setIsLoadingApiKeyStatus(false);

      setIsLoadingBanner(true);
      try {
        const movies = await getNowPlayingMovies();
        setBannerMovies(movies.slice(0, 7)); // Take top 7 for banner
        setErrorBanner(null);
      } catch (e) {
        console.error("Failed to load now playing movies for banner:", e);
        setErrorBanner("Could not load movies for banner.");
      }
      setIsLoadingBanner(false);

      // Fetch data for all general categories in parallel
      const categoryPromises = categoriesConfig.map(async (config) => {
        try {
          const items = await config.fetcher();
          const uniqueItemsMap = new Map<string, Recommendation>();
          items.forEach(item => {
            if(item && typeof item.id !== 'undefined' && item.media_type) { // Ensure id is not undefined
              const key = `${item.id}-${item.media_type}`;
              if (!uniqueItemsMap.has(key)) {
                uniqueItemsMap.set(key, item);
              }
            }
          });
          return { ...config, items: Array.from(uniqueItemsMap.values()), isLoading: false, error: null };
        } catch (e: any) {
          console.error(`Failed to load category ${config.title}:`, e);
          return { ...config, items: [], isLoading: false, error: `Could not load ${config.title}.` };
        }
      });

      Promise.all(categoryPromises).then(resolved => {
        setCategories(resolved);
      });
    }
    loadInitialData();
  }, []);


  const displayedCategories = useMemo(() => {
     return categories;
  }, [categories]);

  return (
    <main className="container mx-auto py-6 sm:py-8">
      {isLoadingApiKeyStatus ? (
        <div className="mx-4 mb-6">
          <Skeleton className="h-12 w-full" />
        </div>
      ) : apiKeyStatus?.isKeyMissing ? (
        <Alert variant="destructive" className="mb-6 mx-4">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertTitle>TMDB API Key Missing!</AlertTitle>
          <AlertDescription>
            The TMDB_API_KEY is missing in your .env file. Please add a valid API key from TheMovieDB.org to fetch content, then restart your development server.
            Without it, most content sections will remain empty or show errors.
          </AlertDescription>
        </Alert>
      ) : apiKeyStatus?.isExampleKey ? (
         <Alert variant="destructive" className="mb-6 mx-4">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertTitle>Example/Problematic TMDB API Key Detected!</AlertTitle>
          <AlertDescription>
            You might be using a known example TMDB API key or your key might be too short (Length: {apiKeyStatus.keyLength}). This key might have limitations. Please obtain a free, personal API key from TheMovieDB.org and update your .env file, then restart your development server. Check server logs if content is still missing.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="px-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 sm:mb-8 text-center tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600">
            BingeBoard
          </span>
        </h1>
      </div>

      {isLoadingBanner ? (
        <HeroBannerSkeleton />
      ) : errorBanner ? (
        <div className="mx-4 sm:mx-6 md:mx-8 mb-8">
          <div className="p-6 rounded-lg bg-card border border-destructive/50 text-center">
            <AlertTriangleIcon className="h-10 w-10 text-destructive mx-auto mb-3" />
            <p className="text-destructive-foreground font-medium">{errorBanner}</p>
            {apiKeyStatus?.isKeyMissing && <p className="text-xs text-destructive-foreground/80 mt-1">This might be due to a missing TMDB API Key.</p>}
          </div>
        </div>
      ) : (
         <HeroBanner items={bannerMovies} />
      )}
      
      {/* User-Specific Sections (Client Component) */}
      <UserSpecificSections />

      {/* General Category Carousels */}
      {displayedCategories.map(category => (
        <section key={category.id} className="my-8 sm:my-10">
          <div className="flex justify-between items-center mb-4 sm:mb-6 px-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary flex items-center">
              {category.icon}
              {category.title}
            </h2>
            {category.id === 'upcoming' && (
               <Link href="/upcoming-movies" passHref legacyBehavior>
                <Button variant="link" className="text-primary hover:text-primary/80 px-0 text-sm sm:text-base">
                  Show All <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
          {category.isLoading ? (
            <CarouselSectionSkeleton title={category.title} icon={category.icon} />
          ) : category.error ? (
            <div className="px-4">
              <Alert variant="destructive">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{category.error}</AlertDescription>
              </Alert>
            </div>
          ) : category.items.length > 0 ? (
            <ContentCarousel items={category.items} isUpcomingSection={category.id === 'upcoming'} />
          ) : (
            <div className="px-4 text-center py-6 bg-card rounded-lg shadow">
              <p className="text-muted-foreground">
                No items found for {category.title} at the moment.
                {apiKeyStatus?.isKeyMissing && (
                  <span className="block text-xs text-amber-500 mt-1">
                    This might be due to a missing TMDB API Key. Please check the alert at the top of the page.
                  </span>
                )}
              </p>
            </div>
          )}
        </section>
      ))}

      {/* Fallback for non-logged-in users to discover content if all categories are empty */}
      {(!isLoadingApiKeyStatus && !apiKeyStatus?.isKeyMissing && !apiKeyStatus?.isExampleKey && displayedCategories.every(c => c.items.length === 0 && !c.isLoading && !c.error)) && (
         <div className="my-8 sm:my-10">
            <div className="mb-4 sm:mb-6 px-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-primary flex items-center">
                <Star className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary/80" />
                Discover Popular Content
              </h2>
            </div>
            <div className="px-4 text-center py-6 bg-card rounded-lg shadow">
                <p className="text-muted-foreground">
                    It seems there's no content to display right now. This could be temporary.
                    <Link href="/login" className="text-primary hover:underline font-semibold ml-1">Log in</Link> or <Link href="/login" className="text-primary hover:underline font-semibold">sign up</Link> to create personal lists and track your watched content!
                </p>
            </div>
        </div>
      )}
    </main>
  );
}
