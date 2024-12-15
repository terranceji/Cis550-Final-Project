import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ResultCardProps {
  result: {
    id: number
    [key: string]: any
  }
}

export function ResultCard({ result }: ResultCardProps) {
  const excludeKeys = ['id']
  const features = Object.keys(result).filter(key => !excludeKeys.includes(key))

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Result {result.id}</CardTitle>
      </CardHeader>
      <CardContent>
        {features.map(feature => (
            <p key={feature} className="text-sm text-gray-500 capitalize">
                {feature}: {result[feature] === null ? 'N/A' : (typeof result[feature] === 'number' ? result[feature].toLocaleString() : result[feature])}
            </p>
        ))}
      </CardContent>
    </Card>
  )
}

