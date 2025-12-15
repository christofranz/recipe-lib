import json
import requests
from bs4 import BeautifulSoup
from fastapi import  HTTPException


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
                    image_url = image_raw[0] if isinstance(image_raw[0], str) else image_raw[0].get('url', '')
                elif isinstance(image_raw, dict):
                    image_url = image_raw.get('url', '')
                
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

                # Rückgabe der sauberen JSON-Daten
                return {
                    "title": title,
                    "description": description,
                    "image_url": image_url if image_url else "https://via.placeholder.com/600x400",
                    "ingredients_str": ingredients_str,
                    "instructions": instructions
                }
        except json.JSONDecodeError:
            raise SyntaxError("JSON-LD found but parsing failed. Falling back to HTML.")
