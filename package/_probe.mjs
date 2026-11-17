import { Window } from 'happy-dom';
import { fromHTML, sanitizeDocument } from './dist/render.js';
const html = `<h1 style="text-align:center" class="x">Title</h1><h5>Small</h5><p style="text-align: right;"><span style="color: rgb(224, 62, 45);">red</span> <strong>bold</strong> <em>it</em> <u>u</u> <s>s</s> <a href="https://a.com" target="_blank" class="k">link</a> <a href="javascript:alert(1)">bad</a></p>
<ul><li>a</li><li>b<ul><li>c</li></ul></li></ul><ol start="3"><li>x</li></ol>
<table style="width:100%"><colgroup><col></colgroup><thead><tr><th>H</th></tr></thead><tbody><tr><td colspan="2">c</td></tr></tbody></table>
<p><img src="/uploads/a.png" alt="rel"></p><p><img src="https://x.com/a.png" alt="abs" width="100" height="50"></p><p><img src="data:image/png;base64,AAAA" alt="d"></p>
<p><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></p><p><iframe src="https://player.vimeo.com/video/76979871"></iframe></p><p><iframe src="https://evil.com/x"></iframe></p>
<script>alert(1)</script><style>p{}</style><div class="foo"><blockquote>q</blockquote></div><pre class="language-js"><code>let a=1</code></pre><custom-tag>hi</custom-tag><hr><p>line<br>two</p><figure class="image"><img src="https://x.com/b.png"><figcaption>Cap</figcaption></figure><p><mark style="background-color:yellow">hl</mark></p><ul class="todo-list"><li><input type="checkbox" checked>done</li></ul>`;
const window = new Window();
console.log(JSON.stringify(fromHTML(html, { window }), null, 1).slice(0, 6000));
