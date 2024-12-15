'use client'

import { SearchBar } from './search-bar'

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Advanced Search</h1>
      <div className="bg-gray-100 rounded-lg p-4">
        <SearchBar />
      </div>
    </main>
  )
}

