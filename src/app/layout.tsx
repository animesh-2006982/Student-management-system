import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudentFlow — Institute Management",
  description: "Student, attendance, fees and institute management system."
};

export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
