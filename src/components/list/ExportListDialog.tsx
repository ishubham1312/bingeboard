
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { Copy, Download, Share2 as ShareIcon } from 'lucide-react'; // Renamed Share2 to ShareIcon

interface ExportListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  listName: string;
  listJSON: string;
}

export function ExportListDialog({ isOpen, onClose, listName, listJSON }: ExportListDialogProps) {
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsCopied(false); // Reset copied state when dialog opens
      setCanShare(typeof navigator !== "undefined" && !!navigator.share);
    }
  }, [isOpen]);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(listJSON);
      setIsCopied(true);
      toast({ title: "Copied to Clipboard!", description: "The list data has been copied." });
      setTimeout(() => setIsCopied(false), 2000); 
    } catch (err) {
      console.error("Failed to copy list JSON:", err);
      toast({ title: "Copy Failed", description: "Could not copy data. Please copy manually.", variant: "destructive" });
    }
  };

  const handleDownloadJSON = () => {
    try {
      const blob = new Blob([listJSON], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeListName = listName.replace(/[^a-z0-9_]+/gi, '_').toLowerCase();
      a.download = `${safeListName}_bboard_export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Download Started", description: `File ${a.download} should be downloading.` });
    } catch (err) {
      console.error("Failed to download list JSON:", err);
      toast({ title: "Download Failed", description: "Could not prepare file for download.", variant: "destructive" });
    }
  };

  const handleWebShare = async () => {
    try {
      // First, check if the Web Share API is available
      if (!navigator.share) {
        throw new Error('Web Share API not supported');
      }

      // Create a blob URL for the file
      const blob = new Blob([listJSON], { type: 'application/json' });
      const safeListName = listName.replace(/[^a-z0-9_]+/gi, '_').toLowerCase();
      const fileName = `${safeListName}_bboard_export.json`;
      const dataUrl = URL.createObjectURL(blob);
      
      // Try to share with a data URL first (most compatible)
      try {
        await navigator.share({
          title: `BingeBoard List: ${listName}`,
          text: `Check out my BingeBoard list`,
          url: dataUrl
        });
      } catch (shareError) {
        // If sharing with URL fails, try sharing as a file if possible
        if (navigator.canShare && navigator.canShare({ files: [] })) {
          const file = new File([blob], fileName, { type: 'application/json' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `BingeBoard List: ${listName}`,
              text: `Check out my BingeBoard list`,
              files: [file]
            });
          } else {
            throw new Error('File sharing not permitted');
          }
        } else {
          throw shareError;
        }
      }
      
      // Clean up the URL object after sharing
      setTimeout(() => URL.revokeObjectURL(dataUrl), 1000);
      
      toast({ 
        title: "Shared!", 
        description: "List shared successfully.",
        duration: 3000
      });
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled the share
        return;
      }
      
      console.warn("Sharing not available:", err.message);
      
      // Fall back to download
      toast({ 
        title: "Opening share dialog", 
        description: "If share dialog doesn't appear, the file will download automatically.",
        duration: 3000
      });
      
      // Give the share dialog a moment to appear
      setTimeout(() => {
        handleDownloadJSON();
      }, 1000);
    }
  };


  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export List: {listName}</DialogTitle>
          <DialogDescription className="pt-2">
            Choose how you'd like to export your list
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <Button
            onClick={handleCopyToClipboard}
            variant="outline"
            className="w-full justify-start py-6 text-base"
          >
            <Copy className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Copy to Clipboard</div>
              <div className="text-xs text-muted-foreground">Copy the list data to your clipboard</div>
            </div>
          </Button>
          
          <Button
            onClick={handleDownloadJSON}
            variant="outline"
            className="w-full justify-start py-6 text-base"
          >
            <Download className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Download as File</div>
              <div className="text-xs text-muted-foreground">Save as a JSON file to your device</div>
            </div>
          </Button>
          
          {canShare && (
            <Button
              onClick={handleWebShare}
              variant="outline"
              className="w-full justify-start py-6 text-base"
            >
              <ShareIcon className="mr-3 h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Share List</div>
                <div className="text-xs text-muted-foreground">Share using your device's share options</div>
              </div>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
