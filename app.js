async function draw() {
  // 1. Cargar Datos
  const dataset = await d3.csv('Precios.csv')

  const parseDate = d3.timeParse('%Y-%m-%d')
  
  // Mapeo de pares de columnas (spot y futuro) por cada mineral
  const metrics = {
    oro: { spot: 'oro_spot', futuro: 'oro_futuro' },
    plata: { spot: 'plata_spot', futuro: 'plata_futuro' },
    cobre: { spot: 'cobre_spot', futuro: 'cobre_futuro' },
    litio: { spot: 'litio_spot', futuro: 'litio_futuro' }
  }

  let selectedMetric = 'oro'

  // Accesores
  const xAccessor = d => parseDate(d.fecha)
  const getValue = (d, column) => {
    const val = parseFloat(d[column])
    return isNaN(val) ? null : val
  }

  // 2. Dimensiones (aumentamos el margen superior a 60px para acomodar la leyenda arriba)
  let dimensions = {
    width: 800,
    height: 420,
    margins: { top: 60, right: 40, bottom: 50, left: 60 }
  }

  dimensions.ctrWidth = dimensions.width - dimensions.margins.left - dimensions.margins.right
  dimensions.ctrHeight = dimensions.height - dimensions.margins.top - dimensions.margins.bottom

  // 3. Crear SVG
  d3.select('#chart').html('') // Limpia el contenedor
  const svg = d3.select('#chart')
    .append("svg")
    .attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`)
    .style("width", "100%")
    .style("height", "auto")

  const ctr = svg.append("g")
    .attr("transform", `translate(${dimensions.margins.left}, ${dimensions.margins.top})`)

  // Tooltip HTML
  let tooltip = d3.select('#tooltip')
  if (tooltip.empty()) {
    tooltip = d3.select('body')
      .append('div')
      .attr('id', 'tooltip')
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
    .attr('fill', '#fc878')
    .attr('stroke', '#000')
    .attr('stroke-width', 2)
    .style('opacity', 0)
    .style('pointer-events', 'none')

  // 4. Escalas
  const yScale = d3.scaleLinear().range([dimensions.ctrHeight, 0]).nice()
  const xScale = d3.scaleUtc()
    .domain(d3.extent(dataset, xAccessor))
    .range([0, dimensions.ctrWidth])

  // Generadores de líneas
  const lineGeneratorSpot = d3.line()
    .defined(d => d.value !== null)
    .x(d => xScale(d.date))
    .y(d => yScale(d.value))

  const lineGeneratorFuturo = d3.line()
    .defined(d => d.value !== null)
    .x(d => xScale(d.date))
    .y(d => yScale(d.value))

  // Trazados
  const pathSpot = ctr.append('path')
    .attr('fill', 'none')
    .attr('stroke', '#30475e')
    .attr('stroke-width', 2.5)

  const pathFuturo = ctr.append('path')
    .attr('fill', 'none')
    .attr('stroke', '#5e5c68')
    .attr('stroke-width', 2.5)
    .attr('stroke-dasharray', '6 4')

  // 5. Leyenda centrada en la parte superior DENTRO del SVG
  const legend = ctr.append('g')
    .attr('transform', `translate(${dimensions.ctrWidth / 2 - 140}, -35)`)

  // Item 1: Spot
  legend.append('line')
    .attr('x1', 0).attr('y1', 0).attr('x2', 25).attr('y2', 0)
    .attr('stroke', '#30475e').attr('stroke-width', 2.5)
  legend.append('text')
    .attr('x', 30).attr('y', 4)
    .text('Spot (Línea Continua)')
    .style('font-size', '12px')
    .style('font-weight', '500')
    .style('fill', '#333')

  // Item 2: Futuro
  legend.append('line')
    .attr('x1', 160).attr('y1', 0).attr('x2', 185).attr('y2', 0)
    .attr('stroke', '#5e5c68').attr('stroke-width', 2.5)
    .attr('stroke-dasharray', '6 4')
  legend.append('text')
    .attr('x', 190).attr('y', 4)
    .text('Futuro (Línea Tramada)')
    .style('font-size', '12px')
    .style('font-weight', '500')
    .style('fill', '#333')

  // 6. Ejes
  const yAxisGroup = ctr.append('g')
  const xAxisGroup = ctr.append('g')
    .style('transform', `translateY(${dimensions.ctrHeight}px)`)

  xAxisGroup.call(d3.axisBottom(xScale))

  let currentCombinedData = []

  // Función para redibujar el gráfico
  function updateChart() {
    const spotCol = metrics[selectedMetric].spot
    const futuroCol = metrics[selectedMetric].futuro

    // Extraer datos spot
    const spotData = dataset.map(d => ({
      date: xAccessor(d),
      value: getValue(d, spotCol),
      type: 'Spot'
    })).filter(d => d.value !== null)

    // Extraer datos futuro
    const futuroData = dataset.map(d => ({
      date: xAccessor(d),
      value: getValue(d, futuroCol),
      type: 'Futuro'
    })).filter(d => d.value !== null)

    // Empalme entre spot y futuro
    let futuroConnectedData = [...futuroData]
    if (spotData.length > 0 && futuroData.length > 0) {
      const lastSpot = spotData[spotData.length - 1]
      futuroConnectedData.unshift({
        date: lastSpot.date,
        value: lastSpot.value,
        type: 'Futuro'
      })
    }

    currentCombinedData = [...spotData, ...futuroData]

    // ESCALA Y: arranca obligatoriamente en 0
    const maxVal = d3.max(currentCombinedData, d => d.value) || 100
    yScale.domain([0, maxVal * 1.08]).nice()

    // Actualizar Eje Y
    yAxisGroup.transition().duration(500)
      .call(d3.axisLeft(yScale).tickFormat(d => `$${d}`))

    // Actualizar Líneas
    pathSpot.datum(spotData)
      .transition().duration(500)
      .attr('d', lineGeneratorSpot)

    pathFuturo.datum(futuroConnectedData)
      .transition().duration(500)
      .attr('d', lineGeneratorFuturo)
  }

  // Render inicial
  updateChart()

  // 7. Eventos de los Botones
  d3.selectAll('.btn-metric').on('click', function() {
    d3.selectAll('.btn-metric').classed('active', false)
    d3.select(this).classed('active', true)

    selectedMetric = d3.select(this).attr('data-value')
    updateChart()
  })

  // 8. Tooltip e Interacción
  const bisector = d3.bisector(d => d.date).left

  ctr.append('rect')
    .attr('width', dimensions.ctrWidth)
    .attr('height', dimensions.ctrHeight)
    .style('opacity', 0)
    .on('mousemove touchstart touchmove', function (event) {
      if (currentCombinedData.length === 0) return

      const sortedData = [...currentCombinedData].sort((a, b) => a.date - b.date)
      const mousePos = d3.pointer(event, this)
      const date = xScale.invert(mousePos[0])

      let index = bisector(sortedData, date)
      if (index === 0) index = 1
      if (index >= sortedData.length) index = sortedData.length - 1

      const d0 = sortedData[index - 1]
      const d1 = sortedData[index]
      const stock = date - d0.date > d1.date - date ? d1 : d0

      const xPos = xScale(stock.date)
      const yPos = yScale(stock.value)

      tooltipDot.style('opacity', 1)
        .attr('cx', xPos)
        .attr('cy', yPos)
        .raise()

      const matrix = this.getScreenCTM()
      const pageX = xPos * matrix.a + matrix.e + window.scrollX
      const pageY = yPos * matrix.d + matrix.f + window.scrollY

      const dateFormatter = d3.timeFormat('%B %d, %Y')

      tooltip.style('display', 'block')
        .style('top', `${pageY - 50}px`)
        .style('left', `${pageX - 40}px`)
        .html(`
          <div><strong>Tipo:</strong> ${stock.type}</div>
          <div><strong>Fecha:</strong> ${dateFormatter(stock.date)}</div>
          <div><strong>Precio:</strong> $${stock.value.toFixed(2)}</div>
        `)
    })
    .on('mouseleave touchend', function () {
      tooltipDot.style('opacity', 0)
      tooltip.style('display', 'none')
    })
}

draw()