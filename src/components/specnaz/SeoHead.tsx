import { useEffect, useState } from "react";
import { API } from "./catalogTypes";

interface SeoData {
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  og_title: string;
  og_description: string;
  og_image: string;
  custom_head_tags: string;
  custom_body_tags: string;
}

export default function SeoHead() {
  const [seo, setSeo] = useState<SeoData | null>(null);

  useEffect(() => {
    fetch(`${API}?action=seo`)
      .then(r => r.json())
      .then(d => { if (d.seo) setSeo(d.seo); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!seo) return;

    if (seo.meta_title) document.title = seo.meta_title;

    const setMeta = (name: string, content: string, prop = false) => {
      if (!content) return;
      const attr = prop ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    setMeta("description", seo.meta_description);
    setMeta("keywords", seo.meta_keywords);
    setMeta("og:title", seo.og_title, true);
    setMeta("og:description", seo.og_description, true);
    if (seo.og_image) setMeta("og:image", seo.og_image, true);

    if (seo.custom_head_tags) {
      const container = document.createElement("div");
      container.innerHTML = seo.custom_head_tags;
      const frag = document.createDocumentFragment();
      while (container.firstChild) frag.appendChild(container.firstChild);
      document.head.appendChild(frag);
    }
  }, [seo]);

  if (!seo?.custom_body_tags) return null;
  return <div dangerouslySetInnerHTML={{ __html: seo.custom_body_tags }} style={{ display: "none" }} />;
}
