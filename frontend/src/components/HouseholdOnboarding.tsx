import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Household } from "@/types/household";

interface Props {
  onCreated: () => void;
  createHousehold: (name: string) => Promise<Household>;
}

export function HouseholdOnboarding({ onCreated, createHousehold }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createHousehold(name.trim());
      toast.success("Household created!");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create household");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <CardHeader>
          <CardTitle>Create Your Household</CardTitle>
          <CardDescription>
            Set up a household to start tracking your family's observations,
            entities, and resilience data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="household-name">Household Name</Label>
              <Input
                id="household-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Garcia Homestead"
                required
              />
            </div>
            <Button type="submit" disabled={loading || !name.trim()} className="w-full">
              {loading ? "Creating..." : "Create Household"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
