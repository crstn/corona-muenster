const variable = "current";

const variables = {
  current: "Aktuell Erkrankte",
  cases: "Bestätigte Fälle",
  recovered: "Gesundete",
  dead: "Todesfälle"
}

var dateextent;  // will store the range of dates covered
var coronadata; // will store all our data by area

//------------------------1. PREPARATION-------------------------//
//-----------------------------SVG-------------------------------//
const width = 960;
const height = 400;
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
      dead: +d["Todesfaelle"] //,
      //current: (d["Gesundete"] ? +d["Bestätigte Faelle"] - (+d["Gesundete"] + +d["Todesfaelle"]) : null)
    };
  });

dataset.then(function(data) {

  // turn the tabular into hierarchical data, organized by area
  const slices = d3.nest()
    .key(function(d) {
      return d["area"];
    })
    .entries(data);

  // for missing data, assume the data from the previous day:
  const tf = d3.timeFormat('%d.%m.');

  // next, we'll sort the data b time stamp in ascending order
  // and add data about recovered and dead to the days where this
  // data is missing, assuming the number has not changed since the
  // previous day.

  // I'm sure there must be a more elegant way to do this, but here we go...

  // loop through areas
  for (i in slices) {

    // sort data points for this area ascendingly by date
    slices[i]["values"] = slices[i]["values"].slice().sort((a, b) => d3.ascending(a.date, b.date));

    // handle the first one separately
    // at the first data point, the current cases are equal to the total cases
    slices[i]["values"][0].current = slices[i]["values"][0].cases;

    for (var j = 1; j < slices[i]["values"].length; j++) {
      if (slices[i]["values"][j].recovered == 0 && slices[i]["values"][j - 1].recovered > 0) {
        slices[i]["values"][j].recovered = slices[i]["values"][j - 1].recovered;
      }

      if (slices[i]["values"][j].dead == 0 && slices[i]["values"][j - 1].dead > 0) {
        slices[i]["values"][j].dead = slices[i]["values"][j - 1].dead;
      }

      slices[i]["values"][j].current = slices[i]["values"][j].cases - (slices[i]["values"][j].recovered + slices[i]["values"][j].dead);

    }
  }

  console.log(slices);

  dateextent = d3.extent(data, function(d) {
    return d.date
  })

  coronadata = slices;

  update(variable);


});


function update(variable) {


  //----------------------------SCALES-----------------------------//

  const xScale = d3.scaleTime()
    .domain(dateextent).range([0, width - 80]); // leave 80px space for labels

  const yScale = d3.scaleLinear()
    .domain([(0), d3.max(coronadata, function(c) {
      return d3.max(c.values, function(d) {
        return d[variable];
      });
    })]).rangeRound([height, 0]);

  //-----------------------------AXES------------------------------//

  const yaxis = d3.axisLeft()
    .scale(yScale);

  const xaxis = d3.axisBottom()
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
    }) //.defined(function(d) { // Omit empty values.
    //return d[variable]  !== null;
    //})
    .x(function(d) {
      return xScale(d.date);
    });


  const backgrounds = svg.selectAll(".bg")
    .data(coronadata)
    .enter()
    .append("g");

  backgrounds.append("path")
    .attr("class", "bg")
    .attr("id", function(d) {
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
    .data(coronadata)
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
        value: d.values[d.values.length - 1]
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

}
