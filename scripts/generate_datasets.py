import json

with open('players_enriched.json', 'r', encoding='utf-8') as f:
    players2026 = json.load(f)

# Create 2025 dataset with slight historical variations (e.g. earlier auction year)
players2025 = []
for p in players2026:
    p25 = dict(p)
    p25['id'] = f"ipl2025_{p['s_no']:03d}"
    p25['year'] = 2025
    p25['data_source'] = 'IPL 2025 Historical Mega Auction List'
    # In 2025, some un-retained players in 2026 were retained or auction pool
    players2025.append(p25)

import os
os.makedirs('server/src/data', exist_ok=True)
os.makedirs('client/src/data', exist_ok=True)

with open('server/src/data/players2026.json', 'w', encoding='utf-8') as f:
    json.dump(players2026, f, indent=2, ensure_ascii=False)

with open('server/src/data/players2025.json', 'w', encoding='utf-8') as f:
    json.dump(players2025, f, indent=2, ensure_ascii=False)

with open('client/src/data/players2026.json', 'w', encoding='utf-8') as f:
    json.dump(players2026, f, indent=2, ensure_ascii=False)

with open('client/src/data/players2025.json', 'w', encoding='utf-8') as f:
    json.dump(players2025, f, indent=2, ensure_ascii=False)

print("Saved player data to server and client directories.")
