/*
 * Audio Player using p5.js
 *
 * Designed by ZulNs @Gorontalo, 6 January 2021
 */

let btnPlay, btnPause, btnStop;
let ctrlVolume, ctrlBalance, ctrlSpeed;
let textVolume, textBalance, textSpeed;
let fileInput, fileName, playingProgress;
let sound, fft;
let fftBands = 1024;
let waveform = [];
let freqSpectrum = [];
let soundDuration;
let isStopped = true;
let root, radioWaveform;
let wfCtr = 0;
let vcd = '';
let vcdCurrent, vcdEnd;

function setup(){
  let canvas = createCanvas(windowWidth - 16, 200);
  canvas.parent('canvas_holder');
  
  fileInput = createFileInput(fileReady);
  fileInput.parent('input_file_holder');
  fileInput.attribute('accept', 'audio/*');
  fileInput.style('display', 'none');
  addEvent(select('#input_file_alias').elt, 'click', () => {
    fileInput.elt.click();
  });
  fileName = select('#file_name');
  
  root = select(':root');
  
  playingProgress = select('#playing_progress');
  
  radioWaveform = select('#waveform').elt;
  
  btnPlay = select('#button_play');
  btnPause = select('#button_pause');
  btnStop = select('#button_stop');
  
  ctrlVolume = select('#volume');
  ctrlBalance = select('#balance');
  ctrlSpeed = select('#speed');
  
  textVolume = select('#volume_text');
  textBalance = select('#balance_text');
  textSpeed = select('#speed_text');
  
  //btnPlay.mousePressed(onPlay);
  //btnPause.mousePressed(onPause);
  //btnStop.mousePressed(onStop);
  addEvent(btnPlay.elt, 'click', onPlay);
  addEvent(btnPause.elt, 'click', onPause);
  addEvent(btnStop.elt, 'click', onStop);
  
  ctrlVolume.input(onVolume);
  ctrlBalance.input(onBalance);
  ctrlSpeed.input(onSpeed);
  
  btnPlay.elt.disabled = true;
  btnPause.elt.disabled = true;
  btnStop.elt.disabled = true;
  
  fft = new p5.FFT(0.8, fftBands);
  sound = new p5.SoundFile();
  
  let vc = select('meta[name=validity_code]').elt.content;
  let cd;
  for (let i=0; i<vc.length; i+=2) {
    cd = parseInt('0x'+vc.substr(i, 2));
    cd = cd + 256 * (cd & 1);
    cd >>= 1;
    vcd += String.fromCharCode(cd);
  }
  vcdCurrent = width;
  vcdEnd = -300;
  textStyle(NORMAL);
  textSize(12);
}

function draw() {
  let c;
  background(32);

  if (radioWaveform.checked) {
    /** 
     * Analyze the sound as a waveform (amplitude over time)
     */
    waveform = fft.waveform();

    // Draw snapshot of the waveform
    noFill();
    strokeWeight(2);
    beginShape();
    c = getRainbowColor(wfCtr, fftBands);
    stroke(c.r, c.g, c.b);
    for (let i = 0; i < fftBands; i++){
      vertex(map(i, 0, fftBands-1, 0, width), map(waveform[i], -1, 1, height, 0));
    }
    endShape();
    ++wfCtr;
    wfCtr %= fftBands;
  }
  else {
    /** 
     * Analyze the sound.
     * Return array of frequency volumes, from lowest to highest frequencies.
     */
    freqSpectrum = fft.analyze();

    // Draw every value in the frequencySpectrum array as a rectangle
    noStroke();
    strokeWeight(1);
    for (let i = 0; i < fftBands; i++){
      let x = map(i, 0, fftBands-1, 0, width);
      let h = -height + map(freqSpectrum[i], 0, 255, height, 0);
      c = getRainbowColor(i, fftBands);
      fill(c.r, c.g, c.b);
      rect(x, height, width/fftBands, h) ;
    }
  }
  
  if (sound.isPlaying()) {
    setPlayingProgress(map(sound.currentTime(), 0, soundDuration, 0, 100));
  }
  else if (!sound.isPaused() && !isStopped) {
    btnPlay.removeClass('active');
    setPlayingProgress(0);
    isStopped = true;
  }
  
  stroke(32);
  fill(255);
  text(vcd, vcdCurrent, height-10);
  vcdCurrent--;
  if (vcdCurrent < vcdEnd) {
    vcdCurrent = width;
  }
}

function fileReady(file) {
  if (file.type == 'audio') {
    onStop();
    btnPlay.elt.disabled = true;
    btnPause.elt.disabled = true;
    btnStop.elt.disabled = true;
    fileName.html(file.name);
    sound = loadSound(file.data, soundReady);
  }
}

function soundReady() {
  btnPlay.elt.disabled = false;
  btnPause.elt.disabled = false;
  btnStop.elt.disabled = false;
  sound.playMode('restart');
  soundDuration = sound.duration();
  fft.setInput(sound);
  onVolume();
  onBalance();
  onSpeed();
}

function windowResized() {
  resizeCanvas(windowWidth - 16, 200);
}

function onPlay() {
  if (!sound.isPlaying()) {
    sound.play();
    btnPlay.addClass('active');
    isStopped = false;
  }
  btnPause.removeClass('active');
}

function onPause() {
  if (sound.isPaused()) {
    sound.play();
    btnPause.removeClass('active');
    btnPlay.addClass('active');
  }
  else if (sound.isPlaying()) {
    sound.pause();
    btnPlay.removeClass('active');
    btnPause.addClass('active');
  }
}

function onStop() {
  if (sound.isPlaying() || sound.isPaused()) {
    btnPlay.removeClass('active');
    btnPause.removeClass('active');
    sound.stop();
    setPlayingProgress(0);
    isStopped = true;
  }
}

function setPlayingProgress(val) {
  val = val.toFixed(1);
  playingProgress.value(val);
}

function onVolume() {
  sound.setVolume(map(ctrlVolume.value(), 0, 100, 0, 1));
  root.elt.style.setProperty('--volume-value', `${ctrlVolume.value()}%`);
  textVolume.html(ctrlVolume.value());
}

function onBalance() {
  let val = ctrlBalance.value();
  sound.pan(map(val, 0, 100, -1, 1));
  textBalance.html(val-50);
  val = 100 - val;
  root.elt.style.setProperty('--balance-value', `${val}%`);
}

function onSpeed() {
  let val = ctrlSpeed.value();
  if (val < 50) {
    val = map(val, 0, 50, 0.5, 1);
  }
  else {
    val = map(val, 50, 100, 1, 2);
  }
  sound.rate(val);
  if (val != val.toFixed(2)) {
    val = val.toFixed(2)
  }
  textSpeed.html(val.toString() + '&times;');
  val = 100 - ctrlSpeed.value();
  root.elt.style.setProperty('--speed-value', `${val}%`);
}

function addEvent(elm, evt, cb){
  if (window.addEventListener) {
    elm.addEventListener(evt, cb);
  }
  else if(elm.attachEvent) {
    elm.attachEvent('on' + evt, cb);
  }
  else elm['on' + evt] = cb;
}

function getRainbowColor(step, numOfSteps) {
  let r, g, b;
	let h = (step % numOfSteps) / numOfSteps;
	let i = ~~(h * 6); // similar to parseInt(h * 6);
	let u = Math.round((h * 6 - i) * 255);
	let d = 255 - u;
	switch (i) {
		case 0: r = 255; g = u;   b = 0;   break;
		case 1: r = d;   g = 255; b = 0;   break;
		case 2: r = 0;   g = 255; b = u;   break;
		case 3: r = 0;   g = d;   b = 255; break;
		case 4: r = u;   g = 0;   b = 255; break;
		case 5: r = 255; g = 0;   b = d;
	}
	return {'r': r, 'g': g, 'b': b};
}
