import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal del Tutor",
};

export default function ProfesorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
