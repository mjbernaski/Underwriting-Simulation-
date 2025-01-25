let dots = [];
let histogramBins = [];
let binCount = 50;
let animationDuration = 6000; // 60 seconds for each animation
let pauseDuration = 5000;      // Changed to 5 seconds pause between runs
let startTime;
let numDots = 10000;
let dotSize = 8;             // Added dot size variable
let iterationCount = 0;
let maxIterations = 5;
let isPaused = false;
let pauseStartTime;
let maxDotSize = 4;
let fadeStartDelay = 2000;  // Start fading 2 seconds after arrival
let fadeDuration = 30000;   // Take 30 seconds to fade out completely
let showConnections = false;
let connectedDots = [];
let numConnections = 40;
let connectionAlpha = 120;  // Make lines more visible
let constellationFadeDuration = 3000; // Time to fade out unconnected dots
let constellationStartTime = 0;
let running = true;
let constellationColor;
let constellationsPerHistogram = 3;
let currentConstellation = 0;
let constellationPauseDuration = 2000; // 2 second pause between constellations

function setup() {
  createCanvas(3200, 1700);
  
  // Initialize histogram bins
  for (let i = 0; i < binCount; i++) {
    histogramBins[i] = 0;
  }
  
  // Start first animation
  resetAnimation();
}

function resetAnimation() {
  dots = [];
  histogramBins.fill(0);
  startTime = millis();
  showConnections = false;
  connectedDots = [];
  currentConstellation = 0;
  
  // Generate dots using Box-Muller transform for normal distribution
  for (let i = 0; i < numDots; i++) {
    let u1 = random();
    let u2 = random();
    let z = sqrt(-2 * log(u1)) * cos(TWO_PI * u2);
    let x = map(z, -3, 3, 100, width-100);
    let binIndex = floor(map(x, 0, width, 0, binCount));
    binIndex = constrain(binIndex, 0, binCount - 1);
    histogramBins[binIndex]++;
    
    dots.push({
      x: random(width),
      y: random(height),
      targetX: x,
      targetY: height - 100 - (histogramBins[binIndex] * 2),
      arrived: false,
      arrivalTime: 0  // Add arrival time tracking
    });
  }
}

function draw() {
  background(0);
  
  let currentTime = millis() - startTime;
  
  if (isPaused) {
    // During pause, keep showing the final state of the last animation
    drawDots();
    drawScale();
    if (showConnections) {
      drawConnections();
    }
    
    // Check if pause is over
    if (millis() - pauseStartTime >= pauseDuration) {
      if (currentConstellation < constellationsPerHistogram - 1) {
        // Create next constellation for this histogram
        currentConstellation++;
        createConnections();
        pauseStartTime = millis();
      } else {
        // Move to next histogram
        isPaused = false;
        currentConstellation = 0;
        if (running) {
          resetAnimation();
        }
      }
    }
  } else {
    // Normal animation
    drawDots();
    drawScale();
    
    // Check if current animation is complete
    if (currentTime >= animationDuration) {
      // Start first constellation
      isPaused = true;
      pauseStartTime = millis();
      currentConstellation = 0;
      createConnections();
    }
  }
}

function drawDots() {
  let currentTime = millis();
  
  // Update and draw dots
  for (let dot of dots) {
    if (!dot.arrived && !isPaused) {
      // Move dots towards target
      dot.x = lerp(dot.x, dot.targetX, 0.05);
      dot.y = lerp(dot.y, dot.targetY, 0.05);
      
      // Check if dot has arrived
      if (dist(dot.x, dot.y, dot.targetX, dot.targetY) < 1) {
        dot.arrived = true;
        dot.arrivalTime = currentTime;
      }
    }
    
    // Calculate opacity based on animation phase
    let alpha = 255;
    let sizeFactor = 1;
    
    if (showConnections) {
      // In constellation phase
      let constellationTime = currentTime - constellationStartTime;
      if (!dot.inConstellation) {
        // Fade out unconnected dots
        let fadeProgress = constellationTime / constellationFadeDuration;
        alpha = 255 * (1 - constrain(fadeProgress, 0, 1));
      } else {
        // Use larger size for constellation dots
        sizeFactor = 2;
      }
    } else if (dot.arrived) {
      // Normal fade behavior during main animation
      let timeSinceArrival = currentTime - dot.arrivalTime;
      if (timeSinceArrival > fadeStartDelay) {
        let fadeProgress = (timeSinceArrival - fadeStartDelay) / fadeDuration;
        fadeProgress = constrain(fadeProgress, 0, 1);
        alpha = 255 * (1 - fadeProgress);
        sizeFactor = 1 + fadeProgress;
      }
    }
    
    // Draw dot with color and size
    let dotColor;
    if (dot.targetX < width/2) {
      dotColor = lerpColor(color(255, 0, 0), color(255, 255, 0), map(dot.targetX, 100, width/2, 0, 1));
    } else {
      dotColor = lerpColor(color(255, 255, 0), color(0, 255, 0), map(dot.targetX, width/2, width-100, 0, 1));
    }
    
    fill(red(dotColor), green(dotColor), blue(dotColor), alpha);
    noStroke();
    ellipse(dot.x, dot.y, dotSize * sizeFactor, dotSize * sizeFactor);
  }
}

function drawScale() {
  // Draw color scale bar at the bottom
  let scaleHeight = 20;
  let scaleY = height - 70;
  let scaleStart = 100;
  let scaleEnd = width - 100;
  
  // Draw the gradient bar
  noStroke();
  for (let x = scaleStart; x < scaleEnd; x++) {
    let scaleColor;
    if (x < width/2) {
      scaleColor = lerpColor(color(255, 0, 0), color(255, 255, 0), map(x, scaleStart, width/2, 0, 1));
    } else {
      scaleColor = lerpColor(color(255, 255, 0), color(0, 255, 0), map(x, width/2, scaleEnd, 0, 1));
    }
    fill(scaleColor);
    rect(x, scaleY, 1, scaleHeight);
  }
  
  // Add tick marks and labels
  stroke(255);
  strokeWeight(1);
  fill(255);
  textAlign(CENTER);
  textSize(12);
  
  // Draw tick marks and labels for -3σ, -2σ, -1σ, 0, 1σ, 2σ, 3σ
  let sigmaPoints = [-3, -2, -1, 0, 1, 2, 3];
  for (let sigma of sigmaPoints) {
    let x = map(sigma, -3, 3, scaleStart, scaleEnd);
    // Tick mark
    line(x, scaleY, x, scaleY + scaleHeight);
    // Label
    text(sigma + "σ", x, scaleY + scaleHeight + 15);
  }
}

function mousePressed() {
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    running = false;
  }
}

function createConnections() {
  // Filter for dots that have arrived at their targets
  let arrivedDots = dots.filter(dot => dot.arrived);
  connectedDots = [];
  let selectedDots = new Set();
  
  // Select a section more centered in the distribution
  let sectionWidth = width/2;
  let sectionStart = random(width/3, width * 2/3 - sectionWidth);
  let sectionEnd = sectionStart + sectionWidth;
  
  // Filter dots within our chosen section
  let sectionDots = arrivedDots.filter(dot => 
    dot.x >= sectionStart && dot.x <= sectionEnd
  );
  
  // Select first dot randomly from section
  let currentDot = random(sectionDots);
  let numDotsToConnect = 25;
  let minDistance = width / 25; // Slightly reduced minimum distance
  
  // Create path through dots
  for (let i = 0; i < numDotsToConnect; i++) {
    selectedDots.add(currentDot);
    
    if (i < numDotsToConnect - 1) {
      let nextDot = null;
      let candidateDots = [];
      
      // Find dots that are far enough away but still in our section
      for (let dot of sectionDots) {
        if (!selectedDots.has(dot)) {
          let d = dist(currentDot.x, currentDot.y, dot.x, dot.y);
          if (d > minDistance) {
            candidateDots.push({dot: dot, distance: d});
          }
        }
      }
      
      // Sort by distance and pick randomly from eligible dots
      if (candidateDots.length > 0) {
        candidateDots.sort((a, b) => a.distance - b.distance);
        // Take a random dot from the first 15 candidates
        let selectionIndex = floor(random(0, min(candidateDots.length, 15)));
        nextDot = candidateDots[selectionIndex].dot;
      } else {
        // Fallback if no dots meet distance criteria
        nextDot = random(sectionDots.filter(dot => !selectedDots.has(dot)));
      }
      
      // Add connection
      connectedDots.push({
        start: currentDot,
        end: nextDot
      });
      
      currentDot = nextDot;
    }
  }
  
  // Mark dots that are part of constellation and double their size
  for (let dot of dots) {
    dot.inConstellation = selectedDots.has(dot);
    if (dot.inConstellation) {
      dot.constellationSize = dotSize * 2;  // Double size for constellation dots
    }
  }
  
  // Calculate average color for constellation
  let totalRed = 0;
  let totalGreen = 0;
  selectedDots.forEach(dot => {
    let dotColor;
    if (dot.targetX < width/2) {
      dotColor = lerpColor(color(255, 0, 0), color(255, 255, 0), map(dot.targetX, 100, width/2, 0, 1));
    } else {
      dotColor = lerpColor(color(255, 255, 0), color(0, 255, 0), map(dot.targetX, width/2, width-100, 0, 1));
    }
    totalRed += red(dotColor);
    totalGreen += green(dotColor);
  });
  
  let avgRed = totalRed / selectedDots.size;
  let avgGreen = totalGreen / selectedDots.size;
  
  // Store the average color for use in drawConnections
  constellationColor = color(avgRed, avgGreen, 0);
  
  showConnections = true;
  constellationStartTime = millis();
}

function drawConnections() {
  let constellationTime = millis() - constellationStartTime;
  let glowIntensity = constrain(constellationTime / constellationFadeDuration, 0, 1);
  
  // Draw multiple layers with increasing width for glow effect
  for (let layer = 3; layer >= 0; layer--) {
    let layerAlpha = connectionAlpha * (1 - layer/4) * (1 + glowIntensity);
    let layerWidth = (layer * 0.5 + 0.5) * (1 + glowIntensity);  // Thinner line
    
    // Use constellation color instead of white
    stroke(red(constellationColor), green(constellationColor), 0, layerAlpha);
    strokeWeight(layerWidth);
    
    // Draw as one continuous curved line
    beginShape();
    noFill();
    
    // Need to add the first point twice for curveVertex to work properly
    let firstDot = connectedDots[0].start;
    curveVertex(firstDot.x, firstDot.y);
    curveVertex(firstDot.x, firstDot.y);
    
    // Add all points as curve vertices
    for (let connection of connectedDots) {
      curveVertex(connection.end.x, connection.end.y);
    }
    
    // Need to add the last point twice for curveVertex to work properly
    let lastDot = connectedDots[connectedDots.length - 1].end;
    curveVertex(lastDot.x, lastDot.y);
    
    endShape();
  }
}
