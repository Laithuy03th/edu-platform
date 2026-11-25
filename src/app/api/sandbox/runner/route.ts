/**
 * P05: trang chạy code của playground — luôn nhúng trong <iframe sandbox="allow-scripts"> (KHÔNG allow-same-origin)
 * nên chạy với origin "opaque": không đọc được cookie/localStorage của site, không chạm DOM trang cha.
 * CSP riêng: không kết nối mạng (connect-src 'none'), không form, không base; chỉ trang cùng site được nhúng.
 * Code người học được gửi qua postMessage (không qua server, không lưu). HTML tĩnh, không phụ thuộc người xem.
 *
 * Luồng chạy: document.open → ghi <head> (CSS + cầu nối console) và HTML → chèn <script> JS của người học
 * (sourceURL=main.js để lỗi có số dòng đúng trong tệp JS) → (tùy chọn) chèn script kiểm thử → đóng tài liệu
 * (DOMContentLoaded vẫn phát sau JS của người học, đúng hành vi trang thật).
 */
const BRIDGE = String.raw`(function(){
var P=window.parent,id=__RUNID__,n=0;
function el(v){var s="<"+v.tagName.toLowerCase();if(v.id)s+="#"+v.id;if(v.className&&typeof v.className==="string")s+="."+v.className.trim().split(/\s+/).join(".");return s+">";}
function f(v,d){d=d||0;try{
 if(typeof v==="string")return v;
 if(v===undefined)return "undefined";
 if(v===null)return "null";
 if(typeof v==="function")return "[Function "+(v.name||"anonymous")+"]";
 if(typeof v==="symbol"||typeof v==="bigint")return String(v);
 if(v instanceof Error)return v.name+": "+v.message;
 if(typeof Element!=="undefined"&&v instanceof Element)return el(v);
 if(v instanceof Map)return "Map("+v.size+") "+f(Object.fromEntries(v),d+1);
 if(v instanceof Set)return "Set("+v.size+") "+f(Array.from(v),d+1);
 if(typeof v==="object"){var seen=new WeakSet();return JSON.stringify(v,function(k,x){if(typeof x==="object"&&x!==null){if(seen.has(x))return "[Vòng lặp]";seen.add(x);}if(typeof x==="function")return "[Function "+(x.name||"anonymous")+"]";if(x===undefined)return "undefined";if(typeof Element!=="undefined"&&x instanceof Element)return el(x);return x;},2);}
 return String(v);
}catch(e){return String(v);}}
function post(m){if(++n>800)return;m.runId=id;try{P.postMessage(m,"*")}catch(e){}}
function s(l,a){post({type:"console",level:l,args:Array.prototype.map.call(a,function(x){return f(x).slice(0,5000)})});}
["log","info","warn","error","debug"].forEach(function(k){var o=console[k];console[k]=function(){s(k==="debug"?"log":k,arguments);try{o.apply(console,arguments)}catch(e){}}});
console.dir=console.log;
console.clear=function(){post({type:"console-clear"})};
console.table=function(data){try{
 var rows=Array.isArray(data)?data:Object.keys(data||{}).map(function(k){return Object.assign({"(index)":k},typeof data[k]==="object"&&data[k]!==null?data[k]:{Value:data[k]})});
 rows=rows.slice(0,100);var cols=[];rows.forEach(function(r,i){if(typeof r!=="object"||r===null){rows[i]={Value:r};r=rows[i];}Object.keys(r).forEach(function(c){if(cols.indexOf(c)<0)cols.push(c)})});
 post({type:"table",columns:cols,rows:rows.map(function(r){return cols.map(function(c){return r[c]===undefined?"":f(r[c]).slice(0,300)})})});
}catch(e){s("log",[data])}};
window.alert=function(m){s("info",["[alert] "+f(m)])};
window.confirm=function(m){s("info",["[confirm] "+f(m)+" → false (hộp thoại bị tắt trong playground)"]);return false};
window.prompt=function(m){s("info",["[prompt] "+f(m)+" → null (hộp thoại bị tắt trong playground)"]);return null};
function lineOf(src,line,err){if(src&&/main\.js$/.test(src))return line;var m=err&&err.stack&&String(err.stack).match(/main\.js:(\d+):\d+/);return m?Number(m[1]):null;}
window.addEventListener("error",function(e){post({type:"console",level:"error",args:[(e.message||"Lỗi")],line:lineOf(e.filename,e.lineno,e.error)})});
window.addEventListener("unhandledrejection",function(e){var r=e.reason;post({type:"console",level:"error",args:["Promise bị từ chối: "+f(r)],line:lineOf("",0,r)})});
setInterval(function(){post({type:"alive"})},500);
// Bảo vệ vòng lặp: code chạy liên tục > 1,5 s (các lần gọi cách nhau < 50 ms) → __lp() trả true → break.
var t0=0,la=0,w=false;window.__lp=function(){var x=Date.now();if(x-la>50)t0=x;la=x;if(x-t0>1500){if(!w){w=true;s("error",["Vòng lặp chạy liên tục quá 1,5 giây nên đã bị dừng (bảo vệ vòng lặp vô hạn)."])}t0=x;return true}return false};
})();`;

/** Bộ kiểm thử tối giản cho chế độ "Thử thách": test(name, fn) + expect(x).toBe/toEqual/... (chạy sau DOMContentLoaded). */
const HARNESS = String.raw`(function(){
var P=window.parent,id=__RUNID__,list=[];
function fmt(v){try{return typeof v==="string"?JSON.stringify(v):JSON.stringify(v)}catch(e){return String(v)}}
window.test=function(name,fn){list.push({name:name,fn:fn})};
window.sleep=function(ms){return new Promise(function(r){setTimeout(r,ms)})};
window.expect=function(a){return{
 toBe:function(e){if(!Object.is(a,e))throw new Error("Mong đợi "+fmt(e)+", nhận được "+fmt(a))},
 toEqual:function(e){if(JSON.stringify(a)!==JSON.stringify(e))throw new Error("Mong đợi "+fmt(e)+", nhận được "+fmt(a))},
 toBeTruthy:function(){if(!a)throw new Error("Mong đợi giá trị đúng (truthy), nhận được "+fmt(a))},
 toContain:function(e){if(!a||a.indexOf(e)<0)throw new Error("Mong đợi chứa "+fmt(e)+", nhận được "+fmt(a))},
 toBeCloseTo:function(e,d){d=d===undefined?2:d;if(Math.abs(a-e)>=Math.pow(10,-d)/2)throw new Error("Mong đợi xấp xỉ "+e+", nhận được "+fmt(a))}
}};
function run(){(async function(){for(var i=0;i<list.length;i++){var t=list[i];try{await t.fn();P.postMessage({type:"test",runId:id,name:t.name,pass:true},"*")}catch(e){P.postMessage({type:"test",runId:id,name:t.name,pass:false,message:String(e&&e.message||e)},"*")}}P.postMessage({type:"tests-done",runId:id,total:list.length},"*")})()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){setTimeout(run,30)});else setTimeout(run,30);
})();`;

const RUNNER = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Sandbox</title></head><body><script>
(function () {
  var P = window.parent;
  var BRIDGE = ${JSON.stringify(BRIDGE)};
  var HARNESS = ${JSON.stringify(HARNESS)};
  window.addEventListener("message", function (ev) {
    if (ev.source !== P) return;
    var d = ev.data;
    if (!d || d.type !== "run") return;
    var rid = JSON.stringify(String(d.runId || ""));
    var esc = function (s, tag) { return String(s || "").replace(new RegExp("</" + tag, "gi"), "<\\\\/" + tag); };
    document.open();
    document.write("<!doctype html><html lang='vi'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><style>" + esc(d.css, "style") + "</style><scr" + "ipt>" + BRIDGE.replace(/__RUNID__/g, rid) + "</scr" + "ipt></head><body>" + String(d.html || ""));
    var add = function (code, name) {
      var s = document.createElement("script");
      s.textContent = code + "\\n//# sourceURL=" + name;
      (document.body || document.documentElement).appendChild(s);
    };
    if (d.js) add(String(d.js), "main.js");
    // Bọc test trong hàm riêng: biến của test (vd const o) không đụng biến toàn cục cùng tên trong code người học
    if (d.tests) add(HARNESS.replace(/__RUNID__/g, rid) + "\\n(function () {\\n" + String(d.tests) + "\\n})();", "tests.js");
    document.write("</body></html>");
    document.close();
  });
  P.postMessage({ type: "ready" }, "*");
})();
</script></body></html>`;

const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob: https:",
  "font-src data:",
  "media-src data: blob:",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "frame-ancestors 'self'",
].join("; ");

export function GET() {
  return new Response(RUNNER, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": CSP,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "Referrer-Policy": "no-referrer",
    },
  });
}
