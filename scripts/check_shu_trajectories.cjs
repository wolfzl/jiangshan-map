const assert = require('node:assert/strict');
const {createMcpRuntime, executeMcpTool} = require('./mcp_server');
const runtime = createMcpRuntime();
const expectations = {
 zhangfei:['涿郡','下邳','长坂','南郡','江州','成都','宕渠','下辩','汉中','阆中'],
 zhaoyun:['长坂','江州','江阳','成都','汉水','江州','永安','汉中','箕谷'],
 machao:['平阳','潼关','冀城','汉中','成都','下辩','汉中'],
 pangtong:['襄阳','吴县','耒阳','涪县','雒县'],
 fazheng:['新都','成都','汉中','定军山'],
 liushan:['长坂','成都','湔县','成都','成都','洛阳'],
 jiangwan:['广都','什邡','成都','沔阳','涪县'],
 feiyi:['汉中','成都','兴势','成都','汉中','成都','汉中','成都','汉寿'],
 jiangwei:['冀城','成都','汉中','西平','南安','狄道','段谷','成都','沓中','剑阁','涪县','成都'],
};
for (const [key, expected] of Object.entries(expectations)) {
 const profile = runtime.sandbox.ATLAS_LORE_DATA.PERSON_PROFILES.find(p=>p.key===key);
 assert.ok(profile?.curatedOnly, `${key}: needs a sourced personal itinerary`);
 const events = executeMcpTool(runtime,'inspect_person',{person:key}).person.events;
 assert.deepEqual(Array.from(events,e=>e.site),expected,key);
 assert.ok(profile.stops.every(s=>s.quoteZh && s.sourceRefs?.length),key+' source evidence');
 assert.ok(events.every((e,i)=>!i||e.year>=events[i-1].year),key+' chronological order');
}
// Curated routes must exclude generic mentions, including when comparing people.
const z = runtime.sandbox.ATLAS_LORE_DATA.PERSON_PROFILES.find(p=>p.key==='zhaoyun');
assert.deepEqual(Array.from(runtime.ctrl._collectPersonEvents(z,{isMulti:true,peerKeys:['liubei']}),e=>e.siteZh),expectations.zhaoyun);
assert.ok(runtime.ctrl._collectPersonEvents(z).find(e=>e.siteZh==='江州'&&e.year===221).dateLabelZh.includes('确年未载'));
// Same renderer as A-tier: selection focuses arrivals in the full inclusive range.
const paths=[];
runtime.ctrl.grpJourney={};
runtime.ctrl._svgNode=(tag,attrs)=>{paths.push(attrs);return {style:{}}};
const segments=[1,2,3,4].map(toIdx=>({toIdx,d:`leg${toIdx}`,chord:0,mx:0,my:0,angleDeg:0}));
runtime.ctrl._renderCartographicTrajectory(segments,2,'red',false,3);
assert.equal(paths.find(p=>p.class==='journey-track-focus').d,'leg2 leg3');
assert.equal(paths.find(p=>p.class==='journey-track-passed').d,'leg1');
assert.equal(paths.find(p=>p.class==='journey-track-upcoming').d,'leg4');
console.log('9 sourced Shu routes and A-tier focus rendering passed');
