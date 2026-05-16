"""
Modelos de base de datos para el dashboard de logística global.

Aquí definimos las entidades principales:
- Country: países donde se venden productos.
- Product: productos vendidos por la empresa.
- Sale: ventas realizadas en cada país.
"""

from django.db import models


class Country(models.Model):
    """
    Representa un país dentro del dashboard.

    El código ISO de 2 letras se usará más adelante para relacionar
    cada país con datos geográficos y para mostrar banderas.
    """

    name = models.CharField(
        max_length=100,
        verbose_name="Nombre del país"
    )

    code_iso = models.CharField(
        max_length=2,
        unique=True,
        verbose_name="Código ISO"
    )

    continent = models.CharField(
        max_length=100,
        verbose_name="Continente"
    )

    latitude = models.FloatField(
        verbose_name="Latitud"
    )

    longitude = models.FloatField(
        verbose_name="Longitud"
    )

    class Meta:
        verbose_name = "País"
        verbose_name_plural = "Países"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code_iso})"


class Product(models.Model):
    """
    Representa un producto vendido por la empresa.

    Cada producto tiene nombre, categoría y precio unitario.
    """

    name = models.CharField(
        max_length=120,
        verbose_name="Nombre del producto"
    )

    category = models.CharField(
        max_length=100,
        verbose_name="Categoría"
    )

    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Precio"
    )

    class Meta:
        verbose_name = "Producto"
        verbose_name_plural = "Productos"
        ordering = ["name"]

    def __str__(self):
        return self.name

class SalesPoint(models.Model):
    """
    Representa un punto de venta, tienda, sucursal o ubicación
    comercial dentro de un país.

    Este modelo permitirá mostrar barras 3D internas en el mapa
    de detalle de cada país.
    """

    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name="sales_points",
        verbose_name="País"
    )

    name = models.CharField(
        max_length=150,
        verbose_name="Nombre del punto de venta"
    )

    city = models.CharField(
        max_length=100,
        verbose_name="Ciudad"
    )

    latitude = models.FloatField(
        verbose_name="Latitud"
    )

    longitude = models.FloatField(
        verbose_name="Longitud"
    )

    class Meta:
        verbose_name = "Punto de venta"
        verbose_name_plural = "Puntos de venta"
        ordering = ["country__name", "city", "name"]

    def __str__(self):
        return f"{self.name} - {self.city}, {self.country.code_iso}"

class Sale(models.Model):
    """
    Representa una venta realizada.

    Cada venta pertenece a un país y a un producto.
    Además guarda cantidad vendida, valor total, fecha de venta
    y porcentaje de crecimiento frente al mes anterior.
    """

    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name="sales",
        verbose_name="País"
    )
    
    sales_point = models.ForeignKey(
    SalesPoint,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="sales",
    verbose_name="Punto de venta"
   )

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="sales",
        verbose_name="Producto"
    )

    quantity = models.IntegerField(
        verbose_name="Cantidad vendida"
    )

    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Valor total"
    )

    sale_date = models.DateField(
        verbose_name="Fecha de venta"
    )

    class Meta:
        verbose_name = "Venta"
        verbose_name_plural = "Ventas"
        ordering = ["-sale_date"]

    def __str__(self):
        return f"{self.country.name} - {self.product.name} - {self.total_amount}"