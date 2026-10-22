(function(){
  var toggle=document.getElementById('listen-toggle');
  if(!toggle) return;
  var stopBtn=document.getElementById('listen-stop');
  var msg=document.getElementById('listen-msg');
  function say(m){ if(msg) msg.textContent=m||''; }
  function splitIntoChunks(text){
    var out=[];
    var sentences=text.match(/[^.!?]+[.!?]+["\u201d']?\s*|[^.!?]+$/g)||[];
    var cur='';
    sentences.forEach(function(s){
      s=s.replace(/\s+/g,' ').trim();
      if(!s) return;
      while(s.length>180){
        if(cur){ out.push(cur); cur=''; }
        var cut=s.lastIndexOf(' ',180);
        if(cut<60) cut=180;
        out.push(s.slice(0,cut).trim());
        s=s.slice(cut).trim();
      }
      if((cur+' '+s).trim().length>180){ if(cur) out.push(cur); cur=s; }
      else{ cur=(cur+' '+s).trim(); }
    });
    if(cur) out.push(cur);
    return out;
  }
  if(typeof window!=='undefined') window.__aingelListenSplit=splitIntoChunks;
  if(!('speechSynthesis' in window)){
    toggle.addEventListener('click',function(){
      say('Listening isn\u2019t available in this browser \u2014 it doesn\u2019t offer a speech voice.');
    });
    return;
  }
  var synth=window.speechSynthesis;
  var chunks=[], idx=0, state='idle';
  function setUI(){
    if(state==='playing'){ toggle.textContent='\u23f8 Pause'; }
    else if(state==='paused'){ toggle.textContent='\u25b6 Resume'; }
    else{ toggle.textContent='\u{1F50A} Listen'; }
    if(stopBtn) stopBtn.hidden=(state==='idle');
  }
  function pageText(){
    var main=document.querySelector('main.reading');
    if(!main) return '';
    var clone=main.cloneNode(true);
    var junk=clone.querySelectorAll('.chap-nav,.listen-bar,script,style');
    for(var i=0;i<junk.length;i++){ junk[i].parentNode.removeChild(junk[i]); }
    var parts=[], ps=clone.querySelectorAll('p');
    for(var j=0;j<ps.length;j++){
      var t=(ps[j].textContent||'').replace(/\s+/g,' ').trim();
      if(t) parts.push(t);
    }
    return parts.join(' ');
  }
  function finish(){
    state='idle'; idx=0; chunks=[]; setUI();
  }
  function speakNext(){
    if(state!=='playing') return;
    if(idx>=chunks.length){ finish(); return; }
    var u=new SpeechSynthesisUtterance(chunks[idx]);
    u.onend=function(){ if(state==='playing'){ idx++; speakNext(); } };
    u.onerror=function(e){
      if(state==='playing' && e.error!=='canceled' && e.error!=='interrupted'){ idx++; speakNext(); }
    };
    synth.speak(u);
  }
  function begin(){
    chunks=splitIntoChunks(pageText());
    if(!chunks.length){ say('There is nothing to read aloud on this page.'); return; }
    idx=0; state='playing'; setUI(); say('');
    synth.cancel();
    speakNext();
  }
  function start(){
    if(typeof synth.getVoices==='function' && synth.getVoices().length===0
       && typeof synth.addEventListener==='function'){
      var tried=false;
      var onv=function(){
        synth.removeEventListener('voiceschanged',onv);
        if(tried) return; tried=true;
        if(synth.getVoices().length===0){
          say('Listening isn\u2019t available in this browser \u2014 it doesn\u2019t offer a speech voice.');
        } else { begin(); }
      };
      synth.addEventListener('voiceschanged',onv);
      // Some browsers never fire the event when no voice exists at all.
      setTimeout(function(){
        if(state==='idle' && synth.getVoices().length===0){
          synth.removeEventListener('voiceschanged',onv);
          say('Listening isn\u2019t available in this browser \u2014 it doesn\u2019t offer a speech voice.');
        }
      },1200);
      return;
    }
    begin();
  }
  toggle.addEventListener('click',function(){
    if(state==='idle'){ start(); }
    else if(state==='playing'){ synth.pause(); state='paused'; setUI(); }
    else if(state==='paused'){ synth.resume(); state='playing'; setUI(); }
  });
  if(stopBtn) stopBtn.addEventListener('click',function(){
    state='idle'; synth.cancel(); finish(); say('');
  });
  function cancelOnLeave(){ try{ synth.cancel(); }catch(e){} }
  window.addEventListener('pagehide',cancelOnLeave);
  window.addEventListener('beforeunload',cancelOnLeave);
  setUI();
})();
