import Link from "next/link";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { PostHogProvider } from "@/components/PostHogProvider";
import { StoreProvider } from "@/components/StoreProvider";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
});

export const metadata = {
  title: "Forge Store",
  description: "Demo checkout app for the Production Incident Responder",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <PostHogProvider>
          <StoreProvider>
            <div className="min-h-screen">
              <Header />
              <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
              <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500">
                Simulated payments for the{" "}
                <Link href="/" className="underline">
                  Production Incident Responder
                </Link>
                .
              </footer>
            </div>
            <CartDrawer />
          </StoreProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
