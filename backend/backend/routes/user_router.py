from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, delete, and_
from backend.db.database import get_db
from backend.models.schemas import UserCreate, UserLogin, Token, CompanyList, CompanyDelete, CompanyData, OAuthUserCreate
from backend.models.models import User, UserCompany, Financial
from passlib.context import CryptContext
import logging
import os
from dotenv import load_dotenv
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import pandas as pd
from typing import List
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, func
import jwt

user_router = APIRouter(
    prefix="/users",
    tags=["users"],
)

# Add these constants
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("No JWT_SECRET_KEY set in environment variables")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Add this near the top with other initializations
security = HTTPBearer()

logger = logging.getLogger(__name__)

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = int(payload["sub"])  # Convert string back to int
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    except (KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token payload")

@user_router.post("/register", response_model=Token)
async def register_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        # Hash the password
        hashed_password = pwd_context.hash(user.password)
        
        # Create new user
        db_user = User(
            username=user.username,
            email=user.email,
            hashed_password=hashed_password
        )
        
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)  # Refresh to get the ID
        
        # Create token with 'sub' field
        token = jwt.encode({
            "email": user.email,
            "sub": str(db_user.id),  # Add the user ID as 'sub'
            "provider": "credentials"
        }, SECRET_KEY, algorithm="HS256")
        
        return {"token": token}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@user_router.post("/login")
async def login_user(user: UserLogin, db: AsyncSession = Depends(get_db)):
    try:
        logger.info(f"Attempting login for email: {user.email}")
        
        # Find user
        result = await db.execute(
            select(User).where(User.email == user.email)
        )
        db_user = result.scalar_one_or_none()
        
        if not db_user:
            logger.error(f"No user found with email: {user.email}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        logger.info("User found, verifying password...")
        
        # Verify password
        if not pwd_context.verify(user.password, db_user.hashed_password):
            logger.error("Password verification failed")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        logger.info("Password verified, generating token...")
        
        # Create token with 'sub' field
        token = jwt.encode({
            "email": user.email,
            "sub": str(db_user.id),  # Add the user ID as 'sub'
            "provider": "credentials"
        }, SECRET_KEY, algorithm="HS256")
        
        logger.info("Login successful")
        return {"token": token, "user_id": db_user.id}
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        await db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=str(e))


@user_router.post("/logout")
async def logout_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    print("DEBUG: Received request to logout")
    print(f"DEBUG: Token received: {credentials.credentials}")
    
    try:
        # Verify the token is valid
        decoded = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        print(f"DEBUG: Successfully decoded token: {decoded}")
        return {"message": "Successfully logged out"}
    except Exception as e:
        print(f"DEBUG: Error in logout: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Error processing token: {str(e)}")

@user_router.post("/companies")
async def track_companies(
    companies: CompanyList,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    try:
        # Verify token and get user email
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        email = payload["email"]
        
        # Get user
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Add companies to tracking
        added_companies = []
        skipped_companies = []
        for cik in companies.ciks:
            try:
                company_track = UserCompany(
                    user_id=user.id,
                    cik=cik
                )
                db.add(company_track)
                await db.commit()
                added_companies.append(cik)
            except IntegrityError:
                await db.rollback()
                skipped_companies.append(cik)
                continue
        
        return {
            "message": "Companies processed",
            "added": added_companies,
            "skipped": skipped_companies
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@user_router.delete("/companies")
async def untrack_company(
    company_data: CompanyDelete,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    try:
        # Verify token and get user email
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        email = payload["email"]
        
        # Get user
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Delete company from tracking
        await db.execute(
            delete(UserCompany).where(
                (UserCompany.user_id == user.id) & 
                (UserCompany.cik == company_data.cik)
            )
        )
        
        await db.commit()
        return {"message": "Company removed from tracking successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@user_router.delete("/delete")
async def delete_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    try:
        # Verify token and get user email
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        email = payload["email"]
        
        # Find and delete user
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Delete user's tracked companies first (due to foreign key constraint)
        await db.execute(
            delete(UserCompany).where(UserCompany.user_id == user.id)
        )
        
        # Delete user
        await db.delete(user)
        await db.commit()
        
        return {"message": "User deleted successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))




@user_router.get("/companies/data", response_model=List[CompanyData])
async def get_tracked_companies_data(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    try:
        # Extract and verify token
        token = credentials.credentials
        print(f"Received token in /companies/data: {token[:20]}...")
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        print(f"Decoded payload in /companies/data: {payload}")
        
        email = payload["email"]
        
        # Get user
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user's tracked companies
        tracked_companies_result = await db.execute(
            select(UserCompany.cik).where(UserCompany.user_id == user.id)
        )
        tracked_ciks = [row[0] for row in tracked_companies_result.fetchall()]
        
        if not tracked_ciks:
            return []
            
        # More efficient query to get most recent data
        latest_dates = select(
            Financial.cik,
            func.max(Financial.year).label('max_year'),
            func.max(Financial.month).label('max_month')
        ).where(
            Financial.cik.in_(tracked_ciks)
        ).group_by(
            Financial.cik
        ).subquery()

        result = await db.execute(
            select(Financial).join(
                latest_dates,
                and_(
                    Financial.cik == latest_dates.c.cik,
                    Financial.year == latest_dates.c.max_year,
                    Financial.month == latest_dates.c.max_month
                )
            )
        )
        
        financials = result.scalars().all()
        
        # Convert to response format
        company_data = []
        for financial in financials:
            company_data.append(CompanyData(
                cik=financial.cik,
                year=financial.year,
                month=financial.month,
                accounts_payable=float(financial.accounts_payable_current) if financial.accounts_payable_current else None,
                assets=float(financial.assets) if financial.assets else None,
                liabilities=float(financial.liabilities) if financial.liabilities else None,
                cash=float(financial.cash_and_equivalents) if financial.cash_and_equivalents else None,
                accounts_receivable=float(financial.accounts_receivable_current) if financial.accounts_receivable_current else None,
                inventory=float(financial.inventory_net) if financial.inventory_net else None,
                long_term_debt=float(financial.long_term_debt) if financial.long_term_debt else None
            ))
        
        return company_data
            
    except Exception as e:
        print(f"Error in get_tracked_companies_data: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@user_router.post("/oauth")
async def create_oauth_user(user_data: OAuthUserCreate, db: AsyncSession = Depends(get_db)):
    try:
        logger.info(f"1. Received OAuth request with data: {user_data}")
        
        # For Twitter, create an email using the username if email is not provided
        if user_data.provider == 'twitter' and not user_data.email:
            user_data.email = f"{user_data.name}@twitter.user"
            logger.info(f"2. Created synthetic email for Twitter user: {user_data.email}")
        
        # Check if user exists by email
        result = await db.execute(
            select(User).where(User.email == user_data.email)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            logger.info(f"3. Found existing user: {existing_user.email}")
            token = jwt.encode(
                {
                    "email": existing_user.email,
                    "sub": str(existing_user.id),
                    "provider": user_data.provider
                }, 
                SECRET_KEY, 
                algorithm="HS256"
            )
            return {"token": token, "user_id": existing_user.id}
        
        logger.info("4. Creating new user...")
        # For Twitter users, use their Twitter username
        username = user_data.name if user_data.provider == 'twitter' else f"{user_data.name}_{user_data.email.split('@')[0]}"
        
        new_user = User(
            email=user_data.email,
            username=username,
            provider=user_data.provider,
            hashed_password=None
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        logger.info(f"5. Successfully created user: {new_user.email}")
        
        token = jwt.encode(
            {
                "email": new_user.email,
                "sub": str(new_user.id),
                "provider": user_data.provider
            }, 
            SECRET_KEY, 
            algorithm="HS256"
        )
        
        return {"token": token, "user_id": new_user.id}
    except Exception as e:
        await db.rollback()
        logger.error(f"ERROR in OAuth: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=400, detail=str(e))
    

@user_router.get("/me")
async def get_user_profile(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        # Extract token from Bearer token
        token = credentials.credentials
        print(f"Received token in /me: {token[:20]}...")
        
        # Verify the token
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        print(f"Decoded payload in /me: {payload}")
        
        return {
            "id": payload["sub"],
            "email": payload["email"],
            "provider": payload.get("provider"),
            "username": payload["email"].split('@')[0]
        }
    except Exception as e:
        print(f"Error in /me: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))

@user_router.get("/companies")
async def get_saved_companies(user_id: int = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    try:
        # Join with companies table to get company details
        query = """
            SELECT DISTINCT c.cik, c.ticker, c.companyname, f.year, f.month,
                   f.cash_and_equivalents, f.long_term_debt
            FROM user_companies uc
            JOIN companies c ON uc.cik = c.cik
            JOIN financials f ON c.cik = f.cik
            WHERE uc.user_id = :user_id
            AND (f.year, f.month) = (
                SELECT year, month
                FROM financials f2
                WHERE f2.cik = c.cik
                ORDER BY year DESC, month DESC
                LIMIT 1
            )
        """
        result = await db.execute(text(query), {"user_id": user_id})
        companies = result.fetchall()
        
        return [
            {
                "cik": str(company.cik),
                "ticker": company.ticker,
                "companyname": company.companyname,
                "year": company.year,
                "month": company.month,
                "cash_and_equivalents": company.cash_and_equivalents,
                "long_term_debt": company.long_term_debt
            }
            for company in companies
        ]
    except Exception as e:
        print(f"Error in get_saved_companies: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

