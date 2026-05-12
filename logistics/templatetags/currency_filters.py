from django import template

register = template.Library()


@register.filter
def cop_currency(value):
    try:
        value = float(value)
    except (TypeError, ValueError):
        value = 0

    formatted_value = f"{value:,.0f}"

    formatted_value = (
        formatted_value
        .replace(",", ".")
    )

    return f"${formatted_value}"