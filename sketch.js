//
// Refactored p5.js code with "growing lines" fix
//

let dots = [];
let histogramBins = [];
let binCount = 50;
let animationDuration = 6000;  // 6 seconds for each animation
let pauseDuration = 8000;      // 8 seconds pause between runs
let startTime;
let numDots = 25000;
let dotSize = 2;
let iterationCount = 0;
let maxIterations = 5;
let isPaused = false;
let pauseStartTime;
let maxDotSize = 4;
let fadeStartDelay = 2000;     // Start fading 2 seconds after arrival
let fadeDuration = 30000;      // Take 30 seconds to fade out completely
let showConnections = false;
let numConnections = 40;
let connectionAlpha = 60;
let constellationFadeDuration = 3000;
let constellationStartTime = 0;
let running = true;
let constellationStyle = "both";
let constellationsPerHistogram = 1;
let currentConstellation = 0;
let usedDots = new Set();
let numConstellations = 3;
let constellations = [];
let portfolioAverageX = 0;
let constellationWidths = [];

// Class to store constellation data
class Constellation {
  constructor() {
    this.dots = new Set();
    this.connections = [];
    this.color = null;
    this.totalDistance = 0; // Will store the sum of all segment distances
  }
}

function setup() {
  createCanvas(3200, 1700);  
  for (let i = 0; i < binCount; i++) {
    histogramBins[i] = 0;
  }
  resetAnimation();
}

function resetAnimation() {
  dots = [];
  histogramBins.fill(0);
  startTime = millis();
  showConnections = false;
  constellations = [];
  currentConstellation = 0;
  usedDots.clear();
  
  // Random skew and spread for slight variation
  let skew = random(-0.3, 0.3);
  let spread = random(0.8, 1.2);

  // Generate dots with varied normal distribution
  for (let i = 0; i < numDots; i++) {
    let u1 = random();
    let u2 = random();
    let z = sqrt(-2 * log(u1)) * cos(TWO_PI * u2);
    z = z * spread + skew;
    
    let xMapped = map(z, -3, 3, 100, width - 100);
    let binIndex = floor(map(xMapped, 0, width, 0, binCount));
    binIndex = constrain(binIndex, 0, binCount - 1);
    histogramBins[binIndex]++;
    
    dots.push({
      x: random(width),
      y: random(height),
      targetX: xMapped,
      targetY: height - 100 - (histogramBins[binIndex] * 1),
      arrived: false,
      arrivalTime: 0,
      inConstellation: false
    });
  }
  
  // Calculate portfolio average
  let totalX = 0;
  for (let dot of dots) {
    totalX += dot.targetX;
  }
  portfolioAverageX = totalX / dots.length;
  
  if (!running) {
    constellationWidths = [];
  }
}

function draw() {
  background(0);
  
  let currentTime = millis() - startTime;
  
  if (isPaused) {
    drawDots();
    drawScale();
    if (showConnections) {
      drawConnections();
      drawConstellationWidth();
    }
    // Check if pause is over
    if (millis() - pauseStartTime >= pauseDuration) {
      isPaused = false;
      currentConstellation = 0;
      showConnections = false;
      constellations = [];
      if (running) {
        resetAnimation();
      }
    }
  } else {
    drawDots();
    drawScale();
    // Check if animation is complete
    if (currentTime >= animationDuration) {
      isPaused = true;
      pauseStartTime = millis();
      currentConstellation = 0;
      constellations = [];
      createConnections();
    }
  }
}

function drawDots() {
  let now = millis();
  for (let dot of dots) {
    if (!dot.arrived && !isPaused) {
      dot.x = lerp(dot.x, dot.targetX, 0.05);
      dot.y = lerp(dot.y, dot.targetY, 0.05);
      if (dist(dot.x, dot.y, dot.targetX, dot.targetY) < 1) {
        dot.arrived = true;
        dot.arrivalTime = now;
      }
    }
    
    let alpha = 255;
    let sizeFactor = 1;
    
    if (showConnections) {
      // If in a constellation, grow dots quickly, else fade them out
      let constellationTime = now - constellationStartTime;
      let fadeInProgress = constrain(constellationTime / 1000, 0, 1);
      if (!dot.inConstellation) {
        let fadeProgress = constellationTime / constellationFadeDuration;
        alpha = lerp(255, 50, constrain(fadeProgress, 0, 1));
      } else {
        sizeFactor = lerp(1, 20, fadeInProgress * fadeInProgress);
        alpha = lerp(255, 0, fadeInProgress);
      }
    } else if (dot.arrived) {
      let timeSinceArrival = now - dot.arrivalTime;
      if (timeSinceArrival > fadeStartDelay) {
        let fadeProgress = (timeSinceArrival - fadeStartDelay) / fadeDuration;
        fadeProgress = constrain(fadeProgress, 0, 1);
        alpha = 255 * (1 - fadeProgress);
        sizeFactor = 1 + fadeProgress;
      }
    }
    
    let dotColor;
    if (dot.targetX < width / 2) {
      dotColor = lerpColor(color(255, 0, 0), color(255, 255, 0), 
                           map(dot.targetX, 100, width / 2, 0, 1));
    } else {
      dotColor = lerpColor(color(255, 255, 0), color(0, 255, 0), 
                           map(dot.targetX, width / 2, width - 100, 0, 1));
    }
    
    fill(red(dotColor), green(dotColor), blue(dotColor), alpha);
    noStroke();
    ellipse(dot.x, dot.y, dotSize * sizeFactor, dotSize * sizeFactor);
  }
}

function drawScale() {
  let scaleHeight = 20;
  let scaleY = height - 70;
  let scaleStart = 100;
  let scaleEnd = width - 100;
  
  noStroke();
  for (let x = scaleStart; x < scaleEnd; x++) {
    let scaleColor;
    if (x < width / 2) {
      scaleColor = lerpColor(color(255, 0, 0), color(255, 255, 0), 
                             map(x, scaleStart, width / 2, 0, 1));
    } else {
      scaleColor = lerpColor(color(255, 255, 0), color(0, 255, 0), 
                             map(x, width / 2, scaleEnd, 0, 1));
    }
    fill(scaleColor);
    rect(x, scaleY, 1, scaleHeight);
  }
  
  stroke(255);
  strokeWeight(1);
  fill(255);
  textAlign(CENTER);
  textSize(12);
  
  let sigmaPoints = [-3, -2, -1, 0, 1, 2, 3];
  for (let sigma of sigmaPoints) {
    let xVal = map(sigma, -3, 3, scaleStart, scaleEnd);
    line(xVal, scaleY, xVal, scaleY + scaleHeight);
    text(sigma, xVal, scaleY + scaleHeight + 15);
  }
  
  // Portfolio average arrow
  let avgPos = map(portfolioAverageX, 100, width - 100, scaleStart, scaleEnd);
  stroke(255);
  strokeWeight(1.5);
  let arrowBottom = scaleY + scaleHeight + 25;
  let arrowTop = scaleY + scaleHeight;
  line(avgPos, arrowBottom, avgPos, arrowTop);
  let headSize = 6;
  line(avgPos - headSize, arrowTop + headSize, avgPos, arrowTop);
  line(avgPos + headSize, arrowTop + headSize, avgPos, arrowTop);
  noStroke();
  fill(255);
  textAlign(CENTER);
  textSize(14);
  text("Portfolio Average", avgPos, arrowBottom + 15);
  
  // Risk center arrow
  if (showConnections && constellations.length > 0) {
    let c = constellations[0];
    if (c.color) {
      let colorPos;
      let r = red(c.color);
      let g = green(c.color);
      if (r === 255) {
        colorPos = map(g, 0, 255, scaleStart, width / 2);
      } else {
        colorPos = map(r, 255, 0, width / 2, scaleEnd);
      }
      stroke(255);
      strokeWeight(1.5);
      line(colorPos, arrowBottom, colorPos, arrowTop);
      line(colorPos - headSize, arrowTop + headSize, colorPos, arrowTop);
      line(colorPos + headSize, arrowTop + headSize, colorPos, arrowTop);
      noStroke();
      fill(255);
      text("center of this risk", colorPos, arrowBottom + 7);
    }
  }
}

function drawConnections() {
  // How far along in the "grow" animation?
  let constellationTime = millis() - constellationStartTime;
  let growProgress = constrain(constellationTime / 1000, 0, 1);  // 1 second to reach full length

  for (let c of constellations) {
    // We'll figure out how much of the total path to draw (in pixels).
    let pathDistanceToShow = c.totalDistance * growProgress;

    // For the shape style, we collect the partial vertices.
    if (constellationStyle === "shape" || constellationStyle === "both") {
      noStroke();
      let shapeAlpha = 30 * growProgress;
      fill(red(c.color), green(c.color), 0, shapeAlpha);

      beginShape();
      // We'll walk the connections and add vertices up to the partial distance
      let distSoFar = 0;
      if (c.connections.length > 0) {
        // Add initial two curveVertices
        let firstDot = c.connections[0].start;
        curveVertex(firstDot.x, firstDot.y);
        curveVertex(firstDot.x, firstDot.y);
        
        for (let i = 0; i < c.connections.length; i++) {
          let seg = c.connections[i];
          let dSeg = dist(seg.start.x, seg.start.y, seg.end.x, seg.end.y);
          if (distSoFar + dSeg <= pathDistanceToShow) {
            // Entire segment is within the "grow" distance
            curveVertex(seg.end.x, seg.end.y);
            distSoFar += dSeg;
          } else {
            // Partial segment
            let leftover = pathDistanceToShow - distSoFar;
            if (leftover > 0) {
              let pct = leftover / dSeg;
              let xPart = lerp(seg.start.x, seg.end.x, pct);
              let yPart = lerp(seg.start.y, seg.end.y, pct);
              curveVertex(xPart, yPart);
            }
            break;
          }
        }

        let lastDot = c.connections[c.connections.length - 1].end;
        curveVertex(lastDot.x, lastDot.y);
        curveVertex(firstDot.x, firstDot.y);
        curveVertex(firstDot.x, firstDot.y);
      }
      endShape(CLOSE);
    }
    
    // For line style, do a similar partial approach
    if (constellationStyle === "line" || constellationStyle === "both") {
      let lineAlpha = connectionAlpha * growProgress;
      stroke(red(c.color), green(c.color), 0, lineAlpha);
      let sw = lerp(1, 3, growProgress);
      strokeWeight(sw);

      beginShape();
      noFill();

      let distSoFar = 0;
      if (c.connections.length > 0) {
        let firstDot = c.connections[0].start;
        curveVertex(firstDot.x, firstDot.y);
        curveVertex(firstDot.x, firstDot.y);
        
        for (let i = 0; i < c.connections.length; i++) {
          let seg = c.connections[i];
          let dSeg = dist(seg.start.x, seg.start.y, seg.end.x, seg.end.y);
          if (distSoFar + dSeg <= pathDistanceToShow) {
            curveVertex(seg.end.x, seg.end.y);
            distSoFar += dSeg;
          } else {
            let leftover = pathDistanceToShow - distSoFar;
            if (leftover > 0) {
              let pct = leftover / dSeg;
              let xPart = lerp(seg.start.x, seg.end.x, pct);
              let yPart = lerp(seg.start.y, seg.end.y, pct);
              curveVertex(xPart, yPart);
            }
            break;
          }
        }
      }

      endShape();
    }
  }
}

function drawConstellationWidth() {
  if (!showConnections || constellations.length === 0) return;
  let c = constellations[0];
  if (c.connections.length === 0) return;
  
  let leftmost = width;
  let rightmost = 0;
  c.dots.forEach(dot => {
    leftmost = min(leftmost, dot.x);
    rightmost = max(rightmost, dot.x);
  });
  
  let constellationWidth = rightmost - leftmost;
  let widthPercentage = (constellationWidth / (width - 200)) * 100;
  
  let averageWidth = 0;
  if (constellationWidths.length > 0) {
    averageWidth = constellationWidths.reduce((a, b) => a + b, 0) / constellationWidths.length;
  }

  noStroke();
  fill(255);
  textAlign(RIGHT);
  textSize(24);
  text(`Constellation Width: ${widthPercentage.toFixed(1)}%`, width - 50, 50);
  textSize(18);
  text(`Average Width: ${averageWidth.toFixed(1)}%`, width - 50, 80);
}

function mousePressed() {
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    running = false;
  }
}

function createConnections() {
  let constellation = new Constellation();
  
  // Filter arrived, unused dots
  let availableDots = dots.filter(dot => dot.arrived && !usedDots.has(dot));

  // Random normal for width
  let u1 = random();
  let u2 = random();
  let z = sqrt(-2 * log(u1)) * cos(TWO_PI * u2);
  let meanWidth = width * 0.33;  
  let sdWidth = width * 0.67;    
  let sectionWidth = constrain(meanWidth + (z * sdWidth), width * 0.2, width * 0.9);
  
  let maxStart = width - 100 - sectionWidth;
  let sectionStart = constrain(random(100, maxStart), 100, maxStart);
  if (random() < 0.5) {
    sectionStart = constrain(random(width / 2 - sectionWidth / 2, maxStart), 100, maxStart);
  }
  let sectionEnd = sectionStart + sectionWidth;
  
  let sectionDots = availableDots.filter(dot => dot.x >= sectionStart && dot.x <= sectionEnd);
  
  if (sectionDots.length >= 30) {
    let currentDot = random(sectionDots);
    let numDotsToConnect = 30;
    let minDistance = width / 15;  
    for (let i = 0; i < numDotsToConnect; i++) {
      constellation.dots.add(currentDot);
      usedDots.add(currentDot);
      if (i < numDotsToConnect - 1) {
        let nextDot = null;
        let candidateDots = [];
        for (let dot of sectionDots) {
          if (!constellation.dots.has(dot) && !usedDots.has(dot)) {
            let d = dist(currentDot.x, currentDot.y, dot.x, dot.y);
            if (d > minDistance) {
              candidateDots.push({ dot: dot, distance: d });
            }
          }
        }
        if (candidateDots.length > 0) {
          nextDot = random(candidateDots).dot;
          constellation.connections.push({
            start: currentDot,
            end: nextDot
          });
          currentDot = nextDot;
        } else {
          break;
        }
      }
    }
    
    // Average color for constellation
    let totalRed = 0;
    let totalGreen = 0;
    constellation.dots.forEach(dot => {
      let dotColor;
      if (dot.targetX < width / 2) {
        dotColor = lerpColor(color(255, 0, 0), color(255, 255, 0), 
                             map(dot.targetX, 100, width / 2, 0, 1));
      } else {
        dotColor = lerpColor(color(255, 255, 0), color(0, 255, 0), 
                             map(dot.targetX, width / 2, width - 100, 0, 1));
      }
      totalRed += red(dotColor);
      totalGreen += green(dotColor);
    });
    let avgRed = totalRed / constellation.dots.size;
    let avgGreen = totalGreen / constellation.dots.size;
    constellation.color = color(avgRed, avgGreen, 0);
    
    // Mark which dots are in the constellation
    for (let d of dots) {
      d.inConstellation = false;
    }
    for (let connection of constellation.connections) {
      connection.start.inConstellation = true;
      connection.end.inConstellation = true;
    }

    // Calculate path distance
    constellation.totalDistance = 0;
    for (let i = 0; i < constellation.connections.length; i++) {
      let seg = constellation.connections[i];
      constellation.totalDistance += dist(seg.start.x, seg.start.y, seg.end.x, seg.end.y);
    }

    // Compute and store width
    let leftmost = width;
    let rightmost = 0;
    constellation.dots.forEach(dot => {
      leftmost = min(leftmost, dot.x);
      rightmost = max(rightmost, dot.x);
    });
    let cWidth = rightmost - leftmost;
    let widthPerc = (cWidth / (width - 200)) * 100;
    constellationWidths.push(widthPerc);
  }

  constellations.push(constellation);
  showConnections = true;
  constellationStartTime = millis();
}