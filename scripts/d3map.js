const margin = { top: 15, right: 10, bottom: 50, left: 10 };
const width = window.innerWidth - margin.left - margin.right;
const height = window.innerHeight - margin.top - margin.bottom;

const projection = d3
  .geoEquirectangular()
  .translate([width / 2, height / 2])
  .scale((width - 1) / 2.5 / Math.PI);

const path = d3.geoPath().projection(projection);

const svg = d3.select("svg").attr("width", width).attr("height", height);

const g = svg.append("g");

const zoom = d3
  .zoom()
  .scaleExtent([1, 8])
  .on("zoom", function () {
    svg.selectAll("path").attr("transform", d3.event.transform);
  });

// zoom on anywhere in the map instead just on the countries
// svg.call(zoom);

const countryLabel = d3.select("div.countryLabel");

// load countries and map their names
d3.queue()
  .defer(
    d3.json,
    "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
  )
  .defer(d3.csv, "world-country-names.csv")
  .await(ready);
function ready(error, world, names) {
  if (error) throw error;
  var countries1 = topojson.feature(world, world.objects.countries).features;
  countries = countries1.filter(function (d) {
    return names.some(function (n) {
      if (d.id == n.id) return (d.name = n.name);
    });
  });

  svg
    .selectAll("path")
    .data(countries)
    .enter()
    .append("path")
    .attr("stroke", "#000000")
    .attr("stroke-width", 1)
    .attr("fill", "white")
    .attr("d", path)
    .call(zoom)
    .on("mouseover", function (d, i) {
      d3.select(this).attr("fill", "#000000").attr("stroke-width", 2);
      return countryLabel.style("hidden", false).html(d.name);
    })
    .on("mousemove", function (d) {
      countryLabel
        .classed("hidden", false)
        .style("top", d3.event.pageY + "px")
        .style("left", d3.event.pageX + 10 + "px")
        .html(d.name);
    })
    .on("mouseout", function (d, i) {
      d3.select(this).attr("fill", "white").attr("stroke-width", 1);
      countryLabel.classed("hidden", true);
    })
    .on("click", function (d) {
      closeAndClear();
      const tokenElement = document.getElementById("shutterstockToken");
      const desc = document.getElementById("desc");
      const x = document.getElementById("close");
      if (tokenElement.value) {
        const shutterstockFetchType = document.querySelector(
          'input[name="shutterstockFetchType"]:checked'
        ).value;
        axios
          .get(
            "https://api.shutterstock.com/v2/" +
              shutterstockFetchType +
              "s/search?query=" +
              encodeURIComponent(d.name),
            {
              headers: {
                Authorization: "Bearer " + tokenElement.value.trim(),
              },
            }
          )
          .then((response) => {
            // console.log(response.data);
            // console.log(response.status);
            // console.log(response.statusText);
            // console.log(response.headers);
            // console.log(response.config);
            const item =
              response.data.data[
                Math.floor(Math.random() * response.data.data.length)
              ];

            if ("image" === shutterstockFetchType) {
              const image = svg
                .append("image")
                .attr("xlink:href", item.assets.preview.url)
                .attr("width", item.assets.preview.width)
                .attr("height", item.assets.preview.height)
                .attr("x", width / 2 - item.assets.preview.height / 2)
                .attr("y", height / 2 - item.assets.preview.height / 2);

              x.style.left = width / 2 - item.assets.preview.height / 2 + "px";
              x.style.top = height / 2 - item.assets.preview.height / 2 + "px";
            } else {
              const fObj = svg.append("foreignObject");
              fObj
                .attr("x", "20%")
                .attr("y", "10%")
                .attr("width", "60%")
                .attr("height", "80%");
              const vidObj = fObj.append("xhtml:video");
              vidObj
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("controls", "true")
                .attr("autoplay", "true");
              const src = vidObj.append("xhtml:source");
              src
                .attr("type", "video/mp4")
                .attr("src", item.assets.preview_mp4.url);

              const foreignObject = svg.select("foreignObject");
              x.style.left = foreignObject.x + "px";
              x.style.top = foreignObject.y + "px";
            }

            x.style.display = "block";
            desc.innerHTML = d.name + " - " + item.description;
            desc.style.display = "block";
          })
          .catch((error) => {
            console.log(error);
            if (error?.response?.statusText) {
              console.log(error.response);
              alert(error.response.statusText);
              if (error.response.status === 401) {
                tokenElement.focus();
              }
            }
          });
      } else {
        desc.innerHTML = "Please provide Shutterstock API Token";
        desc.style.display = "block";
        x.style.display = "block";
      }
    });
}

function closeAndClear() {
  const x = document.getElementById("close");
  x.style.left = "20px";
  x.style.top = "20px";
  x.style.display = "none";
  svg.selectAll("image").remove();
  svg.selectAll("foreignObject").remove();
  const desc = document.getElementById("desc");
  desc.style.display = "none";
  const tokenElement = document.getElementById("shutterstockToken");
  if (!tokenElement.value) {
    tokenElement.focus();
  }
}
