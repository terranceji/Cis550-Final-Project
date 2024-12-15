from pydantic import BaseModel, EmailStr, validator

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    token: str 

class CompanyList(BaseModel):
    ciks: list[int]

class CompanyDelete(BaseModel):
    cik: int 

class CompanyData(BaseModel):
    cik: int
    year: int
    month: int
    accounts_payable: float | None
    assets: float | None
    liabilities: float | None
    cash: float | None
    accounts_receivable: float | None
    inventory: float | None
    long_term_debt: float | None 

class OAuthUserCreate(BaseModel):
    email: str | None = None
    name: str
    provider: str

    @validator('email')
    def validate_email(cls, v):
        if not v:
            raise ValueError('Email cannot be empty')
        return v 