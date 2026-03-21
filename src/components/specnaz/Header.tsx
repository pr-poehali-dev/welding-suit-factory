import Icon from "@/components/ui/icon";
import { NAV_LINKS } from "./constants";

interface HeaderProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  scrollTo: (href: string) => void;
}

export default function Header({ mobileMenuOpen, setMobileMenuOpen, scrollTo }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50" style={{ background: "rgba(13,17,23,0.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(245,124,0,0.2)" }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center" style={{ background: "#f57c00" }}>
            <Icon name="Flame" size={18} style={{ color: "#0d1117" }} />
          </div>
          <div className="font-bold text-lg leading-none" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00", letterSpacing: "0.1em" }}>
            СПЕЦНАЗ <span style={{ color: "#8a9ab5", fontWeight: 400, fontSize: "0.85em", letterSpacing: "0.05em" }}>Швейная фабрика</span>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="nav-link text-sm font-medium"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: "#c8bca8", background: "none", border: "none", cursor: "pointer" }}
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <button className="btn-primary px-4 py-2 text-sm" onClick={() => scrollTo("#contacts")}>
            Получить КП
          </button>
        </div>

        <button className="lg:hidden" style={{ background: "none", border: "none", color: "#e8e0d0", cursor: "pointer" }} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <Icon name={mobileMenuOpen ? "X" : "Menu"} size={24} />
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden px-4 pb-4" style={{ borderTop: "1px solid rgba(245,124,0,0.15)", background: "rgba(13,17,23,0.98)" }}>
          {NAV_LINKS.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="block w-full text-left py-3 text-sm"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: "#c8bca8", background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}
            >
              {l.label}
            </button>
          ))}
          <button className="btn-primary w-full py-3 mt-3 text-sm" onClick={() => scrollTo("#contacts")}>
            Получить КП
          </button>
        </div>
      )}
    </header>
  );
}