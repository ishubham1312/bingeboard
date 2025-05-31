
"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent, useActionState } from 'react'; // Changed import
// import { useFormState, useFormStatus } from 'react-dom'; // Removed useFormState
import { useFormStatus } from 'react-dom'; // Kept useFormStatus
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, Mail, MessageSquare as MessageSquareIcon, Paperclip, ImagePlus, X } from 'lucide-react';
import { sendFeedbackAction } from './actions';

const initialState = {
  message: '',
  success: false,
  error: null,
  fieldErrors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Sending...
        </>
      ) : (
        <>
          <Send className="mr-2 h-4 w-4" /> Send Feedback
        </>
      )}
    </Button>
  );
}

export default function FeedbackPage() {
  const router = useRouter();
  const { toast } = useToast();
  // Updated to useActionState from 'react'
  const [formState, formAction] = useActionState(sendFeedbackAction, initialState);
  
  const [feedbackText, setFeedbackText] = useState('');
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (formState.message) {
      if (formState.success) {
        toast({
          title: "Feedback Submitted",
          description: formState.message,
        });
        setFeedbackText('');
        setAttachedImage(null);
        setImagePreviewUrl(null);
        const fileInput = document.getElementById('feedback-image') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        toast({
          title: "Submission Error",
          description: formState.error || formState.message || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    }
  }, [formState, toast]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Image Too Large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        event.target.value = ''; 
        return;
      }
      setAttachedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAttachedImage(null);
      setImagePreviewUrl(null);
    }
  };

  const handleRemoveImage = () => {
    setAttachedImage(null);
    setImagePreviewUrl(null);
    const fileInput = document.getElementById('feedback-image') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = ''; 
    }
  };

  const handleFormSubmitClientValidation = (event: FormEvent<HTMLFormElement>) => {
    const currentFeedbackText = (event.currentTarget.elements.namedItem('feedbackText') as HTMLTextAreaElement)?.value;
    if (!currentFeedbackText || !currentFeedbackText.trim()) {
      event.preventDefault(); 
      toast({
        title: "Feedback Empty",
        description: "Please enter your feedback before sending.",
        variant: "destructive",
      });
      return;
    }
  };


  return (
    <main className="container mx-auto py-8 px-4 max-w-2xl">
      <Button variant="outline" size="sm" onClick={() => router.push('/settings')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Settings
      </Button>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Submit Your Feedback</CardTitle>
          <CardDescription>We appreciate your thoughts on how we can improve BingeBoard. The feedback will be logged server-side.</CardDescription>
        </CardHeader>
        <form action={formAction} onSubmit={handleFormSubmitClientValidation}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="feedback-text">Your Feedback</Label>
              <Textarea
                id="feedback-text"
                name="feedbackText"
                value={feedbackText} 
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Tell us what you think..."
                rows={6}
                className="bg-background/70 focus:ring-accent"
              />
              {formState.fieldErrors?.feedbackText && (
                <p className="text-sm text-destructive">{formState.fieldErrors.feedbackText.join(', ')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-image">Attach an Image (Optional, max 5MB)</Label>
              <div className="relative flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:border-primary/70 transition-colors">
                <Input
                  id="feedback-image"
                  name="attachedImage" 
                  type="file"
                  accept="image/png, image/jpeg, image/gif, image/webp"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {!imagePreviewUrl && (
                  <div className="flex flex-col items-center justify-center text-muted-foreground pointer-events-none">
                    <ImagePlus className="w-10 h-10 mb-2" />
                    <p className="text-sm">Click to upload or drag & drop</p>
                    <p className="text-xs">PNG, JPG, GIF, WEBP up to 5MB</p>
                  </div>
                )}
                 {imagePreviewUrl && (
                    <div className="relative w-full h-full p-1">
                        <Image
                        src={imagePreviewUrl}
                        alt="Image preview"
                        fill
                        style={{ objectFit: 'contain' }}
                        className="rounded-md"
                        data-ai-hint="feedback attachment"
                        />
                        <Button
                            type="button" 
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 z-10"
                            onClick={handleRemoveImage}
                            title="Remove image"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
              </div>
              {attachedImage && <p className="text-xs text-muted-foreground">Selected: {attachedImage.name} ({(attachedImage.size / 1024 / 1024).toFixed(2)} MB)</p>}
            </div>
          </CardContent>
          <CardFooter>
            <SubmitButton />
          </CardFooter>
        </form>
      </Card>

      <Card className="mt-8 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Contact Developer</CardTitle>
          <CardDescription>For direct inquiries or urgent matters, you can reach out via:</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-row items-center justify-around gap-4">
          <a
            href="https://wa.me/+919170003039" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 w-full"
            aria-label="Contact on WhatsApp"
          >
            <Button variant="ghost" className="w-full py-6 text-base hover:bg-green-500/10 flex items-center justify-center">
              <Image
                src="/whatsapp.png"
                alt= "Whatsapp Logo"
                width={36}
                height={36}
                className="mr-0" 
                data-ai-hint="logo social"
                />
            </Button>
          </a>
          <a
            href="mailto:ishubham1312@gmail.com" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 w-full"
            aria-label="Contact via Gmail"
          >
            <Button variant="ghost" className="w-full py-6 text-base hover:bg-red-500/10 flex items-center justify-center">
              <Image
                src="/gmail.png" 
                alt="Gmail Logo"
                width={36}
                height={36}
                className="mr-0" 
                data-ai-hint="logo email"
                />
            </Button>
          </a>
        </CardContent>
      </Card>
    </main>
  );
}
