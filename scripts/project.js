var mapSvg;

var lineSvg;
var barSvg;
var lineWidth;
var lineHeight;
var lineInnerHeight;
var lineInnerWidth;
var lineMargin = {
    top: 20,
    right: 60,
    bottom: 60,
    left: 100
};
var clickYear = 0;

document.addEventListener('DOMContentLoaded', function () {


    mapSvg = d3.select('#map');
    lineSvg = d3.select('#visual1');
    barSvg = d3.select('#visual2');
    lineWidth = +lineSvg.style('width').replace('px', '');
    lineHeight = +lineSvg.style('height').replace('px', '');;
    lineInnerWidth = lineWidth - lineMargin.left - lineMargin.right;
    lineInnerHeight = lineHeight - lineMargin.top - lineMargin.bottom;
    // Load both files before doing anything else
    Promise.all([d3.json('data/united_states.geojson'),
            d3.csv('data/Airline_Itinerary_Fares.csv'),
            d3.csv('data/NASDAQ_Composite_Historical_Annual_Data.csv'),
            d3.csv('data/U.S._Gulf_Coast_Kerosene-Type_Jet_Fuel_Spot_Price_FOB.csv')
        ])
        .then(function (values) {
            mapData = values[0];
            timeData = values[1];
            stockData = values[2];
            fuelData = values[3];
            drawMap();
        })

});

//Get the max & min values for a year
function getExtentsForYear(yearData) {
    var max = Number.MIN_VALUE;
    var min = Number.MAX_VALUE;
    for (var key in yearData) {
        if (key == 'Year')
            continue;
        let val = +yearData[key];
        if (val > max)
            max = val;
        if (val < min)
            min = val;
    }
    return [min, max];
}


function drawMap() {
    let projection = d3.geoAlbers()
        .scale(650)
        .center(d3.geoCentroid(mapData))
        .translate([10, 10]);
    let path = d3.geoPath()
        .projection(projection);

    //get the selected year
    var year = document.getElementById('year-input').value;

    //get the fares for states for the selected year
    let yearData = timeData.filter(d => d.Year == year)[0];

    //get the range of fares for the selected year
    let extent = getExtentsForYear(yearData);

    //setup color scale
    var colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
        .domain(extent); // change domain of legend here


    //draw map
    mapSvg.selectAll('g').remove();

    var div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    let g = mapSvg.append('g');
    g.selectAll('path')
        .data(mapData.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('id', d => {
            return d.properties.name
        })
        .attr('class', 'countrymap')
        .style('fill', d => {
            let val = +yearData[d.properties.NAME];
            if (isNaN(val))
                return 'white';
            return colorScale(val);
        })
        .on('mouseover', function (d, i) {
            d3.select(this).classed('selectedmap', true);

            //Tooptip transition
            div.transition()
                .duration('200')
                .style("opacity", 1);
        })
        .on('mousemove', function (d, i) {
            let states_name = d.properties.NAME;
            div.html(states_name)
                .style("left", (d3.event.pageX + 5) + "px")
                .style("top", (d3.event.pageY + 5) + "px");
        })
        .on('mouseout', function (d, i) {
            d3.select(this).classed('selectedmap', false);

            //Tooptip transition
            div.transition()
                .duration('100')
                .style("opacity", 0);
        })
        .on('click', function (d, i) {
            drawLineChart(d.properties.NAME);
        });





    //draw color legend
    mapSvg.selectAll("defs").remove();
    var linearGradient = mapSvg.append("defs")
        .append("linearGradient")
        .attr("id", "linear-gradient");

    linearGradient.selectAll("stop")
        .data(colorScale.ticks()
            .map((t, i, n) => ({
                offset: `${100*i/n.length}%`,
                color: colorScale(t)
            })))
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    mapSvg.append('g')
        .append("rect")
        .attr('transform', 'translate(20, 620)')
        .attr("width", 200)
        .attr("height", 20)
        .style("fill", "url(#linear-gradient)");
    var colorAxis = d3.axisBottom(d3.scaleLinear()
            .domain(extent) //change domain here
            .range([0, 200]))
        .ticks(5).tickSize(-20);
    mapSvg.append('g')
        .call(colorAxis)
        .attr('class', 'colorLegend')
        .attr('transform', 'translate(20,640)');

    g.append('text')
        .attr('x', 950)
        .attr('y', 180)
        .attr('text-anchor', 'middle')
        .attr('font-size', 200)
        .attr('opacity', 0.1)
        .text(year);

}

function drawLineChart(states) {
    if (!states)
        return;
    lineSvg = d3.select('#visual1');
    const max = d3.max(timeData.map(d => +d[states]));
    const xScale = d3.scaleTime()
        .domain([new Date('1995'), new Date('2021')])
        .range([0, lineInnerWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, max])
        .range([lineInnerHeight, 0]);

    lineSvg.selectAll('g').remove();
    let g = lineSvg.append('g')
        .attr('transform', 'translate(' + lineMargin.left + ', ' + lineMargin.top + ')');
    g.append('g').call(d3.axisLeft(yScale)
            .tickSize(-lineInnerWidth))
        .call(g => g.select('.domain')
            .remove())
        .call(g => g.selectAll('.tick text')
            .style('fill', 'gray')
            .style('font-size', 15))
        .call(g => g.selectAll('.tick')
            .attr('stroke-opacity', 0.5)
            .attr('stroke-dasharray', "4,9"))
        .call(g => g.select('.tick:first-of-type line')
            .attr('stroke-opacity', 0));
    g.append('g').attr('transform', `translate(0,${lineInnerHeight})`)
        .call(d3.axisBottom(xScale)
            .ticks(d3.timeYear.every(5))
            .tickFormat(d => +d.getFullYear() % 10 == 0 ? d.getFullYear() : null))
        .call(g => g.select('.domain')
            .attr('stroke', 'gray'))
        .call(g => g.selectAll('.tick text')
            .style('fill', 'gray')
            .style('font-size', 15))
        .call(g => g.selectAll('.tick')
            .attr('stroke-opacity', 0.5));

    const singleLine = d3.line()
        .x(d => xScale(new Date(d.Year)))
        .y(d => yScale(+d[states]));

    var tooltip2 = d3.select('body')
        .append('div')
        .attr('class', 'tooltip2')
        .style('opacity', 0);
    var focus = g.append('g')
        .append('circle')
        .style('fill', 'none')
        .attr('stroke', 'black')
        .attr('r', 8.5)
        .style('opacity', 0);
    var bisect = d3.bisector(function (d) {
        return d.Year;
    }).left;

    g.append('path')
        .datum(timeData)
        .attr('class', 'singleLine')
        .style('fill', 'none')
        .style('stroke', 'black')
        .style('stroke-width', '2')
        .attr('d', singleLine);


    g.append('text')
        .style('font-size', 20)
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -lineInnerHeight / 2)
        .attr('y', -50)
        .attr('text-anchor', 'middle')
        .attr('fill', 'gray')
        .text('Airline Fares ' + states);
    g.append('text')
        .style('font-size', 20)
        .attr('class', 'axis-label')
        .attr('text-anchor', 'middle')
        .attr('fill', 'gray')
        .attr('x', lineInnerWidth / 2)
        .attr('y', lineInnerHeight + 40)
        .text('Year');

    g.append('rect')
        .style('fill', 'none')
        .style('pointer-events', 'all')
        .attr('width', lineInnerWidth)
        .attr('height', lineInnerHeight)
        .on('mouseover', function () {
            tooltip2.transition()
                .duration(50)
                .style('opacity', 1);
            focus.transition()
                .duration(50)
                .style('opacity', 1);
        })
        .on('mousemove', function () {
            var x0 = +xScale.invert(d3.mouse(this)[0]).getFullYear();
            var i = bisect(timeData, x0, 1);
            selectedData = timeData[i];
            tooltip2.html('Year: ' + selectedData.Year + '<br>' + 'Price: ' + selectedData[states] + '<br> Click to See the Price Influencing Factors')
                .style('left', (d3.event.pageX + 15) + 'px')
                .style('top', (d3.event.pageY - 10) + 'px');
            focus.attr('cx', xScale(new Date(selectedData.Year)))
                .attr('cy', yScale(+selectedData[states]));
        })
        .on('mouseout', function () {
            tooltip2.transition()
                .duration(50)
                .style('opacity', 0);
            focus.transition()
                .duration(50)
                .style('opacity', 0);
        })
        .on('click', function (d, i) {
            var x0 = +xScale.invert(d3.mouse(this)[0]).getFullYear();
            var i = bisect(timeData, x0, 1);
            selectedData = timeData[i];
            clickYear = +selectedData.Year;
            drawBarChart();
        });
}

function drawBarChart() {
    document.getElementById('div2').style.display = 'inline';
    var selectedData = document.getElementById('second-select').value;
    var usingData;
    var propertyName;
    var factor;
    var yDomainMin = 0;
    switch (selectedData) {
        case 'JetFuelPrice':
            usingData = fuelData;
            propertyName = 'U.S. Gulf Coast Kerosene-Type Jet Fuel Spot Price FOB Dollars per Gallon';
            factor = 8;
            break;
        case 'NASDAQ':
            usingData = stockData;
            propertyName = 'Annual % Change';
            factor = 12;
            break;
    }

    barSvg = d3.select('#visual2');
    const max = d3.max(usingData.map(d => +d[propertyName]));
    const min = d3.min(usingData.map(d => +d[propertyName]));
    if (selectedData == 'NASDAQ') {
        yDomainMin = min;
    }
    const xScale = d3.scaleTime()
        .domain([new Date('1995'), new Date('2021')])
        .range([0, lineInnerWidth]);

    const yScale = d3.scaleLinear()
        .domain([yDomainMin, max])
        .range([lineInnerHeight, 0]);

    barSvg.selectAll('g').remove();

    var div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    let g = barSvg.append('g')
        .attr('transform', 'translate(' + lineMargin.left + ', ' + lineMargin.top + ')');

    // append circle for lollipop
    g.selectAll('circle')
        .data(usingData)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(new Date((d['Year']), 0)) + 5)
        .attr('cy', d => yScale(d[propertyName]))
        .attr('r', d => ((Math.abs(+d[propertyName])) * factor / max))
        //#69b3a2
        .style("fill", function (d) {
            if (+d['Year'] == clickYear) {
                return "#6E3CBC";
            } else if (+d[propertyName] < 0) {
                return "#FF5403";
            } else {
                return "#69b3a2";
            }
        })
        .on('mouseover', function (d, i) {
            d3.select(this).classed('selectedmap', true);

            //Tooptip transition
            div.transition()
                .duration('200')
                .style("opacity", 1);
        })
        .on('mousemove', function (d, i) {
            let fuelPrice = d[propertyName];
            div.html('Value: ' + fuelPrice + '<br>' + "Year: " + +d['Year'])
                .style("left", (d3.event.pageX + 5) + "px")
                .style("top", (d3.event.pageY + 5) + "px");
        })
        .on('mouseout', function (d, i) {
            d3.select(this).classed('selectedmap', false);

            //Tooptip transition
            div.transition()
                .duration('100')
                .style("opacity", 0);
        });

    // append line for lollipop
    g.selectAll('line')
        .data(usingData)
        .enter()
        .append('line')
        .attr("x1", d => xScale(new Date((d['Year']), 0)) + 5)
        .attr("x2", d => xScale(new Date((d['Year']), 0)) + 5)
        .attr("y1", d => yScale(d[propertyName]))
        .attr("y2", yScale(0))
        .attr("stroke", function (d) {
            if (+d['Year'] == clickYear) {
                return "#6E3CBC";
            } else if (+d[propertyName] < 0) {
                return "#FF5403";
            } else {
                return "#69b3a2";
            }
        });


    //draw x and y axies
    const yAxis = d3.axisLeft(yScale);
    g.append('g').call(yAxis).call(g => g.select(".domain").remove());
    const xAxis = d3.axisBottom(xScale);
    g.append('g').call(xAxis
            .ticks(d3.timeYear.every(5))
            .tickFormat(d => +d.getFullYear() % 5 == 0 ? d.getFullYear() : null))
        .attr('transform', function () {
            if (selectedData == 'NASDAQ') {
                return `translate(0,${lineInnerHeight - 87})`;
            } else {
                return `translate(0,${lineInnerHeight})`
            }
        });

    //x and y axis label
    g.append('text')
        .style('font-size', 20)
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -lineInnerHeight / 2)
        .attr('y', -50)
        .attr('text-anchor', 'middle')
        .attr('fill', 'gray')
        .text(function() {
            if (selectedData == 'NASDAQ') {
                return 'NASDAQ Annual % Change';
            } else {
                return 'U.S. Jet Fuel Price per Gallon';
            }
            
        });
    g.append('text')
        .style('font-size', 20)
        .attr('class', 'axis-label')
        .attr('text-anchor', 'middle')
        .attr('fill', 'gray')
        .attr('x', lineInnerWidth / 2)
        .attr('y', lineInnerHeight + 40)
        .text('Year');


}

function clearSvg() {
    d3.selectAll("circle > *").remove();
    d3.selectAll("g > *").remove();
    d3.selectAll("text > *").remove();
    d3.selectAll(mapSvg).remove();
}

function checkYear() {
    var year = document.getElementById('year-input').value;
    if (year < 1995) {
        document.getElementById('year-input').value = 1995;
    } else if (year > 2020) {
        document.getElementById('year-input').value = 2020;
    }
}