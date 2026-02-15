import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function OAuthButtons() {
  const { signInWithGoogle, signInWithGitHub } = useAuth();

  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        variant="outline"
        type="button"
        onClick={() => signInWithGoogle()}
      >
        Google
      </Button>
      <Button
        variant="outline"
        type="button"
        onClick={() => signInWithGitHub()}
      >
        GitHub
      </Button>
    </div>
  );
}
