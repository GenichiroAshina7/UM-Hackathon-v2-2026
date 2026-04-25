from fastapi import APIRouter, HTTPException
from . import data, agent
from .models import (
    MenuItemCreate, AnalysisRequest, SimulateRequest, ChatRequest,
    IncomeCreate, ExpenseCreate, DebtCreate, DebtUpdate,
    GoalCreate, GoalUpdate, FinanceAdviseRequest, BridgeAdviseRequest,
    StrategyCreate,
)

router = APIRouter(prefix="/api")


# --- Menu CRUD ---

@router.get("/menu")
def get_menu():
    return data.get_all_menu_items()


@router.post("/menu")
def add_menu_item(item: MenuItemCreate):
    return data.add_menu_item(item.model_dump())


@router.put("/menu/{item_id}")
def update_menu_item(item_id: str, item: MenuItemCreate):
    result = data.update_menu_item(item_id, item.model_dump())
    if not result:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return result


@router.delete("/menu/{item_id}")
def delete_menu_item(item_id: str):
    if not data.delete_menu_item(item_id):
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"status": "deleted"}


# --- AI Analysis ---

@router.post("/analyse")
def analyse(request: AnalysisRequest):
    result = agent.run_agent(
        [item.model_dump() for item in request.menu_items],
        request.context,
    )
    data.save_insight(request.context, result, layer="business")
    return result


# --- What-If Simulation ---

@router.post("/simulate")
def simulate(request: SimulateRequest):
    result = agent.run_simulation_agent(request.model_dump())
    return result


# --- Insights History ---

@router.get("/insights/history")
def insights_history(limit: int = 10):
    return data.get_insights_history(limit)


# --- AI Chat ---

@router.post("/chat")
def chat(request: ChatRequest):
    conversation = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    result = agent.run_chat_agent(conversation)
    return result


# --- Income CRUD ---

@router.get("/finance/income")
def get_income():
    return data.get_all_income()


@router.post("/finance/income")
def add_income(record: IncomeCreate):
    return data.add_income(record.model_dump())


@router.delete("/finance/income/{record_id}")
def delete_income(record_id: str):
    if not data.delete_income(record_id):
        raise HTTPException(status_code=404, detail="Income record not found")
    return {"status": "deleted"}


# --- Expense CRUD ---

@router.get("/finance/expenses")
def get_expenses():
    return data.get_all_expenses()


@router.post("/finance/expenses")
def add_expense(record: ExpenseCreate):
    return data.add_expense(record.model_dump())


@router.delete("/finance/expenses/{record_id}")
def delete_expense(record_id: str):
    if not data.delete_expense(record_id):
        raise HTTPException(status_code=404, detail="Expense record not found")
    return {"status": "deleted"}


# --- Debts CRUD ---

@router.get("/finance/debts")
def get_debts():
    return data.get_all_debts()


@router.post("/finance/debts")
def add_debt(record: DebtCreate):
    return data.add_debt(record.model_dump())


@router.put("/finance/debts/{debt_id}")
def update_debt(debt_id: str, record: DebtUpdate):
    result = data.update_debt(debt_id, record.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(status_code=404, detail="Debt not found")
    return result


@router.delete("/finance/debts/{debt_id}")
def delete_debt(debt_id: str):
    if not data.delete_debt(debt_id):
        raise HTTPException(status_code=404, detail="Debt not found")
    return {"status": "deleted"}


# --- Savings Goals ---

@router.get("/finance/goals")
def get_goals():
    return data.get_all_goals()


@router.post("/finance/goals")
def add_goal(record: GoalCreate):
    return data.add_goal(record.model_dump())


@router.put("/finance/goals/{goal_id}")
def update_goal(goal_id: str, record: GoalUpdate):
    result = data.update_goal(goal_id, record.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(status_code=404, detail="Goal not found")
    return result


@router.delete("/finance/goals/{goal_id}")
def delete_goal(goal_id: str):
    if not data.delete_goal(goal_id):
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"status": "deleted"}


# --- Financial Health Score ---

@router.get("/finance/health-score")
def health_score():
    return data.calculate_financial_health_score()


# --- Finance AI Advisor ---

@router.post("/finance/advise")
def finance_advise(request: FinanceAdviseRequest):
    result = agent.run_finance_agent(request.context)
    data.save_insight(request.context, result, layer="finance")
    return result


# --- Cross-Layer AI Bridge ---

@router.post("/advise")
def bridge_advise(request: BridgeAdviseRequest):
    result = agent.run_bridge_agent(request.context)
    data.save_insight(request.context, result, layer="bridge")
    return result


# --- Strategies / Advice ---

@router.get("/strategies")
def get_strategies(layer: str = None):
    return data.get_all_strategies(layer or None)


@router.get("/strategies/{strategy_id}")
def get_strategy(strategy_id: str):
    result = data.get_strategy(strategy_id)
    if not result:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return result


@router.post("/strategies")
def add_strategy(record: StrategyCreate):
    return data.add_strategy(record.model_dump())


@router.delete("/strategies/{strategy_id}")
def delete_strategy(strategy_id: str):
    if not data.delete_strategy(strategy_id):
        raise HTTPException(status_code=404, detail="Strategy not found")
    return {"status": "deleted"}


# --- Demo Scenarios ---

@router.post("/demo/{scenario_id}")
def load_demo(scenario_id: str):
    demos = {
        "underpriced": _scenario_underpriced(),
        "competitive": _scenario_competitive(),
        "rising-costs": _scenario_rising_costs(),
    }
    if scenario_id not in demos:
        raise HTTPException(status_code=404, detail="Scenario not found")
    demo = demos[scenario_id]
    # Clear existing data and load demo
    data.clear_all_data()
    for item in demo["menu"]:
        data.add_menu_item(item)
    for inc in demo.get("income", []):
        data.add_income(inc)
    for exp in demo.get("expenses", []):
        data.add_expense(exp)
    for debt in demo.get("debts", []):
        data.add_debt(debt)
    for goal in demo.get("goals", []):
        data.add_goal(goal)
    return {"loaded": scenario_id, "items": len(demo["menu"])}


def _scenario_underpriced() -> dict:
    return {
        "menu": [
            {"name": "Nasi Lemak", "category": "Food", "cost_per_unit": 3.80, "current_price": 3.50,
             "monthly_volume": 400, "competitor_price_low": 4.00, "competitor_price_high": 6.00},
            {"name": "Mee Goreng", "category": "Food", "cost_per_unit": 2.90, "current_price": 3.00,
             "monthly_volume": 250, "competitor_price_low": 3.50, "competitor_price_high": 5.50},
            {"name": "Teh Tarik", "category": "Drinks", "cost_per_unit": 1.80, "current_price": 1.50,
             "monthly_volume": 500, "competitor_price_low": 1.80, "competitor_price_high": 3.00},
            {"name": "Kuih Muih", "category": "Snacks", "cost_per_unit": 1.20, "current_price": 1.00,
             "monthly_volume": 300, "competitor_price_low": 1.20, "competitor_price_high": 2.00},
        ],
        "income": [
            {"source": "Husband's construction work", "type": "variable", "amount": 1200.00, "date": "2025-01-25"},
            {"source": "Weekend nasi lemak stall", "type": "variable", "amount": 600.00, "date": "2025-01-25"},
        ],
        "expenses": [
            {"category": "Rent & Utilities", "description": "Monthly rent", "amount": 500.00, "needs_wants": "needs", "date": "2025-01-01"},
            {"category": "Food & Groceries", "description": "Monthly groceries", "amount": 600.00, "needs_wants": "needs", "date": "2025-01-01"},
            {"category": "Transport", "description": "Motorcycle petrol", "amount": 150.00, "needs_wants": "needs", "date": "2025-01-01"},
            {"category": "Children's Needs", "description": "School fees and supplies", "amount": 200.00, "needs_wants": "needs", "date": "2025-01-01"},
            {"category": "Debt Repayment", "description": "Informal lender payment", "amount": 200.00, "needs_wants": "needs", "date": "2025-01-01"},
            {"category": "Healthcare", "description": "Clinic visit", "amount": 80.00, "needs_wants": "needs", "date": "2025-01-15"},
            {"category": "Others", "description": "Phone credit", "amount": 50.00, "needs_wants": "wants", "date": "2025-01-10"},
            {"category": "Food & Groceries", "description": "Snacks and extras", "amount": 120.00, "needs_wants": "wants", "date": "2025-01-20"},
        ],
        "debts": [
            {"creditor": "Informal lender", "type": "informal", "total_owed": 3000.00, "monthly_payment": 200.00, "interest_rate": 10.0},
        ],
        "goals": [
            {"name": "Emergency fund", "target_amount": 2100.00, "current_amount": 0.00, "deadline": "2025-12-31"},
        ],
    }


def _scenario_competitive() -> dict:
    return {
        "menu": [
            {"name": "Mee Goreng Biasa", "category": "Food", "cost_per_unit": 2.00, "current_price": 4.50,
             "monthly_volume": 200, "competitor_price_low": 3.00, "competitor_price_high": 4.00},
            {"name": "Mee Goreng Special", "category": "Food", "cost_per_unit": 3.50, "current_price": 6.50,
             "monthly_volume": 100, "competitor_price_low": 5.00, "competitor_price_high": 6.00},
            {"name": "Mee Soto", "category": "Food", "cost_per_unit": 2.50, "current_price": 5.00,
             "monthly_volume": 150, "competitor_price_low": 3.50, "competitor_price_high": 4.50},
            {"name": "Ais Kacang", "category": "Drinks", "cost_per_unit": 1.00, "current_price": 2.50,
             "monthly_volume": 300, "competitor_price_low": 1.80, "competitor_price_high": 2.50},
        ],
        "income": [
            {"source": "Husband's factory job", "type": "fixed", "amount": 1600.00, "date": "2025-01-25"},
            {"source": "Mee stall (weekdays)", "type": "variable", "amount": 800.00, "date": "2025-01-25"},
        ],
        "expenses": [
            {"category": "Rent & Utilities", "description": "Monthly rent", "amount": 600.00, "needs_wants": "needs", "date": "2025-01-01"},
            {"category": "Food & Groceries", "description": "Monthly groceries", "amount": 550.00, "needs_wants": "needs", "date": "2025-01-01"},
            {"category": "Transport", "description": "Car petrol and maintenance", "amount": 250.00, "needs_wants": "needs", "date": "2025-01-01"},
            {"category": "Children's Needs", "description": "School and tuition", "amount": 300.00, "needs_wants": "needs", "date": "2025-01-01"},
            {"category": "Debt Repayment", "description": "Credit card minimum", "amount": 150.00, "needs_wants": "needs", "date": "2025-01-01"},
            {"category": "Healthcare", "description": "Medications", "amount": 50.00, "needs_wants": "needs", "date": "2025-01-10"},
            {"category": "Others", "description": "Eating out", "amount": 100.00, "needs_wants": "wants", "date": "2025-01-15"},
            {"category": "Others", "description": "Clothing", "amount": 100.00, "needs_wants": "wants", "date": "2025-01-20"},
        ],
        "debts": [
            {"creditor": "Credit card", "type": "credit_card", "total_owed": 1500.00, "monthly_payment": 150.00, "interest_rate": 18.0},
        ],
        "goals": [
            {"name": "Emergency fund", "target_amount": 2000.00, "current_amount": 200.00, "deadline": "2025-09-01"},
        ],
    }


def _scenario_rising_costs() -> dict:
    return {
        "menu": [
            {"name": "Kopi O", "category": "Drinks", "cost_per_unit": 1.80, "current_price": 2.00,
             "monthly_volume": 600, "competitor_price_low": 1.80, "competitor_price_high": 2.50},
            {"name": "Teh Tarik", "category": "Drinks", "cost_per_unit": 1.90, "current_price": 2.20,
             "monthly_volume": 500, "competitor_price_low": 2.00, "competitor_price_high": 2.80},
            {"name": "Kopi C", "category": "Drinks", "cost_per_unit": 1.70, "current_price": 2.00,
             "monthly_volume": 400, "competitor_price_low": 1.80, "competitor_price_high": 2.50},
            {"name": "Roti Bakar", "category": "Snacks", "cost_per_unit": 1.50, "current_price": 2.50,
             "monthly_volume": 300, "competitor_price_low": 2.00, "competitor_price_high": 3.00},
            {"name": "Soft Boiled Eggs", "category": "Snacks", "cost_per_unit": 2.10, "current_price": 2.50,
             "monthly_volume": 200, "competitor_price_low": 2.00, "competitor_price_high": 3.00},
        ],
        "income": [
            {"source": "Husband's delivery job", "type": "variable", "amount": 1400.00, "date": "2025-01-25"},
            {"source": "Kopitiam morning shift", "type": "fixed", "amount": 600.00, "date": "2025-01-25"},
        ],
        "expenses": [
            {"category": "Rent & Utilities", "description": "Monthly rent", "amount": 450.00, "needs_wants": "needs", "date": "2025-01-01"},
            {"category": "Food & Groceries", "description": "Monthly groceries", "amount": 500.00, "needs_wants": "needs", "date": "2025-01-01"},
            {"category": "Transport", "description": "Motorcycle petrol", "amount": 120.00, "needs_wants": "needs", "date": "2025-01-01"},
            {"category": "Children's Needs", "description": "School fees", "amount": 150.00, "needs_wants": "needs", "date": "2025-01-01"},
            {"category": "Debt Repayment", "description": "Atome installment", "amount": 100.00, "needs_wants": "needs", "date": "2025-01-01"},
            {"category": "Healthcare", "description": "Monthly supplements", "amount": 30.00, "needs_wants": "needs", "date": "2025-01-01"},
            {"category": "Others", "description": "Phone and internet", "amount": 80.00, "needs_wants": "needs", "date": "2025-01-05"},
            {"category": "Food & Groceries", "description": "Extra eating out", "amount": 70.00, "needs_wants": "wants", "date": "2025-01-20"},
        ],
        "debts": [
            {"creditor": "Atome (buy now pay later)", "type": "bnpl", "total_owed": 500.00, "monthly_payment": 100.00, "interest_rate": 0.0},
            {"creditor": "Family loan", "type": "family", "total_owed": 200.00, "monthly_payment": 50.00, "interest_rate": 0.0},
        ],
        "goals": [
            {"name": "Emergency fund", "target_amount": 1500.00, "current_amount": 150.00, "deadline": "2025-08-01"},
            {"name": "Children's school fund", "target_amount": 300.00, "current_amount": 50.00, "deadline": "2025-06-01"},
        ],
    }
