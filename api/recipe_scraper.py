import json
import requests
from bs4 import BeautifulSoup
from fastapi import  HTTPException
import re


def parse_iso_duration_to_minutes(duration_str):
    """
    Parse ISO 8601 duration string and convert to total minutes.
    Example: 'P0DT0H10M' -> 10
    """
    if not duration_str or not isinstance(duration_str, str):
        return None
    
    # Regex to match ISO 8601 duration: P[n]Y[n]M[n]DT[n]H[n]M[n]S
    pattern = r'P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?'
    match = re.match(pattern, duration_str)
    
    if not match:
        return None
    
    years, months, days, hours, minutes, seconds = match.groups()
    
    # Convert to integers, defaulting to 0
    years = int(years) if years else 0
    months = int(months) if months else 0
    days = int(days) if days else 0
    hours = int(hours) if hours else 0
    minutes = int(minutes) if minutes else 0
    seconds = int(seconds) if seconds else 0
    
    # Approximate conversion (not accounting for varying month lengths, leap years, etc.)
    total_minutes = (
        years * 365 * 24 * 60 +  # years to minutes (approximate)
        months * 30 * 24 * 60 +  # months to minutes (approximate)
        days * 24 * 60 +         # days to minutes
        hours * 60 +              # hours to minutes
        minutes +                 # minutes
        seconds // 60             # seconds to minutes (floor division)
    )
    
    return total_minutes


def extract_html_timings(soup):
    results = {"yields": None, "prep_time": None, "cook_time": None}
    
    # Suche den spezifischen Container
    timing_container = soup.find('div', class_='c-recipe-header__timings')
    if not timing_container:
        return results

    # Alle Spans im Container durchgehen
    spans = timing_container.find_all('span')
    for span in spans:
        text = span.get_text(strip=True)
        
        # 1. Yields (z.B. "Serves 4-6")
        if 'Serves' in text:
            match = re.search(r'\d+', text)
            if match:
                results["yields"] = int(match.group())
        
        # 2. Prep Time (z.B. "Prep 20 min")
        elif 'Prep' in text:
            match = re.search(r'\d+', text)
            if match:
                results["prep_time"] = int(match.group())
        
        # 3. Cook Time (z.B. "Cook 45 min")
        elif 'Cook' in text:
            match = re.search(r'\d+', text)
            if match:
                results["cook_time"] = int(match.group())
    return results


def scrape_jsonld(url: str):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"URL-Fehler: {str(e)}")

    soup = BeautifulSoup(response.content, 'html.parser')
    
    # --- Helfer: Rekursive Suche nach dem Recipe-Objekt ---
    def find_recipe(obj):
        # 1. Wenn es ein Dictionary ist
        if isinstance(obj, dict):
            obj_type = obj.get('@type', [])
            
            # Prüfung auf Recipe (String oder in einer Liste)
            if isinstance(obj_type, list):
                if 'Recipe' in obj_type: return obj
            elif obj_type == 'Recipe':
                return obj
            
            # Weitersuchen in Unter-Objekten, aber NUR wenn es Dicts oder Listen sind
            # Wir ignorieren @context und andere Metadaten, um Zyklen zu vermeiden
            for key, value in obj.items():
                if key in ['@context', 'publisher', 'author']: continue # Performance & Sicherheit
                
                if isinstance(value, (dict, list)):
                    res = find_recipe(value)
                    if res: return res
                    
        # 2. Wenn es eine Liste ist (wie oft in @graph oder image)
        elif isinstance(obj, list):
            for item in obj:
                # WICHTIG: Nur weiter rekursiv suchen, wenn das Item ein Dict oder eine Liste ist
                # Ein String (wie die Bild-URL bei Ottolenghi) hat kein @type!
                if isinstance(item, (dict, list)):
                    res = find_recipe(item)
                    if res: return res
                    
        return None

    # --- JSON-LD Extraktion ---
    scripts = soup.find_all('script', {'type': 'application/ld+json'})
    recipe_data = None

    for script in scripts:
        try:
            # 1. Inhalt extrahieren
            content = script.get_text().strip()
            if not content or '"Recipe"' not in content:
                continue
                
            # 2. Reinigung: Entferne potenzielle HTML-Kommentare, die oft in Scripts stecken
            content = re.sub(r'^\s*//\s*<!\[CDATA\[|//\s*\]\]>\s*$', '', content)
            
            # 3. JSON laden mit "strict=False" 
            # Das erlaubt Steuerzeichen wie Zeilenumbrüche (\n) innerhalb von Strings,
            # die bei Ottolenghi oft in der "description" vorkommen.
            try:
                data = json.loads(content, strict=False)
            except json.JSONDecodeError:
                # Plan B: Falls es immer noch crasht, versuchen wir, 
                # kaputte Backslashes zu fixen, die oft bei Unicode-URLs entstehen
                content_fixed = content.encode('utf-8').decode('unicode_escape', errors='ignore')
                data = json.loads(content_fixed, strict=False)

            recipe_data = find_recipe(data)
            
            if recipe_data:
                break 
                
        except Exception as e:
            print(f"Fehler beim Verarbeiten eines Skript-Blocks: {e}")
            continue

    # Wenn nach allen Scripts nichts gefunden wurde
    if not recipe_data:
        raise HTTPException(status_code=404, detail="Keine strukturierten Rezeptdaten auf dieser Seite gefunden.")

    # --- Daten-Extraktion (mit Absicherung gegen NoneType) ---
    try:
        title = recipe_data.get('name', 'Unbekanntes Rezept')
        description = recipe_data.get('description', '')
        
        # Bild-Logik (Extrahiert URL aus String, Liste oder Objekt)
        image_raw = recipe_data.get('image')
        image_url = ""
        if isinstance(image_raw, str):
            image_url = image_raw
        elif isinstance(image_raw, list) and image_raw:
            first_img = image_raw[0]
            image_url = first_img if isinstance(first_img, str) else first_img.get('url', "")
        elif isinstance(image_raw, dict):
            image_url = image_raw.get('url', "")

        # Zutaten
        ingredients_raw = recipe_data.get('recipeIngredient', [])
        ingredients_str = "|".join(ingredients_raw) if isinstance(ingredients_raw, list) else str(ingredients_raw)

        # Anweisungen
        instructions_raw = recipe_data.get('recipeInstructions', [])
        lines = []

        def extract_steps(steps_obj):
            if isinstance(steps_obj, str):
                lines.append(steps_obj)
            elif isinstance(steps_obj, list):
                for item in steps_obj:
                    if isinstance(item, str):
                        lines.append(item)
                    elif isinstance(item, dict):
                        # HowToStep, HowToSection oder verschachtelte Listen
                        if 'text' in item:
                            lines.append(item['text'])
                        elif 'itemListElement' in item:
                            extract_steps(item['itemListElement'])
            elif isinstance(item, dict) and 'itemListElement' in item:
                # Manche Seiten nutzen keine HowToSection, sondern direkt eine Liste von Schritten
                for sub_item in item['itemListElement']:
                    if isinstance(sub_item, dict) and 'text' in sub_item:
                        lines.append(sub_item['text'])
                    elif isinstance(sub_item, str):
                        lines.append(sub_item)

        extract_steps(instructions_raw)
        instructions = "\n\n".join(lines)

        # Zeiten und Yields nicht in json ld for ottolenghi.com
        if 'ottolenghi' in url:
            html_timings = extract_html_timings(soup)
            prep_time = html_timings.get("prep_time")
            cook_time = html_timings.get("cook_time")
            total_time = None
            if prep_time and cook_time:
                total_time = prep_time + cook_time
            yields = html_timings.get("yields")
        else:
            prep_time = parse_iso_duration_to_minutes(recipe_data.get("prepTime"))
            cook_time = parse_iso_duration_to_minutes(recipe_data.get("cookTime"))
            total_time = parse_iso_duration_to_minutes(recipe_data.get("totalTime"))
            yields = None
            # Yields (Personenanzahl) mit Regex
            if 'recipeYield' in recipe_data:
                raw_yield = recipe_data.get('recipeYield', '')
                yield_match = re.search(r'\d+', str(raw_yield))
                yields = int(yield_match.group()) if yield_match else None

        return {
            "title": title,
            "description": description,
            "image_url": image_url,
            "original_url": url,
            "ingredients_str": ingredients_str,
            "instructions": instructions,
            "prep_time": prep_time,
            "cook_time": cook_time,
            "total_time": total_time,
            "yields": yields
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Verarbeiten der Rezeptdaten: {str(e)}")


def scrape_tk_recipe(url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    soup = BeautifulSoup(response.content, 'html.parser')

    # 1. Titel (aus h1 oder Meta-Tags)
    title_tag = soup.find('h1') or soup.find('meta', property='og:title')
    title = title_tag.get_text(strip=True) if title_tag.name == 'h1' else title_tag['content'].split(' - ')[0]
    title = title.replace("One-Pot-Rezept: ", "")

    # 2. Bild
    img_tag = soup.find('meta', property='og:image')
    image_url = img_tag['content'] if img_tag else ""

    def extract_list_after_id(anchor_id_pattern):
        # 1. Finde die Headline über die ID (Regex für Flexibilität)
        headline = soup.find('tkds-headline', id=re.compile(anchor_id_pattern))
        
        if not headline:
            return []
            
        # 2. Suche die unmittelbar nächste Textliste
        text_list = headline.find_next('tkds-textlist')
        if text_list:
            items = text_list.find_all('tkds-textlist-item')
            # Extrahiere den reinen Text und säubere ihn
            return [item.get_text(strip=True).replace('\xa0', ' ') for item in items if item.get_text(strip=True)]
        return []

    # Zutaten auslesen (ID beginnt mit zutaten-fuer)
    def clean_units(text):
        # Mapping von ausgeschriebenen Wörtern zu Bring!-kompatiblen Kürzeln
        units_map = {
            r'\bGramm\b': 'g',
            r'\bMilliliter\b': 'ml',
            r'\bEsslöffel\b': 'EL',
            r'\bTeelöffel\b': 'TL',
            r'\bStück\b': 'Stk',
            r'\bPackung\b': 'Pck',
            r'\bPrise\b': 'Prise',
        }
        
        for full_unit, short_unit in units_map.items():
            # re.IGNORECASE sorgt dafür, dass auch "gramm" oder "GRAMM" gefunden wird
            text = re.sub(full_unit, short_unit, text, flags=re.IGNORECASE)
        
        # Optional: Doppelte Leerzeichen entfernen, die durch Ersetzungen entstehen könnten
        return text.strip().replace('  ', ' ')

    # Anwendung in der Scraper-Funktion:
    ingredients_raw = extract_list_after_id(r'^zutaten-fuer')
    # Jede Zutat durch die Reinigungs-Funktion jagen
    ingredients_clean = [clean_units(item) for item in ingredients_raw]
    ingredients_str = "|".join(ingredients_clean)
    
    # Zubereitung auslesen (ID ist exakt zubereitung)
    instructions_raw = extract_list_after_id(r'^zubereitung$')
    # 2. Erstelle die 'lines' Liste (identisch zu deinem Logik-Ziel)
    lines = []
    for item in instructions_raw:
        if isinstance(item, str) and item.strip():
            # Wir fügen hier KEINE Nummern (1., 2.) hinzu, 
            # das macht dein Frontend oder die spätere Formatierung meist selbst
            lines.append(item.strip())

    # 3. Finaler String (exakt wie in deinem Snippet)
    instructions = "\n\n".join(lines)

    # Zeit
    time_element = soup.find('tkds-text', string=re.compile(r'Zubereitungszeit:'))
    
    prep_time = None
    if time_element:
        time_text = time_element.get_text(strip=True) # "Zubereitungszeit: ungefähr 25 Minuten"
        
        # 2. Nutze Regex, um nur die Zahl zu finden
        match = re.search(r'(\d+)', time_text)
        if match:
            prep_time = int(match.group(1))

    # Beschreibung
    description = ""
    teaser_element = soup.select_one('tkds-text.article-header__teasertext')
    if teaser_element:
        # Wir bereinigen den Text von &nbsp; und überflüssigen Whitespaces
        description = teaser_element.get_text(strip=True).replace('\xa0', ' ')

    # Anzahl
    yields = 1  # Default-Wert

    # 1. Suche die Zutaten-Headline
    ing_headline = soup.find('tkds-headline', id=re.compile(r'^zutaten-fuer'))

    if ing_headline:
        # Hol dir die ID (z.B. "zutaten-fuer-2-personen")
        anchor_id = ing_headline.get('id', '')
        
        # Suche nach der ersten Zahl in der ID
        yield_match = re.search(r'(\d+)', anchor_id)
        if yield_match:
            yields = int(yield_match.group(1))
        else:
            # Fallback: Suche im sichtbaren Text der Headline, falls die ID keine Zahl hat
            text_match = re.search(r'(\d+)', ing_headline.get_text())
            if text_match:
                yields = int(text_match.group(1))

    return {
        "title": title,
        "description": description,
        "image_url": image_url,
        "original_url": url,
        "ingredients_str": ingredients_str,
        "instructions": instructions,
        "prep_time": prep_time,
        "cook_time": None,
        "total_time": prep_time,
        "yields": yields
    }