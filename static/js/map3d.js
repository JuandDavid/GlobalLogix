document.addEventListener('DOMContentLoaded', function () {
    const mapContainer = document.getElementById('map');

    mapContainer.style.overflow = 'hidden';
    mapContainer.style.position = 'relative';
    mapContainer.style.isolation = 'isolate';

    if (!mapContainer) {
        console.error('No se encontró el contenedor #map.');
        return;
    }

    if (typeof atlas === 'undefined') {
        mapContainer.innerHTML = `
            <div style="padding: 24px; color: #0f172a;">
                <h4>No cargó Azure Maps</h4>
                <p>Revisa que el SDK de Azure Maps esté cargado correctamente.</p>
            </div>
        `;
        return;
    }

    if (!window.AZURE_MAPS_KEY || window.AZURE_MAPS_KEY === 'PEGA_AQUI_TU_AZURE_MAPS_KEY') {
        mapContainer.innerHTML = `
            <div style="padding: 24px; color: #0f172a;">
                <h4>Falta configurar Azure Maps</h4>
                <p>Agrega tu clave en config/settings.py en la variable AZURE_MAPS_KEY.</p>
            </div>
        `;
        return;
    }

    const allowedCountries = ['US', 'MX', 'CO', 'BR', 'DE', 'ES', 'ZA', 'IN', 'AU', 'JP'];

    const map = new atlas.Map('map', {
        center: [0, 15],
        zoom: 1.2,
        pitch: 0,
        bearing: 0,
        style: 'road',
        view: 'Auto',
        showLogo: true,
        showFeedbackLink: false,
        authOptions: {
            authType: 'subscriptionKey',
            subscriptionKey: window.AZURE_MAPS_KEY
        }
    });

    let currentPopup = null;

    map.events.add('ready', function () {
        map.resize();

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

                if (filteredFeatures.length === 0) {
                    console.warn('No hay países disponibles para pintar en el mapa.');
                    return;
                }

                const salesValues = filteredFeatures.map(function (feature) {
                    return Number(feature.properties.total_sales || 0);
                });

                const maxSales = Math.max(...salesValues);

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

                        const minHeight = 28;
                        const maxHeight = 115;

                        let barHeight = minHeight;

                        if (maxSales > 0) {
                            barHeight = Math.round(
                                minHeight + ((totalSales / maxSales) * (maxHeight - minHeight))
                            );
                        }

                        const isPositive = growthValue >= 0;

                        const markerElement = create3DBarMarker({
                            code: properties.code,
                            totalSales: totalSales,
                            barHeight: barHeight,
                            isPositive: isPositive
                        });

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
                                properties,
                                coordinates,
                                totalSales,
                                growthValue,
                                barHeight
                            );

                            currentPopup.open(map);
                        });
                    } catch (markerError) {
                        console.error('Error creando barra 3D:', markerError);
                    }
                });

                map.events.add('click', function () {
                    if (currentPopup) {
                        currentPopup.close();
                    }
                });

                setTimeout(function () {
                    map.resize();
                    map.setCamera({
                        center: [0, 15],
                        zoom: 1.2,
                        pitch: 0
                    });
                }, 600);
            })
            .catch(function (error) {
                console.error('Error cargando datos del mapa:', error);

                mapContainer.innerHTML = `
                    <div style="padding: 24px; color: #0f172a;">
                        <h4>Error cargando datos del mapa</h4>
                        <p>Revisa que /api/sales-geojson/ esté funcionando correctamente.</p>
                    </div>
                `;
            });
    });

    function create3DBarMarker(config) {
        const marker = document.createElement('div');
        marker.style.width = '96px';
        marker.style.display = 'flex';
        marker.style.flexDirection = 'column';
        marker.style.alignItems = 'center';
        marker.style.justifyContent = 'flex-end';
        marker.style.cursor = 'pointer';
        marker.style.userSelect = 'none';
        marker.style.pointerEvents = 'auto';
        marker.style.zIndex = '20';
        marker.style.overflow = 'visible';

        const valueLabel = document.createElement('div');
        valueLabel.textContent = formatCompact(config.totalSales);
        valueLabel.style.marginBottom = '8px';
        valueLabel.style.padding = '5px 10px';
        valueLabel.style.borderRadius = '999px';
        valueLabel.style.background = 'rgba(15, 23, 42, 0.96)';
        valueLabel.style.color = '#f8fafc';
        valueLabel.style.fontSize = '12px';
        valueLabel.style.fontWeight = '800';
        valueLabel.style.lineHeight = '1';
        valueLabel.style.border = '1px solid rgba(255,255,255,0.15)';
        valueLabel.style.boxShadow = '0 8px 18px rgba(0,0,0,0.22)';

        const cylinderWrap = document.createElement('div');
        cylinderWrap.style.position = 'relative';
        cylinderWrap.style.width = '42px';
        cylinderWrap.style.height = `${config.barHeight}px`;
        cylinderWrap.style.display = 'flex';
        cylinderWrap.style.alignItems = 'flex-end';
        cylinderWrap.style.justifyContent = 'center';
        cylinderWrap.style.overflow = 'visible';

        const shadow = document.createElement('div');
        shadow.style.position = 'absolute';
        shadow.style.bottom = '-8px';
        shadow.style.left = '50%';
        shadow.style.transform = 'translateX(-50%)';
        shadow.style.width = '42px';
        shadow.style.height = '12px';
        shadow.style.borderRadius = '50%';
        shadow.style.background = 'rgba(0, 0, 0, 0.18)';
        shadow.style.filter = 'blur(2px)';

        const cylinder = document.createElement('div');
        cylinder.style.position = 'relative';
        cylinder.style.width = '36px';
        cylinder.style.height = `${config.barHeight}px`;
        cylinder.style.borderRadius = '999px';
        cylinder.style.overflow = 'visible';

        const topEllipse = document.createElement('div');
        topEllipse.style.position = 'absolute';
        topEllipse.style.top = '-6px';
        topEllipse.style.left = '0';
        topEllipse.style.width = '36px';
        topEllipse.style.height = '12px';
        topEllipse.style.borderRadius = '50%';

        const highlight = document.createElement('div');
        highlight.style.position = 'absolute';
        highlight.style.top = '8px';
        highlight.style.left = '7px';
        highlight.style.width = '8px';
        highlight.style.height = `${Math.max(config.barHeight - 18, 18)}px`;
        highlight.style.borderRadius = '999px';
        highlight.style.background = 'rgba(255,255,255,0.20)';

        if (config.isPositive) {
            cylinder.style.background =
                'linear-gradient(90deg, #4c1d95 0%, #7c3aed 28%, #c084fc 50%, #8b5cf6 72%, #312e81 100%)';
            cylinder.style.boxShadow =
                'inset -8px 0 12px rgba(0,0,0,0.22), inset 8px 0 12px rgba(255,255,255,0.14), 0 12px 24px rgba(139,92,246,0.35)';
            topEllipse.style.background =
                'radial-gradient(circle at 35% 35%, #f3e8ff 0%, #c084fc 35%, #8b5cf6 70%, #4c1d95 100%)';
        } else {
            cylinder.style.background =
                'linear-gradient(90deg, #581c87 0%, #9333ea 28%, #d8b4fe 50%, #a855f7 72%, #3b0764 100%)';
            cylinder.style.boxShadow =
                'inset -8px 0 12px rgba(0,0,0,0.22), inset 8px 0 12px rgba(255,255,255,0.14), 0 12px 24px rgba(168,85,247,0.35)';
            topEllipse.style.background =
                'radial-gradient(circle at 35% 35%, #faf5ff 0%, #d8b4fe 35%, #a855f7 70%, #581c87 100%)';
        }

        cylinder.appendChild(topEllipse);
        cylinder.appendChild(highlight);
        cylinderWrap.appendChild(shadow);
        cylinderWrap.appendChild(cylinder);

        const codeLabel = document.createElement('div');
        codeLabel.textContent = config.code;
        codeLabel.style.marginTop = '8px';
        codeLabel.style.padding = '5px 9px';
        codeLabel.style.borderRadius = '999px';
        codeLabel.style.background = 'rgba(15, 23, 42, 0.96)';
        codeLabel.style.color = '#f8fafc';
        codeLabel.style.fontSize = '12px';
        codeLabel.style.fontWeight = '900';
        codeLabel.style.lineHeight = '1';
        codeLabel.style.letterSpacing = '0.04em';
        codeLabel.style.border = '1px solid rgba(255,255,255,0.15)';
        codeLabel.style.boxShadow = '0 8px 18px rgba(0,0,0,0.18)';

        marker.appendChild(valueLabel);
        marker.appendChild(cylinderWrap);
        marker.appendChild(codeLabel);

        return marker;
    }

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

    function createPopup(properties, coordinates, totalSales, growthValue, barHeight) {
        const growthText = growthValue >= 0
            ? `+${growthValue.toFixed(2)}%`
            : `${growthValue.toFixed(2)}%`;

        const growthColor = growthValue >= 0 ? '#22c55e' : '#ef4444';

        const popupContent = `
            <div style="
                min-width: 240px;
                padding: 16px;
                color: #f8fafc;
                background: #0f172a;
                border-radius: 18px;
                border: 1px solid rgba(148, 163, 184, 0.25);
                box-shadow: 0 20px 45px rgba(0, 0, 0, 0.4);
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            ">
                <h4 style="margin: 0 0 10px; font-size: 18px;">
                    ${properties.name}
                </h4>

                <p style="margin: 4px 0; color: #cbd5e1;">
                    <strong>Código:</strong> ${properties.code}
                </p>

                <p style="margin: 4px 0; color: #cbd5e1;">
                    <strong>Continente:</strong> ${properties.continent}
                </p>

                <p style="margin: 4px 0; color: #cbd5e1;">
                    <strong>Ventas:</strong> ${formatCurrency(totalSales)}
                </p>

                <p style="margin: 4px 0; color: #cbd5e1;">
                    <strong>Órdenes:</strong> ${properties.total_orders}
                </p>

                <p style="margin: 4px 0 14px; color: ${growthColor};">
                    <strong>Crecimiento:</strong> ${growthText}
                </p>

                <a href="/countries/${properties.code}/" style="
                    display: inline-block;
                    padding: 8px 12px;
                    border-radius: 999px;
                    background: #22c55e;
                    color: #020617;
                    text-decoration: none;
                    font-weight: 800;
                    font-size: 13px;
                ">
                    Ver detalle del país
                </a>
            </div>
        `;

        return new atlas.Popup({
            content: popupContent,
            position: coordinates,
            pixelOffset: [0, -(barHeight + 35)],
            closeButton: true,
            fillColor: '#0f172a'
        });
    }
});