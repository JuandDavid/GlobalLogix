"""
Generador de fixture para el dashboard de logística global.

Este archivo crea datos ficticios para:
- 10 países
- 5 productos
- 200 ventas, 20 ventas por país
- Fechas distribuidas en los últimos 12 meses
- Crecimientos positivos y negativos

Al ejecutarlo, se crea el archivo:
logistics/fixtures/sales_data.json
"""

import json
from datetime import date
from decimal import Decimal
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent

OUTPUT_FILE = BASE_DIR / "logistics" / "fixtures" / "sales_data.json"


countries = [
    {
        "pk": 1,
        "name": "Colombia",
        "code_iso": "CO",
        "continent": "América del Sur",
        "latitude": 4.5709,
        "longitude": -74.2973,
    },
    {
        "pk": 2,
        "name": "México",
        "code_iso": "MX",
        "continent": "América del Norte",
        "latitude": 23.6345,
        "longitude": -102.5528,
    },
    {
        "pk": 3,
        "name": "Brasil",
        "code_iso": "BR",
        "continent": "América del Sur",
        "latitude": -14.2350,
        "longitude": -51.9253,
    },
    {
        "pk": 4,
        "name": "España",
        "code_iso": "ES",
        "continent": "Europa",
        "latitude": 40.4637,
        "longitude": -3.7492,
    },
    {
        "pk": 5,
        "name": "Estados Unidos",
        "code_iso": "US",
        "continent": "América del Norte",
        "latitude": 37.0902,
        "longitude": -95.7129,
    },
    {
        "pk": 6,
        "name": "Alemania",
        "code_iso": "DE",
        "continent": "Europa",
        "latitude": 51.1657,
        "longitude": 10.4515,
    },
    {
        "pk": 7,
        "name": "Japón",
        "code_iso": "JP",
        "continent": "Asia",
        "latitude": 36.2048,
        "longitude": 138.2529,
    },
    {
        "pk": 8,
        "name": "Australia",
        "code_iso": "AU",
        "continent": "Oceanía",
        "latitude": -25.2744,
        "longitude": 133.7751,
    },
    {
        "pk": 9,
        "name": "Sudáfrica",
        "code_iso": "ZA",
        "continent": "África",
        "latitude": -30.5595,
        "longitude": 22.9375,
    },
    {
        "pk": 10,
        "name": "India",
        "code_iso": "IN",
        "continent": "Asia",
        "latitude": 20.5937,
        "longitude": 78.9629,
    },
]


products = [
    {
        "pk": 1,
        "name": "Smart Sensor Global",
        "category": "IoT",
        "price": "180.00",
    },
    {
        "pk": 2,
        "name": "Router Industrial X900",
        "category": "Redes",
        "price": "420.00",
    },
    {
        "pk": 3,
        "name": "Tracker Logístico GPS",
        "category": "Logística",
        "price": "260.00",
    },
    {
        "pk": 4,
        "name": "Servidor Edge Mini",
        "category": "Infraestructura",
        "price": "950.00",
    },
    {
        "pk": 5,
        "name": "Licencia Analytics Pro",
        "category": "Software",
        "price": "120.00",
    },
]


# Fechas distribuidas en los últimos 12 meses.
# Usamos fechas fijas para que el fixture sea estable y fácil de evaluar.
months = [
    date(2025, 6, 15),
    date(2025, 7, 15),
    date(2025, 8, 15),
    date(2025, 9, 15),
    date(2025, 10, 15),
    date(2025, 11, 15),
    date(2025, 12, 15),
    date(2026, 1, 15),
    date(2026, 2, 15),
    date(2026, 3, 15),
    date(2026, 4, 15),
    date(2026, 5, 15),
]


growth_values = [
    8.5,
    -3.2,
    12.1,
    5.4,
    -6.8,
    14.3,
    -1.9,
    9.7,
    3.6,
    -4.5,
    16.2,
    -2.7,
]


def money(value):
    """
    Convierte un número decimal a string con dos decimales.
    Django espera los DecimalField como string dentro del fixture JSON.
    """

    return str(Decimal(value).quantize(Decimal("0.01")))


def build_fixture():
    """
    Construye la lista completa de objetos para el fixture.
    """

    fixture = []

    # Agregar países
    for country in countries:
        fixture.append(
            {
                "model": "logistics.country",
                "pk": country["pk"],
                "fields": {
                    "name": country["name"],
                    "code_iso": country["code_iso"],
                    "continent": country["continent"],
                    "latitude": country["latitude"],
                    "longitude": country["longitude"],
                },
            }
        )

    # Agregar productos
    for product in products:
        fixture.append(
            {
                "model": "logistics.product",
                "pk": product["pk"],
                "fields": {
                    "name": product["name"],
                    "category": product["category"],
                    "price": product["price"],
                },
            }
        )

    sale_pk = 1

    # Crear 20 ventas por país
    for country in countries:
        country_pk = country["pk"]

        for index in range(20):
            product = products[(index + country_pk) % len(products)]

            product_pk = product["pk"]
            product_price = Decimal(product["price"])

            # Cantidades diferentes para simular comportamiento realista
            quantity = 12 + ((index * 3 + country_pk * 2) % 45)

            # Factor por país para que algunos países vendan más que otros
            country_factor = Decimal("1.00") + Decimal(country_pk) / Decimal("20.00")

            total_amount = product_price * Decimal(quantity) * country_factor

            sale_date = months[index % len(months)]

            growth_percentage = growth_values[(index + country_pk) % len(growth_values)]

            fixture.append(
                {
                    "model": "logistics.sale",
                    "pk": sale_pk,
                    "fields": {
                        "country": country_pk,
                        "product": product_pk,
                        "quantity": quantity,
                        "total_amount": money(total_amount),
                        "sale_date": sale_date.isoformat(),
                        "growth_percentage": growth_percentage,
                    },
                }
            )

            sale_pk += 1

    return fixture


def main():
    """
    Función principal del script.
    Crea la carpeta fixtures si no existe y guarda el archivo JSON.
    """

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    fixture = build_fixture()

    with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
        json.dump(fixture, file, ensure_ascii=False, indent=4)

    print(f"Fixture creado correctamente en: {OUTPUT_FILE}")
    print(f"Total de objetos generados: {len(fixture)}")
    print("Incluye 10 países, 5 productos y 200 ventas.")


if __name__ == "__main__":
    main()