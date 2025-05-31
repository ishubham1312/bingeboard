
import {z} from 'genkit';

/**
 * @fileOverview Type definitions and Zod schemas for the findYoutubeTrailer flow.
 */

// Schema for input
export const FindYoutubeTrailerInputSchema = z.object({
  query: z.string().describe('The search query for the trailer, typically the movie or show title.'),
});
export type FindYoutubeTrailerInput = z.infer<typeof FindYoutubeTrailerInputSchema>;

// Schema for output
export const FindYoutubeTrailerOutputSchema = z.object({
  videoId: z.string().nullable().describe('The YouTube video ID of the found trailer, or null if not found.'),
});
export type FindYoutubeTrailerOutput = z.infer<typeof FindYoutubeTrailerOutputSchema>;
