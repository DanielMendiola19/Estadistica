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

// Función para calcular la regresión de potencia (y = ax^b) usando log10
function powerRegression(data) {
    // Transformación lineal: log10(y) = log10(a) + b·log10(x)
    const x = data.map(point => Math.log10(point.x));
    const y = data.map(point => Math.log10(point.y));
    
    const { slope, intercept } = linearRegression(x, y);
    
    const a = Math.pow(10, intercept); // 10^intercept porque usamos log10
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
    const data = getData();
    
    if (data.length < 3) {
        alert('Se necesitan al menos 3 puntos de datos para calcular la regresión.');
        return;
    }
    
    const modelType = document.getElementById('model-type').value;
    let equation, predictFn, params;
    
    switch (modelType) {
        case 'exponential':
            params = exponentialRegression(data);
            equation = `y = ${params.a.toExponential(4)}e^(${params.b.toExponential(4)}x)`;
            predictFn = x => params.a * Math.exp(params.b * x);
            break;
            
        case 'power':
            params = powerRegression(data);
            equation = `y = ${params.a.toExponential(4)}x^${params.b.toExponential(4)}`;
            predictFn = x => params.a * Math.pow(x, params.b);
            break;
            
        case 'logarithmic':
            params = logarithmicRegression(data);
            equation = `y = ${params.a.toExponential(4)} + ${params.b.toExponential(4)}·ln(x)`;
            predictFn = x => params.a + params.b * Math.log(x);
            break;
            
        case 'polynomial':
            const coefficients = polynomialRegression(data);
            equation = `y = ${coefficients[2].toExponential(4)}x² + ${coefficients[1].toExponential(4)}x + ${coefficients[0].toExponential(4)}`;
            predictFn = x => coefficients[2] * x * x + coefficients[1] * x + coefficients[0];
            params = { coefficients: coefficients };
            break;
    }
    
    // Calcular métricas
    const metrics = calculateMetrics(data, predictFn);
    
    // Mostrar resultados
    displayResults(equation, metrics, modelType, params);
    
    // Dibujar gráfico
    drawChart(data, predictFn, modelType);
    
    // Guardar modelo actual para proyecciones
    currentModel = { predictFn: predictFn, type: modelType, params: params };
    regressionParams = params;
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
