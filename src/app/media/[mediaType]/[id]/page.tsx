
"use client";

import React, { useState, useEffect, useMemo, use } from 'react';
import { useParams, notFound } from 'next/navigation';
import { 
  getMediaDetails, 
  getMediaCredits, 
  getTvShowSeasons, 
  getTvSeasonEpisodes, 
  getWatchProviders,
  getMediaImages,
  type MediaDetails, 
  type CastMember, 
  type SeasonSummary, 
  type EpisodeDetail,
  type RegionWatchProviders,
  type WatchProviderDetail,
  type MediaImage
} from '@/services/tmdb';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Star, CalendarDays, Clock, Users, Tv, Clapperboard, AlertTriangle, Film, Hash, Loader2, PlayCircle } from 'lucide-react'; 
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { format, parseISO, isValid } from 'date-fns';
import { MediaDetailInteraction } from '@/components/media/MediaDetailInteraction';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; 

import { getLists, isItemInAnyList, type ListItem } from '@/services/watchedItemsService';
import { useListManagement } from '@/hooks/useListManagement'; // Import useListManagement
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; 

interface MediaDetailPageProps {
  params?: any; 
}

const getInitials = (name: string = "") => {
  const names = name.split(' ').filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0][0]?.toUpperCase() || '';
  return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
};

function formatRuntime(runtimeMinutes: number | undefined): string {
  if (runtimeMinutes === undefined || runtimeMinutes === 0) return 'N/A';
  const hours = Math.floor(runtimeMinutes / 60);
  const minutes = runtimeMinutes % 60;
  let formatted = '';
  if (hours > 0) formatted += `${hours}h `;
  if (minutes > 0) formatted += `${minutes}m`;
  return formatted.trim() || 'N/A';
}

export default function MediaDetailPage({ params: paramsFromProp }: MediaDetailPageProps) {
  // The paramsFromProp is available if needed, but paramsFromHook is typically used in client components.
  // No need for the previous use(Promise.resolve(paramsFromProp)) here.

  const paramsFromHook = useParams<{ mediaType: 'movie' | 'tv'; id: string }>();
  const { user } = useAuth(); 
  const { lists } = useListManagement(); // Use the hook to get lists for rating display
  
  const mediaType = paramsFromHook?.mediaType;
  const id = paramsFromHook?.id;

  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [creditsData, setCreditsData] = useState<CreditsResponse | null>(null);
  const [watchProviders, setWatchProviders] = useState<RegionWatchProviders | null>(null);
  const [mediaImages, setMediaImages] = useState<{ backdrops: MediaImage[]; posters: MediaImage[] } | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null); 

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [tvSeasons, setTvSeasons] = useState<SeasonSummary[]>([]);
  const [selectedSeasonData, setSelectedSeasonData] = useState<{ season_number: string; name: string } | null>(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState<EpisodeDetail[]>([]);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [episodesError, setEpisodesError] = useState<string | null>(null);
  
  const [isLoadingWatchProviders, setIsLoadingWatchProviders] = useState(false); 
  const [watchProvidersError, setWatchProvidersError] = useState<string | null>(null);
  const [isLoadingMediaImages, setIsLoadingMediaImages] = useState(false);
  const [mediaImagesError, setMediaImagesError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Effect for fetching main media data
  useEffect(() => {
    if (!isMounted || !id || !mediaType) {
        if (isMounted && (!id || !mediaType)) {
            setError("Invalid media type or ID provided in URL.");
            setIsLoading(false);
        }
        return;
    }
    
    async function fetchData() { 
      setIsLoading(true);
      setError(null);
      setDetails(null);
      setCreditsData(null);
      setTvSeasons([]);
      setSelectedSeasonData(null);
      setSeasonEpisodes([]);
      
      setWatchProviders(null);
      setWatchProvidersError(null);
      setIsLoadingWatchProviders(true);

      setMediaImages(null);
      setMediaImagesError(null);
      setIsLoadingMediaImages(true);

      try {
        if (mediaType !== 'movie' && mediaType !== 'tv') {
          notFound();
          return;
        }

        const [fetchedDetails, fetchedCredits, fetchedProviders, fetchedImages] = await Promise.all([
          getMediaDetails(id, mediaType),
          getMediaCredits(id, mediaType),
          getWatchProviders(id, mediaType),
          getMediaImages(id, mediaType),
        ]);
        
        if (!fetchedDetails) {
          notFound();
          return;
        }
        setDetails(fetchedDetails);
        setCreditsData(fetchedCredits);
        setWatchProviders(fetchedProviders);
        setIsLoadingWatchProviders(false);

        if (fetchedImages) {
            setMediaImages(fetchedImages);
        } else {
            setMediaImages({ backdrops: [], posters: [] }); 
        }
        setIsLoadingMediaImages(false);

        if (mediaType === 'tv' && fetchedDetails) {
          setIsLoadingSeasons(true);
          setEpisodesError(null);
          try {
            const seasons = await getTvShowSeasons(id);
            setTvSeasons(seasons);
          } catch (seasonErr) {
            console.error(`Error fetching TV seasons for ${id}:`, seasonErr);
            setEpisodesError("Could not load season information.");
          } finally {
            setIsLoadingSeasons(false);
          }
        }
      } catch (err: any) {
        console.error(`Critical error fetching or processing media details for ${mediaType}/${id}:`, err);
        setError("Could not load media details. Please try again later.");
        setIsLoadingWatchProviders(false);
        setIsLoadingMediaImages(false);
      } finally {
        setIsLoading(false); 
      }
    }
    fetchData();
  }, [id, mediaType, isMounted]); 

  // Effect for fetching user-specific rating, depends on user and lists from context
  useEffect(() => {
    if (isMounted && id && mediaType && user) {
      try {
        // isItemInAnyList is synchronous and uses the lists from localStorage
        const presenceInfo = isItemInAnyList(id, mediaType); 
        if (presenceInfo.inList && presenceInfo.userRating !== undefined) {
          setUserRating(presenceInfo.userRating);
        } else {
          setUserRating(null); 
        }
      } catch (listError) {
        console.error("Error fetching user rating:", listError);
        setUserRating(null);
      }
    } else if (!user) {
      setUserRating(null); // Clear rating if user logs out or is not present
    }
  }, [id, mediaType, isMounted, user, lists]); // Add `lists` as a dependency


  useEffect(() => {
    if (selectedSeasonData?.season_number && mediaType === 'tv' && id) {
      setIsLoadingEpisodes(true);
      setEpisodesError(null);
      setSeasonEpisodes([]); 
      getTvSeasonEpisodes(id, parseInt(selectedSeasonData.season_number, 10))
        .then(episodes => {
          setSeasonEpisodes(episodes);
        })
        .catch(err => {
          console.error(`Error fetching episodes for season ${selectedSeasonData.season_number}:`, err);
          setEpisodesError("Could not load episodes for this season.");
        })
        .finally(() => setIsLoadingEpisodes(false));
    } else {
      setSeasonEpisodes([]);
    }
  }, [selectedSeasonData, id, mediaType]);

  const combinedWatchProviders = useMemo(() => {
    if (!watchProviders) return [];
    const combined = [
      ...(watchProviders.flatrate || []),
      ...(watchProviders.ads || [])
    ];
    return Array.from(new Map(combined.map(p => [p.provider_id, p])).values())
      .sort((a, b) => a.display_priority - b.display_priority);
  }, [watchProviders]);

  const renderStarRating = (rating: number | null) => {
    if (rating === null || rating === undefined) return null;
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0; // Check if there's a .5
    const emptyStars = Math.max(0, 5 - fullStars - (hasHalfStar ? 1 : 0));

    const stars = [];
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`star-full-${i}`} className="h-4 w-4 sm:h-5 sm:w-5 fill-yellow-400 stroke-yellow-500" />);
    }
    if (hasHalfStar) {
      stars.push(
        <div key="star-half-container" className="relative h-4 w-4 sm:h-5 sm:w-5">
          <Star key="star-half-empty-bg" className="absolute h-4 w-4 sm:h-5 sm:w-5 stroke-yellow-500 text-muted" />
          <Star key="star-half-filled" className="absolute h-4 w-4 sm:h-5 sm:w-5 fill-yellow-400 stroke-yellow-500" style={{ clipPath: 'inset(0 50% 0 0)' }} />
        </div>
      );
    }
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`star-empty-${i}`} className="h-4 w-4 sm:h-5 sm:w-5 stroke-yellow-500 text-muted" />);
    }
    return stars;
  };


  if (!isMounted || !mediaType || !id) {
    return (
      <main className="container mx-auto py-6 sm:py-8 px-4">
        <Skeleton className="relative h-56 sm:h-64 md:h-96 rounded-lg mb-6 sm:mb-8" />
        <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
          <div className="w-full md:w-1/3">
            <Skeleton className="rounded-lg shadow-2xl mx-auto md:mx-0 w-full max-w-xs sm:max-w-sm md:max-w-full h-[450px] sm:h-[525px] md:h-[600px]" />
          </div>
          <div className="w-full md:w-2/3">
            <Skeleton className="h-10 w-3/4 mb-2 sm:mb-3" />
            <Skeleton className="h-6 w-1/2 mb-4 sm:mb-6" />
            <Skeleton className="h-8 w-full mb-3 sm:mb-4" /> 
            <Skeleton className="h-9 w-40 mt-4 mb-4" /> 
            <Skeleton className="h-8 w-32 mb-2 mt-4" /> 
            <Skeleton className="h-5 w-1/2 mb-1" /> 
            <Skeleton className="h-5 w-1/2 mb-1" /> 
            <Skeleton className="h-8 w-40 mb-3 mt-6" /> 
            <div className="flex gap-3 mb-3 mt-2">
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-10 w-10 rounded-md" />
            </div>
            <Skeleton className="h-8 w-32 mb-2 mt-4" /> 
            <Skeleton className="h-20 w-full" /> 
          </div>
        </div>
      </main>
    );
  }
  
  if (isLoading) {
     return ( 
      <main className="container mx-auto py-6 sm:py-8 px-4">
        <Skeleton className="relative h-56 sm:h-64 md:h-96 rounded-lg mb-6 sm:mb-8" />
        <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
          <div className="w-full md:w-1/3">
            <Skeleton className="rounded-lg shadow-2xl mx-auto md:mx-0 w-full max-w-xs sm:max-w-sm md:max-w-full h-[450px] sm:h-[525px] md:h-[600px]" />
          </div>
          <div className="w-full md:w-2/3">
            <Skeleton className="h-10 w-3/4 mb-2 sm:mb-3" />
            <Skeleton className="h-6 w-1/2 mb-4 sm:mb-6" />
            <Skeleton className="h-8 w-full mb-3 sm:mb-4" /> 
            <Skeleton className="h-9 w-40 mt-4 mb-4" /> 
            <Skeleton className="h-8 w-32 mb-2 mt-4" /> 
            <Skeleton className="h-5 w-1/2 mb-1" /> 
            <Skeleton className="h-5 w-1/2 mb-1" /> 
            <Skeleton className="h-8 w-40 mb-3 mt-6" /> 
            <div className="flex gap-3 mb-3 mt-2">
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-10 w-10 rounded-md" />
            </div>
            <Skeleton className="h-8 w-32 mb-2 mt-4" /> 
            <Skeleton className="h-20 w-full" /> 
          </div>
        </div>
      </main>
    );
  }

  if (error) {
      return (
      <div className="container mx-auto py-10 sm:py-12 px-4 text-center">
        <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl sm:text-3xl font-bold text-destructive mb-2">Error Loading Details</h1>
        <p className="text-muted-foreground text-base sm:text-lg">{error}</p>
        {process.env.TMDB_API_KEY === 'eae7b604e25cc93b51025d8a7379a202' && (
          <p className="text-sm text-amber-500 mt-4">
            Note: You are using a TMDB API key that might have limitations. Please ensure it is valid and has permissions for all required TMDB endpoints.
          </p>
        )}
      </div>
    );
  }

  if (!details) {
     return (
      <div className="container mx-auto py-10 px-4 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-destructive mb-2">Content Not Found</h1>
        <p className="text-muted-foreground text-lg">The requested movie or TV show could not be found for ID: {id} and Type: {mediaType}.</p>
      </div>
    );
  }

  const cast = creditsData?.cast?.slice(0, 15) || [];
  const titleToDisplay = mediaType === 'movie' ? details.title : details.name;
  const releaseDate = mediaType === 'movie' ? details.release_date : details.first_air_date;

  let formattedReleaseDate = 'N/A';
  if (releaseDate) {
    try {
      const parsedDate = parseISO(releaseDate);
      if (isValid(parsedDate)) {
        formattedReleaseDate = format(parsedDate, 'MMMM d, yyyy');
      } else {
        const yearMatch = releaseDate.match(/^(\d{4})/);
        if (yearMatch) {
          formattedReleaseDate = yearMatch[1];
          const monthMatch = releaseDate.match(/^\d{4}-(\d{2})/);
          if (monthMatch) {
            try {
               const monthDate = parseISO(`${releaseDate}-01`); 
               if(isValid(monthDate)){
                  formattedReleaseDate = format(monthDate, 'MMMM yyyy');
               }
            } catch {}
          }
        } else {
          formattedReleaseDate = releaseDate; 
        }
      }
    } catch (e) {
      formattedReleaseDate = releaseDate; 
    }
  }

  const posterUrl = details.posterUrl;
  const backdropUrl = details.backdropUrl;

  const runtime = mediaType === 'movie'
    ? details.runtime
    : (details.episode_run_time && details.episode_run_time.length > 0 ? details.episode_run_time[0] : undefined);


  return (
    <main className="container mx-auto py-6 sm:py-8 px-4">
      {backdropUrl && (
        <div className="relative h-56 sm:h-64 md:h-96 rounded-lg overflow-hidden mb-6 sm:mb-8 shadow-lg">
          <Image
            src={backdropUrl}
            alt={`Backdrop for ${titleToDisplay}`}
            fill
            style={{objectFit: "cover"}}
            className="opacity-50"
            data-ai-hint="movie scene"
            priority
            onError={(e) => { e.currentTarget.src = `https://placehold.co/1280x720.png?text=${encodeURIComponent(titleToDisplay || 'Error Loading Image')}`; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
        </div>
      )}

      <div className={`flex flex-col md:flex-row gap-6 sm:gap-8 ${backdropUrl ? 'relative -mt-24 sm:-mt-32 md:-mt-48 z-10' : ''}`}>
        <div className="w-full md:w-1/3 flex-shrink-0">
          <Image
            src={posterUrl}
            alt={`Poster for ${titleToDisplay}`}
            width={400}
            height={600}
            className="rounded-lg shadow-2xl mx-auto md:mx-0 w-full max-w-xs sm:max-w-sm md:max-w-full"
            data-ai-hint={mediaType === 'movie' ? "movie poster" : "tv series poster"}
            onError={(e) => { e.currentTarget.src = `https://placehold.co/400x600.png?text=${encodeURIComponent(titleToDisplay || 'Error Loading Image')}`; }}
          />
        </div>

        <div className="w-full md:w-2/3 text-foreground">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-2 sm:mb-3 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
              {titleToDisplay}
            </span>
          </h1>
          {details.tagline && <p className="text-lg sm:text-xl text-muted-foreground italic mb-4 sm:mb-6">&quot;{details.tagline}&quot;</p>}

          <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-2 mb-3 sm:mb-4 text-sm sm:text-base">
            <div className="flex items-center">
              <Star className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-yellow-400" />
              <span>{details.vote_average ? details.vote_average.toFixed(1) : 'N/A'} ({details.vote_count} votes)</span>
            </div>
            {user && userRating !== null && userRating !== undefined && (
              <div className="flex items-center">
                 <TooltipProvider>
                  <Tooltip>
                     <TooltipTrigger asChild>
                       <span className="flex items-center cursor-help">
                        <span className="font-semibold mr-2 whitespace-nowrap">My Rating:</span>
                        <span className="flex items-center gap-0.5">{renderStarRating(userRating)}</span>
                       </span>
                     </TooltipTrigger>
                     <TooltipContent>
                         <p>{userRating.toFixed(1)} / 5.0 Stars</p>
                     </TooltipContent>
                   </Tooltip>
                 </TooltipProvider>
              </div>
            )}
            <div className="flex items-center">
              <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-blue-400" />
              <span>{formattedReleaseDate}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-green-400" />
              <span>{formatRuntime(runtime)}</span>
            </div>
             <div className="flex items-center">
              {mediaType === 'movie' ? <Clapperboard className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-purple-400" /> : <Tv className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-purple-400" />}
              <span className="capitalize">{mediaType}</span>
            </div>
          </div>

          {mediaType === 'tv' && (details.number_of_seasons != null || details.number_of_episodes != null) && (
            <div className="flex flex-col sm:flex-row sm:gap-6 gap-2 text-base md:text-lg text-muted-foreground mb-3 sm:mb-4">
              {details.number_of_seasons != null && ( 
                <div className="flex items-center">
                  <Film className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-indigo-400" />
                  <span>Seasons: {details.number_of_seasons}</span>
                </div>
              )}
              {details.number_of_episodes != null && ( 
                <div className="flex items-center">
                  <Hash className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-teal-400" />
                  <span>Episodes: {details.number_of_episodes}</span>
                </div>
              )}
            </div>
          )}

          {user && id && mediaType && details && <MediaDetailInteraction details={details} mediaType={mediaType} id={id} />}

          <div className="my-4 sm:my-6">
            <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-primary">Genres</h2>
            <div className="flex flex-wrap gap-2">
              {details.genres?.map(genre => (
                <Badge key={genre.id} variant="secondary" className="text-xs sm:text-sm">{genre.name}</Badge>
              ))}
            </div>
          </div>

          {details.overview && (
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-primary">Overview</h2>
              <p className="text-base md:text-lg leading-relaxed text-muted-foreground">{details.overview}</p>
            </div>
          )}
          
          {isMounted && (
            <>
              <div className="my-6 sm:my-8">
                 <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-primary">Where to Watch</h2>
                 <Separator className="mb-4"/>
                {isLoadingWatchProviders ? (
                  <div className="flex items-center text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading watch information...
                  </div>
                ) : watchProvidersError ? (
                  <p className="text-destructive">{watchProvidersError}</p>
                ) : combinedWatchProviders.length > 0 ? (
                  <div className="flex flex-wrap gap-3 items-center mt-2">
                    {combinedWatchProviders.map(provider => (
                      <a
                        key={provider.provider_id}
                        href={watchProviders?.link || `https://www.themoviedb.org/${mediaType}/${id}/watch?locale=IN`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col items-center w-16"
                        title={provider.provider_name}
                      >
                        {provider.logo_path ? (
                          <Image
                            src={provider.logo_path}
                            alt={provider.provider_name}
                            width={40}
                            height={40}
                            className="rounded-md object-contain h-10 w-10 transition-transform group-hover:scale-105"
                            data-ai-hint="streaming service logo"
                            onError={(e) => { e.currentTarget.src = `https://placehold.co/40x40.png?text=Logo`; }}
                          />
                        ) : (
                          <div className="h-10 w-10 flex items-center justify-center text-muted-foreground" title={provider.provider_name}>
                            <PlayCircle className="h-8 w-8" />
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                ) : (
                   <p className="text-muted-foreground">Watch information not available for India.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {mediaType === 'tv' && isMounted && (
        <div className="mt-8 sm:mt-12">
          <Separator className="my-6 sm:my-8" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-primary">Seasons &amp; Episodes</h2>
          {isLoadingSeasons ? (
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading seasons...
            </div>
          ) : tvSeasons.length > 0 ? (
            <div className="space-y-6">
              <div>
                <Label htmlFor="season-select-detail" className="text-base font-medium mb-2 block">Select a Season</Label>
                <Select
                  value={selectedSeasonData?.season_number || ""}
                  onValueChange={(value) => {
                    const season = tvSeasons.find(s => s.season_number.toString() === value);
                    setSelectedSeasonData(season ? { season_number: season.season_number.toString(), name: season.name } : null);
                  }}
                >
                  <SelectTrigger id="season-select-detail" className="w-full md:w-1/2 lg:w-1/3 bg-card border-border hover:border-primary/50 focus:border-primary focus:ring-primary">
                    <SelectValue placeholder="Choose a season" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {tvSeasons.map(season => (
                      <SelectItem
                        key={season.id}
                        value={season.season_number.toString()}
                        className="hover:bg-accent/50 focus:bg-accent"
                      >
                        {season.name} (Season {season.season_number}) - {season.episode_count} episodes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSeasonData && (
                <div className="mt-4">
                  <h3 className="text-xl sm:text-2xl font-semibold mb-3 text-primary/90">
                    Episodes for {selectedSeasonData.name || `Season ${selectedSeasonData.season_number}`}
                  </h3>
                  {isLoadingEpisodes ? (
                    <div className="flex items-center text-muted-foreground">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading episodes...
                    </div>
                  ) : episodesError ? (
                    <p className="text-destructive">{episodesError}</p>
                  ) : seasonEpisodes.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                      {seasonEpisodes.map(episode => (
                        <AccordionItem value={`episode-${episode.id}`} key={episode.id}>
                          <AccordionTrigger className="text-left hover:bg-muted/50 px-3 py-3 rounded-md">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
                                <span className="font-medium text-foreground">Ep {episode.episode_number}: {episode.name}</span>
                                {episode.air_date && isValid(parseISO(episode.air_date)) && (
                                  <span className="text-xs text-muted-foreground mt-1 sm:mt-0 sm:ml-4">
                                    Aired: {format(parseISO(episode.air_date), 'MMM d, yyyy')}
                                  </span>
                                )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 py-3 bg-muted/30 rounded-b-md">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {episode.overview || "No overview available for this episode."}
                            </p>
                            {episode.runtime !== null && episode.runtime > 0 && <p className="text-xs text-muted-foreground mt-2">Runtime: {formatRuntime(episode.runtime)}</p>}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <p className="text-muted-foreground">No episodes found for this season.</p>
                  )}
                </div>
              )}
            </div>
          ) : episodesError ? (
            <p className="text-destructive">{episodesError}</p>
          ) : (
            <p className="text-muted-foreground">No season information available for this series.</p>
          )}
        </div>
      )}

      {isMounted && (isLoadingMediaImages || mediaImagesError || (mediaImages && mediaImages.backdrops.length > 0)) && (
        <div className="mt-8 sm:mt-12">
          <Separator className="my-6 sm:my-8" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-primary">Gallery</h2>
          {isLoadingMediaImages ? (
            <div className="flex space-x-4 overflow-hidden pb-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-40 md:h-48 w-64 md:w-80 rounded-lg bg-muted/50 flex-shrink-0" />
              ))}
            </div>
          ) : mediaImagesError ? (
            <p className="text-destructive">{mediaImagesError}</p>
          ) : mediaImages && mediaImages.backdrops.length > 0 ? (
            <ScrollArea className="w-full whitespace-nowrap rounded-md pb-4">
              <div className="flex space-x-4">
                {mediaImages.backdrops.map((image, index) => (
                  <div key={image.file_path || index} className="w-64 md:w-80 h-36 md:h-44 relative rounded-lg overflow-hidden shadow-md flex-shrink-0">
                    <Image
                      src={image.file_path}
                      alt={`Backdrop ${index + 1} for ${titleToDisplay}`}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="rounded-lg"
                      sizes="(max-width: 768px) 256px, 320px"
                      data-ai-hint="movie scene image"
                      onError={(e) => { e.currentTarget.src = `https://placehold.co/780x439.png?text=Error`; }}
                    />
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground">No images available for this gallery.</p>
          )}
        </div>
      )}

       {details.status && mediaType === 'movie' && (
            <div className="my-6 sm:my-8">
               <Separator />
               <h2 className="text-xl sm:text-2xl font-semibold mb-2 mt-6 text-primary">Status</h2>
               <p className="text-base md:text-lg text-muted-foreground">{details.status}</p>
            </div>
       )}

      {cast.length > 0 && (
        <div className="mt-8 sm:mt-12">
          <Separator className="my-6 sm:my-8" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-primary flex items-center"><Users className="h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3"/>Cast</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {cast.map(member => (
              <div key={member.id} className="text-center bg-card p-3 sm:p-4 rounded-lg shadow-md hover:shadow-primary/20 transition-shadow">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-2 sm:mb-3 border-2 border-primary/50 rounded-lg">
                  <AvatarImage
                    src={member.profile_path || 'https://placehold.co/96x96.png'}
                    alt={member.name}
                    className="object-cover"
                    data-ai-hint="person headshot" 
                    onError={(e) => { e.currentTarget.src = `https://placehold.co/96x96.png?text=${encodeURIComponent(getInitials(member.name) || 'Cast')}`; }}
                    />
                  <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                </Avatar>
                <p className="font-semibold text-foreground text-sm sm:text-base">{member.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {member.character}
                  {mediaType === 'tv' && member.total_episode_count && member.total_episode_count > 0 && (
                    <span className="block text-xs text-muted-foreground/80">({member.total_episode_count} episodes)</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

