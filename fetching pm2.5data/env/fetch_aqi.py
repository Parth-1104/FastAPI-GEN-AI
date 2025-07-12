import requests

API_KEY = "47559827849dd53ec3e52147ad9fa60e6001fc90ce32e8442ebfee2c788aaee8"

headers = {
    "X-API-Key": API_KEY,
    "Accept": "application/json"
}

# Step 1: Fetch PM2.5-enabled locations in India
location_url = "https://api.openaq.org/v3/locations"
params = {
    "country": "IN",
    "parameter": "pm25",
    "limit": 500,
    "order_by": "id",
    "sort": "desc"
}

response = requests.get(location_url, headers=headers, params=params)
locations = response.json().get("results", [])

print("✅ PM2.5 Readings from Indian Monitoring Stations:\n")

# Step 2: For each location, get latest PM2.5 value
for loc in locations:
    loc_id = loc["id"]
    loc_name = loc["name"]
    coords = loc["coordinates"]

    # Measurement API call
    measure_url = "https://api.openaq.org/v3/latest"
    measure_params = {
        "location_id": loc_id,
        "parameter": "pm25",
        "limit": 1,
        "sort": "desc"
    }

    m_response = requests.get(measure_url, headers=headers, params=measure_params)
    m_data = m_response.json().get("results", [])

    print(f"📍 {loc_name} ({coords['latitude']}, {coords['longitude']})")

    if m_data:
        m = m_data[0]
        print(f"   ✅ PM2.5: {m['value']} {m['unit']} at {m['date']['utc']}")
    else:
        print("   ❌ No recent PM2.5 data available.")

    print("-" * 50)
