const variable = "current";
const language = "DE"

const test = [
  { variable: "current",
    lang: "DE",
    label: "Aktuelle Fälle"
  },
  {
    variable: "cases",
    label: "Fälle gesamt",
    lang: "DE",
  },
  {
    variable: "recovered",
    label: "Gesundete",
    lang: "DE",
  },
  {
    variable: "dead",
    label: "Todesfälle",
    lang: "DE",
  },
  {
    variable: "current",
    lang: "EN",
    label: "Current cases"
  },
  {
    variable: "cases",
    lang: "EN",
    label: "Total cases"
  },
  {
    variable: "recovered",
    lang: "EN",
    label: "Recovered"
  },
  { variable: "dead",
    lang: "EN",
    label: "Deaths"
  }
]


const variables = {
  current: {
    DE: "Aktuelle Fälle",
    EN: "Current cases"
  },
  cases: {
    DE: "Fälle gesamt",
    EN: "Total cases"
  },
  recovered: {
    DE: "Gesundete",
    EN: "Recovered"
  },
  dead: {
    DE: "Todesfälle",
    EN: "Deaths"
  }
}

// add language selection
d3.selectAll(".langselecta")
  .on("click", function() {
    newlang = this.id;

    currentVar = d3.select('select#var').property('value');
    console.log(currentVar);

    // swap texts
    d3.selectAll(".langswitch").attr("style", "display: none");
    d3.selectAll("." + newlang).attr("style", "display: block");
    // update language selection indicator at top
    d3.selectAll(".langselecta").classed("selected", false);
    d3.selectAll(".langselecta#" + newlang).classed("selected", true);
    // variable selection
    d3.select('#myselect').property('value', currentVar);

  });

// add variable selection
d3.select("div#selecta")
  .append("select")
  .attr("id", "var");

var options = d3.select("select#var")
                .selectAll("span")
                .data(test)
                .enter()
                .append("option")
                .attr("class", function(d){
                  return "langswitch "+d.lang;
                })
                .attr("value", function(d){
                  return d.variable;
                })
                .text(function(d){ return d.label; });


d3.select("select#var")
  .on('change', function() {
    update(d3.select(this).property('value'));
});

var transitiontime = 0;

var dateextent; // will store the range of dates covered
var coronadata; // will store all our data by area

var xScale;
var yScale;
var xaxis;
var yaxis;

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

  dateextent = d3.extent(data, function(d) {
    return d.date
  })

  coronadata = slices;

  // initialize scales

  xScale = d3.scaleTime()
    .domain(dateextent).range([0, width - 80]); // leave 80px space for labels

  // domain of the yScale will be updated dynamically!
  yScale = d3.scaleLinear()
    .rangeRound([height, 0]);

  //-----------------------------AXES------------------------------//

  yaxis = d3.axisLeft()
    .scale(yScale);
  svg.append("g")
    .attr("class", "myYaxis axis");

  xaxis = d3.axisBottom()
    .tickFormat(d3.timeFormat('%d.%m.'))
    .scale(xScale);

  // x axis doesn't change
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xaxis);


  update(variable);


});

// this is where the action is...
function update(variable) {

  // update the domain for y scale
  yScale.domain([(0), d3.max(coronadata, function(c) {
    return d3.max(c.values, function(d) {
      return d[variable];
    });
  })])

  // update the y Axis
  svg.selectAll(".myYaxis")
    .transition()
    .duration(transitiontime)
    .call(yaxis);


  // upade the lines

  const line = d3.line()
    .x(function(d) {
      return xScale(d.date);
    })
    .y(function(d) {
      return yScale(d[variable]);
    });


  var backgrounds = svg.selectAll(".bg")
    .data(coronadata);

  var b = backgrounds.enter()
    .append("path")
    .merge(backgrounds)
    .transition()
    .duration(transitiontime)
    .attr("class", "bg")
    .attr("id", function(d) {
      return d.key.split(" ")[1];
    })
    .attr("d", function(d) {
      return line(d.values);
    });

  console.log(b);

  svg.selectAll(".bg")
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

  var lines = svg.selectAll(".dataline")
    .data(coronadata);

  lines.enter()
    .append("path")
    .merge(lines)
    .transition()
    .duration(transitiontime)
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
  var labels = svg.selectAll(".gebietelabel")
    .data(coronadata);

  labels.enter()
    .append("text")
    .merge(labels)
    .transition()
    .duration(transitiontime)
    .attr("class", function(d) {
      g = d.key.split(" ")[1];
      return "gebietelabel " + g;
    })
    .attr("transform", function(d) {
      return "translate(" + (xScale(d.values[d.values.length - 1].date) + 5) +
        "," + (yScale(d.values[d.values.length - 1][variable]) + 5) + ")";
    })
    //.attr("x", 5)
    .text(function(d) {
      return d.key;
    });

  // set the transition time to one second after the inital run
  transitiontime = 1000

}
