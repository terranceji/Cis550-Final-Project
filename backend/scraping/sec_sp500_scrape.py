import requests
from bs4 import BeautifulSoup
from sec_edgar_api import EdgarClient
import json
from collections import defaultdict
import time
from tqdm import tqdm
import csv

email = "haokunkevinhe@gmail.com" # NOTE: SET YOUR OWN EMAIL HERE

def get_sp500_ciks():
    url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    table = soup.find('table', {'id': 'constituents'})
    company_ciks = []
    cik_to_company = dict()
    
    for row in table.find_all('tr')[1:]:
        ticker = row.find_all('td')[0].text.strip()
        name = row.find_all('td')[1].text.strip()
        cik = int(row.find_all('td')[6].text.strip())
        company_ciks.append(cik)
        cik_to_company[cik] = (ticker, name)
    
    return company_ciks, cik_to_company

def process(response):
    processed_chunk = {"ccp": response["ccp"], "feature": response["tag"], "data": []}
    data = response["data"]
    discovered = set()
    for company in data:
        if (cik := company["cik"]) in company_ciks:
            processed_chunk["data"].append((cik, company["val"]))
            discovered.add(cik)
    undiscovered = company_ciks.difference(discovered)
    for undiscovered_cik in undiscovered:
        processed_chunk["data"].append((undiscovered_cik, None))
    processed_chunk["data"].sort(key=lambda x: x[0])
    return processed_chunk

def get_company_frames(feature: str, all_features: dict):
    output_data = []
    edgar = EdgarClient(user_agent=f"DummyCompany {email}")
    for year in tqdm(range(2009, 2023)): # NOTE: change here to modify date
        for quarter in tqdm(range(1, 5)):
            response = edgar.get_frames(year=year, quarter=quarter, taxonomy="us-gaap", tag=feature, unit="USD")
            processed_response = process(response)
            output_data.append(processed_response)
    all_features[feature] = output_data

features = [ # NOTE: choose appropriate features
    "AccountsPayableCurrent", # works
    # "Revenues", # too small
    # "NetIncomeLoss", # too small
    "Assets", # works
    "Liabilities", # works
    # "OperatingIncomeLoss", # too small
    "CashAndCashEquivalentsAtCarryingValue", # works
    "AccountsReceivableNetCurrent", # works
    "InventoryNet", # works
    "LongTermDebt", # works
    # "ComprehensiveIncomeNetOfTax" # too small
    ]

def process_all_features():
    all_features = dict()
    for feature in features:
        get_company_frames(feature, all_features)
    return all_features

# all_features looks like:
# (feature) -> List[Dict{ccp, feature (all the same), data: List[(cik, val)]}]
# Want to merge into:
# (cik, ccp) -> (all features)
def merge_all_processed_jsons(all_features):
    output = defaultdict(list)
    for feature in features:
        for chunk in all_features[feature]:
            ccp = chunk["ccp"]
            data = chunk["data"]
            for cik, val in data:
                if val is not None:
                    output[(cik, ccp)].append(val)
                else:
                    output[(cik, ccp)].append("")
    return output

def write_final_format(merged_features):
    headers = ["CIK", "Year", "Month"] + features
    output_list = [headers]
    
    for key, val in tqdm(list(merged_features.items()), desc="Writing final format"):
        cik, ccp = key
        # Extract year and month from CCP (e.g., 'CY2009Q1I')
        year = int(ccp[2:6])
        quarter = int(ccp[7])
        # Create three monthly entries for each quarter
        base_month = (quarter - 1) * 3 + 1
        for month_offset in range(3):
            month = base_month + month_offset
            output_list.append([cik, year, month] + list(val))
    
    with open("sec_sp500_data.csv", mode="w", newline="") as file:
        writer = csv.writer(file)
        writer.writerows(output_list)

company_ciks, cik_to_company = get_sp500_ciks()
company_ciks = set(company_ciks)
all_features = process_all_features()
merged_features = merge_all_processed_jsons(all_features)
write_final_format(merged_features)

