function agregarInputs(event) {
  // Evitar que el formulario se recargue
  event.preventDefault();

  const numVariables = parseInt(document.getElementById("variables").value);
  const numRestricciones = parseInt(document.getElementById("restrcciones").value);

  const inputsVariables = document.getElementById("inputsVariables");
  const inputsRestricciones = document.getElementById("inputsRestricciones");
  const inputResolver = document.getElementById("inputResolver");

  inputsVariables.innerHTML = "";
  inputsRestricciones.innerHTML = "";
  inputResolver.innerHTML = "";

  if (isNaN(numVariables) || isNaN(numRestricciones) || numVariables < 1 || numRestricciones < 1) {
    alert("Por favor, ingresa valores válidos para las variables y restricciones.");
    return;
  }

  const variablesLabel = document.createElement("p");
  variablesLabel.textContent = "Coeficientes de la función objetivo:";
  inputsVariables.appendChild(variablesLabel);

  for (let i = 1; i <= numVariables; i++) {
    const input = document.createElement("input");
    input.type = "number";
    input.name = `variable_${i}`;
    input.placeholder = `x${i}`;
    inputsVariables.appendChild(input);
  }

  const restriccionesLabel = document.createElement("p");
  restriccionesLabel.textContent = "Restricciones:";
  inputsRestricciones.appendChild(restriccionesLabel);

  for (let i = 1; i <= numRestricciones; i++) {
    const div = document.createElement("div");
    for (let j = 1; j <= numVariables; j++) {
      const input = document.createElement("input");
      input.type = "number";
      input.name = `restriccion_${i}_x${j}`;
      input.placeholder = `x${j}`;
      div.appendChild(input);
    }

    const operador = document.createElement("select");
    operador.name = `restriccion_${i}_operador`;
    operador.innerHTML = `
      <option value="<=">&le;</option>
      <option value="=">=</option>
      <option value=">=">&ge;</option>
    `;
    div.appendChild(operador);

    const valor = document.createElement("input");
    valor.type = "number";
    valor.name = `restriccion_${i}_valor`;
    valor.placeholder = "Valor";
    div.appendChild(valor);

    inputsRestricciones.appendChild(div);
  }

  const metodoResolver = document.createElement("select");
  metodoResolver.name = `metodo`;
  metodoResolver.innerHTML = `
    <option value="metodoSimplex">Método Simplex</option>
  `;
  inputResolver.appendChild(metodoResolver);

  const btnResolver = document.createElement("button");
  btnResolver.textContent = "Resolver";
  btnResolver.onclick = resolverModelo;
  inputResolver.appendChild(btnResolver);
}

function resolverModelo(event) {
  event.preventDefault();

  const numVariables = parseInt(document.getElementById("variables").value);
  const numRestricciones = parseInt(document.getElementById("restrcciones").value);

  const coeficientesObjetivo = [];
  for (let i = 1; i <= numVariables; i++) {
    const valor = parseFloat(document.querySelector(`input[name="variable_${i}"]`).value);
    coeficientesObjetivo.push(valor);
  }

  const restricciones = [];
  for (let i = 1; i <= numRestricciones; i++) {
    const restriccion = [];
    for (let j = 1; j <= numVariables; j++) {
      const valor = parseFloat(document.querySelector(`input[name="restriccion_${i}_x${j}"]`).value);
      restriccion.push(valor);
    }
    const operador = document.querySelector(`select[name="restriccion_${i}_operador"]`).value;
    const valorDerecha = parseFloat(document.querySelector(`input[name="restriccion_${i}_valor"]`).value);

    restricciones.push({ restriccion, operador, valorDerecha });
  }

  const { iteraciones, resultado } = metodoSimplex(coeficientesObjetivo, restricciones);

  // Mostrar resultados e iteraciones
  const resultadosDiv = document.getElementById("resultados");
  resultadosDiv.innerHTML = `<h3>Resultados Finales:</h3><pre>${JSON.stringify(resultado, null, 2)}</pre>`;
  
  resultadosDiv.innerHTML += `<h3>Iteraciones:</h3>`;
  iteraciones.forEach((tabla, index) => {
    resultadosDiv.innerHTML += `<h4>Iteración ${index + 1}:</h4><pre>${JSON.stringify(tabla, null, 2)}</pre>`;
  });
}

function metodoSimplex(objetivo, restricciones) {
  let tabla = construirTablaInicial(objetivo, restricciones);
  const iteraciones = []; // Para registrar las tablas en cada iteración

  while (!esOptima(tabla)) {
    // Guardar la tabla actual antes de pivotar
    iteraciones.push(JSON.parse(JSON.stringify(tabla)));

    const columnaPivote = seleccionarColumnaPivote(tabla);
    const filaPivote = seleccionarFilaPivote(tabla, columnaPivote);
    tabla = realizarPivot(tabla, filaPivote, columnaPivote);
  }

  // Registrar la tabla óptima
  iteraciones.push(JSON.parse(JSON.stringify(tabla)));

  // Extraer los resultados finales
  const resultado = extraerResultados(tabla);

  return { iteraciones, resultado };
}

function construirTablaInicial(objetivo, restricciones) {
  const numRestricciones = restricciones.length;
  const numVariables = objetivo.length;

  let tabla = restricciones.map((r, i) => {
    // Si el valor independiente es negativo, invertimos la fila completa
    if (r.valorDerecha < 0) {
      r.restriccion = r.restriccion.map(v => -v);
      r.valorDerecha = -r.valorDerecha;
      if (r.operador === "<=") r.operador = ">=";
      else if (r.operador === ">=") r.operador = "<=";
    }

    return [
      ...r.restriccion,
      ...Array(numRestricciones).fill(0).map((_, j) => (j === i ? 1 : 0)),
      r.valorDerecha,
    ];
  });

  tabla.push([...objetivo.map(c => -c), ...Array(numRestricciones + 1).fill(0)]);

  return tabla;
}

function esOptima(tabla) {
  const ultimaFila = tabla[tabla.length - 1];
  return ultimaFila.slice(0, -1).every(value => value >= 0);
}

function seleccionarColumnaPivote(tabla) {
  const ultimaFila = tabla[tabla.length - 1];
  return ultimaFila.slice(0, -1).indexOf(Math.min(...ultimaFila.slice(0, -1)));
}

function seleccionarFilaPivote(tabla, columnaPivote) {
  let restricciones = tabla.slice(0, -1).map((fila, index) => ({
    ratio: fila[fila.length - 1] / fila[columnaPivote],
    index,
  }));
  restricciones = restricciones.filter(r => r.ratio > 0);
  return restricciones.reduce((min, r) => (r.ratio < min.ratio ? r : min), restricciones[0]).index;
}

function realizarPivot(tabla, filaPivote, columnaPivote) {
  const nuevaTabla = [...tabla];
  const pivote = tabla[filaPivote][columnaPivote];

  nuevaTabla[filaPivote] = tabla[filaPivote].map(value => value / pivote);

  nuevaTabla.forEach((fila, i) => {
    if (i !== filaPivote) {
      const factor = fila[columnaPivote];
      nuevaTabla[i] = fila.map((value, j) => value - factor * nuevaTabla[filaPivote][j]);
    }
  });

  return nuevaTabla;
}

function extraerResultados(tabla) {
  const ultimaFila = tabla[tabla.length - 1];
  const solucion = { z: ultimaFila[ultimaFila.length - 1] };

  for (let i = 0; i < tabla[0].length - 1; i++) {
    const columna = tabla.map(fila => fila[i]);
    if (columna.filter(value => value === 1).length === 1 && columna.filter(value => value === 0).length === columna.length - 1) {
      const fila = columna.indexOf(1);
      solucion[`x${i + 1}`] = tabla[fila][tabla[fila].length - 1];
    } else {
      solucion[`x${i + 1}`] = 0;
    }
  }

  return solucion;
}