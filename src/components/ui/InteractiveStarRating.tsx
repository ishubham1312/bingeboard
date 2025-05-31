
"use client";

import { Star } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface InteractiveStarRatingProps {
  currentRating: number | null;
  onRatingChange: (rating: number | null) => void;
  maxStars?: number;
  starSize?: string; // e.g., "h-6 w-6"
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function InteractiveStarRating({
  currentRating,
  onRatingChange,
  maxStars = 5,
  starSize = "h-7 w-7", // Slightly larger for better interaction
  label,
  className,
  disabled = false,
}: InteractiveStarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const handleStarClick = (clickedValue: number) => {
    if (disabled) return;
    // If clicking the same value that's already selected, clear it. Otherwise, set it.
    if (currentRating === clickedValue) {
      onRatingChange(null);
    } else {
      onRatingChange(clickedValue);
    }
  };

  const handleClearRating = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onRatingChange(null);
    setHoverRating(null);
  };

  const getStarFillClass = (starSegmentValue: number) => {
    const displayRating = hoverRating !== null ? hoverRating : currentRating;
    if (displayRating !== null && displayRating >= starSegmentValue) {
      return "fill-yellow-400 stroke-yellow-500 text-yellow-500";
    }
    return "text-gray-300 dark:text-gray-600";
  };

  return (
    <div className={cn("space-y-1", className)}>
      {label && <span className="text-sm font-medium text-muted-foreground">{label}</span>}
      <div className={cn("flex items-center space-x-0.5", disabled && "opacity-70")}>
        {[...Array(maxStars)].map((_, index) => {
          const starIndex = index + 1; // 1, 2, 3, 4, 5
          const leftHalfValue = starIndex - 0.5;
          const rightHalfValue = starIndex;

          return (
            <div
              key={starIndex}
              className={cn("relative", starSize, !disabled && "cursor-pointer")}
              onMouseLeave={() => !disabled && setHoverRating(null)}
            >
              {/* Left Half */}
              <Star
                className={cn("absolute top-0 left-0", starSize, getStarFillClass(leftHalfValue))}
                style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0% 100%)' }}
                onMouseEnter={() => !disabled && setHoverRating(leftHalfValue)}
                onClick={() => handleStarClick(leftHalfValue)}
              />
              {/* Right Half */}
              <Star
                className={cn("absolute top-0 left-0", starSize, getStarFillClass(rightHalfValue))}
                style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }}
                onMouseEnter={() => !disabled && setHoverRating(rightHalfValue)}
                onClick={() => handleStarClick(rightHalfValue)}
              />
              {/* Background Star for full clickable area and base look */}
              <Star className={cn(starSize, "text-gray-300 dark:text-gray-600")} />
            </div>
          );
        })}
        {!disabled && currentRating !== null && (
          <button
            type="button"
            onClick={handleClearRating}
            className="ml-2 text-xs text-muted-foreground hover:text-foreground underline"
            title="Clear rating"
          >
            Clear
          </button>
        )}
         {disabled && currentRating === null && (
             <span className="ml-2 text-xs text-muted-foreground">(Not rated)</span>
         )}
      </div>
    </div>
  );
}
