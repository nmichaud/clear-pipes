import Two from "two.js";
import * as React from "react";
import * as ReactDOMServer from "react-dom/server";
import { makeConnector, makeBox, makeGradient, makeHopper } from "./src/render";
import { startPhysics } from "./src/physics";
import { processTDV } from "./src/process";
import { Vector } from "matter-js";
import { subtract } from "./src/utils";

let elem = document.getElementById("draw-animation");
let width = window.innerWidth;
let height = window.innerHeight;
window.width = width;
window.height = height;

let two = new Two({ fullscreen: true, autostart: true }).appendTo(elem);
two.renderer.domElement.setAttribute("viewBox", "-0 -0 1000 1050");

window.two = two;

let pHopper = new Two.Vector(200, 220);
let pClean = new Two.Vector(200, 750);
let pRule = new Two.Vector(500, 750);
// let pCache = new Two.Vector(600, 750);
let pCheck = new Two.Vector(800, 750);
let pDestination = new Two.Vector(950, 350);
let pTrash = new Two.Vector(0, 870);
let pTrash2 = new Two.Vector(0, 905);
let pTrash3 = new Two.Vector(0, 940);
// let pTrash4 = new Two.Vector(0,  975);
let pGradient = new Two.Vector(0, 905);

let c1 = makeConnector(new Two.Vector(200, 420), pClean, "1", true, "wiggle");
let c2 = makeConnector(pClean, pRule, "2", false, "l");
// let c3 = makeConnector(pRule, pCache, "3", false, "l");
let c3 = makeConnector(pRule, pCheck, "3", false, "loop");
let c4 = makeConnector(pCheck, pDestination, "4");

let cTrash1 = makeConnector(pClean, pTrash, "t1", true);
let cTrash2 = makeConnector(pRule, pTrash2, "t2", true);
// let cTrash3 = makeConnector(pCache, pTrash3, "t3", true);
let cTrash3 = makeConnector(pCheck, pTrash3, "t4", true);
let trashGradient = makeGradient(pGradient.x, pGradient.y, 200);
// let c7 = makeConnector(pCheck, pTrash, "5", true);

let boxHopper = makeHopper(pHopper, 350, "a");
let boxClean = makeBox(pClean, 100, "b");
boxClean.setText("Clean & Trim Punctu-ation");
let boxRule = makeBox(pRule, 100, "c");
boxRule.setText("Not Capitalized?");

// let boxCache = makeBox(pCache, 100, "d");
// boxCache.setText("Not Seen by us?");

let boxCheck = makeBox(pCheck, 100, "d");
boxCheck.setText("Doesn't occur in Archives?");

let boxDestination = makeBox(new Two.Vector(900, 350), 150, "f");
// let connections = [c1, c2];

let { addWord, removeWord, setGravity } = startPhysics(boxHopper);

// words.slice(0, 65).map(addWord);

function formatWords(words: Array<string>) {
  return `<p class="word-bank">${words
    .map(w => `<span class="word-span">${w}</span>&nbsp;`)
    .join(" ")}</p>`;
}

let destinationWords: Array<string> = ["Tweeted:"];
boxDestination.setText(formatWords(destinationWords));

let text1 = new Two.Text("", 410, 110, {
  size: 105,
  weight: 100,
  family: "Libre Franklin",
  alignment: "left"
});

let text2 = new Two.Text(`Loading...         `, 415, 190, {
  size: 60,
  weight: 100,
  family: "Libre Franklin",
  alignment: "left"
});
let text3 = new Two.Text(``, 415, 240, {
  size: 30,
  weight: 100,
  family: "Libre Franklin",
  alignment: "left"
});

// let infoBox = makeBox(new Two.Vector(500, 300), 200, "info");
// infoBox.setText(`This is a visualization of the @nyt_first_said pipeline.`);

let group = two.makeGroup(text1, text2, text3);
let group2 = two.makeGroup();
two.update();
let svgElem = group2._renderer.elem;
svgElem.innerHTML += `<a id="article-link"   >
<text x="25" y="35">
 Loading...
</text>
</a>`;

function updateArticleLink(url) {
  let articleLink = document.getElementById("article-link");
  articleLink.remove();
  svgElem.innerHTML += `<a id="article-link" target="_blank" href="${url}">
  <text x="25" y="35">
   ${url}
  </text>
  </a>`;
}

function startUp(setback) {
  let d = new Date();
  var offset = new Date().getTimezoneOffset(); // getting offset to make time in gmt+0 zone (UTC) (for gmt+5 offset comes as -300 minutes)
  d.setMinutes(d.getMinutes() + offset); // date now in UTC time
  var easternTimeOffset = -240; //for dayLight saving, Eastern time become 4 hours behind UTC thats why its offset is -4x60 = -240 minutes. So when Day light is not active the offset will be -300
  d.setMinutes(d.getMinutes() + easternTimeOffset + setback * 60);

  const ye = new Intl.DateTimeFormat("en", { year: "numeric" }).format(d);
  const mo = new Intl.DateTimeFormat("en", { month: "long" }).format(d);
  const da = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(d);

  let date = `${mo}-${da}-${ye}`;
  text1.value = `${mo} ${da}`;

  let wordList: string[] = [];
  let articles: string[][] = [];
  let article_i = 0;
  let wordCount = 0;
  let wordTotal = 0;
  function moveWord(): Promise<any> {
    text2.value = `article ${article_i + 1}/${article_i + 1 + articles.length}`;
    text3.value = `word ${wordCount.toLocaleString()} / ${wordTotal.toLocaleString()}`;
    two.update();
    wordCount++;
    if (wordList.length == 0) {
      wordList = articles.shift();
      updateArticleLink(wordList.url);
      article_i++;
      console.log("processing article " + articles);
    }
    let word = wordList.shift();

    addWord(word);

    let [initial, cleaned, passed, count, api_checked] = removeWord();

    // boxHopper.setText(formatWords(words));

    return c1
      .sendWord(initial, moveWord)
      .then(() => {
        // moveWord();
        if (initial.match(`[\@\/\#\_\-]`)) {
          cTrash1.sendWord(initial);
          throw "done";
        }
        cTrash1.sendWord(subtract(initial, cleaned));
        return c2.sendWord(cleaned);
      })
      .then(() => {
        if (passed) {
          return c3.sendWord(passed);
        } else {
          cTrash2.sendWord(cleaned);
          throw "done";
        }
      })
      .then(() => {
        if (api_checked) {
          return c4.sendWord(api_checked).then(() => {
            destinationWords.push(api_checked);
            boxDestination.setText(formatWords(destinationWords));
          });
        } else {
          return cTrash3.sendWord(passed);
        }
      });
  }

  // debugger;

  two.update();
  let url = `https://api.shaderbooth.com:3002/static/records/${date}.txt`;
  fetch(url)
    .then(response => response.text())
    .then(blob => {
      if (blob.length == 0) {
        startUp(-12);
        return;
      }
      articles = processTDV(blob);
      articles.shift();
      articles = articles.reverse();
      wordTotal = articles.reduce((acc, b) => b.length + acc, 0);

      wordList = articles.shift();
      updateArticleLink(wordList.url);
      // articles = articles.sort((a, b) => a.length - b.length);
      console.log(articles);

      for (let i = 0; i < 25; i++) {
        let word = wordList.shift();
        addWord(word);
      }

      window.setTimeout(moveWord, 1400);
    });

  two.bind("update", function() {}).play(); // Finally, start the animation loop
}
startUp(0);

document.getElementById("speed").addEventListener("change", e => {
  let n = parseInt(e.target.value, 10);

  console.log(n);
  setGravity(1 + n / 30);

  document.documentElement.style.setProperty(
    "--spin-duration",
    2000 / n + "ms"
  );
});
