import { EntityBrowser } from "@/components/entities/EntityBrowser";
import { PageTitle } from "@/components/PageTitle";

export default function Entities() {
  return (
    <>
      <PageTitle
        title="Entities"
        description="What you are tracking (e.g., people, places, or things)."
      />
      <EntityBrowser />
    </>
  );
}
