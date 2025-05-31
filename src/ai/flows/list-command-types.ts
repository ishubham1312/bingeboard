
/**
 * @fileOverview Shared Zod schemas and TypeScript types for list management commands interpreted by Gemini.
 */
import {z} from 'genkit';

export const OrchestratedListActionSchema = z.object({
  actionType: z.enum([
    'CREATE_LIST',
    'ADD_ITEM_TO_LIST',
    'GET_LIST_CONTENTS',
    'SEARCH_ITEM_IN_LIST',
    'NO_ACTION_CONFUSION', // LLM is confused or needs more info
    'NO_ACTION_INFO',      // LLM provided information but no action needed
    'NO_ACTION_UNKNOWN',   // Command not understood as a list action
  ]).describe("The specific action the client application should (or shouldn't) take based on the user's command."),
  
  listName: z.string().optional().describe("The primary list name identified in the command. Used for creation, or as the target for other actions."),
  itemName: z.string().optional().describe("The name of the new movie/show to be added or searched for."),
  
  llmResponse: z.string().optional().describe("A direct natural language response from the LLM to show the user. This is especially useful if clarification is needed, the command is not understood, or for simple acknowledgements.")
});

export type OrchestratedListAction = z.infer<typeof OrchestratedListActionSchema>;
