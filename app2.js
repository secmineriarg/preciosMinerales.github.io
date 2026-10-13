async function drawIndexChart() {
  // 1. Cargar Datos
  const dataset = await d3.csv('Precios.csv')

  const parseDate = d3.timeParse('%Y-%m-%d')
  
  // Accesor a la columna 'indice'
  const xAccessor = d => parseDate(d.fecha)
  const yAccessor = d => parseFloat(d.indice)

  // Filtrar filas que tengan un índice válido
  const validData = dataset.filter(d => !isNaN(yAccessor(d)))

  // 2. Dimensiones
  let dimensions = {
    width: 800,
    height: 420,
    margins: { top: 40, right: 30, bottom: 80, left: 60 }
  }

  dimensions.ctrWidth = dimensions.width - dimensions.margins.left - dimensions.margins.right
  dimensions.ctrHeight = dimensions.height - dimensions.margins.top - dimensions.margins.bottom

  // 3. Crear SVG (Adaptable con viewBox)
  d3.select('#chart-indice').html('') // Limpia el contenedor
  const svg = d3.select('#chart-indice')
    .append("svg")
    .attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`)
    .style("width", "100%")
    .style("height", "auto")

  const ctr = svg.append("g")
    .attr("transform", `translate(${dimensions.margins.left}, ${dimensions.margins.top})`)

  // Tooltip HTML dinámico
  let tooltip = d3.select('#tooltip-indice')
  if (tooltip.empty()) {
    tooltip = d3.select('body')
      .append('div')
      .attr('id', 'tooltip-indice')
      .style('position', 'absolute')
      .style('display', 'none')
      .style('background', 'rgba(0, 0, 0, 0.85)')
      .style('color', '#fff')
      .style('padding', '6px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
  }

  const tooltipDot = ctr.append('circle')
    .attr('r', 5)
    .attr('fill', '#009fe3')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 2)
    .style('opacity', 0)
    .style('pointer-events', 'none')

  // 4. Escalas
  const yScale = d3.scaleLinear()
    .domain([100, d3.max(validData, yAccessor) * 1.05])
    .range([dimensions.ctrHeight, 0])
    .nice()

  const xScale = d3.scaleUtc()
    .domain(d3.extent(validData, xAccessor))
    .range([0, dimensions.ctrWidth])

  // 5. Generador de Línea Curva Suave (MonotoneX)
  const lineGenerator = d3.line()
    .x(d => xScale(xAccessor(d)))
    .y(d => yScale(yAccessor(d)))
    .curve(d3.curveMonotoneX)

  // Dibujar la Línea (Color Celeste/Azul como la imagen)
  ctr.append('path')
    .datum(validData)
    .attr('d', lineGenerator)
    .attr('fill', 'none')
    .attr('stroke', '#009fe3')
    .attr('stroke-width', 3.5)

  // 6. Ejes
  // Eje Y (Valores de 100 a 450)
  const yAxis = d3.axisLeft(yScale)
    .ticks(7)
    .tickFormat(d => d)

  ctr.append('g')
    .call(yAxis)
    .selectAll("text")
    .style("font-size", "12px")
    .style("color", "#444")

  // Eje X con formato de meses en español (ene-21, mar-21, etc.)
  const mesesEsp = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

  const xAxis = d3.axisBottom(xScale)
    .ticks(d3.timeMonth.every(2)) // Cada 2 meses igual que en la imagen
    .tickFormat(d => `${mesesEsp[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`)

  const xAxisGroup = ctr.append('g')
    .style('transform', `translateY(${dimensions.ctrHeight}px)`)
    .call(xAxis)

  // Rotación de las etiquetas del eje X para lectura vertical/inclinada
  xAxisGroup.selectAll("text")
    .style("font-size", "11px")
    .style("color", "#444")
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", "-.4em")

  // Quitar líneas de los bordes del eje para un acabado limpio
  ctr.selectAll(".domain").style("stroke", "#ccc")

  // 7. Tooltip e Interacción
  const bisector = d3.bisector(xAccessor).left

  ctr.append('rect')
    .attr('width', dimensions.ctrWidth)
    .attr('height', dimensions.ctrHeight)
    .style('opacity', 0)
    .on('mousemove touchstart touchmove', function (event) {
      const mousePos = d3.pointer(event, this)
      const date = xScale.invert(mousePos[0])

      let index = bisector(validData, date)
      if (index === 0) index = 1
      if (index >= validData.length) index = validData.length - 1

      const d0 = validData[index - 1]
      const d1 = validData[index]
      const stock = date - xAccessor(d0) > xAccessor(d1) - date ? d1 : d0

      const xPos = xScale(xAccessor(stock))
      const yPos = yScale(yAccessor(stock))

      tooltipDot.style('opacity', 1)
        .attr('cx', xPos)
        .attr('cy', yPos)
        .raise()

      const matrix = this.getScreenCTM()
      const pageX = xPos * matrix.a + matrix.e + window.scrollX
      const pageY = yPos * matrix.d + matrix.f + window.scrollY

      const fechaObj = xAccessor(stock)
      const fechaTexto = `${mesesEsp[fechaObj.getMonth()]} ${fechaObj.getFullYear()}`

      tooltip.style('display', 'block')
        .style('top', `${pageY - 45}px`)
        .style('left', `${pageX - 40}px`)
        .html(`
          <div><strong>Fecha:</strong> ${fechaTexto}</div>
          <div><strong>Índice:</strong> ${yAccessor(stock).toFixed(1)}</div>
        `)
    })
    .on('mouseleave touchend', function () {
      tooltipDot.style('opacity', 0)
      tooltip.style('display', 'none')
    })
}

drawIndexChart()