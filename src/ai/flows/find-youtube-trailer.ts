
'use server';
/**
 * @fileOverview A Genkit flow to find a YouTube trailer for a given query.
 *
 * - findYoutubeTrailer - A function that finds a YouTube trailer.
 */

import {ai} from '@/ai/genkit';
import {
  FindYoutubeTrailerInputSchema,
  type FindYoutubeTrailerInput,
  FindYoutubeTrailerOutputSchema,
  type FindYoutubeTrailerOutput
} from './youtube-trailer-types';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Exported wrapper function
export async function findYoutubeTrailer(input: FindYoutubeTrailerInput): Promise<FindYoutubeTrailerOutput> {
  if (!YOUTUBE_API_KEY) {
    console.warn('YouTube API key is not configured in .env. Trailer search will be limited to a generic YouTube search.');
    return { videoId: null };
  }
  return findYoutubeTrailerFlow(input);
}

const findYoutubeTrailerFlow = ai.defineFlow(
  {
    name: 'findYoutubeTrailerFlow',
    inputSchema: FindYoutubeTrailerInputSchema,
    outputSchema: FindYoutubeTrailerOutputSchema,
  },
  async (input) => {
    if (!YOUTUBE_API_KEY) {
      // This check is redundant due to the wrapper, but good for direct flow calls.
      // console.warn('YouTube API key is not configured. Trailer search will be limited.'); // Already warned in wrapper
      return { videoId: null };
    }

    const searchQuery = `${input.query} official trailer`;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
    console.log(`[findYoutubeTrailerFlow] Attempting to fetch trailer from: ${url.replace(YOUTUBE_API_KEY, 'YOUTUBE_API_KEY_REDACTED')}`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // If parsing the error as JSON fails, use the raw text.
          const errorText = await response.text();
          errorData = { error: { message: `Failed to parse error response from YouTube API. Status: ${response.status}, Body: ${errorText}` } };
        }
        console.error(
          `[findYoutubeTrailerFlow] YouTube API error: Status ${response.status}. Message: ${errorData?.error?.message || response.statusText || 'Unknown error from YouTube API.'}`,
          errorData // Log the full error object if available
        );
        return { videoId: null };
      }
      const data = await response.json();
      if (data.items && data.items.length > 0 && data.items[0].id && data.items[0].id.videoId) {
        console.log(`[findYoutubeTrailerFlow] Found videoId: ${data.items[0].id.videoId} for query: "${input.query}"`);
        return { videoId: data.items[0].id.videoId };
      }
      console.log(`[findYoutubeTrailerFlow] No specific trailer videoId found for query: "${input.query}". Items received:`, data.items ? data.items.length : 'N/A');
      return { videoId: null };
    } catch (error: any) {
      console.error('[findYoutubeTrailerFlow] Failed to fetch YouTube trailer due to a network or other error:', error.message, error.stack);
      return { videoId: null };
    }
  }
);

