import json
import os
import anthropic
from dotenv import load_dotenv

from . import data

load_dotenv()

_api_key = os.getenv("GLM_API_KEY", "placeholder")
_base_url = os.getenv("GLM_BASE_URL", "https://api.ilmu.ai/anthropic")

client = anthropic.Anthropic(api_key=_api_key, base_url=_base_url)

MAX_ITERATIONS = 8
MODEL = "ilmu-glm-5.1"

SYSTEM_PROMPT = """You are an expert business pricing consultant agent for Malaysian SME food stalls. Your job is to help stall owners like Auntie Siti make smarter pricing decisions.

You have access to tools that let you investigate the business situation. Use them to gather data before making recommendations. Reason step by step:

1. First, understand the full menu and cost structure
2. Identify underpriced items and risk areas
3. Compare prices against competitors
4. Consider seasonal context and the owner's business goal
5. Only then, produce your final recommendations

When you are done investigating, output your final analysis as a JSON object with this exact structure:
{
  "health_summary": "2-3 sentence plain language summary",
  "item_recommendations": [
    {
      "name": "item name",
      "current_price": 0.00,
      "recommended_price": 0.00,
      "direction": "raise|lower|maintain",
      "reason": "1-2 sentence explanation in simple English",
      "monthly_impact_rm": 0.00
    }
  ],
  "strategic_insight": "one strategic recommendation",
  "risk_flags": ["list of risk warnings if any"],
  "impact_summary": {
    "total_revenue_change_rm": 0.00,
    "margin_improvement_pp": 0.00
  }
}

All explanations must be in simple plain English that a non-technical stall owner can understand. No business jargon. All prices in RM with 2 decimal places.

IMPORTANT: After producing your final analysis, use the save_strategy tool to save your strategic insight and any key pricing strategies to the user's advice library with layer="business". This ensures the user can refer back to your advice later."""

TOOL_DEFINITIONS = [
    {
        "name": "get_menu_items",
        "description": "Fetch all menu items with their pricing, cost, and volume data. Optionally filter by category.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "description": "Filter by category: Food, Drinks, or Snacks",
                    "enum": ["Food", "Drinks", "Snacks"],
                }
            },
            "required": [],
        },
    },
    {
        "name": "calculate_margin",
        "description": "Calculate margin % and profit per unit for a given menu item.",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_name": {
                    "type": "string",
                    "description": "Name of the menu item",
                }
            },
            "required": ["item_name"],
        },
    },
    {
        "name": "compare_to_competitors",
        "description": "Compare an item's price against competitor price range and assess competitiveness.",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_name": {
                    "type": "string",
                    "description": "Name of the menu item",
                }
            },
            "required": ["item_name"],
        },
    },
    {
        "name": "get_insights_history",
        "description": "Retrieve past AI analysis results to identify recurring issues or trends.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Number of past insights to retrieve",
                }
            },
            "required": [],
        },
    },
    {
        "name": "flag_risks",
        "description": "Identify items below cost or with dangerously low margins.",
        "input_schema": {
            "type": "object",
            "properties": {
                "threshold": {
                    "type": "number",
                    "description": "Margin % threshold below which items are flagged as risky (default 10)",
                }
            },
            "required": [],
        },
    },
    {
        "name": "calculate_impact",
        "description": "Project revenue and margin impact of a price change for a specific item.",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_name": {
                    "type": "string",
                    "description": "Name of the menu item",
                },
                "new_price": {
                    "type": "number",
                    "description": "Proposed new selling price in RM",
                },
                "volume_change_pct": {
                    "type": "number",
                    "description": "Expected sales volume change in percentage",
                },
            },
            "required": ["item_name", "new_price", "volume_change_pct"],
        },
    },
    {
        "name": "get_seasonal_context",
        "description": "Return pricing guidance and demand patterns for a Malaysian season or event.",
        "input_schema": {
            "type": "object",
            "properties": {
                "season": {
                    "type": "string",
                    "description": "The season or event",
                    "enum": [
                        "Ramadan",
                        "Hari Raya",
                        "Chinese New Year",
                        "School Holidays",
                        "Monsoon Season",
                        "Regular Period",
                    ],
                }
            },
            "required": ["season"],
        },
    },
    {
        "name": "update_item_price",
        "description": "Update the selling price of a menu item. Use this when the user asks to change or set a price.",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_name": {
                    "type": "string",
                    "description": "Name of the menu item to update",
                },
                "new_price": {
                    "type": "number",
                    "description": "New selling price in RM",
                },
            },
            "required": ["item_name", "new_price"],
        },
    },
    {
        "name": "add_menu_item",
        "description": "Add a new item to the menu. Use this when the user wants to add a new product.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Item name",
                },
                "category": {
                    "type": "string",
                    "description": "Category: Food, Drinks, or Snacks",
                    "enum": ["Food", "Drinks", "Snacks"],
                },
                "cost_per_unit": {
                    "type": "number",
                    "description": "Cost to make per unit in RM",
                },
                "current_price": {
                    "type": "number",
                    "description": "Selling price in RM",
                },
                "monthly_volume": {
                    "type": "integer",
                    "description": "Estimated monthly sales volume",
                },
                "competitor_price_low": {
                    "type": "number",
                    "description": "Lowest competitor price seen in RM",
                },
                "competitor_price_high": {
                    "type": "number",
                    "description": "Highest competitor price seen in RM",
                },
            },
            "required": ["name", "category", "cost_per_unit", "current_price", "monthly_volume"],
        },
    },
    {
        "name": "remove_menu_item",
        "description": "Remove an item from the menu. Use this when the user wants to delete a product.",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_name": {
                    "type": "string",
                    "description": "Name of the menu item to remove",
                },
            },
            "required": ["item_name"],
        },
    },
    {
        "name": "update_item_cost",
        "description": "Update the cost per unit of a menu item. Use this when ingredient costs change.",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_name": {
                    "type": "string",
                    "description": "Name of the menu item to update",
                },
                "new_cost": {
                    "type": "number",
                    "description": "New cost per unit in RM",
                },
            },
            "required": ["item_name", "new_cost"],
        },
    },
]

FINANCE_TOOL_DEFINITIONS = [
    {
        "name": "get_income_summary",
        "description": "Fetch all income sources and totals for a given period. Helps understand income patterns and stability.",
        "input_schema": {
            "type": "object",
            "properties": {
                "period": {
                    "type": "string",
                    "description": "Time period: 'week' or 'month'",
                    "enum": ["week", "month"],
                }
            },
            "required": [],
        },
    },
    {
        "name": "get_expense_summary",
        "description": "Fetch expenses by category for a given period. Shows where money is going and what can be cut.",
        "input_schema": {
            "type": "object",
            "properties": {
                "period": {
                    "type": "string",
                    "description": "Time period: 'week' or 'month'",
                    "enum": ["week", "month"],
                },
                "category": {
                    "type": "string",
                    "description": "Filter by expense category",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_debt_overview",
        "description": "Fetch all debts with balances, payments, and interest rates. Essential for debt planning.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "calculate_savings_capacity",
        "description": "Analyse income vs expenses to determine how much can be saved per month.",
        "input_schema": {
            "type": "object",
            "properties": {
                "period": {
                    "type": "string",
                    "description": "Time period: 'week' or 'month'",
                    "enum": ["week", "month"],
                }
            },
            "required": [],
        },
    },
    {
        "name": "flag_spending_risks",
        "description": "Identify expense categories where spending is unusually high or growing compared to income.",
        "input_schema": {
            "type": "object",
            "properties": {
                "threshold": {
                    "type": "number",
                    "description": "Percentage of income above which a category is flagged as risky (default 30)",
                }
            },
            "required": [],
        },
    },
    {
        "name": "get_goals_progress",
        "description": "Check progress on all savings goals. Shows how close each goal is to completion.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "calculate_debt_payoff",
        "description": "Project payoff timeline and total interest for a specific debt, with optional extra payments.",
        "input_schema": {
            "type": "object",
            "properties": {
                "debt_id": {
                    "type": "string",
                    "description": "ID of the debt to calculate payoff for",
                },
                "extra_payment": {
                    "type": "number",
                    "description": "Extra monthly payment in RM (default 0)",
                },
            },
            "required": ["debt_id"],
        },
    },
    {
        "name": "get_financial_health_score",
        "description": "Calculate and explain the current financial health score with breakdown of all factors.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "save_strategy",
        "description": "Save a strategy or piece of advice to the user's advice library. Use this when you give a recommendation that the user should keep and refer back to later — e.g. a debt payoff plan, a savings tip, a budgeting strategy.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Short title for the advice (e.g. 'Debt Snowball Plan', 'Weekly Budget Rule')",
                },
                "content": {
                    "type": "string",
                    "description": "The full advice or strategy in plain English",
                },
                "layer": {
                    "type": "string",
                    "description": "Which layer: 'finance' or 'business'",
                    "enum": ["business", "finance"],
                },
            },
            "required": ["title", "content", "layer"],
        },
    },
]

CHAT_FINANCE_TOOLS = [
    {
        "name": "add_income",
        "description": "Add a new income source. Use when the user tells you about a new job, side income, or any money coming in.",
        "input_schema": {
            "type": "object",
            "properties": {
                "source": {
                    "type": "string",
                    "description": "Description of the income source (e.g. 'Part-time job', 'Weekend stall')",
                },
                "type": {
                    "type": "string",
                    "description": "Income type",
                    "enum": ["fixed", "variable"],
                },
                "amount": {
                    "type": "number",
                    "description": "Monthly amount in RM",
                },
                "date": {
                    "type": "string",
                    "description": "Date of the income record (YYYY-MM-DD format). Use today's date if not specified.",
                },
            },
            "required": ["source", "type", "amount", "date"],
        },
    },
    {
        "name": "delete_income",
        "description": "Remove an income source. Use when the user says a job ended or an income source is no longer active.",
        "input_schema": {
            "type": "object",
            "properties": {
                "source": {
                    "type": "string",
                    "description": "Name/description of the income source to remove",
                },
            },
            "required": ["source"],
        },
    },
    {
        "name": "add_expense",
        "description": "Add a new expense record. Use when the user tells you about a bill, purchase, or regular spending.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "description": "Expense category",
                    "enum": ["Rent & Utilities", "Food & Groceries", "Transport", "Children's Needs", "Debt Repayment", "Healthcare", "Others"],
                },
                "description": {
                    "type": "string",
                    "description": "What the expense is for (e.g. 'Electricity bill', 'School fees')",
                },
                "amount": {
                    "type": "number",
                    "description": "Amount in RM",
                },
                "needs_wants": {
                    "type": "string",
                    "description": "Whether this is a need or a want",
                    "enum": ["needs", "wants"],
                },
                "date": {
                    "type": "string",
                    "description": "Date of the expense (YYYY-MM-DD format). Use today's date if not specified.",
                },
            },
            "required": ["category", "description", "amount", "needs_wants", "date"],
        },
    },
    {
        "name": "delete_expense",
        "description": "Remove an expense record. Use when the user says an expense was entered incorrectly or is no longer relevant.",
        "input_schema": {
            "type": "object",
            "properties": {
                "description": {
                    "type": "string",
                    "description": "Description of the expense to remove",
                },
            },
            "required": ["description"],
        },
    },
    {
        "name": "add_debt",
        "description": "Add a new debt record. Use when the user tells you about a loan, credit card balance, or money owed to someone.",
        "input_schema": {
            "type": "object",
            "properties": {
                "creditor": {
                    "type": "string",
                    "description": "Who the debt is owed to (e.g. 'Maybank credit card', 'Sister')",
                },
                "type": {
                    "type": "string",
                    "description": "Type of debt",
                    "enum": ["formal", "credit_card", "informal", "bnpl", "family"],
                },
                "total_owed": {
                    "type": "number",
                    "description": "Total amount owed in RM",
                },
                "monthly_payment": {
                    "type": "number",
                    "description": "Monthly payment amount in RM",
                },
                "interest_rate": {
                    "type": "number",
                    "description": "Annual interest rate in %. Use 0 for family loans or BNPL with no interest.",
                },
            },
            "required": ["creditor", "type", "total_owed", "monthly_payment"],
        },
    },
    {
        "name": "delete_debt",
        "description": "Remove a debt record. Use when the user says they've paid off a debt or it was entered incorrectly.",
        "input_schema": {
            "type": "object",
            "properties": {
                "creditor": {
                    "type": "string",
                    "description": "Name of the creditor whose debt to remove",
                },
            },
            "required": ["creditor"],
        },
    },
    {
        "name": "update_menu_item",
        "description": "Edit an existing menu item's details — name, category, cost, price, volume, or competitor prices. Use when the user wants to change any menu item field beyond just price or cost.",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_name": {
                    "type": "string",
                    "description": "Current name of the menu item to update",
                },
                "new_name": {
                    "type": "string",
                    "description": "New name for the item (leave empty to keep current name)",
                },
                "category": {
                    "type": "string",
                    "description": "New category: Food, Drinks, or Snacks",
                    "enum": ["Food", "Drinks", "Snacks"],
                },
                "cost_per_unit": {
                    "type": "number",
                    "description": "New cost per unit in RM",
                },
                "current_price": {
                    "type": "number",
                    "description": "New selling price in RM",
                },
                "monthly_volume": {
                    "type": "integer",
                    "description": "New estimated monthly sales volume",
                },
                "competitor_price_low": {
                    "type": "number",
                    "description": "New lowest competitor price in RM",
                },
                "competitor_price_high": {
                    "type": "number",
                    "description": "New highest competitor price in RM",
                },
            },
            "required": ["item_name"],
        },
    },
]

CHAT_TOOL_DEFINITIONS = TOOL_DEFINITIONS + FINANCE_TOOL_DEFINITIONS + CHAT_FINANCE_TOOLS

BRIDGE_TOOL_DEFINITIONS = TOOL_DEFINITIONS + FINANCE_TOOL_DEFINITIONS + [
    {
        "name": "get_full_financial_picture",
        "description": "Get a combined view of income, expenses, debts, savings, AND business revenue. The holistic view.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "calculate_business_income_gap",
        "description": "Compare business income potential against the financial shortfall. Shows if the business can close the gap.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "recommend_business_action",
        "description": "Suggest a specific business action that addresses a financial need. Connects business opportunities to personal financial gaps.",
        "input_schema": {
            "type": "object",
            "properties": {
                "financial_need": {
                    "type": "string",
                    "description": "The financial need to address (e.g. 'cover RM300 monthly shortfall' or 'pay off debt faster')",
                },
            },
            "required": ["financial_need"],
        },
    },
    {
        "name": "save_strategy",
        "description": "Save a strategy or piece of advice to the user's advice library. Use this when you give a recommendation that the user should keep and refer back to later — e.g. a pricing strategy, a debt payoff plan, a savings tip, a seasonal business tactic. Provide a short title and the full advice content.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Short title for the advice (e.g. 'Ramadan Pricing Strategy', 'Debt Snowball Plan')",
                },
                "content": {
                    "type": "string",
                    "description": "The full advice or strategy in plain English",
                },
                "layer": {
                    "type": "string",
                    "description": "Which layer this advice belongs to: 'business' or 'finance'",
                    "enum": ["business", "finance"],
                },
            },
            "required": ["title", "content", "layer"],
        },
    },
]

SEASONAL_CONTEXT = {
    "Ramadan": {
        "trend": "Demand for food stalls increases significantly during Ramadan, especially for buka puasa meals.",
        "price_sensitivity": "Moderate — customers expect slight price increases but will avoid overpriced stalls.",
        "recommendation": "Consider bundling items into set meals. Slight price increases (5-10%) are generally accepted.",
    },
    "Hari Raya": {
        "trend": "High demand for celebration foods. Customers are less price-sensitive during festive periods.",
        "price_sensitivity": "Low — festive spending is higher.",
        "recommendation": "Introduce premium festive items. Price increases of 10-15% are well tolerated.",
    },
    "Chinese New Year": {
        "trend": "Mixed demand — some stalls close, others see increased traffic from open-air markets.",
        "price_sensitivity": "Moderate to low — customers accept festive pricing.",
        "recommendation": "Offer prosperity-themed items at premium prices. Keep staple items stable.",
    },
    "School Holidays": {
        "trend": "Increased family dining out. Higher foot traffic in food courts and stalls.",
        "price_sensitivity": "Moderate — families are budget-conscious but volume is higher.",
        "recommendation": "Focus on volume strategies — family bundles and combo meals.",
    },
    "Monsoon Season": {
        "trend": "Lower foot traffic due to rain. Ingredient costs may rise due to supply chain disruption.",
        "price_sensitivity": "High — fewer customers means each one matters more.",
        "recommendation": "Maintain prices but focus on retention. Avoid price hikes that drive away the few customers who show up.",
    },
    "Regular Period": {
        "trend": "Normal business operations. Standard demand patterns.",
        "price_sensitivity": "High — customers compare prices across stalls.",
        "recommendation": "Price competitively. Focus on margin optimization through cost control rather than price increases.",
    },
}


def execute_tool(name: str, arguments: dict) -> dict:
    args = arguments if isinstance(arguments, dict) else json.loads(arguments)
    menu_items = data.get_all_menu_items()

    if name == "get_menu_items":
        category = args.get("category")
        if category:
            filtered = [i for i in menu_items if i["category"] == category]
        else:
            filtered = menu_items
        return {"items": filtered}

    elif name == "calculate_margin":
        item_name = args["item_name"]
        for item in menu_items:
            if item["name"].lower() == item_name.lower():
                margin_pct = ((item["current_price"] - item["cost_per_unit"]) / item["current_price"]) * 100
                profit_per_unit = item["current_price"] - item["cost_per_unit"]
                monthly_profit = profit_per_unit * item["monthly_volume"]
                return {
                    "name": item["name"],
                    "cost_per_unit": item["cost_per_unit"],
                    "current_price": item["current_price"],
                    "margin_pct": round(margin_pct, 2),
                    "profit_per_unit": round(profit_per_unit, 2),
                    "monthly_profit": round(monthly_profit, 2),
                }
        return {"error": f"Item '{item_name}' not found"}

    elif name == "compare_to_competitors":
        item_name = args["item_name"]
        for item in menu_items:
            if item["name"].lower() == item_name.lower():
                low = item["competitor_price_low"]
                high = item["competitor_price_high"]
                mid = (low + high) / 2
                price = item["current_price"]
                position = (
                    "below market" if price < low
                    else "at lower end" if price < mid
                    else "at mid range" if price <= mid + 0.5
                    else "at higher end" if price < high
                    else "above market"
                )
                return {
                    "name": item["name"],
                    "current_price": price,
                    "competitor_low": low,
                    "competitor_high": high,
                    "competitor_midpoint": round(mid, 2),
                    "market_position": position,
                }
        return {"error": f"Item '{item_name}' not found"}

    elif name == "get_insights_history":
        limit = args.get("limit", 5)
        history = data.get_insights_history(limit)
        return {"insights": history}

    elif name == "flag_risks":
        threshold = args.get("threshold", 10)
        risks = []
        for item in menu_items:
            margin_pct = ((item["current_price"] - item["cost_per_unit"]) / item["current_price"]) * 100
            if margin_pct < threshold:
                risks.append({
                    "name": item["name"],
                    "current_price": item["current_price"],
                    "cost_per_unit": item["cost_per_unit"],
                    "margin_pct": round(margin_pct, 2),
                    "risk_level": "critical" if margin_pct <= 0 else "warning",
                })
        return {"risks": risks}

    elif name == "calculate_impact":
        item_name = args["item_name"]
        new_price = args["new_price"]
        volume_change_pct = args["volume_change_pct"]
        for item in menu_items:
            if item["name"].lower() == item_name.lower():
                current_revenue = item["current_price"] * item["monthly_volume"]
                current_profit = (item["current_price"] - item["cost_per_unit"]) * item["monthly_volume"]
                new_volume = int(item["monthly_volume"] * (1 + volume_change_pct / 100))
                new_revenue = new_price * new_volume
                new_profit = (new_price - item["cost_per_unit"]) * new_volume
                new_margin = ((new_price - item["cost_per_unit"]) / new_price) * 100 if new_price > 0 else 0
                return {
                    "name": item["name"],
                    "current_revenue": round(current_revenue, 2),
                    "current_profit": round(current_profit, 2),
                    "new_revenue": round(new_revenue, 2),
                    "new_profit": round(new_profit, 2),
                    "revenue_change": round(new_revenue - current_revenue, 2),
                    "profit_change": round(new_profit - current_profit, 2),
                    "new_margin_pct": round(new_margin, 2),
                }
        return {"error": f"Item '{item_name}' not found"}

    elif name == "get_seasonal_context":
        season = args["season"]
        return SEASONAL_CONTEXT.get(season, SEASONAL_CONTEXT["Regular Period"])

    elif name == "update_item_price":
        item_name = args["item_name"]
        new_price = args["new_price"]
        for item in menu_items:
            if item["name"].lower() == item_name.lower():
                old_price = item["current_price"]
                updated = data.update_menu_item(item["id"], {"current_price": new_price})
                if updated:
                    new_margin = ((new_price - item["cost_per_unit"]) / new_price) * 100
                    return {
                        "success": True,
                        "name": item["name"],
                        "old_price": old_price,
                        "new_price": new_price,
                        "new_margin_pct": round(new_margin, 2),
                        "message": f"Updated {item['name']} price from RM{old_price:.2f} to RM{new_price:.2f}",
                    }
                return {"error": "Failed to update item"}
        return {"error": f"Item '{item_name}' not found"}

    elif name == "add_menu_item":
        item = data.add_menu_item({
            "name": args["name"],
            "category": args["category"],
            "cost_per_unit": args["cost_per_unit"],
            "current_price": args["current_price"],
            "monthly_volume": args["monthly_volume"],
            "competitor_price_low": args.get("competitor_price_low", 0),
            "competitor_price_high": args.get("competitor_price_high", 0),
        })
        margin = ((item["current_price"] - item["cost_per_unit"]) / item["current_price"]) * 100
        return {
            "success": True,
            "name": item["name"],
            "id": item["id"],
            "margin_pct": round(margin, 2),
            "message": f"Added {item['name']} at RM{item['current_price']:.2f}",
        }

    elif name == "remove_menu_item":
        item_name = args["item_name"]
        for item in menu_items:
            if item["name"].lower() == item_name.lower():
                if data.delete_menu_item(item["id"]):
                    return {"success": True, "name": item["name"], "message": f"Removed {item['name']} from menu"}
                return {"error": "Failed to remove item"}
        return {"error": f"Item '{item_name}' not found"}

    elif name == "update_item_cost":
        item_name = args["item_name"]
        new_cost = args["new_cost"]
        for item in menu_items:
            if item["name"].lower() == item_name.lower():
                old_cost = item["cost_per_unit"]
                updated = data.update_menu_item(item["id"], {"cost_per_unit": new_cost})
                if updated:
                    new_margin = ((item["current_price"] - new_cost) / item["current_price"]) * 100
                    return {
                        "success": True,
                        "name": item["name"],
                        "old_cost": old_cost,
                        "new_cost": new_cost,
                        "new_margin_pct": round(new_margin, 2),
                        "message": f"Updated {item['name']} cost from RM{old_cost:.2f} to RM{new_cost:.2f}",
                    }
                return {"error": "Failed to update item"}
        return {"error": f"Item '{item_name}' not found"}

    elif name == "save_strategy":
        title = args.get("title", "Untitled")
        content = args.get("content", "")
        layer = args.get("layer", "business")
        strategy = data.add_strategy({"title": title, "content": content, "layer": layer})
        return {"success": True, "id": strategy["id"], "title": title, "message": f"Strategy saved: {title}"}

    return {"error": f"Unknown tool: {name}"}


def execute_finance_tool(name: str, arguments: dict) -> dict:
    args = arguments if isinstance(arguments, dict) else json.loads(arguments)
    income = data.get_all_income()
    expenses = data.get_all_expenses()
    debts = data.get_all_debts()
    goals = data.get_all_goals()

    if name == "get_income_summary":
        total = sum(r.get("amount", 0) for r in income)
        sources = {}
        for r in income:
            src = r.get("source", "Other")
            sources[src] = sources.get(src, 0) + r.get("amount", 0)
        fixed = sum(r.get("amount", 0) for r in income if r.get("type") == "fixed")
        variable = sum(r.get("amount", 0) for r in income if r.get("type") == "variable")
        return {
            "total_income": round(total, 2),
            "fixed_income": round(fixed, 2),
            "variable_income": round(variable, 2),
            "sources": {k: round(v, 2) for k, v in sources.items()},
            "record_count": len(income),
        }

    elif name == "get_expense_summary":
        category = args.get("category")
        filtered = [r for r in expenses if not category or r.get("category") == category]
        total = sum(r.get("amount", 0) for r in filtered)
        by_category = {}
        for r in filtered:
            cat = r.get("category", "Other")
            by_category[cat] = by_category.get(cat, 0) + r.get("amount", 0)
        needs = sum(r.get("amount", 0) for r in filtered if r.get("needs_wants") == "needs")
        wants = sum(r.get("amount", 0) for r in filtered if r.get("needs_wants") == "wants")
        return {
            "total_expenses": round(total, 2),
            "needs_spending": round(needs, 2),
            "wants_spending": round(wants, 2),
            "by_category": {k: round(v, 2) for k, v in by_category.items()},
            "record_count": len(filtered),
        }

    elif name == "get_debt_overview":
        total_owed = sum(d.get("total_owed", 0) for d in debts)
        monthly_payments = sum(d.get("monthly_payment", 0) for d in debts)
        debt_list = []
        for d in debts:
            debt_list.append({
                "id": d["id"],
                "creditor": d.get("creditor", "Unknown"),
                "type": d.get("type", "other"),
                "total_owed": d.get("total_owed", 0),
                "monthly_payment": d.get("monthly_payment", 0),
                "interest_rate": d.get("interest_rate", 0),
            })
        return {
            "total_owed": round(total_owed, 2),
            "monthly_payments": round(monthly_payments, 2),
            "debt_count": len(debts),
            "debts": debt_list,
        }

    elif name == "calculate_savings_capacity":
        total_income = sum(r.get("amount", 0) for r in income)
        total_expenses = sum(r.get("amount", 0) for r in expenses)
        surplus = total_income - total_expenses
        return {
            "total_income": round(total_income, 2),
            "total_expenses": round(total_expenses, 2),
            "surplus_deficit": round(surplus, 2),
            "can_save": surplus > 0,
            "savings_capacity": round(max(0, surplus), 2),
        }

    elif name == "flag_spending_risks":
        threshold = args.get("threshold", 30)
        total_income = sum(r.get("amount", 0) for r in income)
        by_category = {}
        for r in expenses:
            cat = r.get("category", "Other")
            by_category[cat] = by_category.get(cat, 0) + r.get("amount", 0)
        risks = []
        for cat, amount in by_category.items():
            pct = (amount / total_income * 100) if total_income > 0 else 0
            if pct > threshold:
                risks.append({
                    "category": cat,
                    "amount": round(amount, 2),
                    "pct_of_income": round(pct, 1),
                    "severity": "high" if pct > 50 else "moderate",
                })
        return {"income": round(total_income, 2), "risks": risks}

    elif name == "get_goals_progress":
        goal_list = []
        for g in goals:
            target = g.get("target_amount", 0)
            current = g.get("current_amount", 0)
            pct = (current / target * 100) if target > 0 else 0
            goal_list.append({
                "name": g.get("name", "Unnamed"),
                "target": target,
                "current": current,
                "progress_pct": round(pct, 1),
                "remaining": round(target - current, 2),
            })
        total_savings = sum(g.get("current_amount", 0) for g in goals)
        return {
            "total_savings": round(total_savings, 2),
            "goals": goal_list,
        }

    elif name == "calculate_debt_payoff":
        debt_id = args["debt_id"]
        extra = args.get("extra_payment", 0)
        for d in debts:
            if d["id"] == debt_id:
                owed = d.get("total_owed", 0)
                monthly = d.get("monthly_payment", 0) + extra
                rate = d.get("interest_rate", 0)
                if monthly <= 0:
                    return {"error": "Monthly payment must be positive"}
                monthly_rate = rate / 100 / 12
                if monthly_rate > 0:
                    if monthly <= owed * monthly_rate:
                        return {"error": "Payment too small to cover interest. Debt will grow forever."}
                    months = -1 * (1 - (1 + monthly_rate) ** (-1 * 0)) if owed == 0 else 0
                    import math
                    months = math.log(monthly / (monthly - owed * monthly_rate)) / math.log(1 + monthly_rate)
                else:
                    months = owed / monthly
                months = max(1, math.ceil(months))
                total_paid = monthly * months
                total_interest = total_paid - owed
                return {
                    "creditor": d.get("creditor", "Unknown"),
                    "total_owed": owed,
                    "monthly_payment": monthly,
                    "extra_payment": extra,
                    "months_to_payoff": months,
                    "total_paid": round(total_paid, 2),
                    "total_interest": round(total_interest, 2),
                }
        return {"error": f"Debt '{debt_id}' not found"}

    elif name == "get_financial_health_score":
        return data.calculate_financial_health_score()

    elif name == "save_strategy":
        title = args.get("title", "Untitled")
        content = args.get("content", "")
        layer = args.get("layer", "finance")
        strategy = data.add_strategy({"title": title, "content": content, "layer": layer})
        return {"success": True, "id": strategy["id"], "title": title, "message": f"Strategy saved: {title}"}

    return {"error": f"Unknown tool: {name}"}


def execute_bridge_tool(name: str, arguments: dict) -> dict:
    args = arguments if isinstance(arguments, dict) else json.loads(arguments)

    if name == "get_full_financial_picture":
        income = data.get_all_income()
        expenses = data.get_all_expenses()
        debts = data.get_all_debts()
        goals = data.get_all_goals()
        menu = data.get_all_menu_items()

        total_income = sum(r.get("amount", 0) for r in income)
        total_expenses = sum(r.get("amount", 0) for r in expenses)
        total_debt = sum(d.get("total_owed", 0) for d in debts)
        monthly_debt_payments = sum(d.get("monthly_payment", 0) for d in debts)
        total_savings = sum(g.get("current_amount", 0) for g in goals)
        business_revenue = sum(i["current_price"] * i["monthly_volume"] for i in menu)
        business_cost = sum(i["cost_per_unit"] * i["monthly_volume"] for i in menu)
        business_profit = business_revenue - business_cost

        return {
            "personal_finances": {
                "total_income": round(total_income, 2),
                "total_expenses": round(total_expenses, 2),
                "surplus_deficit": round(total_income - total_expenses, 2),
                "total_debt": round(total_debt, 2),
                "monthly_debt_payments": round(monthly_debt_payments, 2),
                "total_savings": round(total_savings, 2),
            },
            "business": {
                "monthly_revenue": round(business_revenue, 2),
                "monthly_cost": round(business_cost, 2),
                "monthly_profit": round(business_profit, 2),
                "item_count": len(menu),
            },
        }

    elif name == "calculate_business_income_gap":
        income = data.get_all_income()
        expenses = data.get_all_expenses()
        menu = data.get_all_menu_items()

        total_income = sum(r.get("amount", 0) for r in income)
        total_expenses = sum(r.get("amount", 0) for r in expenses)
        financial_gap = total_expenses - total_income

        business_revenue = sum(i["current_price"] * i["monthly_volume"] for i in menu)
        business_cost = sum(i["cost_per_unit"] * i["monthly_volume"] for i in menu)
        business_profit = business_revenue - business_cost

        return {
            "financial_gap": round(financial_gap, 2),
            "has_shortfall": financial_gap > 0,
            "business_profit": round(business_profit, 2),
            "gap_covered_by_business": round(business_profit - max(0, financial_gap), 2),
            "business_could_close_gap": business_profit > financial_gap if financial_gap > 0 else True,
        }

    elif name == "recommend_business_action":
        financial_need = args.get("financial_need", "")
        menu = data.get_all_menu_items()
        income = data.get_all_income()
        expenses = data.get_all_expenses()

        total_income = sum(r.get("amount", 0) for r in income)
        total_expenses = sum(r.get("amount", 0) for r in expenses)
        gap = total_expenses - total_income

        # Find underpriced items as business opportunity
        underpriced = []
        for item in menu:
            margin_pct = ((item["current_price"] - item["cost_per_unit"]) / item["current_price"]) * 100 if item["current_price"] > 0 else -100
            if margin_pct < 15:
                potential_price = item["cost_per_unit"] / 0.7  # Target 30% margin
                extra_per_unit = potential_price - item["current_price"]
                monthly_impact = extra_per_unit * item["monthly_volume"]
                underpriced.append({
                    "name": item["name"],
                    "current_price": item["current_price"],
                    "suggested_price": round(potential_price, 2),
                    "monthly_impact": round(monthly_impact, 2),
                })

        return {
            "financial_need": financial_need,
            "financial_gap": round(gap, 2),
            "underpriced_items": underpriced,
            "total_potential_monthly_gain": round(sum(u["monthly_impact"] for u in underpriced), 2),
        }

    # Fall through to business or finance tools
    if name in [t["name"] for t in FINANCE_TOOL_DEFINITIONS]:
        return execute_finance_tool(name, arguments)
    return execute_tool(name, arguments)


def execute_chat_tool(name: str, arguments: dict) -> dict:
    args = arguments if isinstance(arguments, dict) else json.loads(arguments)

    if name == "add_income":
        record = data.add_income({
            "source": args["source"],
            "type": args["type"],
            "amount": args["amount"],
            "date": args["date"],
        })
        return {
            "success": True,
            "id": record["id"],
            "source": record["source"],
            "amount": record["amount"],
            "message": f"Added income: {record['source']} at RM{record['amount']:.2f}/month",
        }

    elif name == "delete_income":
        source = args["source"]
        income_records = data.get_all_income()
        matches = [r for r in income_records if r.get("source", "").lower() == source.lower()]
        if len(matches) == 1:
            if data.delete_income(matches[0]["id"]):
                return {"success": True, "source": matches[0]["source"], "message": f"Removed income source: {matches[0]['source']}"}
        elif len(matches) > 1:
            return {"error": f"Multiple income sources match '{source}'. Please be more specific."}
        return {"error": f"Income source '{source}' not found"}

    elif name == "add_expense":
        record = data.add_expense({
            "category": args["category"],
            "description": args["description"],
            "amount": args["amount"],
            "needs_wants": args["needs_wants"],
            "date": args["date"],
        })
        return {
            "success": True,
            "id": record["id"],
            "category": record["category"],
            "description": record["description"],
            "amount": record["amount"],
            "message": f"Added expense: {record['description']} (RM{record['amount']:.2f})",
        }

    elif name == "delete_expense":
        description = args["description"]
        expense_records = data.get_all_expenses()
        matches = [r for r in expense_records if r.get("description", "").lower() == description.lower()]
        if len(matches) == 1:
            if data.delete_expense(matches[0]["id"]):
                return {"success": True, "description": matches[0]["description"], "message": f"Removed expense: {matches[0]['description']}"}
        elif len(matches) > 1:
            return {"error": f"Multiple expenses match '{description}'. Please be more specific."}
        return {"error": f"Expense '{description}' not found"}

    elif name == "add_debt":
        record = data.add_debt({
            "creditor": args["creditor"],
            "type": args["type"],
            "total_owed": args["total_owed"],
            "monthly_payment": args["monthly_payment"],
            "interest_rate": args.get("interest_rate", 0.0),
        })
        return {
            "success": True,
            "id": record["id"],
            "creditor": record["creditor"],
            "total_owed": record["total_owed"],
            "message": f"Added debt: {record['creditor']} — RM{record['total_owed']:.2f} owed",
        }

    elif name == "delete_debt":
        creditor = args["creditor"]
        debt_records = data.get_all_debts()
        matches = [r for r in debt_records if r.get("creditor", "").lower() == creditor.lower()]
        if len(matches) == 1:
            if data.delete_debt(matches[0]["id"]):
                return {"success": True, "creditor": matches[0]["creditor"], "message": f"Removed debt: {matches[0]['creditor']}"}
        elif len(matches) > 1:
            return {"error": f"Multiple debts match '{creditor}'. Please be more specific."}
        return {"error": f"Debt from '{creditor}' not found"}

    elif name == "update_menu_item":
        item_name = args["item_name"]
        menu_items = data.get_all_menu_items()
        for item in menu_items:
            if item["name"].lower() == item_name.lower():
                update_data = {}
                if args.get("new_name"):
                    update_data["name"] = args["new_name"]
                if args.get("category"):
                    update_data["category"] = args["category"]
                if args.get("cost_per_unit") is not None:
                    update_data["cost_per_unit"] = args["cost_per_unit"]
                if args.get("current_price") is not None:
                    update_data["current_price"] = args["current_price"]
                if args.get("monthly_volume") is not None:
                    update_data["monthly_volume"] = args["monthly_volume"]
                if args.get("competitor_price_low") is not None:
                    update_data["competitor_price_low"] = args["competitor_price_low"]
                if args.get("competitor_price_high") is not None:
                    update_data["competitor_price_high"] = args["competitor_price_high"]
                if not update_data:
                    return {"error": "No fields to update were provided"}
                updated = data.update_menu_item(item["id"], update_data)
                if updated:
                    changes = ", ".join(f"{k}: {v}" for k, v in update_data.items())
                    return {
                        "success": True,
                        "name": updated["name"],
                        "changes": changes,
                        "message": f"Updated {item['name']}: {changes}",
                    }
                return {"error": "Failed to update item"}
        return {"error": f"Item '{item_name}' not found"}

    # Fall through to existing executors
    if name in [t["name"] for t in FINANCE_TOOL_DEFINITIONS]:
        return execute_finance_tool(name, arguments)
    return execute_tool(name, arguments)


def build_user_prompt(menu_items: list[dict], context: dict) -> str:
    season = context.get("season", "Regular Period")
    ingredient_change = context.get("ingredient_change", "No change")
    business_goal = context.get("business_goal", "Maintain stability")

    items_desc = "\n".join(
        f"- {i['name']} ({i['category']}): Cost RM{i['cost_per_unit']:.2f}, "
        f"Price RM{i['current_price']:.2f}, Volume {i['monthly_volume']}/month, "
        f"Competitors RM{i['competitor_price_low']:.2f}–RM{i['competitor_price_high']:.2f}"
        for i in menu_items
    )

    return f"""A Malaysian food stall owner needs your pricing analysis.

Their current menu:
{items_desc}

Context:
- Season/Event: {season}
- Ingredient cost change: {ingredient_change}
- Business goal: {business_goal}

Please investigate their situation using the available tools, then provide your final analysis as structured JSON."""


def run_agent(menu_items: list[dict], context: dict) -> dict:
    messages = [
        {"role": "user", "content": build_user_prompt(menu_items, context)},
    ]

    for _ in range(MAX_ITERATIONS):
        response = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=messages,
            tools=TOOL_DEFINITIONS,
        )

        # Check stop reason
        if response.stop_reason == "end_turn" or response.stop_reason == "stop":
            # Extract text content
            text = ""
            for block in response.content:
                if block.type == "text":
                    text += block.text
            return _parse_final_output(text)

        # Process tool calls
        # Add assistant response to messages
        messages.append({"role": "assistant", "content": response.content})

        # Execute each tool use block and add results
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = execute_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result),
                })

        messages.append({"role": "user", "content": tool_results})

    return _generate_fallback_summary(messages)


def _parse_final_output(content: str) -> dict:
    if not content:
        return _empty_result()
    try:
        start = content.index("{")
        end = content.rindex("}") + 1
        return json.loads(content[start:end])
    except (ValueError, json.JSONDecodeError):
        return _empty_result()


def _empty_result() -> dict:
    return {
        "health_summary": "Unable to generate analysis. Please try again.",
        "item_recommendations": [],
        "strategic_insight": "",
        "risk_flags": [],
        "impact_summary": {"total_revenue_change_rm": 0, "margin_improvement_pp": 0},
    }


def _generate_fallback_summary(messages: list) -> dict:
    for msg in reversed(messages):
        if msg.get("role") == "assistant":
            content = msg.get("content", "")
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        parsed = _parse_final_output(block.get("text", ""))
                        if parsed != _empty_result():
                            return parsed
            elif isinstance(content, str):
                parsed = _parse_final_output(content)
                if parsed != _empty_result():
                    return parsed
    return _empty_result()


def run_simulation_agent(sim_data: dict) -> dict:
    prompt = f"""A stall owner is exploring a pricing scenario:

Item: {sim_data['item_name']}
Current price: RM{sim_data['current_price']:.2f}
Proposed new price: RM{sim_data['new_price']:.2f}
Cost per unit: RM{sim_data['cost_per_unit']:.2f}
Current monthly volume: {sim_data['monthly_volume']}
Expected volume change: {sim_data['volume_change_pct']}%

Please use the available tools to compare this scenario against their current data and historical insights, then provide a brief 2-3 sentence interpretation and recommendation in simple English."""

    context = sim_data.get("context", {})
    if context:
        prompt += f"\n\nAdditional context: Season={context.get('season', 'N/A')}, Goal={context.get('business_goal', 'N/A')}"

    messages = [
        {"role": "user", "content": prompt},
    ]

    for _ in range(MAX_ITERATIONS):
        response = client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=messages,
            tools=TOOL_DEFINITIONS,
        )

        if response.stop_reason == "end_turn" or response.stop_reason == "stop":
            text = ""
            for block in response.content:
                if block.type == "text":
                    text += block.text
            return {"interpretation": text}

        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = execute_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result),
                })

        messages.append({"role": "user", "content": tool_results})

    return {"interpretation": "Unable to complete analysis. Please try again."}


FINANCE_SYSTEM_PROMPT = """You are an expert financial advisor agent for urban poor Malaysians. Your job is to help people like Auntie Siti manage their finances, deal with debt, build savings, and find pathways to economic empowerment.

You have access to tools that let you investigate the person's full financial situation. Use them to gather data before making recommendations. Reason step by step:

1. First, understand their income sources and patterns
2. Analyse their spending — what's needs vs wants
3. Assess their debt situation and interest burden
4. Check their savings buffer and goals progress
5. Identify the biggest financial risks and opportunities
6. Only then, produce your final recommendations

Be empathetic but honest. These are real people struggling with money. Never suggest risky or speculative actions. Keep advice realistic and conservative.

When you are done investigating, output your final analysis as a JSON object with this exact structure:
{
  "health_summary": "2-3 sentence plain language summary of their financial health",
  "spending_alert": {
    "category": "category with issue",
    "issue": "what's wrong",
    "suggestion": "one concrete action"
  },
  "debt_action_plan": {
    "strategy": "avalanche or snowball",
    "ordered_debts": [{"creditor": "name", "reason": "why this order"}],
    "explanation": "plain language explanation of the strategy"
  },
  "savings_opportunity": {
    "amount_rm": 0.00,
    "source": "where the money would come from",
    "target": "what to do with it"
  },
  "income_boost_suggestion": {
    "gap_rm": 0.00,
    "business_potential_rm": 0.00,
    "next_step": "one concrete next action"
  }
}

All explanations must be in simple plain English. No financial jargon. All amounts in RM with 2 decimal places. Be encouraging, not shaming.

IMPORTANT: After producing your final analysis, use the save_strategy tool to save your debt action plan and any key savings strategies to the user's advice library with layer="finance". This ensures the user can refer back to your advice later."""

BRIDGE_SYSTEM_PROMPT = """You are a holistic economic empowerment advisor for urban poor Malaysians. You see the FULL PICTURE — both their personal finances AND their side business. Your job is to connect the two layers and show how business improvements can solve financial problems.

You have access to tools from BOTH the finance layer and the business layer. You MUST use tools from both sides before producing your final analysis. Reason step by step:

1. First, get their full financial picture (income, expenses, debts, savings)
2. Then, get their business picture (menu items, margins, risks)
3. Identify how the business connects to their financial situation (income gap, debt pressure, savings potential)
4. Find specific cross-layer opportunities (e.g. "raising this item's price by RM0.50 covers your monthly shortfall")
5. Only then, produce your integrated recommendations

The key insight you provide that no single-layer app can: how a business change directly solves a financial problem, or vice versa.

When you are done investigating, output your final analysis as a JSON object with this exact structure:
{
  "full_picture_summary": "2-3 sentence overview connecting personal finance and business health",
  "smart_money_move": {
    "action": "one specific action across either layer",
    "reason": "why this helps",
    "impact_rm": 0.00
  },
  "business_as_escape": {
    "business_potential_rm": 0.00,
    "financial_gap_rm": 0.00,
    "next_step": "one concrete next action to grow the business"
  },
  "cross_layer_risk": "one risk that spans both layers",
  "action_plan": [
    {"step": "what to do", "why": "why it matters", "impact_rm": 0.00}
  ]
}

All explanations in simple plain English. No jargon. All amounts in RM with 2 decimal places. Be practical and specific — vague advice is useless to someone living paycheck to paycheck.

IMPORTANT: After producing your final analysis, use the save_strategy tool to save your action plan and key cross-layer strategies to the user's advice library. Use layer="finance" for financial advice and layer="business" for business advice. This ensures the user can refer back to your advice later."""

CHAT_SYSTEM_PROMPT = """You are PriceSmart AI, a friendly assistant for Malaysian food stall owners and their families. Your name is PriceSmart. You talk to the owner like a helpful neighbour — simple, warm, and practical.

You can do four things:
1. ANSWER questions about their menu, pricing, margins, risks, finances, debts, savings, and seasonal advice
2. TAKE ACTION on their MENU — change prices, update costs, add new items, remove items, or edit any menu item details
3. TAKE ACTION on their FINANCES — add or remove income sources, expenses, and debts
4. SAVE ADVICE — when you give a useful strategy, tip, or plan that the user should remember, save it using the save_strategy tool so they can find it later in their Advice library

When the user asks you to do something, USE YOUR TOOLS to make it happen. Don't just suggest — actually do it. For example:

MENU ACTIONS:
- "Change my nasi lemak price to RM5" → use update_item_price
- "Add a new item called Roti Canai" → use add_menu_item
- "Remove kuih muih from my menu" → use remove_menu_item
- "My flour cost went up, teh tarik now costs RM2 to make" → use update_item_cost
- "Rename Mee Goreng to Mee Goreng Special" → use update_menu_item
- "Update my monthly volume for Nasi Lemak to 500" → use update_menu_item

FINANCE ACTIONS:
- "I got a new part-time job paying RM400 a month" → use add_income
- "My husband stopped working at the factory" → use delete_income
- "I need to add my electricity bill, RM150" → use add_expense
- "Remove the phone credit expense, that was wrong" → use delete_expense
- "I owe my sister RM500" → use add_debt
- "I paid off my credit card debt" → use delete_debt

When you give advice that's worth keeping (pricing strategies, debt plans, savings tips, seasonal tactics), ALWAYS use save_strategy to save it. Set layer to "business" for business advice or "finance" for personal finance advice.

IMPORTANT RULES:
- Before deleting anything, ALWAYS confirm with the user what you're about to remove. Say what you found and ask "Should I go ahead and remove this?"
- When adding finance records, use today's date if the user doesn't specify one
- After taking action, confirm what you did in simple English
- Always check the current data first if you're unsure about details — use get_menu_items, get_income_summary, get_expense_summary, or get_debt_overview
- If the user's request is ambiguous (e.g. "remove the phone expense" when there are multiple matches), ask them to clarify

Keep your responses short and conversational. No jargon. All prices in RM. If you're not sure what the user means, ask briefly."""


def run_chat_agent(conversation: list[dict]) -> dict:
    """Run the chat agent with a conversation history. Returns the assistant's reply."""
    messages = []
    for msg in conversation:
        messages.append({"role": msg["role"], "content": msg["content"]})

    actions_taken = []

    for _ in range(MAX_ITERATIONS):
        response = client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=CHAT_SYSTEM_PROMPT,
            messages=messages,
            tools=CHAT_TOOL_DEFINITIONS,
        )

        if response.stop_reason == "end_turn" or response.stop_reason == "stop":
            text = ""
            for block in response.content:
                if block.type == "text":
                    text += block.text
            return {"reply": text, "actions": actions_taken}

        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = execute_chat_tool(block.name, block.input)
                if isinstance(result, dict) and result.get("success"):
                    actions_taken.append({
                        "tool": block.name,
                        "summary": result.get("message", f"Used {block.name}"),
                    })
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result),
                })

        messages.append({"role": "user", "content": tool_results})

    return {"reply": "Sorry, I couldn't process that. Could you try again?", "actions": actions_taken}


def _empty_finance_result() -> dict:
    return {
        "health_summary": "Unable to generate financial analysis. Please try again.",
        "spending_alert": {"category": "", "issue": "", "suggestion": ""},
        "debt_action_plan": {"strategy": "avalanche", "ordered_debts": [], "explanation": ""},
        "savings_opportunity": {"amount_rm": 0, "source": "", "target": ""},
        "income_boost_suggestion": {"gap_rm": 0, "business_potential_rm": 0, "next_step": ""},
    }


def _empty_bridge_result() -> dict:
    return {
        "full_picture_summary": "Unable to generate cross-layer analysis. Please try again.",
        "smart_money_move": {"action": "", "reason": "", "impact_rm": 0},
        "business_as_escape": {"business_potential_rm": 0, "financial_gap_rm": 0, "next_step": ""},
        "cross_layer_risk": "",
        "action_plan": [],
    }


def run_finance_agent(context: dict) -> dict:
    worry = context.get("worry", "Making ends meet")
    event = context.get("event", "None")
    priority = context.get("priority", "Survive the month")

    prompt = f"""A Malaysian urban poor individual needs your financial analysis.

Context:
- Current worry: {worry}
- Upcoming event: {event}
- This month's priority: {priority}

Please investigate their full financial situation using the available tools — income, expenses, debts, savings goals, and financial health score. Then provide your final analysis as structured JSON."""

    messages = [
        {"role": "user", "content": prompt},
    ]

    for _ in range(MAX_ITERATIONS):
        response = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=FINANCE_SYSTEM_PROMPT,
            messages=messages,
            tools=FINANCE_TOOL_DEFINITIONS,
        )

        if response.stop_reason == "end_turn" or response.stop_reason == "stop":
            text = ""
            for block in response.content:
                if block.type == "text":
                    text += block.text
            result = _parse_final_output(text)
            # Validate it has finance keys, otherwise treat as empty
            if "health_summary" not in result and "spending_alert" not in result:
                return _empty_finance_result()
            return result

        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = execute_finance_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result),
                })

        messages.append({"role": "user", "content": tool_results})

    return _empty_finance_result()


def run_bridge_agent(context: dict) -> dict:
    worry = context.get("worry", "Making ends meet")
    event = context.get("event", "None")
    priority = context.get("priority", "Survive the month")

    prompt = f"""A Malaysian urban poor individual who also runs a side food business needs your holistic economic advice.

They need help connecting their personal finances to their business opportunities.

Context:
- Current worry: {worry}
- Upcoming event: {event}
- This month's priority: {priority}

Please investigate BOTH their personal financial situation AND their business situation using tools from both layers. Then show how business changes can solve financial problems, and provide your integrated analysis as structured JSON."""

    messages = [
        {"role": "user", "content": prompt},
    ]

    for _ in range(MAX_ITERATIONS):
        response = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=BRIDGE_SYSTEM_PROMPT,
            messages=messages,
            tools=BRIDGE_TOOL_DEFINITIONS,
        )

        if response.stop_reason == "end_turn" or response.stop_reason == "stop":
            text = ""
            for block in response.content:
                if block.type == "text":
                    text += block.text
            result = _parse_final_output(text)
            if "full_picture_summary" not in result and "smart_money_move" not in result:
                return _empty_bridge_result()
            return result

        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = execute_bridge_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result),
                })

        messages.append({"role": "user", "content": tool_results})

    return _empty_bridge_result()
