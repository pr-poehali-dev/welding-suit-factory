import Icon from "@/components/ui/icon";

interface AdminHeaderProps {
  section: string;
  onLogout?: () => void;
}

export default function AdminHeader({ section, onLogout }: AdminHeaderProps) {
  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    window.location.reload();
  };

  return (
    <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(245,124,0,0.2)", background: "#080c11" }}>
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 flex items-center justify-center" style={{ background: "#f57c00" }}>
          <Icon name="Flame" size={14} style={{ color: "#0d1117" }} />
        </div>
        <span className="font-bold tracking-widest uppercase" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>СПЕЦНАЗ</span>
        <span className="text-sm" style={{ color: "#8a9ab5" }}>/ {section}</span>
      </div>
      <div className="flex items-center gap-4">
        <a href="/admin" className="text-sm flex items-center gap-1" style={{ color: "#8a9ab5" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#f57c00")} onMouseLeave={e => (e.currentTarget.style.color = "#8a9ab5")}>
          <Icon name="Package" size={14} /> Товары
        </a>
        <a href="/admin/seo" className="text-sm flex items-center gap-1" style={{ color: "#8a9ab5" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#f57c00")} onMouseLeave={e => (e.currentTarget.style.color = "#8a9ab5")}>
          <Icon name="Search" size={14} /> SEO
        </a>
        <a href="/admin/payments" className="text-sm flex items-center gap-1" style={{ color: "#8a9ab5" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#f57c00")} onMouseLeave={e => (e.currentTarget.style.color = "#8a9ab5")}>
          <Icon name="Calculator" size={14} /> Оплата
        </a>
        <a href="/admin/promo" className="text-sm flex items-center gap-1" style={{ color: "#8a9ab5" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#f57c00")} onMouseLeave={e => (e.currentTarget.style.color = "#8a9ab5")}>
          <Icon name="Send" size={14} /> Рассылка
        </a>
        <button onClick={onLogout || handleLogout} className="text-sm flex items-center gap-1" style={{ background: "none", border: "none", cursor: "pointer", color: "#8a9ab5" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#f87171")} onMouseLeave={e => (e.currentTarget.style.color = "#8a9ab5")}>
          <Icon name="LogOut" size={14} /> Выйти
        </button>
        <a href="/" className="text-sm flex items-center gap-1" style={{ color: "#8a9ab5" }}>
          <Icon name="ArrowLeft" size={14} /> На сайт
        </a>
      </div>
    </div>
  );
}