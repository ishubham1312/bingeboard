
'use server';
/**
 * @fileOverview A Genkit flow to interpret user's natural language commands for list management.
 *
 * - interpretListCommand - A function that parses a user's command related to their movie/show lists.
 * - InterpretListCommandInput - Input type for the flow.
 * - OrchestratedListAction - Output type (defined in list-command-types.ts).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { OrchestratedListActionSchema, type OrchestratedListAction } from './list-command-types';

const InterpretListCommandInputSchema = z.object({
  commandText: z.string().describe("The user's natural language command regarding their movie/show lists."),
});
export type InterpretListCommandInput = z.infer<typeof InterpretListCommandInputSchema>;

export async function interpretListCommand(input: InterpretListCommandInput): Promise<OrchestratedListAction> {
  return interpretListCommandFlow(input);
}

const interpretListCommandPrompt = ai.definePrompt({
  name: 'interpretListCommandPrompt',
  input: { schema: InterpretListCommandInputSchema },
  output: { schema: OrchestratedListActionSchema },
  prompt: `You are an assistant helping users manage their movie and TV show lists.
The user will provide a command. Your task is to interpret this command and determine the intended action and any relevant parameters.

Possible actions are:
- CREATE_LIST: User wants to create a new list. Extract the 'listName'.
- ADD_ITEM_TO_LIST: User wants to add a movie or show to a list. Extract 'itemName' and 'listName' (which is the target list).
- GET_LIST_CONTENTS: User wants to see what's in a specific list. Extract 'listName'.
- SEARCH_ITEM_IN_LIST: User wants to know if a specific movie/show is in a list. Extract 'itemName' and 'listName'.

If the command is unclear, ambiguous, or doesn't seem related to list management, set actionType to 'NO_ACTION_CONFUSION' or 'NO_ACTION_UNKNOWN' and provide a helpful 'llmResponse' asking for clarification or stating you didn't understand.
If the command is a simple acknowledgement or doesn't require an action (e.g., "thank you"), set actionType to 'NO_ACTION_INFO' and provide a polite 'llmResponse'.

User Command: {{{commandText}}}

Extract the information and structure your response according to the output schema.
Focus on identifying one primary action.
For ADD_ITEM_TO_LIST, if the user says "add X to Y list", listName should be Y and itemName should be X.
If they say "add X to my new list Z", listName should be Z (for creation) and itemName X. The client will handle creating the list then adding. For simplicity here, if creation of a list is implied for adding an item, prioritize the 'CREATE_LIST' action for listName and pass itemName. The client can then create the list and prompt to add the item.
If the list name for adding an item is not specified, do not assume; ask for clarification via 'llmResponse' and 'NO_ACTION_CONFUSION'.
If the command is just to create a list, e.g., "create a list called Watch Later", then actionType is 'CREATE_LIST' and listName is 'Watch Later'.
`,
});

const interpretListCommandFlow = ai.defineFlow(
  {
    name: 'interpretListCommandFlow',
    inputSchema: InterpretListCommandInputSchema,
    outputSchema: OrchestratedListActionSchema,
  },
  async (input) => {
    const { output } = await interpretListCommandPrompt(input);
    if (!output) {
      // This should ideally not happen if the LLM adheres to the schema
      console.error("interpretListCommandFlow: LLM output was null or undefined.");
      return {
        actionType: 'NO_ACTION_UNKNOWN',
        llmResponse: "Sorry, I encountered an unexpected issue processing your command. Please try again."
      };
    }
    return output;
  }
);
