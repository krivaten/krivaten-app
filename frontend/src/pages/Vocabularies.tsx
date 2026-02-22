import { useState } from "react";
import { useVocabularies } from "@/hooks/useVocabularies";
import { State } from "@/lib/state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { Vocabulary, VocabularyType } from "@/types/vocabulary";

const VOCAB_TABS: { value: VocabularyType; label: string }[] = [
  { value: "entity_type", label: "Entity Types" },
  { value: "variable", label: "Variables" },
  { value: "unit", label: "Units" },
  { value: "edge_type", label: "Edge Types" },
  { value: "method", label: "Methods" },
  { value: "quality_flag", label: "Quality Flags" },
];

export default function Vocabularies() {
  const [activeTab, setActiveTab] = useState<VocabularyType>("entity_type");
  const [showForm, setShowForm] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingVocab, setEditingVocab] = useState<Vocabulary | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const { vocabularies, state, error, createVocabulary, updateVocabulary, deleteVocabulary } =
    useVocabularies({ type: activeTab });

  const systemVocabs = vocabularies.filter((v) => v.is_system);
  const tenantVocabs = vocabularies.filter((v) => !v.is_system);

  function startEditing(vocab: Vocabulary) {
    setEditingVocab(vocab);
    setEditName(vocab.name);
    setEditDescription(vocab.description || "");
  }

  function cancelEditing() {
    setEditingVocab(null);
    setEditName("");
    setEditDescription("");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingVocab || !editName.trim()) return;

    setSaving(true);
    try {
      await updateVocabulary(editingVocab.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      toast.success("Vocabulary updated!");
      cancelEditing();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    setCreating(true);
    try {
      await createVocabulary({
        vocabulary_type: activeTab,
        code: newCode.trim(),
        name: newName.trim(),
        description: newDescription.trim() || null,
        path: null,
        properties: {},
      });
      toast.success("Vocabulary entry created!");
      setNewCode("");
      setNewName("");
      setNewDescription("");
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteVocabulary(id);
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vocabularies</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Entry"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as VocabularyType)}>
        <TabsList>
          {VOCAB_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New {VOCAB_TABS.find((t) => t.value === activeTab)?.label.slice(0, -1)}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="vocab-code">Code</Label>
                  <Input
                    id="vocab-code"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="e.g. soil_moisture"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vocab-name">Name</Label>
                  <Input
                    id="vocab-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Soil Moisture"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vocab-desc">Description (optional)</Label>
                <Input
                  id="vocab-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief description..."
                />
              </div>
              <Button type="submit" disabled={creating || !newCode.trim() || !newName.trim()}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {(state === State.INITIAL || state === State.PENDING) && (
        <div className="text-muted-foreground py-8 text-center">Loading...</div>
      )}

      {state === State.ERROR && (
        <div className="text-destructive py-8 text-center">{error}</div>
      )}

      {systemVocabs.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">System</h2>
          <div className="grid gap-2">
            {systemVocabs.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{v.name}</span>
                  <Badge variant="secondary" className="text-xs">{v.code}</Badge>
                  <Badge variant="outline" className="text-xs">System</Badge>
                </div>
                {v.description && (
                  <span className="text-xs text-muted-foreground">{v.description}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tenantVocabs.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Custom</h2>
          <div className="grid gap-2">
            {tenantVocabs.map((v) => (
              editingVocab?.id === v.id ? (
                <Card key={v.id}>
                  <CardContent className="pt-4">
                    <form onSubmit={handleSaveEdit} className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">{v.code}</Badge>
                        <span className="text-xs text-muted-foreground">Code cannot be changed</span>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-name">Name</Label>
                        <Input
                          id="edit-name"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-desc">Description</Label>
                        <Input
                          id="edit-desc"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Brief description..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={saving || !editName.trim()}>
                          {saving ? "Saving..." : "Save"}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={cancelEditing}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <div key={v.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{v.name}</span>
                    <Badge variant="secondary" className="text-xs">{v.code}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.description && (
                      <span className="text-xs text-muted-foreground mr-2">{v.description}</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => startEditing(v)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(v.id, v.name)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {state !== State.INITIAL && state !== State.PENDING && systemVocabs.length === 0 && tenantVocabs.length === 0 && (
        <div className="text-muted-foreground py-8 text-center">
          No vocabulary entries for this type.
        </div>
      )}
    </div>
  );
}
