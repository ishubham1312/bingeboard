
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquareText, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { interpretListCommand } from '@/ai/flows/list-command-flow';
import type { OrchestratedListAction } from '@/ai/flows/list-command-types';
import * as itemService from '@/services/watchedItemsService'; // Using namespace import
import { useListManagement } from '@/hooks/useListManagement';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';

export function ListManagementCommander() {
  const [command, setCommand] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [geminiResponse, setGeminiResponse] = useState<string | null>(null);
  const { toast } = useToast();
  const { refreshLists } = useListManagement();

  const handleSubmitCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    setIsLoading(true);
    setGeminiResponse(null);

    try {
      const action: OrchestratedListAction = await interpretListCommand({ commandText: command });

      if (action.llmResponse) {
        setGeminiResponse(action.llmResponse);
      }

      switch (action.actionType) {
        case 'CREATE_LIST':
          if (action.listName) {
            itemService.createList(action.listName);
            toast({
              title: "List Created!",
              description: `List "${action.listName}" has been successfully created.`,
            });
            refreshLists();
            setCommand(''); // Clear input after successful action
          } else {
            setGeminiResponse(action.llmResponse || "Gemini suggested creating a list, but a name wasn't specified. Please try again, e.g., 'Create a list called Action Movies'.");
          }
          break;
        
        case 'ADD_ITEM_TO_LIST':
          toast({ title: "Feature Coming Soon", description: "Adding items to lists via Gemini will be available soon!" });
          // For future: will need to search TMDB for item, then add to a specified/selected list.
          // setGeminiResponse(action.llmResponse || `Gemini wants to add "${action.itemName}" to list "${action.listName}". This feature is coming soon!`);
          break;

        case 'GET_LIST_CONTENTS':
          toast({ title: "Feature Coming Soon", description: "Viewing list contents via Gemini will be available soon!" });
          // For future: will need to fetch list items and display them, possibly in a modal or new view.
          // setGeminiResponse(action.llmResponse || `Gemini wants to show items from list "${action.listName}". This feature is coming soon!`);
          break;

        case 'SEARCH_ITEM_IN_LIST':
          toast({ title: "Feature Coming Soon", description: "Searching within lists via Gemini will be available soon!" });
          // setGeminiResponse(action.llmResponse || `Gemini wants to search for "${action.itemName}" in list "${action.listName}". This feature is coming soon!`);
          break;

        case 'NO_ACTION_CONFUSION':
        case 'NO_ACTION_UNKNOWN':
        case 'NO_ACTION_INFO':
          // The llmResponse is already set above, so just let it be displayed.
          if (!action.llmResponse) {
             setGeminiResponse("I received your command, but I'm not sure what action to take. Could you try rephrasing?");
          }
          break;
          
        default:
          setGeminiResponse(action.llmResponse || "I'm not sure how to handle that command regarding your lists. Try something like 'Create a list called My Favorites'.");
      }
    } catch (error) {
      console.error("Error interpreting command:", error);
      toast({
        title: "Error",
        description: "Could not process your command via Gemini. Please try again.",
        variant: "destructive",
      });
      setGeminiResponse("An error occurred while trying to understand your command.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-8 bg-card/70 border-primary/30 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-primary">
          <Sparkles className="mr-2 h-5 w-5" />
          Manage Lists with Gemini
        </CardTitle>
        <CardDescription>
          Try commands like: "Create a list called Sci-Fi Hits", "Make a new list for Comedies", etc.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmitCommand} className="space-y-3">
          <Input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="e.g., Create a list named 'My Favorites'"
            disabled={isLoading}
            className="bg-background/80 focus:ring-accent"
          />
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageSquareText className="mr-2 h-4 w-4" />
            )}
            Send Command
          </Button>
        </form>
        {geminiResponse && (
          <div className="mt-4 p-3 bg-muted/50 rounded-md text-sm text-foreground border border-border">
            <p className="font-medium text-primary/90 mb-1">Gemini says:</p>
            <p>{geminiResponse}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        More list management commands (add item, view content) via Gemini are coming soon!
      </CardFooter>
    </Card>
  );
}
