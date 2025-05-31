
"use client";

import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/services/firebase';
import { updateProfile } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { UserCircle2, ImagePlus, Film, Search, Loader2, UploadCloud, RotateCcw } from 'lucide-react'; // Added RotateCcw
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getBio,
  setBio,
  getCoverPhotoUrl,
  setCoverPhotoUrl,
  getSelectedPresetCoverKey,
  setSelectedPresetCoverKey,
  PRESET_COVER_ART_OPTIONS,
  clearCoverArtSettings,
  getEffectiveCoverArtUrl
} from '@/services/userProfileService';
import { searchContent, type Recommendation as TmdbRecommendation } from '@/services/tmdb';

// Helper for avatar initials
const getInitials = (name?: string | null, email?: string | null): string => {
  if (name) {
    const names = name.split(' ').filter(Boolean);
    if (names.length === 0) return email ? email[0].toUpperCase() : 'U';
    if (names.length === 1) return names[0][0]?.toUpperCase() || 'U';
    return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return 'U';
};


export default function EditProfilePage() { // Increased bio max length from 350 to 500
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [bioContent, setBioContentState] = useState('');

  // State for profile picture
  const [currentProfilePhoto, setCurrentProfilePhoto] = useState<string | null>(null);
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreviewUrl, setProfilePicPreviewUrl] = useState<string | null>(null);


  // State for cover art
  const [coverArtSource, setCoverArtSource] = useState<'preset' | 'url' | 'file' | 'default'>('default');
  const [coverArtDisplayUrl, setCoverArtDisplayUrl] = useState('');
  const [coverArtUrlToSave, setCoverArtUrlToSave] = useState('');
  const [selectedPresetKeyToSave, setSelectedPresetKeyToSave] = useState<keyof typeof PRESET_COVER_ART_OPTIONS | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverArtObjectFit, setCoverArtObjectFit] = useState<'contain' | 'cover' | 'fill'>('cover');


  const [isSaving, setIsSaving] = useState(false);
  const [tmdbSearchTerm, setTmdbSearchTerm] = useState('');
  const [tmdbSearchResults, setTmdbSearchResults] = useState<TmdbRecommendation[]>([]);
  const [isTmdbSearching, setIsTmdbSearching] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/me/edit-profile');
    } else if (user) {
      setDisplayName(user.displayName || user.email?.split('@')[0] || '');
      setCurrentProfilePhoto(user.photoURL); // Initialize with current Firebase photo
      setBioContentState(getBio());

      const savedCustomUrl = getCoverPhotoUrl();
      const savedPresetKeyFromStorage = getSelectedPresetCoverKey() as keyof typeof PRESET_COVER_ART_OPTIONS | null;

      if (savedCustomUrl) {
        setCoverArtDisplayUrl(savedCustomUrl);
        setCoverArtUrlToSave(savedCustomUrl);
        setCoverArtSource('url');
      } else if (savedPresetKeyFromStorage && PRESET_COVER_ART_OPTIONS[savedPresetKeyFromStorage]) {
        setCoverArtDisplayUrl(PRESET_COVER_ART_OPTIONS[savedPresetKeyFromStorage].url);
        setSelectedPresetKeyToSave(savedPresetKeyFromStorage);
        setCoverArtSource('preset');
      } else {
        const defaultCoverUrl = PRESET_COVER_ART_OPTIONS.default_cover?.url || 'https://placehold.co/1200x300.png?text=Cover+Art';
        setCoverArtDisplayUrl(defaultCoverUrl);
        setSelectedPresetKeyToSave(null);
        setCoverArtSource('default');
      }
    }
  }, [user, authLoading, router, getBio, getCoverPhotoUrl, getSelectedPresetCoverKey]);


  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= 500) {
      setBioContentState(e.target.value);
    }
  };

  const handlePresetCoverSelect = (key: keyof typeof PRESET_COVER_ART_OPTIONS) => {
    if (PRESET_COVER_ART_OPTIONS[key]) {
        setSelectedPresetKeyToSave(key);
        setCoverArtUrlToSave('');
        setCoverFile(null);
        setCoverArtDisplayUrl(PRESET_COVER_ART_OPTIONS[key].url);
        setCoverArtSource('preset');
    } else {
        // Fallback if key is somehow invalid, though UI should prevent this
        setSelectedPresetKeyToSave('default_cover');
        setCoverArtDisplayUrl(PRESET_COVER_ART_OPTIONS.default_cover.url);
        setCoverArtSource('default');
    }
  };

  const handleCoverArtUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCoverArtUrlToSave(e.target.value);
    setSelectedPresetKeyToSave(null);
    setCoverFile(null);
    setCoverArtDisplayUrl(e.target.value);
    setCoverArtSource('url');
  };

  const handleCoverFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverArtDisplayUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setCoverArtUrlToSave('');
      setSelectedPresetKeyToSave(null);
      setCoverArtSource('file');
      toast({
        title: "Cover Image Preview Updated",
        description: "Note: Uploaded image saving is not yet implemented. This is a preview only. Use presets or URL for saving.",
        variant: "default",
        duration: 7000,
      });
    }
  };

  const handleClearCoverArt = () => {
    clearCoverArtSettings();
    setCoverArtDisplayUrl(PRESET_COVER_ART_OPTIONS.default_cover.url);
    setSelectedPresetKeyToSave(null);
    setCoverArtUrlToSave('');
    setCoverFile(null);
    setCoverArtSource('default');
    toast({ title: "Cover Art Cleared", description: "Cover art settings have been reset to default." });
  };

  const handleProfilePicFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setProfilePicPreviewUrl(dataUrl);
        // setCurrentProfilePhoto(dataUrl); // Update preview immediately with local file
      };
      reader.readAsDataURL(file);
      toast({
        title: "Profile Picture Preview Updated",
        description: "Note: Saving uploaded profile pictures is not yet implemented. This is a preview only.",
        variant: "default",
        duration: 7000,
      });
    }
  };

  const handleResetProfilePicture = async () => {
    if (!user || !auth.currentUser) return;
    setIsSaving(true);
    try {
      await updateProfile(auth.currentUser, { photoURL: null });
      setProfilePicFile(null);
      setProfilePicPreviewUrl(null);
      // user.photoURL will update via useAuth, triggering useEffect to update currentProfilePhoto
      toast({ title: "Profile Picture Reset", description: "Your profile picture has been reset to the default (e.g., Google photo or none)." });
    } catch (error: any) {
      console.error("Error resetting profile picture:", error);
      toast({ title: "Reset Failed", description: error.message || "Could not reset profile picture.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  const handleTmdbSearch = async () => {
    if (!tmdbSearchTerm.trim()) return;
    setIsTmdbSearching(true);
    try {
      const results = await searchContent(tmdbSearchTerm);
      setTmdbSearchResults(results.filter(r => r.posterUrl && r.posterUrl.startsWith('http')));
    } catch (error) {
      console.error("Error searching TMDB for cover art:", error);
      toast({ title: "TMDB Search Failed", description: "Could not fetch posters from TMDB.", variant: "destructive" });
      setTmdbSearchResults([]);
    } finally {
      setIsTmdbSearching(false);
    }
  };

  const handleTmdbPosterSelect = (posterUrl: string) => {
    setCoverArtUrlToSave(posterUrl);
    setSelectedPresetKeyToSave(null);
    setCoverFile(null);
    setCoverArtDisplayUrl(posterUrl);
    setCoverArtSource('url');
    setTmdbSearchResults([]);
    setTmdbSearchTerm('');
  };

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !auth.currentUser) return;
    setIsSaving(true);

    try {
      const updates: { displayName?: string; photoURL?: string } = {};
      if (displayName.trim() !== (user.displayName || '')) {
        updates.displayName = displayName.trim();
      }

      // Profile picture upload is preview only, so no 'updates.photoURL' for file uploads.
      // Resetting photoURL to null is handled by handleResetProfilePicture directly.
      // This save function does not change the photoURL in Firebase unless a URL was manually entered (which is not current UI for profile pics).

      if (Object.keys(updates).length > 0 && auth.currentUser) {
        await updateProfile(auth.currentUser, updates);
      }

      setBio(bioContent);

      if (coverArtSource === 'file' && coverFile) {
        toast({
          title: "Cover Art Not Saved (File Upload)",
          description: "Previewing uploaded cover art is supported, but saving uploaded files is not yet implemented. Please use a preset or URL for cover art to save changes.",
          variant: "default",
          duration: 10000,
        });
        // Revert to previously saved state for cover art if a file was previewed but not saveable
        const previouslySavedCustomUrl = getCoverPhotoUrl();
        const previouslySavedPresetKey = getSelectedPresetCoverKey() as keyof typeof PRESET_COVER_ART_OPTIONS | null;
        if (previouslySavedCustomUrl) {
            setCoverPhotoUrl(previouslySavedCustomUrl);
        } else if (previouslySavedPresetKey) {
            setSelectedPresetCoverKey(previouslySavedPresetKey);
        } else {
            clearCoverArtSettings();
        }
      } else if (coverArtSource === 'preset' && selectedPresetKeyToSave) {
        setSelectedPresetCoverKey(selectedPresetKeyToSave);
        setCoverPhotoUrl(''); // Clear custom URL if preset is chosen
      } else if (coverArtSource === 'url' && coverArtUrlToSave.trim()) {
         if (!coverArtUrlToSave.trim().startsWith('http')) {
            toast({ title: "Invalid Cover Art URL", description: "Please enter a valid URL (starting with http or https).", variant: "destructive"});
            setIsSaving(false);
            return;
        }
        setCoverPhotoUrl(coverArtUrlToSave.trim());
        setSelectedPresetKeyToSave(null); // Clear preset if URL is chosen
      } else if (coverArtSource === 'default') { // Explicitly chosen default or cleared
        clearCoverArtSettings();
      }

      // Update toast notification to only show heading for 3 seconds
      toast({ title: "Profile Updated", duration: 3000 });
      setProfilePicFile(null);
      setProfilePicPreviewUrl(null);
      router.push('/me');
      router.refresh();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update profile.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const renderAvatarPreview = () => {
    const initials = getInitials(user?.displayName, user?.email);
    if (profilePicPreviewUrl) { // New file selected for preview
      return <Image src={profilePicPreviewUrl} alt="Profile preview" width={96} height={96} className="rounded-full object-cover border-2 border-primary" data-ai-hint="profile avatar"/>;
    }
    if (currentProfilePhoto) { // Existing photoURL from Firebase (e.g., Google or previously set)
      return <Image src={currentProfilePhoto} alt="Current profile picture" width={96} height={96} className="rounded-full object-cover border-2 border-border" data-ai-hint="profile avatar"/>;
    }
    // Fallback to initials via UserCircle2 if no photoURL and no preview
    return (
      <div className="w-24 h-24 rounded-full bg-muted border-2 border-border flex items-center justify-center">
        <UserCircle2 className="h-16 w-16 text-muted-foreground" />
      </div>
    );
  };


  if (authLoading) {
    return (
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="container mx-auto py-10 px-4 text-center">
        <UserCircle2 className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-destructive mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-lg">Please log in to edit your profile.</p>
        <Button onClick={() => router.push('/login?redirect=/me/edit-profile')} className="mt-6">Go to Login</Button>
      </main>
    );
  }

  return (
    <>
      <main className="container mx-auto py-8 px-4 max-w-3xl">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary">Edit Profile</CardTitle>
            <CardDescription>Update your profile information below.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSaveProfile}>
            <CardContent className="space-y-8">
              {/* Cover Photo Section */}
              <div className="space-y-3">
                <Label htmlFor="cover-photo-presets" className="text-lg font-semibold flex items-center">
                  <Film className="mr-2 h-5 w-5 text-primary/80" /> Cover Photo
                </Label>
                <div className="relative w-full h-48 bg-muted rounded-lg mb-2 border border-border overflow-hidden">
                  <Image
                    src={coverArtDisplayUrl || PRESET_COVER_ART_OPTIONS.default_cover.url}
                    alt="Cover Photo Preview"
                    fill
                    style={{ objectFit: coverArtObjectFit }}
                    data-ai-hint="cover art"
                    key={coverArtDisplayUrl} // Re-render image if URL changes
                  />
                   <div className="absolute inset-0 bg-black/30 rounded-lg"></div>
                </div>
                <p className="text-sm text-muted-foreground">Choose a preset, search TMDB, or upload an image for your cover.</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-3">
                   <button
                      type="button"
                      onClick={() => handlePresetCoverSelect('default_cover')}
                      className={`h-16 sm:h-20 rounded-md overflow-hidden border-2 transition-all ${selectedPresetKeyToSave === 'default_cover' || (coverArtSource === 'default' && !selectedPresetKeyToSave) ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary/70'}`}
                      title={PRESET_COVER_ART_OPTIONS.default_cover.name}
                    >
                      <Image src={PRESET_COVER_ART_OPTIONS.default_cover.url} alt="Default Cover Art" width={120} height={80} className="w-full h-full object-cover" data-ai-hint={PRESET_COVER_ART_OPTIONS.default_cover.hint}/>
                    </button>

                  {Object.entries(PRESET_COVER_ART_OPTIONS).filter(([key]) => key !== 'default_cover').map(([key, option]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => handlePresetCoverSelect(key as keyof typeof PRESET_COVER_ART_OPTIONS)}
                      className={`h-16 sm:h-20 rounded-md overflow-hidden border-2 transition-all ${selectedPresetKeyToSave === key && coverArtSource === 'preset' ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary/70'}`}
                      title={option.name}
                    >
                      <Image src={option.url} alt={option.name} width={120} height={80} className="w-full h-full object-cover" data-ai-hint={option.hint}/>
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-3 border-t mt-3">
                  <Label htmlFor="cover-photo-file-input" className="text-xs font-medium">Or upload from device (preview only):</Label>
                   <div className={`relative flex items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/70 transition-colors ${coverArtSource === 'file' ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border bg-muted/30'}`}>
                      <Input
                      id="cover-photo-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleCoverFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      {coverFile ? (
                          <p className="text-sm text-foreground truncate px-2">{coverFile.name}</p>
                      ) : (
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                              <UploadCloud className="w-6 h-6 mb-1" />
                              <p className="text-xs">Click to upload or drag &amp; drop</p>
                          </div>
                      )}
                  </div>
                  {coverArtSource === 'file' && <p className="text-xs text-amber-600 dark:text-amber-500">Note: Uploaded file saving is not yet implemented. This is a preview only.</p>}
                </div>

                <div className="space-y-2 pt-3 border-t mt-3">
                   <Label htmlFor="tmdb-search" className="text-sm font-medium">Search TMDB for Cover Art (Movie Posters)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tmdb-search"
                      type="search"
                      placeholder="Search movie title..."
                      value={tmdbSearchTerm}
                      onChange={(e) => setTmdbSearchTerm(e.target.value)}
                      className="flex-grow"
                    />
                    <Button type="button" variant="secondary" onClick={handleTmdbSearch} disabled={isTmdbSearching}>
                      {isTmdbSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                  {tmdbSearchResults.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                      {tmdbSearchResults.map(movie => (
                        <button
                          type="button"
                          key={movie.id}
                          onClick={() => movie.posterUrl && handleTmdbPosterSelect(movie.posterUrl)}
                          className="aspect-[2/3] rounded-md overflow-hidden border-2 border-transparent hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary"
                          title={`Use poster for "${movie.title}"`}
                        >
                          <Image src={movie.posterUrl} alt={movie.title || 'Movie Poster'} width={100} height={150} className="w-full h-full object-cover" data-ai-hint="movie poster"/>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                 <Button type="button" variant="outline" size="sm" onClick={handleClearCoverArt} className="mt-2">
                    Reset Cover Art to Default
                  </Button>
              </div>

              {/* Profile Picture Section */}
              <div className="space-y-3">
                <Label htmlFor="profile-photo-file-input" className="text-lg font-semibold flex items-center">
                  <UserCircle2 className="mr-2 h-5 w-5 text-primary/80" /> Profile Picture
                </Label>
                <div className="flex items-center gap-4">
                  {renderAvatarPreview()}
                  <div className="flex-grow space-y-2">
                    <Label htmlFor="profile-photo-file-input" className="text-sm text-muted-foreground mb-1 block">
                      Upload new picture (preview only):
                    </Label>
                    <div className="relative flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/70 transition-colors bg-muted/30">
                      <Input
                        id="profile-photo-file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePicFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      {profilePicFile ? (
                        <p className="text-sm text-foreground truncate px-2">{profilePicFile.name}</p>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <UploadCloud className="w-8 h-8 mb-1" />
                          <p className="text-xs">Click or drag &amp; drop</p>
                        </div>
                      )}
                    </div>
                    {profilePicFile && <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Note: Uploaded file saving is not yet implemented. This is a preview only.</p>}
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleResetProfilePicture}
                        disabled={isSaving}
                        className="w-full"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" /> Reset to Default
                      </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Changes to display name and bio will be saved. Uploading new profile pictures for permanent storage is not yet supported. Resetting will clear any custom Firebase photo URL.
                </p>
              </div>


              {/* Display Name Section */}
              <div className="space-y-2">
                <Label htmlFor="display-name" className="text-lg font-semibold">Display Name</Label>
                <Input
                  id="display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                />
                <p className="text-xs text-muted-foreground">This name will be visible on your profile.</p>
              </div>

              {/* Bio Section */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-lg font-semibold">Bio</Label>
                <Textarea
                  id="bio"
                  value={bioContent}
                  onChange={handleBioChange}
                  placeholder="Tell us a little about yourself (max 500 characters)"
                  maxLength={500}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground text-right">{bioContent.length}/500 characters</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => router.push('/me')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Profile
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </>
  );
}

