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
export interface ProductSize  { id?: number; size_label: string; price_add: number; is_available: boolean; gtin: string; }

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
  gtin: string;
  protection_class: string;
  documentation: string;
  materials: string;
  extra_info: string;
};

export const emptyForm = (): FormState => ({
  name: "", category: CATALOG_LEAF_CATEGORIES[0], description: "",
  gost: "", badge: "", base_price: 0, image_url: null,
  is_active: true, sort_order: 0, stock_status: "in_stock",
  gtin: "", protection_class: "", documentation: "", materials: "", extra_info: "",
});

const SIZE_GROUPS  = ["40-42","44-46","48-50","52-54","56-58","60-62","64-66","68-70","72-74","76-78"];
const SIZE_HEIGHTS = ["158-166","170-176","182-188","194-200"];
const PRICE_ADDS: Record<string, number> = {
  "40-42": 0, "44-46": 0, "48-50": 0, "52-54": 0,
  "56-58": 200, "60-62": 400, "64-66": 600, "68-70": 800, "72-74": 1000, "76-78": 1200,
};
export const DEFAULT_SIZES: ProductSize[] = SIZE_GROUPS.flatMap(sz =>
  SIZE_HEIGHTS.map(ht => ({ size_label: `${sz}/${ht}`, price_add: PRICE_ADDS[sz] ?? 0, is_available: true, gtin: "" }))
);