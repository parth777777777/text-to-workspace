let workspaces = []
let currentWorkspaceId = null
/* ---------------------------------------------------------------------------- */

//helpers

function getCurrentWorkspace(){
    return workspaces.find( w => w.id === currentWorkspaceId) || null
}

function setCurrentWorkspace(workspaceId){
    currentWorkspaceId = workspaceId
    renderApp()
}

function getWorkspaceCount(){
    let count =[0,0]
    workspaces.filter(w => !w.archived).forEach(w => {
        count[0] += 1;
    });
    count[1] = workspaces.length - count[0]
    return count;
}

function inferWorkspaceTitle(markdown) {
    const firstLine = markdown.split("\n").find(l => l.trim())
    if (!firstLine) return "Untitled Workspace"
    return firstLine.replace(/^[-*\s]+|[-*\s]+$/g, "").slice(0,40)
}

function getTodoCount(workspace){
    let count = 0
    (workspace.groups || []).forEach(g => { count += (g.todos||[]).length })
    return count
}

function clearWorkspaceView() {
    document.getElementById("ws-title").textContent = ""
    document.getElementById("todo-main").innerHTML = ""
}


/* ---------------------------------------------------------------------------- */
function setRawLoading(isLoading) {
  const btn = document.getElementById("load-raw-btn");
  const textarea = document.getElementById("raw-input");

  if (isLoading) {
    rawRequestInFlight = true;
    btn.disabled = true;
    btn.textContent = "Generating…";
    textarea.disabled = true;
  } else {
    rawRequestInFlight = false;
    btn.disabled = !aiAvailable;
    btn.textContent = "Create Workspace";
    textarea.disabled = false;
  }
}

/* ---------------------------------------------------------------------------- */


// workspace storage 

function saveWorkspaces(){
    localStorage.setItem("workspaces",JSON.stringify(workspaces))
}

function loadWorkspaces(){
    const saved = localStorage.getItem("workspaces")
    if (!saved) return []
    
    try {
        const parsed = JSON.parse(saved);
        // Ensure it's an array of valid workspace objects
        return Array.isArray(parsed) ? parsed : [];
    } catch(err) {
        console.error("Failed to parse saved workspaces:", err);
        return [];
    }
}
/* ---------------------------------------------------------------------------- */


//  progress bar 
const ProgressBarElement = document.getElementById("progress-bar-container")

function progressPercentage(groups){
    let totalCount = 0 ;
    let completedCount = 0;
    groups.forEach(group => {
        group.todos.forEach(todo => {
            totalCount++
            if(todo.done) completedCount++;
        });
    });
    if (totalCount === 0) {
        return 0;
    }
    const progressPercentage = (completedCount/totalCount)*100;
    return progressPercentage
}

function updateProgressBar(groups){
    const progress = progressPercentage(groups)
    ProgressBarElement.style.setProperty("--progress", `${progress}%`)
        ProgressBarElement.setAttribute(
        "data-label",
        `Progress : ${Math.round(progress)}%`
        )
}
/* ---------------------------------------------------------------------------- */
// render app

function renderApp(){
    const hasActive = workspaces.some(w => !w.archived);

    const empty = document.getElementById("canvas-empty");
    const wsView = document.getElementById("ws-view");
    
    empty.hidden = hasActive
    wsView.hidden = !hasActive

    if(!hasActive) {
        clearWorkspaceView()
        return
    }
    updateProgressBar([])
    renderWorkspaceList()
    renderCurrentWorkspace()
}
/* ---------------------------------------------------------------------------- */

// Workspace handling

const wsTitle = document.getElementById("ws-title");
const wsDropdown = document.getElementById("ws-dropdown");
const wsDropdownMenu = document.getElementById("ws-dropdown-content");


function createWorkspaceFromMarkdown(markdown){
    const groups = parseMarkdown(markdown)
    const workspace = {
        id : crypto.randomUUID(),
        title : inferWorkspaceTitle(markdown),
        groups : groups,
        archived : false
    }
    workspaces.unshift(workspace)
    currentWorkspaceId = workspace.id
    
    saveWorkspaces()
    renderApp()
}

function renderCurrentWorkspace(){
    const workspace = getCurrentWorkspace();
    if (!workspace) {
      wsTitle.textContent = "No Workspace Selected";
      document.getElementById("todo-main").innerHTML = "";
      return;
    }

    renderGroups(workspace.groups);
    wsTitle.textContent = workspace.title;
}

function renderWorkspaceList(){
    wsDropdownMenu.innerHTML = "";
    header = document.createElement("div");
    header.className = "dropdown-label";
    header.textContent = "Your Workspaces";
    wsDropdownMenu.appendChild(header);
    workspaces
      .filter(w => !w.archived)
      .forEach(w => {
        const item = document.createElement("div");
        item.className = "workspace-item";
        item.textContent = w.title;

        item.addEventListener("click", () => {
            setCurrentWorkspace(w.id);
            wsDropdownMenu.setAttribute("hidden", "");
            wsTitle.dataset.open = "false";
        });

        wsDropdownMenu.appendChild(item);
      });

      wsDropdownMenu.appendChild(document.createElement("hr"))
      const heading = document.createElement("div");
      heading.textContent = "Archived";
      heading.className = "dropdown-label";
      wsDropdownMenu.appendChild(heading);

      workspaces.filter(w => w.archived).forEach(w => {
        const item = document.createElement("div");
        item.className = "workspace-item";
        item.textContent = w.title;
        item.style.opacity = "0.8";

        item.addEventListener("click", () => {
            setCurrentWorkspace(w.id);
            wsDropdownMenu.setAttribute("hidden", "");
            wsTitle.dataset.open = "false";
        });

        wsDropdownMenu.appendChild(item);
      });
}

wsTitle.addEventListener("click", (e) => {
    e.stopPropagation();

    const isOpening = wsDropdownMenu.hasAttribute("hidden");

    if (isOpening) {
        wsDropdownMenu.removeAttribute("hidden");
        wsTitle.dataset.open = "true";
    } else {
        wsDropdownMenu.setAttribute("hidden", "");
        wsTitle.dataset.open = "false";
    }
});

document.addEventListener("click", () => {
    wsDropdownMenu.setAttribute("hidden", "");
    wsTitle.dataset.open = "false";
});

function renderGroups(groups){
    const container = document.getElementById("todo-main")
    
    container.innerHTML = "";

    groups.forEach(group => {
        const groupTitle = document.createElement("h3")
        groupTitle.textContent = group.title
        groupTitle.className = "group-title"

        //click to collapse and expand contents inside each header 
        groupTitle.addEventListener("click",()=>{
            group.collapsed = !group.collapsed
            renderGroups(groups)
        })

        container.appendChild(groupTitle)

        // todo container
        const groupTodos = document.createElement("div")
        groupTodos.className = "group-todos"
        container.appendChild(groupTodos)

        //hide if collapsed 
        if (group.collapsed){
            groupTodos.style.display = "none"
            groupTitle.classList.add("collapsed");
        }

        //render todos 
        group.todos.forEach(todo => {
            const todoEl = document.createElement("div")
            todoEl.innerHTML = todo.text;
            todoEl.className = "todo-item"

            //apply visual state 
            if (todo.done){
                todoEl.classList.add("done")
            }

            //click to toggle 
            todoEl.addEventListener("click",(e)=>{
                e.stopPropagation()
                todo.done = !todo.done
                saveWorkspaces()
                renderGroups(groups)
            })

            groupTodos.appendChild(todoEl)
        });
    });
    updateProgressBar(groups)
}



/* ---------------------------------------------------------------------------- */
// ARCHIVE FUNCTIONALITY

function archiveCurrentWorkspace(){
    const workspace = getCurrentWorkspace()
    if(workspace){
        workspace.archived = true
        currentWorkspaceId = null
        saveWorkspaces()
        document.getElementById("todo-main").innerHTML = ""
        document.getElementById("ws-title").textContent = "No Workspace Selected"
    }
    renderApp()
}

document.getElementById('archive-workspace')?.addEventListener('click', () => {
    archiveCurrentWorkspace()
})


/* ---------------------------------------------------------------------------- */
// INPUT SECTION EVENT HANDLERS 

// when file input is given , it overrides any pre existing text input 
document.getElementById("file-input").addEventListener("change",()=>{
    document.getElementById("text-input").value = ""
})

//load button 
document.getElementById("load-btn").addEventListener("click",async () =>{
    const markdown = await getMarkdownText()
    
    if(!markdown){
        console.warn("No markdown provided")
        return
    }
    createWorkspaceFromMarkdown(markdown)
    MathJax.typesetPromise()
})

// Load raw file 
document.getElementById("load-raw-btn").addEventListener("click", async () => {
    const btn = document.getElementById("load-raw-btn");
    const textarea = document.getElementById("raw-input");

    const rawInput = textarea.value;
    if (!rawInput.trim()) {
        alert("Please enter some text first.");
        return;
    }

    btn.disabled = true;
    btn.textContent = "Generating…";
    textarea.disabled = true;

    try {
        const response = await fetch("/api/breakdown", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task: rawInput })
        });

        const data = await response.json();

        if (!response.ok) {
            if (data.error === "AI_UNAVAILABLE") {
                btn.textContent = "AI unavailable";
                textarea.placeholder =
                  "AI workspace generation is temporarily unavailable.\nUse Markdown instead.";
                return;
            }

            throw new Error("Server error");
        }

        if (data.text) {
            createWorkspaceFromMarkdown(data.text);
        } else {
            alert("Failed to break down the task.");
        }

    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while processing your request.");
    } finally {
        // 🔓 UNFREEZE UI (only if AI still usable)
        if (btn.textContent !== "AI unavailable") {
            btn.disabled = false;
            btn.textContent = "Create Workspace";
            textarea.disabled = false;
        }
    }
});

/* ---------------------------------------------------------------------------- */

// MARKDOWN FETCHING AND PARSING 

async function getMarkdownText() {
    const textarea = document.getElementById("text-input")
    const fileinput = document.getElementById("file-input")

    const text = textarea.value.trim();
    if (text.length>0){
        return text
    }

    const file = fileinput.files[0]
    if(file){
        try{
            return await file.text();
        }
        catch(err){
            console.error("Failed to read file : ",err)
            return ""
        }
    }
    return ""
}

function parseMarkdown(text){
    const lines = text.split("\n")

    const groups = []
    let currentGroup = null

    const defaultGroup = {
        title : "Ungrouped",
        todos : [],
        collapsed : false
    }
    lines[0] = lines[0].replace(/^[-#*\s]+|[#-*\s]+$/g, "")
    lines.forEach(rawLine => {
        const line = rawLine.trim()

        if(line.length === 0 ){
            return;
        }

        if (line.startsWith("#")){
            const title = line.replace(/^[-*+#]+\s*/, "")

            currentGroup = {
                title : title || "untitled",
                todos : [] ,
                collapsed : false
            }

            groups.push(currentGroup);
            return
        }

        //for items 
        const unorderedListMarkers = ["-", "*","+"];
        const startsWithListMarker = unorderedListMarkers.some(marker => line.startsWith(marker));
        if (startsWithListMarker){
            const todoText = line.replace(/^[+*-]+\s*/, "").trim()

            if (todoText.length === 0) {
                return; // Skip empty todos
            }

            const todo = {
                text: todoText,
                done: false
            }

            if(currentGroup){
                currentGroup.todos.push(todo);
            }
            else{
                defaultGroup.todos.push(todo)
            }
        }
    });

    if(defaultGroup.todos.length > 0 ){
        groups.unshift(defaultGroup)
    }

    
    return groups
}

/* ---------------------------------------------------------------------------- */


// Delete and reset

function deleteWs(){
    if (currentWorkspaceId === null) {
        alert("No workspace selected to delete.");
        return;
    }

    const confirmDelete = confirm("Are you sure you want to delete this workspace? This will remove all todos in it.");
    if (!confirmDelete) {
        return;
    }

    workspaces = workspaces.filter(ws => ws.id !== currentWorkspaceId);
    currentWorkspaceId = null;

    localStorage.setItem("workspaces", JSON.stringify(workspaces));

    renderApp();
}

document.getElementById("delete-btn").addEventListener("click", deleteWs);

function resetApp(){
    const confirmReset = confirm("Are you sure you want to reset the app? This will clear all workspaces and todos.")
    if (!confirmReset) {
        return
    }

    workspaces = []
    currentWorkspaceId = null

    localStorage.removeItem("workspaces");

    renderApp()

    alert("App has been reset.")
}

document.getElementById("reset-app")?.addEventListener("click", resetApp);
/* ---------------------------------------------------------------------------- */

// Theme handling

const themeToggle = document.getElementById("theme-toggle");
const body = document.body;
// restore saved theme
if (localStorage.getItem("theme") === "light") {
  body.classList.add("light");
  themeToggle.textContent = "🌙";
} else {
  themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
  body.classList.toggle("light");
  const isLight = body.classList.contains("light");
  themeToggle.textContent = isLight ? "🌙" : "☀️";
  localStorage.setItem("theme", isLight ? "light" : "dark");
});
/* ---------------------------------------------------------------------------- */

// Gemini api availability management 

let geminiState = "UNKNOWN"; // initial

function setGeminiState(state) {
  geminiState = state;

  if (state === "AVAILABLE") {
    enableAIInput();
  } else {
    disableAIInput();
  }
}

function disableAIInput() {
  const rawInput = document.getElementById("raw-input");
  const rawBtn = document.getElementById("load-raw-btn");

  rawInput.placeholder =
    "AI workspace generation is temporarily unavailable.\nYou can still create workspaces using Markdown.";

  rawInput.classList.add("ai-disabled");
  rawBtn.disabled = true;
}

function enableAIInput() {
  const rawInput = document.getElementById("raw-input");
  const rawBtn = document.getElementById("load-raw-btn");

  rawInput.placeholder =
    "Paste notes, syllabus, or any raw text here…";

  rawInput.classList.remove("ai-disabled");
  rawBtn.disabled = false;
}


async function initAIStatus() {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();

    aiAvailable = data.ai_available;

    if (!aiAvailable) {
      disableAIInput();
    }
  } catch {
    // Fail closed
    disableAIInput();
  }
}




/* ---------------------------------------------------------------------------- */

// App startup
function initApp(){
    workspaces = loadWorkspaces();

    const firstActive = workspaces.find(w => !w.archived) || null;
    currentWorkspaceId = firstActive?.id ?? null


    initAIStatus();
    renderApp()
}

initApp()

/* ---------------------------------------------------------------------------- */