import requests
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_URL = "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"
API_KEY = "579b464db66ec23bdd000001f50523c8f627469f77b8f79be920d593"  # 👈 Use your actual API key


@app.get("/cities")
def get_cities():
    params = {
        "api-key": API_KEY,
        "format": "json",
        "limit": 1000
    }
    response = requests.get(API_URL, params=params)
    data = response.json().get("records", [])
    city_list = sorted(list(set(r["city"] for r in data if "city" in r)))
    return {"cities": city_list}


@app.get("/aqi")
def get_aqi(city: str = Query(...)):
    params = {
        "api-key": API_KEY,
        "format": "json",
        "limit": 1000
    }

    # Step 1: Fetch from external API
    response = requests.get(API_URL, params=params)
    if response.status_code != 200:
        return {"error": "Failed to fetch data from API"}

    data = response.json().get("records", [])

    # 🛠️ Step 2: Case-insensitive, partial match
    filtered = [r for r in data if city.lower() in r.get("city", "").lower()]

    # Debug logs to confirm
    print(f"City requested: {city}")
    print(f"Available cities: {set([r['city'] for r in data])}")
    print(f"Records found: {len(filtered)}")

    return {"records": filtered}
