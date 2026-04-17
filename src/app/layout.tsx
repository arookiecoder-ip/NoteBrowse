import "./globals.css";
import { Inter, Space_Grotesk } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata = {
  title: "NoteBrowse",
  description: "Secure, link-bound private notebook storage.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <header className="nb-header">
          <a href="/" className="nb-logo">
            <span className="nb-logo__icon">N</span>
            NoteBrowse
          </a>
          <nav className="nb-header__nav">
            <a href="/notebook/new" className="nb-btn nb-btn--ghost">Create</a>
            <a href="/notebook/unlock" className="nb-btn nb-btn--ghost">Unlock</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
