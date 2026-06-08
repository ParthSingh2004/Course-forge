(function(){var eo=(e,t)=>()=>(t||(e((t={exports:{}}).exports,t),e=null),t.exports),to=500;function or(e){return e&&typeof e.LMSInitialize=="function"}function lr(e){return e&&typeof e.Initialize=="function"}function ss(e){let t=e,n=0;for(;t&&n<to;){try{if(lr(t.API_1484_11))return{api:t.API_1484_11,mode:"2004"};if(or(t.API))return{api:t.API,mode:"1.2"}}catch{return null}try{if(t.parent&&t.parent!==t)t=t.parent;else break}catch{break}n++}return null}function no(){try{if(lr(window.API_1484_11))return{api:window.API_1484_11,mode:"2004"};if(or(window.API))return{api:window.API,mode:"1.2"}}catch{}try{const e=ss(window.parent);if(e)return e}catch{}try{if(window.opener){if(lr(window.opener.API_1484_11))return{api:window.opener.API_1484_11,mode:"2004"};if(or(window.opener.API))return{api:window.opener.API,mode:"1.2"};const e=ss(window.opener);if(e)return e}}catch{}return null}function io(e){try{const t=String(e).split(":");return`PT${Math.max(0,parseInt(t[0]??"0",10)||0)}H${Math.max(0,parseInt(t[1]??"0",10)||0)}M${Math.max(0,Math.round(parseFloat(t[2]??"0")||0))}S`}catch{return"PT0H0M0S"}}var ro=class{constructor(){this.api=null,this.mode=null,this.initialized=!1,this.finished=!1,this._lastError={code:"0",message:"",diagnostic:""}}initialize(){if(this.initialized)return console.warn("[ScormAPI] Already initialized"),!0;const e=no();return this.api=e?.api??null,this.mode=e?.mode??null,!this.api||!this.mode?(console.warn("[ScormAPI] No LMS API found. Running in offline/preview mode. SCORM calls will be no-ops."),!1):(this.mode==="2004"?this.callApi("Initialize",""):this.callApi("LMSInitialize",""))==="true"?(this.initialized=!0,console.info(`[ScormAPI] ${this.mode} LMS connection initialized successfully`),!0):(console.error("[ScormAPI] LMS initialize failed:",this._lastError),!1)}getValue(e){if(!this.ensureReady("getValue"))return"";if(this.mode==="2004"){if(e==="cmi.core.lesson_status"){const t=this.callApi("GetValue","cmi.success_status"),n=this.callApi("GetValue","cmi.completion_status");return t==="passed"||t==="failed"?t:n==="completed"||n==="incomplete"||n==="not attempted"?n:""}if(e==="cmi.core.lesson_location")return this.callApi("GetValue","cmi.location");if(e==="cmi.core.lesson_mode")return this.callApi("GetValue","cmi.mode");if(e==="cmi.student_data.mastery_score"){const t=parseFloat(this.callApi("GetValue","cmi.scaled_passing_score"));return!isNaN(t)&&t>0?String(Math.round(t*100)):""}if(e==="cmi.core.score.raw")return this.callApi("GetValue","cmi.score.raw");if(e==="cmi.core.score.max")return this.callApi("GetValue","cmi.score.max");if(e==="cmi.core.score.min")return this.callApi("GetValue","cmi.score.min");if(e==="cmi.core.session_time")return this.callApi("GetValue","cmi.session_time")}return this.mode==="2004"?this.callApi("GetValue",e):this.callApi("LMSGetValue",e)}setValue(e,t){if(!this.ensureReady("setValue"))return!1;if(this.mode==="2004"){if(e==="cmi.core.lesson_status"){const n=String(t||"").toLowerCase(),i=[];return n==="passed"||n==="failed"?(i.push(this.callApi("SetValue","cmi.success_status",n)==="true"),i.push(this.callApi("SetValue","cmi.completion_status","completed")==="true"),i.every(Boolean)):n==="completed"?this.callApi("SetValue","cmi.completion_status","completed")==="true":n==="incomplete"||n==="not attempted"?this.callApi("SetValue","cmi.completion_status",n)==="true":this.callApi("SetValue","cmi.completion_status",n||"unknown")==="true"}if(e==="cmi.core.lesson_location")return this.callApi("SetValue","cmi.location",t)==="true";if(e==="cmi.core.score.raw"){const n=this.callApi("SetValue","cmi.score.raw",t)==="true",i=Number(t),r=isNaN(i)?!0:this.callApi("SetValue","cmi.score.scaled",String(Math.max(0,Math.min(1,i/100))))==="true";return n&&r}if(e==="cmi.core.score.max")return this.callApi("SetValue","cmi.score.max",t)==="true";if(e==="cmi.core.score.min")return this.callApi("SetValue","cmi.score.min",t)==="true";if(e==="cmi.core.session_time"){const n=io(t);return console.debug(`[ScormAPI] session_time converted: "${t}" → "${n}"`),this.callApi("SetValue","cmi.session_time",n)==="true"}}return(this.mode==="2004"?this.callApi("SetValue",e,t):this.callApi("LMSSetValue",e,t))==="true"}commit(){if(!this.ensureReady("commit"))return!1;const e=this.mode==="2004"?this.callApi("Commit",""):this.callApi("LMSCommit","");return e!=="true"&&console.error("[ScormAPI] Commit() failed — LMS did not acknowledge. suspend_data may not be persisted.",this._lastError),e==="true"}finish(){return this.finished?!0:!this.initialized||!this.api||!this.mode?!1:(this.mode==="2004"?this.callApi("SetValue","cmi.exit","suspend"):this.callApi("LMSSetValue","cmi.core.exit","suspend"),this.commit(),console.info("[ScormAPI] Calling Terminate/LMSFinish — session will be closed."),(this.mode==="2004"?this.callApi("Terminate",""):this.callApi("LMSFinish",""))==="true"?(this.finished=!0,this.initialized=!1,console.info("[ScormAPI] LMS connection terminated"),!0):(console.error("[ScormAPI] LMS finish failed:",this._lastError),!1))}get isConnected(){return this.initialized&&this.api!==null}get lastError(){return{...this._lastError}}get version(){return this.mode}callApi(e,...t){if(!this.api)return"false";try{const n=this.api[e];if(typeof n!="function")return console.error(`[ScormAPI] LMS API missing method: ${e}`),"false";const i=n.apply(this.api,t);return this.inspectError(),i??"false"}catch(n){return console.error(`[ScormAPI] Exception in ${e}:`,n),"false"}}inspectError(){if(!(!this.api||!this.mode))try{const e=this.mode==="2004"?this.api.GetLastError():this.api.LMSGetLastError();this._lastError={code:e,message:e!=="0"?this.mode==="2004"?this.api.GetErrorString(e):this.api.LMSGetErrorString(e):"",diagnostic:e!=="0"?this.mode==="2004"?this.api.GetDiagnostic(e):this.api.LMSGetDiagnostic(e):""},e!=="0"&&console.warn(`[ScormAPI] LMS Error ${e}: ${this._lastError.message}`,this._lastError.diagnostic)}catch{}}ensureReady(e){return this.api?this.initialized?this.finished?(console.warn(`[ScormAPI] ${e} called after finish()`),!1):!0:(console.warn(`[ScormAPI] ${e} called before initialize()`),!1):!1}},as,os,ls,cs,ds,us,hs,fs,ps,fh="184",ph=0,mh=1,gh=1,vh=100,_h=204,yh=205,xh=0,Sh=1,bh=2,Mh=3,Eh=4,Th=5,Ah=6,wh=7,Ch=0,Rh=300,Ph=301,cr=1e3,Kt=1001,dr=1002,yt=1003,so=1004,ao=1005,Et=1006,oo=1007,ur=1008,vn=1009,lo=1010,co=1011,ms=1012,uo=1013,_n=1014,Ei=1015,yn=1016,gs=1017,vs=1018,_s=1020,ho=35902,fo=35899,po=1021,mo=1022,ii=1023,ri=1026,ys=1027,go=1028,xs=1029,Ti=1030,Ss=1031,bs=1033,vo=33776,_o=33777,yo=33778,xo=33779,So=35840,bo=35841,Mo=35842,Eo=35843,To=36196,Ao=37492,wo=37496,Co=37488,Ro=37489,Po=37490,Io=37491,Lo=37808,Do=37809,No=37810,Uo=37811,Fo=37812,Oo=37813,Bo=37814,ko=37815,zo=37816,Vo=37817,Ho=37818,Go=37819,Wo=37820,Xo=37821,$o=36492,qo=36494,Yo=36495,jo=36283,Ko=36284,Zo=36285,Jo=36286,Ai=2300,hr=2301,fr=2302,Ms=2303,Es=2400,Ts=2401,As=2402,Qo=3200,Ih="",Nt="srgb",pr="srgb-linear",wi="linear",Ci="srgb",mr=7680,Lh=519,el=35044,Dh="300 es",Rn=2e3,Nh=2001;function tl(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}function nl(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}function si(e){return document.createElementNS("http://www.w3.org/1999/xhtml",e)}function il(){const e=si("canvas");return e.style.display="block",e}var ws={},Pn=null;function Cs(...e){const t="THREE."+e.shift();Pn?Pn("log",t,...e):console.log(t,...e)}function Rs(e){const t=e[0];if(typeof t=="string"&&t.startsWith("TSL:")){const n=e[1];n&&n.isStackTrace?e[0]+=" "+n.getLocation():e[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return e}function Ee(...e){e=Rs(e);const t="THREE."+e.shift();if(Pn)Pn("warn",t,...e);else{const n=e[0];n&&n.isStackTrace?console.warn(n.getError(t)):console.warn(t,...e)}}function we(...e){e=Rs(e);const t="THREE."+e.shift();if(Pn)Pn("error",t,...e);else{const n=e[0];n&&n.isStackTrace?console.error(n.getError(t)):console.error(t,...e)}}function gr(...e){const t=e.join(" ");t in ws||(ws[t]=!0,Ee(...e))}function rl(e,t,n){return new Promise(function(i,r){function s(){switch(e.clientWaitSync(t,e.SYNC_FLUSH_COMMANDS_BIT,0)){case e.WAIT_FAILED:r();break;case e.TIMEOUT_EXPIRED:setTimeout(s,n);break;default:i()}}setTimeout(s,n)})}var sl={0:1,2:6,4:7,3:5,1:0,6:2,7:4,5:3},xn=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const i=n[e];if(i!==void 0){const r=i.indexOf(t);r!==-1&&i.splice(r,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const i=n.slice(0);for(let r=0,s=i.length;r<s;r++)i[r].call(this,e);e.target=null}}},mt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Ps=1234567,ai=Math.PI/180,oi=180/Math.PI;function In(){const e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(mt[e&255]+mt[e>>8&255]+mt[e>>16&255]+mt[e>>24&255]+"-"+mt[t&255]+mt[t>>8&255]+"-"+mt[t>>16&15|64]+mt[t>>24&255]+"-"+mt[n&63|128]+mt[n>>8&255]+"-"+mt[n>>16&255]+mt[n>>24&255]+mt[i&255]+mt[i>>8&255]+mt[i>>16&255]+mt[i>>24&255]).toLowerCase()}function ze(e,t,n){return Math.max(t,Math.min(n,e))}function vr(e,t){return(e%t+t)%t}function al(e,t,n,i,r){return i+(e-t)*(r-i)/(n-t)}function ol(e,t,n){return e!==t?(n-e)/(t-e):0}function li(e,t,n){return(1-n)*e+n*t}function ll(e,t,n,i){return li(e,t,1-Math.exp(-n*i))}function cl(e,t=1){return t-Math.abs(vr(e,t*2)-t)}function dl(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*(3-2*e))}function ul(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*e*(e*(e*6-15)+10))}function hl(e,t){return e+Math.floor(Math.random()*(t-e+1))}function fl(e,t){return e+Math.random()*(t-e)}function pl(e){return e*(.5-Math.random())}function ml(e){e!==void 0&&(Ps=e);let t=Ps+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function gl(e){return e*ai}function vl(e){return e*oi}function _l(e){return(e&e-1)===0&&e!==0}function yl(e){return Math.pow(2,Math.ceil(Math.log(e)/Math.LN2))}function xl(e){return Math.pow(2,Math.floor(Math.log(e)/Math.LN2))}function Sl(e,t,n,i,r){const s=Math.cos,a=Math.sin,o=s(n/2),l=a(n/2),c=s((t+i)/2),u=a((t+i)/2),h=s((t-i)/2),d=a((t-i)/2),f=s((i-t)/2),g=a((i-t)/2);switch(r){case"XYX":e.set(o*u,l*h,l*d,o*c);break;case"YZY":e.set(l*d,o*u,l*h,o*c);break;case"ZXZ":e.set(l*h,l*d,o*u,o*c);break;case"XZX":e.set(o*u,l*g,l*f,o*c);break;case"YXY":e.set(l*f,o*u,l*g,o*c);break;case"ZYZ":e.set(l*g,l*f,o*u,o*c);break;default:Ee("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function Ln(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return e/4294967295;case Uint16Array:return e/65535;case Uint8Array:return e/255;case Int32Array:return Math.max(e/2147483647,-1);case Int16Array:return Math.max(e/32767,-1);case Int8Array:return Math.max(e/127,-1);default:throw new Error("Invalid component type.")}}function xt(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return Math.round(e*4294967295);case Uint16Array:return Math.round(e*65535);case Uint8Array:return Math.round(e*255);case Int32Array:return Math.round(e*2147483647);case Int16Array:return Math.round(e*32767);case Int8Array:return Math.round(e*127);default:throw new Error("Invalid component type.")}}var Ri={DEG2RAD:ai,RAD2DEG:oi,generateUUID:In,clamp:ze,euclideanModulo:vr,mapLinear:al,inverseLerp:ol,lerp:li,damp:ll,pingpong:cl,smoothstep:dl,smootherstep:ul,randInt:hl,randFloat:fl,randFloatSpread:pl,seededRandom:ml,degToRad:gl,radToDeg:vl,isPowerOfTwo:_l,ceilPowerOfTwo:yl,floorPowerOfTwo:xl,setQuaternionFromProperEuler:Sl,normalize:xt,denormalize:Ln};hs=Symbol.iterator;var Ze=class{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=ze(this.x,e.x,t.x),this.y=ze(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=ze(this.x,e,t),this.y=ze(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(ze(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(ze(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),i=Math.sin(t),r=this.x-e.x,s=this.y-e.y;return this.x=r*n-s*i+e.x,this.y=r*i+s*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[hs](){yield this.x,yield this.y}};as=Ze,as.prototype.isVector2=!0;var Sn=class{constructor(e=0,t=0,n=0,i=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=i}static slerpFlat(e,t,n,i,r,s,a){let o=n[i+0],l=n[i+1],c=n[i+2],u=n[i+3],h=r[s+0],d=r[s+1],f=r[s+2],g=r[s+3];if(u!==g||o!==h||l!==d||c!==f){let _=o*h+l*d+c*f+u*g;_<0&&(h=-h,d=-d,f=-f,g=-g,_=-_);let m=1-a;if(_<.9995){const p=Math.acos(_),S=Math.sin(p);m=Math.sin(m*p)/S,a=Math.sin(a*p)/S,o=o*m+h*a,l=l*m+d*a,c=c*m+f*a,u=u*m+g*a}else{o=o*m+h*a,l=l*m+d*a,c=c*m+f*a,u=u*m+g*a;const p=1/Math.sqrt(o*o+l*l+c*c+u*u);o*=p,l*=p,c*=p,u*=p}}e[t]=o,e[t+1]=l,e[t+2]=c,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,i,r,s){const a=n[i],o=n[i+1],l=n[i+2],c=n[i+3],u=r[s],h=r[s+1],d=r[s+2],f=r[s+3];return e[t]=a*f+c*u+o*d-l*h,e[t+1]=o*f+c*h+l*u-a*d,e[t+2]=l*f+c*d+a*h-o*u,e[t+3]=c*f-a*u-o*h-l*d,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,i=e._y,r=e._z,s=e._order,a=Math.cos,o=Math.sin,l=a(n/2),c=a(i/2),u=a(r/2),h=o(n/2),d=o(i/2),f=o(r/2);switch(s){case"XYZ":this._x=h*c*u+l*d*f,this._y=l*d*u-h*c*f,this._z=l*c*f+h*d*u,this._w=l*c*u-h*d*f;break;case"YXZ":this._x=h*c*u+l*d*f,this._y=l*d*u-h*c*f,this._z=l*c*f-h*d*u,this._w=l*c*u+h*d*f;break;case"ZXY":this._x=h*c*u-l*d*f,this._y=l*d*u+h*c*f,this._z=l*c*f+h*d*u,this._w=l*c*u-h*d*f;break;case"ZYX":this._x=h*c*u-l*d*f,this._y=l*d*u+h*c*f,this._z=l*c*f-h*d*u,this._w=l*c*u+h*d*f;break;case"YZX":this._x=h*c*u+l*d*f,this._y=l*d*u+h*c*f,this._z=l*c*f-h*d*u,this._w=l*c*u-h*d*f;break;case"XZY":this._x=h*c*u-l*d*f,this._y=l*d*u-h*c*f,this._z=l*c*f+h*d*u,this._w=l*c*u+h*d*f;break;default:Ee("Quaternion: .setFromEuler() encountered an unknown order: "+s)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],i=t[4],r=t[8],s=t[1],a=t[5],o=t[9],l=t[2],c=t[6],u=t[10],h=n+a+u;if(h>0){const d=.5/Math.sqrt(h+1);this._w=.25/d,this._x=(c-o)*d,this._y=(r-l)*d,this._z=(s-i)*d}else if(n>a&&n>u){const d=2*Math.sqrt(1+n-a-u);this._w=(c-o)/d,this._x=.25*d,this._y=(i+s)/d,this._z=(r+l)/d}else if(a>u){const d=2*Math.sqrt(1+a-n-u);this._w=(r-l)/d,this._x=(i+s)/d,this._y=.25*d,this._z=(o+c)/d}else{const d=2*Math.sqrt(1+u-n-a);this._w=(s-i)/d,this._x=(r+l)/d,this._y=(o+c)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(ze(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,i=e._y,r=e._z,s=e._w,a=t._x,o=t._y,l=t._z,c=t._w;return this._x=n*c+s*a+i*l-r*o,this._y=i*c+s*o+r*a-n*l,this._z=r*c+s*l+n*o-i*a,this._w=s*c-n*a-i*o-r*l,this._onChangeCallback(),this}slerp(e,t){let n=e._x,i=e._y,r=e._z,s=e._w,a=this.dot(e);a<0&&(n=-n,i=-i,r=-r,s=-s,a=-a);let o=1-t;if(a<.9995){const l=Math.acos(a),c=Math.sin(l);o=Math.sin(o*l)/c,t=Math.sin(t*l)/c,this._x=this._x*o+n*t,this._y=this._y*o+i*t,this._z=this._z*o+r*t,this._w=this._w*o+s*t,this._onChangeCallback()}else this._x=this._x*o+n*t,this._y=this._y*o+i*t,this._z=this._z*o+r*t,this._w=this._w*o+s*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(i*Math.sin(e),i*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}};fs=Symbol.iterator;var B=class{constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Is.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Is.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,i=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*i,this.y=r[1]*t+r[4]*n+r[7]*i,this.z=r[2]*t+r[5]*n+r[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,r=e.elements,s=1/(r[3]*t+r[7]*n+r[11]*i+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*i+r[12])*s,this.y=(r[1]*t+r[5]*n+r[9]*i+r[13])*s,this.z=(r[2]*t+r[6]*n+r[10]*i+r[14])*s,this}applyQuaternion(e){const t=this.x,n=this.y,i=this.z,r=e.x,s=e.y,a=e.z,o=e.w,l=2*(s*i-a*n),c=2*(a*t-r*i),u=2*(r*n-s*t);return this.x=t+o*l+s*u-a*c,this.y=n+o*c+a*l-r*u,this.z=i+o*u+r*c-s*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,i=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*i,this.y=r[1]*t+r[5]*n+r[9]*i,this.z=r[2]*t+r[6]*n+r[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=ze(this.x,e.x,t.x),this.y=ze(this.y,e.y,t.y),this.z=ze(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=ze(this.x,e,t),this.y=ze(this.y,e,t),this.z=ze(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(ze(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,i=e.y,r=e.z,s=t.x,a=t.y,o=t.z;return this.x=i*o-r*a,this.y=r*s-n*o,this.z=n*a-i*s,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return _r.copy(this).projectOnVector(e),this.sub(_r)}reflect(e){return this.sub(_r.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(ze(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[fs](){yield this.x,yield this.y,yield this.z}};os=B,os.prototype.isVector3=!0;var _r=new B,Is=new Sn,Ne=class{constructor(e,t,n,i,r,s,a,o,l){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,i,r,s,a,o,l)}set(e,t,n,i,r,s,a,o,l){const c=this.elements;return c[0]=e,c[1]=i,c[2]=a,c[3]=t,c[4]=r,c[5]=o,c[6]=n,c[7]=s,c[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,r=this.elements,s=n[0],a=n[3],o=n[6],l=n[1],c=n[4],u=n[7],h=n[2],d=n[5],f=n[8],g=i[0],_=i[3],m=i[6],p=i[1],S=i[4],b=i[7],x=i[2],C=i[5],A=i[8];return r[0]=s*g+a*p+o*x,r[3]=s*_+a*S+o*C,r[6]=s*m+a*b+o*A,r[1]=l*g+c*p+u*x,r[4]=l*_+c*S+u*C,r[7]=l*m+c*b+u*A,r[2]=h*g+d*p+f*x,r[5]=h*_+d*S+f*C,r[8]=h*m+d*b+f*A,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],s=e[4],a=e[5],o=e[6],l=e[7],c=e[8];return t*s*c-t*a*l-n*r*c+n*a*o+i*r*l-i*s*o}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],s=e[4],a=e[5],o=e[6],l=e[7],c=e[8],u=c*s-a*l,h=a*o-c*r,d=l*r-s*o,f=t*u+n*h+i*d;if(f===0)return this.set(0,0,0,0,0,0,0,0,0);const g=1/f;return e[0]=u*g,e[1]=(i*l-c*n)*g,e[2]=(a*n-i*s)*g,e[3]=h*g,e[4]=(c*t-i*o)*g,e[5]=(i*r-a*t)*g,e[6]=d*g,e[7]=(n*o-l*t)*g,e[8]=(s*t-n*r)*g,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,r,s,a){const o=Math.cos(r),l=Math.sin(r);return this.set(n*o,n*l,-n*(o*s+l*a)+s+e,-i*l,i*o,-i*(-l*s+o*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(yr.makeScale(e,t)),this}rotate(e){return this.premultiply(yr.makeRotation(-e)),this}translate(e,t){return this.premultiply(yr.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}};ls=Ne,ls.prototype.isMatrix3=!0;var yr=new Ne,Ls=new Ne().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Ds=new Ne().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function bl(){const e={enabled:!0,workingColorSpace:pr,spaces:{},convert:function(r,s,a){return this.enabled===!1||s===a||!s||!a||(this.spaces[s].transfer==="srgb"&&(r.r=Zt(r.r),r.g=Zt(r.g),r.b=Zt(r.b)),this.spaces[s].primaries!==this.spaces[a].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer==="srgb"&&(r.r=Dn(r.r),r.g=Dn(r.g),r.b=Dn(r.b))),r},workingToColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},colorSpaceToWorking:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===""?wi:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,a){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(r,s){return gr("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),e.workingToColorSpace(r,s)},toWorkingColorSpace:function(r,s){return gr("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),e.colorSpaceToWorking(r,s)}},t=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],i=[.3127,.329];return e.define({[pr]:{primaries:t,whitePoint:i,transfer:wi,toXYZ:Ls,fromXYZ:Ds,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:Nt},outputColorSpaceConfig:{drawingBufferColorSpace:Nt}},[Nt]:{primaries:t,whitePoint:i,transfer:Ci,toXYZ:Ls,fromXYZ:Ds,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:Nt}}}),e}var He=bl();function Zt(e){return e<.04045?e*.0773993808:Math.pow(e*.9478672986+.0521327014,2.4)}function Dn(e){return e<.0031308?e*12.92:1.055*Math.pow(e,.41666)-.055}var Nn,Ml=class{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Nn===void 0&&(Nn=si("canvas")),Nn.width=e.width,Nn.height=e.height;const i=Nn.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),n=Nn}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=si("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const i=n.getImageData(0,0,e.width,e.height),r=i.data;for(let s=0;s<r.length;s++)r[s]=Zt(r[s]/255)*255;return n.putImageData(i,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(Zt(t[n]/255)*255):t[n]=Zt(t[n]);return{data:t,width:e.width,height:e.height}}else return Ee("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},El=0,xr=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:El++}),this.uuid=In(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let r;if(Array.isArray(i)){r=[];for(let s=0,a=i.length;s<a;s++)i[s].isDataTexture?r.push(Sr(i[s].image)):r.push(Sr(i[s]))}else r=Sr(i);n.url=r}return t||(e.images[this.uuid]=n),n}};function Sr(e){return typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap?Ml.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(Ee("Texture: Unable to serialize Texture."),{})}var Tl=0,br=new B,Ct=class sr extends xn{constructor(t=sr.DEFAULT_IMAGE,n=sr.DEFAULT_MAPPING,i=Kt,r=Kt,s=Et,a=ur,o=ii,l=vn,c=sr.DEFAULT_ANISOTROPY,u=""){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Tl++}),this.uuid=In(),this.name="",this.source=new xr(t),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new Ze(0,0),this.repeat=new Ze(1,1),this.center=new Ze(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ne,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(br).x}get height(){return this.source.getSize(br).y}get depth(){return this.source.getSize(br).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,n){this.updateRanges.push({start:t,count:n})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(const n in t){const i=t[n];if(i===void 0){Ee(`Texture.setValues(): parameter '${n}' has value of undefined.`);continue}const r=this[n];if(r===void 0){Ee(`Texture.setValues(): property '${n}' does not exist.`);continue}r&&i&&r.isVector2&&i.isVector2||r&&i&&r.isVector3&&i.isVector3||r&&i&&r.isMatrix3&&i.isMatrix3?r.copy(i):this[n]=i}}toJSON(t){const n=t===void 0||typeof t=="string";if(!n&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),n||(t.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==300)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case cr:t.x=t.x-Math.floor(t.x);break;case Kt:t.x=t.x<0?0:1;break;case dr:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case cr:t.y=t.y-Math.floor(t.y);break;case Kt:t.y=t.y<0?0:1;break;case dr:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};Ct.DEFAULT_IMAGE=null,Ct.DEFAULT_MAPPING=300,Ct.DEFAULT_ANISOTROPY=1,ps=Symbol.iterator;var ot=class{constructor(e=0,t=0,n=0,i=1){this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,r=this.w,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*i+s[12]*r,this.y=s[1]*t+s[5]*n+s[9]*i+s[13]*r,this.z=s[2]*t+s[6]*n+s[10]*i+s[14]*r,this.w=s[3]*t+s[7]*n+s[11]*i+s[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,i,r;const o=e.elements,l=o[0],c=o[4],u=o[8],h=o[1],d=o[5],f=o[9],g=o[2],_=o[6],m=o[10];if(Math.abs(c-h)<.01&&Math.abs(u-g)<.01&&Math.abs(f-_)<.01){if(Math.abs(c+h)<.1&&Math.abs(u+g)<.1&&Math.abs(f+_)<.1&&Math.abs(l+d+m-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const S=(l+1)/2,b=(d+1)/2,x=(m+1)/2,C=(c+h)/4,A=(u+g)/4,T=(f+_)/4;return S>b&&S>x?S<.01?(n=0,i=.707106781,r=.707106781):(n=Math.sqrt(S),i=C/n,r=A/n):b>x?b<.01?(n=.707106781,i=0,r=.707106781):(i=Math.sqrt(b),n=C/i,r=T/i):x<.01?(n=.707106781,i=.707106781,r=0):(r=Math.sqrt(x),n=A/r,i=T/r),this.set(n,i,r,t),this}let p=Math.sqrt((_-f)*(_-f)+(u-g)*(u-g)+(h-c)*(h-c));return Math.abs(p)<.001&&(p=1),this.x=(_-f)/p,this.y=(u-g)/p,this.z=(h-c)/p,this.w=Math.acos((l+d+m-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=ze(this.x,e.x,t.x),this.y=ze(this.y,e.y,t.y),this.z=ze(this.z,e.z,t.z),this.w=ze(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=ze(this.x,e,t),this.y=ze(this.y,e,t),this.z=ze(this.z,e,t),this.w=ze(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(ze(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[ps](){yield this.x,yield this.y,yield this.z,yield this.w}};cs=ot,cs.prototype.isVector4=!0;var Al=class extends xn{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Et,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new ot(0,0,e,t),this.scissorTest=!1,this.viewport=new ot(0,0,e,t),this.textures=[];const i=new Ct({width:e,height:t,depth:n.depth}),r=n.count;for(let s=0;s<r;s++)this.textures[s]=i.clone(),this.textures[s].isRenderTargetTexture=!0,this.textures[s].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:Et,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let i=0,r=this.textures.length;i<r;i++)this.textures[i].image.width=e,this.textures[i].image.height=t,this.textures[i].image.depth=n,this.textures[i].isData3DTexture!==!0&&(this.textures[i].isArrayTexture=this.textures[i].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const i=Object.assign({},e.textures[t].image);this.textures[t].source=new xr(i)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this}dispose(){this.dispatchEvent({type:"dispose"})}},zt=class extends Al{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},Ns=class extends Ct{constructor(e=null,t=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=yt,this.minFilter=yt,this.wrapR=Kt,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}},wl=class extends Ct{constructor(e=null,t=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=yt,this.minFilter=yt,this.wrapR=Kt,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},ft=class Ya{constructor(t,n,i,r,s,a,o,l,c,u,h,d,f,g,_,m){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,n,i,r,s,a,o,l,c,u,h,d,f,g,_,m)}set(t,n,i,r,s,a,o,l,c,u,h,d,f,g,_,m){const p=this.elements;return p[0]=t,p[4]=n,p[8]=i,p[12]=r,p[1]=s,p[5]=a,p[9]=o,p[13]=l,p[2]=c,p[6]=u,p[10]=h,p[14]=d,p[3]=f,p[7]=g,p[11]=_,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Ya().fromArray(this.elements)}copy(t){const n=this.elements,i=t.elements;return n[0]=i[0],n[1]=i[1],n[2]=i[2],n[3]=i[3],n[4]=i[4],n[5]=i[5],n[6]=i[6],n[7]=i[7],n[8]=i[8],n[9]=i[9],n[10]=i[10],n[11]=i[11],n[12]=i[12],n[13]=i[13],n[14]=i[14],n[15]=i[15],this}copyPosition(t){const n=this.elements,i=t.elements;return n[12]=i[12],n[13]=i[13],n[14]=i[14],this}setFromMatrix3(t){const n=t.elements;return this.set(n[0],n[3],n[6],0,n[1],n[4],n[7],0,n[2],n[5],n[8],0,0,0,0,1),this}extractBasis(t,n,i){return this.determinant()===0?(t.set(1,0,0),n.set(0,1,0),i.set(0,0,1),this):(t.setFromMatrixColumn(this,0),n.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this)}makeBasis(t,n,i){return this.set(t.x,n.x,i.x,0,t.y,n.y,i.y,0,t.z,n.z,i.z,0,0,0,0,1),this}extractRotation(t){if(t.determinant()===0)return this.identity();const n=this.elements,i=t.elements,r=1/Un.setFromMatrixColumn(t,0).length(),s=1/Un.setFromMatrixColumn(t,1).length(),a=1/Un.setFromMatrixColumn(t,2).length();return n[0]=i[0]*r,n[1]=i[1]*r,n[2]=i[2]*r,n[3]=0,n[4]=i[4]*s,n[5]=i[5]*s,n[6]=i[6]*s,n[7]=0,n[8]=i[8]*a,n[9]=i[9]*a,n[10]=i[10]*a,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeRotationFromEuler(t){const n=this.elements,i=t.x,r=t.y,s=t.z,a=Math.cos(i),o=Math.sin(i),l=Math.cos(r),c=Math.sin(r),u=Math.cos(s),h=Math.sin(s);if(t.order==="XYZ"){const d=a*u,f=a*h,g=o*u,_=o*h;n[0]=l*u,n[4]=-l*h,n[8]=c,n[1]=f+g*c,n[5]=d-_*c,n[9]=-o*l,n[2]=_-d*c,n[6]=g+f*c,n[10]=a*l}else if(t.order==="YXZ"){const d=l*u,f=l*h,g=c*u,_=c*h;n[0]=d+_*o,n[4]=g*o-f,n[8]=a*c,n[1]=a*h,n[5]=a*u,n[9]=-o,n[2]=f*o-g,n[6]=_+d*o,n[10]=a*l}else if(t.order==="ZXY"){const d=l*u,f=l*h,g=c*u,_=c*h;n[0]=d-_*o,n[4]=-a*h,n[8]=g+f*o,n[1]=f+g*o,n[5]=a*u,n[9]=_-d*o,n[2]=-a*c,n[6]=o,n[10]=a*l}else if(t.order==="ZYX"){const d=a*u,f=a*h,g=o*u,_=o*h;n[0]=l*u,n[4]=g*c-f,n[8]=d*c+_,n[1]=l*h,n[5]=_*c+d,n[9]=f*c-g,n[2]=-c,n[6]=o*l,n[10]=a*l}else if(t.order==="YZX"){const d=a*l,f=a*c,g=o*l,_=o*c;n[0]=l*u,n[4]=_-d*h,n[8]=g*h+f,n[1]=h,n[5]=a*u,n[9]=-o*u,n[2]=-c*u,n[6]=f*h+g,n[10]=d-_*h}else if(t.order==="XZY"){const d=a*l,f=a*c,g=o*l,_=o*c;n[0]=l*u,n[4]=-h,n[8]=c*u,n[1]=d*h+_,n[5]=a*u,n[9]=f*h-g,n[2]=g*h-f,n[6]=o*u,n[10]=_*h+d}return n[3]=0,n[7]=0,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Cl,t,Rl)}lookAt(t,n,i){const r=this.elements;return Tt.subVectors(t,n),Tt.lengthSq()===0&&(Tt.z=1),Tt.normalize(),sn.crossVectors(i,Tt),sn.lengthSq()===0&&(Math.abs(i.z)===1?Tt.x+=1e-4:Tt.z+=1e-4,Tt.normalize(),sn.crossVectors(i,Tt)),sn.normalize(),Pi.crossVectors(Tt,sn),r[0]=sn.x,r[4]=Pi.x,r[8]=Tt.x,r[1]=sn.y,r[5]=Pi.y,r[9]=Tt.y,r[2]=sn.z,r[6]=Pi.z,r[10]=Tt.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,n){const i=t.elements,r=n.elements,s=this.elements,a=i[0],o=i[4],l=i[8],c=i[12],u=i[1],h=i[5],d=i[9],f=i[13],g=i[2],_=i[6],m=i[10],p=i[14],S=i[3],b=i[7],x=i[11],C=i[15],A=r[0],T=r[4],v=r[8],E=r[12],W=r[1],R=r[5],H=r[9],X=r[13],z=r[2],k=r[6],G=r[10],I=r[14],Y=r[3],J=r[7],te=r[11],fe=r[15];return s[0]=a*A+o*W+l*z+c*Y,s[4]=a*T+o*R+l*k+c*J,s[8]=a*v+o*H+l*G+c*te,s[12]=a*E+o*X+l*I+c*fe,s[1]=u*A+h*W+d*z+f*Y,s[5]=u*T+h*R+d*k+f*J,s[9]=u*v+h*H+d*G+f*te,s[13]=u*E+h*X+d*I+f*fe,s[2]=g*A+_*W+m*z+p*Y,s[6]=g*T+_*R+m*k+p*J,s[10]=g*v+_*H+m*G+p*te,s[14]=g*E+_*X+m*I+p*fe,s[3]=S*A+b*W+x*z+C*Y,s[7]=S*T+b*R+x*k+C*J,s[11]=S*v+b*H+x*G+C*te,s[15]=S*E+b*X+x*I+C*fe,this}multiplyScalar(t){const n=this.elements;return n[0]*=t,n[4]*=t,n[8]*=t,n[12]*=t,n[1]*=t,n[5]*=t,n[9]*=t,n[13]*=t,n[2]*=t,n[6]*=t,n[10]*=t,n[14]*=t,n[3]*=t,n[7]*=t,n[11]*=t,n[15]*=t,this}determinant(){const t=this.elements,n=t[0],i=t[4],r=t[8],s=t[12],a=t[1],o=t[5],l=t[9],c=t[13],u=t[2],h=t[6],d=t[10],f=t[14],g=t[3],_=t[7],m=t[11],p=t[15],S=l*f-c*d,b=o*f-c*h,x=o*d-l*h,C=a*f-c*u,A=a*d-l*u,T=a*h-o*u;return n*(_*S-m*b+p*x)-i*(g*S-m*C+p*A)+r*(g*b-_*C+p*T)-s*(g*x-_*A+m*T)}transpose(){const t=this.elements;let n;return n=t[1],t[1]=t[4],t[4]=n,n=t[2],t[2]=t[8],t[8]=n,n=t[6],t[6]=t[9],t[9]=n,n=t[3],t[3]=t[12],t[12]=n,n=t[7],t[7]=t[13],t[13]=n,n=t[11],t[11]=t[14],t[14]=n,this}setPosition(t,n,i){const r=this.elements;return t.isVector3?(r[12]=t.x,r[13]=t.y,r[14]=t.z):(r[12]=t,r[13]=n,r[14]=i),this}invert(){const t=this.elements,n=t[0],i=t[1],r=t[2],s=t[3],a=t[4],o=t[5],l=t[6],c=t[7],u=t[8],h=t[9],d=t[10],f=t[11],g=t[12],_=t[13],m=t[14],p=t[15],S=n*o-i*a,b=n*l-r*a,x=n*c-s*a,C=i*l-r*o,A=i*c-s*o,T=r*c-s*l,v=u*_-h*g,E=u*m-d*g,W=u*p-f*g,R=h*m-d*_,H=h*p-f*_,X=d*p-f*m,z=S*X-b*H+x*R+C*W-A*E+T*v;if(z===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const k=1/z;return t[0]=(o*X-l*H+c*R)*k,t[1]=(r*H-i*X-s*R)*k,t[2]=(_*T-m*A+p*C)*k,t[3]=(d*A-h*T-f*C)*k,t[4]=(l*W-a*X-c*E)*k,t[5]=(n*X-r*W+s*E)*k,t[6]=(m*x-g*T-p*b)*k,t[7]=(u*T-d*x+f*b)*k,t[8]=(a*H-o*W+c*v)*k,t[9]=(i*W-n*H-s*v)*k,t[10]=(g*A-_*x+p*S)*k,t[11]=(h*x-u*A-f*S)*k,t[12]=(o*E-a*R-l*v)*k,t[13]=(n*R-i*E+r*v)*k,t[14]=(_*b-g*C-m*S)*k,t[15]=(u*C-h*b+d*S)*k,this}scale(t){const n=this.elements,i=t.x,r=t.y,s=t.z;return n[0]*=i,n[4]*=r,n[8]*=s,n[1]*=i,n[5]*=r,n[9]*=s,n[2]*=i,n[6]*=r,n[10]*=s,n[3]*=i,n[7]*=r,n[11]*=s,this}getMaxScaleOnAxis(){const t=this.elements,n=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],i=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],r=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(n,i,r))}makeTranslation(t,n,i){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,n,0,0,1,i,0,0,0,1),this}makeRotationX(t){const n=Math.cos(t),i=Math.sin(t);return this.set(1,0,0,0,0,n,-i,0,0,i,n,0,0,0,0,1),this}makeRotationY(t){const n=Math.cos(t),i=Math.sin(t);return this.set(n,0,i,0,0,1,0,0,-i,0,n,0,0,0,0,1),this}makeRotationZ(t){const n=Math.cos(t),i=Math.sin(t);return this.set(n,-i,0,0,i,n,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,n){const i=Math.cos(n),r=Math.sin(n),s=1-i,a=t.x,o=t.y,l=t.z,c=s*a,u=s*o;return this.set(c*a+i,c*o-r*l,c*l+r*o,0,c*o+r*l,u*o+i,u*l-r*a,0,c*l-r*o,u*l+r*a,s*l*l+i,0,0,0,0,1),this}makeScale(t,n,i){return this.set(t,0,0,0,0,n,0,0,0,0,i,0,0,0,0,1),this}makeShear(t,n,i,r,s,a){return this.set(1,i,s,0,t,1,a,0,n,r,1,0,0,0,0,1),this}compose(t,n,i){const r=this.elements,s=n._x,a=n._y,o=n._z,l=n._w,c=s+s,u=a+a,h=o+o,d=s*c,f=s*u,g=s*h,_=a*u,m=a*h,p=o*h,S=l*c,b=l*u,x=l*h,C=i.x,A=i.y,T=i.z;return r[0]=(1-(_+p))*C,r[1]=(f+x)*C,r[2]=(g-b)*C,r[3]=0,r[4]=(f-x)*A,r[5]=(1-(d+p))*A,r[6]=(m+S)*A,r[7]=0,r[8]=(g+b)*T,r[9]=(m-S)*T,r[10]=(1-(d+_))*T,r[11]=0,r[12]=t.x,r[13]=t.y,r[14]=t.z,r[15]=1,this}decompose(t,n,i){const r=this.elements;t.x=r[12],t.y=r[13],t.z=r[14];const s=this.determinant();if(s===0)return i.set(1,1,1),n.identity(),this;let a=Un.set(r[0],r[1],r[2]).length();const o=Un.set(r[4],r[5],r[6]).length(),l=Un.set(r[8],r[9],r[10]).length();s<0&&(a=-a),Ut.copy(this);const c=1/a,u=1/o,h=1/l;return Ut.elements[0]*=c,Ut.elements[1]*=c,Ut.elements[2]*=c,Ut.elements[4]*=u,Ut.elements[5]*=u,Ut.elements[6]*=u,Ut.elements[8]*=h,Ut.elements[9]*=h,Ut.elements[10]*=h,n.setFromRotationMatrix(Ut),i.x=a,i.y=o,i.z=l,this}makePerspective(t,n,i,r,s,a,o=Rn,l=!1){const c=this.elements,u=2*s/(n-t),h=2*s/(i-r),d=(n+t)/(n-t),f=(i+r)/(i-r);let g,_;if(l)g=s/(a-s),_=a*s/(a-s);else if(o===2e3)g=-(a+s)/(a-s),_=-2*a*s/(a-s);else if(o===2001)g=-a/(a-s),_=-a*s/(a-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=u,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=h,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=_,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,n,i,r,s,a,o=Rn,l=!1){const c=this.elements,u=2/(n-t),h=2/(i-r),d=-(n+t)/(n-t),f=-(i+r)/(i-r);let g,_;if(l)g=1/(a-s),_=a/(a-s);else if(o===2e3)g=-2/(a-s),_=-(a+s)/(a-s);else if(o===2001)g=-1/(a-s),_=-s/(a-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=u,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=h,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=g,c[14]=_,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){const n=this.elements,i=t.elements;for(let r=0;r<16;r++)if(n[r]!==i[r])return!1;return!0}fromArray(t,n=0){for(let i=0;i<16;i++)this.elements[i]=t[i+n];return this}toArray(t=[],n=0){const i=this.elements;return t[n]=i[0],t[n+1]=i[1],t[n+2]=i[2],t[n+3]=i[3],t[n+4]=i[4],t[n+5]=i[5],t[n+6]=i[6],t[n+7]=i[7],t[n+8]=i[8],t[n+9]=i[9],t[n+10]=i[10],t[n+11]=i[11],t[n+12]=i[12],t[n+13]=i[13],t[n+14]=i[14],t[n+15]=i[15],t}};ds=ft,ds.prototype.isMatrix4=!0;var Un=new B,Ut=new ft,Cl=new B(0,0,0),Rl=new B(1,1,1),sn=new B,Pi=new B,Tt=new B,Us=new ft,Fs=new Sn,ci=class ja{constructor(t=0,n=0,i=0,r=ja.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=i,this._order=r}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,n,i,r=this._order){return this._x=t,this._y=n,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,n=this._order,i=!0){const r=t.elements,s=r[0],a=r[4],o=r[8],l=r[1],c=r[5],u=r[9],h=r[2],d=r[6],f=r[10];switch(n){case"XYZ":this._y=Math.asin(ze(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-u,f),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-ze(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-h,s),this._z=0);break;case"ZXY":this._x=Math.asin(ze(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-h,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-ze(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(ze(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-h,s)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-ze(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-u,f),this._y=0);break;default:Ee("Euler: .setFromRotationMatrix() encountered an unknown order: "+n)}return this._order=n,i===!0&&this._onChangeCallback(),this}setFromQuaternion(t,n,i){return Us.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Us,n,i)}setFromVector3(t,n=this._order){return this.set(t.x,t.y,t.z,n)}reorder(t){return Fs.setFromEuler(this),this.setFromQuaternion(Fs,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],n=0){return t[n]=this._x,t[n+1]=this._y,t[n+2]=this._z,t[n+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};ci.DEFAULT_ORDER="XYZ";var Os=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},Pl=0,Bs=new B,Fn=new Sn,Jt=new ft,Ii=new B,di=new B,Il=new B,Ll=new Sn,ks=new B(1,0,0),zs=new B(0,1,0),Vs=new B(0,0,1),Hs={type:"added"},Dl={type:"removed"},On={type:"childadded",child:null},Mr={type:"childremoved",child:null},Qt=class ar extends xn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Pl++}),this.uuid=In(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=ar.DEFAULT_UP.clone();const t=new B,n=new ci,i=new Sn,r=new B(1,1,1);function s(){i.setFromEuler(n,!1)}function a(){n.setFromQuaternion(i,void 0,!1)}n._onChange(s),i._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new ft},normalMatrix:{value:new Ne}}),this.matrix=new ft,this.matrixWorld=new ft,this.matrixAutoUpdate=ar.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=ar.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Os,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,n){this.quaternion.setFromAxisAngle(t,n)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,n){return Fn.setFromAxisAngle(t,n),this.quaternion.multiply(Fn),this}rotateOnWorldAxis(t,n){return Fn.setFromAxisAngle(t,n),this.quaternion.premultiply(Fn),this}rotateX(t){return this.rotateOnAxis(ks,t)}rotateY(t){return this.rotateOnAxis(zs,t)}rotateZ(t){return this.rotateOnAxis(Vs,t)}translateOnAxis(t,n){return Bs.copy(t).applyQuaternion(this.quaternion),this.position.add(Bs.multiplyScalar(n)),this}translateX(t){return this.translateOnAxis(ks,t)}translateY(t){return this.translateOnAxis(zs,t)}translateZ(t){return this.translateOnAxis(Vs,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Jt.copy(this.matrixWorld).invert())}lookAt(t,n,i){t.isVector3?Ii.copy(t):Ii.set(t,n,i);const r=this.parent;this.updateWorldMatrix(!0,!1),di.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Jt.lookAt(di,Ii,this.up):Jt.lookAt(Ii,di,this.up),this.quaternion.setFromRotationMatrix(Jt),r&&(Jt.extractRotation(r.matrixWorld),Fn.setFromRotationMatrix(Jt),this.quaternion.premultiply(Fn.invert()))}add(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.add(arguments[n]);return this}return t===this?(we("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Hs),On.child=t,this.dispatchEvent(On),On.child=null):we("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const n=this.children.indexOf(t);return n!==-1&&(t.parent=null,this.children.splice(n,1),t.dispatchEvent(Dl),Mr.child=t,this.dispatchEvent(Mr),Mr.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Jt.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Jt.multiply(t.parent.matrixWorld)),t.applyMatrix4(Jt),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Hs),On.child=t,this.dispatchEvent(On),On.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,n){if(this[t]===n)return this;for(let i=0,r=this.children.length;i<r;i++){const s=this.children[i].getObjectByProperty(t,n);if(s!==void 0)return s}}getObjectsByProperty(t,n,i=[]){this[t]===n&&i.push(this);const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].getObjectsByProperty(t,n,i);return i}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(di,t,Il),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(di,Ll,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const n=this.matrixWorld.elements;return t.set(n[8],n[9],n[10]).normalize()}raycast(){}traverse(t){t(this);const n=this.children;for(let i=0,r=n.length;i<r;i++)n[i].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const n=this.children;for(let i=0,r=n.length;i<r;i++)n[i].traverseVisible(t)}traverseAncestors(t){const n=this.parent;n!==null&&(t(n),n.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const t=this.pivot;if(t!==null){const n=t.x,i=t.y,r=t.z,s=this.matrix.elements;s[12]+=n-s[0]*n-s[4]*i-s[8]*r,s[13]+=i-s[1]*n-s[5]*i-s[9]*r,s[14]+=r-s[2]*n-s[6]*i-s[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const n=this.children;for(let i=0,r=n.length;i<r;i++)n[i].updateMatrixWorld(t)}updateWorldMatrix(t,n){const i=this.parent;if(t===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),n===!0){const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(t){const n=t===void 0||typeof t=="string",i={};n&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),this.static!==!1&&(r.static=this.static),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(o=>({...o})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(t),r.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function s(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(t.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){const h=l[c];s(t.shapes,h)}else s(t.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(t.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(s(t.materials,this.material[l]));r.material=o}else r.material=s(t.materials,this.material);if(this.children.length>0){r.children=[];for(let o=0;o<this.children.length;o++)r.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){r.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];r.animations.push(s(t.animations,l))}}if(n){const o=a(t.geometries),l=a(t.materials),c=a(t.textures),u=a(t.images),h=a(t.shapes),d=a(t.skeletons),f=a(t.animations),g=a(t.nodes);o.length>0&&(i.geometries=o),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),u.length>0&&(i.images=u),h.length>0&&(i.shapes=h),d.length>0&&(i.skeletons=d),f.length>0&&(i.animations=f),g.length>0&&(i.nodes=g)}return i.object=r,i;function a(o){const l=[];for(const c in o){const u=o[c];delete u.metadata,l.push(u)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,n=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),n===!0)for(let i=0;i<t.children.length;i++){const r=t.children[i];this.add(r.clone())}return this}};Qt.DEFAULT_UP=new B(0,1,0),Qt.DEFAULT_MATRIX_AUTO_UPDATE=!0,Qt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Li=class extends Qt{constructor(){super(),this.isGroup=!0,this.type="Group"}},Nl={type:"move"},Er=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Li,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Li,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new B,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new B),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Li,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new B,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new B,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let i=null,r=null,s=null;const a=this._targetRay,o=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){s=!0;for(const g of e.hand.values()){const _=t.getJointPose(g,n),m=this._getHandJoint(l,g);_!==null&&(m.matrix.fromArray(_.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=_.radius),m.visible=_!==null}const c=l.joints["index-finger-tip"],u=l.joints["thumb-tip"],h=c.position.distanceTo(u.position),d=.02,f=.005;l.inputState.pinching&&h>d+f?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&h<=d-f&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else o!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,o.eventsEnabled&&o.dispatchEvent({type:"gripUpdated",data:e,target:this})));a!==null&&(i=t.getPose(e.targetRaySpace,n),i===null&&r!==null&&(i=r),i!==null&&(a.matrix.fromArray(i.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,i.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(i.linearVelocity)):a.hasLinearVelocity=!1,i.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(i.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Nl)))}return a!==null&&(a.visible=i!==null),o!==null&&(o.visible=r!==null),l!==null&&(l.visible=s!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new Li;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},Gs={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},an={h:0,s:0,l:0},Di={h:0,s:0,l:0};function Tr(e,t,n){return n<0&&(n+=1),n>1&&(n-=1),n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*6*(2/3-n):e}var je=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const i=e;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Nt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,He.colorSpaceToWorking(this,t),this}setRGB(e,t,n,i=He.workingColorSpace){return this.r=e,this.g=t,this.b=n,He.colorSpaceToWorking(this,i),this}setHSL(e,t,n,i=He.workingColorSpace){if(e=vr(e,1),t=ze(t,0,1),n=ze(n,0,1),t===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+t):n+t-n*t,s=2*n-r;this.r=Tr(s,r,e+1/3),this.g=Tr(s,r,e),this.b=Tr(s,r,e-1/3)}return He.colorSpaceToWorking(this,i),this}setStyle(e,t=Nt){function n(r){r!==void 0&&parseFloat(r)<1&&Ee("Color: Alpha component of "+e+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(e)){let r;const s=i[1],a=i[2];switch(s){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:Ee("Color: Unknown color model "+e)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(e)){const r=i[1],s=r.length;if(s===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(s===6)return this.setHex(parseInt(r,16),t);Ee("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Nt){const n=Gs[e.toLowerCase()];return n!==void 0?this.setHex(n,t):Ee("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Zt(e.r),this.g=Zt(e.g),this.b=Zt(e.b),this}copyLinearToSRGB(e){return this.r=Dn(e.r),this.g=Dn(e.g),this.b=Dn(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Nt){return He.workingToColorSpace(gt.copy(this),e),Math.round(ze(gt.r*255,0,255))*65536+Math.round(ze(gt.g*255,0,255))*256+Math.round(ze(gt.b*255,0,255))}getHexString(e=Nt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=He.workingColorSpace){He.workingToColorSpace(gt.copy(this),t);const n=gt.r,i=gt.g,r=gt.b,s=Math.max(n,i,r),a=Math.min(n,i,r);let o,l;const c=(a+s)/2;if(a===s)o=0,l=0;else{const u=s-a;switch(l=c<=.5?u/(s+a):u/(2-s-a),s){case n:o=(i-r)/u+(i<r?6:0);break;case i:o=(r-n)/u+2;break;case r:o=(n-i)/u+4;break}o/=6}return e.h=o,e.s=l,e.l=c,e}getRGB(e,t=He.workingColorSpace){return He.workingToColorSpace(gt.copy(this),t),e.r=gt.r,e.g=gt.g,e.b=gt.b,e}getStyle(e=Nt){He.workingToColorSpace(gt.copy(this),e);const t=gt.r,n=gt.g,i=gt.b;return e!=="srgb"?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(e,t,n){return this.getHSL(an),this.setHSL(an.h+e,an.s+t,an.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(an),e.getHSL(Di);const n=li(an.h,Di.h,t),i=li(an.s,Di.s,t),r=li(an.l,Di.l,t);return this.setHSL(n,i,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,i=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*i,this.g=r[1]*t+r[4]*n+r[7]*i,this.b=r[2]*t+r[5]*n+r[8]*i,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},gt=new je;je.NAMES=Gs;var Ul=class extends Qt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new ci,this.environmentIntensity=1,this.environmentRotation=new ci,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},Ft=new B,en=new B,Ar=new B,tn=new B,Bn=new B,kn=new B,Ws=new B,wr=new B,Cr=new B,Rr=new B,Pr=new ot,Ir=new ot,Lr=new ot,ui=class ti{constructor(t=new B,n=new B,i=new B){this.a=t,this.b=n,this.c=i}static getNormal(t,n,i,r){r.subVectors(i,n),Ft.subVectors(t,n),r.cross(Ft);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(t,n,i,r,s){Ft.subVectors(r,n),en.subVectors(i,n),Ar.subVectors(t,n);const a=Ft.dot(Ft),o=Ft.dot(en),l=Ft.dot(Ar),c=en.dot(en),u=en.dot(Ar),h=a*c-o*o;if(h===0)return s.set(0,0,0),null;const d=1/h,f=(c*l-o*u)*d,g=(a*u-o*l)*d;return s.set(1-f-g,g,f)}static containsPoint(t,n,i,r){return this.getBarycoord(t,n,i,r,tn)===null?!1:tn.x>=0&&tn.y>=0&&tn.x+tn.y<=1}static getInterpolation(t,n,i,r,s,a,o,l){return this.getBarycoord(t,n,i,r,tn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,tn.x),l.addScaledVector(a,tn.y),l.addScaledVector(o,tn.z),l)}static getInterpolatedAttribute(t,n,i,r,s,a){return Pr.setScalar(0),Ir.setScalar(0),Lr.setScalar(0),Pr.fromBufferAttribute(t,n),Ir.fromBufferAttribute(t,i),Lr.fromBufferAttribute(t,r),a.setScalar(0),a.addScaledVector(Pr,s.x),a.addScaledVector(Ir,s.y),a.addScaledVector(Lr,s.z),a}static isFrontFacing(t,n,i,r){return Ft.subVectors(i,n),en.subVectors(t,n),Ft.cross(en).dot(r)<0}set(t,n,i){return this.a.copy(t),this.b.copy(n),this.c.copy(i),this}setFromPointsAndIndices(t,n,i,r){return this.a.copy(t[n]),this.b.copy(t[i]),this.c.copy(t[r]),this}setFromAttributeAndIndices(t,n,i,r){return this.a.fromBufferAttribute(t,n),this.b.fromBufferAttribute(t,i),this.c.fromBufferAttribute(t,r),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Ft.subVectors(this.c,this.b),en.subVectors(this.a,this.b),Ft.cross(en).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return ti.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return ti.getBarycoord(t,this.a,this.b,this.c,n)}getInterpolation(t,n,i,r,s){return ti.getInterpolation(t,this.a,this.b,this.c,n,i,r,s)}containsPoint(t){return ti.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return ti.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,n){const i=this.a,r=this.b,s=this.c;let a,o;Bn.subVectors(r,i),kn.subVectors(s,i),wr.subVectors(t,i);const l=Bn.dot(wr),c=kn.dot(wr);if(l<=0&&c<=0)return n.copy(i);Cr.subVectors(t,r);const u=Bn.dot(Cr),h=kn.dot(Cr);if(u>=0&&h<=u)return n.copy(r);const d=l*h-u*c;if(d<=0&&l>=0&&u<=0)return a=l/(l-u),n.copy(i).addScaledVector(Bn,a);Rr.subVectors(t,s);const f=Bn.dot(Rr),g=kn.dot(Rr);if(g>=0&&f<=g)return n.copy(s);const _=f*c-l*g;if(_<=0&&c>=0&&g<=0)return o=c/(c-g),n.copy(i).addScaledVector(kn,o);const m=u*g-f*h;if(m<=0&&h-u>=0&&f-g>=0)return Ws.subVectors(s,r),o=(h-u)/(h-u+(f-g)),n.copy(r).addScaledVector(Ws,o);const p=1/(m+_+d);return a=_*p,o=d*p,n.copy(i).addScaledVector(Bn,a).addScaledVector(kn,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},hi=class{constructor(e=new B(1/0,1/0,1/0),t=new B(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Ot.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Ot.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=Ot.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let s=0,a=r.count;s<a;s++)e.isMesh===!0?e.getVertexPosition(s,Ot):Ot.fromBufferAttribute(r,s),Ot.applyMatrix4(e.matrixWorld),this.expandByPoint(Ot);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Ni.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Ni.copy(n.boundingBox)),Ni.applyMatrix4(e.matrixWorld),this.union(Ni)}const i=e.children;for(let r=0,s=i.length;r<s;r++)this.expandByObject(i[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Ot),Ot.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(fi),Ui.subVectors(this.max,fi),zn.subVectors(e.a,fi),Vn.subVectors(e.b,fi),Hn.subVectors(e.c,fi),on.subVectors(Vn,zn),ln.subVectors(Hn,Vn),bn.subVectors(zn,Hn);let t=[0,-on.z,on.y,0,-ln.z,ln.y,0,-bn.z,bn.y,on.z,0,-on.x,ln.z,0,-ln.x,bn.z,0,-bn.x,-on.y,on.x,0,-ln.y,ln.x,0,-bn.y,bn.x,0];return!Dr(t,zn,Vn,Hn,Ui)||(t=[1,0,0,0,1,0,0,0,1],!Dr(t,zn,Vn,Hn,Ui))?!1:(Fi.crossVectors(on,ln),t=[Fi.x,Fi.y,Fi.z],Dr(t,zn,Vn,Hn,Ui))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Ot).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Ot).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(nn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),nn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),nn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),nn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),nn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),nn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),nn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),nn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(nn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},nn=[new B,new B,new B,new B,new B,new B,new B,new B],Ot=new B,Ni=new hi,zn=new B,Vn=new B,Hn=new B,on=new B,ln=new B,bn=new B,fi=new B,Ui=new B,Fi=new B,Mn=new B;function Dr(e,t,n,i,r){for(let s=0,a=e.length-3;s<=a;s+=3){Mn.fromArray(e,s);const o=r.x*Math.abs(Mn.x)+r.y*Math.abs(Mn.y)+r.z*Math.abs(Mn.z),l=t.dot(Mn),c=n.dot(Mn),u=i.dot(Mn);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>o)return!1}return!0}var lt=new B,Oi=new Ze,Fl=0,Vt=class extends xn{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Fl++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=el,this.updateRanges=[],this.gpuType=Ei,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,r=this.itemSize;i<r;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Oi.fromBufferAttribute(this,t),Oi.applyMatrix3(e),this.setXY(t,Oi.x,Oi.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)lt.fromBufferAttribute(this,t),lt.applyMatrix3(e),this.setXYZ(t,lt.x,lt.y,lt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)lt.fromBufferAttribute(this,t),lt.applyMatrix4(e),this.setXYZ(t,lt.x,lt.y,lt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)lt.fromBufferAttribute(this,t),lt.applyNormalMatrix(e),this.setXYZ(t,lt.x,lt.y,lt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)lt.fromBufferAttribute(this,t),lt.transformDirection(e),this.setXYZ(t,lt.x,lt.y,lt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Ln(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=xt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Ln(t,this.array)),t}setX(e,t){return this.normalized&&(t=xt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Ln(t,this.array)),t}setY(e,t){return this.normalized&&(t=xt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Ln(t,this.array)),t}setZ(e,t){return this.normalized&&(t=xt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Ln(t,this.array)),t}setW(e,t){return this.normalized&&(t=xt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=xt(t,this.array),n=xt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){return e*=this.itemSize,this.normalized&&(t=xt(t,this.array),n=xt(n,this.array),i=xt(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,r){return e*=this.itemSize,this.normalized&&(t=xt(t,this.array),n=xt(n,this.array),i=xt(i,this.array),r=xt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==35044&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}},Xs=class extends Vt{constructor(e,t,n){super(new Uint16Array(e),t,n)}},$s=class extends Vt{constructor(e,t,n){super(new Uint32Array(e),t,n)}},Rt=class extends Vt{constructor(e,t,n){super(new Float32Array(e),t,n)}},Ol=new hi,pi=new B,Nr=new B,Ur=class{constructor(e=new B,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):Ol.setFromPoints(e).getCenter(n);let i=0;for(let r=0,s=e.length;r<s;r++)i=Math.max(i,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;pi.subVectors(e,this.center);const t=pi.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),i=(n-this.radius)*.5;this.center.addScaledVector(pi,i/n),this.radius+=i}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Nr.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(pi.copy(e.center).add(Nr)),this.expandByPoint(pi.copy(e.center).sub(Nr))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},Bl=0,Pt=new ft,Fr=new Qt,Gn=new B,At=new hi,mi=new hi,pt=new B,cn=class Ka extends xn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Bl++}),this.uuid=In(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(tl(t)?$s:Xs)(t,1):this.index=t,this}setIndirect(t,n=0){return this.indirect=t,this.indirectOffset=n,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,n){return this.attributes[t]=n,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,n,i=0){this.groups.push({start:t,count:n,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(t,n){this.drawRange.start=t,this.drawRange.count=n}applyMatrix4(t){const n=this.attributes.position;n!==void 0&&(n.applyMatrix4(t),n.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const s=new Ne().getNormalMatrix(t);i.applyNormalMatrix(s),i.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(t),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return Pt.makeRotationFromQuaternion(t),this.applyMatrix4(Pt),this}rotateX(t){return Pt.makeRotationX(t),this.applyMatrix4(Pt),this}rotateY(t){return Pt.makeRotationY(t),this.applyMatrix4(Pt),this}rotateZ(t){return Pt.makeRotationZ(t),this.applyMatrix4(Pt),this}translate(t,n,i){return Pt.makeTranslation(t,n,i),this.applyMatrix4(Pt),this}scale(t,n,i){return Pt.makeScale(t,n,i),this.applyMatrix4(Pt),this}lookAt(t){return Fr.lookAt(t),Fr.updateMatrix(),this.applyMatrix4(Fr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Gn).negate(),this.translate(Gn.x,Gn.y,Gn.z),this}setFromPoints(t){const n=this.getAttribute("position");if(n===void 0){const i=[];for(let r=0,s=t.length;r<s;r++){const a=t[r];i.push(a.x,a.y,a.z||0)}this.setAttribute("position",new Rt(i,3))}else{const i=Math.min(t.length,n.count);for(let r=0;r<i;r++){const s=t[r];n.setXYZ(r,s.x,s.y,s.z||0)}t.length>n.count&&Ee("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),n.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new hi);const t=this.attributes.position,n=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){we("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new B(-1/0,-1/0,-1/0),new B(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),n)for(let i=0,r=n.length;i<r;i++){const s=n[i];At.setFromBufferAttribute(s),this.morphTargetsRelative?(pt.addVectors(this.boundingBox.min,At.min),this.boundingBox.expandByPoint(pt),pt.addVectors(this.boundingBox.max,At.max),this.boundingBox.expandByPoint(pt)):(this.boundingBox.expandByPoint(At.min),this.boundingBox.expandByPoint(At.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&we('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ur);const t=this.attributes.position,n=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){we("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new B,1/0);return}if(t){const i=this.boundingSphere.center;if(At.setFromBufferAttribute(t),n)for(let s=0,a=n.length;s<a;s++){const o=n[s];mi.setFromBufferAttribute(o),this.morphTargetsRelative?(pt.addVectors(At.min,mi.min),At.expandByPoint(pt),pt.addVectors(At.max,mi.max),At.expandByPoint(pt)):(At.expandByPoint(mi.min),At.expandByPoint(mi.max))}At.getCenter(i);let r=0;for(let s=0,a=t.count;s<a;s++)pt.fromBufferAttribute(t,s),r=Math.max(r,i.distanceToSquared(pt));if(n)for(let s=0,a=n.length;s<a;s++){const o=n[s],l=this.morphTargetsRelative;for(let c=0,u=o.count;c<u;c++)pt.fromBufferAttribute(o,c),l&&(Gn.fromBufferAttribute(t,c),pt.add(Gn)),r=Math.max(r,i.distanceToSquared(pt))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&we('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,n=this.attributes;if(t===null||n.position===void 0||n.normal===void 0||n.uv===void 0){we("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=n.position,r=n.normal,s=n.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Vt(new Float32Array(4*i.count),4));const a=this.getAttribute("tangent"),o=[],l=[];for(let v=0;v<i.count;v++)o[v]=new B,l[v]=new B;const c=new B,u=new B,h=new B,d=new Ze,f=new Ze,g=new Ze,_=new B,m=new B;function p(v,E,W){c.fromBufferAttribute(i,v),u.fromBufferAttribute(i,E),h.fromBufferAttribute(i,W),d.fromBufferAttribute(s,v),f.fromBufferAttribute(s,E),g.fromBufferAttribute(s,W),u.sub(c),h.sub(c),f.sub(d),g.sub(d);const R=1/(f.x*g.y-g.x*f.y);isFinite(R)&&(_.copy(u).multiplyScalar(g.y).addScaledVector(h,-f.y).multiplyScalar(R),m.copy(h).multiplyScalar(f.x).addScaledVector(u,-g.x).multiplyScalar(R),o[v].add(_),o[E].add(_),o[W].add(_),l[v].add(m),l[E].add(m),l[W].add(m))}let S=this.groups;S.length===0&&(S=[{start:0,count:t.count}]);for(let v=0,E=S.length;v<E;++v){const W=S[v],R=W.start,H=W.count;for(let X=R,z=R+H;X<z;X+=3)p(t.getX(X+0),t.getX(X+1),t.getX(X+2))}const b=new B,x=new B,C=new B,A=new B;function T(v){C.fromBufferAttribute(r,v),A.copy(C);const E=o[v];b.copy(E),b.sub(C.multiplyScalar(C.dot(E))).normalize(),x.crossVectors(A,E);const W=x.dot(l[v])<0?-1:1;a.setXYZW(v,b.x,b.y,b.z,W)}for(let v=0,E=S.length;v<E;++v){const W=S[v],R=W.start,H=W.count;for(let X=R,z=R+H;X<z;X+=3)T(t.getX(X+0)),T(t.getX(X+1)),T(t.getX(X+2))}}computeVertexNormals(){const t=this.index,n=this.getAttribute("position");if(n!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new Vt(new Float32Array(n.count*3),3),this.setAttribute("normal",i);else for(let d=0,f=i.count;d<f;d++)i.setXYZ(d,0,0,0);const r=new B,s=new B,a=new B,o=new B,l=new B,c=new B,u=new B,h=new B;if(t)for(let d=0,f=t.count;d<f;d+=3){const g=t.getX(d+0),_=t.getX(d+1),m=t.getX(d+2);r.fromBufferAttribute(n,g),s.fromBufferAttribute(n,_),a.fromBufferAttribute(n,m),u.subVectors(a,s),h.subVectors(r,s),u.cross(h),o.fromBufferAttribute(i,g),l.fromBufferAttribute(i,_),c.fromBufferAttribute(i,m),o.add(u),l.add(u),c.add(u),i.setXYZ(g,o.x,o.y,o.z),i.setXYZ(_,l.x,l.y,l.z),i.setXYZ(m,c.x,c.y,c.z)}else for(let d=0,f=n.count;d<f;d+=3)r.fromBufferAttribute(n,d+0),s.fromBufferAttribute(n,d+1),a.fromBufferAttribute(n,d+2),u.subVectors(a,s),h.subVectors(r,s),u.cross(h),i.setXYZ(d+0,u.x,u.y,u.z),i.setXYZ(d+1,u.x,u.y,u.z),i.setXYZ(d+2,u.x,u.y,u.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let n=0,i=t.count;n<i;n++)pt.fromBufferAttribute(t,n),pt.normalize(),t.setXYZ(n,pt.x,pt.y,pt.z)}toNonIndexed(){function t(o,l){const c=o.array,u=o.itemSize,h=o.normalized,d=new c.constructor(l.length*u);let f=0,g=0;for(let _=0,m=l.length;_<m;_++){o.isInterleavedBufferAttribute?f=l[_]*o.data.stride+o.offset:f=l[_]*u;for(let p=0;p<u;p++)d[g++]=c[f++]}return new Vt(d,u,h)}if(this.index===null)return Ee("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const n=new Ka,i=this.index.array,r=this.attributes;for(const o in r){const l=r[o],c=t(l,i);n.setAttribute(o,c)}const s=this.morphAttributes;for(const o in s){const l=[],c=s[o];for(let u=0,h=c.length;u<h;u++){const d=c[u],f=t(d,i);l.push(f)}n.morphAttributes[o]=l}n.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,l=a.length;o<l;o++){const c=a[o];n.addGroup(c.start,c.count,c.materialIndex)}return n}toJSON(){const t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};const n=this.index;n!==null&&(t.data.index={type:n.array.constructor.name,array:Array.prototype.slice.call(n.array)});const i=this.attributes;for(const l in i){const c=i[l];t.data.attributes[l]=c.toJSON(t.data)}const r={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],u=[];for(let h=0,d=c.length;h<d;h++){const f=c[h];u.push(f.toJSON(t.data))}u.length>0&&(r[l]=u,s=!0)}s&&(t.data.morphAttributes=r,t.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(t.data.boundingSphere=o.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const n={};this.name=t.name;const i=t.index;i!==null&&this.setIndex(i.clone());const r=t.attributes;for(const c in r){const u=r[c];this.setAttribute(c,u.clone(n))}const s=t.morphAttributes;for(const c in s){const u=[],h=s[c];for(let d=0,f=h.length;d<f;d++)u.push(h[d].clone(n));this.morphAttributes[c]=u}this.morphTargetsRelative=t.morphTargetsRelative;const a=t.groups;for(let c=0,u=a.length;c<u;c++){const h=a[c];this.addGroup(h.start,h.count,h.materialIndex)}const o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},kl=0,Bi=class extends xn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:kl++}),this.uuid=In(),this.name="",this.type="Material",this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new je(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=mr,this.stencilZFail=mr,this.stencilZPass=mr,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){Ee(`Material: parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){Ee(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==1&&(n.blending=this.blending),this.side!==0&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==204&&(n.blendSrc=this.blendSrc),this.blendDst!==205&&(n.blendDst=this.blendDst),this.blendEquation!==100&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==3&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==519&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==7680&&(n.stencilFail=this.stencilFail),this.stencilZFail!==7680&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==7680&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(r){const s=[];for(const a in r){const o=r[a];delete o.metadata,s.push(o)}return s}if(t){const r=i(e.textures),s=i(e.images);r.length>0&&(n.textures=r),s.length>0&&(n.images=s)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const i=t.length;n=new Array(i);for(let r=0;r!==i;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}},rn=new B,Or=new B,ki=new B,dn=new B,Br=new B,zi=new B,kr=new B,zl=class{constructor(e=new B,t=new B(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,rn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=rn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(rn.copy(this.origin).addScaledVector(this.direction,t),rn.distanceToSquared(e))}distanceSqToSegment(e,t,n,i){Or.copy(e).add(t).multiplyScalar(.5),ki.copy(t).sub(e).normalize(),dn.copy(this.origin).sub(Or);const r=e.distanceTo(t)*.5,s=-this.direction.dot(ki),a=dn.dot(this.direction),o=-dn.dot(ki),l=dn.lengthSq(),c=Math.abs(1-s*s);let u,h,d,f;if(c>0)if(u=s*o-a,h=s*a-o,f=r*c,u>=0)if(h>=-f)if(h<=f){const g=1/c;u*=g,h*=g,d=u*(u+s*h+2*a)+h*(s*u+h+2*o)+l}else h=r,u=Math.max(0,-(s*h+a)),d=-u*u+h*(h+2*o)+l;else h=-r,u=Math.max(0,-(s*h+a)),d=-u*u+h*(h+2*o)+l;else h<=-f?(u=Math.max(0,-(-s*r+a)),h=u>0?-r:Math.min(Math.max(-r,-o),r),d=-u*u+h*(h+2*o)+l):h<=f?(u=0,h=Math.min(Math.max(-r,-o),r),d=h*(h+2*o)+l):(u=Math.max(0,-(s*r+a)),h=u>0?r:Math.min(Math.max(-r,-o),r),d=-u*u+h*(h+2*o)+l);else h=s>0?-r:r,u=Math.max(0,-(s*h+a)),d=-u*u+h*(h+2*o)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,u),i&&i.copy(Or).addScaledVector(ki,h),d}intersectSphere(e,t){rn.subVectors(e.center,this.origin);const n=rn.dot(this.direction),i=rn.dot(rn)-n*n,r=e.radius*e.radius;if(i>r)return null;const s=Math.sqrt(r-i),a=n-s,o=n+s;return o<0?null:a<0?this.at(o,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,i,r,s,a,o;const l=1/this.direction.x,c=1/this.direction.y,u=1/this.direction.z,h=this.origin;return l>=0?(n=(e.min.x-h.x)*l,i=(e.max.x-h.x)*l):(n=(e.max.x-h.x)*l,i=(e.min.x-h.x)*l),c>=0?(r=(e.min.y-h.y)*c,s=(e.max.y-h.y)*c):(r=(e.max.y-h.y)*c,s=(e.min.y-h.y)*c),n>s||r>i||((r>n||isNaN(n))&&(n=r),(s<i||isNaN(i))&&(i=s),u>=0?(a=(e.min.z-h.z)*u,o=(e.max.z-h.z)*u):(a=(e.max.z-h.z)*u,o=(e.min.z-h.z)*u),n>o||a>i)||((a>n||n!==n)&&(n=a),(o<i||i!==i)&&(i=o),i<0)?null:this.at(n>=0?n:i,t)}intersectsBox(e){return this.intersectBox(e,rn)!==null}intersectTriangle(e,t,n,i,r){Br.subVectors(t,e),zi.subVectors(n,e),kr.crossVectors(Br,zi);let s=this.direction.dot(kr),a;if(s>0){if(i)return null;a=1}else if(s<0)a=-1,s=-s;else return null;dn.subVectors(this.origin,e);const o=a*this.direction.dot(zi.crossVectors(dn,zi));if(o<0)return null;const l=a*this.direction.dot(Br.cross(dn));if(l<0||o+l>s)return null;const c=-a*dn.dot(kr);return c<0?null:this.at(c/s,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},zr=class extends Bi{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new je(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new ci,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},qs=new ft,En=new zl,Vi=new Ur,Ys=new B,Hi=new B,Gi=new B,Wi=new B,Vr=new B,Xi=new B,js=new B,$i=new B,Ht=class extends Qt{constructor(e=new cn,t=new zr){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){const n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let i=0,r=n.length;i<r;i++){const s=n[i].name||String(i);this.morphTargetInfluences.push(0),this.morphTargetDictionary[s]=i}}}}getVertexPosition(e,t){const n=this.geometry,i=n.attributes.position,r=n.morphAttributes.position,s=n.morphTargetsRelative;t.fromBufferAttribute(i,e);const a=this.morphTargetInfluences;if(r&&a){Xi.set(0,0,0);for(let o=0,l=r.length;o<l;o++){const c=a[o],u=r[o];c!==0&&(Vr.fromBufferAttribute(u,e),s?Xi.addScaledVector(Vr,c):Xi.addScaledVector(Vr.sub(t),c))}t.add(Xi)}return t}raycast(e,t){const n=this.geometry,i=this.material,r=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Vi.copy(n.boundingSphere),Vi.applyMatrix4(r),En.copy(e.ray).recast(e.near),!(Vi.containsPoint(En.origin)===!1&&(En.intersectSphere(Vi,Ys)===null||En.origin.distanceToSquared(Ys)>(e.far-e.near)**2))&&(qs.copy(r).invert(),En.copy(e.ray).applyMatrix4(qs),!(n.boundingBox!==null&&En.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,En)))}_computeIntersections(e,t,n){let i;const r=this.geometry,s=this.material,a=r.index,o=r.attributes.position,l=r.attributes.uv,c=r.attributes.uv1,u=r.attributes.normal,h=r.groups,d=r.drawRange;if(a!==null)if(Array.isArray(s))for(let f=0,g=h.length;f<g;f++){const _=h[f],m=s[_.materialIndex],p=Math.max(_.start,d.start),S=Math.min(a.count,Math.min(_.start+_.count,d.start+d.count));for(let b=p,x=S;b<x;b+=3){const C=a.getX(b),A=a.getX(b+1),T=a.getX(b+2);i=qi(this,m,e,n,l,c,u,C,A,T),i&&(i.faceIndex=Math.floor(b/3),i.face.materialIndex=_.materialIndex,t.push(i))}}else{const f=Math.max(0,d.start),g=Math.min(a.count,d.start+d.count);for(let _=f,m=g;_<m;_+=3){const p=a.getX(_),S=a.getX(_+1),b=a.getX(_+2);i=qi(this,s,e,n,l,c,u,p,S,b),i&&(i.faceIndex=Math.floor(_/3),t.push(i))}}else if(o!==void 0)if(Array.isArray(s))for(let f=0,g=h.length;f<g;f++){const _=h[f],m=s[_.materialIndex],p=Math.max(_.start,d.start),S=Math.min(o.count,Math.min(_.start+_.count,d.start+d.count));for(let b=p,x=S;b<x;b+=3){const C=b,A=b+1,T=b+2;i=qi(this,m,e,n,l,c,u,C,A,T),i&&(i.faceIndex=Math.floor(b/3),i.face.materialIndex=_.materialIndex,t.push(i))}}else{const f=Math.max(0,d.start),g=Math.min(o.count,d.start+d.count);for(let _=f,m=g;_<m;_+=3){const p=_,S=_+1,b=_+2;i=qi(this,s,e,n,l,c,u,p,S,b),i&&(i.faceIndex=Math.floor(_/3),t.push(i))}}}};function Vl(e,t,n,i,r,s,a,o){let l;if(t.side===1?l=i.intersectTriangle(a,s,r,!0,o):l=i.intersectTriangle(r,s,a,t.side===0,o),l===null)return null;$i.copy(o),$i.applyMatrix4(e.matrixWorld);const c=n.ray.origin.distanceTo($i);return c<n.near||c>n.far?null:{distance:c,point:$i.clone(),object:e}}function qi(e,t,n,i,r,s,a,o,l,c){e.getVertexPosition(o,Hi),e.getVertexPosition(l,Gi),e.getVertexPosition(c,Wi);const u=Vl(e,t,n,i,Hi,Gi,Wi,js);if(u){const h=new B;ui.getBarycoord(js,Hi,Gi,Wi,h),r&&(u.uv=ui.getInterpolatedAttribute(r,o,l,c,h,new Ze)),s&&(u.uv1=ui.getInterpolatedAttribute(s,o,l,c,h,new Ze)),a&&(u.normal=ui.getInterpolatedAttribute(a,o,l,c,h,new B),u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1));const d={a:o,b:l,c,normal:new B,materialIndex:0};ui.getNormal(Hi,Gi,Wi,d.normal),u.face=d,u.barycoord=h}return u}var Hl=class extends Ct{constructor(e=null,t=1,n=1,i,r,s,a,o,l=yt,c=yt,u,h){super(null,s,a,o,l,c,i,r,u,h),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},Hr=new B,Gl=new B,Wl=new Ne,Tn=class{constructor(e=new B(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const i=Hr.subVectors(n,t).cross(Gl.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){const i=e.delta(Hr),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/r;return n===!0&&(s<0||s>1)?null:t.copy(e.start).addScaledVector(i,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||Wl.getNormalMatrix(e),i=this.coplanarPoint(Hr).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},An=new Ur,Xl=new Ze(.5,.5),Yi=new B,Ks=class{constructor(e=new Tn,t=new Tn,n=new Tn,i=new Tn,r=new Tn,s=new Tn){this.planes=[e,t,n,i,r,s]}set(e,t,n,i,r,s){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(i),a[4].copy(r),a[5].copy(s),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Rn,n=!1){const i=this.planes,r=e.elements,s=r[0],a=r[1],o=r[2],l=r[3],c=r[4],u=r[5],h=r[6],d=r[7],f=r[8],g=r[9],_=r[10],m=r[11],p=r[12],S=r[13],b=r[14],x=r[15];if(i[0].setComponents(l-s,d-c,m-f,x-p).normalize(),i[1].setComponents(l+s,d+c,m+f,x+p).normalize(),i[2].setComponents(l+a,d+u,m+g,x+S).normalize(),i[3].setComponents(l-a,d-u,m-g,x-S).normalize(),n)i[4].setComponents(o,h,_,b).normalize(),i[5].setComponents(l-o,d-h,m-_,x-b).normalize();else if(i[4].setComponents(l-o,d-h,m-_,x-b).normalize(),t===2e3)i[5].setComponents(l+o,d+h,m+_,x+b).normalize();else if(t===2001)i[5].setComponents(o,h,_,b).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),An.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),An.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(An)}intersectsSprite(e){return An.center.set(0,0,0),An.radius=.7071067811865476+Xl.distanceTo(e.center),An.applyMatrix4(e.matrixWorld),this.intersectsSphere(An)}intersectsSphere(e){const t=this.planes,n=e.center,i=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<i)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const i=t[n];if(Yi.x=i.normal.x>0?e.max.x:e.min.x,Yi.y=i.normal.y>0?e.max.y:e.min.y,Yi.z=i.normal.z>0?e.max.z:e.min.z,i.distanceToPoint(Yi)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},Zs=class extends Ct{constructor(e=[],t=301,n,i,r,s,a,o,l,c){super(e,t,n,i,r,s,a,o,l,c),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Wn=class extends Ct{constructor(e,t,n=_n,i,r,s,a=yt,o=yt,l,c=ri,u=1){if(c!==1026&&c!==1027)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");super({width:e,height:t,depth:u},i,r,s,a,o,c,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new xr(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},$l=class extends Wn{constructor(e,t=_n,n=301,i,r,s=yt,a=yt,o,l=ri){const c={width:e,height:e,depth:1},u=[c,c,c,c,c,c];super(e,e,t,n,i,r,s,a,o,l),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},Js=class extends Ct{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},Gr=class Za extends cn{constructor(t=1,n=1,i=1,r=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:n,depth:i,widthSegments:r,heightSegments:s,depthSegments:a};const o=this;r=Math.floor(r),s=Math.floor(s),a=Math.floor(a);const l=[],c=[],u=[],h=[];let d=0,f=0;g("z","y","x",-1,-1,i,n,t,a,s,0),g("z","y","x",1,-1,i,n,-t,a,s,1),g("x","z","y",1,1,t,i,n,r,a,2),g("x","z","y",1,-1,t,i,-n,r,a,3),g("x","y","z",1,-1,t,n,i,r,s,4),g("x","y","z",-1,-1,t,n,-i,r,s,5),this.setIndex(l),this.setAttribute("position",new Rt(c,3)),this.setAttribute("normal",new Rt(u,3)),this.setAttribute("uv",new Rt(h,2));function g(_,m,p,S,b,x,C,A,T,v,E){const W=x/T,R=C/v,H=x/2,X=C/2,z=A/2,k=T+1,G=v+1;let I=0,Y=0;const J=new B;for(let te=0;te<G;te++){const fe=te*R-X;for(let me=0;me<k;me++)J[_]=(me*W-H)*S,J[m]=fe*b,J[p]=z,c.push(J.x,J.y,J.z),J[_]=0,J[m]=0,J[p]=A>0?1:-1,u.push(J.x,J.y,J.z),h.push(me/T),h.push(1-te/v),I+=1}for(let te=0;te<v;te++)for(let fe=0;fe<T;fe++){const me=d+fe+k*te,Le=d+fe+k*(te+1),Fe=d+(fe+1)+k*(te+1),$=d+(fe+1)+k*te;l.push(me,Le,$),l.push(Le,Fe,$),Y+=6}o.addGroup(f,Y,E),f+=Y,d+=I}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Za(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}},Qs=class Ja extends cn{constructor(t=1,n=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:n,widthSegments:i,heightSegments:r};const s=t/2,a=n/2,o=Math.floor(i),l=Math.floor(r),c=o+1,u=l+1,h=t/o,d=n/l,f=[],g=[],_=[],m=[];for(let p=0;p<u;p++){const S=p*d-a;for(let b=0;b<c;b++){const x=b*h-s;g.push(x,-S,0),_.push(0,0,1),m.push(b/o),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let S=0;S<o;S++){const b=S+c*p,x=S+c*(p+1),C=S+1+c*(p+1),A=S+1+c*p;f.push(b,x,A),f.push(x,C,A)}this.setIndex(f),this.setAttribute("position",new Rt(g,3)),this.setAttribute("normal",new Rt(_,3)),this.setAttribute("uv",new Rt(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ja(t.width,t.height,t.widthSegments,t.heightSegments)}},ql=class Qa extends cn{constructor(t=1,n=32,i=16,r=0,s=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:n,heightSegments:i,phiStart:r,phiLength:s,thetaStart:a,thetaLength:o},n=Math.max(3,Math.floor(n)),i=Math.max(2,Math.floor(i));const l=Math.min(a+o,Math.PI);let c=0;const u=[],h=new B,d=new B,f=[],g=[],_=[],m=[];for(let p=0;p<=i;p++){const S=[],b=p/i;let x=0;p===0&&a===0?x=.5/n:p===i&&l===Math.PI&&(x=-.5/n);for(let C=0;C<=n;C++){const A=C/n;h.x=-t*Math.cos(r+A*s)*Math.sin(a+b*o),h.y=t*Math.cos(a+b*o),h.z=t*Math.sin(r+A*s)*Math.sin(a+b*o),g.push(h.x,h.y,h.z),d.copy(h).normalize(),_.push(d.x,d.y,d.z),m.push(A+x,1-b),S.push(c++)}u.push(S)}for(let p=0;p<i;p++)for(let S=0;S<n;S++){const b=u[p][S+1],x=u[p][S],C=u[p+1][S],A=u[p+1][S+1];(p!==0||a>0)&&f.push(b,x,A),(p!==i-1||l<Math.PI)&&f.push(x,C,A)}this.setIndex(f),this.setAttribute("position",new Rt(g,3)),this.setAttribute("normal",new Rt(_,3)),this.setAttribute("uv",new Rt(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Qa(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};function Xn(e){const t={};for(const n in e){t[n]={};for(const i in e[n]){const r=e[n][i];if(ea(r))r.isRenderTargetTexture?(Ee("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[n][i]=null):t[n][i]=r.clone();else if(Array.isArray(r))if(ea(r[0])){const s=[];for(let a=0,o=r.length;a<o;a++)s[a]=r[a].clone();t[n][i]=s}else t[n][i]=r.slice();else t[n][i]=r}}return t}function St(e){const t={};for(let n=0;n<e.length;n++){const i=Xn(e[n]);for(const r in i)t[r]=i[r]}return t}function ea(e){return e&&(e.isColor||e.isMatrix3||e.isMatrix4||e.isVector2||e.isVector3||e.isVector4||e.isTexture||e.isQuaternion)}function Yl(e){const t=[];for(let n=0;n<e.length;n++)t.push(e[n].clone());return t}function ta(e){const t=e.getRenderTarget();return t===null?e.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:He.workingColorSpace}var jl={clone:Xn,merge:St},Kl=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Zl=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Gt=class extends Bi{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Kl,this.fragmentShader=Zl,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Xn(e.uniforms),this.uniformsGroups=Yl(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const i in this.uniforms){const r=this.uniforms[i].value;r&&r.isTexture?t.uniforms[i]={type:"t",value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[i]={type:"c",value:r.getHex()}:r&&r.isVector2?t.uniforms[i]={type:"v2",value:r.toArray()}:r&&r.isVector3?t.uniforms[i]={type:"v3",value:r.toArray()}:r&&r.isVector4?t.uniforms[i]={type:"v4",value:r.toArray()}:r&&r.isMatrix3?t.uniforms[i]={type:"m3",value:r.toArray()}:r&&r.isMatrix4?t.uniforms[i]={type:"m4",value:r.toArray()}:t.uniforms[i]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}},Jl=class extends Gt{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},Ql=class extends Bi{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Qo,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},ec=class extends Bi{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function ji(e,t){return!e||e.constructor===t?e:typeof t.BYTES_PER_ELEMENT=="number"?new t(e):Array.prototype.slice.call(e)}var gi=class{constructor(e,t,n,i){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=i!==void 0?i:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){const t=this.parameterPositions;let n=this._cachedIndex,i=t[n],r=t[n-1];n:{e:{let s;t:{i:if(!(e<i)){for(let a=n+2;;){if(i===void 0){if(e<r)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=i,i=t[++n],e<i)break e}s=t.length;break t}if(!(e>=r)){const a=t[1];e<a&&(n=2,r=a);for(let o=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===o)break;if(i=r,r=t[--n-1],e>=r)break e}s=n,n=0;break t}break n}for(;n<s;){const a=n+s>>>1;e<t[a]?s=a:n=a+1}if(i=t[n],r=t[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,i)}return this.interpolate_(n,r,e,i)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,r=e*i;for(let s=0;s!==i;++s)t[s]=n[r+s];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},tc=class extends gi{constructor(e,t,n,i){super(e,t,n,i),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Es,endingEnd:Es}}intervalChanged_(e,t,n){const i=this.parameterPositions;let r=e-2,s=e+1,a=i[r],o=i[s];if(a===void 0)switch(this.getSettings_().endingStart){case Ts:r=e,a=2*t-n;break;case As:r=i.length-2,a=t+i[r]-i[r+1];break;default:r=e,a=n}if(o===void 0)switch(this.getSettings_().endingEnd){case Ts:s=e,o=2*n-t;break;case As:s=1,o=n+i[1]-i[0];break;default:s=e-1,o=t}const l=(n-t)*.5,c=this.valueSize;this._weightPrev=l/(t-a),this._weightNext=l/(o-n),this._offsetPrev=r*c,this._offsetNext=s*c}interpolate_(e,t,n,i){const r=this.resultBuffer,s=this.sampleValues,a=this.valueSize,o=e*a,l=o-a,c=this._offsetPrev,u=this._offsetNext,h=this._weightPrev,d=this._weightNext,f=(n-t)/(i-t),g=f*f,_=g*f,m=-h*_+2*h*g-h*f,p=(1+h)*_+(-1.5-2*h)*g+(-.5+h)*f+1,S=(-1-d)*_+(1.5+d)*g+.5*f,b=d*_-d*g;for(let x=0;x!==a;++x)r[x]=m*s[c+x]+p*s[l+x]+S*s[o+x]+b*s[u+x];return r}},nc=class extends gi{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){const r=this.resultBuffer,s=this.sampleValues,a=this.valueSize,o=e*a,l=o-a,c=(n-t)/(i-t),u=1-c;for(let h=0;h!==a;++h)r[h]=s[l+h]*u+s[o+h]*c;return r}},ic=class extends gi{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e){return this.copySampleValue_(e-1)}},rc=class extends gi{interpolate_(e,t,n,i){const r=this.resultBuffer,s=this.sampleValues,a=this.valueSize,o=e*a,l=o-a,c=this.settings||this.DefaultSettings_,u=c.inTangents,h=c.outTangents;if(!u||!h){const g=(n-t)/(i-t),_=1-g;for(let m=0;m!==a;++m)r[m]=s[l+m]*_+s[o+m]*g;return r}const d=a*2,f=e-1;for(let g=0;g!==a;++g){const _=s[l+g],m=s[o+g],p=f*d+g*2,S=h[p],b=h[p+1],x=e*d+g*2,C=u[x],A=u[x+1];let T=(n-t)/(i-t),v,E,W,R,H;for(let X=0;X<8;X++){v=T*T,E=v*T,W=1-T,R=W*W,H=R*W;const z=H*t+3*R*T*S+3*W*v*C+E*i-n;if(Math.abs(z)<1e-10)break;const k=3*R*(S-t)+6*W*T*(C-S)+3*v*(i-C);if(Math.abs(k)<1e-10)break;T=T-z/k,T=Math.max(0,Math.min(1,T))}r[g]=H*_+3*R*T*b+3*W*v*A+E*m}return r}},Wt=class{constructor(e,t,n,i){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=ji(t,this.TimeBufferType),this.values=ji(n,this.ValueBufferType),this.setInterpolation(i||this.DefaultInterpolation)}static toJSON(e){const t=e.constructor;let n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:ji(e.times,Array),values:ji(e.values,Array)};const i=e.getInterpolation();i!==e.DefaultInterpolation&&(n.interpolation=i)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new ic(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new nc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new tc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){const t=new rc(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.settings=this.settings),t}setInterpolation(e){let t;switch(e){case Ai:t=this.InterpolantFactoryMethodDiscrete;break;case hr:t=this.InterpolantFactoryMethodLinear;break;case fr:t=this.InterpolantFactoryMethodSmooth;break;case Ms:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){const n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return Ee("KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Ai;case this.InterpolantFactoryMethodLinear:return hr;case this.InterpolantFactoryMethodSmooth:return fr;case this.InterpolantFactoryMethodBezier:return Ms}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){const t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]+=e}return this}scale(e){if(e!==1){const t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]*=e}return this}trim(e,t){const n=this.times,i=n.length;let r=0,s=i-1;for(;r!==i&&n[r]<e;)++r;for(;s!==-1&&n[s]>t;)--s;if(++s,r!==0||s!==i){r>=s&&(s=Math.max(s,1),r=s-1);const a=this.getValueSize();this.times=n.slice(r,s),this.values=this.values.slice(r*a,s*a)}return this}validate(){let e=!0;const t=this.getValueSize();t-Math.floor(t)!==0&&(we("KeyframeTrack: Invalid value size in track.",this),e=!1);const n=this.times,i=this.values,r=n.length;r===0&&(we("KeyframeTrack: Track is empty.",this),e=!1);let s=null;for(let a=0;a!==r;a++){const o=n[a];if(typeof o=="number"&&isNaN(o)){we("KeyframeTrack: Time is not a valid number.",this,a,o),e=!1;break}if(s!==null&&s>o){we("KeyframeTrack: Out of order keys.",this,a,o,s),e=!1;break}s=o}if(i!==void 0&&nl(i))for(let a=0,o=i.length;a!==o;++a){const l=i[a];if(isNaN(l)){we("KeyframeTrack: Value is not a valid number.",this,a,l),e=!1;break}}return e}optimize(){const e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),i=this.getInterpolation()===fr,r=e.length-1;let s=1;for(let a=1;a<r;++a){let o=!1;const l=e[a];if(l!==e[a+1]&&(a!==1||l!==e[0]))if(i)o=!0;else{const c=a*n,u=c-n,h=c+n;for(let d=0;d!==n;++d){const f=t[c+d];if(f!==t[u+d]||f!==t[h+d]){o=!0;break}}}if(o){if(a!==s){e[s]=e[a];const c=a*n,u=s*n;for(let h=0;h!==n;++h)t[u+h]=t[c+h]}++s}}if(r>0){e[s]=e[r];for(let a=r*n,o=s*n,l=0;l!==n;++l)t[o+l]=t[a+l];++s}return s!==e.length?(this.times=e.slice(0,s),this.values=t.slice(0,s*n)):(this.times=e,this.values=t),this}clone(){const e=this.times.slice(),t=this.values.slice(),n=this.constructor,i=new n(this.name,e,t);return i.createInterpolant=this.createInterpolant,i}};Wt.prototype.ValueTypeName="",Wt.prototype.TimeBufferType=Float32Array,Wt.prototype.ValueBufferType=Float32Array,Wt.prototype.DefaultInterpolation=hr;var vi=class extends Wt{constructor(e,t,n){super(e,t,n)}};vi.prototype.ValueTypeName="bool",vi.prototype.ValueBufferType=Array,vi.prototype.DefaultInterpolation=Ai,vi.prototype.InterpolantFactoryMethodLinear=void 0,vi.prototype.InterpolantFactoryMethodSmooth=void 0;var sc=class extends Wt{constructor(e,t,n,i){super(e,t,n,i)}};sc.prototype.ValueTypeName="color";var ac=class extends Wt{constructor(e,t,n,i){super(e,t,n,i)}};ac.prototype.ValueTypeName="number";var oc=class extends gi{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){const r=this.resultBuffer,s=this.sampleValues,a=this.valueSize,o=(n-t)/(i-t);let l=e*a;for(let c=l+a;l!==c;l+=4)Sn.slerpFlat(r,0,s,l-a,s,l,o);return r}},na=class extends Wt{constructor(e,t,n,i){super(e,t,n,i)}InterpolantFactoryMethodLinear(e){return new oc(this.times,this.values,this.getValueSize(),e)}};na.prototype.ValueTypeName="quaternion",na.prototype.InterpolantFactoryMethodSmooth=void 0;var _i=class extends Wt{constructor(e,t,n){super(e,t,n)}};_i.prototype.ValueTypeName="string",_i.prototype.ValueBufferType=Array,_i.prototype.DefaultInterpolation=Ai,_i.prototype.InterpolantFactoryMethodLinear=void 0,_i.prototype.InterpolantFactoryMethodSmooth=void 0;var lc=class extends Wt{constructor(e,t,n,i){super(e,t,n,i)}};lc.prototype.ValueTypeName="vector";var Wr={enabled:!1,files:{},add:function(e,t){this.enabled!==!1&&(ia(e)||(this.files[e]=t))},get:function(e){if(this.enabled!==!1&&!ia(e))return this.files[e]},remove:function(e){delete this.files[e]},clear:function(){this.files={}}};function ia(e){try{const t=e.slice(e.indexOf(":")+1);return new URL(t).protocol==="blob:"}catch{return!1}}var cc=class{constructor(e,t,n){const i=this;let r=!1,s=0,a=0,o;const l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(c){a++,r===!1&&i.onStart!==void 0&&i.onStart(c,s,a),r=!0},this.itemEnd=function(c){s++,i.onProgress!==void 0&&i.onProgress(c,s,a),s===a&&(r=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(c){i.onError!==void 0&&i.onError(c)},this.resolveURL=function(c){return o?o(c):c},this.setURLModifier=function(c){return o=c,this},this.addHandler=function(c,u){return l.push(c,u),this},this.removeHandler=function(c){const u=l.indexOf(c);return u!==-1&&l.splice(u,2),this},this.getHandler=function(c){for(let u=0,h=l.length;u<h;u+=2){const d=l[u],f=l[u+1];if(d.global&&(d.lastIndex=0),d.test(c))return f}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},dc=new cc,Xr=class{constructor(e){this.manager=e!==void 0?e:dc,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const n=this;return new Promise(function(i,r){n.load(e,i,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};Xr.DEFAULT_MATERIAL_NAME="__DEFAULT";var $n=new WeakMap,uc=class extends Xr{constructor(e){super(e)}load(e,t,n,i){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=this,s=Wr.get(`image:${e}`);if(s!==void 0){if(s.complete===!0)r.manager.itemStart(e),setTimeout(function(){t&&t(s),r.manager.itemEnd(e)},0);else{let u=$n.get(s);u===void 0&&(u=[],$n.set(s,u)),u.push({onLoad:t,onError:i})}return s}const a=si("img");function o(){c(),t&&t(this);const u=$n.get(this)||[];for(let h=0;h<u.length;h++){const d=u[h];d.onLoad&&d.onLoad(this)}$n.delete(this),r.manager.itemEnd(e)}function l(u){c(),i&&i(u),Wr.remove(`image:${e}`);const h=$n.get(this)||[];for(let d=0;d<h.length;d++){const f=h[d];f.onError&&f.onError(u)}$n.delete(this),r.manager.itemError(e),r.manager.itemEnd(e)}function c(){a.removeEventListener("load",o,!1),a.removeEventListener("error",l,!1)}return a.addEventListener("load",o,!1),a.addEventListener("error",l,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),Wr.add(`image:${e}`,a),r.manager.itemStart(e),a.src=e,a}},hc=class extends Xr{constructor(e){super(e)}load(e,t,n,i){const r=new Ct,s=new uc(this.manager);return s.setCrossOrigin(this.crossOrigin),s.setPath(this.path),s.load(e,function(a){r.image=a,r.needsUpdate=!0,t!==void 0&&t(r)},n,i),r}},Ki=new B,Zi=new Sn,Xt=new B,ra=class extends Qt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ft,this.projectionMatrix=new ft,this.projectionMatrixInverse=new ft,this.coordinateSystem=Rn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Ki,Zi,Xt),Xt.x===1&&Xt.y===1&&Xt.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ki,Zi,Xt.set(1,1,1)).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorld.decompose(Ki,Zi,Xt),Xt.x===1&&Xt.y===1&&Xt.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ki,Zi,Xt.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},un=new B,sa=new Ze,aa=new Ze,It=class extends ra{constructor(e=50,t=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=oi*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(ai*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return oi*2*Math.atan(Math.tan(ai*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){un.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(un.x,un.y).multiplyScalar(-e/un.z),un.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(un.x,un.y).multiplyScalar(-e/un.z)}getViewSize(e,t){return this.getViewBounds(e,sa,aa),t.subVectors(aa,sa)}setViewOffset(e,t,n,i,r,s){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=s,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(ai*.5*this.fov)/this.zoom,n=2*t,i=this.aspect*n,r=-.5*i;const s=this.view;if(this.view!==null&&this.view.enabled){const o=s.fullWidth,l=s.fullHeight;r+=s.offsetX*i/o,t-=s.offsetY*n/l,i*=s.width/o,n*=s.height/l}const a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+i,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},oa=class extends ra{constructor(e=-1,t=1,n=1,i=-1,r=.1,s=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=i,this.near=r,this.far=s,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,i,r,s){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=s,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let r=n-e,s=n+e,a=i+t,o=i-t;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,c=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,s=r+l*this.view.width,a-=c*this.view.offsetY,o=a-c*this.view.height}this.projectionMatrix.makeOrthographic(r,s,a,o,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},qn=-90,Yn=1,fc=class extends Qt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new It(qn,Yn,e,t);i.layers=this.layers,this.add(i);const r=new It(qn,Yn,e,t);r.layers=this.layers,this.add(r);const s=new It(qn,Yn,e,t);s.layers=this.layers,this.add(s);const a=new It(qn,Yn,e,t);a.layers=this.layers,this.add(a);const o=new It(qn,Yn,e,t);o.layers=this.layers,this.add(o);const l=new It(qn,Yn,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,i,r,s,a,o]=t;for(const l of t)this.remove(l);if(e===2e3)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),s.up.set(0,0,1),s.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),o.up.set(0,1,0),o.lookAt(0,0,-1);else if(e===2001)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),s.up.set(0,0,-1),s.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),o.up.set(0,-1,0),o.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[r,s,a,o,l,c]=this.children,u=e.getRenderTarget(),h=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),f=e.xr.enabled;e.xr.enabled=!1;const g=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let _=!1;e.isWebGLRenderer===!0?_=e.state.buffers.depth.getReversed():_=e.reversedDepthBuffer,e.setRenderTarget(n,0,i),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(n,1,i),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,2,i),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,3,i),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,4,i),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),n.texture.generateMipmaps=g,e.setRenderTarget(n,5,i),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(u,h,d),e.xr.enabled=f,n.texture.needsPMREMUpdate=!0}},pc=class extends It{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}},$r="\\[\\]\\.:\\/",mc=new RegExp("["+$r+"]","g"),qr="[^"+$r+"]",gc="[^"+$r.replace("\\.","")+"]",vc=/((?:WC+[\/:])*)/.source.replace("WC",qr),_c=/(WCOD+)?/.source.replace("WCOD",gc),yc=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",qr),xc=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",qr),Sc=new RegExp("^"+vc+_c+yc+xc+"$"),bc=["material","materials","bones","map"],Mc=class{constructor(e,t,n){const i=n||nt.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,i)}getValue(e,t){this.bind();const n=this._targetGroup.nCachedObjects_,i=this._bindings[n];i!==void 0&&i.getValue(e,t)}setValue(e,t){const n=this._bindings;for(let i=this._targetGroup.nCachedObjects_,r=n.length;i!==r;++i)n[i].setValue(e,t)}bind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},nt=class ni{constructor(t,n,i){this.path=n,this.parsedPath=i||ni.parseTrackName(n),this.node=ni.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,n,i){return t&&t.isAnimationObjectGroup?new ni.Composite(t,n,i):new ni(t,n,i)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(mc,"")}static parseTrackName(t){const n=Sc.exec(t);if(n===null)throw new Error("PropertyBinding: Cannot parse trackName: "+t);const i={nodeName:n[2],objectName:n[3],objectIndex:n[4],propertyName:n[5],propertyIndex:n[6]},r=i.nodeName&&i.nodeName.lastIndexOf(".");if(r!==void 0&&r!==-1){const s=i.nodeName.substring(r+1);bc.indexOf(s)!==-1&&(i.nodeName=i.nodeName.substring(0,r),i.objectName=s)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+t);return i}static findNode(t,n){if(n===void 0||n===""||n==="."||n===-1||n===t.name||n===t.uuid)return t;if(t.skeleton){const i=t.skeleton.getBoneByName(n);if(i!==void 0)return i}if(t.children){const i=function(s){for(let a=0;a<s.length;a++){const o=s[a];if(o.name===n||o.uuid===n)return o;const l=i(o.children);if(l)return l}return null},r=i(t.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,n){t[n]=this.targetObject[this.propertyName]}_getValue_array(t,n){const i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)t[n++]=i[r]}_getValue_arrayElement(t,n){t[n]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,n){this.resolvedProperty.toArray(t,n)}_setValue_direct(t,n){this.targetObject[this.propertyName]=t[n]}_setValue_direct_setNeedsUpdate(t,n){this.targetObject[this.propertyName]=t[n],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,n){this.targetObject[this.propertyName]=t[n],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,n){const i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=t[n++]}_setValue_array_setNeedsUpdate(t,n){const i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=t[n++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,n){const i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=t[n++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,n){this.resolvedProperty[this.propertyIndex]=t[n]}_setValue_arrayElement_setNeedsUpdate(t,n){this.resolvedProperty[this.propertyIndex]=t[n],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,n){this.resolvedProperty[this.propertyIndex]=t[n],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,n){this.resolvedProperty.fromArray(t,n)}_setValue_fromArray_setNeedsUpdate(t,n){this.resolvedProperty.fromArray(t,n),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,n){this.resolvedProperty.fromArray(t,n),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,n){this.bind(),this.getValue(t,n)}_setValue_unbound(t,n){this.bind(),this.setValue(t,n)}bind(){let t=this.node;const n=this.parsedPath,i=n.objectName,r=n.propertyName;let s=n.propertyIndex;if(t||(t=ni.findNode(this.rootNode,n.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){Ee("PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let c=n.objectIndex;switch(i){case"materials":if(!t.material){we("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){we("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){we("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let u=0;u<t.length;u++)if(t[u].name===c){c=u;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){we("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){we("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[i]===void 0){we("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[i]}if(c!==void 0){if(t[c]===void 0){we("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[c]}}const a=t[r];if(a===void 0){const c=n.nodeName;we("PropertyBinding: Trying to update property for track: "+c+"."+r+" but it wasn't found.",t);return}let o=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?o=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(s!==void 0){if(r==="morphTargetInfluences"){if(!t.geometry){we("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){we("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[s]!==void 0&&(s=t.morphTargetDictionary[s])}l=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=s}else a.fromArray!==void 0&&a.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(l=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=r;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};nt.Composite=Mc,nt.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3},nt.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2},nt.prototype.GetterByBindingType=[nt.prototype._getValue_direct,nt.prototype._getValue_array,nt.prototype._getValue_arrayElement,nt.prototype._getValue_toArray],nt.prototype.SetterByBindingTypeAndVersioning=[[nt.prototype._setValue_direct,nt.prototype._setValue_direct_setNeedsUpdate,nt.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[nt.prototype._setValue_array,nt.prototype._setValue_array_setNeedsUpdate,nt.prototype._setValue_array_setMatrixWorldNeedsUpdate],[nt.prototype._setValue_arrayElement,nt.prototype._setValue_arrayElement_setNeedsUpdate,nt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[nt.prototype._setValue_fromArray,nt.prototype._setValue_fromArray_setNeedsUpdate,nt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Ec=class{constructor(e,t,n,i){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,i)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,i){const r=this.elements;return r[0]=e,r[2]=t,r[1]=n,r[3]=i,this}};us=Ec,us.prototype.isMatrix2=!0;function la(e,t,n,i){const r=Tc(i);switch(n){case po:return e*t;case go:return e*t/r.components*r.byteLength;case xs:return e*t/r.components*r.byteLength;case Ti:return e*t*2/r.components*r.byteLength;case Ss:return e*t*2/r.components*r.byteLength;case mo:return e*t*3/r.components*r.byteLength;case ii:return e*t*4/r.components*r.byteLength;case bs:return e*t*4/r.components*r.byteLength;case vo:case _o:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case yo:case xo:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case bo:case Eo:return Math.max(e,16)*Math.max(t,8)/4;case So:case Mo:return Math.max(e,8)*Math.max(t,8)/2;case To:case Ao:case Co:case Ro:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case wo:case Po:case Io:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case Lo:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case Do:return Math.floor((e+4)/5)*Math.floor((t+3)/4)*16;case No:return Math.floor((e+4)/5)*Math.floor((t+4)/5)*16;case Uo:return Math.floor((e+5)/6)*Math.floor((t+4)/5)*16;case Fo:return Math.floor((e+5)/6)*Math.floor((t+5)/6)*16;case Oo:return Math.floor((e+7)/8)*Math.floor((t+4)/5)*16;case Bo:return Math.floor((e+7)/8)*Math.floor((t+5)/6)*16;case ko:return Math.floor((e+7)/8)*Math.floor((t+7)/8)*16;case zo:return Math.floor((e+9)/10)*Math.floor((t+4)/5)*16;case Vo:return Math.floor((e+9)/10)*Math.floor((t+5)/6)*16;case Ho:return Math.floor((e+9)/10)*Math.floor((t+7)/8)*16;case Go:return Math.floor((e+9)/10)*Math.floor((t+9)/10)*16;case Wo:return Math.floor((e+11)/12)*Math.floor((t+9)/10)*16;case Xo:return Math.floor((e+11)/12)*Math.floor((t+11)/12)*16;case $o:case qo:case Yo:return Math.ceil(e/4)*Math.ceil(t/4)*16;case jo:case Ko:return Math.ceil(e/4)*Math.ceil(t/4)*8;case Zo:case Jo:return Math.ceil(e/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${n} format.`)}function Tc(e){switch(e){case vn:case lo:return{byteLength:1,components:1};case ms:case co:case yn:return{byteLength:2,components:1};case gs:case vs:return{byteLength:2,components:4};case _n:case uo:case Ei:return{byteLength:4,components:1};case ho:case fo:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${e}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"184"}})),typeof window<"u"&&(window.__THREE__?Ee("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="184");function ca(){let e=null,t=!1,n=null,i=null;function r(s,a){n(s,a),i=e.requestAnimationFrame(r)}return{start:function(){t!==!0&&n!==null&&e!==null&&(i=e.requestAnimationFrame(r),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(i),t=!1},setAnimationLoop:function(s){n=s},setContext:function(s){e=s}}}function Ac(e){const t=new WeakMap;function n(o,l){const c=o.array,u=o.usage,h=c.byteLength,d=e.createBuffer();e.bindBuffer(l,d),e.bufferData(l,c,u),o.onUploadCallback();let f;if(c instanceof Float32Array)f=e.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=e.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?f=e.HALF_FLOAT:f=e.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=e.SHORT;else if(c instanceof Uint32Array)f=e.UNSIGNED_INT;else if(c instanceof Int32Array)f=e.INT;else if(c instanceof Int8Array)f=e.BYTE;else if(c instanceof Uint8Array)f=e.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=e.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:h}}function i(o,l,c){const u=l.array,h=l.updateRanges;if(e.bindBuffer(c,o),h.length===0)e.bufferSubData(c,0,u);else{h.sort((f,g)=>f.start-g.start);let d=0;for(let f=1;f<h.length;f++){const g=h[d],_=h[f];_.start<=g.start+g.count+1?g.count=Math.max(g.count,_.start+_.count-g.start):(++d,h[d]=_)}h.length=d+1;for(let f=0,g=h.length;f<g;f++){const _=h[f];e.bufferSubData(c,_.start*u.BYTES_PER_ELEMENT,u,_.start,_.count)}l.clearUpdateRanges()}l.onUploadCallback()}function r(o){return o.isInterleavedBufferAttribute&&(o=o.data),t.get(o)}function s(o){o.isInterleavedBufferAttribute&&(o=o.data);const l=t.get(o);l&&(e.deleteBuffer(l.buffer),t.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const u=t.get(o);(!u||u.version<o.version)&&t.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const c=t.get(o);if(c===void 0)t.set(o,n(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,o,l),c.version=o.version}}return{get:r,remove:s,update:a}}var Ue={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,cube_uv_reflection_fragment:`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:"gl_FragColor = linearToOutputTexel( gl_FragColor );",colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = inverseTransformDirection( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},oe={common:{diffuse:{value:new je(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ne},alphaMap:{value:null},alphaMapTransform:{value:new Ne},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ne}},envmap:{envMap:{value:null},envMapRotation:{value:new Ne},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ne}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ne}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ne},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ne},normalScale:{value:new Ze(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ne},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ne}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ne}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ne}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new je(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new B},probesMax:{value:new B},probesResolution:{value:new B}},points:{diffuse:{value:new je(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ne},alphaTest:{value:0},uvTransform:{value:new Ne}},sprite:{diffuse:{value:new je(16777215)},opacity:{value:1},center:{value:new Ze(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ne},alphaMap:{value:null},alphaMapTransform:{value:new Ne},alphaTest:{value:0}}},$t={basic:{uniforms:St([oe.common,oe.specularmap,oe.envmap,oe.aomap,oe.lightmap,oe.fog]),vertexShader:Ue.meshbasic_vert,fragmentShader:Ue.meshbasic_frag},lambert:{uniforms:St([oe.common,oe.specularmap,oe.envmap,oe.aomap,oe.lightmap,oe.emissivemap,oe.bumpmap,oe.normalmap,oe.displacementmap,oe.fog,oe.lights,{emissive:{value:new je(0)},envMapIntensity:{value:1}}]),vertexShader:Ue.meshlambert_vert,fragmentShader:Ue.meshlambert_frag},phong:{uniforms:St([oe.common,oe.specularmap,oe.envmap,oe.aomap,oe.lightmap,oe.emissivemap,oe.bumpmap,oe.normalmap,oe.displacementmap,oe.fog,oe.lights,{emissive:{value:new je(0)},specular:{value:new je(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Ue.meshphong_vert,fragmentShader:Ue.meshphong_frag},standard:{uniforms:St([oe.common,oe.envmap,oe.aomap,oe.lightmap,oe.emissivemap,oe.bumpmap,oe.normalmap,oe.displacementmap,oe.roughnessmap,oe.metalnessmap,oe.fog,oe.lights,{emissive:{value:new je(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ue.meshphysical_vert,fragmentShader:Ue.meshphysical_frag},toon:{uniforms:St([oe.common,oe.aomap,oe.lightmap,oe.emissivemap,oe.bumpmap,oe.normalmap,oe.displacementmap,oe.gradientmap,oe.fog,oe.lights,{emissive:{value:new je(0)}}]),vertexShader:Ue.meshtoon_vert,fragmentShader:Ue.meshtoon_frag},matcap:{uniforms:St([oe.common,oe.bumpmap,oe.normalmap,oe.displacementmap,oe.fog,{matcap:{value:null}}]),vertexShader:Ue.meshmatcap_vert,fragmentShader:Ue.meshmatcap_frag},points:{uniforms:St([oe.points,oe.fog]),vertexShader:Ue.points_vert,fragmentShader:Ue.points_frag},dashed:{uniforms:St([oe.common,oe.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ue.linedashed_vert,fragmentShader:Ue.linedashed_frag},depth:{uniforms:St([oe.common,oe.displacementmap]),vertexShader:Ue.depth_vert,fragmentShader:Ue.depth_frag},normal:{uniforms:St([oe.common,oe.bumpmap,oe.normalmap,oe.displacementmap,{opacity:{value:1}}]),vertexShader:Ue.meshnormal_vert,fragmentShader:Ue.meshnormal_frag},sprite:{uniforms:St([oe.sprite,oe.fog]),vertexShader:Ue.sprite_vert,fragmentShader:Ue.sprite_frag},background:{uniforms:{uvTransform:{value:new Ne},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ue.background_vert,fragmentShader:Ue.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ne}},vertexShader:Ue.backgroundCube_vert,fragmentShader:Ue.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ue.cube_vert,fragmentShader:Ue.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ue.equirect_vert,fragmentShader:Ue.equirect_frag},distance:{uniforms:St([oe.common,oe.displacementmap,{referencePosition:{value:new B},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ue.distance_vert,fragmentShader:Ue.distance_frag},shadow:{uniforms:St([oe.lights,oe.fog,{color:{value:new je(0)},opacity:{value:1}}]),vertexShader:Ue.shadow_vert,fragmentShader:Ue.shadow_frag}};$t.physical={uniforms:St([$t.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ne},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ne},clearcoatNormalScale:{value:new Ze(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ne},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ne},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ne},sheen:{value:0},sheenColor:{value:new je(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ne},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ne},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ne},transmissionSamplerSize:{value:new Ze},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ne},attenuationDistance:{value:0},attenuationColor:{value:new je(0)},specularColor:{value:new je(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ne},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ne},anisotropyVector:{value:new Ze},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ne}}]),vertexShader:Ue.meshphysical_vert,fragmentShader:Ue.meshphysical_frag};var Ji={r:0,b:0,g:0},wc=new ft,da=new Ne;da.set(-1,0,0,0,1,0,0,0,1);function Cc(e,t,n,i,r,s){const a=new je(0);let o=r===!0?0:1,l,c,u=null,h=0,d=null;function f(S){let b=S.isScene===!0?S.background:null;if(b&&b.isTexture){const x=S.backgroundBlurriness>0;b=t.get(b,x)}return b}function g(S){let b=!1;const x=f(S);x===null?m(a,o):x&&x.isColor&&(m(x,1),b=!0);const C=e.xr.getEnvironmentBlendMode();C==="additive"?n.buffers.color.setClear(0,0,0,1,s):C==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,s),(e.autoClear||b)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function _(S,b){const x=f(b);x&&(x.isCubeTexture||x.mapping===306)?(c===void 0&&(c=new Ht(new Gr(1,1,1),new Gt({name:"BackgroundCubeMaterial",uniforms:Xn($t.backgroundCube.uniforms),vertexShader:$t.backgroundCube.vertexShader,fragmentShader:$t.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(C,A,T){this.matrixWorld.copyPosition(T.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(c)),c.material.uniforms.envMap.value=x,c.material.uniforms.backgroundBlurriness.value=b.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=b.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(wc.makeRotationFromEuler(b.backgroundRotation)).transpose(),x.isCubeTexture&&x.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(da),c.material.toneMapped=He.getTransfer(x.colorSpace)!==Ci,(u!==x||h!==x.version||d!==e.toneMapping)&&(c.material.needsUpdate=!0,u=x,h=x.version,d=e.toneMapping),c.layers.enableAll(),S.unshift(c,c.geometry,c.material,0,0,null)):x&&x.isTexture&&(l===void 0&&(l=new Ht(new Qs(2,2),new Gt({name:"BackgroundMaterial",uniforms:Xn($t.background.uniforms),vertexShader:$t.background.vertexShader,fragmentShader:$t.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l)),l.material.uniforms.t2D.value=x,l.material.uniforms.backgroundIntensity.value=b.backgroundIntensity,l.material.toneMapped=He.getTransfer(x.colorSpace)!==Ci,x.matrixAutoUpdate===!0&&x.updateMatrix(),l.material.uniforms.uvTransform.value.copy(x.matrix),(u!==x||h!==x.version||d!==e.toneMapping)&&(l.material.needsUpdate=!0,u=x,h=x.version,d=e.toneMapping),l.layers.enableAll(),S.unshift(l,l.geometry,l.material,0,0,null))}function m(S,b){S.getRGB(Ji,ta(e)),n.buffers.color.setClear(Ji.r,Ji.g,Ji.b,b,s)}function p(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(S,b=1){a.set(S),o=b,m(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(S){o=S,m(a,o)},render:g,addToRenderList:_,dispose:p}}function Rc(e,t){const n=e.getParameter(e.MAX_VERTEX_ATTRIBS),i={},r=d(null);let s=r,a=!1;function o(R,H,X,z,k){let G=!1;const I=h(R,z,X,H);s!==I&&(s=I,c(s.object)),G=f(R,z,X,k),G&&g(R,z,X,k),k!==null&&t.update(k,e.ELEMENT_ARRAY_BUFFER),(G||a)&&(a=!1,x(R,H,X,z),k!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(k).buffer))}function l(){return e.createVertexArray()}function c(R){return e.bindVertexArray(R)}function u(R){return e.deleteVertexArray(R)}function h(R,H,X,z){const k=z.wireframe===!0;let G=i[H.id];G===void 0&&(G={},i[H.id]=G);const I=R.isInstancedMesh===!0?R.id:0;let Y=G[I];Y===void 0&&(Y={},G[I]=Y);let J=Y[X.id];J===void 0&&(J={},Y[X.id]=J);let te=J[k];return te===void 0&&(te=d(l()),J[k]=te),te}function d(R){const H=[],X=[],z=[];for(let k=0;k<n;k++)H[k]=0,X[k]=0,z[k]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:H,enabledAttributes:X,attributeDivisors:z,object:R,attributes:{},index:null}}function f(R,H,X,z){const k=s.attributes,G=H.attributes;let I=0;const Y=X.getAttributes();for(const J in Y)if(Y[J].location>=0){const te=k[J];let fe=G[J];if(fe===void 0&&(J==="instanceMatrix"&&R.instanceMatrix&&(fe=R.instanceMatrix),J==="instanceColor"&&R.instanceColor&&(fe=R.instanceColor)),te===void 0||te.attribute!==fe||fe&&te.data!==fe.data)return!0;I++}return s.attributesNum!==I||s.index!==z}function g(R,H,X,z){const k={},G=H.attributes;let I=0;const Y=X.getAttributes();for(const J in Y)if(Y[J].location>=0){let te=G[J];te===void 0&&(J==="instanceMatrix"&&R.instanceMatrix&&(te=R.instanceMatrix),J==="instanceColor"&&R.instanceColor&&(te=R.instanceColor));const fe={};fe.attribute=te,te&&te.data&&(fe.data=te.data),k[J]=fe,I++}s.attributes=k,s.attributesNum=I,s.index=z}function _(){const R=s.newAttributes;for(let H=0,X=R.length;H<X;H++)R[H]=0}function m(R){p(R,0)}function p(R,H){const X=s.newAttributes,z=s.enabledAttributes,k=s.attributeDivisors;X[R]=1,z[R]===0&&(e.enableVertexAttribArray(R),z[R]=1),k[R]!==H&&(e.vertexAttribDivisor(R,H),k[R]=H)}function S(){const R=s.newAttributes,H=s.enabledAttributes;for(let X=0,z=H.length;X<z;X++)H[X]!==R[X]&&(e.disableVertexAttribArray(X),H[X]=0)}function b(R,H,X,z,k,G,I){I===!0?e.vertexAttribIPointer(R,H,X,k,G):e.vertexAttribPointer(R,H,X,z,k,G)}function x(R,H,X,z){_();const k=z.attributes,G=X.getAttributes(),I=H.defaultAttributeValues;for(const Y in G){const J=G[Y];if(J.location>=0){let te=k[Y];if(te===void 0&&(Y==="instanceMatrix"&&R.instanceMatrix&&(te=R.instanceMatrix),Y==="instanceColor"&&R.instanceColor&&(te=R.instanceColor)),te!==void 0){const fe=te.normalized,me=te.itemSize,Le=t.get(te);if(Le===void 0)continue;const Fe=Le.buffer,$=Le.type,ie=Le.bytesPerElement,ye=$===e.INT||$===e.UNSIGNED_INT||te.gpuType===1013;if(te.isInterleavedBufferAttribute){const ue=te.data,Te=ue.stride,Ie=te.offset;if(ue.isInstancedInterleavedBuffer){for(let Ce=0;Ce<J.locationSize;Ce++)p(J.location+Ce,ue.meshPerAttribute);R.isInstancedMesh!==!0&&z._maxInstanceCount===void 0&&(z._maxInstanceCount=ue.meshPerAttribute*ue.count)}else for(let Ce=0;Ce<J.locationSize;Ce++)m(J.location+Ce);e.bindBuffer(e.ARRAY_BUFFER,Fe);for(let Ce=0;Ce<J.locationSize;Ce++)b(J.location+Ce,me/J.locationSize,$,fe,Te*ie,(Ie+me/J.locationSize*Ce)*ie,ye)}else{if(te.isInstancedBufferAttribute){for(let ue=0;ue<J.locationSize;ue++)p(J.location+ue,te.meshPerAttribute);R.isInstancedMesh!==!0&&z._maxInstanceCount===void 0&&(z._maxInstanceCount=te.meshPerAttribute*te.count)}else for(let ue=0;ue<J.locationSize;ue++)m(J.location+ue);e.bindBuffer(e.ARRAY_BUFFER,Fe);for(let ue=0;ue<J.locationSize;ue++)b(J.location+ue,me/J.locationSize,$,fe,me*ie,me/J.locationSize*ue*ie,ye)}}else if(I!==void 0){const fe=I[Y];if(fe!==void 0)switch(fe.length){case 2:e.vertexAttrib2fv(J.location,fe);break;case 3:e.vertexAttrib3fv(J.location,fe);break;case 4:e.vertexAttrib4fv(J.location,fe);break;default:e.vertexAttrib1fv(J.location,fe)}}}}S()}function C(){E();for(const R in i){const H=i[R];for(const X in H){const z=H[X];for(const k in z){const G=z[k];for(const I in G)u(G[I].object),delete G[I];delete z[k]}}delete i[R]}}function A(R){if(i[R.id]===void 0)return;const H=i[R.id];for(const X in H){const z=H[X];for(const k in z){const G=z[k];for(const I in G)u(G[I].object),delete G[I];delete z[k]}}delete i[R.id]}function T(R){for(const H in i){const X=i[H];for(const z in X){const k=X[z];if(k[R.id]===void 0)continue;const G=k[R.id];for(const I in G)u(G[I].object),delete G[I];delete k[R.id]}}}function v(R){for(const H in i){const X=i[H],z=R.isInstancedMesh===!0?R.id:0,k=X[z];if(k!==void 0){for(const G in k){const I=k[G];for(const Y in I)u(I[Y].object),delete I[Y];delete k[G]}delete X[z],Object.keys(X).length===0&&delete i[H]}}}function E(){W(),a=!0,s!==r&&(s=r,c(s.object))}function W(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:o,reset:E,resetDefaultState:W,dispose:C,releaseStatesOfGeometry:A,releaseStatesOfObject:v,releaseStatesOfProgram:T,initAttributes:_,enableAttribute:m,disableUnusedAttributes:S}}function Pc(e,t,n){let i;function r(l){i=l}function s(l,c){e.drawArrays(i,l,c),n.update(c,i,1)}function a(l,c,u){u!==0&&(e.drawArraysInstanced(i,l,c,u),n.update(c,i,u))}function o(l,c,u){if(u===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,l,0,c,0,u);let h=0;for(let d=0;d<u;d++)h+=c[d];n.update(h,i,1)}this.setMode=r,this.render=s,this.renderInstances=a,this.renderMultiDraw=o}function Ic(e,t,n,i){let r;function s(){if(r!==void 0)return r;if(t.has("EXT_texture_filter_anisotropic")===!0){const T=t.get("EXT_texture_filter_anisotropic");r=e.getParameter(T.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function a(T){return!(T!==1023&&i.convert(T)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(T){const v=T===1016&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(T!==1009&&i.convert(T)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE)&&T!==1015&&!v)}function l(T){if(T==="highp"){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return"highp";T="mediump"}return T==="mediump"&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=n.precision!==void 0?n.precision:"highp";const u=l(c);u!==c&&(Ee("WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);const h=n.logarithmicDepthBuffer===!0,d=n.reversedDepthBuffer===!0&&t.has("EXT_clip_control");n.reversedDepthBuffer===!0&&d===!1&&Ee("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const f=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),g=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=e.getParameter(e.MAX_TEXTURE_SIZE),m=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),p=e.getParameter(e.MAX_VERTEX_ATTRIBS),S=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),b=e.getParameter(e.MAX_VARYING_VECTORS),x=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),C=e.getParameter(e.MAX_SAMPLES),A=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:h,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:g,maxTextureSize:_,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:S,maxVaryings:b,maxFragmentUniforms:x,maxSamples:C,samples:A}}function Lc(e){const t=this;let n=null,i=0,r=!1,s=!1;const a=new Tn,o=new Ne,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(h,d){const f=h.length!==0||d||i!==0||r;return r=d,i=h.length,f},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(h,d){n=u(h,d,0)},this.setState=function(h,d,f){const g=h.clippingPlanes,_=h.clipIntersection,m=h.clipShadows,p=e.get(h);if(!r||g===null||g.length===0||s&&!m)s?u(null):c();else{const S=s?0:i,b=S*4;let x=p.clippingState||null;l.value=x,x=u(g,d,b,f);for(let C=0;C!==b;++C)x[C]=n[C];p.clippingState=x,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=S}};function c(){l.value!==n&&(l.value=n,l.needsUpdate=i>0),t.numPlanes=i,t.numIntersection=0}function u(h,d,f,g){const _=h!==null?h.length:0;let m=null;if(_!==0){if(m=l.value,g!==!0||m===null){const p=f+_*4,S=d.matrixWorldInverse;o.getNormalMatrix(S),(m===null||m.length<p)&&(m=new Float32Array(p));for(let b=0,x=f;b!==_;++b,x+=4)a.copy(h[b]).applyMatrix4(S,o),a.normal.toArray(m,x),m[x+3]=a.constant}l.value=m,l.needsUpdate=!0}return t.numPlanes=_,t.numIntersection=0,m}}var hn=4,ua=[.125,.215,.35,.446,.526,.582],wn=20,Dc=256,yi=new oa,ha=new je,Yr=null,jr=0,Kr=0,Zr=!1,Nc=new B,fa=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,i=100,r={}){const{size:s=256,position:a=Nc}=r;Yr=this._renderer.getRenderTarget(),jr=this._renderer.getActiveCubeFace(),Kr=this._renderer.getActiveMipmapLevel(),Zr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(s);const o=this._allocateTargets();return o.depthBuffer=!0,this._sceneToCubeUV(e,n,i,o,a),t>0&&this._blur(o,0,0,t),this._applyPMREM(o),this._cleanup(o),o}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=ga(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=ma(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Yr,jr,Kr),this._renderer.xr.enabled=Zr,e.scissorTest=!1,jn(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Yr=this._renderer.getRenderTarget(),jr=this._renderer.getActiveCubeFace(),Kr=this._renderer.getActiveMipmapLevel(),Zr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Et,minFilter:Et,generateMipmaps:!1,type:yn,format:ii,colorSpace:pr,depthBuffer:!1},i=pa(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=pa(e,t,n);const{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=Uc(r)),this._blurMaterial=Oc(r,e,t),this._ggxMaterial=Fc(r,e,t)}return i}_compileMaterial(e){const t=new Ht(new cn,e);this._renderer.compile(t,yi)}_sceneToCubeUV(e,t,n,i,r){const s=new It(90,1,t,n),a=[1,-1,1,1,1,1],o=[1,1,1,-1,-1,-1],l=this._renderer,c=l.autoClear,u=l.toneMapping;l.getClearColor(ha),l.toneMapping=0,l.autoClear=!1,l.state.buffers.depth.getReversed()&&(l.setRenderTarget(i),l.clearDepth(),l.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Ht(new Gr,new zr({name:"PMREM.Background",side:1,depthWrite:!1,depthTest:!1})));const h=this._backgroundBox,d=h.material;let f=!1;const g=e.background;g?g.isColor&&(d.color.copy(g),e.background=null,f=!0):(d.color.copy(ha),f=!0);for(let _=0;_<6;_++){const m=_%3;m===0?(s.up.set(0,a[_],0),s.position.set(r.x,r.y,r.z),s.lookAt(r.x+o[_],r.y,r.z)):m===1?(s.up.set(0,0,a[_]),s.position.set(r.x,r.y,r.z),s.lookAt(r.x,r.y+o[_],r.z)):(s.up.set(0,a[_],0),s.position.set(r.x,r.y,r.z),s.lookAt(r.x,r.y,r.z+o[_]));const p=this._cubeSize;jn(i,m*p,_>2?p:0,p,p),l.setRenderTarget(i),f&&l.render(h,s),l.render(e,s)}l.toneMapping=u,l.autoClear=c,e.background=g}_textureToCubeUV(e,t){const n=this._renderer,i=e.mapping===301||e.mapping===302;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=ga()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=ma());const r=i?this._cubemapMaterial:this._equirectMaterial,s=this._lodMeshes[0];s.material=r;const a=r.uniforms;a.envMap.value=e;const o=this._cubeSize;jn(t,0,0,3*o,2*o),n.setRenderTarget(t),n.render(s,yi)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const i=this._lodMeshes.length;for(let r=1;r<i;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=n}_applyGGXFilter(e,t,n){const i=this._renderer,r=this._pingPongRenderTarget,s=this._ggxMaterial,a=this._lodMeshes[n];a.material=s;const o=s.uniforms,l=n/(this._lodMeshes.length-1),c=t/(this._lodMeshes.length-1),u=Math.sqrt(l*l-c*c)*(0+l*1.25),{_lodMax:h}=this,d=this._sizeLods[n],f=3*d*(n>h-hn?n-h+hn:0),g=4*(this._cubeSize-d);o.envMap.value=e.texture,o.roughness.value=u,o.mipInt.value=h-t,jn(r,f,g,3*d,2*d),i.setRenderTarget(r),i.render(a,yi),o.envMap.value=r.texture,o.roughness.value=0,o.mipInt.value=h-n,jn(e,f,g,3*d,2*d),i.setRenderTarget(e),i.render(a,yi)}_blur(e,t,n,i,r){const s=this._pingPongRenderTarget;this._halfBlur(e,s,t,n,i,"latitudinal",r),this._halfBlur(s,e,n,n,i,"longitudinal",r)}_halfBlur(e,t,n,i,r,s,a){const o=this._renderer,l=this._blurMaterial;s!=="latitudinal"&&s!=="longitudinal"&&we("blur direction must be either latitudinal or longitudinal!");const c=3,u=this._lodMeshes[i];u.material=l;const h=l.uniforms,d=this._sizeLods[n]-1,f=isFinite(r)?Math.PI/(2*d):2*Math.PI/(2*wn-1),g=r/f,_=isFinite(r)?1+Math.floor(c*g):wn;_>wn&&Ee(`sigmaRadians, ${r}, is too large and will clip, as it requested ${_} samples when the maximum is set to ${wn}`);const m=[];let p=0;for(let x=0;x<wn;++x){const C=x/g,A=Math.exp(-C*C/2);m.push(A),x===0?p+=A:x<_&&(p+=2*A)}for(let x=0;x<m.length;x++)m[x]=m[x]/p;h.envMap.value=e.texture,h.samples.value=_,h.weights.value=m,h.latitudinal.value=s==="latitudinal",a&&(h.poleAxis.value=a);const{_lodMax:S}=this;h.dTheta.value=f,h.mipInt.value=S-n;const b=this._sizeLods[i];jn(t,3*b*(i>S-hn?i-S+hn:0),4*(this._cubeSize-b),3*b,2*b),o.setRenderTarget(t),o.render(u,yi)}};function Uc(e){const t=[],n=[],i=[];let r=e;const s=e-hn+1+ua.length;for(let a=0;a<s;a++){const o=Math.pow(2,r);t.push(o);let l=1/o;a>e-hn?l=ua[a-e+hn-1]:a===0&&(l=0),n.push(l);const c=1/(o-2),u=-c,h=1+c,d=[u,u,h,u,h,h,u,u,h,h,u,h],f=6,g=6,_=3,m=2,p=1,S=new Float32Array(_*g*f),b=new Float32Array(m*g*f),x=new Float32Array(p*g*f);for(let A=0;A<f;A++){const T=A%3*2/3-1,v=A>2?0:-1,E=[T,v,0,T+2/3,v,0,T+2/3,v+1,0,T,v,0,T+2/3,v+1,0,T,v+1,0];S.set(E,_*g*A),b.set(d,m*g*A);const W=[A,A,A,A,A,A];x.set(W,p*g*A)}const C=new cn;C.setAttribute("position",new Vt(S,_)),C.setAttribute("uv",new Vt(b,m)),C.setAttribute("faceIndex",new Vt(x,p)),i.push(new Ht(C,null)),r>hn&&r--}return{lodMeshes:i,sizeLods:t,sigmas:n}}function pa(e,t,n){const i=new zt(e,t,n);return i.texture.mapping=306,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function jn(e,t,n,i,r){e.viewport.set(t,n,i,r),e.scissor.set(t,n,i,r)}function Fc(e,t,n){return new Gt({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Dc,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Qi(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Oc(e,t,n){const i=new Float32Array(wn),r=new B(0,1,0);return new Gt({name:"SphericalGaussianBlur",defines:{n:wn,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Qi(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function ma(){return new Gt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Qi(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function ga(){return new Gt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Qi(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Qi(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}var va=class extends zt{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},i=[n,n,n,n,n,n];this.texture=new Zs(i),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},i=new Gr(5,5,5),r=new Gt({name:"CubemapFromEquirect",uniforms:Xn(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});r.uniforms.tEquirect.value=t;const s=new Ht(i,r),a=t.minFilter;return t.minFilter===1008&&(t.minFilter=Et),new fc(1,10,this).update(e,s),t.minFilter=a,s.geometry.dispose(),s.material.dispose(),this}clear(e,t=!0,n=!0,i=!0){const r=e.getRenderTarget();for(let s=0;s<6;s++)e.setRenderTarget(this,s),e.clear(t,n,i);e.setRenderTarget(r)}};function Bc(e){let t=new WeakMap,n=new WeakMap,i=null;function r(d,f=!1){return d==null?null:f?a(d):s(d)}function s(d){if(d&&d.isTexture){const f=d.mapping;if(f===303||f===304)if(t.has(d)){const g=t.get(d).texture;return o(g,d.mapping)}else{const g=d.image;if(g&&g.height>0){const _=new va(g.height);return _.fromEquirectangularTexture(e,d),t.set(d,_),d.addEventListener("dispose",c),o(_.texture,d.mapping)}else return null}}return d}function a(d){if(d&&d.isTexture){const f=d.mapping,g=f===303||f===304,_=f===301||f===302;if(g||_){let m=n.get(d);const p=m!==void 0?m.texture.pmremVersion:0;if(d.isRenderTargetTexture&&d.pmremVersion!==p)return i===null&&(i=new fa(e)),m=g?i.fromEquirectangular(d,m):i.fromCubemap(d,m),m.texture.pmremVersion=d.pmremVersion,n.set(d,m),m.texture;if(m!==void 0)return m.texture;{const S=d.image;return g&&S&&S.height>0||_&&S&&l(S)?(i===null&&(i=new fa(e)),m=g?i.fromEquirectangular(d):i.fromCubemap(d),m.texture.pmremVersion=d.pmremVersion,n.set(d,m),d.addEventListener("dispose",u),m.texture):null}}}return d}function o(d,f){return f===303?d.mapping=301:f===304&&(d.mapping=302),d}function l(d){let f=0;const g=6;for(let _=0;_<g;_++)d[_]!==void 0&&f++;return f===g}function c(d){const f=d.target;f.removeEventListener("dispose",c);const g=t.get(f);g!==void 0&&(t.delete(f),g.dispose())}function u(d){const f=d.target;f.removeEventListener("dispose",u);const g=n.get(f);g!==void 0&&(n.delete(f),g.dispose())}function h(){t=new WeakMap,n=new WeakMap,i!==null&&(i.dispose(),i=null)}return{get:r,dispose:h}}function kc(e){const t={};function n(i){if(t[i]!==void 0)return t[i];const r=e.getExtension(i);return t[i]=r,r}return{has:function(i){return n(i)!==null},init:function(){n("EXT_color_buffer_float"),n("WEBGL_clip_cull_distance"),n("OES_texture_float_linear"),n("EXT_color_buffer_half_float"),n("WEBGL_multisampled_render_to_texture"),n("WEBGL_render_shared_exponent")},get:function(i){const r=n(i);return r===null&&gr("WebGLRenderer: "+i+" extension not supported."),r}}}function zc(e,t,n,i){const r={},s=new WeakMap;function a(h){const d=h.target;d.index!==null&&t.remove(d.index);for(const g in d.attributes)t.remove(d.attributes[g]);d.removeEventListener("dispose",a),delete r[d.id];const f=s.get(d);f&&(t.remove(f),s.delete(d)),i.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,n.memory.geometries--}function o(h,d){return r[d.id]===!0||(d.addEventListener("dispose",a),r[d.id]=!0,n.memory.geometries++),d}function l(h){const d=h.attributes;for(const f in d)t.update(d[f],e.ARRAY_BUFFER)}function c(h){const d=[],f=h.index,g=h.attributes.position;let _=0;if(g===void 0)return;if(f!==null){const S=f.array;_=f.version;for(let b=0,x=S.length;b<x;b+=3){const C=S[b+0],A=S[b+1],T=S[b+2];d.push(C,A,A,T,T,C)}}else{const S=g.array;_=g.version;for(let b=0,x=S.length/3-1;b<x;b+=3){const C=b+0,A=b+1,T=b+2;d.push(C,A,A,T,T,C)}}const m=new(g.count>=65535?$s:Xs)(d,1);m.version=_;const p=s.get(h);p&&t.remove(p),s.set(h,m)}function u(h){const d=s.get(h);if(d){const f=h.index;f!==null&&d.version<f.version&&c(h)}else c(h);return s.get(h)}return{get:o,update:l,getWireframeAttribute:u}}function Vc(e,t,n){let i;function r(h){i=h}let s,a;function o(h){s=h.type,a=h.bytesPerElement}function l(h,d){e.drawElements(i,d,s,h*a),n.update(d,i,1)}function c(h,d,f){f!==0&&(e.drawElementsInstanced(i,d,s,h*a,f),n.update(d,i,f))}function u(h,d,f){if(f===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,d,0,s,h,0,f);let g=0;for(let _=0;_<f;_++)g+=d[_];n.update(g,i,1)}this.setMode=r,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=u}function Hc(e){const t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,a,o){switch(n.calls++,a){case e.TRIANGLES:n.triangles+=o*(s/3);break;case e.LINES:n.lines+=o*(s/2);break;case e.LINE_STRIP:n.lines+=o*(s-1);break;case e.LINE_LOOP:n.lines+=o*s;break;case e.POINTS:n.points+=o*s;break;default:we("WebGLInfo: Unknown draw mode:",a);break}}function r(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:r,update:i}}function Gc(e,t,n){const i=new WeakMap,r=new ot;function s(a,o,l){const c=a.morphTargetInfluences,u=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,h=u!==void 0?u.length:0;let d=i.get(o);if(d===void 0||d.count!==h){let W=function(){v.dispose(),i.delete(o),o.removeEventListener("dispose",W)};var f=W;d!==void 0&&d.texture.dispose();const g=o.morphAttributes.position!==void 0,_=o.morphAttributes.normal!==void 0,m=o.morphAttributes.color!==void 0,p=o.morphAttributes.position||[],S=o.morphAttributes.normal||[],b=o.morphAttributes.color||[];let x=0;g===!0&&(x=1),_===!0&&(x=2),m===!0&&(x=3);let C=o.attributes.position.count*x,A=1;C>t.maxTextureSize&&(A=Math.ceil(C/t.maxTextureSize),C=t.maxTextureSize);const T=new Float32Array(C*A*4*h),v=new Ns(T,C,A,h);v.type=Ei,v.needsUpdate=!0;const E=x*4;for(let R=0;R<h;R++){const H=p[R],X=S[R],z=b[R],k=C*A*4*R;for(let G=0;G<H.count;G++){const I=G*E;g===!0&&(r.fromBufferAttribute(H,G),T[k+I+0]=r.x,T[k+I+1]=r.y,T[k+I+2]=r.z,T[k+I+3]=0),_===!0&&(r.fromBufferAttribute(X,G),T[k+I+4]=r.x,T[k+I+5]=r.y,T[k+I+6]=r.z,T[k+I+7]=0),m===!0&&(r.fromBufferAttribute(z,G),T[k+I+8]=r.x,T[k+I+9]=r.y,T[k+I+10]=r.z,T[k+I+11]=z.itemSize===4?r.w:1)}}d={count:h,texture:v,size:new Ze(C,A)},i.set(o,d),o.addEventListener("dispose",W)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(e,"morphTexture",a.morphTexture,n);else{let g=0;for(let m=0;m<c.length;m++)g+=c[m];const _=o.morphTargetsRelative?1:1-g;l.getUniforms().setValue(e,"morphTargetBaseInfluence",_),l.getUniforms().setValue(e,"morphTargetInfluences",c)}l.getUniforms().setValue(e,"morphTargetsTexture",d.texture,n),l.getUniforms().setValue(e,"morphTargetsTextureSize",d.size)}return{update:s}}function Wc(e,t,n,i,r){let s=new WeakMap;function a(c){const u=r.render.frame,h=c.geometry,d=t.get(c,h);if(s.get(d)!==u&&(t.update(d),s.set(d,u)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),s.get(c)!==u&&(n.update(c.instanceMatrix,e.ARRAY_BUFFER),c.instanceColor!==null&&n.update(c.instanceColor,e.ARRAY_BUFFER),s.set(c,u))),c.isSkinnedMesh){const f=c.skeleton;s.get(f)!==u&&(f.update(),s.set(f,u))}return d}function o(){s=new WeakMap}function l(c){const u=c.target;u.removeEventListener("dispose",l),i.releaseStatesOfObject(u),n.remove(u.instanceMatrix),u.instanceColor!==null&&n.remove(u.instanceColor)}return{update:a,dispose:o}}var Xc={1:"LINEAR_TONE_MAPPING",2:"REINHARD_TONE_MAPPING",3:"CINEON_TONE_MAPPING",4:"ACES_FILMIC_TONE_MAPPING",6:"AGX_TONE_MAPPING",7:"NEUTRAL_TONE_MAPPING",5:"CUSTOM_TONE_MAPPING"};function $c(e,t,n,i,r){const s=new zt(t,n,{type:e,depthBuffer:i,stencilBuffer:r,depthTexture:i?new Wn(t,n):void 0}),a=new zt(t,n,{type:yn,depthBuffer:!1,stencilBuffer:!1}),o=new cn;o.setAttribute("position",new Rt([-1,3,0,-1,-1,0,3,-1,0],3)),o.setAttribute("uv",new Rt([0,2,0,0,2,0],2));const l=new Jl({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),c=new Ht(o,l),u=new oa(-1,1,1,-1,0,1);let h=null,d=null,f=!1,g,_=null,m=[],p=!1;this.setSize=function(S,b){s.setSize(S,b),a.setSize(S,b);for(let x=0;x<m.length;x++){const C=m[x];C.setSize&&C.setSize(S,b)}},this.setEffects=function(S){m=S,p=m.length>0&&m[0].isRenderPass===!0;const b=s.width,x=s.height;for(let C=0;C<m.length;C++){const A=m[C];A.setSize&&A.setSize(b,x)}},this.begin=function(S,b){if(f||S.toneMapping===0&&m.length===0)return!1;if(_=b,b!==null){const x=b.width,C=b.height;(s.width!==x||s.height!==C)&&this.setSize(x,C)}return p===!1&&S.setRenderTarget(s),g=S.toneMapping,S.toneMapping=0,!0},this.hasRenderPass=function(){return p},this.end=function(S,b){S.toneMapping=g,f=!0;let x=s,C=a;for(let A=0;A<m.length;A++){const T=m[A];if(T.enabled!==!1&&(T.render(S,C,x,b),T.needsSwap!==!1)){const v=x;x=C,C=v}}if(h!==S.outputColorSpace||d!==S.toneMapping){h=S.outputColorSpace,d=S.toneMapping,l.defines={},He.getTransfer(h)==="srgb"&&(l.defines.SRGB_TRANSFER="");const A=Xc[d];A&&(l.defines[A]=""),l.needsUpdate=!0}l.uniforms.tDiffuse.value=x.texture,S.setRenderTarget(_),S.render(c,u),_=null,f=!1},this.isCompositing=function(){return f},this.dispose=function(){s.depthTexture&&s.depthTexture.dispose(),s.dispose(),a.dispose(),o.dispose(),l.dispose()}}var _a=new Ct,Jr=new Wn(1,1),ya=new Ns,xa=new wl,Sa=new Zs,ba=[],Ma=[],Ea=new Float32Array(16),Ta=new Float32Array(9),Aa=new Float32Array(4);function Kn(e,t,n){const i=e[0];if(i<=0||i>0)return e;const r=t*n;let s=ba[r];if(s===void 0&&(s=new Float32Array(r),ba[r]=s),t!==0){i.toArray(s,0);for(let a=1,o=0;a!==t;++a)o+=n,e[a].toArray(s,o)}return s}function dt(e,t){if(e.length!==t.length)return!1;for(let n=0,i=e.length;n<i;n++)if(e[n]!==t[n])return!1;return!0}function ut(e,t){for(let n=0,i=t.length;n<i;n++)e[n]=t[n]}function er(e,t){let n=Ma[t];n===void 0&&(n=new Int32Array(t),Ma[t]=n);for(let i=0;i!==t;++i)n[i]=e.allocateTextureUnit();return n}function qc(e,t){const n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function Yc(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(dt(n,t))return;e.uniform2fv(this.addr,t),ut(n,t)}}function jc(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(dt(n,t))return;e.uniform3fv(this.addr,t),ut(n,t)}}function Kc(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(dt(n,t))return;e.uniform4fv(this.addr,t),ut(n,t)}}function Zc(e,t){const n=this.cache,i=t.elements;if(i===void 0){if(dt(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),ut(n,t)}else{if(dt(n,i))return;Aa.set(i),e.uniformMatrix2fv(this.addr,!1,Aa),ut(n,i)}}function Jc(e,t){const n=this.cache,i=t.elements;if(i===void 0){if(dt(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),ut(n,t)}else{if(dt(n,i))return;Ta.set(i),e.uniformMatrix3fv(this.addr,!1,Ta),ut(n,i)}}function Qc(e,t){const n=this.cache,i=t.elements;if(i===void 0){if(dt(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),ut(n,t)}else{if(dt(n,i))return;Ea.set(i),e.uniformMatrix4fv(this.addr,!1,Ea),ut(n,i)}}function ed(e,t){const n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function td(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(dt(n,t))return;e.uniform2iv(this.addr,t),ut(n,t)}}function nd(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(dt(n,t))return;e.uniform3iv(this.addr,t),ut(n,t)}}function id(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(dt(n,t))return;e.uniform4iv(this.addr,t),ut(n,t)}}function rd(e,t){const n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function sd(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(dt(n,t))return;e.uniform2uiv(this.addr,t),ut(n,t)}}function ad(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(dt(n,t))return;e.uniform3uiv(this.addr,t),ut(n,t)}}function od(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(dt(n,t))return;e.uniform4uiv(this.addr,t),ut(n,t)}}function ld(e,t,n){const i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(e.uniform1i(this.addr,r),i[0]=r);let s;this.type===e.SAMPLER_2D_SHADOW?(Jr.compareFunction=n.isReversedDepthBuffer()?518:515,s=Jr):s=_a,n.setTexture2D(t||s,r)}function cd(e,t,n){const i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(e.uniform1i(this.addr,r),i[0]=r),n.setTexture3D(t||xa,r)}function dd(e,t,n){const i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(e.uniform1i(this.addr,r),i[0]=r),n.setTextureCube(t||Sa,r)}function ud(e,t,n){const i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(e.uniform1i(this.addr,r),i[0]=r),n.setTexture2DArray(t||ya,r)}function hd(e){switch(e){case 5126:return qc;case 35664:return Yc;case 35665:return jc;case 35666:return Kc;case 35674:return Zc;case 35675:return Jc;case 35676:return Qc;case 5124:case 35670:return ed;case 35667:case 35671:return td;case 35668:case 35672:return nd;case 35669:case 35673:return id;case 5125:return rd;case 36294:return sd;case 36295:return ad;case 36296:return od;case 35678:case 36198:case 36298:case 36306:case 35682:return ld;case 35679:case 36299:case 36307:return cd;case 35680:case 36300:case 36308:case 36293:return dd;case 36289:case 36303:case 36311:case 36292:return ud}}function fd(e,t){e.uniform1fv(this.addr,t)}function pd(e,t){const n=Kn(t,this.size,2);e.uniform2fv(this.addr,n)}function md(e,t){const n=Kn(t,this.size,3);e.uniform3fv(this.addr,n)}function gd(e,t){const n=Kn(t,this.size,4);e.uniform4fv(this.addr,n)}function vd(e,t){const n=Kn(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function _d(e,t){const n=Kn(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function yd(e,t){const n=Kn(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function xd(e,t){e.uniform1iv(this.addr,t)}function Sd(e,t){e.uniform2iv(this.addr,t)}function bd(e,t){e.uniform3iv(this.addr,t)}function Md(e,t){e.uniform4iv(this.addr,t)}function Ed(e,t){e.uniform1uiv(this.addr,t)}function Td(e,t){e.uniform2uiv(this.addr,t)}function Ad(e,t){e.uniform3uiv(this.addr,t)}function wd(e,t){e.uniform4uiv(this.addr,t)}function Cd(e,t,n){const i=this.cache,r=t.length,s=er(n,r);dt(i,s)||(e.uniform1iv(this.addr,s),ut(i,s));let a;this.type===e.SAMPLER_2D_SHADOW?a=Jr:a=_a;for(let o=0;o!==r;++o)n.setTexture2D(t[o]||a,s[o])}function Rd(e,t,n){const i=this.cache,r=t.length,s=er(n,r);dt(i,s)||(e.uniform1iv(this.addr,s),ut(i,s));for(let a=0;a!==r;++a)n.setTexture3D(t[a]||xa,s[a])}function Pd(e,t,n){const i=this.cache,r=t.length,s=er(n,r);dt(i,s)||(e.uniform1iv(this.addr,s),ut(i,s));for(let a=0;a!==r;++a)n.setTextureCube(t[a]||Sa,s[a])}function Id(e,t,n){const i=this.cache,r=t.length,s=er(n,r);dt(i,s)||(e.uniform1iv(this.addr,s),ut(i,s));for(let a=0;a!==r;++a)n.setTexture2DArray(t[a]||ya,s[a])}function Ld(e){switch(e){case 5126:return fd;case 35664:return pd;case 35665:return md;case 35666:return gd;case 35674:return vd;case 35675:return _d;case 35676:return yd;case 5124:case 35670:return xd;case 35667:case 35671:return Sd;case 35668:case 35672:return bd;case 35669:case 35673:return Md;case 5125:return Ed;case 36294:return Td;case 36295:return Ad;case 36296:return wd;case 35678:case 36198:case 36298:case 36306:case 35682:return Cd;case 35679:case 36299:case 36307:return Rd;case 35680:case 36300:case 36308:case 36293:return Pd;case 36289:case 36303:case 36311:case 36292:return Id}}var Dd=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=hd(t.type)}},Nd=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Ld(t.type)}},Ud=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const i=this.seq;for(let r=0,s=i.length;r!==s;++r){const a=i[r];a.setValue(e,t[a.id],n)}}},Qr=/(\w+)(\])?(\[|\.)?/g;function wa(e,t){e.seq.push(t),e.map[t.id]=t}function Fd(e,t,n){const i=e.name,r=i.length;for(Qr.lastIndex=0;;){const s=Qr.exec(i),a=Qr.lastIndex;let o=s[1];const l=s[2]==="]",c=s[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===r){wa(n,c===void 0?new Dd(o,e,t):new Nd(o,e,t));break}else{let u=n.map[o];u===void 0&&(u=new Ud(o),wa(n,u)),n=u}}}var tr=class{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let s=0;s<n;++s){const a=e.getActiveUniform(t,s);Fd(a,e.getUniformLocation(t,a.name),this)}const i=[],r=[];for(const s of this.seq)s.type===e.SAMPLER_2D_SHADOW||s.type===e.SAMPLER_CUBE_SHADOW||s.type===e.SAMPLER_2D_ARRAY_SHADOW?i.push(s):r.push(s);i.length>0&&(this.seq=i.concat(r))}setValue(e,t,n,i){const r=this.map[t];r!==void 0&&r.setValue(e,n,i)}setOptional(e,t,n){const i=t[n];i!==void 0&&this.setValue(e,n,i)}static upload(e,t,n,i){for(let r=0,s=t.length;r!==s;++r){const a=t[r],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,i)}}static seqWithValue(e,t){const n=[];for(let i=0,r=e.length;i!==r;++i){const s=e[i];s.id in t&&n.push(s)}return n}};function Ca(e,t,n){const i=e.createShader(t);return e.shaderSource(i,n),e.compileShader(i),i}var Od=37297,Bd=0;function kd(e,t){const n=e.split(`
`),i=[],r=Math.max(t-6,0),s=Math.min(t+6,n.length);for(let a=r;a<s;a++){const o=a+1;i.push(`${o===t?">":" "} ${o}: ${n[a]}`)}return i.join(`
`)}var Ra=new Ne;function zd(e){He._getMatrix(Ra,He.workingColorSpace,e);const t=`mat3( ${Ra.elements.map(n=>n.toFixed(4))} )`;switch(He.getTransfer(e)){case wi:return[t,"LinearTransferOETF"];case Ci:return[t,"sRGBTransferOETF"];default:return Ee("WebGLProgram: Unsupported color space: ",e),[t,"LinearTransferOETF"]}}function Pa(e,t,n){const i=e.getShaderParameter(t,e.COMPILE_STATUS),r=(e.getShaderInfoLog(t)||"").trim();if(i&&r==="")return"";const s=/ERROR: 0:(\d+)/.exec(r);if(s){const a=parseInt(s[1]);return n.toUpperCase()+`

`+r+`

`+kd(e.getShaderSource(t),a)}else return r}function Vd(e,t){const n=zd(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,"}"].join(`
`)}var Hd={1:"Linear",2:"Reinhard",3:"Cineon",4:"ACESFilmic",6:"AgX",7:"Neutral",5:"Custom"};function Gd(e,t){const n=Hd[t];return n===void 0?(Ee("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+e+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+e+"( vec3 color ) { return "+n+"ToneMapping( color ); }"}var nr=new B;function Wd(){return He.getLuminanceCoefficients(nr),["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${nr.x.toFixed(4)}, ${nr.y.toFixed(4)}, ${nr.z.toFixed(4)} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Xd(e){return[e.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",e.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(xi).join(`
`)}function $d(e){const t=[];for(const n in e){const i=e[n];i!==!1&&t.push("#define "+n+" "+i)}return t.join(`
`)}function qd(e,t){const n={},i=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){const s=e.getActiveAttrib(t,r),a=s.name;let o=1;s.type===e.FLOAT_MAT2&&(o=2),s.type===e.FLOAT_MAT3&&(o=3),s.type===e.FLOAT_MAT4&&(o=4),n[a]={type:s.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function xi(e){return e!==""}function Ia(e,t){const n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function La(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var Yd=/^[ \t]*#include +<([\w\d./]+)>/gm;function es(e){return e.replace(Yd,Kd)}var jd=new Map;function Kd(e,t){let n=Ue[t];if(n===void 0){const i=jd.get(t);if(i!==void 0)n=Ue[i],Ee('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,i);else throw new Error("Can not resolve #include <"+t+">")}return es(n)}var Zd=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Da(e){return e.replace(Zd,Jd)}function Jd(e,t,n,i){let r="";for(let s=parseInt(t);s<parseInt(n);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function Na(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision==="highp"?t+=`
#define HIGH_PRECISION`:e.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:e.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}var Qd={1:"SHADOWMAP_TYPE_PCF",3:"SHADOWMAP_TYPE_VSM"};function eu(e){return Qd[e.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var tu={301:"ENVMAP_TYPE_CUBE",302:"ENVMAP_TYPE_CUBE",306:"ENVMAP_TYPE_CUBE_UV"};function nu(e){return e.envMap===!1?"ENVMAP_TYPE_CUBE":tu[e.envMapMode]||"ENVMAP_TYPE_CUBE"}var iu={302:"ENVMAP_MODE_REFRACTION"};function ru(e){return e.envMap===!1?"ENVMAP_MODE_REFLECTION":iu[e.envMapMode]||"ENVMAP_MODE_REFLECTION"}var su={0:"ENVMAP_BLENDING_MULTIPLY",1:"ENVMAP_BLENDING_MIX",2:"ENVMAP_BLENDING_ADD"};function au(e){return e.envMap===!1?"ENVMAP_BLENDING_NONE":su[e.combine]||"ENVMAP_BLENDING_NONE"}function ou(e){const t=e.envMapCubeUVHeight;if(t===null)return null;const n=Math.log2(t)-2,i=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,n),112)),texelHeight:i,maxMip:n}}function lu(e,t,n,i){const r=e.getContext(),s=n.defines;let a=n.vertexShader,o=n.fragmentShader;const l=eu(n),c=nu(n),u=ru(n),h=au(n),d=ou(n),f=Xd(n),g=$d(s),_=r.createProgram();let m,p,S=n.glslVersion?"#version "+n.glslVersion+`
`:"";n.isRawShaderMaterial?(m=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,g].filter(xi).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,g].filter(xi).join(`
`),p.length>0&&(p+=`
`)):(m=[Na(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,g,n.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",n.batching?"#define USE_BATCHING":"",n.batchingColor?"#define USE_BATCHING_COLOR":"",n.instancing?"#define USE_INSTANCING":"",n.instancingColor?"#define USE_INSTANCING_COLOR":"",n.instancingMorph?"#define USE_INSTANCING_MORPH":"",n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.map?"#define USE_MAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+u:"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.displacementMap?"#define USE_DISPLACEMENTMAP":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.mapUv?"#define MAP_UV "+n.mapUv:"",n.alphaMapUv?"#define ALPHAMAP_UV "+n.alphaMapUv:"",n.lightMapUv?"#define LIGHTMAP_UV "+n.lightMapUv:"",n.aoMapUv?"#define AOMAP_UV "+n.aoMapUv:"",n.emissiveMapUv?"#define EMISSIVEMAP_UV "+n.emissiveMapUv:"",n.bumpMapUv?"#define BUMPMAP_UV "+n.bumpMapUv:"",n.normalMapUv?"#define NORMALMAP_UV "+n.normalMapUv:"",n.displacementMapUv?"#define DISPLACEMENTMAP_UV "+n.displacementMapUv:"",n.metalnessMapUv?"#define METALNESSMAP_UV "+n.metalnessMapUv:"",n.roughnessMapUv?"#define ROUGHNESSMAP_UV "+n.roughnessMapUv:"",n.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+n.anisotropyMapUv:"",n.clearcoatMapUv?"#define CLEARCOATMAP_UV "+n.clearcoatMapUv:"",n.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+n.clearcoatNormalMapUv:"",n.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+n.clearcoatRoughnessMapUv:"",n.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+n.iridescenceMapUv:"",n.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+n.iridescenceThicknessMapUv:"",n.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+n.sheenColorMapUv:"",n.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+n.sheenRoughnessMapUv:"",n.specularMapUv?"#define SPECULARMAP_UV "+n.specularMapUv:"",n.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+n.specularColorMapUv:"",n.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+n.specularIntensityMapUv:"",n.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+n.transmissionMapUv:"",n.thicknessMapUv?"#define THICKNESSMAP_UV "+n.thicknessMapUv:"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexNormals?"#define HAS_NORMAL":"",n.vertexColors?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.flatShading?"#define FLAT_SHADED":"",n.skinning?"#define USE_SKINNING":"",n.morphTargets?"#define USE_MORPHTARGETS":"",n.morphNormals&&n.flatShading===!1?"#define USE_MORPHNORMALS":"",n.morphColors?"#define USE_MORPHCOLORS":"",n.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+n.morphTextureStride:"",n.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+n.morphTargetsCount:"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+l:"",n.sizeAttenuation?"#define USE_SIZEATTENUATION":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",n.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(xi).join(`
`),p=[Na(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,g,n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",n.map?"#define USE_MAP":"",n.matcap?"#define USE_MATCAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+c:"",n.envMap?"#define "+u:"",n.envMap?"#define "+h:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoat?"#define USE_CLEARCOAT":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.dispersion?"#define USE_DISPERSION":"",n.iridescence?"#define USE_IRIDESCENCE":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaTest?"#define USE_ALPHATEST":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.sheen?"#define USE_SHEEN":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors||n.instancingColor?"#define USE_COLOR":"",n.vertexAlphas||n.batchingColor?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.gradientMap?"#define USE_GRADIENTMAP":"",n.flatShading?"#define FLAT_SHADED":"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+l:"",n.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",n.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",n.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",n.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",n.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",n.toneMapping!==0?"#define TONE_MAPPING":"",n.toneMapping!==0?Ue.tonemapping_pars_fragment:"",n.toneMapping!==0?Gd("toneMapping",n.toneMapping):"",n.dithering?"#define DITHERING":"",n.opaque?"#define OPAQUE":"",Ue.colorspace_pars_fragment,Vd("linearToOutputTexel",n.outputColorSpace),Wd(),n.useDepthPacking?"#define DEPTH_PACKING "+n.depthPacking:"",`
`].filter(xi).join(`
`)),a=es(a),a=Ia(a,n),a=La(a,n),o=es(o),o=Ia(o,n),o=La(o,n),a=Da(a),o=Da(o),n.isRawShaderMaterial!==!0&&(S=`#version 300 es
`,m=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",n.glslVersion==="300 es"?"":"layout(location = 0) out highp vec4 pc_fragColor;",n.glslVersion==="300 es"?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const b=S+m+a,x=S+p+o,C=Ca(r,r.VERTEX_SHADER,b),A=Ca(r,r.FRAGMENT_SHADER,x);r.attachShader(_,C),r.attachShader(_,A),n.index0AttributeName!==void 0?r.bindAttribLocation(_,0,n.index0AttributeName):n.morphTargets===!0&&r.bindAttribLocation(_,0,"position"),r.linkProgram(_);function T(R){if(e.debug.checkShaderErrors){const H=r.getProgramInfoLog(_)||"",X=r.getShaderInfoLog(C)||"",z=r.getShaderInfoLog(A)||"",k=H.trim(),G=X.trim(),I=z.trim();let Y=!0,J=!0;if(r.getProgramParameter(_,r.LINK_STATUS)===!1)if(Y=!1,typeof e.debug.onShaderError=="function")e.debug.onShaderError(r,_,C,A);else{const te=Pa(r,C,"vertex"),fe=Pa(r,A,"fragment");we("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(_,r.VALIDATE_STATUS)+`

Material Name: `+R.name+`
Material Type: `+R.type+`

Program Info Log: `+k+`
`+te+`
`+fe)}else k!==""?Ee("WebGLProgram: Program Info Log:",k):(G===""||I==="")&&(J=!1);J&&(R.diagnostics={runnable:Y,programLog:k,vertexShader:{log:G,prefix:m},fragmentShader:{log:I,prefix:p}})}r.deleteShader(C),r.deleteShader(A),v=new tr(r,_),E=qd(r,_)}let v;this.getUniforms=function(){return v===void 0&&T(this),v};let E;this.getAttributes=function(){return E===void 0&&T(this),E};let W=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return W===!1&&(W=r.getProgramParameter(_,Od)),W},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(_),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=Bd++,this.cacheKey=t,this.usedTimes=1,this.program=_,this.vertexShader=C,this.fragmentShader=A,this}var cu=0,du=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,i=this._getShaderStage(t),r=this._getShaderStage(n),s=this._getShaderCacheForMaterial(e);return s.has(i)===!1&&(s.add(i),i.usedTimes++),s.has(r)===!1&&(s.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new uu(e),t.set(e,n)),n}},uu=class{constructor(e){this.id=cu++,this.code=e,this.usedTimes=0}};function hu(e){return e===1030||e===37490||e===36285}function fu(e,t,n,i,r,s){const a=new Os,o=new du,l=new Set,c=[],u=new Map,h=i.logarithmicDepthBuffer;let d=i.precision;const f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(v){return l.add(v),v===0?"uv":`uv${v}`}function _(v,E,W,R,H,X){const z=R.fog,k=H.geometry,G=v.isMeshStandardMaterial||v.isMeshLambertMaterial||v.isMeshPhongMaterial?R.environment:null,I=v.isMeshStandardMaterial||v.isMeshLambertMaterial&&!v.envMap||v.isMeshPhongMaterial&&!v.envMap,Y=t.get(v.envMap||G,I),J=Y&&Y.mapping===306?Y.image.height:null,te=f[v.type];v.precision!==null&&(d=i.getMaxPrecision(v.precision),d!==v.precision&&Ee("WebGLProgram.getParameters:",v.precision,"not supported, using",d,"instead."));const fe=k.morphAttributes.position||k.morphAttributes.normal||k.morphAttributes.color,me=fe!==void 0?fe.length:0;let Le=0;k.morphAttributes.position!==void 0&&(Le=1),k.morphAttributes.normal!==void 0&&(Le=2),k.morphAttributes.color!==void 0&&(Le=3);let Fe,$,ie,ye;if(te){const Re=$t[te];Fe=Re.vertexShader,$=Re.fragmentShader}else Fe=v.vertexShader,$=v.fragmentShader,o.update(v),ie=o.getVertexShaderID(v),ye=o.getFragmentShaderID(v);const ue=e.getRenderTarget(),Te=e.state.buffers.depth.getReversed(),Ie=H.isInstancedMesh===!0,Ce=H.isBatchedMesh===!0,Ye=!!v.map,Ve=!!v.matcap,ht=!!Y,st=!!v.aoMap,wt=!!v.lightMap,vt=!!v.bumpMap,ct=!!v.normalMap,L=!!v.displacementMap,bt=!!v.emissiveMap,Ge=!!v.metalnessMap,Xe=!!v.roughnessMap,de=v.anisotropy>0,tt=v.clearcoat>0,be=v.dispersion>0,w=v.iridescence>0,y=v.sheen>0,U=v.transmission>0,j=de&&!!v.anisotropyMap,Z=tt&&!!v.clearcoatMap,ne=tt&&!!v.clearcoatNormalMap,le=tt&&!!v.clearcoatRoughnessMap,D=w&&!!v.iridescenceMap,se=w&&!!v.iridescenceThicknessMap,ce=y&&!!v.sheenColorMap,pe=y&&!!v.sheenRoughnessMap,K=!!v.specularMap,Ae=!!v.specularColorMap,De=!!v.specularIntensityMap,We=U&&!!v.transmissionMap,Oe=U&&!!v.thicknessMap,P=!!v.gradientMap,q=!!v.alphaMap,ee=v.alphaTest>0,ae=!!v.alphaHash,xe=!!v.extensions;let Q=0;v.toneMapped&&(ue===null||ue.isXRRenderTarget===!0)&&(Q=e.toneMapping);const Se={shaderID:te,shaderType:v.type,shaderName:v.name,vertexShader:Fe,fragmentShader:$,defines:v.defines,customVertexShaderID:ie,customFragmentShaderID:ye,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:d,batching:Ce,batchingColor:Ce&&H._colorsTexture!==null,instancing:Ie,instancingColor:Ie&&H.instanceColor!==null,instancingMorph:Ie&&H.morphTexture!==null,outputColorSpace:ue===null?e.outputColorSpace:ue.isXRRenderTarget===!0?ue.texture.colorSpace:He.workingColorSpace,alphaToCoverage:!!v.alphaToCoverage,map:Ye,matcap:Ve,envMap:ht,envMapMode:ht&&Y.mapping,envMapCubeUVHeight:J,aoMap:st,lightMap:wt,bumpMap:vt,normalMap:ct,displacementMap:L,emissiveMap:bt,normalMapObjectSpace:ct&&v.normalMapType===1,normalMapTangentSpace:ct&&v.normalMapType===0,packedNormalMap:ct&&v.normalMapType===0&&hu(v.normalMap.format),metalnessMap:Ge,roughnessMap:Xe,anisotropy:de,anisotropyMap:j,clearcoat:tt,clearcoatMap:Z,clearcoatNormalMap:ne,clearcoatRoughnessMap:le,dispersion:be,iridescence:w,iridescenceMap:D,iridescenceThicknessMap:se,sheen:y,sheenColorMap:ce,sheenRoughnessMap:pe,specularMap:K,specularColorMap:Ae,specularIntensityMap:De,transmission:U,transmissionMap:We,thicknessMap:Oe,gradientMap:P,opaque:v.transparent===!1&&v.blending===1&&v.alphaToCoverage===!1,alphaMap:q,alphaTest:ee,alphaHash:ae,combine:v.combine,mapUv:Ye&&g(v.map.channel),aoMapUv:st&&g(v.aoMap.channel),lightMapUv:wt&&g(v.lightMap.channel),bumpMapUv:vt&&g(v.bumpMap.channel),normalMapUv:ct&&g(v.normalMap.channel),displacementMapUv:L&&g(v.displacementMap.channel),emissiveMapUv:bt&&g(v.emissiveMap.channel),metalnessMapUv:Ge&&g(v.metalnessMap.channel),roughnessMapUv:Xe&&g(v.roughnessMap.channel),anisotropyMapUv:j&&g(v.anisotropyMap.channel),clearcoatMapUv:Z&&g(v.clearcoatMap.channel),clearcoatNormalMapUv:ne&&g(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:le&&g(v.clearcoatRoughnessMap.channel),iridescenceMapUv:D&&g(v.iridescenceMap.channel),iridescenceThicknessMapUv:se&&g(v.iridescenceThicknessMap.channel),sheenColorMapUv:ce&&g(v.sheenColorMap.channel),sheenRoughnessMapUv:pe&&g(v.sheenRoughnessMap.channel),specularMapUv:K&&g(v.specularMap.channel),specularColorMapUv:Ae&&g(v.specularColorMap.channel),specularIntensityMapUv:De&&g(v.specularIntensityMap.channel),transmissionMapUv:We&&g(v.transmissionMap.channel),thicknessMapUv:Oe&&g(v.thicknessMap.channel),alphaMapUv:q&&g(v.alphaMap.channel),vertexTangents:!!k.attributes.tangent&&(ct||de),vertexNormals:!!k.attributes.normal,vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!k.attributes.color&&k.attributes.color.itemSize===4,pointsUvs:H.isPoints===!0&&!!k.attributes.uv&&(Ye||q),fog:!!z,useFog:v.fog===!0,fogExp2:!!z&&z.isFogExp2,flatShading:v.wireframe===!1&&(v.flatShading===!0||k.attributes.normal===void 0&&ct===!1&&(v.isMeshLambertMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isMeshPhysicalMaterial)),sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:h,reversedDepthBuffer:Te,skinning:H.isSkinnedMesh===!0,morphTargets:k.morphAttributes.position!==void 0,morphNormals:k.morphAttributes.normal!==void 0,morphColors:k.morphAttributes.color!==void 0,morphTargetsCount:me,morphTextureStride:Le,numDirLights:E.directional.length,numPointLights:E.point.length,numSpotLights:E.spot.length,numSpotLightMaps:E.spotLightMap.length,numRectAreaLights:E.rectArea.length,numHemiLights:E.hemi.length,numDirLightShadows:E.directionalShadowMap.length,numPointLightShadows:E.pointShadowMap.length,numSpotLightShadows:E.spotShadowMap.length,numSpotLightShadowsWithMaps:E.numSpotLightShadowsWithMaps,numLightProbes:E.numLightProbes,numLightProbeGrids:X.length,numClippingPlanes:s.numPlanes,numClipIntersection:s.numIntersection,dithering:v.dithering,shadowMapEnabled:e.shadowMap.enabled&&W.length>0,shadowMapType:e.shadowMap.type,toneMapping:Q,decodeVideoTexture:Ye&&v.map.isVideoTexture===!0&&He.getTransfer(v.map.colorSpace)==="srgb",decodeVideoTextureEmissive:bt&&v.emissiveMap.isVideoTexture===!0&&He.getTransfer(v.emissiveMap.colorSpace)==="srgb",premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===2,flipSided:v.side===1,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:xe&&v.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(xe&&v.extensions.multiDraw===!0||Ce)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return Se.vertexUv1s=l.has(1),Se.vertexUv2s=l.has(2),Se.vertexUv3s=l.has(3),l.clear(),Se}function m(v){const E=[];if(v.shaderID?E.push(v.shaderID):(E.push(v.customVertexShaderID),E.push(v.customFragmentShaderID)),v.defines!==void 0)for(const W in v.defines)E.push(W),E.push(v.defines[W]);return v.isRawShaderMaterial===!1&&(p(E,v),S(E,v),E.push(e.outputColorSpace)),E.push(v.customProgramCacheKey),E.join()}function p(v,E){v.push(E.precision),v.push(E.outputColorSpace),v.push(E.envMapMode),v.push(E.envMapCubeUVHeight),v.push(E.mapUv),v.push(E.alphaMapUv),v.push(E.lightMapUv),v.push(E.aoMapUv),v.push(E.bumpMapUv),v.push(E.normalMapUv),v.push(E.displacementMapUv),v.push(E.emissiveMapUv),v.push(E.metalnessMapUv),v.push(E.roughnessMapUv),v.push(E.anisotropyMapUv),v.push(E.clearcoatMapUv),v.push(E.clearcoatNormalMapUv),v.push(E.clearcoatRoughnessMapUv),v.push(E.iridescenceMapUv),v.push(E.iridescenceThicknessMapUv),v.push(E.sheenColorMapUv),v.push(E.sheenRoughnessMapUv),v.push(E.specularMapUv),v.push(E.specularColorMapUv),v.push(E.specularIntensityMapUv),v.push(E.transmissionMapUv),v.push(E.thicknessMapUv),v.push(E.combine),v.push(E.fogExp2),v.push(E.sizeAttenuation),v.push(E.morphTargetsCount),v.push(E.morphAttributeCount),v.push(E.numDirLights),v.push(E.numPointLights),v.push(E.numSpotLights),v.push(E.numSpotLightMaps),v.push(E.numHemiLights),v.push(E.numRectAreaLights),v.push(E.numDirLightShadows),v.push(E.numPointLightShadows),v.push(E.numSpotLightShadows),v.push(E.numSpotLightShadowsWithMaps),v.push(E.numLightProbes),v.push(E.shadowMapType),v.push(E.toneMapping),v.push(E.numClippingPlanes),v.push(E.numClipIntersection),v.push(E.depthPacking)}function S(v,E){a.disableAll(),E.instancing&&a.enable(0),E.instancingColor&&a.enable(1),E.instancingMorph&&a.enable(2),E.matcap&&a.enable(3),E.envMap&&a.enable(4),E.normalMapObjectSpace&&a.enable(5),E.normalMapTangentSpace&&a.enable(6),E.clearcoat&&a.enable(7),E.iridescence&&a.enable(8),E.alphaTest&&a.enable(9),E.vertexColors&&a.enable(10),E.vertexAlphas&&a.enable(11),E.vertexUv1s&&a.enable(12),E.vertexUv2s&&a.enable(13),E.vertexUv3s&&a.enable(14),E.vertexTangents&&a.enable(15),E.anisotropy&&a.enable(16),E.alphaHash&&a.enable(17),E.batching&&a.enable(18),E.dispersion&&a.enable(19),E.batchingColor&&a.enable(20),E.gradientMap&&a.enable(21),E.packedNormalMap&&a.enable(22),E.vertexNormals&&a.enable(23),v.push(a.mask),a.disableAll(),E.fog&&a.enable(0),E.useFog&&a.enable(1),E.flatShading&&a.enable(2),E.logarithmicDepthBuffer&&a.enable(3),E.reversedDepthBuffer&&a.enable(4),E.skinning&&a.enable(5),E.morphTargets&&a.enable(6),E.morphNormals&&a.enable(7),E.morphColors&&a.enable(8),E.premultipliedAlpha&&a.enable(9),E.shadowMapEnabled&&a.enable(10),E.doubleSided&&a.enable(11),E.flipSided&&a.enable(12),E.useDepthPacking&&a.enable(13),E.dithering&&a.enable(14),E.transmission&&a.enable(15),E.sheen&&a.enable(16),E.opaque&&a.enable(17),E.pointsUvs&&a.enable(18),E.decodeVideoTexture&&a.enable(19),E.decodeVideoTextureEmissive&&a.enable(20),E.alphaToCoverage&&a.enable(21),E.numLightProbeGrids>0&&a.enable(22),v.push(a.mask)}function b(v){const E=f[v.type];let W;if(E){const R=$t[E];W=jl.clone(R.uniforms)}else W=v.uniforms;return W}function x(v,E){let W=u.get(E);return W!==void 0?++W.usedTimes:(W=new lu(e,E,v,r),c.push(W),u.set(E,W)),W}function C(v){if(--v.usedTimes===0){const E=c.indexOf(v);c[E]=c[c.length-1],c.pop(),u.delete(v.cacheKey),v.destroy()}}function A(v){o.remove(v)}function T(){o.dispose()}return{getParameters:_,getProgramCacheKey:m,getUniforms:b,acquireProgram:x,releaseProgram:C,releaseShaderCache:A,programs:c,dispose:T}}function pu(){let e=new WeakMap;function t(a){return e.has(a)}function n(a){let o=e.get(a);return o===void 0&&(o={},e.set(a,o)),o}function i(a){e.delete(a)}function r(a,o,l){e.get(a)[o]=l}function s(){e=new WeakMap}return{has:t,get:n,remove:i,update:r,dispose:s}}function mu(e,t){return e.groupOrder!==t.groupOrder?e.groupOrder-t.groupOrder:e.renderOrder!==t.renderOrder?e.renderOrder-t.renderOrder:e.material.id!==t.material.id?e.material.id-t.material.id:e.materialVariant!==t.materialVariant?e.materialVariant-t.materialVariant:e.z!==t.z?e.z-t.z:e.id-t.id}function Ua(e,t){return e.groupOrder!==t.groupOrder?e.groupOrder-t.groupOrder:e.renderOrder!==t.renderOrder?e.renderOrder-t.renderOrder:e.z!==t.z?t.z-e.z:e.id-t.id}function Fa(){const e=[];let t=0;const n=[],i=[],r=[];function s(){t=0,n.length=0,i.length=0,r.length=0}function a(d){let f=0;return d.isInstancedMesh&&(f+=2),d.isSkinnedMesh&&(f+=1),f}function o(d,f,g,_,m,p){let S=e[t];return S===void 0?(S={id:d.id,object:d,geometry:f,material:g,materialVariant:a(d),groupOrder:_,renderOrder:d.renderOrder,z:m,group:p},e[t]=S):(S.id=d.id,S.object=d,S.geometry=f,S.material=g,S.materialVariant=a(d),S.groupOrder=_,S.renderOrder=d.renderOrder,S.z=m,S.group=p),t++,S}function l(d,f,g,_,m,p){const S=o(d,f,g,_,m,p);g.transmission>0?i.push(S):g.transparent===!0?r.push(S):n.push(S)}function c(d,f,g,_,m,p){const S=o(d,f,g,_,m,p);g.transmission>0?i.unshift(S):g.transparent===!0?r.unshift(S):n.unshift(S)}function u(d,f){n.length>1&&n.sort(d||mu),i.length>1&&i.sort(f||Ua),r.length>1&&r.sort(f||Ua)}function h(){for(let d=t,f=e.length;d<f;d++){const g=e[d];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:n,transmissive:i,transparent:r,init:s,push:l,unshift:c,finish:h,sort:u}}function gu(){let e=new WeakMap;function t(i,r){const s=e.get(i);let a;return s===void 0?(a=new Fa,e.set(i,[a])):r>=s.length?(a=new Fa,s.push(a)):a=s[r],a}function n(){e=new WeakMap}return{get:t,dispose:n}}function vu(){const e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case"DirectionalLight":n={direction:new B,color:new je};break;case"SpotLight":n={position:new B,direction:new B,color:new je,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":n={position:new B,color:new je,distance:0,decay:0};break;case"HemisphereLight":n={direction:new B,skyColor:new je,groundColor:new je};break;case"RectAreaLight":n={color:new je,position:new B,halfWidth:new B,halfHeight:new B};break}return e[t.id]=n,n}}}function _u(){const e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case"DirectionalLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ze};break;case"SpotLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ze};break;case"PointLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ze,shadowCameraNear:1,shadowCameraFar:1e3};break}return e[t.id]=n,n}}}var yu=0;function xu(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+(t.map?1:0)-(e.map?1:0)}function Su(e){const t=new vu,n=_u(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new B);const r=new B,s=new ft,a=new ft;function o(c){let u=0,h=0,d=0;for(let E=0;E<9;E++)i.probe[E].set(0,0,0);let f=0,g=0,_=0,m=0,p=0,S=0,b=0,x=0,C=0,A=0,T=0;c.sort(xu);for(let E=0,W=c.length;E<W;E++){const R=c[E],H=R.color,X=R.intensity,z=R.distance;let k=null;if(R.shadow&&R.shadow.map&&(R.shadow.map.texture.format===1030?k=R.shadow.map.texture:k=R.shadow.map.depthTexture||R.shadow.map.texture),R.isAmbientLight)u+=H.r*X,h+=H.g*X,d+=H.b*X;else if(R.isLightProbe){for(let G=0;G<9;G++)i.probe[G].addScaledVector(R.sh.coefficients[G],X);T++}else if(R.isDirectionalLight){const G=t.get(R);if(G.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){const I=R.shadow,Y=n.get(R);Y.shadowIntensity=I.intensity,Y.shadowBias=I.bias,Y.shadowNormalBias=I.normalBias,Y.shadowRadius=I.radius,Y.shadowMapSize=I.mapSize,i.directionalShadow[f]=Y,i.directionalShadowMap[f]=k,i.directionalShadowMatrix[f]=R.shadow.matrix,S++}i.directional[f]=G,f++}else if(R.isSpotLight){const G=t.get(R);G.position.setFromMatrixPosition(R.matrixWorld),G.color.copy(H).multiplyScalar(X),G.distance=z,G.coneCos=Math.cos(R.angle),G.penumbraCos=Math.cos(R.angle*(1-R.penumbra)),G.decay=R.decay,i.spot[_]=G;const I=R.shadow;if(R.map&&(i.spotLightMap[C]=R.map,C++,I.updateMatrices(R),R.castShadow&&A++),i.spotLightMatrix[_]=I.matrix,R.castShadow){const Y=n.get(R);Y.shadowIntensity=I.intensity,Y.shadowBias=I.bias,Y.shadowNormalBias=I.normalBias,Y.shadowRadius=I.radius,Y.shadowMapSize=I.mapSize,i.spotShadow[_]=Y,i.spotShadowMap[_]=k,x++}_++}else if(R.isRectAreaLight){const G=t.get(R);G.color.copy(H).multiplyScalar(X),G.halfWidth.set(R.width*.5,0,0),G.halfHeight.set(0,R.height*.5,0),i.rectArea[m]=G,m++}else if(R.isPointLight){const G=t.get(R);if(G.color.copy(R.color).multiplyScalar(R.intensity),G.distance=R.distance,G.decay=R.decay,R.castShadow){const I=R.shadow,Y=n.get(R);Y.shadowIntensity=I.intensity,Y.shadowBias=I.bias,Y.shadowNormalBias=I.normalBias,Y.shadowRadius=I.radius,Y.shadowMapSize=I.mapSize,Y.shadowCameraNear=I.camera.near,Y.shadowCameraFar=I.camera.far,i.pointShadow[g]=Y,i.pointShadowMap[g]=k,i.pointShadowMatrix[g]=R.shadow.matrix,b++}i.point[g]=G,g++}else if(R.isHemisphereLight){const G=t.get(R);G.skyColor.copy(R.color).multiplyScalar(X),G.groundColor.copy(R.groundColor).multiplyScalar(X),i.hemi[p]=G,p++}}m>0&&(e.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=oe.LTC_FLOAT_1,i.rectAreaLTC2=oe.LTC_FLOAT_2):(i.rectAreaLTC1=oe.LTC_HALF_1,i.rectAreaLTC2=oe.LTC_HALF_2)),i.ambient[0]=u,i.ambient[1]=h,i.ambient[2]=d;const v=i.hash;(v.directionalLength!==f||v.pointLength!==g||v.spotLength!==_||v.rectAreaLength!==m||v.hemiLength!==p||v.numDirectionalShadows!==S||v.numPointShadows!==b||v.numSpotShadows!==x||v.numSpotMaps!==C||v.numLightProbes!==T)&&(i.directional.length=f,i.spot.length=_,i.rectArea.length=m,i.point.length=g,i.hemi.length=p,i.directionalShadow.length=S,i.directionalShadowMap.length=S,i.pointShadow.length=b,i.pointShadowMap.length=b,i.spotShadow.length=x,i.spotShadowMap.length=x,i.directionalShadowMatrix.length=S,i.pointShadowMatrix.length=b,i.spotLightMatrix.length=x+C-A,i.spotLightMap.length=C,i.numSpotLightShadowsWithMaps=A,i.numLightProbes=T,v.directionalLength=f,v.pointLength=g,v.spotLength=_,v.rectAreaLength=m,v.hemiLength=p,v.numDirectionalShadows=S,v.numPointShadows=b,v.numSpotShadows=x,v.numSpotMaps=C,v.numLightProbes=T,i.version=yu++)}function l(c,u){let h=0,d=0,f=0,g=0,_=0;const m=u.matrixWorldInverse;for(let p=0,S=c.length;p<S;p++){const b=c[p];if(b.isDirectionalLight){const x=i.directional[h];x.direction.setFromMatrixPosition(b.matrixWorld),r.setFromMatrixPosition(b.target.matrixWorld),x.direction.sub(r),x.direction.transformDirection(m),h++}else if(b.isSpotLight){const x=i.spot[f];x.position.setFromMatrixPosition(b.matrixWorld),x.position.applyMatrix4(m),x.direction.setFromMatrixPosition(b.matrixWorld),r.setFromMatrixPosition(b.target.matrixWorld),x.direction.sub(r),x.direction.transformDirection(m),f++}else if(b.isRectAreaLight){const x=i.rectArea[g];x.position.setFromMatrixPosition(b.matrixWorld),x.position.applyMatrix4(m),a.identity(),s.copy(b.matrixWorld),s.premultiply(m),a.extractRotation(s),x.halfWidth.set(b.width*.5,0,0),x.halfHeight.set(0,b.height*.5,0),x.halfWidth.applyMatrix4(a),x.halfHeight.applyMatrix4(a),g++}else if(b.isPointLight){const x=i.point[d];x.position.setFromMatrixPosition(b.matrixWorld),x.position.applyMatrix4(m),d++}else if(b.isHemisphereLight){const x=i.hemi[_];x.direction.setFromMatrixPosition(b.matrixWorld),x.direction.transformDirection(m),_++}}}return{setup:o,setupView:l,state:i}}function Oa(e){const t=new Su(e),n=[],i=[],r=[];function s(d){h.camera=d,n.length=0,i.length=0,r.length=0}function a(d){n.push(d)}function o(d){i.push(d)}function l(d){r.push(d)}function c(){t.setup(n)}function u(d){t.setupView(n,d)}const h={lightsArray:n,shadowsArray:i,lightProbeGridArray:r,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:s,state:h,setupLights:c,setupLightsView:u,pushLight:a,pushShadow:o,pushLightProbeGrid:l}}function bu(e){let t=new WeakMap;function n(r,s=0){const a=t.get(r);let o;return a===void 0?(o=new Oa(e),t.set(r,[o])):s>=a.length?(o=new Oa(e),a.push(o)):o=a[s],o}function i(){t=new WeakMap}return{get:n,dispose:i}}var Mu=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Eu=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Tu=[new B(1,0,0),new B(-1,0,0),new B(0,1,0),new B(0,-1,0),new B(0,0,1),new B(0,0,-1)],Au=[new B(0,-1,0),new B(0,-1,0),new B(0,0,1),new B(0,0,-1),new B(0,-1,0),new B(0,-1,0)],Ba=new ft,Si=new B,ts=new B;function wu(e,t,n){let i=new Ks;const r=new Ze,s=new Ze,a=new ot,o=new Ql,l=new ec,c={},u=n.maxTextureSize,h={0:1,1:0,2:2},d=new Gt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ze},radius:{value:4}},vertexShader:Mu,fragmentShader:Eu}),f=d.clone();f.defines.HORIZONTAL_PASS=1;const g=new cn;g.setAttribute("position",new Vt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const _=new Ht(g,d),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let p=this.type;this.render=function(A,T,v){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||A.length===0)return;this.type===2&&(Ee("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=1);const E=e.getRenderTarget(),W=e.getActiveCubeFace(),R=e.getActiveMipmapLevel(),H=e.state;H.setBlending(0),H.buffers.depth.getReversed()===!0?H.buffers.color.setClear(0,0,0,0):H.buffers.color.setClear(1,1,1,1),H.buffers.depth.setTest(!0),H.setScissorTest(!1);const X=p!==this.type;X&&T.traverse(function(z){z.material&&(Array.isArray(z.material)?z.material.forEach(k=>k.needsUpdate=!0):z.material.needsUpdate=!0)});for(let z=0,k=A.length;z<k;z++){const G=A[z],I=G.shadow;if(I===void 0){Ee("WebGLShadowMap:",G,"has no shadow.");continue}if(I.autoUpdate===!1&&I.needsUpdate===!1)continue;r.copy(I.mapSize);const Y=I.getFrameExtents();r.multiply(Y),s.copy(I.mapSize),(r.x>u||r.y>u)&&(r.x>u&&(s.x=Math.floor(u/Y.x),r.x=s.x*Y.x,I.mapSize.x=s.x),r.y>u&&(s.y=Math.floor(u/Y.y),r.y=s.y*Y.y,I.mapSize.y=s.y));const J=e.state.buffers.depth.getReversed();if(I.camera._reversedDepth=J,I.map===null||X===!0){if(I.map!==null&&(I.map.depthTexture!==null&&(I.map.depthTexture.dispose(),I.map.depthTexture=null),I.map.dispose()),this.type===3){if(G.isPointLight){Ee("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}I.map=new zt(r.x,r.y,{format:Ti,type:yn,minFilter:Et,magFilter:Et,generateMipmaps:!1}),I.map.texture.name=G.name+".shadowMap",I.map.depthTexture=new Wn(r.x,r.y,Ei),I.map.depthTexture.name=G.name+".shadowMapDepth",I.map.depthTexture.format=ri,I.map.depthTexture.compareFunction=null,I.map.depthTexture.minFilter=yt,I.map.depthTexture.magFilter=yt}else G.isPointLight?(I.map=new va(r.x),I.map.depthTexture=new $l(r.x,_n)):(I.map=new zt(r.x,r.y),I.map.depthTexture=new Wn(r.x,r.y,_n)),I.map.depthTexture.name=G.name+".shadowMap",I.map.depthTexture.format=ri,this.type===1?(I.map.depthTexture.compareFunction=J?518:515,I.map.depthTexture.minFilter=Et,I.map.depthTexture.magFilter=Et):(I.map.depthTexture.compareFunction=null,I.map.depthTexture.minFilter=yt,I.map.depthTexture.magFilter=yt);I.camera.updateProjectionMatrix()}const te=I.map.isWebGLCubeRenderTarget?6:1;for(let fe=0;fe<te;fe++){if(I.map.isWebGLCubeRenderTarget)e.setRenderTarget(I.map,fe),e.clear();else{fe===0&&(e.setRenderTarget(I.map),e.clear());const me=I.getViewport(fe);a.set(s.x*me.x,s.y*me.y,s.x*me.z,s.y*me.w),H.viewport(a)}if(G.isPointLight){const me=I.camera,Le=I.matrix,Fe=G.distance||me.far;Fe!==me.far&&(me.far=Fe,me.updateProjectionMatrix()),Si.setFromMatrixPosition(G.matrixWorld),me.position.copy(Si),ts.copy(me.position),ts.add(Tu[fe]),me.up.copy(Au[fe]),me.lookAt(ts),me.updateMatrixWorld(),Le.makeTranslation(-Si.x,-Si.y,-Si.z),Ba.multiplyMatrices(me.projectionMatrix,me.matrixWorldInverse),I._frustum.setFromProjectionMatrix(Ba,me.coordinateSystem,me.reversedDepth)}else I.updateMatrices(G);i=I.getFrustum(),x(T,v,I.camera,G,this.type)}I.isPointLightShadow!==!0&&this.type===3&&S(I,v),I.needsUpdate=!1}p=this.type,m.needsUpdate=!1,e.setRenderTarget(E,W,R)};function S(A,T){const v=t.update(_);d.defines.VSM_SAMPLES!==A.blurSamples&&(d.defines.VSM_SAMPLES=A.blurSamples,f.defines.VSM_SAMPLES=A.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),A.mapPass===null&&(A.mapPass=new zt(r.x,r.y,{format:Ti,type:yn})),d.uniforms.shadow_pass.value=A.map.depthTexture,d.uniforms.resolution.value=A.mapSize,d.uniforms.radius.value=A.radius,e.setRenderTarget(A.mapPass),e.clear(),e.renderBufferDirect(T,null,v,d,_,null),f.uniforms.shadow_pass.value=A.mapPass.texture,f.uniforms.resolution.value=A.mapSize,f.uniforms.radius.value=A.radius,e.setRenderTarget(A.map),e.clear(),e.renderBufferDirect(T,null,v,f,_,null)}function b(A,T,v,E){let W=null;const R=v.isPointLight===!0?A.customDistanceMaterial:A.customDepthMaterial;if(R!==void 0)W=R;else if(W=v.isPointLight===!0?l:o,e.localClippingEnabled&&T.clipShadows===!0&&Array.isArray(T.clippingPlanes)&&T.clippingPlanes.length!==0||T.displacementMap&&T.displacementScale!==0||T.alphaMap&&T.alphaTest>0||T.map&&T.alphaTest>0||T.alphaToCoverage===!0){const H=W.uuid,X=T.uuid;let z=c[H];z===void 0&&(z={},c[H]=z);let k=z[X];k===void 0&&(k=W.clone(),z[X]=k,T.addEventListener("dispose",C)),W=k}if(W.visible=T.visible,W.wireframe=T.wireframe,E===3?W.side=T.shadowSide!==null?T.shadowSide:T.side:W.side=T.shadowSide!==null?T.shadowSide:h[T.side],W.alphaMap=T.alphaMap,W.alphaTest=T.alphaToCoverage===!0?.5:T.alphaTest,W.map=T.map,W.clipShadows=T.clipShadows,W.clippingPlanes=T.clippingPlanes,W.clipIntersection=T.clipIntersection,W.displacementMap=T.displacementMap,W.displacementScale=T.displacementScale,W.displacementBias=T.displacementBias,W.wireframeLinewidth=T.wireframeLinewidth,W.linewidth=T.linewidth,v.isPointLight===!0&&W.isMeshDistanceMaterial===!0){const H=e.properties.get(W);H.light=v}return W}function x(A,T,v,E,W){if(A.visible===!1)return;if(A.layers.test(T.layers)&&(A.isMesh||A.isLine||A.isPoints)&&(A.castShadow||A.receiveShadow&&W===3)&&(!A.frustumCulled||i.intersectsObject(A))){A.modelViewMatrix.multiplyMatrices(v.matrixWorldInverse,A.matrixWorld);const H=t.update(A),X=A.material;if(Array.isArray(X)){const z=H.groups;for(let k=0,G=z.length;k<G;k++){const I=z[k],Y=X[I.materialIndex];if(Y&&Y.visible){const J=b(A,Y,E,W);A.onBeforeShadow(e,A,T,v,H,J,I),e.renderBufferDirect(v,null,H,J,A,I),A.onAfterShadow(e,A,T,v,H,J,I)}}}else if(X.visible){const z=b(A,X,E,W);A.onBeforeShadow(e,A,T,v,H,z,null),e.renderBufferDirect(v,null,H,z,A,null),A.onAfterShadow(e,A,T,v,H,z,null)}}const R=A.children;for(let H=0,X=R.length;H<X;H++)x(R[H],T,v,E,W)}function C(A){A.target.removeEventListener("dispose",C);for(const T in c){const v=c[T],E=A.target.uuid;E in v&&(v[E].dispose(),delete v[E])}}}function Cu(e,t){function n(){let P=!1;const q=new ot;let ee=null;const ae=new ot(0,0,0,0);return{setMask:function(xe){ee!==xe&&!P&&(e.colorMask(xe,xe,xe,xe),ee=xe)},setLocked:function(xe){P=xe},setClear:function(xe,Q,Se,Re,Mt){Mt===!0&&(xe*=Re,Q*=Re,Se*=Re),q.set(xe,Q,Se,Re),ae.equals(q)===!1&&(e.clearColor(xe,Q,Se,Re),ae.copy(q))},reset:function(){P=!1,ee=null,ae.set(-1,0,0,0)}}}function i(){let P=!1,q=!1,ee=null,ae=null,xe=null;return{setReversed:function(Q){if(q!==Q){const Se=t.get("EXT_clip_control");Q?Se.clipControlEXT(Se.LOWER_LEFT_EXT,Se.ZERO_TO_ONE_EXT):Se.clipControlEXT(Se.LOWER_LEFT_EXT,Se.NEGATIVE_ONE_TO_ONE_EXT),q=Q;const Re=xe;xe=null,this.setClear(Re)}},getReversed:function(){return q},setTest:function(Q){Q?ue(e.DEPTH_TEST):Te(e.DEPTH_TEST)},setMask:function(Q){ee!==Q&&!P&&(e.depthMask(Q),ee=Q)},setFunc:function(Q){if(q&&(Q=sl[Q]),ae!==Q){switch(Q){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}ae=Q}},setLocked:function(Q){P=Q},setClear:function(Q){xe!==Q&&(xe=Q,q&&(Q=1-Q),e.clearDepth(Q))},reset:function(){P=!1,ee=null,ae=null,xe=null,q=!1}}}function r(){let P=!1,q=null,ee=null,ae=null,xe=null,Q=null,Se=null,Re=null,Mt=null;return{setTest:function(et){P||(et?ue(e.STENCIL_TEST):Te(e.STENCIL_TEST))},setMask:function(et){q!==et&&!P&&(e.stencilMask(et),q=et)},setFunc:function(et,Yt,Bt){(ee!==et||ae!==Yt||xe!==Bt)&&(e.stencilFunc(et,Yt,Bt),ee=et,ae=Yt,xe=Bt)},setOp:function(et,Yt,Bt){(Q!==et||Se!==Yt||Re!==Bt)&&(e.stencilOp(et,Yt,Bt),Q=et,Se=Yt,Re=Bt)},setLocked:function(et){P=et},setClear:function(et){Mt!==et&&(e.clearStencil(et),Mt=et)},reset:function(){P=!1,q=null,ee=null,ae=null,xe=null,Q=null,Se=null,Re=null,Mt=null}}}const s=new n,a=new i,o=new r,l=new WeakMap,c=new WeakMap;let u={},h={},d={},f=new WeakMap,g=[],_=null,m=!1,p=null,S=null,b=null,x=null,C=null,A=null,T=null,v=new je(0,0,0),E=0,W=!1,R=null,H=null,X=null,z=null,k=null;const G=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let I=!1,Y=0;const J=e.getParameter(e.VERSION);J.indexOf("WebGL")!==-1?(Y=parseFloat(/^WebGL (\d)/.exec(J)[1]),I=Y>=1):J.indexOf("OpenGL ES")!==-1&&(Y=parseFloat(/^OpenGL ES (\d)/.exec(J)[1]),I=Y>=2);let te=null,fe={};const me=e.getParameter(e.SCISSOR_BOX),Le=e.getParameter(e.VIEWPORT),Fe=new ot().fromArray(me),$=new ot().fromArray(Le);function ie(P,q,ee,ae){const xe=new Uint8Array(4),Q=e.createTexture();e.bindTexture(P,Q),e.texParameteri(P,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(P,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let Se=0;Se<ee;Se++)P===e.TEXTURE_3D||P===e.TEXTURE_2D_ARRAY?e.texImage3D(q,0,e.RGBA,1,1,ae,0,e.RGBA,e.UNSIGNED_BYTE,xe):e.texImage2D(q+Se,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,xe);return Q}const ye={};ye[e.TEXTURE_2D]=ie(e.TEXTURE_2D,e.TEXTURE_2D,1),ye[e.TEXTURE_CUBE_MAP]=ie(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),ye[e.TEXTURE_2D_ARRAY]=ie(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),ye[e.TEXTURE_3D]=ie(e.TEXTURE_3D,e.TEXTURE_3D,1,1),s.setClear(0,0,0,1),a.setClear(1),o.setClear(0),ue(e.DEPTH_TEST),a.setFunc(3),vt(!1),ct(1),ue(e.CULL_FACE),st(0);function ue(P){u[P]!==!0&&(e.enable(P),u[P]=!0)}function Te(P){u[P]!==!1&&(e.disable(P),u[P]=!1)}function Ie(P,q){return d[P]!==q?(e.bindFramebuffer(P,q),d[P]=q,P===e.DRAW_FRAMEBUFFER&&(d[e.FRAMEBUFFER]=q),P===e.FRAMEBUFFER&&(d[e.DRAW_FRAMEBUFFER]=q),!0):!1}function Ce(P,q){let ee=g,ae=!1;if(P){ee=f.get(q),ee===void 0&&(ee=[],f.set(q,ee));const xe=P.textures;if(ee.length!==xe.length||ee[0]!==e.COLOR_ATTACHMENT0){for(let Q=0,Se=xe.length;Q<Se;Q++)ee[Q]=e.COLOR_ATTACHMENT0+Q;ee.length=xe.length,ae=!0}}else ee[0]!==e.BACK&&(ee[0]=e.BACK,ae=!0);ae&&e.drawBuffers(ee)}function Ye(P){return _!==P?(e.useProgram(P),_=P,!0):!1}const Ve={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};Ve[103]=e.MIN,Ve[104]=e.MAX;const ht={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function st(P,q,ee,ae,xe,Q,Se,Re,Mt,et){if(P===0){m===!0&&(Te(e.BLEND),m=!1);return}if(m===!1&&(ue(e.BLEND),m=!0),P!==5){if(P!==p||et!==W){if((S!==100||C!==100)&&(e.blendEquation(e.FUNC_ADD),S=100,C=100),et)switch(P){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:we("WebGLState: Invalid blending: ",P);break}else switch(P){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:we("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case 4:we("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:we("WebGLState: Invalid blending: ",P);break}b=null,x=null,A=null,T=null,v.set(0,0,0),E=0,p=P,W=et}return}xe=xe||q,Q=Q||ee,Se=Se||ae,(q!==S||xe!==C)&&(e.blendEquationSeparate(Ve[q],Ve[xe]),S=q,C=xe),(ee!==b||ae!==x||Q!==A||Se!==T)&&(e.blendFuncSeparate(ht[ee],ht[ae],ht[Q],ht[Se]),b=ee,x=ae,A=Q,T=Se),(Re.equals(v)===!1||Mt!==E)&&(e.blendColor(Re.r,Re.g,Re.b,Mt),v.copy(Re),E=Mt),p=P,W=!1}function wt(P,q){P.side===2?Te(e.CULL_FACE):ue(e.CULL_FACE);let ee=P.side===1;q&&(ee=!ee),vt(ee),P.blending===1&&P.transparent===!1?st(0):st(P.blending,P.blendEquation,P.blendSrc,P.blendDst,P.blendEquationAlpha,P.blendSrcAlpha,P.blendDstAlpha,P.blendColor,P.blendAlpha,P.premultipliedAlpha),a.setFunc(P.depthFunc),a.setTest(P.depthTest),a.setMask(P.depthWrite),s.setMask(P.colorWrite);const ae=P.stencilWrite;o.setTest(ae),ae&&(o.setMask(P.stencilWriteMask),o.setFunc(P.stencilFunc,P.stencilRef,P.stencilFuncMask),o.setOp(P.stencilFail,P.stencilZFail,P.stencilZPass)),bt(P.polygonOffset,P.polygonOffsetFactor,P.polygonOffsetUnits),P.alphaToCoverage===!0?ue(e.SAMPLE_ALPHA_TO_COVERAGE):Te(e.SAMPLE_ALPHA_TO_COVERAGE)}function vt(P){R!==P&&(P?e.frontFace(e.CW):e.frontFace(e.CCW),R=P)}function ct(P){P!==0?(ue(e.CULL_FACE),P!==H&&(P===1?e.cullFace(e.BACK):P===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))):Te(e.CULL_FACE),H=P}function L(P){P!==X&&(I&&e.lineWidth(P),X=P)}function bt(P,q,ee){P?(ue(e.POLYGON_OFFSET_FILL),(z!==q||k!==ee)&&(z=q,k=ee,a.getReversed()&&(q=-q),e.polygonOffset(q,ee))):Te(e.POLYGON_OFFSET_FILL)}function Ge(P){P?ue(e.SCISSOR_TEST):Te(e.SCISSOR_TEST)}function Xe(P){P===void 0&&(P=e.TEXTURE0+G-1),te!==P&&(e.activeTexture(P),te=P)}function de(P,q,ee){ee===void 0&&(te===null?ee=e.TEXTURE0+G-1:ee=te);let ae=fe[ee];ae===void 0&&(ae={type:void 0,texture:void 0},fe[ee]=ae),(ae.type!==P||ae.texture!==q)&&(te!==ee&&(e.activeTexture(ee),te=ee),e.bindTexture(P,q||ye[P]),ae.type=P,ae.texture=q)}function tt(){const P=fe[te];P!==void 0&&P.type!==void 0&&(e.bindTexture(P.type,null),P.type=void 0,P.texture=void 0)}function be(){try{e.compressedTexImage2D(...arguments)}catch(P){we("WebGLState:",P)}}function w(){try{e.compressedTexImage3D(...arguments)}catch(P){we("WebGLState:",P)}}function y(){try{e.texSubImage2D(...arguments)}catch(P){we("WebGLState:",P)}}function U(){try{e.texSubImage3D(...arguments)}catch(P){we("WebGLState:",P)}}function j(){try{e.compressedTexSubImage2D(...arguments)}catch(P){we("WebGLState:",P)}}function Z(){try{e.compressedTexSubImage3D(...arguments)}catch(P){we("WebGLState:",P)}}function ne(){try{e.texStorage2D(...arguments)}catch(P){we("WebGLState:",P)}}function le(){try{e.texStorage3D(...arguments)}catch(P){we("WebGLState:",P)}}function D(){try{e.texImage2D(...arguments)}catch(P){we("WebGLState:",P)}}function se(){try{e.texImage3D(...arguments)}catch(P){we("WebGLState:",P)}}function ce(P){return h[P]!==void 0?h[P]:e.getParameter(P)}function pe(P,q){h[P]!==q&&(e.pixelStorei(P,q),h[P]=q)}function K(P){Fe.equals(P)===!1&&(e.scissor(P.x,P.y,P.z,P.w),Fe.copy(P))}function Ae(P){$.equals(P)===!1&&(e.viewport(P.x,P.y,P.z,P.w),$.copy(P))}function De(P,q){let ee=c.get(q);ee===void 0&&(ee=new WeakMap,c.set(q,ee));let ae=ee.get(P);ae===void 0&&(ae=e.getUniformBlockIndex(q,P.name),ee.set(P,ae))}function We(P,q){const ee=c.get(q).get(P);l.get(q)!==ee&&(e.uniformBlockBinding(q,ee,P.__bindingPointIndex),l.set(q,ee))}function Oe(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),a.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),u={},h={},te=null,fe={},d={},f=new WeakMap,g=[],_=null,m=!1,p=null,S=null,b=null,x=null,C=null,A=null,T=null,v=new je(0,0,0),E=0,W=!1,R=null,H=null,X=null,z=null,k=null,Fe.set(0,0,e.canvas.width,e.canvas.height),$.set(0,0,e.canvas.width,e.canvas.height),s.reset(),a.reset(),o.reset()}return{buffers:{color:s,depth:a,stencil:o},enable:ue,disable:Te,bindFramebuffer:Ie,drawBuffers:Ce,useProgram:Ye,setBlending:st,setMaterial:wt,setFlipSided:vt,setCullFace:ct,setLineWidth:L,setPolygonOffset:bt,setScissorTest:Ge,activeTexture:Xe,bindTexture:de,unbindTexture:tt,compressedTexImage2D:be,compressedTexImage3D:w,texImage2D:D,texImage3D:se,pixelStorei:pe,getParameter:ce,updateUBOMapping:De,uniformBlockBinding:We,texStorage2D:ne,texStorage3D:le,texSubImage2D:y,texSubImage3D:U,compressedTexSubImage2D:j,compressedTexSubImage3D:Z,scissor:K,viewport:Ae,reset:Oe}}function Ru(e,t,n,i,r,s,a){const o=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Ze,u=new WeakMap,h=new Set;let d;const f=new WeakMap;let g=!1;try{g=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function _(w,y){return g?new OffscreenCanvas(w,y):si("canvas")}function m(w,y,U){let j=1;const Z=be(w);if((Z.width>U||Z.height>U)&&(j=U/Math.max(Z.width,Z.height)),j<1)if(typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&w instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&w instanceof ImageBitmap||typeof VideoFrame<"u"&&w instanceof VideoFrame){const ne=Math.floor(j*Z.width),le=Math.floor(j*Z.height);d===void 0&&(d=_(ne,le));const D=y?_(ne,le):d;return D.width=ne,D.height=le,D.getContext("2d").drawImage(w,0,0,ne,le),Ee("WebGLRenderer: Texture has been resized from ("+Z.width+"x"+Z.height+") to ("+ne+"x"+le+")."),D}else return"data"in w&&Ee("WebGLRenderer: Image in DataTexture is too big ("+Z.width+"x"+Z.height+")."),w;return w}function p(w){return w.generateMipmaps}function S(w){e.generateMipmap(w)}function b(w){return w.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:w.isWebGL3DRenderTarget?e.TEXTURE_3D:w.isWebGLArrayRenderTarget||w.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function x(w,y,U,j,Z,ne=!1){if(w!==null){if(e[w]!==void 0)return e[w];Ee("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+w+"'")}let le;j&&(le=t.get("EXT_texture_norm16"),le||Ee("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let D=y;if(y===e.RED&&(U===e.FLOAT&&(D=e.R32F),U===e.HALF_FLOAT&&(D=e.R16F),U===e.UNSIGNED_BYTE&&(D=e.R8),U===e.UNSIGNED_SHORT&&le&&(D=le.R16_EXT),U===e.SHORT&&le&&(D=le.R16_SNORM_EXT)),y===e.RED_INTEGER&&(U===e.UNSIGNED_BYTE&&(D=e.R8UI),U===e.UNSIGNED_SHORT&&(D=e.R16UI),U===e.UNSIGNED_INT&&(D=e.R32UI),U===e.BYTE&&(D=e.R8I),U===e.SHORT&&(D=e.R16I),U===e.INT&&(D=e.R32I)),y===e.RG&&(U===e.FLOAT&&(D=e.RG32F),U===e.HALF_FLOAT&&(D=e.RG16F),U===e.UNSIGNED_BYTE&&(D=e.RG8),U===e.UNSIGNED_SHORT&&le&&(D=le.RG16_EXT),U===e.SHORT&&le&&(D=le.RG16_SNORM_EXT)),y===e.RG_INTEGER&&(U===e.UNSIGNED_BYTE&&(D=e.RG8UI),U===e.UNSIGNED_SHORT&&(D=e.RG16UI),U===e.UNSIGNED_INT&&(D=e.RG32UI),U===e.BYTE&&(D=e.RG8I),U===e.SHORT&&(D=e.RG16I),U===e.INT&&(D=e.RG32I)),y===e.RGB_INTEGER&&(U===e.UNSIGNED_BYTE&&(D=e.RGB8UI),U===e.UNSIGNED_SHORT&&(D=e.RGB16UI),U===e.UNSIGNED_INT&&(D=e.RGB32UI),U===e.BYTE&&(D=e.RGB8I),U===e.SHORT&&(D=e.RGB16I),U===e.INT&&(D=e.RGB32I)),y===e.RGBA_INTEGER&&(U===e.UNSIGNED_BYTE&&(D=e.RGBA8UI),U===e.UNSIGNED_SHORT&&(D=e.RGBA16UI),U===e.UNSIGNED_INT&&(D=e.RGBA32UI),U===e.BYTE&&(D=e.RGBA8I),U===e.SHORT&&(D=e.RGBA16I),U===e.INT&&(D=e.RGBA32I)),y===e.RGB&&(U===e.UNSIGNED_SHORT&&le&&(D=le.RGB16_EXT),U===e.SHORT&&le&&(D=le.RGB16_SNORM_EXT),U===e.UNSIGNED_INT_5_9_9_9_REV&&(D=e.RGB9_E5),U===e.UNSIGNED_INT_10F_11F_11F_REV&&(D=e.R11F_G11F_B10F)),y===e.RGBA){const se=ne?wi:He.getTransfer(Z);U===e.FLOAT&&(D=e.RGBA32F),U===e.HALF_FLOAT&&(D=e.RGBA16F),U===e.UNSIGNED_BYTE&&(D=se==="srgb"?e.SRGB8_ALPHA8:e.RGBA8),U===e.UNSIGNED_SHORT&&le&&(D=le.RGBA16_EXT),U===e.SHORT&&le&&(D=le.RGBA16_SNORM_EXT),U===e.UNSIGNED_SHORT_4_4_4_4&&(D=e.RGBA4),U===e.UNSIGNED_SHORT_5_5_5_1&&(D=e.RGB5_A1)}return(D===e.R16F||D===e.R32F||D===e.RG16F||D===e.RG32F||D===e.RGBA16F||D===e.RGBA32F)&&t.get("EXT_color_buffer_float"),D}function C(w,y){let U;return w?y===null||y===1014||y===1020?U=e.DEPTH24_STENCIL8:y===1015?U=e.DEPTH32F_STENCIL8:y===1012&&(U=e.DEPTH24_STENCIL8,Ee("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):y===null||y===1014||y===1020?U=e.DEPTH_COMPONENT24:y===1015?U=e.DEPTH_COMPONENT32F:y===1012&&(U=e.DEPTH_COMPONENT16),U}function A(w,y){return p(w)===!0||w.isFramebufferTexture&&w.minFilter!==1003&&w.minFilter!==1006?Math.log2(Math.max(y.width,y.height))+1:w.mipmaps!==void 0&&w.mipmaps.length>0?w.mipmaps.length:w.isCompressedTexture&&Array.isArray(w.image)?y.mipmaps.length:1}function T(w){const y=w.target;y.removeEventListener("dispose",T),E(y),y.isVideoTexture&&u.delete(y),y.isHTMLTexture&&h.delete(y)}function v(w){const y=w.target;y.removeEventListener("dispose",v),R(y)}function E(w){const y=i.get(w);if(y.__webglInit===void 0)return;const U=w.source,j=f.get(U);if(j){const Z=j[y.__cacheKey];Z.usedTimes--,Z.usedTimes===0&&W(w),Object.keys(j).length===0&&f.delete(U)}i.remove(w)}function W(w){const y=i.get(w);e.deleteTexture(y.__webglTexture);const U=w.source,j=f.get(U);delete j[y.__cacheKey],a.memory.textures--}function R(w){const y=i.get(w);if(w.depthTexture&&(w.depthTexture.dispose(),i.remove(w.depthTexture)),w.isWebGLCubeRenderTarget)for(let j=0;j<6;j++){if(Array.isArray(y.__webglFramebuffer[j]))for(let Z=0;Z<y.__webglFramebuffer[j].length;Z++)e.deleteFramebuffer(y.__webglFramebuffer[j][Z]);else e.deleteFramebuffer(y.__webglFramebuffer[j]);y.__webglDepthbuffer&&e.deleteRenderbuffer(y.__webglDepthbuffer[j])}else{if(Array.isArray(y.__webglFramebuffer))for(let j=0;j<y.__webglFramebuffer.length;j++)e.deleteFramebuffer(y.__webglFramebuffer[j]);else e.deleteFramebuffer(y.__webglFramebuffer);if(y.__webglDepthbuffer&&e.deleteRenderbuffer(y.__webglDepthbuffer),y.__webglMultisampledFramebuffer&&e.deleteFramebuffer(y.__webglMultisampledFramebuffer),y.__webglColorRenderbuffer)for(let j=0;j<y.__webglColorRenderbuffer.length;j++)y.__webglColorRenderbuffer[j]&&e.deleteRenderbuffer(y.__webglColorRenderbuffer[j]);y.__webglDepthRenderbuffer&&e.deleteRenderbuffer(y.__webglDepthRenderbuffer)}const U=w.textures;for(let j=0,Z=U.length;j<Z;j++){const ne=i.get(U[j]);ne.__webglTexture&&(e.deleteTexture(ne.__webglTexture),a.memory.textures--),i.remove(U[j])}i.remove(w)}let H=0;function X(){H=0}function z(){return H}function k(w){H=w}function G(){const w=H;return w>=r.maxTextures&&Ee("WebGLTextures: Trying to use "+w+" texture units while this GPU supports only "+r.maxTextures),H+=1,w}function I(w){const y=[];return y.push(w.wrapS),y.push(w.wrapT),y.push(w.wrapR||0),y.push(w.magFilter),y.push(w.minFilter),y.push(w.anisotropy),y.push(w.internalFormat),y.push(w.format),y.push(w.type),y.push(w.generateMipmaps),y.push(w.premultiplyAlpha),y.push(w.flipY),y.push(w.unpackAlignment),y.push(w.colorSpace),y.join()}function Y(w,y){const U=i.get(w);if(w.isVideoTexture&&de(w),w.isRenderTargetTexture===!1&&w.isExternalTexture!==!0&&w.version>0&&U.__version!==w.version){const j=w.image;if(j===null)Ee("WebGLRenderer: Texture marked for update but no image data found.");else if(j.complete===!1)Ee("WebGLRenderer: Texture marked for update but image is incomplete");else{Te(U,w,y);return}}else w.isExternalTexture&&(U.__webglTexture=w.sourceTexture?w.sourceTexture:null);n.bindTexture(e.TEXTURE_2D,U.__webglTexture,e.TEXTURE0+y)}function J(w,y){const U=i.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&U.__version!==w.version){Te(U,w,y);return}else w.isExternalTexture&&(U.__webglTexture=w.sourceTexture?w.sourceTexture:null);n.bindTexture(e.TEXTURE_2D_ARRAY,U.__webglTexture,e.TEXTURE0+y)}function te(w,y){const U=i.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&U.__version!==w.version){Te(U,w,y);return}n.bindTexture(e.TEXTURE_3D,U.__webglTexture,e.TEXTURE0+y)}function fe(w,y){const U=i.get(w);if(w.isCubeDepthTexture!==!0&&w.version>0&&U.__version!==w.version){Ie(U,w,y);return}n.bindTexture(e.TEXTURE_CUBE_MAP,U.__webglTexture,e.TEXTURE0+y)}const me={[cr]:e.REPEAT,[Kt]:e.CLAMP_TO_EDGE,[dr]:e.MIRRORED_REPEAT},Le={[yt]:e.NEAREST,[so]:e.NEAREST_MIPMAP_NEAREST,[ao]:e.NEAREST_MIPMAP_LINEAR,[Et]:e.LINEAR,[oo]:e.LINEAR_MIPMAP_NEAREST,[ur]:e.LINEAR_MIPMAP_LINEAR},Fe={512:e.NEVER,519:e.ALWAYS,513:e.LESS,515:e.LEQUAL,514:e.EQUAL,518:e.GEQUAL,516:e.GREATER,517:e.NOTEQUAL};function $(w,y){if(y.type===1015&&t.has("OES_texture_float_linear")===!1&&(y.magFilter===1006||y.magFilter===1007||y.magFilter===1005||y.magFilter===1008||y.minFilter===1006||y.minFilter===1007||y.minFilter===1005||y.minFilter===1008)&&Ee("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),e.texParameteri(w,e.TEXTURE_WRAP_S,me[y.wrapS]),e.texParameteri(w,e.TEXTURE_WRAP_T,me[y.wrapT]),(w===e.TEXTURE_3D||w===e.TEXTURE_2D_ARRAY)&&e.texParameteri(w,e.TEXTURE_WRAP_R,me[y.wrapR]),e.texParameteri(w,e.TEXTURE_MAG_FILTER,Le[y.magFilter]),e.texParameteri(w,e.TEXTURE_MIN_FILTER,Le[y.minFilter]),y.compareFunction&&(e.texParameteri(w,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(w,e.TEXTURE_COMPARE_FUNC,Fe[y.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(y.magFilter===1003||y.minFilter!==1005&&y.minFilter!==1008||y.type===1015&&t.has("OES_texture_float_linear")===!1)return;if(y.anisotropy>1||i.get(y).__currentAnisotropy){const U=t.get("EXT_texture_filter_anisotropic");e.texParameterf(w,U.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(y.anisotropy,r.getMaxAnisotropy())),i.get(y).__currentAnisotropy=y.anisotropy}}}function ie(w,y){let U=!1;w.__webglInit===void 0&&(w.__webglInit=!0,y.addEventListener("dispose",T));const j=y.source;let Z=f.get(j);Z===void 0&&(Z={},f.set(j,Z));const ne=I(y);if(ne!==w.__cacheKey){Z[ne]===void 0&&(Z[ne]={texture:e.createTexture(),usedTimes:0},a.memory.textures++,U=!0),Z[ne].usedTimes++;const le=Z[w.__cacheKey];le!==void 0&&(Z[w.__cacheKey].usedTimes--,le.usedTimes===0&&W(y)),w.__cacheKey=ne,w.__webglTexture=Z[ne].texture}return U}function ye(w,y,U){return Math.floor(Math.floor(w/U)/y)}function ue(w,y,U,j){const ne=w.updateRanges;if(ne.length===0)n.texSubImage2D(e.TEXTURE_2D,0,0,0,y.width,y.height,U,j,y.data);else{ne.sort((pe,K)=>pe.start-K.start);let le=0;for(let pe=1;pe<ne.length;pe++){const K=ne[le],Ae=ne[pe],De=K.start+K.count,We=ye(Ae.start,y.width,4),Oe=ye(K.start,y.width,4);Ae.start<=De+1&&We===Oe&&ye(Ae.start+Ae.count-1,y.width,4)===We?K.count=Math.max(K.count,Ae.start+Ae.count-K.start):(++le,ne[le]=Ae)}ne.length=le+1;const D=n.getParameter(e.UNPACK_ROW_LENGTH),se=n.getParameter(e.UNPACK_SKIP_PIXELS),ce=n.getParameter(e.UNPACK_SKIP_ROWS);n.pixelStorei(e.UNPACK_ROW_LENGTH,y.width);for(let pe=0,K=ne.length;pe<K;pe++){const Ae=ne[pe],De=Math.floor(Ae.start/4),We=Math.ceil(Ae.count/4),Oe=De%y.width,P=Math.floor(De/y.width),q=We,ee=1;n.pixelStorei(e.UNPACK_SKIP_PIXELS,Oe),n.pixelStorei(e.UNPACK_SKIP_ROWS,P),n.texSubImage2D(e.TEXTURE_2D,0,Oe,P,q,ee,U,j,y.data)}w.clearUpdateRanges(),n.pixelStorei(e.UNPACK_ROW_LENGTH,D),n.pixelStorei(e.UNPACK_SKIP_PIXELS,se),n.pixelStorei(e.UNPACK_SKIP_ROWS,ce)}}function Te(w,y,U){let j=e.TEXTURE_2D;(y.isDataArrayTexture||y.isCompressedArrayTexture)&&(j=e.TEXTURE_2D_ARRAY),y.isData3DTexture&&(j=e.TEXTURE_3D);const Z=ie(w,y),ne=y.source;n.bindTexture(j,w.__webglTexture,e.TEXTURE0+U);const le=i.get(ne);if(ne.version!==le.__version||Z===!0){if(n.activeTexture(e.TEXTURE0+U),!(typeof ImageBitmap<"u"&&y.image instanceof ImageBitmap)){const q=He.getPrimaries(He.workingColorSpace),ee=y.colorSpace===""?null:He.getPrimaries(y.colorSpace),ae=y.colorSpace===""||q===ee?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,y.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,ae)}n.pixelStorei(e.UNPACK_ALIGNMENT,y.unpackAlignment);let D=m(y.image,!1,r.maxTextureSize);D=tt(y,D);const se=s.convert(y.format,y.colorSpace),ce=s.convert(y.type);let pe=x(y.internalFormat,se,ce,y.normalized,y.colorSpace,y.isVideoTexture);$(j,y);let K;const Ae=y.mipmaps,De=y.isVideoTexture!==!0,We=le.__version===void 0||Z===!0,Oe=ne.dataReady,P=A(y,D);if(y.isDepthTexture)pe=C(y.format===ys,y.type),We&&(De?n.texStorage2D(e.TEXTURE_2D,1,pe,D.width,D.height):n.texImage2D(e.TEXTURE_2D,0,pe,D.width,D.height,0,se,ce,null));else if(y.isDataTexture)if(Ae.length>0){De&&We&&n.texStorage2D(e.TEXTURE_2D,P,pe,Ae[0].width,Ae[0].height);for(let q=0,ee=Ae.length;q<ee;q++)K=Ae[q],De?Oe&&n.texSubImage2D(e.TEXTURE_2D,q,0,0,K.width,K.height,se,ce,K.data):n.texImage2D(e.TEXTURE_2D,q,pe,K.width,K.height,0,se,ce,K.data);y.generateMipmaps=!1}else De?(We&&n.texStorage2D(e.TEXTURE_2D,P,pe,D.width,D.height),Oe&&ue(y,D,se,ce)):n.texImage2D(e.TEXTURE_2D,0,pe,D.width,D.height,0,se,ce,D.data);else if(y.isCompressedTexture)if(y.isCompressedArrayTexture){De&&We&&n.texStorage3D(e.TEXTURE_2D_ARRAY,P,pe,Ae[0].width,Ae[0].height,D.depth);for(let q=0,ee=Ae.length;q<ee;q++)if(K=Ae[q],y.format!==1023)if(se!==null)if(De){if(Oe)if(y.layerUpdates.size>0){const ae=la(K.width,K.height,y.format,y.type);for(const xe of y.layerUpdates){const Q=K.data.subarray(xe*ae/K.data.BYTES_PER_ELEMENT,(xe+1)*ae/K.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,q,0,0,xe,K.width,K.height,1,se,Q)}y.clearLayerUpdates()}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,q,0,0,0,K.width,K.height,D.depth,se,K.data)}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,q,pe,K.width,K.height,D.depth,0,K.data,0,0);else Ee("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else De?Oe&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,q,0,0,0,K.width,K.height,D.depth,se,ce,K.data):n.texImage3D(e.TEXTURE_2D_ARRAY,q,pe,K.width,K.height,D.depth,0,se,ce,K.data)}else{De&&We&&n.texStorage2D(e.TEXTURE_2D,P,pe,Ae[0].width,Ae[0].height);for(let q=0,ee=Ae.length;q<ee;q++)K=Ae[q],y.format!==1023?se!==null?De?Oe&&n.compressedTexSubImage2D(e.TEXTURE_2D,q,0,0,K.width,K.height,se,K.data):n.compressedTexImage2D(e.TEXTURE_2D,q,pe,K.width,K.height,0,K.data):Ee("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):De?Oe&&n.texSubImage2D(e.TEXTURE_2D,q,0,0,K.width,K.height,se,ce,K.data):n.texImage2D(e.TEXTURE_2D,q,pe,K.width,K.height,0,se,ce,K.data)}else if(y.isDataArrayTexture)if(De){if(We&&n.texStorage3D(e.TEXTURE_2D_ARRAY,P,pe,D.width,D.height,D.depth),Oe)if(y.layerUpdates.size>0){const q=la(D.width,D.height,y.format,y.type);for(const ee of y.layerUpdates){const ae=D.data.subarray(ee*q/D.data.BYTES_PER_ELEMENT,(ee+1)*q/D.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,ee,D.width,D.height,1,se,ce,ae)}y.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,D.width,D.height,D.depth,se,ce,D.data)}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,pe,D.width,D.height,D.depth,0,se,ce,D.data);else if(y.isData3DTexture)De?(We&&n.texStorage3D(e.TEXTURE_3D,P,pe,D.width,D.height,D.depth),Oe&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,D.width,D.height,D.depth,se,ce,D.data)):n.texImage3D(e.TEXTURE_3D,0,pe,D.width,D.height,D.depth,0,se,ce,D.data);else if(y.isFramebufferTexture){if(We)if(De)n.texStorage2D(e.TEXTURE_2D,P,pe,D.width,D.height);else{let q=D.width,ee=D.height;for(let ae=0;ae<P;ae++)n.texImage2D(e.TEXTURE_2D,ae,pe,q,ee,0,se,ce,null),q>>=1,ee>>=1}}else if(y.isHTMLTexture){if("texElementImage2D"in e){const q=e.canvas;if(q.hasAttribute("layoutsubtree")||q.setAttribute("layoutsubtree","true"),D.parentNode!==q){q.appendChild(D),h.add(y),q.onpaint=Se=>{const Re=Se.changedElements;for(const Mt of h)Re.includes(Mt.image)&&(Mt.needsUpdate=!0)},q.requestPaint();return}const ee=0,ae=e.RGBA,xe=e.RGBA,Q=e.UNSIGNED_BYTE;e.texElementImage2D(e.TEXTURE_2D,ee,ae,xe,Q,D),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)}}else if(Ae.length>0){if(De&&We){const q=be(Ae[0]);n.texStorage2D(e.TEXTURE_2D,P,pe,q.width,q.height)}for(let q=0,ee=Ae.length;q<ee;q++)K=Ae[q],De?Oe&&n.texSubImage2D(e.TEXTURE_2D,q,0,0,se,ce,K):n.texImage2D(e.TEXTURE_2D,q,pe,se,ce,K);y.generateMipmaps=!1}else if(De){if(We){const q=be(D);n.texStorage2D(e.TEXTURE_2D,P,pe,q.width,q.height)}Oe&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,se,ce,D)}else n.texImage2D(e.TEXTURE_2D,0,pe,se,ce,D);p(y)&&S(j),le.__version=ne.version,y.onUpdate&&y.onUpdate(y)}w.__version=y.version}function Ie(w,y,U){if(y.image.length!==6)return;const j=ie(w,y),Z=y.source;n.bindTexture(e.TEXTURE_CUBE_MAP,w.__webglTexture,e.TEXTURE0+U);const ne=i.get(Z);if(Z.version!==ne.__version||j===!0){n.activeTexture(e.TEXTURE0+U);const le=He.getPrimaries(He.workingColorSpace),D=y.colorSpace===""?null:He.getPrimaries(y.colorSpace),se=y.colorSpace===""||le===D?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,y.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),n.pixelStorei(e.UNPACK_ALIGNMENT,y.unpackAlignment),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,se);const ce=y.isCompressedTexture||y.image[0].isCompressedTexture,pe=y.image[0]&&y.image[0].isDataTexture,K=[];for(let Q=0;Q<6;Q++)!ce&&!pe?K[Q]=m(y.image[Q],!0,r.maxCubemapSize):K[Q]=pe?y.image[Q].image:y.image[Q],K[Q]=tt(y,K[Q]);const Ae=K[0],De=s.convert(y.format,y.colorSpace),We=s.convert(y.type),Oe=x(y.internalFormat,De,We,y.normalized,y.colorSpace),P=y.isVideoTexture!==!0,q=ne.__version===void 0||j===!0,ee=Z.dataReady;let ae=A(y,Ae);$(e.TEXTURE_CUBE_MAP,y);let xe;if(ce){P&&q&&n.texStorage2D(e.TEXTURE_CUBE_MAP,ae,Oe,Ae.width,Ae.height);for(let Q=0;Q<6;Q++){xe=K[Q].mipmaps;for(let Se=0;Se<xe.length;Se++){const Re=xe[Se];y.format!==1023?De!==null?P?ee&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Se,0,0,Re.width,Re.height,De,Re.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Se,Oe,Re.width,Re.height,0,Re.data):Ee("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):P?ee&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Se,0,0,Re.width,Re.height,De,We,Re.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Se,Oe,Re.width,Re.height,0,De,We,Re.data)}}}else{if(xe=y.mipmaps,P&&q){xe.length>0&&ae++;const Q=be(K[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,ae,Oe,Q.width,Q.height)}for(let Q=0;Q<6;Q++)if(pe){P?ee&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,0,0,K[Q].width,K[Q].height,De,We,K[Q].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,Oe,K[Q].width,K[Q].height,0,De,We,K[Q].data);for(let Se=0;Se<xe.length;Se++){const Re=xe[Se].image[Q].image;P?ee&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Se+1,0,0,Re.width,Re.height,De,We,Re.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Se+1,Oe,Re.width,Re.height,0,De,We,Re.data)}}else{P?ee&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,0,0,De,We,K[Q]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,Oe,De,We,K[Q]);for(let Se=0;Se<xe.length;Se++){const Re=xe[Se];P?ee&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Se+1,0,0,De,We,Re.image[Q]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Se+1,Oe,De,We,Re.image[Q])}}}p(y)&&S(e.TEXTURE_CUBE_MAP),ne.__version=Z.version,y.onUpdate&&y.onUpdate(y)}w.__version=y.version}function Ce(w,y,U,j,Z,ne){const le=s.convert(U.format,U.colorSpace),D=s.convert(U.type),se=x(U.internalFormat,le,D,U.normalized,U.colorSpace),ce=i.get(y),pe=i.get(U);if(pe.__renderTarget=y,!ce.__hasExternalTextures){const K=Math.max(1,y.width>>ne),Ae=Math.max(1,y.height>>ne);Z===e.TEXTURE_3D||Z===e.TEXTURE_2D_ARRAY?n.texImage3D(Z,ne,se,K,Ae,y.depth,0,le,D,null):n.texImage2D(Z,ne,se,K,Ae,0,le,D,null)}n.bindFramebuffer(e.FRAMEBUFFER,w),Xe(y)?o.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,j,Z,pe.__webglTexture,0,Ge(y)):(Z===e.TEXTURE_2D||Z>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&Z<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,j,Z,pe.__webglTexture,ne),n.bindFramebuffer(e.FRAMEBUFFER,null)}function Ye(w,y,U){if(e.bindRenderbuffer(e.RENDERBUFFER,w),y.depthBuffer){const j=y.depthTexture,Z=j&&j.isDepthTexture?j.type:null,ne=C(y.stencilBuffer,Z),le=y.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;Xe(y)?o.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,Ge(y),ne,y.width,y.height):U?e.renderbufferStorageMultisample(e.RENDERBUFFER,Ge(y),ne,y.width,y.height):e.renderbufferStorage(e.RENDERBUFFER,ne,y.width,y.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,le,e.RENDERBUFFER,w)}else{const j=y.textures;for(let Z=0;Z<j.length;Z++){const ne=j[Z],le=s.convert(ne.format,ne.colorSpace),D=s.convert(ne.type),se=x(ne.internalFormat,le,D,ne.normalized,ne.colorSpace);Xe(y)?o.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,Ge(y),se,y.width,y.height):U?e.renderbufferStorageMultisample(e.RENDERBUFFER,Ge(y),se,y.width,y.height):e.renderbufferStorage(e.RENDERBUFFER,se,y.width,y.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function Ve(w,y,U){const j=y.isWebGLCubeRenderTarget===!0;if(n.bindFramebuffer(e.FRAMEBUFFER,w),!(y.depthTexture&&y.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const Z=i.get(y.depthTexture);if(Z.__renderTarget=y,(!Z.__webglTexture||y.depthTexture.image.width!==y.width||y.depthTexture.image.height!==y.height)&&(y.depthTexture.image.width=y.width,y.depthTexture.image.height=y.height,y.depthTexture.needsUpdate=!0),j){if(Z.__webglInit===void 0&&(Z.__webglInit=!0,y.depthTexture.addEventListener("dispose",T)),Z.__webglTexture===void 0){Z.__webglTexture=e.createTexture(),n.bindTexture(e.TEXTURE_CUBE_MAP,Z.__webglTexture),$(e.TEXTURE_CUBE_MAP,y.depthTexture);const ce=s.convert(y.depthTexture.format),pe=s.convert(y.depthTexture.type);let K;y.depthTexture.format===1026?K=e.DEPTH_COMPONENT24:y.depthTexture.format===1027&&(K=e.DEPTH24_STENCIL8);for(let Ae=0;Ae<6;Ae++)e.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Ae,0,K,y.width,y.height,0,ce,pe,null)}}else Y(y.depthTexture,0);const ne=Z.__webglTexture,le=Ge(y),D=j?e.TEXTURE_CUBE_MAP_POSITIVE_X+U:e.TEXTURE_2D,se=y.depthTexture.format===1027?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;if(y.depthTexture.format===1026)Xe(y)?o.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,se,D,ne,0,le):e.framebufferTexture2D(e.FRAMEBUFFER,se,D,ne,0);else if(y.depthTexture.format===1027)Xe(y)?o.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,se,D,ne,0,le):e.framebufferTexture2D(e.FRAMEBUFFER,se,D,ne,0);else throw new Error("Unknown depthTexture format")}function ht(w){const y=i.get(w),U=w.isWebGLCubeRenderTarget===!0;if(y.__boundDepthTexture!==w.depthTexture){const j=w.depthTexture;if(y.__depthDisposeCallback&&y.__depthDisposeCallback(),j){const Z=()=>{delete y.__boundDepthTexture,delete y.__depthDisposeCallback,j.removeEventListener("dispose",Z)};j.addEventListener("dispose",Z),y.__depthDisposeCallback=Z}y.__boundDepthTexture=j}if(w.depthTexture&&!y.__autoAllocateDepthBuffer)if(U)for(let j=0;j<6;j++)Ve(y.__webglFramebuffer[j],w,j);else{const j=w.texture.mipmaps;j&&j.length>0?Ve(y.__webglFramebuffer[0],w,0):Ve(y.__webglFramebuffer,w,0)}else if(U){y.__webglDepthbuffer=[];for(let j=0;j<6;j++)if(n.bindFramebuffer(e.FRAMEBUFFER,y.__webglFramebuffer[j]),y.__webglDepthbuffer[j]===void 0)y.__webglDepthbuffer[j]=e.createRenderbuffer(),Ye(y.__webglDepthbuffer[j],w,!1);else{const Z=w.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,ne=y.__webglDepthbuffer[j];e.bindRenderbuffer(e.RENDERBUFFER,ne),e.framebufferRenderbuffer(e.FRAMEBUFFER,Z,e.RENDERBUFFER,ne)}}else{const j=w.texture.mipmaps;if(j&&j.length>0?n.bindFramebuffer(e.FRAMEBUFFER,y.__webglFramebuffer[0]):n.bindFramebuffer(e.FRAMEBUFFER,y.__webglFramebuffer),y.__webglDepthbuffer===void 0)y.__webglDepthbuffer=e.createRenderbuffer(),Ye(y.__webglDepthbuffer,w,!1);else{const Z=w.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,ne=y.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,ne),e.framebufferRenderbuffer(e.FRAMEBUFFER,Z,e.RENDERBUFFER,ne)}}n.bindFramebuffer(e.FRAMEBUFFER,null)}function st(w,y,U){const j=i.get(w);y!==void 0&&Ce(j.__webglFramebuffer,w,w.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),U!==void 0&&ht(w)}function wt(w){const y=w.texture,U=i.get(w),j=i.get(y);w.addEventListener("dispose",v);const Z=w.textures,ne=w.isWebGLCubeRenderTarget===!0,le=Z.length>1;if(le||(j.__webglTexture===void 0&&(j.__webglTexture=e.createTexture()),j.__version=y.version,a.memory.textures++),ne){U.__webglFramebuffer=[];for(let D=0;D<6;D++)if(y.mipmaps&&y.mipmaps.length>0){U.__webglFramebuffer[D]=[];for(let se=0;se<y.mipmaps.length;se++)U.__webglFramebuffer[D][se]=e.createFramebuffer()}else U.__webglFramebuffer[D]=e.createFramebuffer()}else{if(y.mipmaps&&y.mipmaps.length>0){U.__webglFramebuffer=[];for(let D=0;D<y.mipmaps.length;D++)U.__webglFramebuffer[D]=e.createFramebuffer()}else U.__webglFramebuffer=e.createFramebuffer();if(le)for(let D=0,se=Z.length;D<se;D++){const ce=i.get(Z[D]);ce.__webglTexture===void 0&&(ce.__webglTexture=e.createTexture(),a.memory.textures++)}if(w.samples>0&&Xe(w)===!1){U.__webglMultisampledFramebuffer=e.createFramebuffer(),U.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,U.__webglMultisampledFramebuffer);for(let D=0;D<Z.length;D++){const se=Z[D];U.__webglColorRenderbuffer[D]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,U.__webglColorRenderbuffer[D]);const ce=s.convert(se.format,se.colorSpace),pe=s.convert(se.type),K=x(se.internalFormat,ce,pe,se.normalized,se.colorSpace,w.isXRRenderTarget===!0),Ae=Ge(w);e.renderbufferStorageMultisample(e.RENDERBUFFER,Ae,K,w.width,w.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+D,e.RENDERBUFFER,U.__webglColorRenderbuffer[D])}e.bindRenderbuffer(e.RENDERBUFFER,null),w.depthBuffer&&(U.__webglDepthRenderbuffer=e.createRenderbuffer(),Ye(U.__webglDepthRenderbuffer,w,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(ne){n.bindTexture(e.TEXTURE_CUBE_MAP,j.__webglTexture),$(e.TEXTURE_CUBE_MAP,y);for(let D=0;D<6;D++)if(y.mipmaps&&y.mipmaps.length>0)for(let se=0;se<y.mipmaps.length;se++)Ce(U.__webglFramebuffer[D][se],w,y,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+D,se);else Ce(U.__webglFramebuffer[D],w,y,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+D,0);p(y)&&S(e.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(le){for(let D=0,se=Z.length;D<se;D++){const ce=Z[D],pe=i.get(ce);let K=e.TEXTURE_2D;(w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(K=w.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(K,pe.__webglTexture),$(K,ce),Ce(U.__webglFramebuffer,w,ce,e.COLOR_ATTACHMENT0+D,K,0),p(ce)&&S(K)}n.unbindTexture()}else{let D=e.TEXTURE_2D;if((w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(D=w.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(D,j.__webglTexture),$(D,y),y.mipmaps&&y.mipmaps.length>0)for(let se=0;se<y.mipmaps.length;se++)Ce(U.__webglFramebuffer[se],w,y,e.COLOR_ATTACHMENT0,D,se);else Ce(U.__webglFramebuffer,w,y,e.COLOR_ATTACHMENT0,D,0);p(y)&&S(D),n.unbindTexture()}w.depthBuffer&&ht(w)}function vt(w){const y=w.textures;for(let U=0,j=y.length;U<j;U++){const Z=y[U];if(p(Z)){const ne=b(w),le=i.get(Z).__webglTexture;n.bindTexture(ne,le),S(ne),n.unbindTexture()}}}const ct=[],L=[];function bt(w){if(w.samples>0){if(Xe(w)===!1){const y=w.textures,U=w.width,j=w.height;let Z=e.COLOR_BUFFER_BIT;const ne=w.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,le=i.get(w),D=y.length>1;if(D)for(let ce=0;ce<y.length;ce++)n.bindFramebuffer(e.FRAMEBUFFER,le.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+ce,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,le.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+ce,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,le.__webglMultisampledFramebuffer);const se=w.texture.mipmaps;se&&se.length>0?n.bindFramebuffer(e.DRAW_FRAMEBUFFER,le.__webglFramebuffer[0]):n.bindFramebuffer(e.DRAW_FRAMEBUFFER,le.__webglFramebuffer);for(let ce=0;ce<y.length;ce++){if(w.resolveDepthBuffer&&(w.depthBuffer&&(Z|=e.DEPTH_BUFFER_BIT),w.stencilBuffer&&w.resolveStencilBuffer&&(Z|=e.STENCIL_BUFFER_BIT)),D){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,le.__webglColorRenderbuffer[ce]);const pe=i.get(y[ce]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,pe,0)}e.blitFramebuffer(0,0,U,j,0,0,U,j,Z,e.NEAREST),l===!0&&(ct.length=0,L.length=0,ct.push(e.COLOR_ATTACHMENT0+ce),w.depthBuffer&&w.resolveDepthBuffer===!1&&(ct.push(ne),L.push(ne),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,L)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,ct))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),D)for(let ce=0;ce<y.length;ce++){n.bindFramebuffer(e.FRAMEBUFFER,le.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+ce,e.RENDERBUFFER,le.__webglColorRenderbuffer[ce]);const pe=i.get(y[ce]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,le.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+ce,e.TEXTURE_2D,pe,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,le.__webglMultisampledFramebuffer)}else if(w.depthBuffer&&w.resolveDepthBuffer===!1&&l){const y=w.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[y])}}}function Ge(w){return Math.min(r.maxSamples,w.samples)}function Xe(w){const y=i.get(w);return w.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&y.__useRenderToTexture!==!1}function de(w){const y=a.render.frame;u.get(w)!==y&&(u.set(w,y),w.update())}function tt(w,y){const U=w.colorSpace,j=w.format,Z=w.type;return w.isCompressedTexture===!0||w.isVideoTexture===!0||U!=="srgb-linear"&&U!==""&&(He.getTransfer(U)==="srgb"?(j!==1023||Z!==1009)&&Ee("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):we("WebGLTextures: Unsupported texture color space:",U)),y}function be(w){return typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement?(c.width=w.naturalWidth||w.width,c.height=w.naturalHeight||w.height):typeof VideoFrame<"u"&&w instanceof VideoFrame?(c.width=w.displayWidth,c.height=w.displayHeight):(c.width=w.width,c.height=w.height),c}this.allocateTextureUnit=G,this.resetTextureUnits=X,this.getTextureUnits=z,this.setTextureUnits=k,this.setTexture2D=Y,this.setTexture2DArray=J,this.setTexture3D=te,this.setTextureCube=fe,this.rebindTextures=st,this.setupRenderTarget=wt,this.updateRenderTargetMipmap=vt,this.updateMultisampleRenderTarget=bt,this.setupDepthRenderbuffer=ht,this.setupFrameBufferTexture=Ce,this.useMultisampledRTT=Xe,this.isReversedDepthBuffer=function(){return n.buffers.depth.getReversed()}}function Pu(e,t){function n(i,r=""){let s;const a=He.getTransfer(r);if(i===1009)return e.UNSIGNED_BYTE;if(i===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(i===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(i===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(i===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(i===1010)return e.BYTE;if(i===1011)return e.SHORT;if(i===1012)return e.UNSIGNED_SHORT;if(i===1013)return e.INT;if(i===1014)return e.UNSIGNED_INT;if(i===1015)return e.FLOAT;if(i===1016)return e.HALF_FLOAT;if(i===1021)return e.ALPHA;if(i===1022)return e.RGB;if(i===1023)return e.RGBA;if(i===1026)return e.DEPTH_COMPONENT;if(i===1027)return e.DEPTH_STENCIL;if(i===1028)return e.RED;if(i===1029)return e.RED_INTEGER;if(i===1030)return e.RG;if(i===1031)return e.RG_INTEGER;if(i===1033)return e.RGBA_INTEGER;if(i===33776||i===33777||i===33778||i===33779)if(a==="srgb")if(s=t.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(i===33776)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===33777)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===33778)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===33779)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=t.get("WEBGL_compressed_texture_s3tc"),s!==null){if(i===33776)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===33777)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===33778)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===33779)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===35840||i===35841||i===35842||i===35843)if(s=t.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(i===35840)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===35841)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===35842)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===35843)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===36196||i===37492||i===37496||i===37488||i===37489||i===37490||i===37491)if(s=t.get("WEBGL_compressed_texture_etc"),s!==null){if(i===36196||i===37492)return a==="srgb"?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(i===37496)return a==="srgb"?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC;if(i===37488)return s.COMPRESSED_R11_EAC;if(i===37489)return s.COMPRESSED_SIGNED_R11_EAC;if(i===37490)return s.COMPRESSED_RG11_EAC;if(i===37491)return s.COMPRESSED_SIGNED_RG11_EAC}else return null;if(i===37808||i===37809||i===37810||i===37811||i===37812||i===37813||i===37814||i===37815||i===37816||i===37817||i===37818||i===37819||i===37820||i===37821)if(s=t.get("WEBGL_compressed_texture_astc"),s!==null){if(i===37808)return a==="srgb"?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===37809)return a==="srgb"?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===37810)return a==="srgb"?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===37811)return a==="srgb"?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===37812)return a==="srgb"?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===37813)return a==="srgb"?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===37814)return a==="srgb"?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===37815)return a==="srgb"?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===37816)return a==="srgb"?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===37817)return a==="srgb"?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===37818)return a==="srgb"?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===37819)return a==="srgb"?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===37820)return a==="srgb"?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===37821)return a==="srgb"?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===36492||i===36494||i===36495)if(s=t.get("EXT_texture_compression_bptc"),s!==null){if(i===36492)return a==="srgb"?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===36494)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===36495)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===36283||i===36284||i===36285||i===36286)if(s=t.get("EXT_texture_compression_rgtc"),s!==null){if(i===36283)return s.COMPRESSED_RED_RGTC1_EXT;if(i===36284)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===36285)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===36286)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===1020?e.UNSIGNED_INT_24_8:e[i]!==void 0?e[i]:null}return{convert:n}}var Iu=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Lu=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,Du=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new Js(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new Gt({vertexShader:Iu,fragmentShader:Lu,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Ht(new Qs(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Nu=class extends xn{constructor(e,t){super();const n=this;let i=null,r=1,s=null,a="local-floor",o=1,l=null,c=null,u=null,h=null,d=null,f=null;const g=typeof XRWebGLBinding<"u",_=new Du,m={},p=t.getContextAttributes();let S=null,b=null;const x=[],C=[],A=new Ze;let T=null;const v=new It;v.viewport=new ot;const E=new It;E.viewport=new ot;const W=[v,E],R=new pc;let H=null,X=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function($){let ie=x[$];return ie===void 0&&(ie=new Er,x[$]=ie),ie.getTargetRaySpace()},this.getControllerGrip=function($){let ie=x[$];return ie===void 0&&(ie=new Er,x[$]=ie),ie.getGripSpace()},this.getHand=function($){let ie=x[$];return ie===void 0&&(ie=new Er,x[$]=ie),ie.getHandSpace()};function z($){const ie=C.indexOf($.inputSource);if(ie===-1)return;const ye=x[ie];ye!==void 0&&(ye.update($.inputSource,$.frame,l||s),ye.dispatchEvent({type:$.type,data:$.inputSource}))}function k(){i.removeEventListener("select",z),i.removeEventListener("selectstart",z),i.removeEventListener("selectend",z),i.removeEventListener("squeeze",z),i.removeEventListener("squeezestart",z),i.removeEventListener("squeezeend",z),i.removeEventListener("end",k),i.removeEventListener("inputsourceschange",G);for(let $=0;$<x.length;$++){const ie=C[$];ie!==null&&(C[$]=null,x[$].disconnect(ie))}H=null,X=null,_.reset();for(const $ in m)delete m[$];e.setRenderTarget(S),d=null,h=null,u=null,i=null,b=null,Fe.stop(),n.isPresenting=!1,e.setPixelRatio(T),e.setSize(A.width,A.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function($){r=$,n.isPresenting===!0&&Ee("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function($){a=$,n.isPresenting===!0&&Ee("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||s},this.setReferenceSpace=function($){l=$},this.getBaseLayer=function(){return h!==null?h:d},this.getBinding=function(){return u===null&&g&&(u=new XRWebGLBinding(i,t)),u},this.getFrame=function(){return f},this.getSession=function(){return i},this.setSession=async function($){if(i=$,i!==null){if(S=e.getRenderTarget(),i.addEventListener("select",z),i.addEventListener("selectstart",z),i.addEventListener("selectend",z),i.addEventListener("squeeze",z),i.addEventListener("squeezestart",z),i.addEventListener("squeezeend",z),i.addEventListener("end",k),i.addEventListener("inputsourceschange",G),p.xrCompatible!==!0&&await t.makeXRCompatible(),T=e.getPixelRatio(),e.getSize(A),g&&"createProjectionLayer"in XRWebGLBinding.prototype){let ie=null,ye=null,ue=null;p.depth&&(ue=p.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ie=p.stencil?ys:ri,ye=p.stencil?_s:_n);const Te={colorFormat:t.RGBA8,depthFormat:ue,scaleFactor:r};u=this.getBinding(),h=u.createProjectionLayer(Te),i.updateRenderState({layers:[h]}),e.setPixelRatio(1),e.setSize(h.textureWidth,h.textureHeight,!1),b=new zt(h.textureWidth,h.textureHeight,{format:ii,type:vn,depthTexture:new Wn(h.textureWidth,h.textureHeight,ye,void 0,void 0,void 0,void 0,void 0,void 0,ie),stencilBuffer:p.stencil,colorSpace:e.outputColorSpace,samples:p.antialias?4:0,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1})}else{const ie={antialias:p.antialias,alpha:!0,depth:p.depth,stencil:p.stencil,framebufferScaleFactor:r};d=new XRWebGLLayer(i,t,ie),i.updateRenderState({baseLayer:d}),e.setPixelRatio(1),e.setSize(d.framebufferWidth,d.framebufferHeight,!1),b=new zt(d.framebufferWidth,d.framebufferHeight,{format:ii,type:vn,colorSpace:e.outputColorSpace,stencilBuffer:p.stencil,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}b.isXRRenderTarget=!0,this.setFoveation(o),l=null,s=await i.requestReferenceSpace(a),Fe.setContext(i),Fe.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return _.getDepthTexture()};function G($){for(let ie=0;ie<$.removed.length;ie++){const ye=$.removed[ie],ue=C.indexOf(ye);ue>=0&&(C[ue]=null,x[ue].disconnect(ye))}for(let ie=0;ie<$.added.length;ie++){const ye=$.added[ie];let ue=C.indexOf(ye);if(ue===-1){for(let Ie=0;Ie<x.length;Ie++)if(Ie>=C.length){C.push(ye),ue=Ie;break}else if(C[Ie]===null){C[Ie]=ye,ue=Ie;break}if(ue===-1)break}const Te=x[ue];Te&&Te.connect(ye)}}const I=new B,Y=new B;function J($,ie,ye){I.setFromMatrixPosition(ie.matrixWorld),Y.setFromMatrixPosition(ye.matrixWorld);const ue=I.distanceTo(Y),Te=ie.projectionMatrix.elements,Ie=ye.projectionMatrix.elements,Ce=Te[14]/(Te[10]-1),Ye=Te[14]/(Te[10]+1),Ve=(Te[9]+1)/Te[5],ht=(Te[9]-1)/Te[5],st=(Te[8]-1)/Te[0],wt=(Ie[8]+1)/Ie[0],vt=Ce*st,ct=Ce*wt,L=ue/(-st+wt),bt=L*-st;if(ie.matrixWorld.decompose($.position,$.quaternion,$.scale),$.translateX(bt),$.translateZ(L),$.matrixWorld.compose($.position,$.quaternion,$.scale),$.matrixWorldInverse.copy($.matrixWorld).invert(),Te[10]===-1)$.projectionMatrix.copy(ie.projectionMatrix),$.projectionMatrixInverse.copy(ie.projectionMatrixInverse);else{const Ge=Ce+L,Xe=Ye+L,de=vt-bt,tt=ct+(ue-bt),be=Ve*Ye/Xe*Ge,w=ht*Ye/Xe*Ge;$.projectionMatrix.makePerspective(de,tt,be,w,Ge,Xe),$.projectionMatrixInverse.copy($.projectionMatrix).invert()}}function te($,ie){ie===null?$.matrixWorld.copy($.matrix):$.matrixWorld.multiplyMatrices(ie.matrixWorld,$.matrix),$.matrixWorldInverse.copy($.matrixWorld).invert()}this.updateCamera=function($){if(i===null)return;let ie=$.near,ye=$.far;_.texture!==null&&(_.depthNear>0&&(ie=_.depthNear),_.depthFar>0&&(ye=_.depthFar)),R.near=E.near=v.near=ie,R.far=E.far=v.far=ye,(H!==R.near||X!==R.far)&&(i.updateRenderState({depthNear:R.near,depthFar:R.far}),H=R.near,X=R.far),R.layers.mask=$.layers.mask|6,v.layers.mask=R.layers.mask&-5,E.layers.mask=R.layers.mask&-3;const ue=$.parent,Te=R.cameras;te(R,ue);for(let Ie=0;Ie<Te.length;Ie++)te(Te[Ie],ue);Te.length===2?J(R,v,E):R.projectionMatrix.copy(v.projectionMatrix),fe($,R,ue)};function fe($,ie,ye){ye===null?$.matrix.copy(ie.matrixWorld):($.matrix.copy(ye.matrixWorld),$.matrix.invert(),$.matrix.multiply(ie.matrixWorld)),$.matrix.decompose($.position,$.quaternion,$.scale),$.updateMatrixWorld(!0),$.projectionMatrix.copy(ie.projectionMatrix),$.projectionMatrixInverse.copy(ie.projectionMatrixInverse),$.isPerspectiveCamera&&($.fov=oi*2*Math.atan(1/$.projectionMatrix.elements[5]),$.zoom=1)}this.getCamera=function(){return R},this.getFoveation=function(){if(!(h===null&&d===null))return o},this.setFoveation=function($){o=$,h!==null&&(h.fixedFoveation=$),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=$)},this.hasDepthSensing=function(){return _.texture!==null},this.getDepthSensingMesh=function(){return _.getMesh(R)},this.getCameraTexture=function($){return m[$]};let me=null;function Le($,ie){if(c=ie.getViewerPose(l||s),f=ie,c!==null){const ye=c.views;d!==null&&(e.setRenderTargetFramebuffer(b,d.framebuffer),e.setRenderTarget(b));let ue=!1;ye.length!==R.cameras.length&&(R.cameras.length=0,ue=!0);for(let Ie=0;Ie<ye.length;Ie++){const Ce=ye[Ie];let Ye=null;if(d!==null)Ye=d.getViewport(Ce);else{const ht=u.getViewSubImage(h,Ce);Ye=ht.viewport,Ie===0&&(e.setRenderTargetTextures(b,ht.colorTexture,ht.depthStencilTexture),e.setRenderTarget(b))}let Ve=W[Ie];Ve===void 0&&(Ve=new It,Ve.layers.enable(Ie),Ve.viewport=new ot,W[Ie]=Ve),Ve.matrix.fromArray(Ce.transform.matrix),Ve.matrix.decompose(Ve.position,Ve.quaternion,Ve.scale),Ve.projectionMatrix.fromArray(Ce.projectionMatrix),Ve.projectionMatrixInverse.copy(Ve.projectionMatrix).invert(),Ve.viewport.set(Ye.x,Ye.y,Ye.width,Ye.height),Ie===0&&(R.matrix.copy(Ve.matrix),R.matrix.decompose(R.position,R.quaternion,R.scale)),ue===!0&&R.cameras.push(Ve)}const Te=i.enabledFeatures;if(Te&&Te.includes("depth-sensing")&&i.depthUsage=="gpu-optimized"&&g){u=n.getBinding();const Ie=u.getDepthInformation(ye[0]);Ie&&Ie.isValid&&Ie.texture&&_.init(Ie,i.renderState)}if(Te&&Te.includes("camera-access")&&g){e.state.unbindTexture(),u=n.getBinding();for(let Ie=0;Ie<ye.length;Ie++){const Ce=ye[Ie].camera;if(Ce){let Ye=m[Ce];Ye||(Ye=new Js,m[Ce]=Ye);const Ve=u.getCameraImage(Ce);Ye.sourceTexture=Ve}}}}for(let ye=0;ye<x.length;ye++){const ue=C[ye],Te=x[ye];ue!==null&&Te!==void 0&&Te.update(ue,ie,l||s)}me&&me($,ie),ie.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:ie}),f=null}const Fe=new ca;Fe.setAnimationLoop(Le),this.setAnimationLoop=function($){me=$},this.dispose=function(){}}},Uu=new ft,ka=new Ne;ka.set(-1,0,0,0,1,0,0,0,1);function Fu(e,t){function n(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function i(m,p){p.color.getRGB(m.fogColor.value,ta(e)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function r(m,p,S,b,x){p.isNodeMaterial?p.uniformsNeedUpdate=!1:p.isMeshBasicMaterial?s(m,p):p.isMeshLambertMaterial?(s(m,p),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)):p.isMeshToonMaterial?(s(m,p),h(m,p)):p.isMeshPhongMaterial?(s(m,p),u(m,p),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)):p.isMeshStandardMaterial?(s(m,p),d(m,p),p.isMeshPhysicalMaterial&&f(m,p,x)):p.isMeshMatcapMaterial?(s(m,p),g(m,p)):p.isMeshDepthMaterial?s(m,p):p.isMeshDistanceMaterial?(s(m,p),_(m,p)):p.isMeshNormalMaterial?s(m,p):p.isLineBasicMaterial?(a(m,p),p.isLineDashedMaterial&&o(m,p)):p.isPointsMaterial?l(m,p,S,b):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function s(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,n(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,n(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,n(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===1&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,n(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===1&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,n(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,n(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,n(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const S=t.get(p),b=S.envMap,x=S.envMapRotation;b&&(m.envMap.value=b,m.envMapRotation.value.setFromMatrix4(Uu.makeRotationFromEuler(x)).transpose(),b.isCubeTexture&&b.isRenderTargetTexture===!1&&m.envMapRotation.value.premultiply(ka),m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,n(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,n(p.aoMap,m.aoMapTransform))}function a(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,n(p.map,m.mapTransform))}function o(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,S,b){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*S,m.scale.value=b*.5,p.map&&(m.map.value=p.map,n(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,n(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,n(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,n(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function u(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function h(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function d(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,n(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,n(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function f(m,p,S){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,n(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,n(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,n(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,n(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,n(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===1&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,n(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,n(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=S.texture,m.transmissionSamplerSize.value.set(S.width,S.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,n(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,n(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,n(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,n(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,n(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function _(m,p){const S=t.get(p).light;m.referencePosition.value.setFromMatrixPosition(S.matrixWorld),m.nearDistance.value=S.shadow.camera.near,m.farDistance.value=S.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function Ou(e,t,n,i){let r={},s={},a=[];const o=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function l(S,b){const x=b.program;i.uniformBlockBinding(S,x)}function c(S,b){let x=r[S.id];x===void 0&&(g(S),x=u(S),r[S.id]=x,S.addEventListener("dispose",m));const C=b.program;i.updateUBOMapping(S,C);const A=t.render.frame;s[S.id]!==A&&(d(S),s[S.id]=A)}function u(S){const b=h();S.__bindingPointIndex=b;const x=e.createBuffer(),C=S.__size,A=S.usage;return e.bindBuffer(e.UNIFORM_BUFFER,x),e.bufferData(e.UNIFORM_BUFFER,C,A),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,b,x),x}function h(){for(let S=0;S<o;S++)if(a.indexOf(S)===-1)return a.push(S),S;return we("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(S){const b=r[S.id],x=S.uniforms,C=S.__cache;e.bindBuffer(e.UNIFORM_BUFFER,b);for(let A=0,T=x.length;A<T;A++){const v=Array.isArray(x[A])?x[A]:[x[A]];for(let E=0,W=v.length;E<W;E++){const R=v[E];if(f(R,A,E,C)===!0){const H=R.__offset,X=Array.isArray(R.value)?R.value:[R.value];let z=0;for(let k=0;k<X.length;k++){const G=X[k],I=_(G);typeof G=="number"||typeof G=="boolean"?(R.__data[0]=G,e.bufferSubData(e.UNIFORM_BUFFER,H+z,R.__data)):G.isMatrix3?(R.__data[0]=G.elements[0],R.__data[1]=G.elements[1],R.__data[2]=G.elements[2],R.__data[3]=0,R.__data[4]=G.elements[3],R.__data[5]=G.elements[4],R.__data[6]=G.elements[5],R.__data[7]=0,R.__data[8]=G.elements[6],R.__data[9]=G.elements[7],R.__data[10]=G.elements[8],R.__data[11]=0):ArrayBuffer.isView(G)?R.__data.set(new G.constructor(G.buffer,G.byteOffset,R.__data.length)):(G.toArray(R.__data,z),z+=I.storage/Float32Array.BYTES_PER_ELEMENT)}e.bufferSubData(e.UNIFORM_BUFFER,H,R.__data)}}}e.bindBuffer(e.UNIFORM_BUFFER,null)}function f(S,b,x,C){const A=S.value,T=b+"_"+x;if(C[T]===void 0)return typeof A=="number"||typeof A=="boolean"?C[T]=A:ArrayBuffer.isView(A)?C[T]=A.slice():C[T]=A.clone(),!0;{const v=C[T];if(typeof A=="number"||typeof A=="boolean"){if(v!==A)return C[T]=A,!0}else{if(ArrayBuffer.isView(A))return!0;if(v.equals(A)===!1)return v.copy(A),!0}}return!1}function g(S){const b=S.uniforms;let x=0;const C=16;for(let T=0,v=b.length;T<v;T++){const E=Array.isArray(b[T])?b[T]:[b[T]];for(let W=0,R=E.length;W<R;W++){const H=E[W],X=Array.isArray(H.value)?H.value:[H.value];for(let z=0,k=X.length;z<k;z++){const G=X[z],I=_(G),Y=x%C,J=Y%I.boundary,te=Y+J;x+=J,te!==0&&C-te<I.storage&&(x+=C-te),H.__data=new Float32Array(I.storage/Float32Array.BYTES_PER_ELEMENT),H.__offset=x,x+=I.storage}}}const A=x%C;return A>0&&(x+=C-A),S.__size=x,S.__cache={},this}function _(S){const b={boundary:0,storage:0};return typeof S=="number"||typeof S=="boolean"?(b.boundary=4,b.storage=4):S.isVector2?(b.boundary=8,b.storage=8):S.isVector3||S.isColor?(b.boundary=16,b.storage=12):S.isVector4?(b.boundary=16,b.storage=16):S.isMatrix3?(b.boundary=48,b.storage=48):S.isMatrix4?(b.boundary=64,b.storage=64):S.isTexture?Ee("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(S)?(b.boundary=16,b.storage=S.byteLength):Ee("WebGLRenderer: Unsupported uniform value type.",S),b}function m(S){const b=S.target;b.removeEventListener("dispose",m);const x=a.indexOf(b.__bindingPointIndex);a.splice(x,1),e.deleteBuffer(r[b.id]),delete r[b.id],delete s[b.id]}function p(){for(const S in r)e.deleteBuffer(r[S]);a=[],r={},s={}}return{bind:l,update:c,dispose:p}}var Bu=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),qt=null;function ku(){return qt===null&&(qt=new Hl(Bu,16,16,Ti,yn),qt.name="DFG_LUT",qt.minFilter=Et,qt.magFilter=Et,qt.wrapS=Kt,qt.wrapT=Kt,qt.generateMipmaps=!1,qt.needsUpdate=!0),qt}var zu=class{constructor(e={}){const{canvas:t=il(),context:n=null,depth:i=!0,stencil:r=!1,alpha:s=!1,antialias:a=!1,premultipliedAlpha:o=!0,preserveDrawingBuffer:l=!1,powerPreference:c="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:h=!1,outputBufferType:d=vn}=e;this.isWebGLRenderer=!0;let f;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=n.getContextAttributes().alpha}else f=s;const g=d,_=new Set([bs,Ss,xs]),m=new Set([vn,_n,ms,_s,gs,vs]),p=new Uint32Array(4),S=new Int32Array(4),b=new B;let x=null,C=null;const A=[],T=[];let v=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const E=this;let W=!1,R=null;this._outputColorSpace=Nt;let H=0,X=0,z=null,k=-1,G=null;const I=new ot,Y=new ot;let J=null;const te=new je(0);let fe=0,me=t.width,Le=t.height,Fe=1,$=null,ie=null;const ye=new ot(0,0,me,Le),ue=new ot(0,0,me,Le);let Te=!1;const Ie=new Ks;let Ce=!1,Ye=!1;const Ve=new ft,ht=new B,st=new ot,wt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let vt=!1;function ct(){return z===null?Fe:1}let L=n;function bt(M,N){return t.getContext(M,N)}try{const M={alpha:!0,depth:i,stencil:r,antialias:a,premultipliedAlpha:o,preserveDrawingBuffer:l,powerPreference:c,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine","three.js r184"),t.addEventListener("webglcontextlost",xe,!1),t.addEventListener("webglcontextrestored",Q,!1),t.addEventListener("webglcontextcreationerror",Se,!1),L===null){const N="webgl2";if(L=bt(N,M),L===null)throw bt(N)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(M){throw we("WebGLRenderer: "+M.message),M}let Ge,Xe,de,tt,be,w,y,U,j,Z,ne,le,D,se,ce,pe,K,Ae,De,We,Oe,P,q;function ee(){Ge=new kc(L),Ge.init(),Oe=new Pu(L,Ge),Xe=new Ic(L,Ge,e,Oe),de=new Cu(L,Ge),Xe.reversedDepthBuffer&&h&&de.buffers.depth.setReversed(!0),tt=new Hc(L),be=new pu,w=new Ru(L,Ge,de,be,Xe,Oe,tt),y=new Bc(E),U=new Ac(L),P=new Rc(L,U),j=new zc(L,U,tt,P),Z=new Wc(L,j,U,P,tt),Ae=new Gc(L,Xe,w),ce=new Lc(be),ne=new fu(E,y,Ge,Xe,P,ce),le=new Fu(E,be),D=new gu,se=new bu(Ge),K=new Cc(E,y,de,Z,f,o),pe=new wu(E,Z,Xe),q=new Ou(L,tt,Xe,de),De=new Pc(L,Ge,tt),We=new Vc(L,Ge,tt),tt.programs=ne.programs,E.capabilities=Xe,E.extensions=Ge,E.properties=be,E.renderLists=D,E.shadowMap=pe,E.state=de,E.info=tt}ee(),g!==1009&&(v=new $c(g,t.width,t.height,i,r));const ae=new Nu(E,L);this.xr=ae,this.getContext=function(){return L},this.getContextAttributes=function(){return L.getContextAttributes()},this.forceContextLoss=function(){const M=Ge.get("WEBGL_lose_context");M&&M.loseContext()},this.forceContextRestore=function(){const M=Ge.get("WEBGL_lose_context");M&&M.restoreContext()},this.getPixelRatio=function(){return Fe},this.setPixelRatio=function(M){M!==void 0&&(Fe=M,this.setSize(me,Le,!1))},this.getSize=function(M){return M.set(me,Le)},this.setSize=function(M,N,V=!0){if(ae.isPresenting){Ee("WebGLRenderer: Can't change size while VR device is presenting.");return}me=M,Le=N,t.width=Math.floor(M*Fe),t.height=Math.floor(N*Fe),V===!0&&(t.style.width=M+"px",t.style.height=N+"px"),v!==null&&v.setSize(t.width,t.height),this.setViewport(0,0,M,N)},this.getDrawingBufferSize=function(M){return M.set(me*Fe,Le*Fe).floor()},this.setDrawingBufferSize=function(M,N,V){me=M,Le=N,Fe=V,t.width=Math.floor(M*V),t.height=Math.floor(N*V),this.setViewport(0,0,M,N)},this.setEffects=function(M){if(g===1009){we("THREE.WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(M){for(let N=0;N<M.length;N++)if(M[N].isOutputPass===!0){Ee("THREE.WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}v.setEffects(M||[])},this.getCurrentViewport=function(M){return M.copy(I)},this.getViewport=function(M){return M.copy(ye)},this.setViewport=function(M,N,V,O){M.isVector4?ye.set(M.x,M.y,M.z,M.w):ye.set(M,N,V,O),de.viewport(I.copy(ye).multiplyScalar(Fe).round())},this.getScissor=function(M){return M.copy(ue)},this.setScissor=function(M,N,V,O){M.isVector4?ue.set(M.x,M.y,M.z,M.w):ue.set(M,N,V,O),de.scissor(Y.copy(ue).multiplyScalar(Fe).round())},this.getScissorTest=function(){return Te},this.setScissorTest=function(M){de.setScissorTest(Te=M)},this.setOpaqueSort=function(M){$=M},this.setTransparentSort=function(M){ie=M},this.getClearColor=function(M){return M.copy(K.getClearColor())},this.setClearColor=function(){K.setClearColor(...arguments)},this.getClearAlpha=function(){return K.getClearAlpha()},this.setClearAlpha=function(){K.setClearAlpha(...arguments)},this.clear=function(M=!0,N=!0,V=!0){let O=0;if(M){let F=!1;if(z!==null){const re=z.texture.format;F=_.has(re)}if(F){const re=z.texture.type,he=m.has(re),ge=K.getClearColor(),ve=K.getClearAlpha(),Pe=ge.r,Be=ge.g,ke=ge.b;he?(p[0]=Pe,p[1]=Be,p[2]=ke,p[3]=ve,L.clearBufferuiv(L.COLOR,0,p)):(S[0]=Pe,S[1]=Be,S[2]=ke,S[3]=ve,L.clearBufferiv(L.COLOR,0,S))}else O|=L.COLOR_BUFFER_BIT}N&&(O|=L.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),V&&(O|=L.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),O!==0&&L.clear(O)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(M){M.setRenderer(this),R=M},this.dispose=function(){t.removeEventListener("webglcontextlost",xe,!1),t.removeEventListener("webglcontextrestored",Q,!1),t.removeEventListener("webglcontextcreationerror",Se,!1),K.dispose(),D.dispose(),se.dispose(),be.dispose(),y.dispose(),Z.dispose(),P.dispose(),q.dispose(),ne.dispose(),ae.dispose(),ae.removeEventListener("sessionstart",za),ae.removeEventListener("sessionend",Va),Cn.stop()};function xe(M){M.preventDefault(),Cs("WebGLRenderer: Context Lost."),W=!0}function Q(){Cs("WebGLRenderer: Context Restored."),W=!1;const M=tt.autoReset,N=pe.enabled,V=pe.autoUpdate,O=pe.needsUpdate,F=pe.type;ee(),tt.autoReset=M,pe.enabled=N,pe.autoUpdate=V,pe.needsUpdate=O,pe.type=F}function Se(M){we("WebGLRenderer: A WebGL context could not be created. Reason: ",M.statusMessage)}function Re(M){const N=M.target;N.removeEventListener("dispose",Re),Mt(N)}function Mt(M){et(M),be.remove(M)}function et(M){const N=be.get(M).programs;N!==void 0&&(N.forEach(function(V){ne.releaseProgram(V)}),M.isShaderMaterial&&ne.releaseShaderCache(M))}this.renderBufferDirect=function(M,N,V,O,F,re){N===null&&(N=wt);const he=F.isMesh&&F.matrixWorld.determinant()<0,ge=oh(M,N,V,O,F);de.setMaterial(O,he);let ve=V.index,Pe=1;if(O.wireframe===!0){if(ve=j.getWireframeAttribute(V),ve===void 0)return;Pe=2}const Be=V.drawRange,ke=V.attributes.position;let Me=Be.start*Pe,Qe=(Be.start+Be.count)*Pe;re!==null&&(Me=Math.max(Me,re.start*Pe),Qe=Math.min(Qe,(re.start+re.count)*Pe)),ve!==null?(Me=Math.max(Me,0),Qe=Math.min(Qe,ve.count)):ke!=null&&(Me=Math.max(Me,0),Qe=Math.min(Qe,ke.count));const it=Qe-Me;if(it<0||it===1/0)return;P.setup(F,O,ge,V,ve);let rt,$e=De;if(ve!==null&&(rt=U.get(ve),$e=We,$e.setIndex(rt)),F.isMesh)O.wireframe===!0?(de.setLineWidth(O.wireframeLinewidth*ct()),$e.setMode(L.LINES)):$e.setMode(L.TRIANGLES);else if(F.isLine){let _t=O.linewidth;_t===void 0&&(_t=1),de.setLineWidth(_t*ct()),F.isLineSegments?$e.setMode(L.LINES):F.isLineLoop?$e.setMode(L.LINE_LOOP):$e.setMode(L.LINE_STRIP)}else F.isPoints?$e.setMode(L.POINTS):F.isSprite&&$e.setMode(L.TRIANGLES);if(F.isBatchedMesh)if(Ge.get("WEBGL_multi_draw"))$e.renderMultiDraw(F._multiDrawStarts,F._multiDrawCounts,F._multiDrawCount);else{const _t=F._multiDrawStarts,_e=F._multiDrawCounts,kt=F._multiDrawCount,qe=ve?U.get(ve).bytesPerElement:1,Dt=be.get(O).currentProgram.getUniforms();for(let jt=0;jt<kt;jt++)Dt.setValue(L,"_gl_DrawID",jt),$e.render(_t[jt]/qe,_e[jt])}else if(F.isInstancedMesh)$e.renderInstances(Me,it,F.count);else if(V.isInstancedBufferGeometry){const _t=V._maxInstanceCount!==void 0?V._maxInstanceCount:1/0,_e=Math.min(V.instanceCount,_t);$e.renderInstances(Me,it,_e)}else $e.render(Me,it)};function Yt(M,N,V){M.transparent===!0&&M.side===2&&M.forceSinglePass===!1?(M.side=1,M.needsUpdate=!0,rr(M,N,V),M.side=0,M.needsUpdate=!0,rr(M,N,V),M.side=2):rr(M,N,V)}this.compile=function(M,N,V=null){V===null&&(V=M),C=se.get(V),C.init(N),T.push(C),V.traverseVisible(function(F){F.isLight&&F.layers.test(N.layers)&&(C.pushLight(F),F.castShadow&&C.pushShadow(F))}),M!==V&&M.traverseVisible(function(F){F.isLight&&F.layers.test(N.layers)&&(C.pushLight(F),F.castShadow&&C.pushShadow(F))}),C.setupLights();const O=new Set;return M.traverse(function(F){if(!(F.isMesh||F.isPoints||F.isLine||F.isSprite))return;const re=F.material;if(re)if(Array.isArray(re))for(let he=0;he<re.length;he++){const ge=re[he];Yt(ge,V,F),O.add(ge)}else Yt(re,V,F),O.add(re)}),C=T.pop(),O},this.compileAsync=function(M,N,V=null){const O=this.compile(M,N,V);return new Promise(F=>{function re(){if(O.forEach(function(he){be.get(he).currentProgram.isReady()&&O.delete(he)}),O.size===0){F(M);return}setTimeout(re,10)}Ge.get("KHR_parallel_shader_compile")!==null?re():setTimeout(re,10)})};let Bt=null;function sh(M){Bt&&Bt(M)}function za(){Cn.stop()}function Va(){Cn.start()}const Cn=new ca;Cn.setAnimationLoop(sh),typeof self<"u"&&Cn.setContext(self),this.setAnimationLoop=function(M){Bt=M,ae.setAnimationLoop(M),M===null?Cn.stop():Cn.start()},ae.addEventListener("sessionstart",za),ae.addEventListener("sessionend",Va),this.render=function(M,N){if(N!==void 0&&N.isCamera!==!0){we("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(W===!0)return;R!==null&&R.renderStart(M,N);const V=ae.enabled===!0&&ae.isPresenting===!0,O=v!==null&&(z===null||V)&&v.begin(E,z);if(M.matrixWorldAutoUpdate===!0&&M.updateMatrixWorld(),N.parent===null&&N.matrixWorldAutoUpdate===!0&&N.updateMatrixWorld(),ae.enabled===!0&&ae.isPresenting===!0&&(v===null||v.isCompositing()===!1)&&(ae.cameraAutoUpdate===!0&&ae.updateCamera(N),N=ae.getCamera()),M.isScene===!0&&M.onBeforeRender(E,M,N,z),C=se.get(M,T.length),C.init(N),C.state.textureUnits=w.getTextureUnits(),T.push(C),Ve.multiplyMatrices(N.projectionMatrix,N.matrixWorldInverse),Ie.setFromProjectionMatrix(Ve,Rn,N.reversedDepth),Ye=this.localClippingEnabled,Ce=ce.init(this.clippingPlanes,Ye),x=D.get(M,A.length),x.init(),A.push(x),ae.enabled===!0&&ae.isPresenting===!0){const re=E.xr.getDepthSensingMesh();re!==null&&rs(re,N,-1/0,E.sortObjects)}rs(M,N,0,E.sortObjects),x.finish(),E.sortObjects===!0&&x.sort($,ie),vt=ae.enabled===!1||ae.isPresenting===!1||ae.hasDepthSensing()===!1,vt&&K.addToRenderList(x,M),this.info.render.frame++,Ce===!0&&ce.beginShadows();const F=C.state.shadowsArray;if(pe.render(F,M,N),Ce===!0&&ce.endShadows(),this.info.autoReset===!0&&this.info.reset(),(O&&v.hasRenderPass())===!1){const re=x.opaque,he=x.transmissive;if(C.setupLights(),N.isArrayCamera){const ge=N.cameras;if(he.length>0)for(let ve=0,Pe=ge.length;ve<Pe;ve++){const Be=ge[ve];Ga(re,he,M,Be)}vt&&K.render(M);for(let ve=0,Pe=ge.length;ve<Pe;ve++){const Be=ge[ve];Ha(x,M,Be,Be.viewport)}}else he.length>0&&Ga(re,he,M,N),vt&&K.render(M),Ha(x,M,N)}z!==null&&X===0&&(w.updateMultisampleRenderTarget(z),w.updateRenderTargetMipmap(z)),O&&v.end(E),M.isScene===!0&&M.onAfterRender(E,M,N),P.resetDefaultState(),k=-1,G=null,T.pop(),T.length>0?(C=T[T.length-1],w.setTextureUnits(C.state.textureUnits),Ce===!0&&ce.setGlobalState(E.clippingPlanes,C.state.camera)):C=null,A.pop(),A.length>0?x=A[A.length-1]:x=null,R!==null&&R.renderEnd()};function rs(M,N,V,O){if(M.visible===!1)return;if(M.layers.test(N.layers)){if(M.isGroup)V=M.renderOrder;else if(M.isLOD)M.autoUpdate===!0&&M.update(N);else if(M.isLightProbeGrid)C.pushLightProbeGrid(M);else if(M.isLight)C.pushLight(M),M.castShadow&&C.pushShadow(M);else if(M.isSprite){if(!M.frustumCulled||Ie.intersectsSprite(M)){O&&st.setFromMatrixPosition(M.matrixWorld).applyMatrix4(Ve);const re=Z.update(M),he=M.material;he.visible&&x.push(M,re,he,V,st.z,null)}}else if((M.isMesh||M.isLine||M.isPoints)&&(!M.frustumCulled||Ie.intersectsObject(M))){const re=Z.update(M),he=M.material;if(O&&(M.boundingSphere!==void 0?(M.boundingSphere===null&&M.computeBoundingSphere(),st.copy(M.boundingSphere.center)):(re.boundingSphere===null&&re.computeBoundingSphere(),st.copy(re.boundingSphere.center)),st.applyMatrix4(M.matrixWorld).applyMatrix4(Ve)),Array.isArray(he)){const ge=re.groups;for(let ve=0,Pe=ge.length;ve<Pe;ve++){const Be=ge[ve],ke=he[Be.materialIndex];ke&&ke.visible&&x.push(M,re,ke,V,st.z,Be)}}else he.visible&&x.push(M,re,he,V,st.z,null)}}const F=M.children;for(let re=0,he=F.length;re<he;re++)rs(F[re],N,V,O)}function Ha(M,N,V,O){const{opaque:F,transmissive:re,transparent:he}=M;C.setupLightsView(V),Ce===!0&&ce.setGlobalState(E.clippingPlanes,V),O&&de.viewport(I.copy(O)),F.length>0&&ir(F,N,V),re.length>0&&ir(re,N,V),he.length>0&&ir(he,N,V),de.buffers.depth.setTest(!0),de.buffers.depth.setMask(!0),de.buffers.color.setMask(!0),de.setPolygonOffset(!1)}function Ga(M,N,V,O){if((V.isScene===!0?V.overrideMaterial:null)!==null)return;if(C.state.transmissionRenderTarget[O.id]===void 0){const ke=Ge.has("EXT_color_buffer_half_float")||Ge.has("EXT_color_buffer_float");C.state.transmissionRenderTarget[O.id]=new zt(1,1,{generateMipmaps:!0,type:ke?yn:vn,minFilter:ur,samples:Math.max(4,Xe.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:He.workingColorSpace})}const F=C.state.transmissionRenderTarget[O.id],re=O.viewport||I;F.setSize(re.z*E.transmissionResolutionScale,re.w*E.transmissionResolutionScale);const he=E.getRenderTarget(),ge=E.getActiveCubeFace(),ve=E.getActiveMipmapLevel();E.setRenderTarget(F),E.getClearColor(te),fe=E.getClearAlpha(),fe<1&&E.setClearColor(16777215,.5),E.clear(),vt&&K.render(V);const Pe=E.toneMapping;E.toneMapping=0;const Be=O.viewport;if(O.viewport!==void 0&&(O.viewport=void 0),C.setupLightsView(O),Ce===!0&&ce.setGlobalState(E.clippingPlanes,O),ir(M,V,O),w.updateMultisampleRenderTarget(F),w.updateRenderTargetMipmap(F),Ge.has("WEBGL_multisampled_render_to_texture")===!1){let ke=!1;for(let Me=0,Qe=N.length;Me<Qe;Me++){const{object:it,geometry:rt,material:$e,group:_t}=N[Me];if($e.side===2&&it.layers.test(O.layers)){const _e=$e.side;$e.side=1,$e.needsUpdate=!0,Wa(it,V,O,rt,$e,_t),$e.side=_e,$e.needsUpdate=!0,ke=!0}}ke===!0&&(w.updateMultisampleRenderTarget(F),w.updateRenderTargetMipmap(F))}E.setRenderTarget(he,ge,ve),E.setClearColor(te,fe),Be!==void 0&&(O.viewport=Be),E.toneMapping=Pe}function ir(M,N,V){const O=N.isScene===!0?N.overrideMaterial:null;for(let F=0,re=M.length;F<re;F++){const he=M[F],{object:ge,geometry:ve,group:Pe}=he;let Be=he.material;Be.allowOverride===!0&&O!==null&&(Be=O),ge.layers.test(V.layers)&&Wa(ge,N,V,ve,Be,Pe)}}function Wa(M,N,V,O,F,re){M.onBeforeRender(E,N,V,O,F,re),M.modelViewMatrix.multiplyMatrices(V.matrixWorldInverse,M.matrixWorld),M.normalMatrix.getNormalMatrix(M.modelViewMatrix),F.onBeforeRender(E,N,V,O,M,re),F.transparent===!0&&F.side===2&&F.forceSinglePass===!1?(F.side=1,F.needsUpdate=!0,E.renderBufferDirect(V,N,O,F,M,re),F.side=0,F.needsUpdate=!0,E.renderBufferDirect(V,N,O,F,M,re),F.side=2):E.renderBufferDirect(V,N,O,F,M,re),M.onAfterRender(E,N,V,O,F,re)}function rr(M,N,V){N.isScene!==!0&&(N=wt);const O=be.get(M),F=C.state.lights,re=C.state.shadowsArray,he=F.state.version,ge=ne.getParameters(M,F.state,re,N,V,C.state.lightProbeGridArray),ve=ne.getProgramCacheKey(ge);let Pe=O.programs;O.environment=M.isMeshStandardMaterial||M.isMeshLambertMaterial||M.isMeshPhongMaterial?N.environment:null,O.fog=N.fog;const Be=M.isMeshStandardMaterial||M.isMeshLambertMaterial&&!M.envMap||M.isMeshPhongMaterial&&!M.envMap;O.envMap=y.get(M.envMap||O.environment,Be),O.envMapRotation=O.environment!==null&&M.envMap===null?N.environmentRotation:M.envMapRotation,Pe===void 0&&(M.addEventListener("dispose",Re),Pe=new Map,O.programs=Pe);let ke=Pe.get(ve);if(ke!==void 0){if(O.currentProgram===ke&&O.lightsStateVersion===he)return $a(M,ge),ke}else ge.uniforms=ne.getUniforms(M),R!==null&&M.isNodeMaterial&&R.build(M,V,ge),M.onBeforeCompile(ge,E),ke=ne.acquireProgram(ge,ve),Pe.set(ve,ke),O.uniforms=ge.uniforms;const Me=O.uniforms;return(!M.isShaderMaterial&&!M.isRawShaderMaterial||M.clipping===!0)&&(Me.clippingPlanes=ce.uniform),$a(M,ge),O.needsLights=ch(M),O.lightsStateVersion=he,O.needsLights&&(Me.ambientLightColor.value=F.state.ambient,Me.lightProbe.value=F.state.probe,Me.directionalLights.value=F.state.directional,Me.directionalLightShadows.value=F.state.directionalShadow,Me.spotLights.value=F.state.spot,Me.spotLightShadows.value=F.state.spotShadow,Me.rectAreaLights.value=F.state.rectArea,Me.ltc_1.value=F.state.rectAreaLTC1,Me.ltc_2.value=F.state.rectAreaLTC2,Me.pointLights.value=F.state.point,Me.pointLightShadows.value=F.state.pointShadow,Me.hemisphereLights.value=F.state.hemi,Me.directionalShadowMatrix.value=F.state.directionalShadowMatrix,Me.spotLightMatrix.value=F.state.spotLightMatrix,Me.spotLightMap.value=F.state.spotLightMap,Me.pointShadowMatrix.value=F.state.pointShadowMatrix),O.lightProbeGrid=C.state.lightProbeGridArray.length>0,O.currentProgram=ke,O.uniformsList=null,ke}function Xa(M){if(M.uniformsList===null){const N=M.currentProgram.getUniforms();M.uniformsList=tr.seqWithValue(N.seq,M.uniforms)}return M.uniformsList}function $a(M,N){const V=be.get(M);V.outputColorSpace=N.outputColorSpace,V.batching=N.batching,V.batchingColor=N.batchingColor,V.instancing=N.instancing,V.instancingColor=N.instancingColor,V.instancingMorph=N.instancingMorph,V.skinning=N.skinning,V.morphTargets=N.morphTargets,V.morphNormals=N.morphNormals,V.morphColors=N.morphColors,V.morphTargetsCount=N.morphTargetsCount,V.numClippingPlanes=N.numClippingPlanes,V.numIntersection=N.numClipIntersection,V.vertexAlphas=N.vertexAlphas,V.vertexTangents=N.vertexTangents,V.toneMapping=N.toneMapping}function ah(M,N){if(M.length===0)return null;if(M.length===1)return M[0].texture!==null?M[0]:null;b.setFromMatrixPosition(N.matrixWorld);for(let V=0,O=M.length;V<O;V++){const F=M[V];if(F.texture!==null&&F.boundingBox.containsPoint(b))return F}return null}function oh(M,N,V,O,F){N.isScene!==!0&&(N=wt),w.resetTextureUnits();const re=N.fog,he=O.isMeshStandardMaterial||O.isMeshLambertMaterial||O.isMeshPhongMaterial?N.environment:null,ge=z===null?E.outputColorSpace:z.isXRRenderTarget===!0?z.texture.colorSpace:He.workingColorSpace,ve=O.isMeshStandardMaterial||O.isMeshLambertMaterial&&!O.envMap||O.isMeshPhongMaterial&&!O.envMap,Pe=y.get(O.envMap||he,ve),Be=O.vertexColors===!0&&!!V.attributes.color&&V.attributes.color.itemSize===4,ke=!!V.attributes.tangent&&(!!O.normalMap||O.anisotropy>0),Me=!!V.morphAttributes.position,Qe=!!V.morphAttributes.normal,it=!!V.morphAttributes.color;let rt=0;O.toneMapped&&(z===null||z.isXRRenderTarget===!0)&&(rt=E.toneMapping);const $e=V.morphAttributes.position||V.morphAttributes.normal||V.morphAttributes.color,_t=$e!==void 0?$e.length:0,_e=be.get(O),kt=C.state.lights;if(Ce===!0&&(Ye===!0||M!==G)){const Ke=M===G&&O.id===k;ce.setState(O,M,Ke)}let qe=!1;O.version===_e.__version?(_e.needsLights&&_e.lightsStateVersion!==kt.state.version||_e.outputColorSpace!==ge||F.isBatchedMesh&&_e.batching===!1||!F.isBatchedMesh&&_e.batching===!0||F.isBatchedMesh&&_e.batchingColor===!0&&F.colorTexture===null||F.isBatchedMesh&&_e.batchingColor===!1&&F.colorTexture!==null||F.isInstancedMesh&&_e.instancing===!1||!F.isInstancedMesh&&_e.instancing===!0||F.isSkinnedMesh&&_e.skinning===!1||!F.isSkinnedMesh&&_e.skinning===!0||F.isInstancedMesh&&_e.instancingColor===!0&&F.instanceColor===null||F.isInstancedMesh&&_e.instancingColor===!1&&F.instanceColor!==null||F.isInstancedMesh&&_e.instancingMorph===!0&&F.morphTexture===null||F.isInstancedMesh&&_e.instancingMorph===!1&&F.morphTexture!==null||_e.envMap!==Pe||O.fog===!0&&_e.fog!==re||_e.numClippingPlanes!==void 0&&(_e.numClippingPlanes!==ce.numPlanes||_e.numIntersection!==ce.numIntersection)||_e.vertexAlphas!==Be||_e.vertexTangents!==ke||_e.morphTargets!==Me||_e.morphNormals!==Qe||_e.morphColors!==it||_e.toneMapping!==rt||_e.morphTargetsCount!==_t||!!_e.lightProbeGrid!=C.state.lightProbeGridArray.length>0)&&(qe=!0):(qe=!0,_e.__version=O.version);let Dt=_e.currentProgram;qe===!0&&(Dt=rr(O,N,F),R&&O.isNodeMaterial&&R.onUpdateProgram(O,Dt,_e));let jt=!1,mn=!1,Qn=!1;const Je=Dt.getUniforms(),at=_e.uniforms;if(de.useProgram(Dt.program)&&(jt=!0,mn=!0,Qn=!0),O.id!==k&&(k=O.id,mn=!0),_e.needsLights){const Ke=ah(C.state.lightProbeGridArray,F);_e.lightProbeGrid!==Ke&&(_e.lightProbeGrid=Ke,mn=!0)}if(jt||G!==M){de.buffers.depth.getReversed()&&M.reversedDepth!==!0&&(M._reversedDepth=!0,M.updateProjectionMatrix()),Je.setValue(L,"projectionMatrix",M.projectionMatrix),Je.setValue(L,"viewMatrix",M.matrixWorldInverse);const Ke=Je.map.cameraPosition;Ke!==void 0&&Ke.setValue(L,ht.setFromMatrixPosition(M.matrixWorld)),Xe.logarithmicDepthBuffer&&Je.setValue(L,"logDepthBufFC",2/(Math.log(M.far+1)/Math.LN2)),(O.isMeshPhongMaterial||O.isMeshToonMaterial||O.isMeshLambertMaterial||O.isMeshBasicMaterial||O.isMeshStandardMaterial||O.isShaderMaterial)&&Je.setValue(L,"isOrthographic",M.isOrthographicCamera===!0),G!==M&&(G=M,mn=!0,Qn=!0)}if(_e.needsLights&&(kt.state.directionalShadowMap.length>0&&Je.setValue(L,"directionalShadowMap",kt.state.directionalShadowMap,w),kt.state.spotShadowMap.length>0&&Je.setValue(L,"spotShadowMap",kt.state.spotShadowMap,w),kt.state.pointShadowMap.length>0&&Je.setValue(L,"pointShadowMap",kt.state.pointShadowMap,w)),F.isSkinnedMesh){Je.setOptional(L,F,"bindMatrix"),Je.setOptional(L,F,"bindMatrixInverse");const Ke=F.skeleton;Ke&&(Ke.boneTexture===null&&Ke.computeBoneTexture(),Je.setValue(L,"boneTexture",Ke.boneTexture,w))}F.isBatchedMesh&&(Je.setOptional(L,F,"batchingTexture"),Je.setValue(L,"batchingTexture",F._matricesTexture,w),Je.setOptional(L,F,"batchingIdTexture"),Je.setValue(L,"batchingIdTexture",F._indirectTexture,w),Je.setOptional(L,F,"batchingColorTexture"),F._colorsTexture!==null&&Je.setValue(L,"batchingColorTexture",F._colorsTexture,w));const gn=V.morphAttributes;if((gn.position!==void 0||gn.normal!==void 0||gn.color!==void 0)&&Ae.update(F,V,Dt),(mn||_e.receiveShadow!==F.receiveShadow)&&(_e.receiveShadow=F.receiveShadow,Je.setValue(L,"receiveShadow",F.receiveShadow)),(O.isMeshStandardMaterial||O.isMeshLambertMaterial||O.isMeshPhongMaterial)&&O.envMap===null&&N.environment!==null&&(at.envMapIntensity.value=N.environmentIntensity),at.dfgLUT!==void 0&&(at.dfgLUT.value=ku()),mn){if(Je.setValue(L,"toneMappingExposure",E.toneMappingExposure),_e.needsLights&&lh(at,Qn),re&&O.fog===!0&&le.refreshFogUniforms(at,re),le.refreshMaterialUniforms(at,O,Fe,Le,C.state.transmissionRenderTarget[M.id]),_e.needsLights&&_e.lightProbeGrid){const Ke=_e.lightProbeGrid;at.probesSH.value=Ke.texture,at.probesMin.value.copy(Ke.boundingBox.min),at.probesMax.value.copy(Ke.boundingBox.max),at.probesResolution.value.copy(Ke.resolution)}tr.upload(L,Xa(_e),at,w)}if(O.isShaderMaterial&&O.uniformsNeedUpdate===!0&&(tr.upload(L,Xa(_e),at,w),O.uniformsNeedUpdate=!1),O.isSpriteMaterial&&Je.setValue(L,"center",F.center),Je.setValue(L,"modelViewMatrix",F.modelViewMatrix),Je.setValue(L,"normalMatrix",F.normalMatrix),Je.setValue(L,"modelMatrix",F.matrixWorld),O.uniformsGroups!==void 0){const Ke=O.uniformsGroups;for(let Mi=0,ei=Ke.length;Mi<ei;Mi++){const qa=Ke[Mi];q.update(qa,Dt),q.bind(qa,Dt)}}return Dt}function lh(M,N){M.ambientLightColor.needsUpdate=N,M.lightProbe.needsUpdate=N,M.directionalLights.needsUpdate=N,M.directionalLightShadows.needsUpdate=N,M.pointLights.needsUpdate=N,M.pointLightShadows.needsUpdate=N,M.spotLights.needsUpdate=N,M.spotLightShadows.needsUpdate=N,M.rectAreaLights.needsUpdate=N,M.hemisphereLights.needsUpdate=N}function ch(M){return M.isMeshLambertMaterial||M.isMeshToonMaterial||M.isMeshPhongMaterial||M.isMeshStandardMaterial||M.isShadowMaterial||M.isShaderMaterial&&M.lights===!0}this.getActiveCubeFace=function(){return H},this.getActiveMipmapLevel=function(){return X},this.getRenderTarget=function(){return z},this.setRenderTargetTextures=function(M,N,V){const O=be.get(M);O.__autoAllocateDepthBuffer=M.resolveDepthBuffer===!1,O.__autoAllocateDepthBuffer===!1&&(O.__useRenderToTexture=!1),be.get(M.texture).__webglTexture=N,be.get(M.depthTexture).__webglTexture=O.__autoAllocateDepthBuffer?void 0:V,O.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(M,N){const V=be.get(M);V.__webglFramebuffer=N,V.__useDefaultFramebuffer=N===void 0};const dh=L.createFramebuffer();this.setRenderTarget=function(M,N=0,V=0){z=M,H=N,X=V;let O=null,F=!1,re=!1;if(M){const he=be.get(M);if(he.__useDefaultFramebuffer!==void 0){de.bindFramebuffer(L.FRAMEBUFFER,he.__webglFramebuffer),I.copy(M.viewport),Y.copy(M.scissor),J=M.scissorTest,de.viewport(I),de.scissor(Y),de.setScissorTest(J),k=-1;return}else if(he.__webglFramebuffer===void 0)w.setupRenderTarget(M);else if(he.__hasExternalTextures)w.rebindTextures(M,be.get(M.texture).__webglTexture,be.get(M.depthTexture).__webglTexture);else if(M.depthBuffer){const Pe=M.depthTexture;if(he.__boundDepthTexture!==Pe){if(Pe!==null&&be.has(Pe)&&(M.width!==Pe.image.width||M.height!==Pe.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");w.setupDepthRenderbuffer(M)}}const ge=M.texture;(ge.isData3DTexture||ge.isDataArrayTexture||ge.isCompressedArrayTexture)&&(re=!0);const ve=be.get(M).__webglFramebuffer;M.isWebGLCubeRenderTarget?(Array.isArray(ve[N])?O=ve[N][V]:O=ve[N],F=!0):M.samples>0&&w.useMultisampledRTT(M)===!1?O=be.get(M).__webglMultisampledFramebuffer:Array.isArray(ve)?O=ve[V]:O=ve,I.copy(M.viewport),Y.copy(M.scissor),J=M.scissorTest}else I.copy(ye).multiplyScalar(Fe).floor(),Y.copy(ue).multiplyScalar(Fe).floor(),J=Te;if(V!==0&&(O=dh),de.bindFramebuffer(L.FRAMEBUFFER,O)&&de.drawBuffers(M,O),de.viewport(I),de.scissor(Y),de.setScissorTest(J),F){const he=be.get(M.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_CUBE_MAP_POSITIVE_X+N,he.__webglTexture,V)}else if(re){const he=N;for(let ge=0;ge<M.textures.length;ge++){const ve=be.get(M.textures[ge]);L.framebufferTextureLayer(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0+ge,ve.__webglTexture,V,he)}}else if(M!==null&&V!==0){const he=be.get(M.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,he.__webglTexture,V)}k=-1},this.readRenderTargetPixels=function(M,N,V,O,F,re,he,ge=0){if(!(M&&M.isWebGLRenderTarget)){we("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let ve=be.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&he!==void 0&&(ve=ve[he]),ve){de.bindFramebuffer(L.FRAMEBUFFER,ve);try{const Pe=M.textures[ge],Be=Pe.format,ke=Pe.type;if(M.textures.length>1&&L.readBuffer(L.COLOR_ATTACHMENT0+ge),!Xe.textureFormatReadable(Be)){we("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Xe.textureTypeReadable(ke)){we("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}N>=0&&N<=M.width-O&&V>=0&&V<=M.height-F&&L.readPixels(N,V,O,F,Oe.convert(Be),Oe.convert(ke),re)}finally{const Pe=z!==null?be.get(z).__webglFramebuffer:null;de.bindFramebuffer(L.FRAMEBUFFER,Pe)}}},this.readRenderTargetPixelsAsync=async function(M,N,V,O,F,re,he,ge=0){if(!(M&&M.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let ve=be.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&he!==void 0&&(ve=ve[he]),ve)if(N>=0&&N<=M.width-O&&V>=0&&V<=M.height-F){de.bindFramebuffer(L.FRAMEBUFFER,ve);const Pe=M.textures[ge],Be=Pe.format,ke=Pe.type;if(M.textures.length>1&&L.readBuffer(L.COLOR_ATTACHMENT0+ge),!Xe.textureFormatReadable(Be))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Xe.textureTypeReadable(ke))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Me=L.createBuffer();L.bindBuffer(L.PIXEL_PACK_BUFFER,Me),L.bufferData(L.PIXEL_PACK_BUFFER,re.byteLength,L.STREAM_READ),L.readPixels(N,V,O,F,Oe.convert(Be),Oe.convert(ke),0);const Qe=z!==null?be.get(z).__webglFramebuffer:null;de.bindFramebuffer(L.FRAMEBUFFER,Qe);const it=L.fenceSync(L.SYNC_GPU_COMMANDS_COMPLETE,0);return L.flush(),await rl(L,it,4),L.bindBuffer(L.PIXEL_PACK_BUFFER,Me),L.getBufferSubData(L.PIXEL_PACK_BUFFER,0,re),L.deleteBuffer(Me),L.deleteSync(it),re}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(M,N=null,V=0){const O=Math.pow(2,-V),F=Math.floor(M.image.width*O),re=Math.floor(M.image.height*O),he=N!==null?N.x:0,ge=N!==null?N.y:0;w.setTexture2D(M,0),L.copyTexSubImage2D(L.TEXTURE_2D,V,0,0,he,ge,F,re),de.unbindTexture()};const uh=L.createFramebuffer(),hh=L.createFramebuffer();this.copyTextureToTexture=function(M,N,V=null,O=null,F=0,re=0){let he,ge,ve,Pe,Be,ke,Me,Qe,it;const rt=M.isCompressedTexture?M.mipmaps[re]:M.image;if(V!==null)he=V.max.x-V.min.x,ge=V.max.y-V.min.y,ve=V.isBox3?V.max.z-V.min.z:1,Pe=V.min.x,Be=V.min.y,ke=V.isBox3?V.min.z:0;else{const at=Math.pow(2,-F);he=Math.floor(rt.width*at),ge=Math.floor(rt.height*at),M.isDataArrayTexture?ve=rt.depth:M.isData3DTexture?ve=Math.floor(rt.depth*at):ve=1,Pe=0,Be=0,ke=0}O!==null?(Me=O.x,Qe=O.y,it=O.z):(Me=0,Qe=0,it=0);const $e=Oe.convert(N.format),_t=Oe.convert(N.type);let _e;N.isData3DTexture?(w.setTexture3D(N,0),_e=L.TEXTURE_3D):N.isDataArrayTexture||N.isCompressedArrayTexture?(w.setTexture2DArray(N,0),_e=L.TEXTURE_2D_ARRAY):(w.setTexture2D(N,0),_e=L.TEXTURE_2D),de.activeTexture(L.TEXTURE0),de.pixelStorei(L.UNPACK_FLIP_Y_WEBGL,N.flipY),de.pixelStorei(L.UNPACK_PREMULTIPLY_ALPHA_WEBGL,N.premultiplyAlpha),de.pixelStorei(L.UNPACK_ALIGNMENT,N.unpackAlignment);const kt=de.getParameter(L.UNPACK_ROW_LENGTH),qe=de.getParameter(L.UNPACK_IMAGE_HEIGHT),Dt=de.getParameter(L.UNPACK_SKIP_PIXELS),jt=de.getParameter(L.UNPACK_SKIP_ROWS),mn=de.getParameter(L.UNPACK_SKIP_IMAGES);de.pixelStorei(L.UNPACK_ROW_LENGTH,rt.width),de.pixelStorei(L.UNPACK_IMAGE_HEIGHT,rt.height),de.pixelStorei(L.UNPACK_SKIP_PIXELS,Pe),de.pixelStorei(L.UNPACK_SKIP_ROWS,Be),de.pixelStorei(L.UNPACK_SKIP_IMAGES,ke);const Qn=M.isDataArrayTexture||M.isData3DTexture,Je=N.isDataArrayTexture||N.isData3DTexture;if(M.isDepthTexture){const at=be.get(M),gn=be.get(N),Ke=be.get(at.__renderTarget),Mi=be.get(gn.__renderTarget);de.bindFramebuffer(L.READ_FRAMEBUFFER,Ke.__webglFramebuffer),de.bindFramebuffer(L.DRAW_FRAMEBUFFER,Mi.__webglFramebuffer);for(let ei=0;ei<ve;ei++)Qn&&(L.framebufferTextureLayer(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,be.get(M).__webglTexture,F,ke+ei),L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,be.get(N).__webglTexture,re,it+ei)),L.blitFramebuffer(Pe,Be,he,ge,Me,Qe,he,ge,L.DEPTH_BUFFER_BIT,L.NEAREST);de.bindFramebuffer(L.READ_FRAMEBUFFER,null),de.bindFramebuffer(L.DRAW_FRAMEBUFFER,null)}else if(F!==0||M.isRenderTargetTexture||be.has(M)){const at=be.get(M),gn=be.get(N);de.bindFramebuffer(L.READ_FRAMEBUFFER,uh),de.bindFramebuffer(L.DRAW_FRAMEBUFFER,hh);for(let Ke=0;Ke<ve;Ke++)Qn?L.framebufferTextureLayer(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,at.__webglTexture,F,ke+Ke):L.framebufferTexture2D(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,at.__webglTexture,F),Je?L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,gn.__webglTexture,re,it+Ke):L.framebufferTexture2D(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,gn.__webglTexture,re),F!==0?L.blitFramebuffer(Pe,Be,he,ge,Me,Qe,he,ge,L.COLOR_BUFFER_BIT,L.NEAREST):Je?L.copyTexSubImage3D(_e,re,Me,Qe,it+Ke,Pe,Be,he,ge):L.copyTexSubImage2D(_e,re,Me,Qe,Pe,Be,he,ge);de.bindFramebuffer(L.READ_FRAMEBUFFER,null),de.bindFramebuffer(L.DRAW_FRAMEBUFFER,null)}else Je?M.isDataTexture||M.isData3DTexture?L.texSubImage3D(_e,re,Me,Qe,it,he,ge,ve,$e,_t,rt.data):N.isCompressedArrayTexture?L.compressedTexSubImage3D(_e,re,Me,Qe,it,he,ge,ve,$e,rt.data):L.texSubImage3D(_e,re,Me,Qe,it,he,ge,ve,$e,_t,rt):M.isDataTexture?L.texSubImage2D(L.TEXTURE_2D,re,Me,Qe,he,ge,$e,_t,rt.data):M.isCompressedTexture?L.compressedTexSubImage2D(L.TEXTURE_2D,re,Me,Qe,rt.width,rt.height,$e,rt.data):L.texSubImage2D(L.TEXTURE_2D,re,Me,Qe,he,ge,$e,_t,rt);de.pixelStorei(L.UNPACK_ROW_LENGTH,kt),de.pixelStorei(L.UNPACK_IMAGE_HEIGHT,qe),de.pixelStorei(L.UNPACK_SKIP_PIXELS,Dt),de.pixelStorei(L.UNPACK_SKIP_ROWS,jt),de.pixelStorei(L.UNPACK_SKIP_IMAGES,mn),re===0&&N.generateMipmaps&&L.generateMipmap(_e),de.unbindTexture()},this.initRenderTarget=function(M){be.get(M).__webglFramebuffer===void 0&&w.setupRenderTarget(M)},this.initTexture=function(M){M.isCubeTexture?w.setTextureCube(M,0):M.isData3DTexture?w.setTexture3D(M,0):M.isDataArrayTexture||M.isCompressedArrayTexture?w.setTexture2DArray(M,0):w.setTexture2D(M,0),de.unbindTexture()},this.resetState=function(){H=0,X=0,z=null,de.reset(),P.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Rn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=He._getDrawingBufferColorSpace(e),t.unpackColorSpace=He._getUnpackColorSpace()}},Vu=eo(((e,t)=>{var n=(function(){var i=String.fromCharCode,r="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",s="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",a={};function o(c,u){if(!a[c]){a[c]={};for(var h=0;h<c.length;h++)a[c][c.charAt(h)]=h}return a[c][u]}var l={compressToBase64:function(c){if(c==null)return"";var u=l._compress(c,6,function(h){return r.charAt(h)});switch(u.length%4){default:case 0:return u;case 1:return u+"===";case 2:return u+"==";case 3:return u+"="}},decompressFromBase64:function(c){return c==null?"":c==""?null:l._decompress(c.length,32,function(u){return o(r,c.charAt(u))})},compressToUTF16:function(c){return c==null?"":l._compress(c,15,function(u){return i(u+32)})+" "},decompressFromUTF16:function(c){return c==null?"":c==""?null:l._decompress(c.length,16384,function(u){return c.charCodeAt(u)-32})},compressToUint8Array:function(c){for(var u=l.compress(c),h=new Uint8Array(u.length*2),d=0,f=u.length;d<f;d++){var g=u.charCodeAt(d);h[d*2]=g>>>8,h[d*2+1]=g%256}return h},decompressFromUint8Array:function(c){if(c==null)return l.decompress(c);for(var u=new Array(c.length/2),h=0,d=u.length;h<d;h++)u[h]=c[h*2]*256+c[h*2+1];var f=[];return u.forEach(function(g){f.push(i(g))}),l.decompress(f.join(""))},compressToEncodedURIComponent:function(c){return c==null?"":l._compress(c,6,function(u){return s.charAt(u)})},decompressFromEncodedURIComponent:function(c){return c==null?"":c==""?null:(c=c.replace(/ /g,"+"),l._decompress(c.length,32,function(u){return o(s,c.charAt(u))}))},compress:function(c){return l._compress(c,16,function(u){return i(u)})},_compress:function(c,u,h){if(c==null)return"";var d,f,g={},_={},m="",p="",S="",b=2,x=3,C=2,A=[],T=0,v=0,E;for(E=0;E<c.length;E+=1)if(m=c.charAt(E),Object.prototype.hasOwnProperty.call(g,m)||(g[m]=x++,_[m]=!0),p=S+m,Object.prototype.hasOwnProperty.call(g,p))S=p;else{if(Object.prototype.hasOwnProperty.call(_,S)){if(S.charCodeAt(0)<256){for(d=0;d<C;d++)T=T<<1,v==u-1?(v=0,A.push(h(T)),T=0):v++;for(f=S.charCodeAt(0),d=0;d<8;d++)T=T<<1|f&1,v==u-1?(v=0,A.push(h(T)),T=0):v++,f=f>>1}else{for(f=1,d=0;d<C;d++)T=T<<1|f,v==u-1?(v=0,A.push(h(T)),T=0):v++,f=0;for(f=S.charCodeAt(0),d=0;d<16;d++)T=T<<1|f&1,v==u-1?(v=0,A.push(h(T)),T=0):v++,f=f>>1}b--,b==0&&(b=Math.pow(2,C),C++),delete _[S]}else for(f=g[S],d=0;d<C;d++)T=T<<1|f&1,v==u-1?(v=0,A.push(h(T)),T=0):v++,f=f>>1;b--,b==0&&(b=Math.pow(2,C),C++),g[p]=x++,S=String(m)}if(S!==""){if(Object.prototype.hasOwnProperty.call(_,S)){if(S.charCodeAt(0)<256){for(d=0;d<C;d++)T=T<<1,v==u-1?(v=0,A.push(h(T)),T=0):v++;for(f=S.charCodeAt(0),d=0;d<8;d++)T=T<<1|f&1,v==u-1?(v=0,A.push(h(T)),T=0):v++,f=f>>1}else{for(f=1,d=0;d<C;d++)T=T<<1|f,v==u-1?(v=0,A.push(h(T)),T=0):v++,f=0;for(f=S.charCodeAt(0),d=0;d<16;d++)T=T<<1|f&1,v==u-1?(v=0,A.push(h(T)),T=0):v++,f=f>>1}b--,b==0&&(b=Math.pow(2,C),C++),delete _[S]}else for(f=g[S],d=0;d<C;d++)T=T<<1|f&1,v==u-1?(v=0,A.push(h(T)),T=0):v++,f=f>>1;b--,b==0&&(b=Math.pow(2,C),C++)}for(f=2,d=0;d<C;d++)T=T<<1|f&1,v==u-1?(v=0,A.push(h(T)),T=0):v++,f=f>>1;for(;;)if(T=T<<1,v==u-1){A.push(h(T));break}else v++;return A.join("")},decompress:function(c){return c==null?"":c==""?null:l._decompress(c.length,32768,function(u){return c.charCodeAt(u)})},_decompress:function(c,u,h){var d=[],f=4,g=4,_=3,m="",p=[],S,b,x,C,A,T,v,E={val:h(0),position:u,index:1};for(S=0;S<3;S+=1)d[S]=S;for(x=0,A=Math.pow(2,2),T=1;T!=A;)C=E.val&E.position,E.position>>=1,E.position==0&&(E.position=u,E.val=h(E.index++)),x|=(C>0?1:0)*T,T<<=1;switch(x){case 0:for(x=0,A=Math.pow(2,8),T=1;T!=A;)C=E.val&E.position,E.position>>=1,E.position==0&&(E.position=u,E.val=h(E.index++)),x|=(C>0?1:0)*T,T<<=1;v=i(x);break;case 1:for(x=0,A=Math.pow(2,16),T=1;T!=A;)C=E.val&E.position,E.position>>=1,E.position==0&&(E.position=u,E.val=h(E.index++)),x|=(C>0?1:0)*T,T<<=1;v=i(x);break;case 2:return""}for(d[3]=v,b=v,p.push(v);;){if(E.index>c)return"";for(x=0,A=Math.pow(2,_),T=1;T!=A;)C=E.val&E.position,E.position>>=1,E.position==0&&(E.position=u,E.val=h(E.index++)),x|=(C>0?1:0)*T,T<<=1;switch(v=x){case 0:for(x=0,A=Math.pow(2,8),T=1;T!=A;)C=E.val&E.position,E.position>>=1,E.position==0&&(E.position=u,E.val=h(E.index++)),x|=(C>0?1:0)*T,T<<=1;d[g++]=i(x),v=g-1,f--;break;case 1:for(x=0,A=Math.pow(2,16),T=1;T!=A;)C=E.val&E.position,E.position>>=1,E.position==0&&(E.position=u,E.val=h(E.index++)),x|=(C>0?1:0)*T,T<<=1;d[g++]=i(x),v=g-1,f--;break;case 2:return p.join("")}if(f==0&&(f=Math.pow(2,_),_++),d[v])m=d[v];else if(v===g)m=b+b.charAt(0);else return null;p.push(m),d[g++]=b+m.charAt(0),f--,b=m,f==0&&(f=Math.pow(2,_),_++)}}};return l})();typeof define=="function"&&define.amd?define(function(){return n}):typeof t<"u"&&t!=null?t.exports=n:typeof angular<"u"&&angular!=null&&angular.module("LZString",[]).factory("LZString",function(){return n})})),Zn=Vu(),fn=4096,ns=1;function Hu(e){const t=Math.ceil(e.length/8),n=new Uint8Array(t);for(let r=0;r<e.length;r++)e[r]&&(n[r>>3]|=1<<7-(r&7));let i="";for(let r=0;r<n.length;r++)i+=String.fromCharCode(n[r]);return btoa(i)}function Gu(e,t){let n;try{n=atob(e)}catch{return new Array(t).fill(!1)}const i=[];for(let r=0;r<t;r++){const s=r>>3,a=7-(r&7);s<n.length?i.push((n.charCodeAt(s)&1<<a)!==0):i.push(!1)}return i}function Wu(e,t=[]){const n=new Map;for(const a of t)n.set(a.name,a.defaultValue);const i={v:ns,vs:Hu(e.visitedSlides),n:e.visitedSlides.length,cs:e.currentSlide,qs:$u(e.quizScores),vr:qu(e.variables,n),tf:e.triggersFired,lv:Yu(e.layerVisibility),et:Math.round(e.elapsedTime),mc:e.mandatoryCompleted||[]};let r=JSON.stringify(i),s=(0,Zn.compressToEncodedURIComponent)(r);if(s.length<=fn||(console.warn(`[StateCompressor] Budget exceeded (${s.length}/${fn}). Dropping triggersFired.`),i.tf=[],r=JSON.stringify(i),s=(0,Zn.compressToEncodedURIComponent)(r),s.length<=fn))return s;console.warn(`[StateCompressor] Still over budget (${s.length}). Dropping quiz attempt counts.`);for(const a of Object.keys(i.qs))i.qs[a][2]=0;return r=JSON.stringify(i),s=(0,Zn.compressToEncodedURIComponent)(r),s.length<=fn||(console.warn(`[StateCompressor] Still over budget (${s.length}). Dropping layer visibility.`),i.lv={},r=JSON.stringify(i),s=(0,Zn.compressToEncodedURIComponent)(r),s.length<=fn)||(console.warn(`[StateCompressor] Still over budget (${s.length}). Dropping all custom variables. This may cause data loss.`),i.vr={},r=JSON.stringify(i),s=(0,Zn.compressToEncodedURIComponent)(r),s.length<=fn)?s:(console.error(`[StateCompressor] Cannot fit state within ${fn} chars even after full degradation (${s.length}). Truncating.`),s.slice(0,fn))}function Xu(e,t,n=[]){if(!e||e.trim()==="")return null;try{const i=(0,Zn.decompressFromEncodedURIComponent)(e);if(!i)return null;const r=JSON.parse(i);r.v!==ns&&console.warn(`[StateCompressor] State version mismatch: expected ${ns}, got ${r.v}. Attempting best-effort parse.`);const s={};for(const o of n)s[o.name]=o.defaultValue;for(const[o,l]of Object.entries(r.vr||{}))s[o]=l;const a={};for(const[o,l]of Object.entries(r.qs||{}))a[o]={score:l[0],maxScore:l[1],attempts:l[2]};return{visitedSlides:Gu(r.vs,r.n||t),currentSlide:r.cs||0,quizScores:a,variables:s,triggersFired:r.tf||[],layerVisibility:r.lv||{},elapsedTime:r.et||0,mandatoryCompleted:r.mc||[]}}catch(i){return console.error("[StateCompressor] Failed to decompress state:",i),null}}function is(e,t=[]){const n={};for(const i of t)n[i.name]=i.defaultValue;return{visitedSlides:new Array(e).fill(!1),currentSlide:0,quizScores:{},variables:n,triggersFired:[],layerVisibility:{},elapsedTime:0,mandatoryCompleted:[]}}function $u(e){const t={};for(const[n,i]of Object.entries(e))(i.attempts>0||i.score>0)&&(t[n]=[i.score,i.maxScore,i.attempts]);return t}function qu(e,t){const n={};for(const[i,r]of Object.entries(e)){const s=t.get(i);(s===void 0||r!==s)&&(n[i]=r)}return n}function Yu(e){const t={};for(const[n,i]of Object.entries(e))i&&(t[n]=i);return t}function bi(e){switch(e.type){case"slideEnter":return`slideEnter:${e.slideId}`;case"slideExit":return`slideExit:${e.slideId}`;case"quizSubmit":return`quizSubmit:${e.quizId}`;case"click":return`click:${e.targetId}`;case"variableChange":return`variableChange:${e.varName}`;case"timerElapsed":return`timerElapsed:${e.seconds}`;case"courseStart":return"courseStart";case"layerShown":return`layerShown:${e.layerId}`;case"layerHidden":return`layerHidden:${e.layerId}`}}function Lt(e,t){switch(e.kind){case"literal":return e.value;case"variable":return t.variables[e.varName]??"";case"quizScore":return t.quizScores[e.quizId]?.score??0;case"quizMaxScore":return t.quizScores[e.quizId]?.maxScore??0;case"quizAttempts":return t.quizScores[e.quizId]?.attempts??0}}function pn(e){if(typeof e=="number")return e;if(typeof e=="boolean")return e?1:0;const t=Number(e);return isNaN(t)?0:t}function Jn(e,t){switch(e.op){case"eq":return Lt(e.left,t)==Lt(e.right,t);case"neq":return Lt(e.left,t)!=Lt(e.right,t);case"gt":return pn(Lt(e.left,t))>pn(Lt(e.right,t));case"gte":return pn(Lt(e.left,t))>=pn(Lt(e.right,t));case"lt":return pn(Lt(e.left,t))<pn(Lt(e.right,t));case"lte":return pn(Lt(e.left,t))<=pn(Lt(e.right,t));case"and":return e.conditions.every(n=>Jn(n,t));case"or":return e.conditions.some(n=>Jn(n,t));case"not":return!Jn(e.condition,t);case"visited":return ju(e.slideId,t);case"scoreAbove":return(t.quizScores[e.quizId]?.score??0)>e.threshold;case"scoreBelow":return(t.quizScores[e.quizId]?.score??0)<e.threshold;case"allSlidesVisited":return t.visitedSlides.every(n=>n);case"layerVisible":return t.layerVisibility[e.layerId]===!0}}function ju(e,t){const n=Number(e);return!isNaN(n)&&n>=0&&n<t.visitedSlides.length?t.visitedSlides[n]:!1}var Ku=class{constructor(e,t){this.rulesById=new Map,this.subscriptions=new Map,this.slideIdToIndex=new Map,this.slideIdToIndex=t??new Map;for(const n of e){this.rulesById.set(n.id,n);const i=bi(n.event),r=this.subscriptions.get(i)||[];r.push(n.id),this.subscriptions.set(i,r)}}dispatch(e,t){const n=bi(e),i=this.subscriptions.get(n);if(!i||i.length===0)return[];const r=[],s=new Set(t.triggersFired);for(const a of i){const o=this.rulesById.get(a);if(o&&!(o.oneShot&&s.has(o.id))){if(o.condition){const l=this.resolveStateSlideIds(t);if(!Jn(o.condition,l))continue}r.push(...o.actions)}}return r}getMatchingRuleIds(e,t){const n=bi(e),i=this.subscriptions.get(n);if(!i)return[];const r=[],s=new Set(t.triggersFired);for(const a of i){const o=this.rulesById.get(a);if(o&&!(o.oneShot&&s.has(o.id))){if(o.condition){const l=this.resolveStateSlideIds(t);if(!Jn(o.condition,l))continue}r.push(o.id)}}return r}resolveStateSlideIds(e){return this.slideIdToIndex.size===0,e}getRule(e){return this.rulesById.get(e)}get ruleCount(){return this.rulesById.size}};function Zu(e,t,n){const i=new Set(t.triggersFired),r=bi(e),s=[],a=[];for(const o of n)bi(o.event)===r&&(o.oneShot&&i.has(o.id)||o.condition&&!Jn(o.condition,t)||(s.push(...o.actions),a.push(o.id)));return{actions:s,firedRuleIds:a}}var Ju=class{constructor(e,t){this.rules=e,this.engine=new Ku(e,t)}async dispatch(e,t){return this.dispatchSync(e,t)}dispatchSync(e,t){return Zu(e,t,this.rules)}get isUsingWorker(){return!1}dispose(){}},Qu=/____/g;function eh(e){const t=String(e||"").match(Qu);return t?t.length:0}function th(e){const t=Array.isArray(e.answers)?e.answers.length:0,n=Math.max(t,eh(e.question||""),1),i=Array.isArray(e.answers)&&e.answers.length>0?e.answers:[e.answer||""];return Array.from({length:n},(r,s)=>String(i[s]??""))}function nh(e){return String(e).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function ih(e,t=30){if(!e)return"#f0f0f0";let n=!1;e[0]==="#"&&(e=e.slice(1),n=!0);const i=parseInt(e,16);let r=(i>>16)-t;r<0&&(r=0);let s=(i>>8&255)-t;s<0&&(s=0);let a=(i&255)-t;return a<0&&(a=0),(n?"#":"")+(a|s<<8|r<<16).toString(16).padStart(6,"0")}var rh=class{constructor(){this.slideIdToIndex=new Map,this.autoCommitInterval=null,this.startTime=0,this.mandatoryIds=new Set,this.lmsMasteryScore=null,this.sessionFinished=!1,this.sidebarCollapsed=!1,this.bgAudioElement=null,this.bgAudioPausedByMedia=!1,this.scorm=new ro}async boot(e){this.course=e,this.course.slides.forEach((r,s)=>{this.slideIdToIndex.set(r.id,s)}),await new Promise(r=>setTimeout(r,50)),this.scorm.initialize();const t=this.course.slides.length;if(this.scorm.isConnected){const r=this.scorm.getValue("cmi.student_data.mastery_score"),s=parseFloat(r);this.lmsMasteryScore=!isNaN(s)&&s>0?s:null,this.lmsMasteryScore!==null?console.info(`[Runtime] LMS mastery score override: ${this.lmsMasteryScore}% (course default: ${this.course.policy?.passingScore??0}%)`):console.info(`[Runtime] No LMS mastery score returned from cmi.student_data.mastery_score (raw: ${JSON.stringify(r)}, LMS error: ${this.scorm.lastError.code||"0"}) — using course policy: ${this.course.policy?.passingScore??0}%`);const a=Xu(this.scorm.getValue("cmi.suspend_data"),t,this.course.variables);let o=!1;if(a)this.state=a,console.info("[Runtime] Resumed from suspend_data at slide",this.state.currentSlide),(this.state.currentSlide>0||Object.keys(this.state.visitedSlides).length>1)&&(o=!0);else{this.state=is(t,this.course.variables);const c=this.scorm.getValue("cmi.core.lesson_location"),u=parseInt(c,10);!isNaN(u)&&u>0&&u<t?(this.state.currentSlide=u,console.info("[Runtime] suspend_data absent/corrupt — restored slide from lesson_location:",u),o=!0):console.info("[Runtime] Fresh start — no saved state found")}if(o){const c=document.getElementById("cf-resume-prompt"),u=document.getElementById("cf-prompt-resume-btn"),h=document.getElementById("cf-prompt-restart-btn"),d=document.getElementById("cf-prompt-title");if(d&&this.course.title&&(d.textContent=this.course.title),c&&u&&h&&(c.style.display="flex",await new Promise(f=>{u.onclick=()=>{c.style.display="none",f("resume")},h.onclick=()=>{c.style.display="none",f("restart")}})==="restart")){this.restartCourse(),this.setupPostBootListeners();return}}const l=this.scorm.getValue("cmi.core.lesson_status");(!l||l==="not attempted"||l==="")&&(this.scorm.setValue("cmi.core.lesson_status","incomplete"),this.scorm.commit())}else this.state=is(t,this.course.variables),console.info("[Runtime] Offline mode — no LMS connected");if(this.scorm.isConnected){const r=this.scorm.getValue("cmi.core.lesson_mode");r&&console.info(`[Runtime] Lesson mode: ${r}`)}for(const r of this.course.slides)for(const s of r.layers)for(const a of s.components)(a.type==="quiz"||a.type==="video"||a.type==="audio"||a.type==="interactive-video"||a.type==="storyline-video")&&a.mandatory&&this.mandatoryIds.add(a.id),a.type==="true_false"&&a.mandatory&&this.mandatoryIds.add(a.id),a.type==="fill_blanks"&&a.mandatory&&this.mandatoryIds.add(a.id),a.type==="multi_select"&&a.mandatory&&this.mandatoryIds.add(a.id),a.type==="matching"&&a.mandatory&&this.mandatoryIds.add(a.id);this.dispatcher=new Ju(this.course.triggers,this.slideIdToIndex);try{sessionStorage.getItem("cf-sidebar-collapsed")==="1"&&(this.sidebarCollapsed=!0)}catch{}this.startTime=Date.now()-this.state.elapsedTime*1e3,this.setupPostBootListeners(),this.persistState(),await this.fireTrigger({type:"courseStart"});const n=this.course.slides[this.state.currentSlide];n&&await this.fireTrigger({type:"slideEnter",slideId:n.id}),this.registerKeyboardNav(),console.info(`[Runtime] CourseForge runtime booted — ${t} slides, ${this.course.triggers.length} triggers, Worker: ${this.dispatcher.isUsingWorker}`),this.renderSidebar(),this.bindNavigationButtons();const i=document.getElementById("cf-sidebar-toggle");i&&i.addEventListener("click",()=>this.toggleSidebar()),this.applySidebarState(),this.checkCompletion()}setupPostBootListeners(){if(this.autoCommitInterval)return;this.autoCommitInterval=setInterval(()=>{this.persistState()},6e4);const e=()=>{this.sessionFinished||(this.sessionFinished=!0,this.persistState(),this.scorm.isConnected&&this.scorm.finish())};window.addEventListener("pagehide",e),window.addEventListener("beforeunload",e),document.addEventListener("visibilitychange",()=>{document.visibilityState==="hidden"&&!this.sessionFinished&&this.persistState()}),this.state.visitedSlides[this.state.currentSlide]=!0,this.renderSlide(this.state.currentSlide),this.registerMediaListeners()}bindNavigationButtons(){const e=document.getElementById("cf-prev-btn"),t=document.getElementById("cf-next-btn"),n=document.getElementById("cf-restart-btn");e&&!e.dataset.bound&&(e.dataset.bound="true",e.addEventListener("click",()=>{this.prevSlide()})),t&&!t.dataset.bound&&(t.dataset.bound="true",t.addEventListener("click",()=>{this.nextSlide()})),n&&!n.dataset.bound&&(n.dataset.bound="true",n.addEventListener("click",()=>{this.restartCourse()}))}restartCourse(){const e=this.course.slides.length;this.state=is(e,this.course.variables),this.startTime=Date.now(),this.sessionFinished=!1,this.state.visitedSlides[0]=!0,this.renderSlide(0),this.renderSidebar(),this.persistState(),this.scorm.isConnected&&(this.scorm.setValue("cmi.core.lesson_status","incomplete"),this.scorm.setValue("cmi.core.score.raw","0"),this.scorm.setValue("cmi.core.score.max","100"),this.scorm.setValue("cmi.core.score.min","0"),this.scorm.setValue("cmi.core.lesson_location","0"),this.scorm.commit()),this.fireTrigger({type:"courseStart"}).then(()=>{const t=this.course.slides[0];t&&this.fireTrigger({type:"slideEnter",slideId:t.id})}),this.renderFeedback("Course restarted from the beginning.","info")}registerMediaListeners(){const e=()=>{!Array.from(document.querySelectorAll("video, audio")).some(t=>{const n=t;return n!==this.bgAudioElement&&!n.paused&&!n.ended})&&this.bgAudioElement&&this.bgAudioPausedByMedia&&(this.bgAudioElement.play().catch(t=>console.warn("Auto-resume failed",t)),this.bgAudioPausedByMedia=!1)};document.addEventListener("play",t=>{const n=t.target;(n.tagName==="VIDEO"||n.tagName==="AUDIO")&&n!==this.bgAudioElement&&this.bgAudioElement&&!this.bgAudioElement.paused&&(this.bgAudioElement.pause(),this.bgAudioPausedByMedia=!0)},!0),document.addEventListener("pause",t=>{const n=t.target;(n.tagName==="VIDEO"||n.tagName==="AUDIO")&&n!==this.bgAudioElement&&setTimeout(e,50)},!0),document.addEventListener("ended",t=>{const n=t.target;(n.tagName==="VIDEO"||n.tagName==="AUDIO")&&n!==this.bgAudioElement&&setTimeout(e,50)},!0)}async goToSlide(e){const t=typeof e=="string"?this.slideIdToIndex.get(e)??-1:e;if(t<0||t>=this.course.slides.length){console.warn(`[Runtime] Invalid slide: ${e}`);return}const n=this.course.slides[t];if(n&&n.locked)for(let s=0;s<t;s++){const a=this.course.slides[s],o=!!this.state.visitedSlides[s],l=this.areMandatoryItemsComplete(a);if(!o||!l){this.renderFeedback(`Slide "${n.title||`Slide ${t+1}`}" is locked until all previous slides are completed.`,"info");return}}if(t>this.state.currentSlide)for(let s=this.state.currentSlide;s<t;s++){const a=this.course.slides[s];if(a&&!this.areMandatoryItemsComplete(a)){this.renderFeedback("Please complete all mandatory items on intermediate slides","info");return}}const i=this.course.slides[this.state.currentSlide];i&&await this.fireTrigger({type:"slideExit",slideId:i.id}),this.state.currentSlide=t,this.state.visitedSlides[t]=!0,this.renderSlide(t),this.renderSidebar(),this.persistState();const r=this.course.slides[t];r&&await this.fireTrigger({type:"slideEnter",slideId:r.id})}async nextSlide(){const e=this.state.currentSlide+1;e<this.course.slides.length&&await this.goToSlide(e)}async prevSlide(){const e=this.state.currentSlide-1;e>=0&&await this.goToSlide(e)}async fireTrigger(e){const t=await this.dispatcher.dispatch(e,this.state);for(const n of t.firedRuleIds)this.course.triggers.find(i=>i.id===n)?.oneShot&&!this.state.triggersFired.includes(n)&&this.state.triggersFired.push(n);for(const n of t.actions)await this.executeAction(n)}async executeAction(e){switch(e.type){case"goToSlide":await this.goToSlide(e.slideId);break;case"nextSlide":await this.nextSlide();break;case"prevSlide":await this.prevSlide();break;case"setVariable":{const t=this.state.variables[e.varName];this.state.variables[e.varName]=e.value,t!==e.value&&await this.fireTrigger({type:"variableChange",varName:e.varName});break}case"incrementVariable":{const t=Number(this.state.variables[e.varName]??0)+e.amount;this.state.variables[e.varName]=t,await this.fireTrigger({type:"variableChange",varName:e.varName});break}case"showLayer":this.state.layerVisibility[e.layerId]=!0,this.renderLayerVisibility(),await this.fireTrigger({type:"layerShown",layerId:e.layerId});break;case"hideLayer":this.state.layerVisibility[e.layerId]=!1,this.renderLayerVisibility(),await this.fireTrigger({type:"layerHidden",layerId:e.layerId});break;case"toggleLayer":{const t=this.state.layerVisibility[e.layerId]??!1;this.state.layerVisibility[e.layerId]=!t,this.renderLayerVisibility(),t?await this.fireTrigger({type:"layerHidden",layerId:e.layerId}):await this.fireTrigger({type:"layerShown",layerId:e.layerId});break}case"setStatus":this.scorm.isConnected&&(this.scorm.setValue("cmi.core.lesson_status",e.status),this.scorm.commit());break;case"setScore":this.scorm.isConnected&&(this.scorm.setValue("cmi.core.score.raw",String(e.score)),this.scorm.setValue("cmi.core.score.max",String(e.maxScore)),this.scorm.setValue("cmi.core.score.min","0"),this.scorm.commit());break;case"showFeedback":this.renderFeedback(e.message,e.feedbackType);break}}async submitQuiz(e,t){let n=null;for(const a of this.course.slides)for(const o of a.layers)for(const l of o.components)l.type==="quiz"&&l.id===e&&(n=l);if(!n||n.type!=="quiz"){console.warn(`[Runtime] Quiz not found: ${e}`);return}const i=t===n.correctAnswer,r=this.state.quizScores[e]||{score:0,maxScore:1,attempts:0};this.state.quizScores[e]={score:i?1:0,maxScore:1,attempts:r.attempts+1},await this.fireTrigger({type:"quizSubmit",quizId:e});const s=n.feedback;this.renderFeedback(i?s.correct:s.incorrect,i?"correct":"incorrect"),this.mandatoryIds.has(e)&&!this.state.mandatoryCompleted.includes(e)&&this.state.mandatoryCompleted.push(e),this.persistState(),this.reportScore()}async submitGenericQuiz(e,t){const n=this.state.quizScores[e]||{score:0,maxScore:1,attempts:0};if(this.state.quizScores[e]={score:t,maxScore:1,attempts:n.attempts+1},await this.fireTrigger({type:"quizSubmit",quizId:e}),this.mandatoryIds.has(e)&&!this.state.mandatoryCompleted.includes(e)){this.state.mandatoryCompleted.push(e);const i=document.getElementById(`mandatory-badge-${e}`);i&&(i.textContent="✓ COMPLETED",i.style.background="#052e16",i.style.color="#4ade80",i.style.borderColor="#166534")}this.persistState(),this.reportScore()}toggleSidebar(){this.sidebarCollapsed=!this.sidebarCollapsed,this.applySidebarState();try{sessionStorage.setItem("cf-sidebar-collapsed",this.sidebarCollapsed?"1":"0")}catch{}}applySidebarState(){const e=document.getElementById("cf-sidebar"),t=document.getElementById("cf-sidebar-toggle");e&&e.classList.toggle("sidebar-collapsed",this.sidebarCollapsed),t&&t.setAttribute("aria-expanded",this.sidebarCollapsed?"false":"true")}renderSidebar(){if(!document.getElementById("cf-sidebar"))return;const e=document.getElementById("cf-sidebar-progress-text"),t=document.getElementById("cf-sidebar-progress-bar"),n=document.getElementById("cf-sidebar-menu");if(!e||!t||!n)return;const i=this.state.visitedSlides.filter(Boolean).length,r=Math.round(i/this.course.slides.length*100);e.textContent=`${r}% COMPLETE`,t.style.width=`${r}%`,n.innerHTML="",this.course.slides.forEach((s,a)=>{const o=document.createElement("div");o.className="cf-rt-menu-item";const l=a===this.state.currentSlide,c=!!this.state.visitedSlides[a],u=this.areMandatoryItemsComplete(s);let h=!1;if(s.locked)for(let g=0;g<a;g++){const _=this.course.slides[g],m=!!this.state.visitedSlides[g],p=this.areMandatoryItemsComplete(_);if(!m||!p){h=!0;break}}l&&o.classList.add("active"),h?o.classList.add("locked-slide"):c&&u?o.classList.add("completed"):c||o.classList.add("locked"),o.onclick=()=>this.goToSlide(a);const d=document.createElement("div");d.className="cf-rt-menu-item-icon",h&&(d.innerHTML='<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #a1a1aa;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>');const f=document.createElement("div");f.className="cf-rt-menu-item-title",f.textContent=s.title||`Slide ${a+1}`,o.appendChild(d),o.appendChild(f),n.appendChild(o)})}areMandatoryItemsComplete(e){for(const t of e.layers)for(const n of t.components)if(this.mandatoryIds.has(n.id)&&!this.state.mandatoryCompleted.includes(n.id))return!1;return!0}markMandatoryComplete(e){if(this.mandatoryIds.has(e)&&!this.state.mandatoryCompleted.includes(e)){this.state.mandatoryCompleted.push(e),this.persistState();const t=document.getElementById(`mandatory-badge-${e}`);t&&(t.textContent="✓ COMPLETED",t.style.background="#052e16",t.style.color="#4ade80",t.style.borderColor="#166534")}}calculateScore(){const e=new Set(["quiz","true_false","fill_blanks","multi_select","matching"]);let t=0,n=0;for(const r of this.course.slides)for(const s of r.layers)for(const a of s.components)if(e.has(a.type)){const o=a.marks,l=typeof o=="number"&&o>0?o:1;t+=l;const c=this.state.quizScores[a.id];if(c){const u=typeof c.maxScore=="number"&&c.maxScore>0?c.maxScore:1,h=Math.max(0,Math.min(1,c.score/u));n+=l*h}}if(t===0)return{raw:100,max:100,pct:100};const i=Math.round(n/t*100);return{raw:n,max:t,pct:i}}reportScore(){if(!this.scorm.isConnected)return;const{pct:e}=this.calculateScore();this.scorm.setValue("cmi.core.score.raw",String(e)),this.scorm.setValue("cmi.core.score.max","100"),this.scorm.setValue("cmi.core.score.min","0"),this.scorm.commit()}checkCompletion(e=!1){if(!e)return;const t=[...this.mandatoryIds].every(i=>this.state.mandatoryCompleted.includes(i)),n=this.state.visitedSlides.every(i=>i===!0);if(t&&n){const{raw:i,max:r,pct:s}=this.calculateScore(),a=this.lmsMasteryScore??this.course.policy?.passingScore??0,o=s>=a;let l;if(o)l="passed";else if(e)l="failed";else return;this.scorm.isConnected&&(this.scorm.setValue("cmi.core.lesson_status",l),this.scorm.setValue("cmi.core.score.raw",String(s)),this.scorm.setValue("cmi.core.score.max","100"),this.scorm.setValue("cmi.core.score.min","0"),this.scorm.commit()),console.info(`[Runtime] Course marked as ${l} — ${i}/${r} marks (${s}%, pass mark: ${a}%, source: ${this.lmsMasteryScore!==null?"LMS":"course policy"}).`)}}persistState(){if(this.state.elapsedTime=Math.round((Date.now()-this.startTime)/1e3),!this.scorm.isConnected)return;const e=Wu(this.state,this.course.variables),t=this.scorm.setValue("cmi.suspend_data",e);this.scorm.setValue("cmi.core.lesson_location",String(this.state.currentSlide));const n=this.state.elapsedTime,i=Math.floor(n/3600),r=Math.floor(n%3600/60),s=n%60,a=`${String(i).padStart(4,"0")}:${String(r).padStart(2,"0")}:${String(s).padStart(2,"0")}.00`;this.scorm.setValue("cmi.core.session_time",a);const o=this.scorm.commit();console.debug(`[Runtime] persistState: suspend_data=${e.length}ch, slide=${this.state.currentSlide}, sdOk=${t}, committed=${o}`)}showAudioUnlockOverlay(){if(document.getElementById("cf-audio-unlock"))return;const e=document.createElement("div");e.id="cf-audio-unlock",e.style.cssText=`
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(5px);
      display: flex; align-items: center; justify-content: center;
      flex-direction: column; color: white; font-family: sans-serif;
    `;const t=document.createElement("button");t.innerHTML="▶ Start Course / Enable Audio",t.style.cssText=`
      background: #c0392b; color: white; border: none;
      padding: 16px 32px; font-size: 18px; font-weight: bold;
      border-radius: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      transition: transform 0.2s, background 0.2s;
    `,t.onmouseover=()=>t.style.background="#8b1a1a",t.onmouseout=()=>t.style.background="#c0392b",t.addEventListener("click",()=>{this.bgAudioElement&&this.bgAudioElement.play().catch(i=>console.warn("Still blocked after interaction:",i)),e.remove()}),e.appendChild(t);const n=document.createElement("p");n.textContent="Your browser requires you to click before audio can play.",n.style.cssText="margin-top: 16px; font-size: 14px; color: #a1a1aa;",e.appendChild(n),document.body.appendChild(e)}getContrastColor(e){if(!e||e[0]!=="#")return"#ffffff";let t=0,n=0,i=0;if(e.length===4)t=parseInt(e[1]+e[1],16),n=parseInt(e[2]+e[2],16),i=parseInt(e[3]+e[3],16);else if(e.length===7)t=parseInt(e.substring(1,3),16),n=parseInt(e.substring(3,5),16),i=parseInt(e.substring(5,7),16);else return"#ffffff";return(t*299+n*587+i*114)/1e3>=128?"#111112":"#ffffff"}renderSlide(e){const t=this.course.slides[e];if(!t)return;const n=document.getElementById("cf-slide-container");if(!n)return;let i="#18181b";const r=t.background;r?r.type==="color"&&r.value?(i=r.value,n.style.backgroundColor=r.value,n.style.backgroundImage="none"):r.type==="image"&&r.value&&(n.style.backgroundColor="#18181b",n.style.backgroundImage=`url("${r.value}")`,n.style.backgroundSize="cover",n.style.backgroundPosition="center"):(n.style.backgroundColor="#18181b",n.style.backgroundImage="none"),n.style.color=this.getContrastColor(i);const s=t.bgAudio,a=s?s.src||s.url:null,o=()=>{this.bgAudioElement&&this.bgAudioElement.play().catch(l=>{console.warn("Background audio play blocked:",l),l.name==="NotAllowedError"&&this.showAudioUnlockOverlay()})};if(a){this.bgAudioElement||(this.bgAudioElement=document.createElement("audio"),this.bgAudioElement.loop=!0);const l=new URL(a,window.location.href).href;this.bgAudioElement.src!==l&&(this.bgAudioElement.pause(),this.bgAudioElement.src=l,this.bgAudioElement.currentTime=0)}else this.bgAudioElement&&(this.bgAudioElement.pause(),this.bgAudioElement.removeAttribute("src"),this.bgAudioElement.load());this.bgAudioPausedByMedia=!1,this.bgAudioElement&&this.bgAudioElement.src&&o(),n.innerHTML="";for(const l of t.layers){const c=document.createElement("div");c.className="cf-rt-layer",c.id=`layer-${l.id}`,c.dataset.layerId=l.id;const u=this.state.layerVisibility[l.id]??l.visible;c.style.display=u?"block":"none";for(const h of l.components){const d=this.renderComponent(h);d&&c.appendChild(d)}n.appendChild(c)}this.updateNavUI(e)}getEmbeddableVideoSrc(e,t){if(!e||t!=="youtube"&&t!=="vimeo")return e;try{const n=new URL(e,window.location.href),i=n.hostname.replace(/^www\./,"").toLowerCase(),r=n.pathname.replace(/^\/+/,"");if(t==="youtube"){let s="";if(i==="youtu.be"?s=r.split("/")[0]:r==="watch"?s=n.searchParams.get("v")||"":(r.startsWith("embed/")||r.startsWith("shorts/")||r.startsWith("live/"))&&(s=r.split("/")[1]||""),/^[A-Za-z0-9_-]{11}$/.test(s))return`https://www.youtube.com/embed/${s}?rel=0`}if(t==="vimeo"){const s=r.match(/\d+/);if(s)return`https://player.vimeo.com/video/${s[0]}`}}catch{return e}return e}getAnimationFrames(e){switch(e){case"fade-in":return[{opacity:0},{opacity:1}];case"fade-in-up":return[{opacity:0,transform:"translateY(20px)"},{opacity:1,transform:"translateY(0)"}];case"slide-in-left":return[{opacity:0,transform:"translateX(-30px)"},{opacity:1,transform:"translateX(0)"}];case"slide-in-right":return[{opacity:0,transform:"translateX(30px)"},{opacity:1,transform:"translateX(0)"}];case"slide-in-up":return[{opacity:0,transform:"translateY(30px)"},{opacity:1,transform:"translateY(0)"}];case"slide-in-down":return[{opacity:0,transform:"translateY(-30px)"},{opacity:1,transform:"translateY(0)"}];case"zoom-in":return[{opacity:0,transform:"scale(0.95)"},{opacity:1,transform:"scale(1)"}];case"zoom-out":return[{opacity:0,transform:"scale(1.05)"},{opacity:1,transform:"scale(1)"}];case"flip-in":return[{opacity:0,transform:"perspective(400px) rotateX(90deg)"},{opacity:1,transform:"perspective(400px) rotateX(0deg)"}];case"bounce-in":return[{opacity:0,transform:"scale(0.3)"},{opacity:1,transform:"scale(1.05)",offset:.5},{opacity:1,transform:"scale(0.9)",offset:.7},{opacity:1,transform:"scale(1)"}];default:return null}}applyComponentAnimation(e,t,n){if(!t||t==="none"){e.style.opacity="1";return}const i=this.getAnimationFrames(t);if(!i){e.style.opacity="1";return}const r=Math.max(0,n||0)*1e3;e.style.opacity="0",requestAnimationFrame(()=>{if(typeof e.animate=="function"){const s=e.animate(i,{duration:600,delay:r,easing:"ease-out",fill:"forwards"});s.onfinish=()=>{e.style.opacity="1"},s.oncancel=()=>{e.style.opacity="1"}}else e.style.animationDelay=`${n||0}s`,e.classList.add(`animate-${t}`),setTimeout(()=>{e.style.opacity="1"},r+650)})}renderComponent(e){const t=document.createElement("div"),n=e.animation||"none";t.className="cf-rt-component",t.id=`comp-${e.id}`;const i=e.animationDelay||0,r=e.blockFormat;if(r){if(r.bgColor&&r.bgColor!=="none"){const s=r.bgOpacity!==void 0?r.bgOpacity:1,a=r.bgColor.replace("#",""),o=parseInt(a.substring(0,2),16),l=parseInt(a.substring(2,4),16),c=parseInt(a.substring(4,6),16);t.style.background=`rgba(${o},${l},${c},${s})`}r.bgImage&&(t.style.backgroundImage=`url('${r.bgImage}')`,t.style.backgroundSize=r.bgImageSize||"cover",t.style.backgroundPosition="center",t.style.backgroundRepeat="no-repeat"),(r.paddingV!==void 0||r.paddingH!==void 0)&&(t.style.padding=`${r.paddingV??10}px ${r.paddingH??12}px`),r.borderRadius!==void 0&&(t.style.borderRadius=`${r.borderRadius}px`),r.borderWidth&&r.borderWidth>0&&(t.style.border=`${r.borderWidth}px solid ${r.borderColor||"#e8c8c8"}`),r.width&&r.width!=="100%"&&(t.style.width=r.width,t.style.marginLeft="auto",t.style.marginRight="auto"),r.minHeight&&r.minHeight>0&&(t.style.minHeight=`${r.minHeight}px`)}switch(e.type){case"text":{const s=document.createElement("div");s.className="cf-rt-text",s.innerHTML=e.content,t.appendChild(s);break}case"heading":{const s=`h${e.level||2}`,a=document.createElement(s);a.className="cf-rt-heading",a.innerHTML=e.content,t.appendChild(a);break}case"image":{t.style.textAlign="center";const s=document.createElement("img");if(s.className="cf-rt-image",s.src=e.src,s.alt=e.alt||"",s.loading="lazy",s.style.width=e.width||"100%",t.appendChild(s),e.caption){const a=document.createElement("div");a.style.marginTop="8px",a.style.fontSize="14px",a.style.color="#a1a1aa",a.textContent=e.caption,t.appendChild(a)}break}case"image-hotspot":{t.style.position="relative",t.style.display="inline-block",t.style.width="100%";const s=document.createElement("img");s.src=e.src,s.style.width="100%",s.style.borderRadius="8px",s.style.display="block",t.appendChild(s);let a=null,o=null;const l=()=>{o&&(o.remove(),o=null),a=null};(e.hotspots||[]).forEach(c=>{const u=document.createElement("div");u.style.position="absolute",u.style.left=`${c.x}%`,u.style.top=`${c.y}%`,u.style.width="24px",u.style.height="24px",u.style.backgroundColor="#b91c1c",u.style.borderRadius="50%",u.style.border="2px solid white",u.style.transform="translate(-50%, -50%)",u.style.cursor="pointer",u.style.zIndex="10",u.onclick=h=>{if(h.stopPropagation(),a===c.id)l();else{l(),a=c.id,o=document.createElement("div"),o.style.position="absolute",o.style.top=`${c.y}%`,o.style.left=`${c.x}%`,o.style.transform=`translate(${c.x>50?"-105%":"5%"}, ${c.y>50?"-105%":"5%"})`,o.style.background=c.popupColor||"#000",o.style.border="1px solid #404040",o.style.color="#fff",o.style.padding="1rem",o.style.borderRadius="6px",o.style.zIndex="50",o.style.minWidth="250px",o.style.maxWidth="300px";const d=document.createElement("div");d.style.display="flex",d.style.justifyContent="space-between",d.style.alignItems="center",d.style.marginBottom="0.5rem";const f=document.createElement("h4");f.style.margin="0",f.style.fontSize="1.1rem",f.textContent=c.title;const g=document.createElement("button");g.textContent="X",g.style.background="transparent",g.style.border="none",g.style.color="#a3a3a3",g.style.cursor="pointer",g.onclick=l,d.appendChild(f),d.appendChild(g);const _=document.createElement("p");_.style.margin="0",_.style.fontSize="0.9rem",_.style.lineHeight="1.5",_.textContent=c.content,o.appendChild(d),o.appendChild(_),t.appendChild(o)}},t.appendChild(u)});break}case"360-image-hotspot":{t.style.position="relative",t.style.display="block",t.style.width="100%",t.style.borderRadius="8px",t.style.overflow="hidden";const s=document.createElement("div");s.style.width="100%",s.style.height="400px",s.style.position="relative",s.style.background="#000000",s.style.cursor="grab",t.appendChild(s);const a=document.createElement("button");a.type="button",a.style.position="absolute",a.style.top="12px",a.style.right="12px",a.style.background="rgba(0,0,0,0.6)",a.style.border="1px solid rgba(255,255,255,0.15)",a.style.color="#fff",a.style.borderRadius="4px",a.style.width="32px",a.style.height="32px",a.style.cursor="pointer",a.style.zIndex="30",a.style.display="flex",a.style.alignItems="center",a.style.justifyContent="center",a.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>',s.appendChild(a);let o=0,l=!1,c=0,u=0;a.onclick=I=>{I.stopPropagation(),o=0};const h=new Ul,d=new It(75,1,1,1100),f=new zu({antialias:!0,alpha:!0});f.setPixelRatio(Math.min(window.devicePixelRatio,2)),f.setSize(800,400),s.appendChild(f.domElement);const g=new ql(500,60,40);g.scale(-1,1,1);const _=new zr({color:2236962,side:2}),m=new Ht(g,_);h.add(m);const p=new hc,S=e.src||e.imageUrl||"";S&&p.load(S,I=>{_.color.setHex(16777215),_.map=I,_.needsUpdate=!0});const b=I=>{l=!0,c=I.clientX,I.clientY,u=o,s.style.cursor="grabbing"},x=I=>{if(!l)return;const Y=I.clientX-c;o=u-Y*.15},C=()=>{l=!1,s.style.cursor="grab"};s.addEventListener("mousedown",b),window.addEventListener("mousemove",x),window.addEventListener("mouseup",C);const A=I=>{I.touches.length===1&&(l=!0,c=I.touches[0].clientX,I.touches[0].clientY,u=o)},T=I=>{if(!l||I.touches.length!==1)return;const Y=I.touches[0].clientX-c;o=u-Y*.2};s.addEventListener("touchstart",A),window.addEventListener("touchmove",T,{passive:!0}),window.addEventListener("touchend",C);let v=null,E=null;const W=()=>{E&&(E.remove(),E=null),v=null};let R;const H=e.hotspots||[],X={};H.forEach(I=>{const Y=document.createElement("button");Y.type="button",Y.setAttribute("aria-label",I.title||"Hotspot"),Y.style.position="absolute",Y.style.width="24px",Y.style.height="24px",Y.style.backgroundColor=I.popupColor||"#b91c1c",Y.style.borderRadius="50%",Y.style.border="2px solid white",Y.style.transform="translate(-50%, -50%)",Y.style.cursor="pointer",Y.style.zIndex="20",Y.style.padding="0",Y.style.display="none",Y.onclick=J=>{if(J.stopPropagation(),v===I.id){W();return}W(),v=I.id,E=document.createElement("div"),E.style.position="absolute",E.style.bottom="16px",E.style.left="50%",E.style.transform="translateX(-50%)",E.style.minWidth="260px",E.style.maxWidth="340px",E.style.background=I.popupColor||"#000000",E.style.border="1px solid rgba(255,255,255,0.15)",E.style.color="#fff",E.style.padding="12px 16px",E.style.borderRadius="6px",E.style.zIndex="40",E.style.boxShadow="0 8px 24px rgba(0,0,0,0.4)";const te=document.createElement("div");te.style.display="flex",te.style.justifyContent="space-between",te.style.alignItems="center",te.style.marginBottom="0.4rem";const fe=document.createElement("h4");fe.style.margin="0",fe.style.fontSize="0.95rem",fe.style.fontWeight="bold",fe.textContent=I.title||"Hotspot";const me=document.createElement("button");me.type="button",me.innerHTML="&times;",me.style.background="transparent",me.style.border="none",me.style.color="#a3a3a3",me.style.fontSize="18px",me.style.cursor="pointer",me.onclick=W,te.appendChild(fe),te.appendChild(me);const Le=document.createElement("p");Le.style.margin="0",Le.style.fontSize="0.8rem",Le.style.opacity="0.85",Le.style.lineHeight="1.45",Le.style.whiteSpace="pre-wrap",Le.textContent=I.content||"",E.appendChild(te),E.appendChild(Le),s.appendChild(E)},s.appendChild(Y),X[I.id]=Y});const z=()=>{R=requestAnimationFrame(z);const I=Ri.degToRad(90),Y=Ri.degToRad(o),J=new B;J.x=Math.sin(I)*Math.cos(Y),J.y=Math.cos(I),J.z=Math.sin(I)*Math.sin(Y),d.lookAt(J),f.render(h,d);const te=s.clientWidth,fe=400;H.forEach(me=>{const Le=X[me.id];if(!Le)return;const Fe=Ri.degToRad(90-me.pitch),$=Ri.degToRad(me.yaw),ie=new B;if(ie.x=Math.sin(Fe)*Math.cos($),ie.y=Math.cos(Fe),ie.z=Math.sin(Fe)*Math.sin($),ie.multiplyScalar(500),ie.project(d),ie.z>1)Le.style.display="none";else{Le.style.display="block";const ye=(ie.x*.5+.5)*te,ue=(ie.y*-.5+.5)*fe;Le.style.left=`${ye}px`,Le.style.top=`${ue}px`}})};z();const k=new ResizeObserver(I=>{for(const Y of I){const J=Y.contentRect.width||s.clientWidth;J>0&&(d.aspect=J/400,d.updateProjectionMatrix(),f.setSize(J,400))}});k.observe(s);const G=new MutationObserver(()=>{document.body.contains(s)||(cancelAnimationFrame(R),k.disconnect(),window.removeEventListener("mousemove",x),window.removeEventListener("mouseup",C),window.removeEventListener("touchmove",T),window.removeEventListener("touchend",C),g.dispose(),_.map&&_.map.dispose(),_.dispose(),f.dispose(),G.disconnect())});G.observe(document.body,{childList:!0,subtree:!0});break}case"canvas":{const s={"arrow-right":{type:"path",d:"M10,30 L65,30 L65,15 L90,50 L65,85 L65,70 L10,70 Z"},"arrow-up":{type:"path",d:"M30,90 L30,45 L15,45 L50,10 L85,45 L70,45 L70,90 Z"},star:{type:"polygon",points:"50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35"},hexagon:{type:"polygon",points:"50,2 93,26 93,74 50,98 7,74 7,26"},diamond:{type:"polygon",points:"50,2 98,50 50,98 2,50"},pentagon:{type:"polygon",points:"50,3 97,36 79,95 21,95 3,36"},"speech-bubble":{type:"path",d:"M10,10 Q10,2 18,2 L82,2 Q90,2 90,10 L90,62 Q90,70 82,70 L38,70 L20,88 L24,70 L18,70 Q10,70 10,62 Z"},banner:{type:"path",d:"M5,20 L95,20 Q98,50 95,80 L5,80 Q2,50 5,20 Z"}},a=document.createElement("div");a.style.position="relative",a.style.width="100%",a.style.minHeight="420px",a.style.aspectRatio="16 / 10",a.style.overflow="hidden",a.style.borderRadius="12px",a.style.background=e.canvasBg||"#ffffff",a.style.boxShadow="inset 0 0 0 1px rgba(17,24,39,0.06)";const o=new ResizeObserver(l=>{if(!a.isConnected){o.disconnect();return}for(const c of l){const u=(c.contentRect.width||a.clientWidth)/1e3;a.style.setProperty("--canvas-scale",String(u))}});o.observe(a),[...e.items||[]].sort((l,c)=>(l.zIndex||0)-(c.zIndex||0)).forEach(l=>{const c=document.createElement("div");if(c.style.position="absolute",c.style.left=`${l.x}%`,c.style.top=`${l.y}%`,c.style.width=`${l.w}%`,c.style.height=`${l.h}%`,c.style.zIndex=String(l.zIndex||0),c.style.boxSizing="border-box",c.style.pointerEvents="none",c.style.transform=`rotate(${l.rotation||0}deg)`,c.style.transformOrigin="50% 50%",l.type==="rect"||l.type==="circle"){const h=document.createElement("div");h.style.width="100%",h.style.height="100%",h.style.background=l.color||"#3b82f6",h.style.borderRadius=l.type==="circle"?"50%":"4px",h.style.boxShadow="0 4px 10px rgba(17, 24, 39, 0.15), 0 1px 4px rgba(17, 24, 39, 0.08)",h.style.border=(l.strokeWidth||0)>0?`${l.strokeWidth}px solid ${l.strokeColor||"#111827"}`:"1px solid rgba(17, 24, 39, 0.08)",h.style.boxSizing="border-box",c.appendChild(h)}else if(l.type==="triangle"||s[l.type]){const h=l.type==="triangle"?{type:"polygon",points:"50,0 100,100 0,100"}:s[l.type],d=document.createElementNS("http://www.w3.org/2000/svg","svg");d.setAttribute("viewBox","0 0 100 100"),d.setAttribute("preserveAspectRatio","none"),d.setAttribute("width","100%"),d.setAttribute("height","100%"),d.style.display="block",d.style.filter="drop-shadow(0px 4px 6px rgba(17,24,39,0.12))";const f=(l.strokeWidth||0)>0?{stroke:l.strokeColor||"#111827","stroke-width":String(l.strokeWidth),"vector-effect":"non-scaling-stroke"}:{stroke:"none"};if(h.type==="polygon"){const g=document.createElementNS("http://www.w3.org/2000/svg","polygon");g.setAttribute("points",h.points),g.setAttribute("fill",l.color||"#3b82f6"),Object.entries(f).forEach(([_,m])=>g.setAttribute(_,m)),d.appendChild(g)}else{const g=document.createElementNS("http://www.w3.org/2000/svg","path");g.setAttribute("d",h.d),g.setAttribute("fill",l.color||"#3b82f6"),Object.entries(f).forEach(([_,m])=>g.setAttribute(_,m)),d.appendChild(g)}c.appendChild(d)}else if(l.type==="image"){const h=document.createElement("img");h.style.width="100%",h.style.height="100%",h.style.objectFit="contain",h.style.display="block",(l.strokeWidth||0)>0&&(h.style.border=`${l.strokeWidth}px solid ${l.strokeColor||"#111827"}`,h.style.boxSizing="border-box"),h.src=l.src||"",h.alt="Canvas element",c.appendChild(h)}else if(l.type==="text"){if(c.style.height="auto",c.style.paddingTop="22px",(l.boxBgOpacity||0)>0&&l.boxBg){const d=l.boxBg.replace("#",""),f=parseInt(d.substring(0,2),16),g=parseInt(d.substring(2,4),16),_=parseInt(d.substring(4,6),16),m=(l.boxBgOpacity||0)/100;c.style.background=`rgba(${f},${g},${_},${m})`,c.style.borderRadius=`${l.boxBorderRadius??4}px`}const h=document.createElement("div");h.style.width="100%",h.style.height="auto",h.style.color=l.color||"#111827",h.style.fontSize=`calc(var(--canvas-scale, 1) * ${l.fontSize||16}px)`,h.style.fontFamily=!l.fontFamily||l.fontFamily==="inherit"?"'DM Sans', 'Roboto', sans-serif":l.fontFamily,h.style.fontWeight=l.fontWeight||"normal",h.style.fontStyle=l.fontStyle||"normal",h.style.textDecoration=l.textDecoration||"none",h.style.textAlign=l.textAlign||"left",h.style.lineHeight=String(l.lineHeight||1.5),h.style.letterSpacing=`calc(var(--canvas-scale, 1) * ${l.letterSpacing||0}px)`,h.style.whiteSpace="pre-wrap",h.style.wordBreak="break-word",h.style.background="transparent",h.style.border="none",h.style.padding="0 6px",h.style.margin="0",h.textContent=l.text||"",c.appendChild(h)}const u=c.firstElementChild;u&&this.applyComponentAnimation(u,l.animation||"none",l.animationDelay||0),a.appendChild(c)}),t.appendChild(a);break}case"scenario":{const s=Array.isArray(e.slides)?e.slides:[],a=s.filter(f=>!f.isErrorSlide),o=a.length>0?a:[{id:`${e.id}-scene-1`,isErrorSlide:!1,imageSrc:"",dialogues:[]}],l=s.find(f=>f.isErrorSlide)??{id:`${e.id}-error`,isErrorSlide:!0,imageSrc:"",dialogues:[{id:`${e.id}-restart`,text:"Try again",x:50,y:75,action:"restart"}]},c=[...o,l];let u=0;const h={next:{interactive:!0},error:{interactive:!0},restart:{interactive:!0},static:{interactive:!1}},d=()=>{t.innerHTML="";const f=c[u],g=!!f?.isErrorSlide,_=document.createElement("div");_.style.background="#0f0f0f",_.style.border=`1px solid ${g?"#7f1d1d":"#991b1b"}`,_.style.borderRadius="12px",_.style.overflow="hidden",_.style.boxShadow="0 24px 50px rgba(0,0,0,0.22)";const m=document.createElement("div");m.style.display="flex",m.style.alignItems="center",m.style.justifyContent="space-between",m.style.gap="12px",m.style.padding="12px 16px",m.style.background="#171717",m.style.borderBottom="1px solid #262626";const p=document.createElement("div");p.style.color="#ffffff",p.style.fontSize="0.78rem",p.style.fontWeight="700",p.style.letterSpacing="0.08em",p.style.textTransform="uppercase",p.textContent=g?"Scenario Error Slide":`Scenario Scene ${Math.min(u+1,o.length)} / ${o.length}`,m.appendChild(p);const S=document.createElement("div");S.style.color=g?"#fca5a5":"#9ca3af",S.style.fontSize="0.72rem",S.textContent=g?"Use restart to return to the opening scene.":"Select a dialogue box to progress through the scenario.",m.appendChild(S),_.appendChild(m);const b=document.createElement("div");if(b.style.position="relative",b.style.width="100%",b.style.minHeight="360px",b.style.aspectRatio="16 / 9",b.style.background=f?.imageSrc?`linear-gradient(rgba(0,0,0,0.22), rgba(0,0,0,0.38)), url('${f.imageSrc}') center / cover no-repeat`:g?"linear-gradient(140deg, #200909 0%, #451010 55%, #120404 100%)":"linear-gradient(140deg, #111827 0%, #1f2937 45%, #111111 100%)",b.style.overflow="hidden",!f?.imageSrc){const x=document.createElement("div");x.style.position="absolute",x.style.inset="0",x.style.display="flex",x.style.flexDirection="column",x.style.alignItems="center",x.style.justifyContent="center",x.style.gap="10px",x.style.color=g?"#fca5a5":"#d1d5db",x.style.textAlign="center",x.style.padding="24px";const C=document.createElement("div");C.style.fontSize="1rem",C.style.fontWeight="700",C.textContent=g?"Error scene background missing":"Scenario background missing",x.appendChild(C);const A=document.createElement("div");A.style.fontSize="0.82rem",A.style.maxWidth="360px",A.style.lineHeight="1.55",A.textContent="This scenario still works in preview and SCORM export, but adding a background image will make the interaction feel complete.",x.appendChild(A),b.appendChild(x)}if(g){const x=document.createElement("div");x.style.position="absolute",x.style.inset="0",x.style.background="rgba(127,29,29,0.18)",x.style.pointerEvents="none",b.appendChild(x)}(Array.isArray(f?.dialogues)?f.dialogues:[]).forEach(x=>{const C=(h[x.action]??h.next).interactive,A=document.createElement("button");A.type="button",A.style.position="absolute",A.style.left=`${x.x}%`,A.style.top=`${x.y}%`,A.style.transform="translate(-50%, -50%)",A.style.minWidth="140px",A.style.maxWidth="220px",A.style.padding="12px 14px",A.style.borderRadius="12px",A.style.border="1.5px solid rgba(255,255,255,0.26)",A.style.background="rgba(17,24,39,0.74)",A.style.boxShadow="0 14px 32px rgba(0,0,0,0.24)",A.style.cursor=C?"pointer":"default",A.style.textAlign="left",A.style.backdropFilter="blur(4px)",A.style.opacity=C?"1":"0.94",C||(A.disabled=!0);const T=document.createElement("div");T.style.color="#f3f4f6",T.style.fontSize="0.82rem",T.style.fontWeight="600",T.style.lineHeight="1.45",T.style.whiteSpace="pre-wrap",T.textContent=x.text||"Continue",A.appendChild(T),C&&A.addEventListener("click",()=>{x.action==="error"?u=c.length-1:x.action==="restart"?u=0:u=Math.min(u+1,o.length-1),d()}),b.appendChild(A)}),_.appendChild(b),t.appendChild(_)};d();break}case"tabs":{const s=e.tabs||[];if(s.length===0)break;let a=0;const o=()=>{t.innerHTML="";const l=document.createElement("div");l.style.cssText="display:flex;gap:0.5rem;border-bottom:1px solid #2d2d34;margin-bottom:1rem;overflow-x:auto;padding-bottom:0.5rem;",s.forEach((p,S)=>{const b=document.createElement("button");b.textContent=p.title||`Tab ${S+1}`,b.style.cssText=`padding:0.5rem 1rem;cursor:pointer;font-weight:${S===a?600:400};color:${S===a?"#ef4444":"#a1a1aa"};border:none;background:transparent;border-bottom:${S===a?"2px solid #ef4444":"2px solid transparent"};white-space:nowrap;font-family:inherit;font-size:1rem;`,b.onclick=()=>{a=S,o()},l.appendChild(b)}),t.appendChild(l);const c=document.createElement("div");c.style.cssText="background:#202026;border-radius:8px;padding:1.5rem;border:1px solid #2d2d34;";const u=s[a],h=document.createElement("h3");h.style.cssText="margin:0 0 1rem 0;color:#fafafa;font-size:1.25rem;",h.textContent=u.title,c.appendChild(h);const d=document.createElement("div");if(d.style.cssText="display:flex;gap:1.5rem;flex-direction:column;",u.image){const p=document.createElement("div");p.style.cssText="width:100%;max-width:300px;margin:0 auto;";const S=document.createElement("img");S.src=u.image,S.style.cssText="width:100%;border-radius:8px;object-fit:contain;max-height:200px;",p.appendChild(S),d.appendChild(p)}if(u.content){const p=document.createElement("div");p.style.cssText="line-height:1.6;color:#e4e4e7;",p.innerHTML=u.content,d.appendChild(p)}c.appendChild(d),t.appendChild(c);const f=document.createElement("div");f.style.cssText="display:flex;justify-content:space-between;margin-top:1rem;align-items:center;";const g=document.createElement("button");g.textContent="← Prev",g.disabled=a===0,g.style.cssText=`padding:0.5rem 1rem;border-radius:4px;border:1px solid #2d2d34;background:${a===0?"#18181b":"#202026"};color:${a===0?"#4b5563":"#ef4444"};cursor:${a===0?"not-allowed":"pointer"};font-family:inherit;font-size:0.875rem;`,g.onclick=()=>{a>0&&(a--,o())};const _=document.createElement("div");_.style.cssText="font-size:0.875rem;color:#a1a1aa;",_.textContent=`Slide ${a+1} of ${s.length}`;const m=document.createElement("button");m.textContent="Next →",m.disabled=a===s.length-1,m.style.cssText=`padding:0.5rem 1rem;border-radius:4px;border:1px solid #2d2d34;background:${a===s.length-1?"#18181b":"#202026"};color:${a===s.length-1?"#4b5563":"#ef4444"};cursor:${a===s.length-1?"not-allowed":"pointer"};font-family:inherit;font-size:0.875rem;`,m.onclick=()=>{a<s.length-1&&(a++,o())},f.appendChild(g),f.appendChild(_),f.appendChild(m),t.appendChild(f)};o();break}case"accordion":{const s=e.topics||[];if(s.length===0)break;const a=this.course.slides[this.state.currentSlide];let o="#18181b";if(a&&a.background){const m=a.background;m.type==="color"&&m.value&&(o=m.value)}const l=this.getContrastColor(o)==="#ffffff",c=l?"#202026":"#ffffff",u=l?"#2d2d34":"#ead0d0",h=l?"#1e1e24":"#fdf8f8",d=l?"#fafafa":"#1a0a0a",f=l?"#2d2d34":"#f3e4e4",g=l?"#d4d4d8":"#333333",_=document.createElement("div");_.style.cssText="display:flex;flex-direction:column;gap:0.75rem;",s.forEach((m,p)=>{const S=document.createElement("div");S.style.cssText=`border:1px solid ${u};border-radius:10px;overflow:hidden;background:${c};`;const b=document.createElement("button");b.type="button",b.setAttribute("aria-expanded","false"),b.style.cssText=`width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border:none;background:${h};color:${d};cursor:pointer;font:inherit;font-weight:700;font-size:0.95rem;text-align:left;`;const x=document.createElement("span");x.textContent=m.title||`Topic ${p+1}`,b.appendChild(x);const C=document.createElement("span");C.textContent="▾",C.style.cssText="font-size:1rem;color:#ef4444;transition:transform 0.18s ease;transform:rotate(0deg);",b.appendChild(C);const A=document.createElement("div");A.style.cssText=`display:none;padding:16px;background:${c};border-top:1px solid ${f};`;const T=document.createElement("div");T.style.cssText="display:flex;flex-direction:column;gap:12px;",(m.items||[]).forEach(v=>{if(v.type==="image"&&v.src){const E=document.createElement("div");E.style.cssText="text-align:center;";const W=document.createElement("img");if(W.src=v.src,W.alt=v.alt||"",W.style.cssText="max-width:100%;width:100%;height:auto;max-height:320px;object-fit:contain;border-radius:8px;background:#18181b;",E.appendChild(W),v.caption){const R=document.createElement("div");R.style.cssText="margin-top:8px;font-size:0.82rem;color:#a1a1aa;",R.textContent=v.caption,E.appendChild(R)}T.appendChild(E);return}if(v.type==="text"&&v.value){const E=document.createElement("div");E.className="cf-rt-text",E.style.color=g,E.innerHTML=v.value,T.appendChild(E)}}),A.appendChild(T),b.onclick=()=>{const v=b.getAttribute("aria-expanded")==="true";b.setAttribute("aria-expanded",v?"false":"true"),A.style.display=v?"none":"block",C.style.transform=v?"rotate(0deg)":"rotate(180deg)"},S.appendChild(b),S.appendChild(A),_.appendChild(S)}),t.appendChild(_);break}case"image-stack":{const s=e.slides||[];let a=0;const o={},l=()=>{t.innerHTML="";const c=s[a];if(!c)return;const u=Math.round((a+1)/s.length*100),h=document.createElement("div");h.style.cssText="display:flex;align-items:center;gap:8px;margin-bottom:10px;";const d=document.createElement("span");d.style.cssText="font-size:0.78rem;color:#a3a3a3;white-space:nowrap;",d.textContent=c.type==="quiz"?"🧩 Quiz":`Slide ${a+1} / ${s.length}`;const f=document.createElement("div");f.style.cssText="flex:1;height:4px;border-radius:2px;background:#2a2a2a;overflow:hidden;";const g=document.createElement("div");g.style.cssText=`width:${u}%;height:100%;background:#8B1A1A;transition:width 0.3s;`,f.appendChild(g);const _=document.createElement("span");_.style.cssText="font-size:0.78rem;color:#a3a3a3;",_.textContent=`${u}%`,h.appendChild(d),h.appendChild(f),h.appendChild(_),t.appendChild(h);const m=document.createElement("div");if(m.style.cssText="border-radius:10px;overflow:hidden;border:1px solid #2a2a2a;min-height:160px;background:#111;",c.type==="image"){if(c.imageUrl){const A=document.createElement("img");A.src=c.imageUrl,A.style.cssText="width:100%;max-height:400px;object-fit:cover;display:block;",m.appendChild(A)}if(c.caption){const A=document.createElement("div");A.style.cssText="padding:10px 14px;background:rgba(0,0,0,0.6);color:#d4d4d4;font-size:0.9rem;line-height:1.5;",A.textContent=c.caption,m.appendChild(A)}}else if(c.type==="quiz"){const A=document.createElement("div");A.style.cssText="padding:18px;";const T=document.createElement("p");T.style.cssText="color:#fff;font-weight:600;font-size:1rem;margin:0 0 14px 0;",T.textContent=c.question||"Quiz question",A.appendChild(T);const v=document.createElement("div");(c.options||[]).forEach((W,R)=>{const H=document.createElement("button");H.style.cssText="width:100%;text-align:left;background:#1c1c1c;border:1px solid #404040;color:#d4d4d4;padding:9px 14px;border-radius:6px;cursor:pointer;font-size:0.9rem;margin-bottom:8px;transition:all 0.2s;",H.textContent=W||`Option ${R+1}`,H.onclick=()=>{if(R===c.correctIndex)o[c.id]=!0,H.style.background="#052e16",H.style.borderColor="#166534",H.style.color="#4ade80",v.innerHTML='<div style="margin-top:10px;padding:9px 14px;background:#052e16;border:1px solid #166534;border-radius:6px;color:#4ade80;font-weight:600;font-size:0.88rem;">✅ Correct! You can continue.</div>',C.disabled=!1,C.style.opacity="1",C.style.cursor="pointer",C.style.color="#d4d4d4",C.style.background="#1c1c1c",C.textContent="Next →";else{v.innerHTML=`<div style="margin-top:10px;padding:9px 14px;background:#2a0a0a;border:1px solid #7f1d1d;border-radius:6px;color:#f87171;font-weight:600;font-size:0.88rem;display:flex;align-items:center;justify-content:space-between;">
                    <span>❌ Incorrect — try again!</span>
                    <button onclick="this.closest('[data-cf-feedback]').previousSibling && void 0" style="background:#7f1d1d;border:none;color:#fca5a5;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:0.8rem;" id="stack-retry-${c.id}-${a}">Try Again</button>
                  </div>`;const X=document.getElementById(`stack-retry-${c.id}-${a}`);X&&(X.onclick=()=>{v.innerHTML="",E.forEach(z=>{z.disabled=!1,z.style.background="#1c1c1c",z.style.borderColor="#404040",z.style.color="#d4d4d4"})})}E.forEach(X=>{X.disabled=!0})},A.appendChild(H)});const E=Array.from(A.querySelectorAll("button"));v.setAttribute("data-cf-feedback","1"),A.appendChild(v),m.appendChild(A)}t.appendChild(m);const p=document.createElement("div");p.style.cssText="display:flex;justify-content:space-between;align-items:center;margin-top:10px;";const S=document.createElement("button");S.textContent="← Prev",S.disabled=a===0,S.style.cssText=`padding:6px 14px;border-radius:6px;border:1px solid #2a2a2a;background:${a===0?"#111":"#1c1c1c"};color:${a===0?"#555":"#d4d4d4"};cursor:${a===0?"not-allowed":"pointer"};font-size:0.85rem;`,S.onclick=()=>{a>0&&(a--,l())};const b=document.createElement("div");b.style.cssText="display:flex;gap:6px;align-items:center;",s.forEach((A,T)=>{const v=document.createElement("div");v.style.cssText=`width:${T===a?"20px":"8px"};height:8px;border-radius:4px;background:${T===a?"#8B1A1A":A.type==="quiz"?"#4b5563":"#3a3a3a"};transition:all 0.2s;`,b.appendChild(v)});const x=c.type==="quiz"&&!o[c.id],C=document.createElement("button");C.textContent=x?"🔒 Answer to continue":"Next →",C.disabled=a>=s.length-1||x,C.style.cssText=`padding:6px 14px;border-radius:6px;border:1px solid #2a2a2a;background:${x?"#2a0a0a":"#1c1c1c"};color:${a>=s.length-1||x?"#555":"#d4d4d4"};cursor:${a>=s.length-1||x?"not-allowed":"pointer"};font-size:0.85rem;`,C.onclick=()=>{const A=c.type==="quiz"&&!o[c.id];a<s.length-1&&!A&&(a++,l())},p.appendChild(S),p.appendChild(b),p.appendChild(C),t.appendChild(p)};l();break}case"interactive-video":{if(t.style.position="relative",e.mandatory){const l=this.state.mandatoryCompleted.includes(e.id),c=document.createElement("div");c.id=`mandatory-badge-${e.id}`,c.style.cssText="font-size:10px;font-weight:700;letter-spacing:0.15em;padding:4px 10px;border-radius:6px;margin-bottom:8px;display:inline-block;",l?(c.textContent="✓ COMPLETED",c.style.background="#052e16",c.style.color="#4ade80",c.style.border="1px solid #166534"):(c.textContent="⚠ MANDATORY — Watch to continue",c.style.background="#2a0a0a",c.style.color="#f87171",c.style.border="1px solid #7f1d1d"),t.appendChild(c)}if(e.embedType==="youtube"||e.embedType==="vimeo"){const l=document.createElement("div");l.style.cssText=["padding:24px","border:1px solid #7f1d1d","border-radius:8px","background:#1a0a0a","color:#fca5a5","line-height:1.5"].join(";"),l.innerHTML=["<strong>Interactive video requires an uploaded video file.</strong>","<br />","YouTube and Vimeo embeds cannot expose playback timing to this SCORM player."].join(""),t.appendChild(l);break}const s=document.createElement("video");s.className="cf-rt-video",s.controls=!0,s.src=e.src,s.style.width="100%",s.style.borderRadius="8px",s.style.background="#000",t.appendChild(s);const a=document.createElement("div");a.style.position="absolute",a.style.inset="0",a.style.background="rgba(0,0,0,0.9)",a.style.display="none",a.style.alignItems="center",a.style.justifyContent="center",a.style.borderRadius="8px",a.style.zIndex="10",a.style.padding="2rem",t.appendChild(a);const o=e.interactions||[];if(e.mandatory){let l=0;s.addEventListener("timeupdate",()=>{s.seeking||(l=Math.max(l,s.currentTime))}),s.addEventListener("seeking",()=>{s.currentTime>l+1&&(s.currentTime=l)}),s.addEventListener("ended",()=>{o.every(c=>c.completed)&&this.markMandatoryComplete(e.id)})}s.addEventListener("timeupdate",()=>{const l=s.currentTime,c=o.find(u=>{const h=Number(u.timestamp||0);return!u.completed&&l>=h&&l<=h+.75});if(c&&a.style.display==="none"){s.pause(),a.innerHTML="",a.style.display="flex",s.controls=!1;const u=document.createElement("div");u.style.textAlign="center",u.style.width="100%",u.style.maxWidth="500px";const h=document.createElement("h3");h.style.color="#fff",h.style.marginBottom="1.5rem",h.style.fontSize="1.25rem",h.style.fontWeight="600",h.textContent=c.question,u.appendChild(h);const d=document.createElement("div");d.style.display="flex",d.style.flexDirection="column",d.style.gap="0.75rem",c.options.forEach((f,g)=>{const _=document.createElement("button");_.textContent=f,_.style.background="#171717",_.style.color="#fff",_.style.border="1px solid #450a0a",_.style.padding="0.75rem",_.style.borderRadius="6px",_.style.cursor="pointer",_.style.transition="background 0.2s",_.style.fontSize="1rem",_.onclick=()=>{const m=c.requireCorrectToContinue!==!1,p=g===c.correctAnswerIndex,S="quiz-feedback-"+c.id;let b=u.querySelector("#"+S);if(b||(b=document.createElement("p"),b.id=S,b.style.marginTop="1rem",b.style.fontWeight="600",u.appendChild(b)),p){_.style.background="#16a34a",b.textContent="Correct! You can now continue.",b.style.color="#4ade80",d.querySelectorAll("button").forEach(C=>{C.disabled=!0,C!==_&&(C.style.opacity="0.5")});const x=document.createElement("button");x.textContent="Continue Video",x.style.background="#8b1a1a",x.style.color="#fff",x.style.padding="0.75rem 2rem",x.style.border="none",x.style.borderRadius="6px",x.style.cursor="pointer",x.style.fontWeight="700",x.style.marginTop="1rem",x.onclick=()=>{c.completed=!0,a.style.display="none",s.controls=!0,s.play()},u.appendChild(x)}else if(m)_.style.background="#7f1d1d",b.textContent="Incorrect answer. Please try again.",b.style.color="#f87171",setTimeout(()=>{_.style.background="#171717"},1200);else{b.textContent="Incorrect, but you can continue.",b.style.color="#fbbf24",d.querySelectorAll("button").forEach(C=>{C.disabled=!0,C!==_&&(C.style.opacity="0.5")});const x=document.createElement("button");x.textContent="Continue Video",x.style.background="#8b1a1a",x.style.color="#fff",x.style.padding="0.75rem 2rem",x.style.border="none",x.style.borderRadius="6px",x.style.cursor="pointer",x.style.fontWeight="700",x.style.marginTop="1rem",x.onclick=()=>{c.completed=!0,a.style.display="none",s.controls=!0,s.play()},u.appendChild(x)}},d.appendChild(_)}),u.appendChild(d),a.appendChild(u)}});break}case"storyline-video":{if(t.style.position="relative",e.mandatory){const h=this.state.mandatoryCompleted.includes(e.id),d=document.createElement("div");d.id=`mandatory-badge-${e.id}`,d.style.cssText="font-size:10px;font-weight:700;letter-spacing:0.15em;padding:4px 10px;border-radius:6px;margin-bottom:8px;display:inline-block;",h?(d.textContent="✓ COMPLETED",d.style.background="#052e16",d.style.color="#4ade80",d.style.border="1px solid #166534"):(d.textContent="⚠ MANDATORY — Watch to continue",d.style.background="#2a0a0a",d.style.color="#f87171",d.style.border="1px solid #7f1d1d"),t.appendChild(d)}if(e.embedType==="youtube"||e.embedType==="vimeo"){const h=document.createElement("div");h.style.cssText="padding:24px;border:1px solid #7f1d1d;border-radius:8px;background:#1a0a0a;color:#fca5a5;line-height:1.5;",h.innerHTML="<strong>Storyline video requires an uploaded video file.</strong><br />External embeds cannot expose interactive overlays.",t.appendChild(h);break}const s=document.createElement("video");s.className="cf-rt-video",s.controls=!0,s.src=e.src,s.style.width="100%",s.style.borderRadius="8px",s.style.background="#000",s.style.display="block",t.appendChild(s);const a=document.createElement("div");a.style.cssText="position:absolute;inset:0;pointer-events:none;z-index:10;border-radius:8px;overflow:hidden;",t.appendChild(a);const o=new Set;let l=null;const c=()=>{o.clear(),l=null,a.innerHTML="",s.currentTime=0,s.controls=!0,s.play()},u=e.overlays||[];if(e.mandatory){let h=0;s.addEventListener("timeupdate",()=>{s.seeking||(h=Math.max(h,s.currentTime))}),s.addEventListener("seeking",()=>{s.currentTime>h+1&&(s.currentTime=h)}),s.addEventListener("ended",()=>{u.every(d=>o.has(d.id))&&this.markMandatoryComplete(e.id)})}s.addEventListener("timeupdate",()=>{if(l)return;const h=s.currentTime;h<.2&&o.clear();const d=u.find(f=>{const g=f.endTime!=null?f.endTime:f.startTime+5;return!o.has(f.id)&&h>=f.startTime&&h<=g});if(d){s.pause(),s.controls=!1,l=d.id;const f=document.createElement("div");f.style.cssText=`position:absolute;left:${d.x}%;top:${d.y}%;transform:translate(-50%,-50%);pointer-events:auto;z-index:20;`;const g=()=>{o.add(d.id),l=null,f.remove(),s.controls=!0,s.play(),e.mandatory&&u.every(m=>o.has(m.id))&&this.markMandatoryComplete(e.id)},_=m=>{this.renderFeedback(m||"Incorrect choice! Let's watch from the beginning.","incorrect"),c()};if(d.type==="button"){const m=document.createElement("button");m.className="cf-rt-button",m.textContent=d.text||"Continue",d.color&&(m.style.background=d.color),d.textColor&&(m.style.color=d.textColor),m.onclick=()=>{d.action==="resume"?g():d.action==="next"?this.nextSlide():d.action==="slide"?this.goToSlide(d.targetSlideId):d.action==="error"&&_(d.errorMsg)},f.appendChild(m)}else if(d.type==="flashcard"){const m=document.createElement("div");m.className="cf-rt-flashcard-scene",m.style.cssText="width:240px;height:150px;";const p=document.createElement("div");p.className="cf-rt-flashcard-inner",p.style.height="100%";const S=document.createElement("div");S.className="cf-rt-flashcard-face cf-rt-flashcard-front",S.style.cssText="min-height:unset;height:100%;padding:14px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;",S.innerHTML=`<div class="cf-rt-flashcard-text" style="font-size:0.9rem;">${d.text||"Flip Me"}</div><div style="font-size:0.65rem;opacity:0.6;margin-top:8px;">Click to Flip</div>`;const b=document.createElement("div");b.className="cf-rt-flashcard-face cf-rt-flashcard-back",b.style.cssText="min-height:unset;height:100%;padding:14px;display:flex;flex-direction:column;justify-content:space-between;align-items:center;text-align:center;";const x=document.createElement("div");x.className="cf-rt-flashcard-text",x.style.cssText="font-size:0.9rem;flex-grow:1;display:flex;align-items:center;justify-content:center;",x.textContent=d.flashcardBackText||"Answer revealed";const C=document.createElement("button");C.className="cf-rt-button",C.style.cssText="padding:4px 12px;font-size:0.75rem;margin-top:6px;border-radius:6px;",C.textContent="Continue",C.onclick=A=>{A.stopPropagation(),g()},b.appendChild(x),b.appendChild(C),p.appendChild(S),p.appendChild(b),m.appendChild(p),m.onclick=()=>{m.classList.toggle("flipped")},f.appendChild(m)}else if(d.type==="dialogue"){const m=document.createElement("div");m.style.cssText="width:280px;padding:16px;background:#ffffff;border:1px solid #ead0d0;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);color:#1a0a0a;display:flex;flex-direction:column;gap:10px;";const p=document.createElement("div");p.style.cssText="font-size:0.9rem;font-weight:700;color:#1a0a0a;line-height:1.45;",p.textContent=d.text||"Choose an option:",m.appendChild(p);const S=document.createElement("div");S.style.cssText="display:flex;flex-direction:column;gap:8px;",(d.dialogueOptions||[]).forEach(b=>{const x=document.createElement("button");x.type="button",x.style.cssText="padding:10px 14px;font-size:0.82rem;text-align:left;border-radius:8px;width:100%;margin:0;background:#ffffff;color:#1a0a0a;border:1.5px solid #ead0d0;cursor:pointer;font-weight:600;font-family:inherit;transition:all 0.15s;",x.textContent=b.text,x.onmouseover=()=>{x.style.background="#fff5f5",x.style.borderColor="#8b1a1a",x.style.color="#8b1a1a"},x.onmouseout=()=>{x.style.background="#ffffff",x.style.borderColor="#ead0d0",x.style.color="#1a0a0a"},x.onclick=()=>{b.action==="resume"?g():b.action==="next"?this.nextSlide():b.action==="slide"?this.goToSlide(b.targetSlideId):b.action==="error"&&_(b.errorMsg)},S.appendChild(x)}),m.appendChild(S),f.appendChild(m)}else if(d.type==="avatar"){const m=d.side||"left",p=document.createElement("div");p.style.cssText=`display:flex;align-items:flex-end;gap:12px;flex-direction:${m==="right"?"row-reverse":"row"};max-width:480px;`;const S=document.createElement("div");S.style.cssText="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:6px;";const b=document.createElement("div");if(b.style.cssText="width:72px;height:72px;border-radius:50%;overflow:hidden;border:3px solid #8b1a1a;background:#1a0a0a;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.45);",d.avatarSrc){const v=document.createElement("img");v.src=d.avatarSrc,v.style.cssText="width:100%;height:100%;object-fit:cover;",b.appendChild(v)}else b.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#8b1a1a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';if(S.appendChild(b),d.avatarName){const v=document.createElement("div");v.style.cssText="font-size:0.68rem;font-weight:700;color:#fff;background:#8b1a1a;padding:2px 10px;border-radius:20px;white-space:nowrap;max-width:90px;overflow:hidden;text-overflow:ellipsis;text-align:center;letter-spacing:0.02em;",v.textContent=d.avatarName,S.appendChild(v)}const x=document.createElement("div"),C=m==="right";x.style.cssText=`background:#ffffff;border:1.5px solid #ead0d0;border-radius:16px;border-bottom-${C?"right":"left"}-radius:0;padding:14px 16px;max-width:300px;box-shadow:0 8px 28px rgba(0,0,0,0.22);display:flex;flex-direction:column;gap:12px;`;const A=document.createElement("div");A.style.cssText="font-size:0.92rem;font-weight:500;color:#1a0a0a;line-height:1.55;",A.textContent=d.text||"",x.appendChild(A);const T=document.createElement("button");T.type="button",T.style.cssText=`padding:8px 20px;font-size:0.82rem;font-weight:700;font-family:inherit;border-radius:8px;background:#8b1a1a;color:#fff;border:none;cursor:pointer;align-self:${C?"flex-start":"flex-end"};transition:opacity 0.15s;`,T.textContent="Continue",T.onmouseover=()=>{T.style.opacity="0.85"},T.onmouseout=()=>{T.style.opacity="1"},T.onclick=()=>{d.action==="next"?this.nextSlide():d.action==="slide"?this.goToSlide(d.targetSlideId):g()},x.appendChild(T),p.appendChild(S),p.appendChild(x),f.appendChild(p)}a.appendChild(f)}});break}case"video":if(e.mandatory){const s=this.state.mandatoryCompleted.includes(e.id),a=document.createElement("div");a.id=`mandatory-badge-${e.id}`,a.style.cssText="font-size:10px;font-weight:700;letter-spacing:0.15em;padding:4px 10px;border-radius:6px;margin-bottom:8px;display:inline-block;",s?(a.textContent="✓ COMPLETED",a.style.background="#052e16",a.style.color="#4ade80",a.style.border="1px solid #166534"):(a.textContent="⚠ MANDATORY — Watch to continue",a.style.background="#2a0a0a",a.style.color="#f87171",a.style.border="1px solid #7f1d1d"),t.appendChild(a)}if(e.embedType==="youtube"||e.embedType==="vimeo"){const s=document.createElement("div");s.className="cf-rt-video-wrap";const a=document.createElement("iframe");if(a.src=this.getEmbeddableVideoSrc(e.src,e.embedType),a.allowFullscreen=!0,a.className="cf-rt-video-embed",a.setAttribute("allow","accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"),s.appendChild(a),t.appendChild(s),e.mandatory&&!this.state.mandatoryCompleted.includes(e.id)){const o=e.id;setTimeout(()=>{this.markMandatoryComplete(o)},1e4)}}else{const s=document.createElement("video");if(s.className="cf-rt-video",s.controls=!0,s.src=e.src,e.mandatory){const a=e.id;if(!this.state.mandatoryCompleted.includes(a)){let o=0;s.addEventListener("timeupdate",()=>{s.seeking||(o=Math.max(o,s.currentTime))}),s.addEventListener("seeking",()=>{s.currentTime>o+1&&(s.currentTime=o)})}s.addEventListener("ended",()=>{this.markMandatoryComplete(a)})}t.appendChild(s)}break;case"button":{const s=String(e.alignment||"center").toLowerCase();t.style.display="flex",t.style.width="100%",t.style.justifyContent=s==="left"?"flex-start":s==="right"?"flex-end":"center";const a=document.createElement("button");a.className="cf-rt-button",e.color&&(a.style.background=e.color),a.textContent=e.label,a.addEventListener("click",()=>{if(e.targetSlideId){this.goToSlide(e.targetSlideId);return}e.action&&this.fireTrigger({type:"click",targetId:e.id})}),t.appendChild(a);break}case"quiz":{if(t.className+=" cf-rt-quiz-block",e.mandatory){const a=this.state.mandatoryCompleted.includes(e.id),o=document.createElement("div");o.id=`mandatory-badge-${e.id}`,o.style.cssText="font-size:10px;font-weight:700;letter-spacing:0.15em;padding:4px 10px;border-radius:6px;margin-bottom:8px;display:inline-block;",a?(o.textContent="✓ COMPLETED",o.style.background="#052e16",o.style.color="#4ade80",o.style.border="1px solid #166534"):(o.textContent="⚠ MANDATORY — Answer to continue",o.style.background="#2a0a0a",o.style.color="#f87171",o.style.border="1px solid #7f1d1d"),t.appendChild(o)}const s=document.createElement("div");s.innerHTML=this.renderQuizHTML(e),t.appendChild(s),requestAnimationFrame(()=>this.attachQuizListeners(e.id));break}case"true_false":{t.className+=" cf-rt-quiz-block";const s=e.id,a=this.state.mandatoryCompleted.includes(s);if(e.mandatory){const f=document.createElement("div");f.id=`mandatory-badge-${s}`,f.style.cssText="font-size:10px;font-weight:700;letter-spacing:0.15em;padding:4px 10px;border-radius:6px;margin-bottom:8px;display:inline-block;",a?(f.textContent="✓ COMPLETED",f.style.background="#052e16",f.style.color="#4ade80",f.style.border="1px solid #166534"):(f.textContent="⚠ MANDATORY — Answer to continue",f.style.background="#2a0a0a",f.style.color="#f87171",f.style.border="1px solid #7f1d1d"),t.appendChild(f)}const o=document.createElement("div"),l=e.correctAnswer?"true":"false",c=this.state.quizScores[s],u=c&&c.score>0,h=e.questionImage,d=h?`<div style="margin:0.75rem 0;"><img src="${h}" alt="Question image" style="max-width:100%;max-height:280px;object-fit:contain;border-radius:8px;border:1.5px solid #3f3f46;display:block;"/></div>`:"";o.innerHTML=`
          <div class="cf-rt-quiz-badge">TRUE / FALSE</div>
          <div class="cf-rt-quiz-question">${e.question}</div>
          ${d}
          <div class="cf-rt-quiz-options">
            <label class="cf-rt-quiz-option" data-quiz-id="${s}" data-option-idx="true" ${u?'style="opacity:0.6;cursor:not-allowed;"':""}>
              <input type="radio" name="tf-${s}" value="true" ${u?"disabled":""} ${u&&e.correctAnswer===!0?"checked":""} />
              <span class="cf-rt-quiz-option-text">True</span>
            </label>
            <label class="cf-rt-quiz-option" data-quiz-id="${s}" data-option-idx="false" ${u?'style="opacity:0.6;cursor:not-allowed;"':""}>
              <input type="radio" name="tf-${s}" value="false" ${u?"disabled":""} ${u&&e.correctAnswer===!1?"checked":""} />
              <span class="cf-rt-quiz-option-text">False</span>
            </label>
          </div>
          <button class="cf-rt-quiz-submit" data-quiz-id="${s}" disabled ${u?'style="opacity:0.6;cursor:not-allowed;"':""}>${u?"Submitted":"Submit Answer"}</button>
          <div id="fb-${s}" class="cf-rt-quiz-feedback">
            ${u?'<span style="color:#4ade80">✓ Correct!</span>':""}
          </div>
        `,t.appendChild(o),requestAnimationFrame(()=>{const f=t.querySelector(`.cf-rt-quiz-submit[data-quiz-id="${s}"]`),g=t.querySelectorAll(`input[name="tf-${s}"]`);f&&(g.forEach(_=>{_.addEventListener("change",()=>{f.disabled=!1})}),f.addEventListener("click",()=>{const _=Array.from(g).find(S=>S.checked);if(!_)return;const m=_.value===l,p=t.querySelector(`#fb-${s}`);p&&(p.innerHTML=m?'<span style="color:#4ade80">✓ Correct!</span>':'<span style="color:#f87171">✗ Incorrect. Try again.</span>'),m&&(g.forEach(S=>{S.disabled=!0,S.parentElement.style.opacity="0.6"}),f.disabled=!0,f.textContent="Submitted"),this.submitGenericQuiz(s,m?1:0)}))});break}case"fill_blanks":{t.className+=" cf-rt-quiz-block";const s=e.id,a=this.state.mandatoryCompleted.includes(s);if(e.mandatory){const d=document.createElement("div");d.id=`mandatory-badge-${s}`,d.style.cssText="font-size:10px;font-weight:700;letter-spacing:0.15em;padding:4px 10px;border-radius:6px;margin-bottom:8px;display:inline-block;",a?(d.textContent="✓ COMPLETED",d.style.background="#052e16",d.style.color="#4ade80",d.style.border="1px solid #166534"):(d.textContent="⚠ MANDATORY — Answer to continue",d.style.background="#2a0a0a",d.style.color="#f87171",d.style.border="1px solid #7f1d1d"),t.appendChild(d)}const o=this.state.quizScores[s],l=o&&o.score>=1,c=th(e);let u=e.question;u+=`<div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">${c.map((d,f)=>{const g=l?` value="${nh(d||"")}"`:"",_=l?" disabled":"";return`<input id="fitb-${s}-${f}" type="text" placeholder="Answer ${f+1}" style="padding:10px 14px;border-radius:8px;border:1.5px solid #2d2d34;background:#18181b;color:#e4e4e7;font-size:14px;outline:none;font-family:inherit;${l?"opacity:0.6;":""}"${g}${_}/>`}).join("")}</div>`;const h=document.createElement("div");h.innerHTML=`
          <div class="cf-rt-quiz-badge">FILL IN THE BLANK</div>
          <div class="cf-rt-quiz-question">${u}</div>
          <div style="margin-top:12px;display:flex;gap:8px;align-items:center;">
            <button id="fitb-btn-${s}" class="cf-rt-quiz-submit" ${l?"disabled":""}>${l?"Submitted":"Submit"}</button>
          </div>
          <div id="fb-${s}" style="margin-top:10px;font-size:13px;font-weight:600;">
            ${l?'<span style="color:#4ade80">✓ Correct!</span>':""}
          </div>
        `,t.appendChild(h),requestAnimationFrame(()=>{const d=c.map((g,_)=>t.querySelector(`#fitb-${s}-${_}`)).filter(Boolean),f=t.querySelector(`#fitb-btn-${s}`);d.length&&f&&f.addEventListener("click",()=>{let g=0;d.forEach((b,x)=>{const C=b.value.trim(),A=String(c[x]||"").trim();(e.caseSensitive?C:C.toLowerCase())===(e.caseSensitive?A:A.toLowerCase())&&(g+=1)});const _=c.length||1,m=g/_,p=m===1,S=t.querySelector(`#fb-${s}`);S&&(p?S.innerHTML='<span style="color:#4ade80">✓ Correct!</span>':g>0?S.innerHTML=`<span style="color:#fbbf24">△ ${g} of ${_} correct. You can retry for full marks.</span>`:S.innerHTML='<span style="color:#f87171">✗ Incorrect. Try again.</span>'),p?(d.forEach((b,x)=>{b.disabled=!0,b.style.opacity="0.6",b.value=c[x]||""}),f.disabled=!0,f.textContent="Submitted"):(d.forEach(b=>{b.disabled=!1,b.style.opacity="1"}),f.disabled=!1),this.submitGenericQuiz(s,m)})});break}case"multi_select":{t.className+=" cf-rt-quiz-block";const s=e.id,a=this.state.mandatoryCompleted.includes(s);if(e.mandatory){const f=document.createElement("div");f.id=`mandatory-badge-${s}`,f.style.cssText="font-size:10px;font-weight:700;letter-spacing:0.15em;padding:4px 10px;border-radius:6px;margin-bottom:8px;display:inline-block;",a?(f.textContent="✓ COMPLETED",f.style.background="#052e16",f.style.color="#4ade80",f.style.border="1px solid #166534"):(f.textContent="⚠ MANDATORY — Answer to continue",f.style.background="#2a0a0a",f.style.color="#f87171",f.style.border="1px solid #7f1d1d"),t.appendChild(f)}const o=this.state.quizScores[s],l=o&&o.score>0;let c=e.options.map((f,g)=>`
          <label class="cf-rt-quiz-option" data-quiz-id="${s}" data-option-idx="${g}" ${l?'style="opacity:0.6;cursor:not-allowed;"':""}>
            <input type="checkbox" name="ms-${s}" value="${g}" ${l?"disabled":""} ${l&&e.correctAnswer.includes(g.toString())?"checked":""} />
            <span class="cf-rt-quiz-option-text">${f}</span>
          </label>
        `).join("");const u=document.createElement("div"),h=e.questionImage,d=h?`<div style="margin:0.75rem 0;"><img src="${h}" alt="Question image" style="max-width:100%;max-height:280px;object-fit:contain;border-radius:8px;border:1.5px solid #3f3f46;display:block;"/></div>`:"";u.innerHTML=`
          <div class="cf-rt-quiz-badge">MULTI-SELECT</div>
          <div class="cf-rt-quiz-question">${e.question}</div>
          ${d}
          <div class="cf-rt-quiz-options">${c}</div>
          <button class="cf-rt-quiz-submit" data-quiz-id="${s}" disabled ${l?'style="opacity:0.6;cursor:not-allowed;"':""}>${l?"Submitted":"Submit Answer"}</button>
          <div id="fb-${s}" class="cf-rt-quiz-feedback">
            ${l?'<span style="color:#4ade80">✓ Correct!</span>':""}
          </div>
        `,t.appendChild(u),requestAnimationFrame(()=>{const f=t.querySelector(`.cf-rt-quiz-submit[data-quiz-id="${s}"]`),g=t.querySelectorAll(`input[name="ms-${s}"]`);f&&(g.forEach(_=>{_.addEventListener("change",()=>{f.disabled=!Array.from(g).some(m=>m.checked)})}),f.addEventListener("click",()=>{const _=Array.from(g).filter(b=>b.checked).map(b=>b.value),m=e.correctAnswer.map(b=>b.toString());let p=_.length===m.length&&_.every(b=>m.includes(b));const S=t.querySelector(`#fb-${s}`);S&&(S.innerHTML=p?'<span style="color:#4ade80">✓ Correct!</span>':'<span style="color:#f87171">✗ Incorrect. Try again.</span>'),p&&(g.forEach(b=>{b.disabled=!0,b.parentElement.style.opacity="0.6"}),f.disabled=!0,f.textContent="Submitted"),this.submitGenericQuiz(s,p?1:0)}))});break}case"matching":{t.className+=" cf-rt-quiz-block";const s=e.id,a=this.state.mandatoryCompleted.includes(s);if(e.mandatory){const d=document.createElement("div");d.id=`mandatory-badge-${s}`,d.style.cssText="font-size:10px;font-weight:700;letter-spacing:0.15em;padding:4px 10px;border-radius:6px;margin-bottom:8px;display:inline-block;",a?(d.textContent="✓ COMPLETED",d.style.background="#052e16",d.style.color="#4ade80",d.style.border="1px solid #166534"):(d.textContent="⚠ MANDATORY — Answer to continue",d.style.background="#2a0a0a",d.style.color="#f87171",d.style.border="1px solid #7f1d1d"),t.appendChild(d)}const o=this.state.quizScores[s],l=o&&o.score>0,c=e.pairs.map(d=>d.rightItem);if(!l)for(let d=c.length-1;d>0;d--){const f=Math.floor(Math.random()*(d+1));[c[d],c[f]]=[c[f],c[d]]}const u=document.createElement("div");let h=e.pairs.map((d,f)=>{let g='<option value="">Select match...</option>';return c.forEach(_=>{g+=`<option value="${_.replace(/"/g,"&quot;")}" ${l&&d.rightItem===_?"selected":""}>${_}</option>`}),`
            <div style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
              <div style="flex:1; padding:10px; background:#18181b; border-radius:6px; color:#fafafa; border:1px solid #27272a;">${d.leftItem}</div>
              <select class="cf-rt-match-select" data-pair-idx="${f}" style="flex:1; padding:10px; background:#18181b; border-radius:6px; color:#e4e4e7; border:1px solid #2d2d34; outline:none;" ${l?"disabled":""}>
                ${g}
              </select>
            </div>
          `}).join("");u.innerHTML=`
          <div class="cf-rt-quiz-badge">MATCHING</div>
          <div class="cf-rt-quiz-question">${e.question}</div>
          <div class="cf-rt-match-container" style="margin-top:1rem;">${h}</div>
          <button class="cf-rt-quiz-submit" data-quiz-id="${s}" disabled ${l?'style="opacity:0.6;cursor:not-allowed;"':""}>${l?"Submitted":"Submit Answer"}</button>
          <div id="fb-${s}" class="cf-rt-quiz-feedback">
            ${l?'<span style="color:#4ade80">✓ Correct!</span>':""}
          </div>
        `,t.appendChild(u),requestAnimationFrame(()=>{const d=t.querySelector(`.cf-rt-quiz-submit[data-quiz-id="${s}"]`),f=t.querySelectorAll(".cf-rt-match-select");d&&(f.forEach(g=>{g.addEventListener("change",()=>{d.disabled=!Array.from(f).every(_=>_.value!=="")})}),d.addEventListener("click",()=>{let g=!0;f.forEach(m=>{const p=parseInt(m.getAttribute("data-pair-idx")||"0"),S=e.pairs[p].rightItem;m.value!==S&&(g=!1)});const _=t.querySelector(`#fb-${s}`);_&&(_.innerHTML=g?'<span style="color:#4ade80">✓ Correct!</span>':'<span style="color:#f87171">✗ Incorrect. Try again.</span>'),g&&(f.forEach(m=>{m.disabled=!0,m.style.opacity="0.6"}),d.disabled=!0,d.textContent="Submitted"),this.submitGenericQuiz(s,g?1:0)}))});break}case"flashcard":t.innerHTML=this.renderFlashcardHTML(e),requestAnimationFrame(()=>{const s=t.querySelector(".cf-rt-flashcard-scene");s&&s.addEventListener("click",()=>{s.classList.toggle("flipped")})});break;case"list":{const s=document.createElement("ul");s.className="cf-rt-list",s.style.paddingLeft="20px",s.style.margin="0",s.style.color="inherit";for(const a of e.items){const o=document.createElement("li");o.style.marginBottom="8px",o.style.lineHeight="1.75",o.textContent=a,s.appendChild(o)}t.appendChild(s);break}case"columns":{const s=e.columns||[],a=document.createElement("div");a.className="cf-rt-columns-grid",a.style.setProperty("--cf-columns-count",String(Math.max(s.length||0,1)));for(const o of s){const l=document.createElement("div");l.className="cf-rt-column";for(const c of o){const u=this.renderComponent(c);if(c.type==="text"){const h=u?.querySelector(".cf-rt-text");h&&(h.style.color="inherit")}u&&l.appendChild(u)}a.appendChild(l)}t.appendChild(a);break}case"table":{const s=document.createElement("div");s.style.overflowX="auto",s.style.marginBottom="1rem";const a=e.tableColor||"#ffffff",o=e.headerColor||ih(a,20),l=this.getContrastColor(o),c=this.getContrastColor(a);let u='<table style="width:100%; border-collapse:collapse; border:1px solid #3f3f46; font-size:14px;">';u+="<thead><tr>";for(const h of e.headers||[])u+=`<th style="border:1px solid #3f3f46; padding:10px; background:${o}; color:${l}; font-weight:600; text-align:left;">${h}</th>`;u+="</tr></thead><tbody>";for(const h of e.rows||[]){u+="<tr>";for(const d of h)u+=`<td style="border:1px solid #3f3f46; padding:10px; background:${a}; color:${c};">${d}</td>`;u+="</tr>"}u+="</tbody></table>",s.innerHTML=u,t.appendChild(s);break}case"quote":{const s=document.createElement("div");s.className="cf-rt-quote";const a=String(e.layout||"below-left"),o=!!e.bgImage,l=Math.max(0,Math.min(1,Number(e.bgOverlay??.45))),c=a.startsWith("above"),u=a.startsWith("inline"),h=a.endsWith("right");if(s.style.position="relative",s.style.overflow="hidden",s.style.padding="0",s.style.background=o?"#111827":"#202026",s.style.borderRadius="8px",s.style.borderLeft="4px solid #8b1a1a",s.style.minHeight=o?"140px":"",o&&(s.style.backgroundImage=`url(${e.bgImage})`,s.style.backgroundSize="cover",s.style.backgroundPosition="center"),o){const p=document.createElement("div");p.style.position="absolute",p.style.inset="0",p.style.pointerEvents="none",p.style.backgroundColor=`rgba(0,0,0,${l})`,s.appendChild(p)}const d=document.createElement("div");d.style.position="relative",d.style.zIndex="1",d.style.display="flex",d.style.flexDirection=c?"column-reverse":"column",d.style.gap="0.35rem",d.style.padding="1rem 1rem 0.6rem";const f=o?"rgba(255,255,255,0.6)":"rgba(238, 208, 208, 0.4)",g=o?"rgba(255,255,255,0.85)":"#d8b0b0",_=o?"#ffffff":"#e4e4e7";if(u){const p=document.createElement("div");p.style.display="flex",p.style.alignItems="center",p.style.gap="0.75rem",p.style.flexDirection=h?"row-reverse":"row";const S=document.createElement("span");if(S.style.display="block",S.style.fontSize="3.5rem",S.style.lineHeight="0.6",S.style.color=f,S.style.fontFamily="Georgia, serif",S.textContent='"',p.appendChild(S),e.author){const b=document.createElement("div");b.style.fontSize="0.875rem",b.style.color=g,b.style.fontWeight="600",b.style.fontFamily="Georgia, serif",b.style.fontStyle="italic",b.textContent=e.author,p.appendChild(b)}d.appendChild(p)}else{const p=document.createElement("span");p.style.display="block",p.style.fontSize="3.5rem",p.style.lineHeight="0.6",p.style.color=f,p.style.fontFamily="Georgia, serif",p.style.marginBottom="0.15rem",p.textContent='"',d.appendChild(p)}const m=document.createElement("div");if(m.style.fontSize="18px",m.style.fontStyle="italic",m.style.color=_,m.style.lineHeight="1.7",m.innerHTML=e.content,d.appendChild(m),!u&&e.author){const p=document.createElement("div");p.style.display="flex",p.style.justifyContent=h?"flex-end":"flex-start";const S=document.createElement("div");S.style.fontSize="0.875rem",S.style.color=g,S.style.fontWeight="600",S.style.fontFamily="Georgia, serif",S.style.fontStyle="italic",S.textContent=e.author,p.appendChild(S),d.appendChild(p)}s.appendChild(d),t.appendChild(s);break}case"statement":{const s=document.createElement("div");s.style.margin="1rem 0",s.style.borderRadius="12px",s.style.border="1px solid #2d2d34",s.style.overflow="hidden",s.style.background="#18181b",s.style.boxShadow="0 4px 20px rgba(0,0,0,0.3)";const a=document.createElement("div");a.style.position="relative",a.style.width="100%",a.style.height=String(e.imageHeight||"380px"),a.style.overflow="hidden",a.style.backgroundSize="cover",a.style.backgroundPosition="center",a.style.backgroundRepeat="no-repeat";const o=e.image;if(o)a.style.backgroundImage=`url(${o})`;else{a.style.background="#202026";const l=document.createElement("div");l.style.position="absolute",l.style.inset="0",l.style.display="flex",l.style.alignItems="center",l.style.justifyContent="center",l.style.color="#a1a1aa",l.style.fontSize="0.88rem",l.style.fontWeight="600",l.textContent="No image uploaded",a.appendChild(l)}(e.textLayers||[]).forEach((l,c)=>{const u=document.createElement("div");u.style.position="absolute",u.style.left=`${Math.max(0,Math.min(88,Number(l.x??8)))}%`,u.style.top=`${Math.max(0,Math.min(88,Number(l.y??8)))}%`,u.style.display="block",u.style.minWidth="100px",u.style.zIndex="10";const h=document.createElement("div");h.style.minWidth="90px",h.style.background="transparent",h.style.border="none",h.style.borderRadius="0",h.style.backdropFilter="none",h.style.backdropFilter="none";const d=document.createElement("div");d.className="cf-rt-text",d.style.color="#1a1a1a",d.style.minWidth="140px",d.style.minHeight="1.6em",d.style.textShadow="0 1px 2px rgba(255,255,255,0.7)",d.innerHTML=l.content||"",h.appendChild(d),u.appendChild(h),a.appendChild(u)}),s.appendChild(a),t.appendChild(s);break}case"audio":{if(e.mandatory){const a=this.state.mandatoryCompleted.includes(e.id),o=document.createElement("div");o.id=`mandatory-badge-${e.id}`,o.style.cssText="font-size:10px;font-weight:700;letter-spacing:0.15em;padding:4px 10px;border-radius:6px;margin-bottom:8px;display:inline-block;",a?(o.textContent="✓ COMPLETED",o.style.background="#052e16",o.style.color="#4ade80",o.style.border="1px solid #166534"):(o.textContent="⚠ MANDATORY — Listen to continue",o.style.background="#2a0a0a",o.style.color="#f87171",o.style.border="1px solid #7f1d1d"),t.appendChild(o)}const s=document.createElement("div");if(s.innerHTML=`
          <div style="margin-bottom:6px;font-size:10px;font-weight:700;letter-spacing:0.15em;color:#c0392b;">AUDIO</div>
          <div style="font-size:14px;font-weight:600;color:#fafafa;margin-bottom:10px;">${e.label||"Audio Track"}</div>
          <audio id="audio-el-${e.id}" controls style="display:block;width:100%;border-radius:8px;background:transparent;">
            <source src="${e.src}">
            Your browser does not support audio.
          </audio>
        `,t.appendChild(s),e.mandatory){const a=e.id,o=this.state.mandatoryCompleted.includes(a);requestAnimationFrame(()=>{const l=document.getElementById(`audio-el-${a}`);if(l){if(!o){let c=0;l.addEventListener("timeupdate",()=>{l.seeking||(c=Math.max(c,l.currentTime))}),l.addEventListener("seeking",()=>{l.currentTime>c+1&&(l.currentTime=c)})}l.addEventListener("ended",()=>{this.markMandatoryComplete(a)})}})}break}case"process":t.innerHTML=this.renderProcessHTML(e),requestAnimationFrame(()=>this.attachProcessListeners(e.id,e.steps.length));break;default:return null}return this.applyComponentAnimation(t,n,i),t}renderQuizHTML(e){const t=this.state.quizScores[e.id],n=t&&t.score>0,i=e.questionImage,r=e.options.map((a,o)=>`
      <label class="cf-rt-quiz-option" data-quiz-id="${e.id}" data-option-idx="${o}" ${n?'style="opacity:0.6;cursor:not-allowed;"':""}>
        <input type="radio" name="quiz-${e.id}" value="${o}" ${n?"disabled":""} ${n&&o===e.correctAnswer?"checked":""} />
        <span class="cf-rt-quiz-option-text">${a}</span>
      </label>
    `).join(""),s=i?`<div style="margin:0.75rem 0;"><img src="${i}" alt="Question image" style="max-width:100%;max-height:280px;object-fit:contain;border-radius:8px;border:1.5px solid #3f3f46;display:block;"/></div>`:"";return`
      <div class="cf-rt-quiz-badge">QUIZ</div>
      <div class="cf-rt-quiz-question">${e.question}</div>
      ${s}
      <div class="cf-rt-quiz-options">${r}</div>
      <button class="cf-rt-quiz-submit" data-quiz-id="${e.id}" disabled ${n?'style="opacity:0.6;cursor:not-allowed;"':""}>${n?"Submitted":"Submit Answer"}</button>
      <div class="cf-rt-quiz-feedback" id="feedback-${e.id}">
        ${n?'<span style="color:#4ade80">✓ Correct!</span>':""}
      </div>
    `}attachQuizListeners(e){const t=document.querySelector(`.cf-rt-quiz-submit[data-quiz-id="${e}"]`),n=document.querySelectorAll(`input[name="quiz-${e}"]`);if(!t)return;const i=this.state.quizScores[e];i&&i.score>0||n.forEach(r=>{r.addEventListener("change",()=>{t.disabled=!1})}),t.addEventListener("click",async()=>{const r=document.querySelector(`input[name="quiz-${e}"]:checked`);if(r){await this.submitQuiz(e,Number(r.value));const s=this.state.quizScores[e],a=s&&s.score>0;a?(t.disabled=!0,n.forEach(l=>{l.disabled=!0})):t.disabled=!1;const o=document.getElementById(`feedback-${e}`);o&&(o.innerHTML=a?'<span style="color:#4ade80">✓ Correct!</span>':'<span style="color:#f87171">✗ Incorrect. Try again.</span>')}})}renderFlashcardHTML(e){const t=e.imageUrl,n=!!e.isSolid,i=e.color||"#8b1a1a",r=t?`background: linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)), url('${t}') center / cover no-repeat;`:n?`background:${i};`:`background:${e.frontBackground||"linear-gradient(145deg, #1a0a0a 0%, #3d1010 60%, #6b1a1a 100%)"};`,s=n?`background:${i};`:`background:${e.backBackground||"linear-gradient(145deg, #1e1e24 0%, #18181b 100%)"}`,a=n?"#ffffff":e.backTextColor||"#ffffff",o=n?"rgba(255,255,255,0.68)":e.backBadgeColor||"#ef4444";return`
      <div class="cf-rt-flashcard-scene">
        <div class="cf-rt-flashcard-inner">
          <div class="cf-rt-flashcard-face cf-rt-flashcard-front" style="${r}border:1px solid ${e.frontBorder||"#4d2020"};box-shadow:0 8px 32px ${e.frontShadow||"rgba(139,26,26,0.25)"};">
            <div class="cf-rt-flashcard-label" style="color:${e.frontBadgeColor||"rgba(255,255,255,0.68)"};">QUESTION</div>
            <div class="cf-rt-flashcard-text">${e.front}</div>
            <div class="cf-rt-flashcard-hint" style="color:rgba(255,255,255,0.78);">↻ Click to flip</div>
          </div>
          <div class="cf-rt-flashcard-face cf-rt-flashcard-back" style="${s};border:2px solid ${e.backBorder||"#2d2d34"};box-shadow:0 8px 32px ${e.backShadow||"rgba(139,26,26,0.12)"};">
            <div class="cf-rt-flashcard-label" style="color:${o};">ANSWER</div>
            <div class="cf-rt-flashcard-text" style="color:${a};">${e.back}</div>
            <div class="cf-rt-flashcard-hint" style="color:${a};">↻ Click to flip back</div>
          </div>
        </div>
      </div>
    `}renderProcessHTML(e){if(!e.steps||e.steps.length===0)return"<p>No steps.</p>";const t=this.course.slides[this.state.currentSlide];let n="#18181b";if(t&&t.background){const h=t.background;h.type==="color"&&h.value&&(n=h.value)}const i=this.getContrastColor(n)==="#ffffff",r=i?"#1a1a1e":"#ffffff",s=i?"#27272a":"#ead0d0",a=i?"#09090b":"#fdf8f8",o=i?"#fafafa":"#1a0a0a",l=i?"#a1a1aa":"#333333",c=i?"#27272a":"#ead0d0";let u=`<div class="cf-rt-process-block" id="proc-${e.id}" data-step="0" style="background:${r};border-radius:12px;padding:24px;border:1px solid ${s};">`;u+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">',u+=`<div style="font-weight:600;color:#c0392b;" id="proc-label-${e.id}">Step 1 of ${e.steps.length}</div>`,u+="<div>",u+=`<button class="cf-rt-nav-btn" style="padding:6px 12px;font-size:12px;margin-right:8px;" id="proc-prev-${e.id}">Prev</button>`,u+=`<button class="cf-rt-nav-btn cf-rt-nav-btn-primary" style="padding:6px 12px;font-size:12px;" id="proc-next-${e.id}">Next</button>`,u+="</div></div>",u+=`<div style="background:${a};padding:16px;border-radius:8px;min-height:120px;">`,e.steps.forEach((h,d)=>{u+=`<div id="proc-step-${e.id}-${d}" style="display:${d===0?"block":"none"};">`,u+=`<h3 style="margin-bottom:8px;color:${o};font-size:18px;">${h.title||""}</h3>`,u+=`<div style="color:${l};line-height:1.6;">${h.content||""}</div>`,u+="</div>"}),u+="</div>",u+='<div style="display:flex;justify-content:center;gap:6px;margin-top:16px;">';for(let h=0;h<e.steps.length;h++)u+=`<div id="proc-dot-${e.id}-${h}" style="width:8px;height:8px;border-radius:4px;background:${h===0?"#8b1a1a":c};transition:background 0.2s;"></div>`;return u+="</div>",u+="</div>",u}attachProcessListeners(e,t){const n=document.getElementById(`proc-${e}`),i=document.getElementById(`proc-prev-${e}`),r=document.getElementById(`proc-next-${e}`),s=document.getElementById(`proc-label-${e}`);if(!n||!i||!r||!s)return;const a=()=>{const o=parseInt(n.getAttribute("data-step")||"0",10);s.innerText=`Step ${o+1} of ${t}`,i.disabled=o<=0,r.disabled=o>=t-1;for(let l=0;l<t;l++){const c=document.getElementById(`proc-step-${e}-${l}`),u=document.getElementById(`proc-dot-${e}-${l}`);c&&(c.style.display=l===o?"block":"none"),u&&(u.style.background=l===o?"#8b1a1a":"#27272a")}};a(),i.addEventListener("click",()=>{let o=parseInt(n.getAttribute("data-step")||"0",10);o>0&&(o--,n.setAttribute("data-step",String(o)),a())}),r.addEventListener("click",()=>{let o=parseInt(n.getAttribute("data-step")||"0",10);o<t-1&&(o++,n.setAttribute("data-step",String(o)),a())})}renderLayerVisibility(){document.querySelectorAll(".cf-rt-layer").forEach(e=>{const t=e.dataset.layerId;if(t){const n=this.state.layerVisibility[t]??!0;e.style.display=n?"block":"none"}})}renderFeedback(e,t="info"){let n=document.querySelector(".cf-rt-quiz-feedback:empty");if(!n){n=document.createElement("div"),n.className=`cf-rt-toast cf-rt-toast-${t}`,n.textContent=e,document.body.appendChild(n),setTimeout(()=>{n.classList.add("cf-rt-toast-exit"),setTimeout(()=>n.remove(),300)},2e3);return}n.textContent=e,n.className=`cf-rt-quiz-feedback cf-rt-feedback-${t}`}updateNavUI(e){const t=this.course.slides.length,n=document.getElementById("cf-progress-bar");if(n){const o=(e+1)/t*100;n.style.width=`${o}%`}const i=document.getElementById("cf-slide-counter");i&&(i.textContent=`${e+1} / ${t}`);const r=document.getElementById("cf-prev-btn"),s=document.getElementById("cf-next-btn");r&&(r.disabled=e<=0);let a=document.getElementById("cf-finish-btn");!a&&s&&s.parentElement&&(a=document.createElement("button"),a.id="cf-finish-btn",a.className="cf-rt-nav-btn cf-rt-nav-btn-primary",a.textContent="Finish Course",a.addEventListener("click",()=>{if(a.disabled)return;const o=[...this.mandatoryIds].every(h=>this.state.mandatoryCompleted.includes(h)),l=this.state.visitedSlides.every(h=>h===!0);if(!o||!l){this.renderFeedback("You must view all slides and complete all mandatory items before finishing.","incorrect");return}this.reportScore(),this.checkCompletion(!0);const c=this.calculateScore(),u=window.__CF_XAPI_REPORT_COMPLETION;typeof u=="function"&&u(c.pct),this.scorm.isConnected&&(this.sessionFinished=!0,this.scorm.finish()),a.disabled=!0,this.renderFeedback("Course finished successfully.","correct")}),s.parentElement.appendChild(a)),e===t-1?(s&&(s.style.display="none"),a&&(a.style.display="inline-flex")):(s&&(s.style.display="inline-flex",s.disabled=!1),a&&(a.style.display="none"))}registerKeyboardNav(){document.addEventListener("keydown",e=>{e.key==="ArrowRight"||e.key==="ArrowDown"?(e.preventDefault(),this.nextSlide()):(e.key==="ArrowLeft"||e.key==="ArrowUp")&&(e.preventDefault(),this.prevSlide())})}};window.CourseForgeRuntime={boot:async e=>{const t=new rh;await t.boot(e),window.__cfRuntime=t,window.__cfRestart=()=>t.restartCourse()}},document.addEventListener("DOMContentLoaded",()=>{const e=window.__CF_COURSE_DATA;e&&window.CourseForgeRuntime.boot(e)})})();
