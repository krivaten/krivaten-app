import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChangeEmailFormProps {
  currentEmail: string;
}

export function ChangeEmailForm({ currentEmail }: ChangeEmailFormProps) {
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newEmail || !newEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (newEmail === currentEmail) {
      setError("New email must be different from your current email");
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Email</CardTitle>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            A confirmation link has been sent to your new email address. Please
            check your inbox to complete the change.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label>Current Email</Label>
              <p className="text-sm text-muted-foreground">{currentEmail}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@example.com"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Updating..." : "Change Email"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
