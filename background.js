const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");

let width, height;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();


// 🎨 Unique colors
const colors = ["#ff4d6d", "#4cc9f0", "#f72585", "#ffd60a"];

// 🚗 Cars
const cars = colors.map(color => ({
  x: Math.random() * width,
  y: Math.random() * height,
  speed: 1 + Math.random() * 1.5,
  angle: Math.random() * Math.PI * 2,
  color
}));

// 🌫️ Smoke
const smoke = [];

function spawnSmoke(x, y) {
  smoke.push({
    x,
    y,
    size: 6 + Math.random() * 10,
    alpha: 0.2,
    dx: Math.random() - 0.5,
    dy: -0.5 - Math.random()
  });
}

function drawSmoke() {
  smoke.forEach((p, i) => {
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();

    p.x += p.dx;
    p.y += p.dy;
    p.size += 0.2;
    p.alpha -= 0.01;

    if (p.alpha <= 0) smoke.splice(i, 1);
  });
}

// 🏁 PIT STOP
function drawPitStop() {
  const pitWidth = 260;
  const pitHeight = 120;
  const x = width - pitWidth - 40;
  const y = height - pitHeight - 40;

  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(x, y, pitWidth, pitHeight);

  ctx.strokeStyle = "#f472b6";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, pitWidth, pitHeight);

  ctx.fillStyle = "#f472b6";
  ctx.font = "14px Inter";
  ctx.fillText("PIT STOP", x + 20, y + 30);
}

// 🚗 Draw car
function drawCar(c) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);

  ctx.shadowBlur = 15;
  ctx.shadowColor = c.color;

  ctx.fillStyle = c.color;
  ctx.beginPath();
  ctx.roundRect(-10, -20, 20, 40, 6);
  ctx.fill();

  ctx.fillStyle = "#111";
  ctx.fillRect(-6, -8, 12, 16);

  ctx.restore();
}

// 🔁 LOOP
function draw() {
  ctx.clearRect(0, 0, width, height);

  // background
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#050505");
  grad.addColorStop(1, "#0a0a0a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  drawSmoke();
  drawPitStop();

  // 🚗 cars
  cars.forEach(c => {
    drawCar(c);

    c.x += Math.cos(c.angle) * c.speed;
    c.y += Math.sin(c.angle) * c.speed;

    c.angle += (Math.random() - 0.5) * 0.1;

    spawnSmoke(c.x, c.y);

    if (c.x > width) c.x = 0;
    if (c.x < 0) c.x = width;
    if (c.y > height) c.y = 0;
    if (c.y < 0) c.y = height;
  });

  requestAnimationFrame(draw);
}

draw();