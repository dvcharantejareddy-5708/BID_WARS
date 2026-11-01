import os
import re
import sys
import json
import pypdf
from PIL import Image

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    
    pdf_path = r'C:/Users/chara/.gemini/antigravity/brain/4ba8d5b7-81a7-42fb-9e8f-092e6afcb8cd/.user_uploaded/media_1793539272449_7772eb76.pdf'
    if not os.path.exists(pdf_path):
        # Fallback to Downloads if needed
        pdf_path = r'C:/Users/chara/Downloads/IPL_All_Players_Numbered_With_Base_Prices_Overseas_Photos.pdf'
    
    print(f"Loading PDF from: {pdf_path}")
    reader = pypdf.PdfReader(pdf_path)
    
    # Load player database
    db_path_src = r'server/src/data/players2026.json'
    db_path_dist = r'server/dist/data/players2026.json'
    with open(db_path_src, 'r', encoding='utf-8') as f:
        players = json.load(f)
        
    players_by_s_no = {p.get('s_no'): p for p in players if p.get('s_no') is not None}
    print(f"Loaded {len(players)} players from {db_path_src}")
    
    out_dir = r'client/public/players'
    os.makedirs(out_dir, exist_ok=True)
    
    saved_count = 0
    matched_players = set()
    
    pattern_img = re.compile(r'q\s+([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+cm\s+(/[A-Za-z0-9_.\-]+)\s+Do\s+Q')
    pattern_text = re.compile(r'BT\s+1\s+0\s+0\s+1\s+([0-9.\-]+)\s+([0-9.\-]+)\s+Tm\s+(.*?)\s+Tj', re.DOTALL)
    
    for page_num, page in enumerate(reader.pages):
        contents = page.get_contents()
        if contents is None:
            continue
        data = contents.get_data().decode('latin1', errors='ignore')
        
        # Build map of image name -> PIL Image from page.images
        pypdf_img_map = {}
        for im in page.images:
            # im.name typically looks like "FormXob.<hash>.png"
            pypdf_img_map[im.name] = im.image
            # Also map without .png extension
            base_name = im.name.replace('.png', '').replace('.jpg', '')
            pypdf_img_map[base_name] = im.image
            pypdf_img_map['/' + base_name] = im.image
            
        images = [(name, float(x), float(y)) for sx, _, _, sy, x, y, name in pattern_img.findall(data)]
        texts = pattern_text.findall(data)
        
        s_nos = {}
        player_names = {}
        for x, y, txt in texts:
            x_val, y_val = float(x), float(y)
            txt_clean = txt.strip()
            if txt_clean.startswith('(') and txt_clean.endswith(')'):
                txt_clean = txt_clean[1:-1]
            txt_clean = txt_clean.replace(r'\(', '(').replace(r'\)', ')')
            
            if 40 <= x_val <= 55:
                try:
                    s_no_int = int(txt_clean)
                    s_nos[round(y_val, 1)] = s_no_int
                except ValueError:
                    pass
            elif 90 <= x_val <= 105:
                player_names[round(y_val, 1)] = txt_clean
                
        for img_name, img_x, img_y in images:
            expected_y_text = img_y + 8.27
            closest_y = None
            min_diff = 999.0
            for y_t in player_names.keys():
                diff = abs(y_t - expected_y_text)
                if diff < min_diff:
                    min_diff = diff
                    closest_y = y_t
                    
            if min_diff < 3.0:
                s_no = s_nos.get(closest_y)
                pdf_name = player_names.get(closest_y)
                if s_no in players_by_s_no:
                    db_p = players_by_s_no[s_no]
                    p_id = db_p['id']
                    
                    # Find PIL image
                    pil_img = pypdf_img_map.get(img_name)
                    if not pil_img:
                        clean_name = img_name.lstrip('/')
                        pil_img = pypdf_img_map.get(clean_name)
                    if not pil_img:
                        # try matching hash substring
                        hash_part = img_name.split('.')[-1] if '.' in img_name else img_name
                        for k, v in pypdf_img_map.items():
                            if hash_part in k:
                                pil_img = v
                                break
                                
                    if pil_img:
                        target_filename = f"{p_id}.png"
                        target_filepath = os.path.join(out_dir, target_filename)
                        pil_img.save(target_filepath, format="PNG")
                        
                        # Update player record
                        db_p['image_url'] = f"/players/{target_filename}"
                        db_p['image_source'] = "Uploaded PDF Document (IPL_All_Players_Numbered_With_Base_Prices_Overseas_Photos.pdf)"
                        db_p['verification_status'] = "VERIFIED_EXTRACTED_PHOTO"
                        
                        matched_players.add(p_id)
                        saved_count += 1
                        
                        if saved_count <= 10 or saved_count % 25 == 0:
                            print(f"[{saved_count}] Saved photo for S.No {s_no} ({db_p['name']}) -> {target_filename} ({pil_img.size})")
                    else:
                        print(f"Error: PIL image not found for {img_name} (S.No {s_no}, {pdf_name})")
                else:
                    print(f"Error: S.No {s_no} not found in player database!")
            else:
                print(f"Error: Unmatched image {img_name} at y={img_y} (min_diff={min_diff})")
                
    print(f"\nSuccessfully extracted and saved {saved_count} player photos!")
    
    # For players without a matched photo, set image_url to null so fallback silhouette is rendered
    unmatched_count = 0
    for p in players:
        if p['id'] not in matched_players:
            p['image_url'] = None
            unmatched_count += 1
            
    print(f"Updated {len(players)} players: {saved_count} with extracted photos, {unmatched_count} using default silhouette.")
    
    # Write updated players2026.json to src and dist
    with open(db_path_src, 'w', encoding='utf-8') as f:
        json.dump(players, f, indent=2, ensure_ascii=False)
    print(f"Saved updated database to {db_path_src}")
    
    if os.path.exists(os.path.dirname(db_path_dist)):
        with open(db_path_dist, 'w', encoding='utf-8') as f:
            json.dump(players, f, indent=2, ensure_ascii=False)
        print(f"Saved updated database to {db_path_dist}")

if __name__ == '__main__':
    main()

