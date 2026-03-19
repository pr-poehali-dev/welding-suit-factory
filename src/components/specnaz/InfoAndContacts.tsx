import Icon from "@/components/ui/icon";
import { NAV_LINKS, CERTS, DELIVERY_ZONES } from "./constants";

interface InfoAndContactsProps {
  scrollTo: (href: string) => void;
}

export default function InfoAndContacts({ scrollTo }: InfoAndContactsProps) {
  return (
    <>
      {/* ПРОИЗВОДСТВО */}
      <section id="production" className="py-24" style={{ background: "#0d1117" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: 32, height: 2, background: "#f57c00" }} />
            <span className="text-sm tracking-widest uppercase" style={{ color: "#f57c00" }}>Производство</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-16" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
            КАК МЫ РАБОТАЕМ
          </h2>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              {[
                { n: "01", title: "Раскрой ткани", desc: "Автоматизированные раскройные комплексы. Точность ±1 мм. Минимум отходов." },
                { n: "02", title: "Пошив изделий", desc: "50 промышленных машин. Специальные швы для защитной одежды согласно ГОСТ." },
                { n: "03", title: "Контроль качества", desc: "Многоступенчатая проверка на каждом этапе. ОТК с 25-летним опытом." },
                { n: "04", title: "Маркировка и упаковка", desc: "Индивидуальная упаковка, штрих-коды, паспорт изделия, сертификаты." },
              ].map((step, i) => (
                <div key={step.n} className="flex gap-6 pb-8 relative" style={{ paddingLeft: 52 }}>
                  {i < 3 && <div className="absolute left-5 top-10 bottom-0 w-px" style={{ background: "rgba(245,124,0,0.2)" }} />}
                  <div className="absolute left-0 top-0 w-10 h-10 flex items-center justify-center text-sm font-bold" style={{ background: "#f57c00", color: "#0d1117", fontFamily: "'Oswald', sans-serif", borderRadius: 2 }}>
                    {step.n}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>{step.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#8a9ab5" }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: "Scissors", title: "4 500 м²", desc: "Площадь цехов" },
                { icon: "Zap", title: "1 200 шт", desc: "Изделий в сутки" },
                { icon: "Settings", title: "50+", desc: "Единиц оборудования" },
                { icon: "Clock", title: "21 день", desc: "Стандартный срок" },
              ].map((s) => (
                <div key={s.title} className="p-6 rounded text-center" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.1)" }}>
                  <Icon name={s.icon} size={28} style={{ color: "#f57c00", margin: "0 auto 12px" }} />
                  <div className="text-2xl font-bold mb-1" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>{s.title}</div>
                  <div className="text-xs" style={{ color: "#8a9ab5" }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* СЕРТИФИКАТЫ */}
      <section id="certificates" className="py-24" style={{ background: "#0a0e14" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div style={{ width: 32, height: 2, background: "#f57c00" }} />
              <span className="text-sm tracking-widest uppercase" style={{ color: "#f57c00" }}>Соответствие стандартам</span>
              <div style={{ width: 32, height: 2, background: "#f57c00" }} />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
              СЕРТИФИКАТЫ И ГОСТ
            </h2>
            <p style={{ color: "#8a9ab5" }}>Вся продукция сертифицирована и соответствует российским и международным стандартам</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {CERTS.map((c) => (
              <div key={c.title} className="p-6 rounded text-center" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.1)" }}>
                <div className="w-14 h-14 rounded flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(245,124,0,0.1)" }}>
                  <Icon name={c.icon} size={28} style={{ color: "#f57c00" }} />
                </div>
                <div className="font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff", fontSize: 15 }}>{c.title}</div>
                <div className="text-sm" style={{ color: "#8a9ab5" }}>{c.desc}</div>
              </div>
            ))}
          </div>

          <div className="p-6 rounded flex flex-wrap items-center gap-4 justify-between" style={{ background: "rgba(245,124,0,0.08)", border: "1px solid rgba(245,124,0,0.25)" }}>
            <div className="flex items-center gap-4">
              <Icon name="FileText" size={32} style={{ color: "#f57c00" }} />
              <div>
                <div className="font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>Полный пакет документов</div>
                <div className="text-sm" style={{ color: "#8a9ab5" }}>Сертификаты, декларации соответствия, паспорта изделий — прилагаются к каждой партии</div>
              </div>
            </div>
            <button className="btn-outline px-6 py-3 text-sm whitespace-nowrap" onClick={() => scrollTo("#contacts")}>
              Запросить документы
            </button>
          </div>
        </div>
      </section>

      {/* ДОСТАВКА */}
      <section id="delivery" className="py-24" style={{ background: "#0d1117" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: 32, height: 2, background: "#f57c00" }} />
            <span className="text-sm tracking-widest uppercase" style={{ color: "#f57c00" }}>Логистика</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
            УСЛОВИЯ ДОСТАВКИ
          </h2>
          <p className="mb-12 max-w-xl" style={{ color: "#8a9ab5" }}>
            Работаем с ведущими транспортными компаниями. Самовывоз из Москвы. Возможна доставка силами заказчика.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {DELIVERY_ZONES.map((z) => (
              <div key={z.zone} className="p-6 rounded" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.1)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="MapPin" size={16} style={{ color: "#f57c00" }} />
                  <span className="font-bold text-sm" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>{z.zone}</span>
                </div>
                <div className="text-2xl font-bold mb-1" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>{z.days}</div>
                <div className="text-xs" style={{ color: "#8a9ab5" }}>{z.cost}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "Package", title: "Упаковка", desc: "Полиэтиленовые пакеты + картонные коробки. Каждое изделие упаковано индивидуально." },
              { icon: "ClipboardCheck", title: "Сопроводительные документы", desc: "Накладная, счёт-фактура, сертификаты соответствия прилагаются к каждой отгрузке." },
              { icon: "RefreshCw", title: "Возврат и замена", desc: "Гарантия качества 12 месяцев. Брак заменяем в течение 10 рабочих дней." },
            ].map((f) => (
              <div key={f.title} className="flex gap-4 p-5 rounded" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.1)" }}>
                <div className="w-10 h-10 flex items-center justify-center rounded flex-shrink-0" style={{ background: "rgba(245,124,0,0.1)" }}>
                  <Icon name={f.icon} size={20} style={{ color: "#f57c00" }} />
                </div>
                <div>
                  <div className="font-bold mb-1" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>{f.title}</div>
                  <div className="text-sm leading-relaxed" style={{ color: "#8a9ab5" }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* КОНТАКТЫ */}
      <section id="contacts" className="py-24" style={{ background: "#0a0e14" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div style={{ width: 32, height: 2, background: "#f57c00" }} />
                <span className="text-sm tracking-widest uppercase" style={{ color: "#f57c00" }}>Связаться с нами</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
                ЗАПРОСИТЬ<br />КОММЕРЧЕСКОЕ<br />ПРЕДЛОЖЕНИЕ
              </h2>
              <p className="mb-8 leading-relaxed" style={{ color: "#8a9ab5" }}>
                Оставьте заявку — наш менеджер свяжется с вами в течение 2 часов. Подготовим КП с точными ценами, сроками и условиями доставки.
              </p>

              <div className="space-y-4">
                {[
                  { icon: "Phone", label: "Телефон", val: "8-930-885-25-55", href: "tel:+79308852555" },
                  { icon: "Mail", label: "Email", val: "s9308852555@yandex.ru", href: "mailto:s9308852555@yandex.ru" },
                  { icon: "MapPin", label: "Офис и склад", val: "г. Москва, ул. Амурская, 15/1", href: null },
                  { icon: "Clock", label: "Режим работы", val: "Пн–Пт: 9:00–18:00", href: null },
                ].map((c) => (
                  <div key={c.label} className="flex items-start gap-4">
                    <div className="w-10 h-10 flex items-center justify-center rounded flex-shrink-0" style={{ background: "rgba(245,124,0,0.1)" }}>
                      <Icon name={c.icon} size={18} style={{ color: "#f57c00" }} />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "#8a9ab5" }}>{c.label}</div>
                      {c.href ? (
                        <a href={c.href} className="font-medium hover:underline" style={{ color: "#e8e0d0" }}>{c.val}</a>
                      ) : (
                        <span className="font-medium" style={{ color: "#e8e0d0" }}>{c.val}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded p-8" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.2)" }}>
              <h3 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
                ЗАЯВКА НА КП
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Наименование организации</label>
                  <input type="text" placeholder="ООО «Металлургический завод»" className="w-full px-4 py-3 rounded text-sm" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif" }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Контактное лицо</label>
                    <input type="text" placeholder="Иван Иванов" className="w-full px-4 py-3 rounded text-sm" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif" }} />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Телефон</label>
                    <input type="tel" placeholder="+7 (___) ___-__-__" className="w-full px-4 py-3 rounded text-sm" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif" }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Что требуется</label>
                  <textarea rows={3} placeholder="Укажите наименование, количество, требования к изделиям..." className="w-full px-4 py-3 rounded text-sm resize-none" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif" }} />
                </div>
                <button className="btn-primary w-full py-4 text-base mt-2">
                  Отправить заявку
                </button>
                <p className="text-xs text-center" style={{ color: "#8a9ab5" }}>
                  Нажимая кнопку, вы соглашаетесь с политикой обработки персональных данных
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8" style={{ background: "#080c11", borderTop: "1px solid rgba(245,124,0,0.15)" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center" style={{ background: "#f57c00" }}>
              <Icon name="Flame" size={14} style={{ color: "#0d1117" }} />
            </div>
            <span className="font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00", letterSpacing: "0.1em" }}>СПЕЦНАЗ</span>
            <span className="text-sm" style={{ color: "#8a9ab5" }}>© 2024. Все права защищены</span>
          </div>
          <div className="flex flex-wrap gap-6">
            {NAV_LINKS.map((l) => (
              <button key={l.href} onClick={() => scrollTo(l.href)} className="text-sm" style={{ color: "#8a9ab5", background: "none", border: "none", cursor: "pointer" }}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}