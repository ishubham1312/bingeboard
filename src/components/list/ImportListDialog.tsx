
"use client";

import { useState, type ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { importListFromJSON, type UserList } from '@/services/watchedItemsService';
import { UploadCloud } from 'lucide-react';

interface ImportListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onListImported: (importedList: UserList) => void;
}

export function ImportListDialog({ isOpen, onClose, onListImported }: ImportListDialogProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [newListName, setNewListName] = useState('');
  const [error, setError] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/json") {
        setSelectedFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            setJsonInput(content);
            setError(''); 
          } catch (readError) {
            console.error("Error reading file content:", readError);
            setError("Could not read file content. Please ensure it's a valid JSON file.");
            setSelectedFileName(null);
            setJsonInput('');
            toast({ title: "File Read Error", description: "Could not read the selected file.", variant: "destructive" });
          }
        };
        reader.onerror = () => {
            setError("Error reading the selected file.");
            setSelectedFileName(null);
            setJsonInput('');
            toast({ title: "File Read Error", description: "An error occurred while reading the file.", variant: "destructive" });
        }
        reader.readAsText(file);
      } else {
        setError("Invalid file type. Please select a .json file.");
        setSelectedFileName(null);
        event.target.value = ''; // Clear the file input
        toast({ title: "Invalid File", description: "Please select a valid .json file.", variant: "destructive" });
      }
    } else {
        setSelectedFileName(null);
    }
  };

  const handleImport = () => {
    if (!jsonInput.trim()) {
      setError('Please paste the JSON data for the list or upload a JSON file.');
      return;
    }
    setError('');

    const result = importListFromJSON(jsonInput.trim(), newListName.trim());

    if (result.list) {
      onListImported(result.list);
      setJsonInput(''); 
      setNewListName('');
      setSelectedFileName(null);
      onClose(); 
    } else if (result.error) {
      setError(result.error);
      toast({ title: "Import Failed", description: result.error, variant: "destructive" });
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setJsonInput('');
        setNewListName('');
        setSelectedFileName(null);
        setError('');
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import List from JSON</DialogTitle>
          <DialogDescription>
            Upload a .json file or paste JSON data directly into the textarea.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="list-json-file-input" className="text-sm font-medium mb-1 block">
              Upload .json File
            </Label>
            <div className="relative flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:border-primary/70 transition-colors">
                <Input
                id="list-json-file-input"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {selectedFileName ? (
                    <p className="text-sm text-foreground truncate px-2">{selectedFileName}</p>
                ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <UploadCloud className="w-8 h-8 mb-1" />
                        <p className="text-xs">Click to upload or drag & drop</p>
                        <p className="text-xs">(.json files only)</p>
                    </div>
                )}
            </div>
          </div>

          <div>
            <Label htmlFor="list-json-input" className="text-sm font-medium">
              Or Paste List JSON Data
            </Label>
            <Textarea
              id="list-json-input"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={6}
              placeholder="Paste the JSON data of the list you want to import here..."
              className="mt-1 w-full min-h-[100px] text-xs bg-muted/50 border-border focus-visible:ring-primary"
              aria-label="Paste List JSON Data"
            />
          </div>
          
          <div>
            <Label htmlFor="new-list-name-import" className="text-sm font-medium">
              Name for Imported List (Optional)
            </Label>
            <Input
              id="new-list-name-import"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="mt-1"
              placeholder="Defaults to 'Imported: [Original Name]'"
              aria-label="Name for imported list"
            />
             <p className="text-xs text-muted-foreground mt-1">If blank, uses "Imported: \[Original Name]".</p>
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleImport}>Import List</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
