import { useState } from "react";
import { Link } from "react-router";
import { useEntities } from "@/hooks/useEntities";
import { State } from "@/lib/state";
import { EntityForm } from "./EntityForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EntityType } from "@/types/entity";

const TYPE_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "person", label: "People" },
  { value: "location", label: "Locations" },
  { value: "plant", label: "Plants" },
  { value: "animal", label: "Animals" },
  { value: "project", label: "Projects" },
  { value: "equipment", label: "Equipment" },
  { value: "supply", label: "Supplies" },
  { value: "process", label: "Processes" },
];

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

export function EntityBrowser() {
  const [activeTab, setActiveTab] = useState("all");
  const [formOpen, setFormOpen] = useState(false);

  const typeFilter = activeTab === "all" ? undefined : activeTab;
  const { entities, state, error, createEntity, archiveEntity } = useEntities(
    typeFilter ? { type: typeFilter } : undefined,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {TYPE_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button onClick={() => setFormOpen(true)}>Add Entity</Button>
      </div>

      {(state === State.INITIAL || state === State.PENDING) && (
        <div className="text-muted-foreground py-8 text-center">Loading entities...</div>
      )}

      {state === State.ERROR && (
        <div className="text-destructive py-8 text-center">{error}</div>
      )}

      {state === State.NONE && (
        <div className="text-muted-foreground py-8 text-center">
          No entities found. Create one to get started!
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entities.map((entity) => (
          <Card key={entity.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <Link to={`/entities/${entity.id}`} className="hover:underline">
                  <CardTitle className="text-base">{entity.name}</CardTitle>
                </Link>
                <Badge variant="secondary" className={TYPE_COLORS[entity.type] || ""}>
                  {entity.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(entity.created_at).toLocaleDateString()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => archiveEntity(entity.id)}
                >
                  Archive
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EntityForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={createEntity}
        initialType={typeFilter as EntityType | undefined}
      />
    </div>
  );
}
