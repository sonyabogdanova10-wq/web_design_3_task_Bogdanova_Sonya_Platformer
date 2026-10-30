import Game from "./Game.js";

const canvas = document.getElementById("game");

const ui = {
  startBtn: document.getElementById("startBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  resumeBtn: document.getElementById("resumeBtn"),
  restartBtn: document.getElementById("restartBtn"),
  stateEl: document.getElementById("stateLabel"),
  fishEl: document.getElementById("fishLabel"),
  bestEl: document.getElementById("bestLabel"),
  
  leftBtn: document.getElementById("leftBtn"),
  rightBtn: document.getElementById("rightBtn"),
  jumpBtn: document.getElementById("jumpBtn")
};

const game = new Game(canvas, ui);
