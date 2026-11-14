import { ProfileForm } from "@/components/profile-form";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const u = await requireUser();
  return <ProfileForm user={{ username: u.username, role: u.role, firstName: u.firstName, lastName: u.lastName, birthDate: u.birthDate, avatar: u.avatar }} />;
}
