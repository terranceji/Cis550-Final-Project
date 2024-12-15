import yfinance as yf
import pandas as pd
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from tqdm import tqdm

def get_sp500_tickers():
    url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    table = soup.find('table', {'id': 'constituents'})
    tickers = []
    
    for row in table.find_all('tr')[1:]:
        ticker = row.find_all('td')[0].text.strip()
        tickers.append(ticker)
        
    return tickers

def fetch_data(tickers):
    all_data = []
    start_date = "2009-01-01"
    end_date = datetime.now().strftime("%Y-%m-%d")

    for ticker in tqdm(tickers, desc="Fetching stock data"):
        stock = yf.Ticker(ticker)
        
        try:
            historical_data = stock.history(start=start_date, end=end_date, interval="1wk")
            historical_data['Ticker'] = ticker
            historical_data = historical_data.reset_index()

            # Add date processing here
            historical_data['Year'] = historical_data['Date'].dt.year
            historical_data['Month'] = historical_data['Date'].dt.month
            historical_data['Day'] = historical_data['Date'].dt.day
            
            historical_data = historical_data[['Open', 'High', 'Low', 'Close', 'Volume', 'Ticker', 'Year', 'Month', 'Day']]
            all_data.append(historical_data)
        
        except Exception as e:
            print(f"Failed to retrieve data for {ticker}: {e}")

    combined_data = pd.concat(all_data)
    combined_data.to_csv("yahoo_sp500_stock_data_10_years_weekly.csv", index=False)

sp500_tickers = get_sp500_tickers()
fetch_data(sp500_tickers)
