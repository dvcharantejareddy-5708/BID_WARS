import json
import re

with open('pdf_extracted.json', 'r', encoding='utf-8') as f:
    pages = json.load(f)

players = []

# Price mapping
def parse_price(price_str):
    # e.g. "■2 Crore", "2 Crore", "75 Lakh", "30 Lakh"
    p = price_str.replace('\u25a0', '').strip()
    match = re.search(r'([\d\.]+)\s*(Crore|Lakh)', p, re.IGNORECASE)
    if not match:
        return 0, p
    val = float(match.group(1))
    unit = match.group(2).lower()
    if 'crore' in unit:
        inr = int(val * 10000000)
    elif 'lakh' in unit:
        inr = int(val * 100000)
    else:
        inr = int(val)
    return inr, p

for p in pages:
    lines = [l.strip() for l in p['text'].splitlines() if l.strip()]
    i = 0
    while i < len(lines):
        line = lines[i]
        # Check if line is an integer S.No
        if re.match(r'^\d+$', line):
            s_no = int(line)
            # Next should be player name
            if i + 1 < len(lines):
                raw_name = lines[i+1]
                # Next should be category
                if i + 2 < len(lines):
                    category = lines[i+2]
                    # Next should be base price
                    if i + 3 < len(lines):
                        raw_price = lines[i+3]
                        # check if raw_price has Crore or Lakh
                        if 'crore' in raw_price.lower() or 'lakh' in raw_price.lower():
                            inr, clean_price = parse_price(raw_price)
                            is_retained = '(R)' in raw_name
                            clean_name = raw_name.replace('(R)', '').strip()
                            players.append({
                                's_no': s_no,
                                'raw_name': raw_name,
                                'name': clean_name,
                                'is_retained': is_retained,
                                'category': category,
                                'base_price_display': clean_price,
                                'base_price_inr': inr,
                                'page': p['page']
                            })
                            i += 4
                            continue
        i += 1

print(f"Extracted {len(players)} players.")
# Check for any missing numbers from 1 to 532
s_nos = set(p['s_no'] for p in players)
missing = [n for n in range(1, 533) if n not in s_nos]
print(f"Missing S.Nos: {missing}")

with open('parsed_players.json', 'w', encoding='utf-8') as f:
    json.dump(players, f, indent=2, ensure_ascii=False)
