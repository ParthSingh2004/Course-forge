import os
import requests
from dotenv import load_dotenv

# Load your enterprise key
load_dotenv()
key = os.getenv("ENTERPRISE_GEMINI_IMAGE_KEY")

if not key:
    print("Error: Could not find key in .env")
else:
    print("Fetching allowed models...")
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
    response = requests.get(url)
    
    data = response.json()
    for model in data.get("models", []):
        name = model.get("name", "")
        methods = model.get("supportedGenerationMethods", [])
        
        # We only care about models that can generate or predict
        if "generateContent" in methods or "predict" in methods:
            print(f"- {name}")