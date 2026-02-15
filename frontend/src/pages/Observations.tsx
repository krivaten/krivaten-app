import { useState, useMemo } from "react";
import { useObservations } from "@/hooks/useObservations";
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

const CATEGORIES = [
  "feeding",
  "sleep",
  "behavior",
  "health",
  "note",
  "soil",
  "planting",
  "harvest",
  "inventory",
  "maintenance",
];

export default function Observations() {
  const [formOpen, setFormOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      category: category || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      page,
      per_page: 30,
    }),
    [category, fromDate, toDate, page],
  );

  const { observations, count, loading, createObservation } = useObservations(filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Observations</h1>
        <Button onClick={() => setFormOpen(true)}>Log Observation</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
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
        {(category || fromDate || toDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCategory("");
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
        loading={loading}
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
