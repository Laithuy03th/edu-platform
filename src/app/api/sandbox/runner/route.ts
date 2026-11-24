/**
 * P05: trang chạy code của playground — luôn nhúng trong <iframe sandbox="allow-scripts"> (KHÔNG allow-same-origin)
 * nên chạy với origin "opaque": không đọc được cookie/localStorage của site, không chạm DOM trang cha.
 * CSP riêng: không kết nối mạng (connect-src 'none'), không form, không base; chỉ trang cùng site được nhúng.
 * Code người học được gửi qua postMessage (không qua server, không lưu). HTML tĩnh, không phụ thuộc người xem.
 */
const RUNNER = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Sandbox</title></head><body><script>
(function () {
  var P = window.parent;
  function fmt(v) {
    try {
      if (typeof v === "string") return v;
      if (v instanceof Error) return v.name + ": " + v.message;
      if (typeof v === "function") return "[Function " + (v.name || "anonymous") + "]";
      if (typeof v === "undefined") return "undefined";
      return JSON.stringify(v, null, 0);
    } catch (e) { return String(v); }
  }
  window.addEventListener("message", function (ev) {
    if (ev.source !== P) return;
    var d = ev.data;
    if (!d || d.type !== "run") return;
    var runId = String(d.runId || "");
    var bridge = "<scr" + "ipt>(function(){var P=window.parent,id=" + JSON.stringify(runId) + ",n=0;" +
      "function f(v){try{if(typeof v==='string')return v;if(v instanceof Error)return v.name+': '+v.message;if(typeof v==='function')return '[Function '+(v.name||'anonymous')+']';if(typeof v==='undefined')return 'undefined';return JSON.stringify(v)}catch(e){return String(v)}}" +
      "function s(l,a){if(++n>500)return;try{P.postMessage({type:'console',runId:id,level:l,args:Array.prototype.map.call(a,f)},'*')}catch(e){}}" +
      "['log','info','warn','error'].forEach(function(k){var o=console[k];console[k]=function(){s(k,arguments);try{o.apply(console,arguments)}catch(e){}}});" +
      "window.addEventListener('error',function(e){s('error',[e.message+(e.lineno?' (dòng '+e.lineno+')':'')])});" +
      "window.addEventListener('unhandledrejection',function(e){s('error',['Promise bị từ chối: '+f(e.reason)])});" +
      "setInterval(function(){P.postMessage({type:'alive',runId:id},'*')},500);" +
      // Bảo vệ vòng lặp: code chạy liên tục > 1,5 s (các lần gọi cách nhau < 50 ms) → __lp() trả true → break.
      "var t0=0,la=0,w=false;window.__lp=function(){var x=Date.now();if(x-la>50)t0=x;la=x;if(x-t0>1500){if(!w){w=true;s('error',['Vòng lặp chạy liên tục quá 1,5 giây nên đã bị dừng (bảo vệ vòng lặp vô hạn).'])}t0=x;return true}return false};" +
      "})();</scr" + "ipt>";
    var css = String(d.css || "").replace(/<\\/style/gi, "<\\\\/style");
    var js = String(d.js || "").replace(/<\\/script/gi, "<\\\\/script");
    document.open();
    document.write("<!doctype html><html lang='vi'><head><meta charset='utf-8'><style>" + css + "</style>" + bridge + "</head><body>" + String(d.html || "") +
      "<scr" + "ipt>" + js + "\\n</scr" + "ipt></body></html>");
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
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex",
      "Referrer-Policy": "no-referrer",
    },
  });
}
