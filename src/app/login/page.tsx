
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { 
  auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithGoogle 
} from '@/services/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); 
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handleAuthSuccess = () => {
    toast({ title: isSignUp ? "Account created!" : "Signed in!", description: "Redirecting to homepage..." });
    router.push('/');
    router.refresh(); 
  };

  const handleAuthError = (errorMessage: string, defaultMessage: string) => {
    console.error("Auth error:", errorMessage);
    let displayError = defaultMessage;
    if (errorMessage.includes('auth/invalid-email')) {
      displayError = 'Invalid email format.';
    } else if (errorMessage.includes('auth/user-not-found') || errorMessage.includes('auth/wrong-password') || errorMessage.includes('auth/invalid-credential')) {
      displayError = 'Invalid email or password.';
    } else if (errorMessage.includes('auth/email-already-in-use')) {
      displayError = 'This email is already registered. Try signing in.';
    } else if (errorMessage.includes('auth/weak-password')) {
      displayError = 'Password should be at least 6 characters.';
    } else if (errorMessage.includes('auth/api-key-not-valid')) {
      displayError = 'Firebase API Key is invalid. Please check your application configuration in .env and ensure it matches your Firebase project.';
    }
    setError(displayError);
    toast({ title: "Authentication Failed", description: displayError, variant: "destructive" });
  };

  const handleEmailPasswordAuth = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      handleAuthSuccess();
    } catch (err: any) {
      handleAuthError(err.message, isSignUp ? "Could not create account." : "Could not sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    const { user, error: googleError } = await signInWithGoogle();
    if (user) {
      toast({ title: "Signed in with Google!", description: "Redirecting to homepage..." });
      router.push('/');
      router.refresh();
    } else if (googleError) {
      handleAuthError(googleError, "Google Sign-In failed.");
    }
    setIsLoading(false);
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null); 
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="fixed inset-0 z-[-1] bg-login-bg bg-cover md:bg-200% bg-no-repeat animate-pan-bg opacity-20 pointer-events-none"></div>
      
      <main className="flex-grow container mx-auto py-12 px-4 flex justify-center items-center">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-lg shadow-xl border-slate-100/25" style={{backgroundColor: 'rgb(72 57 159 / 8%)'}}>
          <CardHeader>
            <CardTitle className="text-2xl">{isSignUp ? "Create an Account" : "Sign In"}</CardTitle>
            <CardDescription>
              {isSignUp ? "Fill in the details below to create your account." : "Enter your credentials to access your account."}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleEmailPasswordAuth}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{isSignUp ? "Email" : "Email"}</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="m@example.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder={isSignUp ? "Must be at least 6 characters" : undefined}
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {password && ( // Conditionally render button if password is not empty
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  )}                </div>              </div>
              {!isSignUp && ( // Show "Forgot Password?" link only on sign-in form
             null )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (isSignUp ? 'Creating Account...' : 'Signing In...') : (isSignUp ? 'Create Account' : 'Sign In')}
              </Button>
              <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} type="button" disabled={isLoading}>
                <Image src="/google_logo.svg" alt="Google logo" width={18} height={18} className="mr-2" data-ai-hint="logo"/>
                {isLoading ? 'Processing...' : 'Sign In with Google'}
              </Button>
              <div className="mt-4 text-center text-sm">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{' '}
                <button 
                  type="button" 
                  onClick={toggleMode} 
                  className="underline text-primary hover:text-primary/80"
                  disabled={isLoading}
                >
                  {isSignUp ? "Sign In" : "Sign Up"}
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
