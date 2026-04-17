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
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</main>
        <footer className="nb-footer">
          <div className="nb-footer__links">
            <a href="https://github.com/arookiecoder-ip" target="_blank" rel="noopener noreferrer" className="nb-footer__link">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
              arookiecoder-ip
            </a>
          </div>
          <span>Last Patched: Fri, 17 Apr 2026 15:49 IST</span>
        </footer>
      </body>
    </html>
  );
}
