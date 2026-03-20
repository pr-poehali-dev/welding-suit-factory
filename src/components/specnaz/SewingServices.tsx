import Icon from "@/components/ui/icon";

const SEWING_IMG_1 = "https://cdn.poehali.dev/projects/c9ed5862-2c66-4e7a-985a-adae1a32a552/files/67a7b5bf-5b15-4a0b-98b8-5458ab7bd118.jpg";
const SEWING_IMG_2 = "https://cdn.poehali.dev/projects/c9ed5862-2c66-4e7a-985a-adae1a32a552/files/87e75741-ff82-49c6-87d1-41256b2a6638.jpg";
const SEWING_IMG_3 = "https://cdn.poehali.dev/projects/c9ed5862-2c66-4e7a-985a-adae1a32a552/files/707a085f-6077-4adb-acc7-c96e7d36e92e.jpg";

interface SewingServicesProps {
  scrollTo: (href: string) => void;
}

export default function SewingServices({ scrollTo }: SewingServicesProps) {
  return (
    <section id="sewing" className="py-24" style={{ background: "#0a0e14" }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center gap-3 mb-4">
          <div style={{ width: 32, height: 2, background: "#f57c00" }} />
          <span className="text-sm tracking-widest uppercase" style={{ color: "#f57c00" }}>Контрактное производство</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>
          УСЛУГИ ПОШИВА
        </h2>
        <p className="mb-12 max-w-2xl" style={{ color: "#8a9ab5", lineHeight: 1.7 }}>
          Принимаем заказы на пошив спецодежды по техническому заданию заказчика или полностью «под ключ» из собственных материалов. Конкурентные расценки на норма-часы и сильная команда технологов с многолетним стажем.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(245,124,0,0.15)" }}>
            <img src={SEWING_IMG_1} alt="Швейный цех" className="w-full" style={{ aspectRatio: "4/3", objectFit: "cover" }} />
            <div className="p-5" style={{ background: "#13181f" }}>
              <h3 className="font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff", fontSize: 16 }}>ПОШИВ ПО ТЗ ЗАКАЗЧИКА</h3>
              <p className="text-sm" style={{ color: "#8a9ab5", lineHeight: 1.6 }}>
                Вы предоставляете техническое задание, лекала или образец — мы реализуем в точном соответствии с требованиями. Строгое следование ГОСТам и ТУ.
              </p>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(245,124,0,0.15)" }}>
            <img src={SEWING_IMG_2} alt="Пошив спецодежды" className="w-full" style={{ aspectRatio: "4/3", objectFit: "cover" }} />
            <div className="p-5" style={{ background: "#13181f" }}>
              <h3 className="font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff", fontSize: 16 }}>ПОД КЛЮЧ ИЗ НАШИХ МАТЕРИАЛОВ</h3>
              <p className="text-sm" style={{ color: "#8a9ab5", lineHeight: 1.6 }}>
                Разработка модели, подбор тканей и фурнитуры, изготовление. Собственный склад материалов — брезент, молескин, спилок, мембранные ткани.
              </p>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(245,124,0,0.15)" }}>
            <img src={SEWING_IMG_3} alt="Раскрой ткани" className="w-full" style={{ aspectRatio: "4/3", objectFit: "cover" }} />
            <div className="p-5" style={{ background: "#13181f" }}>
              <h3 className="font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff", fontSize: 16 }}>РАЗРАБОТКА И КОНСТРУИРОВАНИЕ</h3>
              <p className="text-sm" style={{ color: "#8a9ab5", lineHeight: 1.6 }}>
                Технологи с 15+ лет стажа разработают конструкторскую документацию, лекала и размерный ряд. От идеи до серийного производства.
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="p-6 rounded-lg" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.15)" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded flex items-center justify-center" style={{ background: "rgba(245,124,0,0.15)" }}>
                <Icon name="Award" size={20} style={{ color: "#f57c00" }} />
              </div>
              <h3 className="font-bold text-lg" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>НАШИ ПРЕИМУЩЕСТВА</h3>
            </div>
            <div className="space-y-3">
              {[
                "Конкурентные расценки на норма-часы",
                "Команда технологов со стажем 15–25 лет",
                "Полный цикл: от раскроя до маркировки",
                "Сертификация готовой продукции",
                "Минимальная партия — от 50 единиц",
                "Собственный склад тканей и фурнитуры",
              ].map(item => (
                <div key={item} className="flex items-start gap-3">
                  <div className="mt-1"><Icon name="CheckCircle" size={14} style={{ color: "#f57c00" }} /></div>
                  <span className="text-sm" style={{ color: "#c8bca8" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-lg" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.15)" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded flex items-center justify-center" style={{ background: "rgba(245,124,0,0.15)" }}>
                <Icon name="ClipboardList" size={20} style={{ color: "#f57c00" }} />
              </div>
              <h3 className="font-bold text-lg" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>КАК ЗАКАЗАТЬ ПОШИВ</h3>
            </div>
            <div className="space-y-4">
              {[
                { n: "01", title: "Заявка", desc: "Отправьте ТЗ или опишите задачу — мы свяжемся в течение 1 рабочего дня" },
                { n: "02", title: "Расчёт", desc: "Подготовим коммерческое предложение с детальным расчётом стоимости" },
                { n: "03", title: "Образец", desc: "Изготовим пробный образец для согласования перед запуском серии" },
                { n: "04", title: "Производство", desc: "Серийный пошив с контролем качества на каждом этапе" },
              ].map(step => (
                <div key={step.n} className="flex items-start gap-3">
                  <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded text-xs font-bold"
                    style={{ background: "#f57c00", color: "#0d1117", fontFamily: "'Oswald', sans-serif" }}>{step.n}</div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: "#ffffff" }}>{step.title}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#8a9ab5" }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg flex flex-wrap items-center gap-6 justify-between" style={{ background: "rgba(245,124,0,0.08)", border: "1px solid rgba(245,124,0,0.25)" }}>
          <div className="flex items-center gap-4">
            <Icon name="Factory" size={32} style={{ color: "#f57c00" }} />
            <div>
              <div className="font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>Нужен пошив спецодежды?</div>
              <div className="text-sm" style={{ color: "#8a9ab5" }}>Отправьте заявку — менеджер свяжется с вами для обсуждения деталей</div>
            </div>
          </div>
          <button className="btn-primary px-8 py-3 text-sm whitespace-nowrap font-bold" onClick={() => scrollTo("#contacts")}>
            Оставить заявку на пошив
          </button>
        </div>
      </div>
    </section>
  );
}
