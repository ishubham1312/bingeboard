
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { SearchIcon, List, X, UserCircle2, Settings, LogIn, LogOut, RefreshCw, ListPlus } from 'lucide-react'; // Added ListPlus
import { Input } from '@/components/ui/input'; 
import { Button } from '@/components/ui/button'; // Added usePathname
import { useRouter } from 'next/navigation'; // Added usePathname
import { type FormEvent, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from '@/hooks/use-toast';
import { CreateListDialog } from '@/components/list/CreateListDialog';
import { usePathname } from 'next/navigation';

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


export function Header() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { user, loading } = useAuth(); // Removed signOutUser as it's handled in settings/profile
  const [isMounted, setIsMounted] = useState(false); // This ensures the component is mounted before rendering auth details
  const { toast } = useToast();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isSearchVisible && searchInputRef.current) {
      // Add a slight delay to ensure the element is fully rendered and focusable
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isSearchVisible]);

  const pathname = usePathname(); // Use usePathname hook
  const isLoginPage = pathname === '/login'; // Check if the current path is '/login'



  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (window.innerWidth < 768) { 
        setIsSearchVisible(false);
      }
    }
  };

  const renderAuthSection = () => {
    if (!isMounted || loading) {
      return <Skeleton className="h-9 w-9 rounded-full" />;
    }

    if (user) {
      return (
         <Link href="/me" passHref legacyBehavior>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0" aria-label="My Profile and Lists">
              <Avatar className="h-9 w-9 border-2 border-primary/30">
                <AvatarImage 
                  src={user.photoURL || undefined}
                  alt={user.displayName || user.email || "User Avatar"}
                  data-ai-hint="user avatar"
                  className="object-cover"
                />
                <AvatarFallback email={user.email}>
                  {user.displayName ? getInitials(user.displayName, user.email) : null}
                </AvatarFallback>
              </Avatar>
            </Button>
          </Link>
      );} else {
      return (
        // Render Login button only if not on the login page
        !isLoginPage && (

        <Link href="/login" passHref legacyBehavior>
          <Button variant="ghost" size="sm" className="text-sm">
            <LogIn className="mr-1.5 h-4 w-4" /> Login
          </Button>
        </Link>
      )
      );
    }
  };
  
  const searchBarForm = (
    <form
      onSubmit={handleSearchSubmit}
      className="flex flex-grow items-center gap-2 relative" 
    >
      <div className="relative flex-grow">
        <Input
          ref={searchInputRef}
          type="search"
          placeholder="Search movies, shows..."
          className="h-9 w-full bg-background/80 focus:ring-accent pr-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus={isSearchVisible && window.innerWidth < 768}
        />
        <Button 
          type="submit" 
          variant="ghost" 
          size="icon" 
          aria-label="Submit search" 
          className="absolute right-0 top-0 h-9 w-9 hover:bg-transparent"
        >
          <SearchIcon className="h-4 w-4" />
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Close search"
        onClick={() => {
          setIsSearchVisible(false);
          setSearchQuery('');
        }}
        className="h-9 w-9 flex-shrink-0"
      >
        <X className="h-5 w-5" />
      </Button>
    </form>
  );

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/75 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center mx-auto px-4">
          <Link href="/" className="mr-3 sm:mr-4 md:mr-6 flex items-center space-x-2 group">
            <Image
              src="/logo.png"
              alt="BingeBoard Logo"
              width={32}
              height={32}
              className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary transition-transform group-hover:scale-110"
              data-ai-hint="logo popcorn"
            />
            <span className="font-bold text-md sm:text-lg md:text-xl text-foreground sm:inline-block whitespace-nowrap">
              BingeBoard
            </span>
          </Link>

          {/* Desktop Search - Inline */}

          <div className="hidden md:flex flex-1 items-center justify-end space-x-2">
            {!isLoginPage && (
              <>
                {!isSearchVisible ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open search"
                    onClick={() => setIsSearchVisible(true)}
                    className="h-9 w-9"
                  >
                    <SearchIcon className="h-5 w-5" />
                  </Button>
                ) : (
                  <div className="flex-grow max-w-xs sm:max-w-sm md:max-w-md ml-auto"> {/* Removed relative */}
                    {searchBarForm}
                    {/* The external absolute desktop close button is removed from here */}
                  </div>
                )}
                {!isSearchVisible && renderAuthSection()}
                {isSearchVisible && (
                  <div className="ml-2">{renderAuthSection()}</div>
                )}
              </>
            )}
          </div>

          {/* Mobile Search Icon & Auth Section */}
          <div className="flex md:hidden flex-1 items-center justify-end space-x-2">
            {!isLoginPage && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Toggle search" // Changed label for clarity on mobile
                onClick={() => setIsSearchVisible(prev => !prev)}
                className="h-9 w-9"
              >
                {isSearchVisible ? <X className="h-5 w-5" /> : <SearchIcon className="h-5 w-5" />}
              </Button>
            )}
            {!isSearchVisible && !isLoginPage && renderAuthSection()}
          </div>
        </div>
        
        {isSearchVisible && window.innerWidth < 768 && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-background p-3 shadow-md border-b z-40">
            {searchBarForm}
          </div>
        )}
      </header>
      <CreateListDialog
        isOpen={isCreateListDialogOpen}
        onClose={() => setIsCreateListDialogOpen(false)}
        onListCreated={(newList) => {
          toast({ title: "List Created!", description: `"${newList.name}" has been created.` });
          setIsCreateListDialogOpen(false);
          router.push('/me'); 
        }}
      />
    </>
  );
}
