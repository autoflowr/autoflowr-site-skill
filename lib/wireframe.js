import path from "node:path";
import fs from "fs-extra";

/**
 * Wireframe generator — Phase 1.5
 *
 * Renders a single-file HTML wireframe using the design tokens passed in
 * (resolved upstream in bin/build-business-site.js — from --design-file, then
 * <outDir>/design.json, then niche fallback palette, then OWL lead-gen).
 *
 * The wireframe is COLORED (not B&W) so Bar can see the actual visual
 * direction before scaffolding. Alternative palettes are listed at the
 * bottom as comparison swatches with re-run instructions.
 */
export async function generateWireframe({
  businessName,
  niche,
  nicheCfg,
  slug,
  outDir,
  mode = "client-site",
  location,
  priceFrom,
  designTokens,
  skillRoot,
}) {
  const research = buildFallbackResearch({ businessName, niche, nicheCfg, mode, location, priceFrom });
  const html = renderHtml({ businessName, niche, nicheCfg, research, mode, designTokens });
  const wireframePath = path.join(outDir, "wireframe.html");
  await fs.writeFile(wireframePath, html, "utf8");
  return wireframePath;
}

function buildFallbackResearch({ businessName, niche, nicheCfg, mode, location, priceFrom }) {
  const ctas = ctasForNiche(niche, mode);
  return {
    painPoints: nicheCfg.painPointSeeds || [],
    trustSignals: nicheCfg.trustSignals || [],
    faq: defaultFaq(niche, businessName),
    pricingBand: priceFrom ? { low: Number(priceFrom), high: Number(priceFrom) * 1.5 } : { low: 0, high: 0 },
    heroHeadline: heroHeadline(niche, businessName, location),
    heroSubtitle: heroSubtitle(niche, location),
    primaryCta: ctas.primary,
    secondaryCta: ctas.secondary,
    location: location || "",
  };
}

function heroHeadline(niche, name, location) {
  const loc = location ? ` ב${location}` : "";
  switch (niche) {
    case "restaurant": return `${name}${loc} — חוויה קולינרית שלא תשכחו`;
    case "lawyer":     return `${name} — ייצוג משפטי שאפשר לסמוך עליו`;
    case "clinic":     return `${name}${loc} — טיפול מקצועי, יחס אישי`;
    case "fitness":    return `${name}${loc} — תוצאות, לא הבטחות`;
    case "tradesman":  return `${name}${loc} — שירות מהיר ואמין, 24/7`;
    case "beauty":     return `${name}${loc} — היופי שלך, בידיים הכי טובות`;
    default:           return `${name} — שירות מקצועי ${loc}`.trim();
  }
}

function heroSubtitle(niche, location) {
  const loc = location ? ` ${location}` : "";
  switch (niche) {
    case "restaurant": return `מסעדה משפחתית${loc}. אוכל אמיתי, תפריט שמתחדש, חוויה שמתחילה ברגע שאתם נכנסים.`;
    case "lawyer":     return `ייעוץ ראשוני חינם, תמחור ברור מראש, ליווי אישי מהתיק הראשון עד פסק הדין.`;
    case "clinic":     return `קליניקה מאובזרת בציוד חדיש, צוות מנוסה, ותוצאות שמדברות בעד עצמן.`;
    case "fitness":    return `אימונים מותאמים אישית, מסלול ברור, ותוצאות שתראו תוך חודשיים.`;
    case "tradesman":  return `קוראים — מגיעים. עובדים נקי, מסיימים בזמן, אחריות מלאה על העבודה.`;
    case "beauty":     return `טיפולים פרימיום בידיים מנוסות, סביבה רגועה, ותוצאה שגורמת לך לחייך במראה.`;
    default:           return `שירות אישי, מחירים הוגנים, ועבודה שמדברת בעד עצמה.`;
  }
}

function ctasForNiche(niche, mode) {
  if (mode === "lead-gen") {
    return { primary: "אבחון AI חינם ←", secondary: "לדבר ישיר בוואטסאפ" };
  }
  switch (niche) {
    case "restaurant": return { primary: "להזמין שולחן", secondary: "לראות את התפריט" };
    case "lawyer":     return { primary: "לקבוע פגישה", secondary: "ייעוץ ראשוני בוואטסאפ" };
    case "clinic":     return { primary: "לקביעת תור", secondary: "שאלה בוואטסאפ" };
    case "fitness":    return { primary: "להזמין שיעור ניסיון", secondary: "לראות מסלולים" };
    case "tradesman":  return { primary: "להזמין עכשיו", secondary: "וואטסאפ — מענה מיידי" };
    case "beauty":     return { primary: "לקביעת תור", secondary: "לראות גלריה" };
    default:           return { primary: "צרו קשר", secondary: "וואטסאפ" };
  }
}

function defaultFaq(niche, name) {
  const common = [
    { q: `איך אפשר ליצור איתכם קשר?`, a: `דרך טופס הצור-קשר באתר, וואטסאפ, או טלפון. אנחנו עונים תוך שעה בשעות הפעילות.` },
    { q: `מה שעות הפעילות?`, a: `ראשון-חמישי 09:00-19:00, שישי 09:00-13:00. שבת סגור.` },
    { q: `האם יש חניה במקום?`, a: `כן, חניה חינמית בסמוך לעסק.` },
  ];
  switch (niche) {
    case "restaurant":
      return [
        { q: `האם צריך להזמין מקום מראש?`, a: `מומלץ, במיוחד בסופי שבוע. אפשר להזמין דרך האתר או בטלפון.` },
        { q: `האם יש אוכל לצמחונים/טבעונים?`, a: `כן, יש לנו תפריט עשיר לצמחונים וטבעונים.` },
        { q: `מה התקציב הממוצע למנה?`, a: `מנות עיקריות בין 60-120 ש"ח. תפריט עסקי בצהריים בכ-69 ש"ח.` },
        ...common,
      ];
    case "lawyer":
      return [
        { q: `כמה עולה ייעוץ ראשוני?`, a: `הייעוץ הראשוני חינם, עד 30 דקות. נחתום על חוזה רק אם נחליט לקדם את התיק.` },
        { q: `באילו תחומי משפט אתם מתמחים?`, a: `המשרד עוסק במגוון תחומים — נצרף את הרשימה המלאה בעמוד "תחומי עיסוק".` },
        { q: `כמה זמן לוקח לטפל בתיק טיפוסי?`, a: `תלוי בתיק — נשמח לתת לך הערכה ריאלית בייעוץ הראשוני.` },
        ...common,
      ];
    case "clinic":
      return [
        { q: `האם הטיפולים כלולים בקופת חולים?`, a: `חלק מהטיפולים — נשמח לבדוק מולך בייעוץ הראשוני.` },
        { q: `כמה זמן אורך טיפול ממוצע?`, a: `30-60 דקות לרוב הטיפולים, תלוי בסוג הטיפול.` },
        { q: `האם יש אפשרות לתשלום בתשלומים?`, a: `כן, אנחנו מציעים מספר מסלולי תשלום, כולל קרדיט עד 6 תשלומים.` },
        ...common,
      ];
    case "fitness":
      return [
        { q: `האם יש שיעור ניסיון בחינם?`, a: `כן, שיעור ניסיון ראשון בחינם — בואו להכיר את הצוות והגישה.` },
        { q: `מה ההבדל בין המסלולים?`, a: `מסלול בסיסי = 8 אימונים בחודש. מסלול פלוס = ללא הגבלה. מסלול פרו = +תזונה אישית.` },
        { q: `האם אפשר להקפיא חברות?`, a: `כן, אפשר להקפיא עד חודש בשנה ללא חיוב.` },
        ...common,
      ];
    case "tradesman":
      return [
        { q: `כמה מהר אתם מגיעים?`, a: `במקרי חירום — עד שעה. עבודה רגילה — קביעת תור תוך 24 שעות.` },
        { q: `האם יש אחריות על העבודה?`, a: `כן, אחריות מלאה על כל עבודה. אם משהו חוזר — אנחנו חוזרים בחינם.` },
        { q: `איך מקבלים הצעת מחיר?`, a: `שיחת ווידאו של 5 דקות או הגעה לבית — חינם וללא התחייבות.` },
        ...common,
      ];
    case "beauty":
      return [
        { q: `איזה מותגים אתם עובדים איתם?`, a: `אנחנו עובדים רק עם מותגים מובילים — הרשימה המלאה בעמוד "מוצרים".` },
        { q: `מה הזמנים לקבוע תור?`, a: `לרוב תור פנוי תוך 3-5 ימים. בחגים מומלץ להזמין שבועיים מראש.` },
        { q: `האם יש חבילות לאירועים?`, a: `כן, יש לנו חבילות מיוחדות לכלות, בנות מצווה, ואירועים משפחתיים.` },
        ...common,
      ];
    default:
      return common;
  }
}

function renderHtml({ businessName, niche, nicheCfg, research, mode, designTokens }) {
  const { palette, alternativePalettes = [], typography, source } = designTokens;
  const headingFont = typography?.headingFont || "Heebo";
  const bodyFont = typography?.bodyFont || "Heebo";

  const sections = (nicheCfg.pages || ["home"]).map((p) => renderSection(p, { businessName, niche, nicheCfg, research, mode })).join("\n");
  const footer = renderPaletteSwitcher({ palette, alternativePalettes, niche, businessName, source });

  return `<!DOCTYPE html>
<html lang="he-IL" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>WIREFRAME — ${escape(businessName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: ${palette.bg};
      --surface: ${palette.surface};
      --accent: ${palette.accent};
      --text: ${palette.text};
      --mute: ${palette.mute || mixHex(palette.text, palette.bg, 0.5)};
      --accent-glow: ${rgbaFromHex(palette.accent, 0.25)};
      --border: ${mixHex(palette.surface, palette.text, 0.18)};
    }
    * { box-sizing: border-box; }
    body { font-family: "${bodyFont}", "Segoe UI", Arial, sans-serif; background: var(--bg); color: var(--text); max-width: 760px; margin: 0 auto; padding: 48px 24px 80px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
    h1, h2, h3 { font-family: "${headingFont}", "Segoe UI", Arial, sans-serif; color: var(--text); }
    h1 { font-size: 36px; margin: 0 0 14px; font-weight: 800; line-height: 1.15; letter-spacing: -0.01em; }
    h2 { font-size: 24px; margin: 24px 0 12px; font-weight: 700; }
    h3 { font-size: 17px; margin: 16px 0 8px; font-weight: 600; }
    p { font-size: 15.5px; line-height: 1.65; margin: 8px 0; color: var(--text); opacity: 0.92; }
    ul { font-size: 14px; padding-right: 20px; }
    li { margin: 4px 0; opacity: 0.92; }
    .wf-section { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 24px; margin: 18px 0; }
    .wf-img { background: ${rgbaFromHex(palette.text, 0.06)}; padding: 60px 24px; text-align: center; font-size: 13px; color: var(--mute); border: 1px dashed ${rgbaFromHex(palette.text, 0.18)}; border-radius: 10px; margin: 12px 0; }
    .wf-btn { display: inline-block; background: var(--accent); color: ${contrastText(palette.accent)}; padding: 12px 22px; font-weight: 700; font-size: 15px; margin: 8px 4px 8px 0; border-radius: 999px; text-decoration: none; box-shadow: 0 4px 12px var(--accent-glow); }
    .wf-btn-ghost { background: transparent; color: var(--text); border: 1.5px solid ${rgbaFromHex(palette.text, 0.3)}; box-shadow: none; }
    .wf-input { display: block; width: 100%; padding: 11px 14px; border: 1px solid var(--border); background: ${rgbaFromHex(palette.text, 0.04)}; color: var(--text); margin: 8px 0; font-family: inherit; font-size: 14px; border-radius: 8px; }
    .wf-input::placeholder { color: var(--mute); }
    .wf-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--accent); margin-bottom: 12px; font-family: "JetBrains Mono", monospace; font-weight: 700; opacity: 0.85; }
    .wf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
    .wf-card { border: 1px solid var(--border); padding: 16px; border-radius: 10px; background: ${rgbaFromHex(palette.text, 0.025)}; }
    .wf-price-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid ${rgbaFromHex(palette.text, 0.08)}; font-size: 14px; }
    .wf-faq-q { font-weight: 700; margin-top: 14px; }
    .wf-faq-a { color: var(--mute); font-size: 14px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { border: 1px solid var(--border); padding: 10px; text-align: right; }
    th { background: ${rgbaFromHex(palette.text, 0.05)}; font-weight: 700; }
    .wf-meta { position: fixed; top: 14px; right: 14px; font-size: 10px; color: var(--mute); font-family: "JetBrains Mono", monospace; background: var(--surface); padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px; }
    .wf-source-chip { display: inline-block; background: var(--accent); color: ${contrastText(palette.accent)}; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-family: "JetBrains Mono", monospace; margin-right: 6px; }
    .wf-palette-switcher { margin-top: 60px; padding: 32px; border: 1px dashed var(--border); border-radius: 14px; background: ${rgbaFromHex(palette.text, 0.02)}; }
    .wf-palette-card { display: flex; gap: 12px; align-items: center; padding: 14px; border: 1px solid var(--border); border-radius: 10px; margin: 10px 0; background: ${rgbaFromHex(palette.text, 0.03)}; }
    .wf-palette-swatches { display: flex; gap: 4px; }
    .wf-palette-swatch { width: 24px; height: 24px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1); }
    .wf-palette-info { flex: 1; }
    .wf-palette-info h4 { font-size: 14px; font-weight: 700; margin: 0 0 4px; color: var(--text); }
    .wf-palette-info code { font-family: "JetBrains Mono", monospace; font-size: 11px; background: ${rgbaFromHex(palette.text, 0.08)}; padding: 2px 6px; border-radius: 4px; color: var(--text); display: inline-block; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="wf-meta">
    <span class="wf-source-chip">${escape(source)}</span>
    ${escape(niche)} · ${escape(mode)} · ${escape(palette.name)}
  </div>
  ${sections}
  ${footer}
</body>
</html>`;
}

function renderPaletteSwitcher({ palette, alternativePalettes, niche, businessName, source }) {
  if (source === "designer-skills") {
    return `<div class="wf-palette-switcher">
  <div class="wf-label">DESIGN SOURCE</div>
  <h3>פלטה זו נוצרה דרך Owl-Listener/designer-skills</h3>
  <p style="font-size: 13px;">אם את/ה רוצה לשנות פלטה — תאמר/י ל-Claude ונקרא ל-/ui-design:color-system שוב לקבלת אפשרויות חדשות.</p>
  <div class="wf-palette-card">
    <div class="wf-palette-swatches">
      <div class="wf-palette-swatch" style="background: ${palette.bg};" title="bg"></div>
      <div class="wf-palette-swatch" style="background: ${palette.surface};" title="surface"></div>
      <div class="wf-palette-swatch" style="background: ${palette.accent};" title="accent"></div>
      <div class="wf-palette-swatch" style="background: ${palette.text};" title="text"></div>
    </div>
    <div class="wf-palette-info">
      <h4>${escape(palette.label || palette.name)} <span style="opacity:.6; font-weight:400;">· active</span></h4>
      <code>bg ${palette.bg} · surface ${palette.surface} · accent ${palette.accent} · text ${palette.text}</code>
    </div>
  </div>
</div>`;
  }

  if (source === "owl-lead-gen") {
    return `<div class="wf-palette-switcher">
  <div class="wf-label">PALETTE — OWL lead-gen mode</div>
  <h3>זוהי הפלטה של Autoflowr (lead-gen mode)</h3>
  <p style="font-size: 13px;">המצב הזה משתמש ב-OWL לבחירה של Autoflowr עצמה. עבור אתרי לקוחות, השתמש ב-<code style="font-family: 'JetBrains Mono'; background: rgba(255,255,255,0.1); padding: 1px 6px; border-radius: 3px;">--mode=client-site</code> או הריץ דרך Claude שיקרא ל-Owl-Listener/designer-skills.</p>
</div>`;
  }

  // niche-fallback — show alternatives
  if (!alternativePalettes.length) return "";
  const slug = makeSlugForCmd(businessName);
  return `<div class="wf-palette-switcher">
  <div class="wf-label">CHOOSE A DIFFERENT PALETTE</div>
  <h3>פלטות נוספות לנישה זו</h3>
  <p style="font-size: 13px;">הפלטה הנוכחית: <strong>${escape(palette.label || palette.name)}</strong>. להחלפה — הריץ שוב עם הפלטה הרצויה, או תגיד/י ל-Claude להפעיל את <code style="font-family:'JetBrains Mono'; background: ${rgbaFromHex(palette.text, 0.08)}; padding: 1px 6px; border-radius: 3px;">/ui-design:color-system</code> ליצירת פלטה ייחודית לעסק.</p>
  ${alternativePalettes.map((alt) => `
    <div class="wf-palette-card">
      <div class="wf-palette-swatches">
        <div class="wf-palette-swatch" style="background: ${alt.bg};"></div>
        <div class="wf-palette-swatch" style="background: ${alt.surface};"></div>
        <div class="wf-palette-swatch" style="background: ${alt.accent};"></div>
        <div class="wf-palette-swatch" style="background: ${alt.text};"></div>
      </div>
      <div class="wf-palette-info">
        <h4>${escape(alt.label || alt.name)}</h4>
        <code>node bin/build-business-site.js "${escape(businessName)}" ${escape(niche)} --wireframe-only --palette ${escape(alt.name)}</code>
      </div>
    </div>`).join("")}
</div>`;
}

function renderSection(name, ctx) {
  const { businessName, niche, nicheCfg, research, mode } = ctx;
  switch (name) {
    case "home":
    case "hero":
      return `<div class="wf-section">
  <div class="wf-label">HERO</div>
  <h1>${escape(research.heroHeadline)}</h1>
  <p>${escape(research.heroSubtitle)}</p>
  <span class="wf-btn">${escape(research.primaryCta)}</span>
  <span class="wf-btn wf-btn-ghost">${escape(research.secondaryCta)}</span>
  <div class="wf-img">[IMAGE: hero — ${(nicheCfg.imagePromptHints || ["business hero"]).join(", ")}]</div>
</div>`;

    case "pain_points":
      return `<div class="wf-section">
  <div class="wf-label">PAIN POINTS</div>
  <h2>אם הסיטואציה הזו מוכרת לך…</h2>
  <ul>
    ${(research.painPoints || []).map((p) => `<li>${escape(p)}</li>`).join("\n    ")}
  </ul>
</div>`;

    case "menu":
      return `<div class="wf-section">
  <div class="wf-label">MENU</div>
  <h2>התפריט שלנו</h2>
  <h3>ראשונים</h3>
  ${menuItems(["סלט הבית", "ברוסקטה עגבניות", "קלמארי מטוגן", "קרפצ'ו דג"])}
  <h3>עיקריים</h3>
  ${menuItems(["סטייק אנטריקוט", "דג היום על הפלנצ'ה", "פסטה ביתית", "המבורגר השף"])}
  <h3>קינוחים</h3>
  ${menuItems(["טירמיסו ביתי", "מולטן שוקולד", "סורבה לימון", "פאי תפוחים"])}
  <div class="wf-img">[IMAGE: food photography — 3-4 hero dishes]</div>
</div>`;

    case "reservations":
      return `<div class="wf-section">
  <div class="wf-label">RESERVATIONS</div>
  <h2>להזמין שולחן</h2>
  <p>מילוי הטופס שולח הודעת וואטסאפ ישירה למסעדה.</p>
  <input class="wf-input" placeholder="שם מלא">
  <input class="wf-input" placeholder="טלפון">
  <input class="wf-input" placeholder="תאריך">
  <input class="wf-input" placeholder="שעה">
  <input class="wf-input" placeholder="מספר סועדים">
  <span class="wf-btn">לשליחת הזמנה</span>
</div>`;

    case "location":
      return `<div class="wf-section">
  <div class="wf-label">LOCATION</div>
  <h2>איפה אנחנו</h2>
  <div class="wf-img">[IMAGE: Google Maps embed או צילום של החזית]</div>
  <p><strong>כתובת:</strong> [הכניסו כתובת]</p>
  <p><strong>שעות פעילות:</strong> ראשון-חמישי 12:00-23:00 · שישי 12:00-15:00 · שבת סגור</p>
  <p><strong>טלפון:</strong> [הכניסו טלפון]</p>
</div>`;

    case "gallery":
      return `<div class="wf-section">
  <div class="wf-label">GALLERY</div>
  <h2>גלריה</h2>
  <div class="wf-grid">
    ${[1,2,3,4,5,6].map((i) => `<div class="wf-img" style="padding: 40px 12px;">[IMG ${i}]</div>`).join("\n    ")}
  </div>
</div>`;

    case "practice_areas":
      return `<div class="wf-section">
  <div class="wf-label">PRACTICE AREAS</div>
  <h2>תחומי עיסוק</h2>
  <div class="wf-grid">
    ${["דיני משפחה", "נזיקין", "מקרקעין", "פלילי", "צוואות וירושות", "תאגידי"].map((t) => `<div class="wf-card"><h3>${escape(t)}</h3><p style="font-size: 13.5px;">תיאור קצר של התחום ומה אנחנו עושים בו.</p><span style="font-size:13px; color: var(--accent);">קרא עוד ←</span></div>`).join("\n    ")}
  </div>
</div>`;

    case "articles":
      return `<div class="wf-section">
  <div class="wf-label">ARTICLES LOG</div>
  <h2>מאמרים אחרונים</h2>
  ${[1,2,3,4].map((i) => `<div style="border-bottom: 1px solid var(--border); padding: 14px 0;"><h3>כותרת מאמר ${i}</h3><p style="font-size: 13.5px; color: var(--mute);">תקציר של 2 שורות מה המאמר נותן לקורא ולמה כדאי לקרוא.</p><span style="font-size:12px; color: var(--mute);">15 דק' קריאה · מאי 2026</span></div>`).join("\n  ")}
</div>`;

    case "treatments":
      return `<div class="wf-section">
  <div class="wf-label">TREATMENTS</div>
  <h2>הטיפולים שלנו</h2>
  <div class="wf-grid">
    ${["טיפול א", "טיפול ב", "טיפול ג", "טיפול ד"].map((t) => `<div class="wf-card"><h3>${escape(t)}</h3><p style="font-size:13px;">תיאור קצר · 45 דק'</p><strong style="color: var(--accent);">החל מ-₪450</strong></div>`).join("\n    ")}
  </div>
</div>`;

    case "classes":
      return `<div class="wf-section">
  <div class="wf-label">CLASS SCHEDULE</div>
  <h2>לוח שיעורים</h2>
  <table>
    <tr><th>יום</th><th>שעה</th><th>שיעור</th><th>מאמן/ת</th></tr>
    <tr><td>ראשון</td><td>07:00</td><td>HIIT</td><td>דני</td></tr>
    <tr><td>שני</td><td>18:30</td><td>פילאטיס</td><td>מירב</td></tr>
    <tr><td>שלישי</td><td>19:00</td><td>זומבה</td><td>נועה</td></tr>
    <tr><td>רביעי</td><td>07:00</td><td>כוח</td><td>דני</td></tr>
    <tr><td>חמישי</td><td>20:00</td><td>יוגה</td><td>תמר</td></tr>
  </table>
</div>`;

    case "packages":
      return `<div class="wf-section">
  <div class="wf-label">PACKAGES</div>
  <h2>מסלולים</h2>
  <div class="wf-grid">
    <div class="wf-card"><h3>בסיסי</h3><p>8 אימונים בחודש</p><strong style="color: var(--accent);">₪320 / חודש</strong></div>
    <div class="wf-card"><h3>פלוס</h3><p>ללא הגבלה</p><strong style="color: var(--accent);">₪520 / חודש</strong></div>
    <div class="wf-card"><h3>פרו</h3><p>+ תזונה אישית</p><strong style="color: var(--accent);">₪890 / חודש</strong></div>
  </div>
</div>`;

    case "services":
      if (niche === "tradesman") {
        return `<div class="wf-section">
  <div class="wf-label">EMERGENCY BANNER + SERVICES</div>
  <div style="background: var(--accent); color: #111; padding: 18px; text-align: center; margin: -8px -8px 16px; border-radius: 8px;">
    <strong style="font-size: 18px;">חירום? אנחנו מגיעים תוך שעה</strong>
    <span class="wf-btn" style="background: #111; color: #fff; margin-right: 16px; box-shadow: none;">חייגו עכשיו</span>
  </div>
  <h2>השירותים שלנו</h2>
  <ul>
    <li>שירות א — תיאור קצר</li>
    <li>שירות ב — תיאור קצר</li>
    <li>שירות ג — תיאור קצר</li>
    <li>שירות ד — תיאור קצר</li>
  </ul>
</div>`;
      }
      return `<div class="wf-section">
  <div class="wf-label">SERVICES</div>
  <h2>השירותים שלנו</h2>
  <div class="wf-grid">
    ${["שירות א", "שירות ב", "שירות ג", "שירות ד"].map((s) => `<div class="wf-card"><h3>${escape(s)}</h3><p style="font-size:13.5px;">תיאור קצר.</p></div>`).join("\n    ")}
  </div>
</div>`;

    case "service_area":
      return `<div class="wf-section">
  <div class="wf-label">SERVICE AREA</div>
  <h2>אזורי שירות</h2>
  <p>אנחנו מגיעים ל: [רשימת ערים/שכונות]. לא בטוחים אם אנחנו מגיעים אליכם? שלחו וואטסאפ ונבדוק.</p>
  <div class="wf-img">[IMAGE: מפה של אזורי השירות]</div>
</div>`;

    case "reviews":
      return `<div class="wf-section">
  <div class="wf-label">REVIEWS</div>
  <h2>מה הלקוחות אומרים</h2>
  ${[1,2,3].map((i) => `<div style="border-right: 3px solid var(--accent); padding: 8px 16px; margin: 14px 0; background: rgba(255,255,255,0.02);"><p>"ציטוט של לקוח ${i} על איכות השירות, הזמנים, והתוצאה."</p><span style="font-size: 12px; color: var(--mute);">— שם לקוח · ⭐⭐⭐⭐⭐</span></div>`).join("\n  ")}
</div>`;

    case "pricing":
      return `<div class="wf-section">
  <div class="wf-label">PRICING</div>
  <h2>מחירים</h2>
  <p>${research.pricingBand?.low ? `החל מ-₪${research.pricingBand.low}` : "תמחור שקוף — ללא הפתעות"}.</p>
  <ul>
    <li>שירות בסיסי — החל מ-₪[סכום]</li>
    <li>שירות מורחב — החל מ-₪[סכום]</li>
    <li>חבילה פרימיום — החל מ-₪[סכום]</li>
  </ul>
</div>`;

    case "about":
      return `<div class="wf-section">
  <div class="wf-label">ABOUT</div>
  <h2>מי אנחנו</h2>
  <div class="wf-img" style="padding: 30px; max-width: 200px; display: inline-block;">[IMAGE: founder portrait]</div>
  <p>פסקה ראשונה — מי המייסד/ת, מה הרקע, מה הניסיון.</p>
  <p>פסקה שנייה — למה התחילו את העסק, מה הייחוד, מה הערכים.</p>
</div>`;

    case "faq":
      return `<div class="wf-section">
  <div class="wf-label">FAQ</div>
  <h2>שאלות נפוצות</h2>
  ${(research.faq || []).map((item) => `<div class="wf-faq-q">${escape(item.q)}</div><div class="wf-faq-a">${escape(item.a)}</div>`).join("\n  ")}
</div>`;

    case "lead_form":
    case "contact":
      return `<div class="wf-section">
  <div class="wf-label">LEAD FORM / CONTACT</div>
  <h2>${niche === "tradesman" ? "צריכים שירות עכשיו?" : "השאירו פרטים — נחזור אליכם"}</h2>
  <input class="wf-input" placeholder="שם מלא">
  <input class="wf-input" placeholder="טלפון">
  <input class="wf-input" placeholder="הודעה (אופציונלי)" style="height: 80px;">
  <span class="wf-btn">${escape(research.primaryCta)}</span>
  <p style="font-size: 12px; color: var(--mute); margin-top: 12px;">הטופס נשלח ישירות לוואטסאפ של ${escape(niche)} — מענה תוך שעה בשעות הפעילות.</p>
</div>`;

    case "team":
      return `<div class="wf-section">
  <div class="wf-label">TEAM</div>
  <h2>הצוות</h2>
  <div class="wf-grid">
    ${[1,2,3,4].map((i) => `<div class="wf-card"><div class="wf-img" style="padding: 30px; margin-bottom: 8px;">[PORTRAIT ${i}]</div><h3>שם ${i}</h3><p style="font-size: 13px;">תפקיד · מומחיות</p></div>`).join("\n    ")}
  </div>
</div>`;

    case "trainers":
      return `<div class="wf-section">
  <div class="wf-label">TRAINERS</div>
  <h2>המאמנים</h2>
  <div class="wf-grid">
    ${["דני", "מירב", "נועה", "תמר"].map((n) => `<div class="wf-card"><div class="wf-img" style="padding: 24px;">[PORTRAIT ${escape(n)}]</div><h3>${escape(n)}</h3><p style="font-size: 13px;">תחום אימון · ניסיון</p></div>`).join("\n    ")}
  </div>
</div>`;

    case "transformations":
      return `<div class="wf-section">
  <div class="wf-label">TRANSFORMATIONS</div>
  <h2>תוצאות אמיתיות</h2>
  <div class="wf-grid">
    ${[1,2,3,4].map((i) => `<div class="wf-card"><div class="wf-img" style="padding: 30px;">[BEFORE / AFTER ${i}]</div><p style="font-size:13px;">"ציטוט קצר מהמתאמן/ת."</p></div>`).join("\n    ")}
  </div>
</div>`;

    case "booking":
      return `<div class="wf-section">
  <div class="wf-label">BOOKING</div>
  <h2>לקבוע תור</h2>
  <p>בחרו טיפול, יום ושעה — מענה מיידי.</p>
  <input class="wf-input" placeholder="סוג טיפול">
  <input class="wf-input" placeholder="יום מועדף">
  <input class="wf-input" placeholder="שעה מועדפת">
  <input class="wf-input" placeholder="שם וטלפון">
  <span class="wf-btn">לקביעת תור</span>
</div>`;

    case "footer":
      return `<div class="wf-section">
  <div class="wf-label">FOOTER</div>
  <p><strong>${escape(businessName)}</strong></p>
  <p style="font-size: 13px; color: var(--mute);">טלפון · וואטסאפ · כתובת · שעות פעילות</p>
  <p style="font-size: 12px; color: var(--mute);">© 2026 ${escape(businessName)} · אתר בנייה: Autoflowr Studio</p>
</div>`;

    default:
      return `<div class="wf-section">
  <div class="wf-label">${escape(name.toUpperCase())}</div>
  <p style="color: var(--mute);">[Section "${escape(name)}" — to be defined]</p>
</div>`;
  }
}

function menuItems(items) {
  return items.map((name) => `<div class="wf-price-row"><span>${escape(name)}</span><span style="color: var(--mute);">₪[מחיר]</span></div>`).join("\n  ");
}

function escape(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function rgbaFromHex(hex, alpha) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mixHex(a, b, ratio) {
  const ha = a.replace("#", ""), hb = b.replace("#", "");
  const parse = (h) => {
    const v = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  };
  const [r1, g1, b1] = parse(ha);
  const [r2, g2, b2] = parse(hb);
  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const bb = Math.round(b1 * (1 - ratio) + b2 * ratio);
  return `#${[r, g, bb].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function contrastText(hex) {
  const h = hex.replace("#", "");
  const v = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.6 ? "#111" : "#fff";
}

function makeSlugForCmd(name) {
  // For embedding into the re-run command shown in the wireframe footer
  return String(name).trim();
}
