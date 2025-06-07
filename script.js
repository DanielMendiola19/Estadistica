// Variables globales
let regressionChart = null;
let currentModel = null;
let regressionParams = null;

// Función para añadir una nueva fila a la tabla
function addRow() {
    const table = document.getElementById('data-table').getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();
    
    const cell1 = newRow.insertCell(0);
    const cell2 = newRow.insertCell(1);
    const cell3 = newRow.insertCell(2);
    
    cell1.innerHTML = '<input type="number" class="x-input" step="any">';
    cell2.innerHTML = '<input type="number" class="y-input" step="any">';
    cell3.innerHTML = '<button onclick="removeRow(this)">Eliminar</button>';
}

// Función para eliminar una fila
function removeRow(button) {
    const row = button.parentNode.parentNode;
    const table = document.getElementById('data-table').getElementsByTagName('tbody')[0];
    
    if (table.rows.length > 1) {
        row.parentNode.removeChild(row);
    } else {
        // Si es la última fila, simplemente limpiar los inputs
        const inputs = row.getElementsByTagName('input');
        inputs[0].value = '';
        inputs[1].value = '';
    }
}

// Función para limpiar todos los datos
function clearData() {
    const table = document.getElementById('data-table').getElementsByTagName('tbody')[0];
    table.innerHTML = '';
    addRow(); // Añadir una fila vacía
    
    document.getElementById('results-container').innerHTML = 
        '<p>Ingrese los datos y haga clic en "Calcular Regresión" para ver los resultados.</p>';
    
    if (regressionChart) {
        regressionChart.destroy();
        regressionChart = null;
    }
    
    document.getElementById('projection-result').innerHTML = '';
}

// Función para obtener los datos de la tabla
function getData() {
    const xInputs = document.getElementsByClassName('x-input');
    const yInputs = document.getElementsByClassName('y-input');
    
    const data = [];
    
    for (let i = 0; i < xInputs.length; i++) {
        const x = parseFloat(xInputs[i].value);
        const y = parseFloat(yInputs[i].value);
        
        if (!isNaN(x) && !isNaN(y)) {
            data.push({x: x, y: y});
        }
    }
    
    return data;
}

// Función para calcular la regresión lineal
function linearRegression(x, y) {
    const n = x.length;
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
        sumX += x[i];
        sumY += y[i];
        sumXY += x[i] * y[i];
        sumX2 += x[i] * x[i];
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope: slope, intercept: intercept };
}

// Función para calcular la regresión exponencial (y = ae^(bx))
function exponentialRegression(data) {
    // Transformación lineal: ln(y) = ln(a) + bx
    const x = data.map(point => point.x);
    const y = data.map(point => Math.log(point.y));
    
    const { slope, intercept } = linearRegression(x, y);
    
    const a = Math.exp(intercept);
    const b = slope;
    
    return { a: a, b: b };
}

// Función para calcular la regresión de potencia (y = ax^b)
function powerRegression(data) {
    // Transformación lineal: ln(y) = ln(a) + b·ln(x)
    const x = data.map(point => Math.log(point.x));
    const y = data.map(point => Math.log(point.y));
    
    const { slope, intercept } = linearRegression(x, y);
    
    const a = Math.exp(intercept);
    const b = slope;
    
    return { a: a, b: b };
}

// Función para calcular la regresión logarítmica (y = a + b·ln(x))
function logarithmicRegression(data) {
    // Transformación: x' = ln(x)
    const x = data.map(point => Math.log(point.x));
    const y = data.map(point => point.y);
    
    const { slope, intercept } = linearRegression(x, y);
    
    return { a: intercept, b: slope };
}

// Función para calcular la regresión polinomial (y = ax² + bx + c)
function polynomialRegression(data, degree = 2) {
    const x = data.map(point => point.x);
    const y = data.map(point => point.y);
    const n = x.length;
    
    // Crear matriz de diseño
    let X = [];
    for (let i = 0; i < n; i++) {
        let row = [];
        for (let j = 0; j <= degree; j++) {
            row.push(Math.pow(x[i], j));
        }
        X.push(row);
    }
    
    // Convertir a matriz math.js
    const Xm = math.matrix(X);
    const Ym = math.matrix(y);
    
    // Calcular (X'X)^-1 X'Y
    const Xt = math.transpose(Xm);
    const XtX = math.multiply(Xt, Xm);
    const XtXinv = math.inv(XtX);
    const XtY = math.multiply(Xt, Ym);
    const beta = math.multiply(XtXinv, XtY);
    
    // Convertir coeficientes a array
    const coefficients = beta.toArray();
    
    return coefficients.reverse(); // [c, b, a] para ax² + bx + c
}

// Función para calcular métricas de evaluación
function calculateMetrics(data, predictFn) {
    const n = data.length;
    let sse = 0; // Suma de cuadrados de los errores
    let sst = 0; // Suma total de cuadrados
    let mae = 0; // Error absoluto medio
    let meanY = 0;
    
    // Calcular media de Y
    for (let i = 0; i < n; i++) {
        meanY += data[i].y;
    }
    meanY /= n;
    
    // Calcular SSE, SST y MAE
    for (let i = 0; i < n; i++) {
        const predicted = predictFn(data[i].x);
        const error = data[i].y - predicted;
        
        sse += error * error;
        sst += (data[i].y - meanY) * (data[i].y - meanY);
        mae += Math.abs(error);
    }
    
    const mse = sse / n; // Error cuadrático medio
    mae = mae / n;       // Error absoluto medio
    const r2 = 1 - (sse / sst); // Coeficiente de determinación
    const ser = Math.sqrt(sse / (n - 2)); // Error estándar de la regresión
    
    return {
        mse: mse,
        mae: mae,
        r2: r2,
        ser: ser
    };
}

// Función principal para calcular la regresión
function calculateRegression() {
    const x = inputX.map(Number);
    const y = inputY.map(Number);
    const regressionType = document.getElementById("regressionType").value;

    let params = {};
    let predictFn;
    let r2 = 0;

    switch (regressionType) {
        case 'exponential':
            const lnY = y.map(val => Math.log(val));
            const sumLnY = lnY.reduce((a, b) => a + b, 0);
            const sumXlnY = x.reduce((acc, val, i) => acc + val * lnY[i], 0);
            const sumX = x.reduce((a, b) => a + b, 0);
            const sumXX = x.reduce((acc, val) => acc + val * val, 0);
            const n = x.length;
            const b_exp = (n * sumXlnY - sumX * sumLnY) / (n * sumXX - sumX * sumX);
            const a_exp = (sumLnY - b_exp * sumX) / n;
            params.a = Math.exp(a_exp);
            params.b = b_exp;
            predictFn = x => params.a * Math.exp(params.b * x);
            break;

        case 'power':
            const lnX = x.map(val => Math.log(val));
            const lnY_power = y.map(val => Math.log(val));
            const sumLnX = lnX.reduce((a, b) => a + b, 0);
            const sumLnXlnY = lnX.reduce((acc, val, i) => acc + val * lnY_power[i], 0);
            const sumLnXX = lnX.reduce((acc, val) => acc + val * val, 0);
            const sumLnYPower = lnY_power.reduce((a, b) => a + b, 0);
            const b_pow = (n * sumLnXlnY - sumLnX * sumLnYPower) / (n * sumLnXX - sumLnX * sumLnX);
            const a_pow = (sumLnYPower - b_pow * sumLnX) / n;
            params.a = Math.exp(a_pow);
            params.b = b_pow;
            predictFn = x => params.a * Math.pow(x, params.b);
            break;

        case 'logarithmic':
            const lnX_log = x.map(val => Math.log(val));
            const sumLnX_log = lnX_log.reduce((a, b) => a + b, 0);
            const sumY = y.reduce((a, b) => a + b, 0);
            const sumLnXY = lnX_log.reduce((acc, val, i) => acc + val * y[i], 0);
            const sumLnXLogSq = lnX_log.reduce((acc, val) => acc + val * val, 0);
            const b_log = (n * sumLnXY - sumLnX_log * sumY) / (n * sumLnXLogSq - sumLnX_log * sumLnX_log);
            const a_log = (sumY - b_log * sumLnX_log) / n;
            params.a = a_log;
            params.b = b_log;
            predictFn = x => params.a + params.b * Math.log(x);
            break;

        case 'polynomial':
            // Para simplificar, usaremos una regresión cuadrática (grado 2)
            const X = x;
            const Y = y;
            let sumX1 = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0;
            let sumY1 = 0, sumXY = 0, sumX2Y = 0;

            for (let i = 0; i < n; i++) {
                sumX1 += X[i];
                sumX2 += X[i] ** 2;
                sumX3 += X[i] ** 3;
                sumX4 += X[i] ** 4;
                sumY1 += Y[i];
                sumXY += X[i] * Y[i];
                sumX2Y += X[i] ** 2 * Y[i];
            }

            const A = [
                [n, sumX1, sumX2],
                [sumX1, sumX2, sumX3],
                [sumX2, sumX3, sumX4]
            ];
            const B = [sumY1, sumXY, sumX2Y];

            // Resolver sistema lineal A * coef = B
            function gaussElimination(a, b) {
                const n = b.length;
                for (let i = 0; i < n; i++) {
                    // Pivote
                    let maxEl = Math.abs(a[i][i]);
                    let maxRow = i;
                    for (let k = i + 1; k < n; k++) {
                        if (Math.abs(a[k][i]) > maxEl) {
                            maxEl = Math.abs(a[k][i]);
                            maxRow = k;
                        }
                    }
                    for (let k = i; k < n; k++) {
                        const tmp = a[maxRow][k];
                        a[maxRow][k] = a[i][k];
                        a[i][k] = tmp;
                    }
                    let tmp = b[maxRow];
                    b[maxRow] = b[i];
                    b[i] = tmp;

                    for (let k = i + 1; k < n; k++) {
                        const c = -a[k][i] / a[i][i];
                        for (let j = i; j < n; j++) {
                            if (i === j) {
                                a[k][j] = 0;
                            } else {
                                a[k][j] += c * a[i][j];
                            }
                        }
                        b[k] += c * b[i];
                    }
                }

                const x = Array(n).fill(0);
                for (let i = n - 1; i >= 0; i--) {
                    x[i] = b[i] / a[i][i];
                    for (let k = i - 1; k >= 0; k--) {
                        b[k] -= a[k][i] * x[i];
                    }
                }
                return x;
            }

            const coef = gaussElimination(A, B);
            params.a = coef[0];
            params.b = coef[1];
            params.c = coef[2];
            predictFn = x => params.a + params.b * x + params.c * x * x;
            break;
    }

    // Calcular R²
    const yMean = y.reduce((a, b) => a + b, 0) / y.length;
    const ssTot = y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);
    const ssRes = y.reduce((acc, yi, i) => acc + Math.pow(yi - predictFn(x[i]), 2), 0);
    r2 = 1 - ssRes / ssTot;

    // Mostrar ecuación y R²
    let equation = '';
    switch (regressionType) {
        case 'exponential':
            equation = `y = ${params.a.toFixed(4)} * e^(${params.b.toFixed(4)}x)`;
            break;
        case 'power':
            equation = `y = ${params.a.toFixed(4)} * x^${params.b.toFixed(4)}`;
            break;
        case 'logarithmic':
            equation = `y = ${params.a.toFixed(4)} + ${params.b.toFixed(4)} * ln(x)`;
            break;
        case 'polynomial':
            equation = `y = ${params.a.toFixed(4)} + ${params.b.toFixed(4)}x + ${params.c.toFixed(4)}x²`;
            break;
    }

    document.getElementById("results").innerHTML = `
        <strong>Ecuación:</strong> ${equation}<br>
        <strong>R²:</strong> ${r2.toFixed(4)}
    `;

    // Dibujar gráfico
    drawChart(x, y, predictFn);

    // Guardar para proyecciones
    window.predictFn = predictFn;
}


// Función para mostrar los resultados
function displayResults(equation, metrics, modelType, params) {
    const resultsContainer = document.getElementById('results-container');
    
    let html = `
        <div class="result-item">
            <h3>Ecuación de Regresión</h3>
            <p>${equation}</p>
        </div>
        
        <div class="result-item">
            <h3>Parámetros del Modelo</h3>
    `;
    
    if (modelType === 'exponential' || modelType === 'power') {
        html += `
            <p>a = ${params.a.toExponential(4)}</p>
            <p>b = ${params.b.toExponential(4)}</p>
        `;
    } else if (modelType === 'logarithmic') {
        html += `
            <p>a (intercepto) = ${params.a.toExponential(4)}</p>
            <p>b (pendiente) = ${params.b.toExponential(4)}</p>
        `;
    } else if (modelType === 'polynomial') {
        html += `
            <p>a (x²) = ${params.coefficients[2].toExponential(4)}</p>
            <p>b (x) = ${params.coefficients[1].toExponential(4)}</p>
            <p>c (constante) = ${params.coefficients[0].toExponential(4)}</p>
        `;
    }
    
    html += `
        </div>
        
        <div class="result-item">
            <h3>Métricas de Evaluación</h3>
            <p>Error Cuadrático Medio (MSE): ${metrics.mse.toExponential(4)}</p>
            <p>Error Medio Absoluto (MAE): ${metrics.mae.toExponential(4)}</p>
            <p>Coeficiente de Determinación (R²): ${metrics.r2.toExponential(4)}</p>
            <p>Error Estándar de la Regresión (SER): ${metrics.ser.toExponential(4)}</p>
        </div>
    `;
    
    resultsContainer.innerHTML = html;
}

// Función para dibujar el gráfico
function drawChart(data, predictFn, modelType) {
    const ctx = document.getElementById('regression-chart').getContext('2d');
    
    // Ordenar datos por X para el gráfico
    data.sort((a, b) => a.x - b.x);
    
    // Crear puntos para la línea de regresión
    const minX = Math.min(...data.map(point => point.x));
    const maxX = Math.max(...data.map(point => point.x));
    const step = (maxX - minX) / 100;
    
    const regressionPoints = [];
    for (let x = minX; x <= maxX; x += step) {
        regressionPoints.push({
            x: x,
            y: predictFn(x)
        });
    }
    
    // Destruir gráfico anterior si existe
    if (regressionChart) {
        regressionChart.destroy();
    }
    
    // Crear nuevo gráfico
    regressionChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Datos Observados',
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: 'Línea de Regresión',
                    data: regressionPoints,
                    type: 'line',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    showLine: true
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Variable X'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Variable Y'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Regresión ${getModelName(modelType)}`,
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `(${context.parsed.x.toFixed(2)}, ${context.parsed.y.toFixed(2)})`;
                        }
                    }
                }
            }
        }
    });
}

// Función para obtener el nombre del modelo
function getModelName(modelType) {
    switch (modelType) {
        case 'exponential': return 'Exponencial';
        case 'power': return 'de Potencia';
        case 'logarithmic': return 'Logarítmica';
        case 'polynomial': return 'Polinomial (2do grado)';
        default: return '';
    }
}

// Función para proyectar un valor
function projectValue() {
    if (!currentModel) {
        alert('Primero calcule una regresión antes de proyectar valores.');
        return;
    }
    
    const xInput = document.getElementById('project-x');
    const x = parseFloat(xInput.value);
    
    if (isNaN(x)) {
        alert('Por favor ingrese un valor numérico para X.');
        return;
    }
    
    const predictedY = currentModel.predictFn(x);
    const resultElement = document.getElementById('projection-result');
    
    resultElement.innerHTML = `
        <h3>Resultado de Proyección</h3>
        <p>Para x = ${x.toFixed(4)}, el valor proyectado de y es: ${predictedY.toExponential(4)}</p>
    `;
}

// Inicializar con una fila
addRow();
