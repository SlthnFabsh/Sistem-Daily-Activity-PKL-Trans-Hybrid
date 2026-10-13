import { redirect } from "next/navigation";
import { homePathForRole, requireUser } from "@/lib/permissions";

export default async function HomePage() {
  const user = await requireUser();
  redirect(homePathForRole(user.role));
}