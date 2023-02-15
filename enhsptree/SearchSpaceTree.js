var treeData;
// Set the dimensions and margins of the diagram
var margin = { top: 250, right: 0, bottom: 30, left: 0 },
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;
var i = 0,
    duration = 750,
    root;
var treemap;
var svg;
var lastClicked;

// Waiting for the DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // append the svg object to the body of the page
    // appends a 'group' element to 'svg'
    // moves the 'group' element to the top left margin
    svg = d3.select("#treePanel").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .call(d3.zoom().on("zoom", function() {
            //limit zoom
            if (d3.event.transform.k > 5) {
                d3.event.transform.k = 5;
            } else if (d3.event.transform.k < 0.1) {
                d3.event.transform.k = 0.1;
            }
            svg.attr("transform", d3.event.transform);
        }))
        .append("g")
        //.attr("transform", "translate(" +
        //  margin.left + "," + margin.top + ")");
        // declares a tree layout and assigns the size
    treemap = d3.tree().nodeSize([25, 25]);

    // Select the file input element
    document.getElementById('fileInput')
        .addEventListener('change', function() {
            // Read the file
            var fr = new FileReader();
            fr.onload = function() {
                treeData = fr.result.replaceAll("descendants", "children");
                console.log(treeData);
                loadTree();
            }

            fr.readAsText(this.files[0]);
        })
})


function loadTree() {
    // Empty predicateTable
    var table = document.getElementById("predicateTable");
    table.innerHTML = "";

    // Assigns parent, children, height, depth
    root = d3.hierarchy(JSON.parse(treeData), function(d) { return d.children; });
    root.x0 = height / 2;
    root.y0 = 0;

    // Getting information about the tree
    
    var treeSpecs = treeInfo(root)
    var width = document.getElementById("width")
    width.innerHTML = treeSpecs[0]
    var height = document.getElementById("height");
    height.innerHTML = treeSpecs[1];
    var averageBF = document.getElementById("averageBF");
    averageBF.innerHTML = treeSpecs[2]
    
    
    d3.select("g").attr("transform", "translate(" +
    (d3.select("svg").node().getBoundingClientRect().width/2) + "," 
    + (d3.select("svg").node().getBoundingClientRect().height/2) + ")");

    // Collapse after the second level
    root.children.forEach(collapse);

    update(root);
}


//Returns the width, the height and the average branching factor of the tree
function treeInfo(root) {

    if (!root) return 0
  
    var currentLevel = [root]
    var nextLevel = []
    var width = 0
    var totalLevels = 0
    var n_nodes = 0

    while (currentLevel.length > 0) {
        totalLevels++
        width = Math.max(width, currentLevel.length)
        for (let i = 0; i < currentLevel.length; i++) {
            let node = currentLevel[i]
            n_nodes++
            if (node.children) nextLevel = nextLevel.concat(node.children)
        }
        currentLevel = nextLevel
        nextLevel = []
    }

    var averageBF = n_nodes/totalLevels
    
    return [width, root.height, Math.round(averageBF)]
    
}

// Collapse the node and all it's children
function collapse(d) {
    if (d.children) {
        d._children = d.children
        d._children.forEach(collapse)
        d.children = null
    }
}

function uncollapse(d) {
    if (d._children) {
        d.children = d._children;
        d._children = null;
      }
    if (d.children) {
        d.children.forEach(uncollapse);
    }
}

function update(source) {

    // Assigns the x and y position for the nodes
    var treeData = treemap(root);

    // Compute the new tree layout.
    var nodes = treeData.descendants(),
        links = treeData.descendants().slice(1);

    // Normalize for fixed-depth.
    nodes.forEach(function(d) { d.y = d.depth * 180 });

    // ****************** Nodes section ***************************

    // Update the nodes...
    var node = svg.selectAll('g.node')
        .data(nodes, function(d) { return d.id || (d.id = ++i); })
        .attr("class", "node");

    // Enter any new modes at the parent's previous position.
    var nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr("transform", function(d) {
            return "translate(" + source.y0 + "," + source.x0 + ")";
        })
        .on("click", function(d) {
            if (d.children) {
                d._children = d.children;
                d.children = null;
                } else {
                d.children = d._children;
                d._children = null;
                }
            update(d)
            d3.selectAll(".node").classed("selected", false);
            d3.select(this).classed("selected", true);
            //change all other nodes outline color
            d3.selectAll(".node").select('circle.node')
                .style("stroke", function(dd) {
                    //black if visited
                    return dd.data.visited ? "black" : "#4682B4";
                })
                .style("stroke-width", "2px");
            //change node outline color and border thickness animation
            d3.select(this).select('circle.node')
                .style("stroke", "red")
                .style("stroke-width", "4px");
            click(d);

        })
        .on("mouseover", function(d) {
            //change size timed
            d3.select(this).select('circle.node')
                .transition()
                .duration(100)
                .attr('r', 13);
        })
        .on("mouseout", function(d) {
            //change size
            d3.select(this).select('circle.node')
                .transition()
                .duration(100)
                .attr('r', 10);
        });
    // Add Circle for the nodes
    nodeEnter.append('circle')
        .attr('class', 'node')
        .attr('r', 1e-6)
        .style("fill", function(d) {
            return d._children ? "lightsteelblue" : "#fff";
        });


    // Add labels for the nodes
    nodeEnter.append('text')
        .attr("dy", ".35em")
        .attr("x", -15)
        .attr("text-anchor", "end")
        .text(function(d) {
            var text = d.data.visit_step;
            return text;
        });

    nodeEnter.append('text')
        .attr("dy", "-.25em")
        .attr("x", 15)
        .text(function(d) {
            var text = "";
            if (d.data.action != null) {
                var posSpace = d.data.action.substring((d.data.action.length / 2) - 1, d.data.action.length).indexOf(" ");
                if (posSpace != -1) text = d.data.action.substring(0, (d.data.action.length / 2) - 1 + posSpace);
                else text = d.data.action;
            }
            return text;
        });

    nodeEnter.append('text')
        .attr("dy", ".95em")
        .attr("x", 15)
        // .attr("x", function(d) {
        //     return d.children || d._children ? -15 : 15;
        // })
        // .attr("text-anchor", function(d) {
        //     return d.children || d._children ? "end" : "start";
        // })
        .text(function(d) {
            var text = "";
            if (d.data.action != null) {
                var posSpace = d.data.action.substring((d.data.action.length / 2) - 1, d.data.action.length).indexOf(" ");
                if (posSpace != -1) text = d.data.action.substring((d.data.action.length / 2) - 1 + posSpace + 1, d.data.action.length);
            }
            return text;
        });

    // UPDATE
    var nodeUpdate = nodeEnter.merge(node);

    // Transition to the proper position for the node
    nodeUpdate.transition()
        .duration(duration)
        .attr("transform", function(d) {
            return "translate(" + d.y + "," + d.x + ")";
        });

    // Update the node attributes and style
    nodeUpdate.select('circle.node')
        .attr('r', 10)
        //outline
        .style("stroke", function(d) {
            //black if visited
            return d.data.visited ? "black" : "#4682B4";
        })
        .style("fill", function(d) {
            //fill if visited
            return d.data.visited ? "lightsteelblue" : "#fff";
        })
        .style("stroke-width", "2px")
        .attr('cursor', 'pointer');

    // Remove any exiting nodes
    var nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", function(d) {
            return "translate(" + source.y + "," + source.x + ")";
        })
        .remove();

    // On exit reduce the node circles size to 0
    nodeExit.select('circle')
        .attr('r', 1e-6);

    // On exit reduce the opacity of text labels
    nodeExit.select('text')
        .style('fill-opacity', 1e-6);

    // ****************** links section ***************************

    // Update the links...
    var link = svg.selectAll('path.link')
        .data(links, function(d) { return d.id; });

    // Enter any new links at the parent's previous position.
    var linkEnter = link.enter().insert('path', "g")
        .attr("class", "link")
        .attr('d', function(d) {
            var o = { x: source.x0, y: source.y0 }
            return diagonal(o, o)
        });

    // Make link thicker and darker if visited
    linkEnter.style("stroke", function(d) {
            return d.data.visited ? "#4682B4" : "#999";
        })
        .style("stroke-width", function(d) {
            return d.data.visited ? "3px" : "1px";
        });


    // UPDATE
    var linkUpdate = linkEnter.merge(link);

    // Transition back to the parent element position
    linkUpdate.transition()
        .duration(duration)
        .attr('d', function(d) { return diagonal(d, d.parent) });

    // Remove any exiting links
    var linkExit = link.exit().transition()
        .duration(duration)
        .attr('d', function(d) {
            var o = { x: source.x, y: source.y }
            return diagonal(o, o)
        })
        .remove();

    // Store the old positions for transition.
    nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
        d.data.state = parseData(d.data.state);
    });


    // Creates a curved (diagonal) path from parent to the child nodes
    function diagonal(s, d) {

        path = `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`

        return path
    }

    // Toggle children on click.
    function click(d) {
        //update(d);
        var parentData = null;
        var nodeData = d.data;
        if (d.parent != null) {
            parentData = d.parent.data;
        }

        var distance = document.getElementById("distance");
        distance.innerHTML = nodeData.distance;

        var action = document.getElementById("action");
        action.innerHTML = nodeData.action;

        var actionCost = document.getElementById("actionCost");
        actionCost.innerHTML = nodeData.action_cost_to_get_here;

        if (parentData == null) {
            fillpredicateTable(nodeData.state);
        } else {
            fillpredicateTable(nodeData.state, parentData.state);
        }

        const fullAssignmentPanel = document.getElementById("fullAssignmentPanel");
        if (lastClicked === d) {
            fullAssignmentPanel.style.right = "-500px";
            lastClicked = null;
        } else {
            fullAssignmentPanel.style.right = "15px";
            lastClicked = d;
        }
    }
}

function closePanel()
{
    const fullAssignmentPanel = document.getElementById("fullAssignmentPanel");
    fullAssignmentPanel.style.right = "-500px";
    lastClicked = null;
}

function fillpredicateTable(data, parentData = null) {
    var table = document.getElementById("predicateTable");
    table.innerHTML = "";

    Object.keys(data).forEach(element => {
        var row = table.insertRow(-1);

        if (parentData != null && data[element] != parentData[element]) {
            row.insertCell(-1).innerHTML = "<b>" + element + "</b>";
            //keep only 2 digits after .
            var indexOfDot = data[element].indexOf(".");
            if (indexOfDot == -1) {
                row.insertCell(-1).innerHTML = "<b>"+ parentData[element] + " => <span style=\"color: red;\">"+ data[element] + "</span></b>";
            } else {
                row.insertCell(-1).innerHTML = "<b>"+ parentData[element].substring(0, indexOfDot + 3) + " => <span style=\"color: red;\">" + data[element].substring(0, indexOfDot + 3) + "</span></b>";
            }
        } else {
            row.insertCell(-1).innerHTML = element;
            //keep only 2 digits after .
            var indexOfDot = data[element].indexOf(".");
            if (indexOfDot == -1) {
                row.insertCell(-1).innerHTML = data[element];
            } else {
                row.insertCell(-1).innerHTML = data[element].substring(0, indexOfDot + 3);
            }
        }
    });
}

function parseData(data) {
    if (typeof data === 'string' || data instanceof String) {
        var dict = {};
        var notTheEnd = true
        var value;
        while (notTheEnd) {
            var variable = data.substring(data.indexOf("(") + 1, data.indexOf(")"));
            data = data.substring(data.indexOf("=") + 1);
            if (data.indexOf("(") != -1) {
                value = data.substring(0, data.indexOf("("));
            } else {
                value = data;
                notTheEnd = false;
            }
            dict[variable] = value;
        }
        return dict;
    }
    return data;
}

function displayAllNodes(){
    uncollapse(root)
    update(root)
}