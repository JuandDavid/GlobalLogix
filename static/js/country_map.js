document.addEventListener("DOMContentLoaded", function () {
    const mapContainer = document.getElementById("countryDetailMap");

    if (!mapContainer) {
        return;
    }

    mapContainer.style.overflow = "hidden";
    mapContainer.style.position = "relative";
    mapContainer.style.isolation = "isolate";

    if (typeof atlas === "undefined") {
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

    const countryName = mapContainer.dataset.countryName || "País";
    const countryCode = mapContainer.dataset.countryCode || "N/A";
    const continent = mapContainer.dataset.countryContinent || "Sin continente";

    const latitude = parseFloat(mapContainer.dataset.countryLatitude);
    const longitude = parseFloat(mapContainer.dataset.countryLongitude);

    const totalSales = Number(mapContainer.dataset.totalSales || 0);
    const totalOrders = Number(mapContainer.dataset.totalOrders || 0);
    const growth = Number(
        String(mapContainer.dataset.growth || 0).replace(",", ".")
    );

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

    let currentPopup = null;
    const markerRefs = [];

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        mapContainer.innerHTML = `
            <div class="placeholder-content">
                <h4>No se pudieron leer las coordenadas</h4>
                <p>Revisa que el país tenga latitude y longitude en la base de datos.</p>
            </div>
        `;
        return;
    }

    const currencyFormatter = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    });

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
        return currencyFormatter.format(Number(value || 0));
    }

    function formatGrowth(value) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) {
            return "Sin dato";
        }

        const numericValue = Number(value);

        return numericValue >= 0
            ? `+${numericValue.toFixed(2)}%`
            : `${numericValue.toFixed(2)}%`;
    }

    function buildCountryPopupContent() {
        const growthText = formatGrowth(growth);

        return `
            <div class="map-popup">
                <h4>${countryName}</h4>
                <p><strong>Código:</strong> ${countryCode}</p>
                <p><strong>Continente:</strong> ${continent}</p>
                <p><strong>Ventas país:</strong> ${formatCurrency(totalSales)}</p>
                <p><strong>Órdenes:</strong> ${totalOrders}</p>
                <p><strong>Crecimiento:</strong> ${growthText}</p>
            </div>
        `;
    }

    function createSalesPointPopup(point, coordinates, barHeight) {
        const growthText = formatGrowth(point.growth);
        const topProduct = point.top_product || "Sin dato";

        const popupContent = `
            <div class="map-popup">
                <h4>${point.name}</h4>
                <p><strong>Ciudad:</strong> ${point.city}</p>
                <p><strong>País:</strong> ${point.country}</p>
                <p><strong>Ventas:</strong> ${formatCurrency(point.total_sales)}</p>
                <p><strong>Órdenes:</strong> ${point.total_orders}</p>
                <p><strong>Producto líder:</strong> ${topProduct}</p>
                <p><strong>Crecimiento:</strong> ${growthText}</p>
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

    function updateZIndexes(map) {
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

            if (!visualWrapper) {
                return;
            }

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

    function loadSalesPoints(map) {
        const endpoint = `/api/countries/${countryCode}/sales-points/`;

        fetch(endpoint)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error(`No se pudo cargar el endpoint ${endpoint}`);
                }

                return response.json();
            })
            .then(function (data) {
                const points = Array.isArray(data.points) ? data.points : [];

                if (!points.length) {
                    console.warn("No hay puntos de venta para este país.");
                    return;
                }

                const salesValues = points.map(function (point) {
                    return Number(point.total_sales || 0);
                });

                const maxSales = Math.max(...salesValues);

                points.forEach(function (point) {
                    try {
                        const pointLatitude = Number(point.latitude);
                        const pointLongitude = Number(point.longitude);

                        if (
                            Number.isNaN(pointLatitude) ||
                            Number.isNaN(pointLongitude)
                        ) {
                            return;
                        }

                        const totalSalesPoint = Number(point.total_sales || 0);

                        const minHeight = 10;
                        const maxHeight = 60;
                        let barHeight = minHeight;

                        if (maxSales > 0) {
                            barHeight = Math.round(
                                minHeight + ((totalSalesPoint / maxSales) * (maxHeight - minHeight))
                            );
                        }

                        const cityCode = String(point.city || "PV")
                            .substring(0, 3)
                            .toUpperCase();

                        const coordinates = [pointLongitude, pointLatitude];

                        const markerElement = create3DBarMarker({
                            code: cityCode,
                            totalSales: totalSalesPoint,
                            barHeight: barHeight,
                            colors: countryColors[countryCode] || defaultColor
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
                            lat: pointLatitude,
                            lng: pointLongitude,
                            code: cityCode
                        });

                        markerElement.addEventListener("click", function (event) {
                            event.stopPropagation();

                            if (currentPopup) {
                                currentPopup.close();
                            }

                            currentPopup = createSalesPointPopup(
                                point,
                                coordinates,
                                barHeight
                            );

                            currentPopup.open(map);

                            setTimeout(function () {
                                bringPopupsToFront();
                            }, 0);
                        });
                    } catch (markerError) {
                        console.error("Error creando barra 3D del punto de venta:", markerError);
                    }
                });

                updateZIndexes(map);
            })
            .catch(function (error) {
                console.error("Error cargando puntos de venta:", error);
            });
    }

    const map = new atlas.Map("countryDetailMap", {
        center: [longitude, latitude],
        zoom: 3.2,
        pitch: 35,
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

    map.events.add("ready", function () {
        map.resize();

        const dataSource = new atlas.source.DataSource();
        map.sources.add(dataSource);

        const countryPoint = new atlas.Shape(
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

        dataSource.add(countryPoint);

        const dynamicRadius = Math.max(
            24,
            Math.min(58, totalSales / 12000)
        );

        const bubbleLayer = new atlas.layer.BubbleLayer(
            dataSource,
            "country-detail-bubble-layer",
            {
                radius: dynamicRadius,
                color: "#0078D4",
                strokeColor: "#ffffff",
                strokeWidth: 3,
                opacity: 0.55
            }
        );

        const symbolLayer = new atlas.layer.SymbolLayer(
            dataSource,
            "country-detail-symbol-layer",
            {
                iconOptions: {
                    image: "none"
                },
                textOptions: {
                    textField: ["get", "code"],
                    color: "#ffffff",
                    haloColor: "#0f172a",
                    haloWidth: 2,
                    size: 20,
                    font: ["SegoeUi-Bold"]
                }
            }
        );

        map.layers.add([bubbleLayer, symbolLayer]);

        const countryPopup = new atlas.Popup({
            content: buildCountryPopupContent(),
            position: [longitude, latitude],
            pixelOffset: [0, -(dynamicRadius + 12)],
            closeButton: true,
            fillColor: "#0f172a"
        });

        map.events.add("click", bubbleLayer, function () {
            if (currentPopup) {
                currentPopup.close();
            }

            currentPopup = countryPopup;
            currentPopup.open(map);

            setTimeout(function () {
                bringPopupsToFront();
            }, 0);
        });

        loadSalesPoints(map);

        map.events.add("move", function () {
            updateZIndexes(map);
        });

        map.events.add("rotate", function () {
            updateZIndexes(map);
        });

        map.events.add("pitch", function () {
            updateZIndexes(map);
        });

        map.events.add("moveend", function () {
            updateZIndexes(map);
        });

        map.events.add("render", function () {
            updateZIndexes(map);
        });

        map.events.add("click", function () {
            if (currentPopup) {
                currentPopup.close();
                currentPopup = null;
            }
        });

        setTimeout(function () {
            map.setCamera({
                center: [longitude, latitude],
                zoom: 5.4,
                pitch: 35,
                bearing: -10,
                type: "fly",
                duration: 2400
            });

            updateZIndexes(map);
        }, 700);
    });
});