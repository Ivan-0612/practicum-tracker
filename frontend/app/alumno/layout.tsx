import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal del Alumno",
};

export default function AlumnoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
