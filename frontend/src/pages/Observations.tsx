import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useObservations } from "@/hooks/useObservations";
import { useMetrics } from "@/hooks/useMetrics";
import { useEntities } from "@/hooks/useEntities";
import { ObservationForm } from "@/components/observations/ObservationForm";
import { BatchObservationForm } from "@/components/observations/BatchObservationForm";
import { Timeline } from "@/components/observations/Timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTitle } from "@/components/PageTitle";

export default function Observations() {
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [metric, setMetric] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [entityId, setEntityId] = useState("");
  const [page, setPage] = useState(1);

  const { metrics } = useMetrics();
  const { entities } = useEntities();

  const entityOptions = entities.map((e) => ({
    value: e.id,
    label: e.name,
    description: e.entity_type?.name,
  }));

  const filters = useMemo(
    () => ({
      entity_id: entityId || undefined,
      metric: metric || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      page,
      per_page: 30,
    }),
    [entityId, metric, fromDate, toDate, page],
  );

  const {
    observations,
    count,
    state,
    createObservation,
    batchCreateObservations,
    deleteObservation,
    refetch,
  } = useObservations(filters);

  return (
    <>
      <PageTitle
        title="Observations"
        description="Log and review your observations for entities."
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBatchOpen(true)}>
            Batch Log
          </Button>
          <Button onClick={() => setFormOpen(true)}>Log Observation</Button>
        </div>
      </PageTitle>

      <div className="flex flex-wrap gap-3">
        <Combobox
          options={entityOptions}
          value={entityId}
          onValueChange={(v) => {
            setEntityId(v);
            setPage(1);
          }}
          placeholder="All Entities"
          searchPlaceholder="Search entities..."
          emptyMessage="No entities found."
          className="w-[200px]"
        />
        <Select
          value={metric}
          onValueChange={(v) => {
            setMetric(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Metric..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Metrics</SelectItem>
            {metrics.map((t) => (
              <SelectItem key={t.id} value={t.code}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value);
            setPage(1);
          }}
          className="w-[160px]"
          placeholder="From..."
        />
        <Input
          type="date"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
            setPage(1);
          }}
          className="w-[160px]"
          placeholder="To..."
        />
        {(entityId || metric || fromDate || toDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEntityId("");
              setMetric("");
              setFromDate("");
              setToDate("");
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {count > 0 && (
        <p className="text-sm text-muted-foreground">
          {count} observation{count !== 1 ? "s" : ""}
        </p>
      )}

      <Timeline
        observations={observations}
        state={state}
        hasMore={observations.length < count}
        onLoadMore={() => setPage((p) => p + 1)}
        onDelete={deleteObservation}
        currentUserId={user?.id}
      />

      <ObservationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={createObservation}
      />

      <BatchObservationForm
        open={batchOpen}
        onOpenChange={setBatchOpen}
        onSuccess={() => {
          refetch();
        }}
        onBatchSubmit={batchCreateObservations}
      />
    </>
  );
}
