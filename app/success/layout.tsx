import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You’re in • Hottest 100 in Figtree",
};

export default function SuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}