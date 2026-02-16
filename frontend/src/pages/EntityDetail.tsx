import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router";
import { api } from "@/lib/api";
import { useObservations } from "@/hooks/useObservations";
import { ObservationForm } from "@/components/observations/ObservationForm";
import { Timeline } from "@/components/observations/Timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Entity, EntityType } from "@/types/entity";
import {
  ENTITY_PROPERTY_FIELDS,
  formatPropertyValue,
} from "@/config/entityPropertyFields";

const TYPE_COLORS: Record<string, string> = {
  person: "bg-blue-100 text-blue-800",
  location: "bg-green-100 text-green-800",
  plant: "bg-emerald-100 text-emerald-800",
  animal: "bg-amber-100 text-amber-800",
  project: "bg-purple-100 text-purple-800",
  equipment: "bg-slate-100 text-slate-800",
  supply: "bg-orange-100 text-orange-800",
  process: "bg-pink-100 text-pink-800",
};

export default function EntityDetail() {
  const { id } = useParams<{ id: string }>();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [entityLoading, setEntityLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { observations, count, loading: obsLoading, createObservation, refetch } =
    useObservations(id ? { entity_id: id, page, per_page: 20 } : undefined);

  const fetchEntity = useCallback(async () => {
    if (!id) return;
    try {
      setEntityLoading(true);
      const data = await api.get<Entity>(`/api/entities/${id}`);
      setEntity(data);
    } catch {
      setEntity(null);
    } finally {
      setEntityLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEntity();
  }, [fetchEntity]);

  if (entityLoading) {
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

  const properties = entity.properties && Object.keys(entity.properties).length > 0
    ? entity.properties
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{entity.name}</h1>
            <Badge variant="secondary" className={TYPE_COLORS[entity.type] || ""}>
              {entity.type}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Created {new Date(entity.created_at).toLocaleDateString()}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>Log Observation</Button>
      </div>

      {properties && (() => {
        const fieldDefs = ENTITY_PROPERTY_FIELDS[entity.type as EntityType] ?? [];
        const fieldsWithValues = fieldDefs.filter(
          (f) => properties[f.key] !== undefined && properties[f.key] !== null && properties[f.key] !== "",
        );
        return fieldsWithValues.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {fieldsWithValues.map((field) => (
                  <div key={field.key}>
                    <dt className="text-muted-foreground">{field.label}</dt>
                    <dd className="font-medium">
                      {formatPropertyValue(field, properties[field.key])}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ) : null;
      })()}

      <div>
        <h2 className="text-lg font-semibold mb-4">
          Observations {count > 0 && <span className="text-muted-foreground font-normal">({count})</span>}
        </h2>
        <Timeline
          observations={observations}
          loading={obsLoading}
          hasMore={observations.length < count}
          onLoadMore={() => setPage((p) => p + 1)}
        />
      </div>

      <ObservationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={async (obs) => {
          const result = await createObservation(obs);
          refetch();
          return result;
        }}
        defaultEntityId={id}
      />
    </div>
  );
}
