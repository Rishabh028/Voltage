import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  // For demo purposes, we might bypass auth if environment variables aren't set
  // In production, uncomment the redirect:
  // if (!session) {
  //   redirect("/login");
  // }

  return <AppShell>{children}</AppShell>;
}
