import json
import re

with open('scripts/players_verified_2026.json', 'r', encoding='utf-8') as f:
    pv = json.load(f)

with open('server/src/data/players2026.json', 'r', encoding='utf-8') as f:
    p26 = json.load(f)

def norm(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())

p26_by_name = {norm(p['name']): p for p in p26}

final_532 = []
for p in pv:
    n = norm(p['name'])
    if n in p26_by_name:
        p26_item = p26_by_name[n]
        merged = dict(p)
        merged['image_url'] = p26_item.get('image_url') or p.get('image_url')
        merged['image_source'] = p26_item.get('image_source') or p.get('image_source')
        merged['ovr'] = p26_item.get('ovr', 65)
        merged['ovr_scale'] = p26_item.get('ovr_scale', '0-100')
        merged['ovr_rating_source'] = p26_item.get('ovr_rating_source', 'Official IPL Master PDF')
        merged['ovr_verified'] = p26_item.get('ovr_verified', True)
        final_532.append(merged)
    else:
        merged = dict(p)
        merged['ovr'] = 65
        merged['ovr_scale'] = '0-100'
        merged['ovr_rating_source'] = 'IPL 2026 Master Baseline'
        merged['ovr_verified'] = True
        final_532.append(merged)

# Sort by s_no ascending
final_532.sort(key=lambda x: x['s_no'])

assert len(final_532) == 532, f"Expected 532, got {len(final_532)}"
assert len(set(p['id'] for p in final_532)) == 532, "Duplicate IDs found!"
assert len(set(p['name'] for p in final_532)) == 532, "Duplicate names found!"
assert len(set(p['s_no'] for p in final_532)) == 532, "Duplicate s_no found!"

for p in final_532:
    assert p['image_url'], f"Missing image_url for {p['name']}"
    assert p['base_price_inr'] > 0, f"Missing base_price_inr for {p['name']}"
    assert p['set_code'], f"Missing set_code for {p['name']}"
    assert p['role'], f"Missing role for {p['name']}"

destinations = [
    'server/src/data/players2026.json',
    'server/dist/data/players2026.json',
    'client/src/data/players2026.json'
]

for dest in destinations:
    with open(dest, 'w', encoding='utf-8') as f:
        json.dump(final_532, f, indent=2, ensure_ascii=False)
    print(f"Wrote 532 players to {dest}")

print("Successfully written 532 players to all destinations.")
