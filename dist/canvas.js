'use strict';

const stage = document.querySelector('#stage');
const canvas = document.querySelector('#scene');
const ctx = canvas.getContext('2d');
const hotspots = document.querySelector('#critters');
const speech = document.querySelector('#speech');
const danceButton = document.querySelector('#dance');
const soundButton = document.querySelector('#sound');
const compact = matchMedia('(max-width: 700px)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const ink = '#594630';
const buffaloInk = '#675147';
const pale = '#fff2d4';
const red = '#c66d50';
const yellow = '#eab24e';
const teal = '#6b9c88';
const pink = '#d58281';
const lilac = '#9987a7';
const paper = document.createElement('canvas');
const backdrop = document.createElement('canvas');
const foreground = document.createElement('canvas');
const pathCache = new Map();
let g = ctx;
let width, height, displayScale, spots, texture;
let dancing = false;
let selected = -1;
let selectedAt = 0;
let bursts = [];
let frame = 0;

function rng(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function path(data, fill, stroke = ink, weight = 2.2, rough = true) {
  let shape = pathCache.get(data);
  if (!shape) {
    shape = new Path2D(data);
    if (pathCache.size < 650) pathCache.set(data, shape);
  }
  if (fill) {
    g.fillStyle = fill;
    g.fill(shape);
  }
  if (!stroke) return;
  g.strokeStyle = stroke;
  g.lineWidth = weight;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.stroke(shape);
  if (!rough) return;
  g.save();
  g.translate(.9, -.7);
  g.globalAlpha *= .20;
  g.lineWidth = Math.max(.65, weight * .7);
  g.stroke(shape);
  g.restore();
}

function oval(x, y, rx, ry, fill, stroke = ink, rotate = 0, weight = 2) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rotate, 0, Math.PI * 2);
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = weight;
    g.stroke();
  }
}

function local(x, y, scale, rotation, draw) {
  g.save();
  g.translate(x, y);
  g.rotate(rotation);
  g.scale(scale, scale);
  draw();
  g.restore();
}

function eye(x, y) {
  oval(x, y, 3, 3.4, ink, null);
  oval(x - .6, y - .9, .7, .7, pale, null);
}

function blush(x, y, size = 6) {
  oval(x, y, size, size * .45, '#de8a77b8', null, -.12);
}

function smile(x, y, width = 10) {
  path(`M${x} ${y} q${width / 2} 7 ${width} -1`, null, ink, 1.65);
}

function hat(x, y, color, angle = .15, size = 1) {
  local(x, y, size, angle, () => {
    path('M-15 0 Q-7-14 0-33 Q6-17 15-1 Q2 4-15 0Z', color);
    path('M-11-8 Q-2-6 10-10 M-6-17 Q0-16 6-18', null, pale, 2);
    oval(0, -34, 4, 3.7, yellow);
  });
}

function musicNote(x, y, size, color, angle) {
  local(x, y, size, angle, () => {
    oval(-2, 4, 4.2, 2.7, color, null, -.25);
    path('M1 4V-10 Q4-9 8-5', null, color, 1.7);
  });
}

function crochet(x, y, size, color, random, spread = 1) {
  g.strokeStyle = color;
  g.lineWidth = .85;
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const dx = (random() - .5) * size * spread;
    const dy = (random() - .5) * size;
    g.moveTo(x + dx, y + dy);
    g.lineTo(x + dx + size * .32, y + dy - size * .28);
  }
  g.stroke();
}

function grass(x, y, size, color, direction = 1) {
  g.save();
  g.translate(x, y);
  g.scale(size * direction, size);
  path('M0 0 Q-1-9-9-17 M3 0 Q1-15 8-29 M3 0 Q7-7 15-12', null, color, 1.45, false);
  g.restore();
}

function flower(x, y, size, color) {
  local(x, y, size, 0, () => {
    path('M0 0 Q3-6 1-16 M1-4Q-3-10-7-10 M2-7Q6-12 9-11', null, '#676e42', 1.1, false);
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5;
      oval(1 + Math.cos(angle) * 3.2, -16 + Math.sin(angle) * 3.2, 2.8, 1.9, color, null, angle);
    }
    oval(1, -16, 1.8, 1.8, '#b47a43', null);
  });
}

function cloud(x, y, size) {
  local(x, y, size, 0, () => {
    path('M-91 8 Q-93-1-64-5 Q-70-14-43-15 Q-35-32-6-25 Q16-34 31-17 Q61-22 67-8 Q90-7 92 1 Q58 16 9 11 Q-45 15-91 8Z', '#f9e8c9', '#be886a60', 1.2);
    path('M-72 16 Q-38 19-8 15 M20 16 Q51 19 73 13', null, '#bd8e7075', 1.1);
  });
}

function acacia(x, y, size, mirror, distant = false) {
  const leaf = distant ? '#8c9368' : '#636b42';
  const twig = distant ? '#777354' : '#65563c';
  const foliage = distant ? '#a2a176' : '#929765';
  local(x, y, size, 0, () => {
    g.scale(mirror, 1);
    path('M-8 1 Q-1-45-5-86 L-42-115 L-63-140 L-57-142 L-31-119 L-2-104 L15-127 L40-148 L45-144 L22-122 L7-93 Q6-46 12 1Z', twig, null);
    path('M-3-61 Q-1-108-9-132 L-23-150 M4-89 L51-114 L75-131 M-15-105 L-67-118', null, twig, 3.3);
    path('M-109-131 Q-119-141-99-148 Q-104-158-81-161 Q-81-173-53-170 Q-37-184-9-174 Q13-184 25-172 Q50-182 62-169 Q88-171 92-160 Q120-160 114-149 Q140-146 131-135 Q109-126 75-131 Q42-124 11-131 Q-12-125-38-133 Q-76-124-109-131Z', leaf, null);
    path('M-101-139 Q-110-147-82-151 Q-77-161-53-160 Q-40-173-9-165 Q14-174 25-163 Q54-171 61-157 Q90-161 91-152 Q121-149 117-142 Q89-134 58-141 Q28-135 8-141 Q-29-134-52-143 Q-83-134-101-139Z', foliage, null);
    const random = rng(40);
    for (let i = 0; i < 55; i++) {
      const dx = (random() - .5) * 200;
      const dy = -144 - random() * (22 - Math.abs(dx) * .13);
      oval(dx, dy, 2 + random() * 2.5, 1.1, i % 3 === 0 ? leaf : '#d3c38c66', null, -.2);
    }
    path('M0-10 Q3-48 0-77 M4-16 Q5-38 4-55', null, '#c0a27a7a', 1.1);
  });
}

function bunting(w, h) {
  const left = -14, right = w + 14;
  const curve = t => h * (.075 + .18 * t * (1 - t) * 4 - .05 * t);
  path(`M${left} ${curve(0)} Q${w / 2} ${h * .41} ${right} ${curve(1)}`, null, '#7b644e', 1.6);
  const count = compact.matches ? 9 : 16;
  const colors = [red, yellow, teal, lilac, '#d99062'];
  for (let i = 0; i < count; i++) {
    const t = (i + .5) / count;
    local(left + (right - left) * t, curve(t), compact.matches ? .94 : 1, .35 - .72 * t, () => {
      const color = colors[i % colors.length];
      path('M-11 0 Q-1 2 11 0 L2 23 Q-3 21-11 0Z', color, '#795a4b', 1.15);
      path('M-7 5 l10 8 m-8-3 4 4', null, '#ffedc493', 1, false);
    });
  }
}

function makeTexture() {
  paper.width = paper.height = 224;
  const p = paper.getContext('2d');
  const data = p.createImageData(224, 224);
  const random = rng(111);
  for (let i = 0; i < data.data.length; i += 4) {
    const light = random() > .45;
    data.data[i] = light ? 255 : 87;
    data.data[i + 1] = light ? 242 : 68;
    data.data[i + 2] = light ? 209 : 46;
    data.data[i + 3] = random() * (light ? 46 : 34);
  }
  p.putImageData(data, 0, 0);
  texture = ctx.createPattern(paper, 'repeat');
}

function makeLandscape() {
  backdrop.width = foreground.width = width;
  backdrop.height = foreground.height = height;
  g = backdrop.getContext('2d');
  const w = width, h = height;
  const mobile = compact.matches;
  const random = rng(5948);
  const sky = g.createLinearGradient(0, 0, 0, .62 * h);
  sky.addColorStop(0, '#f6e9c7');
  sky.addColorStop(.58, '#f4d6ac');
  sky.addColorStop(1, '#e9b38a');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  const sunX = w * (mobile ? .63 : .64), sunY = h * .28, sunRadius = mobile ? 72 : 92;
  const haze = g.createRadialGradient(sunX, sunY, 4, sunX, sunY, sunRadius * 1.8);
  haze.addColorStop(0, '#ffecb1');
  haze.addColorStop(1, '#ffefb300');
  oval(sunX, sunY, sunRadius * 1.8, sunRadius * 1.8, haze, null);
  oval(sunX, sunY, sunRadius, sunRadius, '#efc576', '#c78b5b69', 0, 1.4);
  for (let i = 0; i < 92; i++) {
    const a = random() * Math.PI * 2, r = Math.sqrt(random()) * sunRadius * .92;
    crochet(sunX + Math.cos(a) * r, sunY + Math.sin(a) * r, 6 + random() * 7, '#b8744943', random, 2);
  }
  cloud(w * .20, h * .22, mobile ? .68 : .95);
  cloud(w * .45, h * .30, mobile ? .34 : .54);
  cloud(w * .85, h * .33, mobile ? .60 : .97);
  cloud(w * .06, h * .40, .66);
  for (let i = 0; i < 170; i++) {
    crochet(random() * w, random() * h * .55, 5 + random() * 8, '#9b673d25', random, 2.5);
  }

  g.save();
  g.scale(w / 1200, h / 540);
  path('M-25 277Q68 207 144 239T301 244Q385 232 445 196Q482 177 556 215Q629 260 683 244Q749 207 819 226Q867 241 929 216Q1035 165 1220 238V554H-25Z', '#b2a27c', '#a288696b', 1.4);
  path('M-30 297Q45 254 141 248Q240 273 325 262Q430 216 522 251Q621 287 766 253Q834 232 906 252Q1050 275 1230 220V554H-30Z', '#a3a371', '#847f5d74', 1.4);
  path('M-35 290Q77 259 185 279Q358 318 501 278Q563 260 681 277Q839 300 937 267Q1061 242 1230 263V554H-35Z', '#b9b475', '#8b8d5f65', 1.3);
  path('M-25 344Q78 300 234 316Q362 321 444 304Q610 274 794 311Q958 338 1091 301L1225 275V553H-25Z', '#c3bb7a', null);
  path('M-30 399Q167 344 361 344Q552 317 734 345Q918 307 1220 376V550H-30Z', '#d5c688', null);
  path('M-20 513Q133 408 344 404Q551 365 813 391Q1078 406 1220 490V557H-20Z', '#e3cf93', null);
  path('M-20 495Q117 452 274 488Q423 513 550 486Q749 473 956 489Q1099 440 1220 490V555H-20Z', '#adc080', null);
  path('M-20 523Q120 478 255 523Q373 535 506 518Q720 499 831 521Q958 545 1087 503Q1175 482 1220 518V556H-20Z', '#8b9d62', null);
  path('M-20 565Q110 510 241 554Q400 524 537 550Q693 526 848 552Q1005 522 1092 544Q1157 526 1220 548V573Z', '#72834e', null);
  g.restore();

  acacia(w * .27, h * .52, mobile ? .41 : .44, -1, true);
  acacia(w * .79, h * .53, mobile ? .24 : .36, 1, true);
  acacia(w * .96, h * .65, mobile ? .67 : .87, -1);
  acacia(w * .055, h * .68, mobile ? .73 : 1.06, 1);

  for (let i = 0; i < 930; i++) {
    const x = random() * w, y = h * (.51 + random() * .49);
    if (i % 4 === 0) {
      grass(x, y, .18 + random() * .35, i % 8 === 0 ? '#8791559c' : '#f6e5b08c', i % 3 === 0 ? -1 : 1);
    } else {
      crochet(x, y, 4 + random() * 8, i % 3 === 0 ? '#717e4c55' : '#f6e6b079', random, 2.4);
    }
  }
  bunting(w, h);
  for (let i = 0; i < 10; i++) {
    const x = w * (.12 + random() * .76);
    const y = h * (.30 + random() * .17);
    if (i % 3 === 0) musicNote(x, y, .7 + random() * .25, ['#9d624e', '#657e66', '#8e6b85'][i % 3], random() - .5);
    else path(`M${x - 3} ${y}q4-3 5-7q1 5 5 6q-4 1-5 6q-1-4-5-5Z`, '#ad815576', null);
  }

  g = foreground.getContext('2d');
  for (let i = 0; i < 136; i++) {
    const edge = random() < .26;
    const x = edge ? (random() < .5 ? random() * .14 : 1 - random() * .14) * w : random() * w;
    const y = h * (edge ? .63 + random() * .37 : .90 + random() * .11);
    const size = .31 + random() * .81;
    if (i % 4 === 0) flower(x, y, size, [pale, '#e7af63', '#ce8275', '#f3e0bd'][i % 7 % 4]);
    else grass(x, y, size, ['#647448', '#d6d495', '#91a064', '#748653'][i % 4], i % 2 ? 1 : -1);
  }
  g = ctx;
}

function limb(data, color, size = 12) {
  path(data, null, ink, size + 3);
  path(data, null, color, size);
}

function drum(x, y, color) {
  local(x, y, 1, -.1, () => {
    path('M-22-12 L-17 12 Q0 22 17 12 L22-12Z', color);
    path('M-16-7 L-7 16 L0-6 L8 16 L16-7', null, '#f2ce92', 2.2);
    oval(0, -11, 22, 8, pale);
    oval(1, -11, 13, 4, '#e8cfa1', null);
  });
}

function giraffe(a) {
  const gold = '#e1a75a', shadow = '#b97947';
  path('M-37-58 Q-53-59-58-74', null, ink, 2.5);
  oval(-59, -74, 4, 7, shadow, ink, -.62);
  limb(`M-24-41 Q-26-19 ${-28 + a * 7} -5 M7-44 Q10-22 ${10 - a * 7} -5`, shadow, 9);
  path('M-44-60 Q-43-77-19-86 Q2-92 7-78 Q13-93 10-130 L13-161 L35-162 Q34-139 32-121 Q38-87 24-59 Q1-38-31-45Z', gold);
  limb(`M-17-52 Q-8-38 ${-14 - a * 8} -14 M25-64 Q36-57 ${41 + a * 8} -39`, gold, 9);
  path('M-34-61l7-12 11 2 3 10-10 7Z M-3-77l9-1 7 12-10 10-9-9Z M17-91l9-12 7 5-3 14-10 3Z M15-119l8-7 8 6-3 9-8 1Z M16-140l8-8 9 3-3 12-10-1Z', shadow, null);
  path('M15-153 Q1-152-1-165 Q9-171 19-161 M34-158 Q47-172 53-164 Q52-151 39-149', gold);
  path('M19-160l-4-13 M31-160l4-14', null, ink, 3.1);
  oval(15, -174, 4.3, 3.5, shadow);
  oval(36, -174, 4.2, 3.5, shadow);
  path('M13-151 Q13-166 31-165 Q42-166 45-155 Q58-154 59-145 Q60-134 44-130 Q29-127 18-135 Q9-138 13-151Z', gold);
  oval(47, -141, 12, 7, '#f2c982', null, -.18);
  eye(36, -151);
  blush(34, -140);
  smile(44, -142, 10);
  path('M13-125 q10 7 19-1 l4 6 q-8 9-25 3Z M28-116q15 2 23 13l-13-1-8 6Z', teal);
  g.save();
  g.translate(44, -43 + a * 2);
  oval(0, 0, 9, 13, red, ink, -.44);
  path('M-7 6L-13 20', null, ink, 3);
  path('M-9-4 Q-2 2 5 2', null, yellow, 2);
  g.restore();
}

function elephant(a) {
  const skin = '#879d9c', light = '#a3b5aa', dark = '#6e8687';
  limb(`M-44-35 Q-45-20 ${-48 - a * 5} -9 M20-32 Q23-20 ${27 + a * 5} -4`, dark, 16);
  path('M-47-58 Q-65-60-70-44 Q-70-38-75-38', null, ink, 2.1);
  oval(-75, -38, 3, 4, dark);
  path('M-60-55 Q-57-90-14-92 Q30-96 45-67 Q53-35 20-27 Q-35-20-55-40Z', skin);
  limb(`M-30-33 Q-23-18 ${-31 + a * 9} -8 M12-34 Q17-24 ${23 - a * 9} -9`, light, 16);
  path('M-2-83 Q8-111 43-100 Q61-94 60-69 Q64-48 79-60 Q88-68 92-59 Q93-48 79-42 Q61-35 52-48 Q47-56 45-65 Q15-59 2-68Z', light);
  path('M31-90 Q24-111 7-101 Q-13-92-11-55 Q-10-40 11-48 Q27-57 31-90Z', skin);
  path('M24-83 Q20-97 8-93 Q-4-83-3-60 Q-1-48 12-59 Q22-67 24-83Z', '#cb9890', '#8d726d', 1.3);
  path('M44-65 Q51-60 57-67 Q57-57 49-55Z', pale);
  path('M57-76l-5-1 M60-70l-6-1 M85-54l-2-5', null, dark, 1.7);
  eye(43, -82);
  blush(38, -70);
  hat(35, -99, red, -.18, .92);
  drum(-4, -26, '#ba735d');
  limb(`M-34-48 Q-31-35 ${-17 + a * 2} -35`, skin, 9);
  path(`M-16-37q4-6 12 ${-12 - a * 8}`, null, ink, 2.4);
}

function lion(a) {
  const fur = '#e4ac65', mane = '#b66843';
  path(`M-22-29 Q-50-19-53-45 Q-55-54 ${-44 - a * 5} -57`, null, ink, 2.5);
  oval(-44 - a * 5, -57, 6, 4, mane, ink, -.5);
  limb(`M-14-29 Q-15-16 ${-24 - a * 7} -7 M12-29 Q17-16 ${28 + a * 6} -9`, fur, 14);
  path('M-26-24 Q-23-54-5-59 Q24-61 28-28 Q15-14-4-15 Q-19-14-26-24Z', fur);
  oval(1, -29, 13, 8, '#f1c587', null, .1);
  limb(`M-21-47 Q-38-48 -47 ${-56 - a * 11} M22-48 Q37-49 46 ${-61 + a * 11}`, fur, 11);
  path('M-33-57 Q-43-63-37-76 Q-44-88-32-97 Q-33-109-20-110 Q-12-122 1-115 Q15-122 23-111 Q38-113 38-98 Q51-91 44-80 Q50-65 36-62 Q37-47 21-50 Q9-39-2-48 Q-18-43-24-52 Q-32-47-33-57Z', mane);
  path('M-29-73l-6-5 M-25-91l-4-4 M-18-101l-2-6 M28-99l4-3 M35-81l6-2 M27-58l4 4 M-17-56l-4 4', null, '#e69c60', 1.6);
  oval(-18, -92, 9, 10, fur, ink, -.2);
  oval(22, -92, 9, 10, fur, ink, .27);
  oval(1, -76, 26, 23, fur, ink, .03);
  oval(1, -67, 16, 10, '#f5d497', null);
  eye(-9, -80);
  eye(12, -80);
  path('M-5-72 Q1-75 8-72 L2-67Z', ink, null);
  path('M2-68v4m0 0q-4 4-8 0m8 0q4 3 8-1', null, ink, 1.5);
  blush(-16, -72, 4);
  blush(18, -72, 4);
  path('M-13-54 Q0-44 15-53 L16-46 Q1-36-15-48Z', red);
  hat(-4, -107, teal, -.23, .72);
}

function zebra(a) {
  const coat = '#f3e5c6', stripe = '#5e574f';
  path('M-46-54 Q-65-57-66-70', null, ink, 2.6);
  oval(-66, -70, 4, 7, stripe, ink, -.4);
  limb(`M-30-36 Q-34-21 ${-40 - a * 9} -8 M12-35 Q18-22 ${22 + a * 6} -7`, '#cbbca3', 10);
  path('M-49-54 Q-43-75-17-72 Q3-68 13-78 L17-100 L41-97 Q43-83 34-59 Q31-35 2-33 Q-34-27-49-47Z', coat);
  limb(`M-17-40 Q-13-27 ${-14 + a * 7} -14 M25-48 Q41-40 ${49 - a * 5} -29`, coat, 10);
  path('M-40-67l8-2q1 22 11 32l-8-1q-10-11-11-29Z M-19-70l8 1q-1 12 10 34l-8 2q-11-16-10-37Z M8-73l6-8q2 13 16 19l-2 7q-14-6-20-18Z M17-89l2-8 21 7-2 8Z', stripe, null);
  path('M17-100 Q12-114 21-122 L26-112 L34-124 L36-114 L45-119 L41-101Z', stripe);
  path('M35-103 Q28-121 38-127 Q47-125 47-107 M48-104 Q47-122 57-123 Q64-117 57-103', coat);
  path('M21-102 Q24-116 42-114 Q55-114 61-104 L70-97 Q75-84 64-79 Q46-75 35-88 Q15-90 21-102Z', coat);
  path('M28-110l8-3 11 20-7 4q-7-8-12-21Z M41-114l6 1 7 13-6 2Z', stripe, null);
  oval(64, -88, 11, 8, '#71665b', ink, -.1);
  oval(67, -90, 2, 1.5, '#e6cbb2', null);
  eye(53, -103);
  path('M25-86 Q32-77 45-81 L48-74 Q37-66 22-78Z M30-75 l-7 13-3-8-9-1Z', pink);
}

function hippo(a) {
  const soft = '#a78eab', shadow = '#8d7693', light = '#c3a5b4';
  limb(`M-28-33 Q-34-18 ${-36 - a * 5} -8 M20-35 Q21-16 ${28 + a * 6} -5`, shadow, 14);
  path('M-43-50 Q-39-77-8-79 Q26-80 40-60 Q54-39 33-27 Q13-15-21-24 Q-48-26-43-50Z', soft);
  oval(-2, -34, 21, 10, light, null, -.03);
  limb(`M-35-50 Q-45-47 ${-48 - a * 5} -60 M34-47 Q44-48 ${51 + a * 5} -56`, soft, 10);
  oval(-25, -86, 8, 9, soft, ink, -.55);
  oval(27, -88, 8, 9, soft, ink, .45);
  oval(-24, -87, 3.3, 4.2, light, null, -.5);
  oval(27, -89, 3.3, 4.2, light, null, .4);
  path('M-30-76 Q-26-95 1-95 Q29-96 35-76 Q41-57 18-51 Q-16-44-31-61Z', soft);
  path('M-36-62 Q-36-76-18-77 Q-4-81 6-75 Q25-81 37-69 Q44-54 23-48 Q3-43-20-47 Q-37-51-36-62Z', light);
  eye(-13, -82);
  eye(16, -82);
  oval(-17, -66, 3, 2, shadow, null, -.4);
  oval(21, -67, 3, 2, shadow, null, .4);
  smile(-4, -59, 14);
  path('M-6-56 l1 5 5 0 0-4 M10-56l0 4 5-1 0-5', pale, ink, 1.1);
  blush(-25, -60, 4);
  blush(30, -60, 4);
  hat(0, -94, yellow, .16, .85);
}

function ostrich(a) {
  const skin = '#dca585', feather = '#655b57';
  limb(`M-15-52 Q-6-28 ${-18 + a * 7} -7 M11-52 Q27-31 ${29 - a * 8} -10`, skin, 6);
  path(`M${-18 + a * 7} -7q-6 1-12 3 M${29 - a * 8} -10q6-2 12 2`, null, ink, 2.2);
  path('M-15-74 Q3-88 11-112 Q14-129 27-140 Q33-145 43-138 L39-127 Q29-124 26-105 Q25-79 5-65Z', skin);
  path('M-26-72 Q-51-76-57-89 Q-50-90-41-87 Q-53-97-47-101 Q-31-100-22-87 Q-19-100-14-95 L-9-83Z', pale);
  path('M-42-69 Q-40-84-17-87 Q2-94 20-78 Q35-62 19-51 Q-4-37-30-51 Q-44-56-42-69Z', feather);
  path(`M-3-72 Q-23-78 -36 ${-82 - a * 12} Q-40-69-20-60 Q-8-54 1-59 Q8-64-3-72Z`, pale);
  path('M-24-69l9 6 M-16-71l9 6', null, '#bb9d80', 1.3);
  oval(39, -139, 16, 12, skin, ink, -.13);
  path('M50-143 Q65-143 69-136 Q63-131 51-133Z', yellow);
  path('M56-137l8 1', null, ink, 1.1);
  eye(43, -142);
  blush(44, -135, 4);
  path('M25-122 Q36-125 40-118 L36-110 Q31-117 25-114Z M34-117 L48-120 L47-110Z', teal);
  path('M29-149q-2-7-8-9 M35-150q0-6-4-9', null, ink, 1.6);
}

function meerkat(a) {
  const gold = '#c4976d';
  path(`M-10-14 Q-39-8 ${-38 + a * 5} -32`, null, ink, 4.5);
  limb(`M-7-25 Q-9-13 ${-13 - a * 4} -7 M9-25 Q10-14 ${15 + a * 5} -6`, gold, 7);
  path('M-15-16 Q-22-36-11-61 Q3-71 14-55 Q20-38 17-17 Q4-9-15-16Z', gold);
  oval(2, -32, 11, 14, '#efd4a0', null, .1);
  limb(`M-13-49 Q-25-49 -29 ${-60 - a * 6} M12-48 Q24-49 28 ${-60 + a * 7}`, gold, 7);
  oval(-13, -67, 5, 7, '#b58363', ink, -.4);
  oval(12, -70, 5, 7, '#b58363', ink, .27);
  path('M-18-60 Q-19-77 0-79 Q17-81 19-67 Q32-61 23-54 Q14-49-3-51 Q-16-52-18-60Z', gold);
  oval(13, -58, 12, 5.4, '#efd4a0', null, -.13);
  oval(25, -61, 4, 2.8, ink, null, -.22);
  oval(7, -66, 5, 4, '#876449', null, -.3);
  eye(8, -67);
  smile(15, -57, 7);
  hat(0, -78, lilac, .22, .66);
}

function hare(a) {
  const fur = '#d6a67c';
  oval(-18, -20, 9, 8, pale);
  limb(`M-10-18 Q-16-11 ${-21 - a * 3} -8 M14-17 Q19-9 ${26 + a * 4} -6`, fur, 9);
  path('M-19-24 Q-23-46 4-53 Q23-53 28-32 Q28-17 9-15 Q-8-13-19-24Z', fur);
  oval(5, -27, 11, 9, '#efd1a5', null);
  limb(`M-12-40 Q-21-41 -26 ${-53 - a * 5} M21-42 Q31-42 34 ${-52 + a * 7}`, fur, 7);
  path('M-7-62 Q-18-83-14-98 Q-6-105 1-91 Q6-82 6-64Z M9-67 Q7-94 17-101 Q26-105 25-88 Q23-72 19-65Z', fur);
  path('M-6-68 Q-14-86-10-95 Q-2-89 1-69Z M13-69 Q13-90 20-96 Q23-90 17-70Z', '#c98379', null);
  path('M-15-59 Q-16-72 2-73 Q20-75 24-63 Q36-59 29-49 Q18-39 1-44 Q-14-45-15-59Z', fur);
  oval(18, -52, 10, 6, '#f0d2a7', null);
  oval(27, -56, 3, 2.2, ink, null, -.1);
  eye(13, -62);
  blush(9, -53, 5);
  smile(15, -53, 8);
  path('M-9-43 Q4-40 20-45 L20-39 Q8-34-8-37Z M1-38l-9 13-4-5 4-10Z', teal);
}

function warthog(a) {
  const fur = '#b28e77', darker = '#867265';
  limb(`M-29-26 Q-31-15 ${-35 + a * 4} -7 M16-23 Q20-15 ${27 - a * 6} -7`, darker, 9);
  path('M-35-56 Q-58-59-53-76', null, ink, 2.3);
  oval(-53, -77, 3.6, 5.2, darker, ink, .4);
  path('M-43-46 Q-44-64-15-67 Q11-71 28-55 Q39-34 18-22 Q-10-14-35-26 Q-45-32-43-46Z', fur);
  limb(`M-21-29 Q-13-18 ${-18 - a * 4} -9 M27-32 Q39-27 ${44 + a * 5} -22`, fur, 9);
  path('M-13-66 Q-17-75-8-81 L-1-74 Q0-85 7-88 L12-79 Q21-86 26-82 L29-68Z', darker);
  path('M6-64 Q-6-80 1-84 Q13-83 17-71 M30-69 Q30-84 41-85 Q47-78 40-68', fur);
  path('M-5-55 Q-9-70 8-74 Q22-81 37-67 Q41-60 51-57 Q64-52 60-43 Q56-34 39-36 Q16-29 0-41Z', fur);
  oval(52, -45, 11, 8, '#cda795', ink, -.12);
  oval(50, -47, 1.8, 2.2, darker, null);
  oval(56, -46, 1.8, 2.2, darker, null);
  path('M35-43 Q44-45 43-57 Q51-51 47-43 Q42-37 35-43Z', pale);
  eye(28, -62);
  blush(21, -49, 5);
  path('M-5-51 Q0-38 17-35 L14-31 Q-4-32-10-47Z', yellow);
}

const animals = [
  { name: '長頸鹿', move: '搖沙槌', art: giraffe, desktop: [.235, .765, 1.23], mobile: [.25, .665, 1.07], hit: [107, 178], offset: -4 },
  { name: '大象', move: '咚咚打鼓', art: elephant, desktop: [.355, .877, 1.04], mobile: [.29, .82, .90], hit: [149, 132], offset: 7 },
  { name: '獅子', move: '甩甩鬃毛', art: lion, desktop: [.495, .782, 1.22], mobile: [.53, .744, .96], hit: [94, 134], offset: 0 },
  { name: '斑馬', move: '踏踏蹄子', art: zebra, desktop: [.632, .773, 1.08], mobile: [.59, .596, .87], hit: [119, 126], offset: 5 },
  { name: '河馬', move: '扭扭屁股', art: hippo, desktop: [.739, .891, 1.05], mobile: [.78, .849, .98], hit: [103, 122], offset: 0 },
  { name: '鴕鳥', move: '踢腿轉身', art: ostrich, desktop: [.793, .762, 1.05], mobile: [.85, .693, .94], hit: [113, 153], offset: 3 },
  { name: '狐獴', move: '舉手歡呼', art: meerkat, desktop: [.155, .888, .75], mobile: [.16, .939, .71], hit: [63, 103], offset: 0 },
  { name: '野兔', move: '原地彈一下', art: hare, desktop: [.49, .931, .77], mobile: [.51, .938, .75], hit: [66, 101], offset: 3 },
  { name: '疣豬', move: '抖抖尾巴', art: warthog, desktop: [.89, .891, .86], mobile: [.87, .956, .72], hit: [109, 87], offset: 3 },
];

for (const [id, animal] of animals.entries()) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'critter';
  button.setAttribute('aria-label', animal.name);
  button.title = animal.name;
  button.addEventListener('click', () => celebrate(id));
  hotspots.append(button);
  animal.button = button;
}

function positionMessage(animal, spot) {
  const safeEdge = Math.min(105 / displayScale, width * .28);
  const x = Math.min(width - safeEdge, Math.max(safeEdge, spot.x));
  const y = Math.max(38 / displayScale, spot.y - animal.hit[1] * spot.size - 10);
  speech.style.left = `${x / width * 100}%`;
  speech.style.top = `${y / height * 100}%`;
}

function resize() {
  const mobile = compact.matches;
  width = mobile ? 620 : 1200;
  height = mobile ? 690 : 540;
  displayScale = stage.clientWidth / width;
  const pixelRatio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.max(width, Math.round(stage.clientWidth * pixelRatio));
  canvas.height = Math.round(canvas.width * height / width);
  makeTexture();
  makeLandscape();

  spots = animals.map((animal, id) => {
    const [x, y, size] = mobile ? animal.mobile : animal.desktop;
    const spot = { x: x * width, y: y * height, size, id };
    const [hitWidth, hitHeight] = animal.hit;
    Object.assign(animal.button.style, {
      left: `${(spot.x + animal.offset * size) / width * 100}%`,
      top: `${y * 100}%`,
      width: `max(36px, ${hitWidth * size / width * 100}%)`,
      height: `max(36px, ${hitHeight * size / height * 100}%)`,
    });
    if (selected === id) positionMessage(animal, spot);
    return spot;
  });
  for (const spot of spots.toSorted((a, b) => a.y - b.y)) hotspots.append(animals[spot.id].button);
  scheduleFrame();
}

const confettiColors = ['#d57854', '#856d9a', '#5f957e', '#db9a3a', '#f5e1ae'];

function celebrate(id) {
  const animal = animals[id];
  const spot = spots[id];
  selected = id;
  selectedAt = performance.now();
  speech.textContent = `${animal.name} · ${animal.move}！`;
  positionMessage(animal, spot);
  speech.hidden = false;
  if (!reducedMotion.matches) {
    const random = rng(Math.floor(selectedAt) + id);
    for (let i = 0; i < 17; i++) {
      bursts.push({
        start: selectedAt, x: spot.x, y: spot.y - animal.hit[1] * spot.size * .61,
        vx: (random() - .5) * 185, vy: -36 - random() * 151,
        spin: random() * 6, color: confettiColors[i % confettiColors.length],
      });
    }
  }
  scheduleFrame();
}

function confetti(now) {
  bursts = bursts.filter(p => now - p.start < 910);
  for (const p of bursts) {
    const age = (now - p.start) / 1000;
    g.save();
    g.globalAlpha = Math.min(1, (.91 - age) * 3);
    local(p.x + p.vx * age, p.y + p.vy * age + 210 * age ** 2, 1, p.spin + age * 3.5, () => {
      path('M-2-2l6-1-1 5-5 1Z', p.color, null);
    });
    g.restore();
  }
}

const beatLength = 60 / 105;
let danceStart = 0;

function draw(now) {
  frame = 0;
  g.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  g.drawImage(backdrop, 0, 0);
  const phase = (now - danceStart) / (beatLength * 1000) * Math.PI * 2;
  const moved = dancing && !reducedMotion.matches;
  const reaction = selected === -1 ? 0 : (now - selectedAt) / 1000;
  const showReaction = selected !== -1 && reaction < .88 && !reducedMotion.matches;

  for (const spot of spots.toSorted((a, b) => a.y - b.y)) {
    const { x, y, size, id } = spot;
    const beat = phase + id * .64;
    const groove = moved ? Math.sin(beat) : 0;
    const hop = moved ? Math.max(0, Math.sin(beat)) * (id % 3 === 0 ? 7 : 11) : 0;
    const bounce = showReaction && selected === id ? Math.abs(Math.sin(reaction * Math.PI * 3.3)) * (1 - reaction) * 32 : 0;
    oval(x + 2, y - 1, Math.min(45, animals[id].hit[0] * .34) * size, 5.8 * size, '#76663f30', null, -.04);
    const lean = moved ? Math.cos(beat * .5) * .071 : 0;
    local(x, y - hop - bounce, size, lean, () => animals[id].art(groove));
    if (moved && (id + Math.floor(phase / 6.283)) % 4 === 0) {
      musicNote(x + (id % 2 === 0 ? 40 : -43) * size, y - animals[id].hit[1] * size - 14 - Math.sin(beat) * 5,
        .85, confettiColors[id % 4], Math.sin(beat) * .15 - .2);
    }
  }

  g.drawImage(foreground, 0, 0);
  if (texture) {
    g.fillStyle = texture;
    g.fillRect(0, 0, width, height);
  }
  confetti(now);
  if (reaction >= 2.8) {
    speech.hidden = true;
    selected = -1;
  }
  if (moved || selected !== -1 || bursts.length) scheduleFrame();
}

function scheduleFrame() {
  if (!frame) frame = requestAnimationFrame(draw);
}

let audio;
let master;
let noise;
let timer;
let nextStep;
let step;
let audioRun = 0;
const subdivision = beatLength / 2;

function tone(at, length, level, start, end, type = 'sine') {
  const oscillator = audio.createOscillator();
  const envelope = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(start, at);
  oscillator.frequency.exponentialRampToValueAtTime(end, at + length);
  envelope.gain.setValueAtTime(.001, at);
  envelope.gain.exponentialRampToValueAtTime(level, at + .008);
  envelope.gain.exponentialRampToValueAtTime(.001, at + length);
  oscillator.connect(envelope).connect(master);
  oscillator.start(at);
  oscillator.stop(at + length + .02);
}

function shaker(at, level, frequency) {
  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const envelope = audio.createGain();
  source.buffer = noise;
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  envelope.gain.setValueAtTime(level, at);
  envelope.gain.exponentialRampToValueAtTime(.001, at + .073);
  source.connect(filter).connect(envelope).connect(master);
  source.start(at);
  source.stop(at + .08);
}

function scheduleAudio() {
  if (nextStep < audio.currentTime - .25) nextStep = audio.currentTime + .04;
  while (nextStep < audio.currentTime + .20) {
    if (step % 4 === 0 || step === 7) tone(nextStep, .16, .36, 140, 47);
    if (step % 4 === 2) shaker(nextStep, .22, 1050);
    if (step % 2 === 1) shaker(nextStep, .11, 5100);
    const melody = [261.63, 0, 329.63, 392, 0, 293.66, 349.23, 0, 220, 0, 261.63, 329.63, 0, 293.66, 392, 0];
    const frequency = melody[step];
    if (frequency) {
      tone(nextStep + .027, .24, .14, frequency, frequency, 'triangle');
      tone(nextStep + .029, .10, .036, frequency * 2, frequency * 2);
    }
    nextStep += subdivision;
    step = (step + 1) % 16;
  }
}

function stopAudio() {
  audioRun++;
  window.clearInterval(timer);
  timer = undefined;
  if (master && audio) master.gain.setTargetAtTime(.001, audio.currentTime, .018);
  soundButton.setAttribute('aria-pressed', 'false');
  soundButton.querySelector('span').textContent = '開啟音樂';
}

async function toggleAudio() {
  if (soundButton.getAttribute('aria-pressed') === 'true') {
    stopAudio();
    return;
  }
  const run = ++audioRun;
  try {
    if (!audio) {
      const AudioEngine = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioEngine) throw new Error('AudioContext unavailable');
      audio = new AudioEngine();
      master = audio.createGain();
      master.gain.value = .001;
      master.connect(audio.destination);
      noise = audio.createBuffer(1, Math.ceil(audio.sampleRate * .1), audio.sampleRate);
      const samples = noise.getChannelData(0);
      const random = rng(709);
      for (let i = 0; i < samples.length; i++) samples[i] = random() * 2 - 1;
    }
    await audio.resume();
    if (run !== audioRun) return;
    master.gain.setTargetAtTime(.32, audio.currentTime, .025);
    const now = performance.now();
    const beatOffset = dancing ? (now - danceStart) / 1000 % beatLength : 0;
    nextStep = audio.currentTime + (dancing ? Math.max(.04, beatLength - beatOffset) : .055);
    step = 0;
    scheduleAudio();
    timer = window.setInterval(scheduleAudio, 45);
    soundButton.setAttribute('aria-pressed', 'true');
    soundButton.querySelector('span').textContent = '關閉音樂';
  } catch {
    stopAudio();
    soundButton.querySelector('span').textContent = '音樂無法播放';
  }
}

danceButton.addEventListener('click', () => {
  dancing = !dancing;
  if (dancing) {
    danceStart = performance.now();
    if (timer !== undefined) {
      const elapsed = (16 - step) % 2 * subdivision + nextStep - audio.currentTime;
      danceStart += elapsed * 1000;
    }
  }
  danceButton.setAttribute('aria-pressed', String(dancing));
  danceButton.querySelector('span').textContent = dancing ? '暫停跳舞' : '一起跳舞';
  scheduleFrame();
});
soundButton.addEventListener('click', toggleAudio);
reducedMotion.addEventListener('change', scheduleFrame);
new ResizeObserver(resize).observe(stage);
