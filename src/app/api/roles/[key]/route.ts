import {
  deleteCustomRole,
  RoleMutationError
} from "@/features/auth/role-service";
import { requirePermission } from "@/lib/authorization";
import { jsonError, jsonOk } from "@/lib/http";

type RouteContext = {
  params: {
    key: string;
  };
};

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authorization = await requirePermission("manage_users");

  if (!authorization.ok) {
    return authorization.response;
  }

  try {
    const role = await deleteCustomRole(decodeURIComponent(params.key));

    return jsonOk({ role });
  } catch (error) {
    if (error instanceof RoleMutationError) {
      return jsonError(error.message, error.status);
    }

    throw error;
  }
}
