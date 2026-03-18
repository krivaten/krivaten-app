import { useState } from "react";
import { useTrackers, useTracker } from "@/hooks/useTrackers";
import { useEntityTypes } from "@/hooks/useEntityTypes";
import { State } from "@/lib/state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrackerForm } from "@/components/trackers/TrackerForm";
import { EntityTypeDefaultsDialog } from "@/components/trackers/EntityTypeDefaultsDialog";
import { toast } from "sonner";
import type { Tracker, TrackerCreate } from "@/types/tracker";
import { PageTitle } from "@/components/PageTitle";

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  number: "Number",
  boolean: "Yes/No",
  single_select: "Select",
  multi_select: "Multi-Select",
  textarea: "Text Area",
  datetime: "Date/Time",
};

function TrackerDetail({
  trackerId,
  onClose,
}: {
  trackerId: string;
  onClose: () => void;
}) {
  const { tracker } = useTracker(trackerId);

  if (!tracker) return null;

  const fields = (tracker.fields ?? []).sort((a, b) => a.position - b.position);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tracker.name}</DialogTitle>
        </DialogHeader>
        {tracker.description && (
          <p className="text-sm text-muted-foreground">{tracker.description}</p>
        )}
        <div className="space-y-3 mt-2">
          <h3 className="text-sm font-medium">Fields</h3>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fields defined.</p>
          ) : (
            <div className="space-y-2">
              {fields.map((field) => (
                <div key={field.id} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{field.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}
                    </Badge>
                    {field.is_required && (
                      <Badge variant="secondary" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  {field.options && field.options.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {field.options.map((opt) => (
                        <span
                          key={opt.value}
                          className="text-xs bg-muted px-1.5 py-0.5 rounded"
                        >
                          {opt.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Trackers() {
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [selectedTrackerId, setSelectedTrackerId] = useState<string | null>(
    null,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingTracker, setEditingTracker] = useState<Tracker | undefined>(
    undefined,
  );
  const [deletingTracker, setDeletingTracker] = useState<Tracker | null>(null);
  const [defaultsEntityTypeId, setDefaultsEntityTypeId] = useState<
    string | null
  >(null);

  const { entityTypes } = useEntityTypes();
  const { trackers, state, createTracker, updateTracker, deleteTracker } =
    useTrackers(entityTypeFilter === "all" ? undefined : entityTypeFilter);

  const tabs = [
    { value: "all", label: "All" },
    ...entityTypes.map((t) => ({ value: t.code, label: t.name })),
  ];

  const selectedEntityType =
    entityTypeFilter !== "all"
      ? entityTypes.find((t) => t.code === entityTypeFilter)
      : null;

  function handleCardClick(tracker: Tracker) {
    if (tracker.is_system) {
      setSelectedTrackerId(tracker.id);
    } else {
      setEditingTracker(tracker);
      setFormOpen(true);
    }
  }

  function handleCreate() {
    setEditingTracker(undefined);
    setFormOpen(true);
  }

  async function handleFormSubmit(data: TrackerCreate) {
    if (editingTracker) {
      await updateTracker({ id: editingTracker.id, data });
    } else {
      await createTracker(data);
    }
  }

  async function handleDelete() {
    if (!deletingTracker) return;
    try {
      await deleteTracker(deletingTracker.id);
      toast.success("Tracker deleted!");
      setDeletingTracker(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete tracker",
      );
    }
  }

  return (
    <>
      <PageTitle
        title="Trackers"
        description="Types of observations you can log for your entities."
      >
        <div className="flex gap-2">
          {selectedEntityType && (
            <Button
              variant="outline"
              onClick={() => setDefaultsEntityTypeId(selectedEntityType.id)}
            >
              Manage Defaults
            </Button>
          )}
          <Button onClick={handleCreate}>Create Tracker</Button>
        </div>
      </PageTitle>

      <Tabs value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {(state === State.INITIAL || state === State.PENDING) && (
        <div className="text-muted-foreground py-8 text-center">
          Loading trackers...
        </div>
      )}

      {state === State.NONE && (
        <div className="text-muted-foreground py-8 text-center">
          No trackers found for this entity type.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trackers.map((tracker) => (
          <Card
            key={tracker.id}
            className="cursor-pointer hover:border-foreground/20 transition-colors"
            onClick={() => handleCardClick(tracker)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{tracker.name}</CardTitle>
                <div className="flex items-center gap-1">
                  {tracker.is_system ? (
                    <Badge variant="secondary" className="text-xs">
                      System
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Custom
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {tracker.description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {tracker.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {(tracker.fields ?? [])
                    .sort((a, b) => a.position - b.position)
                    .slice(0, 4)
                    .map((f) => (
                      <Badge key={f.id} variant="outline" className="text-xs">
                        {f.name}
                      </Badge>
                    ))}
                  {(tracker.fields ?? []).length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{(tracker.fields ?? []).length - 4} more
                    </Badge>
                  )}
                </div>
                {!tracker.is_system && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingTracker(tracker);
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTrackerId && (
        <TrackerDetail
          trackerId={selectedTrackerId}
          onClose={() => setSelectedTrackerId(null)}
        />
      )}

      <TrackerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        tracker={editingTracker}
      />

      {/* Delete confirmation */}
      {deletingTracker && (
        <Dialog open onOpenChange={(open) => !open && setDeletingTracker(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Tracker</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong>{deletingTracker.name}</strong>? This cannot be undone.
              Trackers with existing observations cannot be deleted.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setDeletingTracker(null)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Entity type defaults dialog */}
      {defaultsEntityTypeId && selectedEntityType && (
        <EntityTypeDefaultsDialog
          entityTypeId={defaultsEntityTypeId}
          entityTypeName={selectedEntityType.name}
          open={!!defaultsEntityTypeId}
          onOpenChange={(open) => !open && setDefaultsEntityTypeId(null)}
        />
      )}
    </>
  );
}
