import { NextResponse } from 'next/server'

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }

  try {
    console.log('Fetching data for symbol:', symbol)
    
    const [companyResponse, newsResponse] = await Promise.all([
      fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`),
      fetch(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`)
    ])
    
    if (!companyResponse.ok || !newsResponse.ok) {
      throw new Error(`Failed to fetch data. Company status: ${companyResponse.status}, News status: ${newsResponse.status}`)
    }

    const companyData = await companyResponse.json()
    const newsData = await newsResponse.json()

    console.log('Company data received:', JSON.stringify(companyData, null, 2))
    console.log('News data received:', JSON.stringify(newsData, null, 2))

    if (companyData['Error Message'] || newsData['Error Message']) {
      throw new Error(companyData['Error Message'] || newsData['Error Message'])
    }

    if (companyData['Note']) {
      console.warn('API call frequency warning:', companyData['Note'])
      return NextResponse.json({ error: 'API call frequency limit reached. Please try again later.' }, { status: 429 })
    }

    if (!companyData.Symbol) {
      console.error('Invalid company data received:', companyData)
      return NextResponse.json({ error: 'Invalid or empty company data received', data: companyData }, { status: 500 })
    }

    return NextResponse.json({
      company: companyData,
      news: newsData.feed || []
    })
  } catch (error: unknown) {
    console.error('Error fetching data:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 })
    }
  }
}

