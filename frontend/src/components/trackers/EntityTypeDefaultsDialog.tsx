import { useState, useEffect } from "react";
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
import { useEntityTypeTrackers } from "@/hooks/useEntityTypeTrackers";
import { State } from "@/lib/state";

interface Props {
  entityTypeId: string;
  entityTypeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EntityTypeDefaultsDialog({ entityTypeId, entityTypeName, open, onOpenChange }: Props) {
  const { trackers } = useTrackers();
  const { associations, state, updateAssociations } = useEntityTypeTrackers(entityTypeId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // System default tracker IDs (cannot be unchecked)
  const systemDefaultIds = new Set(
    associations.filter((a) => a.is_system_default).map((a) => a.tracker.id),
  );

  // Non-system associations (tenant-managed)
  const tenantAssociationIds = new Set(
    associations.filter((a) => !a.is_system_default).map((a) => a.tracker.id),
  );

  // Initialize selected IDs when associations load
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(tenantAssociationIds));
    }
  }, [open, state]); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function handleSave() {
    setLoading(true);
    try {
      const trackerList = Array.from(selectedIds).map((id, i) => ({
        tracker_id: id,
        position: i,
      }));
      await updateAssociations(trackerList);
      toast.success("Defaults updated!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update defaults");
    } finally {
      setLoading(false);
    }
  }

  // All trackers, excluding system defaults (those are shown separately)
  const availableTrackers = trackers.filter((t) => !systemDefaultIds.has(t.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage {entityTypeName} Defaults</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Choose which trackers are defaults for all {entityTypeName.toLowerCase()} entities.
          System defaults cannot be removed.
        </p>

        {state === State.PENDING && (
          <div className="text-muted-foreground py-4 text-center text-sm">Loading...</div>
        )}

        <div className="space-y-2 mt-2">
          {/* System defaults (read-only) */}
          {associations
            .filter((a) => a.is_system_default)
            .map((a) => (
              <div key={a.tracker.id} className="flex items-center gap-2 py-1.5 opacity-60">
                <Checkbox checked disabled />
                <Label className="text-sm">{a.tracker.name}</Label>
                <Badge variant="secondary" className="text-xs">System</Badge>
              </div>
            ))}

          {/* Available trackers (checkable) */}
          {availableTrackers.map((tracker) => (
            <div key={tracker.id} className="flex items-center gap-2 py-1.5">
              <Checkbox
                id={`default-${tracker.id}`}
                checked={selectedIds.has(tracker.id)}
                onCheckedChange={() => toggleTracker(tracker.id)}
              />
              <Label htmlFor={`default-${tracker.id}`} className="text-sm cursor-pointer">
                {tracker.name}
              </Label>
              {tracker.is_system ? (
                <Badge variant="secondary" className="text-xs">System</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">Custom</Badge>
              )}
            </div>
          ))}

          {availableTrackers.length === 0 && associations.length > 0 && (
            <p className="text-sm text-muted-foreground">
              No additional trackers available. Create a custom tracker first.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Defaults"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
