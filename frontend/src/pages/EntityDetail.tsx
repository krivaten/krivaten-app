import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router";
import { api } from "@/lib/api";
import { State, getSingleState } from "@/lib/state";
import { useAuth } from "@/contexts/AuthContext";
import { useObservations } from "@/hooks/useObservations";
import { useEdges } from "@/hooks/useEdges";
import { EntityForm } from "@/components/entities/EntityForm";
import { EdgeForm } from "@/components/edges/EdgeForm";
import { ObservationForm } from "@/components/observations/ObservationForm";
import { Timeline } from "@/components/observations/Timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { Entity, EntityCreate } from "@/types/entity";

export default function EntityDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [entityState, setEntityState] = useState<State>(State.INITIAL);
  const [formOpen, setFormOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [edgeFormOpen, setEdgeFormOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { observations, count, state: obsState, createObservation, deleteObservation, refetch } =
    useObservations(id ? { subject_id: id, page, per_page: 20 } : undefined);

  const { edges, createEdge, deleteEdge } = useEdges(id);

  const fetchEntity = useCallback(async () => {
    if (!id) return;
    try {
      setEntityState(State.PENDING);
      const data = await api.get<Entity>(`/api/v1/entities/${id}`);
      setEntity(data);
      setEntityState(getSingleState(data));
    } catch {
      setEntity(null);
      setEntityState(State.NONE);
    }
  }, [id]);

  useEffect(() => {
    fetchEntity();
  }, [fetchEntity]);

  if (entityState === State.INITIAL || entityState === State.PENDING) {
    return <div className="text-muted-foreground py-8 text-center">Loading...</div>;
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

  const attributes = entity.attributes && Object.keys(entity.attributes).length > 0
    ? entity.attributes
    : null;

  async function handleDeleteEdge(edgeId: string) {
    if (!confirm("Remove this connection?")) return;
    try {
      await deleteEdge(edgeId);
      toast.success("Connection removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove connection");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{entity.name}</h1>
            <Badge variant="secondary">
              {entity.entity_type?.name || "Unknown"}
            </Badge>
          </div>
          {entity.description && (
            <p className="text-sm text-muted-foreground mb-1">{entity.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Created {new Date(entity.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>Edit</Button>
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
            <CardTitle className="text-base">
              Connections {edges.length > 0 && <span className="text-muted-foreground font-normal">({edges.length})</span>}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEdgeFormOpen(true)}>
              Add Connection
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {edges.length === 0 ? (
            <p className="text-sm text-muted-foreground">No connections yet.</p>
          ) : (
            <div className="space-y-2">
              {edges.map((edge) => {
                const isSource = edge.source_id === id;
                const related = isSource ? edge.target : edge.source;
                const direction = isSource ? "\u2192" : "\u2190";
                return (
                  <div key={edge.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{edge.edge_type}</Badge>
                      <span>{direction}</span>
                      {related ? (
                        <Link to={`/entities/${related.id}`} className="hover:underline">
                          {related.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                      {edge.label && (
                        <span className="text-xs text-muted-foreground">({edge.label})</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteEdge(edge.id)}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">
          Observations {count > 0 && <span className="text-muted-foreground font-normal">({count})</span>}
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
          const data = await api.put<Entity>(`/api/v1/entities/${id}`, updates);
          await fetchEntity();
          return data;
        }}
      />

      <EdgeForm
        open={edgeFormOpen}
        onOpenChange={setEdgeFormOpen}
        onSubmit={createEdge}
        sourceEntityId={id!}
        sourceEntityName={entity.name}
      />

      <ObservationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={async (obs) => {
          const result = await createObservation(obs);
          refetch();
          return result;
        }}
        defaultSubjectId={id}
      />
    </div>
  );
}
