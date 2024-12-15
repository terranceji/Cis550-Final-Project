from fastapi import HTTPException, APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Dict
from ..db.database import get_db


# Create the FastAPI router
general_router = APIRouter(
    prefix="/api",
    tags=["api"],
)

@general_router.get("/stocks")
async def get_stocks(db: AsyncSession = Depends(get_db)):
    try:
        query = text("""
        SELECT DISTINCT ON (C.cik) C.cik, C.ticker, C.companyname
        FROM companies C
        JOIN stock_prices S ON C.ticker = S.ticker
        ORDER BY C.cik, S.year DESC, S.month DESC
        """)
        result = await db.execute(query)
        stocks = result.fetchall()
        return [{"cik": stock.cik, "ticker": stock.ticker, "companyname": stock.companyname} for stock in stocks]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# TODO: Fix first three backend endpoints
@general_router.get("/stocks/top_stocks", response_model=List[Dict])
async def get_top_stocks(db: AsyncSession = Depends(get_db)):
    """
    Returns the top 10 stocks ranked by their average closing price, 
    along with the highest, lowest, and average closing prices, 
    company name, and financial details.
    """

    trial_text = """
    WITH StockPriceStats AS (
        SELECT S.ticker,
               MAX(S.high) AS highest_price,
               MIN(S.low) AS lowest_price,
               AVG(S.close) AS avg_close
        FROM stock_prices S
        GROUP BY S.ticker
    )
    SELECT DISTINCT
        S.ticker, 
        C.cik, 
        C.companyname, 
        S.highest_price, 
        S.lowest_price, 
        S.avg_close
    FROM StockPriceStats S
    JOIN companies C ON S.ticker = C.ticker
    ORDER BY S.avg_close DESC
    LIMIT 10;
    """

    query = text(trial_text)
    try:
        result = await db.execute(query)
        results = result.all()
        if not results:
            raise HTTPException(status_code=404, detail="No data found")
        return [
            {
                "ticker": row.ticker,
                "cik": row.cik,
                "companyname": row.companyname,
                "highest_price": row.highest_price,
                "lowest_price": row.lowest_price,
                "avg_close": row.avg_close,
                # "assets": row.assets,
                # "liabilities": row.liabilities,
            }
            for row in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")

@general_router.get("/companies/high_cash_reserves", response_model=List[Dict])
async def get_companies_high_cash_reserves(db: AsyncSession = Depends(get_db)):
    """
    Returns companies where cash reserves exceed half of liabilities, along with
    a rolling average of cash reserves over the last three periods.
    """
    query = text("""
    WITH FinancialStats AS (
    SELECT F.cik, F.assets, F.liabilities, F.cash_and_equivalents,
            AVG(F.cash_and_equivalents) OVER (PARTITION BY F.cik ROWS BETWEEN 3 PRECEDING AND CURRENT ROW) AS RollingAvgCash
    FROM financials F
    )
    SELECT DISTINCT F.cik, C.companyname, F.assets, F.liabilities, F.cash_and_equivalents, RollingAvgCash
    FROM FinancialStats F
    JOIN companies C ON CAST(F.cik AS VARCHAR) = CAST(C.cik AS VARCHAR)
    WHERE F.cash_and_equivalents > (0.5 * F.liabilities)
    ORDER BY F.cash_and_equivalents DESC
    LIMIT 10;
    """)  # Keep your existing query
    try:
        result = await db.execute(query)
        results = result.all()
        if not results:
            raise HTTPException(status_code=404, detail="No data found")
        return [
            {
                "cik": row.cik,
                "companyname": row.companyname,
                "assets": row.assets,
                "liabilities": row.liabilities,
                "cash_and_equivalents": row.cash_and_equivalents,
            }
            for row in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")

# Continue this pattern for each endpoint...
@general_router.get("/companies/debt_to_asset_ratio", response_model=List[Dict])
async def get_companies_debt_to_asset_ratio(db: AsyncSession = Depends(get_db)):
    """
    This query calculates the debt-to-asset ratio for each company and joins
    it with stock price data to analyze average volatility.
    """
    query = text("""
    WITH DebtRatios AS (
    SELECT CAST(F.cik AS VARCHAR) AS CIK,
            (F.long_term_debt / NULLIF(F.assets, 0)) AS DebtToAssetRatio
    FROM financials F
    WHERE F.assets > 0 AND F.long_term_debt IS NOT NULL
    )
    SELECT D.cik, C.companyname, S.ticker, DebtToAssetRatio as debt_to_asset_ratio, AVG(S.high - S.low) AS avg_volatility
    FROM DebtRatios D
    JOIN companies C ON D.cik = CAST(C.cik AS VARCHAR)
    JOIN stock_prices S ON C.ticker = S.ticker
    GROUP BY D.cik, C.companyname, S.ticker, DebtToAssetRatio
    ORDER BY avg_volatility DESC
    LIMIT 10;""")
    try:
        result = await db.execute(query)
        results = result.all()
        if not results:
            raise HTTPException(status_code=404, detail="No data found")
        return [
            {
                "cik": row.cik,
                "companyname": row.companyname,
                "ticker": row.ticker,
                "debt_to_asset_ratio": row.debt_to_asset_ratio,
                "avg_volatility": row.avg_volatility,
            }
            for row in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")

@general_router.get("/companies/high_cash_minimal_debt", response_model=List[Dict])
async def get_companies_high_cash_minimal_debt(db: AsyncSession = Depends(get_db)):
    """
    Returns companies with cash reserves over $50 million and long-term debt under $10 million,
    along with the highest recorded closing stock price.
    """
    query = text("""
    SELECT F.cik, C.companyname, S.ticker, F.cash_and_equivalents, F.long_term_debt, 
           MAX(S.close) AS max_close_price
    FROM financials F
    JOIN companies C ON CAST(F.cik AS VARCHAR) = CAST(C.cik AS VARCHAR)
    JOIN stock_prices S ON C.ticker = S.ticker
    WHERE F.cash_and_equivalents > 50000000
      AND F.long_term_debt < 10000000
    GROUP BY F.cik, C.companyname, S.ticker, F.cash_and_equivalents, F.long_term_debt
    ORDER BY max_close_price DESC
    LIMIT 10;
    """)
    try:
        result = await db.execute(query)
        results = result.all()
        if not results:
            raise HTTPException(status_code=404, detail="No data found")
        return [
            {
                "cik": row.cik,
                "companyname": row.companyname,
                "ticker": row.ticker,
                "cash_and_equivalents": row.cash_and_equivalents,
                "long_term_debt": row.long_term_debt,
                "max_close_price": row.max_close_price,
            }
            for row in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")

@general_router.get("/stocks/monthly_avg_close", response_model=List[Dict])
async def get_stocks_monthly_avg_close(db: AsyncSession = Depends(get_db)):
    """
    Returns the top 10 months with the highest average closing prices for stocks.
    """
    query = text("""
    WITH MonthlyAverages AS (
    SELECT S.ticker,
            DATE_TRUNC('month', DATE(S.year || '-' || S.month || '-01')) AS month,
            AVG(S.close) AS monthly_avg_close
    FROM stock_prices S
    GROUP BY S.ticker, S.year, S.month
    ),
    RankedMonthlyAverages AS (
    SELECT ticker, month, monthly_avg_close,
            RANK() OVER (ORDER BY monthly_avg_close DESC) AS rank
    FROM MonthlyAverages
    )
    SELECT ticker, month, monthly_avg_close
    FROM RankedMonthlyAverages
    WHERE rank <= 10;
    """)
    try:
        result = await db.execute(query)
        results = result.all()
        if not results:
            raise HTTPException(status_code=404, detail="No data found")
        return [
            {
                "ticker": row.ticker,
                "month": row.month,
                "monthly_avg_close": row.monthly_avg_close,
            }
            for row in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")

@general_router.get("/stocks/highest-fluctuations")
async def get_highest_fluctations(db: AsyncSession = Depends(get_db)):
    query = text("""
        WITH MonthlyVolatility AS (
            SELECT S.Ticker, S.year, S.month,
                    AVG(S.High - S.Low) AS AvgMonthlyVolatility
            FROM stock_prices S
            JOIN companies C ON S.Ticker = C.Ticker
            WHERE S.Volume > 10000000
            GROUP BY S.Ticker, Year, Month
        ),
        Subquery AS (
            SELECT Ticker, Year, Month, AvgMonthlyVolatility
            FROM MonthlyVolatility
            ORDER BY AvgMonthlyVolatility DESC
            LIMIT 10
        )
        SELECT * FROM
        Companies NATURAL JOIN Subquery
        ORDER BY AvgMonthlyVolatility DESC;
    """)
    try:
        result = await db.execute(query)
        results = result.all()
        if not results:
            raise HTTPException(status_code=404, detail="No stock data found with the specified criteria")
        return [
            {
                "Ticker": row.ticker,
                "CompanyName": row.companyname,
                "CIK": row.cik,
                "Year": row.year,
                "Month": row.month,
                "AverageMonthlyVolatility": row.avgmonthlyvolatility
            }
            for row in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying database: {str(e)}")

@general_router.get("/stocks/highest-liquidity-debt-ratio")
async def get_highest_liquidity_debt_ratio(db: AsyncSession = Depends(get_db)):
    query = text("""
        WITH ProcessedFinancials AS (
            SELECT DISTINCT F.CIK, F.cash_and_equivalents, F.long_term_debt, F.Year,
                CASE
                    WHEN F.Month BETWEEN 1 AND 3 THEN 1
                    WHEN F.Month BETWEEN 4 AND 6 THEN 2
                    WHEN F.Month BETWEEN 7 AND 9 THEN 3
                    WHEN F.Month BETWEEN 10 AND 12 THEN 4
                    ELSE NULL
                END AS Quarter,
                COALESCE((F.cash_and_equivalents / NULLIF(F.long_term_debt, 0)), -1) AS CashToDebtRatio
            FROM financials F
            WHERE F.long_term_debt IS NOT NULL
            AND F.cash_and_equivalents IS NOT NULL
            ORDER BY CashToDebtRatio DESC
            LIMIT 10
        )
        SELECT C.CompanyName, PF.*
        FROM companies C NATURAL JOIN ProcessedFinancials PF
        ORDER BY PF.CashToDebtRatio DESC;
    """)
    try:
        result = await db.execute(query)
        results = result.all()
        if not results:
            raise HTTPException(status_code=404, detail="No stock data found with the specified criteria")
        return [
            {
                "CompanyName": row.companyname,
                "CIK": row.cik,
                "CashAndEquivalents": row.cash_and_equivalents,
                "LongTermDebt": row.long_term_debt,
                "Year": row.year,
                "Quarter": row.quarter,
                "CashToDebtRatio": row.cashtodebtratio
            }
            for row in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying database: {str(e)}")
    



    
@general_router.get("/stock/greatest-leverage-differences")
async def get_greatest_leverage_differences(db: AsyncSession = Depends(get_db)):
    query = text("""
        WITH DebtToAssetRatios AS (
            SELECT F.CIK, C.CompanyName,
                    (F.long_term_debt / NULLIF(F.Assets, 0)) AS DebtToAssetRatio
            FROM Financials F
            JOIN companies C ON F.CIK::VARCHAR = C.CIK::VARCHAR
            WHERE F.Assets > 0 AND F.long_term_debt IS NOT NULL
        ),
        TopDebtRatios AS (
            SELECT CIK, CompanyName, DebtToAssetRatio,
                    ROW_NUMBER() OVER (ORDER BY DebtToAssetRatio DESC) AS Rank
            FROM DebtToAssetRatios
            WHERE DebtToAssetRatio IS NOT NULL
            LIMIT 5000
        )
        SELECT DISTINCT D1.CIK AS Company1, C1.CompanyName AS Company1Name,
            D2.CIK AS Company2, C2.CompanyName AS Company2Name,
            D1.DebtToAssetRatio AS Company1Ratio,
            D2.DebtToAssetRatio AS Company2Ratio,
            ABS(D1.DebtToAssetRatio - D2.DebtToAssetRatio) AS RatioDifference
        FROM TopDebtRatios D1
        JOIN TopDebtRatios D2
        ON D1.CIK < D2.CIK
        JOIN companies C1 ON D1.CIK = C1.CIK
        JOIN companies C2 ON D2.CIK = C2.CIK
        WHERE ABS(D1.DebtToAssetRatio - D2.DebtToAssetRatio) > 0.1
        ORDER BY RatioDifference DESC
        LIMIT 10;
    """)
    try:
        result = await db.execute(query)
        results = result.all()
        if not results:
            raise HTTPException(status_code=404, detail="No stock data found with the specified criteria")
        return [
            {
                "Company1CIK": row.company1,
                "Company1Name": row.company1name,
                "Company2CIK": row.company2,
                "Company2Name": row.company2name,
                "Company1Ratio": row.company1ratio,
                "Company2Ratio": row.company2ratio,
                "RatioDifference": row.ratiodifference
            }
            for row in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying database: {str(e)}")
    

@general_router.get("/companies/similar_debt_ratios", response_model=List[Dict])
async def get_similar_debt_ratios_faster(db: AsyncSession = Depends(get_db)):
    """
    Optimized query to identify pairs of companies with similar debt-to-asset ratios,
    ensuring it runs faster by limiting pairwise comparisons using bucketing and stricter filters.
    """
    query = text("""
    WITH FilteredFinancials AS (
       SELECT F.CIK AS cik,
              C.CompanyName AS company_name,
              (F.long_term_debt / NULLIF(F.assets, 0)) AS debt_to_asset_ratio,
              NTILE(10) OVER (ORDER BY (F.long_term_debt / NULLIF(F.assets, 0))) AS bucket
       FROM Financials F
       JOIN companies C ON CAST(F.CIK AS VARCHAR) = CAST(C.CIK AS VARCHAR)
       WHERE F.assets > 0 
         AND F.long_term_debt IS NOT NULL
         AND MOD(CAST(F.CIK AS INTEGER), 3) = 0
    ),
    PairwiseComparison AS (
       SELECT FF1.cik AS company1_cik, 
              FF1.company_name AS company1_name,
              FF2.cik AS company2_cik, 
              FF2.company_name AS company2_name,
              ABS(FF1.debt_to_asset_ratio - FF2.debt_to_asset_ratio) AS ratio_difference,
              (FF1.debt_to_asset_ratio + FF2.debt_to_asset_ratio) / 2 AS avg_debt_to_asset_ratio
       FROM FilteredFinancials FF1
       JOIN FilteredFinancials FF2 
         ON FF1.bucket = FF2.bucket AND FF1.cik < FF2.cik
       WHERE ABS(FF1.debt_to_asset_ratio - FF2.debt_to_asset_ratio) < 0.05
    ),
    RankedPairs AS (
       SELECT company1_cik, company1_name, 
              company2_cik, company2_name, 
              ratio_difference,
              ROW_NUMBER() OVER (PARTITION BY company1_cik ORDER BY ratio_difference ASC) AS pair_rank
       FROM PairwiseComparison
    )
    SELECT company1_cik, company1_name, 
           company2_cik, company2_name, 
           ratio_difference
    FROM RankedPairs
    WHERE pair_rank <= 10
    ORDER BY ratio_difference ASC
    LIMIT 300;
    """)
    try:
        result = await db.execute(query)
        results = result.all()
        if not results:
            raise HTTPException(status_code=404, detail="No data found")
        return [
            {
                "Company1CIK": row.company1_cik,
                "Company1Name": row.company1_name,
                "Company2CIK": row.company2_cik,
                "Company2Name": row.company2_name,
                "RatioDifference": row.ratio_difference,
            }
            for row in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")


@general_router.get("/companies/similar_inventory_ratios", response_model=List[Dict])
async def get_similar_inventory_ratios_balanced(db: AsyncSession = Depends(get_db)):
    """
    Query to identify pairs of companies with similar inventory-to-asset ratios
    for balanced execution time
    """
    query = text("""
    WITH InitialDebtRatios AS (
       SELECT F.CIK,
              C.CompanyName,
              F.inventory_net,
              F.assets,
              F.cash_and_equivalents,
              F.liabilities,
              (F.inventory_net / NULLIF(F.assets, 0)) AS InventoryToAssetRatio,
              (F.cash_and_equivalents / NULLIF(F.liabilities, 0)) AS CashToLiabilityRatio
       FROM Financials F
       JOIN companies C ON CAST(F.CIK AS VARCHAR) = CAST(C.CIK AS VARCHAR)
       WHERE F.inventory_net IS NOT NULL
         AND F.assets IS NOT NULL
         AND F.assets > 0
         AND F.liabilities IS NOT NULL
    ),
    FilteredDebtRatios AS (
       SELECT CIK, CompanyName, InventoryToAssetRatio, CashToLiabilityRatio, assets, liabilities
       FROM InitialDebtRatios
       WHERE CashToLiabilityRatio > 0.2
    ),
    BucketedDebtRatios AS (
       SELECT *, NTILE(5) OVER (ORDER BY InventoryToAssetRatio) AS bucket
       FROM FilteredDebtRatios
    ),
    CrossComparison AS (
       SELECT R1.CIK AS "Company1", R1.CompanyName AS "Company1Name",
              R2.CIK AS "Company2", R2.CompanyName AS "Company2Name",
              ABS(R1.InventoryToAssetRatio - R2.InventoryToAssetRatio) AS "RatioDifference",
              (R1.CashToLiabilityRatio + R2.CashToLiabilityRatio) / 2 AS "AvgCashToLiabilityRatio",
              (R1.assets + R2.assets) / 2 AS "AvgAssets",
              (R1.liabilities + R2.liabilities) / 2 AS "AvgLiabilities"
       FROM BucketedDebtRatios R1
       JOIN BucketedDebtRatios R2 
         ON R1.bucket = R2.bucket AND R1.CIK < R2.CIK
       WHERE ABS(R1.InventoryToAssetRatio - R2.InventoryToAssetRatio) < 0.1
    ),
    RankedComparison AS (
       SELECT "Company1", "Company1Name", "Company2", "Company2Name", "RatioDifference", 
              "AvgCashToLiabilityRatio", "AvgAssets", "AvgLiabilities",
              ROW_NUMBER() OVER (PARTITION BY "Company1" ORDER BY "RatioDifference" ASC) AS "PairRank"
       FROM CrossComparison
    )
    SELECT "Company1", "Company1Name", "Company2", "Company2Name", "RatioDifference", 
           "AvgCashToLiabilityRatio", "AvgAssets", "AvgLiabilities"
    FROM RankedComparison
    WHERE "PairRank" <= 20
    ORDER BY "RatioDifference" ASC
    LIMIT 1000;
    """)
    try:
        result = await db.execute(query)
        results = result.all()
        if not results:
            raise HTTPException(status_code=404, detail="No data found")
        return [
            {
                "Company1CIK": row.Company1,
                "Company1Name": row.Company1Name,
                "Company2CIK": row.Company2,
                "Company2Name": row.Company2Name,
                "RatioDifference": row.RatioDifference,
                "AvgCashToLiabilityRatio": row.AvgCashToLiabilityRatio,
                "AvgAssets": row.AvgAssets,
                "AvgLiabilities": row.AvgLiabilities,
            }
            for row in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")

@general_router.get("/companies/strong_liquidity", response_model=List[Dict])
async def get_companies_with_strong_liquidity(db: AsyncSession = Depends(get_db)):
    """
    Identifies companies with cash reserves more than twice their liabilities,
    highlighting financially stable firms with strong liquidity.
    """
    query = text("""
    SELECT F.CIK AS "cik", 
           C.CompanyName AS "company_name", 
           F.cash_and_equivalents AS "cash_and_equivalents", 
           F.liabilities AS "liabilities",
           (F.cash_and_equivalents / NULLIF(F.liabilities, 0)) AS "cash_to_liability_ratio"
    FROM Financials F
    JOIN companies C ON CAST(F.CIK AS VARCHAR) = CAST(C.CIK AS VARCHAR)
    WHERE F.liabilities IS NOT NULL
      AND F.liabilities > 0
      AND F.cash_and_equivalents > (2 * F.liabilities)
    ORDER BY "cash_to_liability_ratio" DESC;
    """)
    try:
        result = await db.execute(query)
        results = result.all()
        if not results:
            raise HTTPException(status_code=404, detail="No data found")
        return [
            {
                "CIK": row.cik,
                "CompanyName": row.company_name,
                "CashAndEquivalents": row.cash_and_equivalents,
                "Liabilities": row.liabilities,
                "CashToLiabilityRatio": row.cash_to_liability_ratio,
            }
            for row in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")


@general_router.get("/companies/financial_improvement", response_model=List[Dict])
async def get_companies_with_financial_improvement(db: AsyncSession = Depends(get_db)):
    """
    Identifies companies with significant financial improvement over two years,
    specifically those that have increased cash reserves by more than 5% and reduced long-term debt by more than 5%.
    """
    query = text("""
    WITH YearlyFinancialData AS (
       SELECT F.CIK AS cik,
              C.CompanyName AS company_name,
              F.year AS year,
              F.cash_and_equivalents AS cash_and_equivalents,
              F.long_term_debt AS long_term_debt,
              LAG(F.cash_and_equivalents) OVER (PARTITION BY F.CIK ORDER BY F.year) AS prev_cash,
              LAG(F.long_term_debt) OVER (PARTITION BY F.CIK ORDER BY F.year) AS prev_debt,
              (F.cash_and_equivalents - LAG(F.cash_and_equivalents) OVER (PARTITION BY F.CIK ORDER BY F.year)) * 100.0 / NULLIF(LAG(F.cash_and_equivalents) OVER (PARTITION BY F.CIK ORDER BY F.year), 0) AS cash_growth_percentage,
              (LAG(F.long_term_debt) OVER (PARTITION BY F.CIK ORDER BY F.year) - F.long_term_debt) * 100.0 / NULLIF(LAG(F.long_term_debt) OVER (PARTITION BY F.CIK ORDER BY F.year), 0) AS debt_reduction_percentage,
              AVG(F.cash_and_equivalents) OVER (PARTITION BY F.CIK ORDER BY F.year ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS three_year_avg_cash
       FROM Financials F
       JOIN companies C ON CAST(F.CIK AS VARCHAR) = CAST(C.CIK AS VARCHAR)
    )
    SELECT cik, company_name, year, cash_and_equivalents, long_term_debt,
           cash_growth_percentage, debt_reduction_percentage, three_year_avg_cash
    FROM YearlyFinancialData
    WHERE cash_and_equivalents > prev_cash
      AND long_term_debt < prev_debt
      AND cash_growth_percentage > 5
      AND debt_reduction_percentage > 5
    ORDER BY year, cik;
    """)
    try:
        result = await db.execute(query)
        results = result.all()
        if not results:
            raise HTTPException(status_code=404, detail="No data found")
        return [
            {
                "CIK": row.cik,
                "CompanyName": row.company_name,
                "Year": row.year,
                "CashAndEquivalents": row.cash_and_equivalents,
                "LongTermDebt": row.long_term_debt,
                "CashGrowthPercentage": row.cash_growth_percentage,
                "DebtReductionPercentage": row.debt_reduction_percentage,
                "ThreeYearAvgCash": row.three_year_avg_cash,
            }
            for row in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")

from pydantic import BaseModel
class SearchCriterion(BaseModel):
    feature: str
    operator: str
    value: str
    logicalOperator: str

class SearchRequest(BaseModel):
    criteria: List[SearchCriterion]

@general_router.post("/search")
async def search_financials(request: SearchRequest, db: AsyncSession = Depends(get_db)):
    """
    Searches the financials table based on the provided criteria.
    Each criterion should specify a feature, operator, value, and logical operator.
    """

    try:
        criteria = request.criteria

        query = []
        for i, criterion in enumerate(criteria):
            if i > 0:
                query.append(f"{criterion.logicalOperator} {criterion.feature} {criterion.operator} '{criterion.value}'")
            else:
                query.append(f"{criterion.feature} {criterion.operator} '{criterion.value}'")

        query_string = " ".join(query)
        full_query = f"SELECT * FROM Financials WHERE {query_string} LIMIT 50"
        response = await db.execute(text(full_query))
        result = response.all()
        if not result:
            return []
        return [
            {
                "CIK": row.cik,
                "Year": row.year,
                "Month": row.month,
                "Accounts Payable Current": row.accounts_payable_current,
                "Assets": row.assets,
                "Liabilities": row.liabilities,
                "Cash and Equivalents": row.cash_and_equivalents,
                "Accounts Receivable Current": row.accounts_receivable_current,
                "Inventory Net": row.inventory_net,
                "Long Term Debt": row.long_term_debt,
            }
            for row in result
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")