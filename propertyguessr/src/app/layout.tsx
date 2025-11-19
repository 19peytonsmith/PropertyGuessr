import type { Metadata } from "next";
import { Lexend_Exa } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/site.css";
import "../styles/components.css";
import "../styles/main.css";
import HouseBackground from "@/components/HouseBackground";
import GridBackground from "@/components/GridBackground";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";

const lexendExa = Lexend_Exa({
  variable: "--font-lexend-exa",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PropertyGuessr",
  description: "The game where you guess the price of property listings!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${lexendExa.variable} antialiased relative`}>
        <ThemeProvider>
          <GridBackground zIndex={0} gridSize={60} skewY={15} />
          <HouseBackground
            zIndex={1}
            minSize={10}
            maxSize={1200}
            minSpeed={8}
            maxSpeed={50}
            baseOpacity={0.04}
          />
          <main className="relative z-10">{children}</main>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
