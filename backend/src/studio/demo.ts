import { Plan, Project, ProjectFile } from "./types";

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function demoPlan(project: Project): Plan {
  const brief = project.messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");
  const title = project.title
    .replace(/^(build|create|design|make)\s+(me\s+)?(an?\s+)?/i, "")
    .slice(0, 55);
  const hexes = [...new Set(brief.match(/#[a-fA-F0-9]{6}\b/g) || [])];
  const pages = [
    {
      name: "Home",
      path: "/",
      sections: ["Hero", "Highlights", "Call to action"],
    },
  ];
  for (const name of ["About", "Services", "Pricing", "Portfolio", "Contact"])
    if (new RegExp(`\\b${name}\\b`, "i").test(brief))
      pages.push({
        name,
        path: `/${name.toLowerCase()}`,
        sections:
          name === "Contact"
            ? ["Contact details", "Demo contact form"]
            : [`${name} introduction`, "Details", "Call to action"],
      });
  const dark = /dark|black/i.test(brief);
  return {
    title,
    description: `A responsive ${title} website, based on your brief: ${brief.slice(0, 1400)}. Demo mode produces a local starter with these pages; connect a model for fully tailored designs. Forms are client-side demonstrations.`,
    audience: "Visitors interested in the offering described in your brief.",
    pages,
    colors: [
      {
        name: "Primary",
        hex: hexes[0] || "#8B5CF6",
        usage: "Primary actions, links and accent details",
      },
      {
        name: "Background",
        hex: hexes[1] || (dark ? "#101218" : "#FAFAF9"),
        usage: "Page backgrounds",
      },
      {
        name: "Text",
        hex: hexes[2] || (dark ? "#F4F4F5" : "#18181B"),
        usage: "Headings and body text",
      },
      ...hexes.slice(3, 6).map((hex, i) => ({
        name: `Accent ${i + 2}`,
        hex,
        usage: "Supporting details",
      })),
    ],
    typography:
      "System sans-serif; bold, tightly tracked headings; 16px body text with generous line height.",
    visualDirection:
      "An editorial hero, spacious cards, subtle borders and rounded buttons. A clear visual hierarchy puts the primary action first.",
    features: [
      "Responsive navigation across all pages",
      "Working mobile navigation",
      "Client-side form confirmation where applicable",
    ],
    responsive:
      "Single-column on mobile, two-column content on tablets, wider grids and a split hero on desktop.",
    files:
      project.stack === "react"
        ? [
            {
              path: "styles.css",
              purpose: "Design tokens and responsive styles",
            },
            {
              path: "App.js",
              purpose: "Pages, hash navigation and interactions",
            },
            { path: "index.js", purpose: "React entry point" },
          ]
        : [
            {
              path: "styles.css",
              purpose: "Shared design tokens and responsive styles",
            },
            ...pages.map((p) => ({
              path: p.path === "/" ? "index.html" : `${p.path.slice(1)}.html`,
              purpose: `${p.name} page`,
            })),
            {
              path: "script.js",
              purpose: "Mobile navigation and demo form handling",
            },
          ],
  };
}
export function demoFiles(plan: Plan, stack: Project["stack"]): ProjectFile[] {
  const [primary, bg, fg] = plan.colors.map((c) => c.hex);
  const css = `:root{--primary:${primary};--bg:${bg};--fg:${fg};font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:var(--fg);background:var(--bg)}*{box-sizing:border-box}body{margin:0}a{color:inherit;text-decoration:none}button,input,textarea{font:inherit}button,.button{cursor:pointer;border:0;border-radius:12px;padding:14px 22px;background:var(--primary);color:white;font-weight:650;display:inline-block}header{max-width:1160px;margin:auto;display:flex;align-items:center;justify-content:space-between;padding:28px 24px;border-bottom:1px solid color-mix(in srgb,var(--fg) 12%,transparent)}.brand{font-size:19px;font-weight:800;max-width:260px}nav{display:flex;gap:24px;font-size:14px}nav a:hover{color:var(--primary)}.menu{display:none}main{max-width:1160px;margin:auto;padding:80px 24px}.hero{display:grid;grid-template-columns:1.2fr 1fr;gap:64px;align-items:center;min-height:440px}.eyebrow{color:var(--primary);font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:700}h1{font-size:clamp(38px,6vw,72px);letter-spacing:-3px;line-height:1.08;margin:22px 0}h2{font-size:32px;letter-spacing:-1px}p{line-height:1.8;opacity:.72;max-width:540px}.art{min-height:360px;border-radius:32px;background:radial-gradient(circle at 30% 25%,color-mix(in srgb,var(--primary) 60%,white),transparent 55%),linear-gradient(130deg,var(--primary),#17172c);position:relative;overflow:hidden;display:grid;place-items:center}.art:before,.art:after{content:'';position:absolute;width:220px;height:220px;border:1px solid #ffffff50;border-radius:40px;transform:rotate(25deg)}.art:after{transform:rotate(55deg);width:170px;height:170px}.art span{color:white;font-size:96px;font-weight:800;z-index:1}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin:72px 0}.card{border:1px solid color-mix(in srgb,var(--fg) 13%,transparent);padding:28px;border-radius:20px}.card small{color:var(--primary)}.cta{border-radius:24px;padding:40px;background:color-mix(in srgb,var(--primary) 9%,var(--bg));display:flex;align-items:center;justify-content:space-between;gap:20px}footer{padding:28px 24px;text-align:center;font-size:13px;border-top:1px solid color-mix(in srgb,var(--fg) 12%,transparent);opacity:.6}form{max-width:580px;display:grid;gap:16px;margin:40px 0}label{display:grid;gap:8px;font-size:14px}input,textarea{width:100%;border:1px solid color-mix(in srgb,var(--fg) 20%,transparent);padding:14px;border-radius:10px;color:var(--fg);background:var(--bg)}:focus-visible{outline:3px solid var(--primary);outline-offset:3px}@media(max-width:720px){header{flex-wrap:wrap}.menu{display:block;padding:8px 12px}nav{display:none;width:100%;padding-top:24px;flex-wrap:wrap}nav.open{display:flex}main{padding-top:40px}.hero{grid-template-columns:1fr;gap:36px}.art{min-height:250px}.grid{grid-template-columns:1fr;margin:40px 0}.cta{flex-direction:column;align-items:flex-start}h1{letter-spacing:-1.5px}}`;
  const section = (name: string) =>
    `<section class="hero"><div><span class="eyebrow">${escape(name)} · ${escape(plan.title)}</span><h1>${name === "Home" ? "Good ideas deserve a beautiful home." : escape(name)}</h1><p>${escape(name === "Home" ? plan.title + ". Thoughtfully designed, easy to explore, and built around what matters to you." : `Discover ${name.toLowerCase()} at ${plan.title}. Explore our approach and find your next step.`)}</p><a class="button" href="${plan.pages.some((p) => p.name === "Contact") ? "contact.html" : "#highlights"}">Let’s get started ↗</a></div><div class="art" aria-hidden="true"><span>${escape(plan.title.charAt(0).toUpperCase())}</span></div></section><section class="grid" id="highlights">${["Thoughtful by design", "Made for every screen", "Simple from the start"].map((t, i) => `<article class="card"><small>0${i + 1}</small><h3>${t}</h3><p>A clear, considered experience that puts your goals at the center.</p></article>`).join("")}</section>${name === "Contact" ? '<form><h2>Let’s talk</h2><label>Your name<input name="name" required autocomplete="name"></label><label>Email address<input name="email" type="email" required autocomplete="email"></label><label>Message<textarea name="message" rows="4" required></textarea></label><button type="submit">Send demo message</button><p role="status" id="form-status"></p></form>' : '<section class="cta"><div><h2>Your next chapter starts here.</h2><p>Explore the possibilities. Make something that matters.</p></div><a class="button" href="#highlights">Explore more →</a></section>'}`;
  if (stack === "react") {
    const pageContent = plan.pages.map((p) => ({
      name: p.name,
      path: p.path,
      html: section(p.name).replace(/href="contact.html"/g, 'href="#/contact"'),
    }));
    const app = `import React, {useState, useEffect} from 'react';\nimport './styles.css';\nconst pages=${JSON.stringify(pageContent)};\nexport default function App(){const [path,setPath]=useState(window.location.hash.slice(1)||'/');const [open,setOpen]=useState(false);const [sent,setSent]=useState(false);useEffect(()=>{const change=()=>{setPath(window.location.hash.slice(1)||'/');setOpen(false);setSent(false)};window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[]);const page=pages.find(p=>p.path===path)||pages[0];return <><header><a className="brand" href="#/">${escape(plan.title)}</a><button className="menu" onClick={()=>setOpen(!open)} aria-expanded={open}>Menu</button><nav className={open?'open':''}>{pages.map(p=><a key={p.path} href={'#'+p.path}>{p.name}</a>)}</nav></header><main onSubmit={e=>{e.preventDefault();setSent(true)}}><div dangerouslySetInnerHTML={{__html:page.html}}/>{sent&&<p role="status">Thanks! This is a demo form; no message was sent.</p>}</main><footer>${escape(plan.title)} · Made with care</footer></>}`;
    return [
      { path: "styles.css", content: css, language: "css" },
      { path: "App.js", content: app, language: "jsx" },
      {
        path: "index.js",
        content: `import React from 'react';\nimport {createRoot} from 'react-dom/client';\nimport App from './App';\ncreateRoot(document.getElementById('root')).render(<App/>);`,
        language: "jsx",
      },
    ];
  }
  return [
    { path: "styles.css", content: css, language: "css" },
    ...plan.pages.map((p) => ({
      path: p.path === "/" ? "index.html" : `${p.path.slice(1)}.html`,
      language: "html",
      content: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(p.name)} · ${escape(plan.title)}</title><link rel="stylesheet" href="styles.css"><script defer src="script.js"></script></head><body><header><a class="brand" href="index.html">${escape(plan.title)}</a><button class="menu" aria-expanded="false" aria-label="Toggle navigation">Menu</button><nav>${plan.pages.map((page) => `<a href="${page.path === "/" ? "index.html" : page.path.slice(1) + ".html"}">${page.name}</a>`).join("")}</nav></header><main>${section(p.name)}</main><footer>${escape(plan.title)} · Made with care</footer></body></html>`,
    })),
    {
      path: "script.js",
      language: "javascript",
      content: `document.querySelector('.menu')?.addEventListener('click',function(){const open=document.querySelector('nav').classList.toggle('open');this.setAttribute('aria-expanded',String(open));});document.querySelector('form')?.addEventListener('submit',function(e){e.preventDefault();document.querySelector('#form-status').textContent='Thanks! This is a demo form; no message was sent.';this.reset();});`,
    },
  ];
}
