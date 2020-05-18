const variable = "current"

const variables = {
  current: "Aktuell erkrankte",
  cases: "Bestätigte Fälle",
  recovered: "Gesundete",
  dead: "Todesfälle"
}

//------------------------1. PREPARATION-------------------------//
//-----------------------------SVG-------------------------------//
const width = 960;
const height = 500;
const margin = 5;
const padding = 5;
const adj = 30;
// we are appending SVG first
const svg = d3.select("div#container").append("svg")
  .attr("preserveAspectRatio", "xMinYMin meet")
  .attr("viewBox", "-" +
    adj + " -" +
    adj + " " +
    (width + adj * 3) + " " +
    (height + adj * 3))
  .style("padding", padding)
  .style("margin", margin)
  .classed("svg-content", true);

//-----------------------------DATA------------------------------//
const timeConv = d3.timeParse("%d.%m.%Y");

const dataset = d3.csv("https://raw.githubusercontent.com/od-ms/resources/master/coronavirus-fallzahlen-regierungsbezirk-muenster.csv",
  function(d) {
    return {
      area: d["Gebiet"],
      date: timeConv(d["Datum"]),
      cases: +d["Bestätigte Faelle"],
      recovered: +d["Gesundete"],
      dead: +d["Todesfaelle"],
      current: (d["Gesundete"] ? +d["Bestätigte Faelle"] - (+d["Gesundete"] + +d["Todesfaelle"]) : null)
    };
  });

dataset.then(function(data) {

  const slices = d3.nest()
    .key(function(d) {
      return d["area"];
    })
    .entries(data);

  //----------------------------SCALES-----------------------------//

  const xScale = d3.scaleTime()
    .domain(d3.extent(data, function(d) {
      return d.date
    })).range([0, width - 80]); // leave 80px space for labels

  const yScale = d3.scaleLinear()
    .domain([(0), d3.max(slices, function(c) {
      return d3.max(c.values, function(d) {
        return d[variable];
      });
    })]).rangeRound([height, 0]);

  //-----------------------------AXES------------------------------//

  const yaxis = d3.axisLeft()
    //.ticks((slices[0].values).length)
    .scale(yScale);

  const xaxis = d3.axisBottom()
    //.ticks(d3.timeDay.every(10))
    .tickFormat(d3.timeFormat('%d.%m.'))
    .scale(xScale);


  //-------------------------2. DRAWING----------------------------//

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xaxis);

  svg.append("g")
    .attr("class", "axis")
    .call(yaxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("dy", ".75em")
    .attr("y", 6)
    .style("text-anchor", "end")
    .text(variables[variable]);


  //-----------------------------AXES------------------------------//

  //----------------------------LINES------------------------------//

  const line = d3.line()
    .y(function(d) {
      return yScale(d[variable]);
    })//.defined(function(d) { // Omit empty values.
      //return d[variable]  !== null;
    //})
    .x(function(d) {
      return xScale(d.date);
    });


  const backgrounds = svg.selectAll(".bg")
    .data(slices)
    .enter()
    .append("g");

  backgrounds.append("path")
    .attr("class", "bg")
    .attr("id", function(d){
      return d.key.split(" ")[1];
     })
    .attr("d", function(d) {
      return line(d.values);
    })
    .on("mouseenter", function(d) {
      g = d.key.split(" ")[1];
      d3.select(".Münster").attr("style", "display: none");
      d3.select("." + g).attr("style", "display: block");
      d3.select("path.bg#" + g).attr("style", "stroke-opacity: 0.4");
    })
    .on("mouseleave", function(d) {
      g = d.key.split(" ")[1];
      d3.select("." + g).attr("style", "display: none");
      d3.select(".Münster").attr("style", "display: block");
      d3.select("path.bg#" + g).attr("style", "stroke-opacity: 0.0");
    });

  const lines = svg.selectAll(".dataline")
    .data(slices)
    .enter()
    .append("g");

  lines.append("path")
    .attr("class", function(d) {
      if (d.key == "Stadt Münster") {
        return "dataline ms";
      } else {
        return "dataline andere";
      }
    })
    .attr("d", function(d) {
      return line(d.values);
    });



  // add labels to the right
  lines.append("text")
    .datum(function(d) {
      return {
        id: d.key,
        value: d.values[0]
      };
    })
    .attr("class", function(d) {
      g = d.value.area.split(" ")[1];
      return "gebietelabel " + g;
    })
    .attr("transform", function(d) {

      return "translate(" + (xScale(d.value.date) + 5) +
        "," + (yScale(d.value[variable]) + 5) + ")";
    })
    //.attr("x", 5)
    .text(function(d) {
      return d.value.area;
    });
});
