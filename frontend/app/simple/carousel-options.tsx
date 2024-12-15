'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QueryOption } from './carousel-query-display'

interface CarouselOptionsProps {
  options: QueryOption[]
  onOptionClick: (option: QueryOption) => void
  onOptionChange: (index: number) => void
}

export function CarouselOptions({ options, onOptionClick, onOptionChange }: CarouselOptionsProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)

  const nextSlide = () => {
    const newIndex = (currentIndex + 1) % options.length
    setCurrentIndex(newIndex)
    onOptionChange(newIndex)
  }

  const prevSlide = () => {
    const newIndex = (currentIndex - 1 + options.length) % options.length
    setCurrentIndex(newIndex)
    onOptionChange(newIndex)
  }

  return (
    <div className="relative">
      <div className="flex overflow-hidden">
        {options.map((option, index) => (
          <div
            key={option.id}
            className={`w-full flex-shrink-0 transition-all duration-300 ease-in-out ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            <Card className="mx-auto max-w-sm cursor-pointer" onClick={() => onOptionClick(option)}>
              <CardHeader>
                <CardTitle>Query {option.id}:</CardTitle>
                <div className="my-2"></div>
                <CardTitle>{option.title}</CardTitle>
                {/* <CardDescription>{option.description}</CardDescription> */}
              </CardHeader>
            </Card>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="icon"
        className="absolute top-1/2 left-4 transform -translate-y-1/2"
        onClick={prevSlide}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="absolute top-1/2 right-4 transform -translate-y-1/2"
        onClick={nextSlide}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

