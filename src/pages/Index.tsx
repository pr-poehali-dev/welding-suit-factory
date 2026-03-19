import { useState } from "react";
import Header from "@/components/specnaz/Header";
import CatalogAndCalculator from "@/components/specnaz/CatalogAndCalculator";
import InfoAndContacts from "@/components/specnaz/InfoAndContacts";
import SeoHead from "@/components/specnaz/SeoHead";

export default function Index() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "#0d1117", color: "#e8e0d0" }}>
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        scrollTo={scrollTo}
      />
      <CatalogAndCalculator scrollTo={scrollTo} />
      <InfoAndContacts scrollTo={scrollTo} />
      <SeoHead />
    </div>
  );
}