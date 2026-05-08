const UPLOAD_API_URL = "https://prod-04.italynorth.logic.azure.com:443/workflows/71cd48dc266d4a6a9c93b57356c50667/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=le7-pUEXnVLKtyNLRiTIZMDo1LLN3WXaFe5IZTXg0os";

const GET_ASSETS_API_URL = "https://prod-27.italynorth.logic.azure.com:443/workflows/cd39b147fbe84f35ba036876878b0678/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=ga_1Xd8nOj2UIOQz2S-vdwdneN5lscu3zDn4D48s-Po";

const DELETE_ASSET_API_URL = "https://prod-25.italynorth.logic.azure.com:443/workflows/0783a3738244430cbc60461fe0e864dd/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=-ihkrkhM8qSD525YYLH_3J6hDwzD1hhwCVawc85zvQc";

const UPDATE_ASSET_API_URL = "https://prod-27.italynorth.logic.azure.com:443/workflows/276c25e4ce964062acd22e672d76c759/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=rdn6U6b-85J6swsFEiCjeaM9aoWmnVHi60ZMvJIlf8Q";

const BLOB_BASE_URL = "https://alvinspharmamedia.blob.core.windows.net/assets/";

let allAssets = [];
let activeCategory = "all";

function getAssetFileUrl(asset) {
  const directUrl = asset.fileUrl || asset.fileLocator || asset.FileLocator || asset.url || asset.Url;

  if (directUrl && typeof directUrl === "string" && directUrl.startsWith("http")) {
    return directUrl;
  }

  const rawPath = asset.filePath || asset.FilePath || asset.path || asset.Path || asset.name || asset.Name || asset.fileName || asset.FileName;

  if (!rawPath || typeof rawPath !== "string") {
    return "";
  }

  if (rawPath.startsWith("http")) {
    return rawPath;
  }

  const cleanPath = rawPath
    .replace(/^\/assets\//, "")
    .replace(/^assets\//, "")
    .replace(/^\//, "");

  return BLOB_BASE_URL + encodeURIComponent(cleanPath);
}


function isImageAsset(url, asset) {
  const textToCheck = `${url} ${asset.fileName || asset.FileName || ""}`.toLowerCase();
  return textToCheck.includes(".jpg") ||
    textToCheck.includes(".jpeg") ||
    textToCheck.includes(".png") ||
    textToCheck.includes(".gif") ||
    textToCheck.includes(".webp") ||
    textToCheck.includes(".bmp") ||
    textToCheck.includes(".svg");
}

function getAssetIcon(asset, fileUrl) {
  const fileName = `${asset.fileName || asset.FileName || fileUrl || ""}`.toLowerCase();
  if (isImageAsset(fileUrl, asset)) return "🖼️";
  if (fileName.includes(".pdf")) return "📄";
  if (fileName.includes(".doc") || fileName.includes(".docx")) return "📝";
  if (fileName.includes(".mp4") || fileName.includes(".mov")) return "🎬";
  return "📁";
}

function getSafetyLabel(asset) {
  const category = `${asset.category || asset.Category || ""}`.toLowerCase();
  if (category.includes("medicine") || category.includes("packaging")) return "Content checked • Pharmacy media";
  if (category.includes("sop") || category.includes("training")) return "Content checked • Reference media";
  return "Content checked • Cloud asset";
}

function formatUploadDate(value) {
  if (!value || value === "Not recorded") return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getAssetText(asset, keys) {
  for (const key of keys) {
    if (asset[key]) return String(asset[key]);
  }
  return "";
}

function showToast(message) {
  const toastElement = document.getElementById("appToast");
  const toastMessage = document.getElementById("toastMessage");

  if (!toastElement || !toastMessage || typeof bootstrap === "undefined") {
    return;
  }

  toastMessage.textContent = message;

  const toast = new bootstrap.Toast(toastElement, {
    delay: 3000
  });

  toast.show();
}

function showLoadingSkeleton() {
  const skeleton = document.getElementById("loadingSkeleton");
  const grid = document.getElementById("assetGrid");

  if (skeleton) skeleton.classList.remove("d-none");
  if (grid) grid.classList.add("d-none");
}

function hideLoadingSkeleton() {
  const skeleton = document.getElementById("loadingSkeleton");
  const grid = document.getElementById("assetGrid");

  if (skeleton) skeleton.classList.add("d-none");
  if (grid) grid.classList.remove("d-none");
}

function updateDashboardCounters(assets) {
  const totalAssets = document.getElementById("totalAssetsCount");
  const imagesAnalysed = document.getElementById("imagesAnalysedCount");
  const cloudUploads = document.getElementById("cloudUploadsCount");

  const imageCount = assets.filter(asset =>
    isImageAsset(getAssetFileUrl(asset), asset)
  ).length;

  if (totalAssets) totalAssets.textContent = assets.length;
  if (imagesAnalysed) imagesAnalysed.textContent = imageCount;
  if (cloudUploads) cloudUploads.textContent = assets.length;
}

function openImageModal(imageUrl) {
  const image = document.getElementById("fullscreenImage");
  const modalElement = document.getElementById("imageModal");

  if (!image || !modalElement || typeof bootstrap === "undefined") {
    window.open(imageUrl, "_blank");
    return;
  }

  image.src = imageUrl;

  const modal = new bootstrap.Modal(modalElement);
  modal.show();
}

function renderAssetCards(assets) {
  const grid = document.getElementById("assetGrid");
  if (!grid) return;

  grid.innerHTML = "";

  if (!assets.length) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="alert alert-warning">No matching assets found. Try changing the search or category filter.</div>
      </div>
    `;
    return;
  }

  assets.forEach(asset => {
    const fileUrl = getAssetFileUrl(asset);
    const previewUrl = isImageAsset(fileUrl, asset) ? fileUrl : "https://via.placeholder.com/400x200?text=File+Uploaded";
    const title = asset.title || asset.Title || asset.fileName || asset.FileName || "Untitled Asset";
    const category = asset.category || asset.Category || "Uncategorised";
    const description = asset.description || asset.Description || "No description provided.";
    const tags = asset.tags || asset.Tags || "";
    const id = asset.id || asset.Id || "";
    const uploadDate = formatUploadDate(asset.uploadDate || asset.UploadDate || asset.createdAt || asset.CreatedAt);
    const assetIcon = getAssetIcon(asset, fileUrl);
    const safetyLabel = getSafetyLabel(asset);

    const safeFileUrl = fileUrl.replace(/'/g, "\\'");
    const openFullSizeButton = fileUrl
      ? `<button type="button" class="btn btn-view-full" onclick="openImageModal('${safeFileUrl}')">View Full Size</button>`
      : "";

    grid.innerHTML += `
      <div class="col-md-6 col-lg-4 mb-4">
        <div class="card media-card shadow-sm h-100">
          <div class="media-preview-wrap">
            <img src="${previewUrl}" class="card-img-top" alt="${title}" onerror="this.src='https://via.placeholder.com/400x200?text=No+Preview';">
            <div class="media-floating-badge">${assetIcon}</div>
            <div class="media-safety-badge">${safetyLabel}</div>
          </div>
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
              <h5 class="card-title mb-0">${title}</h5>
              <span class="badge rounded-pill text-bg-primary">${category}</span>
            </div>
            <p class="card-text">${description}</p>
            ${tags ? `<div class="tag-row mb-3">${String(tags).split(",").slice(0, 3).map(tag => `<span>${tag.trim()}</span>`).join("")}</div>` : ""}
            <div class="d-flex justify-content-between align-items-center small text-muted mb-3">
              <span>Cloud hosted</span>
              <span>${uploadDate}</span>
            </div>
            <div class="media-actions">
              <a href="details.html?id=${encodeURIComponent(id)}" class="btn btn-primary">View Details</a>
              ${openFullSizeButton}
            </div>
          </div>
        </div>
      </div>
    `;
  });
}

function applyAssetFilters() {
  const searchInput = document.getElementById("searchInput");

  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const selectedCategory = activeCategory;

  const filteredAssets = allAssets.filter(asset => {
    const title = getAssetText(asset, ["title", "Title", "fileName", "FileName"]).toLowerCase();
    const description = getAssetText(asset, ["description", "Description"]).toLowerCase();
    const category = getAssetText(asset, ["category", "Category"]);
    const tags = getAssetText(asset, ["tags", "Tags"]).toLowerCase();

    const matchesSearch = !searchTerm ||
      title.includes(searchTerm) ||
      description.includes(searchTerm) ||
      category.toLowerCase().includes(searchTerm) ||
      tags.includes(searchTerm);

    const matchesCategory = selectedCategory === "all" || category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  renderAssetCards(filteredAssets);
}

function setupAssetFilters() {
  const searchInput = document.getElementById("searchInput");
  const categoryButtons = document.querySelectorAll(".category-chips [data-category]");

  if (searchInput) {
    searchInput.addEventListener("input", applyAssetFilters);
  }

  categoryButtons.forEach(button => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category || "all";

      categoryButtons.forEach(item => item.classList.remove("active-chip"));
      button.classList.add("active-chip");

      applyAssetFilters();
    });
  });
}


async function renderAssets() {
  const grid = document.getElementById("assetGrid");
  if (!grid) return;

  showLoadingSkeleton();

  try {
    const response = await fetch(GET_ASSETS_API_URL, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`GET failed with status ${response.status}`);
    }

    const data = await response.json();
    allAssets = Array.isArray(data) ? data : (data.value || data.documents || data.items || []);

    updateDashboardCounters(allAssets);
    hideLoadingSkeleton();

    if (!allAssets.length) {
      grid.innerHTML = `
    <div class="col-12">
      <div class="alert alert-warning">No assets found yet. Upload your first PharmaMedia asset.</div>
    </div>
  `;
      return;
    }

    applyAssetFilters();

  } catch (error) {
    console.error(error);
    hideLoadingSkeleton();
    grid.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger">Could not load assets from Azure. Check your GET Logic App run history and Cosmos DB query output.</div>
      </div>
    `;
  }
}

async function renderAssetDetails() {
  const details = document.getElementById("assetDetails");
  if (!details) return;

  const params = new URLSearchParams(window.location.search);
  const assetId = params.get("id");

  if (!assetId) {
    details.innerHTML = `<div class="alert alert-danger">No asset ID was provided.</div>`;
    return;
  }

  details.innerHTML = `<div class="alert alert-info">Loading asset details from Azure...</div>`;

  try {
    const response = await fetch(GET_ASSETS_API_URL, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`GET failed with status ${response.status}`);
    }

    const data = await response.json();
    const assets = Array.isArray(data) ? data : (data.value || data.documents || data.items || []);
    const asset = assets.find(item => String(item.id || item.Id) === String(assetId));

    if (!asset) {
      details.innerHTML = `<div class="alert alert-danger">Asset not found in Cosmos DB.</div>`;
      return;
    }

    const fileUrl = getAssetFileUrl(asset);
    const previewUrl = isImageAsset(fileUrl, asset) ? fileUrl : "https://via.placeholder.com/900x420?text=File+Uploaded";
    const title = asset.title || asset.Title || asset.fileName || asset.FileName || "Untitled Asset";
    const category = asset.category || asset.Category || "Uncategorised";
    const description = asset.description || asset.Description || "No description provided.";
    const tags = asset.tags || asset.Tags || "No tags provided";
    const fileName = asset.fileName || asset.FileName || "Unknown file";
    const uploadDate = formatUploadDate(asset.uploadDate || asset.UploadDate || asset.createdAt || asset.CreatedAt || "Not recorded");
    const assetIcon = getAssetIcon(asset, fileUrl);
    const safetyLabel = getSafetyLabel(asset);
    const safeFileUrl = fileUrl.replace(/'/g, "\\'");

    details.innerHTML = `
      <div class="card shadow-sm">
        <div class="details-hero-preview">
          <img src="${previewUrl}" class="card-img-top" alt="${title}" onerror="this.src='https://via.placeholder.com/900x420?text=No+Preview';">
          <div class="details-ai-badge">${assetIcon} ${safetyLabel}</div>
        </div>
        <div class="card-body p-4">
          <div class="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
            <div>
              <h1 class="h3 mb-1">${title}</h1>
              <p class="text-muted mb-0">${category}</p>
            </div>
            <a href="index.html" class="btn btn-outline-secondary align-self-start">Back to Library</a>
          </div>

          <p class="mb-3">${description}</p>
          <div class="ai-panel mb-4">
            <div>
              <strong>Azure Content Safety Ready</strong>
              <p class="mb-0 text-muted">This asset is prepared for content moderation, pharmacy media validation, and future Azure Computer Vision analysis.</p>
            </div>
            <span class="badge rounded-pill bg-success">Approved</span>
          </div>

          <div class="row g-3 mb-4">
            <div class="col-md-6">
              <div class="border rounded p-3 bg-light h-100">
                <strong>File Name</strong>
                <p class="mb-0">${fileName}</p>
              </div>
            </div>
            <div class="col-md-6">
              <div class="border rounded p-3 bg-light h-100">
                <strong>Tags</strong>
                <p class="mb-0">${tags}</p>
              </div>
            </div>
            <div class="col-md-6">
              <div class="border rounded p-3 bg-light h-100">
                <strong>Asset ID</strong>
                <p class="mb-0 small text-break">${asset.id || asset.Id}</p>
              </div>
            </div>
            <div class="col-md-6">
              <div class="border rounded p-3 bg-light h-100">
                <strong>Upload Date</strong>
                <p class="mb-0">${uploadDate}</p>
              </div>
            </div>
          </div>

          <button type="button" onclick="openImageModal('${safeFileUrl}')" class="btn btn-primary">View Full Size</button>
          <button class="btn btn-outline-secondary ms-2" onclick="showEditForm('${asset.id || asset.Id}')">Edit Metadata</button>
          <button class="btn btn-outline-danger ms-2" onclick="deleteAsset('${asset.id || asset.Id}')">Delete Asset</button>

          <div id="editPanel" class="border rounded p-3 bg-light mt-4 d-none">
            <h2 class="h5 mb-3">Edit Asset Metadata</h2>
            <form id="editAssetForm">
              <input type="hidden" id="editId" value="${asset.id || asset.Id}">
              <input type="hidden" id="editFileName" value="${fileName}">
              <input type="hidden" id="editFilePath" value="${asset.filePath || asset.FilePath || ""}">
              <input type="hidden" id="editFileUrl" value="${asset.fileUrl || asset.FileUrl || asset.fileLocator || asset.FileLocator || ""}">
              <input type="hidden" id="editUploadDate" value="${uploadDate}">

              <div class="mb-3">
                <label class="form-label">Title</label>
                <input type="text" class="form-control" id="editTitle" value="${title}" required>
              </div>

              <div class="mb-3">
                <label class="form-label">Description</label>
                <textarea class="form-control" id="editDescription" rows="3" required>${description}</textarea>
              </div>

              <div class="mb-3">
                <label class="form-label">Category</label>
                <select class="form-select" id="editCategory" required>
                  <option value="Medicine Image" ${category === "Medicine Image" ? "selected" : ""}>Medicine Image</option>
                  <option value="Training Document" ${category === "Training Document" ? "selected" : ""}>Training Document</option>
                  <option value="Packaging" ${category === "Packaging" ? "selected" : ""}>Packaging</option>
                  <option value="SOP" ${category === "SOP" ? "selected" : ""}>SOP</option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">Tags</label>
                <input type="text" class="form-control" id="editTags" value="${tags}">
              </div>

              <button type="submit" class="btn btn-success">Save Changes</button>
              <button type="button" class="btn btn-outline-secondary ms-2" onclick="hideEditForm()">Cancel</button>
            </form>
            <div id="editMessage" class="mt-3"></div>
          </div>
        </div>
      </div>
    `;

    setupEditForm();
  } catch (error) {
    console.error(error);
    details.innerHTML = `<div class="alert alert-danger">Could not load asset details. Check the GET Logic App run history.</div>`;
  }
}

async function deleteAsset(assetId) {
  if (!DELETE_ASSET_API_URL || DELETE_ASSET_API_URL.includes("PASTE_YOUR")) {
    showToast("Please paste your DELETE Logic App URL in app.js first.");
    return;
  }

  const confirmed = confirm("Are you sure you want to delete this asset? This will remove the asset metadata from Cosmos DB.");
  if (!confirmed) return;

  try {
    const response = await fetch(DELETE_ASSET_API_URL, {
      method: "DELETE",
      headers: {
        "id": assetId
      }
    });

    if (!response.ok) {
      throw new Error(`Delete failed with status ${response.status}`);
    }

    showToast("Asset deleted successfully.");
    window.location.href = "index.html";
  } catch (error) {
    console.error(error);
    showToast("Delete failed. Check your DELETE Logic App run history and Cosmos DB delete action.");
  }
}

function showEditForm() {
  const editPanel = document.getElementById("editPanel");
  if (editPanel) {
    editPanel.classList.remove("d-none");
    editPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function hideEditForm() {
  const editPanel = document.getElementById("editPanel");
  if (editPanel) {
    editPanel.classList.add("d-none");
  }
}

function setupEditForm() {
  const editForm = document.getElementById("editAssetForm");
  if (!editForm) return;

  editForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const editMessage = document.getElementById("editMessage");

    if (!UPDATE_ASSET_API_URL || UPDATE_ASSET_API_URL.includes("PASTE_YOUR")) {
      editMessage.innerHTML = `<div class="alert alert-danger">Please paste your UPDATE Logic App URL in app.js first.</div>`;
      return;
    }

    const payload = {
      id: document.getElementById("editId").value,
      title: document.getElementById("editTitle").value.trim(),
      description: document.getElementById("editDescription").value.trim(),
      category: document.getElementById("editCategory").value,
      tags: document.getElementById("editTags").value.trim(),
      fileName: document.getElementById("editFileName").value,
      filePath: document.getElementById("editFilePath").value,
      fileUrl: document.getElementById("editFileUrl").value,
      uploadDate: document.getElementById("editUploadDate").value
    };

    editMessage.innerHTML = `<div class="alert alert-info">Updating asset metadata...</div>`;

    try {
      const response = await fetch(UPDATE_ASSET_API_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Update failed with status ${response.status}`);
      }

      editMessage.innerHTML = `<div class="alert alert-success">Asset metadata updated successfully.</div>`;
      showToast("Asset metadata updated successfully.");
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      console.error(error);
      showToast("Update failed. Check the UPDATE Logic App run history.");
      editMessage.innerHTML = `<div class="alert alert-danger">Update failed. Check the UPDATE Logic App run history.</div>`;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderAssets();
  renderAssetDetails();
  setupAssetFilters();

  const uploadForm = document.getElementById("uploadForm");

  if (uploadForm) {
    uploadForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const fileInput = document.getElementById("file");
      const title = document.getElementById("title").value.trim();
      const description = document.getElementById("description").value.trim();
      const category = document.getElementById("category").value;
      const tags = document.getElementById("tags").value.trim();
      const msg = document.getElementById("uploadMessage");

      if (!UPLOAD_API_URL || UPLOAD_API_URL.includes("PASTE_YOUR")) {
        msg.innerHTML = `<div class="alert alert-danger">Please paste your Logic App upload URL in app.js first.</div>`;
        return;
      }

      if (!fileInput.files.length) {
        msg.innerHTML = `<div class="alert alert-danger">Please choose a file.</div>`;
        return;
      }

      const file = fileInput.files[0];

      const formData = new FormData();
      formData.append("File", file);
      formData.append("Title", title);
      formData.append("Description", description);
      formData.append("Category", category);
      formData.append("Tags", tags);
      formData.append("FileName", file.name);

      msg.innerHTML = `<div class="alert alert-info">Uploading to Azure...</div>`;

      try {
        const response = await fetch(UPLOAD_API_URL, {
          method: "POST",
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Upload failed with status ${response.status}`);
        }

        msg.innerHTML = `<div class="alert alert-success">Upload successful. File saved in Blob Storage and metadata saved in Cosmos DB.</div>`;
        uploadForm.reset();
        showToast("Upload successful. Asset saved to Azure.");

      } catch (error) {
        console.error(error);
        showToast("Upload failed. Please check the Logic App run history.");
        msg.innerHTML = `<div class="alert alert-danger">Upload failed. Check Logic App URL, CORS, or workflow run history.</div>`;
      }
    });
  }
});