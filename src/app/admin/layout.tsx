import { AdminProvider } from "@/contexts/AdminContext";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      {children}
    </AdminProvider>
  );
}
