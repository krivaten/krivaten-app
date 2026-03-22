import { adminClient } from "../setup";

/**
 * Deletes all test data via service role (bypasses RLS).
 * Order matters due to foreign key constraints:
 * audit_log → observations → entity_metrics → relationships → entities → tenant_members → profiles → tenants → auth users
 */
export async function cleanupAllData(): Promise<void> {
  // Delete in FK-safe order
  await adminClient.from("audit_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await adminClient.from("observations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await adminClient.from("entity_metrics").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  // Delete tenant-scoped entity_type_metrics (system defaults preserved)
  await adminClient.from("entity_type_metrics").delete().not("tenant_id", "is", null);
  // Delete tenant-scoped metrics (CASCADE deletes metric_fields)
  await adminClient.from("metrics").delete().not("tenant_id", "is", null);
  await adminClient.from("relationships").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await adminClient.from("entities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await adminClient.from("tenant_members").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await adminClient.from("profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await adminClient.from("tenants").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // Delete all auth users
  const { data: users } = await adminClient.auth.admin.listUsers();
  if (users?.users) {
    for (const user of users.users) {
      await adminClient.auth.admin.deleteUser(user.id);
    }
  }
}
