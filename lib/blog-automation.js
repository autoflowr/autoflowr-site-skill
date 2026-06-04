/**
 * Blog automation scaffold — wires every generated site with a weekly
 * blog-publishing pipeline:
 *
 *   GitHub Action (cron Sunday 09:00 IST)
 *      |
 *      v
 *   POST /api/blog/draft   -- Claude Haiku writes 3 articles
 *      |
 *      v
 *   Telegram (3 messages with APPROVE/REJECT inline buttons)
 *      |
 *      v
 *   POST /api/blog/approve (Telegram webhook)
 *      |
 *      v
 *   git commit content/blog/<slug>.mdx -> push -> Vercel auto-deploys
 *
 * STATUS: stub. Phase 10 wires this into the scaffolder.
 *
 * The scaffold writes these files into the generated project:
 *
 *   app/blog/page.tsx                 - blog index
 *   app/blog/[slug]/page.tsx          - post renderer (MDX)
 *   content/blog/.gitkeep             - directory placeholder
 *   content/blog/topic-queue.json     - 30 niche-seeded topics
 *   app/api/blog/draft/route.ts       - cron-triggered drafter
 *   app/api/blog/approve/route.ts     - Telegram webhook handler
 *   .github/workflows/weekly-blog.yml - cron trigger (Sun 09:00 IST)
 *   SETUP-BLOG.md                     - per-business setup checklist
 *
 * Required env vars (per business):
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID
 *   ANTHROPIC_API_KEY
 *   CRON_SECRET
 *   GITHUB_TOKEN (for the approve route to commit back)
 */

/**
 * Seed topics per niche. The generated topic-queue.json gets 30 of these
 * per business; Claude Haiku refills monthly via a separate workflow.
 */
export const TOPIC_SEEDS = {
  restaurant: [
    "תפריט עונתי לחורף — מה נכנס ומה יוצא",
    "מאחורי הקלעים: יום חיים של השף",
    "5 טעויות שכדאי להימנע מהן בהזמנת אירוע במסעדה",
    "סודות של מסעדנים: איך לבחור יין למנה",
    "ההיסטוריה מאחורי המנה האהובה שלנו",
    "מה לעשות כשאתם מגיעים ראשונים: מדריך לסבב הראשון בתפריט",
    "צמחונות במסעדה ישראלית — מה אפשר ומה לא",
    "תכנון אירוע משפחתי במסעדה — צ'קליסט מלא",
    "המתכון שאף לקוח לא קיבל",
    "איך בוחרים מסעדה לחגיגה רומנטית",
  ],
  lawyer: [
    "מתי חייבים עו'ד לפני ייעוץ ראשוני",
    "מדריך: מה לעשות אחרי תאונת דרכים — 7 הצעדים הראשונים",
    "הסכם ממון — האם זה הכרחי?",
    "ירושה ללא צוואה — מה קורה ב-2026",
    "תביעת הוצאת לשון הרע — מתי שווה ללכת לדרך",
    "זכויות צרכן: דוגמאות מהתקופה האחרונה",
    "מה ההבדל בין יישוב סכסוכים לתביעה?",
    "פיטורין בגיל מבוגר — מה הזכויות שלכם",
    "אזרחות זרה — האם זה משפיע על הצוואה",
    "תכנון פיננסי משפחתי — לאן ה-עו'ד נכנס",
  ],
  clinic: [
    "טיפול X — מה לצפות לפני ואחרי",
    "5 מיתוסים על טיפולי Y שכדאי לדעת",
    "האם זה מתאים לי? מדריך לבחירת טיפול",
    "מה אומר המחקר העדכני על טיפול Z",
    "מסלול ההתאוששות — שלב אחר שלב",
    "תזונה אחרי טיפול — מה מותר ומה לא",
    "סיפור התאוששות אמיתי של מטופל",
    "תופעות לוואי — מה לצפות, מתי לדאוג",
    "השוואה: טיפול קלאסי מול טיפול חדיש",
    "מה לשאול בייעוץ הראשון",
  ],
  fitness: [
    "תוכנית אימונים שבועית למתחילים",
    "תזונה לפני ואחרי אימון — מדריך מהיר",
    "5 תרגילים הכי יעילים לבטן",
    "איך לשבור הקפאה במשקל",
    "אימוני HIIT — מה זה ולמי זה מתאים",
    "חזרה לפעילות אחרי פציעה",
    "סיפור הצלחה: התאמן/ת לפני ואחרי",
    "מנוחה וריקברי — חלק חיוני באימון",
    "אימון בבית מול אימון בחדר כושר",
    "המאמן שלך ענה: 10 שאלות נפוצות",
  ],
  tradesman: [
    "איך לזהות בעיה X בבית — מתי לקרוא לאיש מקצוע",
    "5 בדיקות שכדאי לעשות פעם בשנה",
    "מתי DIY ומתי לקרוא לאינסטלטור/חשמלאי",
    "מחירים: למה זה עולה כמו שעולה",
    "המקרה הכי מעניין שטיפלתי בו השנה",
    "החורף בא: צ'קליסט לבית מוכן",
    "תקלה דחופה? כך לפעול עד שאני מגיע",
    "ביטוח דירה — מה מכוסה ומה לא",
    "סוגי X בבית — מה ההבדל",
    "סיפורי אמת מהשטח",
  ],
  beauty: [
    "טיפול X — מה לצפות לפני ואחרי",
    "טרנדים לעונה הקרובה",
    "מוצרים שאני ממליצה — וכאלו שלא",
    "הכנת עור לאירוע מיוחד",
    "האם זה מתאים לי? מדריך לבחירת טיפול",
    "סקירת מוצר חדש שזה עתה הגיע",
    "סוד היופי של הסלב: מאמין/לא מאמין",
    "מה לעשות אחרי הטיפול — שגרת בית",
    "סיפור לקוחה: לפני ואחרי",
    "הסוד לעור מושלם בגיל 40+",
  ],
  _default: [
    "מי אנחנו ולמה התחלנו את העסק",
    "5 שאלות נפוצות שאנחנו עונים עליהן",
    "סיפור לקוח: לפני ואחרי השירות שלנו",
    "מה מבדיל אותנו מהמתחרים",
    "טיפים מקצועיים שעבדו לנו ב-2026",
    "מה לצפות בפגישה הראשונה",
    "השירות שלנו: צעד אחר צעד",
    "מאחורי הקלעים — יום עבודה אצלנו",
    "טעויות נפוצות בתחום שלנו ואיך להימנע מהן",
    "תקציב — איך זה מתפרק",
  ],
};

/**
 * Telegram message format for a draft article approval prompt.
 *
 * @param {Object} draft
 * @param {string} draft.title
 * @param {string} draft.slug
 * @param {string} draft.excerpt - 2-3 sentence preview
 * @param {string} draft.businessName
 * @returns {{text: string, reply_markup: any}} Telegram sendMessage payload
 */
export function formatDraftMessage(draft) {
  return {
    text: `📝 *${escapeMarkdown(draft.businessName)}*\n\n*${escapeMarkdown(draft.title)}*\n\n${escapeMarkdown(draft.excerpt)}\n\n_slug: \`${escapeMarkdown(draft.slug)}\`_`,
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [[
        { text: "✅ APPROVE", callback_data: `approve:${draft.slug}` },
        { text: "❌ REJECT", callback_data: `reject:${draft.slug}` },
      ]],
    },
  };
}

function escapeMarkdown(s) {
  return String(s).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

/**
 * Generate the per-business SETUP-BLOG.md checklist.
 *
 * @param {Object} args
 * @param {string} args.businessName
 * @param {string} args.slug
 * @param {string} args.deployUrl - Once known
 * @returns {string} markdown
 */
export function generateSetupChecklist({ businessName, slug, deployUrl }) {
  return `# Blog automation setup — ${businessName}

The site is wired with a 3-articles-per-week blog pipeline.
Follow this checklist once to activate it. (Takes ~10 minutes.)

## 1. Create the Telegram bot (skip if you already have one for another site)

1. In Telegram, talk to [@BotFather](https://t.me/BotFather)
2. Send \`/newbot\`, follow the prompts. Save the bot token.
3. Talk to the bot once (any message) to register the chat.
4. Visit \`https://api.telegram.org/bot<TOKEN>/getUpdates\` — find \`"chat":{"id":<NUMBER>}\` in the response. Save this chat ID.

> 💡 One bot can serve many sites. Reuse the same token + chat ID across clients.

## 2. Set the env vars in Vercel

Go to your Vercel project for \`${slug}\` → Settings → Environment Variables. Add:

- \`TELEGRAM_BOT_TOKEN\` — from step 1
- \`TELEGRAM_CHAT_ID\` — from step 1
- \`ANTHROPIC_API_KEY\` — your Claude key (same one used for the rest of Autoflowr)
- \`CRON_SECRET\` — generate a random 32-char string: \`openssl rand -hex 32\`

Redeploy after adding.

## 3. Configure the Telegram webhook

Once \`${deployUrl || "<deploy URL>"}\` is live, register the approval webhook:

\`\`\`
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=${deployUrl || "<DEPLOY_URL>"}/api/blog/approve"
\`\`\`

## 4. Add the GitHub Action secrets

In the GitHub repo (\`${slug}\`) → Settings → Secrets and variables → Actions, add:

- \`CRON_SECRET\` — same value as in Vercel
- \`DEPLOY_URL\` — \`${deployUrl || "<deploy URL>"}\`

## 5. Verify

Manually trigger the workflow: GitHub repo → Actions → \`weekly-blog\` → Run workflow.
You should receive 3 Telegram messages within 30 seconds, each with APPROVE/REJECT buttons.
Tap APPROVE on one → check that the post lands at \`${deployUrl || "<deploy URL>"}/blog/<slug>\` within 2 minutes (Vercel rebuild time).

## 6. Customize the topic queue

Edit \`content/blog/topic-queue.json\` to fine-tune topics. The skill seeded it with 30 niche-appropriate topics; replace any you don't want before the next Sunday run.

A separate \`monthly-refill-topics\` workflow re-fills the queue once it drops below 10 topics — no manual intervention needed long-term.
`;
}
