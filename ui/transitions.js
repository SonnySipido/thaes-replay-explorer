(function(root){
 'use strict';
 let active=null;
 function run(type,update,onError=error=>console.error(error)){
  active?.skipTransition();
  if(!root.document.startViewTransition||root.matchMedia('(prefers-reduced-motion:reduce)').matches){update();return null;}
  const transition=root.document.startViewTransition({update,types:[type]});active=transition;
  transition.ready.catch(()=>{});transition.updateCallbackDone.catch(onError);
  transition.finished.finally(()=>{if(active===transition)active=null;}).catch(()=>{});
  return transition;
 }
 root.replayTransitions={run};
})(window);
