/**
 * SEO + GEO scaffold — generates the SEO/local-SEO infrastructure for the
 * generated Next.js project: metadata, sitemap, robots, schema.org, NAP block,
 * geocoded LocalBusiness.
 *
 * STATUS: stub. Phase 7 wires this into the scaffolder.
 *
 * The scaffold writes these files into the generated project:
 *
 *   app/layout.tsx              - Metadata API + JSON-LD WebSite schema
 *   app/sitemap.ts              - dynamic sitemap from page list
 *   app/robots.ts               - allow all, point to sitemap
 *   app/(seo)/JsonLd.tsx        - server component injecting JSON-LD
 *   components/NapBlock.tsx     - reusable NAP (name/address/phone) chunk
 *   components/MapEmbed.tsx     - Waze + Google Maps deep links
 *   app/api/_ops/indexnow/route.ts  - ping IndexNow on deploy
 *
 * Geocoding: tries OpenStreetMap Nominatim first (free, no key). Falls back to
 * a placeholder if Nominatim returns no result.
 */

/**
 * Build the LocalBusiness JSON-LD for a business.
 *
 * @param {Object} args
 * @param {string} args.businessName
 * @param {string} args.niche - one of restaurant, lawyer, clinic, fitness, tradesman, beauty, _default
 * @param {string} args.address - Full street address
 * @param {{lat: number, lng: number} | null} args.geo - Geocoded coordinates
 * @param {string} args.phone
 * @param {string} args.url - Canonical site URL
 * @param {string[]} args.openingHours - Schema.org formatted (e.g., "Mo-Fr 09:00-18:00")
 * @param {string} args.priceRange - "$", "$$", "$$$", or "$$$$"
 * @returns {Object} LocalBusiness JSON-LD
 */
export function buildLocalBusinessJsonLd({ businessName, niche, address, geo, phone, url, openingHours, priceRange }) {
  const schemaType = nicheToSchemaType(niche);
  const business = {
    "@type": schemaType,
    "@id": `${url}#business`,
    name: businessName,
    url,
    telephone: phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: address,
      addressCountry: "IL",
    },
    priceRange: priceRange || "$$",
  };
  if (geo?.lat && geo?.lng) {
    business.geo = { "@type": "GeoCoordinates", latitude: geo.lat, longitude: geo.lng };
  }
  if (openingHours?.length) {
    business.openingHoursSpecification = openingHours.map(parseOpeningHours).filter(Boolean);
  }
  // Speakable: hooks for Google Assistant + AI search summaries
  business.speakable = {
    "@type": "SpeakableSpecification",
    cssSelector: ["h1", "main p:first-of-type"],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      business,
      {
        "@type": "WebSite",
        "@id": `${url}#website`,
        url,
        name: businessName,
        inLanguage: "he-IL",
        publisher: { "@id": `${url}#business` },
      },
    ],
  };
}

function nicheToSchemaType(niche) {
  return {
    restaurant: "Restaurant",
    lawyer: "LegalService",
    clinic: "MedicalBusiness",
    fitness: "ExerciseGym",
    tradesman: "HomeAndConstructionBusiness",
    beauty: "BeautySalon",
  }[niche] || "LocalBusiness";
}

function parseOpeningHours(spec) {
  // "Mo-Fr 09:00-18:00" -> { dayOfWeek, opens, closes }
  const m = spec.match(/^([A-Za-z,-]+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (!m) return null;
  return {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: m[1],
    opens: m[2],
    closes: m[3],
  };
}

/**
 * Geocode an address via OpenStreetMap Nominatim (free, no key required).
 * Respect their usage policy: max 1 req/sec, identify your app via User-Agent.
 *
 * STATUS: stub — Phase 7 implements this.
 *
 * @param {string} address
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export async function geocodeNominatim(address) {
  // To be implemented in Phase 7. Note the rate limit + UA requirement.
  return null;
}

/**
 * The SEO files this module writes into the generated project.
 * (List used by the scaffolder to track what's generated.)
 */
export const SEO_FILES = [
  "app/layout.tsx",
  "app/sitemap.ts",
  "app/robots.ts",
  "app/(seo)/JsonLd.tsx",
  "components/NapBlock.tsx",
  "components/MapEmbed.tsx",
  "app/api/_ops/indexnow/route.ts",
];
