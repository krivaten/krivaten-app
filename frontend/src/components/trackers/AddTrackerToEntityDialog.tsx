import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTrackers } from "@/hooks/useTrackers";

interface Props {
  entityId: string;
  currentTrackerIds: Set<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (trackerIds: string[]) => Promise<void>;
}

export function AddTrackerToEntityDialog({ currentTrackerIds, open, onOpenChange, onAdd }: Props) {
  const { trackers } = useTrackers();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const availableTrackers = trackers.filter((t) => !currentTrackerIds.has(t.id));

  function toggleTracker(trackerId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackerId)) {
        next.delete(trackerId);
      } else {
        next.add(trackerId);
      }
      return next;
    });
  }

  async function handleAdd() {
    if (selectedIds.size === 0) return;
    setLoading(true);
    try {
      await onAdd(Array.from(selectedIds));
      toast.success("Trackers added!");
      setSelectedIds(new Set());
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add trackers");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Tracker</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Select trackers to enable for this entity.
        </p>

        <div className="space-y-2 mt-2">
          {availableTrackers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All available trackers are already added to this entity.
            </p>
          ) : (
            availableTrackers.map((tracker) => (
              <div key={tracker.id} className="flex items-center gap-2 py-1.5">
                <Checkbox
                  id={`add-tracker-${tracker.id}`}
                  checked={selectedIds.has(tracker.id)}
                  onCheckedChange={() => toggleTracker(tracker.id)}
                />
                <Label htmlFor={`add-tracker-${tracker.id}`} className="text-sm cursor-pointer flex-1">
                  {tracker.name}
                </Label>
                {tracker.is_system ? (
                  <Badge variant="secondary" className="text-xs">System</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Custom</Badge>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={loading || selectedIds.size === 0}>
            {loading ? "Adding..." : "Add Selected"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
