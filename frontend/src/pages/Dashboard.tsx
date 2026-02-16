import { useState } from "react";
import { useHouseholdContext } from "@/contexts/HouseholdContext";
import { useEntities } from "@/hooks/useEntities";
import { useObservations } from "@/hooks/useObservations";
import { QuickLog } from "@/components/observations/QuickLog";
import { Timeline } from "@/components/observations/Timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ENTITY_TYPE_LABELS: Record<string, string> = {
  person: "People",
  location: "Locations",
  plant: "Plants",
  animal: "Animals",
  project: "Projects",
  equipment: "Equipment",
  supply: "Supplies",
  process: "Processes",
};

export default function Dashboard() {
  const { household } = useHouseholdContext();
  const { entities } = useEntities();
  const [page] = useState(1);
  const { observations, count, state: obsState, createObservation } = useObservations({
    page,
    per_page: 10,
  });

  const typeCounts = entities.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display lowercase tracking-wider mb-1">
          {household.name}
        </h1>
        <p className="text-muted-foreground">
          {entities.length} {entities.length === 1 ? "entity" : "entities"} tracked
        </p>
      </div>

      {Object.keys(typeCounts).length > 0 && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {Object.entries(typeCounts).map(([type, count]) => (
            <Card key={type}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs text-muted-foreground font-normal">
                  {ENTITY_TYPE_LABELS[type] || type}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold">{count}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <QuickLog onSubmit={createObservation} />
        </div>
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Recent Observations</h2>
          <Timeline
            observations={observations}
            state={obsState}
            hasMore={observations.length < count}
            onLoadMore={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
