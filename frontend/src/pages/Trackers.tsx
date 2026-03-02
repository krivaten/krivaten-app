import { useState } from "react";
import { useTrackers, useTracker } from "@/hooks/useTrackers";
import { useEntityTypes } from "@/hooks/useEntityTypes";
import { State } from "@/lib/state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  number: "Number",
  boolean: "Yes/No",
  single_select: "Select",
  multi_select: "Multi-Select",
  textarea: "Text Area",
  datetime: "Date/Time",
};

function TrackerDetail({ trackerId, onClose }: { trackerId: string; onClose: () => void }) {
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
  const [selectedTrackerId, setSelectedTrackerId] = useState<string | null>(null);

  const { entityTypes } = useEntityTypes();
  const { trackers, state } = useTrackers(
    entityTypeFilter === "all" ? undefined : entityTypeFilter,
  );

  const tabs = [
    { value: "all", label: "All" },
    ...entityTypes.map((t) => ({ value: t.code, label: t.name })),
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trackers</h1>

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
            onClick={() => setSelectedTrackerId(tracker.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{tracker.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {tracker.description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {tracker.description}
                </p>
              )}
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
    </div>
  );
}
