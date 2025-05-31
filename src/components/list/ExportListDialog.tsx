
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
    if (navigator.share) {
      try {
        await navigator.share({
          title: `BingeBoard List: ${listName}`,
          text: `Check out my BingeBoard list "${listName}"!\n\n${listJSON}`,
          // files: [new File([listJSON], `${listName}_export.json`, { type: 'application/json' })], // File sharing can be complex
        });
        toast({ title: "Shared!", description: "List data sent to share dialog." });
      } catch (err: any) {
        if (err.name !== 'AbortError') { // Ignore if user cancels share
          console.error("Failed to share list JSON:", err);
          toast({ title: "Share Failed", description: err.message || "Could not share data.", variant: "destructive" });
        }
      }
    } else {
      toast({ title: "Web Share Not Supported", description: "Your browser doesn't support the Web Share API.", variant: "default" });
    }
  };


  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export List: {listName}</DialogTitle>
          <DialogDescription>
            Share your list by copying the JSON, downloading it as a file, or using your device's share options.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Textarea
            value={listJSON}
            readOnly
            rows={8}
            className="w-full min-h-[120px] text-xs bg-muted/50 border-border focus-visible:ring-primary"
            aria-label="List JSON data for export"
          />
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2 pt-4 border-t">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={handleCopyToClipboard}
              variant={isCopied ? "secondary" : "outline"}
              className="w-full sm:flex-1"
            >
              <Copy className="mr-2 h-4 w-4" />
              {isCopied ? "Copied!" : "Copy JSON"}
            </Button>
            <Button
              onClick={handleDownloadJSON}
              variant="outline"
              className="w-full sm:flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              Download File
            </Button>
             {canShare && (
              <Button
                onClick={handleWebShare}
                variant="outline"
                className="w-full sm:flex-1"
              >
                <ShareIcon className="mr-2 h-4 w-4" />
                Share List
              </Button>
            )}
          </div>
          <DialogClose asChild>
            <Button type="button" variant="default" className="w-full sm:w-auto">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
