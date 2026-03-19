import { useState } from "react";
import Icon from "@/components/ui/icon";
import { NAV_LINKS, CERTS, DELIVERY_ZONES } from "./constants";

const SEND_API = "https://functions.poehali.dev/7b81d36e-be04-4b5e-828d-eab1f6a6a992";

interface InfoAndContactsProps {
  scrollTo: (href: string) => void;
}

export default function InfoAndContacts({ scrollTo }: InfoAndContactsProps) {
  const [org, setOrg] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!phone.trim()) { setError("Укажите телефон для связи"); return; }
    setSending(true);
    setError("");
    try {
      await fetch(SEND_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "contact", org, contact, phone, email, message }),
      });
      setSent(true);
    } catch {
      setError("Ошибка отправки. Позвоните нам напрямую.");
    }
    setSending(false);
  };

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
                  { icon: "Clock", label: "Режим работы", val: "Пн–Пт: 10:00–17:00", href: null },
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

              {sent ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)" }}>
                    <Icon name="CheckCircle" size={32} style={{ color: "#4ade80" }} />
                  </div>
                  <div className="text-xl font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>Заявка отправлена!</div>
                  <div className="text-sm mb-6" style={{ color: "#8a9ab5" }}>Наш менеджер свяжется с вами в течение 2 часов</div>
                  <button onClick={() => { setSent(false); setOrg(""); setContact(""); setPhone(""); setEmail(""); setMessage(""); }}
                    className="text-sm px-4 py-2 rounded" style={{ background: "rgba(245,124,0,0.1)", border: "1px solid rgba(245,124,0,0.3)", color: "#f57c00", cursor: "pointer" }}>
                    Отправить ещё одну
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Наименование организации</label>
                    <input type="text" value={org} onChange={e => setOrg(e.target.value)} placeholder="ООО «Металлургический завод»" className="w-full px-4 py-3 rounded text-sm" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif" }} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Контактное лицо</label>
                      <input type="text" value={contact} onChange={e => setContact(e.target.value)} placeholder="Иван Иванов" className="w-full px-4 py-3 rounded text-sm" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif" }} />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Телефон *</label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" className="w-full px-4 py-3 rounded text-sm" style={{ background: "#0d1117", border: `1px solid ${error ? "rgba(248,113,113,0.5)" : "rgba(245,124,0,0.2)"}`, color: "#e8e0d0", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif" }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>E-mail *</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@company.ru" className="w-full px-4 py-3 rounded text-sm" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif" }} />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: "#8a9ab5", fontFamily: "'Oswald', sans-serif" }}>Что требуется</label>
                    <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Укажите наименование, количество, требования к изделиям..." className="w-full px-4 py-3 rounded text-sm resize-none" style={{ background: "#0d1117", border: "1px solid rgba(245,124,0,0.2)", color: "#e8e0d0", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif" }} />
                  </div>
                  {error && <div className="text-sm text-center" style={{ color: "#f87171" }}>{error}</div>}
                  <button onClick={handleSubmit} disabled={sending} className="btn-primary w-full py-4 text-base mt-2" style={{ opacity: sending ? 0.7 : 1, cursor: sending ? "default" : "pointer" }}>
                    {sending ? "Отправляем..." : "Отправить заявку"}
                  </button>
                  <p className="text-xs text-center" style={{ color: "#8a9ab5" }}>
                    Нажимая кнопку, вы соглашаетесь с{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#f57c00", textDecoration: "underline" }}>
                      политикой обработки персональных данных
                    </a>
                  </p>
                </div>
              )}
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
          <div className="flex flex-wrap gap-6 items-center">
            {NAV_LINKS.map((l) => (
              <button key={l.href} onClick={() => scrollTo(l.href)} className="text-sm" style={{ color: "#8a9ab5", background: "none", border: "none", cursor: "pointer" }}>
                {l.label}
              </button>
            ))}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-sm"
              style={{ color: "#8a9ab5", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#f57c00")}
              onMouseLeave={e => (e.currentTarget.style.color = "#8a9ab5")}>
              Политика конфиденциальности
            </a>
          </div>
        </div>
      </footer>

      <section aria-label="О производстве спецодежды" className="sr-only">
        <h2>Производство костюмов сварщика и спецодежды — фабрика СпецНаз</h2>
        <p>Швейная фабрика СпецНаз — российский производитель спецодежды для сварщиков, металлургов и работников горячих цехов. Мы производим костюмы сварщика комбинированные, летние и зимние, соответствующие ГОСТ Р 12.4.250-2019. Вся продукция сертифицирована и промаркирована в системе Честный знак.</p>
        <p>Наш ассортимент включает: костюмы сварщика из спилка, брезентовые костюмы сварщика, костюмы для защиты от повышенных температур, костюмы для электросварки и газосварки, огнестойкую спецодежду, термостойкие костюмы, защитную одежду от искр и брызг расплавленного металла.</p>
        <p>Размерный ряд: от 40-42 до 76-78, роста 158-166, 170-176, 182-188, 194-200. Каждому росторазмеру присвоен индивидуальный GTIN (штрихкод EAN-13) для маркировки в системе Честный знак.</p>
        <p>Оптовые поставки спецодежды по всей России: Москва, Санкт-Петербург, Екатеринбург, Новосибирск, Красноярск, Челябинск, Нижний Новгород, Казань, Самара, Ростов-на-Дону, Уфа, Пермь, Волгоград, Краснодар, Тюмень, Омск, Воронеж, Саратов, Тольятти, Барнаул и другие города.</p>
        <p>Классы защиты спецодежды: класс А — защита от конвективной теплоты и контакта с нагретыми поверхностями, класс Б — защита от искр и брызг расплавленного металла, класс В — защита от излучения. Продукция соответствует требованиям ТР ТС 019/2011.</p>
        <p>Ключевые преимущества: собственное швейное производство, работа по ГОСТу, маркировка Честный знак, оптовые цены от производителя, доставка транспортными компаниями по всей России, индивидуальные заказы, расширенный размерный ряд.</p>
      </section>
    </>
  );
}