(function() {
  // 1. Identify the current subject page code based on location paths
  let subjectCode = "";
  const path = window.location.pathname.toLowerCase();
  
  if (path.includes("/itc/")) subjectCode = "ITC";
  else if (path.includes("/cd/")) subjectCode = "CD";
  else if (path.includes("/os/")) subjectCode = "OS";
  else if (path.includes("/cg/")) subjectCode = "CG";
  else if (path.includes("/aoa/")) subjectCode = "AOA";
  else if (path.includes("/aj%20lab/") || path.includes("/aj lab/")) subjectCode = "AJLAB";

  if (!subjectCode) return;

  // 2. Locate insertion target (usually after the first resource section)
  const sections = document.querySelectorAll(".sl-section");
  if (sections.length === 0) return;

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
  let apiBase = "";
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    apiBase = "http://localhost:4000/api";
  } else {
    apiBase = "/api";
  }

  // 5. Fetch approved materials for this subject
  fetch(`${apiBase}/materials/approved/${subjectCode}`)
    .then(res => res.json())
    .then(data => {
      if (!data || data.length === 0) return;

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
    .catch(err => console.error("Error loading community materials:", err));

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
      // In-depth DOMPurify sanitization at render time (Requirement 5)
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
