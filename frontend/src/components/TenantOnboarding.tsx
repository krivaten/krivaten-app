import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Tenant } from "@/types/tenant";

interface Props {
  onCreated: () => void;
  createTenant: (name: string) => Promise<Tenant>;
}

export function TenantOnboarding({ onCreated, createTenant }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createTenant(name.trim());
      toast.success("Space created!");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create space");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <CardHeader>
          <CardTitle>Create Your Space</CardTitle>
          <CardDescription>
            Set up a space to start tracking observations,
            entities, and relationships.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="space-name">Space Name</Label>
              <Input
                id="space-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Research Lab"
                required
              />
            </div>
            <Button type="submit" disabled={loading || !name.trim()} className="w-full">
              {loading ? "Creating..." : "Create Space"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
