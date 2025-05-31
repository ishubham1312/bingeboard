
"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// Removed: import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InteractiveStarRating } from '@/components/ui/InteractiveStarRating'; // Added
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { getTvShowSeasons, getTvSeasonEpisodes, type SeasonSummary, type EpisodeDetail } from '@/services/tmdb';
import { AlertTriangle, Trash2, Info, Star, ChevronDown } from 'lucide-react'; // Added ChevronDown for custom select trigger look
import { Select as RadixSelect, SelectTrigger as RadixSelectTrigger, SelectContent as RadixSelectContent, SelectItem as RadixSelectItem, SelectValue as RadixSelectValue } from "@/components/ui/select";


interface SeasonEpisodeSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { watchedEpisodes: Record<number, 'all' | number[]>, rating: number | null }) => void;
  showId: string;
  showTitle: string;
  initialInteractionData?: { // This prop should align with what's passed from MediaDetailInteraction
    watchedEpisodes: Record<number, 'all' | number[]>;
    rating: number | null;
  };
  onRemoveShow?: () => void;
}

// Removed ratingOptions as it's handled by InteractiveStarRating

export function SeasonEpisodeSelectorDialog({
  isOpen,
  onClose,
  onSave,
  showId,
  showTitle,
  initialInteractionData,
  onRemoveShow
}: SeasonEpisodeSelectorDialogProps) {
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<string>('');
  const [episodes, setEpisodes] = useState<EpisodeDetail[]>([]);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Record<number, 'all' | number[]>>({});
  const [currentRating, setCurrentRating] = useState<number | null>(null);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && showId) {
      setIsLoadingSeasons(true);
      setError(null);
      getTvShowSeasons(showId)
        .then(data => {
          const validSeasons = data.filter(s => s.episode_count > 0 && s.season_number !== 0);
          setSeasons(validSeasons);
          if (validSeasons.length > 0) {
            const firstValidSeason = validSeasons[0];
            if (firstValidSeason && !selectedSeasonNumber) {
                 setSelectedSeasonNumber(firstValidSeason.season_number.toString());
            }
          }
        })
        .catch(err => {
          console.error("Failed to fetch seasons:", err);
          setError("Could not load season data. Please check your connection or try again later.");
        })
        .finally(() => setIsLoadingSeasons(false));
      
      setWatchedEpisodes(initialInteractionData?.watchedEpisodes || {});
      setCurrentRating(initialInteractionData?.rating !== undefined ? initialInteractionData.rating : null);
    } else if (!isOpen) {
      setSelectedSeasonNumber('');
      setEpisodes([]);
      setWatchedEpisodes({});
      setCurrentRating(null);
      setError(null);
    }
  }, [isOpen, showId, initialInteractionData]);

  useEffect(() => {
    if (selectedSeasonNumber && showId) {
      setIsLoadingEpisodes(true);
      setError(null);
      getTvSeasonEpisodes(showId, parseInt(selectedSeasonNumber, 10))
        .then(setEpisodes)
        .catch(err => {
          console.error("Failed to fetch episodes:", err);
          setError("Could not load episode data for this season. Please try again.");
        })
        .finally(() => setIsLoadingEpisodes(false));
    } else {
      setEpisodes([]);
    }
  }, [selectedSeasonNumber, showId]);

  const handleEpisodeToggle = (episodeNumber: number, checked: boolean) => {
    const seasonNum = parseInt(selectedSeasonNumber, 10);
    setWatchedEpisodes(prev => {
      const newWatched = { ...prev };
      let seasonEpisodes = newWatched[seasonNum];

      if (Array.isArray(seasonEpisodes)) {
        if (checked) {
          if (!seasonEpisodes.includes(episodeNumber)) {
            seasonEpisodes.push(episodeNumber);
            seasonEpisodes.sort((a,b) => a-b); 
          }
        } else {
          seasonEpisodes = seasonEpisodes.filter(ep => ep !== episodeNumber);
        }
      } else if (seasonEpisodes === 'all') {
        if (!checked) {
          seasonEpisodes = episodes.map(ep => ep.episode_number).filter(epNum => epNum !== episodeNumber);
        }
      } else { 
        if (checked) {
          seasonEpisodes = [episodeNumber];
        }
      }
      
      if (Array.isArray(seasonEpisodes) && episodes.length > 0 && seasonEpisodes.length === episodes.length) {
        newWatched[seasonNum] = 'all';
      } else if (Array.isArray(seasonEpisodes) && seasonEpisodes.length === 0) {
        delete newWatched[seasonNum]; 
      } else {
        newWatched[seasonNum] = seasonEpisodes;
      }
      return newWatched;
    });
  };

  const handleSelectAllEpisodes = (checked: boolean) => {
    const seasonNum = parseInt(selectedSeasonNumber, 10);
    setWatchedEpisodes(prev => {
      const newWatched = { ...prev };
      if (checked) {
        newWatched[seasonNum] = 'all';
      } else {
        delete newWatched[seasonNum];
      }
      return newWatched;
    });
  };
  
  const currentSeasonWatchedEpisodes = watchedEpisodes[parseInt(selectedSeasonNumber, 10)];
  const areAllCurrentSeasonEpisodesSelected = currentSeasonWatchedEpisodes === 'all' || 
    (Array.isArray(currentSeasonWatchedEpisodes) && episodes.length > 0 && currentSeasonWatchedEpisodes.length === episodes.length);


  const handleSave = () => {
    onSave({ watchedEpisodes, rating: currentRating });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Track Episodes &amp; Rate: {showTitle}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 my-2 bg-destructive/10 border border-destructive text-destructive-foreground rounded-md flex items-center text-sm">
            <AlertTriangle className="h-5 w-5 mr-2 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid gap-4 py-4 flex-grow overflow-hidden">
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="tv-show-rating-interactive" className="text-right col-span-1 pt-1.5">Rating</Label>
             <div className="col-span-3">
                <InteractiveStarRating
                    currentRating={currentRating}
                    onRatingChange={setCurrentRating}
                    starSize="h-6 w-6" // Consistent size
                />
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="season-select" className="text-right col-span-1">
              Season
            </Label>
            {isLoadingSeasons ? (
              <Skeleton className="h-10 w-full col-span-3" />
            ) : seasons.length > 0 ? (
              <RadixSelect
                value={selectedSeasonNumber}
                onValueChange={setSelectedSeasonNumber}
              >
                <RadixSelectTrigger id="season-select" className="col-span-3">
                  <RadixSelectValue placeholder="Select a season" />
                </RadixSelectTrigger>
                <RadixSelectContent>
                  {seasons.map(season => (
                    <RadixSelectItem key={season.id} value={season.season_number.toString()}>
                      {season.name} (Season {season.season_number}) - {season.episode_count} episodes
                    </RadixSelectItem>
                  ))}
                </RadixSelectContent>
              </RadixSelect>
            ) : (
              <div className="col-span-3 p-2 text-sm text-muted-foreground bg-muted/50 rounded-md flex items-center">
                <Info className="h-4 w-4 mr-2 shrink-0 text-primary" />
                No season data available for this show.
              </div>
            )}
          </div>

          {selectedSeasonNumber && !isLoadingSeasons && seasons.length > 0 && (
            <div className="flex flex-col flex-grow overflow-hidden mt-2">
              <div className="flex items-center space-x-2 mb-3 p-2 border-b">
                  <Checkbox
                    id="select-all-episodes"
                    checked={areAllCurrentSeasonEpisodesSelected}
                    onCheckedChange={(checked) => handleSelectAllEpisodes(Boolean(checked))}
                    disabled={isLoadingEpisodes || episodes.length === 0}
                  />
                  <Label htmlFor="select-all-episodes" className="font-medium text-sm">
                    {areAllCurrentSeasonEpisodesSelected ? "Deselect All Episodes This Season" : "Select All Episodes This Season"}
                  </Label>
              </div>
              <ScrollArea className="flex-grow h-52 pr-3">
                {isLoadingEpisodes ? (
                  <div className="space-y-3 p-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : episodes.length > 0 ? (
                  <div className="space-y-1 p-1">
                    {episodes.map(episode => {
                      const isChecked = currentSeasonWatchedEpisodes === 'all' || 
                                        (Array.isArray(currentSeasonWatchedEpisodes) && currentSeasonWatchedEpisodes.includes(episode.episode_number));
                      return (
                        <div key={episode.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md">
                          <Checkbox
                            id={`episode-${episode.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => handleEpisodeToggle(episode.episode_number, Boolean(checked))}
                          />
                          <Label htmlFor={`episode-${episode.id}`} className="text-sm flex-grow cursor-pointer">
                            Ep {episode.episode_number}: {episode.name}
                            {episode.air_date && <span className="text-xs text-muted-foreground ml-2">({new Date(episode.air_date).toLocaleDateString()})</span>}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  !error && <p className="text-muted-foreground text-sm p-2">
                    No episodes found for this season.
                  </p>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
        <DialogFooter className="mt-auto pt-4 border-t">
          {onRemoveShow && (
             <Button variant="destructive" onClick={() => { onRemoveShow(); onClose(); }} className="mr-auto">
                <Trash2 className="mr-2 h-4 w-4" /> Remove Show
            </Button>
          )}
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={isLoadingSeasons || isLoadingEpisodes}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
