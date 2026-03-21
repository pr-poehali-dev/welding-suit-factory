export const API = "https://functions.poehali.dev/867570d6-4bd3-4fdc-977c-f50fd3926c0e";

export type StockStatus = "in_stock" | "few" | "low" | "on_order";

export const STOCK_LEVELS: Record<StockStatus, { label: string; filled: number }> = {
  on_order: { label: "Много",      filled: 4 },
  in_stock: { label: "В наличии",  filled: 3 },
  few:      { label: "Мало",       filled: 2 },
  low:      { label: "Под заказ",  filled: 1 },
};

export interface ApiProduct {
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
  protection_class: string;
  documentation: string;
  materials: string;
  extra_info: string;
  pack_length: number;
  pack_width: number;
  pack_height: number;
  unit_weight: number;
  images: { id: number; url: string; sort_order: number }[];
  sizes: { id: number; size_label: string; price_add: number; is_available: boolean; gtin: string; stock_qty: number }[];
  barcode_url: string;
}

export interface ProductDimensions {
  pack_length: number;
  pack_width: number;
  pack_height: number;
  unit_weight: number;
}

export const accent = "#f57c00";
export const muted = "#8a9ab5";
export const oswald = "'Oswald', sans-serif";
export const FALLBACK_IMG = "https://cdn.poehali.dev/projects/c9ed5862-2c66-4e7a-985a-adae1a32a552/files/91eb64a8-d5b8-49a2-8e2e-558a15b2c25c.jpg";
export const CHESTNIY_ZNAK_IMG = "https://cdn.poehali.dev/projects/c9ed5862-2c66-4e7a-985a-adae1a32a552/bucket/13d96f42-3da7-4dbe-bfcc-50c514929a23.png";