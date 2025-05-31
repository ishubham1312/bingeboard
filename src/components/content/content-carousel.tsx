
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ContentCard } from "./content-card";
import type { Recommendation } from "@/services/tmdb"; // Updated import

interface ContentCarouselProps {
  items: Recommendation[];
  isUpcomingSection?: boolean;
}

export function ContentCarousel({ items, isUpcomingSection = false }: ContentCarouselProps) {
  return (
    <div>
      <ScrollArea className="w-full whitespace-nowrap rounded-md">
        <div className="flex space-x-4 pb-4 px-4">
          {items.map((item) => (
            <ContentCard
              key={`${item.id}-${item.media_type}`} // More robust key
              item={item}
              isUpcomingSection={isUpcomingSection}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
