from django.contrib import admin

from .models import Country, Product, Sale


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
        "product",
        "quantity",
        "total_amount",
        "sale_date",
    )

    search_fields = (
        "country__name",
        "country__code_iso",
        "product__name",
        "product__category",
    )

    list_filter = (
        "country",
        "product",
        "sale_date",
    )

    date_hierarchy = "sale_date"

    ordering = (
        "-sale_date",
    )