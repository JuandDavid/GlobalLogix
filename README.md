# GlobalLogix - Dashboard de Logística Internacional

## Descripción general

GlobalLogix es un dashboard académico desarrollado con Django para visualizar ventas internacionales por país. El sistema utiliza datos simulados almacenados en SQLite y los presenta mediante templates HTML, endpoints JSON, Azure Maps y Chart.js.

El objetivo principal del proyecto es mostrar cómo una aplicación Django puede integrar modelos de datos, vistas, APIs internas y herramientas de visualización para representar información comercial global de forma clara e interactiva.

---

## Tecnologías utilizadas

- Python
- Django
- SQLite
- HTML
- CSS
- JavaScript
- Azure Maps
- Chart.js

---

## Estructura principal del proyecto

```text
logistics_dashboard/
├── config/
│   ├── settings.py
│   └── urls.py
├── logistics/
│   ├── models.py
│   ├── views.py
│   ├── urls.py
│   ├── admin.py
│   ├── fixtures/
│   │   └── sales_data.json
│   └── templatetags/
│       └── currency_filters.py
├── templates/
│   ├── base.html
│   └── dashboard/
│       ├── index.html
│       └── country_detail.html
├── static/
│   ├── css/
│   │   └── dashboard.css
│   └── js/
│       ├── map3d.js
│       ├── charts.js
│       └── country_map.js
└── manage.py