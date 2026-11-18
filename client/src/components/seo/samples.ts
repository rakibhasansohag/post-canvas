// HTML as other editors save it, for the import demos. `{photos}` becomes the site's sample photo folder in the browser.
// Each sample keeps the editor's real markup habits, so the demo shows what fromHTML keeps and what it drops.

export const tinymceHtml = `<h2 style="text-align: center;">Spring menu at the harbour cafe</h2>
<p>We reopen on <strong>Saturday</strong> with a <span style="color: #e03e2d;">new lunch menu</span> and longer hours. <a href="https://example.com/menu" target="_blank" rel="noopener">See the full menu</a>.</p>
<p><img src="{photos}/cafe-1280.webp" alt="The cafe counter in the morning" width="640" height="427"></p>
<p><img src="../images/old-menu.jpg" alt="Last year's menu" width="600" height="400"></p>
<h3>Opening hours</h3>
<table style="border-collapse: collapse; width: 100%;" border="1">
<tbody>
<tr><td>Monday to Friday</td><td>8am to 4pm</td></tr>
<tr><td>Saturday and Sunday</td><td>9am to 5pm</td></tr>
</tbody>
</table>
<p><iframe src="https://www.youtube.com/embed/aqz-KE-bpKQ" width="560" height="314" allowfullscreen="allowfullscreen"></iframe></p>`;

export const ckeditorHtml = `<h2>News from the harbour</h2>
<p>The <strong>summer ferry</strong> starts on <i>1 June</i>. <mark class="marker-yellow">Book early</mark>: the first week sells out.</p>
<figure class="image"><img src="{photos}/harbour-1280.webp" alt="Boats in the harbour at dusk"><figcaption>The harbour from the north pier</figcaption></figure>
<ul>
<li>Departures every hour from 9am</li>
<li>Bikes travel free</li>
</ul>
<figure class="media"><oembed url="https://www.youtube.com/watch?v=aqz-KE-bpKQ"></oembed></figure>
<blockquote><p>The crossing takes forty minutes.</p></blockquote>`;

export const froalaHtml = `<h2>Two days on the coast path</h2>
<p>Day one runs from the lighthouse to the old harbour. <u>Bring water</u>: there is no shop until the second village.</p>
<p><img src="{photos}/coast-1280.webp" class="fr-fic fr-dib" style="width: 640px;" alt="The coast path above the cliffs"></p>
<p><span class="fr-video fr-deletable fr-fvc fr-dvb fr-draggable" contenteditable="false" draggable="true"><iframe width="640" height="360" src="https://www.youtube.com/embed/aqz-KE-bpKQ?&wmode=opaque&rel=0" frameborder="0" allowfullscreen class="fr-draggable"></iframe></span></p>
<p style="text-align: right;"><span style="font-size: 18px; font-family: Georgia, serif;">Photos by the walking club.</span></p>
<script>trackView();</script>`;

/** Quill 1 (what react-quill 2 runs): alignment and indent are classes, not styles. */
export const quillHtml = `<h2>Trip notes</h2>
<p class="ql-align-center"><strong>Day one:</strong> the lake and the market.</p>
<ul>
<li>Early train to the lake</li>
<li class="ql-indent-1">Coffee at the pier</li>
<li>Market after lunch</li>
</ul>
<p>Read the <a href="https://example.com/route" rel="noopener noreferrer" target="_blank">full route</a> before you go.</p>
<p><img src="{photos}/lake-1280.webp"></p>
<iframe class="ql-video" frameborder="0" allowfullscreen="true" src="https://www.youtube.com/embed/aqz-KE-bpKQ?showinfo=0"></iframe>
<p><br></p>`;
