import {state} from "./state.js";let cb=()=>{};
export function configureTimer(x){cb=x}
export function startTimer(seconds,label){stopTimer();state.timer.remaining=Math.max(0,Number(seconds)||0);state.timer.exerciseName=label||"Descanso";state.timer.running=true;cb(state.timer);state.timer.interval=setInterval(()=>{state.timer.remaining--;if(state.timer.remaining<=0){state.timer.remaining=0;state.timer.running=false;clearInterval(state.timer.interval);beep()}cb(state.timer)},1000)}
export function toggleTimer(){state.timer.running?pauseTimer():resumeTimer()}
export function pauseTimer(){state.timer.running=false;clearInterval(state.timer.interval);cb(state.timer)}
export function resumeTimer(){if(state.timer.remaining>0)startTimer(state.timer.remaining,state.timer.exerciseName)}
export function stopTimer(){clearInterval(state.timer.interval);state.timer.interval=null;state.timer.running=false}
function beep(){try{const c=new(window.AudioContext||window.webkitAudioContext),o=c.createOscillator(),g=c.createGain();o.frequency.value=880;g.gain.value=.15;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.35)}catch{}}
