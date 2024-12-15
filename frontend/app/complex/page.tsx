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

// NOTE: some of these are not right or simple
const queryOptions: QueryOption[] = [
  { id: '1', title: 'Get Pairs of Companies with Similar Debt Ratios', description: 'This query identifies pairs of companies with similar debt-to-asset ratios, filtered for meaningful financial comparisons. It first calculates debt-to-asset ratios, then reduces the dataset by selecting every third company to optimize performance. Finally, it compares these ratios, focusing on pairs with a small difference and a significant average ratio, ranking the top 10 closest pairs.' },
  { id: '2', title: 'Get Pairs of Companies with Similar Inventory Ratios', description: "This query calculates the inventory-to-asset and cash-to-liability ratios for companies, filters for those with significant cash liquidity, and performs cross-comparisons between companies to find pairs with similar inventory-to-asset ratios."},
  { id: '3', title: 'Get Companies with Significant Financial Improvement', description: "This query identifies companies with significant financial improvement over two years, specifically those that have increased cash reserves by more than 5% and reduced long-term debt by more than 5%."},
  { id: '4', title: 'Get Companies with the Greatest Leverage Differences', description: 'This query compares the debt-to-asset ratios of a large set of companies, identifying pairs with the greatest differences, and highlighting the top 10 pairs for insights into companies with significantly different leverage levels.' },
  { id: '5', title: 'Get Companies with Best Debt to Asset Ratio', description: "This query calculates the debt-to-asset ratio for each company and joins it with stock price data to analyze average volatility."},
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
      '1': "/companies/similar_debt_ratios",
      '2': "/companies/similar_inventory_ratios",
      '3': "/companies/financial_improvement",
      '4': "/stock/greatest-leverage-differences",
      '5': "/companies/debt_to_asset_ratio",
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
      <h1 className="text-2xl font-bold mb-4">Complex Query Options</h1>
      <p className="mb-4">Browse through our curated selection of complex financial queries to gain insights into the market. From top-performing stocks to companies with strong liquidity, our queries are designed to help you make informed decisions.</p>
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

export default CarouselQueryDisplay

