from django.core.management.base import BaseCommand
from django.db import transaction

from logistics.models import Country, Sale, SalesPoint


SALES_POINTS_BY_COUNTRY = {
    "US": [
        {
            "name": "GlobalLogix New York Distribution Hub",
            "city": "New York",
            "latitude": 40.7128,
            "longitude": -74.0060,
        },
        {
            "name": "GlobalLogix Los Angeles Retail Point",
            "city": "Los Angeles",
            "latitude": 34.0522,
            "longitude": -118.2437,
        },
        {
            "name": "GlobalLogix Chicago Operations Center",
            "city": "Chicago",
            "latitude": 41.8781,
            "longitude": -87.6298,
        },
    ],
    "MX": [
        {
            "name": "GlobalLogix Ciudad de México Centro",
            "city": "Ciudad de México",
            "latitude": 19.4326,
            "longitude": -99.1332,
        },
        {
            "name": "GlobalLogix Guadalajara Punto Norte",
            "city": "Guadalajara",
            "latitude": 20.6597,
            "longitude": -103.3496,
        },
        {
            "name": "GlobalLogix Monterrey Hub Comercial",
            "city": "Monterrey",
            "latitude": 25.6866,
            "longitude": -100.3161,
        },
    ],
    "CO": [
        {
            "name": "GlobalLogix Bogotá Zona Norte",
            "city": "Bogotá",
            "latitude": 4.7110,
            "longitude": -74.0721,
        },
        {
            "name": "GlobalLogix Medellín Centro Logístico",
            "city": "Medellín",
            "latitude": 6.2442,
            "longitude": -75.5812,
        },
        {
            "name": "GlobalLogix Cali Punto Comercial",
            "city": "Cali",
            "latitude": 3.4516,
            "longitude": -76.5320,
        },
    ],
    "BR": [
        {
            "name": "GlobalLogix São Paulo Hub",
            "city": "São Paulo",
            "latitude": -23.5505,
            "longitude": -46.6333,
        },
        {
            "name": "GlobalLogix Rio de Janeiro Store",
            "city": "Rio de Janeiro",
            "latitude": -22.9068,
            "longitude": -43.1729,
        },
        {
            "name": "GlobalLogix Brasília Operations Point",
            "city": "Brasília",
            "latitude": -15.7939,
            "longitude": -47.8828,
        },
    ],
    "DE": [
        {
            "name": "GlobalLogix Berlin Business Point",
            "city": "Berlin",
            "latitude": 52.5200,
            "longitude": 13.4050,
        },
        {
            "name": "GlobalLogix Hamburg Logistics Hub",
            "city": "Hamburg",
            "latitude": 53.5511,
            "longitude": 9.9937,
        },
        {
            "name": "GlobalLogix Munich Commercial Center",
            "city": "Munich",
            "latitude": 48.1351,
            "longitude": 11.5820,
        },
    ],
    "ES": [
        {
            "name": "GlobalLogix Madrid Central",
            "city": "Madrid",
            "latitude": 40.4168,
            "longitude": -3.7038,
        },
        {
            "name": "GlobalLogix Barcelona Port Point",
            "city": "Barcelona",
            "latitude": 41.3874,
            "longitude": 2.1686,
        },
        {
            "name": "GlobalLogix Valencia Retail Hub",
            "city": "Valencia",
            "latitude": 39.4699,
            "longitude": -0.3763,
        },
    ],
    "ZA": [
        {
            "name": "GlobalLogix Johannesburg Hub",
            "city": "Johannesburg",
            "latitude": -26.2041,
            "longitude": 28.0473,
        },
        {
            "name": "GlobalLogix Cape Town Commercial Point",
            "city": "Cape Town",
            "latitude": -33.9249,
            "longitude": 18.4241,
        },
        {
            "name": "GlobalLogix Durban Distribution Point",
            "city": "Durban",
            "latitude": -29.8587,
            "longitude": 31.0218,
        },
    ],
    "IN": [
        {
            "name": "GlobalLogix Mumbai Sales Point",
            "city": "Mumbai",
            "latitude": 19.0760,
            "longitude": 72.8777,
        },
        {
            "name": "GlobalLogix Delhi Operations Hub",
            "city": "Delhi",
            "latitude": 28.7041,
            "longitude": 77.1025,
        },
        {
            "name": "GlobalLogix Bengaluru Tech Market",
            "city": "Bengaluru",
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
    ],
    "AU": [
        {
            "name": "GlobalLogix Sydney Retail Point",
            "city": "Sydney",
            "latitude": -33.8688,
            "longitude": 151.2093,
        },
        {
            "name": "GlobalLogix Melbourne Logistics Hub",
            "city": "Melbourne",
            "latitude": -37.8136,
            "longitude": 144.9631,
        },
        {
            "name": "GlobalLogix Brisbane Commercial Point",
            "city": "Brisbane",
            "latitude": -27.4698,
            "longitude": 153.0251,
        },
    ],
    "JP": [
        {
            "name": "GlobalLogix Tokyo Central",
            "city": "Tokyo",
            "latitude": 35.6762,
            "longitude": 139.6503,
        },
        {
            "name": "GlobalLogix Osaka Sales Hub",
            "city": "Osaka",
            "latitude": 34.6937,
            "longitude": 135.5023,
        },
        {
            "name": "GlobalLogix Nagoya Operations Point",
            "city": "Nagoya",
            "latitude": 35.1815,
            "longitude": 136.9066,
        },
    ],
}


class Command(BaseCommand):
    help = "Crea puntos de venta por país y asigna las ventas existentes a esos puntos."

    @transaction.atomic
    def handle(self, *args, **options):
        created_points = 0
        updated_sales = 0

        for country_code, points in SALES_POINTS_BY_COUNTRY.items():
            try:
                country = Country.objects.get(code_iso=country_code)
            except Country.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(
                        f"País con código {country_code} no existe. Se omite."
                    )
                )
                continue

            sales_points = []

            for point_data in points:
                sales_point, created = SalesPoint.objects.get_or_create(
                    country=country,
                    name=point_data["name"],
                    defaults={
                        "city": point_data["city"],
                        "latitude": point_data["latitude"],
                        "longitude": point_data["longitude"],
                    },
                )

                sales_points.append(sales_point)

                if created:
                    created_points += 1

            country_sales = Sale.objects.filter(country=country).order_by("id")

            for index, sale in enumerate(country_sales):
                selected_point = sales_points[index % len(sales_points)]

                if sale.sales_point_id != selected_point.id:
                    sale.sales_point = selected_point
                    sale.save(update_fields=["sales_point"])
                    updated_sales += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Proceso completado. Puntos creados: {created_points}. "
                f"Ventas actualizadas: {updated_sales}."
            )
        )