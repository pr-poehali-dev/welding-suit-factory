import { useState, useEffect } from "react";
import { CatalogPath } from "./CatalogTree";
import HeroSection from "./HeroSection";
import CatalogSection from "./CatalogSection";
import CalculatorSection, { CartItem, ProductSizeData } from "./CalculatorSection";

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

  useEffect(() => {
    fetch(API)
      .then(r => r.json())
      .then(data => {
        const active = (data.products || []).filter((p: { is_active: boolean }) => p.is_active);
        const prices: Record<string, number> = {};
        const names: string[] = [];
        const sizes: Record<string, ProductSizeData[]> = {};
        active.forEach((p: { name: string; base_price: number; sizes?: ProductSizeData[] }) => {
          prices[p.name] = p.base_price;
          if (!names.includes(p.name)) names.push(p.name);
          sizes[p.name] = (p.sizes || []).filter(s => s.is_available);
        });
        setBasePrices(prices);
        setProductNames(names);
        setProductSizes(sizes);
      });
  }, []);

  const [payment, setPayment] = useState("prepayment100");
  const [withLogo, setWithLogo] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [addProduct, setAddProduct] = useState("");
  const [addSize, setAddSize] = useState("");
  const [addQty, setAddQty] = useState(10);

  useEffect(() => {
    if (productNames.length > 0 && !addProduct) {
      setAddProduct(productNames[0]);
    }
  }, [productNames, addProduct]);

  useEffect(() => {
    const sizes = productSizes[addProduct] || [];
    if (sizes.length > 0 && !sizes.some(s => s.size_label === addSize)) {
      setAddSize(sizes[0].size_label);
    }
  }, [addProduct, productSizes]);

  const addToCart = () => {
    if (!addProduct) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.product === addProduct && item.size === addSize);
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id ? { ...item, qty: item.qty + addQty } : item
        );
      }
      return [...prev, { id: crypto.randomUUID(), product: addProduct, size: addSize, qty: addQty }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) return;
    setCart((prev) => prev.map((item) => item.id === id ? { ...item, qty } : item));
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
      />
    </>
  );
}