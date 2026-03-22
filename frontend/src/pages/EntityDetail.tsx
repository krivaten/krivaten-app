import { useState } from "react";
import { useParams, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { State } from "@/lib/state";
import { getQuerySingleState } from "@/lib/queryState";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/contexts/AuthContext";
import { useObservations } from "@/hooks/useObservations";
import { useRelationships } from "@/hooks/useRelationships";
import { useEntityMetrics } from "@/hooks/useEntityMetrics";
import { useRelatedEntities } from "@/hooks/useRelatedEntities";
import { EntityForm } from "@/components/entities/EntityForm";
import { RelationshipForm } from "@/components/relationships/RelationshipForm";
import { ObservationForm } from "@/components/observations/ObservationForm";
import { AddMetricToEntityDialog } from "@/components/metrics/AddMetricToEntityDialog";
import { Timeline } from "@/components/observations/Timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Entity, EntityCreate } from "@/types/entity";
import type { Relationship } from "@/types/relationship";

export default function EntityDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [relFormOpen, setRelFormOpen] = useState(false);
  const [editingRelationship, setEditingRelationship] =
    useState<Relationship | null>(null);
  const [page, setPage] = useState(1);
  const [addMetricOpen, setAddMetricOpen] = useState(false);

  const entityQuery = useQuery({
    queryKey: queryKeys.entities.detail(id!),
    queryFn: () => api.get<Entity>(`/api/v1/entities/${id}`),
    enabled: !!id,
  });

  const entityState = getQuerySingleState(entityQuery);
  const entity = entityQuery.data ?? null;

  const updateEntityMutation = useMutation({
    mutationFn: (updates: EntityCreate) =>
      api.put<Entity>(`/api/v1/entities/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.entities.detail(id!),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.entities.all() });
    },
  });

  const {
    observations,
    count,
    state: obsState,
    createObservation,
    deleteObservation,
  } = useObservations(id ? { entity_id: id, page, per_page: 20 } : undefined);

  const {
    relationships,
    createRelationship,
    updateRelationship,
    deleteRelationship,
  } = useRelationships(id);

  const { metrics: entityMetrics, updateMetrics } = useEntityMetrics(
    id ?? "",
  );

  const { relatedEntities } = useRelatedEntities(id ?? "");

  if (entityState === State.PENDING) {
    return (
      <div className="text-muted-foreground py-8 text-center">Loading...</div>
    );
  }

  if (!entity) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground mb-4">Entity not found.</p>
        <Link to="/entities" className="text-sm underline">
          Back to Entities
        </Link>
      </div>
    );
  }

  const attributes =
    entity.attributes && Object.keys(entity.attributes).length > 0
      ? entity.attributes
      : null;

  async function handleDeleteRelationship(relId: string) {
    if (!confirm("Remove this connection?")) return;
    try {
      await deleteRelationship(relId);
      toast.success("Connection removed");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove connection",
      );
    }
  }

  async function handleToggleMetric(metricId: string, isEnabled: boolean) {
    try {
      await updateMetrics([{ metric_id: metricId, is_enabled: isEnabled }]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update metric",
      );
    }
  }

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{entity.name}</h1>
            <Badge variant="secondary">
              {entity.entity_type?.name || "Unknown"}
            </Badge>
          </div>
          {entity.description && (
            <p className="text-sm text-muted-foreground mb-1">
              {entity.description}
            </p>
          )}
          {entity.external_id && (
            <p className="text-xs text-muted-foreground mb-1">
              ID: {entity.external_id}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Created {new Date(entity.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button onClick={() => setFormOpen(true)}>Log Observation</Button>
        </div>
      </div>

      {attributes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attributes</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {Object.entries(attributes).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="font-medium">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Metrics</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddMetricOpen(true)}
            >
              Add Metric
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {entityMetrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No metrics configured. Click "Add Metric" to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {entityMetrics.map((em) => (
                <div
                  key={em.metric.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">{em.metric.name}</Label>
                    {em.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                  <Switch
                    checked={em.is_enabled}
                    onCheckedChange={(checked) =>
                      handleToggleMetric(em.metric.id, checked)
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Connections{" "}
              {relationships.length > 0 && (
                <span className="text-muted-foreground font-normal">
                  ({relationships.length})
                </span>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRelFormOpen(true)}
            >
              Add Connection
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {relationships.length === 0 ? (
            <p className="text-sm text-muted-foreground">No connections yet.</p>
          ) : (
            <div className="space-y-2">
              {relationships.map((rel) => {
                const isSource = rel.source_id === id;
                const related = isSource ? rel.target : rel.source;
                const direction = isSource ? "\u2192" : "\u2190";
                return (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {rel.type}
                      </Badge>
                      <span>{direction}</span>
                      {related ? (
                        <Link
                          to={`/entities/${related.id}`}
                          className="hover:underline"
                        >
                          {related.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                      {rel.label && (
                        <span className="text-xs text-muted-foreground">
                          ({rel.label})
                        </span>
                      )}
                      {rel.valid_from && (
                        <span className="text-xs text-muted-foreground">
                          from {new Date(rel.valid_from).toLocaleDateString()}
                        </span>
                      )}
                      {rel.valid_to && (
                        <span className="text-xs text-muted-foreground">
                          until {new Date(rel.valid_to).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-xs text-muted-foreground"
                        onClick={() => setEditingRelationship(rel)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteRelationship(rel.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {relatedEntities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Related Entities{" "}
              <span className="text-muted-foreground font-normal">
                ({relatedEntities.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relatedEntities.map((rel) => (
                <div
                  key={`${rel.entity_id}-${rel.relationship_id}`}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {rel.entity_type}
                    </Badge>
                    <Link
                      to={`/entities/${rel.entity_id}`}
                      className="hover:underline"
                    >
                      {rel.entity_name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{rel.relationship_type}</span>
                    <span>
                      {rel.direction === "outgoing" ? "\u2192" : "\u2190"}
                    </span>
                    {rel.depth > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        depth {rel.depth}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">
          Observations{" "}
          {count > 0 && (
            <span className="text-muted-foreground font-normal">({count})</span>
          )}
        </h2>
        <Timeline
          observations={observations}
          state={obsState}
          hasMore={observations.length < count}
          onLoadMore={() => setPage((p) => p + 1)}
          onDelete={deleteObservation}
          currentUserId={user?.id}
        />
      </div>

      <EntityForm
        open={editOpen}
        onOpenChange={setEditOpen}
        entity={entity}
        onSubmit={async (updates: EntityCreate) => {
          return updateEntityMutation.mutateAsync(updates);
        }}
      />

      <RelationshipForm
        open={relFormOpen}
        onOpenChange={setRelFormOpen}
        onSubmit={createRelationship}
        sourceEntityId={id!}
        sourceEntityName={entity.name}
      />

      {editingRelationship && (
        <RelationshipForm
          open={!!editingRelationship}
          onOpenChange={(open) => {
            if (!open) setEditingRelationship(null);
          }}
          onSubmit={async (data) => {
            await updateRelationship({
              id: editingRelationship.id,
              updates: {
                target_id: data.target_id,
                type: data.type,
                label: data.label,
                weight: data.weight,
                valid_from: data.valid_from,
                valid_to: data.valid_to,
              },
            });
          }}
          sourceEntityId={id!}
          sourceEntityName={entity.name}
          relationship={editingRelationship}
        />
      )}

      <ObservationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={async (obs) => {
          return createObservation(obs);
        }}
        defaultEntityId={id}
      />

      <AddMetricToEntityDialog
        entityId={id!}
        currentMetricIds={new Set(entityMetrics.map((em) => em.metric.id))}
        open={addMetricOpen}
        onOpenChange={setAddMetricOpen}
        onAdd={async (metricIds) => {
          const overrides = metricIds.map((metric_id) => ({
            metric_id,
            is_enabled: true,
          }));
          await updateMetrics(overrides);
        }}
      />
    </>
  );
}
