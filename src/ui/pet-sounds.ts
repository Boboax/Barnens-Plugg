/** Original, quiet fantasy cues. Sound is created only inside a user gesture. */
export class PetSounds {
 private context:AudioContext|undefined
 private voices=new Set<OscillatorNode>()
 private last=-Infinity
 private count=0
 stop() { for(const voice of this.voices){try{voice.stop()}catch{/* already ended */}} this.voices.clear() }
 dispose() { this.stop();void this.context?.close().catch(()=>{});this.context=undefined }
 play(species:string) {
  const now=performance.now()
  if(now-this.last<1400||document.hidden)return
  try {
   const Audio=window.AudioContext??(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext
   if(!Audio)return
   this.context??=new Audio()
   const ctx=this.context
   if(ctx.state==='suspended')void ctx.resume().catch(()=>{})
   this.stop();this.last=now
   const variation=[1,.94,1.06][this.count++%3]
   const tone=(start:number,duration:number,from:number,to:number,volume:number,type:OscillatorType='sine')=>{
    const voice=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime+start
    voice.type=type;voice.frequency.setValueAtTime(from*variation,t);voice.frequency.exponentialRampToValueAtTime(to*variation,t+duration)
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.025);gain.gain.exponentialRampToValueAtTime(.0001,t+duration)
    voice.connect(gain);gain.connect(ctx.destination);this.voices.add(voice)
    voice.onended=()=>{voice.disconnect();gain.disconnect();this.voices.delete(voice)}
    voice.start(t);voice.stop(t+duration+.02)
   }
   if(species==='woodland-frog') {
    for(let i=0;i<3;i++){tone(i*.14,.18,185,105,.055,'triangle');tone(i*.14,.16,510,340,.016)}
   } else if(species==='dune-fox') {
    tone(0,.22,760,1150,.04);tone(.2,.3,1050,620,.035);tone(.02,.18,1520,2000,.007)
   } else if(species==='reef-axolotl') {
    for(let i=0;i<4;i++)tone(i*.12,.16,280+i*90,720+i*140,.04)
   } else {
    tone(0,.75,105,82,.055,'triangle');tone(.06,.6,212,170,.025);tone(.18,.55,1320,1300,.018);tone(.3,.55,1980,1940,.012)
   }
  } catch { this.stop() /* Audio support must never block pet care. */ }
 }
}

