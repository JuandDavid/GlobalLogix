from datetime import timedelta

from django.conf import settings
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404
from django.utils import timezone

from .models import Country, Product, Sale


def dashboard(request):
    total_countries = Country.objects.count()
    total_products = Product.objects.count()
    total_sales_records = Sale.objects.count()

    ranking_countries = (
        Sale.objects
        .values(
            "country__name",
            "country__code_iso",
            "country__continent"
        )
        .annotate(
            total_sales=Sum("total_amount"),
            total_orders=Count("id")
        )
        .order_by("-total_sales")[:5]
    )

    context = {
        "azure_maps_key": settings.AZURE_MAPS_KEY,
        "total_countries": total_countries,
        "total_products": total_products,
        "total_sales_records": total_sales_records,
        "ranking_countries": ranking_countries,
    }

    return render(request, "dashboard/index.html", context)


def calculate_growth_for_sales_queryset(sales_queryset):
    today = timezone.now().date()

    last_6_months_start = today - timedelta(days=180)
    previous_6_months_start = today - timedelta(days=360)

    recent_sales = sales_queryset.filter(
        sale_date__gte=last_6_months_start
    ).aggregate(
        total=Sum("total_amount")
    )["total"] or 0

    previous_sales = sales_queryset.filter(
        sale_date__gte=previous_6_months_start,
        sale_date__lt=last_6_months_start
    ).aggregate(
        total=Sum("total_amount")
    )["total"] or 0

    if previous_sales > 0:
        growth = ((recent_sales - previous_sales) / previous_sales) * 100
    else:
        growth = 0

    return round(growth, 2)


def build_country_analysis(country, total_sales, total_orders, average_ticket, country_growth, top_product):
    if total_orders == 0:
        return (
            f"{country.name} no presenta ventas registradas en el periodo analizado. "
            "Esto impide generar una lectura comercial completa, pero permite identificar "
            "un mercado pendiente por explorar dentro del dashboard."
        )

    if country_growth > 0:
        growth_message = (
            "El crecimiento positivo indica que las ventas recientes superan las del periodo anterior, "
            "lo que sugiere una evolución favorable del mercado."
        )
    elif country_growth < 0:
        growth_message = (
            "El crecimiento negativo indica una reducción en las ventas recientes frente al periodo anterior, "
            "por lo que sería importante revisar demanda, producto líder o comportamiento comercial."
        )
    else:
        growth_message = (
            "El crecimiento se mantiene estable, lo que muestra un comportamiento sin variaciones fuertes "
            "entre los periodos comparados."
        )

    if average_ticket >= 30000:
        ticket_message = (
            "El ticket promedio es alto dentro del contexto de los datos simulados, "
            "lo que puede asociarse con compras de mayor valor por orden."
        )
    elif average_ticket >= 15000:
        ticket_message = (
            "El ticket promedio se encuentra en un rango medio, mostrando un comportamiento comercial equilibrado."
        )
    else:
        ticket_message = (
            "El ticket promedio es bajo, lo que puede indicar compras de menor valor unitario o mayor dependencia del volumen."
        )

    analysis = (
        f"{country.name} registra ventas acumuladas en el periodo analizado y cuenta con "
        f"{total_orders} órdenes registradas. {growth_message} "
        f"{ticket_message} El producto con mejor desempeño es {top_product}, "
        "lo que permite identificar una referencia clave para comprender la demanda en este país."
    )

    return analysis


def sales_geojson(request):
    features = []

    countries = Country.objects.all()

    for country in countries:
        country_sales = Sale.objects.filter(country=country)

        total_sales = country_sales.aggregate(
            total=Sum("total_amount")
        )["total"] or 0

        total_orders = country_sales.count()

        growth = calculate_growth_for_sales_queryset(country_sales)

        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [
                    float(country.longitude),
                    float(country.latitude)
                ],
            },
            "properties": {
                "code": country.code_iso,
                "name": country.name,
                "continent": country.continent,
                "total_sales": float(total_sales),
                "total_orders": total_orders,
                "growth": growth,
            },
        }

        features.append(feature)

    geojson = {
        "type": "FeatureCollection",
        "features": features,
    }

    return JsonResponse(geojson)


def country_detail(request, code_iso):
    country = get_object_or_404(
        Country,
        code_iso=code_iso.upper()
    )

    sales = Sale.objects.filter(country=country)

    total_sales = sales.aggregate(
        total=Sum("total_amount")
    )["total"] or 0

    total_orders = sales.count()

    total_quantity = sales.aggregate(
        total=Sum("quantity")
    )["total"] or 0

    if total_orders > 0:
        average_ticket = total_sales / total_orders
    else:
        average_ticket = 0

    country_growth = calculate_growth_for_sales_queryset(sales)

    top_product_data = (
        sales
        .values("product__name")
        .annotate(total_quantity=Sum("quantity"))
        .order_by("-total_quantity")
        .first()
    )

    if top_product_data:
        top_product = top_product_data["product__name"]
    else:
        top_product = "Sin datos"

    country_analysis = build_country_analysis(
        country=country,
        total_sales=total_sales,
        total_orders=total_orders,
        average_ticket=average_ticket,
        country_growth=country_growth,
        top_product=top_product
    )

    context = {
        "country": country,
        "total_sales": total_sales,
        "total_orders": total_orders,
        "total_quantity": total_quantity,
        "top_product": top_product,
        "average_ticket": average_ticket,
        "country_growth": country_growth,
        "country_analysis": country_analysis,
        "azure_maps_key": settings.AZURE_MAPS_KEY,
    }

    return render(request, "dashboard/country_detail.html", context)


def country_sales_chart(request, code_iso):
    country = get_object_or_404(
        Country,
        code_iso=code_iso.upper()
    )

    monthly_sales = (
        Sale.objects
        .filter(country=country)
        .annotate(month=TruncMonth("sale_date"))
        .values("month")
        .annotate(total=Sum("total_amount"))
        .order_by("month")
    )

    labels = []
    values = []

    for item in monthly_sales:
        labels.append(item["month"].strftime("%b %Y"))
        values.append(float(item["total"] or 0))

    data = {
        "country": country.name,
        "labels": labels,
        "values": values,
    }

    return JsonResponse(data)


def dashboard_sales_by_country(request):
    sales_by_country = (
        Sale.objects
        .values("country__name", "country__code_iso")
        .annotate(total=Sum("total_amount"))
        .order_by("-total")
    )

    labels = []
    values = []
    codes = []

    for item in sales_by_country:
        labels.append(item["country__name"])
        values.append(float(item["total"] or 0))
        codes.append(item["country__code_iso"])

    data = {
        "labels": labels,
        "values": values,
        "codes": codes,
    }

    return JsonResponse(data)