'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { SearchCriterion } from './search-criterion'
import { Plus } from 'lucide-react'
import { ResultCard } from './result-card'

interface SearchCriterionType {
  feature: string
  operator: string
  value: string
  logicalOperator: string
}

interface ResultType {
    id: number,
    [key: string]: any
}

const initialCriterion: SearchCriterionType = { feature: '', operator: '', value: '', logicalOperator: 'AND' }

export function SearchBar() {
  const [criteria, setCriteria] = useState<SearchCriterionType[]>([initialCriterion])
  const [results, setResults] = useState<ResultType[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const resetCriteria = () => {
    setCriteria([initialCriterion])
  }

  const addCriterion = () => {
    setCriteria([...criteria, { ...initialCriterion }])
  }

  const removeCriterion = (index: number) => {
    if (criteria.length > 1) {
      setCriteria(criteria.filter((_, i) => i !== index))
    }
  }

  const updateCriterion = (index: number, field: string, value: string) => {
    const newCriteria = criteria.map((criterion, i) => 
      i === index ? { ...criterion, [field]: value } : criterion
    )
    setCriteria(newCriteria)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const hasEmptyFields = criteria.some(criterion =>
        !criterion.feature || !criterion.operator || !criterion.value
    )
    if (hasEmptyFields) {
        return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ criteria }),
      })
      const data = await response.json()
      
      const indexedData = data.map((item: any, index: number) => ({
        ...item,
        id: index + 1
      }));

      console.log(indexedData)
      setResults(indexedData)
    } catch (error) {
      console.error('Error fetching search results:', error)
    } finally {
        setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
    <form onSubmit={handleSubmit} className="space-y-4">
      {criteria.map((criterion, index) => (
        <SearchCriterion
          key={index}
          index={index}
          criterion={criterion}
          onChange={updateCriterion}
          onRemove={removeCriterion}
          isFirst={index === 0}
        />
      ))}
      <div className="flex justify-between">
        <Button type="button" onClick={addCriterion} variant="outline">
          <Plus className="h-4 w-4 mr-2" /> Add Criterion
        </Button>
        <div className="flex space-x-2">
            <Button type="button" onClick={resetCriteria} variant="outline">
            Reset
            </Button>
            <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Searching...' : 'Search'}
            </Button>
        </div>
      </div>
    </form>
    {results.length > 0 && (
        <div className="space-y-4">
        <h2 className="text-xl font-semibold">Search Results</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map(result => (
            <ResultCard key={result.id} result={result} />
            ))}
        </div>
        </div>
    )}
    </div>
  )
}

