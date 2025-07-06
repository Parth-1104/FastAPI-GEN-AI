from fastapi import FastAPI
import json
from pydantic import BaseModel
import requests


app=FastAPI()

class Patient(BaseModel):
    id: int
    name: str
    age: int
    gender: str
    diagnosis: str
    medications: list[str]
    last_visit: str


def load_data():
    with open('patient.json','r') as f:
        data=json.load(f)
    return data

def get_patientebyid(patient_id:int):
    with open('patient.json','r')as f:
        data=json.load(f)
    for patient in data:
        if patient['id']==patient_id:
            return patient
    return {'error':"Patient not found"}



@app.get("/")
def hello():
    return {'message':'Hello Parth'}

@app.get("/view")
def patient():
    data=load_data()
    return data


@app.get("/patient/{patient_id}")
def read_patient(patient_id:int):
    return get_patientebyid(patient_id)

@app.post("/add")
def add_patient(patient: Patient):
    with open('patient.json', 'r+') as f:
        data = json.load(f)
        data.append(patient.dict())
        f.seek(0)
        json.dump(data, f, indent=4)
    return {"message": "Patient added successfully!"}




app = FastAPI()

API_KEY = "579b464db66ec23bdd000001f50523c8f627469f77b8f79be920d593"
RESOURCE_ID = "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"
BASE_URL = f"https://api.data.gov.in/resource/{RESOURCE_ID}"

@app.get("/aqi")
def get_aqi(limit: int = 100):
    url = f"{BASE_URL}?api-key={API_KEY}&format=json&limit={limit}"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    return {"error": "Failed to fetch data", "status_code": response.status_code}

