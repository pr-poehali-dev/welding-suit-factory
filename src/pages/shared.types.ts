import { CATALOG_LEAF_CATEGORIES } from "@/components/specnaz/constants";

export const API = "https://functions.poehali.dev/867570d6-4bd3-4fdc-977c-f50fd3926c0e";

export const STOCK_OPTIONS = [
  { value: "on_order", label: "Много",     filled: 4 },
  { value: "in_stock", label: "В наличии", filled: 3 },
  { value: "few",      label: "Мало",      filled: 2 },
  { value: "low",      label: "Под заказ", filled: 1 },
] as const;

export type StockStatus = typeof STOCK_OPTIONS[number]["value"];

export interface ProductImage { id: number; url: string; sort_order: number; }
export interface ProductSize  { id?: number; size_label: string; price_add: number; is_available: boolean; gtin: string; stock_qty: number; }

export interface Product {
  id: number;
  name: string;
  category: string;
  description: string;
  gost: string;
  badge: string | null;
  base_price: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  stock_status: StockStatus;
  gtin: string;
  barcode_url: string;
  protection_class: string;
  documentation: string;
  materials: string;
  extra_info: string;
  pack_length: number;
  pack_width: number;
  pack_height: number;
  unit_weight: number;
  images: ProductImage[];
  sizes: ProductSize[];
}

export type FormState = {
  name: string;
  category: string;
  description: string;
  gost: string;
  badge: string;
  base_price: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  stock_status: StockStatus;
  protection_class: string;
  documentation: string;
  materials: string;
  extra_info: string;
  pack_length: number;
  pack_width: number;
  pack_height: number;
  unit_weight: number;
};

export const emptyForm = (): FormState => ({
  name: "", category: CATALOG_LEAF_CATEGORIES[0], description: "",
  gost: "", badge: "", base_price: 0, image_url: null,
  is_active: true, sort_order: 0, stock_status: "in_stock",
  protection_class: "", documentation: "", materials: "", extra_info: "",
  pack_length: 0, pack_width: 0, pack_height: 0, unit_weight: 0,
});

const SIZE_GROUPS  = ["40-42","44-46","48-50","52-54","56-58","60-62","64-66","68-70","72-74","76-78"];
const SIZE_HEIGHTS = ["158-164","170-176","182-188","194-200"];
const PRICE_ADDS: Record<string, number> = {
  "40-42": 0, "44-46": 0, "48-50": 0, "52-54": 0,
  "56-58": 200, "60-62": 400, "64-66": 600, "68-70": 800, "72-74": 1000, "76-78": 1200,
};
export const DEFAULT_SIZES: ProductSize[] = SIZE_GROUPS.flatMap(sz =>
  SIZE_HEIGHTS.map(ht => ({ size_label: `${sz}/${ht}`, price_add: PRICE_ADDS[sz] ?? 0, is_available: true, gtin: "", stock_qty: 0 }))
);

export function sortSizes(sizes: ProductSize[]): ProductSize[] {
  return [...sizes].sort((a, b) => {
    const parse = (label: string) => {
      const m = label.match(/^(\d+)/);
      const m2 = label.match(/\/(\d+)/);
      return [m ? parseInt(m[1], 10) : 9999, m2 ? parseInt(m2[1], 10) : 9999];
    };
    const [aSize, aHeight] = parse(a.size_label);
    const [bSize, bHeight] = parse(b.size_label);
    return aSize - bSize || aHeight - bHeight;
  });
}

export function getAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("admin_token") || sessionStorage.getItem("manager_token") || "";
  return token ? { Authorization: token } : {};
}

export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = { ...getAuthHeaders(), ...(options.headers as Record<string, string> || {}) };
  return fetch(url, { ...options, headers });
}

export const inp = "w-full px-3 py-2.5 rounded text-sm outline-none";
export const inpSt = { background: "#0d1117", border: "1px solid rgba(245,124,0,0.3)", color: "#e8e0d0" };
export const lbl: React.CSSProperties = { color: "#8a9ab5", fontFamily: "'Oswald', sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" };