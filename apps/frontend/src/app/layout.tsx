import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "ENS Delegation Incentives",
  description: "Earn rewards for delegating your ENS tokens",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans text-text-primary bg-white antialiased">
        {children}
      </body>
    </html>
  );
}
