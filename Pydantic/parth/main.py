from pydantic import BaseModel
from typing import List,Dict

class Patient(BaseModel):
    name:str
    age:int
    weight:float
    married:bool
    #all the alergien in list we have to import a List modeule not list
    allergies:List[str]
    contact_details:Dict[str,str]


def insert_name(patient:Patient):
    print(patient.name)
    print(patient.age)
    print(patient.contact_details)
    print("updated")

info={'name':'Parth','age':30,'weight':75.2,"married":0,'allergies':['Pollen','Sun','fruits'],'contact_details':{'email':'abc@gmail.com','Phone':'9450466890'}}

patient1=Patient(**info)

insert_name(patient1)