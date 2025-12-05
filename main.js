// main.js
document.addEventListener("DOMContentLoaded", function () {
  setupCountdown();
  setupIndexEditing();
  setupTravelPage(); // does nothing on pages without travel UI
});

// ---------- Shared admin password ----------
var ADMIN_PASSWORD = "bangalore2025"; // <-- change if you like
var ADMIN_SESSION_KEY = "weddingAdminAuthed";

function isAdminAuthed() {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
  } catch (e) {
    return false;
  }
}

function requireAdmin() {
  if (isAdminAuthed()) return true;
  var input = window.prompt("Enter admin password to enable editing:");
  if (input === null) return false;
  if (input === ADMIN_PASSWORD) {
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
    } catch (e) {}
    alert("Edit mode enabled.");
    return true;
  }
  alert("Incorrect password.");
  return false;
}

// --------------------
// Countdown
// --------------------
function setupCountdown() {
  var el = document.getElementById("countdown");
  if (!el) return;

  var weddingDate = new Date("2025-12-13T00:00:00");
  var now = new Date();
  var diffMs = weddingDate - now;
  var dayMs = 1000 * 60 * 60 * 24;
  var diffDays = Math.ceil(diffMs / dayMs);

  if (diffDays > 0) {
    el.textContent =
      diffDays + (diffDays === 1 ? " DAY TO GO!" : " DAYS TO GO!");
  } else if (diffDays === 0) {
    el.textContent = "TODAY IS THE DAY!";
  } else {
    el.textContent = "THANK YOU FOR CELEBRATING WITH US";
  }
}

// --------------------
// INDEX PAGE EDITING + PHOTO UPLOAD + JSON IMPORT/EXPORT
// --------------------
function setupIndexEditing() {
  var toggle = document.getElementById("siteEditToggle");
  var saveBtn = document.getElementById("siteEditSave");
  var exportBtn = document.getElementById("siteEditExport");
  var importBtn = document.getElementById("siteEditImport");
  var snapshotBtn = document.getElementById("siteEditSnapshot"); // NEW
  var importInput = document.getElementById("siteEditImportInput");
  var statusEl = document.getElementById("siteEditStatus");

  if (
    !toggle ||
    !saveBtn ||
    !exportBtn ||
    !importBtn ||
    !snapshotBtn ||
    !importInput ||
    !statusEl
  ) {
    return; // not on index.html
  }

  var EDIT_KEY = "weddingSiteContent_v1";
  var SITE_PHOTOS_KEY = "weddingSitePhotos_v1";

  var editableNodes = Array.prototype.slice.call(
    document.querySelectorAll("[data-editable-id]")
  );

  // Load stored content
  var stored = {};
  try {
    var raw = localStorage.getItem(EDIT_KEY);
    if (raw) stored = JSON.parse(raw) || {};
  } catch (e) {
    stored = {};
  }

  editableNodes.forEach(function (node) {
    var id = node.getAttribute("data-editable-id");
    if (!id) return;
    if (stored[id]) node.innerHTML = stored[id];
    node.setAttribute("contenteditable", "false");
  });

  // Photos
  var photoGridEl = document.getElementById("photoGrid");
  var photoUploadInput = document.getElementById("photoUploadInput");
  var clearPhotosBtn = document.getElementById("clearPhotosBtn");
  var photoStatusEl = document.getElementById("photoStatus");
  var photoToolbar = document.querySelector(".photo-edit-toolbar");
  var sitePhotos = [];
  var siteEditMode = false;

  if (photoGridEl) {
    try {
      var rawPhotos = localStorage.getItem(SITE_PHOTOS_KEY);
      if (rawPhotos) sitePhotos = JSON.parse(rawPhotos) || [];
    } catch (e) {
      sitePhotos = [];
    }
  }

  function savePhotosToStorage() {
    try {
      localStorage.setItem(SITE_PHOTOS_KEY, JSON.stringify(sitePhotos));
    } catch (e) {
      console.warn("Could not save photos:", e);
    }
  }

  function renderPhotos() {
    if (!photoGridEl) return;
    photoGridEl.innerHTML = "";

    if (!sitePhotos || !sitePhotos.length) {
      // Show placeholders when no photos
      for (var i = 0; i < 4; i++) {
        var slot = document.createElement("div");
        slot.className = "photo-placeholder";
        slot.textContent = "Add Photo";
        photoGridEl.appendChild(slot);
      }
      return;
    }

    sitePhotos.forEach(function (dataUrl, index) {
      var slot = document.createElement("div");
      slot.className = "photo-placeholder";

      var img = document.createElement("img");
      img.src = dataUrl;
      img.alt = "Photo " + (index + 1);
      slot.appendChild(img);

      if (siteEditMode) {
        var delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "btn-small btn-danger photo-delete-btn";
        delBtn.textContent = "Remove";
        delBtn.dataset.index = String(index);
        slot.appendChild(delBtn);
      }

      photoGridEl.appendChild(slot);
    });
  }

  renderPhotos();

  // Photo delete
  if (photoGridEl) {
    photoGridEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".photo-delete-btn");
      if (!btn) return;
      var idx = parseInt(btn.dataset.index, 10);
      if (isNaN(idx)) return;
      if (!requireAdmin()) return;
      sitePhotos.splice(idx, 1);
      savePhotosToStorage();
      renderPhotos();
      if (photoStatusEl) {
        photoStatusEl.textContent = "Photo removed.";
      }
    });
  }

  // Photo upload
  if (photoUploadInput) {
    photoUploadInput.addEventListener("change", function () {
      if (!requireAdmin()) {
        photoUploadInput.value = "";
        return;
      }
      var files = Array.prototype.slice.call(photoUploadInput.files || []);
      if (!files.length) return;

      var addedCount = 0;

      files.forEach(function (file) {
        if (!file.type || !file.type.startsWith("image/")) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
          var dataUrl = ev.target.result;
          sitePhotos.push(dataUrl);
          addedCount++;
          savePhotosToStorage();
          renderPhotos();
          if (photoStatusEl) {
            photoStatusEl.textContent = "Added " + addedCount + " photo(s).";
          }
        };
        reader.readAsDataURL(file);
      });

      photoUploadInput.value = "";
    });
  }

  // Clear all photos
  if (clearPhotosBtn) {
    clearPhotosBtn.addEventListener("click", function () {
      if (!requireAdmin()) return;
      if (!sitePhotos.length) {
        if (photoStatusEl) photoStatusEl.textContent = "No photos to clear.";
        return;
      }
      if (!window.confirm("Remove all photos from the page (on this browser)?")) {
        return;
      }
      sitePhotos = [];
      savePhotosToStorage();
      renderPhotos();
      if (photoStatusEl) photoStatusEl.textContent = "All photos cleared.";
    });
  }

  // Text content helpers
  function gatherContent() {
    var data = {};
    editableNodes.forEach(function (node) {
      var id = node.getAttribute("data-editable-id");
      if (!id) return;
      data[id] = node.innerHTML;
    });
    return data;
  }

  function applyContent(data) {
    editableNodes.forEach(function (node) {
      var id = node.getAttribute("data-editable-id");
      if (!id) return;
      if (Object.prototype.hasOwnProperty.call(data, id)) {
        node.innerHTML = data[id];
      }
    });
  }

  function setEditMode(on) {
    siteEditMode = on;
    editableNodes.forEach(function (node) {
      node.setAttribute("contenteditable", on ? "true" : "false");
      if (on) node.classList.add("editable-active");
      else node.classList.remove("editable-active");
    });
    saveBtn.style.display = on ? "inline-block" : "none";
    if (snapshotBtn) {
      snapshotBtn.style.display = on ? "inline-block" : "none"; // NEW: only in edit mode
    }
    if (photoToolbar) {
      photoToolbar.style.display = on ? "flex" : "none";
    }
    if (!on) statusEl.textContent = "";
    renderPhotos(); // update delete buttons
  }

  setEditMode(false);

  toggle.addEventListener("change", function () {
    if (toggle.checked) {
      if (!requireAdmin()) {
        toggle.checked = false;
        return;
      }
      setEditMode(true);
    } else {
      setEditMode(false);
    }
  });

  // Save to localStorage (text only)
  saveBtn.addEventListener("click", function () {
    var data = gatherContent();
    try {
      localStorage.setItem(EDIT_KEY, JSON.stringify(data));
      statusEl.textContent = "Changes saved (on this browser).";
    } catch (e) {
      statusEl.textContent = "Could not save changes (localStorage error).";
    }
  });

  // Export JSON (text + photos)
  exportBtn.addEventListener("click", function () {
    var content = gatherContent();
    var state = {
      version: 2,
      content: content,
      photos: sitePhotos || []
    };
    var jsonStr = JSON.stringify(state, null, 2);
    var blob = new Blob([jsonStr], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "wedding-site-content.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    statusEl.textContent = "Exported site content JSON.";
  });

  // Import JSON (supports old and new formats)
  importBtn.addEventListener("click", function () {
    if (!requireAdmin()) return;
    importInput.click();
  });

  importInput.addEventListener("change", function () {
    var file = importInput.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function (event) {
      try {
        var data = JSON.parse(event.target.result);
        var contentObj;
        var photosArr = [];

        if (data && typeof data === "object" && !Array.isArray(data)) {
          if (data.content || data.photos) {
            // New format { version, content, photos }
            contentObj = data.content || {};
            if (Array.isArray(data.photos)) {
              photosArr = data.photos;
            }
          } else {
            // Old format: simple mapping id -> html
            contentObj = data;
          }
        } else {
          throw new Error("JSON must be an object.");
        }

        contentObj = contentObj || {};
        applyContent(contentObj);
        localStorage.setItem(EDIT_KEY, JSON.stringify(contentObj));

        if (photosArr.length) {
          sitePhotos = photosArr;
          savePhotosToStorage();
        }
        renderPhotos();

        statusEl.textContent = "Imported site content JSON.";
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Import failed: " + err.message;
        alert("Could not import site JSON: " + err.message);
      } finally {
        importInput.value = "";
      }
    };
    reader.readAsText(file);
  });

  // NEW: Download updated HTML + full state snapshot
  snapshotBtn.addEventListener("click", function () {
    // extra safety: already in edit mode, but keep admin requirement
    if (!requireAdmin()) return;

    // 1) Snapshot of THIS PAGE'S HTML as you see it now
    var fullHtml = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
    var htmlBlob = new Blob([fullHtml], { type: "text/html" });
    var htmlUrl = URL.createObjectURL(htmlBlob);
    var aHtml = document.createElement("a");
    aHtml.href = htmlUrl;
    aHtml.download = "index.updated.html";
    document.body.appendChild(aHtml);
    aHtml.click();
    document.body.removeChild(aHtml);
    URL.revokeObjectURL(htmlUrl);

    // 2) Also snapshot the full site state (for travel.html etc.)
    var content = gatherContent();
    var rooms = [];
    try {
      var rawRooms = localStorage.getItem("weddingRoomAssignments_v2");
      if (rawRooms) rooms = JSON.parse(rawRooms) || [];
    } catch (e) {
      rooms = [];
    }

    var siteState = {
      note: "Snapshot of homepage content, photos, and room assignments from this browser.",
      homepageContent: content,
      homepagePhotos: sitePhotos || [],
      roomAssignments: rooms
    };

    var stateBlob = new Blob([JSON.stringify(siteState, null, 2)], {
      type: "application/json"
    });
    var stateUrl = URL.createObjectURL(stateBlob);
    var aState = document.createElement("a");
    aState.href = stateUrl;
    aState.download = "wedding-site-state.json";
    document.body.appendChild(aState);
    aState.click();
    document.body.removeChild(aState);
    URL.revokeObjectURL(stateUrl);

    statusEl.textContent =
      "Downloaded index.updated.html and wedding-site-state.json. You can use these to update your base files.";
  });
}

// --------------------
// TRAVEL PAGE LOGIC
// --------------------
function setupTravelPage() {
  var root = document.getElementById("travel-page");
  if (!root) return; // not on travel.html

  var STORAGE_KEY = "weddingRoomAssignments_v2";

  // Custom order for property cards (your updated list)
  var PROPERTY_ORDER = [
    "Stage room in Chatra",
    "[AP1] Sai Satkar Convention center: Apartment 1",
    "[AP2] Sai Satkar Convention center: Apartment 2",
    "[AP3] Sai Satkar Convention center: Apartment 3",
    "Park Inn & Suites by Radisson (Yelahanka)",
    "Puruda Heritage Stay",
    "Clarion Hotel",
    "Raj kamal stay inn",
    "Ramanashree California Resort"
  ];

  var roomAssignments = [];
  var selectedPropertyKey = null;
  var editingRoomId = null;
  var editMode = false;

  // Highlight state when coming from search
  var highlightedRoomId = null;
  var highlightedGuestName = "";
  var highlightFromSearch = false;

  // DOM references
  var propertyGridEl = document.getElementById("propertyGrid");
  var roomListEl = document.getElementById("roomList");
  var guestSearchInput = document.getElementById("guestSearchInput");
  var guestSearchResultsEl = document.getElementById("guestSearchResults");
  var editToggleEl = document.getElementById("editModeToggle");

  var exportBtn = document.getElementById("exportJsonBtn");
  var importBtn = document.getElementById("importJsonBtn");
  var importInput = document.getElementById("importJsonInput");

  var selectedPropertyNameEl = document.getElementById("selectedPropertyName");
  var selectedGuestSummaryEl = document.getElementById("selectedGuestSummary");
  var selectedPropertyAddressEl = document.getElementById("selectedPropertyAddress");
  var selectedPropertyDirectionsEl = document.getElementById("selectedPropertyDirections");
  var focusPropertyImageEl = document.getElementById("focusPropertyImage");

  var roomForm = document.getElementById("roomForm");
  var formPropertyName = document.getElementById("formPropertyName");
  var formPropertyAddress = document.getElementById("formPropertyAddress");
  var formPropertyDirections = document.getElementById("formPropertyDirections");
  var formPropertyImage = document.getElementById("formPropertyImage");

  var formPrimaryGuest = document.getElementById("formPrimaryGuest");
  var formRoomNumber = document.getElementById("formRoomNumber");
  var formRoomNotes = document.getElementById("formRoomNotes");
  var formGuestList = document.getElementById("formGuestList");

  var formErrorEl = document.getElementById("formError");
  var cancelEditBtn = document.getElementById("cancelEdit");
  var saveRoomBtn = document.getElementById("saveRoom");

  // --------- Utilities ----------
  function generateId() {
    return "r_" + Math.random().toString(36).slice(2) + "_" + Date.now().toString(36);
  }

  function makePropertyKey(name, address) {
    return (name || "").trim() + "|" + (address || "").trim();
  }

  function propertyKeyFromRoom(room) {
    return makePropertyKey(room.propertyName, room.propertyAddress);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (ch) {
      switch (ch) {
        case "&": return "&amp;";
        case "<": return "&lt;";
        case ">": return "&gt;";
        case '"': return "&quot;";
        case "'": return "&#39;";
        default: return ch;
      }
    });
  }

  function highlightTerm(text, term) {
    text = String(text || "");
    term = (term || "").trim();
    if (!term) return escapeHtml(text);
    var lower = text.toLowerCase();
    var lowerTerm = term.toLowerCase();
    var index = lower.indexOf(lowerTerm);
    if (index === -1) return escapeHtml(text);
    var before = escapeHtml(text.slice(0, index));
    var match = escapeHtml(text.slice(index, index + term.length));
    var after = escapeHtml(text.slice(index + term.length));
    return before + '<mark class="guest-highlight">' + match + "</mark>" + after;
  }

  function highlightGuestNameInText(text, guestName) {
    text = String(text || "");
    guestName = (guestName || "").trim();
    if (!guestName) return escapeHtml(text);
    var lower = text.toLowerCase();
    var lowerName = guestName.toLowerCase();
    var index = lower.indexOf(lowerName);
    if (index === -1) return escapeHtml(text);
    var before = escapeHtml(text.slice(0, index));
    var match = escapeHtml(text.slice(index, index + guestName.length));
    var after = escapeHtml(text.slice(index + guestName.length));
    return before + '<mark class="guest-highlight">' + match + "</mark>" + after;
  }

  // --------- Data helpers ----------
  function loadFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        roomAssignments = getExampleAssignments();
        saveToStorage();
        return;
      }
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        roomAssignments = parsed;
      } else {
        roomAssignments = getExampleAssignments();
        saveToStorage();
      }
    } catch (e) {
      console.warn("Could not read room assignments:", e);
      roomAssignments = getExampleAssignments();
      saveToStorage();
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(roomAssignments));
    } catch (e) {
      console.warn("Could not save room assignments:", e);
    }
  }

  function getExampleAssignments() {
    return [
      {
        id: generateId(),
        propertyName: "Park Inn & Suites by Radisson (Yelahanka)",
        propertyAddress: "Park Inn & Suites by Radisson, Yelahanka, Bengaluru",
        propertyDirections: "Approx. 20–30 minutes to the main venue depending on traffic.",
        propertyImage: "",
        primaryGuest: "Example Couple",
        roomNumber: "101",
        roomNotes: "Sample room; replace with your imported JSON.",
        guests: ["Example Couple"]
      }
    ];
  }

function getProperties() {
  var map = {};

  roomAssignments.forEach(function (room) {
    var key = propertyKeyFromRoom(room);
    if (!key) return;

    if (!map[key]) {
      // Create a new property entry
      map[key] = {
        key: key,
        name: room.propertyName || "Property",
        address: room.propertyAddress || "",
        directions: room.propertyDirections || "",
        image: room.propertyImage || ""
      };
    } else {
      // Fill in any missing info from additional rooms at same property
      if (!map[key].address && room.propertyAddress) {
        map[key].address = room.propertyAddress;
      }
      if (!map[key].directions && room.propertyDirections) {
        map[key].directions = room.propertyDirections;
      }
      if (!map[key].image && room.propertyImage) {
        map[key].image = room.propertyImage;
      }
    }
  });

  return Object.values(map);
}



  function getRoomsForProperty(propertyKey) {
    return roomAssignments.filter(function (room) {
      return propertyKeyFromRoom(room) === propertyKey;
    });
  }

  // --------- Rendering ----------
  function ensureSelectedProperty() {
    if (selectedPropertyKey) {
      var props = getProperties();
      if (props.some(function (p) { return p.key === selectedPropertyKey; })) return;
    }
    var propsAll = getProperties();
    selectedPropertyKey = propsAll.length ? propsAll[0].key : null;
  }

  function getSelectedProperty() {
    var props = getProperties();
    for (var i = 0; i < props.length; i++) {
      if (props[i].key === selectedPropertyKey) return props[i];
    }
    return null;
  }

  function renderProperties() {
    propertyGridEl.innerHTML = "";
    var props = getProperties();

    props.sort(function (a, b) {
      var ia = PROPERTY_ORDER.indexOf(a.name);
      var ib = PROPERTY_ORDER.indexOf(b.name);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    if (props.length === 0) {
      var empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent =
        "No properties yet. Turn on edit mode and add the first room.";
      propertyGridEl.appendChild(empty);
      return;
    }

    props.forEach(function (prop) {
      var card = document.createElement("div");
      card.className = "property-card";
      if (prop.key === selectedPropertyKey) {
        card.classList.add("active");
        if (highlightFromSearch) {
          card.classList.add("property-card-focus");
        }
      }
      card.dataset.propertyKey = prop.key;

      var imgDiv = document.createElement("div");
      imgDiv.className = "property-card-image";
      if (prop.image) imgDiv.style.backgroundImage = 'url("' + prop.image + '")';
      else imgDiv.classList.add("placeholder");

      var content = document.createElement("div");
      content.className = "property-card-content";

      var nameEl = document.createElement("div");
      nameEl.className = "property-card-name";
      nameEl.textContent = prop.name;

      var addrEl = document.createElement("div");
      addrEl.className = "property-card-address";
      addrEl.textContent = prop.address;

      content.appendChild(nameEl);
      content.appendChild(addrEl);

      card.appendChild(imgDiv);
      card.appendChild(content);
      propertyGridEl.appendChild(card);
    });
  }

function renderSelectedPropertyHeader() {
  var prop = getSelectedProperty();
  if (!prop) {
    selectedPropertyNameEl.textContent = "Select a property to get started";
    if (selectedGuestSummaryEl) selectedGuestSummaryEl.textContent = "";
    selectedPropertyAddressEl.textContent = "";
    selectedPropertyDirectionsEl.textContent = "";
    if (focusPropertyImageEl) {
      focusPropertyImageEl.style.backgroundImage = "";
      focusPropertyImageEl.classList.add("placeholder");
    }
    return;
  }

  // Default: just show the property name
  selectedPropertyNameEl.textContent = prop.name;

  // If we’re in “search highlight” mode, show who this result is for
  if (selectedGuestSummaryEl) {
    if (highlightFromSearch && highlightedRoomId) {
      var room = roomAssignments.find(function (r) {
        return r.id === highlightedRoomId;
      });

      if (room) {
        var guestLabel = (highlightedGuestName || "").trim();
        if (!guestLabel && room.primaryGuest) {
          guestLabel = room.primaryGuest;
        }
        var roomLabel = room.roomNumber
          ? "Room / Apt " + room.roomNumber
          : "Room assignment";

        if (guestLabel) {
          selectedGuestSummaryEl.textContent = guestLabel + " — " + roomLabel;
        } else {
          selectedGuestSummaryEl.textContent = roomLabel;
        }
      } else {
        selectedGuestSummaryEl.textContent = "";
      }
    } else {
      // No active search highlight
      selectedGuestSummaryEl.textContent = "";
    }
  }

  // Address + directions always correspond to the currently selected property
  selectedPropertyAddressEl.textContent = prop.address || "";
  selectedPropertyDirectionsEl.textContent = prop.directions || "";

  // Property photo
  if (focusPropertyImageEl) {
    if (prop.image) {
      focusPropertyImageEl.style.backgroundImage = 'url("' + prop.image + '")';
      focusPropertyImageEl.classList.remove("placeholder");
    } else {
      focusPropertyImageEl.style.backgroundImage = "";
      focusPropertyImageEl.classList.add("placeholder");
    }
  }
}

  function renderRooms() {
    roomListEl.innerHTML = "";

    var prop = getSelectedProperty();
    if (!prop) {
      var none = document.createElement("div");
      none.className = "empty-state";
      none.textContent = "There are no rooms yet. Turn on edit mode to add one.";
      roomListEl.appendChild(none);
      return;
    }

    var rooms = getRoomsForProperty(prop.key);
    if (rooms.length === 0) {
      var empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No rooms added for this property yet.";
      roomListEl.appendChild(empty);
      return;
    }

    rooms.forEach(function (room) {
      var card = document.createElement("div");
      card.className = "room-card";
      card.dataset.roomId = room.id;

      if (highlightFromSearch && room.id === highlightedRoomId) {
        card.classList.add("room-card-focus");
      }

      var left = document.createElement("div");
      var right = document.createElement("div");

      var heading = document.createElement("div");
      heading.className = "room-heading";
      if (highlightFromSearch && room.id === highlightedRoomId && room.primaryGuest) {
        heading.innerHTML = highlightGuestNameInText(room.primaryGuest, highlightedGuestName);
      } else {
        heading.textContent = room.primaryGuest || "Room";
      }

      var meta = document.createElement("div");
      meta.className = "room-meta";
      var spanRoom = document.createElement("span");
      spanRoom.textContent = "Room / Apt: " + (room.roomNumber || "–");
      meta.appendChild(spanRoom);

      left.appendChild(heading);
      left.appendChild(meta);

      var notesLabel = document.createElement("div");
      notesLabel.className = "room-section-label";
      notesLabel.textContent = "Room notes";
      left.appendChild(notesLabel);

      var notes = document.createElement("div");
      notes.className = "room-notes";
      notes.textContent = room.roomNotes || "No specific notes yet.";
      left.appendChild(notes);

      if (editMode) {
        var actions = document.createElement("div");
        actions.className = "room-actions";

        var editBtn = document.createElement("button");
        editBtn.className = "btn-small";
        editBtn.textContent = "Edit";
        editBtn.dataset.action = "edit-room";
        editBtn.dataset.roomId = room.id;

        var delBtn = document.createElement("button");
        delBtn.className = "btn-small btn-danger";
        delBtn.textContent = "Delete";
        delBtn.dataset.action = "delete-room";
        delBtn.dataset.roomId = room.id;

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        left.appendChild(actions);
      }

      var guestsLabel = document.createElement("div");
      guestsLabel.className = "room-section-label";
      guestsLabel.textContent = "Guests in this room";
      right.appendChild(guestsLabel);

      var guestsEl = document.createElement("div");
      guestsEl.className = "room-guests";
      if (room.guests && room.guests.length) {
        var ul = document.createElement("ul");
        ul.className = "basic-list";
        room.guests.forEach(function (g) {
          var li = document.createElement("li");
          if (highlightFromSearch && room.id === highlightedRoomId) {
            li.innerHTML = highlightGuestNameInText(g, highlightedGuestName);
          } else {
            li.textContent = g;
          }
          ul.appendChild(li);
        });
        guestsEl.appendChild(ul);
      } else {
        guestsEl.textContent = "Guest list coming soon.";
      }
      right.appendChild(guestsEl);

      card.appendChild(left);
      card.appendChild(right);
      roomListEl.appendChild(card);
    });
  }

  function updateFormVisibility() {
    roomForm.style.display = editMode ? "block" : "none";
  }

  function renderAll() {
    renderProperties();
    ensureSelectedProperty();
    renderSelectedPropertyHeader();
    renderRooms();
    updateGuestSearchResults();
    updateFormVisibility();
  }

  // --------- Guest search ----------
function updateGuestSearchResults() {
  // Reset highlight state; we’ll set it again if we find matches
  highlightedRoomId = null;
  highlightedGuestName = "";
  highlightFromSearch = false;

  var term = (guestSearchInput.value || "").trim().toLowerCase();
  guestSearchResultsEl.innerHTML = "";

  // No term: clear search UI and revert header/rooms to normal view
  if (term.length === 0) {
    renderSelectedPropertyHeader();
    renderRooms();

    var hint = document.createElement("div");
    hint.className = "section-muted small-spaced";
    hint.textContent = "Start typing to search for a guest.";
    guestSearchResultsEl.appendChild(hint);
    return;
  }

  // Too short: ask for at least two letters and clear highlight
  if (term.length < 2) {
    renderSelectedPropertyHeader();
    renderRooms();

    var short = document.createElement("div");
    short.className = "section-muted small-spaced";
    short.textContent = "Type at least two letters.";
    guestSearchResultsEl.appendChild(short);
    return;
  }

  var results = [];

  // Search ONLY guests in the room, not primary resident name
  roomAssignments.forEach(function (room) {
    var key = propertyKeyFromRoom(room);
    var propName = room.propertyName || "Property";

    if (Array.isArray(room.guests)) {
      room.guests.forEach(function (g) {
        if (g && g.toLowerCase().indexOf(term) !== -1) {
          results.push({
            roomId: room.id,
            propertyKey: key,
            guestName: g,
            propertyName: propName,
            roomNumber: room.roomNumber || ""
          });
        }
      });
    }
  });

  if (!results.length) {
  var none = document.createElement("div");
  none.className = "section-muted small-spaced";
  none.textContent = "No matching guests found.";
  guestSearchResultsEl.appendChild(none);

  // No matches = no search highlight
  highlightedRoomId = null;
  highlightedGuestName = "";
  highlightFromSearch = false;
  renderSelectedPropertyHeader();
  renderRooms();
  return;
}

// --- TOP RESULT drives the header + photo + room list ---
var top = results[0];
applyGuestSearchSelection(top.roomId, top.guestName, top.propertyKey);

// Now render the visible list of matches
results.forEach(function (res) {
  var item = document.createElement("div");
  item.className = "guest-result-item";
  item.dataset.roomId = res.roomId;
  item.dataset.guestName = res.guestName;
  item.dataset.propertyKey = res.propertyKey;

  var main = document.createElement("div");
  main.className = "guest-result-main";
  main.innerHTML = highlightTerm(res.guestName, term);

  var sub = document.createElement("div");
  sub.className = "guest-result-sub";
  var summary = res.propertyName + " • Room " + (res.roomNumber || "–");
  sub.textContent = summary;

  item.appendChild(main);
  item.appendChild(sub);

  guestSearchResultsEl.appendChild(item);
});
}


  function focusAllRoomsForSelectedProperty() {
    var cards = roomListEl.querySelectorAll(".room-card");
    if (!cards.length) return;
    var first = cards[0];
    try {
      first.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {}

    cards.forEach(function (c) {
      c.classList.add("room-card-focus");
    });
    setTimeout(function () {
      cards.forEach(function (c) {
        c.classList.remove("room-card-focus");
      });
    }, 1300);

    var activeProp = propertyGridEl.querySelector(".property-card.active");
    if (activeProp) {
      activeProp.classList.add("property-card-focus");
      setTimeout(function () {
        activeProp.classList.remove("property-card-focus");
      }, 1300);
    }
  }

function applyGuestSearchSelection(roomId, guestName, propertyKey) {
  highlightedRoomId = roomId;
  highlightedGuestName = guestName || "";
  highlightFromSearch = true;
  selectedPropertyKey = propertyKey;

  // Re-render everything to reflect this selection:
  // - active property card
  // - property photo
  // - address + directions / travel notes
  // - room list highlighting
  renderProperties();
  renderSelectedPropertyHeader();
  renderRooms();

  // Scroll the selected room into view
  focusCurrentPropertyAndRoom(roomId);
}


  function focusCurrentPropertyAndRoom(roomId) {
    var roomCard = roomListEl.querySelector('.room-card[data-room-id="' + roomId + '"]');
    if (roomCard) {
      try {
        roomCard.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (e) {}
    }
    var activeProp = propertyGridEl.querySelector(".property-card.active");
    if (activeProp) {
      activeProp.classList.add("property-card-focus");
      setTimeout(function () {
        activeProp.classList.remove("property-card-focus");
      }, 1400);
    }
  }

  // --------- Form helpers ----------
  function resetForm() {
    roomForm.reset();
    editingRoomId = null;
    saveRoomBtn.textContent = "Add Room";
    cancelEditBtn.style.display = "none";
    formErrorEl.style.display = "none";

    var prop = getSelectedProperty();
    if (prop) {
      formPropertyName.value = prop.name || "";
      formPropertyAddress.value = prop.address || "";
      formPropertyDirections.value = prop.directions || "";
      formPropertyImage.value = prop.image || "";
    }
  }

  function showFormError(msg) {
    formErrorEl.textContent = msg;
    formErrorEl.style.display = "block";
  }

  // --------- Event listeners ----------
  propertyGridEl.addEventListener("click", function (e) {
    var card = e.target.closest(".property-card");
    if (!card) return;
    var key = card.dataset.propertyKey;
    if (!key) return;
    selectedPropertyKey = key;
    // Switching properties clears search highlight
    highlightedRoomId = null;
    highlightedGuestName = "";
    highlightFromSearch = false;
    resetForm();
    renderAll();
    focusAllRoomsForSelectedProperty();
  });

  roomListEl.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    var action = btn.dataset.action;
    var roomId = btn.dataset.roomId;
    if (!action || !roomId) return;

    if (action === "delete-room") {
      if (!confirm("Remove this room assignment?")) return;
      roomAssignments = roomAssignments.filter(function (r) {
        return r.id !== roomId;
      });
      saveToStorage();
      if (editingRoomId === roomId) {
        editingRoomId = null;
        resetForm();
      }
      renderAll();
    } else if (action === "edit-room") {
      var room = roomAssignments.find(function (r) { return r.id === roomId; });
      if (!room) return;
      editingRoomId = roomId;

      formPropertyName.value = room.propertyName || "";
      formPropertyAddress.value = room.propertyAddress || "";
      formPropertyDirections.value = room.propertyDirections || "";
      formPropertyImage.value = room.propertyImage || "";

      formPrimaryGuest.value = room.primaryGuest || "";
      formRoomNumber.value = room.roomNumber || "";
      formRoomNotes.value = room.roomNotes || "";
      formGuestList.value = (room.guests || []).join(", ");

      saveRoomBtn.textContent = "Save Changes";
      cancelEditBtn.style.display = "inline-block";
      formErrorEl.style.display = "none";

      root.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  guestSearchInput.addEventListener("input", function () {
    updateGuestSearchResults();
  });

guestSearchResultsEl.addEventListener("click", function (e) {
  var item = e.target.closest(".guest-result-item");
  if (!item) return;

  var roomId = item.dataset.roomId;
  var guestName = item.dataset.guestName || "";
  var propertyKey = item.dataset.propertyKey;

  // If for some reason the dataset didn’t have propertyKey,
  // fall back to looking it up from the room object.
  if (!propertyKey) {
    var room = roomAssignments.find(function (r) { return r.id === roomId; });
    if (!room) return;
    propertyKey = propertyKeyFromRoom(room);
  }

  // Now make THIS clicked result the authoritative selection:
  applyGuestSearchSelection(roomId, guestName, propertyKey);
});


  // edit mode (password protected)
  editToggleEl.addEventListener("change", function () {
    if (editToggleEl.checked) {
      if (!requireAdmin()) {
        editToggleEl.checked = false;
        return;
      }
      editMode = true;
    } else {
      editMode = false;
      editingRoomId = null;
      resetForm();
    }
    renderAll();
  });

  // export rooms JSON
  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      var dataStr = JSON.stringify(roomAssignments, null, 2);
      var blob = new Blob([dataStr], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "wedding-room-assignments.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // import rooms JSON (password protected)
  if (importBtn && importInput) {
    importBtn.addEventListener("click", function () {
      if (!requireAdmin()) return;
      importInput.click();
    });

    importInput.addEventListener("change", function () {
      var file = importInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (event) {
        try {
          var data = JSON.parse(event.target.result);
          if (!Array.isArray(data)) {
            throw new Error("JSON root must be an array of room objects.");
          }
          roomAssignments = data;
          saveToStorage();
          selectedPropertyKey = null;
          editingRoomId = null;
          highlightedRoomId = null;
          highlightedGuestName = "";
          highlightFromSearch = false;
          resetForm();
          renderAll();
          alert("Room data imported successfully.");
        } catch (err) {
          console.error(err);
          alert("Could not import data: " + err.message);
        } finally {
          importInput.value = "";
        }
      };
      reader.readAsText(file);
    });
  }

  roomForm.addEventListener("submit", function (e) {
    e.preventDefault();
    formErrorEl.style.display = "none";

    var propertyName = formPropertyName.value.trim();
    var propertyAddress = formPropertyAddress.value.trim();
    var propertyDirections = formPropertyDirections.value.trim();
    var propertyImage = formPropertyImage.value.trim();

    var primaryGuest = formPrimaryGuest.value.trim();
    var roomNumber = formRoomNumber.value.trim();
    var roomNotes = formRoomNotes.value.trim();
    var guestListRaw = formGuestList.value.trim();

    if (!propertyName || !propertyAddress || !primaryGuest || !roomNumber) {
      showFormError(
        "Please fill in at least property name, property address, primary guest, and room/apartment number."
      );
      return;
    }

    var guests = [];
    if (guestListRaw) {
      guests = guestListRaw
        .split(",")
        .map(function (g) { return g.trim(); })
        .filter(function (g) { return g.length > 0; });
    }

    var data = {
      id: editingRoomId || generateId(),
      propertyName: propertyName,
      propertyAddress: propertyAddress,
      propertyDirections: propertyDirections,
      propertyImage: propertyImage,
      primaryGuest: primaryGuest,
      roomNumber: roomNumber,
      roomNotes: roomNotes,
      guests: guests
    };

    if (editingRoomId) {
      var idx = roomAssignments.findIndex(function (r) { return r.id === editingRoomId; });
      if (idx !== -1) roomAssignments[idx] = data;
    } else {
      roomAssignments.push(data);
    }

    saveToStorage();
    selectedPropertyKey = propertyKeyFromRoom(data);
    editingRoomId = null;
    highlightedRoomId = null;
    highlightedGuestName = "";
    highlightFromSearch = false;
    resetForm();
    renderAll();
  });

  cancelEditBtn.addEventListener("click", function () {
    editingRoomId = null;
    resetForm();
  });

  // --------- Init ----------
  loadFromStorage();
  renderAll();
}
