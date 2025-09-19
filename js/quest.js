/*
 * Copyright (C) 2023 rpf
 *
 * Creative Commons Legal Code, CC0 1.0 Universal
 */

/*****************************************************************************
 * dom-space:                                 object-class-space:
 * g                                          Src    drag source
 *                                            Dest   drag destination
 * visual-classes:
 * src     drag source
 * dest    drag destination
 * Attribues:
 * .uClass   object instance of Src or Dest   .elem   dom element
 * .assigned on src assigned to dest          .json   json data
 * .list     on dest assigned srcs            .lastX,.lastY on src last drag position
 * .line     on src line to dest
 *
 * Children:
 * rect    visual outline (Classes: unassinged, wrong)
 * text    primary and secondary text
 *****************************************************************************/

var selected;
var cbPrim;     // checkbox primary
var cbSec;      // checkbox secondary
var colorR=0x7f,colorG=0x7f,colorB=0x7f;
const RADIUS = 20;      // basic display unit
const SVG_NS = "http://www.w3.org/2000/svg";
const XHTML_NS = "http://www.w3.org/1999/xhtml";
var lastIdx = null; // index of src last selected (null if guessed right)
var srcs = new Array();
var foundSrcs = new Array();
var player = null;  // Audio player

class Src {
    constructor(jso, svg) {
        let g = document.createElementNS(SVG_NS, "g");
        g.classList.add("src");
        let x = Math.random() * (svg.clientWidth - RADIUS * 10);
        let y = RADIUS + Math.random() * (svg.clientHeight - RADIUS * 5);
        g.setAttribute("transform", "translate(" + x + "," + y + ")");
        g.uClass = this;
        this.json = jso;
        this.elem = g;
        svg.appendChild(g);
        let rect = document.createElementNS(SVG_NS, "rect");
        //rect.setAttribute("style", "fill: "+createColor());
        rect.setAttribute("x", 0);
        rect.setAttribute("y", 0);
        rect.setAttribute("width", RADIUS * 8);
        rect.setAttribute("height", RADIUS * 1.5);
        rect.setAttribute("rx", RADIUS / 4);
        rect.classList.add("unassigned");
        g.appendChild(rect);
        putText(g);
	this.putTooltip(g);
    }
    move(x, y) {
        let dx = x - this.lastX;
        let dy = y - this.lastY;
        this.lastX = x;
        this.lastY = y;
        let transf = this.elem.transform.baseVal[0];
        let newX = transf.matrix.e + dx;
        let newY = transf.matrix.f + dy;
        transf.setTranslate(newX, newY);
        let line = this.elem.line;
        if (typeof (line) !== "undefined") {
            let bbox = this.elem.getBBox();
            line.setAttribute("x2", newX + (bbox.width / 2));
            line.setAttribute("y2", newY + (bbox.height / 2));
        }
    }
    putTooltip(g) {
        let gtext = document.createElementNS(SVG_NS, "g");
	g.appendChild(gtext);
	let texttip = document.createElementNS(SVG_NS, "text");
	gtext.appendChild(texttip);
	texttip.classList.add("tooltip");
	texttip.textContent = "?";
	let texty = RADIUS * 1.5;
	let textx = 5;
	texttip.setAttribute("x", textx);
	texttip.setAttribute("y", texty);
	let textwidth = new Array();
	let textes = new Array();
	for (let rowi = 2; rowi < this.json.text.length; ++rowi) {
	    let row = this.json.text[rowi];
	    let texte = document.createElementNS(SVG_NS, "text");
	    gtext.appendChild(texte);
            texte.classList.add("tooltiptext");
	    textes.push(texte);
	    texty += RADIUS * 0.5;
	    texte.setAttribute("x", textx);
	    texte.setAttribute("y", texty);
	    let height = 0;
	    for (let celli = 0; celli < row.length; ++celli) {
		let cell = row[celli];
		let tspan = document.createElementNS(SVG_NS, "tspan");
		texte.appendChild(tspan);
		tspan.textContent = cell;
		if (textwidth.length <= celli) {
		    textwidth.push(tspan.getComputedTextLength());  // bbox.width less exact?
		}
		else if (textwidth[celli] < tspan.getComputedTextLength())  {
		    textwidth[celli] = tspan.getComputedTextLength();
		}
		if (cell.length > 0
		 && height < tspan.getExtentOfChar(0)) {    // bbox.height
		    height = tspan.getExtentOfChar(0);
		}
	    }
	    texty += height;
	}
	// sync width like a "real" table
	for (let j = 0; j < textes.length; ++j) {
	    let texte = textes[j];
	    let last = 10;
	    for (let i = 0; i < textwidth.length; ++i) {
		let tspan = texte.children[i];
		tspan.setAttribute("x", last);
		last += textwidth[i] + 5;
	    }
	}
    }
    showTooltip(add) {
	// not working ...
	let g = this.elem;
	let tps = g.getElementsByClassName("tooltiptext");
	for (let i = 0; i < tps.length; ++i) {
	    let n = tps[i];
	    n.style.visibility = add ? "visible" : "";
	}
	if (add) {
	    let src = this;
	    let t = setTimeout(function() {
		src.showTooltip(false);
	    }, 3000);
	}
    }
    play() {
        player = new Audio(this.json.sample);
	let volume = document.getElementById("volume");
	player.volume = volume.value / 100.0;
	// currentTime
	player.addEventListener("ended", (event) => {
	    player = null;
	});
	player.play();
    }

}

class Dest {
    constructor(jso, svg) {
        let g = document.createElementNS(SVG_NS, "g");
        g.classList.add("dest");
        let x = Math.random() * (svg.clientWidth - RADIUS * 10);
        let y = RADIUS + Math.random() * (svg.clientHeight - RADIUS * 5);
        g.setAttribute("transform", "translate(" + x + "," + y + ")");
        g.uClass = this;
        this.json = jso;
        this.elem = g;
        svg.appendChild(g);
        let rect = document.createElementNS(SVG_NS, "rect");
        rect.setAttribute("x", 0);
        rect.setAttribute("y", 0);
        rect.setAttribute("width", RADIUS * 5);
        rect.setAttribute("height", RADIUS * 1.5);
        rect.setAttribute("rx", RADIUS / 4);
        rect.setAttribute("fill", createColor());
        g.appendChild(rect);
        putText(g);
    }
    assign(selected) {
        let e = this.elem;
        if (e.uClass.json.d !== selected.uClass.json.d) {     // wrong assignment
            selected.children[0].removeAttribute("fill");
            selected.children[0].classList.add("wrong");
            if (typeof (selected.line) !== "undefined") {
                selected.line.remove();
                selected.line = undefined;
                let good = document.getElementById("good");
                good.textContent = parseInt(good.textContent) - 1;
            }
            // place in a distance so it will not overlap
            let sTransf = selected.transform.baseVal[0];
            let eMatrix = e.transform.baseVal[0].matrix;
            sTransf.setTranslate(eMatrix.e + RADIUS * 2, eMatrix.f + RADIUS * 2);
            let wrong = document.getElementById("wrong");
            wrong.textContent = parseInt(wrong.textContent) + 1;
            return;
        }
        selected.children[0].classList.remove("wrong"); // undo previous coloring
        selected.children[0].classList.remove("unassigned");
        selected.children[0].setAttribute("fill", this.json.color);
        let good = document.getElementById("good");
        good.textContent = parseInt(good.textContent) + 1;
        if (typeof (selected.assigned) !== "undefined") {       // check if it was previous assigned
            let n = selected.assigned.list.indexOf(selected);   // undo that
            if (n >= 0) {
                selected.assigned.list.splice(n, 1);
                selected.assigned.uClass.refresh();
            }
        }
        if (typeof (e.list) === "undefined") {
            e.list = new Array();
        }
        e.list.push(selected);      // add assigned elements to list
        selected.assigned = e;
        this.refresh();
    }

    // refresh placed elements
    refresh() {
        let e = this.elem;
        if (e.list.length > 0) {
            e.list.sort((firstEl, secondEl) => {
                let n1 = firstEl.uClass.json.n;
                let n2 = secondEl.uClass.json.n;
                if (n1 < n2)
                  return -1;
                if (n1 > n2)
                  return 1;
                return 0;
            });
            let a = 0;
            let s = Math.PI * 2.0 / e.list.length;
            let eXDest = e.transform.baseVal[0].matrix.e;
            let eYDest = e.transform.baseVal[0].matrix.f;
            for (let i = 0; i < e.list.length; ++i) {
                let c = e.list[i];
                let toX = eXDest + RADIUS * 6 * Math.sin(a);
                let toY = eYDest + RADIUS * 3 * -Math.cos(a);
                this.refreshChild(c, toX, toY);

                a += s;
            }
        }
    }

    // place a single assigned child element
    //   @param c src element
    //   @param toX,Y move to
    refreshChild(c, toX, toY) {
        const animDurationMs = 300;
        let fromX = c.transform.baseVal[0].matrix.e;
        let fromY = c.transform.baseVal[0].matrix.f;
        let e = this.elem;
        let dx = fromX - toX;
        let dy = fromY - toY;
        let dist = Math.sqrt(dx * dx + dy * dy);
        let eXDest = e.transform.baseVal[0].matrix.e;
        let eYDest = e.transform.baseVal[0].matrix.f;
        let to_l2x = (toX + c.getBBox().width / 2);
        let to_l2y = (toY + c.getBBox().height / 2);;
        let from_l2x = (fromX  + c.getBBox().width / 2);
        let from_l2y = (fromY  + c.getBBox().height / 2);
        let line;
        if (typeof (c.line) === "undefined") {
            line = document.createElementNS(SVG_NS, "line");
            line.setAttribute("x1", eXDest + e.getBBox().width / 2);
            line.setAttribute("y1", eYDest + e.getBBox().height / 2);
            line.setAttribute("x2", from_l2x);
            line.setAttribute("y2", from_l2y);
            c.line = line;
            let lines = document.getElementById("lines");
            lines.appendChild(line);
        } else {
            line = c.line;
        }
        if (dist < 15) { // as too many animation may not look smooth, animate only larger movements
            // so just "jump" here
            c.transform.baseVal[0].setTranslate(toX, toY);
            line.setAttribute("x2", to_l2x);
            line.setAttribute("y2", to_l2y);
        }
        else {
            let transf = document.createElementNS(SVG_NS, "animateTransform");
            transf.setAttribute("attributeName", "transform");
            transf.setAttribute("type", "translate");
            transf.setAttribute("dur", animDurationMs + "ms");
            transf.setAttribute("from", fromX + " " + fromY);
            transf.setAttribute("to", toX + " " + toY);
            transf.setAttribute("fill", "freeze");
            //transf.setAttribute("additive", "replace");
            c.appendChild(transf);
            //const start = new Date().getTime();
            //transf.addEventListener('endEvent', (eEvent) => { // also tried "end" , .onend =
            //});
            let transX = document.createElementNS(SVG_NS, "animate");
            transX.setAttribute("attributeName", "x2");
            transX.setAttribute("values", from_l2x + ";" + to_l2x);
            transX.setAttribute("dur", transf.getAttribute("dur"));
            transX.setAttribute("fill", "freeze");
            //transX.addEventListener('endEvent', () => {
            //});
            line.appendChild(transX);
            let transY = document.createElementNS(SVG_NS, "animate");
            transY.setAttribute("attributeName", "y2");
            transY.setAttribute("values", from_l2y + ";" + to_l2y);
            transY.setAttribute("fill", "freeze");
            transY.setAttribute("dur", transf.getAttribute("dur"));
            //transY.addEventListener('endEvent', () => {
            //});
            line.appendChild(transY);

            transf.beginElement();      // make these run as synchronously as possible
            transX.beginElement();
            transY.beginElement();
            let animEnd = setTimeout(() => {           // this seems the most feasible way for animTransform, the others included for less event stuff...
                //const end = new Date().getTime();
                //console.log("endEvent " + (end - start));
                // transfer new position this is not done by animateTransform
                c.transform.baseVal[0].setTranslate(toX, toY);
                transf.remove();      // now obsolet and to make movable
                line.setAttribute("x2", to_l2x);
                transX.remove();
                line.setAttribute("y2", to_l2y);
                transY.remove();
            }, animDurationMs + 20);

        }
    }
}

function delay() {
    let alertElem = document.getElementById("alert");
    alertElem.classList.add("show");
    if (srcs.length === 0) {
	alertElem.textContent = "All answers found.";
    }
    else {
	let x = setTimeout(function() {
	    playNext();
	}, 2000);
    }
}

function playNext() {
    let alertElem = document.getElementById("alert");
    alertElem.classList.remove("show");
    if (srcs.length === 0) {
	return;
    }
    if (player !== null) {  // one play at a time
	return;
    }
    if (lastIdx === null) {	// only search newly if last was found
	lastIdx = Math.floor(Math.random() * srcs.length);
    }
    let src = srcs[lastIdx];
    src.play();
}

function init() {
    let name = "nee";
    let queryString = window.location.search;
    if (queryString.length > 0) {
        const urlParams = new URLSearchParams(queryString);
        name = urlParams.get("name");
    }
    name = name + ".json";
    if (window.location.protocol === "file:") {
	let path = window.location.pathname;
	let p = path.lastIndexOf("/");
	if (p > 0) {
	    path = path.substring(0, p+1);
	}
	let file = new File([], path + name);
	const reader = new FileReader();
	reader.addEventListener("onload", event => ready(event) );
	reader.readAsText(file);
    }
    else {
	let req = new XMLHttpRequest();
	req.open("GET", name, true);
	req.addEventListener("readystatechange", event => ready(event));
	req.setRequestHeader('Content-Type', 'application/json');
	req.send(null);
    }
}

function ready(event) {
    let req = event.target;
    if (req.readyState < 4){
        return false;
    }
    let content = new Array();
    if (req.status === 200 || req.status === 304) {
         let resp = JSON.parse(req.responseText);
         content = resp.content;
    }
    else {
        alert("Data could not be loaded " + req.statusText + " " + req.status + ".");
        return true;
    }
    let start = document.getElementById("start");
    start.addEventListener("click", event => playNext(event));

    cbPrim = document.getElementById("cbPrim");
    cbPrim.addEventListener("click", event => changeText(event));
    cbSec = document.getElementById("cbSec");
    cbSec.addEventListener("click", event => changeText(event));
    let svg = document.getElementsByTagName("svg");
    svg = svg[0];
    svg.setAttribute("viewBox", "0 0 " + svg.clientWidth + " " + svg.clientHeight); // sync to mouse movement
    // created nested sources, need to be first so dests will be on top -> and they will be noticed first on drop
    srcs = new Array();
    for (let i = 0; i < content.length; ++i) {
        let cnt = content[i];
	let src = new Src(cnt, svg);
        srcs.push(src);
    }
    // global event listeners are better to track selected
    svg.addEventListener("mousedown", event => mousedown(event));
    svg.addEventListener("mouseup", event => mouseup(event));
    svg.addEventListener("mousemove", event => mousemove(event));
    svg.addEventListener("dblclick", event => doubleclk(event));
    return true;
}


function changeText(event) {
    if (!cbPrim.checked
     && !cbSec.checked)
        cbPrim.checked = true;      // at least one text shoud be shown
    let srcs = document.getElementsByClassName("src");
    for (let i = 0; i < srcs.length; ++i)
        putText(srcs[i]);
    let dsts = document.getElementsByClassName("dest");
    for (let i = 0; i < dsts.length; ++i)
        putText(dsts[i]);
}

function concat(a) {
    let s = "";
    for (let i = 0; i < a.length; ++i) {
	if (s.length > 0) {
	    s += " ";
	}
	s += a[i];
    }
    return s;
}

function putText(g) {
    for (let i = g.children.length - 1; i >= 0; --i) {  // revers iterations as we remove entries
        let e = g.children[i];
        if (e.tagName === "text")
            e.remove();
    }
    let texts = new Array();
    let bbox = null;
    if (cbPrim.checked) {
	let textPrim = document.createElementNS(SVG_NS, "text");
	textPrim.setAttribute("x", RADIUS * 4);
	textPrim.setAttribute("y", RADIUS / 2);
	textPrim.textContent = this.concat(g.uClass.json.text[0]);
	textPrim.classList.add("unselectable");
	g.appendChild(textPrim);
	bbox = textPrim.getBBox();
	texts.push(textPrim);
    }
    if (cbSec.checked) {
        let textSec = document.createElementNS(SVG_NS, "text");
        textSec.setAttribute("x", RADIUS * 4);
        textSec.setAttribute("y", RADIUS / 4 * 5);
        textSec.textContent = this.concat(g.uClass.json.text[1]);
	textSec.classList.add("unselectable");
        g.appendChild(textSec);
	let bbox2 = textSec.getBBox();
	if (bbox === null
	 || bbox2.width > bbox.width) {
	    bbox = bbox2;
	}
	texts.push(textSec);
    }
    if (bbox !== null) {
	let width = bbox.width + 20;
	for (let i = 0; i < texts.length; ++i) {
	    texts[i].setAttribute("x", width / 2);
	}
	for (let i = 0; i < g.childNodes.length; ++i) {
	    let e = g.childNodes[i];
	    if (e.tagName === "rect") {
		e.setAttribute("width", width);
		break;
	    }
	}
    }
}

function mousedown(ev) {
    if (ev.buttons === 1) {
        let e = ev.originalTarget;
        while (e !== null) {    // if possbile find element with class src
            if (e.classList.contains("src")) {
                break;
            }
            e = e.parentElement;
        }
        selected = e;
        if (selected !== null) {
            selected.uClass.lastX = ev.x;  // keep pos to track the relative movement
            selected.uClass.lastY = ev.y;
        }
        return true;
    }
    return false;
}

function mouseup(ev) {
    if (ev.buttons !== 1
     && selected !== null) {
        let e = ev.originalTarget;
        while (e !== null) {    // if possbile find element with class dest
            if (e.classList.contains("dest")) {
                break;
            }
            e = e.parentElement;
        }
        if (e !== null) {
            e.uClass.assign(selected);
        }
        selected = null;
        return true;
    }
    return false;
}

function mousemove(ev) {
    if (ev.buttons === 1
     && selected !== null) {
        selected.uClass.move(ev.x, ev.y);
        ev.preventDefault();        // dont select content while moving
        return true;
    }
    return false;
}

function doubleclk(ev) {
    let e = ev.originalTarget;
    while (e !== null) {    // if possbile find element with class src
	if (e.classList.contains("src")) {
	    break;
	}
	e = e.parentElement;
    }
    let selected = e;
    if (selected !== null) {
	let src = null;
	for (let i = 0; i < srcs.length; ++i) {
	    let tst = srcs[i];
	    if (selected === tst.elem) {
		src = tst;
		break;
	    }
	}
	if (src !== null) {
	    if (src === srcs[lastIdx]) {
		src.elem.classList.remove("wrong");
		src.elem.classList.add("right");
		src.showTooltip(true);    // show info (brief)
		foundSrcs.push(src);
		let idx = srcs.indexOf(src);
		srcs.splice(idx, 1);    // make remove
		lastIdx = null;
		delay();
	    }
	    else {
		src.elem.classList.add("wrong");
		let timeout = setTimeout(function() {	// show for a limted time
		    src.elem.classList.remove("wrong");
		}, 2000);
	    }
	}
	else {
	    for (let i = 0; i < foundSrcs.length; ++i) {
		let tst = foundSrcs[i];
		if (selected === tst.elem) {
		    tst.play();
		    return;
		}
	    }
	    console.log("Not found element in " + srcs.length);
	}
        return true;
    }
    return false;
}

function createColor() {
    colorR += 0x20;
    if (colorR > 0xff) {
        colorR = 0x7f;
        colorG += 0x20;
        if (colorG > 0xff) {
            colorG = 0x7f;
            colorB += 0x20;
            if (colorB > 0xff) {
                colorB = 0x7f;
            }
        }
    }
    return "#" + colorR.toString(16) + colorG.toString(16) + colorB.toString(16);
}