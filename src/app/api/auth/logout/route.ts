import { clearSession, sessionCookieName } from "@/lib/auth";
import { jsonOk } from "@/lib/http";

export async function POST() {
  clearSession();

  return jsonOk({
    cookie: sessionCookieName()
  });
}
