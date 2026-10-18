const path=require('path'); const ROOT=path.join(__dirname,'..');
const L=require('./lib.js'); const {parseNote}=require('./parse.js');
const notes=JSON.parse(require('fs').readFileSync(process.env.NOTES||path.join(ROOT,'data/sheet/pll_notes.json')));
// 表の記法 → シミュレータの面の名前（bR = 右後ろ、DR / dR = F と R の下）
const map=JSON.parse(process.argv[2]||'{"bR":"Br","dR":"Dfr","DR":"Dfr"}');
L.M.setX('xR');
const ren=s=>s.split(' ').map(t=>{const m=/^([A-Za-z]+?)(\d*'?\d*)$/.exec(t); return m&&map[m[1]]?map[m[1]]+m[2]:t;}).join(' ');
const res={}; let nAlg=0,bad=[],tokens=new Set();
for(const o of notes){ if(!o.name||o.note.startsWith('[Threaded')||!/^[A-Z]/.test(o.name)) continue;
  const algs=parseNote(o.note); const keys=[];
  for(const a of algs){ nAlg++; a.body.split(' ').forEach(t=>tokens.add(t.replace(/\d*'?\d*$/,'')));
    const full=ren((a.lead.join(' ')+' '+a.body).trim()); const r=L.analyse(full);
    if(r.err) bad.push([o.name,r.err,a.raw]); else keys.push(r.key); }
  const uniq=[...new Set(keys)]; if(uniq.length>1) bad.push([o.name,'algs disagree',algs.map(a=>a.raw).join(' || ')]);
  res[o.name]={algs, key:uniq[0]};
}
console.log('algs',nAlg,'bad',bad.length,'tokens',[...tokens].join(' '));
bad.forEach(b=>console.log(b.join(' | ')));
require('fs').mkdirSync(path.join(ROOT,'tmp'),{recursive:true}); require('fs').writeFileSync(path.join(ROOT,'tmp/pll_check.json'),JSON.stringify(res));
