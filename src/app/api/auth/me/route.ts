import { getCurrentUser } from "@/lib/auth";
import { serializeUserPermissions } from "@/lib/authorization";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("未登录", 401);
  }

  return jsonOk({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      ...(await serializeUserPermissions(user))
    }
  });
}
