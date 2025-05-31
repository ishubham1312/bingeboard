
'use client';

const BIO_STORAGE_KEY = 'bingeBoardUserProfileBio';
const COVER_ART_URL_STORAGE_KEY = 'bingeBoardUserProfileCoverArtUrl';
const PRESET_COVER_IMAGES_KEY = 'bingeBoardUserPresetCoverImages';

export interface UserProfileData {
  bio?: string;
  coverArtUrl?: string;
  selectedPresetCoverKey?: string;
}

// --- Bio ---
export function getBio(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(BIO_STORAGE_KEY) || '';
}

export function setBio(bio: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BIO_STORAGE_KEY, bio);
}

// --- Cover Art URL (for custom URLs or TMDB URLs) ---
export function getCoverPhotoUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(COVER_ART_URL_STORAGE_KEY) || '';
}

export function setCoverPhotoUrl(url: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(COVER_ART_URL_STORAGE_KEY, url);
  localStorage.removeItem(PRESET_COVER_IMAGES_KEY);
}

// --- Preset Cover Image Selection ---
export function getSelectedPresetCoverKey(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(PRESET_COVER_IMAGES_KEY);
}

export function setSelectedPresetCoverKey(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PRESET_COVER_IMAGES_KEY, key);
    localStorage.removeItem(COVER_ART_URL_STORAGE_KEY);
}

export function clearCoverArtSettings(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(COVER_ART_URL_STORAGE_KEY);
    localStorage.removeItem(PRESET_COVER_IMAGES_KEY);
}

export function getEffectiveCoverArtUrl(defaultCover?: string): string {
  if (typeof window === 'undefined') return defaultCover || PRESET_COVER_ART_OPTIONS.default_cover.url;
  const customUrl = getCoverPhotoUrl();
  if (customUrl) return customUrl;

  const presetKey = getSelectedPresetCoverKey() as keyof typeof PRESET_COVER_ART_OPTIONS | null;
  if (presetKey && PRESET_COVER_ART_OPTIONS[presetKey]) {
    return PRESET_COVER_ART_OPTIONS[presetKey].url;
  }
  return PRESET_COVER_ART_OPTIONS.default_cover?.url || defaultCover || 'https://placehold.co/1200x300.png?text=Cover+Art';
}

/**
 * Preset cover art options.
 * IMPORTANT: Ensure the `url` path starts with `/` for local images in `public/`
 * (e.g., `/cover/my_image.png`).
 * The `hint` is used for AI image search if we implement that later for the cover art.
 * Please ensure the filenames and descriptive names in this object match the actual images
 * you've uploaded to `public/cover/`.
 */
export const PRESET_COVER_ART_OPTIONS: Record<string, { name: string; url: string, hint: string }> = {
  default_cover: { name: "Default Abstract", url: "/cover/default.png", hint: "default background" },
  abstract_purple: { name: "Cinema Hall", url: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxjaW5lbWElMjBoYWxsfGVufDB8fHx8MTc0ODYxNzU0MXww&ixlib=rb-4.1.0&q=80&w=1080", hint: "cinema hall" },
  sci_fi_theme: { name: "Sci-Fi Theme", url: "/cover/c1.jpg", hint: "sci-fi spaceship" },
  fantasy_world: { name: "Fantasy World", url: "/cover/c2.jpg", hint: "fantasy landscape" },
  horror_night: { name: "Horror Night", url: "/cover/c3.jpg", hint: "scary forest" },
  movie_theater: { name: "Movie Theater Seats", url: "/cover/c5.jpg", hint: "cinema seats" },
  film_reel: { name: "Film Reel Collage", url: "/cover/c6.jpg", hint: "film reel" },
  space_nebula: { name: "Space Nebula", url: "/cover/c7.jpg", hint: "galaxy stars" },
  vintage_popcorn: { name: "Vintage Popcorn", url: "/cover/c8.jpg", hint: "popcorn bucket" },
};


// This AVATAR_OPTIONS_CONFIG is no longer used for selection in the edit profile page,
// but is kept here in case it's referenced by the header for displaying SVGs from placeholder URLs.
// If the header's avatar logic is simplified to only use direct photoURLs or initials, this can be removed.
export const AVATAR_OPTIONS_CONFIG = [
  { value: "batman", label: "Batman", iconPath: "/icons/batman.svg" },
  { value: "iron_man", label: "Iron Man", iconPath: "/icons/iron_man.svg" },
  { value: "spider_man", label: "Spider-Man", iconPath: "/icons/spider_man.svg" },
  { value: "wonder_woman", label: "Wonder Woman", iconPath: "/icons/wonder_woman.svg" },
  { value: "captain_america", label: "Captain America", iconPath: "/icons/captain_america.svg" },
  { value: "hulk", label: "Hulk", iconPath: "/icons/hulk.svg" },
  { value: "thor", label: "Thor", iconPath: "/icons/thor.svg" },
  { value: "superman", label: "Superman", iconPath: "/icons/superman.svg" },
];
