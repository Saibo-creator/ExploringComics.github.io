let characterIdsDataFile = 'data/characterIds.csv';
let relationshipsDataFile = 'data/relationships.csv';

const colorConnection = "#E0E0E0";

let filteredCharacterIds = [];
let firstCall = 1;

let svg;
let characterPopupBox;
let characterInfoBox;
let lastLayout; //store layout between updates

//let colorCharacterId = '#008080';

// size of the visualization
const wChord = 900,
    hChord = 900,
    rInner = hChord / 2.6,
    rOut = rInner - 30,
    paddingChord = 0.02;

// position of the visualization
const marginChord = {top: 10, right: 10, bottom: 10, left: 10},
    widthChord = wChord - marginChord.left - marginChord.right,
    heightChord = hChord - marginChord.top - marginChord.bottom;

// Colors based on the groups
const lookupColorCharacterId = {
    'Human': "#DB7093",
    'Alien': "#3CB371",
    'Animal': "#8B4513",
    'Mutant': "#006400",
    'God/Eternal': "#FFD700",
    'Other': "#7e7878",
    'Cyborg':"#2F4F4F",
    'Infection':"#00FFFF",
    'Robot':"#4B0082",
    'Radiation':"#B22222"
};

function drawChord(matrix, labels) { // try to improve those callings and refactor
    /**
     * Draw chord diagram where the connections are the the log of the number of common actors of two characterIds
     *
     * @param {2d array} matrix - i,j element is the lof of number of common actor between 2 characterIds
     * @param {array} labels - array containing characterIds' names
     */

    d3.selectAll().remove();

    labels = labels.filter( function(el) {
        return !filteredCharacterIds.includes(el['characterId']);
    } );
    let chord = d3.chord().padAngle(paddingChord);

    if(firstCall){
        characterPopupBox = d3.select("#chord")
            .append("div")
            .attr("class", "character-popup-box")
            .attr("id", "character-popup-box")
            .style("visibility", "hidden");

        characterInfoBox = d3.select("#chord")
            .append("div")
            .attr("class", "character-info-box")
            .attr("id", "character-info-box")
            .style("visibility", "hidden");

        svg = d3.select("#chord")
            .append("svg:svg")
            .attr("font-size", 10)
            .attr("width", widthChord)
            .attr("height", heightChord)
            .append("svg:g")
            .attr("transform", "translate(" + widthChord / 2 + "," + heightChord / 2 + ")");

        firstCall = 0;
    }
    let groupG = svg.selectAll("g.group")
        .data(chord(matrix).groups);

    let newGroups = groupG.enter().append("g")
        .attr("class", "group");

    groupG.exit()
        .transition()
        .duration(3000)
        .attr("opacity", 0)
        .remove();

    svg.selectAll("g.chord").remove();
    let chordPaths =  svg.append("svg:g")
        .attr("class", "chord")
        .selectAll("path")
        .data(chord(matrix), chordKey);

    let newChords = chordPaths.enter()
        .append("svg:path")
        .filter(function (d) {
            return d.source.index !== d.target.index;
        });

    chordPaths.exit().transition()
        .duration(500)
        .attr("opacity", 0)
        .remove();
    newChords.transition()
        .duration(1500)
        .style("fill", colorConnection)
        .attr("opacity", 1) //optional, just to observe the transition
        .attrTween("d", chordTween(lastLayout))
        .transition()
        .duration(500)
        .attr("d", d3.ribbon().radius(rOut))
        .style("opacity", 1); //reset opacity


    let wrapper = svg.append("g").attr("class", "chordWrapper");

    let g = wrapper.selectAll("g.group")
        .data(chord(matrix).groups)
        .enter().append("g")
        .attr("class", "group");

    let paths = g.append("path")
        .style("stroke", function (d) {
            return d => d3.rgb(lookupColorCharacterId[labels[d.index]['characterOrigin']]).darker() //lookupColorCharacterId[labels[d.index]['characterOrigin']];
        })
        .style("fill", function (d) {
            return lookupColorCharacterId[labels[d.index]['characterOrigin']];
        })
        .style("stroke", "black")
        .style("opacity", 0.7)
        .attr("d", d3.arc().innerRadius(rOut).outerRadius(rInner))
        .on("click", fade(0, "visible"))
        .on("mouseout", fade(1, "hidden"));


    let pathLabels = g.append("text")
        .each(function (d) {
            d.angle = (d.startAngle + d.endAngle) / 2;
        })
        .attr("class", "labels")
        .attr("dy", ".35em")
        .attr("transform", function (d) {
            return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
                + "translate(" + (rInner + 5) + ")"
                + (d.angle > Math.PI ? "rotate(180)" : "");
        })
        .style("text-anchor", function (d) {
            return d.angle > Math.PI ? "end" : null;
        })
        .text(function (d, i) {
            return labels[i]['characterName'];
        });

    paths.transition()
        .duration(1500)
        .attr("opacity", 0)
        .remove()
        .attrTween("d", arcTween(lastLayout))
        .transition().duration(100).attr("opacity", 1);

    pathLabels.transition()
        .duration(1500)
        .attr("opacity", 0)
        .remove()
        .transition().duration(100).attr("opacity", 1);

    function fade(opacity, showInfos) {
        /**
         * Show information of the selected characterId when the mouse is on and hide other characterIds
         *
         * @param {number} opacity - degree of visibility of other characterIds not related with the select one
         * @param {boolean} showInfos - true to show informations about PR's, # actors and characterId characterOrigin
         */

        return function (g, i) {
            svg.selectAll("g.chord path")
                .filter(function (d) {
                    return d.source.index !== i && d.target.index !== i;
                })
                .transition()
                .style("opacity", opacity);

            // Popup box when element is clicked
            if (showInfos === "visible") {

                // Fill in popup box
                let characterId = labels[i]['characterId'];
                let characterImage = labels[i]['characterImage'];
                let characterOrigin = labels[i]['characterOrigin'];
                let characterName = labels[i]['characterName'];
                let characterGender = ((labels[i]['gender']===1) ? 'Male' : 'Female');
                let characterDeck = labels[i]['deck'];
                let characterUrl = labels[i]['siteDetailUrl'];
                let characterAliases = labels[i]['aliases'];
                let characterBirth = ((labels[i]['birth']=='') ? ' - ' : labels[i]['birth']);
                let characterRealName = labels[i]['realName'];

                // clear previous text in the box
                let list = document.getElementById("character-popup-box");
                if (list.hasChildNodes()) {
                    while (list.hasChildNodes()) {
                        list.removeChild(list.firstChild);
                    }
                }

                var p = document.createElement('p');
                p.className = "title-character-popup-box";
                p.innerHTML = "<b>Id:</b> " + characterId;
                p.style.color = lookupColorCharacterId[characterOrigin];
                document.getElementById('character-popup-box').appendChild(p);

                var div = document.createElement('div');
                div.className = "title-character-popup-box";
                div.innerHTML = "<b>Origin:</b> " + characterOrigin +
                    "<img src=\"" + characterImage + "\" alt=\"Flowers in Chania\" style=\"width:80px;height:80px;\">";
                document.getElementById('character-popup-box').appendChild(div);

                // Fill in info box
                // clear previous text in the box
                let list_info = document.getElementById("character-info-box");
                if (list_info.hasChildNodes()) {
                    while (list_info.hasChildNodes()) {
                        list_info.removeChild(list_info.firstChild);
                    }
                }

                var p = document.createElement('p');
                p.className = "title-character-info-box";
                p.innerHTML = "<h3>"+characterName+"</h3>";
                p.style.color = lookupColorCharacterId[characterOrigin];
                document.getElementById('character-info-box').appendChild(p);

                var div = document.createElement('div');
                //div.className = "title-character-info-box";
                div.innerHTML = "<div class=\"row\">" +
                    "<div class=\"col-lg-6 col-md-6 col-sm-6\" style='font-size: 9pt'>" +
                        "<p><b>Id:</b> " + characterId + "</p>" +
                        "<p><b>Real Name:</b> " + characterRealName + "</p>" +
                        "<p><b>Aliases:</b> " + characterAliases + "</p>" +
                        "<p><b>Birth:</b> " + characterBirth + "</p>" +
                        "<p><b>Origin:</b> " + characterOrigin + "</p>" +
                        "<p><b>Gender:</b> " + characterGender + "</p>" +
                    "</div>"+
                    "<div class=\"col-lg-6 col-md-6 col-sm-6\">" +
                        "<img src=\"" + characterImage + "\" alt=\"Flowers in Chania\" style=\"width:110px;height:110px;\">" +
                    "</div></div><br/>";
                document.getElementById('character-info-box').appendChild(div);

                var divText = document.createElement('div');
                divText.className = "title-character-info-box";
                divText.innerHTML = "<div>" + characterDeck + "</div>" +
                    "<br/>More info on link: <a href='"+characterUrl+"'> click here</a>";
                document.getElementById('character-info-box').appendChild(divText);

            }

            characterPopupBox
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 50) + "px")
                .style("visibility", showInfos);

            characterInfoBox
                .style("left", (svg.width) + "px")
                .style("top", (svg.height) + "px")
                .style("visibility", showInfos);
        }
    }

    lastLayout = chord(matrix);
}

function loadChords(){
    d3.queue()
        .defer(d3.csv, characterIdsDataFile)
        .defer(d3.csv, relationshipsDataFile)
        .await(function (error, characterIds, relationships) {
            /***
             * Function treats and reads the data, call functions to build the relationships matrix and draw the Chord diagram
             */
            let matrix = getMatrixCommonActors(relationships, filteredCharacterIds);

            drawChord(matrix, characterIds);
        });
}


function chordTween(oldLayout) {
    //this function will be called once per update cycle

    //Create a key:value version of the old layout's chords array
    //so we can easily find the matching chord
    //(which may not have a matching index)

    let oldChords = {};

    if (oldLayout) {
        oldLayout.forEach( function(chordData) {
            oldChords[ chordKey(chordData) ] = chordData;
        });
    }

    return function (d, i) {
        //this function will be called for each active chord
        let tween;
        let old = oldChords[ chordKey(d) ];
        if (old) {
            if (d.source.index !== old.source.index ){
                old = {
                    source: old.target,
                    target: old.source
                };
            }

            tween = d3.interpolate(old, d);
        }
        else {
            //create a zero-width chord object
            let emptyChord = {
                source: {
                    startAngle: d.source.startAngle,
                    endAngle: d.source.startAngle
                },
                target: {
                    startAngle: d.target.startAngle,
                    endAngle: d.target.startAngle
                }
            };
            tween = d3.interpolate( emptyChord, d );
        }
        return function (t) {
            //this function calculates the intermediary shapes
            let path = d3.ribbon().radius(rOut);
            return path(tween(t));
        };
    };
}

function chordKey(data) {
    return (data.source.index < data.target.index) ?
        data.source.index  + "-" + data.target.index:
        data.target.index  + "-" + data.source.index;
}

function arcTween(oldLayout) {
    //this function will be called once per update cycle
    let arc = d3.arc()
        .innerRadius(rOut)
        .outerRadius(rInner);
    let oldGroups = {};
    if (oldLayout) {
        oldLayout.groups.forEach( function(groupData) {
            oldGroups[ groupData.index ] = groupData;
        });
    }

    return function (d, i) {
        let tween;
        let old = oldGroups[d.index];
        if (old) { //there's a matching old group
            tween = d3.interpolate(old, d);
        }
        else {
            //create a zero-width arc object
            let emptyArc = {
                startAngle:d.startAngle,
                endAngle:d.startAngle
            };
            tween = d3.interpolate(emptyArc, d);
        }

        return function (t) {
            return arc( tween(t) );
        };
    };
}

function returnCharacterId(characterId, i){
    let index = filteredCharacterIds.indexOf(characterId);
    filteredCharacterIds.splice(index, 1);
    d3.select('#'+characterId.replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\-\#]', 'g'), '\\$&')).remove();
    updateFilters();
    loadChords();
}

function updateFilters(){
    if (filteredCharacterIds.length > 0){
        d3.select("#clear_button").style("opacity", 1);
    }else{
        d3.select("#clear_button").style("opacity", 0);
    }
    let filters = d3.select('#filtered_characterIds')
        .selectAll('li')
        .data(filteredCharacterIds);
    // Enter
    filters.enter()
        .append('li')
        .attr('class', 'list-group-item')
        .attr("id", function(d,i) { return d; })
        .on("click", function(d, i){
            returnCharacterId(d);
        })
        .text(function(d) { return d; });
    // Exit
    filters.exit().remove();
}

function returnAllCharacterIds(){
    filteredCharacterIds = [];
    d3.select('#filtered_characterIds')
        .selectAll('li')
        .remove();
    d3.select("#clear_button").style("opacity", 0);
    loadChords();
}

loadChords();

d3.select("#clear_button")
    .style("opacity", 0)
    .on("click", returnAllCharacterIds);

// Timeline
var testData = [
    {times: [{"starting_time": 1355752800000}, {"starting_time": 1355767900000, "ending_time": 1355774400000}]},
    {times: [{label: "first female character", "starting_time": 1355759910000 }], id: 1488},
    {times: [{label: "first gay character", "starting_time": 1355761910000}]}
];

var timeline = d3v3.timeline()
    .display("circle")
    // .beginning(1355752800000) // we can optionally add beginning and ending times to speed up rendering a little
    // .ending(1355774400000)
    .tickFormat({
        format: d3v3.time.format("%Y"),
        tickTime: d3v3.time.hours,
        tickInterval: 1,
        tickSize: 6
    })
    .stack()
    .click((d, i, datum) => {console.log(datum)});

d3v3.select("#timeline")
    .append("svg")
    .attr("width", widthChord)
    .datum(testData)
    .call(timeline);

	
//Parsets
var chart = d3v3.parsets()
      .dimensions([ "Sex", "Alignment", "Alive", "Identity"]);

var vis = d3v3.select("#parsets").append("svg")
    .attr("width", chart.width())
    .attr("height", chart.height());

	
d3v3.csv("data/first_bipartite.csv", function(error, csv) {
  vis.datum(csv).call(chart);
});

//Mosaic Plot
d3.json('data/mosaic_ch.json', function (data) {
	d3.shuffle(data);
	d3.mosaicPlot(data, {
	  id: 'appearance-mosaic',
	  rows: ['Black Hair', 'Brown Hair', 'Blond Hair', 'Red Hair', 'No Hair'],
	  columns: ['Brown Eyes', 'Blue Eyes', 'Green Eyes', 'Red Eyes', 'Black Eyes'],
	  series: ['Female Characters', 'Male Characters'],
	  colorScheme: ['#e2272a', '#00a037'],
	  scaleZ: {
		uniform: false,
		independent: true,
		paddingMidst: 0.02,
		
	  },
	  scaleY: {
		uniform: false,
		independent:true,
		paddingInner: 0.2,
		paddingOuter: 0,
		paddingMidst: 0
	  },
	  scaleX: {
		uniform: false,
		paddingInner: 0.05,
		paddingOuter: 0,
		paddingMidst: 0
	  },
	  labels: {
		show: true
	  },
	  tooltip: {
		html: function (d) {
		  var html = 'Eyes: ' + d.column + '<br/>Hair: ' + d.row;
		  if (d.series) {
			html += '<br/>Sex: ' + d.series;
		  }		  
		  html += '<br/>Count: ' + d.value;
		  if (d.image && d.name) {
			html += '<br/>Representative: ' + d.name;
			html += "<br/><img src=\"" + d.image + "\" style=\"width:250px;height:375px;\"/>"
		  }
		  return html;
		}
	  },
	  stroke: 'currentColor'
	});
  });