import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { State } from "@/lib/state";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantContext } from "@/contexts/TenantContext";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function ProfileEdit() {
  const { user } = useAuth();
  const { tenant, updateTenant } = useTenantContext();
  const { profile, state, error, updateProfile } = useProfile();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [savingTenant, setSavingTenant] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  useEffect(() => {
    if (tenant) {
      setTenantName(tenant.name);
    }
  }, [tenant]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        display_name: displayName,
        bio,
        avatar_url: avatarUrl ?? undefined,
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTenant = async () => {
    if (!tenantName.trim()) return;
    setSavingTenant(true);
    try {
      await updateTenant({ name: tenantName.trim() });
      toast.success("Workspace updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update workspace");
    } finally {
      setSavingTenant(false);
    }
  };

  if (state === State.INITIAL || state === State.PENDING) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  if (state === State.ERROR) {
    return <div className="text-center py-8 text-destructive">{error}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-display lowercase tracking-wider">
        Profile
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Your Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <AvatarUpload
            currentUrl={avatarUrl}
            displayName={displayName}
            onUpload={(url) => setAvatarUrl(url)}
          />
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              rows={4}
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenantName">Workspace Name</Label>
            <Input
              id="tenantName"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Workspace name"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Created {new Date(tenant.created_at).toLocaleDateString()}
          </p>
          <Button onClick={handleSaveTenant} disabled={savingTenant || !tenantName.trim()}>
            {savingTenant ? "Saving..." : "Save Workspace"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
