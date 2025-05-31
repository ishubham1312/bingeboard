
'use server';

import { format, addMonths, parseISO as datefnsParseISO, addDays, startOfMonth, getMonth, getYear, isFuture, isEqual, isToday, endOfMonth, isValid } from 'date-fns';

// Defines the shape of a genre object from TMDB
export interface TmdbGenre {
  id: number;
  name: string;
}

// Defines the shape of a recommendation item, standardized for the app
export interface Recommendation {
  id: string; // TMDB ID, or generated ID for hardcoded items, or IMDb ID
  title: string;
  posterUrl: string;
  backdropUrl?: string;
  overview?: string;
  genre: string; // Primary genre name
  genre_ids: number[]; // All genre IDs for this item (might be empty for IMDb data)
  media_type: 'movie' | 'tv'; // To distinguish for filtering and API calls
  popularity?: number; // TMDB popularity score
  original_language?: string;
  release_date?: string; // For movies, e.g., "2023-10-26"
  first_air_date?: string; // For TV shows, e.g., "2023-10-26"
}

// Raw TMDB details structure (internal use)
interface RawMediaDetails {
  id: number;
  title?: string; // For movies
  name?: string; // For TV
  original_title?: string;
  original_name?: string;
  original_language?: string;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string; // For movies
  first_air_date?: string; // For TV
  genres: TmdbGenre[];
  vote_average: number;
  vote_count: number;
  runtime?: number; // For movies
  episode_run_time?: number[]; // For TV, usually an array
  tagline?: string | null;
  status?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  budget?: number;
  revenue?: number;
  popularity?: number;
  homepage?: string | null;
}


// Public MediaDetails interface with full URLs
export interface MediaDetails extends Omit<RawMediaDetails, 'poster_path' | 'backdrop_path' > {
  posterUrl: string; // Full URL
  backdropUrl: string; // Full URL
}


export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null; // Full URL for profile
  order: number; // Order in the cast list
  total_episode_count?: number; // For TV aggregate credits
}

export interface CreditsResponse {
  id: number;
  cast: CastMember[];
}

export interface SeasonSummary {
  air_date: string | null;
  episode_count: number;
  id: number;
  name:string;
  overview: string;
  poster_path: string | null; // This will be a partial path
  season_number: number;
  vote_average: number;
}

export interface EpisodeDetail {
  air_date: string | null;
  episode_number: number;
  id: number;
  name: string;
  overview: string;
  runtime: number | null;
  season_number: number;
  show_id: number;
  still_path: string | null; // This will be a partial path
  vote_average: number;
  vote_count: number;
}

// Interfaces for Watch Providers
export interface WatchProviderDetail {
  logo_path: string | null; // This will be a full URL
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

export interface RegionWatchProviders {
  link?: string;
  flatrate?: WatchProviderDetail[];
  rent?: WatchProviderDetail[];
  ads?: WatchProviderDetail[];
}

export interface WatchProvidersResponse {
  id: number;
  results: {
    [regionCode: string]: RegionWatchProviders;
  };
}

// Interface for IMDb API upcoming movie item
interface RawImdbUpcomingMovie {
  id: string; // IMDb ID (e.g., "tt1234567")
  title: string;
  image: string; // Poster URL
  releaseState?: string; // e.g., "Wed Jun 05 2024" or "2024" or "Jun 05 2024"
  year?: string; // e.g. "2024"
  plot?: string;
  genres?: string[]; // Array of genre strings
  // Add other fields as per the actual API response if needed
}

// Interfaces for Media Images
export interface MediaImage {
  aspect_ratio: number;
  height: number;
  iso_639_1: string | null;
  file_path: string; // This will be the full URL after processing
  vote_average: number;
  vote_count: number;
  width: number;
}

interface RawTmdbImage {
  aspect_ratio: number;
  height: number;
  iso_639_1: string | null;
  file_path: string; // Partial path
  vote_average: number;
  vote_count: number;
  width: number;
}

interface RawMediaImagesResponse {
  id: number;
  backdrops: RawTmdbImage[];
  posters: RawTmdbImage[];
  logos?: RawTmdbImage[];
}


const TMDB_API_KEY = process.env.TMDB_API_KEY;
const RAPIDAPI_IMDB_KEY = process.env.RAPIDAPI_IMDB_KEY;
const RAPIDAPI_IMDB_HOST = 'imdb236.p.rapidapi.com';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'; // For posters in cards, cast
const TMDB_BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280'; // For main backdrop on detail page
const TMDB_PROVIDER_LOGO_BASE_URL = 'https://image.tmdb.org/t/p/w92';
const TMDB_BACKDROP_GALLERY_URL = 'https://image.tmdb.org/t/p/w780'; // For gallery backdrops
const TMDB_POSTER_GALLERY_URL = 'https://image.tmdb.org/t/p/w342';   // For gallery posters


let movieGenreMap: Map<number, string> | null = null;
let tvGenreMap: Map<number, string> | null = null;
let allMovieGenres: TmdbGenre[] | null = null;
let allTvGenres: TmdbGenre[] | null = null;


async function fetchGenreList(mediaType: 'movie' | 'tv'): Promise<TmdbGenre[]> {
  if (mediaType === 'movie' && allMovieGenres) return allMovieGenres;
  if (mediaType === 'tv' && allTvGenres) return allTvGenres;

  if (!TMDB_API_KEY || TMDB_API_KEY === "YOUR_TMDB_API_KEY_HERE" || TMDB_API_KEY.length < 10) {
    console.warn(`[TMDB Service] TMDB_API_KEY is not configured, appears to be a placeholder, or is too short. Cannot fetch ${mediaType} genres. Current key length: ${TMDB_API_KEY?.length}`);
    return [];
  }

  const url = `${TMDB_BASE_URL}/genre/${mediaType}/list?api_key=${TMDB_API_KEY}&language=en-US`;
  try {
    const response = await fetch(url, { next: { revalidate: 3600 * 24 } }); // Cache genres for 24 hours
    if (!response.ok) {
      console.error(`[TMDB Service] Failed to fetch ${mediaType} genres: ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    const genres = data.genres as TmdbGenre[];
    if (mediaType === 'movie') {
      allMovieGenres = genres;
      movieGenreMap = new Map(genres.map(g => [g.id, g.name]));
    } else {
      allTvGenres = genres;
      tvGenreMap = new Map(genres.map(g => [g.id, g.name]));
    }
    return genres;
  } catch (error) {
    console.error(`[TMDB Service] Error fetching ${mediaType} genres:`, error);
    return [];
  }
}

export async function getMovieGenres(): Promise<TmdbGenre[]> {
  if (!movieGenreMap) {
    await fetchGenreList('movie');
  }
  return allMovieGenres || [];
}

export async function getTvGenres(): Promise<TmdbGenre[]> {
  if (!tvGenreMap) {
    await fetchGenreList('tv');
  }
  return allTvGenres || [];
}

function getGenreMap(mediaType: 'movie' | 'tv'): Map<number, string> {
  if (mediaType === 'movie') {
    return movieGenreMap || new Map();
  }
  return tvGenreMap || new Map();
}


function mapTmdbItemToRecommendation(
  item: any,
  resolvedMediaType?: 'movie' | 'tv'
): Recommendation | null {
  const mediaType = resolvedMediaType || item.media_type;

  if (mediaType !== 'movie' && mediaType !== 'tv') {
    return null;
  }
   // Ensure items without poster paths are filtered out
  if (!item.poster_path) {
    // console.warn(`[mapTmdbItemToRecommendation] Item "${item.title || item.name}" (ID: ${item.id}) has no poster_path. Filtering out.`);
    return null;
  }


  if (mediaType === 'movie' && !movieGenreMap) {
      console.warn("[TMDB Service - mapTmdbItemToRecommendation] Movie genre map not initialized. Results might be incomplete.");
  }
  if (mediaType === 'tv' && !tvGenreMap) {
      console.warn("[TMDB Service - mapTmdbItemToRecommendation] TV genre map not initialized. Results might be incomplete.");
  }

  const currentGenreMap = getGenreMap(mediaType);
  const title = mediaType === 'movie' ? item.title || item.original_title : item.name || item.original_name;

  if (!item.id || !title) {
    return null;
  }

  const posterUrl = `${TMDB_IMAGE_BASE_URL}${item.poster_path}`;
  const backdropUrl = item.backdrop_path
    ? `${TMDB_BACKDROP_BASE_URL}${item.backdrop_path}`
    : `https://placehold.co/1280x720.png?text=${encodeURIComponent(title || 'No Backdrop')}`;


  let genreIds = item.genre_ids || [];
  if (item.genres && item.genres.length > 0 && genreIds.length === 0) {
      genreIds = item.genres.map((g: TmdbGenre) => g.id);
  }

  let genreName = 'N/A';
  if (genreIds.length > 0) {
    genreName = currentGenreMap.get(genreIds[0]) || 'N/A';
  } else if (item.genres && item.genres.length > 0) {
    genreName = item.genres[0].name || 'N/A';
  }


  return {
    id: item.id.toString(),
    title,
    posterUrl,
    backdropUrl: backdropUrl,
    overview: item.overview || '',
    genre: genreName,
    genre_ids: genreIds,
    media_type: mediaType,
    popularity: item.popularity,
    original_language: item.original_language,
    release_date: item.release_date,
    first_air_date: item.first_air_date,
  };
}

export async function checkTmdbApiKeyStatus(): Promise<{ isKeyMissing: boolean; isExampleKey: boolean; keyLength?: number }> {
  const key = process.env.TMDB_API_KEY;
  const placeholderKey = "YOUR_TMDB_API_KEY_HERE"; 

  if (!key || key.trim() === "") {
    console.warn("[TMDB API Key Check] TMDB_API_KEY is MISSING or empty in .env file.");
    return { isKeyMissing: true, isExampleKey: false, keyLength: 0 };
  }
  if (key === placeholderKey) {
    console.warn(`[TMDB API Key Check] Detected placeholder TMDB_API_KEY: "${placeholderKey}". This key will not work.`);
    return { isKeyMissing: false, isExampleKey: true, keyLength: key.length };
  }
   if (key.length < 30 && key !== 'eae7b604e25cc93b51025d8a7379a202') { 
    console.warn(`[TMDB API Key Check] API key seems short (Length: ${key.length}). Ensure it's a valid key from TheMovieDB.org. Key used (last 4 chars): ...${key.slice(-4)}`);
    return { isKeyMissing: false, isExampleKey: false, keyLength: key.length };
  }
  return { isKeyMissing: false, isExampleKey: false, keyLength: key.length };
}


async function fetchFromTMDB(endpoint: string, params: Record<string, string> = {}, revalidateInSeconds: number = 3600 ): Promise<any> {
  console.log(`[fetchFromTMDB] Entered for endpoint: ${endpoint}`);

  const apiKeyStatus = await checkTmdbApiKeyStatus();
  if (apiKeyStatus.isKeyMissing) {
    console.error(
      `[TMDB Fetch] ABORTING: TMDB_API_KEY is missing in your .env file. Cannot call "${endpoint}".`
    );
     return { results: [] }; 
  }
   if (apiKeyStatus.isExampleKey) { 
    console.warn(
        `[TMDB Fetch] WARNING: Using a placeholder TMDB_API_KEY. ` +
        "This will likely result in no content or very limited content. " +
        `API call for "${endpoint}" will be attempted, but please ensure your .env file has a valid, personal API key. Key used (last 4 chars): ...${TMDB_API_KEY?.slice(-4)}`
    );
  }

  // console.log(`[TMDB Fetch DEBUG] Using TMDB_API_KEY ending with: "...${TMDB_API_KEY?.slice(-4)}" (Length: ${TMDB_API_KEY?.length}) for endpoint: ${endpoint} with params: ${JSON.stringify(params)}`);


  const queryParams = new URLSearchParams({ ...params, api_key: TMDB_API_KEY! }).toString();
  const url = `${TMDB_BASE_URL}/${endpoint}?${queryParams}`;
  console.log(`[TMDB Fetch] Requesting URL: ${url.replace(TMDB_API_KEY!, 'TMDB_API_KEY_REDACTED')}`);

  try {
    const response = await fetch(url, { next: { revalidate: revalidateInSeconds } });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[TMDB Fetch] FAILED (${response.status} ${response.statusText}) for URL: ${url.replace(TMDB_API_KEY!, 'TMDB_API_KEY_REDACTED')}. Error body:`, errorBody);
      if (endpoint.includes('list') || endpoint.includes('discover') || endpoint.includes('search') || endpoint.includes('trending') || endpoint.includes('upcoming') || endpoint.includes('now_playing') || endpoint.includes('watch/providers') || endpoint.includes('/images')) {
        return { results: [], backdrops: [], posters: [] }; // Ensure consistent empty state for images too
      }
       if (endpoint.includes('/credits') || endpoint.includes('/aggregate_credits')) {
         return { cast: [] };
      }
      if (endpoint.includes('/seasons') && !endpoint.includes('/episodes')) {
        return { seasons: [] };
      }
      if (endpoint.includes('/episodes')) {
        return { episodes: [] };
      }
      return null; 
    }
    const data = await response.json();
    const resultCount = data.results ? data.results.length : (data.cast ? data.cast.length : (data.seasons ? data.seasons.length : (data.episodes ? data.episodes.length : (data.backdrops ? data.backdrops.length : 'N/A (not a list)'))));
    console.log(`[TMDB Fetch] Successfully received data for URL: ${url.replace(TMDB_API_KEY!, 'TMDB_API_KEY_REDACTED')}. Items received: ${resultCount}.`);
    // console.log(`[TMDB Fetch] Successfully received data for URL: ${url.replace(TMDB_API_KEY!, 'TMDB_API_KEY_REDACTED')}. Items received: ${resultCount}. First few results (if any):`, data.results ? data.results.slice(0,2) : (data.seasons ? data.seasons.slice(0,2) : (data.episodes ? data.episodes.slice(0,2) : "Non-list data")));
    return data;
  } catch (error: any) {
    console.error(`[TMDB Fetch] Network or parsing error for URL (${url.replace(TMDB_API_KEY!, 'TMDB_API_KEY_REDACTED')}):`, error.message, error.stack);
    if (endpoint.includes('list') || endpoint.includes('discover') || endpoint.includes('search') || endpoint.includes('trending') || endpoint.includes('upcoming') || endpoint.includes('now_playing') || endpoint.includes('watch/providers') || endpoint.includes('/images')) {
        return { results: [], backdrops: [], posters: [] };
    }
    if (endpoint.includes('/credits') || endpoint.includes('/aggregate_credits')) {
         return { cast: [] };
    }
    if (endpoint.includes('/seasons') && !endpoint.includes('/episodes')) {
        return { seasons: [] };
    }
    if (endpoint.includes('/episodes')) {
        return { episodes: [] };
    }
    return null;
  }
}

export async function getTrendingMovies(revalidateInSeconds: number = 600): Promise<Recommendation[]> {
  console.log("[TMDB Service] getTrendingMovies called");
  await getMovieGenres();
  const data = await fetchFromTMDB('trending/movie/week', { language: 'en-US', page: '1'}, revalidateInSeconds); 
  if (!data || !Array.isArray(data.results)) {
    console.warn('[TMDB Service - getTrendingMovies] No results array found in TMDB response or data is null.');
    return [];
  }
  return (data.results)
    .map((item: any) => mapTmdbItemToRecommendation(item, 'movie'))
    .filter(Boolean) as Recommendation[];
}

export async function getNowPlayingMovies(): Promise<Recommendation[]> {
  console.log("[TMDB Service] getNowPlayingMovies called");
  await getMovieGenres();
  const data = await fetchFromTMDB('movie/now_playing', { language: 'en-US', page: '1', region: 'US' }, 600); 
  if (!data || !Array.isArray(data.results)) {
    console.warn('[TMDB Service - Now Playing Movies] No results array found in TMDB response or data is null.');
    return [];
  }
  return (data.results)
    .map((item: any) => mapTmdbItemToRecommendation(item, 'movie'))
    .filter(Boolean) as Recommendation[];
}

export async function getTrendingTvShows(revalidateInSeconds: number = 600): Promise<Recommendation[]> {
  console.log("[TMDB Service] getTrendingTvShows called");
  await getTvGenres();
  const data = await fetchFromTMDB('trending/tv/week', { language: 'en-US', page: '1' }, revalidateInSeconds); 
  if (!data || !Array.isArray(data.results)) {
    console.warn('[TMDB Service - Trending TV Shows] No results array found in TMDB response or data is null.');
    return [];
  }
  return (data.results)
    .map((item: any) => mapTmdbItemToRecommendation(item, 'tv'))
    .filter(Boolean) as Recommendation[];
}

function parseImdbReleaseDate(releaseString?: string, year?: string): string | undefined {
  if (!releaseString && !year) return undefined;

  try {
    if (releaseString) {
      if (/^\d{4}$/.test(releaseString)) {
        return `${releaseString}-01-01`; 
      }
      const dateObj = new Date(releaseString);
      if (isValid(dateObj)) {
        return format(dateObj, 'yyyy-MM-dd');
      }
    }
    if (year && /^\d{4}$/.test(year)) {
      return `${year}-01-01`;
    }
  } catch (e) {
    // console.warn(`[parseImdbReleaseDate] Could not parse date: '${releaseString}' or year: '${year}'`, e);
  }
  return undefined;
}


function mapImdbItemToRecommendation(item: RawImdbUpcomingMovie): Recommendation | null {
  if (!item.id || !item.title || !item.image) {
    return null; // Essential fields missing
  }

  const releaseDate = parseImdbReleaseDate(item.releaseState, item.year);

  return {
    id: item.id, // IMDb ID
    title: item.title,
    posterUrl: item.image, 
    backdropUrl: `https://placehold.co/1280x720.png?text=${encodeURIComponent(item.title || 'No Backdrop')}`, 
    overview: item.plot || '',
    genre: item.genres && item.genres.length > 0 ? item.genres[0] : 'N/A', 
    genre_ids: [], 
    media_type: 'movie',
    popularity: 0, 
    original_language: undefined, 
    release_date: releaseDate,
    first_air_date: undefined,
  };
}


export async function getUpcomingMovies({ monthsOut = 6 }: { monthsOut?: number } = {}): Promise<Recommendation[]> {
  console.log("[RapidAPI IMDb Service] getUpcomingMovies called");

  if (!RAPIDAPI_IMDB_KEY) {
    console.error("[RapidAPI IMDb Service] RAPIDAPI_IMDB_KEY is missing. Cannot fetch upcoming movies.");
    return [];
  }

  const url = `https://${RAPIDAPI_IMDB_HOST}/api/imdb/getUpcomingMovies`;
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': RAPIDAPI_IMDB_KEY,
      'x-rapidapi-host': RAPIDAPI_IMDB_HOST
    },
    next: { revalidate: 3600 * 3 } 
  };

  console.log(`[RapidAPI IMDb Service] Requesting URL: ${url} with host ${RAPIDAPI_IMDB_HOST}`);

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[RapidAPI IMDb Service] FAILED (${response.status} ${response.statusText}) for URL: ${url}. Error body:`, errorBody);
      return [];
    }
    const data: RawImdbUpcomingMovie[] = await response.json();
    
    if (!Array.isArray(data)) {
      console.warn('[RapidAPI IMDb Service - Upcoming Movies] Response is not an array or data is null. Data:', data);
      return [];
    }
    // console.log(`[RapidAPI IMDb Service] Successfully received data. Items received: ${data.length}. First few raw results:`, data.slice(0, 2));

    const normalizedToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    const upcoming = data
      .map(mapImdbItemToRecommendation)
      .filter((item: Recommendation | null): item is Recommendation => {
        if (!item || !item.posterUrl || !item.posterUrl.startsWith('http')) return false; // Ensure valid poster
        if (!item.release_date) return false;
        try {
          const releaseDate = datefnsParseISO(item.release_date);
          if (!isValid(releaseDate)) return false;
          return releaseDate > normalizedToday;
        } catch (e) {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          const dateA = datefnsParseISO(a.release_date!);
          const dateB = datefnsParseISO(b.release_date!);
          if (isValid(dateA) && isValid(dateB)) {
            return dateA.getTime() - dateB.getTime();
          }
        } catch (e) {}
        return 0;
      });
    
    console.log(`[RapidAPI IMDb Service] After all filtering and sorting, ${upcoming.length} upcoming movies will be displayed from IMDb.`);
    return upcoming;

  } catch (error: any) {
    console.error(`[RapidAPI IMDb Service] Network or parsing error for URL (${url}):`, error.message, error.stack);
    return [];
  }
}


export async function getHollywoodMovies(): Promise<Recommendation[]> {
  console.log("[TMDB Service] getHollywoodMovies called");
  await getMovieGenres();
  const data = await fetchFromTMDB('discover/movie', {
    language: 'en-US',
    page: '1',
    sort_by: 'popularity.desc',
    with_original_language: 'en',
  }, 3600 * 6); 
   if (!data || !Array.isArray(data.results)) {
    console.warn('[TMDB Service - Hollywood Movies] No results array found in TMDB response or data is null.');
    return [];
  }
  return (data.results).map((item: any) => mapTmdbItemToRecommendation(item, 'movie')).filter(Boolean) as Recommendation[];
}

export async function getBollywoodMovies(): Promise<Recommendation[]> {
  console.log("[TMDB Service] getBollywoodMovies called");
  await getMovieGenres();
  const data = await fetchFromTMDB('discover/movie', {
    language: 'en-US', 
    page: '1',
    sort_by: 'popularity.desc',
    with_original_language: 'hi', 
  }, 3600 * 6); 
   if (!data || !Array.isArray(data.results)) {
    console.warn('[TMDB Service - Bollywood Movies] No results array found in TMDB response or data is null.');
    return [];
  }
  return (data.results).map((item: any) => mapTmdbItemToRecommendation(item, 'movie')).filter(Boolean) as Recommendation[];
}

export async function getAnimatedMovies(): Promise<Recommendation[]> {
  console.log("[TMDB Service] getAnimatedMovies called");
  await getMovieGenres();
  const animationGenreId = '16';
  const data = await fetchFromTMDB('discover/movie', {
    language: 'en-US',
    page: '1',
    sort_by: 'popularity.desc',
    with_genres: animationGenreId,
  }, 3600 * 6); 
   if (!data || !Array.isArray(data.results)) {
    console.warn('[TMDB Service - Animated Movies] No results array found in TMDB response or data is null.');
    return [];
  }
  return (data.results).map((item: any) => mapTmdbItemToRecommendation(item, 'movie')).filter(Boolean) as Recommendation[];
}

export async function getAnimeSeries(): Promise<Recommendation[]> {
  console.log("[TMDB Service] getAnimeSeries called");
  await getTvGenres();
  const data = await fetchFromTMDB('discover/tv', {
    language: 'en-US',
    page: '1',
    sort_by: 'popularity.desc',
    with_genres: '16', 
    with_keywords: '210024', 
  }, 3600 * 6); 
   if (!data || !Array.isArray(data.results)) {
    console.warn('[TMDB Service - Anime Series] No results array found in TMDB response or data is null.');
    return [];
  }
  return (data.results).map((item: any) => mapTmdbItemToRecommendation(item, 'tv')).filter(Boolean) as Recommendation[];
}


export async function searchContent(query: string): Promise<Recommendation[]> {
  console.log(`[TMDB Service] searchContent called with query: "${query}"`);
  if (!query || query.trim() === "") return [];
  await Promise.all([getMovieGenres(), getTvGenres()]);

  const lowerCaseQuery = query.toLowerCase().trim();

  
  if (["marvel", "mcu", "marvel cinematic universe"].includes(lowerCaseQuery)) {
    console.log(`[Search] Performing MCU specific search for: "${query}"`);
    const [mcuMovieData, mcuTvData] = await Promise.all([
      fetchFromTMDB('discover/movie', {
        with_companies: '420', 
        with_keywords: '180547', 
        sort_by: 'popularity.desc',
        language: 'en-US',
        page: '1',
      }),
      fetchFromTMDB('discover/tv', { 
        with_companies: '420',
        with_keywords: '180547',
        sort_by: 'popularity.desc',
        language: 'en-US',
        page: '1',
      })
    ]);

    const mcuMovieResults = (mcuMovieData?.results || [])
      .map((item: any) => mapTmdbItemToRecommendation(item, 'movie'))
      .filter(Boolean) as Recommendation[];
    const mcuTvResults = (mcuTvData?.results || [])
      .map((item: any) => mapTmdbItemToRecommendation(item, 'tv'))
      .filter(Boolean) as Recommendation[];
    
    const combinedMcuResults = [...mcuMovieResults, ...mcuTvResults];
    const uniqueMcuResultsMap = new Map<string, Recommendation>();
    combinedMcuResults.forEach(item => {
        const key = `${item.id}-${item.media_type}`;
        if (!uniqueMcuResultsMap.has(key)) {
            uniqueMcuResultsMap.set(key, item);
        }
    });
    const uniqueMcuResults = Array.from(uniqueMcuResultsMap.values())
                                  .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    if (uniqueMcuResults.length > 0) {
      console.log(`[Search] Found ${uniqueMcuResults.length} MCU items for query: "${query}"`);
      return uniqueMcuResults;
    }
    console.log(`[Search] MCU specific search yielded no results for "${query}". Falling back.`);
  }

  
  const studioInfo = KNOWN_STUDIO_KEYWORDS[lowerCaseQuery];
  if (studioInfo) {
    const companySearchTerm = studioInfo.tmdbName || studioInfo.name;
    console.log(`[Search] Performing company search for query: "${query}", mapped to TMDB name: "${companySearchTerm}"`);
    const companySearchData = await fetchFromTMDB('search/company', { query: companySearchTerm, page: '1' });

    if (companySearchData && companySearchData.results && companySearchData.results.length > 0) {
      
      const exactMatchCompany = companySearchData.results.find((c: any) => c.name.toLowerCase() === companySearchTerm.toLowerCase());
      const companyId = exactMatchCompany ? exactMatchCompany.id : companySearchData.results[0].id;
      const companyName = exactMatchCompany ? exactMatchCompany.name : companySearchData.results[0].name;

      console.log(`[Search] Found company ID ${companyId} for "${companyName}". Fetching content...`);

      const [movieData, tvData] = await Promise.all([
        fetchFromTMDB('discover/movie', {
          with_companies: companyId.toString(),
          sort_by: 'popularity.desc',
          language: 'en-US',
          page: '1',
        }),
        fetchFromTMDB('discover/tv', {
          with_companies: companyId.toString(),
          sort_by: 'popularity.desc',
          language: 'en-US',
          page: '1',
        }),
      ]);

      const movieResults = (movieData?.results || [])
        .map((item: any) => mapTmdbItemToRecommendation(item, 'movie'))
        .filter(Boolean) as Recommendation[];

      const tvResults = (tvData?.results || [])
        .map((item: any) => mapTmdbItemToRecommendation(item, 'tv'))
        .filter(Boolean) as Recommendation[];

      const combinedResults = [...movieResults, ...tvResults];
      const uniqueStudioResultsMap = new Map<string, Recommendation>();
      combinedResults.forEach(item => {
          const key = `${item.id}-${item.media_type}`;
          if (!uniqueStudioResultsMap.has(key)) {
              uniqueStudioResultsMap.set(key, item);
          }
      });
      const uniqueStudioResults = Array.from(uniqueStudioResultsMap.values())
                                    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));


      if (uniqueStudioResults.length > 0) {
        console.log(`[Search] Found ${uniqueStudioResults.length} items for company ID ${companyId} ("${companyName}")`);
        return uniqueStudioResults;
      }
      console.log(`[Search] No content found for company ID ${companyId} ("${companyName}"). Falling back to multi-search for "${query}".`);
    } else {
      console.log(`[Search] No company found for query "${query}" (mapped to "${companySearchTerm}"). Falling back to multi-search.`);
    }
  }

  console.log(`[Search] Performing multi-search for: "${query}"`);
  const data = await fetchFromTMDB('search/multi', {
    language: 'en-US',
    page: '1',
    include_adult: 'false',
    query: query,
  });
   if (!data || !Array.isArray(data.results)) {
    console.warn('[TMDB Service - Search Multi] No results array found in TMDB response or data is null.');
    return [];
  }

  const mappedResults = data.results
    .map((item: any) => mapTmdbItemToRecommendation(item, item.media_type))
    .filter(Boolean) as Recommendation[];

  // Prioritize exact title matches
  const exactMatches = mappedResults.filter(item => 
    item.title.toLowerCase() === lowerCaseQuery
  ).sort((a, b) => (b.popularity || 0) - (a.popularity || 0)); // Keep exact matches sorted by popularity

  // Combine exact matches with other results, removing duplicates
  const otherResults = mappedResults.filter(item => !exactMatches.some(exact => exact.id === item.id && exact.media_type === item.media_type));

  return [...exactMatches, ...otherResults];}


export async function getMediaDetails(id: string, mediaType: 'movie' | 'tv'): Promise<MediaDetails | null> {
  console.log(`[TMDB Service] getMediaDetails called for ${mediaType}/${id}`);
  if (mediaType === 'movie' && !movieGenreMap) await getMovieGenres();
  if (mediaType === 'tv' && !tvGenreMap) await getTvGenres();

  const rawData = await fetchFromTMDB(`${mediaType}/${id}`, { language: 'en-US' }) as RawMediaDetails | null;

  if (!rawData || !rawData.id) {
    console.warn(`[TMDB Service] No raw data or ID found for ${mediaType}/${id}.`);
    return null;
  }

  const { poster_path, backdrop_path, ...restOfRawData } = rawData;
  const titleForPlaceholder = mediaType === 'movie' ? rawData.title || rawData.original_title : rawData.name || rawData.original_name;


  return {
    ...restOfRawData,
    id: rawData.id,
    posterUrl: poster_path ? `${TMDB_IMAGE_BASE_URL}${poster_path}` : `https://placehold.co/400x600.png?text=${encodeURIComponent(titleForPlaceholder || 'No Poster')}`,
    backdropUrl: backdrop_path ? `${TMDB_BACKDROP_BASE_URL}${backdrop_path}` : (poster_path ? `${TMDB_IMAGE_BASE_URL}${poster_path}` : `https://placehold.co/1280x720.png?text=${encodeURIComponent(titleForPlaceholder || 'No Backdrop')}`),
  };
}

export async function getMediaCredits(id: string, mediaType: 'movie' | 'tv'): Promise<CreditsResponse | null> {
  console.log(`[TMDB Service] getMediaCredits called for ${mediaType}/${id}`);
  let endpoint = '';
  if (mediaType === 'tv') {
    endpoint = `tv/${id}/aggregate_credits`;
  } else {
    endpoint = `movie/${id}/credits`;
  }

  const data = await fetchFromTMDB(endpoint, { language: 'en-US' });

  if (!data) {
    console.warn(`[TMDB Service - Credits] No data received for ${mediaType}/${id}.`);
    return { id: parseInt(id, 10), cast: [] };
  }
  if (!Array.isArray(data.cast)) {
    console.warn(`[TMDB Service - Credits] Cast data is not an array for ${mediaType}/${id}. Data received:`, data);
    return { id: parseInt(id, 10), cast: [] };
  }

  const castWithFullProfileUrls = data.cast.map((member: any) => ({
    id: member.id,
    name: member.name,
    character: mediaType === 'tv' ? (member.roles && member.roles[0] ? member.roles[0].character : 'N/A') : member.character,
    profile_path: member.profile_path ? `${TMDB_IMAGE_BASE_URL}${member.profile_path}` : null,
    order: member.order !== undefined ? member.order : (member.roles && member.roles[0] ? member.roles[0].order : 999),
    total_episode_count: mediaType === 'tv' ? member.total_episode_count : undefined,
  }));
  return { id: parseInt(id, 10), cast: castWithFullProfileUrls as CastMember[] };
}


export async function getTvShowSeasons(tvId: string): Promise<SeasonSummary[]> {
  console.log(`[TMDB Service] getTvShowSeasons called for TV ID: ${tvId}`);
  const data = await fetchFromTMDB(`tv/${tvId}`, { language: 'en-US' });
  if (data && data.seasons && Array.isArray(data.seasons)) {
    return data.seasons.filter((s: SeasonSummary) => s.season_number !== 0 && s.episode_count > 0);
  }
  console.warn(`[TMDB Service - Seasons] No seasons array found for TV ID: ${tvId}. Data:`, data);
  return [];
}

export async function getTvSeasonEpisodes(tvId: string, seasonNumber: number): Promise<EpisodeDetail[]> {
  console.log(`[TMDB Service] getTvSeasonEpisodes called for TV ID: ${tvId}, Season: ${seasonNumber}`);
  const data = await fetchFromTMDB(`tv/${tvId}/season/${seasonNumber}`, { language: 'en-US' });
  if (data && data.episodes && Array.isArray(data.episodes)) {
    return data.episodes;
  }
  console.warn(`[TMDB Service - Episodes] No episodes array found for TV ID: ${tvId}, Season: ${seasonNumber}. Data:`, data);
  return [];
}

export async function getWatchProviders(id: string, mediaType: 'movie' | 'tv'): Promise<RegionWatchProviders | null> {
  console.log(`[TMDB Service] getWatchProviders called for ${mediaType}/${id} (India)`);
  const endpoint = `${mediaType}/${id}/watch/providers`;
  const data: WatchProvidersResponse = await fetchFromTMDB(endpoint);

  if (data && data.results && data.results.IN) {
    const inProviders = data.results.IN;

    const processProviderList = (providers?: any[]): WatchProviderDetail[] | undefined => {
      if (!providers || !Array.isArray(providers)) return undefined;
      return providers.map(p => ({
        ...p,
        logo_path: p.logo_path ? `${TMDB_PROVIDER_LOGO_BASE_URL}${p.logo_path}` : null,
      })).sort((a,b) => a.display_priority - b.display_priority);
    };

    return {
      link: inProviders.link || `https://www.themoviedb.org/${mediaType}/${id}/watch?locale=IN`,
      flatrate: processProviderList(inProviders.flatrate),
      rent: processProviderList(inProviders.rent),
      ads: processProviderList(inProviders.ads),
    };
  }
  // console.log(`[TMDB Service - Watch Providers] No 'IN' region data found for ${mediaType}/${id}. Full response results:`, data?.results);
  return null;
}

export async function getMediaImages(
  id: string,
  mediaType: 'movie' | 'tv'
): Promise<{ backdrops: MediaImage[]; posters: MediaImage[] } | null> {
  console.log(`[TMDB Service] getMediaImages called for ${mediaType}/${id}`);
  const data: RawMediaImagesResponse | null = await fetchFromTMDB(`${mediaType}/${id}/images`);

  if (!data) {
    console.warn(`[TMDB Service - Images] No image data received for ${mediaType}/${id}.`);
    return null;
  }

  const processImages = (rawImages: RawTmdbImage[], baseUrl: string, limit: number, isBackdrop: boolean): MediaImage[] => {
    return rawImages
      .slice(0, limit)
      .map(img => ({
        ...img,
        file_path: img.file_path 
          ? `${baseUrl}${img.file_path}` 
          : `https://placehold.co/${isBackdrop ? '780x439' : '342x513'}.png?text=No+Image`
      }));
  };

  const backdrops = processImages(data.backdrops || [], TMDB_BACKDROP_GALLERY_URL, 10, true);
  const posters = processImages(data.posters || [], TMDB_POSTER_GALLERY_URL, 5, false);

  console.log(`[TMDB Service - Images] Processed ${backdrops.length} backdrops and ${posters.length} posters for ${mediaType}/${id}.`);
  return { backdrops, posters };
}


const KNOWN_STUDIO_KEYWORDS: Record<string, { name: string, tmdbName?: string }> = {
  'marvel': { name: 'Marvel Studios', tmdbName: 'Marvel Studios' }, 
  'mcu': { name: 'Marvel Studios', tmdbName: 'Marvel Studios' }, 
  'marvel cinematic universe': { name: 'Marvel Studios', tmdbName: 'Marvel Studios' }, 
  'dc': { name: 'DC Entertainment', tmdbName: 'DC Entertainment' }, 
  'dc comics': { name: 'DC Comics', tmdbName: 'DC Comics' }, 
  'pixar': { name: 'Pixar', tmdbName: 'Pixar' }, 
  'disney': { name: 'Walt Disney Pictures', tmdbName: 'Walt Disney Pictures' }, 
  'walt disney': { name: 'Walt Disney Pictures', tmdbName: 'Walt Disney Pictures' },
  'warner bros': { name: 'Warner Bros. Pictures', tmdbName: 'Warner Bros. Pictures' }, 
  'warner brothers': { name: 'Warner Bros. Pictures', tmdbName: 'Warner Bros. Pictures' },
  'dreamworks': { name: 'DreamWorks Animation', tmdbName: 'DreamWorks Animation' }, 
  'sony pictures': { name: 'Sony Pictures', tmdbName: 'Sony Pictures' }, 
  'columbia pictures': { name: 'Columbia Pictures', tmdbName: 'Columbia Pictures'}, 
  'universal pictures': { name: 'Universal Pictures', tmdbName: 'Universal Pictures'}, 
  'paramount': { name: 'Paramount', tmdbName: 'Paramount'}, 
  'paramount pictures': { name: 'Paramount', tmdbName: 'Paramount'},
  '20th century studios': { name: '20th Century Studios', tmdbName: '20th Century Studios'}, 
  '20th century fox': { name: '20th Century Fox', tmdbName: '20th Century Fox'}, 
  'lionsgate': { name: 'Lionsgate', tmdbName: 'Lionsgate'}, 
  'a24': { name: 'A24', tmdbName: 'A24'} 
};
