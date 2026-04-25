import json
import os
from uuid import uuid4
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
MENU_FILE = os.path.join(DATA_DIR, "menu_items.json")
INSIGHTS_FILE = os.path.join(DATA_DIR, "insights_history.json")
INCOME_FILE = os.path.join(DATA_DIR, "income_records.json")
EXPENSE_FILE = os.path.join(DATA_DIR, "expense_records.json")
DEBTS_FILE = os.path.join(DATA_DIR, "debts.json")
GOALS_FILE = os.path.join(DATA_DIR, "savings_goals.json")
STRATEGIES_FILE = os.path.join(DATA_DIR, "strategies.json")


def _ensure_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def _read_json(path: str) -> list:
    _ensure_dir()
    if not os.path.exists(path):
        return []
    with open(path, "r") as f:
        return json.load(f)


def _write_json(path: str, data: list):
    _ensure_dir()
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


# --- Menu Items ---

def get_all_menu_items() -> list[dict]:
    return _read_json(MENU_FILE)


def get_menu_item(item_id: str) -> dict | None:
    items = _read_json(MENU_FILE)
    for item in items:
        if item["id"] == item_id:
            return item
    return None


def add_menu_item(data: dict) -> dict:
    items = _read_json(MENU_FILE)
    now = datetime.utcnow().isoformat()
    item = {
        "id": str(uuid4()),
        **data,
        "created_at": now,
        "updated_at": now,
    }
    items.append(item)
    _write_json(MENU_FILE, items)
    return item


def update_menu_item(item_id: str, data: dict) -> dict | None:
    items = _read_json(MENU_FILE)
    for i, item in enumerate(items):
        if item["id"] == item_id:
            now = datetime.utcnow().isoformat()
            items[i] = {**item, **data, "id": item_id, "updated_at": now}
            _write_json(MENU_FILE, items)
            return items[i]
    return None


def delete_menu_item(item_id: str) -> bool:
    items = _read_json(MENU_FILE)
    filtered = [i for i in items if i["id"] != item_id]
    if len(filtered) == len(items):
        return False
    _write_json(MENU_FILE, filtered)
    return True


# --- Insights History ---

def get_insights_history(limit: int = 10) -> list[dict]:
    items = _read_json(INSIGHTS_FILE)
    return items[-limit:]


def save_insight(context: dict, result: dict, layer: str = "business") -> dict:
    items = _read_json(INSIGHTS_FILE)
    now = datetime.utcnow().isoformat()
    entry = {
        "id": str(uuid4()),
        "generated_at": now,
        "layer": layer,
        "context": context,
        "result": result,
    }
    items.append(entry)
    _write_json(INSIGHTS_FILE, items)
    return entry


# --- Income Records ---

def get_all_income() -> list[dict]:
    return _read_json(INCOME_FILE)


def add_income(data: dict) -> dict:
    items = _read_json(INCOME_FILE)
    now = datetime.utcnow().isoformat()
    record = {
        "id": str(uuid4()),
        **data,
        "created_at": now,
    }
    items.append(record)
    _write_json(INCOME_FILE, items)
    return record


def delete_income(record_id: str) -> bool:
    items = _read_json(INCOME_FILE)
    filtered = [i for i in items if i["id"] != record_id]
    if len(filtered) == len(items):
        return False
    _write_json(INCOME_FILE, filtered)
    return True


# --- Expense Records ---

def get_all_expenses() -> list[dict]:
    return _read_json(EXPENSE_FILE)


def add_expense(data: dict) -> dict:
    items = _read_json(EXPENSE_FILE)
    now = datetime.utcnow().isoformat()
    record = {
        "id": str(uuid4()),
        **data,
        "created_at": now,
    }
    items.append(record)
    _write_json(EXPENSE_FILE, items)
    return record


def delete_expense(record_id: str) -> bool:
    items = _read_json(EXPENSE_FILE)
    filtered = [i for i in items if i["id"] != record_id]
    if len(filtered) == len(items):
        return False
    _write_json(EXPENSE_FILE, filtered)
    return True


# --- Debts ---

def get_all_debts() -> list[dict]:
    return _read_json(DEBTS_FILE)


def add_debt(data: dict) -> dict:
    items = _read_json(DEBTS_FILE)
    now = datetime.utcnow().isoformat()
    record = {
        "id": str(uuid4()),
        **data,
        "created_at": now,
        "updated_at": now,
    }
    items.append(record)
    _write_json(DEBTS_FILE, items)
    return record


def update_debt(debt_id: str, data: dict) -> dict | None:
    items = _read_json(DEBTS_FILE)
    for i, item in enumerate(items):
        if item["id"] == debt_id:
            now = datetime.utcnow().isoformat()
            items[i] = {**item, **data, "id": debt_id, "updated_at": now}
            _write_json(DEBTS_FILE, items)
            return items[i]
    return None


def delete_debt(debt_id: str) -> bool:
    items = _read_json(DEBTS_FILE)
    filtered = [i for i in items if i["id"] != debt_id]
    if len(filtered) == len(items):
        return False
    _write_json(DEBTS_FILE, filtered)
    return True


# --- Savings Goals ---

def get_all_goals() -> list[dict]:
    return _read_json(GOALS_FILE)


def add_goal(data: dict) -> dict:
    items = _read_json(GOALS_FILE)
    now = datetime.utcnow().isoformat()
    record = {
        "id": str(uuid4()),
        **data,
        "created_at": now,
    }
    items.append(record)
    _write_json(GOALS_FILE, items)
    return record


def update_goal(goal_id: str, data: dict) -> dict | None:
    items = _read_json(GOALS_FILE)
    for i, item in enumerate(items):
        if item["id"] == goal_id:
            items[i] = {**item, **data, "id": goal_id}
            _write_json(GOALS_FILE, items)
            return items[i]
    return None


def delete_goal(goal_id: str) -> bool:
    items = _read_json(GOALS_FILE)
    filtered = [i for i in items if i["id"] != goal_id]
    if len(filtered) == len(items):
        return False
    _write_json(GOALS_FILE, filtered)
    return True


# --- Financial Health Score ---

def calculate_financial_health_score() -> dict:
    income = get_all_income()
    expenses = get_all_expenses()
    debts = get_all_debts()
    goals = get_all_goals()

    total_income = sum(r.get("amount", 0) for r in income)
    total_expenses = sum(r.get("amount", 0) for r in expenses)
    total_debt = sum(d.get("total_owed", 0) for d in debts)
    monthly_debt_payments = sum(d.get("monthly_payment", 0) for d in debts)
    total_savings = sum(g.get("current_amount", 0) for g in goals)
    needs_spending = sum(r.get("amount", 0) for r in expenses if r.get("needs_wants") == "needs")
    wants_spending = sum(r.get("amount", 0) for r in expenses if r.get("needs_wants") == "wants")

    # Factor 1: Income stability (20%) - simplified: higher income = more stable
    income_stability = min(100, (total_income / 2000) * 100) if total_income > 0 else 0

    # Factor 2: Debt burden (25%) - debt-to-income ratio
    if total_income > 0:
        debt_ratio = monthly_debt_payments / total_income
        debt_score = max(0, 100 - (debt_ratio * 200))
    else:
        debt_score = 0

    # Factor 3: Savings buffer (25%) - days covered
    daily_expenses = total_expenses / 30 if total_expenses > 0 else 70
    days_covered = total_savings / daily_expenses if daily_expenses > 0 else 0
    savings_score = min(100, (days_covered / 30) * 100)

    # Factor 4: Expense discipline (15%) - needs vs wants
    if total_expenses > 0:
        needs_ratio = needs_spending / total_expenses
        discipline_score = min(100, needs_ratio * 120)
    else:
        discipline_score = 50

    # Factor 5: Surplus trend (15%) - surplus as % of income
    if total_income > 0:
        surplus = total_income - total_expenses
        surplus_score = max(0, min(100, 50 + (surplus / total_income) * 200))
    else:
        surplus_score = 0

    overall = (
        income_stability * 0.20
        + debt_score * 0.25
        + savings_score * 0.25
        + discipline_score * 0.15
        + surplus_score * 0.15
    )
    overall = round(max(0, min(100, overall)))

    # Identify what's dragging the score down
    factors = {
        "income_stability": round(income_stability, 1),
        "debt_burden": round(debt_score, 1),
        "savings_buffer": round(savings_score, 1),
        "expense_discipline": round(discipline_score, 1),
        "surplus_trend": round(surplus_score, 1),
    }
    weakest = min(factors, key=factors.get)
    drag_messages = {
        "income_stability": "Your income is low or unstable. Consider finding additional income sources.",
        "debt_burden": f"Your debt payments take up {round(monthly_debt_payments/total_income*100, 0) if total_income > 0 else 0}% of your income.",
        "savings_buffer": f"You have RM{total_savings:.0f} saved — only {days_covered:.0f} days of expenses covered.",
        "expense_discipline": f"Your wants spending is {wants_spending:.0f} RM out of {total_expenses:.0f} RM total.",
        "surplus_trend": f"You're spending RM{abs(total_income - total_expenses):.0f} more than you earn." if total_expenses > total_income else "Your surplus is thin.",
    }

    return {
        "score": overall,
        "factors": factors,
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "surplus_deficit": round(total_income - total_expenses, 2),
        "total_debt": round(total_debt, 2),
        "monthly_debt_payments": round(monthly_debt_payments, 2),
        "total_savings": round(total_savings, 2),
        "days_covered": round(days_covered, 1),
        "dragging_down": drag_messages.get(weakest, ""),
    }


# --- Clear all finance data (for demo reload) ---

def clear_finance_data():
    _write_json(INCOME_FILE, [])
    _write_json(EXPENSE_FILE, [])
    _write_json(DEBTS_FILE, [])
    _write_json(GOALS_FILE, [])


def clear_all_data():
    _write_json(MENU_FILE, [])
    _write_json(INSIGHTS_FILE, [])
    _write_json(INCOME_FILE, [])
    _write_json(EXPENSE_FILE, [])
    _write_json(DEBTS_FILE, [])
    _write_json(GOALS_FILE, [])
    _write_json(STRATEGIES_FILE, [])


# --- Strategies / Advice ---

def get_all_strategies(layer: str | None = None) -> list[dict]:
    items = _read_json(STRATEGIES_FILE)
    if layer:
        items = [s for s in items if s.get("layer") == layer]
    return items


def get_strategy(strategy_id: str) -> dict | None:
    items = _read_json(STRATEGIES_FILE)
    for s in items:
        if s["id"] == strategy_id:
            return s
    return None


def add_strategy(data: dict) -> dict:
    items = _read_json(STRATEGIES_FILE)
    now = datetime.utcnow().isoformat()
    record = {
        "id": str(uuid4()),
        **data,
        "created_at": now,
    }
    items.append(record)
    _write_json(STRATEGIES_FILE, items)
    return record


def delete_strategy(strategy_id: str) -> bool:
    items = _read_json(STRATEGIES_FILE)
    filtered = [s for s in items if s["id"] != strategy_id]
    if len(filtered) == len(items):
        return False
    _write_json(STRATEGIES_FILE, filtered)
    return True
