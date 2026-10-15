
import type { ReactNode } from "react";
import "./globals_updated.css";

export default function MainLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <>{children}</>;
}
