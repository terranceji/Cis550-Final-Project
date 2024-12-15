'use client'

import * as React from 'react'
import { CarouselOptions } from './carousel-options'
import { QueryPopup } from './query-popup'
import { ResultsDisplay } from './results-display'

import axios from 'axios'
import { ShuffleIcon } from 'lucide-react'


export interface QueryOption {
  id: string
  title: string
  description: string
}

export interface QueryResult {
  id: string
  title: string
  content: string
}

const queryOptions: QueryOption[] = [
  { id: '1', title: 'Get Top Stocks', description: 'This query calculates the highest, lowest, and average closing prices for each stock, then ranks stocks by their average closing price and selects the top 10 stocks matching this criteria.' },
//   { id: '2', title: 'Get Companies with Highest Cash Reserves', description: "Returns companies where cash reserves exceed half of liabilities, along with a rolling average of cash reserves over the last three periods."},
//   { id: '3', title: 'Get Companies with Highest Average Volatility', description: 'This query calculates the debt-to-asset ratio for each company and joins it with stock price data to analyze average volatility.' },
  { id: '2', title: 'Get Companies with High Cash and Minimal Debt', description: 'This query identifies companies with substantial cash reserves (over $50 million) and minimal long-term debt (under $10 million), then retrieves the highest recorded closing price for each company\'s stock.' },
  { id: '3', title: 'Get Best Months for Stocks', description: 'This query calculates the monthly average close for each stock and ranks these averages in descending order, selecting the top 10 months with the highest average close prices.' },
  { id: '4', title: 'Get Highest Fluctutations', description: 'This query calculates the average monthly volatility for high-volume stocks, showing the top 10 months with the highest price fluctuations.' },
  { id: '5', title: 'Get Highest Liquidity Debt Ratio', description: 'This query identifies the top 10 companies with the highest cash-to-debt ratios, providing insights into their liquidity and financial stability.' },
  { id: '6', title: 'Get Greatest Leverage Differences', description: 'This query calculates the difference between the highest and lowest leverage ratios for companies over a specified period, highlighting those with the greatest leverage differences.' },
]

export function CarouselQueryDisplay() {
  const [selectedOption, setSelectedOption] = React.useState<QueryOption | null>(null)
  const [isPopupOpen, setIsPopupOpen] = React.useState(false)
  const [results, setResults] = React.useState<QueryResult[]>([])

  const clearResults = () => {
    setResults([]);
  }

  const handleOptionClick = (option: QueryOption) => {
    setSelectedOption(option)
    setIsPopupOpen(true)
    clearResults()
  }

  const handleClosePopup = () => {
    setIsPopupOpen(false)
    setSelectedOption(null)
  }

  const handleSubmitQuery = async (queryId: string | undefined) => {
    if (!queryId) {
        console.error("Query ID is undefined");
        return;
    }

    const queryUrlMap = {
      '1': "/stocks/top_stocks",
    //   '2': "/companies/high_cash_reserves",
    //   '3': "/companies/debt_to_asset_ratio",
      '2': "/companies/high_cash_minimal_debt",
      '3': "/stocks/monthly_avg_close",
      '4': "/stocks/highest-fluctuations",
      '5': "/stocks/highest-liquidity-debt-ratio",
      '6': "/companies/strong_liquidity",
    };

    try {
        const suffixUrl = queryUrlMap[queryId as keyof typeof queryUrlMap]
        const response = await axios.get(`http://localhost:8000/api${suffixUrl}`)
        const data = response.data
        setResults(data)
    } catch (err) {
        console.error("Failed to fetch data:", err);
        alert("An error occurred while fetching data. Please try again later.");
    }
    setIsPopupOpen(false)
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Simple Query Options</h1>
      <p className="mb-4">Browse through our curated selection of financial queries to gain insights into the market. From top-performing stocks to companies with strong liquidity, our queries are designed to help you make informed decisions.</p>
      <CarouselOptions
        options={queryOptions}
        onOptionClick={handleOptionClick}
        onOptionChange={clearResults}
        />
      <QueryPopup
        isOpen={isPopupOpen}
        onClose={handleClosePopup}
        onSubmit={handleSubmitQuery}
        option={selectedOption}
      />
      <ResultsDisplay results={results} />
    </div>
  )
}

