(function installBridgeCommunication(global) {
  const digitsOnly = value => String(value || "").replace(/\D/g, "");

  function canonicalPhone(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const digits = digitsOnly(raw.replace(/(?:ext\.?|x)\s*\d+$/i, ""));
    if (raw.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return null;
  }

  function phoneIdentity(value) {
    const canonical = canonicalPhone(value);
    return canonical ? canonical.slice(1) : "";
  }

  function telHref(value) {
    const canonical = canonicalPhone(value);
    return canonical ? `tel:${canonical}` : null;
  }

  function smsHref(value) {
    const canonical = canonicalPhone(value);
    return canonical ? `sms:${canonical}` : null;
  }

  function unfoldVCard(text) {
    return String(text || "").replace(/\r?\n[ \t]/g, "");
  }

  function decodeVCardValue(value) {
    return String(value || "")
      .replace(/\\n/gi, "\n")
      .replace(/\\,/g, ",")
      .replace(/\\;/g, ";")
      .replace(/\\\\/g, "\\")
      .trim();
  }

  function parseVCard(text) {
    const cards = unfoldVCard(text).split(/END:VCARD/i).filter(card => /BEGIN:VCARD/i.test(card));
    return cards.map(card => {
      const lines = card.split(/\r?\n/).filter(Boolean);
      const fn = lines.find(line => /^FN(?:;[^:]*)?:/i.test(line));
      const n = lines.find(line => /^N(?:;[^:]*)?:/i.test(line));
      let name = fn ? decodeVCardValue(fn.slice(fn.indexOf(":") + 1)) : "";
      if (!name && n) {
        const parts = decodeVCardValue(n.slice(n.indexOf(":") + 1)).split(";");
        name = [parts[1], parts[0]].filter(Boolean).join(" ").trim();
      }
      const phones = lines.filter(line => /^TEL(?:;[^:]*)?:/i.test(line)).map(line => {
        const separator = line.indexOf(":");
        const metadata = line.slice(0, separator);
        const value = decodeVCardValue(line.slice(separator + 1)).replace(/^tel:/i, "");
        const typeMatch = metadata.match(/TYPE=([^;:]+)/i);
        return { label: typeMatch ? typeMatch[1].split(",")[0] : "Phone", value, canonical: canonicalPhone(value) };
      }).filter(phone => phone.value);
      return { name, phones };
    }).filter(contact => contact.name || contact.phones.length);
  }

  global.BridgeCommunication = Object.freeze({ canonicalPhone, phoneIdentity, telHref, smsHref, parseVCard });
})(globalThis);
