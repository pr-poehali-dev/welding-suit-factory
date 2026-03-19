export const HERO_IMAGE = "https://cdn.poehali.dev/projects/c9ed5862-2c66-4e7a-985a-adae1a32a552/files/9fb0f06a-0b5f-467c-95b9-aa1d3abaa9ff.jpg";
export const FACTORY_IMAGE = "https://cdn.poehali.dev/projects/c9ed5862-2c66-4e7a-985a-adae1a32a552/files/2326425b-7243-406f-b890-26adb70827e4.jpg";
export const PRODUCT_IMAGE = "https://cdn.poehali.dev/projects/c9ed5862-2c66-4e7a-985a-adae1a32a552/files/3f2a3aec-d043-4d9c-9fd7-97ee66727a80.jpg";

export const NAV_LINKS = [
  { label: "О фабрике", href: "#about" },
  { label: "Каталог", href: "#catalog" },
  { label: "Производство", href: "#production" },
  { label: "Сертификаты", href: "#certificates" },
  { label: "Доставка", href: "#delivery" },
  { label: "Контакты", href: "#contacts" },
];

export const PRODUCTS = [
  {
    id: 1,
    name: "Костюм сварщика КС-01",
    desc: "Защита от искр и брызг металла. ГОСТ Р 12.4.250-2019",
    gost: "ГОСТ Р 12.4.250",
    category: "Сварка",
    price: "от 2 800 ₽",
    badge: "Хит продаж",
  },
  {
    id: 2,
    name: "Костюм сварщика «Профи»",
    desc: "Усиленная защита, огнестойкая ткань. Класс защиты II.",
    gost: "ГОСТ Р 12.4.250",
    category: "Сварка",
    price: "от 3 900 ₽",
    badge: null,
  },
  {
    id: 3,
    name: "Куртка рабочая утеплённая",
    desc: "Для работ при низких температурах. Водозащитная пропитка.",
    gost: "ГОСТ 12.4.303-2016",
    category: "Зимняя",
    price: "от 1 950 ₽",
    badge: null,
  },
  {
    id: 4,
    name: "Костюм хлопчатобумажный",
    desc: "Для общих производственных работ. Куртка + брюки.",
    gost: "ГОСТ 12.4.280-2014",
    category: "Общие работы",
    price: "от 890 ₽",
    badge: null,
  },
  {
    id: 5,
    name: "Комбинезон рабочий",
    desc: "Удобная посадка, усиленные колени и локти.",
    gost: "ГОСТ 12.4.280-2014",
    category: "Общие работы",
    price: "от 1 200 ₽",
    badge: "Новинка",
  },
  {
    id: 6,
    name: "Жилет сигнальный",
    desc: "Светоотражающие полосы, 2-й класс защиты.",
    gost: "ГОСТ Р 12.4.219-2002",
    category: "Сигнальная",
    price: "от 450 ₽",
    badge: null,
  },
];

export const CATEGORIES = ["Все", "Сварка", "Зимняя", "Общие работы", "Сигнальная"];

export const CERTS = [
  { icon: "ShieldCheck", title: "ГОСТ Р 12.4.250-2019", desc: "Защитная одежда сварщика" },
  { icon: "Award", title: "ISO 11612:2015", desc: "Защита от тепла и огня" },
  { icon: "BadgeCheck", title: "ГОСТ 12.4.303-2016", desc: "Одежда сигнальная" },
  { icon: "Stamp", title: "ТР ТС 019/2011", desc: "Технический регламент ТС" },
];

export const DELIVERY_ZONES = [
  { zone: "Москва и МО", days: "2–3 дня", cost: "Бесплатно от 50 000 ₽" },
  { zone: "ЦФО", days: "3–5 дней", cost: "по тарифу ТК" },
  { zone: "По России", days: "5–14 дней", cost: "по тарифу ТК" },
  { zone: "СНГ", days: "от 14 дней", cost: "по запросу" },
];

export const URGENCY_OPTIONS = [
  { label: "Стандарт — 21 рабочий день", multiplier: 1 },
  { label: "Срочно — 14 рабочих дней", multiplier: 1.2 },
  { label: "Очень срочно — 7 рабочих дней", multiplier: 1.5 },
];

export const BASE_PRICES: Record<string, number> = {
  "Костюм сварщика КС-01": 2800,
  "Костюм сварщика «Профи»": 3900,
  "Куртка рабочая утеплённая": 1950,
  "Костюм хлопчатобумажный": 890,
  "Комбинезон рабочий": 1200,
  "Жилет сигнальный": 450,
};
