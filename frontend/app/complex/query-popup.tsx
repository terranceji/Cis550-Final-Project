'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { QueryOption } from './carousel-query-display'

interface QueryPopupProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (queryId: string | undefined) => void
  option: QueryOption | null
}

export function QueryPopup({ isOpen, onClose, onSubmit, option }: QueryPopupProps) {

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(option?.id);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{option?.title}</DialogTitle>
        </DialogHeader>
        <div style={{ color: 'dimgray' }}>
            {option?.description}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Button type="submit">Execute Query</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

