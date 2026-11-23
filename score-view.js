'use strict';
const scoreTicks = 96;
function scorePitch(midi) {
  const pitches = ['=C','^C','=D','^D','=E','=F','^F','=G','^G','=A','^A','=B'];
  const octave = Math.floor(midi / 12) - 5;
  return pitches[midi % 12] + (octave < 0 ? ','.repeat(-octave) : "'".repeat(octave));
}
function staffBar(bar, hand, segments) {
  const start = Math.round(bar.start * scoreTicks);
  const end = Math.round((bar.start + bar.d) * scoreTicks);
  const tones = events.filter(e => e.hand === hand && e.b < bar.start + bar.d && e.b + e.d > bar.start)
    .map(e => ({n:e.n, from:Math.round(e.b * scoreTicks), to:Math.round((e.b + e.d) * scoreTicks)}));
  const points = new Set([start,end]);
  for (const tone of tones) {
    points.add(Math.max(start,tone.from));
    points.add(Math.min(end,tone.to));
  }
  const cuts = [...points].sort((a,b)=>a-b);
  let abc = '', triplets = 0;
  for (let i=0; i<cuts.length-1; i++) {
    const at=cuts[i], next=cuts[i+1], length=next-at;
    if (!triplets && length===32 && cuts[i+2]===at+64 && cuts[i+3]===at+96) {
      abc += '(3'; triplets=3;
    }
    const sounding=tones.filter(t=>t.from<=at && t.to>at);
    if (sounding.length) segments.push({start:at/scoreTicks,end:next/scoreTicks,hand});
    const duration=(triplets ? length*1.5 : length) + '/48';
    if (!sounding.length) abc+='z'+duration;
    else if(sounding.length===1) abc+=scorePitch(sounding[0].n)+duration+(sounding[0].to>next?'-':'');
    else abc+='['+sounding.map(t=>scorePitch(t.n)+(t.to>next?'-':'')).join('')+']'+duration;
    if(triplets) triplets--;
    abc+=' ';
  }
  return abc+'|';
}
let scoreViewKey='';
let scoreNotes = [];
function highlightScore(beat) {
  for (const note of scoreNotes) {
    const active = playing && beat >= note.start && beat < note.end;
    if (active === note.active) continue;
    note.active = active;
    note.group.classList.toggle('sounding-' + note.hand, active);
  }
}
function displayScore(index, beat=current()) {
  const panel=document.getElementById('scorePanel');
  if(!panel.open || !chords.length) return;
  const bars=chords.filter(bar=>bar.row===chords[index].row);
  const offset=bars.indexOf(chords[index]);
  const first=Math.floor(offset/2)*2;
  const visible=bars.slice(first,first+2);
  const key=[visible[0].start,transpose,$('hands').value].join('/');
  if(scoreViewKey===key){highlightScore(beat);return;}
  scoreViewKey=key;
  $('scoreCaption').textContent=phrases[chords[index].row].label+' · '+visible.map(bar=>chordLabel(bar.c)).join(' / ');
  const hands=['right','left'].filter(handEnabled);
  const segments = {left:[], right:[]};
  const abc=['X:1','M:'+(songMeta.meter||'4/4'),'L:1/8',hands.length===2?'%%score {right left}':'','K:C',
    ...hands.flatMap(hand=>['V:'+hand+' clef='+(hand==='left'?'bass':'treble'),visible.map(bar=>staffBar(bar,hand,segments[hand])).join(' ')])].join('\n');
  ABCJS.renderAbc('staffView',abc,{add_classes:true,responsive:'resize',staffwidth:560,paddingtop:8,paddingbottom:8});
  scoreNotes = [];
  hands.forEach((hand, voice) => {
    const groups = $('staffView').querySelectorAll('.abcjs-note.abcjs-v' + voice);
    segments[hand].forEach((segment, i) => {
      if (groups[i]) scoreNotes.push({...segment, group:groups[i], active:false});
    });
  });
  highlightScore(beat);
}
