
// Implemented Genkit flow for curating trending content using an LLM.

'use server';

/**
 * @fileOverview A flow for curating trending content recommendations.
 *
 * - curateTrendingContent - A function that curates trending content recommendations.
 * - CurateTrendingContentInput - The input type for the curateTrendingContent function.
 * - CurateTrendingContentOutput - The return type for the curateTrendingContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CurateTrendingContentInputSchema = z.object({
  category: z
    .string()
    .describe(
      'The category of content to curate, e.g., movies, web series, anime.'
    ),
});
export type CurateTrendingContentInput = z.infer<
  typeof CurateTrendingContentInputSchema
>;

// Adding an optional ID field to the recommendation object
const RecommendationSchema = z.object({
  id: z.string().optional().describe('Optional ID of the content, e.g., from TMDB.'),
  title: z.string().describe('The title of the recommended content.'),
  posterUrl: z.string().describe('URL of the content poster image.'),
  genre: z.string().describe('The genre of the recommended content.'),
});

const CurateTrendingContentOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema),
});
export type CurateTrendingContentOutput = z.infer<
  typeof CurateTrendingContentOutputSchema
>;


export async function curateTrendingContent(
  input: CurateTrendingContentInput
): Promise<CurateTrendingContentOutput> {
  // This flow will now primarily be used for LLM-based curation.
  // TMDB direct calls are handled in page.tsx / services.
  return curateTrendingContentFlow(input);
}

const curateTrendingContentPrompt = ai.definePrompt({
  name: 'curateTrendingContentPrompt',
  input: {schema: CurateTrendingContentInputSchema},
  output: {schema: CurateTrendingContentOutputSchema},
  prompt: `You are an expert curator of trending content. Based on the category provided, recommend trending movies and shows.

Category: {{{category}}}

Format your response as a JSON array of objects, each with 'title', 'posterUrl', and 'genre' fields. The posterUrl should be a valid, publicly accessible URL to an image (e.g., from Wikipedia, TMDB, IMDb). If you cannot find a valid poster URL, you can use a placeholder like 'https://placehold.co/240x360.png'.

Ensure your recommendations are diverse and reflect current popular trends. Only include content for which you can find reasonable poster URLs or provide a placeholder.
For genre, provide a single, most relevant genre string.`,
});

const curateTrendingContentFlow = ai.defineFlow(
  {
    name: 'curateTrendingContentFlow',
    inputSchema: CurateTrendingContentInputSchema,
    outputSchema: CurateTrendingContentOutputSchema,
  },
  async input => {
    // Log the input category for LLM-based curation
    console.log(`Curating content for category (LLM): ${input.category}`);
    
    const {output} = await curateTrendingContentPrompt(input);
    
    if (!output || !output.recommendations) {
      console.warn(`LLM output was null or had no recommendations for category: ${input.category}`);
      return { recommendations: [] };
    }
    
    // Ensure posterUrl is somewhat valid or defaults to placeholder, and genre is a string
    const validatedRecommendations = output.recommendations.map(rec => ({
      ...rec,
      posterUrl: (rec.posterUrl && rec.posterUrl.startsWith('http')) ? rec.posterUrl : 'https://placehold.co/240x360.png',
      genre: rec.genre || "N/A",
    }));

    return { recommendations: validatedRecommendations };
  }
);

