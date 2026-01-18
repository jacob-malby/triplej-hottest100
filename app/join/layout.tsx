import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join the Party • Hottest 100 in Figtree",
};

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}