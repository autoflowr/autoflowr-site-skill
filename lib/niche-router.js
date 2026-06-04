/**
 * Niche router — given a niche config, produce niche-specific section components
 * that get inserted into app/page.tsx between <Hero /> and <LeadForm />.
 *
 * Each section is materialized as a small TSX component in
 * <outDir>/components/sections/<SectionName>.tsx, and the page.tsx renders
 * them in the order dictated by nicheCfg.pages.
 */

import fs from "fs-extra";
import path from "node:path";

const SKIP_SECTIONS = new Set(["home", "hero", "lead_form", "contact", "footer"]);

export async function generateNicheSections({ outDir, nicheCfg, businessName, niche, research }) {
  const sectionsDir = path.join(outDir, "components", "sections");
  await fs.ensureDir(sectionsDir);

  const pages = (nicheCfg.pages || []).filter((p) => !SKIP_SECTIONS.has(p));
  const written = [];
  const imports = [];
  const renders = [];

  for (const p of pages) {
    const componentName = toComponentName(p);
    const filePath = path.join(sectionsDir, `${componentName}.tsx`);
    const code = renderSectionComponent(p, { businessName, niche, nicheCfg, research, componentName });
    await fs.writeFile(filePath, code, "utf8");
    written.push(`components/sections/${componentName}.tsx`);
    imports.push(`import ${componentName} from "@/components/sections/${componentName}";`);
    renders.push(`      <${componentName} />`);
  }

  return { written, imports, renders };
}

function toComponentName(slug) {
  return slug
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

function renderSectionComponent(name, ctx) {
  const { componentName, niche } = ctx;
  switch (name) {
    case "menu":           return menuSection(componentName);
    case "reservations":   return reservationsSection(componentName);
    case "location":       return locationSection(componentName);
    case "gallery":        return gallerySection(componentName);
    case "practice_areas": return practiceAreasSection(componentName);
    case "articles":       return articlesSection(componentName);
    case "treatments":     return treatmentsSection(componentName);
    case "classes":        return classesSection(componentName);
    case "packages":       return packagesSection(componentName);
    case "services":       return niche === "tradesman" ? tradesmanServicesSection(componentName) : servicesSection(componentName);
    case "service_area":   return serviceAreaSection(componentName);
    case "reviews":        return reviewsSection(componentName);
    case "pricing":        return pricingSection(componentName);
    case "about":          return aboutSection(componentName);
    case "faq":            return faqSection(componentName);
    case "team":           return teamSection(componentName);
    case "trainers":       return trainersSection(componentName);
    case "transformations":return transformationsSection(componentName);
    case "booking":        return bookingSection(componentName);
    default:               return stubSection(componentName, name);
  }
}

const SECTION_WRAPPER = (name, body) => `"use client";
import { motion } from "framer-motion";

export default function ${name}() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="px-6 py-16 max-w-5xl mx-auto"
    >
${body}
    </motion.section>
  );
}
`;

function menuSection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-6">התפריט שלנו</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { name: "סלט הבית", price: "₪38" },
          { name: "ברוסקטה עגבניות", price: "₪42" },
          { name: "סטייק אנטריקוט", price: "₪140" },
          { name: "דג היום", price: "₪110" },
          { name: "טירמיסו ביתי", price: "₪32" },
          { name: "מולטן שוקולד", price: "₪36" },
        ].map((item) => (
          <div key={item.name} className="flex justify-between border-b border-text/10 py-3">
            <span>{item.name}</span>
            <span className="text-mute">{item.price}</span>
          </div>
        ))}
      </div>`);
}

function reservationsSection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-4">להזמין שולחן</h2>
      <p className="text-text/80 mb-6">השאירו פרטים — נאשר תוך שעה בוואטסאפ.</p>
      <a href="#lead" className="inline-flex rounded-full bg-accent text-black font-bold px-7 py-3 shadow-glow">להזמין שולחן</a>`);
}

function locationSection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-4">איפה אנחנו</h2>
      <div className="aspect-[16/9] rounded-xl bg-surface border border-text/10 grid place-items-center text-mute mb-6">
        [Google Maps embed]
      </div>
      <ul className="space-y-2 text-text/90">
        <li><strong>כתובת:</strong> [הכניסו כתובת]</li>
        <li><strong>שעות:</strong> ראשון-חמישי 12:00-23:00 · שישי 12:00-15:00</li>
        <li><strong>חניה:</strong> חינמית בסמוך</li>
      </ul>`);
}

function gallerySection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-6">גלריה</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1,2,3,4,5,6].map((i) => (
          <div key={i} className="aspect-square rounded-xl bg-surface border border-text/10 grid place-items-center text-mute text-sm">
            [תמונה {i}]
          </div>
        ))}
      </div>`);
}

function practiceAreasSection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-6">תחומי עיסוק</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["דיני משפחה", "נזיקין", "מקרקעין", "פלילי", "צוואות וירושות", "תאגידי"].map((t) => (
          <div key={t} className="rounded-xl border border-text/10 bg-surface p-5 hover:-translate-y-1 hover:shadow-glow transition-all">
            <h3 className="font-bold text-lg mb-2">{t}</h3>
            <p className="text-sm text-text/80 mb-3">תיאור קצר של התחום ומה אנחנו עושים בו.</p>
            <span className="text-accent text-sm">קרא עוד ←</span>
          </div>
        ))}
      </div>`);
}

function articlesSection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-6">מאמרים אחרונים</h2>
      <div className="space-y-4">
        {[1,2,3].map((i) => (
          <article key={i} className="rounded-xl border border-text/10 bg-surface p-5 hover:-translate-y-1 transition-transform">
            <h3 className="text-xl font-bold mb-2">כותרת מאמר {i}</h3>
            <p className="text-sm text-text/80 mb-3">תקציר של 2 שורות מה המאמר נותן לקורא ולמה כדאי לקרוא.</p>
            <span className="text-xs text-mute">15 דק' קריאה · מאי 2026</span>
          </article>
        ))}
      </div>`);
}

function treatmentsSection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-6">הטיפולים שלנו</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {[{n:"טיפול א",d:"45 דק'",p:"₪450"},{n:"טיפול ב",d:"60 דק'",p:"₪620"},{n:"טיפול ג",d:"30 דק'",p:"₪350"},{n:"טיפול ד",d:"90 דק'",p:"₪890"}].map((t) => (
          <div key={t.n} className="rounded-xl border border-text/10 bg-surface p-5">
            <h3 className="font-bold text-lg">{t.n}</h3>
            <p className="text-sm text-mute mt-1">{t.d}</p>
            <p className="text-accent font-bold mt-3">החל מ-{t.p}</p>
          </div>
        ))}
      </div>`);
}

function classesSection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-6">לוח שיעורים</h2>
      <div className="overflow-x-auto rounded-xl border border-text/10">
        <table className="w-full text-sm">
          <thead className="bg-surface">
            <tr><th className="p-3 text-start">יום</th><th className="p-3 text-start">שעה</th><th className="p-3 text-start">שיעור</th><th className="p-3 text-start">מאמן/ת</th></tr>
          </thead>
          <tbody>
            <tr className="border-t border-text/5"><td className="p-3">ראשון</td><td className="p-3">07:00</td><td className="p-3">HIIT</td><td className="p-3">דני</td></tr>
            <tr className="border-t border-text/5"><td className="p-3">שני</td><td className="p-3">18:30</td><td className="p-3">פילאטיס</td><td className="p-3">מירב</td></tr>
            <tr className="border-t border-text/5"><td className="p-3">שלישי</td><td className="p-3">19:00</td><td className="p-3">זומבה</td><td className="p-3">נועה</td></tr>
            <tr className="border-t border-text/5"><td className="p-3">חמישי</td><td className="p-3">20:00</td><td className="p-3">יוגה</td><td className="p-3">תמר</td></tr>
          </tbody>
        </table>
      </div>`);
}

function packagesSection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-6">מסלולים</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {[{t:"בסיסי",d:"8 אימונים בחודש",p:"₪320"},{t:"פלוס",d:"ללא הגבלה",p:"₪520"},{t:"פרו",d:"+ תזונה אישית",p:"₪890"}].map((m) => (
          <div key={m.t} className="rounded-xl border border-text/10 bg-surface p-6">
            <h3 className="font-bold text-xl">{m.t}</h3>
            <p className="text-text/80 my-2">{m.d}</p>
            <p className="text-accent font-bold text-lg">{m.p} / חודש</p>
          </div>
        ))}
      </div>`);
}

function servicesSection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-6">השירותים שלנו</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {["שירות א", "שירות ב", "שירות ג", "שירות ד"].map((s) => (
          <div key={s} className="rounded-xl border border-text/10 bg-surface p-5 hover:-translate-y-1 hover:shadow-glow transition-all">
            <h3 className="font-bold">{s}</h3>
            <p className="text-sm text-text/80 mt-2">תיאור קצר.</p>
          </div>
        ))}
      </div>`);
}

function tradesmanServicesSection(n) {
  return SECTION_WRAPPER(n, `      <div className="rounded-2xl bg-accent text-black p-6 text-center mb-8">
        <strong className="text-xl">חירום? אנחנו מגיעים תוך שעה</strong>
        <a href="tel:+972XXXXXXXXX" className="inline-block mr-4 rounded-full bg-black text-accent font-bold px-6 py-2">חייגו עכשיו</a>
      </div>
      <h2 className="text-3xl font-bold mb-6">השירותים שלנו</h2>
      <ul className="space-y-3">
        {["שירות א — תיאור קצר","שירות ב — תיאור קצר","שירות ג — תיאור קצר","שירות ד — תיאור קצר"].map((s) => (
          <li key={s} className="rounded-xl border border-text/10 bg-surface p-4">{s}</li>
        ))}
      </ul>`);
}

function serviceAreaSection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-4">אזורי שירות</h2>
      <p className="text-text/80 mb-6">אנחנו מגיעים ל: [רשימת ערים/שכונות]. לא בטוחים? שלחו וואטסאפ ונבדוק.</p>
      <div className="aspect-[16/9] rounded-xl bg-surface border border-text/10 grid place-items-center text-mute">
        [מפת אזורי שירות]
      </div>`);
}

function reviewsSection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-6">מה הלקוחות אומרים</h2>
      <div className="space-y-4">
        {[1,2,3].map((i) => (
          <blockquote key={i} className="border-e-4 border-accent bg-surface p-5 rounded-xl">
            <p className="text-text/90">"ציטוט של לקוח {i} על איכות השירות, הזמנים, והתוצאה."</p>
            <footer className="mt-3 text-sm text-mute">— שם לקוח · ⭐⭐⭐⭐⭐</footer>
          </blockquote>
        ))}
      </div>`);
}

function pricingSection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-4">מחירים</h2>
      <p className="text-text/80 mb-6">תמחור שקוף — ללא הפתעות.</p>
      <ul className="space-y-2">
        <li className="rounded-xl border border-text/10 bg-surface p-4">שירות בסיסי — החל מ-₪[סכום]</li>
        <li className="rounded-xl border border-text/10 bg-surface p-4">שירות מורחב — החל מ-₪[סכום]</li>
        <li className="rounded-xl border border-text/10 bg-surface p-4">חבילה פרימיום — החל מ-₪[סכום]</li>
      </ul>`);
}

function aboutSection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-6">מי אנחנו</h2>
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <div className="aspect-square rounded-xl bg-surface border border-text/10 grid place-items-center text-mute">[תמונת מייסד]</div>
        <div>
          <p className="text-text/90 mb-3">פסקה ראשונה — מי המייסד/ת, מה הרקע, מה הניסיון.</p>
          <p className="text-text/90">פסקה שנייה — למה התחילו את העסק, מה הייחוד, מה הערכים.</p>
        </div>
      </div>`);
}

function faqSection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-6">שאלות נפוצות</h2>
      <div className="space-y-3">
        {[
          { q: "איך אפשר ליצור איתכם קשר?", a: "טופס באתר, וואטסאפ, או טלפון. מענה תוך שעה בשעות הפעילות." },
          { q: "מה שעות הפעילות?", a: "ראשון-חמישי 09:00-19:00, שישי 09:00-13:00. שבת סגור." },
          { q: "האם יש חניה?", a: "כן, חניה חינמית בסמוך לעסק." },
        ].map((item, i) => (
          <details key={i} className="rounded-xl border border-text/10 bg-surface p-5 group">
            <summary className="font-bold cursor-pointer list-none flex justify-between items-center">
              <span>{item.q}</span>
              <span className="text-accent group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="text-text/80 mt-3">{item.a}</p>
          </details>
        ))}
      </div>`);
}

function teamSection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-6">הצוות</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map((i) => (
          <div key={i} className="rounded-xl border border-text/10 bg-surface p-5 text-center">
            <div className="aspect-square rounded-full bg-bg/40 mx-auto w-24 mb-3 grid place-items-center text-mute text-xs">[פנים {i}]</div>
            <h3 className="font-bold">שם {i}</h3>
            <p className="text-sm text-mute">תפקיד</p>
          </div>
        ))}
      </div>`);
}

function trainersSection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-6">המאמנים</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["דני","מירב","נועה","תמר"].map((name) => (
          <div key={name} className="rounded-xl border border-text/10 bg-surface p-5 text-center">
            <div className="aspect-square rounded-full bg-bg/40 mx-auto w-24 mb-3 grid place-items-center text-mute text-xs">[{name}]</div>
            <h3 className="font-bold">{name}</h3>
            <p className="text-sm text-mute">תחום אימון</p>
          </div>
        ))}
      </div>`);
}

function transformationsSection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-6">תוצאות אמיתיות</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {[1,2,3,4].map((i) => (
          <div key={i} className="rounded-xl border border-text/10 bg-surface p-5">
            <div className="aspect-video rounded-lg bg-bg/40 grid place-items-center text-mute text-sm mb-3">[Before / After {i}]</div>
            <p className="text-sm text-text/80">"ציטוט קצר מהמתאמן/ת."</p>
          </div>
        ))}
      </div>`);
}

function bookingSection(n) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-4">לקבוע תור</h2>
      <p className="text-text/80 mb-6">בחרו טיפול, יום ושעה — מענה מיידי בוואטסאפ.</p>
      <a href="#lead" className="inline-flex rounded-full bg-accent text-black font-bold px-7 py-3 shadow-glow">לקביעת תור</a>`);
}

function stubSection(n, slug) {
  return SECTION_WRAPPER(n, `      <h2 className="text-3xl font-bold mb-4">${slug}</h2>
      <p className="text-text/70">[Section "${slug}" — to be defined]</p>`);
}
