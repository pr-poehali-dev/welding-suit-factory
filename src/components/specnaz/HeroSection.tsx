import { HERO_IMAGE, FACTORY_IMAGE } from "./constants";

interface HeroSectionProps {
  scrollTo: (href: string) => void;
}

export default function HeroSection({ scrollTo }: HeroSectionProps) {
  return (
    <>
      {/* HERO */}
      <section className="relative flex items-center min-h-screen pt-16" style={{ overflow: "hidden" }}>
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="Сварщик" className="w-full h-full object-cover" style={{ opacity: 0.55 }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0d1117 40%, rgba(13,17,23,0.6) 100%)" }} />
          <div className="absolute inset-0" style={{
            backgroundImage: "linear-gradient(rgba(245,124,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(245,124,0,0.04) 1px, transparent 1px)",
            backgroundSize: "60px 60px"
          }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6 animate-fade-up">
              <div style={{ width: 40, height: 2, background: "#f57c00" }} />
              <span className="text-sm font-medium tracking-widest uppercase" style={{ color: "#f57c00", fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Производство с 2012 года
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-up-delay-1 leading-none" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
              СПЕЦОДЕЖДА<br /><span style={{ color: "#f57c00" }}>ДЛЯ ПРОФИ</span>
            </h1>
            <p className="text-lg md:text-xl mb-8 animate-fade-up-delay-2 max-w-xl" style={{ color: "#8a9ab5", lineHeight: 1.7 }}>
              Костюмы сварщика и спецодежда по ГОСТ. Производство полного цикла, собственный пошив. Оптовые поставки от 50 единиц.
            </p>
            <div className="flex flex-wrap gap-4 animate-fade-up-delay-3">
              <button className="btn-primary px-8 py-4 text-base" onClick={() => scrollTo("#catalog")}>Смотреть каталог</button>
              <button className="btn-outline px-8 py-4 text-base" onClick={() => scrollTo("#calculator")}>Рассчитать стоимость</button>
            </div>
            <div className="flex flex-wrap gap-8 mt-16 animate-fade-up-delay-4">
              {[{ val: "13+", label: "лет на рынке" }, { val: "1 200", label: "единиц в сутки" }, { val: "500+", label: "клиентов" }, { val: "18 ГОСТов", label: "сертифицировано" }].map((s) => (
                <div key={s.val}>
                  <div className="text-3xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>{s.val}</div>
                  <div className="text-sm mt-1" style={{ color: "#8a9ab5" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: "linear-gradient(transparent, #0d1117)" }} />
      </section>

      {/* О ФАБРИКЕ */}
      <section id="about" className="py-24" style={{ background: "#0d1117" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div style={{ width: 32, height: 2, background: "#f57c00" }} />
                <span className="text-sm tracking-widest uppercase" style={{ color: "#f57c00" }}>О фабрике</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
                КАЧЕСТВО —<br />НАШ СТАНДАРТ
              </h2>
              <p className="mb-5 leading-relaxed" style={{ color: "#8a9ab5" }}>
                «СпецНаз» — швейная фабрика полного производственного цикла. Мы специализируемся на выпуске костюмов сварщика и спецодежды для промышленных предприятий России и стран СНГ.
              </p>
              <p className="mb-8 leading-relaxed" style={{ color: "#8a9ab5" }}>
                Собственные пошивочные цеха площадью 4 500 м², современное оборудование и опытный персонал позволяют выпускать до 1 200 изделий в сутки.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: "✓", text: "Собственное производство" },
                  { icon: "✓", text: "Сертификаты ГОСТ" },
                  { icon: "✓", text: "Отсрочка платежа" },
                  { icon: "✓", text: "Доставка по России и СНГ" },
                ].map((f) => (
                  <div key={f.text} className="flex items-center gap-2">
                    <span style={{ color: "#f57c00", fontWeight: 700 }}>{f.icon}</span>
                    <span className="text-sm" style={{ color: "#c8bca8" }}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <img src={FACTORY_IMAGE} alt="Производство" className="w-full rounded" style={{ aspectRatio: "4/3", objectFit: "cover", border: "1px solid rgba(245,124,0,0.2)" }} />
              <div className="absolute -bottom-4 -left-4 p-4 rounded" style={{ background: "#f57c00", color: "#0d1117" }}>
                <div className="text-3xl font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>2012</div>
                <div className="text-xs font-semibold uppercase tracking-wide">год основания</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}