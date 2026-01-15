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


def scrape_jsonld(url: str):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...' 
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch URL: {str(e)}")

    soup = BeautifulSoup(response.content, 'html.parser')
    
    # --- JSON-LD ---
    script = soup.find('script', {'type': 'application/ld+json'})
    if script:
        try:
            data = json.loads(script.string)
            
            # Manchmal ist JSON-LD eine Liste oder ein Graph
            recipe_data = None
            
            # Helper: Suche das Objekt mit "@type": "Recipe"
            def find_recipe(obj):
                if isinstance(obj, dict):
                    if obj.get('@type') == 'Recipe' or 'Recipe' in obj.get('@type', []):
                        return obj
                    # Suche in @graph
                    if '@graph' in obj:
                        for item in obj['@graph']:
                            res = find_recipe(item)
                            if res: return res
                elif isinstance(obj, list):
                    for item in obj:
                        res = find_recipe(item)
                        if res: return res
                return None

            recipe_data = find_recipe(data)

            if recipe_data:
                # 1. Titel
                title = recipe_data.get('name', 'Unbekanntes Rezept')
                
                # 2. Beschreibung
                description = recipe_data.get('description', '')
                
                # 3. Bild (kann String oder Objekt oder Liste sein)
                image_raw = recipe_data.get('image')
                image_url = ""
                if isinstance(image_raw, str):
                    image_url = image_raw
                elif isinstance(image_raw, list) and len(image_raw) > 0:
                    image_url = image_raw[0] if isinstance(image_raw[0], str) else image_raw[0].get('url', "")
                elif isinstance(image_raw, dict):
                    image_url = image_raw.get('url', "")
                
                # 4. Zutaten (Ist im JSON meist eine Liste von Strings)
                ingredients_raw = recipe_data.get('recipeIngredient', [])
                ingredients_str = "|".join(ingredients_raw)

                # 5. Anweisungen (Oft komplex strukturiert)
                instructions_raw = recipe_data.get('recipeInstructions', [])

                lines = []

                if isinstance(instructions_raw, str):
                    lines.append(instructions_raw)
                elif isinstance(instructions_raw, list):
                    for item in instructions_raw:
                        if isinstance(item, str):
                            lines.append(item)
                        
                        # 1. Fall: Direkter HowToStep (wie bei vielen anderen Seiten)
                        elif isinstance(item, dict) and item.get('@type') == 'HowToStep' and 'text' in item:
                            lines.append(item['text'])
                        
                        # 2. Fall: HowToSection (TYPISCH FÜR CHEFKOCH)
                        elif isinstance(item, dict) and item.get('@type') == 'HowToSection' and 'itemListElement' in item:
                            # Iteriere über die Liste der Schritte in dieser Sektion
                            for step in item['itemListElement']:
                                if isinstance(step, dict) and step.get('@type') == 'HowToStep' and 'text' in step:
                                    # Füge den eigentlichen Anweisungstext hinzu
                                    lines.append(step['text'])
                                elif isinstance(step, str):
                                    lines.append(step)
                        
                instructions = "\n\n".join(lines) # Füge Leerzeilen zwischen den Schritten ein

                if recipe_data.get('recipeYield'):
                    yields = recipe_data.get('recipeYield', 0)
                    try:
                        yields = int(yields)
                    except ValueError:
                        yields = int(yields.split(" ")[0])
                else:
                    yields = None

                # Rückgabe der sauberen JSON-Daten
                return {
                    "title": title,
                    "description": description,
                    "image_url": image_url if image_url else "",
                    "original_url": url,
                    "ingredients_str": ingredients_str,
                    "instructions": instructions,
                    "prep_time": parse_iso_duration_to_minutes(recipe_data.get("prepTime")),
                    "cook_time": parse_iso_duration_to_minutes(recipe_data.get("cookTime")),
                    "total_time": parse_iso_duration_to_minutes(recipe_data.get("totalTime")),
                    "yields": yields
                }
        except json.JSONDecodeError:
            raise SyntaxError("JSON-LD found but parsing failed. Falling back to HTML.")


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