import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

interface CompanyDetailsProps {
  companyName: string
  cik: string
  isOpen: boolean
  onClose: () => void
  ticker?: string
}

interface CompanyInfo {
  Symbol: string
  AssetType?: string
  Name: string
  Description: string
  Sector: string
  Industry: string
  MarketCapitalization: string
  Exchange: string
}

interface NewsArticle {
  title: string
  url: string
  time_published: string
  authors: string[]
  summary: string
  source: string
}

interface CompanyData {
  company: CompanyInfo
  news: NewsArticle[]
}

export function CompanyDetails({ companyName, cik, isOpen, onClose, ticker }: CompanyDetailsProps) {
  const [companyData, setCompanyData] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && ticker) {
      fetchCompanyData(ticker)
    }
  }, [isOpen, ticker])

  const fetchCompanyData = async (symbol: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/company?symbol=${symbol}`)
      const data = await response.json()
    
      if (response.status === 429) {
        setCompanyData({
          company: {
            Symbol: symbol,
            Name: companyName,
            Description: 'Data currently unavailable due to API limitations.',
            Sector: 'N/A',
            Industry: 'N/A',
            MarketCapitalization: 'N/A',
            Exchange: 'N/A',
            AssetType: 'N/A'
          },
          news: []
        })
        setError('API rate limit reached. Displaying limited information.')
      } else if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch company data')
      } else {
        setCompanyData(data)
      }
    } catch (err) {
      console.error('Error fetching company data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch company data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const retryFetch = () => {
    if (ticker) {
      fetchCompanyData(ticker)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{companyName} Details</DialogTitle>
          <p className="text-sm text-muted-foreground">CIK: {cik}</p>
          {ticker && <p className="text-sm text-muted-foreground">Ticker: {ticker}</p>}
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : error ? (
          <>
            {error && (
              <div className="p-4 text-yellow-500 bg-yellow-50 rounded-md mb-4">
                <p>{error}</p>
                {error.includes('API rate limit') && (
                  <p className="mt-2 text-sm">
                    Due to API limitations, we're displaying limited information. 
                  </p>
                )}
              </div>
            )}
            <div className="p-4 text-red-500">
              <p>{error}</p>
              <Button onClick={retryFetch} className="mt-2">Retry</Button>
            </div>
          </>
        ) : companyData ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Company Overview</h3>
              <p className="text-sm text-muted-foreground">
                {companyData.company.Description || 'No description available'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
              <div>
                <h4 className="font-semibold">Sector</h4>
                <p className="text-sm text-muted-foreground">
                  {companyData.company.Sector || 'N/A'}
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Industry</h4>
                <p className="text-sm text-muted-foreground">
                  {companyData.company.Industry || 'N/A'}
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Market Cap</h4>
                <p className="text-sm text-muted-foreground">
                  {companyData.company.MarketCapitalization
                    ? `$${parseFloat(companyData.company.MarketCapitalization).toLocaleString()}`
                    : 'N/A'}
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Exchange</h4>
                <p className="text-sm text-muted-foreground">
                  {companyData.company.Exchange || 'N/A'}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Recent News</h3>
              {companyData.news && companyData.news.length > 0 ? (
                <div className="space-y-3">
                  {companyData.news.slice(0, 5).map((article, index) => (
                    <div key={index} className="space-y-1">
                      <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {article.title}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {article.source}
                      </p>
                      <p className="text-sm text-muted-foreground">{article.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent news available</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No company information available.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

