import { useState, useEffect } from "react";
import { CatalogPath } from "./CatalogTree";
import HeroSection from "./HeroSection";
import CatalogSection from "./CatalogSection";
import CalculatorSection, { CartItem, ProductSizeData, getPaymentAvailability } from "./CalculatorSection";
import type { ProductDimensions } from "./catalogTypes";
import type { PaymentOption } from "./constants";

const API = "https://functions.poehali.dev/867570d6-4bd3-4fdc-977c-f50fd3926c0e";

interface CatalogAndCalculatorProps {
  scrollTo: (href: string) => void;
}

export default function CatalogAndCalculator({ scrollTo }: CatalogAndCalculatorProps) {
  const [catalogPath, setCatalogPath] = useState<CatalogPath>({ nodes: [] });
  const [selectedSizes, setSelectedSizes] = useState<Record<number, string>>({});

  const [basePrices, setBasePrices] = useState<Record<string, number>>({});
  const [productNames, setProductNames] = useState<string[]>([]);
  const [productSizes, setProductSizes] = useState<Record<string, ProductSizeData[]>>({});
  const [productDimensions, setProductDimensions] = useState<Record<string, ProductDimensions>>({});
  const [dbPaymentOptions, setDbPaymentOptions] = useState<PaymentOption[] | null>(null);

  useEffect(() => {
    fetch(`${API}?action=payment_options`)
      .then(r => r.json())
      .then(data => {
        const opts = (data.payment_options || []).map((o: { option_id: string; group_id: string; availability: string; label: string; description: string; coeff: number }) => ({
          id: o.option_id, group: o.group_id, availability: o.availability, label: o.label, desc: o.description, coeff: o.coeff,
        })) as PaymentOption[];
        if (opts.length > 0) setDbPaymentOptions(opts);
      });
    fetch(API)
      .then(r => r.json())
      .then(data => {
        const active = (data.products || []).filter((p: { is_active: boolean }) => p.is_active);
        const prices: Record<string, number> = {};
        const names: string[] = [];
        const sizes: Record<string, ProductSizeData[]> = {};
        const dims: Record<string, ProductDimensions> = {};
        active.forEach((p: { name: string; base_price: number; sizes?: ProductSizeData[]; pack_length?: number; pack_width?: number; pack_height?: number; unit_weight?: number }) => {
          prices[p.name] = p.base_price;
          if (!names.includes(p.name)) names.push(p.name);
          sizes[p.name] = (p.sizes || []).filter(s => s.is_available).sort((a, b) => {
            const pa = (s: ProductSizeData) => { const m1 = s.size_label.match(/^(\d+)/); const m2 = s.size_label.match(/\/(\d+)/); return [m1 ? +m1[1] : 9999, m2 ? +m2[1] : 9999]; };
            const [aS, aH] = pa(a), [bS, bH] = pa(b);
            return aS - bS || aH - bH;
          });
          dims[p.name] = {
            pack_length: p.pack_length ?? 0,
            pack_width: p.pack_width ?? 0,
            pack_height: p.pack_height ?? 0,
            unit_weight: p.unit_weight ?? 0,
          };
        });
        setBasePrices(prices);
        setProductNames(names);
        setProductSizes(sizes);
        setProductDimensions(dims);
      });
  }, []);

  const [payment, setPayment] = useState("stock_prepay_100");
  const [withLogo, setWithLogo] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [stockWarning, setStockWarning] = useState("");

  const [addProduct, setAddProduct] = useState("");
  const [addSize, setAddSize] = useState("");
  const [addQty, setAddQty] = useState(10);

  useEffect(() => {
    if (productNames.length > 0 && !addProduct) {
      setAddProduct(productNames[0]);
    }
  }, [productNames, addProduct]);

  useEffect(() => {
    const avail = getPaymentAvailability(payment, dbPaymentOptions ?? undefined);
    const sizes = (productSizes[addProduct] || []).filter(s => {
      const q = s.stock_qty ?? 0;
      return avail === "stock" ? q > 0 : q === 0;
    });
    if (sizes.length > 0 && !sizes.some(s => s.size_label === addSize)) {
      setAddSize(sizes[0].size_label);
    }
  }, [addProduct, productSizes, payment, dbPaymentOptions]);

  const getStockQty = (product: string, size: string) => {
    return (productSizes[product] || []).find(s => s.size_label === size)?.stock_qty ?? 0;
  };

  const addToCart = () => {
    if (!addProduct) return;
    const stock = getStockQty(addProduct, addSize);
    const existing = cart.find((item) => item.product === addProduct && item.size === addSize && item.paymentId === payment);

    let clamped = false;
    if (existing) {
      let newQty = existing.qty + addQty;
      if (stock > 0 && newQty > stock) { newQty = stock; clamped = true; }
      setCart(prev => prev.map(item => item.id === existing.id ? { ...item, qty: newQty } : item));
    } else {
      let qty = addQty;
      if (stock > 0 && qty > stock) { qty = stock; clamped = true; }
      setCart(prev => [...prev, { id: crypto.randomUUID(), product: addProduct, size: addSize, qty, paymentId: payment }]);
    }

    if (clamped) {
      setStockWarning(`${addProduct} (${addSize}) — на складе только ${stock} шт, количество скорректировано`);
    }
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) return;
    const item = cart.find(i => i.id === id);
    if (!item) return;
    const stock = getStockQty(item.product, item.size);
    if (stock > 0 && qty > stock) {
      setStockWarning(`${item.product} (${item.size}) — на складе только ${stock} шт, количество скорректировано`);
      setCart(prev => prev.map(i => i.id === id ? { ...i, qty: stock } : i));
    } else {
      setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
    }
  };

  const updateSize = (id: string, size: string) => {
    setCart((prev) => {
      const target = prev.find((item) => item.id === id);
      if (!target) return prev;
      const duplicate = prev.find((item) => item.id !== id && item.product === target.product && item.size === size);
      if (duplicate) {
        return prev
          .map((item) => item.id === duplicate.id ? { ...item, qty: item.qty + target.qty } : item)
          .filter((item) => item.id !== id);
      }
      return prev.map((item) => item.id === id ? { ...item, size } : item);
    });
  };

  return (
    <>
      <HeroSection scrollTo={scrollTo} />

      <div className="section-divider" />

      <CatalogSection
        catalogPath={catalogPath}
        setCatalogPath={setCatalogPath}
        selectedSizes={selectedSizes}
        setSelectedSizes={setSelectedSizes}
        setAddProduct={setAddProduct}
        setAddSize={setAddSize}
        scrollTo={scrollTo}
      />

      <div className="section-divider" />

      <CalculatorSection
        payment={payment}
        setPayment={setPayment}
        withLogo={withLogo}
        setWithLogo={setWithLogo}
        cart={cart}
        addProduct={addProduct}
        setAddProduct={setAddProduct}
        addSize={addSize}
        setAddSize={setAddSize}
        addQty={addQty}
        setAddQty={setAddQty}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        updateQty={updateQty}
        updateSize={updateSize}
        scrollTo={scrollTo}
        basePrices={basePrices}
        productNames={productNames}
        productSizes={productSizes}
        productDimensions={productDimensions}
        paymentOptionsOverride={dbPaymentOptions}
        stockWarning={stockWarning}
        dismissWarning={() => setStockWarning("")}
      />
    </>
  );
}