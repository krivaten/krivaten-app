import { useState } from "react";
import { useMetrics, useMetric } from "@/hooks/useMetrics";
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
import { MetricForm } from "@/components/metrics/MetricForm";
import { EntityTypeDefaultsDialog } from "@/components/metrics/EntityTypeDefaultsDialog";
import { toast } from "sonner";
import type { Metric, MetricCreate } from "@/types/metric";
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

function MetricDetail({
  metricId,
  onClose,
}: {
  metricId: string;
  onClose: () => void;
}) {
  const { metric } = useMetric(metricId);

  if (!metric) return null;

  const fields = (metric.fields ?? []).sort((a, b) => a.position - b.position);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{metric.name}</DialogTitle>
        </DialogHeader>
        {metric.description && (
          <p className="text-sm text-muted-foreground">{metric.description}</p>
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

export default function Metrics() {
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(
    null,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<Metric | undefined>(
    undefined,
  );
  const [deletingMetric, setDeletingMetric] = useState<Metric | null>(null);
  const [defaultsEntityTypeId, setDefaultsEntityTypeId] = useState<
    string | null
  >(null);

  const { entityTypes } = useEntityTypes();
  const { metrics, state, createMetric, updateMetric, deleteMetric } =
    useMetrics(entityTypeFilter === "all" ? undefined : entityTypeFilter);

  const tabs = [
    { value: "all", label: "All" },
    ...entityTypes.map((t) => ({ value: t.code, label: t.name })),
  ];

  const selectedEntityType =
    entityTypeFilter !== "all"
      ? entityTypes.find((t) => t.code === entityTypeFilter)
      : null;

  function handleCardClick(metric: Metric) {
    if (metric.is_system) {
      setSelectedMetricId(metric.id);
    } else {
      setEditingMetric(metric);
      setFormOpen(true);
    }
  }

  function handleCreate() {
    setEditingMetric(undefined);
    setFormOpen(true);
  }

  async function handleFormSubmit(data: MetricCreate) {
    if (editingMetric) {
      await updateMetric({ id: editingMetric.id, data });
    } else {
      await createMetric(data);
    }
  }

  async function handleDelete() {
    if (!deletingMetric) return;
    try {
      await deleteMetric(deletingMetric.id);
      toast.success("Metric deleted!");
      setDeletingMetric(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete metric",
      );
    }
  }

  return (
    <>
      <PageTitle
        title="Metrics"
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
          <Button onClick={handleCreate}>Create Metric</Button>
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
          Loading metrics...
        </div>
      )}

      {state === State.NONE && (
        <div className="text-muted-foreground py-8 text-center">
          No metrics found for this entity type.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <Card
            key={metric.id}
            className="cursor-pointer hover:border-foreground/20 transition-colors"
            onClick={() => handleCardClick(metric)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{metric.name}</CardTitle>
                <div className="flex items-center gap-1">
                  {metric.is_system ? (
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
              {metric.description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {metric.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {(metric.fields ?? [])
                    .sort((a, b) => a.position - b.position)
                    .slice(0, 4)
                    .map((f) => (
                      <Badge key={f.id} variant="outline" className="text-xs">
                        {f.name}
                      </Badge>
                    ))}
                  {(metric.fields ?? []).length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{(metric.fields ?? []).length - 4} more
                    </Badge>
                  )}
                </div>
                {!metric.is_system && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingMetric(metric);
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

      {selectedMetricId && (
        <MetricDetail
          metricId={selectedMetricId}
          onClose={() => setSelectedMetricId(null)}
        />
      )}

      <MetricForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        metric={editingMetric}
      />

      {/* Delete confirmation */}
      {deletingMetric && (
        <Dialog open onOpenChange={(open) => !open && setDeletingMetric(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Metric</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong>{deletingMetric.name}</strong>? This cannot be undone.
              Metrics with existing observations cannot be deleted.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setDeletingMetric(null)}
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
