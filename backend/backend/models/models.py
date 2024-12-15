from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String)
    hashed_password = Column(String, nullable=True)  # nullable for OAuth users
    provider = Column(String, nullable=True)  # 'google', 'facebook', etc.
    
    # Add this line to define the relationship
    tracked_companies = relationship("UserCompany", back_populates="user", cascade="all, delete-orphan")

class UserCompany(Base):
    __tablename__ = "user_companies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    cik = Column(Integer)
    
    # This relationship is already defined correctly
    user = relationship("User", back_populates="tracked_companies")
    
    __table_args__ = (UniqueConstraint('user_id', 'cik', name='uq_user_company'),)

class Financial(Base):
    __tablename__ = "financials"

    cik = Column(Integer, primary_key=True)
    year = Column(Integer, primary_key=True)
    month = Column(Integer, primary_key=True)
    accounts_payable_current = Column(Numeric, nullable=True)
    assets = Column(Numeric, nullable=True)
    liabilities = Column(Numeric, nullable=True)
    cash_and_equivalents = Column(Numeric, nullable=True)
    accounts_receivable_current = Column(Numeric, nullable=True)
    inventory_net = Column(Numeric, nullable=True)
    long_term_debt = Column(Numeric, nullable=True)

class Company(Base):
    __tablename__ = "companies"
    
    ticker = Column(String, primary_key=True)
    companyname = Column(String)
    cik = Column(String)

class StockPrice(Base):
    __tablename__ = "stock_prices"
    
    id = Column(Integer, primary_key=True)
    open = Column(Numeric)
    high = Column(Numeric)
    low = Column(Numeric)
    close = Column(Numeric)
    volume = Column(Integer)
    ticker = Column(String)
    year = Column(Integer)
    month = Column(Integer)
    day = Column(Integer)