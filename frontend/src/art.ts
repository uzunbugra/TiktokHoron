import Phaser from 'phaser';

// Original, code-drawn artwork. No external images or fonts are required.
const outfits = ['#b85b52', '#407e86', '#d3a445', '#7167a0', '#54845f', '#b5708c'];
const steps = [0, 1, 2, 1, 0, -1];

export function createArt(scene: Phaser.Scene) {
  [...outfits, '#f6e9c7', '#343d48', '#72503e'].forEach((color, variant) => {
    const canvas = document.createElement('canvas');
    canvas.width = 32 * 6;
    canvas.height = 48;
    const c = canvas.getContext('2d')!;
    for (let frame = 0; frame < 6; frame++) {
      const x = frame * 32;
      const hop = frame === 2 || frame === 5 ? -2 : 0;
      const dress = variant === 6 || variant < 6 && variant % 2 === 1;
      const rect = (px: number, py: number, w: number, h: number, fill: string) => {
        c.fillStyle = fill; c.fillRect(x + px, py + hop, w, h);
      };
      const skin = variant % 3 === 0 ? '#d6a07c' : '#edbd91';
      rect(9, 36, 5, 8 + steps[frame], '#26343c');
      rect(19, 36, 5, 8 - steps[frame], '#26343c');
      rect(7 - steps[frame], 43, 8, 3, '#212a30');
      rect(18 + steps[frame], 43, 8, 3, '#212a30');
      rect(8, 20, 17, 18, color);
      if (dress) { rect(6, 29, 21, 10, color); rect(7, 37, 19, 2, '#e0bd83'); }
      else { rect(9, 20, 5, 13, '#2b353b'); rect(20, 20, 4, 13, '#2b353b'); }
      rect(9, 32, 15, 3, variant === 6 ? '#d7b86a' : '#8d433e');
      rect(3, 21 - steps[frame], 6, 5, color);
      rect(0, 18 - steps[frame], 4, 5, skin);
      rect(24, 21 - steps[frame], 6, 5, color);
      rect(29, 18 - steps[frame], 3, 5, skin);
      rect(12, 16, 9, 5, skin);
      rect(10, 5, 14, 14, skin);
      rect(10, 4, 14, 4, '#463e38');
      rect(9, 8, 3, 7, '#463e38');
      rect(14, 11, 2, 2, '#302e2c'); rect(21, 11, 2, 2, '#302e2c');
      rect(17, 16, 4, 1, '#b67868');
      if (variant === 6) {
        rect(8, 3, 18, 3, '#fff4d9'); rect(7, 6, 3, 21, '#eee4d5');
        rect(24, 6, 3, 21, '#eee4d5'); rect(12, 1, 10, 3, '#dfbf6d');
      } else {
        rect(9, 2, 16, 4, variant % 2 ? color : '#303b3b');
        rect(9, 6, 16, 2, '#d5b16d');
      }
      if (variant === 8) { // Kemençe player.
        rect(19, 24, 5, 14, '#d3a568'); rect(20, 20, 2, 9, '#e9c889');
        rect(12, 28 + steps[frame], 18, 1, '#eee0b9');
      }
    }
    const key = `dancer-${variant}`;
    const source = scene.textures.addCanvas(key, canvas)!;
    scene.textures.addSpriteSheet('', source, { frameWidth: 32, frameHeight: 48 });
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 5 }), frameRate: 9, repeat: -1 });
  });

  const heart = scene.add.graphics();
  const rows = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
  rows.forEach((row, y) => [...row].forEach((v, x) => {
    if (v === '1') heart.fillStyle(0xee8b96).fillRect(x * 2, y * 2, 2, 2);
  }));
  heart.generateTexture('heart', 14, 12); heart.destroy();
  createVillage(scene);
}

function createVillage(scene: Phaser.Scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 270; canvas.height = 480;
  const c = canvas.getContext('2d')!;
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    c.fillStyle = color; c.fillRect(x, y, w, h);
  };
  const poly = (points: number[][], color: string) => {
    c.fillStyle = color; c.beginPath();
    points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.closePath(); c.fill();
  };
  rect(0, 0, 270, 480, '#172f33');
  rect(0, 96, 270, 102, '#8eaaa0');
  // Layered Black Sea hills and tiny cloud banks.
  poly([[0, 164], [35, 111], [65, 133], [111, 91], [157, 141], [195, 103], [270, 156], [270, 203], [0, 203]], '#60857b');
  poly([[0, 167], [43, 143], [80, 157], [137, 115], [195, 167], [239, 133], [270, 145], [270, 209], [0, 209]], '#3f6b60');
  poly([[117, 132], [137, 115], [155, 136], [139, 128], [131, 131]], '#b5bfa7');
  [[15, 110], [185, 101], [237, 126]].forEach(([x, y]) => {
    rect(x, y, 23, 3, '#c8d2b3'); rect(x + 5, y - 3, 11, 4, '#c8d2b3');
  });
  rect(0, 190, 270, 220, '#6a8255');
  // A stone dance floor with a pixelated edge.
  for (let y = 208; y < 402; y += 6) {
    for (let x = 0; x < 270; x += 9) {
      const d = ((x - 135) / 124) ** 2 + ((y - 299) / 93) ** 2;
      if (d < 1) rect(x, y, 8, 5, ['#b3a17b', '#b9a781', '#ad9b76', '#bfad86'][(x * 7 + y * 11) % 4]);
      else if ((x * 7 + y * 11) % 13 === 0) rect(x, y, 2, 2, '#879361');
    }
  }
  const house = (x: number, y: number, width: number, color: string) => {
    rect(x + 3, y + 14, width, 29, '#425144');
    rect(x, y + 8, width, 29, color);
    poly([[x - 4, y + 10], [x + width / 2, y - 6], [x + width + 4, y + 10]], '#815446');
    rect(x - 4, y + 9, width + 8, 3, '#533e36');
    rect(x + 5, y + 14, 8, 8, '#f0d48c'); rect(x + width - 13, y + 14, 8, 8, '#f0d48c');
    rect(x + 17, y + 22, 9, 15, '#4f5043');
    rect(x, y + 29, width, 3, '#8b7759');
    rect(x + width - 9, y - 6, 5, 9, '#6a5a48');
  };
  house(21, 162, 43, '#c7b088'); house(200, 168, 48, '#d5bd92');
  const tree = (x: number, y: number) => {
    rect(x - 2, y, 5, 25, '#6c5c42');
    poly([[x, y - 25], [x - 16, y + 4], [x + 16, y + 4]], '#2d5646');
    poly([[x, y - 34], [x - 12, y - 9], [x + 12, y - 9]], '#39674c');
    rect(x - 7, y - 15, 3, 6, '#527c52');
  };
  [[5, 198], [81, 185], [183, 182], [264, 201], [6, 353], [261, 360]].forEach(([x, y]) => tree(x, y));
  // Strings of pennants.
  for (let x = 4; x < 270; x += 2) {
    const y = 151 + Math.sin(x / 270 * Math.PI) * 13;
    rect(x, Math.floor(y), 2, 1, '#d8c999');
    if (x % 14 === 4) poly([[x, y + 1], [x + 8, y + 2], [x + 4, y + 11]], ['#c9785d', '#dfb562', '#8ba99b'][(x / 14 | 0) % 3]);
  }
  // Lanterns, benches and flower boxes.
  [17, 252].forEach(x => {
    rect(x, 219, 2, 53, '#4a5141'); rect(x - 3, 217, 8, 9, '#d4ac63');
    rect(x - 1, 219, 4, 5, '#ffe1a2');
  });
  [28, 216].forEach(x => {
    rect(x, 375, 26, 6, '#785947'); rect(x + 3, 381, 3, 5, '#514535'); rect(x + 20, 381, 3, 5, '#514535');
  });
  [27, 75, 192, 242].forEach(x => {
    rect(x, 198, 11, 6, '#8e6047');
    for (let n = 0; n < 4; n++) { rect(x + n * 3, 193, 1, 6, '#385a40'); rect(x + n * 3 - 1, 191 + n % 2, 3, 3, n % 2 ? '#dda569' : '#d2807e'); }
  });
  rect(0, 408, 270, 72, '#172f33'); rect(14, 408, 242, 1, '#425749');
  scene.textures.addCanvas('village', canvas);
}
