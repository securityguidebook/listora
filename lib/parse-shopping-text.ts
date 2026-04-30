export interface ParsedItem {
  name: string
  quantity: string | null
  price: number | null
  section: string | null
}

// "3 apples", "500g chicken", "2.5kg beef", "200ml milk"
const LEADING_QTY = /^(\d+(?:\.\d+)?(?:g|kg|ml|l|L|oz|lb|lbs|pcs|pc)?)\s+(.+)$/i
// "bread x2", "bread 2x"
const TRAILING_X = /^(.+?)\s+(\d+(?:\.\d+)?)x$/i
const LEADING_X = /^(.+?)\s+x(\d+(?:\.\d+)?)$/i
// "$2.50" or "$10"
const PRICE = /\$(\d+(?:\.\d{1,2})?)/
// Section header: line ending with ":" and not a price line
const SECTION_HEADER = /^([^$].*):\s*$/

function parseLine(line: string, section: string | null): ParsedItem {
  const priceMatch = PRICE.exec(line)
  const price = priceMatch ? parseFloat(priceMatch[1]) : null
  const stripped = priceMatch ? line.replace(priceMatch[0], '').replace(/\s+/g, ' ').trim() : line

  const leading = LEADING_QTY.exec(stripped)
  if (leading) return { name: leading[2].trim(), quantity: leading[1], price, section }

  const trailingX = TRAILING_X.exec(stripped)
  if (trailingX) return { name: trailingX[1].trim(), quantity: trailingX[2], price, section }

  const leadingX = LEADING_X.exec(stripped)
  if (leadingX) return { name: leadingX[1].trim(), quantity: leadingX[2], price, section }

  return { name: stripped, quantity: null, price, section }
}

export function parseShoppingText(text: string): ParsedItem[] {
  let currentSection: string | null = null
  const items: ParsedItem[] = []

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    const headerMatch = SECTION_HEADER.exec(line)
    if (headerMatch) {
      currentSection = headerMatch[1].trim()
      continue
    }

    items.push(parseLine(line, currentSection))
  }

  return items
}
