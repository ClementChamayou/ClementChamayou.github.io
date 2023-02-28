var treeData;
// Set the dimensions and margins of the diagram
var margin = { top: 250, right: 0, bottom: 30, left: 0 },
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;
var i = 0,
    duration = 750,
    root;
var treemap;
var lastClicked;
var svgbg;
var svg;
var zoom;
var gElem;
var reversedActions = false;

// Put the root node back in the center of the screen
function resetZoom() {
    var transform = d3.zoomIdentity;
    //centers transform
    transform.x = (d3.select("svg").node().getBoundingClientRect().width / 3);
    transform.y = (d3.select("svg").node().getBoundingClientRect().height / 2);

    transform.k = 2;

    svgbg.transition()
        .duration(750)
        .call(zoom.transform, transform);
}

// Zoom event
function zoomed() {
    //limit zoom
    if (d3.event.transform.k > 5) {
        d3.event.transform.k = 5;
    } else if (d3.event.transform.k < 0.1) {
        d3.event.transform.k = 0.1;
    }
    svg.attr("transform", d3.event.transform)
}

// Waiting for the DOM to load
document.addEventListener('DOMContentLoaded', function() {
    zoom = d3.zoom().on("zoom", zoomed);

    svgbg = d3.select("#treePanel")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .call(zoom)
        .on("dblclick.zoom", null)
        .on("contextmenu", function(d, i) {
            d3.event.preventDefault();
            // react on right-clicking
        });

    svg = svgbg
        .append("g")

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

            var appBanners = document.getElementsByClassName('hideUntilLoad');
            for (var i = 0; i < appBanners.length; i++) {
                appBanners[i].style.visibility = 'visible';
            }

            var appBanners = document.getElementsByClassName('hideAfterLoad');
            for (var i = 0; i < appBanners.length; i++) {
                appBanners[i].style.visibility = 'hidden';
            }
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

    // Getting and displaying information about the tree

    var treeSpecs = treeInfo(root)
    var width = document.getElementById("width")
    width.innerHTML = treeSpecs[0]
    var height = document.getElementById("height");
    height.innerHTML = treeSpecs[1];
    var averageBF = document.getElementById("averageBF");
    averageBF.innerHTML = treeSpecs[2]

    resetZoom();
    closePanel();
    foldAllNodes();
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

    var averageBF = n_nodes / totalLevels

    return [width, root.height, Math.round(averageBF)]

}

// Unfold only one node
function unfold(d) {
    d.children = d._children;
    d._children = null;
}

// Fold only one node
function fold(d) {
    d._children = d.children;
    d.children = null;
}

// Collapse the node and all it's children
function collapse(d) {
    if (d.children) {
        fold(d);
        d._children.forEach(collapse)
    }
}

// Expand all nodes to see the full tree
function uncollapse(d) {
    if (d._children) {
        unfold(d);
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
            posX0 = isNaN(source.x0) ? 0 : source.x0;
            posY0 = isNaN(source.y0) ? 0 : source.y0;
            return "translate(" + posY0 + "," + posX0 + ")";
        })
        .on("contextmenu", function(d) {
            d3.event.preventDefault();
            // react on right-clicking
            action(this, d, true);
        })
        .on("click", function(d) {
            //if shift key is pressed, is action2
            if (d3.event.shiftKey) {
                action(this, d, true);
            } else {
                action(this, d, false);
            }
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

    // If node has children
    nodeEnter.append('text')
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .text(function(d) {
            return d._children ? "↪" : d.children ? "↩" : "";
        })
        .attr("fill", function(d) {
            return d._children ? "black" : d.children ? "#1B65B6" : "black";
        });

    // Add labels for the nodes
    nodeEnter.append('text')
        // .attr("dy", ".35em")
        .attr("dy", "-.35em")
        .attr("x", -12)
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
            return d.data.visited ? "black" : "#1B65B6";
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
            return d.data.visited ? "#1B65B6" : "#777";
        })
        .style("stroke-width", function(d) {
            return d.data.visited ? "2.5px" : "1px";
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

    // Node pressed action
    function action(focus, d, action2 = false) {
        if ((!reversedActions && !action2) || (reversedActions && action2)) {
            propertiesPanel(d);
            d3.selectAll(".node").classed("selected", false);
            d3.select(focus).classed("selected", true);
            //change all other nodes outline color
            d3.selectAll(".node").select('circle.node')
                .style("stroke", function(dd) {
                    //black if visited
                    return dd.data.visited ? "black" : "#1B65B6";
                })
                .style("stroke-width", "1.5px");
            //change node outline color and border thickness animation
            d3.select(focus).select('circle.node')
                .style("stroke", "red")
                .style("stroke-width", "3px");
        } else {
            if (d.children) {
                fold(d);
            } else {
                unfold(d);
            }
            d3.select(focus).select("text").text(function(d) {
                    return d._children ? "↪" : d.children ? "↩" : "";
                })
                .attr("fill", function(d) {
                    return d._children ? "black" : d.children ? "#1B65B6" : "black";
                });
            update(d);
        }
    }

    // Open the predicate table
    function propertiesPanel(d) {

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

        const sliderPanel = document.getElementById("sliderPanel");
        if (lastClicked === d) {
            sliderPanel.style.bottom = "-65%";
            lastClicked = null;
        } else {
            sliderPanel.style.bottom = "20px";
            lastClicked = d;
        }
    }
}

// Close the the assignment panel
function closePanel() {
    const fullAssignmentPanel = document.getElementById("sliderPanel");
    fullAssignmentPanel.style.bottom = "-65%";
    lastClicked = null;
}

// Fill the predicate table and showing data that had changed compared to the parent node
function fillpredicateTable(data, parentData = null) {

    //Emptying the table
    var table = document.getElementById("predicateTable");
    table.innerHTML = "";

    Object.keys(data).forEach(element => {
        var row = table.insertRow(-1);

        if (parentData != null && data[element] != parentData[element]) {
            row.insertCell(-1).innerHTML = "<b>" + element + "</b>";
            //keep only 2 digits after .
            var indexOfDot = data[element].indexOf(".");
            if (indexOfDot == -1) {
                row.insertCell(-1).innerHTML = "<b>" + parentData[element] + " => <span style=\"color: red;\">" + data[element] + "</span></b>";
            } else {
                row.insertCell(-1).innerHTML = "<b>" + parentData[element].substring(0, indexOfDot + 3) + " => <span style=\"color: red;\">" + data[element].substring(0, indexOfDot + 3) + "</span></b>";
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

// Retrieve data present in the "state" variable of the node and order it in a dictionnary
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

function displayAllNodes() {
    uncollapse(root)
    update(root)
}

function foldAllNodes() {
    root.children.forEach(collapse);
    update(root)
}

function toggleReversedActions() {
    reversedActions = !reversedActions;
    //get id actionText
    var actionText = document.getElementById("actionText");
    if (reversedActions) {
        actionText.innerHTML = "<b>Node Properties: </b>Right Click/Shift+Left Click<br><b>Expand Node: </b>Left Click";
    } else {
        actionText.innerHTML = "<b>Node Properties: </b>Left Click<br><b>Expand Node: </b>Right Click/Shift+Left Click";
    }

    //get class actionbtn
    var actionbtn = document.getElementsByClassName("actionbtn");
    if (reversedActions) {
        //set background color
        actionbtn[0].style.backgroundColor = "#1B65B6";
        //set text color
        actionbtn[0].style.color = "#FFFFFF";
    } else {
        //set background color
        actionbtn[0].style.backgroundColor = "#FFFFFF";
        //set text color
        actionbtn[0].style.color = "#222222";
    }
}