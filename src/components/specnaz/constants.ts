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

// Размеры по ГОСТ: сдвоенные (размер/рост)
const SIZE_GROUPS_GOST  = ["40-42","44-46","48-50","52-54","56-58","60-62","64-66","68-70","72-74","76-78"];
const SIZE_HEIGHTS_GOST = ["158-164","170-176","182-188","194-200"];
export const SIZES_GOST = SIZE_GROUPS_GOST.flatMap(sz => SIZE_HEIGHTS_GOST.map(ht => `${sz}/${ht}`));

export const SIZE_SURCHARGE: Record<string, number> = {};
SIZES_GOST.forEach(label => { SIZE_SURCHARGE[label] = 0; });

export const PRODUCTS = [
  {
    id: 1,
    name: "Костюм сварщика КС-01",
    desc: "Защита от искр и брызг металла. ГОСТ Р 12.4.250-2019",
    gost: "ГОСТ Р 12.4.250",
    category: "Сварка",
    basePrice: 2800,
    badge: "Хит продаж",
  },
  {
    id: 7,
    name: "Костюм сварщика летний",
    desc: "Лёгкая огнестойкая ткань для жаркого сезона. Отвод влаги. ГОСТ Р 12.4.250-2019",
    gost: "ГОСТ Р 12.4.250",
    category: "Сварка",
    basePrice: 4020,
    badge: "Новинка",
  },
  {
    id: 2,
    name: "Костюм сварщика «Профи»",
    desc: "Усиленная защита, огнестойкая ткань. Класс защиты II.",
    gost: "ГОСТ Р 12.4.250",
    category: "Сварка",
    basePrice: 3900,
    badge: null,
  },
  {
    id: 3,
    name: "Куртка рабочая утеплённая",
    desc: "Для работ при низких температурах. Водозащитная пропитка.",
    gost: "ГОСТ 12.4.303-2016",
    category: "Зимняя",
    basePrice: 1950,
    badge: null,
  },
  {
    id: 4,
    name: "Костюм хлопчатобумажный",
    desc: "Для общих производственных работ. Куртка + брюки.",
    gost: "ГОСТ 12.4.280-2014",
    category: "Общие работы",
    basePrice: 890,
    badge: null,
  },
  {
    id: 5,
    name: "Комбинезон рабочий",
    desc: "Удобная посадка, усиленные колени и локти.",
    gost: "ГОСТ 12.4.280-2014",
    category: "Общие работы",
    basePrice: 1200,
    badge: "Новинка",
  },
  {
    id: 6,
    name: "Жилет сигнальный",
    desc: "Светоотражающие полосы, 2-й класс защиты.",
    gost: "ГОСТ Р 12.4.219-2002",
    category: "Сигнальная",
    basePrice: 450,
    badge: null,
  },
];

export const CATEGORIES = ["Все", "Сварка", "Зимняя", "Общие работы", "Сигнальная"];

// ─── Многоуровневое дерево каталога ───────────────────────────────────────────

export interface CatalogNode {
  id: string;
  label: string;
  children?: CatalogNode[];
  /** Если нет children — это конечная категория, показываем товары */
  categoryTag?: string;
}

const SUIT_SUBCATEGORIES: CatalogNode[] = [
  { id: "welder-canvas",    label: "Костюмы сварщика брезентовые",                categoryTag: "Костюмы сварщика брезентовые" },
  { id: "welder-combined",  label: "Костюмы сварщика комбинированные",             categoryTag: "Костюмы сварщика комбинированные" },
  { id: "canvas-spilk",     label: "Костюмы брезентовые со спилковыми накладками", categoryTag: "Костюмы брезентовые со спилковыми накладками" },
  { id: "welder-spilk",     label: "Костюмы сварщика цельноспилковые",             categoryTag: "Костюмы сварщика цельноспилковые" },
  { id: "moleskin",         label: "Костюмы молескиновые",                         categoryTag: "Костюмы молескиновые" },
  { id: "sandblast",        label: "Костюмы пескоструйщика",                       categoryTag: "Костюмы пескоструйщика" },
];

export const CATALOG_TREE: CatalogNode[] = [
  {
    id: "workwear",
    label: "Спецодежда",
    children: [
      {
        id: "suits",
        label: "Костюмы",
        children: [
          { id: "summer",    label: "Летний ассортимент",  children: SUIT_SUBCATEGORIES.map(n => ({ ...n, id: `summer-${n.id}`, categoryTag: `${n.categoryTag} (летний)` })) },
          { id: "winter",    label: "Зимний ассортимент",  children: SUIT_SUBCATEGORIES.map(n => ({ ...n, id: `winter-${n.id}`, categoryTag: `${n.categoryTag} (зимний)` })) },
          { id: "demi",      label: "Демисезонный",        children: SUIT_SUBCATEGORIES.map(n => ({ ...n, id: `demi-${n.id}`, categoryTag: `${n.categoryTag} (демисезон)` })) },
        ],
      },
      {
        id: "ppe",
        label: "СИЗ",
        children: [
          { id: "head",  label: "Защита головы",   categoryTag: "Защита головы" },
          { id: "body",  label: "Защита туловища", categoryTag: "Защита туловища" },
          { id: "hands", label: "Защита рук",      categoryTag: "Защита рук" },
          { id: "feet",  label: "Защита ног",      categoryTag: "Защита ног" },
        ],
      },
    ],
  },
];

/** Все конечные категории (листья дерева) — для выпадающего списка в админке */
export const CATALOG_LEAF_CATEGORIES: string[] = [
  // Костюмы — Летний ассортимент
  "Костюмы сварщика брезентовые (летний)",
  "Костюмы сварщика комбинированные (летний)",
  "Костюмы брезентовые со спилковыми накладками (летний)",
  "Костюмы сварщика цельноспилковые (летний)",
  "Костюмы молескиновые (летний)",
  "Костюмы пескоструйщика (летний)",
  // Костюмы — Зимний ассортимент
  "Костюмы сварщика брезентовые (зимний)",
  "Костюмы сварщика комбинированные (зимний)",
  "Костюмы брезентовые со спилковыми накладками (зимний)",
  "Костюмы сварщика цельноспилковые (зимний)",
  "Костюмы молескиновые (зимний)",
  "Костюмы пескоструйщика (зимний)",
  // Костюмы — Демисезонный
  "Костюмы сварщика брезентовые (демисезон)",
  "Костюмы сварщика комбинированные (демисезон)",
  "Костюмы брезентовые со спилковыми накладками (демисезон)",
  "Костюмы сварщика цельноспилковые (демисезон)",
  "Костюмы молескиновые (демисезон)",
  "Костюмы пескоструйщика (демисезон)",
  // СИЗ
  "Защита головы",
  "Защита туловища",
  "Защита рук",
  "Защита ног",
];

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

// Условия оплаты — пользователь выбирает тип, система сама применяет коэффициент
// в зависимости от наличия товара (stock_qty > 0 → наличие, иначе → под заказ)
export interface PaymentOption {
  id: string;
  label: string;
  desc: string;
  stockCoeff: number;
  orderCoeff: number;
}

export const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: "prepay_100", label: "100% предоплата",  desc: "Базовая цена / −1.8% под заказ",    stockCoeff: 1,      orderCoeff: 0.982   },
  { id: "prepay_30",  label: "Предоплата 30 дней", desc: "Базовая / −3.37% под заказ",       stockCoeff: 1,      orderCoeff: 0.9663  },
  { id: "def_14",     label: "Отсрочка 14 дней", desc: "+1.8% наличие / −1.8% под заказ",    stockCoeff: 1.018,  orderCoeff: 0.982   },
  { id: "def_30",     label: "Отсрочка 30 дней", desc: "+3.63% наличие / +4.43% под заказ",   stockCoeff: 1.0363, orderCoeff: 1.0443  },
  { id: "def_60",     label: "Отсрочка 60 дней", desc: "+5.49% наличие / +6.29% под заказ",   stockCoeff: 1.0549, orderCoeff: 1.0629  },
];

// Скидка от суммы заказа (рублей)
export const VOLUME_DISCOUNTS = [
  { from: 2_000_000, discount: 0.10, label: "от 2 000 000 ₽ — скидка 10%" },
  { from: 1_500_000, discount: 0.07, label: "от 1 500 000 ₽ — скидка 7%" },
  { from: 1_000_000, discount: 0.05, label: "от 1 000 000 ₽ — скидка 5%" },
  { from: 750_000,   discount: 0.02, label: "от 750 000 ₽ — скидка 2%" },
  { from: 500_000,   discount: 0.01, label: "от 500 000 ₽ — скидка 1%" },
];

export const BASE_PRICES: Record<string, number> = {
  "Костюм сварщика КС-01": 2800,
  "Костюм сварщика летний": 4020,
  "Костюм сварщика «Профи»": 3900,
  "Куртка рабочая утеплённая": 1950,
  "Костюм хлопчатобумажный": 890,
  "Комбинезон рабочий": 1200,
  "Жилет сигнальный": 450,
};