// Original synthesized cues; no downloaded/proprietary audio assets.
let context:AudioContext|undefined;
export function playMoveSound(san:string){
 try{context??=new AudioContext();void context.resume();const now=context.currentTime;
 const tones=san.includes('#')?[523,659,784]:san.includes('+')?[520,700]:san.includes('x')?[165,110]:[240];
 tones.forEach((frequency,i)=>{const osc=context!.createOscillator(),gain=context!.createGain();osc.type=san.includes('x')?'triangle':'sine';osc.frequency.setValueAtTime(frequency,now+i*.06);osc.frequency.exponentialRampToValueAtTime(frequency*.6,now+i*.06+.09);gain.gain.setValueAtTime(.0001,now+i*.06);gain.gain.exponentialRampToValueAtTime(.18,now+i*.06+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.06+.12);osc.connect(gain);gain.connect(context!.destination);osc.start(now+i*.06);osc.stop(now+i*.06+.13);osc.onended=()=>{osc.disconnect();gain.disconnect();};});
 }catch{/* Audio unavailable: navigation must still work. */}
}
