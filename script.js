const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector("#nav");

menuButton.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  });
});

document.querySelector("#year").textContent = new Date().getFullYear();


// GitHub profile statistics and language distribution
(async function loadGitHubDashboard() {
  const username = "DveejKotiya";
  const api = "https://api.github.com";
  const numberFormat = new Intl.NumberFormat("en-IN");
  const statIds = ["stat-repos", "stat-stars", "stat-followers", "stat-forks"];

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function showChartMessage(message) {
    const chart = document.getElementById("language-chart");
    if (chart) chart.textContent = message;
  }

  async function fetchJson(url) {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(url, {
          headers: { Accept: "application/vnd.github+json" }
        });
        if (!response.ok) {
          let detail = "";
          try {
            const body = await response.json();
            detail = body.message || "";
          } catch (_) {}
          const error = new Error(detail || `GitHub API error (${response.status})`);
          error.status = response.status;
          // Rate limits and permission errors will not be fixed by retrying.
          if (response.status === 403 || response.status === 404) throw error;
          lastError = error;
        } else {
          return await response.json();
        }
      } catch (error) {
        if (error.status === 403 || error.status === 404) throw error;
        lastError = error;
      }
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 700));
    }
    throw lastError || new Error("Unable to reach GitHub");
  }

  function errorMessage(error) {
    if (error && error.status === 403) {
      return "GitHub is temporarily rate-limiting this visitor. Please try again shortly.";
    }
    return "Some GitHub statistics could not be loaded. Please refresh in a moment.";
  }

  // Load the profile and repositories independently. A failure in one request
  // should never erase statistics successfully returned by the other.
  const [profileResult, reposResult] = await Promise.allSettled([
    fetchJson(`${api}/users/${username}`),
    fetchJson(`${api}/users/${username}/repos?per_page=100&type=owner&sort=updated`)
  ]);

  if (profileResult.status === "fulfilled") {
    const profile = profileResult.value;
    setText("stat-repos", numberFormat.format(profile.public_repos ?? 0));
    setText("stat-followers", numberFormat.format(profile.followers ?? 0));
  } else {
    setText("stat-repos", "—");
    setText("stat-followers", "—");
  }

  if (reposResult.status === "fulfilled") {
    const ownedRepos = reposResult.value.filter(repo => !repo.fork);
    const stars = ownedRepos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
    const forks = ownedRepos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);
    setText("stat-stars", numberFormat.format(stars));
    setText("stat-forks", numberFormat.format(forks));

    const totals = {};
    for (let i = 0; i < ownedRepos.length; i += 6) {
      const batch = ownedRepos.slice(i, i + 6);
      const results = await Promise.allSettled(batch.map(repo => fetchJson(repo.languages_url)));
      results.forEach(result => {
        if (result.status === "fulfilled") {
          Object.entries(result.value).forEach(([language, bytes]) => {
            totals[language] = (totals[language] || 0) + bytes;
          });
        }
      });
    }
    renderLanguageChart(totals);
  } else {
    setText("stat-stars", "—");
    setText("stat-forks", "—");
    showChartMessage(errorMessage(reposResult.reason));
  }

  if (profileResult.status === "rejected" && reposResult.status === "rejected") {
    showChartMessage(errorMessage(profileResult.reason));
  }

  function renderLanguageChart(languageTotals) {
    const chart = document.getElementById("language-chart");
    if (!chart) return;

    const entries = Object.entries(languageTotals)
      .filter(([, bytes]) => bytes > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7);

    if (!entries.length) {
      showChartMessage("No language breakdown is available for the public repositories yet.");
      return;
    }

    const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
    const palette = ["#ef4444", "#38bdf8", "#a78bfa", "#f59e0b", "#34d399", "#f472b6", "#94a3b8"];
    const rows = entries.map(([name, bytes], index) => {
      const percentage = (bytes / total) * 100;
      const width = Math.max(percentage, 1.5);
      return `
        <div class="language-row">
          <div class="language-label"><span class="language-dot" style="background:${palette[index]}"></span><span>${escapeHtml(name)}</span><strong>${percentage.toFixed(1)}%</strong></div>
          <div class="language-track"><span style="width:${width}%;background:${palette[index]}"></span></div>
        </div>`;
    }).join("");

    chart.innerHTML = `<div class="language-list">${rows}</div>`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }
})();

// Portfolio motion system: reveal elements as they enter the viewport.
(function initPortfolioMotion() {
  const revealItems = document.querySelectorAll(
    ".section-heading, .about-main, .mini-panel, .project-card, .skills-panel, .stat-metric, .language-panel, .github-cta"
  );

  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });

    revealItems.forEach(item => revealObserver.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add("is-visible"));
  }

  // A restrained pointer tilt on desktop; no movement on touch or reduced-motion devices.
  const canTilt = window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (canTilt) {
    document.querySelectorAll(".project-card").forEach(card => {
      card.addEventListener("pointermove", event => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const rotateY = (x - 0.5) * 5;
        const rotateX = (0.5 - y) * 5;
        card.style.transform = `translateY(-5px) perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }
})();


// Hero typing effect: cycles through the roles and interests in this portfolio.
(function initHeroTyping(){
  const target=document.getElementById("typed-role");
  if(!target)return;
  const phrases=["an AI & ML student","a Python developer","a curious problem solver","building intelligent projects"];
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){target.textContent=phrases[0];return;}
  let phraseIndex=0,characterIndex=phrases[0].length,deleting=true;
  target.textContent=phrases[0];
  function typeLoop(){
    const phrase=phrases[phraseIndex];
    if(deleting){
      characterIndex--;
      target.textContent=phrase.slice(0,Math.max(0,characterIndex));
      if(characterIndex<=0){deleting=false;phraseIndex=(phraseIndex+1)%phrases.length;window.setTimeout(typeLoop,350);return;}
      window.setTimeout(typeLoop,42);return;
    }
    const nextPhrase=phrases[phraseIndex];
    characterIndex++;
    target.textContent=nextPhrase.slice(0,characterIndex);
    if(characterIndex>=nextPhrase.length){deleting=true;window.setTimeout(typeLoop,1500);return;}
    window.setTimeout(typeLoop,78);
  }
  window.setTimeout(typeLoop,1400);
})();

// Lightweight canvas particle network, tuned for the red-neon theme.
(function initRedParticleField(){
  const canvas=document.getElementById("particle-canvas");
  if(!canvas)return;
  const context=canvas.getContext("2d");
  if(!context)return;
  const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pointer={x:-1000,y:-1000};
  let particles=[],width=0,height=0,frameId=0,lastFrame=0;
  function resize(){
    const dpr=Math.min(window.devicePixelRatio||1,1.5);
    width=window.innerWidth;height=window.innerHeight;
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    context.setTransform(dpr,0,0,dpr,0,0);
    const count=Math.min(95,Math.max(32,Math.round(width*height/14500)));
    particles=Array.from({length:count},()=>({x:Math.random()*width,y:Math.random()*height,vx:(Math.random()-.5)*.34,vy:(Math.random()-.5)*.34,radius:Math.random()*1.5+.65,alpha:Math.random()*.42+.2}));
    draw();
  }
  function draw(timestamp=0){
    if(!reducedMotion&&timestamp&&timestamp-lastFrame<30){frameId=requestAnimationFrame(draw);return;}
    lastFrame=timestamp;context.clearRect(0,0,width,height);
    particles.forEach((particle,index)=>{
      if(!reducedMotion){
        particle.x+=particle.vx;particle.y+=particle.vy;
        if(particle.x< -8||particle.x>width+8)particle.vx*=-1;
        if(particle.y< -8||particle.y>height+8)particle.vy*=-1;
      }
      const dxPointer=particle.x-pointer.x,dyPointer=particle.y-pointer.y,pointerDistance=Math.hypot(dxPointer,dyPointer);
      if(!reducedMotion&&pointerDistance<115&&pointerDistance>0){particle.x+=(dxPointer/pointerDistance)*.45;particle.y+=(dyPointer/pointerDistance)*.45;}
      context.beginPath();context.arc(particle.x,particle.y,particle.radius,0,Math.PI*2);
      context.fillStyle=`rgba(248,70,80,${particle.alpha})`;context.shadowBlur=10;context.shadowColor="rgba(239,68,68,.55)";context.fill();context.shadowBlur=0;
      for(let next=index+1;next<particles.length;next++){
        const other=particles[next],dx=particle.x-other.x,dy=particle.y-other.y,distance=Math.hypot(dx,dy);
        if(distance<105){context.beginPath();context.moveTo(particle.x,particle.y);context.lineTo(other.x,other.y);context.strokeStyle=`rgba(239,68,68,${(1-distance/105)*.14})`;context.lineWidth=.7;context.stroke();}
      }
    });
    if(!reducedMotion)frameId=requestAnimationFrame(draw);
  }
  window.addEventListener("pointermove",event=>{pointer.x=event.clientX;pointer.y=event.clientY;},{passive:true});
  window.addEventListener("pointerleave",()=>{pointer.x=-1000;pointer.y=-1000;});
  window.addEventListener("resize",resize,{passive:true});
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden&&frameId){cancelAnimationFrame(frameId);frameId=0;}
    else if(!document.hidden&&!reducedMotion&&!frameId)frameId=requestAnimationFrame(draw);
  });
  resize();
  if(!reducedMotion)frameId=requestAnimationFrame(draw);
})();
