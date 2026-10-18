const M=require('../src/minx.js');
const SOL=M.solved(); const U=['','U','U2',"U2'","U'"];
const nU=M.normals[M.names.U]; const LL=[];for(let i=0;i<M.N;i++) if(M.dot(M.pos[i],nU)>M.thr) LL.push(i);
const ROT=[];{const seen=new Set(),q=[''];const k=s=>Array.from(M.apply(SOL,s)).join();seen.add(k(''));ROT.push('');while(q.length){const s=q.shift();for(const g of['y','x']){const t=(s+' '+g).trim(),kk=k(t);if(!seen.has(kk)){seen.add(kk);ROT.push(t);q.push(t)}}}}
const reo=st=>ROT.map(r=>M.apply(st,r)).find(t=>{for(let f=0;f<12;f++)if(t[f*11]!==f)return false;return true});
function pllProblem(st){ for(let i=0;i<M.N;i++){ if(M.home[i]===M.names.U){ if(st[i]!==M.names.U) return 'U not oriented'; } else if(!LL.includes(i)&&st[i]!==M.home[i]) return 'F2L broken'; } return null; }
const sig=st=>LL.map(i=>st[i]).join();
const rotOf=a=>a.split(/\s+/).filter(t=>/^[xyz]/.test(t)).join(' ');
// sequence (from solved) that produces the state this alg solves
const setupOf=alg=>(rotOf(alg)+' '+M.invert(alg)).trim();
function caseKeyOfSetup(setup){ let best=null;
  for(const a of U) for(const b of U){ const t=sig(M.apply(SOL,(a+' '+setup+' '+b).trim())); if(best===null||t<best) best=t; }
  return best; }
function analyse(alg){ // -> {err} or {key}
  let st; try{ st=M.apply(SOL,setupOf(alg)); }catch(e){ return {err:'parse: '+e.message}; }
  for(let f=0;f<12;f++) if(st[f*11]!==f) return {err:'net rotation mismatch'};
  const p=pllProblem(st); if(p) return {err:p};
  return {key:caseKeyOfSetup(setupOf(alg))};
}
module.exports={M,SOL,U,LL,ROT,reo,pllProblem,sig,setupOf,caseKeyOfSetup,analyse,rotOf};
