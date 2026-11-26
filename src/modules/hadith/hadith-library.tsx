"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight } from "lucide-react";
import dataset from "@/data/hadith-bn.json";
import type { HadithDataset, HadithRecord } from "@/types/hadith";

const DATA = dataset as HadithDataset;

function referenceLine(item: HadithRecord) {
  return `${item.book} · হাদিস ${item.hadith_number}`;
}

export function HadithLibrary() {
  const router = useRouter();
  const search = useSearchParams();
  const selectedId = search.get("id");
  const categoryId = search.get("category");
  const current = DATA.hadiths.find((item) => item.id === selectedId) ?? null;
  const activeCategory = DATA.categories.find((item) => item.id === categoryId) ?? null;
  const visible = useMemo(() => categoryId
    ? DATA.hadiths.filter((item) => item.category_id === categoryId)
    : DATA.hadiths, [categoryId]);

  function openList(category?: string) {
    router.push(category ? `/hadith?category=${encodeURIComponent(category)}` : "/hadith");
  }
  function openHadith(item: HadithRecord) {
    const suffix = categoryId ? `&category=${encodeURIComponent(categoryId)}` : "";
    router.push(`/hadith?id=${encodeURIComponent(item.id)}${suffix}`);
  }

  if (current) {
    const group = visible.length ? visible : DATA.hadiths;
    const index = group.findIndex((item) => item.id === current.id);
    const previous = group[index - 1] ?? null;
    const next = group[index + 1] ?? null;
    const category = DATA.categories.find((item) => item.id === current.category_id);
    return <main className="hadith-library view-stack">
      <div className="hadith-page-heading">
        <button type="button" className="section-back-button" onClick={() => openList(categoryId || undefined)}><ArrowLeft size={16}/> হাদিসের তালিকায় ফিরো</button>
        <span className="eyebrow">{category?.name || "হাদিস পাঠ"}</span>
        <h1>হাদিসের বিস্তারিত</h1>
      </div>
      <article className="hadith-detail-card">
        <div className="hadith-detail-kicker"><BookOpen size={17}/><span>{category?.name || "হাদিস"}</span></div>
        <p className="hadith-detail-summary">{current.summary}</p>
        <div className="hadith-detail-divider"/>
        <h2>সম্পূর্ণ হাদিসের অর্থ</h2>
        <p className="hadith-detail-text">{current.full_text_bn}</p>
        <dl className="hadith-detail-meta">
          <div><dt>বর্ণনাকারী</dt><dd>{current.narrator}</dd></div>
          <div><dt>গ্রন্থ</dt><dd>{current.book}</dd></div>
          <div><dt>অধ্যায়</dt><dd>{current.chapter}</dd></div>
          <div><dt>হাদিস নম্বর</dt><dd>{current.hadith_number}</dd></div>
        </dl>
      </article>
      <div className="hadith-detail-navigation">
        <button type="button" className="button-secondary" onClick={() => previous && openHadith(previous)} disabled={!previous}><ArrowLeft size={15}/> আগের হাদিস</button>
        <button type="button" className="button-secondary" onClick={() => next && openHadith(next)} disabled={!next}>পরের হাদিস <ArrowRight size={15}/></button>
      </div>
      <section className="hadith-category-section">
        <div className="panel-title-row"><div><span className="eyebrow">বিষয় অনুযায়ী</span><h2>অন্যান্য হাদিস পড়ুন</h2></div></div>
        <div className="hadith-category-grid">
          {DATA.categories.map((item) => <button type="button" key={item.id} className={`hadith-category-chip ${categoryId === item.id ? "selected" : ""}`} onClick={() => openList(item.id)}>{item.name}<ChevronRight size={15}/></button>)}
        </div>
      </section>
      <footer className="workspace-footer"><span>রাকিব তুমি তোমার বাবা-মায়ের বিশ্বাসটা ভেঙ্গোনা।</span><span>তাহলে তাদের আর যাওয়ার মতো জায়গা থাকবে না!</span></footer>
    </main>;
  }

  return <main className="hadith-library view-stack">
    <div className="hadith-page-heading">
      <button type="button" className="section-back-button" onClick={() => router.push("/dashboard")}><ArrowLeft size={16}/> ড্যাশবোর্ডে ফিরো</button>
      <span className="eyebrow">বিশুদ্ধ হাদিসের পাঠ</span>
      <h1>{activeCategory ? activeCategory.name : "হাদিসের সংগ্রহ"}</h1>
      <p>{visible.length.toLocaleString("bn-BD")}টি হাদিস · বিষয় নির্বাচন করে পড়ো</p>
    </div>
    <div className="hadith-category-grid">
      <button type="button" className={`hadith-category-chip ${!categoryId ? "selected" : ""}`} onClick={() => openList()}>সব হাদিস</button>
      {DATA.categories.map((item) => <button type="button" key={item.id} className={`hadith-category-chip ${categoryId === item.id ? "selected" : ""}`} onClick={() => openList(item.id)}>{item.name}</button>)}
    </div>
    <div className="hadith-list-grid">
      {visible.map((item, index) => <button type="button" className="hadith-list-card" key={item.id} onClick={() => openHadith(item)}>
        <span className="hadith-list-number">{(index + 1).toLocaleString("bn-BD")}</span>
        <span className="hadith-list-copy"><small>{DATA.categories.find((category) => category.id === item.category_id)?.name || "হাদিস"}</small><strong>{item.summary}</strong><em>{referenceLine(item)}</em></span>
        <ChevronRight size={17}/>
      </button>)}
    </div>
    <footer className="workspace-footer"><span>রাকিব তুমি তোমার বাবা-মায়ের বিশ্বাসটা ভেঙ্গোনা।</span><span>তাহলে তাদের আর যাওয়ার মতো জায়গা থাকবে না!</span></footer>
  </main>;
}
