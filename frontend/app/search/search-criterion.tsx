import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X } from 'lucide-react'

const features = ['cik', 'year', 'month', 'accounts_payable_current', 'assets', 'liabilities', 'cash_and_equivalents', 'accounts_receivable_current', 'inventory_net', 'long_term_debt']
const operators = ['=', '>=', '<=', '<', '>']
const logicalOperators = ['AND', 'OR']

interface SearchCriterionProps {
  index: number
  onRemove: (index: number) => void
  onChange: (index: number, field: string, value: string) => void
  criterion: {
    feature: string
    operator: string
    value: string
    logicalOperator: string
  }
  isFirst: boolean
}

export function SearchCriterion({ index, onRemove, onChange, criterion, isFirst }: SearchCriterionProps) {
  return (
    <div className="flex items-center space-x-2 mb-2">
      {!isFirst && (
        <Select value={criterion.logicalOperator} onValueChange={(value) => onChange(index, 'logicalOperator', value)}>
          <SelectTrigger className="w-[80px]">
            <SelectValue placeholder="AND/OR" />
          </SelectTrigger>
          <SelectContent>
            {logicalOperators.map((op) => (
              <SelectItem key={op} value={op}>{op}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={criterion.feature} onValueChange={(value) => onChange(index, 'feature', value)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select feature" />
        </SelectTrigger>
        <SelectContent>
          {features.map((feature) => (
            <SelectItem key={feature} value={feature}>{feature}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={criterion.operator} onValueChange={(value) => onChange(index, 'operator', value)}>
        <SelectTrigger className="w-[80px]">
          <SelectValue placeholder="Op" />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op} value={op}>{op}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="text"
        value={criterion.value}
        onChange={(e) => onChange(index, 'value', e.target.value)}
        placeholder="Value"
        className="w-[120px]"
      />
      <Button variant="ghost" size="icon" onClick={() => onRemove(index)}>
        <X className="h-4 w-4" />
        <span className="sr-only">Remove criterion</span>
      </Button>
    </div>
  )
}

