document.addEventListener('DOMContentLoaded', function () {
    const dashboardSalesCanvas = document.getElementById('salesChart');
    const countrySalesCanvas = document.getElementById('countrySalesChart');

    if (dashboardSalesCanvas) {
        loadDashboardSalesChart();
    }

    if (countrySalesCanvas) {
        const countryCode = countrySalesCanvas.dataset.countryCode;

        if (!countryCode) {
            console.error('No se encontró el código del país en el canvas.');
            showChartError('No se encontró el código del país.');
            return;
        }

        if (typeof Chart === 'undefined') {
            console.error('Chart.js no está cargado.');
            showChartError('Chart.js no está cargado correctamente.');
            return;
        }

        loadCountrySalesChart(countryCode);
    }
});


function loadDashboardSalesChart() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js no está cargado.');
        return;
    }

    fetch('/api/dashboard/sales-by-country/')
        .then(function (response) {
            if (!response.ok) {
                throw new Error('No se pudo cargar el endpoint de ventas por país.');
            }

            return response.json();
        })
        .then(function (data) {
            renderDashboardSalesChart(data);
        })
        .catch(function (error) {
            console.error('Error cargando gráfica global:', error);
        });
}


function renderDashboardSalesChart(data) {
    const chartCanvas = document.getElementById('salesChart');

    if (!chartCanvas) {
        return;
    }

    const context = chartCanvas.getContext('2d');

    new Chart(context, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Ventas totales por país',
                    data: data.values,
                    countryCodes: data.codes,
                    backgroundColor: 'rgba(56, 189, 248, 0.35)',
                    borderColor: '#38bdf8',
                    borderWidth: 2,
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,

            onClick: function (event, elements, chart) {
                if (elements.length === 0) {
                    return;
                }

                const index = elements[0].index;
                const countryCode = chart.data.datasets[0].countryCodes[index];

                if (countryCode) {
                    window.location.href = `/countries/${countryCode}/`;
                }
            },

            onHover: function (event, elements) {
                const canvas = event.native.target;

                if (elements.length > 0) {
                    canvas.style.cursor = 'pointer';
                } else {
                    canvas.style.cursor = 'default';
                }
            },

            plugins: {
                legend: {
                    labels: {
                        color: '#e5e7eb'
                    }
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function () {
                            return 'Clic para ver detalle del país';
                        },
                        label: function (context) {
                            const value = context.raw || 0;

                            const formattedValue = new Intl.NumberFormat('es-CO', {
                                style: 'currency',
                                currency: 'COP',
                                maximumFractionDigits: 0
                            }).format(value);

                            return `Ventas: ${formattedValue}`;
                        }
                    }
                }
            },

            scales: {
                x: {
                    ticks: {
                        color: '#94a3b8',
                        maxRotation: 45,
                        minRotation: 30
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.10)'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8',
                        callback: function (value) {
                            return new Intl.NumberFormat('es-CO', {
                                notation: 'compact',
                                compactDisplay: 'short'
                            }).format(value);
                        }
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.12)'
                    }
                }
            }
        }
    });
}


function loadCountrySalesChart(countryCode) {
    fetch(`/api/countries/${countryCode}/sales-chart/`)
        .then(function (response) {
            if (!response.ok) {
                throw new Error('No se pudo cargar el endpoint de ventas mensuales.');
            }

            return response.json();
        })
        .then(function (data) {
            renderCountrySalesChart(data);
        })
        .catch(function (error) {
            console.error('Error cargando la gráfica:', error);
            showChartError('No se pudo cargar la gráfica de ventas mensuales.');
        });
}


function renderCountrySalesChart(data) {
    const chartCanvas = document.getElementById('countrySalesChart');

    if (!chartCanvas) {
        return;
    }

    const context = chartCanvas.getContext('2d');

    new Chart(context, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: `Ventas mensuales - ${data.country}`,
                    data: data.values,
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.16)',
                    pointBackgroundColor: '#22c55e',
                    pointBorderColor: '#ffffff',
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    borderWidth: 3,
                    tension: 0.35,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    labels: {
                        color: '#e5e7eb',
                        font: {
                            size: 13
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.raw || 0;

                            const formattedValue = new Intl.NumberFormat('es-CO', {
                                style: 'currency',
                                currency: 'COP',
                                maximumFractionDigits: 0
                            }).format(value);

                            return `Ventas: ${formattedValue}`;
                        }
                    }
                }
            },

            scales: {
                x: {
                    ticks: {
                        color: '#94a3b8'
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.12)'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8',
                        callback: function (value) {
                            return new Intl.NumberFormat('es-CO', {
                                notation: 'compact',
                                compactDisplay: 'short'
                            }).format(value);
                        }
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.12)'
                    }
                }
            }
        }
    });
}


function showChartError(message) {
    const chartContainer = document.querySelector('.country-chart-container');

    if (!chartContainer) {
        return;
    }

    chartContainer.innerHTML = `
        <div class="chart-error-message">
            <h4>No se pudo mostrar la gráfica</h4>
            <p>${message}</p>
        </div>
    `;
}