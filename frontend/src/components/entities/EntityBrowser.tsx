import { useState } from "react";
import { Link } from "react-router";
import { useEntities } from "@/hooks/useEntities";
import { useVocabularies } from "@/hooks/useVocabularies";
import { State } from "@/lib/state";
import { EntityForm } from "./EntityForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLOR_PALETTE = [
  "bg-blue-100 text-blue-800",
  "bg-green-100 text-green-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-purple-100 text-purple-800",
  "bg-slate-100 text-slate-800",
  "bg-orange-100 text-orange-800",
  "bg-pink-100 text-pink-800",
  "bg-rose-100 text-rose-800",
  "bg-cyan-100 text-cyan-800",
];

export function EntityBrowser() {
  const [activeTab, setActiveTab] = useState("all");
  const [formOpen, setFormOpen] = useState(false);

  const { vocabularies: entityTypes } = useVocabularies({ type: "entity_type" });

  const typeFilter = activeTab === "all" ? undefined : activeTab;
  const { entities, state, error, createEntity, archiveEntity } = useEntities(
    typeFilter ? { type: typeFilter } : undefined,
  );

  const tabs = [
    { value: "all", label: "All" },
    ...entityTypes.map((v) => ({ value: v.code, label: v.name })),
  ];

  const colorMap = new Map<string, string>();
  entityTypes.forEach((v, i) => {
    colorMap.set(v.code, COLOR_PALETTE[i % COLOR_PALETTE.length]);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {tabs.map((tab) => (
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
        {entities.map((entity) => {
          const typeCode = entity.entity_type?.code || "";
          return (
            <Card key={entity.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <Link to={`/entities/${entity.id}`} className="hover:underline">
                    <CardTitle className="text-base">{entity.name}</CardTitle>
                  </Link>
                  <Badge variant="secondary" className={colorMap.get(typeCode) || ""}>
                    {entity.entity_type?.name || typeCode}
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
          );
        })}
      </div>

      <EntityForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={createEntity}
        initialTypeCode={typeFilter}
      />
    </div>
  );
}
