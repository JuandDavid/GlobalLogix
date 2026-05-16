from django.urls import path

from . import views

urlpatterns = [
    path(
        "",
        views.dashboard,
        name="dashboard_home"
    ),

    path(
        "api/sales-geojson/",
        views.sales_geojson,
        name="sales_geojson"
    ),

    path(
        "countries/<str:code_iso>/",
        views.country_detail,
        name="country_detail"
    ),

    path(
        "api/countries/<str:code_iso>/sales-chart/",
        views.country_sales_chart,
        name="country_sales_chart"
    ),

    path(
        "api/dashboard/sales-by-country/",
        views.dashboard_sales_by_country,
        name="dashboard_sales_by_country"
    ),
    
    path(
        "api/countries/<str:code_iso>/sales-points/",
        views.country_sales_points_api,
        name="country_sales_points_api",
    ),
]