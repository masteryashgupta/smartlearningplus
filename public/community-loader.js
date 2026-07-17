(function() {
  console.log("=== Smart Learning+ Community Loader Initialized ===");
  
  // Inject Disclaimer/Warning Banner at the top of .sl-shell
  const shell = document.querySelector(".sl-shell");
  if (shell) {
    const disclaimer = document.createElement("div");
    disclaimer.style.background = "#fffbeb";
    disclaimer.style.border = "1.5px solid #fef3c7";
    disclaimer.style.borderRadius = "14px";
    disclaimer.style.padding = "14px 20px";
    disclaimer.style.marginBottom = "20px";
    disclaimer.style.marginTop = "10px";
    disclaimer.style.fontSize = "13px";
    disclaimer.style.color = "#78350f";
    disclaimer.style.lineHeight = "1.6";
    disclaimer.style.display = "flex";
    disclaimer.style.alignItems = "flex-start";
    disclaimer.style.gap = "12px";
    disclaimer.innerHTML = `
      <span style="font-size: 18px; flex-shrink: 0; line-height: 1;">⚠️</span>
      <span><strong>Educational Disclaimer:</strong> All the content on this site is for educational purposes and free to use. It is not affiliated with, authorized, or officially claimed by any institution. This site is built solely for academic help and as a project, not for any income or official sources.</span>
    `;
    shell.insertBefore(disclaimer, shell.firstChild);
  }

  // 1. Identify the current subject page code based on location paths (decoded and normalized)
  const decodedPath = decodeURIComponent(window.location.pathname).toLowerCase();
  console.log("Normalized Path:", decodedPath);

  let subjectCode = "";
  if (decodedPath.includes("/itc/")) subjectCode = "ITC";
  else if (decodedPath.includes("/cd lab/") || decodedPath.includes("/cd-lab/")) subjectCode = "CDLAB";
  else if (decodedPath.includes("/cd/")) subjectCode = "CD";
  else if (decodedPath.includes("/os/")) subjectCode = "OS";
  else if (decodedPath.includes("/cg/")) subjectCode = "CGM";
  else if (decodedPath.includes("/aoa lab/") || decodedPath.includes("/aoa-lab/")) subjectCode = "AOALAB";
  else if (decodedPath.includes("/aoa/")) subjectCode = "AOA";
  else if (decodedPath.includes("/cgm lab/") || decodedPath.includes("/cgm-lab/")) subjectCode = "CGMLAB";
  else if (decodedPath.includes("/cgm/")) subjectCode = "CGM";
  // Support both "AJ lab" and "AJlab"
  else if (decodedPath.includes("/aj lab/") || decodedPath.includes("/aj-lab/") || decodedPath.includes("/ajlab/")) subjectCode = "AJLAB";
  else if (decodedPath.includes("/hci/")) subjectCode = "HCI";

  console.log("Detected Subject Code:", subjectCode);

  if (!subjectCode) {
    console.warn("Could not determine subject code for path:", decodedPath);
    return;
  }

  // 2. Locate insertion target (usually after the first resource section)
  const sections = document.querySelectorAll(".sl-section");
  if (sections.length === 0) {
    console.error("Target container '.sl-section' not found on this page.");
    return;
  }
  console.log("Found page sections:", sections.length);

  // 3. Create the community contributions UI layout
  const communitySection = document.createElement("section");
  communitySection.className = "sl-section";
  communitySection.id = "community-materials-section";
  communitySection.style.display = "none";
  communitySection.style.paddingBottom = "30px";
  communitySection.innerHTML = `
    <div class="sl-eyebrow-sm">Community Contributions</div>
    <h2 class="sl-section-title">Shared by Students</h2>
    <div class="sl-res-grid" id="community-materials-grid"></div>
  `;

  // Insert community contributions card section right after the static resources grid
  sections[0].parentNode.insertBefore(communitySection, sections[0].nextSibling);

  // 4. Determine API Base dynamic endpoint
  let apiBase = localStorage.getItem("api_url") || "/api";
  if (apiBase === "/api") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      apiBase = "http://localhost:4000/api";
    } else {
      apiBase = "https://api.smartlearningplus.me/api";
    }
  }
  console.log("Resolved API URL:", apiBase);

  // 5. Fetch approved materials for this subject
  const fetchUrl = `${apiBase}/materials/approved/${subjectCode}`;
  console.log("Fetching materials from:", fetchUrl);

  fetch(fetchUrl)
    .then(res => {
      console.log("Received Response status:", res.status);
      if (!res.ok) throw new Error("HTTP Status " + res.status);
      return res.json();
    })
    .then(data => {
      console.log("Successfully fetched materials count:", data ? data.length : 0);
      if (!data || data.length === 0) {
        console.log("No approved materials returned from backend for subject:", subjectCode);
        return;
      }

      const grid = document.getElementById("community-materials-grid");
      data.forEach(item => {
        const card = document.createElement("div");
        card.className = "sl-res-card sl-in";
        card.style.opacity = "1";
        card.style.transform = "none";
        
        let icon = "📄";
        if (item.content_type === "pdf") icon = "📄";
        else if (item.content_type === "image") icon = "🖼️";
        else if (item.content_type === "text") icon = "✍️";
        else if (item.content_type === "html") icon = "🌐";

        let href = "#";
        let downloadAttr = "";
        let clickHandler = "";

        if (item.file_url) {
          href = item.file_url;
          downloadAttr = `download="${item.title}"`;
        } else {
          clickHandler = `onclick="window.showCommunityMaterialModal('${item.id}'); return false;"`;
        }

        card.innerHTML = `
          <a href="${href}" ${downloadAttr} target="_blank" ${clickHandler} style="display:flex; align-items:center; gap:16px; width:100%; text-decoration:none; color:inherit;">
            <div class="sl-res-icon" style="background: var(--mc-light); color: var(--mc);">${icon}</div>
            <div style="flex-1: min-width: 0; text-align: left;">
              <div class="sl-res-title" style="font-weight:800; color:var(--text);">${item.title}</div>
              <div class="sl-res-desc" style="font-size:11.5px; color:var(--muted); margin-top:2px;">
                ${item.section} &middot; Contributed by ${item.uploader_name || "Anonymous"}
              </div>
            </div>
            <span class="sl-res-status" style="margin-left:auto; font-size:10px; font-weight:700; background: var(--mc-light); color: var(--mc); padding:4px 8px; border-radius:12px;">
              ${item.content_type.toUpperCase()}
            </span>
          </a>
        `;
        grid.appendChild(card);
      });

      window.communityMaterialsList = data;
      document.getElementById("community-materials-section").style.display = "block";
    })
    .catch(err => {
      console.error("Error loading community materials via Fetch:", err);
    });

  // 6. Modal logic to display text/HTML entries securely
  window.showCommunityMaterialModal = function(id) {
    const item = window.communityMaterialsList.find(m => m.id === id);
    if (!item) return;

    let modal = document.getElementById("community-material-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "community-material-modal";
      modal.style = `
        position: fixed; inset: 0; z-index: 99999; background: rgba(10,10,20,0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; padding: 20px;
      `;
      document.body.appendChild(modal);
    }

    let innerContent = "";
    if (item.content_type === "text") {
      innerContent = `
        <div style="padding: 20px; color: var(--text); font-size: 13.5px; line-height: 1.6; max-height: 450px; overflow-y: auto; text-align: left;">
          ${renderMarkdownToHtml(item.text_content)}
        </div>
      `;
    } else if (item.content_type === "html") {
      const cleanHtml = window.DOMPurify ? window.DOMPurify.sanitize(item.text_content) : item.text_content;
      innerContent = `
        <iframe
          sandbox="allow-same-origin"
          srcdoc="<!DOCTYPE html><html><head><style>body { font-family: system-ui; margin: 12px; color: #1e293b; line-height: 1.6; font-size: 13.5px; } pre { background: #f8fafc; padding: 10px; border-radius: 6px; border:1px solid #e2e8f0; }</style></head><body>${cleanHtml.replace(/"/g, '&quot;')}</body></html>"
          style="width: 100%; height: 450px; border: 0; background: #fff;"
        />
      `;
    }

    modal.innerHTML = `
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 20px; max-width: 680px; width: 100%; overflow: hidden; box-shadow: var(--shadow-lg); display: flex; flex-direction: column;">
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: var(--surface2); text-align: left;">
          <div>
            <div style="font-weight: 800; font-size: 15.5px; color: var(--text);">${item.title}</div>
            <div style="font-size: 11px; color: var(--muted); margin-top: 1px;">
              Category: ${item.section} &middot; Contributed by ${item.uploader_name}
            </div>
          </div>
          <button onclick="document.getElementById('community-material-modal').style.display='none'" style="background: none; border: none; font-size: 18px; color: var(--muted); cursor: pointer; padding: 4px;">✕</button>
        </div>
        ${innerContent}
        <div style="padding: 12px 20px; border-top: 1px solid var(--border); text-align: right; background: var(--surface2);">
          <button onclick="document.getElementById('community-material-modal').style.display='none'" style="background: var(--mc); color: #fff; border: none; font-weight: 700; font-size: 12px; padding: 8px 16px; border-radius: 999px; cursor: pointer;">Close Preview</button>
        </div>
      </div>
    `;
    modal.style.display = "flex";
  };

  // Light regex-based markdown parser
  function renderMarkdownToHtml(text) {
    if (!text) return "";
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");
    
    html = html.replace(/\*\*(.*?)\*\//g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    
    html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    
    html = html.split("\n\n").map(p => {
      if (p.startsWith("<h") || p.startsWith("<pre")) return p;
      return `<p>${p.replace(/\n/g, "<br>")}</p>`;
    }).join("");
    
    return html;
  }
})();
