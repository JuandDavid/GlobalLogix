document.addEventListener('DOMContentLoaded', function () {
    const mapContainer = document.getElementById('countryDetailMap');

    if (!mapContainer) {
        return;
    }

    if (typeof atlas === 'undefined') {
        mapContainer.innerHTML = `
            <div class="placeholder-content">
                <h4>No cargó Azure Maps</h4>
                <p>Revisa la conexión o el script de Azure Maps.</p>
            </div>
        `;
        return;
    }

    if (!window.AZURE_MAPS_KEY) {
        mapContainer.innerHTML = `
            <div class="placeholder-content">
                <h4>Falta configurar Azure Maps</h4>
                <p>No se encontró la clave para cargar el mapa.</p>
            </div>
        `;
        return;
    }

    const countryName = mapContainer.dataset.countryName || 'País';
    const countryCode = mapContainer.dataset.countryCode || 'N/A';
    const continent = mapContainer.dataset.countryContinent || 'Sin continente';

    const latitude = parseFloat(mapContainer.dataset.countryLatitude);
    const longitude = parseFloat(mapContainer.dataset.countryLongitude);

    const totalSales = Number(mapContainer.dataset.totalSales || 0);
    const totalOrders = Number(mapContainer.dataset.totalOrders || 0);
    const growth = Number(
        String(mapContainer.dataset.growth || 0).replace(',', '.')
    );

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        mapContainer.innerHTML = `
            <div class="placeholder-content">
                <h4>No se pudieron leer las coordenadas</h4>
                <p>Revisa que el país tenga latitude y longitude en la base de datos.</p>
            </div>
        `;
        return;
    }

    const map = new atlas.Map('countryDetailMap', {
    center: [longitude, latitude],
    zoom: 4,
    pitch: 45,
    bearing: 0,
    style: 'road',
    view: 'Auto',

        authOptions: {
            authType: 'subscriptionKey',
            subscriptionKey: window.AZURE_MAPS_KEY
        }
    });

    map.events.add('ready', function () {
        map.resize();

        const dataSource = new atlas.source.DataSource();
        map.sources.add(dataSource);

        const point = new atlas.Shape(
            new atlas.data.Point([longitude, latitude]),
            null,
            {
                code: countryCode,
                name: countryName,
                continent: continent,
                total_sales: totalSales,
                total_orders: totalOrders,
                growth: growth
            }
        );

        dataSource.add(point);

        const bubbleLayer = new atlas.layer.BubbleLayer(
            dataSource,
            'country-detail-bubble-layer',
            {
                radius: 34,
                color: growth >= 0 ? '#22c55e' : '#ef4444',
                strokeColor: '#ffffff',
                strokeWidth: 3,
                opacity: 0.9
            }
        );

        const symbolLayer = new atlas.layer.SymbolLayer(
            dataSource,
            'country-detail-symbol-layer',
            {
                iconOptions: {
                    image: 'none'
                },
                textOptions: {
                    textField: ['get', 'code'],
                    color: '#ffffff',
                    haloColor: '#020617',
                    haloWidth: 2,
                    size: 20,
                    font: ['SegoeUi-Bold']
                }
            }
        );

        map.layers.add([bubbleLayer, symbolLayer]);

        const formattedSales = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(totalSales);

        const growthText = growth >= 0
            ? `+${growth.toFixed(2)}%`
            : `${growth.toFixed(2)}%`;

        const popupContent = `
            <div style="
                min-width: 250px;
                padding: 16px;
                background: #0f172a;
                color: #f8fafc;
                border-radius: 14px;
                border: 1px solid rgba(56, 189, 248, 0.45);
                box-shadow: 0 18px 40px rgba(0, 0, 0, 0.65);
                font-family: Arial, Helvetica, sans-serif;
            ">
                <h4 style="
                    margin: 0 0 12px 0;
                    font-size: 1.05rem;
                    color: #38bdf8;
                ">
                    ${countryName}
                </h4>

                <p style="
                    display: flex;
                    justify-content: space-between;
                    gap: 16px;
                    margin: 8px 0;
                    color: #cbd5e1;
                    font-size: 0.88rem;
                ">
                    <strong style="color: #f8fafc;">Código:</strong>
                    <span>${countryCode}</span>
                </p>

                <p style="
                    display: flex;
                    justify-content: space-between;
                    gap: 16px;
                    margin: 8px 0;
                    color: #cbd5e1;
                    font-size: 0.88rem;
                ">
                    <strong style="color: #f8fafc;">Continente:</strong>
                    <span>${continent}</span>
                </p>

                <p style="
                    display: flex;
                    justify-content: space-between;
                    gap: 16px;
                    margin: 8px 0;
                    color: #cbd5e1;
                    font-size: 0.88rem;
                ">
                    <strong style="color: #f8fafc;">Ventas:</strong>
                    <span>${formattedSales}</span>
                </p>

                <p style="
                    display: flex;
                    justify-content: space-between;
                    gap: 16px;
                    margin: 8px 0;
                    color: #cbd5e1;
                    font-size: 0.88rem;
                ">
                    <strong style="color: #f8fafc;">Órdenes:</strong>
                    <span>${totalOrders}</span>
                </p>

                <p style="
                    display: flex;
                    justify-content: space-between;
                    gap: 16px;
                    margin: 8px 0;
                    color: #cbd5e1;
                    font-size: 0.88rem;
                ">
                    <strong style="color: #f8fafc;">Crecimiento:</strong>
                    <span style="color: ${growth >= 0 ? '#22c55e' : '#ef4444'}; font-weight: 800;">
                        ${growthText}
                    </span>
                </p>
            </div>
        `;

        const popup = new atlas.Popup({
            content: popupContent,
            position: [longitude, latitude],
            pixelOffset: [0, -30],
            closeButton: true,
            fillColor: '#0f172a'
        });

        map.events.add('click', bubbleLayer, function () {
            popup.open(map);
        });

        setTimeout(function () {
            map.setCamera({
                center: [longitude, latitude],
                zoom: 4,
                pitch: 45
            });
        }, 700);
    });
});