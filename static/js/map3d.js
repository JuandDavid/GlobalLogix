document.addEventListener("DOMContentLoaded", function () {
    const mapContainer = document.getElementById("map");

    if (!mapContainer) {
        console.error("No se encontró el contenedor #map.");
        return;
    }

    mapContainer.style.overflow = "hidden";
    mapContainer.style.position = "relative";
    mapContainer.style.isolation = "isolate";

    if (typeof atlas === "undefined") {
        mapContainer.innerHTML = `
            <div class="map-error">
                <h4>No cargó Azure Maps</h4>
                <p>Revisa que el SDK de Azure Maps esté cargado correctamente.</p>
            </div>
        `;
        return;
    }

    if (!window.AZURE_MAPS_KEY || window.AZURE_MAPS_KEY === "PEGA_AQUI_TU_AZURE_MAPS_KEY") {
        mapContainer.innerHTML = `
            <div class="map-error">
                <h4>Falta configurar Azure Maps</h4>
                <p>Agrega tu clave real en el archivo .env.</p>
            </div>
        `;
        return;
    }

    const allowedCountries = ["US", "MX", "CO", "BR", "DE", "ES", "ZA", "IN", "AU", "JP"];

    const countryColors = {
        US: { body: "#2f80ed", top: "#5fa8ff", glow: "rgba(47, 128, 237, 0.22)" },
        MX: { body: "#27ae60", top: "#58d68d", glow: "rgba(39, 174, 96, 0.22)" },
        CO: { body: "#d4ac0d", top: "#f4d03f", glow: "rgba(212, 172, 13, 0.22)" },
        BR: { body: "#a64dff", top: "#c084fc", glow: "rgba(166, 77, 255, 0.22)" },
        DE: { body: "#3b82f6", top: "#7fb3ff", glow: "rgba(59, 130, 246, 0.22)" },
        ES: { body: "#f39c12", top: "#f8c471", glow: "rgba(243, 156, 18, 0.22)" },
        ZA: { body: "#e74c3c", top: "#f1948a", glow: "rgba(231, 76, 60, 0.22)" },
        IN: { body: "#c039f3", top: "#d988ff", glow: "rgba(192, 57, 243, 0.22)" },
        AU: { body: "#16a085", top: "#48c9b0", glow: "rgba(22, 160, 133, 0.22)" },
        JP: { body: "#e91e63", top: "#f48fb1", glow: "rgba(233, 30, 99, 0.22)" }
    };

    const defaultColor = {
        body: "#8e44ad",
        top: "#c39bd3",
        glow: "rgba(142, 68, 173, 0.22)"
    };

    const map = new atlas.Map("map", {
        center: [-20, 18],
        zoom: 1.45,
        pitch: 0,
        bearing: 0,
        style: "grayscale_light",
        language: "es-ES",
        view: "Auto",
        showLogo: true,
        showFeedbackLink: false,
        authOptions: {
            authType: "subscriptionKey",
            subscriptionKey: window.AZURE_MAPS_KEY
        }
    });

    let currentPopup = null;

    map.events.add("ready", function () {
        map.resize();

        fetch("/api/sales-geojson/")
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("No se pudo obtener el GeoJSON de ventas.");
                }
                return response.json();
            })
            .then(function (data) {
                const filteredFeatures = (data.features || []).filter(function (feature) {
                    return allowedCountries.includes(feature.properties.code);
                });

                if (filteredFeatures.length === 0) {
                    console.warn("No hay países disponibles para pintar en el mapa.");
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

                        let growthValue = Number(String(properties.growth || 0).replace(",", "."));

                        if (Number.isNaN(growthValue)) {
                            growthValue = 0;
                        }

                        const minHeight = 18;
                        const maxHeight = 120;

                        let barHeight = minHeight;

                        if (maxSales > 0) {
                            barHeight = Math.round(
                                minHeight + ((totalSales / maxSales) * (maxHeight - minHeight))
                            );
                        }

                        const markerElement = create3DBarMarker({
                            code: properties.code,
                            totalSales: totalSales,
                            barHeight: barHeight,
                            colors: countryColors[properties.code] || defaultColor
                        });

                        const marker = new atlas.HtmlMarker({
                            position: coordinates,
                            htmlContent: markerElement,
                            anchor: "bottom"
                        });

                        map.markers.add(marker);

                        markerElement.addEventListener("click", function (event) {
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
                        console.error("Error creando barra 3D:", markerError);
                    }
                });

                map.events.add("click", function () {
                    if (currentPopup) {
                        currentPopup.close();
                    }
                });

                setTimeout(function () {
                    map.resize();
                    map.setCamera({
                        center: [-20, 18],
                        zoom: 1.45,
                        pitch: 0,
                        bearing: 0
                    });
                }, 600);
            })
            .catch(function (error) {
                console.error("Error cargando datos del mapa:", error);

                mapContainer.innerHTML = `
                    <div class="map-error">
                        <h4>Error cargando datos del mapa</h4>
                        <p>Revisa que /api/sales-geojson/ esté funcionando correctamente.</p>
                    </div>
                `;
            });
    });

    function create3DBarMarker(config) {
        const marker = document.createElement("div");
        marker.style.width = "56px";
        marker.style.display = "flex";
        marker.style.alignItems = "flex-end";
        marker.style.justifyContent = "center";
        marker.style.cursor = "pointer";
        marker.style.userSelect = "none";
        marker.style.pointerEvents = "auto";
        marker.style.overflow = "visible";

        const visualWrapper = document.createElement("div");
        visualWrapper.style.width = "56px";
        visualWrapper.style.display = "flex";
        visualWrapper.style.flexDirection = "column";
        visualWrapper.style.alignItems = "center";
        visualWrapper.style.justifyContent = "flex-end";
        visualWrapper.style.transformOrigin = "center bottom";
        visualWrapper.style.transition = "transform 140ms ease, filter 140ms ease";

        // Número de ventas arriba
        const valueLabel = document.createElement("div");
        valueLabel.textContent = formatCompact(config.totalSales);
        valueLabel.style.marginBottom = "5px";
        valueLabel.style.padding = "4px 8px";
        valueLabel.style.borderRadius = "999px";
        valueLabel.style.background = "rgba(15, 23, 42, 0.95)";
        valueLabel.style.color = "#f8fafc";
        valueLabel.style.fontSize = "11px";
        valueLabel.style.fontWeight = "800";
        valueLabel.style.lineHeight = "1";
        valueLabel.style.border = "1px solid rgba(255,255,255,0.14)";
        valueLabel.style.boxShadow = "0 5px 10px rgba(0,0,0,0.20)";
        valueLabel.style.whiteSpace = "nowrap";

        // Contenedor de la barra
        const barScene = document.createElement("div");
        barScene.style.position = "relative";
        barScene.style.width = "24px";
        barScene.style.height = `${config.barHeight}px`;
        barScene.style.display = "flex";
        barScene.style.alignItems = "flex-end";
        barScene.style.justifyContent = "center";
        barScene.style.overflow = "visible";

        // Sombra sobre el mapa
        const groundShadow = document.createElement("div");
        groundShadow.style.position = "absolute";
        groundShadow.style.left = "50%";
        groundShadow.style.bottom = "-6px";
        groundShadow.style.transform = "translateX(-50%)";
        groundShadow.style.width = "24px";
        groundShadow.style.height = "8px";
        groundShadow.style.borderRadius = "50%";
        groundShadow.style.background = "rgba(0, 0, 0, 0.20)";
        groundShadow.style.filter = "blur(1.5px)";
        groundShadow.style.zIndex = "0";

        // Cuerpo RECTO del cilindro, no cápsula
        const barBody = document.createElement("div");
        barBody.style.position = "absolute";
        barBody.style.left = "50%";
        barBody.style.bottom = "0";
        barBody.style.transform = "translateX(-50%)";
        barBody.style.width = "16px";
        barBody.style.height = `${config.barHeight}px`;
        barBody.style.borderRadius = "0";
        barBody.style.overflow = "hidden";
        barBody.style.zIndex = "2";

        /*
            Esta es la clave:
            cuerpo con lados rectos + degradado lateral.
            Ya NO usamos border-radius gigante.
        */
        barBody.style.background = `
        linear-gradient(
            90deg,
            rgba(0,0,0,0.34) 0%,
            rgba(255,255,255,0.22) 18%,
            rgba(255,255,255,0.08) 36%,
            rgba(0,0,0,0.08) 68%,
            rgba(0,0,0,0.30) 100%
        ),
        ${config.colors.body}
    `;

        barBody.style.boxShadow = `
        inset -3px 0 5px rgba(0,0,0,0.30),
        inset 2px 0 4px rgba(255,255,255,0.14),
        0 5px 9px rgba(0,0,0,0.18)
    `;

        // Franja de luz vertical, como en columnas 3D reales
        const lightStripe = document.createElement("div");
        lightStripe.style.position = "absolute";
        lightStripe.style.top = "0";
        lightStripe.style.left = "4px";
        lightStripe.style.width = "3px";
        lightStripe.style.height = "100%";
        lightStripe.style.background = "rgba(255,255,255,0.22)";
        lightStripe.style.filter = "blur(0.3px)";
        lightStripe.style.zIndex = "3";

        // Sombra lateral derecha
        const darkStripe = document.createElement("div");
        darkStripe.style.position = "absolute";
        darkStripe.style.top = "0";
        darkStripe.style.right = "0";
        darkStripe.style.width = "4px";
        darkStripe.style.height = "100%";
        darkStripe.style.background = "rgba(0,0,0,0.22)";
        darkStripe.style.zIndex = "3";

        // Tapa superior elíptica, como el ejemplo
        const topCap = document.createElement("div");
        topCap.style.position = "absolute";
        topCap.style.left = "50%";
        topCap.style.top = "-5px";
        topCap.style.transform = "translateX(-50%)";
        topCap.style.width = "20px";
        topCap.style.height = "10px";
        topCap.style.borderRadius = "50%";
        topCap.style.zIndex = "5";
        topCap.style.background = `
        radial-gradient(
            ellipse at 35% 30%,
            rgba(255,255,255,0.45) 0%,
            rgba(255,255,255,0.18) 28%,
            rgba(0,0,0,0.04) 58%,
            rgba(0,0,0,0.20) 100%
        ),
        ${config.colors.top}
    `;
        topCap.style.boxShadow = `
        inset 0 -2px 3px rgba(0,0,0,0.26),
        0 2px 4px rgba(0,0,0,0.16)
    `;

        // Borde inferior elíptico, sutil
        const bottomCap = document.createElement("div");
        bottomCap.style.position = "absolute";
        bottomCap.style.left = "50%";
        bottomCap.style.bottom = "-5px";
        bottomCap.style.transform = "translateX(-50%)";
        bottomCap.style.width = "20px";
        bottomCap.style.height = "10px";
        bottomCap.style.borderRadius = "50%";
        bottomCap.style.zIndex = "1";
        bottomCap.style.background = `
        linear-gradient(
            90deg,
            rgba(0,0,0,0.32) 0%,
            rgba(255,255,255,0.08) 35%,
            rgba(0,0,0,0.30) 100%
        ),
        ${config.colors.body}
    `;
        bottomCap.style.filter = "brightness(0.76)";
        bottomCap.style.boxShadow = "0 2px 4px rgba(0,0,0,0.18)";

        barBody.appendChild(lightStripe);
        barBody.appendChild(darkStripe);

        barScene.appendChild(groundShadow);
        barScene.appendChild(bottomCap);
        barScene.appendChild(barBody);
        barScene.appendChild(topCap);

        // Código del país abajo
        const codeLabel = document.createElement("div");
        codeLabel.textContent = config.code;
        codeLabel.style.marginTop = "8px";
        codeLabel.style.padding = "4px 7px";
        codeLabel.style.borderRadius = "999px";
        codeLabel.style.background = "rgba(15, 23, 42, 0.95)";
        codeLabel.style.color = "#f8fafc";
        codeLabel.style.fontSize = "10px";
        codeLabel.style.fontWeight = "900";
        codeLabel.style.lineHeight = "1";
        codeLabel.style.letterSpacing = "0.04em";
        codeLabel.style.border = "1px solid rgba(255,255,255,0.12)";
        codeLabel.style.boxShadow = "0 5px 10px rgba(0,0,0,0.18)";
        codeLabel.style.whiteSpace = "nowrap";

        visualWrapper.appendChild(valueLabel);
        visualWrapper.appendChild(barScene);
        visualWrapper.appendChild(codeLabel);

        marker.appendChild(visualWrapper);

        marker.addEventListener("mouseenter", function () {
            visualWrapper.style.transform = "scale(1.025)";
            visualWrapper.style.filter = "brightness(1.04)";
        });

        marker.addEventListener("mouseleave", function () {
            visualWrapper.style.transform = "scale(1)";
            visualWrapper.style.filter = "brightness(1)";
        });

        return marker;
    }

    function formatCompact(value) {
        const numericValue = Number(value || 0);

        if (numericValue >= 1000000) {
            return (numericValue / 1000000).toFixed(1).replace(".0", "") + "M";
        }

        if (numericValue >= 1000) {
            return Math.round(numericValue / 1000) + "k";
        }

        return numericValue.toString();
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0
        }).format(Number(value || 0));
    }

    function createPopup(properties, coordinates, totalSales, growthValue, barHeight) {
        const growthText = growthValue >= 0
            ? `+${growthValue.toFixed(2)}%`
            : `${growthValue.toFixed(2)}%`;

        const popupContent = `
            <div class="map-popup">
                <h4>${properties.name}</h4>
                <p><strong>Código:</strong> ${properties.code}</p>
                <p><strong>Continente:</strong> ${properties.continent}</p>
                <p><strong>Ventas:</strong> ${formatCurrency(totalSales)}</p>
                <p><strong>Órdenes:</strong> ${properties.total_orders}</p>
                <p><strong>Crecimiento:</strong> ${growthText}</p>
                <a href="/countries/${properties.code}/">Ver detalle del país</a>
            </div>
        `;

        return new atlas.Popup({
            content: popupContent,
            position: coordinates,
            pixelOffset: [0, -(barHeight + 35)],
            closeButton: true,
            fillColor: "#0f172a"
        });
    }
});