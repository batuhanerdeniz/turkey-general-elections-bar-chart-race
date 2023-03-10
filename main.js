// Data source
const url = 'data.csv';

const width = 1600;
const height = 600;

const tickDuration = 1000;
const top_n = 12;
const margin = {
  top: 80,
  right: 450,
  bottom: 5,
  left: 250
}

const barPadding = (height-(margin.bottom+margin.top))/(top_n*5);





const svg = d3.select("#chart").append("svg")
    .attr("viewBox", [0, 0, width, height]);






d3.csv(url, d3.autoType).then(data => {
  console.log(data);

  // PARSE THE DATA

  // convert date to year
  for(let i = 0; i < data.length; i++){
        data[i].year = data[i].date.getFullYear();
    }

  //  build names dictionary
  const names = Array.from(new Set(data.map(d => d.name)));

  // build years dictionary
  const years = Array.from(new Set(data.map(d => d.year))).sort();

  // set year to first year
  let year = years[0];

  // set last year - needed to stop animation
  const lastYear = years[years.length - 1];

  // build color scale based on categories
  const categories = Array.from(new Set(data.map(d => d.category)));
  const colorScale = d3.scaleOrdinal(d3.schemeSet1)
      .domain(categories);

  // BUILD MISSING DATA - with the value = 0

  const dataUpdated = [];

  for (let i = 0; i < names.length; i++){
      for (let j = 0; j < years.length; j++){
         let record = data.find(d => d.name === names[i] && d.year === years[j]);
           if(typeof record !== "undefined") {
               dataUpdated.push({
                 category: record.category,
                   year: years[j],
                   name: names[i],
                   value: record.value,
               })
           } else {
               dataUpdated.push({
                 // category: record.category,
                   year: years[j],
                   name: names[i],
                   value: 0,
               })
        }
      }
   }

  const frames = 10;

  // BIULD KEYFRAMES

  const keyframes = [];

  for(let i = 0; i < names.length; i++){
       let records = dataUpdated.filter(d => d.name === names[i]).sort((a,b) => a.year - b.year);
       // console.log(records);

       let lastValue;

       for(let j = 0; j < records.length - 1; j++){

           let a = records[j];
           let b = records[j+1];
           if(j === 0){
               lastValue = a.value;
           }


           for(let k = 0; k < frames; k++){
               keyframes.push({
                 colour: colorScale(a.category),
                 name: names[i],
                   year: Math.round((a.year * (frames - k)/frames + b.year * (k/frames))*100)/100,
                   value: Math.round(a.value * (frames - k)/frames + b.value * (k/frames)),
                   lastValue: lastValue
               })
               lastValue = Math.round(a.value * (frames - k)/frames + b.value * (k/frames));
           }
       }

       // add last keyframe
       let lastRecord = records[records.length - 1];

        keyframes.push({
          colour: colorScale(lastRecord.category),
            name: lastRecord.name,
            year: lastRecord.year,
            value: lastRecord.value,
            lastValue: lastValue
        })
   }

  // substitute data with keyframes

  data = keyframes;

  // prepare the Year Slice
  let yearSlice = data.filter(d => d.year === year)
      .sort((a,b) => b.value - a.value)
      .slice(0, top_n);

  yearSlice.forEach((d,i) => d.rank = i);

  let x = d3.scaleLinear()
      .domain([0, d3.max(yearSlice, d => d.value)])
      .range([margin.left, width-margin.right-65]);

  let y = d3.scaleLinear()
      .domain([top_n, 0])
      .range([height-margin.bottom, margin.top])

    let xAxis = d3.axisTop()
        .scale(x)
        .ticks(width > 500 ? 5: 2)
        .tickSize(-(height-margin.top-margin.bottom))
        .tickFormat(d => d3.format(',')(d));

  svg.append("g")
      .attr("class", "axis xAxis")
      .attr("transform", `translate(0, ${margin.top})`)
      .call(xAxis)
      .selectAll('.tick line')
      .classed('origin', d => d === 0);

        svg.selectAll('rect.bar')
            .data(yearSlice, d => d.name)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', x(0) + 1)
            .attr('width', d => x(d.value)-x(0)-1)
            .attr('y', d => y(d.rank)+5)
            .attr('height', y(1)-y(0)-barPadding)
            .style('fill', d => d.colour)


    svg.selectAll('text.label')
        .data(yearSlice, d => d.name)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('x', d => x(d.value)-8)
        .attr('y', d => y(d.rank) + (y(1) - y(0) - barPadding)/2)
        .attr('alignment-baseline', 'hanging')
        .style('text-anchor', 'end')
        .text(d => d.name)

    svg.selectAll('text.valueLabel')
        .data(yearSlice, d => d.name)
        .enter()
        .append('text')
        .attr('class', 'valueLabel')
        .attr('x', d => x(d.value)+5)
        .attr('y', d => y(d.rank) + (y(1) - y(0) - barPadding)/2)
        .attr('alignment-baseline', 'hanging')
        .text(d => d3.format(',.0f')(d.lastValue));

    let ticker = d3.interval((e) => {

        yearSlice = data.filter(d => d.year === year)
            .sort((a,b) => b.value - a.value)
            .slice(0, top_n);

        yearSlice.forEach((d,i) => d.rank = i);

        // X SCALE UPDATE

        x.domain([0, d3.max(yearSlice, d => d.value)]);

        // X AXIS UPDATE

        svg.select('.xAxis')
            .transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .call(xAxis)

        // BARS UPDATE

        let bars = svg.selectAll('.bar')
            .data(yearSlice, d => d.name);

        bars
            .enter()
            .append('rect')
            .attr('class','bar')
            .attr('x', x(0) + 1)
            .attr('width', d => x(d.value)-x(0)-1)
            .attr('y', y(top_n)+5)
            .attr('height', y(1)-y(0)-barPadding)
            .style('fill', d => d.colour)
            .transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .attr('y', d => y(d.rank)+5);

        bars
            .transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .attr('width', d => x(d.value)-x(0)-1)
            .attr('y', d => y(d.rank)+5)

        bars
            .exit()
            .transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .attr('width', d => x(d.value)-x(0)-1)
            .attr('y', y(top_n)+5)
            .remove();

        // LABELS UPDATE

        let labels = svg.selectAll('.label')
            .data(yearSlice, d => d.name)

        labels
            .enter()
            .append('text')
            .attr('class', 'label')
            .attr('x', d => x(d.value)-8)
            .attr('y', y(top_n) + (y(1) - y(0) - barPadding)/2)
            .attr('alignment-baseline', 'hanging')
            .style('text-anchor', 'end')
            .html(d => d.name)
            .transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .attr('y', d => y(d.rank) + (y(1) - y(0) - barPadding)/2)

        labels
            .transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .attr('x', d => x(d.value)-8)
            .attr('y', d => y(d.rank) + (y(1) - y(0) - barPadding)/2)


        labels
            .exit()
            .transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .attr('x', d => x(d.value)-8)
            .attr('y', y(top_n) + (y(1) - y(0) - barPadding)/2)
            .remove()

        // UPDATE THE VALUE LABELS

        let valueLabels = svg.selectAll('.valueLabel')
            .data(yearSlice, d => d.name)

        valueLabels
            .enter()
            .append('text')
            .attr('class', 'valueLabel')
            .attr('x', d => x(d.value) + 5)
            .attr('y', y(top_n) + (y(1) - y(0) - barPadding)/2)
            .attr('alignment-baseline', 'hanging')
            .text(d => d3.format(',.0f')(d.lastValue))
            .transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .attr('y', d => y(d.rank) + (y(1) - y(0) - barPadding)/2)

        valueLabels
            .transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .attr('x', d => x(d.value) + 5)
            .attr('y', d => y(d.rank) + (y(1) - y(0) - barPadding)/2)
            .tween("text", function(d){
                let i = d3.interpolateRound(d.lastValue, d.value);
                return function(t) {
                    this.textContent = d3.format(',')(i(t));
                };
            });

        valueLabels
            .exit()
            .transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .attr('x', d => x(d.value) + 5)
            .attr('y', y(top_n)+(y(1) - y(0) - barPadding)/2)
            .remove();



        if(year === lastYear) ticker.stop();
        year = +d3.format('.1f')(+year + 0.1);


    }, tickDuration)

})