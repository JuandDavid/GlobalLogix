document.addEventListener('DOMContentLoaded', function () {
    const mapContainer = document.getElementById('map');

    if (!mapContainer) {
        console.error('No se encontró el contenedor #map.');
        return;
    }

    if (typeof atlas === 'undefined') {
        mapContainer.innerHTML = `
            <div class="placeholder-content">
                <h4>No cargó Azure Maps</h4>
                <p>Revisa que el SDK de Azure Maps esté cargado correctamente.</p>
            </div>
        `;
        return;
    }

    if (!window.AZURE_MAPS_KEY || window.AZURE_MAPS_KEY === 'PEGA_AQUI_TU_AZURE_MAPS_KEY') {
        mapContainer.innerHTML = `
            <div class="placeholder-content">
                <h4>Falta configurar Azure Maps</h4>
                <p>Agrega tu clave en config/settings.py en la variable AZURE_MAPS_KEY.</p>
            </div>
        `;
        return;
    }

    const allowedCountries = ['US', 'MX', 'CO', 'BR', 'DE', 'ES', 'ZA', 'IN', 'AU', 'JP'];

    const map = new atlas.Map('map', {
        center: [-15, 18],
        zoom: 1.45,
        pitch: 25,
        bearing: 0,
        style: 'road',
        view: 'Auto',

        authOptions: {
            authType: 'subscriptionKey',
            subscriptionKey: window.AZURE_MAPS_KEY
        }
    });

    let currentPopup = null;

    map.events.add('ready', function () {
        map.resize();

        const dataSource = new atlas.source.DataSource();
        map.sources.add(dataSource);

        fetch('/api/sales-geojson/')
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('No se pudo obtener el GeoJSON de ventas.');
                }

                return response.json();
            })
            .then(function (data) {
                const filteredFeatures = (data.features || []).filter(function (feature) {
                    return allowedCountries.includes(feature.properties.code);
                });

                const filteredGeoJson = {
                    type: 'FeatureCollection',
                    features: filteredFeatures
                };

                dataSource.add(filteredGeoJson);

                const salesValues = filteredFeatures.map(function (feature) {
                    return Number(feature.properties.total_sales || 0);
                });

                const maxSales = Math.max(...salesValues);

                /*
                    CAPA ESTABLE DE BURBUJAS.
                    Esto asegura que el mapa nunca quede sin marcadores.
                */
                const bubbleLayer = new atlas.layer.BubbleLayer(dataSource, 'sales-bubble-layer', {
                    radius: 1,
                    color: 'rgba(0, 0, 0, 0)',
                    strokeColor: 'rgba(0, 0, 0, 0)',
                    strokeWidth: 0,
                    opacity: 0
                });

                const symbolLayer = new atlas.layer.SymbolLayer(dataSource, 'country-symbol-layer', {
                    iconOptions: {
                        image: 'none'
                    },
                    textOptions: {
                        textField: ['get', 'code'],
                        color: '#ffffff',
                        haloColor: '#020617',
                        haloWidth: 2,
                        size: 14,
                        font: ['SegoeUi-Bold']
                    }
                });

                map.layers.add([bubbleLayer]);

                /* COLUMNAS 3D VISUALES.
Cada país se representa con una barra vertical.
La altura depende de las ventas totales del país.
*/
                filteredFeatures.forEach(function (feature) {
                    try {
                        const properties = feature.properties;
                        const coordinates = feature.geometry.coordinates;
                        const totalSales = Number(properties.total_sales || 0);

                        let growthValue = Number(
                            String(properties.growth || 0).replace(',', '.')
                        );

                        if (Number.isNaN(growthValue)) {
                            growthValue = 0;
                        }

                        const minHeight = 45;
                        const maxHeight = 170;

                        let barHeight = minHeight;

                        if (maxSales > 0) {
                            barHeight = Math.round(
                                minHeight + ((totalSales / maxSales) * (maxHeight - minHeight))
                            );
                        }

                        const trendClass = growthValue >= 0 ? 'positive' : 'negative';

                        const markerElement = document.createElement('div');
                        markerElement.className = `sales-3d-marker ${trendClass}`;
                        markerElement.style.setProperty('--bar-height', `${barHeight}px`);

                        markerElement.innerHTML = `
            <div class="sales-3d-value">${formatCompact(totalSales)}</div>

            <div class="sales-3d-column">
                <div class="sales-3d-column-face"></div>
                <div class="sales-3d-column-side"></div>
                <div class="sales-3d-column-top"></div>
            </div>

            <div class="sales-3d-code">${properties.code}</div>
        `;

                        const marker = new atlas.HtmlMarker({
                            position: coordinates,
                            htmlContent: markerElement,
                            anchor: 'bottom'
                        });

                        map.markers.add(marker);

                        markerElement.addEventListener('click', function (event) {
                            event.stopPropagation();

                            if (currentPopup) {
                                currentPopup.close();
                            }

                            currentPopup = createPopup(
                                map,
                                properties,
                                coordinates,
                                totalSales,
                                growthValue,
                                barHeight
                            );

                            currentPopup.open(map);
                        });
                    } catch (markerError) {
                        console.error('Error creando columna 3D:', markerError);
                    }
                });

                /*
                    Popup también funciona al hacer clic en burbujas.
                */
                map.events.add('click', bubbleLayer, function (event) {
                    if (!event.shapes || event.shapes.length === 0) {
                        return;
                    }

                    const shape = event.shapes[0];
                    const properties = shape.getProperties();
                    const coordinates = shape.getCoordinates();

                    const totalSales = Number(properties.total_sales || 0);

                    let growthValue = Number(
                        String(properties.growth || 0).replace(',', '.')
                    );

                    if (Number.isNaN(growthValue)) {
                        growthValue = 0;
                    }

                    if (currentPopup) {
                        currentPopup.close();
                    }

                    currentPopup = createPopup(map, properties, coordinates, totalSales, growthValue, 80);
                    currentPopup.open(map);
                });

                map.events.add('click', function () {
                    if (currentPopup) {
                        currentPopup.close();
                    }
                });

                map.events.add('mouseenter', bubbleLayer, function () {
                    map.getCanvasContainer().style.cursor = 'pointer';
                });

                map.events.add('mouseleave', bubbleLayer, function () {
                    map.getCanvasContainer().style.cursor = 'grab';
                });

                setTimeout(function () {
                    map.resize();
                    map.setCamera({
                        center: [-15, 18],
                        zoom: 1.45,
                        pitch: 25
                    });
                }, 600);
            })
            .catch(function (error) {
                console.error('Error cargando datos del mapa:', error);

                mapContainer.innerHTML = `
                    <div class="placeholder-content">
                        <h4>Error cargando datos del mapa</h4>
                        <p>Revisa que /api/sales-geojson/ esté funcionando correctamente.</p>
                    </div>
                `;
            });
    });


    function formatCompact(value) {
        const numericValue = Number(value || 0);

        if (numericValue >= 1000000) {
            return (numericValue / 1000000).toFixed(1).replace('.0', '') + 'M';
        }

        if (numericValue >= 1000) {
            return Math.round(numericValue / 1000) + 'k';
        }

        return numericValue.toString();
    }


    function formatCurrency(value) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(Number(value || 0));
    }


    function createPopup(map, properties, coordinates, totalSales, growthValue, barHeight) {
        const growthText = growthValue >= 0
            ? `+${growthValue.toFixed(2)}%`
            : `${growthValue.toFixed(2)}%`;

        const growthColor = growthValue >= 0 ? '#22c55e' : '#ef4444';

        const popupContent = `
            <div style="
                min-width: 260px;
                padding: 16px;
                background: #0f172a;
                color: #f8fafc;
                border-radius: 14px;
                border: 1px solid rgba(56, 189, 248, 0.4);
                box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55);
                font-family: Arial, Helvetica, sans-serif;
            ">
                <h4 style="
                    margin: 0 0 12px 0;
                    font-size: 1.05rem;
                    color: #38bdf8;
                ">
                    ${properties.name}
                </h4>

                <p style="display:flex; justify-content:space-between; margin:8px 0; font-size:0.88rem;">
                    <strong>Código:</strong>
                    <span>${properties.code}</span>
                </p>

                <p style="display:flex; justify-content:space-between; margin:8px 0; font-size:0.88rem;">
                    <strong>Continente:</strong>
                    <span>${properties.continent}</span>
                </p>

                <p style="display:flex; justify-content:space-between; margin:8px 0; font-size:0.88rem;">
                    <strong>Ventas:</strong>
                    <span>${formatCurrency(totalSales)}</span>
                </p>

                <p style="display:flex; justify-content:space-between; margin:8px 0; font-size:0.88rem;">
                    <strong>Órdenes:</strong>
                    <span>${properties.total_orders}</span>
                </p>

                <p style="display:flex; justify-content:space-between; margin:8px 0; font-size:0.88rem;">
                    <strong>Crecimiento:</strong>
                    <span style="color:${growthColor}; font-weight:700;">
                        ${growthText}
                    </span>
                </p>

                <a href="/countries/${properties.code}/" style="
                    display:block;
                    margin-top:14px;
                    padding:10px 12px;
                    text-align:center;
                    text-decoration:none;
                    border-radius:10px;
                    background:rgba(56, 189, 248, 0.14);
                    color:#38bdf8;
                    border:1px solid rgba(56, 189, 248, 0.3);
                    font-weight:700;
                ">
                    Ver detalle del país
                </a>
            </div>
        `;

        return new atlas.Popup({
            content: popupContent,
            position: coordinates,
            pixelOffset: [0, -(barHeight + 20)],
            closeButton: true,
            fillColor: '#0f172a'
        });
    }
});