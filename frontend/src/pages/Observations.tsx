import { useState, useMemo } from "react";
import { useObservations } from "@/hooks/useObservations";
import { useVocabularies } from "@/hooks/useVocabularies";
import { ObservationForm } from "@/components/observations/ObservationForm";
import { Timeline } from "@/components/observations/Timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Observations() {
  const [formOpen, setFormOpen] = useState(false);
  const [variable, setVariable] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const { vocabularies: variables } = useVocabularies({ type: "variable" });

  const filters = useMemo(
    () => ({
      variable: variable || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      page,
      per_page: 30,
    }),
    [variable, fromDate, toDate, page],
  );

  const { observations, count, state, createObservation } = useObservations(filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Observations</h1>
        <Button onClick={() => setFormOpen(true)}>Log Observation</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={variable}
          onValueChange={(v) => {
            setVariable(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Variable..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Variables</SelectItem>
            {variables.map((v) => (
              <SelectItem key={v.id} value={v.code}>
                {v.name}
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
        {(variable || fromDate || toDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setVariable("");
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
        <p className="text-sm text-muted-foreground">{count} observation{count !== 1 ? "s" : ""}</p>
      )}

      <Timeline
        observations={observations}
        state={state}
        hasMore={observations.length < count}
        onLoadMore={() => setPage((p) => p + 1)}
      />

      <ObservationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={createObservation}
      />
    </div>
  );
}
