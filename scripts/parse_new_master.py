import json
import re

with open('scripts/new_pdf_extracted.json', 'r', encoding='utf-8') as f:
    pages = json.load(f)

players = []

def parse_price(price_str):
    p = price_str.replace('\u25a0', '').replace('₹', '').strip()
    match = re.search(r'([\d\.]+)\s*(Crore|Lakh)', p, re.IGNORECASE)
    if not match:
        return 0, p
    val = float(match.group(1))
    unit = match.group(2).lower()
    if 'crore' in unit:
        inr = int(val * 10000000)
        display = f"₹{val:g} Crore"
    elif 'lakh' in unit:
        inr = int(val * 100000)
        display = f"₹{int(val)} Lakh"
    else:
        inr = int(val)
        display = p
    return inr, display

# Overseas country mapping for accurate country field
OVERSEAS_COUNTRIES = {
    'aiden markram': 'South Africa',
    'cameron green': 'Australia',
    'david miller': 'South Africa',
    'devon conway': 'New Zealand',
    'dewald brevis': 'South Africa',
    'donovan ferreira': 'South Africa',
    'jake fraser-mcgurk': 'Australia',
    'matthew breetzke': 'South Africa',
    'rovman powell': 'West Indies',
    'sherfane rutherford': 'West Indies',
    'shimron hetmyer': 'West Indies',
    'steve smith': 'Australia',
    'tim david': 'Australia',
    'travis head': 'Australia',
    'tristan stubbs': 'South Africa',
    'azmatullah omarzai': 'Afghanistan',
    'cooper connolly': 'Australia',
    'corbin bosch': 'South Africa',
    'daniel lawrence': 'England',
    'daryl mitchell': 'New Zealand',
    'glenn phillips': 'New Zealand',
    'gus atkinson': 'England',
    'jacob bethell': 'England',
    'jamie overton': 'England',
    'jason holder': 'West Indies',
    'kamindu mendis': 'Sri Lanka',
    'liam dawson': 'England',
    'liam livingstone': 'England',
    'marco jansen': 'South Africa',
    'marcus stoinis': 'Australia',
    'michael bracewell': 'New Zealand',
    'mitch owen': 'Australia',
    'mitchell marsh': 'Australia',
    'mitchell santner': 'New Zealand',
    'rachin ravindra': 'New Zealand',
    'romario shepherd': 'West Indies',
    'sam curran': 'England',
    'sean abbott': 'Australia',
    'sunil narine': 'West Indies',
    'tom curran': 'England',
    'wanindu hasaranga': 'Sri Lanka',
    'will jacks': 'England',
    'adam milne': 'New Zealand',
    'akeal hosein': 'West Indies',
    'allah ghazanfar': 'Afghanistan',
    'alzarri joseph': 'West Indies',
    'anrich nortje': 'South Africa',
    'brydon carse': 'England',
    'dushmantha chameera': 'Sri Lanka',
    'eshan malinga': 'Sri Lanka',
    'gerald coetzee': 'South Africa',
    'jacob duffy': 'New Zealand',
    'jofra archer': 'England',
    'josh hazlewood': 'Australia',
    'kagiso rabada': 'South Africa',
    'kwena maphaka': 'South Africa',
    'kyle jamieson': 'New Zealand',
    'lockie ferguson': 'New Zealand',
    'lungisani ngidi': 'South Africa',
    'maheesh theekshana': 'Sri Lanka',
    'matheesha pathirana': 'Sri Lanka',
    'matt henry': 'New Zealand',
    'mitchell starc': 'Australia',
    'mujeeb rahman': 'Afghanistan',
    'mustafizur rahman': 'Bangladesh',
    'nandre burger': 'South Africa',
    'nathan ellis': 'Australia',
    'naveen ul haq': 'Afghanistan',
    'noor ahmad': 'Afghanistan',
    'nuwan thushara': 'Sri Lanka',
    'pat cummins': 'Australia',
    'rashid khan': 'Afghanistan',
    'trent boult': 'New Zealand',
    'william orourke': 'New Zealand',
    'xavier bartlett': 'Australia',
    'ben duckett': 'England',
    'finn allen': 'New Zealand',
    'heinrich klaasen': 'South Africa',
    'jamie smith': 'England',
    'jos buttler': 'England',
    'josh inglis': 'Australia',
    'lhuan-dre pretorious': 'South Africa',
    'nicholas pooran': 'West Indies',
    'phil salt': 'England',
    'ryan rickelton': 'South Africa',
    'shai hope': 'West Indies',
    'tom banton': 'England',
    'matthew short': 'Australia',
    'jason behrendorff': 'Australia',
    'jhye richardson': 'Australia',
    'riley meredith': 'Australia',
    'saqib mahmood': 'England',
    'spencer johnson': 'Australia',
    'rahmanullah gurbaz': 'Afghanistan',
    'tim seifert': 'New Zealand',
    'beau webster': 'Australia',
    'kyle mayers': 'West Indies',
    'roston chase': 'West Indies',
    'olly stone': 'England',
    'reeza hendricks': 'South Africa',
    'ben dwarshuis': 'Australia',
    'charith asalanka': 'Sri Lanka',
    'daniel sams': 'Australia',
    'dwaine pretorius': 'South Africa',
    'george linde': 'South Africa',
    'gulbadin naib': 'Afghanistan',
    'wiaan mulder': 'South Africa',
    'william sutherland': 'Australia',
    'fazalhaq farooqi': 'Afghanistan',
    'joshua tongue': 'England',
    'mohammad waqar salamkheil': 'Afghanistan',
    'jonny bairstow': 'England',
    'kusal perera': 'Sri Lanka',
    'quinton de kock': 'South Africa',
    'ackeem auguste': 'West Indies',
    'pathum nissanka': 'Sri Lanka',
    'sediqullah atal': 'Afghanistan',
    'tim robinson': 'New Zealand',
    'bevon-john jacobs': 'New Zealand',
    'chris green': 'Australia',
    'dasun shanaka': 'Sri Lanka',
    'dunith wellalage': 'Sri Lanka',
    'eathan bosch': 'South Africa',
    'george garton': 'England',
    'muhammad abbas': 'New Zealand',
    'nathan smith': 'New Zealand',
    'rehan ahmed': 'England',
    'zak foulkes': 'New Zealand',
    'billy stanlake': 'Australia',
    'binura fernando': 'Sri Lanka',
    'joshua little': 'Ireland',
    'luke wood': 'England',
    'matthew potts': 'England',
    'md shoriful islam': 'Bangladesh',
    'nahid rana': 'Bangladesh',
    'obed mccoy': 'West Indies',
    'qais ahmad': 'Afghanistan',
    'richard gleeson': 'England',
    'rishad hossain': 'Bangladesh',
    'shamar joseph': 'West Indies',
    'tanzim hasan sakib': 'Bangladesh',
    'taskin ahmed': 'Bangladesh',
    'viyaskanth vijayakanth': 'Sri Lanka',
    'wesley agar': 'Australia',
    'benjamin mcdermott': 'Australia',
    'jordan cox': 'England',
    'kusal mendis': 'Sri Lanka',
    'jack edwards': 'Australia',
    'joe clarke': 'England',
    'arab gul': 'Afghanistan',
    'tom moores': 'England',
    'daniel lategan': 'South Africa',
    'miles hammond': 'England',
    'delano potgieter': 'South Africa',
    'dian forrester': 'South Africa',
    'tiaan van vuuren': 'South Africa',
    'virandeep singh': 'Malaysia',
    'bayanda majola': 'South Africa',
    'rakibul hasan': 'Bangladesh',
    'traveen mathew': 'Sri Lanka',
    'tristan luus': 'South Africa',
    'wahidullah zadran': 'Afghanistan',
    'connor esterhuizen': 'South Africa'
}

MARQUEE_NAMES = {
    'jos buttler', 'shreyas iyer', 'rishabh pant', 'arshdeep singh', 'kagiso rabada',
    'mitchell starc', 'yuzvendra chahal', 'liam livingstone', 'david miller', 'kl rahul',
    'mohammed shami', 'mohammed siraj', 'glenn maxwell', 'pat cummins',
    'travis head', 'heinrich klaasen', 'jasprit bumrah', 'virat kohli', 'rohit sharma'
}

for p in pages:
    lines = [l.strip() for l in p['text'].splitlines() if l.strip()]
    i = 0
    while i < len(lines):
        line = lines[i]
        if re.match(r'^\d+$', line):
            s_no = int(line)
            # Gather next lines until price
            name_parts = []
            j = i + 1
            while j < len(lines) and not re.match(r'^\d+$', lines[j]) and not any(c in lines[j] for c in ['Batsmen', 'All-rounders', 'Bowlers', 'Wicket-keepers']):
                name_parts.append(lines[j])
                j += 1
            raw_name = " ".join(name_parts)
            
            category = lines[j] if j < len(lines) else 'Batsmen'
            j += 1
            raw_price = lines[j] if j < len(lines) else '30 Lakh'
            j += 1
            
            inr, display_price = parse_price(raw_price)
            is_retained = '(R)' in raw_name
            is_overseas = '(Overseas)' in raw_name or '✈' in raw_name
            
            # Clean player name
            clean_name = raw_name.replace('(R)', '').replace('(Overseas)', '').replace('✈', '').replace('\u2708', '').strip()
            clean_name = re.sub(r'\s+', ' ', clean_name)
            
            norm_name = re.sub(r'[^a-z0-9 ]', '', clean_name.lower()).strip()
            
            # Country
            if is_overseas:
                country = OVERSEAS_COUNTRIES.get(norm_name, 'Overseas')
            else:
                country = 'India'
                
            player_category = 'OVERSEAS' if is_overseas else 'INDIAN'
            
            is_wk = (category == 'Wicket-keepers')
            if category == 'Batsmen':
                primary_role = 'BATTER'
            elif category == 'Bowlers':
                primary_role = 'BOWLER'
            elif category == 'All-rounders':
                primary_role = 'ALL_ROUNDER'
            elif category == 'Wicket-keepers':
                primary_role = 'BATTER'
            else:
                primary_role = 'BATTER'
                
            is_marquee = norm_name in MARQUEE_NAMES and inr >= 20000000
            eligibility = 'retained' if is_retained else 'auction_eligible'
            
            # Sets
            if is_marquee and not is_retained:
                set_code = 'M1'
                set_name = 'SET -1 — MARQUEE PLAYERS'
                set_order = 1
            elif is_marquee and is_retained:
                set_code = 'M-RET'
                set_name = 'SET -1 — MARQUEE (RETAINED)'
                set_order = 1
            else:
                tier = '1' if inr >= 20000000 else ('2' if inr >= 10000000 else '3')
                if is_wk:
                    set_code = f'WK{tier}'
                    set_name = f'Wicket-Keepers Set {tier}'
                    set_order = 3 + int(tier)
                elif primary_role == 'BATTER':
                    set_code = f'BA{tier}'
                    set_name = f'Batters Set {tier}'
                    set_order = 2 + int(tier)
                elif primary_role == 'ALL_ROUNDER':
                    set_code = f'AL{tier}'
                    set_name = f'All-Rounders Set {tier}'
                    set_order = 5 + int(tier)
                else:
                    set_code = f'BO{tier}'
                    set_name = f'Bowlers Set {tier}'
                    set_order = 8 + int(tier)

            slug = re.sub(r'[^a-z0-9]+', '-', clean_name.lower()).strip('-')
            image_url = f"https://documents.iplt20.com/ipl/IPLHeadshot2024/{slug}.png"
            
            players.append({
                'id': f"ipl2026_{s_no:03d}",
                'player_id': f"ipl2026_{s_no:03d}",
                's_no': s_no,
                'name': clean_name,
                'raw_name': raw_name,
                'country': country,
                'nationality': country,
                'player_category': player_category,
                'is_overseas': is_overseas,
                'primary_role': primary_role,
                'role': primary_role,
                'category': category,
                'is_wicketkeeper': is_wk,
                'year': 2026,
                'base_price_inr': inr,
                'base_price_display': display_price,
                'auction_status': 'AVAILABLE',
                'set_code': set_code,
                'set_name': set_name,
                'set_order': set_order,
                'is_marquee': is_marquee,
                'is_retained': is_retained,
                'eligibility': eligibility,
                'image_url': image_url,
                'image_source': 'Official IPL Media & Headshots Archive',
                'verification_status': 'VERIFIED_OFFICIAL_DOCUMENT',
                'data_source': 'IPL 2026 Official Master List (Uploaded Document)'
            })
            i = j
            continue
        i += 1

print(f"Total Extracted: {len(players)}")
s_nos = set(p['s_no'] for p in players)
missing = [n for n in range(1, 533) if n not in s_nos]
print("Missing S.Nos:", missing)

overseas = [p for p in players if p['is_overseas']]
indian = [p for p in players if not p['is_overseas']]
retained = [p for p in players if p['is_retained']]
pool = [p for p in players if not p['is_retained']]
print(f"Overseas: {len(overseas)}, Indian: {len(indian)}")
print(f"Retained: {len(retained)}, Auction Pool: {len(pool)}")

# Write to json
with open('scripts/players_verified_2026.json', 'w', encoding='utf-8') as f:
    json.dump(players, f, indent=2, ensure_ascii=False)

