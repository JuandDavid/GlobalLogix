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
        style: "road",
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
    const markerRefs = [];

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
                        const lng = coordinates[0];
                        const lat = coordinates[1];

                        let growthValue = Number(String(properties.growth || 0).replace(",", "."));
                        if (Number.isNaN(growthValue)) growthValue = 0;

                        const minHeight = 12;
                        const maxHeight = 85;
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

                        markerRefs.push({
                            marker: marker,
                            markerElement: markerElement,
                            lat: lat,
                            lng: lng,
                            code: properties.code
                        });

                        markerElement.addEventListener("click", function (event) {
                            event.stopPropagation();

                            if (currentPopup) currentPopup.close();

                            currentPopup = createPopup(
                                properties,
                                coordinates,
                                totalSales,
                                growthValue,
                                barHeight
                            );

                            currentPopup.open(map);

                            setTimeout(function () {
                                bringPopupsToFront();
                            }, 0);
                        });
                    } catch (markerError) {
                        console.error("Error creando barra 3D:", markerError);
                    }
                });

                function updateZIndexes() {
                    const orderedRefs = markerRefs.map(function (ref) {
                        let pixel = null;

                        try {
                            pixel = map.positionsToPixels([[ref.lng, ref.lat]])[0];
                        } catch (error) {
                            pixel = null;
                        }

                        const screenY = pixel ? pixel[1] : 0;

                        return {
                            ref: ref,
                            screenY: screenY
                        };
                    });

                    orderedRefs.sort(function (a, b) {
                        return a.screenY - b.screenY;
                    });

                    orderedRefs.forEach(function (item, index) {
                        const ref = item.ref;
                        const zIndex = 100 + index;

                        const container =
                            ref.markerElement.closest(".maplibregl-marker") ||
                            ref.markerElement.closest(".azure-maps-marker") ||
                            ref.markerElement.parentElement;

                        if (container) {
                            container.style.position = "absolute";
                            container.style.zIndex = String(zIndex);
                            container.style.pointerEvents = "auto";
                        }

                        ref.markerElement.style.zIndex = String(zIndex);
                        ref.markerElement.style.opacity = "1";

                        const visualWrapper = ref.markerElement.querySelector(".bar-visual-wrapper");

                        if (!visualWrapper) return;

                        visualWrapper.dataset.mapScale = "1";

                        if (!visualWrapper.dataset.hovered) {
                            visualWrapper.style.transform = "scale(1)";
                        }
                    });

                    bringPopupsToFront();
                }

                function bringPopupsToFront() {
                    const markerContainers = mapContainer.querySelectorAll(
                        ".maplibregl-marker, .azure-maps-marker, [class*='marker']"
                    );

                    markerContainers.forEach(function (markerContainer) {
                        if (markerContainer.querySelector(".sales-3d-marker")) {
                            markerContainer.style.zIndex = "100";
                        }
                    });

                    const popupElements = document.querySelectorAll(
                        ".atlas-popup, .atlas-popup-content, .atlas-popup-container, [class*='popup']"
                    );

                    popupElements.forEach(function (popupElement) {
                        popupElement.style.position = "absolute";
                        popupElement.style.zIndex = "999999";
                    });

                    const popupContents = document.querySelectorAll(".atlas-popup-content");

                    popupContents.forEach(function (popupContent) {
                        popupContent.style.position = "relative";
                        popupContent.style.zIndex = "1000000";
                    });
                }

                map.events.add("move", updateZIndexes);
                map.events.add("rotate", updateZIndexes);
                map.events.add("pitch", updateZIndexes);
                map.events.add("moveend", updateZIndexes);
                map.events.add("render", updateZIndexes);

                map.events.add("click", function () {
                    if (currentPopup) currentPopup.close();
                });

                updateZIndexes();

                setTimeout(function () {
                    map.resize();

                    map.setCamera({
                        center: [-20, 18],
                        zoom: 1.45,
                        pitch: 0,
                        bearing: 0
                    });

                    updateZIndexes();
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
        marker.className = "sales-3d-marker";
        marker.style.width = "38px";
        marker.style.display = "flex";
        marker.style.alignItems = "flex-end";
        marker.style.justifyContent = "center";
        marker.style.cursor = "pointer";
        marker.style.userSelect = "none";
        marker.style.pointerEvents = "auto";
        marker.style.overflow = "visible";
        marker.style.position = "relative";

        const visualWrapper = document.createElement("div");
        visualWrapper.className = "bar-visual-wrapper";
        visualWrapper.style.width = "38px";
        visualWrapper.style.display = "flex";
        visualWrapper.style.flexDirection = "column";
        visualWrapper.style.alignItems = "center";
        visualWrapper.style.justifyContent = "flex-end";
        visualWrapper.style.transformOrigin = "center bottom";
        visualWrapper.style.transition = "transform 140ms ease, filter 140ms ease";
        visualWrapper.style.overflow = "visible";
        visualWrapper.style.position = "relative";
        visualWrapper.dataset.mapScale = "1";

        const valueLabel = document.createElement("div");
        valueLabel.textContent = formatCompact(config.totalSales);
        valueLabel.style.marginBottom = "6px";
        valueLabel.style.padding = "4px 8px";
        valueLabel.style.borderRadius = "999px";
        valueLabel.style.background = "rgba(15,23,42,0.95)";
        valueLabel.style.color = "#ffffff";
        valueLabel.style.fontSize = "11px";
        valueLabel.style.fontWeight = "800";
        valueLabel.style.lineHeight = "1";
        valueLabel.style.border = "1px solid rgba(255,255,255,0.14)";
        valueLabel.style.boxShadow = "0 5px 10px rgba(0,0,0,0.22)";
        valueLabel.style.whiteSpace = "nowrap";
        valueLabel.style.position = "relative";
        valueLabel.style.zIndex = "10";
        valueLabel.style.pointerEvents = "none";

        const W = 38;
        const H = config.barHeight;
        const rx = W / 2;
        const ry = Math.round(rx * 0.36);
        const uid = Math.random().toString(36).slice(2, 8);
        const bodyColor = config.colors.body;

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", W);
        svg.setAttribute("height", H + ry * 2);
        svg.setAttribute("viewBox", `0 0 ${W} ${H + ry * 2}`);
        svg.style.overflow = "visible";
        svg.style.display = "block";
        svg.style.marginBottom = "0";
        svg.style.position = "relative";
        svg.style.zIndex = "5";

        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

        const bodyGrad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        bodyGrad.setAttribute("id", `bg-${uid}`);
        bodyGrad.setAttribute("x1", "0%");
        bodyGrad.setAttribute("y1", "0%");
        bodyGrad.setAttribute("x2", "100%");
        bodyGrad.setAttribute("y2", "0%");

        [
            { off: "0%", c: "rgba(0,0,0,0.65)" },
            { off: "10%", c: "rgba(0,0,0,0.30)" },
            { off: "22%", c: "rgba(255,255,255,0.70)" },
            { off: "32%", c: "rgba(255,255,255,0.25)" },
            { off: "48%", c: "rgba(0,0,0,0.00)" },
            { off: "68%", c: "rgba(0,0,0,0.30)" },
            { off: "85%", c: "rgba(0,0,0,0.55)" },
            { off: "100%", c: "rgba(0,0,0,0.70)" }
        ].forEach(function (s) {
            const st = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            st.setAttribute("offset", s.off);
            st.setAttribute("stop-color", s.c);
            bodyGrad.appendChild(st);
        });

        const topGrad = document.createElementNS("http://www.w3.org/2000/svg", "radialGradient");
        topGrad.setAttribute("id", `tg-${uid}`);
        topGrad.setAttribute("cx", "40%");
        topGrad.setAttribute("cy", "38%");
        topGrad.setAttribute("r", "60%");
        topGrad.setAttribute("fx", "40%");
        topGrad.setAttribute("fy", "38%");

        [
            { off: "0%", c: "rgba(255,255,255,0.90)" },
            { off: "25%", c: "rgba(255,255,255,0.45)" },
            { off: "55%", c: "rgba(0,0,0,0.00)" },
            { off: "80%", c: "rgba(0,0,0,0.20)" },
            { off: "100%", c: "rgba(0,0,0,0.50)" }
        ].forEach(function (s) {
            const st = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            st.setAttribute("offset", s.off);
            st.setAttribute("stop-color", s.c);
            topGrad.appendChild(st);
        });

        const botGrad = document.createElementNS("http://www.w3.org/2000/svg", "radialGradient");
        botGrad.setAttribute("id", `btg-${uid}`);
        botGrad.setAttribute("cx", "40%");
        botGrad.setAttribute("cy", "40%");
        botGrad.setAttribute("r", "60%");

        [
            { off: "0%", c: "rgba(255,255,255,0.20)" },
            { off: "40%", c: "rgba(0,0,0,0.10)" },
            { off: "100%", c: "rgba(0,0,0,0.55)" }
        ].forEach(function (s) {
            const st = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            st.setAttribute("offset", s.off);
            st.setAttribute("stop-color", s.c);
            botGrad.appendChild(st);
        });

        defs.appendChild(bodyGrad);
        defs.appendChild(topGrad);
        defs.appendChild(botGrad);
        svg.appendChild(defs);

        const baseEllipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        baseEllipse.setAttribute("cx", rx);
        baseEllipse.setAttribute("cy", H + ry);
        baseEllipse.setAttribute("rx", rx);
        baseEllipse.setAttribute("ry", ry);
        baseEllipse.setAttribute("fill", bodyColor);
        baseEllipse.setAttribute("opacity", "0.55");

        const baseOverlay = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        baseOverlay.setAttribute("cx", rx);
        baseOverlay.setAttribute("cy", H + ry);
        baseOverlay.setAttribute("rx", rx);
        baseOverlay.setAttribute("ry", ry);
        baseOverlay.setAttribute("fill", `url(#btg-${uid})`);

        const bodyRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bodyRect.setAttribute("x", "0");
        bodyRect.setAttribute("y", ry);
        bodyRect.setAttribute("width", W);
        bodyRect.setAttribute("height", H);
        bodyRect.setAttribute("fill", bodyColor);

        const bodyOverlay = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bodyOverlay.setAttribute("x", "0");
        bodyOverlay.setAttribute("y", ry);
        bodyOverlay.setAttribute("width", W);
        bodyOverlay.setAttribute("height", H);
        bodyOverlay.setAttribute("fill", `url(#bg-${uid})`);

        const topEllipseBase = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        topEllipseBase.setAttribute("cx", rx);
        topEllipseBase.setAttribute("cy", ry);
        topEllipseBase.setAttribute("rx", rx);
        topEllipseBase.setAttribute("ry", ry);
        topEllipseBase.setAttribute("fill", bodyColor);

        const topEllipseOverlay = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        topEllipseOverlay.setAttribute("cx", rx);
        topEllipseOverlay.setAttribute("cy", ry);
        topEllipseOverlay.setAttribute("rx", rx);
        topEllipseOverlay.setAttribute("ry", ry);
        topEllipseOverlay.setAttribute("fill", `url(#tg-${uid})`);

        svg.appendChild(baseEllipse);
        svg.appendChild(baseOverlay);
        svg.appendChild(bodyRect);
        svg.appendChild(bodyOverlay);
        svg.appendChild(topEllipseBase);
        svg.appendChild(topEllipseOverlay);

        const codeLabel = document.createElement("div");
        codeLabel.textContent = config.code;
        codeLabel.style.position = "absolute";
        codeLabel.style.left = "50%";
        codeLabel.style.bottom = "-26px";
        codeLabel.style.transform = "translateX(-50%)";
        codeLabel.style.padding = "4px 7px";
        codeLabel.style.borderRadius = "999px";
        codeLabel.style.background = "rgba(15,23,42,0.95)";
        codeLabel.style.color = "#ffffff";
        codeLabel.style.fontSize = "10px";
        codeLabel.style.fontWeight = "900";
        codeLabel.style.lineHeight = "1";
        codeLabel.style.letterSpacing = "0.04em";
        codeLabel.style.border = "1px solid rgba(255,255,255,0.12)";
        codeLabel.style.boxShadow = "0 5px 10px rgba(0,0,0,0.18)";
        codeLabel.style.whiteSpace = "nowrap";
        codeLabel.style.zIndex = "20";
        codeLabel.style.pointerEvents = "none";

        visualWrapper.appendChild(valueLabel);
        visualWrapper.appendChild(svg);
        visualWrapper.appendChild(codeLabel);
        marker.appendChild(visualWrapper);

        marker.addEventListener("mouseenter", function () {
            const baseScale = Number(visualWrapper.dataset.mapScale || 1);
            visualWrapper.dataset.hovered = "true";
            visualWrapper.style.transform = `scale(${(baseScale * 1.06).toFixed(4)}) translateY(-3px)`;
            visualWrapper.style.filter = "brightness(1.12)";
        });

        marker.addEventListener("mouseleave", function () {
            const baseScale = Number(visualWrapper.dataset.mapScale || 1);
            delete visualWrapper.dataset.hovered;
            visualWrapper.style.transform = `scale(${baseScale.toFixed(4)})`;
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
            pixelOffset: [0, -(barHeight + 45)],
            closeButton: true,
            fillColor: "#0f172a"
        });
    }
});