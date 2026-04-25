from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# --- Business Layer Models ---

class MenuItemCreate(BaseModel):
    name: str
    category: str  # Food / Drinks / Snacks
    cost_per_unit: float
    current_price: float
    monthly_volume: int
    competitor_price_low: float
    competitor_price_high: float


class MenuItem(MenuItemCreate):
    id: str
    created_at: str
    updated_at: str


class AnalysisRequest(BaseModel):
    menu_items: list[MenuItem]
    context: dict


class SimulateRequest(BaseModel):
    item_name: str
    current_price: float
    new_price: float
    cost_per_unit: float
    monthly_volume: int
    volume_change_pct: float
    context: Optional[dict] = None


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


# --- Finance Layer Models ---

class IncomeCreate(BaseModel):
    source: str
    type: str  # "fixed" or "variable"
    amount: float
    date: str


class ExpenseCreate(BaseModel):
    category: str
    description: str
    amount: float
    needs_wants: str  # "needs" or "wants"
    date: str


class DebtCreate(BaseModel):
    creditor: str
    type: str  # formal / credit_card / informal / bnpl / family
    total_owed: float
    monthly_payment: float
    interest_rate: Optional[float] = 0.0


class DebtUpdate(BaseModel):
    creditor: Optional[str] = None
    type: Optional[str] = None
    total_owed: Optional[float] = None
    monthly_payment: Optional[float] = None
    interest_rate: Optional[float] = None


class GoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0.0
    deadline: Optional[str] = None


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    deadline: Optional[str] = None


class FinanceAdviseRequest(BaseModel):
    context: dict


class BridgeAdviseRequest(BaseModel):
    context: dict


# --- Strategies / Advice ---

class StrategyCreate(BaseModel):
    title: str
    content: str
    layer: str  # "finance" or "business"
