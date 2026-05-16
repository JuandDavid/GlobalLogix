from django.contrib import admin

from .models import Country, Product, Sale, SalesPoint

@admin.register(SalesPoint)
class SalesPointAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "city",
        "country",
        "latitude",
        "longitude",
    )

    search_fields = (
        "name",
        "city",
        "country__name",
        "country__code_iso",
    )

    list_filter = (
        "country",
        "city",
    )

    ordering = (
        "country__name",
        "city",
        "name",
    )

@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code_iso",
        "continent",
        "latitude",
        "longitude",
    )

    search_fields = (
        "name",
        "code_iso",
        "continent",
    )

    list_filter = (
        "continent",
    )

    ordering = (
        "name",
    )


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "category",
        "price",
    )

    search_fields = (
        "name",
        "category",
    )

    list_filter = (
        "category",
    )

    ordering = (
        "name",
    )


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = (
    "country",
    "sales_point",
    "product",
    "quantity",
    "total_amount",
    "sale_date",
    )
    search_fields = (
    "country__name",
    "country__code_iso",
    "sales_point__name",
    "sales_point__city",
    "product__name",
    "product__category",
    )

    list_filter = (
        "country",
        "product",
        "sale_date",
        "sales_point",
    )

    date_hierarchy = "sale_date"

    ordering = (
        "-sale_date",
    )