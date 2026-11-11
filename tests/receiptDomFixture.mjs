// Minimal DOM double for controlled receipt fixtures only. Browser verification
// exercises the real DOMParser and text-only React rendering against the API.
export class ReceiptDOMParser {
  parseFromString(html) {
    const clean = html.replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
    const text = value => value.replace(/<[^>]*>/g, "");
    return {
      title: text(clean.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || ""),
      querySelectorAll(selector) {
        if (selector !== "table tr") return [];
        return [...clean.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row => ({
          querySelectorAll: () => [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => ({ textContent: text(cell[1]) })),
        }));
      },
    };
  }
}
