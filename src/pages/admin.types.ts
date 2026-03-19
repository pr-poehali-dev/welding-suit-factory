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
export interface ProductSize  { id?: number; size_label: string; price_add: number; is_available: boolean; }

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
};

export const emptyForm = (): FormState => ({
  name: "", category: CATALOG_LEAF_CATEGORIES[0], description: "",
  gost: "", badge: "", base_price: 0, image_url: null,
  is_active: true, sort_order: 0, stock_status: "in_stock",
  gtin: "",
});

export const DEFAULT_SIZES: ProductSize[] = [
  { size_label: "44-46/158-164", price_add: 0, is_available: true },
  { size_label: "44-46/170-176", price_add: 0, is_available: true },
  { size_label: "48-50/158-164", price_add: 0, is_available: true },
  { size_label: "48-50/170-176", price_add: 0, is_available: true },
  { size_label: "52-54/170-176", price_add: 0, is_available: true },
  { size_label: "56-58/170-176", price_add: 200, is_available: true },
  { size_label: "60-62/170-176", price_add: 400, is_available: true },
];
