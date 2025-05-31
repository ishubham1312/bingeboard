
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, UserCircle2, LogOut, Palette, Info, MessageSquareText } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";

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


export default function SettingsPage() {
  const { user, loading, signOutUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/settings");
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    await signOutUser();
    toast({ title: "Signed Out", description: "You have been successfully signed out." });
    router.push('/');
  };

  const handleAppVersionClick = () => {
    toast({
      title: "App Version",
      description: "BingeBoard v1.0.0 (Placeholder)", // You can update this version as needed
    });
  };


  if (loading) {
    return (
      <main className="container mx-auto py-8 px-4 max-w-md">
        <div className="flex items-center mb-8">
          <Skeleton className="h-24 w-24 rounded-full mr-6" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg mt-6" />
        </div>
      </main>
    );
  }

  if (!user) {
     return (
      <main className="container mx-auto py-10 sm:py-12 px-4 text-center">
        <UserCircle2 className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl sm:text-3xl font-bold text-destructive mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-base sm:text-lg mb-6">Please log in to view settings.</p>
        <Button onClick={() => router.push("/login?redirect=/settings")}>Go to Login</Button>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-8 px-4 max-w-md">
      <div className="flex items-center mb-10">
        <Avatar className="h-24 w-24 mr-6 border-2 border-primary/50">
          <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User Avatar"} data-ai-hint="user avatar" />
          <AvatarFallback className="text-3xl">{getInitials(user.displayName, user.email)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold text-foreground">
            {user.displayName || "User"}
          </h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="space-y-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start py-6 text-base bg-card hover:bg-muted/50"
            >
              <Palette className="mr-3 h-5 w-5 text-primary/80" />
              Theme
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Select Theme</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setTheme("light")}>
              Light Mode
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTheme("dark")}>
              Dark Mode
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTheme("system")}>
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link href="/feedback" passHref legacyBehavior>
          <Button
            variant="outline"
            className="w-full justify-start py-6 text-base bg-card hover:bg-muted/50"
            asChild={false} // Ensure this is a button that Link wraps
          >
            <MessageSquareText className="mr-3 h-5 w-5 text-primary/80" />
            Submit Feedback
          </Button>
        </Link>

        <Button
          variant="outline"
          className="w-full justify-between py-6 text-base bg-card hover:bg-muted/50"
          onClick={handleAppVersionClick}
        >
          <div className="flex items-center">
            <Info className="mr-3 h-5 w-5 text-primary/80" />
            App Version
          </div>
           <span className="text-sm text-muted-foreground">1.0.0</span>
        </Button>
      </div>

      <Button
        variant="destructive"
        className="w-full mt-10 py-6 text-base"
        onClick={handleSignOut}
      >
        <LogOut className="mr-3 h-5 w-5" />
        Sign Out
      </Button>
    </main>
  );
}
